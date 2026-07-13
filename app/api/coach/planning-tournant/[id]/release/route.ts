import { NextRequest, NextResponse } from 'next/server'
import { getCoachSession } from '@/lib/auth/session'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'

const coachLogger = logger.withContext('Coach')

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getCoachSession()

    if (!session) {
      return NextResponse.json(
        { error: 'Non authentifié' },
        { status: 401 }
      )
    }

    const { id } = await params

    // Vérifier que l'événement existe et appartient au coach
    const evenement = await prisma.evenementTournant.findUnique({
      where: { id },
    })

    if (!evenement) {
      return NextResponse.json(
        { error: 'Événement non trouvé' },
        { status: 404 }
      )
    }

    if (evenement.coachId !== session.coachId) {
      return NextResponse.json(
        { error: 'Vous ne pouvez pas libérer ce créneau' },
        { status: 403 }
      )
    }

    // Libérer le créneau
    const updated = await prisma.evenementTournant.update({
      where: { id },
      data: {
        coachId: null,
      },
    })

    return NextResponse.json({
      success: true,
      evenement: updated,
    })
  } catch (error) {
    coachLogger.error('Erreur lors de la libération du créneau', error)
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}
