import { NextRequest } from 'next/server'

interface RateLimitConfig {
  windowMs: number
  max: number
  message?: string
  skipSuccessfulRequests?: boolean
  skipFailedRequests?: boolean
}

interface RateLimitStore {
  count: number
  resetTime: number
  blocked: boolean
}

const store = new Map<string, RateLimitStore>()

const rateLimitConfigs: Record<string, RateLimitConfig> = {
  default: {
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: 'Muitas requisições. Tente novamente em alguns minutos.'
  },
  api: {
    windowMs: 15 * 60 * 1000,
    max: 50,
    message: 'Limite de API excedido. Aguarde antes de tentar novamente.'
  },
  auth: {
    windowMs: 15 * 60 * 1000,
    max: 10,
    message: 'Muitas tentativas de login. Aguarde 15 minutos.'
  },
  booking: {
    windowMs: 60 * 1000,
    max: 5,
    message: 'Muitos agendamentos. Aguarde 1 minuto antes de tentar novamente.'
  },
  contact: {
    windowMs: 60 * 60 * 1000,
    max: 3,
    message: 'Muitas mensagens de contato. Aguarde 1 hora.'
  },
  export: {
    windowMs: 60 * 60 * 1000,
    max: 5,
    message: 'Muitas exportações de dados. Aguarde 1 hora.'
  }
}

function getClientIdentifier(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for')
  const realIp = request.headers.get('x-real-ip')
  const ip = forwarded?.split(',')[0] || realIp || 'unknown'
  
  const userAgent = request.headers.get('user-agent') || 'unknown'
  const userAgentHash = require('crypto')
    .createHash('md5')
    .update(userAgent)
    .digest('hex')
    .slice(0, 8)
  
  return `${ip}:${userAgentHash}`
}

function cleanExpiredEntries() {
  const now = Date.now()
  for (const [key, value] of store.entries()) {
    if (now > value.resetTime) {
      store.delete(key)
    }
  }
}

export function rateLimit(
  request: NextRequest,
  configType: keyof typeof rateLimitConfigs = 'default'
): { success: boolean; remaining: number; resetTime: number; message?: string } {
  const config = rateLimitConfigs[configType]
  const identifier = getClientIdentifier(request)
  const now = Date.now()
  
  cleanExpiredEntries()
  
  let entry = store.get(identifier)
  
  if (!entry || now > entry.resetTime) {
    entry = {
      count: 1,
      resetTime: now + config.windowMs,
      blocked: false
    }
    store.set(identifier, entry)
    
    return {
      success: true,
      remaining: config.max - 1,
      resetTime: entry.resetTime
    }
  }
  
  if (entry.count >= config.max) {
    entry.blocked = true
    
    return {
      success: false,
      remaining: 0,
      resetTime: entry.resetTime,
      message: config.message
    }
  }
  
  entry.count++
  
  return {
    success: true,
    remaining: config.max - entry.count,
    resetTime: entry.resetTime
  }
}

export function checkRateLimit(
  request: NextRequest,
  configType: keyof typeof rateLimitConfigs = 'default'
): boolean {
  const result = rateLimit(request, configType)
  return result.success
}

export function getRateLimitInfo(
  request: NextRequest,
  configType: keyof typeof rateLimitConfigs = 'default'
): { count: number; remaining: number; resetTime: number } {
  const config = rateLimitConfigs[configType]
  const identifier = getClientIdentifier(request)
  const entry = store.get(identifier)
  
  if (!entry || Date.now() > entry.resetTime) {
    return {
      count: 0,
      remaining: config.max,
      resetTime: Date.now() + config.windowMs
    }
  }
  
  return {
    count: entry.count,
    remaining: Math.max(0, config.max - entry.count),
    resetTime: entry.resetTime
  }
}

export function isBlocked(request: NextRequest): boolean {
  const identifier = getClientIdentifier(request)
  const entry = store.get(identifier)
  
  if (!entry || Date.now() > entry.resetTime) {
    return false
  }
  
  return entry.blocked
}

export function blockClient(request: NextRequest, durationMs: number = 60 * 60 * 1000) {
  const identifier = getClientIdentifier(request)
  const now = Date.now()
  
  store.set(identifier, {
    count: 999,
    resetTime: now + durationMs,
    blocked: true
  })
}

export function unblockClient(request: NextRequest) {
  const identifier = getClientIdentifier(request)
  store.delete(identifier)
}

export function getRateLimitStats(): {
  totalClients: number
  blockedClients: number
  topClients: Array<{ identifier: string; count: number; blocked: boolean }>
} {
  cleanExpiredEntries()
  
  const clients = Array.from(store.entries()).map(([identifier, data]) => ({
    identifier: identifier.replace(/^(.{8}).*/, '$1***'),
    count: data.count,
    blocked: data.blocked
  }))
  
  return {
    totalClients: clients.length,
    blockedClients: clients.filter(c => c.blocked).length,
    topClients: clients
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)
  }
}

export async function cleanupRateLimit() {
  const before = store.size
  cleanExpiredEntries()
  const after = store.size
  const cleaned = before - after
  
  if (cleaned > 0) {
    console.log(`🧹 Rate limit: Removidas ${cleaned} entradas expiradas`)
  }
  
  return cleaned
}

export function createRateLimitResponse(
  message: string,
  resetTime: number
): Response {
  const resetTimeSeconds = Math.ceil((resetTime - Date.now()) / 1000)
  
  return new Response(
    JSON.stringify({
      error: 'Rate limit exceeded',
      message,
      retryAfter: resetTimeSeconds
    }),
    {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        'Retry-After': resetTimeSeconds.toString(),
        'X-RateLimit-Limit': '100',
        'X-RateLimit-Remaining': '0',
        'X-RateLimit-Reset': Math.ceil(resetTime / 1000).toString()
      }
    }
  )
}

setInterval(cleanupRateLimit, 5 * 60 * 1000)