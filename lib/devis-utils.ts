import { prisma } from '@/lib/prisma'

/**
 * Génère un numéro séquentiel unique de devis pour une année donnée.
 * Format : DEV-AAAA-0001, DEV-AAAA-0002, etc.
 * Règle séquentielle :
 * - Analyse tous les devis existants pour l'année donnée afin d'extraire le numéro maximal (maxIndex).
 * - Démarre à maxIndex + 1 (ou 0001 si aucun devis n'existe pour cette année).
 * - Sécurisé contre les collisions et les suppressions d'anciens devis.
 */
export async function genererNumeroDevisSequentiel(annee: number): Promise<string> {
  const prefix = `DEV-${annee}-`

  // 1. Récupérer tous les devis existants pour cette année
  const existingDevis = await prisma.devis.findMany({
    where: {
      numero: {
        startsWith: prefix,
      },
    },
    select: {
      numero: true,
    },
  })

  // 2. Extraire le numéro séquentiel maximal
  let maxIndex = 0
  for (const d of existingDevis) {
    if (!d.numero) continue
    const suffix = d.numero.substring(prefix.length)
    const num = parseInt(suffix, 10)
    if (!isNaN(num) && num > maxIndex) {
      maxIndex = num
    }
  }

  // 3. Proposer maxIndex + 1
  let candidateIndex = maxIndex + 1
  let candidateNumero = `${prefix}${String(candidateIndex).padStart(4, '0')}`

  // 4. Sécurité anti-collision globale absolue dans toute la base
  while (await prisma.devis.findUnique({ where: { numero: candidateNumero } })) {
    candidateIndex++
    candidateNumero = `${prefix}${String(candidateIndex).padStart(4, '0')}`
  }

  return candidateNumero
}
