import { NextRequest, NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/auth/session'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { logger } from '@/lib/logger'

const planningLogger = logger.withContext('Remplacements')

const updateRemplacementSchema = z.object({
  coachRemplaceId: z.string().min(1).optional(),
  coachRemplacantId: z.string().min(1).optional(),
  date: z.string().min(1).optional(),
  heureDebut: z.string().min(1).optional(),
  heureFin: z.string().min(1).optional(),
  planningId: z.string().nullable().optional(),
  motif: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  actif: z.boolean().optional(),
})

// GET: Obtenir un remplacement
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getAdminSession()
    if (!session) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const { id } = await params

    const remplacement = await prisma.remplacement.findUnique({
      where: { id },
      include: {
        coachRemplace: {
          select: { id: true, prenom: true, nom: true },
        },
        coachRemplacant: {
          select: { id: true, prenom: true, nom: true },
        },
      },
    })

    if (!remplacement) {
      return NextResponse.json(
        { error: 'Remplacement non trouvé' },
        { status: 404 }
      )
    }

    return NextResponse.json({ remplacement })
  } catch (error) {
    planningLogger.error('Erreur lors de la récupération du remplacement', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

// PUT: Mettre à jour un remplacement
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getAdminSession()
    if (!session) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    const validation = updateRemplacementSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Données invalides', details: validation.error.flatten() },
        { status: 400 }
      )
    }

    const data = validation.data

    // Vérifier que le remplacement existe
    const existing = await prisma.remplacement.findUnique({
      where: { id },
    })

    if (!existing) {
      return NextResponse.json(
        { error: 'Remplacement non trouvé' },
        { status: 404 }
      )
    }

    // Vérifier que les deux coachs sont différents si on les modifie
    const newCoachRemplaceId = data.coachRemplaceId || existing.coachRemplaceId
    const newCoachRemplacantId = data.coachRemplacantId || existing.coachRemplacantId

    if (newCoachRemplaceId === newCoachRemplacantId) {
      return NextResponse.json(
        { error: 'Le coach remplaçant doit être différent du coach remplacé' },
        { status: 400 }
      )
    }

    const updateData: {
      coachRemplaceId?: string
      coachRemplacantId?: string
      date?: Date
      heureDebut?: string
      heureFin?: string
      planningId?: string | null
      motif?: string | null
      description?: string | null
      actif?: boolean
    } = {}

    if (data.coachRemplaceId) updateData.coachRemplaceId = data.coachRemplaceId
    if (data.coachRemplacantId) updateData.coachRemplacantId = data.coachRemplacantId
    if (data.date) updateData.date = new Date(data.date)
    if (data.heureDebut) updateData.heureDebut = data.heureDebut
    if (data.heureFin) updateData.heureFin = data.heureFin
    if (data.planningId !== undefined) updateData.planningId = data.planningId
    if (data.motif !== undefined) updateData.motif = data.motif
    if (data.description !== undefined) updateData.description = data.description
    if (data.actif !== undefined) updateData.actif = data.actif

    const remplacement = await prisma.remplacement.update({
      where: { id },
      data: updateData,
      include: {
        coachRemplace: {
          select: { id: true, prenom: true, nom: true },
        },
        coachRemplacant: {
          select: { id: true, prenom: true, nom: true },
        },
      },
    })

    return NextResponse.json({ remplacement })
  } catch (error) {
    planningLogger.error('Erreur lors de la mise à jour du remplacement', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

// DELETE: Supprimer un remplacement
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getAdminSession()
    if (!session) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const { id } = await params

    // Vérifier que le remplacement existe
    const existing = await prisma.remplacement.findUnique({
      where: { id },
    })

    if (!existing) {
      return NextResponse.json(
        { error: 'Remplacement non trouvé' },
        { status: 404 }
      )
    }

    await prisma.remplacement.delete({
      where: { id },
    })

    return NextResponse.json({ message: 'Remplacement supprimé avec succès' })
  } catch (error) {
    planningLogger.error('Erreur lors de la suppression du remplacement', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
