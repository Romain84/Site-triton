import { NextRequest, NextResponse } from 'next/server'
import { getCoachSession } from '@/lib/auth/session'
import { logger } from '@/lib/logger'
import { calculerFactureCoach } from '@/lib/facture-calculations'

const coachLogger = logger.withContext('Coach')

interface CalculateRequest {
  mois: number // 1-12
  annee: number
}

export async function POST(request: NextRequest) {
  try {
    const session = await getCoachSession()

    if (!session) {
      return NextResponse.json(
        { error: 'Non authentifié' },
        { status: 401 }
      )
    }

    const body: CalculateRequest = await request.json()
    const { mois, annee } = body

    if (!mois || !annee || mois < 1 || mois > 12) {
      return NextResponse.json(
        { error: 'Mois ou année invalide' },
        { status: 400 }
      )
    }

    const result = await calculerFactureCoach(session.coachId, mois, annee)

    return NextResponse.json(result)
  } catch (error) {
    coachLogger.error('Erreur lors du calcul de la facture', error)
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}
