import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { createAuditLog } from '@/lib/audit'
import { rateLimit } from '@/lib/rate-limit'
import { clientSchema } from '@/lib/validation'
import { sanitizeInput } from '@/lib/crypto'

// GET /api/clientes - Listar clientes com busca e paginação
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
    const page = parseInt(searchParams.get('page') || '1')
    const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 50)
    const search = searchParams.get('search') || ''
    const status = searchParams.get('status') || 'all'
    const skip = (page - 1) * limit

    // Filtros de busca - apenas clientes do usuário logado
    const where: any = {
      userId: session.user.id,
      deletedAt: null
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } }
      ]
    }

    const [clients, total] = await Promise.all([
      prisma.client.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          birthDate: true,
          createdAt: true,
          updatedAt: true,
          appointments: {
            select: {
              id: true,
              status: true,
              servicePrice: true,
              createdAt: true
            }
          }
        }
      }),
      prisma.client.count({ where })
    ])

    // Calcular estatísticas por cliente (total gasto, último agendamento, status)
    const clientsWithStats = clients.map(client => {
      const appointments = client.appointments
      const totalAppointments = appointments.length
      const completedAppointments = appointments.filter(apt => apt.status === 'COMPLETED')
      const totalSpent = completedAppointments.reduce((sum, apt) => sum + Number(apt.servicePrice || 0), 0)
      
      const threeMonthsAgo = new Date()
      threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3)
      
      const recentAppointments = appointments.filter(apt => 
        new Date(apt.createdAt || 0) > threeMonthsAgo
      )
      
      const clientStatus = recentAppointments.length > 0 ? 'active' : 'inactive'

      return {
        id: client.id,
        name: client.name,
        email: client.email,
        phone: client.phone,
        birthDate: client.birthDate,
        createdAt: client.createdAt,
        updatedAt: client.updatedAt,
        status: clientStatus,
        totalAppointments,
        totalSpent: Number(totalSpent),
        lastAppointment: appointments.length > 0 
          ? appointments.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())[0].createdAt
          : null
      }
    })

    const filteredClients = status === 'all' 
      ? clientsWithStats
      : clientsWithStats.filter(client => client.status === status)

    await createAuditLog({
      userId: session.user.id,
      action: 'READ',
      resource: 'clients',
      details: { page, limit, search: search ? 'filtered' : 'all', resultCount: filteredClients.length },
      ipAddress: request.headers.get('x-forwarded-for') || undefined,
      userAgent: request.headers.get('user-agent') || undefined
    })

    return NextResponse.json({
      clients: filteredClients,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1
      },
      stats: {
        total,
        active: clientsWithStats.filter(c => c.status === 'active').length,
        inactive: clientsWithStats.filter(c => c.status === 'inactive').length
      }
    })

  } catch (error) {
    console.error('Erro ao buscar clientes:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/clientes - Criar novo cliente
export async function POST(request: NextRequest) {
  try {
    const rateLimitResult = rateLimit(request, 'booking')
    if (!rateLimitResult.success) {
      return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 })
    }

    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()

    // Sanitização obrigatória para dados de entrada
    const sanitizedData = {
      name: sanitizeInput(body.name || ''),
      email: body.email ? sanitizeInput(body.email).toLowerCase() : undefined,
      phone: body.phone ? sanitizeInput(body.phone) : undefined,
      birthDate: body.birthDate || undefined,
      notes: body.notes ? sanitizeInput(body.notes) : undefined,
      dataConsent: Boolean(body.dataConsent)
    }

    // Validação Zod
    const validationResult = clientSchema.safeParse(sanitizedData)
    if (!validationResult.success) {
      return NextResponse.json({
        error: 'Validation failed',
        details: validationResult.error.issues.map(issue => ({
          field: issue.path.join('.'),
          message: issue.message
        }))
      }, { status: 400 })
    }

    const { name, email, phone, birthDate, notes, dataConsent } = validationResult.data

    // Verificar duplicatas por email ou telefone
    if (email || phone) {
      const existingClient = await prisma.client.findFirst({
        where: {
          userId: session.user.id,
          deletedAt: null,
          OR: [
            ...(email ? [{ email }] : []),
            ...(phone ? [{ phone }] : [])
          ]
        }
      })

      if (existingClient) {
        return NextResponse.json({
          error: 'Client already exists',
          message: 'Já existe um cliente com este email ou telefone'
        }, { status: 409 })
      }
    }

    const client = await prisma.client.create({
      data: {
        userId: session.user.id,
        name,
        email,
        phone,
        birthDate: birthDate ? new Date(birthDate) : undefined,
        notes,
        dataConsent,
        consentDate: dataConsent ? new Date() : undefined
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        birthDate: true,
        createdAt: true
      }
    })

    await createAuditLog({
      userId: session.user.id,
      action: 'CREATE',
      resource: 'clients',
      resourceId: client.id,
      details: { name, hasEmail: !!email, hasPhone: !!phone, dataConsent },
      ipAddress: request.headers.get('x-forwarded-for') || undefined,
      userAgent: request.headers.get('user-agent') || undefined
    })

    return NextResponse.json({
      success: true,
      message: 'Cliente criado com sucesso',
      client: {
        ...client,
        status: 'active',
        totalAppointments: 0,
        totalSpent: 0,
        lastAppointment: null
      }
    }, { status: 201 })

  } catch (error) {
    console.error('Erro ao criar cliente:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT() {
  return NextResponse.json({ error: 'Method not allowed. Use /api/clientes/[id]' }, { status: 405 })
}

export async function DELETE() {
  return NextResponse.json({ error: 'Method not allowed. Use /api/clientes/[id]' }, { status: 405 })
}