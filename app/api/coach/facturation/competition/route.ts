import { NextRequest, NextResponse } from 'next/server'
import { getCoachSession } from '@/lib/auth/session'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { genererNumeroFactureSequentiel } from '@/lib/facture-utils'
import { calculerFactureCoach } from '@/lib/facture-calculations'

const coachLogger = logger.withContext('CoachCompetition')

interface AddCompetitionRequest {
  mois: number
  annee: number
  typeCompetition: 'departementale' | 'regionale'
  format: 'demi_journee' | 'journee'
  nomCompetition: string
  lieu: string
  date: string
  distanceKm?: number
}

export async function POST(request: NextRequest) {
  try {
    const session = await getCoachSession()
    if (!session) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const body: AddCompetitionRequest = await request.json()
    const { mois, annee, typeCompetition, format, nomCompetition, lieu, date, distanceKm } = body

    if (!mois || !annee || !typeCompetition || !format || !date || (!nomCompetition && !nomCompetition?.trim())) {
      return NextResponse.json(
        { error: 'Le nom de la compétition, la date, le niveau et le format sont obligatoires.' },
        { status: 400 }
      )
    }

    if (typeCompetition === 'regionale' && (!lieu || !lieu.trim())) {
      return NextResponse.json(
        { error: 'Le lieu ou bassin de compétition est obligatoire pour une compétition régionale.' },
        { status: 400 }
      )
    }

    if (typeCompetition === 'regionale' && (!distanceKm || distanceKm <= 0)) {
      return NextResponse.json(
        { error: 'La distance aller en kilomètres est obligatoire pour calculer le forfait transport d\'une compétition régionale.' },
        { status: 400 }
      )
    }

    const lieuFinal = typeCompetition === 'regionale' ? lieu.trim() : (lieu?.trim() || 'Vaucluse (84)')

    // Tarifs officiels
    // Demi-journée : 50 €
    // Journée complète : 130 €
    const montantCompetition = format === 'journee' ? 130 : 50
    const demiJournees = format === 'journee' ? 2 : 1

    // Vérifier ou créer la facture pour le mois sélectionné
    let facture = await prisma.factureCoach.findUnique({
      where: {
        coachId_mois_annee: {
          coachId: session.coachId,
          mois,
          annee,
        },
      },
    })

    if (!facture) {
      const coach = await prisma.coach.findUnique({
        where: { id: session.coachId },
        select: { prenom: true, nom: true },
      })

      if (!coach) {
        return NextResponse.json({ error: 'Coach introuvable' }, { status: 404 })
      }

      const numero = await genererNumeroFactureSequentiel(session.coachId, annee)
      const settings = await prisma.settings.findFirst()
      const tauxHoraire = settings?.tauxHoraire || 35

      facture = await prisma.factureCoach.create({
        data: {
          numero,
          coachId: session.coachId,
          mois,
          annee,
          montantTotal: 0,
          tauxHoraire,
          statut: 'brouillon',
        },
      })
    }

    // Identifiant unique pour lier la ligne de compétition et son forfait transport
    const compGroupId = `comp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`

    const typeLibelle = typeCompetition === 'regionale' ? 'Régionale' : 'Départementale'
    const formatLibelle = format === 'journee' ? 'Journée complète' : 'Demi-journée'
    const descriptionCompetition = nomCompetition?.trim()
      ? (typeCompetition === 'regionale'
          ? `Compétition Régionale : ${nomCompetition.trim()} - ${formatLibelle} (${lieuFinal})`
          : `Compétition Départementale : ${nomCompetition.trim()} - ${formatLibelle}`)
      : (typeCompetition === 'regionale'
          ? `Compétition Régionale - ${formatLibelle} (${lieuFinal})`
          : `Compétition Départementale - ${formatLibelle}`)

    const dateParsed = new Date(date)

    // 1. Créer la ligne de rémunération de la compétition
    const ligneCompetition = await prisma.ligneFactureCoach.create({
      data: {
        factureId: facture.id,
        type: 'competition',
        description: descriptionCompetition,
        date: dateParsed,
        heures: demiJournees,
        demiJournees,
        montant: montantCompetition,
        lieu: lieuFinal,
        remplacementId: compGroupId,
      },
    })

    let ligneTransport = null

    // 2. Si compétition régionale avec distance, créer la ligne de forfait transport
    if (typeCompetition === 'regionale' && distanceKm && distanceKm > 0) {
      const montantTransport = Math.round(distanceKm * 0.30 * 100) / 100
      const descriptionTransport = `Forfait transport (${distanceKm} km aller × 0,30 €) - Cavaillon ➔ ${lieuFinal}`

      ligneTransport = await prisma.ligneFactureCoach.create({
        data: {
          factureId: facture.id,
          type: 'forfait_transport',
          description: descriptionTransport,
          date: dateParsed,
          heures: distanceKm,
          montant: montantTransport,
          lieu: lieuFinal,
          remplacementId: compGroupId,
        },
      })
    }

    // 3. Recalculer le montant total de la facture avec le calcul complet
    const details = await calculerFactureCoach(session.coachId, mois, annee)
    const nouveauMontantTotal = details.totalMontant

    await prisma.factureCoach.update({
      where: { id: facture.id },
      data: { montantTotal: nouveauMontantTotal },
    })

    return NextResponse.json({
      success: true,
      compGroupId,
      ligneCompetition,
      ligneTransport,
      montantTotal: nouveauMontantTotal,
    })
  } catch (error) {
    coachLogger.error('Erreur lors de l\'ajout de la compétition', error)
    return NextResponse.json(
      { error: 'Erreur lors de l\'enregistrement de la compétition' },
      { status: 500 }
    )
  }
}
