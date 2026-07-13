import { NextRequest, NextResponse } from 'next/server'
import { getCoachSession } from '@/lib/auth/session'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { isValidFactureCoachStatus } from '@/lib/facture-utils'

const coachLogger = logger.withContext('Coach')

export async function GET(request: NextRequest) {
  try {
    const session = await getCoachSession()

    if (!session) {
      return NextResponse.json(
        { error: 'Non authentifié' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const annee = searchParams.get('annee')
    const mois = searchParams.get('mois')
    const statut = searchParams.get('statut')

    // Construire les filtres
    const where: {
      coachId: string
      annee?: number
      mois?: number
      statut?: string
    } = {
      coachId: session.coachId,
    }

    if (annee) {
      const parsedYear = parseInt(annee, 10)
      if (Number.isNaN(parsedYear) || parsedYear < 2000 || parsedYear > 2100) {
        return NextResponse.json({ error: 'Année invalide' }, { status: 400 })
      }
      where.annee = parsedYear
    }

    if (mois) {
      const parsedMonth = parseInt(mois, 10)
      if (Number.isNaN(parsedMonth) || parsedMonth < 1 || parsedMonth > 12) {
        return NextResponse.json({ error: 'Mois invalide' }, { status: 400 })
      }
      where.mois = parsedMonth
    }

    if (statut) {
      if (!isValidFactureCoachStatus(statut)) {
        return NextResponse.json({ error: 'Statut invalide' }, { status: 400 })
      }
      where.statut = statut
    }

    // Récupérer toutes les factures du coach avec filtres
    const factures = await prisma.factureCoach.findMany({
      where,
      orderBy: [
        { annee: 'desc' },
        { mois: 'desc' },
      ],
      select: {
        id: true,
        numero: true,
        mois: true,
        annee: true,
        montantTotal: true,
        tauxHoraire: true,
        statut: true,
        dateGeneration: true,
        dateEnvoi: true,
        datePaiement: true,
        createdAt: true,
      },
    })

    const totalMontant = factures.reduce((sum, facture) => sum + facture.montantTotal, 0)
    const totalPaye = factures
      .filter((facture) => facture.statut === 'payee')
      .reduce((sum, facture) => sum + facture.montantTotal, 0)

    const byStatut = factures.reduce<Record<string, number>>((acc, facture) => {
      acc[facture.statut] = (acc[facture.statut] || 0) + 1
      return acc
    }, {})

    return NextResponse.json({
      factures,
      summary: {
        totalFactures: factures.length,
        totalMontant,
        totalPaye,
        totalEnAttente: totalMontant - totalPaye,
        byStatut,
      },
    })
  } catch (error) {
    coachLogger.error('Erreur lors de la récupération de l\'historique', error)
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}
