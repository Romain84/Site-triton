import { NextRequest } from 'next/server'
import { z } from 'zod'
import crypto from 'crypto'
import { prisma } from '@/lib/prisma'
import { sendEmail, getPasswordResetEmail } from '@/lib/email'
import { logger } from '@/lib/logger'
import { apiError, apiSuccess } from '@/lib/api/response'
import { formRateLimiter } from '@/lib/rate-limiter'

import { getClientIp } from '@/lib/api/request'

const log = logger.withContext('Auth')

const forgotPasswordSchema = z.object({
  email: z.string().email(),
})

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request)

    const rateLimitResult = formRateLimiter.checkLimit(ip, 'auth-coach-forgot-password')
    if (!rateLimitResult.allowed) {
      return apiError(rateLimitResult.message || 'Trop de requêtes', 429, undefined, 'RATE_LIMITED')
    }

    const body = await request.json()
    const { email } = forgotPasswordSchema.parse(body)

    // Toujours retourner un succès pour ne pas révéler si l'email existe
    const successResponse = apiSuccess({
      message: 'Si un compte existe avec cet email, vous recevrez un lien de réinitialisation.',
    })

    // Trouver le coach
    const coach = await prisma.coach.findUnique({
      where: { email, actif: true },
    })

    if (!coach || !coach.email) {
      log.info(`Tentative de réinitialisation pour email inexistant: ${email}`)
      return successResponse
    }

    // Invalider les anciens tokens
    await prisma.passwordResetToken.updateMany({
      where: {
        email: coach.email,
        userType: 'coach',
        usedAt: null,
      },
      data: {
        usedAt: new Date(),
      },
    })

    // Créer un nouveau token (jeton en clair pour l'email, hashé pour la DB)
    const plaintextToken = crypto.randomBytes(32).toString('hex')
    const hashedToken = crypto.createHash('sha256').update(plaintextToken).digest('hex')
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000) // 1 heure

    await prisma.passwordResetToken.create({
      data: {
        token: hashedToken,
        email: coach.email,
        userType: 'coach',
        expiresAt,
      },
    })

    // Construire l'URL de réinitialisation avec le token en clair
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'
    const resetUrl = `${baseUrl}/coach/reset-password?token=${plaintextToken}`

    // Envoyer l'email
    const emailData = getPasswordResetEmail({
      prenom: coach.prenom,
      resetUrl,
      userType: 'coach',
    })

    const emailSent = await sendEmail({
      to: coach.email,
      ...emailData,
    })

    if (emailSent) {
      log.info(`Email de réinitialisation envoyé à ${coach.email}`)
    } else {
      log.error(`Échec envoi email de réinitialisation à ${coach.email}`)
    }

    return successResponse
  } catch (error) {
    log.error('Erreur lors de la demande de réinitialisation', error)

    if (error instanceof z.ZodError) {
      return apiError('Email invalide', 400, error.flatten(), 'VALIDATION_ERROR')
    }

    return apiError('Erreur lors de la demande de réinitialisation', 500, undefined, 'INTERNAL_SERVER_ERROR')
  }
}
