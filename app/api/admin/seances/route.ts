import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAdminSession } from '@/lib/auth/session'
import { logger } from '@/lib/logger'
import { z } from 'zod'

const seanceSchema = z.object({
  titre: z.string().min(1, 'Le titre est requis'),
  description: z.string().optional().nullable(),
  groupeId: z.string().optional().nullable(),
  dateSeance: z.string().min(1, 'La date est requise'),
  heureDebut: z.string().regex(/^\d{2}:\d{2}$/, 'Format heure invalide'),
  heureFin: z.string().regex(/^\d{2}:\d{2}$/, 'Format heure invalide'),
  placesTotal: z.number().int().positive('Le nombre de places doit être positif'),
  prix: z.number().positive('Le prix doit être positif'),
  actif: z.boolean().optional(),
})

// GET: Liste des séances exceptionnelles
export async function GET(request: NextRequest) {
  try {
    const session = await getAdminSession()
    if (!session) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const includePassees = searchParams.get('includePassees') === 'true'

    const whereClause: any = {}

    if (!includePassees) {
      whereClause.dateSeance = {
        gte: new Date(new Date().setHours(0, 0, 0, 0)),
      }
    }

    const seances = await prisma.seanceExceptionnelle.findMany({
      where: whereClause,
      include: {
        groupe: {
          select: { id: true, nom: true },
        },
        _count: {
          select: { reservations: true },
        },
      },
      orderBy: { dateSeance: 'asc' },
    })

    return NextResponse.json({ seances })
  } catch (error) {
    logger.error('Erreur lors du chargement des séances', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

// POST: Créer une séance
export async function POST(request: NextRequest) {
  try {
    const session = await getAdminSession()
    if (!session) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const body = await request.json()
    const validation = seanceSchema.safeParse(body)

    if (!validation.success) {
      const errors = validation.error.issues.map((e) => e.message).join(', ')
      return NextResponse.json({ error: errors }, { status: 400 })
    }

    const data = validation.data

    const seance = await prisma.seanceExceptionnelle.create({
      data: {
        titre: data.titre,
        description: data.description || null,
        groupeId: data.groupeId || null,
        dateSeance: new Date(data.dateSeance),
        heureDebut: data.heureDebut,
        heureFin: data.heureFin,
        placesTotal: data.placesTotal,
        placesRestantes: data.placesTotal,
        prix: data.prix,
        actif: data.actif ?? true,
      },
      include: {
        groupe: {
          select: { id: true, nom: true },
        },
      },
    })

    logger.info(`Séance créée: ${seance.titre}`)
    return NextResponse.json({ seance }, { status: 201 })
  } catch (error) {
    logger.error('Erreur lors de la création de la séance', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
