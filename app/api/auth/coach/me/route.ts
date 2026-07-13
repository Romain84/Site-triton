import { NextRequest, NextResponse } from 'next/server'
import { getCoachSession } from '@/lib/auth/session'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { z } from 'zod'
import { isSameOriginRequest } from '@/lib/security/origin'
import { apiError, apiSuccess } from '@/lib/api/response'

const updateCoachProfileSchema = z.object({
  siret: z.string().regex(/^[0-9]{14}$/, 'SIRET invalide').optional().nullable().or(z.literal('')),
  adresse: z.string().max(500).optional().nullable(),
  telephone: z.string().max(20).optional().nullable(),
  email: z.string().email('Email invalide').optional().nullable(),
})

export async function GET() {
  try {
    const session = await getCoachSession()

    if (!session) {
      return apiError('Non authentifié', 401)
    }

    // Récupérer les informations complètes du coach
    const coach = await prisma.coach.findUnique({
      where: { id: session.coachId },
      select: {
        id: true,
        prenom: true,
        nom: true,
        email: true,
        telephone: true,
        specialites: true,
        siret: true,
        adresse: true,
        photo: true,
        bio: true,
        lastLogin: true,
      },
    })

    if (!coach) {
      return apiError('Coach non trouvé', 404)
    }

    return apiSuccess({ coach })
  } catch (error) {
    logger.withContext('Auth').error('Erreur lors de la récupération du profil', error)
    return apiError('Erreur serveur', 500)
  }
}

export async function PUT(request: NextRequest) {
  try {
    if (!isSameOriginRequest(request)) {
      return apiError('Origine non autorisée', 403)
    }

    const session = await getCoachSession()

    if (!session) {
      return apiError('Non authentifié', 401)
    }

    const body = await request.json()
    const validation = updateCoachProfileSchema.safeParse(body)
    if (!validation.success) {
      return apiError('Données invalides', 400, validation.error.flatten())
    }

    const { siret, adresse, telephone, email } = validation.data

    // Mettre à jour le profil
    const updatedCoach = await prisma.coach.update({
      where: { id: session.coachId },
      data: {
        ...(siret !== undefined && { siret: siret || null }),
        ...(adresse !== undefined && { adresse: adresse || null }),
        ...(telephone !== undefined && { telephone: telephone || null }),
        ...(email !== undefined && { email: email || null }),
      },
      select: {
        id: true,
        prenom: true,
        nom: true,
        email: true,
        telephone: true,
        siret: true,
        adresse: true,
      },
    })

    return apiSuccess({ coach: updatedCoach })
  } catch (error) {
    logger.withContext('Auth').error('Erreur lors de la mise à jour du profil', error)
    return apiError('Erreur lors de la mise à jour', 500)
  }
}
