import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { createAuditLog } from '@/lib/audit'
import { rateLimit } from '@/lib/rate-limit'
import { appointmentSchema } from '@/lib/validation'
import { sanitizeInput } from '@/lib/crypto'

interface RouteParams {
  params: { id: string }
}

// GET /api/agendamentos/[id] - Buscar agendamento específico
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const rateLimitResult = rateLimit(request, 'api')
    if (!rateLimitResult.success) {
      return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 })
    }

    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const appointment = await prisma.appointment.findFirst({
      where: {
        id: params.id,
        userId: session.user.id,
        deletedAt: null
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

    if (!appointment) {
      return NextResponse.json({ error: 'Agendamento não encontrado' }, { status: 404 })
    }

    await createAuditLog({
      userId: session.user.id,
      action: 'READ',
      resource: 'appointments',
      resourceId: appointment.id,
      details: { appointmentDate: appointment.date },
      ipAddress: request.headers.get('x-forwarded-for') || undefined,
      userAgent: request.headers.get('user-agent') || undefined
    })

    return NextResponse.json(appointment)

  } catch (error) {
    console.error('Erro ao buscar agendamento:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PUT /api/agendamentos/[id] - Atualizar agendamento
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const rateLimitResult = rateLimit(request, 'api')
    if (!rateLimitResult.success) {
      return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 })
    }

    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const existingAppointment = await prisma.appointment.findFirst({
      where: {
        id: params.id,
        userId: session.user.id,
        deletedAt: null
      }
    })

    if (!existingAppointment) {
      return NextResponse.json({ error: 'Agendamento não encontrado' }, { status: 404 })
    }

    const body = await request.json()

    const sanitizedData = {
      date: body.date || existingAppointment.date.toISOString(),
      serviceId: body.serviceId || existingAppointment.serviceId,
      clientId: body.clientId || existingAppointment.clientId,
      clientName: body.clientName ? sanitizeInput(body.clientName) : existingAppointment.clientName,
      clientEmail: body.clientEmail ? sanitizeInput(body.clientEmail).toLowerCase() : existingAppointment.clientEmail,
      clientPhone: body.clientPhone ? sanitizeInput(body.clientPhone) : existingAppointment.clientPhone,
      serviceName: body.serviceName ? sanitizeInput(body.serviceName) : existingAppointment.serviceName,
      duration: body.duration ? parseInt(body.duration) : existingAppointment.duration,
      servicePrice: body.servicePrice !== undefined ? parseFloat(body.servicePrice) : existingAppointment.servicePrice,
      notes: body.notes !== undefined ? (body.notes ? sanitizeInput(body.notes) : null) : existingAppointment.notes
    }

    const validationResult = appointmentSchema.partial().safeParse(sanitizedData)
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
      notes
    } = validationResult.data

    if (date) {
      const appointmentDate = new Date(date)
      
      // Verificar se a nova data não é no passado
      if (appointmentDate < new Date()) {
        return NextResponse.json({
          error: 'Invalid date',
          message: 'Não é possível reagendar para datas passadas'
        }, { status: 400 })
      }

      // Verificar conflito de horários (excluindo o próprio agendamento)
      const conflictEnd = new Date(appointmentDate.getTime() + ((duration || existingAppointment.duration) * 60000))
      const conflictingAppointment = await prisma.appointment.findFirst({
        where: {
          userId: session.user.id,
          id: { not: params.id },
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
                    gte: new Date(appointmentDate.getTime() - (60 * 60000))
                  }
                }
              ]
            }
          ]
        }
      })

      if (conflictingAppointment) {
        return NextResponse.json({
          error: 'Time conflict',
          message: 'Já existe outro agendamento neste horário'
        }, { status: 409 })
      }
    }

    // Verificar se cliente existe (se clientId fornecido)
    if (clientId && clientId !== existingAppointment.clientId) {
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
    if (serviceId && serviceId !== existingAppointment.serviceId) {
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

    const updatedAppointment = await prisma.appointment.update({
      where: { id: params.id },
      data: {
        date: date ? new Date(date) : undefined,
        serviceId,
        clientId,
        clientName,
        clientEmail,
        clientPhone,
        serviceName,
        duration,
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
      action: 'UPDATE',
      resource: 'appointments',
      resourceId: params.id,
      details: {
        changedFields: Object.keys(body),
        oldDate: existingAppointment.date,
        newDate: updatedAppointment.date
      },
      ipAddress: request.headers.get('x-forwarded-for') || undefined,
      userAgent: request.headers.get('user-agent') || undefined
    })

    return NextResponse.json({
      success: true,
      message: 'Agendamento atualizado com sucesso',
      appointment: updatedAppointment
    })

  } catch (error) {
    console.error('Erro ao atualizar agendamento:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/agendamentos/[id] - Soft delete do agendamento
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const rateLimitResult = rateLimit(request, 'api')
    if (!rateLimitResult.success) {
      return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 })
    }

    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const appointment = await prisma.appointment.findFirst({
      where: {
        id: params.id,
        userId: session.user.id,
        deletedAt: null
      }
    })

    if (!appointment) {
      return NextResponse.json({ error: 'Agendamento não encontrado' }, { status: 404 })
    }

    // Verificar se o agendamento não está muito próximo
    const now = new Date()
    const appointmentDate = new Date(appointment.date)
    const hoursUntilAppointment = (appointmentDate.getTime() - now.getTime()) / (1000 * 60 * 60)

    if (hoursUntilAppointment > 0 && hoursUntilAppointment < 2) {
      return NextResponse.json({
        error: 'Cannot cancel',
        message: 'Não é possível cancelar agendamentos com menos de 2 horas de antecedência'
      }, { status: 400 })
    }

    // Soft delete - LGPD compliance
    await prisma.appointment.update({
      where: { id: params.id },
      data: { deletedAt: new Date() }
    })

    await createAuditLog({
      userId: session.user.id,
      action: 'DELETE',
      resource: 'appointments',
      resourceId: params.id,
      details: {
        appointmentDate: appointment.date,
        serviceName: appointment.serviceName,
        softDelete: true,
        reason: 'Cancelado pelo profissional'
      },
      ipAddress: request.headers.get('x-forwarded-for') || undefined,
      userAgent: request.headers.get('user-agent') || undefined
    })

    return NextResponse.json({
      success: true,
      message: 'Agendamento cancelado com sucesso'
    })

  } catch (error) {
    console.error('Erro ao deletar agendamento:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}