import nodemailer from 'nodemailer'
import crypto from 'crypto'

interface EmailTemplate {
  to: string
  subject: string
  html: string
  text?: string
}

interface VerificationEmailData {
  name: string
  email: string
  token: string
  baseUrl: string
}

interface WelcomeEmailData {
  name: string
  email: string
  dashboardUrl: string
}

interface PasswordResetData {
  name: string
  email: string
  token: string
  baseUrl: string
}

// Armazenar tokens temporariamente (em produção usar Redis)
const verificationTokens = new Map<string, {
  email: string
  userId: string
  createdAt: number
  expiresAt: number
}>()

export class EmailService {
  private static transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.hostinger.com',
    port: parseInt(process.env.SMTP_PORT || '465'),
    secure: true, // true para 465, false para 587
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
    // Configurações específicas para Hostinger
    tls: {
      ciphers: 'SSLv3'
    },
    connectionTimeout: 60000, // 60 segundos
    greetingTimeout: 30000, // 30 segundos
    socketTimeout: 60000, // 60 segundos
  })

  private static fromEmail = process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER || 'noreply@agendabem.com'
  
  // Gerar e armazenar token de verificação
  public static generateAndStoreVerificationToken(email: string, userId: string): string {
    const token = crypto.randomBytes(32).toString('hex')
    const now = Date.now()
    const expiresAt = now + (24 * 60 * 60 * 1000) // 24 horas
    
    verificationTokens.set(token, {
      email,
      userId,
      createdAt: now,
      expiresAt
    })
    
    // Limpar tokens expirados
    this.cleanExpiredTokens()
    return token
  }
  
  // Validar token de verificação
  public static validateVerificationToken(token: string, email: string): { valid: boolean; userId?: string; expired?: boolean } {
    this.cleanExpiredTokens()
    
    const tokenData = verificationTokens.get(token)
    if (!tokenData) {
      return { valid: false }
    }
    
    if (tokenData.email !== email) {
      return { valid: false }
    }
    
    if (Date.now() > tokenData.expiresAt) {
      verificationTokens.delete(token)
      return { valid: false, expired: true }
    }
    
    return { valid: true, userId: tokenData.userId }
  }
  
  // Remover token após uso
  public static removeVerificationToken(token: string): void {
    verificationTokens.delete(token)
  }
  
  // Limpar tokens expirados
  private static cleanExpiredTokens(): void {
    const now = Date.now()
    for (const [token, data] of verificationTokens.entries()) {
      if (now > data.expiresAt) {
        verificationTokens.delete(token)
      }
    }
  }
  
  // Template para verificação de email
  private static createVerificationEmail(data: VerificationEmailData): EmailTemplate {
    const verifyUrl = `${data.baseUrl}/verificar-email?token=${data.token}&email=${encodeURIComponent(data.email)}`
    
    return {
      to: data.email,
      subject: '✉️ Verifique seu email - AgendaBem',
      html: `
        <!DOCTYPE html>
        <html lang="pt-BR">
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Verificar Email - AgendaBem</title>
          <style>
            body { 
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
              line-height: 1.6; 
              color: #333; 
              max-width: 600px; 
              margin: 0 auto; 
              padding: 20px;
              background-color: #f8fafc;
            }
            .container { 
              background: white; 
              padding: 30px; 
              border-radius: 12px; 
              box-shadow: 0 4px 6px rgba(0,0,0,0.1);
            }
            .header { 
              text-align: center; 
              margin-bottom: 30px; 
              border-bottom: 2px solid #e2e8f0;
              padding-bottom: 20px;
            }
            .logo { 
              color: #2563eb; 
              font-size: 28px; 
              font-weight: bold; 
              margin: 0;
            }
            .subtitle { 
              color: #64748b; 
              margin: 5px 0;
            }
            .content { 
              margin: 30px 0;
            }
            .button { 
              display: inline-block;
              background: #2563eb; 
              color: white !important; 
              padding: 14px 28px; 
              text-decoration: none; 
              border-radius: 8px; 
              font-weight: 600; 
              font-size: 16px; 
              box-shadow: 0 4px 6px rgba(37, 99, 235, 0.25);
              margin: 20px 0;
            }
            .button:hover {
              background: #1d4ed8;
            }
            .warning { 
              background: #fef3c7; 
              padding: 15px; 
              border-radius: 6px; 
              border-left: 4px solid #f59e0b;
              margin: 20px 0;
            }
            .footer { 
              text-align: center; 
              margin-top: 30px; 
              color: #64748b; 
              font-size: 12px;
              border-top: 1px solid #e2e8f0;
              padding-top: 20px;
            }
            .footer a { 
              color: #2563eb; 
              text-decoration: none;
            }
            @media (max-width: 600px) {
              body { padding: 10px; }
              .container { padding: 20px; }
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 class="logo">📅 AgendaBem</h1>
              <p class="subtitle">Sistema de Agendamentos Profissional</p>
            </div>
            
            <div class="content">
              <h2 style="color: #1e293b; margin-top: 0;">Olá, ${data.name}! 👋</h2>
              
              <p style="font-size: 16px;">Obrigado por se cadastrar no <strong>AgendaBem</strong>! Para começar a usar nossa plataforma e gerenciar seus agendamentos, você precisa verificar seu endereço de email.</p>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${verifyUrl}" class="button">
                  ✅ Verificar Email
                </a>
              </div>
              
              <div class="warning">
                <p style="margin: 0; color: #92400e;">
                  <strong>⚠️ Importante:</strong> Se o botão não funcionar, copie e cole este link no seu navegador:<br>
                  <a href="${verifyUrl}" style="color: #2563eb; word-break: break-all; font-size: 14px;">${verifyUrl}</a>
                </p>
              </div>
              
              <p style="color: #64748b; font-size: 13px; text-align: center; margin-top: 30px;">
                🔒 Este link expira em <strong>24 horas</strong> por motivos de segurança.
              </p>
            </div>
            
            <div class="footer">
              <p>Se você não se cadastrou no AgendaBem, pode ignorar este email com segurança.</p>
              <p>© 2024 AgendaBem. Todos os direitos reservados.</p>
              <p>
                <a href="https://agendabem.com">agendabem.com</a> | 
                <a href="https://agendabem.com/contato">Contato</a>
              </p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
        Olá, ${data.name}!
        
        Obrigado por se cadastrar no AgendaBem! 
        
        Para verificar seu email e começar a usar a plataforma, acesse:
        ${verifyUrl}
        
        Este link expira em 24 horas por motivos de segurança.
        
        Se você não se cadastrou no AgendaBem, ignore este email.
        
        © 2024 AgendaBem - agendabem.com
      `
    }
  }

  // Template para email de boas-vindas (simplificado para testar)
  private static createWelcomeEmail(data: WelcomeEmailData): EmailTemplate {
    return {
      to: data.email,
      subject: '🎉 Bem-vindo ao AgendaBem!',
      html: `
        <!DOCTYPE html>
        <html lang="pt-BR">
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Bem-vindo - AgendaBem</title>
        </head>
        <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: #f0fdf4; padding: 30px; border-radius: 12px; text-align: center;">
            <h1 style="color: #16a34a;">🎉 Bem-vindo ao AgendaBem!</h1>
            <h2>Olá, ${data.name}!</h2>
            <p>Sua conta foi verificada com sucesso! Você já pode acessar o dashboard.</p>
            <div style="margin: 30px 0;">
              <a href="${data.dashboardUrl}" style="background: #16a34a; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; display: inline-block;">
                🏠 Acessar Dashboard
              </a>
            </div>
            <p style="color: #64748b; font-size: 12px;">© 2024 AgendaBem</p>
          </div>
        </body>
        </html>
      `,
      text: `Bem-vindo ao AgendaBem, ${data.name}! Sua conta foi verificada. Acesse: ${data.dashboardUrl}`
    }
  }

  // Verificar conexão SMTP
  private static async verifyConnection(): Promise<boolean> {
    try {
      console.log('🔍 Testando conexão SMTP...')
      await this.transporter.verify()
      console.log('✅ Conexão SMTP verificada com sucesso')
      return true
    } catch (error) {
      console.error('❌ Erro na conexão SMTP:', error)
      return false
    }
  }

  // Enviar email de verificação
  static async sendVerificationEmail(name: string, email: string, userId: string): Promise<boolean> {
    try {
      console.log(`📧 Iniciando envio de email de verificação para: ${email}`)
      
      // Verificar configuração SMTP primeiro
      const isConnected = await this.verifyConnection()
      if (!isConnected) {
        console.error('❌ Falha na conexão SMTP')
        return false
      }

      // Gerar e armazenar token
      const token = this.generateAndStoreVerificationToken(email, userId)
      const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'
      
      console.log(`🔑 Token gerado para ${email}: ${token.slice(0, 8)}...`)
      
      const emailData = this.createVerificationEmail({
        name,
        email,
        token,
        baseUrl
      })

      const result = await this.transporter.sendMail({
        from: this.fromEmail,
        to: emailData.to,
        subject: emailData.subject,
        html: emailData.html,
        text: emailData.text
      })

      console.log('✅ Email de verificação enviado com sucesso:', result.messageId)
      return true
      
    } catch (error) {
      console.error('❌ Erro ao enviar email de verificação:', error)
      return false
    }
  }

  // Enviar email de boas-vindas
  static async sendWelcomeEmail(name: string, email: string): Promise<boolean> {
    try {
      console.log(`📧 Enviando email de boas-vindas para: ${email}`)
      
      const dashboardUrl = `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/agenda`
      
      const emailData = this.createWelcomeEmail({
        name,
        email,
        dashboardUrl
      })

      const result = await this.transporter.sendMail({
        from: this.fromEmail,
        to: emailData.to,
        subject: emailData.subject,
        html: emailData.html,
        text: emailData.text
      })

      console.log('✅ Email de boas-vindas enviado:', result.messageId)
      return true
      
    } catch (error) {
      console.error('❌ Erro ao enviar email de boas-vindas:', error)
      return false
    }
  }

  // Enviar email de recuperação de senha
  static async sendPasswordResetEmail(name: string, email: string): Promise<boolean> {
    try {
      console.log(`📧 Enviando email de recuperação para: ${email}`)
      
      const token = crypto.randomBytes(32).toString('hex')
      const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'
      
      // TODO: Implementar armazenamento de token de reset de senha no futuro
      
      const emailData: EmailTemplate = {
        to: email,
        subject: '🔐 Redefinir senha - AgendaBem',
        html: `
          <!DOCTYPE html>
          <html lang="pt-BR">
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Redefinir Senha - AgendaBem</title>
          </head>
          <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: #fef3c7; padding: 30px; border-radius: 8px; text-align: center;">
              <h1 style="color: #2563eb;">AgendaBem</h1>
              <h2 style="color: #92400e;">🔐 Solicitação de Nova Senha</h2>
              <p>Olá, <strong>${name}</strong></p>
              <p>Recebemos uma solicitação para redefinir a senha da sua conta.</p>
              <div style="margin: 30px 0;">
                <a href="${baseUrl}/redefinir-senha?token=${token}&email=${encodeURIComponent(email)}" 
                   style="background: #d97706; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; display: inline-block;">
                  🔑 Redefinir Senha
                </a>
              </div>
              <p style="color: #64748b; font-size: 12px;">Este link expira em 1 hora.</p>
              <p style="color: #64748b; font-size: 12px;">© 2024 AgendaBem</p>
            </div>
          </body>
          </html>
        `,
        text: `Olá, ${name}! Para redefinir sua senha, acesse: ${baseUrl}/redefinir-senha?token=${token}&email=${email}`
      }

      const result = await this.transporter.sendMail({
        from: this.fromEmail,
        to: emailData.to,
        subject: emailData.subject,
        html: emailData.html,
        text: emailData.text
      })

      console.log('✅ Email de recuperação enviado:', result.messageId)
      return true
      
    } catch (error) {
      console.error('❌ Erro ao enviar email de recuperação:', error)
      return false
    }
  }

  // Testar configuração SMTP
  static async testEmailConfiguration(): Promise<boolean> {
    try {
      console.log('🧪 Testando configuração SMTP...')
      
      // Verificar variáveis de ambiente
      if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
        console.error('❌ Variáveis SMTP não configuradas')
        return false
      }
      
      console.log('📋 Configuração SMTP:')
      console.log(`   Host: ${process.env.SMTP_HOST}`)
      console.log(`   Port: ${process.env.SMTP_PORT || '465'}`)
      console.log(`   User: ${process.env.SMTP_USER}`)
      console.log(`   From: ${this.fromEmail}`)
      
      const isConnected = await this.verifyConnection()
      if (!isConnected) {
        return false
      }

      console.log('✅ Configuração SMTP funcionando corretamente')
      return true
      
    } catch (error) {
      console.error('❌ Erro na configuração SMTP:', error)
      return false
    }
  }

  // Reenviar email de verificação
  static async resendVerificationEmail(email: string): Promise<boolean> {
    try {
      // Buscar usuário no banco de dados
      const { prisma } = await import('@/lib/db')
      
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
        console.error('❌ Usuário não encontrado para reenvio')
        return false
      }

      if (user.emailVerified) {
        console.log('ℹ️ Email já verificado, não é necessário reenviar')
        return true
      }

      return await this.sendVerificationEmail(user.name, user.email, user.id)
      
    } catch (error) {
      console.error('❌ Erro ao reenviar email de verificação:', error)
      return false
    }
  }

  // Método auxiliar para testes (sem precisar de userId real)
  static async sendTestVerificationEmail(name: string, email: string): Promise<boolean> {
    const testUserId = 'test-user-' + crypto.randomBytes(8).toString('hex')
    return await this.sendVerificationEmail(name, email, testUserId)
  }
}