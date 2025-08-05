import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { createAuditLog } from '@/lib/audit'
import { EmailService } from '@/lib/email'
import { rateLimit } from '@/lib/rate-limit'
import { sanitizeInput } from '@/lib/crypto'

export async function POST(request: NextRequest) {
  try {
    console.log('🔄 Solicitação de reenvio de email de verificação')

    const rateLimitResult = rateLimit(request, 'contact')
    if (!rateLimitResult.success) {
      console.log('⚠️ Rate limit excedido para reenvio')
      
      return NextResponse.json(
        { 
          error: 'Rate limit exceeded',
          message: 'Muitas tentativas de reenvio. Aguarde 1 hora antes de tentar novamente.',
          retryAfter: Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000)
        },
        { status: 429 }
      )
    }

    const body = await request.json()
    const email = sanitizeInput(body.email || '').toLowerCase()

    if (!email) {
      return NextResponse.json(
        { 
          error: 'Missing email',
          message: 'Email é obrigatório'
        },
        { status: 400 }
      )
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { 
          error: 'Invalid email',
          message: 'Email inválido'
        },
        { status: 400 }
      )
    }

    console.log(`📧 Tentativa de reenvio para: ${email.replace(/(.{2}).*(@.*)/, '$1***$2')}`)

    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        name: true,
        email: true,
        emailVerified: true,
        createdAt: true
      }
    })

    const successResponse = {
      success: true,
      message: 'Se o email estiver cadastrado e não verificado, um novo link de verificação será enviado.'
    }

    if (!user) {
      console.log('⚠️ Email não encontrado no sistema')

      await createAuditLog({
        action: 'CREATE',
        resource: 'email_verification_resend',
        details: {
          email: email.replace(/(.{2}).*(@.*)/, '$1***$2'),
          result: 'email_not_found',
          userExists: false
        },
        ipAddress: request.headers.get('x-forwarded-for') || undefined,
        userAgent: request.headers.get('user-agent') || undefined
      })

      return NextResponse.json(successResponse)
    }

    if (user.emailVerified) {
      console.log('ℹ️ Email já está verificado')
      
      await createAuditLog({
        userId: user.id,
        action: 'CREATE',
        resource: 'email_verification_resend',
        details: {
          email: user.email.replace(/(.{2}).*(@.*)/, '$1***$2'),
          result: 'already_verified',
          verifiedAt: user.emailVerified
        },
        ipAddress: request.headers.get('x-forwarded-for') || undefined,
        userAgent: request.headers.get('user-agent') || undefined
      })

      return NextResponse.json({
        success: true,
        message: 'Este email já foi verificado. Você pode fazer login normalmente.'
      })
    }

    console.log(`📨 Enviando novo email de verificação para usuário: ${user.id}`)

    let emailSent = false
    let emailError = null

    try {
      emailSent = await EmailService.sendVerificationEmail(user.name, user.email, user.id)
      
      if (emailSent) {
        console.log('✅ Email de verificação reenviado com sucesso')
      } else {
        console.warn('⚠️ Falha ao reenviar email de verificação')
        emailError = 'Email service returned false'
      }
    } catch (error) {
      console.error('❌ Erro ao reenviar email:', error)
      emailError = error instanceof Error ? error.message : 'Unknown error'
      emailSent = false
    }

    await createAuditLog({
      userId: user.id,
      action: 'CREATE',
      resource: 'email_verification_resend',
      details: {
        email: user.email.replace(/(.{2}).*(@.*)/, '$1***$2'),
        result: emailSent ? 'success' : 'failed',
        emailSent,
        error: emailError,
        userCreatedAt: user.createdAt
      },
      ipAddress: request.headers.get('x-forwarded-for') || undefined,
      userAgent: request.headers.get('user-agent') || undefined
    })

    return NextResponse.json({
      success: true,
      message: emailSent 
        ? 'Novo email de verificação enviado! Verifique sua caixa de entrada e spam.'
        : 'Solicitação processada. Se houver problemas, entre em contato conosco.',
      emailSent
    })

  } catch (error) {
    console.error('❌ Erro interno no reenvio:', error)

    await createAuditLog({
      action: 'CREATE',
      resource: 'email_verification_resend',
      details: {
        error: 'Erro interno no reenvio',
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack?.slice(0, 500) : undefined
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

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const email = searchParams.get('email')

    if (!email) {
      return NextResponse.json(
        { error: 'Email parameter required' },
        { status: 400 }
      )
    }

    const rateLimitResult = rateLimit(request, 'api')
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: 'Rate limit exceeded' },
        { status: 429 }
      )
    }

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      select: {
        emailVerified: true,
        createdAt: true
      }
    })

    if (!user) {
      return NextResponse.json({
        verified: false,
        message: 'Email não encontrado ou não verificado'
      })
    }

    return NextResponse.json({
      verified: !!user.emailVerified,
      message: user.emailVerified 
        ? 'Email verificado' 
        : 'Email ainda não verificado'
    })

  } catch (error) {
    console.error('Erro ao verificar status:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PUT() {
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405 }
  )
}

export async function DELETE() {
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405 }
  )
}