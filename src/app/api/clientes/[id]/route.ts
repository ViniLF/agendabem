import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { createAuditLog } from '@/lib/audit'
import { rateLimit } from '@/lib/rate-limit'
import { clientSchema } from '@/lib/validation'
import { sanitizeInput } from '@/lib/crypto'

interface RouteParams {
  params: { id: string }
}

// GET /api/clientes/[id] - Buscar cliente específico
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

    const client = await prisma.client.findFirst({
      where: {
        id: params.id,
        userId: session.user.id,
        deletedAt: null
      },
      include: {
        appointments: {
          select: {
            id: true,
            date: true,
            serviceName: true,
            servicePrice: true,
            status: true,
            notes: true
          },
          orderBy: { date: 'desc' },
          take: 10 // Últimos 10 agendamentos
        }
      }
    })

    if (!client) {
      return NextResponse.json({ error: 'Cliente não encontrado' }, { status: 404 })
    }

    // Calcular estatísticas do cliente
    const totalAppointments = client.appointments.length
    const completedAppointments = client.appointments.filter(apt => apt.status === 'COMPLETED')
    const totalSpent = completedAppointments.reduce((sum, apt) => sum + Number(apt.servicePrice || 0), 0)

    await createAuditLog({
      userId: session.user.id,
      action: 'READ',
      resource: 'clients',
      resourceId: client.id,
      details: { clientName: client.name },
      ipAddress: request.headers.get('x-forwarded-for') || undefined,
      userAgent: request.headers.get('user-agent') || undefined
    })

    return NextResponse.json({
      ...client,
      totalAppointments,
      totalSpent: Number(totalSpent),
      appointments: client.appointments
    })

  } catch (error) {
    console.error('Erro ao buscar cliente:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PUT /api/clientes/[id] - Atualizar cliente
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

    // Verificar se cliente existe e pertence ao usuário
    const existingClient = await prisma.client.findFirst({
      where: {
        id: params.id,
        userId: session.user.id,
        deletedAt: null
      }
    })

    if (!existingClient) {
      return NextResponse.json({ error: 'Cliente não encontrado' }, { status: 404 })
    }

    const body = await request.json()

    // Sanitização obrigatória
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

    // Verificar duplicatas (exceto o próprio cliente)
    if (email || phone) {
      const duplicateClient = await prisma.client.findFirst({
        where: {
          userId: session.user.id,
          deletedAt: null,
          id: { not: params.id },
          OR: [
            ...(email ? [{ email }] : []),
            ...(phone ? [{ phone }] : [])
          ]
        }
      })

      if (duplicateClient) {
        return NextResponse.json({
          error: 'Client already exists',
          message: 'Já existe outro cliente com este email ou telefone'
        }, { status: 409 })
      }
    }

    // Backup dos dados antigos para auditoria
    const oldData = {
      name: existingClient.name,
      email: existingClient.email,
      phone: existingClient.phone,
      birthDate: existingClient.birthDate,
      notes: existingClient.notes
    }

    const updatedClient = await prisma.client.update({
      where: { id: params.id },
      data: {
        name,
        email,
        phone,
        birthDate: birthDate ? new Date(birthDate) : null,
        notes,
        dataConsent,
        consentDate: dataConsent && !existingClient.dataConsent ? new Date() : existingClient.consentDate
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        birthDate: true,
        notes: true,
        dataConsent: true,
        updatedAt: true
      }
    })

    // Log de auditoria com dados antes/depois
    await createAuditLog({
      userId: session.user.id,
      action: 'UPDATE',
      resource: 'clients',
      resourceId: params.id,
      details: {
        before: oldData,
        after: { name, email, phone, birthDate, notes },
        changedFields: Object.keys(body)
      },
      ipAddress: request.headers.get('x-forwarded-for') || undefined,
      userAgent: request.headers.get('user-agent') || undefined
    })

    return NextResponse.json({
      success: true,
      message: 'Cliente atualizado com sucesso',
      client: updatedClient
    })

  } catch (error) {
    console.error('Erro ao atualizar cliente:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/clientes/[id] - Soft delete (LGPD compliance)
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

    const client = await prisma.client.findFirst({
      where: {
        id: params.id,
        userId: session.user.id,
        deletedAt: null
      },
      include: {
        appointments: {
          select: { id: true, status: true, date: true }
        }
      }
    })

    if (!client) {
      return NextResponse.json({ error: 'Cliente não encontrado' }, { status: 404 })
    }

    // Verificar se há agendamentos futuros
    const futureAppointments = client.appointments.filter(apt => 
      new Date(apt.date) > new Date() && apt.status !== 'CANCELLED'
    )

    if (futureAppointments.length > 0) {
      return NextResponse.json({
        error: 'Cannot delete client',
        message: `Cliente possui ${futureAppointments.length} agendamento(s) futuro(s). Cancele-os primeiro.`
      }, { status: 400 })
    }

    // Soft delete - marcar como deletado sem remover dados
    await prisma.client.update({
      where: { id: params.id },
      data: { deletedAt: new Date() }
    })

    await createAuditLog({
      userId: session.user.id,
      action: 'DELETE',
      resource: 'clients',
      resourceId: params.id,
      details: {
        clientName: client.name,
        totalAppointments: client.appointments.length,
        softDelete: true // LGPD compliance
      },
      ipAddress: request.headers.get('x-forwarded-for') || undefined,
      userAgent: request.headers.get('user-agent') || undefined
    })

    return NextResponse.json({
      success: true,
      message: 'Cliente removido com sucesso'
    })

  } catch (error) {
    console.error('Erro ao deletar cliente:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}