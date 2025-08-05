import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { createAuditLog } from '@/lib/audit'
import { rateLimit } from '@/lib/rate-limit'
import { z } from 'zod'

interface RouteParams {
  params: { id: string }
}

const statusUpdateSchema = z.object({
  status: z.enum(['SCHEDULED', 'CONFIRMED', 'COMPLETED', 'CANCELLED', 'NO_SHOW'])
})

// PATCH /api/agendamentos/[id]/status - Atualizar status do agendamento
export async function PATCH(request: NextRequest, { params }: RouteParams) {
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
    
    const validationResult = statusUpdateSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json({
        error: 'Validation failed',
        details: validationResult.error.issues.map(issue => ({
          field: issue.path.join('.'),
          message: issue.message
        }))
      }, { status: 400 })
    }

    const { status } = validationResult.data

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

    // Validações de transição de status
    const currentStatus = appointment.status
    const validTransitions: Record<string, string[]> = {
      'SCHEDULED': ['CONFIRMED', 'CANCELLED'],
      'CONFIRMED': ['COMPLETED', 'CANCELLED', 'NO_SHOW'],
      'COMPLETED': [], // Status final
      'CANCELLED': ['SCHEDULED'], // Pode ser reagendado
      'NO_SHOW': ['SCHEDULED'] // Pode ser reagendado
    }

    if (!validTransitions[currentStatus]?.includes(status)) {
      return NextResponse.json({
        error: 'Invalid status transition',
        message: `Não é possível alterar de ${currentStatus} para ${status}`
      }, { status: 400 })
    }

    // Validações específicas por status
    const now = new Date()
    const appointmentDate = new Date(appointment.date)

    switch (status) {
      case 'COMPLETED':
        // Só pode marcar como concluído após a data/hora do agendamento
        if (appointmentDate > now) {
          return NextResponse.json({
            error: 'Cannot complete future appointment',
            message: 'Não é possível marcar como concluído um agendamento futuro'
          }, { status: 400 })
        }
        break

      case 'NO_SHOW':
        // Só pode marcar como não compareceu após passar do horário
        const graceMinutes = 15 // 15 minutos de tolerância
        const graceTime = new Date(appointmentDate.getTime() + (graceMinutes * 60000))
        
        if (now < graceTime) {
          return NextResponse.json({
            error: 'Too early for no-show',
            message: `Aguarde pelo menos ${graceMinutes} minutos após o horário marcado`
          }, { status: 400 })
        }
        break

      case 'CANCELLED':
        // Verificar tempo mínimo para cancelamento (se não for reagendamento)
        if (currentStatus !== 'NO_SHOW') {
          const hoursUntilAppointment = (appointmentDate.getTime() - now.getTime()) / (1000 * 60 * 60)
          
          if (hoursUntilAppointment > 0 && hoursUntilAppointment < 2) {
            return NextResponse.json({
              error: 'Cannot cancel',
              message: 'Não é possível cancelar com menos de 2 horas de antecedência'
            }, { status: 400 })
          }
        }
        break
    }

    // Atualizar status
    const updatedAppointment = await prisma.appointment.update({
      where: { id: params.id },
      data: { 
        status,
        updatedAt: new Date()
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

    // Log de auditoria com detalhes da mudança
    await createAuditLog({
      userId: session.user.id,
      action: 'UPDATE',
      resource: 'appointments',
      resourceId: params.id,
      details: {
        statusChange: {
          from: currentStatus,
          to: status
        },
        appointmentDate: appointment.date,
        serviceName: appointment.serviceName,
        clientName: appointment.clientName || 'Cliente não informado'
      },
      ipAddress: request.headers.get('x-forwarded-for') || undefined,
      userAgent: request.headers.get('user-agent') || undefined
    })

    // Mensagens de sucesso específicas por status
    const statusMessages: Record<string, string> = {
      'SCHEDULED': 'Agendamento reagendado',
      'CONFIRMED': 'Agendamento confirmado',
      'COMPLETED': 'Agendamento marcado como concluído',
      'CANCELLED': 'Agendamento cancelado',
      'NO_SHOW': 'Marcado como não compareceu'
    }

    return NextResponse.json({
      success: true,
      message: statusMessages[status] || 'Status atualizado com sucesso',
      appointment: updatedAppointment,
      statusChange: {
        from: currentStatus,
        to: status,
        timestamp: new Date()
      }
    })

  } catch (error) {
    console.error('Erro ao atualizar status:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// GET /api/agendamentos/[id]/status - Obter histórico de mudanças de status
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
      select: {
        id: true,
        status: true,
        createdAt: true,
        updatedAt: true
      }
    })

    if (!appointment) {
      return NextResponse.json({ error: 'Agendamento não encontrado' }, { status: 404 })
    }

    // Buscar histórico de mudanças nos logs de auditoria
    const statusHistory = await prisma.auditLog.findMany({
      where: {
        userId: session.user.id,
        resource: 'appointments',
        resourceId: params.id,
        action: 'UPDATE'
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: {
        createdAt: true,
        details: true
      }
    })

    const statusChanges = statusHistory
      .filter(log => log.details && typeof log.details === 'object' && 'statusChange' in log.details)
      .map(log => ({
        timestamp: log.createdAt,
        change: (log.details as any).statusChange
      }))

    return NextResponse.json({
      currentStatus: appointment.status,
      createdAt: appointment.createdAt,
      updatedAt: appointment.updatedAt,
      statusHistory: statusChanges,
      availableTransitions: getAvailableTransitions(appointment.status)
    })

  } catch (error) {
    console.error('Erro ao buscar histórico de status:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

function getAvailableTransitions(currentStatus: string): string[] {
  const validTransitions: Record<string, string[]> = {
    'SCHEDULED': ['CONFIRMED', 'CANCELLED'],
    'CONFIRMED': ['COMPLETED', 'CANCELLED', 'NO_SHOW'],
    'COMPLETED': [],
    'CANCELLED': ['SCHEDULED'],
    'NO_SHOW': ['SCHEDULED']
  }

  return validTransitions[currentStatus] || []
}

export async function POST() {
  return NextResponse.json({ error: 'Method not allowed. Use PATCH to update status' }, { status: 405 })
}

export async function PUT() {
  return NextResponse.json({ error: 'Method not allowed. Use PATCH to update status' }, { status: 405 })
}

export async function DELETE() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 })
}