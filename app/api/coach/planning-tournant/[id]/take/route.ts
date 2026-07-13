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

    // Vérifier que l'événement existe et n'est pas déjà pris
    const evenement = await prisma.evenementTournant.findUnique({
      where: { id },
    })

    if (!evenement) {
      return NextResponse.json(
        { error: 'Événement non trouvé' },
        { status: 404 }
      )
    }

    if (evenement.coachId) {
      return NextResponse.json(
        { error: 'Ce créneau est déjà pris' },
        { status: 400 }
      )
    }

    // Assigner le créneau au coach
    const updated = await prisma.evenementTournant.update({
      where: { id },
      data: {
        coachId: session.coachId,
      },
      include: {
        coach: {
          select: {
            id: true,
            prenom: true,
            nom: true,
          },
        },
      },
    })

    return NextResponse.json({
      success: true,
      evenement: updated,
    })
  } catch (error) {
    coachLogger.error('Erreur lors de la prise du créneau', error)
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}
