import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getAdminSession, getCoachSession, type AdminSession, type CoachSession } from '@/lib/auth/session'
import { apiError } from '@/lib/api/response'
import { logger } from '@/lib/logger'

type GuardResult<T> =
  | { ok: true; session: T }
  | { ok: false; response: NextResponse }

/**
 * Exige une session admin valide.
 */
export async function requireAdmin(): Promise<GuardResult<AdminSession>> {
  const session = await getAdminSession()
  if (!session) {
    return {
      ok: false,
      response: apiError('Non authentifié', 401, undefined, 'UNAUTHENTICATED'),
    }
  }
  if (session.role === 'coach') {
    return {
      ok: false,
      response: apiError('Accès interdit', 403, undefined, 'FORBIDDEN'),
    }
  }
  return { ok: true, session }
}


/**
 * Exige une session coach valide.
 */
export async function requireCoach(): Promise<GuardResult<CoachSession>> {
  const session = await getCoachSession()
  if (!session) {
    return {
      ok: false,
      response: apiError('Non authentifié', 401, undefined, 'UNAUTHENTICATED'),
    }
  }
  return { ok: true, session }
}

/**
 * Gestion d'erreur homogène pour les routes API.
 */
export function handleRouteError(
  error: unknown,
  context?: string
): NextResponse {
  if (error instanceof z.ZodError) {
    return apiError('Données invalides', 400, error.flatten(), 'VALIDATION_ERROR')
  }

  if (context) {
    logger.error(context, error)
  }

  return apiError('Erreur serveur', 500, undefined, 'INTERNAL_SERVER_ERROR')
}
