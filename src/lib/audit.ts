import { AuditAction } from '@prisma/client'
import { prisma } from './db'
import { hashSensitiveData } from './crypto'

interface AuditLogData {
  userId?: string
  action: AuditAction
  resource: string
  resourceId?: string
  details?: Record<string, any>
  ipAddress?: string
  userAgent?: string
}

export async function createAuditLog({
  userId,
  action,
  resource,
  resourceId,
  details,
  ipAddress,
  userAgent
}: AuditLogData) {
  try {
    const hashedIp = ipAddress ? hashSensitiveData(ipAddress) : 'unknown'
    const hashedUserAgent = userAgent ? hashSensitiveData(userAgent.slice(0, 200)) : 'unknown'

    await prisma.auditLog.create({
      data: {
        userId,
        action,
        resource,
        resourceId,
        details: details || {},
        ipAddress: hashedIp,
        userAgent: hashedUserAgent
      }
    })
  } catch (error) {
    console.error('Erro ao criar log de auditoria:', error)
  }
}

export async function auditDataAccess(
  userId: string,
  resource: string,
  resourceId: string,
  ipAddress?: string,
  userAgent?: string
) {
  await createAuditLog({
    userId,
    action: 'READ',
    resource,
    resourceId,
    ipAddress,
    userAgent
  })
}

export async function auditDataModification(
  userId: string,
  action: 'CREATE' | 'UPDATE' | 'DELETE',
  resource: string,
  resourceId: string,
  oldData?: Record<string, any>,
  newData?: Record<string, any>,
  ipAddress?: string,
  userAgent?: string
) {
  const details: Record<string, any> = {}
  
  if (oldData) details.before = sanitizeForAudit(oldData)
  if (newData) details.after = sanitizeForAudit(newData)
  
  await createAuditLog({
    userId,
    action,
    resource,
    resourceId,
    details,
    ipAddress,
    userAgent
  })
}

export async function auditDataExport(
  userId: string,
  dataTypes: string[],
  format: string,
  ipAddress?: string,
  userAgent?: string
) {
  await createAuditLog({
    userId,
    action: 'EXPORT_DATA',
    resource: 'data_export',
    details: {
      dataTypes,
      format,
      timestamp: new Date()
    },
    ipAddress,
    userAgent
  })
}

export async function auditDataDeletion(
  userId: string,
  resource: string,
  resourceId: string,
  reason: string,
  ipAddress?: string,
  userAgent?: string
) {
  await createAuditLog({
    userId,
    action: 'DELETE_DATA',
    resource,
    resourceId,
    details: {
      reason,
      deletedAt: new Date()
    },
    ipAddress,
    userAgent
  })
}

export async function auditPaymentTransaction(
  userId: string,
  action: 'CREATE' | 'UPDATE',
  paymentId: string,
  amount: number,
  provider: string,
  status: string,
  ipAddress?: string,
  userAgent?: string
) {
  await createAuditLog({
    userId,
    action,
    resource: 'payment',
    resourceId: paymentId,
    details: {
      amount,
      provider,
      status,
      timestamp: new Date()
    },
    ipAddress,
    userAgent
  })
}

export async function auditSubscriptionChange(
  userId: string,
  action: 'CREATE' | 'UPDATE',
  subscriptionId: string,
  planId: string,
  status: string,
  ipAddress?: string,
  userAgent?: string
) {
  await createAuditLog({
    userId,
    action,
    resource: 'subscription',
    resourceId: subscriptionId,
    details: {
      planId,
      status,
      timestamp: new Date()
    },
    ipAddress,
    userAgent
  })
}

export async function getAuditLogs(
  userId: string,
  filters?: {
    action?: AuditAction
    resource?: string
    startDate?: Date
    endDate?: Date
    limit?: number
  }
) {
  const where: any = { userId }
  
  if (filters?.action) where.action = filters.action
  if (filters?.resource) where.resource = filters.resource
  if (filters?.startDate || filters?.endDate) {
    where.createdAt = {}
    if (filters.startDate) where.createdAt.gte = filters.startDate
    if (filters.endDate) where.createdAt.lte = filters.endDate
  }
  
  return await prisma.auditLog.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: filters?.limit || 100,
    select: {
      id: true,
      action: true,
      resource: true,
      resourceId: true,
      details: true,
      createdAt: true,
      ipAddress: false,
      userAgent: false
    }
  })
}

export async function getUserDataAccess(userId: string, days: number = 30) {
  const startDate = new Date()
  startDate.setDate(startDate.getDate() - days)
  
  const accessLogs = await prisma.auditLog.findMany({
    where: {
      userId,
      action: 'READ',
      createdAt: { gte: startDate }
    },
    select: {
      resource: true,
      resourceId: true,
      createdAt: true
    },
    orderBy: { createdAt: 'desc' }
  })
  
  const summary = accessLogs.reduce((acc, log) => {
    const key = log.resource
    if (!acc[key]) acc[key] = 0
    acc[key]++
    return acc
  }, {} as Record<string, number>)
  
  return {
    totalAccess: accessLogs.length,
    byResource: summary,
    lastAccess: accessLogs[0]?.createdAt || null
  }
}

export async function cleanOldAuditLogs(retentionDays: number = 365) {
  const cutoffDate = new Date()
  cutoffDate.setDate(cutoffDate.getDate() - retentionDays)
  
  try {
    const result = await prisma.auditLog.deleteMany({
      where: {
        createdAt: { lt: cutoffDate }
      }
    })
    
    console.log(`🧹 Removidos ${result.count} logs de auditoria antigos`)
    return result.count
  } catch (error) {
    console.error('Erro ao limpar logs antigos:', error)
    return 0
  }
}

function sanitizeForAudit(data: Record<string, any>): Record<string, any> {
  const sensitiveFields = ['password', 'passwordHash', 'twoFactorSecret', 'backupCodes']
  const sanitized = { ...data }
  
  for (const field of sensitiveFields) {
    if (sanitized[field]) {
      sanitized[field] = '[REDACTED]'
    }
  }
  
  if (sanitized.email) {
    sanitized.email = sanitized.email.replace(/(.{2}).*(@.*)/, '$1***$2')
  }
  
  if (sanitized.phone) {
    sanitized.phone = sanitized.phone.replace(/(\d{2}).*(\d{4})/, '$1****$2')
  }
  
  return sanitized
}

export async function generateDataAccessReport(userId: string) {
  const logs = await getAuditLogs(userId, { limit: 1000 })
  const accessSummary = await getUserDataAccess(userId, 90)
  
  const report = {
    userId,
    generatedAt: new Date(),
    summary: {
      totalLogs: logs.length,
      ...accessSummary
    },
    recentActivity: logs.slice(0, 50),
    dataRetentionPolicy: {
      auditLogsRetention: '365 dias',
      userDataRetention: 'Conforme configurado pelo usuário'
    }
  }
  
  await createAuditLog({
    userId,
    action: 'EXPORT_DATA',
    resource: 'audit_report',
    details: {
      reportType: 'data_access_report',
      logCount: logs.length
    }
  })
  
  return report
}