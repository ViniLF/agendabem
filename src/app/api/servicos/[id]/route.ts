import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { createAuditLog } from '@/lib/audit'
import { rateLimit } from '@/lib/rate-limit'
import { serviceSchema } from '@/lib/validation'
import { sanitizeInput } from '@/lib/crypto'

interface RouteParams {
  params: { id: string }
}

// GET /api/servicos/[id] - Buscar serviço específico
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

    const service = await prisma.service.findFirst({
      where: {
        id: params.id,
        userId: session.user.id
      },
      include: {
        appointments: {
          select: {
            id: true,
            date: true,
            clientName: true,
            status: true,
            servicePrice: true
          },
          orderBy: { date: 'desc' },
          take: 20 // Últimos 20 agendamentos
        }
      }
    })

    if (!service) {
      return NextResponse.json({ error: 'Serviço não encontrado' }, { status: 404 })
    }

    const appointmentsCount = service.appointments.length
    const revenue = service.appointments
      .filter(apt => apt.status === 'COMPLETED')
      .reduce((sum, apt) => sum + Number(apt.servicePrice || 0), 0)

    await createAuditLog({
      userId: session.user.id,
      action: 'READ',
      resource: 'services',
      resourceId: service.id,
      details: { serviceName: service.name },
      ipAddress: request.headers.get('x-forwarded-for') || undefined,
      userAgent: request.headers.get('user-agent') || undefined
    })

    return NextResponse.json({
      ...service,
      price: Number(service.price || 0),
      appointmentsCount,
      revenue,
      appointments: service.appointments
    })

  } catch (error) {
    console.error('Erro ao buscar serviço:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PUT /api/servicos/[id] - Atualizar serviço
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

    const existingService = await prisma.service.findFirst({
      where: {
        id: params.id,
        userId: session.user.id
      }
    })

    if (!existingService) {
      return NextResponse.json({ error: 'Serviço não encontrado' }, { status: 404 })
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

    // Verificar se nome já existe em outro serviço
    if (name !== existingService.name) {
      const duplicateService = await prisma.service.findFirst({
        where: {
          userId: session.user.id,
          id: { not: params.id },
          name: { equals: name, mode: 'insensitive' }
        }
      })

      if (duplicateService) {
        return NextResponse.json({
          error: 'Service already exists',
          message: 'Já existe outro serviço com este nome'
        }, { status: 409 })
      }
    }

    // Backup para auditoria
    const oldData = {
      name: existingService.name,
      description: existingService.description,
      duration: existingService.duration,
      price: Number(existingService.price || 0),
      color: existingService.color,
      isActive: existingService.isActive
    }

    const updatedService = await prisma.service.update({
      where: { id: params.id },
      data: {
        name,
        description,
        duration,
        price,
        color,
        isActive
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
        updatedAt: true
      }
    })

    // Log de auditoria com mudanças
    await createAuditLog({
      userId: session.user.id,
      action: 'UPDATE',
      resource: 'services',
      resourceId: params.id,
      details: {
        before: oldData,
        after: { name, description, duration, price, color, isActive },
        changedFields: Object.keys(body)
      },
      ipAddress: request.headers.get('x-forwarded-for') || undefined,
      userAgent: request.headers.get('user-agent') || undefined
    })

    return NextResponse.json({
      success: true,
      message: 'Serviço atualizado com sucesso',
      service: {
        ...updatedService,
        price: Number(updatedService.price || 0)
      }
    })

  } catch (error) {
    console.error('Erro ao atualizar serviço:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/servicos/[id] - Excluir serviço
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

    const service = await prisma.service.findFirst({
      where: {
        id: params.id,
        userId: session.user.id
      },
      include: {
        appointments: {
          select: { 
            id: true, 
            status: true, 
            date: true 
          }
        }
      }
    })

    if (!service) {
      return NextResponse.json({ error: 'Serviço não encontrado' }, { status: 404 })
    }

    // Verificar se há agendamentos futuros ou pendentes
    const activeAppointments = service.appointments.filter(apt => 
      (new Date(apt.date) > new Date()) || 
      ['SCHEDULED', 'CONFIRMED'].includes(apt.status)
    )

    if (activeAppointments.length > 0) {
      return NextResponse.json({
        error: 'Cannot delete service',
        message: `Serviço possui ${activeAppointments.length} agendamento(s) ativo(s) ou futuro(s). Cancele-os primeiro ou desative o serviço.`,
        suggestion: 'Você pode desativar o serviço ao invés de excluir'
      }, { status: 400 })
    }

    // Excluir definitivamente (serviços podem ser excluídos se não há agendamentos ativos)
    await prisma.service.delete({
      where: { id: params.id }
    })

    await createAuditLog({
      userId: session.user.id,
      action: 'DELETE',
      resource: 'services',
      resourceId: params.id,
      details: {
        serviceName: service.name,
        totalAppointments: service.appointments.length,
        permanentDelete: true
      },
      ipAddress: request.headers.get('x-forwarded-for') || undefined,
      userAgent: request.headers.get('user-agent') || undefined
    })

    return NextResponse.json({
      success: true,
      message: 'Serviço excluído com sucesso'
    })

  } catch (error) {
    console.error('Erro ao deletar serviço:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}