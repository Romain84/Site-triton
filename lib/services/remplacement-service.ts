import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'

const replacementLogger = logger.withContext('RemplacementService')

function parseTimeToMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number)
  return (h || 0) * 60 + (m || 0)
}

function generateNumeroFacture(coachId: string, mois: number, annee: number): string {
  const shortId = coachId.slice(-4).toUpperCase()
  const monthStr = String(mois).padStart(2, '0')
  return `FAC-${annee}${monthStr}-${shortId}`
}

/**
 * Synchronise automatiquement les lignes de facturation pour le coach remplacé et le coach remplaçant
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

    // 1. Supprimer d'abord les anciennes lignes associées à ce remplacement
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

    // 2. Si le remplacement est accepté et a un remplaçant, créer les 2 lignes
    if (replacement.statut === 'accepte' && replacement.coachRemplacantId && replacement.coachRemplacant) {
      const dateObj = new Date(replacement.date)
      const mois = dateObj.getMonth() + 1
      const annee = dateObj.getFullYear()

      const startMins = parseTimeToMinutes(replacement.heureDebut)
      const endMins = parseTimeToMinutes(replacement.heureFin)
      const durationHours = Math.max(0.5, (endMins - startMins) / 60)

      const coachA = replacement.coachRemplace
      const coachB = replacement.coachRemplacant

      const labelDetail = replacement.motif || replacement.description || `${replacement.heureDebut} - ${replacement.heureFin}`
      const dateStr = dateObj.toLocaleDateString('fr-FR')

      const settings = await prisma.settings.findFirst()
      const defaultTauxHoraire = settings?.tauxHoraire ?? 35

      // A) Ligne pour le Coach A (Remplacé / Absent)
      let factureA = await prisma.factureCoach.findUnique({
        where: {
          coachId_mois_annee: {
            coachId: coachA.id,
            mois,
            annee,
          },
        },
      })

      if (!factureA) {
        factureA = await prisma.factureCoach.create({
          data: {
            numero: generateNumeroFacture(coachA.id, mois, annee),
            coachId: coachA.id,
            mois,
            annee,
            montantTotal: 0,
            tauxHoraire: defaultTauxHoraire,
            statut: 'brouillon',
          },
        })
      }
      factureIdsToRecalculate.add(factureA.id)

      const montantDeduction = -Math.abs(durationHours * (factureA.tauxHoraire || defaultTauxHoraire))

      await prisma.ligneFactureCoach.create({
        data: {
          factureId: factureA.id,
          type: 'absence',
          date: dateObj,
          description: `Absence (Remplacé(e) par ${coachB.prenom} ${coachB.nom ?? ''}) - ${labelDetail} (${dateStr})`,
          heures: -Math.abs(durationHours),
          montant: montantDeduction,
          coachRemplaceId: coachB.id,
          remplacementId: replacement.id,
        },
      })

      // B) Ligne pour le Coach B (Remplaçant)
      let factureB = await prisma.factureCoach.findUnique({
        where: {
          coachId_mois_annee: {
            coachId: coachB.id,
            mois,
            annee,
          },
        },
      })

      if (!factureB) {
        factureB = await prisma.factureCoach.create({
          data: {
            numero: generateNumeroFacture(coachB.id, mois, annee),
            coachId: coachB.id,
            mois,
            annee,
            montantTotal: 0,
            tauxHoraire: defaultTauxHoraire,
            statut: 'brouillon',
          },
        })
      }
      factureIdsToRecalculate.add(factureB.id)

      const montantAjout = Math.abs(durationHours * (factureB.tauxHoraire || defaultTauxHoraire))

      await prisma.ligneFactureCoach.create({
        data: {
          factureId: factureB.id,
          type: 'remplacement',
          date: dateObj,
          description: `Remplacement de ${coachA.prenom} ${coachA.nom ?? ''} - ${labelDetail} (${dateStr})`,
          heures: Math.abs(durationHours),
          montant: montantAjout,
          coachRemplaceId: coachA.id,
          remplacementId: replacement.id,
        },
      })
    }

    // 3. Recalculer le montant total de toutes les factures affectées
    for (const factureId of factureIdsToRecalculate) {
      const agg = await prisma.ligneFactureCoach.aggregate({
        where: { factureId },
        _sum: { montant: true },
      })
      await prisma.factureCoach.update({
        where: { id: factureId },
        data: { montantTotal: agg._sum.montant || 0 },
      })
    }

    replacementLogger.info(`Billing lines synchronized for replacement: ${remplacementId}`)
  } catch (error) {
    replacementLogger.error('Error synchronizing replacement billing lines', error)
    throw error
  }
}
