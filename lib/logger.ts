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
   * Log d'information - uniquement en développement
   */
  info: (message: string, data?: unknown) => {
    if (isDev) {
      console.info(formatMessage('info', message), data !== undefined ? data : '')
    }
  },

  /**
   * Log d'avertissement - toujours affiché
   */
  warn: (message: string, data?: unknown) => {
    console.warn(formatMessage('warn', message), data !== undefined ? data : '')
  },

  /**
   * Log d'erreur - toujours affiché
   * En production, on pourrait envoyer à un service de monitoring (Sentry, etc.)
   */
  error: (message: string, error?: unknown) => {
    console.error(formatMessage('error', message), error !== undefined ? error : '')

    // TODO: En production, envoyer à un service de monitoring
    // if (!isDev && typeof window === 'undefined') {
    //   // Envoyer à Sentry, LogRocket, etc.
    // }
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
      if (isDev) {
        console.info(formatMessage('info', message, { context }), data !== undefined ? data : '')
      }
    },
    warn: (message: string, data?: unknown) => {
      console.warn(formatMessage('warn', message, { context }), data !== undefined ? data : '')
    },
    error: (message: string, error?: unknown) => {
      console.error(formatMessage('error', message, { context }), error !== undefined ? error : '')
    },
  }),
}

// Export pour utilisation côté API
export default logger
