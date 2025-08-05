import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { createAuditLog } from '@/lib/audit'
import { rateLimit } from '@/lib/rate-limit'
import { appointmentSchema } from '@/lib/validation'
import { sanitizeInput } from '@/lib/crypto'

// GET /api/agendamentos - Listar agendamentos com filtros
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
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const status = searchParams.get('status')
    const clientId = searchParams.get('clientId')
    const serviceId = searchParams.get('serviceId')
    const search = searchParams.get('search') || ''
    const skip = (page - 1) * limit

    const where: any = {
      userId: session.user.id,
      deletedAt: null
    }

    if (startDate && endDate) {
      where.date = {
        gte: new Date(startDate),
        lte: new Date(endDate)
      }
    } else if (startDate) {
      where.date = { gte: new Date(startDate) }
    } else if (endDate) {
      where.date = { lte: new Date(endDate) }
    }

    if (status && status !== 'all') {
      where.status = status
    }

    if (clientId) {
      where.clientId = clientId
    }

    if (serviceId) {
      where.serviceId = serviceId
    }

    if (search) {
      where.OR = [
        { clientName: { contains: search, mode: 'insensitive' } },
        { clientEmail: { contains: search, mode: 'insensitive' } },
        { serviceName: { contains: search, mode: 'insensitive' } },
        { notes: { contains: search, mode: 'insensitive' } },
        { 
          client: {
            name: { contains: search, mode: 'insensitive' }
          }
        }
      ]
    }

    const [appointments, total] = await Promise.all([
      prisma.appointment.findMany({
        where,
        skip,
        take: limit,
        orderBy: { date: 'desc' },
        include: {
          service: {
            select: {
              id: true,
              name: true,
              duration: true,
              price: true,
              color: true
            }
          },
          client: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true
            }
          }
        }
      }),
      prisma.appointment.count({ where })
    ])

    // Calcular estatísticas
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    const weekStart = new Date(today)
    weekStart.setDate(today.getDate() - today.getDay())
    const weekEnd = new Date(weekStart)
    weekEnd.setDate(weekStart.getDate() + 7)

    const [stats, todayCount, weekRevenue] = await Promise.all([
      prisma.appointment.groupBy({
        by: ['status'],
        where: { userId: session.user.id, deletedAt: null },
        _count: { status: true }
      }),
      prisma.appointment.count({
        where: {
          userId: session.user.id,
          deletedAt: null,
          date: { gte: today, lt: tomorrow }
        }
      }),
      prisma.appointment.aggregate({
        where: {
          userId: session.user.id,
          deletedAt: null,
          status: 'COMPLETED',
          date: { gte: weekStart, lt: weekEnd }
        },
        _sum: { servicePrice: true }
      })
    ])

    const statusCounts = stats.reduce((acc, stat) => {
      acc[stat.status.toLowerCase()] = stat._count.status
      return acc
    }, {} as Record<string, number>)

    await createAuditLog({
      userId: session.user.id,
      action: 'READ',
      resource: 'appointments',
      details: {
        page,
        limit,
        filters: { startDate, endDate, status, clientId, serviceId, search },
        resultCount: appointments.length
      },
      ipAddress: request.headers.get('x-forwarded-for') || undefined,
      userAgent: request.headers.get('user-agent') || undefined
    })

    return NextResponse.json({
      appointments,
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
        scheduled: statusCounts.scheduled || 0,
        confirmed: statusCounts.confirmed || 0,
        completed: statusCounts.completed || 0,
        cancelled: statusCounts.cancelled || 0,
        todayCount,
        weekRevenue: Number(weekRevenue._sum.servicePrice || 0)
      }
    })

  } catch (error) {
    console.error('Erro ao buscar agendamentos:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/agendamentos - Criar novo agendamento
export async function POST(request: NextRequest) {
  try {
    const rateLimitResult = rateLimit(request, 'booking')
    if (!rateLimitResult.success) {
      return NextResponse.json({ 
        error: 'Rate limit exceeded',
        message: rateLimitResult.message 
      }, { status: 429 })
    }

    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()

    const sanitizedData = {
      date: body.date || '',
      serviceId: body.serviceId || undefined,
      clientId: body.clientId || undefined,
      clientName: body.clientName ? sanitizeInput(body.clientName) : undefined,
      clientEmail: body.clientEmail ? sanitizeInput(body.clientEmail).toLowerCase() : undefined,
      clientPhone: body.clientPhone ? sanitizeInput(body.clientPhone) : undefined,
      serviceName: sanitizeInput(body.serviceName || ''),
      duration: parseInt(body.duration) || 60,
      servicePrice: body.servicePrice ? parseFloat(body.servicePrice) : undefined,
      notes: body.notes ? sanitizeInput(body.notes) : undefined,
      requiresPayment: Boolean(body.requiresPayment),
      paymentMethod: body.paymentMethod || 'OFFLINE'
    }

    const validationResult = appointmentSchema.safeParse(sanitizedData)
    if (!validationResult.success) {
      return NextResponse.json({
        error: 'Validation failed',
        details: validationResult.error.issues.map(issue => ({
          field: issue.path.join('.'),
          message: issue.message
        }))
      }, { status: 400 })
    }

    const {
      date,
      serviceId,
      clientId,
      clientName,
      clientEmail,
      clientPhone,
      serviceName,
      duration,
      servicePrice,
      notes,
      requiresPayment,
      paymentMethod
    } = validationResult.data

    const appointmentDate = new Date(date)
    
    // Verificar se a data não é no passado
    if (appointmentDate < new Date()) {
      return NextResponse.json({
        error: 'Invalid date',
        message: 'Não é possível agendar para datas passadas'
      }, { status: 400 })
    }

    // Verificar conflito de horários
    const conflictEnd = new Date(appointmentDate.getTime() + (duration * 60000))
    const existingAppointment = await prisma.appointment.findFirst({
      where: {
        userId: session.user.id,
        status: { in: ['SCHEDULED', 'CONFIRMED'] },
        date: {
          lt: conflictEnd
        },
        deletedAt: null,
        OR: [
          {
            date: {
              gte: appointmentDate
            }
          },
          {
            AND: [
              { date: { lte: appointmentDate } },
              {
                date: {
                  gte: new Date(appointmentDate.getTime() - (60 * 60000)) // 1 hora antes
                }
              }
            ]
          }
        ]
      }
    })

    if (existingAppointment) {
      return NextResponse.json({
        error: 'Time conflict',
        message: 'Já existe um agendamento neste horário'
      }, { status: 409 })
    }

    // Verificar se cliente existe (se clientId fornecido)
    if (clientId) {
      const existingClient = await prisma.client.findFirst({
        where: {
          id: clientId,
          userId: session.user.id,
          deletedAt: null
        }
      })

      if (!existingClient) {
        return NextResponse.json({
          error: 'Client not found',
          message: 'Cliente não encontrado'
        }, { status: 404 })
      }
    }

    // Verificar se serviço existe (se serviceId fornecido)
    if (serviceId) {
      const existingService = await prisma.service.findFirst({
        where: {
          id: serviceId,
          userId: session.user.id,
          isActive: true
        }
      })

      if (!existingService) {
        return NextResponse.json({
          error: 'Service not found',
          message: 'Serviço não encontrado ou inativo'
        }, { status: 404 })
      }
    }

    const appointment = await prisma.appointment.create({
      data: {
        userId: session.user.id,
        date: appointmentDate,
        duration,
        status: 'SCHEDULED',
        serviceId,
        clientId,
        clientName,
        clientEmail,
        clientPhone,
        serviceName,
        servicePrice,
        notes
      },
      include: {
        service: {
          select: {
            id: true,
            name: true,
            duration: true,
            price: true,
            color: true
          }
        },
        client: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true
          }
        }
      }
    })

    await createAuditLog({
      userId: session.user.id,
      action: 'CREATE',
      resource: 'appointments',
      resourceId: appointment.id,
      details: {
        serviceName,
        date: appointmentDate,
        clientName: clientName || 'Não informado',
        hasClientId: !!clientId,
        hasServiceId: !!serviceId,
        requiresPayment
      },
      ipAddress: request.headers.get('x-forwarded-for') || undefined,
      userAgent: request.headers.get('user-agent') || undefined
    })

    return NextResponse.json({
      success: true,
      message: 'Agendamento criado com sucesso',
      appointment
    }, { status: 201 })

  } catch (error) {
    console.error('Erro ao criar agendamento:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT() {
  return NextResponse.json({ error: 'Method not allowed. Use /api/agendamentos/[id]' }, { status: 405 })
}

export async function DELETE() {
  return NextResponse.json({ error: 'Method not allowed. Use /api/agendamentos/[id]' }, { status: 405 })
}