import { NextRequest } from 'next/server'
import bcrypt from 'bcrypt'
import crypto from 'crypto'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { apiError, apiSuccess } from '@/lib/api/response'
import { formRateLimiter } from '@/lib/rate-limiter'

import { getClientIp } from '@/lib/api/request'

const log = logger.withContext('Auth')

const resetPasswordSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(8, 'Le mot de passe doit contenir au moins 8 caractères'),
})

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request)

    const rateLimitResult = formRateLimiter.checkLimit(ip, 'auth-admin-reset-password')
    if (!rateLimitResult.allowed) {
      return apiError(rateLimitResult.message || 'Trop de requêtes', 429, undefined, 'RATE_LIMITED')
    }

    const body = await request.json()
    const { token, password } = resetPasswordSchema.parse(body)

    // Hacher le jeton reçu pour faire la recherche en base
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex')

    // Trouver le token
    const resetToken = await prisma.passwordResetToken.findUnique({
      where: { token: hashedToken },
    })

    if (!resetToken) {
      return apiError('Lien de réinitialisation invalide', 400, undefined, 'INVALID_RESET_LINK')
    }

    // Vérifier que le token n'est pas expiré
    if (resetToken.expiresAt < new Date()) {
      return apiError(
        'Ce lien a expiré. Veuillez faire une nouvelle demande.',
        400,
        undefined,
        'RESET_LINK_EXPIRED'
      )
    }

    // Vérifier que le token n'a pas déjà été utilisé
    if (resetToken.usedAt) {
      return apiError(
        'Ce lien a déjà été utilisé. Veuillez faire une nouvelle demande.',
        400,
        undefined,
        'RESET_LINK_ALREADY_USED'
      )
    }

    // Vérifier le type d'utilisateur
    if (resetToken.userType !== 'admin') {
      return apiError('Lien de réinitialisation invalide', 400, undefined, 'INVALID_RESET_LINK')
    }

    // Trouver l'admin
    const user = await prisma.user.findUnique({
      where: { email: resetToken.email, actif: true },
    })

    if (!user) {
      return apiError('Compte non trouvé', 404, undefined, 'ACCOUNT_NOT_FOUND')
    }

    // Hasher le nouveau mot de passe
    const hashedPassword = await bcrypt.hash(password, 10)

    // Mettre à jour le mot de passe
    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashedPassword },
    })

    // Marquer le token comme utilisé
    await prisma.passwordResetToken.update({
      where: { id: resetToken.id },
      data: { usedAt: new Date() },
    })

    log.info(`Mot de passe réinitialisé pour admin: ${user.email}`)

    return apiSuccess({
      message: 'Votre mot de passe a été réinitialisé avec succès.',
    })
  } catch (error) {
    log.error('Erreur lors de la réinitialisation du mot de passe admin', error)

    if (error instanceof z.ZodError) {
      return apiError('Données invalides', 400, error.flatten(), 'VALIDATION_ERROR')
    }

    return apiError('Erreur lors de la réinitialisation du mot de passe', 500, undefined, 'INTERNAL_SERVER_ERROR')
  }
}
