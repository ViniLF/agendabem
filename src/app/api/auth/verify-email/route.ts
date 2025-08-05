import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { createAuditLog } from '@/lib/audit'
import { EmailService } from '@/lib/email'
import { rateLimit } from '@/lib/rate-limit'

// POST /api/auth/verify-email
export async function POST(request: NextRequest) {
  try {
    // Rate limiting para verificação de email
    const rateLimitResult = rateLimit(request, 'auth')
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { 
          error: 'Rate limit exceeded',
          message: 'Muitas tentativas de verificação. Aguarde antes de tentar novamente.',
          retryAfter: Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000)
        },
        { status: 429 }
      )
    }

    const body = await request.json()
    const { token, email } = body

    console.log(`🔍 Verificando email: ${email} com token: ${token?.slice(0, 8)}...`)

    if (!token || !email) {
      console.log('❌ Token ou email não fornecidos')
      return NextResponse.json(
        { 
          error: 'Missing parameters',
          message: 'Token e email são obrigatórios'
        },
        { status: 400 }
      )
    }

    // Validar token usando EmailService
    const tokenValidation = EmailService.validateVerificationToken(token, email)
    
    if (!tokenValidation.valid) {
      console.log('❌ Token inválido ou expirado')
      
      await createAuditLog({
        action: 'READ',
        resource: 'email_verification',
        details: {
          email: email.replace(/(.{2}).*(@.*)/, '$1***$2'),
          error: tokenValidation.expired ? 'Token expirado' : 'Token inválido',
          token: token.slice(0, 8) + '***'
        },
        ipAddress: request.headers.get('x-forwarded-for') || undefined,
        userAgent: request.headers.get('user-agent') || undefined
      })

      if (tokenValidation.expired) {
        return NextResponse.json(
          { 
            error: 'Token expired',
            message: 'Token de verificação expirado. Solicite um novo email de verificação.',
            expired: true
          },
          { status: 410 }
        )
      }

      return NextResponse.json(
        { 
          error: 'Invalid token',
          message: 'Token de verificação inválido ou já utilizado'
        },
        { status: 400 }
      )
    }

    console.log(`✅ Token válido para usuário: ${tokenValidation.userId}`)

    // Buscar usuário no banco de dados
    const user = await prisma.user.findUnique({
      where: { 
        id: tokenValidation.userId,
        email: email // Verificação adicional de segurança
      },
      select: {
        id: true,
        name: true,
        email: true,
        emailVerified: true
      }
    })

    if (!user) {
      console.log('❌ Usuário não encontrado no banco')
      
      await createAuditLog({
        action: 'READ',
        resource: 'email_verification',
        details: {
          email: email.replace(/(.{2}).*(@.*)/, '$1***$2'),
          error: 'Usuário não encontrado',
          userId: tokenValidation.userId
        },
        ipAddress: request.headers.get('x-forwarded-for') || undefined,
        userAgent: request.headers.get('user-agent') || undefined
      })

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
      console.log('ℹ️ Email já estava verificado')
      
      // Remover token usado
      EmailService.removeVerificationToken(token)
      
      await createAuditLog({
        userId: user.id,
        action: 'READ',
        resource: 'email_verification',
        resourceId: user.id,
        details: {
          email: user.email.replace(/(.{2}).*(@.*)/, '$1***$2'),
          alreadyVerified: true,
          verifiedAt: user.emailVerified
        },
        ipAddress: request.headers.get('x-forwarded-for') || undefined,
        userAgent: request.headers.get('user-agent') || undefined
      })
      
      return NextResponse.json(
        { 
          success: true,
          message: 'Email já verificado anteriormente',
          alreadyVerified: true,
          user: {
            id: user.id,
            name: user.name,
            email: user.email
          }
        }
      )
    }

    console.log(`📝 Atualizando usuário como verificado: ${user.id}`)

    // Atualizar usuário como verificado
    await prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerified: new Date()
      }
    })

    // Remover token usado
    EmailService.removeVerificationToken(token)

    console.log('📧 Enviando email de boas-vindas...')

    // Enviar email de boas-vindas (não falhar se der erro)
    let welcomeEmailSent = false
    try {
      welcomeEmailSent = await EmailService.sendWelcomeEmail(user.name, user.email)
      if (welcomeEmailSent) {
        console.log('✅ Email de boas-vindas enviado com sucesso')
      } else {
        console.warn('⚠️ Email de boas-vindas não foi enviado')
      }
    } catch (error) {
      console.warn('⚠️ Erro ao enviar email de boas-vindas:', error)
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
        verifiedAt: new Date(),
        method: 'email_token'
      },
      ipAddress: request.headers.get('x-forwarded-for') || undefined,
      userAgent: request.headers.get('user-agent') || undefined
    })

    console.log('🎉 Verificação de email concluída com sucesso')

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
    console.error('❌ Erro na verificação de email:', error)

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

// POST /api/auth/resend-verification
export async function resendVerificationEmail(request: NextRequest) {
  try {
    // Rate limiting mais restritivo para reenvios
    const rateLimitResult = rateLimit(request, 'auth')
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { 
          error: 'Rate limit exceeded',
          message: 'Muitas tentativas de reenvio. Aguarde antes de tentar novamente.'
        },
        { status: 429 }
      )
    }

    const body = await request.json()
    const { email } = body

    if (!email) {
      return NextResponse.json(
        { 
          error: 'Missing email',
          message: 'Email é obrigatório'
        },
        { status: 400 }
      )
    }

    console.log(`🔄 Reenviando email de verificação para: ${email}`)

    // Buscar usuário
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
      // Não revelar se o usuário existe ou não por segurança
      return NextResponse.json(
        {
          success: true,
          message: 'Se o email estiver cadastrado, um novo link de verificação será enviado.'
        }
      )
    }

    if (user.emailVerified) {
      return NextResponse.json(
        {
          success: true,
          message: 'Este email já foi verificado.'
        }
      )
    }

    // Reenviar email
    const emailSent = await EmailService.sendVerificationEmail(user.name, user.email, user.id)

    await createAuditLog({
      userId: user.id,
      action: 'CREATE',
      resource: 'email_verification_resend',
      details: {
        email: user.email.replace(/(.{2}).*(@.*)/, '$1***$2'),
        emailSent
      },
      ipAddress: request.headers.get('x-forwarded-for') || undefined,
      userAgent: request.headers.get('user-agent') || undefined
    })

    return NextResponse.json(
      {
        success: true,
        message: 'Novo email de verificação enviado!',
        emailSent
      }
    )

  } catch (error) {
    console.error('❌ Erro ao reenviar email:', error)
    
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: 'Erro interno. Tente novamente em alguns minutos.'
      },
      { status: 500 }
    )
  }
}

// Método GET não permitido para verificação
export async function GET() {
  return NextResponse.json(
    { 
      error: 'Method not allowed',
      message: 'Use POST para verificar email'
    },
    { status: 405 }
  )
}