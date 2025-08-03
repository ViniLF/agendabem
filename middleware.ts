import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getToken } from 'next-auth/jwt'

const rateLimit = new Map<string, { count: number; resetTime: number }>()

const RATE_LIMIT_WINDOW = 15 * 60 * 1000
const RATE_LIMIT_MAX_REQUESTS = 100

const protectedPaths = [
  '/dashboard',
  '/agenda',
  '/clientes',
  '/servicos',
  '/configuracoes',
  '/relatorios',
  '/privacidade'
]

const apiPaths = [
  '/api/auth',
  '/api/agendamentos',
  '/api/clientes',
  '/api/payments',
  '/api/subscriptions'
]

function checkRateLimit(ip: string, isApi: boolean = false): boolean {
  const now = Date.now()
  const windowMs = RATE_LIMIT_WINDOW
  const maxRequests = isApi ? 50 : RATE_LIMIT_MAX_REQUESTS
  
  for (const [key, value] of rateLimit.entries()) {
    if (now > value.resetTime) {
      rateLimit.delete(key)
    }
  }
  
  const current = rateLimit.get(ip)
  
  if (!current) {
    rateLimit.set(ip, { count: 1, resetTime: now + windowMs })
    return true
  }
  
  if (now > current.resetTime) {
    rateLimit.set(ip, { count: 1, resetTime: now + windowMs })
    return true
  }
  
  if (current.count >= maxRequests) {
    return false
  }
  
  current.count++
  return true
}

function addSecurityHeaders(response: NextResponse): NextResponse {
  const csp = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://js.stripe.com",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "img-src 'self' data: https: blob:",
    "font-src 'self' https://fonts.gstatic.com",
    "connect-src 'self' https://api.stripe.com",
    "frame-src 'self' https://js.stripe.com",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'"
  ].join('; ')

  response.headers.set('Content-Security-Policy', csp)
  response.headers.set('X-XSS-Protection', '1; mode=block')
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('Referrer-Policy', 'origin-when-cross-origin')
  
  if (process.env.NODE_ENV === 'production') {
    response.headers.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload')
  }
  
  return response
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown'
  
  const isApiPath = apiPaths.some(path => pathname.startsWith(path))
  const isApiRoute = pathname.startsWith('/api/')
  
  if (!checkRateLimit(ip, isApiPath || isApiRoute)) {
    return new NextResponse(
      JSON.stringify({ 
        error: 'Rate limit exceeded', 
        message: 'Muitas requisições. Tente novamente em alguns minutos.' 
      }),
      { 
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': '900'
        }
      }
    )
  }
  
  let response = NextResponse.next()
  response = addSecurityHeaders(response)
  
  const isProtectedPath = protectedPaths.some(path => 
    pathname.startsWith(path) || pathname.startsWith(`/(dashboard)${path}`)
  )
  
  if (isProtectedPath) {
    const token = await getToken({ 
      req: request,
      secret: process.env.NEXTAUTH_SECRET 
    })
    
    if (!token) {
      const loginUrl = new URL('/entrar', request.url)
      loginUrl.searchParams.set('callbackUrl', pathname)
      return NextResponse.redirect(loginUrl)
    }
    
    if (pathname.startsWith('/admin') && token.role !== 'ADMIN') {
      return new NextResponse(
        JSON.stringify({ error: 'Acesso negado' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      )
    }
  }
  
  if (pathname.startsWith('/(auth)') || ['/entrar', '/cadastro'].includes(pathname)) {
    const token = await getToken({ 
      req: request,
      secret: process.env.NEXTAUTH_SECRET 
    })
    
    if (token) {
      return NextResponse.redirect(new URL('/agenda', request.url))
    }
  }
  
  if (process.env.NODE_ENV === 'production' && 
      (isApiRoute || pathname.includes('delete') || pathname.includes('export'))) {
    console.log(`[AUDIT] ${request.method} ${pathname} - IP: ${ip.slice(0, 8)}***`)
  }
  
  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|public|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}