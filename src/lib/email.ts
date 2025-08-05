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

export class EmailService {
  private static transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.hostinger.com',
    port: parseInt(process.env.SMTP_PORT || '465'),
    secure: process.env.SMTP_SECURE === 'true', // true para 465, false para 587
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
    tls: {
      ciphers: 'SSLv3'
    }
  })

  private static fromEmail = process.env.SMTP_FROM_EMAIL || 'AgendaBem <noreply@agendabem.com>'
  
  // Gerar token de verificação de email
  private static generateEmailVerificationToken(email: string, userId: string): string {
    const secret = process.env.NEXTAUTH_SECRET || 'fallback-secret'
    return crypto
      .createHmac('sha256', secret)
      .update(`${email}:${userId}:verify`)
      .digest('hex')
  }
  
  // Template para verificação de email
  private static createVerificationEmail(data: VerificationEmailData): EmailTemplate {
    const verifyUrl = `${data.baseUrl}/verificar-email?token=${data.token}&email=${encodeURIComponent(data.email)}`
    
    return {
      to: data.email,
      subject: 'Verifique seu email - AgendaBem',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Verificar Email - AgendaBem</title>
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #2563eb; margin: 0;">AgendaBem</h1>
            <p style="color: #666; margin: 5px 0;">Sistema de Agendamentos Profissional</p>
          </div>
          
          <div style="background: #f8fafc; padding: 30px; border-radius: 8px; border: 1px solid #e2e8f0;">
            <h2 style="color: #1e293b; margin-top: 0;">Olá, ${data.name}! 👋</h2>
            
            <p>Obrigado por se cadastrar no <strong>AgendaBem</strong>! Para começar a usar nossa plataforma e gerenciar seus agendamentos, você precisa verificar seu endereço de email.</p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${verifyUrl}" style="background: #2563eb; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: 600; font-size: 16px; box-shadow: 0 4px 6px rgba(37, 99, 235, 0.25);">
                ✅ Verificar Email
              </a>
            </div>
            
            <p style="color: #666; font-size: 14px; background: #fef3c7; padding: 15px; border-radius: 6px; border-left: 4px solid #f59e0b;">
              <strong>⚠️ Importante:</strong> Se o botão não funcionar, copie e cole este link no seu navegador:<br>
              <a href="${verifyUrl}" style="color: #2563eb; word-break: break-all;">${verifyUrl}</a>
            </p>
            
            <p style="color: #666; font-size: 13px; margin-top: 30px; text-align: center;">
              🔒 Este link expira em <strong>24 horas</strong> por motivos de segurança.
            </p>
          </div>
          
          <div style="text-align: center; margin-top: 30px; color: #666; font-size: 12px;">
            <p>Se você não se cadastrou no AgendaBem, pode ignorar este email com segurança.</p>
            <p>© 2024 AgendaBem. Todos os direitos reservados.</p>
            <p style="margin-top: 15px;">
              <a href="https://agendabem.com" style="color: #2563eb;">agendabem.com</a> | 
              <a href="https://agendabem.com/contato" style="color: #2563eb;">Contato</a>
            </p>
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

  // Template para email de boas-vindas
  private static createWelcomeEmail(data: WelcomeEmailData): EmailTemplate {
    return {
      to: data.email,
      subject: '🎉 Bem-vindo ao AgendaBem! Sua conta está ativa',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Bem-vindo - AgendaBem</title>
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #16a34a; margin: 0;">🎉 Bem-vindo ao AgendaBem!</h1>
            <p style="color: #666; margin: 5px 0;">Sua conta foi verificada com sucesso!</p>
          </div>
          
          <div style="background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%); padding: 30px; border-radius: 12px; border: 1px solid #bbf7d0;">
            <h2 style="color: #166534; margin-top: 0;">Olá, ${data.name}! ✨</h2>
            
            <p style="font-size: 16px; margin-bottom: 25px;">
              <strong>Parabéns!</strong> Sua conta foi verificada com sucesso e você já pode começar a usar todas as funcionalidades do AgendaBem!
            </p>
            
            <div style="background: white; padding: 20px; border-radius: 8px; margin: 25px 0;">
              <h3 style="color: #166534; margin-top: 0; margin-bottom: 15px;">🚀 O que você pode fazer agora:</h3>
              <ul style="color: #374151; margin: 0; padding-left: 20px;">
                <li style="margin: 8px 0;">📅 <strong>Gerenciar sua agenda</strong> - Visualize e organize seus horários</li>
                <li style="margin: 8px 0;">👥 <strong>Cadastrar clientes</strong> - Mantenha dados organizados e seguros</li>
                <li style="margin: 8px 0;">⏰ <strong>Configurar horários</strong> - Defina sua disponibilidade</li>
                <li style="margin: 8px 0;">📊 <strong>Acompanhar relatórios</strong> - Veja estatísticas dos seus atendimentos</li>
                <li style="margin: 8px 0;">🔔 <strong>Receber notificações</strong> - Seja avisado sobre novos agendamentos</li>
              </ul>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${data.dashboardUrl}" style="background: #16a34a; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: 600; font-size: 16px; box-shadow: 0 4px 6px rgba(22, 163, 74, 0.25);">
                🏠 Acessar Meu Dashboard
              </a>
            </div>
            
            <div style="background: #fef3c7; padding: 15px; border-radius: 6px; border-left: 4px solid #f59e0b; margin-top: 25px;">
              <p style="margin: 0; font-size: 14px; color: #92400e;">
                <strong>💡 Dica:</strong> Precisa de ajuda para começar? Consulte nossa 
                <a href="${data.dashboardUrl}/ajuda" style="color: #2563eb;">central de ajuda</a> 
                ou entre em contato conosco.
              </p>
            </div>
          </div>
          
          <div style="text-align: center; margin-top: 30px; color: #666; font-size: 12px;">
            <p><strong>Obrigado por escolher o AgendaBem!</strong></p>
            <p>© 2024 AgendaBem. Todos os direitos reservados.</p>
            <p style="margin-top: 15px;">
              <a href="https://agendabem.com" style="color: #2563eb;">agendabem.com</a> | 
              <a href="https://agendabem.com/contato" style="color: #2563eb;">Contato</a> |
              <a href="https://agendabem.com/ajuda" style="color: #2563eb;">Ajuda</a>
            </p>
          </div>
        </body>
        </html>
      `,
      text: `
        🎉 Bem-vindo ao AgendaBem, ${data.name}!
        
        Sua conta foi verificada com sucesso!
        
        O que você pode fazer agora:
        ✅ Gerenciar sua agenda online
        ✅ Cadastrar e organizar clientes  
        ✅ Configurar horários de atendimento
        ✅ Acompanhar relatórios e estatísticas
        ✅ Receber notificações automáticas
        
        Acesse seu dashboard em: ${data.dashboardUrl}
        
        Precisa de ajuda? Visite: agendabem.com/ajuda
        
        Obrigado por escolher o AgendaBem!
        © 2024 AgendaBem - agendabem.com
      `
    }
  }

  // Template para recuperação de senha
  private static createPasswordResetEmail(data: PasswordResetData): EmailTemplate {
    const resetUrl = `${data.baseUrl}/redefinir-senha?token=${data.token}&email=${encodeURIComponent(data.email)}`
    
    return {
      to: data.email,
      subject: '🔐 Redefinir senha - AgendaBem',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Redefinir Senha - AgendaBem</title>
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #2563eb; margin: 0;">AgendaBem</h1>
            <p style="color: #666; margin: 5px 0;">Redefinição de Senha</p>
          </div>
          
          <div style="background: #fef3c7; padding: 30px; border-radius: 8px; border: 1px solid #fcd34d;">
            <h2 style="color: #92400e; margin-top: 0;">🔐 Solicitação de Nova Senha</h2>
            
            <p>Olá, <strong>${data.name}</strong></p>
            
            <p>Recebemos uma solicitação para redefinir a senha da sua conta no AgendaBem. Se foi você quem solicitou, clique no botão abaixo para criar uma nova senha:</p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${resetUrl}" style="background: #d97706; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: 600; font-size: 16px; box-shadow: 0 4px 6px rgba(217, 119, 6, 0.25);">
                🔑 Redefinir Senha
              </a>
            </div>
            
            <p style="color: #666; font-size: 14px; background: #fee2e2; padding: 15px; border-radius: 6px; border-left: 4px solid #dc2626;">
              <strong>⚠️ Importante:</strong> Se o botão não funcionar, copie e cole este link no seu navegador:<br>
              <a href="${resetUrl}" style="color: #d97706; word-break: break-all;">${resetUrl}</a>
            </p>
            
            <p style="color: #666; font-size: 13px; margin-top: 30px; text-align: center;">
              ⏰ Este link expira em <strong>1 hora</strong> por motivos de segurança.
            </p>
          </div>
          
          <div style="text-align: center; margin-top: 30px; color: #666; font-size: 12px;">
            <div style="background: #f3f4f6; padding: 15px; border-radius: 6px;">
              <p style="margin: 0;"><strong>🛡️ Não solicitou esta alteração?</strong></p>
              <p style="margin: 5px 0 0 0;">Ignore este email com segurança. Sua senha permanecerá inalterada.</p>
            </div>
            <p style="margin-top: 15px;">© 2024 AgendaBem. Todos os direitos reservados.</p>
          </div>
        </body>
        </html>
      `
    }
  }

  // Verificar conexão SMTP
  private static async verifyConnection(): Promise<boolean> {
    try {
      await this.transporter.verify()
      return true
    } catch (error) {
      console.error('❌ Erro na conexão SMTP:', error)
      return false
    }
  }

  // Enviar email de verificação
  static async sendVerificationEmail(name: string, email: string, userId: string): Promise<boolean> {
    try {
      // Verificar conexão SMTP
      const isConnected = await this.verifyConnection()
      if (!isConnected) {
        console.error('❌ Conexão SMTP falhou')
        return false
      }

      // Gerar token baseado no usuário
      const token = this.generateEmailVerificationToken(email, userId)
      const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'
      
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

      console.log('📧 Email de verificação enviado:', result.messageId)
      return true
      
    } catch (error) {
      console.error('❌ Erro ao enviar email de verificação:', error)
      return false
    }
  }

  // Enviar email de boas-vindas
  static async sendWelcomeEmail(name: string, email: string): Promise<boolean> {
    try {
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

      console.log('📧 Email de boas-vindas enviado:', result.messageId)
      return true
      
    } catch (error) {
      console.error('❌ Erro ao enviar email de boas-vindas:', error)
      return false
    }
  }

  // Enviar email de recuperação de senha
  static async sendPasswordResetEmail(name: string, email: string): Promise<boolean> {
    try {
      const token = crypto.randomBytes(32).toString('hex')
      const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'
      
      // TODO: Implementar armazenamento de token de reset de senha
      
      const emailData = this.createPasswordResetEmail({
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

      console.log('📧 Email de recuperação enviado:', result.messageId)
      return true
      
    } catch (error) {
      console.error('❌ Erro ao enviar email de recuperação:', error)
      return false
    }
  }

  // Testar configuração SMTP
  static async testEmailConfiguration(): Promise<boolean> {
    try {
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
}