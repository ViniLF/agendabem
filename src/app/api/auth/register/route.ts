import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { hashPassword, sanitizeInput } from '@/lib/crypto'
import { userRegistrationSchema } from '@/lib/validation'
import { createAuditLog } from '@/lib/audit'
import { rateLimit } from '@/lib/rate-limit'
import { EmailService } from '@/lib/email'

export async function POST(request: NextRequest) {
  try {
    // Rate limiting para cadastros
    const rateLimitResult = rateLimit(request, 'auth')
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { 
          error: 'Rate limit exceeded',
          message: 'Muitas tentativas de cadastro. Aguarde antes de tentar novamente.',
          retryAfter: Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000)
        },
        { status: 429 }
      )
    }

    const body = await request.json()
    
    // Sanitização dos dados de entrada
    const sanitizedData = {
      name: sanitizeInput(body.name || ''),
      email: sanitizeInput(body.email || '').toLowerCase(),
      password: body.password || '',
      confirmPassword: body.confirmPassword || '',
      phone: body.phone ? sanitizeInput(body.phone) : undefined,
      dataConsent: Boolean(body.dataConsent)
    }

    // Validação com Zod
    const validationResult = userRegistrationSchema.safeParse(sanitizedData)
    if (!validationResult.success) {
      return NextResponse.json(
        { 
          error: 'Validation failed',
          message: 'Dados inválidos fornecidos',
          details: validationResult.error.issues.map(issue => ({
            field: issue.path.join('.'),
            message: issue.message
          }))
        },
        { status: 400 }
      )
    }

    const { name, email, password, phone, dataConsent } = validationResult.data

    // Verificar se o email já existe
    const existingUser = await prisma.user.findUnique({
      where: { email }
    })

    if (existingUser) {
      // Log de tentativa de cadastro duplicado
      await createAuditLog({
        action: 'CREATE',
        resource: 'user',
        details: {
          email: email.replace(/(.{2}).*(@.*)/, '$1***$2'),
          error: 'Email já cadastrado',
          ip: request.headers.get('x-forwarded-for') || 'unknown'
        },
        ipAddress: request.headers.get('x-forwarded-for') || undefined,
        userAgent: request.headers.get('user-agent') || undefined
      })

      return NextResponse.json(
        { 
          error: 'Email already exists',
          message: 'Este email já está cadastrado. Tente fazer login ou use outro email.'
        },
        { status: 409 }
      )
    }

    // Hash da senha
    const passwordHash = await hashPassword(password)

    // Criar usuário no banco de dados
    const user = await prisma.user.create({
      data: {
        name,
        email,
        passwordHash,
        phone,
        dataConsent,
        consentDate: dataConsent ? new Date() : null,
        role: 'PROFESSIONAL',
        emailVerified: null // Ainda não verificado
      },
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true
      }
    })

    // Criar perfil padrão para o usuário
    await prisma.profile.create({
      data: {
        userId: user.id,
        workingDays: [1, 2, 3, 4, 5], // Segunda a sexta
        workingHours: {
          start: '09:00',
          end: '18:00'
        },
        timeSlotDuration: 60, // 1 hora
        bookingAdvance: 24, // 24 horas de antecedência
        serviceType: 'OTHER'
      }
    })

    // Enviar email de verificação
    const emailSent = await EmailService.sendVerificationEmail(name, email)
    
    if (!emailSent) {
      console.warn('⚠️ Email de verificação não foi enviado para:', email)
      // Não falhar o cadastro por causa do email
    }

    // Log de criação de usuário
    await createAuditLog({
      userId: user.id,
      action: 'CREATE',
      resource: 'user',
      resourceId: user.id,
      details: {
        name,
        email: email.replace(/(.{2}).*(@.*)/, '$1***$2'),
        hasPhone: !!phone,
        dataConsent,
        emailSent
      },
      ipAddress: request.headers.get('x-forwarded-for') || undefined,
      userAgent: request.headers.get('user-agent') || undefined
    })

    // Resposta de sucesso
    return NextResponse.json(
      {
        success: true,
        message: 'Conta criada com sucesso!',
        emailSent,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          createdAt: user.createdAt
        }
      },
      { status: 201 }
    )

  } catch (error) {
    console.error('Erro no cadastro:', error)

    // Log de erro no cadastro
    await createAuditLog({
      action: 'CREATE',
      resource: 'user',
      details: {
        error: 'Erro interno no cadastro',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      ipAddress: request.headers.get('x-forwarded-for') || undefined,
      userAgent: request.headers.get('user-agent') || undefined
    })

    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: 'Erro interno do servidor. Tente novamente em alguns minutos.'
      },
      { status: 500 }
    )
  }
}

// Método GET não permitido
export async function GET() {
  return NextResponse.json(
    { 
      error: 'Method not allowed',
      message: 'Método GET não permitido nesta rota'
    },
    { status: 405 }
  )
}