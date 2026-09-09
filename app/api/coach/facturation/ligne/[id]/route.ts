import { NextRequest, NextResponse } from 'next/server'
import { getCoachSession } from '@/lib/auth/session'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { calculerFactureCoach } from '@/lib/facture-calculations'

const coachLogger = logger.withContext('Coach')

export async function PUT(
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
    const body = await request.json()
    const { description, date, heures, montant, groupe, lieu, demiJournees, coachRemplaceId, heureDebut, heureFin } = body

    // Vérifier que la ligne existe et appartient au coach
    const ligne = await prisma.ligneFactureCoach.findUnique({
      where: { id },
      include: {
        facture: true,
      },
    })

    if (!ligne) {
      return NextResponse.json(
        { error: 'Ligne non trouvée' },
        { status: 404 }
      )
    }

    if (ligne.facture.coachId !== session.coachId) {
      return NextResponse.json(
        { error: 'Non autorisé' },
        { status: 403 }
      )
    }

    // Mettre à jour la ligne
    let finalHeures = heures
    let finalMontant = montant

    if (ligne.type === 'absence') {
      if (heures !== undefined) finalHeures = -Math.abs(heures)
      if (montant !== undefined) finalMontant = -Math.abs(montant)
    }

    const updatedLigne = await prisma.ligneFactureCoach.update({
      where: { id },
      data: {
        description,
        date: date ? new Date(date) : ligne.date,
        heures: finalHeures,
        montant: finalMontant,
        groupe,
        lieu,
        demiJournees,
        coachRemplaceId,
      },
    })

    if (updatedLigne.remplacementId) {
      try {
        await prisma.remplacement.update({
          where: { id: updatedLigne.remplacementId },
          data: {
            date: date ? new Date(date) : updatedLigne.date,
            heureDebut: heureDebut || undefined,
            heureFin: heureFin || undefined,
            description: description || undefined,
          },
        })

        // Mettre à jour la ligne d'absence correspondante sur l'autre facture
        const coachRemplacant = await prisma.coach.findUnique({
          where: { id: session.coachId },
          select: { prenom: true, nom: true },
        })
        const coachRemplacantNom = coachRemplacant ? `${coachRemplacant.prenom} ${coachRemplacant.nom || ''}`.trim() : 'Coach'
        const descriptionDeduction = `Remplacé(e) par ${coachRemplacantNom} - ${groupe || updatedLigne.groupe || 'Groupe'} - ${new Date(date || updatedLigne.date).toLocaleDateString('fr-FR')} (${Math.abs(finalHeures)}h)`

        await prisma.ligneFactureCoach.updateMany({
          where: {
            remplacementId: updatedLigne.remplacementId,
            type: 'absence',
          },
          data: {
            date: date ? new Date(date) : updatedLigne.date,
            heures: -Math.abs(finalHeures),
            montant: -Math.abs(finalMontant),
            description: descriptionDeduction,
            groupe: groupe || updatedLigne.groupe,
            lieu: lieu || updatedLigne.lieu,
          },
        })
      } catch (err) {
        coachLogger.error('Erreur lors de la synchronisation du remplacement', err)
      }
    }

    // Mettre à jour le montant total de la facture avec le calcul complet
    const details = await calculerFactureCoach(ligne.facture.coachId, ligne.facture.mois, ligne.facture.annee)
    await prisma.factureCoach.update({
      where: { id: ligne.factureId },
      data: { montantTotal: details.totalMontant },
    })

    return NextResponse.json({
      success: true,
      ligne: updatedLigne,
    })
  } catch (error) {
    coachLogger.error('Erreur lors de la modification de la ligne', error)
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}

export async function DELETE(
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

    // Vérifier que la ligne existe et appartient au coach
    const ligne = await prisma.ligneFactureCoach.findUnique({
      where: { id },
      include: {
        facture: true,
      },
    })

    if (!ligne) {
      return NextResponse.json(
        { error: 'Ligne non trouvée' },
        { status: 404 }
      )
    }

    if (ligne.facture.coachId !== session.coachId) {
      return NextResponse.json(
        { error: 'Non autorisé' },
        { status: 403 }
      )
    }

    if (ligne.remplacementId?.startsWith('comp_')) {
      // Supprimer toutes les lignes associées à cette compétition (forfait compétition + éventuel forfait transport)
      await prisma.ligneFactureCoach.deleteMany({
        where: {
          factureId: ligne.factureId,
          remplacementId: ligne.remplacementId,
        },
      })
    } else {
      if (ligne.remplacementId) {
        try {
          await prisma.remplacement.delete({
            where: { id: ligne.remplacementId },
          })
        } catch (err) {
          coachLogger.error('Erreur lors de la suppression du remplacement associé', err)
        }
        try {
          await prisma.ligneFactureCoach.deleteMany({
            where: {
              remplacementId: ligne.remplacementId,
              type: 'absence',
            },
          })
        } catch (err) {
          coachLogger.error('Erreur lors de la suppression des lignes absence associées', err)
        }
      }

      // Supprimer la ligne
      await prisma.ligneFactureCoach.delete({
        where: { id },
      })
    }

    // Mettre à jour le montant total de la facture avec le calcul complet
    const details = await calculerFactureCoach(ligne.facture.coachId, ligne.facture.mois, ligne.facture.annee)
    await prisma.factureCoach.update({
      where: { id: ligne.factureId },
      data: { montantTotal: details.totalMontant },
    })

    return NextResponse.json({
      success: true,
    })
  } catch (error) {
    coachLogger.error('Erreur lors de la suppression de la ligne', error)
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}
