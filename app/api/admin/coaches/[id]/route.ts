import { NextRequest } from 'next/server'
import { Prisma } from '@prisma/client'
import bcrypt from 'bcrypt'
import { z } from 'zod'
import { getAdminSession } from '@/lib/auth/session'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { apiError, apiSuccess } from '@/lib/api/response'
import { isSameOriginRequest } from '@/lib/security/origin'

const updateCoachSchema = z.object({
  prenom: z.string().trim().min(1).optional(),
  nom: z.string().trim().min(1).optional().nullable(),
  email: z.string().email().optional(),
  password: z.string().min(8).optional(),
  telephone: z.string().trim().optional().nullable(),
  photo: z.string().trim().optional().nullable(),
  bio: z.string().trim().optional().nullable(),
  specialites: z.string().trim().optional().nullable(),
  siret: z.string().trim().optional().nullable(),
  adresse: z.string().trim().optional().nullable(),
  actif: z.boolean().optional(),
  heuresAdminHebdo: z.number().min(0).optional(),
})

// GET: Récupérer un coach
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getAdminSession()
    if (!session) {
      return apiError('Non authentifié', 401, undefined, 'UNAUTHENTICATED')
    }

    const { id } = await params

    const coach = await prisma.coach.findUnique({
      where: { id },
      select: {
        id: true,
        prenom: true,
        nom: true,
        email: true,
        telephone: true,
        photo: true,
        bio: true,
        specialites: true,
        siret: true,
        adresse: true,
        actif: true,
        heuresAdminHebdo: true,
        lastLogin: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    if (!coach) {
      return apiError('Coach non trouvé', 404, undefined, 'COACH_NOT_FOUND')
    }

    return apiSuccess({ coach })
  } catch (error) {
    logger.withContext('Admin').error('Erreur lors de la récupération du coach', error)
    return apiError('Erreur serveur', 500, undefined, 'INTERNAL_SERVER_ERROR')
  }
}

// PUT: Mettre à jour un coach
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!isSameOriginRequest(request)) {
      return apiError('Origine non autorisée', 403, undefined, 'FORBIDDEN_ORIGIN')
    }

    const session = await getAdminSession()
    if (!session) {
      return apiError('Non authentifié', 401, undefined, 'UNAUTHENTICATED')
    }

    const { id } = await params
    const body = await request.json()

    const validation = updateCoachSchema.safeParse(body)
    if (!validation.success) {
      return apiError('Données invalides', 400, validation.error.flatten(), 'VALIDATION_ERROR')
    }

    const data = validation.data

    // Vérifier si le coach existe
    const existingCoach = await prisma.coach.findUnique({
      where: { id },
    })

    if (!existingCoach) {
      return apiError('Coach non trouvé', 404, undefined, 'COACH_NOT_FOUND')
    }

    // Vérifier si l'email est déjà utilisé par un autre coach
    if (data.email && data.email !== existingCoach.email) {
      const emailExists = await prisma.coach.findFirst({
        where: {
          email: data.email,
          NOT: { id },
        },
      })
      if (emailExists) {
        return apiError('Cet email est déjà utilisé', 400, undefined, 'EMAIL_ALREADY_USED')
      }
    }

    const updateData: Prisma.CoachUpdateInput = {}

    if (data.prenom !== undefined) updateData.prenom = data.prenom
    if (data.nom !== undefined) updateData.nom = data.nom
    if (data.email !== undefined) updateData.email = data.email
    if (data.telephone !== undefined) updateData.telephone = data.telephone
    if (data.photo !== undefined) updateData.photo = data.photo
    if (data.bio !== undefined) updateData.bio = data.bio
    if (data.specialites !== undefined) updateData.specialites = data.specialites
    if (data.siret !== undefined) updateData.siret = data.siret
    if (data.adresse !== undefined) updateData.adresse = data.adresse
    if (data.actif !== undefined) updateData.actif = data.actif

    if (data.password) {
      updateData.password = await bcrypt.hash(data.password, 10)
    }

    const coach = await prisma.coach.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        prenom: true,
        nom: true,
        email: true,
        telephone: true,
        photo: true,
        bio: true,
        specialites: true,
        siret: true,
        adresse: true,
        actif: true,
        lastLogin: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    return apiSuccess({ coach })
  } catch (error) {
    logger.withContext('Admin').error('Erreur lors de la mise à jour du coach', error)
    return apiError('Erreur serveur', 500, undefined, 'INTERNAL_SERVER_ERROR')
  }
}

// DELETE: Supprimer un coach
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!isSameOriginRequest(request)) {
      return apiError('Origine non autorisée', 403, undefined, 'FORBIDDEN_ORIGIN')
    }

    const session = await getAdminSession()
    if (!session) {
      return apiError('Non authentifié', 401, undefined, 'UNAUTHENTICATED')
    }

    const { id } = await params

    // Vérifier si le coach existe
    const existingCoach = await prisma.coach.findUnique({
      where: { id },
    })

    if (!existingCoach) {
      return apiError('Coach non trouvé', 404, undefined, 'COACH_NOT_FOUND')
    }

    await prisma.coach.delete({
      where: { id },
    })

    return apiSuccess({ message: 'Coach supprimé avec succès' })
  } catch (error) {
    logger.withContext('Admin').error('Erreur lors de la suppression du coach', error)
    return apiError('Erreur serveur', 500, undefined, 'INTERNAL_SERVER_ERROR')
  }
}
