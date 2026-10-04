import { NextRequest, NextResponse } from 'next/server'
import { getCoachSession } from '@/lib/auth/session'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { creerFactureCoachSecurisee } from '@/lib/facture-utils'
import { calculerFactureCoach } from '@/lib/facture-calculations'

const coachLogger = logger.withContext('Coach')

interface AddLigneRequest {
  mois: number
  annee: number
  type?: 'manuel'
  description: string
  heures?: number
  montant?: number
  date?: string
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

    const body: AddLigneRequest = await request.json()
    const { mois, annee, description, heures = 0, date } = body

    if (!description || !description.trim()) {
      return NextResponse.json(
        { error: 'Description obligatoire' },
        { status: 400 }
      )
    }

    // Vérifier si une facture existe déjà pour ce mois
    let facture = await prisma.factureCoach.findUnique({
      where: {
        coachId_mois_annee: {
          coachId: session.coachId,
          mois,
          annee,
        },
      },
    })

    if (facture && ['envoyee', 'payee'].includes(facture.statut)) {
      return NextResponse.json(
        { error: 'Cette facture a déjà été transmise au club et ne peut plus être modifiée.' },
        { status: 403 }
      )
    }

    // Si pas de facture, la créer
    if (!facture) {
      const coach = await prisma.coach.findUnique({
        where: { id: session.coachId },
        select: { prenom: true, nom: true },
      })

      if (!coach) {
        return NextResponse.json(
          { error: 'Coach non trouvé' },
          { status: 404 }
        )
      }

      const settings = await prisma.settings.findFirst()
      const tauxHoraire = settings?.tauxHoraire || 35

      facture = await creerFactureCoachSecurisee({
        coachId: session.coachId,
        mois,
        annee,
        montantTotal: 0,
        tauxHoraire,
        statut: 'brouillon',
      })
    }

    const montant = body.montant !== undefined && body.montant !== null
      ? body.montant
      : (heures || 0) * (facture.tauxHoraire || 35)

    // Ajouter la ligne manuelle à la facture (uniquement type 'manuel', pas de création de doublon Remplacement)
    const ligne = await prisma.ligneFactureCoach.create({
      data: {
        factureId: facture.id,
        type: 'manuel',
        description: description.trim(),
        date: date ? new Date(date) : new Date(),
        heures: heures || 0,
        montant,
      },
    })

    // Mettre à jour le montant total de la facture du coach avec le calcul complet
    const details = await calculerFactureCoach(session.coachId, mois, annee)
    await prisma.factureCoach.update({
      where: { id: facture.id },
      data: { montantTotal: details.totalMontant },
    })

    return NextResponse.json({
      success: true,
      ligne,
    })
  } catch (error) {
    coachLogger.error("Erreur lors de l'ajout de la prestation manuelle", error)
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}
