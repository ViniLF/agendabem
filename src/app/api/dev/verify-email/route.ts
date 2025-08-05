import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { createAuditLog } from '@/lib/audit'
import { EmailService } from '@/lib/email'

export async function POST(request: NextRequest) {
  try {
    // Só permitir em desenvolvimento
    if (process.env.NODE_ENV !== 'development') {
      return NextResponse.json(
        { error: 'Esta rota só funciona em desenvolvimento' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { email } = body

    if (!email) {
      return NextResponse.json(
        { error: 'Email é obrigatório' },
        { status: 400 }
      )
    }

    // Buscar usuário no banco
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
        { error: 'Usuário não encontrado' },
        { status: 404 }
      )
    }

    if (user.emailVerified) {
      return NextResponse.json(
        { 
          success: true,
          message: 'Email já estava verificado',
          alreadyVerified: true
        }
      )
    }

    // Verificar email (simular)
    await prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerified: new Date()
      }
    })

    // Enviar email de boas-vindas
    const welcomeEmailSent = await EmailService.sendWelcomeEmail(user.name, user.email)

    // Log da verificação
    await createAuditLog({
      userId: user.id,
      action: 'UPDATE',
      resource: 'email_verification',
      resourceId: user.id,
      details: {
        email: user.email.replace(/(.{2}).*(@.*)/, '$1***$2'),
        method: 'dev_bypass',
        welcomeEmailSent,
        verifiedAt: new Date()
      },
      ipAddress: request.headers.get('x-forwarded-for') || undefined,
      userAgent: request.headers.get('user-agent') || undefined
    })

    return NextResponse.json({
      success: true,
      message: 'Email verificado com sucesso! (modo desenvolvimento)',
      method: 'dev_bypass',
      welcomeEmailSent,
      user: {
        id: user.id,
        name: user.name,
        email: user.email
      }
    })

  } catch (error) {
    console.error('Erro na verificação de desenvolvimento:', error)
    return NextResponse.json(
      { 
        error: 'Erro interno',
        message: error instanceof Error ? error.message : 'Erro desconhecido'
      },
      { status: 500 }
    )
  }
}

export async function GET() {
  return NextResponse.json(
    { error: 'Use POST com email para verificar' },
    { status: 405 }
  )
}