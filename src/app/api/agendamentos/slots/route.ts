import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { createAuditLog } from '@/lib/audit'
import { rateLimit } from '@/lib/rate-limit'

// GET /api/agendamentos/slots - Calcular horários disponíveis
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
    const dateParam = searchParams.get('date')
    const serviceId = searchParams.get('serviceId')
    const excludeAppointmentId = searchParams.get('excludeId') // Para edição de agendamentos

    if (!dateParam) {
      return NextResponse.json({
        error: 'Missing date parameter',
        message: 'Data é obrigatória'
      }, { status: 400 })
    }

    const requestedDate = new Date(dateParam)
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    // Verificar se a data não é no passado
    if (requestedDate < today) {
      return NextResponse.json({
        error: 'Invalid date',
        message: 'Não é possível agendar para datas passadas'
      }, { status: 400 })
    }

    // Buscar perfil do profissional
    const profile = await prisma.profile.findUnique({
      where: { userId: session.user.id },
      select: {
        workingDays: true,
        workingHours: true,
        timeSlotDuration: true,
        bookingAdvance: true
      }
    })

    if (!profile) {
      return NextResponse.json({
        error: 'Profile not found',
        message: 'Configure seu perfil primeiro'
      }, { status: 404 })
    }

    // Verificar se é dia de trabalho (0 = domingo, 1 = segunda, etc.)
    const dayOfWeek = requestedDate.getDay()
    if (!profile.workingDays.includes(dayOfWeek)) {
      return NextResponse.json({
        slots: [],
        message: 'Não há atendimento neste dia da semana'
      })
    }

    // Verificar antecedência mínima
    const now = new Date()
    const hoursUntilDate = (requestedDate.getTime() - now.getTime()) / (1000 * 60 * 60)
    
    if (hoursUntilDate < profile.bookingAdvance) {
      return NextResponse.json({
        slots: [],
        message: `É necessário pelo menos ${profile.bookingAdvance} horas de antecedência`
      })
    }

    // Obter duração do serviço (se especificado)
    let serviceDuration = profile.timeSlotDuration
    if (serviceId) {
      const service = await prisma.service.findFirst({
        where: {
          id: serviceId,
          userId: session.user.id,
          isActive: true
        },
        select: { duration: true }
      })

      if (service) {
        serviceDuration = service.duration
      }
    }

    // Gerar horários disponíveis
    const workingHours = profile.workingHours as { start: string; end: string }
    const slots = generateTimeSlots(
      requestedDate,
      workingHours.start,
      workingHours.end,
      serviceDuration,
      profile.timeSlotDuration
    )

    // Buscar agendamentos existentes para o dia
    const startOfDay = new Date(requestedDate)
    startOfDay.setHours(0, 0, 0, 0)
    const endOfDay = new Date(requestedDate)
    endOfDay.setHours(23, 59, 59, 999)

    const existingAppointments = await prisma.appointment.findMany({
      where: {
        userId: session.user.id,
        date: {
          gte: startOfDay,
          lte: endOfDay
        },
        status: { in: ['SCHEDULED', 'CONFIRMED'] },
        deletedAt: null,
        ...(excludeAppointmentId && { id: { not: excludeAppointmentId } })
      },
      select: {
        date: true,
        duration: true
      }
    })

    // Filtrar horários ocupados
    const availableSlots = slots.filter(slot => {
      const slotStart = new Date(`${dateParam}T${slot}:00`)
      const slotEnd = new Date(slotStart.getTime() + (serviceDuration * 60000))

      // Verificar se não há conflito com agendamentos existentes
      return !existingAppointments.some(appointment => {
        const appointmentStart = new Date(appointment.date)
        const appointmentEnd = new Date(appointmentStart.getTime() + (appointment.duration * 60000))

        // Verificar sobreposição
        return (
          (slotStart >= appointmentStart && slotStart < appointmentEnd) ||
          (slotEnd > appointmentStart && slotEnd <= appointmentEnd) ||
          (slotStart <= appointmentStart && slotEnd >= appointmentEnd)
        )
      })
    })

    // Filtrar horários que já passaram (se for hoje)
    const finalSlots = availableSlots.filter(slot => {
      if (requestedDate.toDateString() === now.toDateString()) {
        const slotTime = new Date(`${dateParam}T${slot}:00`)
        return slotTime > now
      }
      return true
    })

    await createAuditLog({
      userId: session.user.id,
      action: 'READ',
      resource: 'appointment_slots',
      details: {
        date: dateParam,
        serviceId,
        serviceDuration,
        slotsGenerated: slots.length,
        slotsAvailable: finalSlots.length
      },
      ipAddress: request.headers.get('x-forwarded-for') || undefined,
      userAgent: request.headers.get('user-agent') || undefined
    })

    return NextResponse.json({
      slots: finalSlots,
      date: dateParam,
      workingHours,
      serviceDuration,
      slotDuration: profile.timeSlotDuration,
      totalSlots: slots.length,
      availableSlots: finalSlots.length,
      occupiedSlots: slots.length - availableSlots.length
    })

  } catch (error) {
    console.error('Erro ao calcular horários:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

function generateTimeSlots(
  date: Date,
  startTime: string,
  endTime: string,
  serviceDuration: number,
  slotDuration: number
): string[] {
  const slots: string[] = []
  
  const [startHour, startMinute] = startTime.split(':').map(Number)
  const [endHour, endMinute] = endTime.split(':').map(Number)
  
  const startMinutes = startHour * 60 + startMinute
  const endMinutes = endHour * 60 + endMinute
  
  // Gerar slots com base na duração do slot (não do serviço)
  for (let minutes = startMinutes; minutes + serviceDuration <= endMinutes; minutes += slotDuration) {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    
    const timeString = `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`
    slots.push(timeString)
  }
  
  return slots
}

// POST para criar horários personalizados (futuro)
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

    // Funcionalidade futura: permitir bloqueio/desbloqueio de horários específicos
    return NextResponse.json({
      message: 'Funcionalidade em desenvolvimento'
    }, { status: 501 })

  } catch (error) {
    console.error('Erro ao processar horários:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 })
}

export async function DELETE() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 })
}