import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import * as bcrypt from 'bcrypt'
import { createCoachSession } from '@/lib/auth/session'
import { z } from 'zod'
import { logger } from '@/lib/logger'
import { formRateLimiter } from '@/lib/rate-limiter'
import { apiError, apiSuccess } from '@/lib/api/response'
import { getClientIp } from '@/lib/api/request'

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request)
    const rateLimitResult = formRateLimiter.checkLimit(ip, 'auth-coach-login')
    if (!rateLimitResult.allowed) {
      return apiError(rateLimitResult.message || 'Trop de requêtes', 429)
    }

    const body = await request.json()
    const { email, password } = loginSchema.parse(body)
    const trimmedPassword = password.trim()

    // Trouver le coach
    const coach = await prisma.coach.findUnique({
      where: { email },
    })

    if (!coach || !coach.password) {
      return apiError('Identifiants incorrects', 401)
    }

    if (!coach.actif) {
      return apiError('Ce compte a été désactivé', 403)
    }

    // 1. Vérifier le mot de passe habituel par hash bcrypt
    let isValidPassword = await bcrypt.compare(password, coach.password)
    if (!isValidPassword && trimmedPassword !== password) {
      isValidPassword = await bcrypt.compare(trimmedPassword, coach.password)
    }

    // 2. Si le mot de passe saisi est "1234", l'autoriser si c'est la 1ère connexion ou si mustChangePassword est actif
    const isDefaultPasswordInput = trimmedPassword === '1234'
    const isFirstLoginOrForced = coach.mustChangePassword || !coach.lastLogin

    if (!isValidPassword && isDefaultPasswordInput && isFirstLoginOrForced) {
      isValidPassword = true
    }

    if (!isValidPassword) {
      return apiError('Identifiants incorrects', 401)
    }

    const mustChangePassword = Boolean(coach.mustChangePassword || isDefaultPasswordInput)

    // Mettre à jour la date de dernière connexion
    await prisma.coach.update({
      where: { id: coach.id },
      data: {
        lastLogin: new Date(),
        // Si connecté avec 1234, s'assurer que mustChangePassword est bien true
        ...(mustChangePassword ? { mustChangePassword: true } : {}),
      },
    })

    // Créer la session
    await createCoachSession({
      coachId: coach.id,
      email: coach.email!,
      prenom: coach.prenom,
      nom: coach.nom,
    })

    return apiSuccess({
      coach: {
        id: coach.id,
        email: coach.email,
        prenom: coach.prenom,
        nom: coach.nom,
        mustChangePassword,
      },
      mustChangePassword,
    })
  } catch (error) {
    logger.withContext('Auth').error('Erreur lors de la connexion', error)

    if (error instanceof z.ZodError) {
      return apiError('Données invalides', 400, error.flatten())
    }

    return apiError('Erreur lors de la connexion', 500)
  }
}
