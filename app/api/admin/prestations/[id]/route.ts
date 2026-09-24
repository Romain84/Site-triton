import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { requireAdmin, handleRouteError } from '@/lib/api/guards'
import { calculerFactureCoach } from '@/lib/facture-calculations'
import { logAdminAudit } from '@/lib/admin-audit'

const adminLogger = logger.withContext('AdminPrestations')

export const dynamic = 'force-dynamic'

/**
 * DELETE /api/admin/prestations/[id]
 * Supprime une prestation manuelle et recalcule la facture du coach
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAdmin()
    if (!auth.ok) return auth.response

    const { id } = await params

    const ligne = await prisma.ligneFactureCoach.findUnique({
      where: { id },
      include: {
        facture: {
          select: {
            id: true,
            coachId: true,
            mois: true,
            annee: true,
            statut: true,
            coach: { select: { prenom: true, nom: true } },
          },
        },
      },
    })

    if (!ligne) {
      return NextResponse.json({ error: 'Prestation introuvable' }, { status: 404 })
    }

    if (ligne.type !== 'manuel') {
      return NextResponse.json(
        { error: 'Seules les prestations manuelles peuvent être supprimées via cette interface' },
        { status: 400 }
      )
    }

    if (['envoyee', 'payee'].includes(ligne.facture.statut)) {
      return NextResponse.json(
        {
          error: `Cette facture est déjà ${ligne.facture.statut === 'payee' ? 'payée' : 'envoyée'}. Repassez-la en brouillon avant de supprimer une ligne.`,
        },
        { status: 400 }
      )
    }

    const { factureId, facture } = ligne

    // Supprimer la ligne
    await prisma.ligneFactureCoach.delete({
      where: { id },
    })

    // Recalculer le montant total de la facture
    const details = await calculerFactureCoach(facture.coachId, facture.mois, facture.annee)
    await prisma.factureCoach.update({
      where: { id: factureId },
      data: { montantTotal: details.totalMontant },
    })

    // Journal d'audit
    logAdminAudit({
      action: 'SUPPRESSION_PRESTATION_COACH',
      actorId: auth.session.userId,
      actorRole: auth.session.role,
      targetType: 'LigneFactureCoach',
      targetId: id,
      details: {
        coachId: facture.coachId,
        coachNom: `${facture.coach.prenom} ${facture.coach.nom || ''}`,
        description: ligne.description,
        montant: ligne.montant,
        mois: facture.mois,
        annee: facture.annee,
      },
    })

    return NextResponse.json({
      success: true,
      message: 'Prestation supprimée avec succès et facture mise à jour',
    })
  } catch (error) {
    adminLogger.error('Erreur lors de la suppression de la prestation', error)
    return handleRouteError(error, 'Erreur lors de la suppression de la prestation')
  }
}
