import { NextRequest, NextResponse } from 'next/server'
import { EmailService } from '@/lib/email'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    // Verificar se está em desenvolvimento
    if (process.env.NODE_ENV !== 'development') {
      return NextResponse.json(
        { error: 'Esta rota só funciona em desenvolvimento' },
        { status: 403 }
      )
    }

    // Verificar se o usuário está logado (opcional)
    const session = await getServerSession(authOptions)
    
    console.log('🧪 Testando configuração SMTP Hostinger...')

    // Verificar se as variáveis de ambiente estão configuradas
    if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
      return NextResponse.json(
        { 
          error: 'Configuração SMTP incompleta',
          message: 'Verifique se SMTP_HOST, SMTP_USER e SMTP_PASS estão configurados no .env',
          missing: {
            SMTP_HOST: !process.env.SMTP_HOST,
            SMTP_USER: !process.env.SMTP_USER, 
            SMTP_PASS: !process.env.SMTP_PASS,
            SMTP_PORT: !process.env.SMTP_PORT,
            SMTP_FROM_EMAIL: !process.env.SMTP_FROM_EMAIL
          }
        },
        { status: 500 }
      )
    }

    // Testar configuração SMTP primeiro
    const smtpWorking = await EmailService.testEmailConfiguration()
    if (!smtpWorking) {
      return NextResponse.json(
        { 
          error: 'Falha na conexão SMTP',
          message: 'Verifique as credenciais SMTP da Hostinger. Confira host, porta, usuário e senha.'
        },
        { status: 500 }
      )
    }

    // Email de destino para teste
    const testEmail = session?.user?.email || 'vinihlucas90@gmail.com'
    const testName = session?.user?.name || 'Usuário Teste'

    console.log(`📧 Enviando email de teste para: ${testEmail}`)

    // Tentar enviar email de verificação
    const verificationSuccess = await EmailService.sendVerificationEmail(testName, testEmail)
    
    if (!verificationSuccess) {
      return NextResponse.json(
        { 
          error: 'Falha ao enviar email de verificação',
          message: 'SMTP conectou mas falhou ao enviar. Verifique os logs do servidor.'
        },
        { status: 500 }
      )
    }

    // Aguardar um pouco antes do próximo email
    await new Promise(resolve => setTimeout(resolve, 2000))

    // Tentar enviar email de boas-vindas
    const welcomeSuccess = await EmailService.sendWelcomeEmail(testName, testEmail)

    if (!welcomeSuccess) {
      return NextResponse.json(
        { 
          error: 'Falha ao enviar email de boas-vindas',
          message: 'Email de verificação foi enviado, mas boas-vindas falhou'
        },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Emails de teste enviados com sucesso via Hostinger SMTP!',
      details: {
        smtpProvider: 'Hostinger',
        smtpHost: process.env.SMTP_HOST,
        smtpPort: process.env.SMTP_PORT,
        smtpUser: process.env.SMTP_USER,
        verificationEmail: verificationSuccess,
        welcomeEmail: welcomeSuccess,
        sentTo: testEmail,
        timestamp: new Date().toISOString()
      }
    })

  } catch (error) {
    console.error('❌ Erro no teste de email:', error)
    
    return NextResponse.json(
      { 
        error: 'Erro interno no teste de email',
        message: error instanceof Error ? error.message : 'Erro desconhecido',
        details: {
          timestamp: new Date().toISOString(),
          env: process.env.NODE_ENV,
          smtpConfigured: {
            host: !!process.env.SMTP_HOST,
            user: !!process.env.SMTP_USER,
            pass: !!process.env.SMTP_PASS
          }
        }
      },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    // Permitir teste personalizado via POST
    if (process.env.NODE_ENV !== 'development') {
      return NextResponse.json(
        { error: 'Esta rota só funciona em desenvolvimento' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { email, name, type } = body

    if (!email || !name) {
      return NextResponse.json(
        { error: 'Email e nome são obrigatórios' },
        { status: 400 }
      )
    }

    // Verificar configuração SMTP
    const smtpWorking = await EmailService.testEmailConfiguration()
    if (!smtpWorking) {
      return NextResponse.json(
        { error: 'Configuração SMTP com problemas' },
        { status: 500 }
      )
    }

    let success = false

    switch (type) {
      case 'verification':
        success = await EmailService.sendVerificationEmail(name, email)
        break
      case 'welcome':
        success = await EmailService.sendWelcomeEmail(name, email)
        break
      case 'password-reset':
        success = await EmailService.sendPasswordResetEmail(name, email)
        break
      default:
        return NextResponse.json(
          { error: 'Tipo de email inválido. Use: verification, welcome, password-reset' },
          { status: 400 }
        )
    }

    if (!success) {
      return NextResponse.json(
        { error: `Falha ao enviar email do tipo: ${type}` },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: `Email do tipo '${type}' enviado com sucesso via Hostinger!`,
      sentTo: email,
      timestamp: new Date().toISOString(),
      provider: 'Hostinger SMTP'
    })

  } catch (error) {
    console.error('❌ Erro no teste personalizado:', error)
    
    return NextResponse.json(
      { 
        error: 'Erro no teste personalizado',
        message: error instanceof Error ? error.message : 'Erro desconhecido'
      },
      { status: 500 }
    )
  }
}