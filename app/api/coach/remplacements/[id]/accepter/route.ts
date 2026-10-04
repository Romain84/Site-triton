import { NextRequest, NextResponse } from 'next/server'
import { getCoachSession } from '@/lib/auth/session'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { syncRemplacementBillingLines } from '@/lib/services/remplacement-service'
import { notifyRemplacementAccepte } from '@/lib/notifications'

const coachLogger = logger.withContext('AccepterRemplacementAPI')

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getCoachSession()
    if (!session) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const currentCoachId = session.coachId
    const { id } = await params

    const existing = await prisma.remplacement.findUnique({
      where: { id },
      include: { coachRemplace: true },
    })

    if (!existing) {
      return NextResponse.json({ error: 'Demande de remplacement non trouvée' }, { status: 404 })
    }

    if (existing.coachRemplaceId === currentCoachId) {
      return NextResponse.json(
        { error: 'Vous ne pouvez pas accepter votre propre remplacement' },
        { status: 400 }
      )
    }

    if (existing.statut === 'accepte' && existing.coachRemplacantId) {
      return NextResponse.json(
        { error: 'Ce remplacement a déjà été pris par un autre coach' },
        { status: 400 }
      )
    }

    const updated = await prisma.remplacement.update({
      where: { id },
      data: {
        coachRemplacantId: currentCoachId,
        statut: 'accepte',
      },
      include: {
        coachRemplace: { select: { id: true, prenom: true, nom: true, email: true } },
        coachRemplacant: { select: { id: true, prenom: true, nom: true, email: true } },
      },
    })

    // Synchronisation automatique des 2 lignes de facturation (Coach remplacé & Coach remplaçant)
    await syncRemplacementBillingLines(updated.id)

    // Récupérer le groupe si lié au planning
    let groupeNom: string | null = null
    if (updated.planningId) {
      const p = await prisma.planning.findUnique({
        where: { id: updated.planningId },
        include: { groupe: { select: { nom: true } } },
      })
      groupeNom = p?.nomSession || p?.groupe?.nom || null
    }

    const dateFormatted = new Date(updated.date).toLocaleDateString('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    })

    if (updated.coachRemplacant) {
      await notifyRemplacementAccepte({
        coachRemplace: updated.coachRemplace,
        coachRemplacant: updated.coachRemplacant,
        dateStr: dateFormatted,
        heureDebut: updated.heureDebut,
        heureFin: updated.heureFin,
        groupeNom,
      })
    }

    return NextResponse.json({
      message: 'Remplacement accepté ! Les lignes de facturation ont été synchronisées pour vous et votre collègue.',
      remplacement: updated,
    })
  } catch (error) {
    coachLogger.error("Erreur lors de l'acceptation du remplacement", error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
