/**
 * Logger utilitaire pour contrôler les logs en fonction de l'environnement
 *
 * En développement : affiche tous les logs
 * En production : seuls les erreurs critiques sont loggées
 *
 * Usage:
 *   import { logger } from '@/lib/logger'
 *   logger.info('Message informatif')
 *   logger.error('Erreur:', error)
 *   logger.debug('Debug info', { data })
 */

const isDev = process.env.NODE_ENV === 'development'

type LogLevel = 'debug' | 'info' | 'warn' | 'error'

interface LoggerOptions {
  context?: string
  data?: unknown
}

function formatMessage(level: LogLevel, message: string, options?: LoggerOptions): string {
  const timestamp = new Date().toISOString()
  const context = options?.context ? `[${options.context}]` : ''
  return `${timestamp} ${level.toUpperCase()} ${context} ${message}`
}

function persistSystemLog(level: LogLevel, message: string, context?: string, data?: unknown) {
  if (typeof window === 'undefined') {
    try {
      const payload: Record<string, unknown> = { message }
      if (context) payload.context = context
      if (data !== undefined) {
        if (data instanceof Error) {
          payload.error = data.message
          payload.stack = data.stack
        } else {
          payload.data = data
        }
      }

      import('@/lib/prisma').then(({ prisma }) => {
        prisma.adminAuditLog.create({
          data: {
            action: `system.${level}`,
            actorId: null,
            actorRole: 'system',
            targetType: context || 'application',
            targetId: null,
            details: JSON.stringify(payload),
          }
        }).catch(() => {})
      }).catch(() => {})
    } catch {
      // Ignore write errors to prevent logger crashing
    }
  }
}

export const logger = {
  /**
   * Log de debug - uniquement en développement
   */
  debug: (message: string, data?: unknown) => {
    if (isDev) {
      console.log(formatMessage('debug', message), data !== undefined ? data : '')
    }
  },

  /**
   * Log d'information - affiché et enregistré dans le journal d'audit
   */
  info: (message: string, data?: unknown) => {
    console.info(formatMessage('info', message), data !== undefined ? data : '')
    persistSystemLog('info', message, undefined, data)
  },

  /**
   * Log d'avertissement - toujours affiché et enregistré
   */
  warn: (message: string, data?: unknown) => {
    console.warn(formatMessage('warn', message), data !== undefined ? data : '')
    persistSystemLog('warn', message, undefined, data)
  },

  /**
   * Log d'erreur - toujours affiché et enregistré dans le journal d'audit
   */
  error: (message: string, error?: unknown) => {
    console.error(formatMessage('error', message), error !== undefined ? error : '')
    persistSystemLog('error', message, undefined, error)
  },

  /**
   * Log avec contexte personnalisé
   */
  withContext: (context: string) => ({
    debug: (message: string, data?: unknown) => {
      if (isDev) {
        console.log(formatMessage('debug', message, { context }), data !== undefined ? data : '')
      }
    },
    info: (message: string, data?: unknown) => {
      console.info(formatMessage('info', message, { context }), data !== undefined ? data : '')
      persistSystemLog('info', message, context, data)
    },
    warn: (message: string, data?: unknown) => {
      console.warn(formatMessage('warn', message, { context }), data !== undefined ? data : '')
      persistSystemLog('warn', message, context, data)
    },
    error: (message: string, error?: unknown) => {
      console.error(formatMessage('error', message, { context }), error !== undefined ? error : '')
      persistSystemLog('error', message, context, error)
    },
  }),
}

// Export pour utilisation côté API
export default logger
