import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAdminSession } from '@/lib/auth/session'
import { logger } from '@/lib/logger'
import { z } from 'zod'

const seanceUpdateSchema = z.object({
  titre: z.string().min(1).optional(),
  description: z.string().optional().nullable(),
  groupeId: z.string().optional().nullable(),
  dateSeance: z.string().optional(),
  heureDebut: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  heureFin: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  placesTotal: z.number().int().positive().optional(),
  prix: z.number().positive().optional(),
  actif: z.boolean().optional(),
})

// GET: Détail d'une séance
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

    const seance = await prisma.seanceExceptionnelle.findUnique({
      where: { id },
      include: {
        groupe: {
          select: { id: true, nom: true },
        },
        reservations: {
          orderBy: { createdAt: 'desc' },
        },
      },
    })

    if (!seance) {
      return NextResponse.json({ error: 'Séance non trouvée' }, { status: 404 })
    }

    return NextResponse.json({ seance })
  } catch (error) {
    logger.error('Erreur lors du chargement de la séance', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

// PUT: Modifier une séance
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
    const validation = seanceUpdateSchema.safeParse(body)

    if (!validation.success) {
      const errors = validation.error.issues.map((e) => e.message).join(', ')
      return NextResponse.json({ error: errors }, { status: 400 })
    }

    const data = validation.data

    // Vérifier que la séance existe
    const existing = await prisma.seanceExceptionnelle.findUnique({
      where: { id },
    })

    if (!existing) {
      return NextResponse.json({ error: 'Séance non trouvée' }, { status: 404 })
    }

    // Calculer les places restantes si on change le total
    let placesRestantes = existing.placesRestantes
    if (data.placesTotal !== undefined && data.placesTotal !== existing.placesTotal) {
      const reservationsPayees = await prisma.reservationSeance.count({
        where: { seanceId: id, statutPaiement: 'paye' },
      })
      placesRestantes = Math.max(0, data.placesTotal - reservationsPayees)
    }

    const seance = await prisma.seanceExceptionnelle.update({
      where: { id },
      data: {
        ...(data.titre && { titre: data.titre }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.groupeId !== undefined && { groupeId: data.groupeId }),
        ...(data.dateSeance && { dateSeance: new Date(data.dateSeance) }),
        ...(data.heureDebut && { heureDebut: data.heureDebut }),
        ...(data.heureFin && { heureFin: data.heureFin }),
        ...(data.placesTotal !== undefined && { placesTotal: data.placesTotal, placesRestantes }),
        ...(data.prix !== undefined && { prix: data.prix }),
        ...(data.actif !== undefined && { actif: data.actif }),
      },
      include: {
        groupe: {
          select: { id: true, nom: true },
        },
      },
    })

    logger.info(`Séance modifiée: ${seance.titre}`)
    return NextResponse.json({ seance })
  } catch (error) {
    logger.error('Erreur lors de la modification de la séance', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

// DELETE: Supprimer une séance
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

    // Vérifier s'il y a des réservations payées
    const reservationsPayees = await prisma.reservationSeance.count({
      where: { seanceId: id, statutPaiement: 'paye' },
    })

    if (reservationsPayees > 0) {
      return NextResponse.json(
        { error: `Impossible de supprimer: ${reservationsPayees} réservation(s) payée(s) existante(s)` },
        { status: 400 }
      )
    }

    // Supprimer les réservations non payées
    await prisma.reservationSeance.deleteMany({
      where: { seanceId: id },
    })

    // Supprimer la séance
    await prisma.seanceExceptionnelle.delete({
      where: { id },
    })

    logger.info(`Séance supprimée: ${id}`)
    return NextResponse.json({ success: true })
  } catch (error) {
    logger.error('Erreur lors de la suppression de la séance', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
