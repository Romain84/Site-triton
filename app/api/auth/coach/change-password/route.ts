import { NextRequest } from 'next/server'
import bcrypt from 'bcrypt'
import { z } from 'zod'
import { getCoachSession } from '@/lib/auth/session'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { apiError, apiSuccess } from '@/lib/api/response'
import { isSameOriginRequest } from '@/lib/security/origin'
import { formRateLimiter } from '@/lib/rate-limiter'

const log = logger.withContext('Coach')

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Mot de passe actuel requis'),
  newPassword: z.string().min(6, 'Le nouveau mot de passe doit contenir au moins 6 caractères'),
  confirmPassword: z.string(),
}).refine(data => data.newPassword === data.confirmPassword, {
  message: 'Les mots de passe ne correspondent pas',
  path: ['confirmPassword'],
})

export async function POST(request: NextRequest) {
  try {
    if (!isSameOriginRequest(request)) {
      return apiError('Origine non autorisée', 403, undefined, 'FORBIDDEN_ORIGIN')
    }

    const ip = request.headers.get('x-forwarded-for') ||
      request.headers.get('x-real-ip') ||
      'unknown'

    const rateLimitResult = formRateLimiter.checkLimit(ip, 'auth-coach-change-password')
    if (!rateLimitResult.allowed) {
      return apiError(rateLimitResult.message || 'Trop de requêtes', 429, undefined, 'RATE_LIMITED')
    }

    const session = await getCoachSession()
    if (!session) {
      return apiError('Non authentifié', 401, undefined, 'UNAUTHENTICATED')
    }

    const body = await request.json()
    const validatedData = changePasswordSchema.parse(body)

    // Récupérer le coach avec son mot de passe actuel
    const coach = await prisma.coach.findUnique({
      where: { id: session.coachId },
      select: { id: true, password: true, prenom: true, nom: true },
    })

    if (!coach || !coach.password) {
      return apiError('Coach non trouvé', 404, undefined, 'COACH_NOT_FOUND')
    }

    // Vérifier le mot de passe actuel
    const isCurrentPasswordValid = await bcrypt.compare(
      validatedData.currentPassword,
      coach.password
    )

    if (!isCurrentPasswordValid) {
      return apiError('Le mot de passe actuel est incorrect', 400, undefined, 'INVALID_CURRENT_PASSWORD')
    }

    // Vérifier que le nouveau mot de passe est différent de l'ancien
    const isSamePassword = await bcrypt.compare(
      validatedData.newPassword,
      coach.password
    )

    if (isSamePassword) {
      return apiError(
        "Le nouveau mot de passe doit être différent de l'ancien",
        400,
        undefined,
        'PASSWORD_UNCHANGED'
      )
    }

    // Hasher et enregistrer le nouveau mot de passe
    const hashedPassword = await bcrypt.hash(validatedData.newPassword, 10)

    await prisma.coach.update({
      where: { id: session.coachId },
      data: { password: hashedPassword },
    })

    log.info(`Mot de passe modifié pour ${coach.prenom} ${coach.nom || ''}`)

    return apiSuccess({ message: 'Mot de passe modifié avec succès' })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return apiError('Données invalides', 400, error.flatten(), 'VALIDATION_ERROR')
    }

    log.error('Erreur lors du changement de mot de passe', error)
    return apiError('Erreur lors du changement de mot de passe', 500, undefined, 'INTERNAL_SERVER_ERROR')
  }
}
