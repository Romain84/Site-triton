import { prisma } from '@/lib/prisma'

/**
 * Génère un numéro séquentiel unique de devis pour une année donnée.
 * Format : DEV-AAAA-0001, DEV-AAAA-0002, etc.
 */
export async function genererNumeroDevisSequentiel(annee: number): Promise<string> {
  const count = await prisma.devis.count({
    where: {
      numero: {
        startsWith: `DEV-${annee}-`,
      },
    },
  })

  const index = String(count + 1).padStart(4, '0')
  return `DEV-${annee}-${index}`
}
