import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { createAuditLog } from '@/lib/audit'
import { rateLimit } from '@/lib/rate-limit'
import { serviceSchema } from '@/lib/validation'
import { sanitizeInput } from '@/lib/crypto'

// GET /api/servicos - Listar serviços do profissional
export async function GET(request: NextRequest) {
  try {
    const rateLimitResult = rateLimit(request, 'api')
    if (!rateLimitResult.success) {
      return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 })
    }

    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search') || ''
    const status = searchParams.get('status') || 'all'

    const where: any = {
      userId: session.user.id
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } }
      ]
    }

    if (status !== 'all') {
      where.isActive = status === 'active'
    }

    const services = await prisma.service.findMany({
      where,
      orderBy: [
        { sortOrder: 'asc' },
        { createdAt: 'desc' }
      ],
      include: {
        appointments: {
          select: {
            id: true,
            createdAt: true,
            status: true
          }
        }
      }
    })

    // Calcular estatísticas de uso por serviço
    const servicesWithStats = services.map(service => {
      const appointments = service.appointments
      const appointmentsCount = appointments.length
      
      // Última vez que foi usado
      const lastUsed = appointments.length > 0 
        ? appointments.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0].createdAt
        : service.createdAt

      return {
        id: service.id,
        name: service.name,
        description: service.description,
        duration: service.duration,
        price: Number(service.price || 0),
        color: service.color,
        isActive: service.isActive,
        sortOrder: service.sortOrder,
        createdAt: service.createdAt,
        updatedAt: service.updatedAt,
        appointmentsCount,
        lastUsed
      }
    })

    await createAuditLog({
      userId: session.user.id,
      action: 'READ',
      resource: 'services',
      details: { search: search ? 'filtered' : 'all', status, resultCount: servicesWithStats.length },
      ipAddress: request.headers.get('x-forwarded-for') || undefined,
      userAgent: request.headers.get('user-agent') || undefined
    })

    return NextResponse.json({
      services: servicesWithStats,
      stats: {
        total: servicesWithStats.length,
        active: servicesWithStats.filter(s => s.isActive).length,
        inactive: servicesWithStats.filter(s => !s.isActive).length,
        avgDuration: servicesWithStats.length > 0 
          ? Math.round(servicesWithStats.reduce((sum, s) => sum + s.duration, 0) / servicesWithStats.length)
          : 0,
        avgPrice: servicesWithStats.length > 0
          ? servicesWithStats.reduce((sum, s) => sum + s.price, 0) / servicesWithStats.length
          : 0
      }
    })

  } catch (error) {
    console.error('Erro ao buscar serviços:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/servicos - Criar novo serviço
export async function POST(request: NextRequest) {
  try {
    const rateLimitResult = rateLimit(request, 'api')
    if (!rateLimitResult.success) {
      return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 })
    }

    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()

    // Sanitização obrigatória
    const sanitizedData = {
      name: sanitizeInput(body.name || ''),
      description: body.description ? sanitizeInput(body.description) : undefined,
      duration: parseInt(body.duration) || 60,
      price: body.price ? parseFloat(body.price) : undefined,
      color: body.color || '#3B82F6',
      isActive: Boolean(body.isActive ?? true)
    }

    // Validação Zod
    const validationResult = serviceSchema.safeParse(sanitizedData)
    if (!validationResult.success) {
      return NextResponse.json({
        error: 'Validation failed',
        details: validationResult.error.issues.map(issue => ({
          field: issue.path.join('.'),
          message: issue.message
        }))
      }, { status: 400 })
    }

    const { name, description, duration, price, color, isActive } = validationResult.data

    // Verificar se já existe serviço com mesmo nome
    const existingService = await prisma.service.findFirst({
      where: {
        userId: session.user.id,
        name: { equals: name, mode: 'insensitive' }
      }
    })

    if (existingService) {
      return NextResponse.json({
        error: 'Service already exists',
        message: 'Já existe um serviço com este nome'
      }, { status: 409 })
    }

    // Obter próximo sortOrder
    const lastService = await prisma.service.findFirst({
      where: { userId: session.user.id },
      orderBy: { sortOrder: 'desc' }
    })

    const nextSortOrder = (lastService?.sortOrder || 0) + 1

    const service = await prisma.service.create({
      data: {
        userId: session.user.id,
        name,
        description,
        duration,
        price,
        color,
        isActive,
        sortOrder: nextSortOrder
      },
      select: {
        id: true,
        name: true,
        description: true,
        duration: true,
        price: true,
        color: true,
        isActive: true,
        sortOrder: true,
        createdAt: true
      }
    })

    await createAuditLog({
      userId: session.user.id,
      action: 'CREATE',
      resource: 'services',
      resourceId: service.id,
      details: { name, duration, price, isActive },
      ipAddress: request.headers.get('x-forwarded-for') || undefined,
      userAgent: request.headers.get('user-agent') || undefined
    })

    return NextResponse.json({
      success: true,
      message: 'Serviço criado com sucesso',
      service: {
        ...service,
        price: Number(service.price || 0),
        appointmentsCount: 0,
        lastUsed: service.createdAt
      }
    }, { status: 201 })

  } catch (error) {
    console.error('Erro ao criar serviço:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT() {
  return NextResponse.json({ error: 'Method not allowed. Use /api/servicos/[id]' }, { status: 405 })
}

export async function DELETE() {
  return NextResponse.json({ error: 'Method not allowed. Use /api/servicos/[id]' }, { status: 405 })
}