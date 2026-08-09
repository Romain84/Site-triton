import { NextRequest, NextResponse } from 'next/server'
import { getCoachSession } from '@/lib/auth/session'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { logger } from '@/lib/logger'
import { syncRemplacementBillingLines } from '@/lib/services/remplacement-service'

const coachLogger = logger.withContext('CoachRemplacementsAPI')

const coachRemplacementSchema = z.object({
  date: z.string().min(1, 'Date requise'),
  heureDebut: z.string().min(1, 'Heure de début requise'),
  heureFin: z.string().min(1, 'Heure de fin requise'),
  planningId: z.string().optional().nullable(),
  coachRemplacantId: z.string().optional().nullable(),
  motif: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
})

// GET: Récupérer les demandes de remplacements (ouvertes, mes absences, mes remplacements acceptés)
export async function GET() {
  try {
    const session = await getCoachSession()
    if (!session) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const currentCoachId = session.coachId

    // A) Demandes ouvertes (toutes les demandes 'en_attente' où le coach n'est pas le demandeur)
    const demandesOuvertes = await prisma.remplacement.findMany({
      where: {
        actif: true,
        statut: 'en_attente',
        coachRemplaceId: { not: currentCoachId },
        date: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
      },
      include: {
        coachRemplace: {
          select: { id: true, prenom: true, nom: true },
        },
      },
      orderBy: { date: 'asc' },
    })

    // B) Mes absences déclarées (où je suis le coach remplacé)
    const mesAbsences = await prisma.remplacement.findMany({
      where: {
        actif: true,
        coachRemplaceId: currentCoachId,
      },
      include: {
        coachRemplacant: {
          select: { id: true, prenom: true, nom: true },
        },
      },
      orderBy: { date: 'desc' },
    })

    // C) Mes remplacements effectués/acceptés (où je suis le coach remplaçant)
    const mesRemplacements = await prisma.remplacement.findMany({
      where: {
        actif: true,
        coachRemplacantId: currentCoachId,
      },
      include: {
        coachRemplace: {
          select: { id: true, prenom: true, nom: true },
        },
      },
      orderBy: { date: 'desc' },
    })

    return NextResponse.json({
      demandesOuvertes,
      mesAbsences,
      mesRemplacements,
    })
  } catch (error) {
    coachLogger.error('Erreur lors de la récupération des remplacements coach', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

// POST: Déclarer une absence / Proposer un remplacement
export async function POST(request: NextRequest) {
  try {
    const session = await getCoachSession()
    if (!session) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const currentCoachId = session.coachId
    const body = await request.json()
    const validation = coachRemplacementSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Données invalides', details: validation.error.flatten() },
        { status: 400 }
      )
    }

    const data = validation.data

    if (data.coachRemplacantId && data.coachRemplacantId === currentCoachId) {
      return NextResponse.json(
        { error: 'Vous ne pouvez pas vous désigner comme votre propre remplaçant' },
        { status: 400 }
      )
    }

    const statutFinal = data.coachRemplacantId ? 'accepte' : 'en_attente'

    const remplacement = await prisma.remplacement.create({
      data: {
        coachRemplaceId: currentCoachId,
        coachRemplacantId: data.coachRemplacantId || null,
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

    if (statutFinal === 'accepte') {
      await syncRemplacementBillingLines(remplacement.id)
    }

    return NextResponse.json({
      message: data.coachRemplacantId
        ? 'Remplacement validé et lignes de facturation générées'
        : 'Absence/Remplacement proposé aux autres coachs avec succès',
      remplacement,
    })
  } catch (error) {
    coachLogger.error('Erreur lors de la déclaration du remplacement coach', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
