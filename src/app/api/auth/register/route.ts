import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { hashPassword, sanitizeInput } from '@/lib/crypto'
import { userRegistrationSchema } from '@/lib/validation'
import { createAuditLog } from '@/lib/audit'
import { rateLimit } from '@/lib/rate-limit'
import { EmailService } from '@/lib/email'

export async function POST(request: NextRequest) {
  try {
    console.log('📝 Iniciando processo de cadastro...')
    
    // Rate limiting para cadastros (mais restritivo)
    const rateLimitResult = rateLimit(request, 'auth')
    if (!rateLimitResult.success) {
      console.log('⚠️ Rate limit excedido para cadastro')
      
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

    console.log(`📧 Tentativa de cadastro para: ${sanitizedData.email.replace(/(.{2}).*(@.*)/, '$1***$2')}`)

    // Validação com Zod
    const validationResult = userRegistrationSchema.safeParse(sanitizedData)
    if (!validationResult.success) {
      console.log('❌ Dados de cadastro inválidos:', validationResult.error.issues)
      
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

    console.log('✅ Dados validados com sucesso')

    // Verificar se o email já existe
    const existingUser = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        emailVerified: true,
        createdAt: true
      }
    })

    if (existingUser) {
      console.log('⚠️ Email já cadastrado')
      
      // Log de tentativa de cadastro duplicado
      await createAuditLog({
        action: 'CREATE',
        resource: 'user',
        details: {
          email: email.replace(/(.{2}).*(@.*)/, '$1***$2'),
          error: 'Email já cadastrado',
          existingUserId: existingUser.id,
          isEmailVerified: !!existingUser.emailVerified
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

    console.log('🔐 Gerando hash da senha...')

    // Hash da senha
    const passwordHash = await hashPassword(password)

    console.log('💾 Criando usuário no banco de dados...')

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

    console.log(`✅ Usuário criado com ID: ${user.id}`)

    // Criar perfil padrão para o usuário
    console.log('📋 Criando perfil padrão...')
    
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

    console.log('✅ Perfil padrão criado')

    // Enviar email de verificação usando o novo EmailService
    console.log('📧 Enviando email de verificação...')
    
    let emailSent = false
    try {
      emailSent = await EmailService.sendVerificationEmail(name, email, user.id)
      
      if (emailSent) {
        console.log('✅ Email de verificação enviado com sucesso')
      } else {
        console.warn('⚠️ Falha ao enviar email de verificação')
      }
    } catch (emailError) {
      console.error('❌ Erro ao enviar email de verificação:', emailError)
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
        emailSent,
        profileCreated: true
      },
      ipAddress: request.headers.get('x-forwarded-for') || undefined,
      userAgent: request.headers.get('user-agent') || undefined
    })

    console.log('🎉 Cadastro concluído com sucesso')

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
        },
        nextSteps: emailSent 
          ? 'Verifique seu email para ativar a conta'
          : 'Conta criada! Entre em contato conosco se não receber o email de verificação.'
      },
      { status: 201 }
    )

  } catch (error) {
    console.error('❌ Erro no cadastro:', error)

    // Log de erro no cadastro
    await createAuditLog({
      action: 'CREATE',
      resource: 'user',
      details: {
        error: 'Erro interno no cadastro',
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack?.slice(0, 500) : undefined
      },
      ipAddress: request.headers.get('x-forwarded-for') || undefined,
      userAgent: request.headers.get('user-agent') || undefined
    })

    // Resposta de erro genérica (não expor detalhes internos)
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: 'Erro interno do servidor. Tente novamente em alguns minutos.'
      },
      { status: 500 }
    )
  }
}

// Método GET não permitido para registro
export async function GET() {
  return NextResponse.json(
    { 
      error: 'Method not allowed',
      message: 'Use POST para criar uma conta'
    },
    { status: 405 }
  )
}

// Função auxiliar para verificar se email está disponível (opcional)
export async function checkEmailAvailability(email: string): Promise<boolean> {
  try {
    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      select: { id: true }
    })
    
    return !existingUser
  } catch (error) {
    console.error('Erro ao verificar disponibilidade do email:', error)
    return false
  }
}