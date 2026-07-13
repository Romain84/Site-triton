import { logger } from '@/lib/logger'
import { prisma } from '@/lib/prisma'

interface AuditPayload {
  action: string
  actorId?: string
  actorRole?: string
  targetType?: string
  targetId?: string
  details?: Record<string, unknown>
}

// Journalise les actions sensibles en base de données et dans les fichiers logs.
export function logAdminAudit(payload: AuditPayload) {
  // 1. Écriture dans les fichiers logs
  logger.withContext('Audit').info('Action admin', {
    timestamp: new Date().toISOString(),
    ...payload,
  })

  // 2. Écriture asynchrone non-bloquante en base de données PostgreSQL
  prisma.adminAuditLog.create({
    data: {
      action: payload.action,
      actorId: payload.actorId ?? null,
      actorRole: payload.actorRole ?? null,
      targetType: payload.targetType ?? null,
      targetId: payload.targetId ?? null,
      details: payload.details ? JSON.stringify(payload.details) : null,
    }
  }).catch((err: any) => {
    logger.withContext('Audit').error('Échec d\'écriture du log d\'audit en base de données', err)
  })
}
