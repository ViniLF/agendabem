import { PrismaClient } from '@prisma/client'
import { encrypt, decrypt } from './crypto'

declare global {
  var __prisma: PrismaClient | undefined
}

const prismaClientSingleton = () => {
  return new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    errorFormat: 'pretty',
  })
}

const prisma = globalThis.__prisma ?? prismaClientSingleton()

if (process.env.NODE_ENV !== 'production') {
  globalThis.__prisma = prisma
}

prisma.$use(async (params, next) => {
  const encryptedFields = ['phone', 'clientName', 'clientEmail', 'clientPhone', 'notes', 'pixKey']
  
  if (params.action === 'create' || params.action === 'update') {
    if (params.model === 'Client' || params.model === 'Appointment' || params.model === 'Profile') {
      for (const field of encryptedFields) {
        if (params.args.data[field] && typeof params.args.data[field] === 'string') {
          params.args.data[field] = encrypt(params.args.data[field])
        }
      }
    }
  }
  
  const result = await next(params)
  
  if (params.action === 'findUnique' || params.action === 'findMany' || params.action === 'findFirst') {
    if (result) {
      const decryptResult = (obj: any) => {
        for (const field of encryptedFields) {
          if (obj[field] && typeof obj[field] === 'string') {
            try {
              obj[field] = decrypt(obj[field])
            } catch (error) {
              console.warn(`Erro ao descriptografar campo ${field}:`, error)
              obj[field] = ''
            }
          }
        }
        return obj
      }
      
      if (Array.isArray(result)) {
        result.forEach(decryptResult)
      } else {
        decryptResult(result)
      }
    }
  }
  
  return result
})

prisma.$use(async (params, next) => {
  if (params.action === 'delete' && params.model === 'User') {
    params.action = 'update'
    params.args.data = { deletedAt: new Date() }
  }
  
  if (params.action === 'delete' && params.model === 'Client') {
    params.action = 'update'
    params.args.data = { deletedAt: new Date() }
  }
  
  if (params.action === 'findMany' && (params.model === 'User' || params.model === 'Client')) {
    if (!params.args) params.args = {}
    if (!params.args.where) params.args.where = {}
    params.args.where.deletedAt = null
  }
  
  if (params.action === 'findUnique' && (params.model === 'User' || params.model === 'Client')) {
    if (!params.args) params.args = {}
    if (!params.args.where) params.args.where = {}
    params.args.where.deletedAt = null
  }
  
  return next(params)
})

export async function connectDB() {
  try {
    await prisma.$connect()
    console.log('✅ Conectado ao banco de dados')
  } catch (error) {
    console.error('❌ Erro ao conectar no banco:', error)
    throw error
  }
}

export async function disconnectDB() {
  await prisma.$disconnect()
}

export async function healthCheck() {
  try {
    await prisma.$queryRaw`SELECT 1`
    return { status: 'healthy', timestamp: new Date() }
  } catch (error) {
    return { status: 'unhealthy', error: error, timestamp: new Date() }
  }
}

export { prisma }
export default prisma