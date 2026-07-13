import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin, handleRouteError } from '@/lib/api/guards'
import { apiError, apiSuccess } from '@/lib/api/response'
import { logAdminAudit } from '@/lib/admin-audit'
import { logger } from '@/lib/logger'

interface Params {
  params: Promise<{
    id: string
  }>
}

export async function POST(request: NextRequest, { params }: Params) {
  try {
    const auth = await requireAdmin()
    if (!auth.ok) return auth.response

    if (auth.session.role !== 'admin') {
      return apiError('Accès interdit', 403)
    }

    const { id } = await params
    const body = await request.json().catch(() => ({}))
    const motif = body.motif || 'Aucun motif renseigné'

    // Récupérer le don
    const don = await prisma.don.findUnique({ where: { id } })
    if (!don) {
      return apiError('Don introuvable', 404)
    }

    if (don.statut === 'annule') {
      return apiError('Ce reçu de don est déjà annulé', 400)
    }

    // Mettre à jour le statut du don à "annule" et enregistrer le motif dans le commentaire
    const commentaireMisAJour = don.commentaire 
      ? `${don.commentaire}\n[ANNULÉ le ${new Date().toLocaleDateString('fr-FR')} pour le motif : ${motif}]`
      : `[ANNULÉ pour le motif : ${motif}]`

    const updatedDon = await prisma.don.update({
      where: { id },
      data: {
        statut: 'annule',
        commentaire: commentaireMisAJour,
      }
    })

    // Retirer l'écriture comptable automatique correspondante si elle a été générée
    let transactionSupprimee = false
    if (don.statut === 'emis') {
      try {
        const deleteResult = await prisma.transactionComptable.deleteMany({
          where: {
            libelle: {
              contains: don.numeroRecu
            }
          }
        })
        transactionSupprimee = deleteResult.count > 0
      } catch (err) {
        logger.error('Erreur lors de la suppression de l\'écriture comptable automatique', err)
      }
    }

    // Log d'audit
    logAdminAudit({
      action: 'Annulation d\'un reçu fiscal de don',
      actorId: auth.session.userId,
      actorRole: auth.session.role,
      targetType: 'don',
      targetId: don.id,
      details: {
        numeroRecu: don.numeroRecu,
        nomDonateur: don.nomDonateur,
        montant: don.montant,
        motif: motif,
        transactionSupprimee,
      }
    })

    return apiSuccess({ don: updatedDon, transactionSupprimee })
  } catch (error) {
    return handleRouteError(error, 'Erreur lors de l\'annulation du don')
  }
}
