import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getAdminSession, getCoachSession, type AdminSession, type CoachSession } from '@/lib/auth/session'
import { apiError } from '@/lib/api/response'
import { logger } from '@/lib/logger'
import { prisma } from '@/lib/prisma'

type GuardResult<T> =
  | { ok: true; session: T }
  | { ok: false; response: NextResponse }

/**
 * Exige une session admin valide et vérifie que le compte est toujours actif en base.
 */
export async function requireAdmin(): Promise<GuardResult<AdminSession>> {
  const session = await getAdminSession()
  if (!session) {
    return {
      ok: false,
      response: apiError('Non authentifié', 401, undefined, 'UNAUTHENTICATED'),
    }
  }
  const dbUser = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { id: true, email: true, role: true, actif: true },
  })
  if (!dbUser || !dbUser.actif) {
    return {
      ok: false,
      response: apiError('Compte introuvable ou désactivé', 401, undefined, 'UNAUTHENTICATED'),
    }
  }
  if (dbUser.role === 'coach') {
    return {
      ok: false,
      response: apiError('Accès interdit', 403, undefined, 'FORBIDDEN'),
    }
  }
  return {
    ok: true,
    session: {
      userId: dbUser.id,
      email: dbUser.email,
      role: dbUser.role,
    },
  }
}


/**
 * Exige une session coach valide et vérifie que le compte coach est toujours actif en base.
 */
export async function requireCoach(): Promise<GuardResult<CoachSession>> {
  const session = await getCoachSession()
  if (!session) {
    return {
      ok: false,
      response: apiError('Non authentifié', 401, undefined, 'UNAUTHENTICATED'),
    }
  }
  const dbCoach = await prisma.coach.findUnique({
    where: { id: session.coachId },
    select: { id: true, email: true, prenom: true, nom: true, actif: true },
  })
  if (!dbCoach || !dbCoach.actif) {
    return {
      ok: false,
      response: apiError('Compte coach introuvable ou désactivé', 401, undefined, 'UNAUTHENTICATED'),
    }
  }
  return {
    ok: true,
    session: {
      coachId: dbCoach.id,
      email: dbCoach.email || session.email,
      prenom: dbCoach.prenom,
      nom: dbCoach.nom,
    },
  }
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
