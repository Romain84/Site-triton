import { NextRequest, NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/auth/session'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { logger } from '@/lib/logger'
import { syncRemplacementBillingLines } from '@/lib/services/remplacement-service'

const planningLogger = logger.withContext('Remplacements')

const remplacementSchema = z.object({
  coachRemplaceId: z.string().min(1, 'Coach remplacé requis'),
  coachRemplacantId: z.string().optional().nullable(),
  date: z.string().min(1, 'Date requise'),
  heureDebut: z.string().min(1, 'Heure de début requise'),
  heureFin: z.string().min(1, 'Heure de fin requise'),
  planningId: z.string().optional().nullable(),
  motif: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  statut: z.string().optional(),
})

// GET: Liste des remplacements
export async function GET(request: NextRequest) {
  try {
    const session = await getAdminSession()
    if (!session) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const mois = searchParams.get('mois')
    const annee = searchParams.get('annee')
    const coachId = searchParams.get('coachId')

    const whereClause: {
      actif: boolean
      date?: { gte: Date; lte: Date }
      OR?: Array<{ coachRemplaceId: string } | { coachRemplacantId: string }>
    } = {
      actif: true,
    }

    if (mois && annee) {
      const dateDebut = new Date(parseInt(annee), parseInt(mois) - 1, 1)
      const dateFin = new Date(parseInt(annee), parseInt(mois), 0, 23, 59, 59)
      whereClause.date = {
        gte: dateDebut,
        lte: dateFin,
      }
    }

    if (coachId) {
      whereClause.OR = [
        { coachRemplaceId: coachId },
        { coachRemplacantId: coachId },
      ]
    }

    const remplacements = await prisma.remplacement.findMany({
      where: whereClause,
      include: {
        coachRemplace: {
          select: { id: true, prenom: true, nom: true },
        },
        coachRemplacant: {
          select: { id: true, prenom: true, nom: true },
        },
      },
      orderBy: { date: 'desc' },
    })

    return NextResponse.json({ remplacements })
  } catch (error) {
    planningLogger.error('Erreur lors de la récupération des remplacements', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

// POST: Créer un remplacement
export async function POST(request: NextRequest) {
  try {
    const session = await getAdminSession()
    if (!session) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const body = await request.json()
    const validation = remplacementSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Données invalides', details: validation.error.flatten() },
        { status: 400 }
      )
    }

    const data = validation.data

    const coachRemplacantId = data.coachRemplacantId && data.coachRemplacantId.trim() !== '' ? data.coachRemplacantId : null

    if (coachRemplacantId && data.coachRemplaceId === coachRemplacantId) {
      return NextResponse.json(
        { error: 'Le coach remplaçant doit être différent du coach remplacé' },
        { status: 400 }
      )
    }

    const coachRemplace = await prisma.coach.findUnique({ where: { id: data.coachRemplaceId } })
    if (!coachRemplace) {
      return NextResponse.json(
        { error: 'Coach remplacé non trouvé' },
        { status: 400 }
      )
    }

    if (coachRemplacantId) {
      const coachRemplacant = await prisma.coach.findUnique({ where: { id: coachRemplacantId } })
      if (!coachRemplacant) {
        return NextResponse.json(
          { error: 'Coach remplaçant non trouvé' },
          { status: 400 }
        )
      }
    }

    const statutFinal = data.statut || (coachRemplacantId ? 'accepte' : 'sans_remplacant')

    const remplacement = await prisma.remplacement.create({
      data: {
        coachRemplaceId: data.coachRemplaceId,
        coachRemplacantId: coachRemplacantId,
        date: new Date(data.date),
        heureDebut: data.heureDebut,
        heureFin: data.heureFin,
        planningId: data.planningId || null,
        motif: data.motif || null,
        description: data.description || null,
        statut: statutFinal,
      },
      include: {
        coachRemplace: {
          select: { id: true, prenom: true, nom: true },
        },
        coachRemplacant: {
          select: { id: true, prenom: true, nom: true },
        },
      },
    })

    if (['accepte', 'sans_remplacant'].includes(statutFinal)) {
      await syncRemplacementBillingLines(remplacement.id)
    }

    return NextResponse.json({ remplacement })
  } catch (error) {
    planningLogger.error('Erreur lors de la création du remplacement', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
