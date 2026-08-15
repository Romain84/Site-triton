import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createAdminSession } from '@/lib/auth/session'
import bcrypt from 'bcrypt'
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
    const rateLimitResult = formRateLimiter.checkLimit(ip, 'auth-admin-login')
    if (!rateLimitResult.allowed) {
      return apiError(rateLimitResult.message || 'Trop de requêtes', 429)
    }

    const body = await request.json()

    // Valider les données
    const validation = loginSchema.safeParse(body)
    if (!validation.success) {
      return apiError('Données invalides', 400, validation.error.flatten())
    }

    const { email, password } = validation.data

    // Trouver l'utilisateur admin
    const user = await prisma.user.findUnique({
      where: { email },
    })

    if (!user || !user.password) {
      return apiError('Email ou mot de passe incorrect', 401)
    }

    if (!user.actif) {
      return apiError('Ce compte a été désactivé', 403)
    }

    // Vérifier le mot de passe
    const isValidPassword = await bcrypt.compare(password, user.password)

    if (!isValidPassword) {
      return apiError('Email ou mot de passe incorrect', 401)
    }

    // Mettre à jour lastLogin
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() },
    })

    // Créer la session
    await createAdminSession({
      userId: user.id,
      email: user.email,
      role: user.role,
    })

    return apiSuccess({
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
      },
    })
  } catch (error) {
    logger.withContext('Auth').error('Erreur lors de la connexion admin', error)
    return apiError('Erreur serveur', 500)
  }
}
