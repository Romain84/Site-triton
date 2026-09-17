import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { calculerFactureCoach } from '@/lib/facture-calculations'

const tournantLogger = logger.withContext('TournantService')

/**
 * Synchronise les montants des factures des coachs concernés par une modification de créneau tournant :
 * - Identifie les coachs impactés (ancien coach, nouveau coach).
 * - Vérifie si une facture existe pour le mois et l'année du créneau au statut "brouillon" ou "generee".
 * - Recalcule dynamiquement le total officiel de la facture via calculerFactureCoach et met à jour le montantTotal.
 * - Ne touche JAMAIS aux factures verrouillées ("envoyee", "payee").
 */
export async function syncTournantBilling(
  coachIds: (string | null | undefined)[],
  date: Date | string
): Promise<void> {
  try {
    const d = new Date(date)
    if (isNaN(d.getTime())) return

    const mois = d.getMonth() + 1
    const annee = d.getFullYear()

    const uniqueCoachIds = Array.from(
      new Set(coachIds.filter((id): id is string => Boolean(id && typeof id === 'string' && id.trim() !== '')))
    )

    for (const coachId of uniqueCoachIds) {
      try {
        const facture = await prisma.factureCoach.findUnique({
          where: {
            coachId_mois_annee: {
              coachId,
              mois,
              annee,
            },
          },
        })

        // On ne met à jour que les factures modifiables (brouillon ou generee non encore envoyée)
        if (facture && ['brouillon', 'generee'].includes(facture.statut)) {
          const details = await calculerFactureCoach(coachId, mois, annee)
          await prisma.factureCoach.update({
            where: { id: facture.id },
            data: { montantTotal: details.totalMontant },
          })
          tournantLogger.info(
            `Facture ${facture.numero} du coach ${coachId} synchronisée suite à modification tournant (Nouveau total: ${details.totalMontant} €)`
          )
        }
      } catch (err) {
        tournantLogger.warn(`Erreur lors de la synchronisation de la facture du coach ${coachId}`, err)
      }
    }
  } catch (error) {
    tournantLogger.error('Erreur globale lors de la synchronisation du planning tournant', error)
  }
}
