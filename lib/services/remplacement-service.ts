import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { calculerFactureCoach } from '@/lib/facture-calculations'

const replacementLogger = logger.withContext('RemplacementService')

/**
 * Synchronise les lignes de facturation lors d'un remplacement :
 * - Supprime toute ancienne ligne LigneFactureCoach associée (le remplacement est calculé dynamiquement depuis la table Remplacement).
 * - Ne génère JAMAIS de facture FactureCoach automatiquement (la facturation reste manuelle via le bouton 'Générer').
 * - Si une facture existe déjà pour ce mois et ce coach, recalcule son montantTotal avec le calcul complet unifié.
 */
export async function syncRemplacementBillingLines(remplacementId: string): Promise<void> {
  try {
    const replacement = await prisma.remplacement.findUnique({
      where: { id: remplacementId },
      include: {
        coachRemplace: true,
        coachRemplacant: true,
      },
    })

    if (!replacement) {
      replacementLogger.warn(`Remplacement non trouvé : ${remplacementId}`)
      return
    }

    // 1. Supprimer les éventuelles anciennes lignes associées à ce remplacement
    const existingLignes = await prisma.ligneFactureCoach.findMany({
      where: { remplacementId },
      select: { id: true, factureId: true },
    })

    const factureIdsToRecalculate = new Set<string>()
    existingLignes.forEach((l) => factureIdsToRecalculate.add(l.factureId))

    if (existingLignes.length > 0) {
      await prisma.ligneFactureCoach.deleteMany({
        where: { remplacementId },
      })
    }

    const dateObj = new Date(replacement.date)
    const mois = dateObj.getMonth() + 1
    const annee = dateObj.getFullYear()

    // 2. Si une facture existe déjà pour le coach remplacé ou le coach remplaçant, l'ajouter aux factures à recalculer
    const [factureRemplace, factureRemplacant] = await Promise.all([
      prisma.factureCoach.findUnique({
        where: {
          coachId_mois_annee: {
            coachId: replacement.coachRemplaceId,
            mois,
            annee,
          },
        },
      }),
      replacement.coachRemplacantId
        ? prisma.factureCoach.findUnique({
            where: {
              coachId_mois_annee: {
                coachId: replacement.coachRemplacantId,
                mois,
                annee,
              },
            },
          })
        : null,
    ])

    if (factureRemplace) factureIdsToRecalculate.add(factureRemplace.id)
    if (factureRemplacant) factureIdsToRecalculate.add(factureRemplacant.id)

    // 3. Purger les anciennes lignes obsolètes en base et recalculer le montant total
    for (const factureId of factureIdsToRecalculate) {
      const f = await prisma.factureCoach.findUnique({ where: { id: factureId } })
      if (f && ['brouillon', 'generee'].includes(f.statut)) {
        // Nettoyer les lignes de type 'remplacement' ou 'absence' qui auraient pu être créées par d'anciennes versions
        await prisma.ligneFactureCoach.deleteMany({
          where: {
            factureId,
            type: { in: ['remplacement', 'absence'] },
          },
        })

        const details = await calculerFactureCoach(f.coachId, f.mois, f.annee)
        await prisma.factureCoach.update({
          where: { id: factureId },
          data: { montantTotal: details.totalMontant },
        })
      }
    }
    replacementLogger.info(`Billing lines synchronized for replacement: ${remplacementId} (no auto-invoice generated)`)
  } catch (error) {
    replacementLogger.error('Error synchronizing replacement billing lines', error)
    throw error
  }
}

