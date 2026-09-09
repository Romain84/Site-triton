import { prisma } from '@/lib/prisma'
import { apiSuccess } from '@/lib/api/response'
import { handleRouteError, requireAdmin } from '@/lib/api/guards'

import { calculerFactureCoach } from '@/lib/facture-calculations'

export async function GET() {
  try {
    const auth = await requireAdmin()
    if (!auth.ok) return auth.response

    const factures = await prisma.factureCoach.findMany({
      include: {
        coach: {
          select: {
            id: true,
            prenom: true,
            nom: true,
            email: true,
          },
        },
        _count: {
          select: { lignes: true },
        },
      },
      orderBy: [{ annee: 'desc' }, { mois: 'desc' }],
    })

    // Assainir et synchroniser automatiquement les montants des factures brouillons si nécessaire
    for (const f of factures) {
      if (f.statut === 'brouillon' && f.montantTotal <= 0) {
        try {
          const details = await calculerFactureCoach(f.coachId, f.mois, f.annee)
          if (details.totalMontant !== f.montantTotal) {
            await prisma.factureCoach.update({
              where: { id: f.id },
              data: { montantTotal: details.totalMontant },
            })
            f.montantTotal = details.totalMontant
          }
        } catch {
          // Ignorer
        }
      }
    }

    return apiSuccess({ factures })
  } catch (error) {
    return handleRouteError(error, 'Erreur lors de la récupération des factures')
  }
}
