import { NextResponse } from 'next/server'
import crypto from 'crypto'

export function generateNonce(): string {
  return crypto.randomBytes(16).toString('base64')
}

export function createCSP(nonce?: string): string {
  const directives = [
    "default-src 'self'",
    `script-src 'self' 'unsafe-inline' ${nonce ? `'nonce-${nonce}'` : ''} https://js.stripe.com https://challenges.cloudflare.com`,
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "img-src 'self' data: https: blob:",
    "font-src 'self' https://fonts.gstatic.com",
    "connect-src 'self' https://api.stripe.com https://*.supabase.co wss://*.supabase.co",
    "frame-src 'self' https://js.stripe.com https://challenges.cloudflare.com",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "upgrade-insecure-requests"
  ]
  
  if (process.env.NODE_ENV === 'development') {
    directives[1] = "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://js.stripe.com"
  }
  
  return directives.join('; ')
}

export function addSecurityHeaders(
  response: NextResponse,
  options?: {
    nonce?: string
    isDevelopment?: boolean
  }
): NextResponse {
  const { nonce, isDevelopment = process.env.NODE_ENV === 'development' } = options || {}
  
  const csp = createCSP(nonce)
  response.headers.set('Content-Security-Policy', csp)
  
  response.headers.set('X-DNS-Prefetch-Control', 'on')
  response.headers.set('X-XSS-Protection', '1; mode=block')
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  
  const permissionsPolicy = [
    'camera=()',
    'microphone=()',
    'geolocation=()',
    'interest-cohort=()',
    'payment=(self)',
    'usb=()',
    'serial=()',
    'bluetooth=()'
  ].join(', ')
  response.headers.set('Permissions-Policy', permissionsPolicy)
  
  if (!isDevelopment) {
    response.headers.set(
      'Strict-Transport-Security',
      'max-age=63072000; includeSubDomains; preload'
    )
  }
  
  response.headers.set('X-Powered-By', 'AgendaBem')
  response.headers.set('Server', 'AgendaBem/1.0')
  
  response.headers.set('Cross-Origin-Embedder-Policy', 'require-corp')
  response.headers.set('Cross-Origin-Opener-Policy', 'same-origin')
  response.headers.set('Cross-Origin-Resource-Policy', 'same-origin')
  
  return response
}

export function validateOrigin(origin: string | null): boolean {
  if (!origin) return true
  
  const allowedOrigins = [
    process.env.NEXTAUTH_URL || 'http://localhost:3000',
    process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
    'https://agendabem.com',
    'https://www.agendabem.com'
  ]
  
  if (process.env.NODE_ENV === 'development') {
    allowedOrigins.push('http://localhost:3000', 'http://127.0.0.1:3000')
  }
  
  return allowedOrigins.includes(origin)
}

export function sanitizeInput(input: string): string {
  if (!input || typeof input !== 'string') return ''
  
  return input
    .trim()
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    .replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, '')
    .replace(/<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/data:text\/html/gi, '')
    .replace(/vbscript:/gi, '')
    .replace(/on\w+\s*=/gi, '')
    .slice(0, 10000)
}

export function sanitizeHtml(html: string): string {
  if (!html || typeof html !== 'string') return ''
  
  const allowedTags = ['p', 'br', 'strong', 'em', 'u', 'ol', 'ul', 'li']
  const tagPattern = /<\/?([a-zA-Z][a-zA-Z0-9]*)\b[^>]*>/g
  
  return html.replace(tagPattern, (match, tagName) => {
    if (allowedTags.includes(tagName.toLowerCase())) {
      return match.replace(/\s(on\w+|javascript:|data:)/gi, '')
    }
    return ''
  })
}

export function validateEmail(email: string): boolean {
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/
  return emailRegex.test(email) && email.length <= 254
}

export function validatePhone(phone: string): boolean {
  const phoneRegex = /^(\+55\s?)?(\(?\d{2}\)?\s?)?\d{4,5}-?\d{4}$/
  return phoneRegex.test(phone.replace(/\s/g, ''))
}

export function validateUrl(url: string): boolean {
  try {
    const parsed = new URL(url)
    return ['http:', 'https:'].includes(parsed.protocol)
  } catch {
    return false
  }
}

export function generateCSRFToken(): string {
  return crypto.randomBytes(32).toString('hex')
}

export function validateCSRFToken(token: string, sessionToken: string): boolean {
  if (!token || !sessionToken) return false
  
  try {
    const expectedToken = crypto
      .createHmac('sha256', process.env.NEXTAUTH_SECRET || 'fallback')
      .update(sessionToken)
      .digest('hex')
    
    return crypto.timingSafeEqual(
      Buffer.from(token, 'hex'),
      Buffer.from(expectedToken, 'hex')
    )
  } catch {
    return false
  }
}

export function maskSensitiveData(data: any, fields: string[] = []): any {
  if (!data || typeof data !== 'object') return data
  
  const sensitiveFields = [
    'password', 'passwordHash', 'token', 'secret', 'key',
    'phone', 'cpf', 'rg', 'creditCard', 'bankAccount',
    ...fields
  ]
  
  const masked = { ...data }
  
  for (const field of sensitiveFields) {
    if (masked[field]) {
      if (field === 'email') {
        const email = masked[field] as string
        const [local, domain] = email.split('@')
        masked[field] = `${local.slice(0, 2)}***@${domain}`
      } else if (field === 'phone') {
        const phone = masked[field] as string
        masked[field] = `${phone.slice(0, 2)}****${phone.slice(-4)}`
      } else {
        masked[field] = '[MASKED]'
      }
    }
  }
  
  return masked
}

export function checkPasswordStrength(password: string): {
  score: number
  feedback: string[]
  isStrong: boolean
} {
  const feedback: string[] = []
  let score = 0
  
  if (password.length >= 8) score += 1
  else feedback.push('Deve ter pelo menos 8 caracteres')
  
  if (password.length >= 12) score += 1
  
  if (/[a-z]/.test(password)) score += 1
  else feedback.push('Deve conter pelo menos uma letra minúscula')
  
  if (/[A-Z]/.test(password)) score += 1
  else feedback.push('Deve conter pelo menos uma letra maiúscula')
  
  if (/[0-9]/.test(password)) score += 1
  else feedback.push('Deve conter pelo menos um número')
  
  if (/[^a-zA-Z0-9]/.test(password)) score += 1
  else feedback.push('Deve conter pelo menos um símbolo')
  
  if (!/(.)\1{2,}/.test(password)) score += 1
  else feedback.push('Não deve ter caracteres repetidos consecutivos')
  
  const commonPasswords = ['123456', 'password', 'admin', 'qwerty']
  if (!commonPasswords.includes(password.toLowerCase())) score += 1
  else feedback.push('Não use senhas comuns')
  
  return {
    score,
    feedback,
    isStrong: score >= 6
  }
}

export function logSecurityEvent(
  event: string,
  details: Record<string, any>,
  severity: 'low' | 'medium' | 'high' | 'critical' = 'medium'
) {
  const logData = {
    timestamp: new Date().toISOString(),
    event,
    severity,
    details: maskSensitiveData(details),
    nodeEnv: process.env.NODE_ENV
  }
  
  if (severity === 'critical' || severity === 'high') {
    console.error('🚨 SECURITY EVENT:', JSON.stringify(logData, null, 2))
  } else {
    console.warn('⚠️ Security Event:', JSON.stringify(logData))
  }
  
  return logData
}