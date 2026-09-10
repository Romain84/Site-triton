import { NextRequest } from 'next/server'
import bcrypt from 'bcrypt'
import { z } from 'zod'
import { getCoachSession } from '@/lib/auth/session'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { apiError, apiSuccess } from '@/lib/api/response'
import { isSameOriginRequest } from '@/lib/security/origin'
import { formRateLimiter } from '@/lib/rate-limiter'
import { getClientIp } from '@/lib/api/request'

const log = logger.withContext('Coach')

const changePasswordSchema = z.object({
  currentPassword: z.string().optional(),
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

    const ip = getClientIp(request)

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
      select: { id: true, password: true, prenom: true, nom: true, mustChangePassword: true },
    })

    if (!coach || !coach.password) {
      return apiError('Coach non trouvé', 404, undefined, 'COACH_NOT_FOUND')
    }

    // Si le coach a un mot de passe classique (non temporaire), le mot de passe actuel est requis
    if (!coach.mustChangePassword && !validatedData.currentPassword) {
      return apiError('Le mot de passe actuel est requis', 400, undefined, 'INVALID_CURRENT_PASSWORD')
    }

    // Vérifier le mot de passe actuel s'il est fourni
    if (validatedData.currentPassword) {
      let isCurrentPasswordValid = await bcrypt.compare(
        validatedData.currentPassword,
        coach.password
      )

      if (!isCurrentPasswordValid && coach.mustChangePassword && validatedData.currentPassword.trim() === '1234') {
        isCurrentPasswordValid = true
      }

      if (!isCurrentPasswordValid) {
        return apiError('Le mot de passe actuel est incorrect', 400, undefined, 'INVALID_CURRENT_PASSWORD')
      }
    }

    // Interdire de reprendre le mot de passe par défaut 1234
    if (validatedData.newPassword.trim() === '1234') {
      return apiError(
        'Veuillez choisir un mot de passe différent du mot de passe provisoire 1234',
        400,
        undefined,
        'PASSWORD_TOO_COMMON'
      )
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

    // Hasher et enregistrer le nouveau mot de passe + désactiver l'invitation
    const hashedPassword = await bcrypt.hash(validatedData.newPassword, 10)

    await prisma.coach.update({
      where: { id: session.coachId },
      data: {
        password: hashedPassword,
        mustChangePassword: false,
      },
    })

    log.info(`Mot de passe modifié pour ${coach.prenom} ${coach.nom || ''} (mustChangePassword: false)`)

    return apiSuccess({ message: 'Mot de passe modifié avec succès' })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return apiError('Données invalides', 400, error.flatten(), 'VALIDATION_ERROR')
    }

    log.error('Erreur lors du changement de mot de passe', error)
    return apiError('Erreur lors du changement de mot de passe', 500, undefined, 'INTERNAL_SERVER_ERROR')
  }
}
