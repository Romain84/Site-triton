import { NextRequest, NextResponse } from 'next/server'
import { getCoachSession } from '@/lib/auth/session'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { genererNumeroFactureSequentiel } from '@/lib/facture-utils'
import { calculerFactureCoach } from '@/lib/facture-calculations'

const coachLogger = logger.withContext('Coach')

interface AddLigneRequest {
  mois: number
  annee: number
  type?: 'remplacement' | 'competition' | 'forfait_regional' | 'forfait_transport' | 'absence' | 'manuel'
  description: string
  heures?: number
  montant?: number
  date?: string
  groupe?: string
  lieu?: string
  demiJournees?: number
  coachRemplaceId?: string
  heureDebut?: string
  heureFin?: string
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
    let { mois, annee, type = 'manuel', description, heures = 0, montant, date, groupe, lieu, demiJournees, coachRemplaceId, heureDebut, heureFin } = body

    // Gestion spécifique pour les absences (valeurs négatives)
    if (type === 'absence') {
      heures = -Math.abs(heures)
      if (montant !== undefined) {
        montant = -Math.abs(montant)
      }
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
      // Récupérer les infos du coach pour générer le numéro
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

      // Générer un numéro de facture séquentiel continu
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

    if (montant === undefined || montant === null) {
      montant = (heures || 0) * (facture.tauxHoraire || 35)
    }

    let createdRemplacementId: string | null = null

    if (type === 'remplacement' && coachRemplaceId) {
      try {
        const replacement = await prisma.remplacement.create({
          data: {
            coachRemplaceId: coachRemplaceId,
            coachRemplacantId: session.coachId,
            date: date ? new Date(date) : new Date(),
            heureDebut: heureDebut || '00:00',
            heureFin: heureFin || '00:00',
            description: description,
            motif: 'Remplacement déclaré par le coach',
          }
        })
        createdRemplacementId = replacement.id
      } catch (err) {
        coachLogger.error('Erreur lors de la création du remplacement', err)
      }
    }

    // Ajouter la ligne à la facture
    const ligne = await prisma.ligneFactureCoach.create({
      data: {
        factureId: facture.id,
        type,
        description,
        date: date ? new Date(date) : new Date(),
        heures,
        montant,
        groupe,
        lieu,
        demiJournees,
        coachRemplaceId,
        remplacementId: createdRemplacementId,
      },
    })

    // Si c'est un remplacement et qu'un coach remplacé est spécifié,
    // créer automatiquement une déduction pour ce coach
    if (type === 'remplacement' && coachRemplaceId) {
      // Récupérer les infos du coach qui remplace (coach actuel)
      const coachRemplacant = await prisma.coach.findUnique({
        where: { id: session.coachId },
        select: { prenom: true, nom: true },
      })

      if (coachRemplacant) {
        const coachRemplacantNom = `${coachRemplacant.prenom} ${coachRemplacant.nom || ''}`.trim()

        // Vérifier si une facture brouillon existe pour le coach remplacé
        let factureCoachRemplace = await prisma.factureCoach.findUnique({
          where: {
            coachId_mois_annee: {
              coachId: coachRemplaceId,
              mois,
              annee,
            },
          },
        })

        // Si pas de facture, la créer
        if (!factureCoachRemplace) {
          const coachRemplace = await prisma.coach.findUnique({
            where: { id: coachRemplaceId },
            select: { prenom: true, nom: true },
          })

          if (coachRemplace) {
            const numeroRemplace = await genererNumeroFactureSequentiel(coachRemplaceId, annee)

            const settings = await prisma.settings.findFirst()
            const tauxHoraireRemplace = settings?.tauxHoraire || 35

            factureCoachRemplace = await prisma.factureCoach.create({
              data: {
                numero: numeroRemplace,
                coachId: coachRemplaceId,
                mois,
                annee,
                montantTotal: 0,
                tauxHoraire: tauxHoraireRemplace,
                statut: 'brouillon',
              },
            })
          }
        }

        // Créer la ligne de déduction pour le coach remplacé
        if (factureCoachRemplace) {
          const descriptionDeduction = `Remplacé(e) par ${coachRemplacantNom} - ${groupe || 'Groupe'} - ${new Date(date || Date.now()).toLocaleDateString('fr-FR')} (${Math.abs(heures)}h)`

          await prisma.ligneFactureCoach.create({
            data: {
              factureId: factureCoachRemplace.id,
              type: 'absence',
              description: descriptionDeduction,
              date: date ? new Date(date) : new Date(),
              heures: -Math.abs(heures),
              montant: -Math.abs(montant),
              groupe,
              remplacementId: createdRemplacementId,
            },
          })

          // Mettre à jour le montant total de la facture du coach remplacé avec le calcul complet
          const detailsRemplace = await calculerFactureCoach(coachRemplaceId, mois, annee)
          await prisma.factureCoach.update({
            where: { id: factureCoachRemplace.id },
            data: { montantTotal: detailsRemplace.totalMontant },
          })
        }
      }
    }

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
    coachLogger.error('Erreur lors de l\'ajout de la ligne', error)
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}
