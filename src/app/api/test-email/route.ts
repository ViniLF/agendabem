import { NextRequest, NextResponse } from 'next/server'
import { EmailService } from '@/lib/email'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    if (process.env.NODE_ENV !== 'development') {
      return NextResponse.json(
        { error: 'Esta rota só funciona em desenvolvimento' },
        { status: 403 }
      )
    }

    const session = await getServerSession(authOptions)
    
    console.log('🧪 Iniciando teste completo de configuração SMTP...')

    const smtpConfigured = {
      SMTP_HOST: !!process.env.SMTP_HOST,
      SMTP_USER: !!process.env.SMTP_USER, 
      SMTP_PASS: !!process.env.SMTP_PASS,
      SMTP_PORT: !!process.env.SMTP_PORT,
      SMTP_FROM_EMAIL: !!process.env.SMTP_FROM_EMAIL
    }

    console.log('📋 Verificando configuração SMTP:', smtpConfigured)

    if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
      return NextResponse.json(
        { 
          error: 'Configuração SMTP incompleta',
          message: 'Verifique se SMTP_HOST, SMTP_USER e SMTP_PASS estão configurados no .env',
          missing: smtpConfigured
        },
        { status: 500 }
      )
    }

    console.log('🔍 Testando conexão SMTP...')
    const smtpWorking = await EmailService.testEmailConfiguration()
    
    if (!smtpWorking) {
      return NextResponse.json(
        { 
          error: 'Falha na conexão SMTP',
          message: 'Verifique as credenciais SMTP da Hostinger. Confira host, porta, usuário e senha.',
          config: {
            host: process.env.SMTP_HOST,
            port: process.env.SMTP_PORT,
            user: process.env.SMTP_USER,
          }
        },
        { status: 500 }
      )
    }

    const testEmail = session?.user?.email || 'vinihlucas90@gmail.com'
    const testName = session?.user?.name || 'Usuário Teste'

    console.log(`📧 Enviando emails de teste para: ${testEmail}`)

    const testResults = {
      smtpConnection: true,
      verificationEmail: false,
      welcomeEmail: false,
      passwordResetEmail: false,
      errors: [] as string[]
    }

    console.log('📨 Testando email de verificação...')
    try {
      testResults.verificationEmail = await EmailService.sendTestVerificationEmail(testName, testEmail)
      if (testResults.verificationEmail) {
        console.log('✅ Email de verificação enviado com sucesso')
      } else {
        console.log('❌ Falha ao enviar email de verificação')
        testResults.errors.push('Email de verificação falhou')
      }
    } catch (error) {
      console.error('❌ Erro no email de verificação:', error)
      testResults.errors.push(`Verificação: ${error instanceof Error ? error.message : 'Erro desconhecido'}`)
    }

    await new Promise(resolve => setTimeout(resolve, 2000))

    console.log('📨 Testando email de boas-vindas...')
    try {
      testResults.welcomeEmail = await EmailService.sendWelcomeEmail(testName, testEmail)
      if (testResults.welcomeEmail) {
        console.log('✅ Email de boas-vindas enviado com sucesso')
      } else {
        console.log('❌ Falha ao enviar email de boas-vindas')
        testResults.errors.push('Email de boas-vindas falhou')
      }
    } catch (error) {
      console.error('❌ Erro no email de boas-vindas:', error)
      testResults.errors.push(`Boas-vindas: ${error instanceof Error ? error.message : 'Erro desconhecido'}`)
    }

    await new Promise(resolve => setTimeout(resolve, 2000))

    console.log('📨 Testando email de recuperação de senha...')
    try {
      testResults.passwordResetEmail = await EmailService.sendPasswordResetEmail(testName, testEmail)
      if (testResults.passwordResetEmail) {
        console.log('✅ Email de recuperação enviado com sucesso')
      } else {
        console.log('❌ Falha ao enviar email de recuperação')
        testResults.errors.push('Email de recuperação falhou')
      }
    } catch (error) {
      console.error('❌ Erro no email de recuperação:', error)
      testResults.errors.push(`Recuperação: ${error instanceof Error ? error.message : 'Erro desconhecido'}`)
    }

    const allEmailsWorking = testResults.verificationEmail && testResults.welcomeEmail && testResults.passwordResetEmail
    
    if (allEmailsWorking) {
      console.log('🎉 Todos os emails de teste foram enviados com sucesso!')
    } else {
      console.log('⚠️ Alguns emails falharam:', testResults.errors)
    }

    return NextResponse.json({
      success: allEmailsWorking,
      message: allEmailsWorking 
        ? 'Todos os emails de teste enviados com sucesso via Hostinger SMTP!' 
        : 'Alguns emails falharam. Verifique os logs.',
      details: {
        smtpProvider: 'Hostinger',
        smtpConfig: {
          host: process.env.SMTP_HOST,
          port: process.env.SMTP_PORT,
          user: process.env.SMTP_USER,
          fromEmail: process.env.SMTP_FROM_EMAIL
        },
        testResults,
        sentTo: testEmail,
        timestamp: new Date().toISOString()
      }
    })

  } catch (error) {
    console.error('❌ Erro geral no teste de email:', error)
    
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

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Email inválido' },
        { status: 400 }
      )
    }

    console.log(`🧪 Teste personalizado: ${type} para ${email}`)

    const smtpWorking = await EmailService.testEmailConfiguration()
    if (!smtpWorking) {
      return NextResponse.json(
        { error: 'Configuração SMTP com problemas' },
        { status: 500 }
      )
    }

    let success = false
    let errorMessage = ''

    try {
      switch (type) {
        case 'verification':
          success = await EmailService.sendTestVerificationEmail(name, email)
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
    } catch (error) {
      errorMessage = error instanceof Error ? error.message : 'Erro desconhecido'
      success = false
    }

    if (!success) {
      return NextResponse.json(
        { 
          error: `Falha ao enviar email do tipo: ${type}`,
          message: errorMessage || 'Email service retornou false'
        },
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

export async function HEAD() {
  try {
    if (process.env.NODE_ENV !== 'development') {
      return new NextResponse(null, { status: 403 })
    }

    const smtpWorking = await EmailService.testEmailConfiguration()
    
    return new NextResponse(null, { 
      status: smtpWorking ? 200 : 500,
      headers: {
        'X-SMTP-Status': smtpWorking ? 'OK' : 'FAILED'
      }
    })
  } catch {
    return new NextResponse(null, { status: 500 })
  }
}