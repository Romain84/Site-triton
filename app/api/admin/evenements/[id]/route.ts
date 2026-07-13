import { Prisma } from '@prisma/client'
import { NextRequest } from 'next/server'
import { z } from 'zod'
import { getAdminSession } from '@/lib/auth/session'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { evenementCalendrierSchema } from '@/lib/validations'
import { apiError, apiSuccess } from '@/lib/api/response'
import { isSameOriginRequest } from '@/lib/security/origin'

const adminLogger = logger.withContext('Admin')

// PUT: Update an event
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
    const validatedData = evenementCalendrierSchema.parse(body)

    const evenement = await prisma.evenementCalendrier.update({
      where: { id },
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

    return apiSuccess({ evenement })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return apiError('Données invalides', 400, error.flatten(), 'VALIDATION_ERROR')
    }

    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      return apiError('Événement introuvable', 404, undefined, 'EVENT_NOT_FOUND')
    }

    adminLogger.error("Erreur lors de la mise à jour de l'événement", error)
    return apiError('Erreur serveur', 500, undefined, 'INTERNAL_SERVER_ERROR')
  }
}

// DELETE: Delete an event
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

    await prisma.evenementCalendrier.delete({
      where: { id },
    })

    return apiSuccess({ success: true })
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      return apiError('Événement introuvable', 404, undefined, 'EVENT_NOT_FOUND')
    }

    adminLogger.error("Erreur lors de la suppression de l'événement", error)
    return apiError('Erreur serveur', 500, undefined, 'INTERNAL_SERVER_ERROR')
  }
}


export async function PATCH(
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

    // Accepte uniquement les champs connus — ignore le reste
    const allowedFields = [
      'title', 'date', 'dateFin', 'heureDebut', 'heureFin',
      'description', 'lieu', 'type', 'coachId', 'couleur',
      'pdfReglement', 'actif',
    ] as const

    const data: Record<string, unknown> = {}
    for (const field of allowedFields) {
      if (field in body) {
        data[field] = field === 'date' || field === 'dateFin'
          ? body[field] ? new Date(body[field]) : null
          : body[field]
      }
    }

    if (Object.keys(data).length === 0) {
      return apiError('Aucun champ à mettre à jour', 400, undefined, 'NO_FIELDS')
    }

    const evenement = await prisma.evenementCalendrier.update({
      where: { id },
      data,
      include: {
        coach: { select: { id: true, prenom: true, nom: true } },
      },
    })

    return apiSuccess({ evenement })
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      return apiError('Événement introuvable', 404, undefined, 'EVENT_NOT_FOUND')
    }
    adminLogger.error('Erreur PATCH événement', error)
    return apiError('Erreur serveur', 500, undefined, 'INTERNAL_SERVER_ERROR')
  }
}
