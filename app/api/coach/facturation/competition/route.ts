import { NextRequest, NextResponse } from 'next/server'
import { getCoachSession } from '@/lib/auth/session'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { genererNumeroFactureSequentiel } from '@/lib/facture-utils'

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

    if (!mois || !annee || !typeCompetition || !format || !lieu || !date) {
      return NextResponse.json(
        { error: 'Tous les champs obligatoires doivent être renseignés.' },
        { status: 400 }
      )
    }

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
      ? `Compétition ${typeLibelle} : ${nomCompetition.trim()} - ${formatLibelle} (${lieu.trim()})`
      : `Compétition ${typeLibelle} - ${formatLibelle} (${lieu.trim()})`

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
        lieu: lieu.trim(),
        remplacementId: compGroupId,
      },
    })

    let ligneTransport = null

    // 2. Si compétition régionale avec distance, créer la ligne de forfait transport
    if (typeCompetition === 'regionale' && distanceKm && distanceKm > 0) {
      const montantTransport = Math.round(distanceKm * 0.30 * 100) / 100
      const descriptionTransport = `Forfait transport (${distanceKm} km aller × 0,30 €) - Cavaillon ➔ ${lieu.trim()}`

      ligneTransport = await prisma.ligneFactureCoach.create({
        data: {
          factureId: facture.id,
          type: 'forfait_transport',
          description: descriptionTransport,
          date: dateParsed,
          heures: distanceKm,
          montant: montantTransport,
          lieu: lieu.trim(),
          remplacementId: compGroupId,
        },
      })
    }

    // 3. Recalculer le montant total de la facture
    const totalLignes = await prisma.ligneFactureCoach.aggregate({
      where: { factureId: facture.id },
      _sum: { montant: true },
    })

    const nouveauMontantTotal = totalLignes._sum.montant || 0

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
