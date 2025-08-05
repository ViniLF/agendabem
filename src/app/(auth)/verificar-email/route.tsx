import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { createAuditLog } from '@/lib/audit'
import { EmailService } from '@/lib/email'
import { rateLimit } from '@/lib/rate-limit'
import { hashSensitiveData } from '@/lib/crypto'

// Armazenar tokens de verificação temporariamente (em produção usar Redis)
const verificationTokens = new Map<string, {
  email: string
  token: string
  createdAt: number
  expiresAt: number
}>()

// Função para armazenar token de verificação
export function storeVerificationToken(email: string, token: string) {
  const now = Date.now()
  const expiresAt = now + (24 * 60 * 60 * 1000) // 24 horas
  
  verificationTokens.set(token, {
    email,
    token,
    createdAt: now,
    expiresAt
  })
  
  // Limpar tokens expirados
  cleanExpiredTokens()
}

// Função para limpar tokens expirados
function cleanExpiredTokens() {
  const now = Date.now()
  for (const [token, data] of verificationTokens.entries()) {
    if (now > data.expiresAt) {
      verificationTokens.delete(token)
    }
  }
}

// Verificar email
export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const rateLimitResult = rateLimit(request, 'auth')
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { 
          error: 'Rate limit exceeded',
          message: 'Muitas tentativas de verificação. Aguarde antes de tentar novamente.'
        },
        { status: 429 }
      )
    }

    const body = await request.json()
    const { token, email } = body

    if (!token || !email) {
      return NextResponse.json(
        { 
          error: 'Missing parameters',
          message: 'Token e email são obrigatórios'
        },
        { status: 400 }
      )
    }

    // Limpar tokens expirados
    cleanExpiredTokens()

    // Verificar se o token existe e é válido
    const tokenData = verificationTokens.get(token)
    
    if (!tokenData) {
      await createAuditLog({
        action: 'READ',
        resource: 'email_verification',
        details: {
          email: email.replace(/(.{2}).*(@.*)/, '$1***$2'),
          error: 'Token não encontrado',
          token: token.slice(0, 8) + '***'
        },
        ipAddress: request.headers.get('x-forwarded-for') || undefined,
        userAgent: request.headers.get('user-agent') || undefined
      })

      return NextResponse.json(
        { 
          error: 'Invalid token',
          message: 'Token de verificação inválido ou já utilizado'
        },
        { status: 400 }
      )
    }

    // Verificar se o token expirou
    if (Date.now() > tokenData.expiresAt) {
      verificationTokens.delete(token)
      
      await createAuditLog({
        action: 'READ',
        resource: 'email_verification',
        details: {
          email: email.replace(/(.{2}).*(@.*)/, '$1***$2'),
          error: 'Token expirado',
          token: token.slice(0, 8) + '***'
        },
        ipAddress: request.headers.get('x-forwarded-for') || undefined,
        userAgent: request.headers.get('user-agent') || undefined
      })

      return NextResponse.json(
        { 
          error: 'Token expired',
          message: 'Token de verificação expirado. Solicite um novo email de verificação.'
        },
        { status: 410 }
      )
    }

    // Verificar se o email corresponde ao token
    if (tokenData.email !== email) {
      await createAuditLog({
        action: 'READ',
        resource: 'email_verification',
        details: {
          email: email.replace(/(.{2}).*(@.*)/, '$1***$2'),
          error: 'Email não corresponde ao token',
          token: token.slice(0, 8) + '***'
        },
        ipAddress: request.headers.get('x-forwarded-for') || undefined,
        userAgent: request.headers.get('user-agent') || undefined
      })

      return NextResponse.json(
        { 
          error: 'Email mismatch',
          message: 'Email não corresponde ao token de verificação'
        },
        { status: 400 }
      )
    }

    // Buscar usuário no banco de dados
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        name: true,
        email: true,
        emailVerified: true
      }
    })

    if (!user) {
      return NextResponse.json(
        { 
          error: 'User not found',
          message: 'Usuário não encontrado'
        },
        { status: 404 }
      )
    }

    // Verificar se o email já foi verificado
    if (user.emailVerified) {
      // Remover token usado
      verificationTokens.delete(token)
      
      return NextResponse.json(
        { 
          success: true,
          message: 'Email já verificado anteriormente',
          alreadyVerified: true
        }
      )
    }

    // Atualizar usuário como verificado
    await prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerified: new Date()
      }
    })

    // Remover token usado
    verificationTokens.delete(token)

    // Enviar email de boas-vindas
    const welcomeEmailSent = await EmailService.sendWelcomeEmail(user.name, user.email)
    
    if (!welcomeEmailSent) {
      console.warn('⚠️ Email de boas-vindas não foi enviado para:', user.email)
    }

    // Log de verificação bem-sucedida
    await createAuditLog({
      userId: user.id,
      action: 'UPDATE',
      resource: 'email_verification',
      resourceId: user.id,
      details: {
        email: user.email.replace(/(.{2}).*(@.*)/, '$1***$2'),
        welcomeEmailSent,
        verifiedAt: new Date()
      },
      ipAddress: request.headers.get('x-forwarded-for') || undefined,
      userAgent: request.headers.get('user-agent') || undefined
    })

    return NextResponse.json(
      {
        success: true,
        message: 'Email verificado com sucesso! Você já pode fazer login.',
        welcomeEmailSent,
        user: {
          id: user.id,
          name: user.name,
          email: user.email
        }
      }
    )

  } catch (error) {
    console.error('Erro na verificação de email:', error)

    await createAuditLog({
      action: 'UPDATE',
      resource: 'email_verification',
      details: {
        error: 'Erro interno na verificação',
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
      message: 'Use POST para verificar email'
    },
    { status: 405 }
  )
}