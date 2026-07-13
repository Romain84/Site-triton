import { NextRequest } from 'next/server'
import { z } from 'zod'
import { getAdminSession } from '@/lib/auth/session'
import { prisma } from '@/lib/prisma'
import { evenementCalendrierSchema } from '@/lib/validations'
import { logger } from '@/lib/logger'
import { apiError, apiSuccess } from '@/lib/api/response'
import { isSameOriginRequest } from '@/lib/security/origin'

// GET: List all events
export async function GET() {
  try {
    const session = await getAdminSession()
    if (!session) {
      return apiError('Non authentifié', 401, undefined, 'UNAUTHENTICATED')
    }

    const evenements = await prisma.evenementCalendrier.findMany({
      include: {
        coach: {
          select: { id: true, prenom: true, nom: true },
        },
      },
      orderBy: { date: 'desc' },
    })

    return apiSuccess({ evenements })
  } catch (error) {
    logger.error('Erreur lors du chargement des événements:', error)
    return apiError('Erreur serveur', 500, undefined, 'INTERNAL_SERVER_ERROR')
  }
}

// POST: Create a new event
export async function POST(request: NextRequest) {
  try {
    if (!isSameOriginRequest(request)) {
      return apiError('Origine non autorisée', 403, undefined, 'FORBIDDEN_ORIGIN')
    }

    const session = await getAdminSession()
    if (!session) {
      return apiError('Non authentifié', 401, undefined, 'UNAUTHENTICATED')
    }

    const body = await request.json()
    const validatedData = evenementCalendrierSchema.parse(body)

    const evenement = await prisma.evenementCalendrier.create({
      data: {
        title: validatedData.title,
        date: new Date(validatedData.date),
        dateFin: validatedData.dateFin ? new Date(validatedData.dateFin) : null,
        heureDebut: validatedData.heureDebut,
        heureFin: validatedData.heureFin,
        description: validatedData.description,
        lieu: validatedData.lieu,
        type: validatedData.type,
        coachId: validatedData.coachId,
        couleur: validatedData.couleur,
        pdfReglement: validatedData.pdfReglement,
        actif: validatedData.actif,
      },
      include: {
        coach: {
          select: { id: true, prenom: true, nom: true },
        },
      },
    })

    return apiSuccess({ evenement }, 201)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return apiError('Données invalides', 400, error.flatten(), 'VALIDATION_ERROR')
    }

    logger.error("Erreur lors de la création de l'événement:", error)
    return apiError('Erreur serveur', 500, undefined, 'INTERNAL_SERVER_ERROR')
  }
}


export async function DELETE(request: NextRequest) {
  if (!isSameOriginRequest(request)) {
    return apiError('Origine non autorisée', 403, undefined, 'FORBIDDEN_ORIGIN')
  }

  const session = await getAdminSession()
  if (!session) {
    return apiError('Non authentifié', 401, undefined, 'UNAUTHENTICATED')
  }

  try {
    const { count } = await prisma.evenementCalendrier.deleteMany({})
    logger.info('Tous les événements supprimés', { count })
    return apiSuccess({ deleted: count })
  } catch (error) {
    logger.error('Erreur suppression globale', error)
    return apiError('Erreur serveur', 500, undefined, 'INTERNAL_SERVER_ERROR')
  }
}