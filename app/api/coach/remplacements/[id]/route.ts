import { NextRequest, NextResponse } from 'next/server'
import { getCoachSession } from '@/lib/auth/session'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { calculerFactureCoach } from '@/lib/facture-calculations'
import { notifyAnnulationRemplacement } from '@/lib/notifications'

const coachLogger = logger.withContext('SupprimerRemplacementAPI')

async function recalculerFactureSiExistante(coachId: string, mois: number, annee: number) {
  try {
    const f = await prisma.factureCoach.findUnique({
      where: { coachId_mois_annee: { coachId, mois, annee } },
    })
    if (f && ['brouillon', 'generee'].includes(f.statut)) {
      const details = await calculerFactureCoach(coachId, mois, annee)
      await prisma.factureCoach.update({
        where: { id: f.id },
        data: { montantTotal: details.totalMontant },
      })
    }
  } catch (error) {
    coachLogger.warn('Erreur lors du recalcul de la facture post-suppression', error)
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getCoachSession()
    if (!session) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const { id } = await params
    const existing = await prisma.remplacement.findUnique({
      where: { id },
      include: {
        coachRemplace: { select: { id: true, prenom: true, nom: true, email: true } },
        coachRemplacant: { select: { id: true, prenom: true, nom: true, email: true } },
      },
    })

    if (!existing) {
      return NextResponse.json({ error: 'Demande d\'absence ou remplacement non trouvée' }, { status: 404 })
    }

    if (existing.coachRemplaceId !== session.coachId) {
      return NextResponse.json(
        { error: 'Vous ne pouvez annuler que vos propres absences' },
        { status: 403 }
      )
    }

    const dateObj = new Date(existing.date)
    const mois = dateObj.getMonth() + 1
    const annee = dateObj.getFullYear()

    // 1. Supprimer l'éventuelle ligne manuelle LigneFactureCoach
    await prisma.ligneFactureCoach.deleteMany({
      where: { remplacementId: id },
    })

    // 2. Supprimer l'enregistrement de remplacement
    await prisma.remplacement.delete({
      where: { id },
    })

    // 3. Recalculer les factures des coachs affectés
    await Promise.all([
      recalculerFactureSiExistante(existing.coachRemplaceId, mois, annee),
      existing.coachRemplacantId
        ? recalculerFactureSiExistante(existing.coachRemplacantId, mois, annee)
        : Promise.resolve(),
    ])

    // 4. Si un collègue avait été désigné ou avait accepté, le notifier de l'annulation
    if (existing.coachRemplacant) {
      const dateFormatted = dateObj.toLocaleDateString('fr-FR', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
      })
      await notifyAnnulationRemplacement({
        coachRemplace: existing.coachRemplace,
        coachRemplacant: existing.coachRemplacant,
        dateStr: dateFormatted,
        heureDebut: existing.heureDebut,
        heureFin: existing.heureFin,
      })
    }

    return NextResponse.json({
      message: 'Votre absence a été annulée avec succès. Votre séance est rétablie dans votre agenda.',
    })
  } catch (error) {
    coachLogger.error("Erreur lors de l'annulation de l'absence", error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
