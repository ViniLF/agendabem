import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { createAuditLog } from '@/lib/audit'
import { rateLimit } from '@/lib/rate-limit'
import { profileSchema } from '@/lib/validation'
import { sanitizeInput } from '@/lib/crypto'

// GET /api/perfil - Buscar dados do perfil
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

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        profile: true
      }
    })

    if (!user) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 })
    }

    await createAuditLog({
      userId: session.user.id,
      action: 'READ',
      resource: 'profile',
      resourceId: session.user.id,
      details: { action: 'view_profile' },
      ipAddress: request.headers.get('x-forwarded-for') || undefined,
      userAgent: request.headers.get('user-agent') || undefined
    })

    return NextResponse.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role
      },
      profile: user.profile
    })

  } catch (error) {
    console.error('Erro ao buscar perfil:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PUT /api/perfil - Atualizar perfil
export async function PUT(request: NextRequest) {
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
    
    // Separar dados do usuário e do perfil
    const userData = body.user || {}
    const profileData = body.profile || {}

    // Sanitização dos dados do usuário
    const sanitizedUserData = {
      name: userData.name ? sanitizeInput(userData.name) : undefined,
      phone: userData.phone ? sanitizeInput(userData.phone) : undefined
    }

    // Sanitização dos dados do perfil
    const sanitizedProfileData = {
      businessName: profileData.businessName ? sanitizeInput(profileData.businessName) : undefined,
      profession: profileData.profession ? sanitizeInput(profileData.profession) : undefined,
      speciality: profileData.speciality ? sanitizeInput(profileData.speciality) : undefined,
      serviceType: profileData.serviceType || 'OTHER',
      workingDays: Array.isArray(profileData.workingDays) ? profileData.workingDays : [1,2,3,4,5],
      workingHours: profileData.workingHours || { start: '09:00', end: '18:00' },
      timeSlotDuration: parseInt(profileData.timeSlotDuration) || 60,
      bookingAdvance: parseInt(profileData.bookingAdvance) || 24,
      address: profileData.address ? sanitizeInput(profileData.address) : undefined,
      city: profileData.city ? sanitizeInput(profileData.city) : undefined,
      state: profileData.state ? sanitizeInput(profileData.state) : undefined,
      zipCode: profileData.zipCode ? sanitizeInput(profileData.zipCode) : undefined,
      description: profileData.description ? sanitizeInput(profileData.description) : undefined,
      website: profileData.website || undefined,
      slug: profileData.slug ? sanitizeInput(profileData.slug) : undefined,
      paymentMethod: profileData.paymentMethod || 'OFFLINE',
      cancellationHours: parseInt(profileData.cancellationHours) || 24
    }

    // Validação do perfil com Zod (dados do usuário são simples)
    const validationResult = profileSchema.safeParse(sanitizedProfileData)
    if (!validationResult.success) {
      return NextResponse.json({
        error: 'Validation failed',
        details: validationResult.error.issues.map(issue => ({
          field: issue.path.join('.'),
          message: issue.message
        }))
      }, { status: 400 })
    }

    // Verificar se slug já existe (se fornecido)
    if (sanitizedProfileData.slug) {
      const existingSlug = await prisma.profile.findFirst({
        where: {
          slug: sanitizedProfileData.slug,
          userId: { not: session.user.id }
        }
      })

      if (existingSlug) {
        return NextResponse.json({
          error: 'Slug already exists',
          message: 'Este slug já está sendo usado por outro profissional'
        }, { status: 409 })
      }
    }

    // Buscar dados atuais para auditoria
    const currentUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { profile: true }
    })

    // Transação para atualizar usuário e perfil
    const result = await prisma.$transaction(async (tx) => {
      // Atualizar dados do usuário se fornecidos
      let updatedUser = currentUser
      if (sanitizedUserData.name || sanitizedUserData.phone) {
        updatedUser = await tx.user.update({
          where: { id: session.user.id },
          data: {
            ...(sanitizedUserData.name && { name: sanitizedUserData.name }),
            ...(sanitizedUserData.phone && { phone: sanitizedUserData.phone })
          }
        })
      }

      // Upsert do perfil (criar se não existir, atualizar se existir)
      const updatedProfile = await tx.profile.upsert({
        where: { userId: session.user.id },
        create: {
          userId: session.user.id,
          ...validationResult.data
        },
        update: validationResult.data,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true
            }
          }
        }
      })

      return { user: updatedUser, profile: updatedProfile }
    })

    // Log de auditoria com mudanças
    await createAuditLog({
      userId: session.user.id,
      action: 'UPDATE',
      resource: 'profile',
      resourceId: session.user.id,
      details: {
        userDataChanged: !!sanitizedUserData.name || !!sanitizedUserData.phone,
        profileDataChanged: true,
        changedFields: [...Object.keys(userData), ...Object.keys(profileData)]
      },
      ipAddress: request.headers.get('x-forwarded-for') || undefined,
      userAgent: request.headers.get('user-agent') || undefined
    })

    return NextResponse.json({
      success: true,
      message: 'Perfil atualizado com sucesso',
      user: {
        id: result.user.id,
        name: result.user.name,
        email: result.user.email,
        phone: result.user.phone,
        role: result.user.role
      },
      profile: result.profile
    })

  } catch (error) {
    console.error('Erro ao atualizar perfil:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST para criar perfil inicial (se não existir)
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

    // Verificar se já existe perfil
    const existingProfile = await prisma.profile.findUnique({
      where: { userId: session.user.id }
    })

    if (existingProfile) {
      return NextResponse.json({
        error: 'Profile already exists',
        message: 'Perfil já existe. Use PUT para atualizar.'
      }, { status: 409 })
    }

    const body = await request.json()

    // Criar perfil padrão com dados mínimos
    const profileData = {
      businessName: body.businessName ? sanitizeInput(body.businessName) : undefined,
      profession: body.profession ? sanitizeInput(body.profession) : undefined,
      serviceType: body.serviceType || 'OTHER',
      workingDays: [1, 2, 3, 4, 5], // Segunda a sexta
      workingHours: { start: '09:00', end: '18:00' },
      timeSlotDuration: 60,
      bookingAdvance: 24
    }

    const profile = await prisma.profile.create({
      data: {
        userId: session.user.id,
        ...profileData
      }
    })

    await createAuditLog({
      userId: session.user.id,
      action: 'CREATE',
      resource: 'profile',
      resourceId: profile.id,
      details: { initialSetup: true },
      ipAddress: request.headers.get('x-forwarded-for') || undefined,
      userAgent: request.headers.get('user-agent') || undefined
    })

    return NextResponse.json({
      success: true,
      message: 'Perfil criado com sucesso',
      profile
    }, { status: 201 })

  } catch (error) {
    console.error('Erro ao criar perfil:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 })
}