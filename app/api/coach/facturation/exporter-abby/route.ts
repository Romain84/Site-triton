import { NextRequest, NextResponse } from 'next/server'
import { getCoachSession } from '@/lib/auth/session'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { calculerFactureCoach } from '@/lib/facture-calculations'
import { exportInvoiceToAbby, AbbyApiError, AbbyInvoiceLine } from '@/lib/abby-api'

const abbyLogger = logger.withContext('CoachAbbyExport')

interface ExportAbbyRequest {
  mois: number
  annee: number
}

export async function POST(request: NextRequest) {
  try {
    const session = await getCoachSession()

    if (!session) {
      return NextResponse.json(
        { error: 'Non authentifié', code: 'UNAUTHORIZED' },
        { status: 401 }
      )
    }

    const body: ExportAbbyRequest = await request.json()
    const { mois, annee } = body

    if (!mois || !annee || mois < 1 || mois > 12) {
      return NextResponse.json(
        { error: 'Mois ou année invalide', code: 'INVALID_PARAMS' },
        { status: 400 }
      )
    }

    // Récupérer le coach
    const coach = await prisma.coach.findUnique({
      where: { id: session.coachId },
      select: {
        id: true,
        prenom: true,
        nom: true,
        email: true,
        siret: true,
        abbyApiKey: true,
      },
    })

    if (!coach) {
      return NextResponse.json(
        { error: 'Coach introuvable', code: 'COACH_NOT_FOUND' },
        { status: 404 }
      )
    }

    // Vérifier si la clé API Abby est présente (sur le coach ou en variable d'env)
    const apiKey = coach.abbyApiKey || process.env.ABBY_API_KEY

    if (!apiKey || apiKey.trim() === '') {
      abbyLogger.info(`Tentative d'export Abby sans clé API pour le coach ${coach.id}`)
      return NextResponse.json(
        {
          error: "La facture ne sera pas exportée vers la plateforme Abby car votre clé API n'est pas renseignée.",
          code: 'MISSING_API_KEY',
        },
        { status: 400 }
      )
    }

    // Récupérer les détails de facturation du mois
    const factureDetails = await calculerFactureCoach(session.coachId, mois, annee)

    if (!factureDetails || (factureDetails.totalMontant <= 0 && factureDetails.totalHeures <= 0)) {
      return NextResponse.json(
        { error: 'Aucune heure ni montant à facturer pour cette période.', code: 'EMPTY_INVOICE' },
        { status: 400 }
      )
    }

    // Construire les lignes pour Abby
    const allLignes = [
      ...factureDetails.lignesPlanningFixe,
      ...factureDetails.lignesPlanningTournant,
      ...factureDetails.lignesRemplacements,
      ...factureDetails.lignesManuelles.filter((l) => l.type !== 'absence'),
    ]

    const abbyLines: AbbyInvoiceLine[] = allLignes.map((l) => ({
      description: l.description,
      quantity: l.heures > 0 ? l.heures : 1,
      unitPrice: l.heures > 0 ? Math.round((l.montant / l.heures) * 100) / 100 : l.montant,
      type: 2, // Prestation de service
      vatCode: 'FR_00HT', // Non assujetti TVA
    }))

    if (abbyLines.length === 0) {
      abbyLines.push({
        description: `Prestation vacation entraînement natation`,
        quantity: factureDetails.totalHeures || 1,
        unitPrice: factureDetails.totalMontant / (factureDetails.totalHeures || 1),
        type: 2,
        vatCode: 'FR_00HT',
      })
    }

    // Appeler l'API Abby
    const result = await exportInvoiceToAbby({
      apiKey,
      clubName: 'Triton Club Cavaillon',
      mois,
      annee,
      lines: abbyLines,
    })

    // Mettre à jour le statut dans la DB si besoin
    await prisma.factureCoach.upsert({
      where: {
        coachId_mois_annee: {
          coachId: session.coachId,
          mois,
          annee,
        },
      },
      create: {
        numero: `TCC-COACH-${annee}-${String(mois).padStart(2, '0')}-${coach.id.slice(-4)}`,
        coachId: session.coachId,
        mois,
        annee,
        montantTotal: factureDetails.totalMontant,
        tauxHoraire: factureDetails.tauxHoraire,
        statut: 'exportee_abby',
      },
      update: {
        montantTotal: factureDetails.totalMontant,
      },
    })

    abbyLogger.info(`Facture exportée avec succès vers Abby (ID: ${result.invoiceId}) pour le coach ${coach.id}`)

    return NextResponse.json({
      success: true,
      invoiceId: result.invoiceId,
      invoiceNumber: result.invoiceNumber,
      message: 'Facture exportée vers la plateforme Abby avec succès !',
    })
  } catch (error) {
    if (error instanceof AbbyApiError) {
      abbyLogger.error(`Erreur API Abby (${error.code}): ${error.message}`)
      return NextResponse.json(
        {
          error: error.message,
          code: error.code,
          status: error.status || 500,
        },
        { status: error.status && error.status >= 400 && error.status < 600 ? error.status : 500 }
      )
    }

    abbyLogger.error('Erreur serveur lors de l\'exportation Abby', error)
    return NextResponse.json(
      {
        error: 'Une erreur inattendue est survenue lors de l\'exportation vers Abby.',
        code: 'INTERNAL_SERVER_ERROR',
      },
      { status: 500 }
    )
  }
}
