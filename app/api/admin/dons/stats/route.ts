import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin, handleRouteError } from '@/lib/api/guards'
import { apiError, apiSuccess } from '@/lib/api/response'

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAdmin()
    if (!auth.ok) return auth.response

    if (auth.session.role !== 'admin') {
      return apiError('Accès interdit', 403)
    }

    const dons = await prisma.don.findMany()

    let totalEmis = 0
    let countEmis = 0
    
    let totalBrouillon = 0
    let countBrouillon = 0
    
    let totalAnnule = 0
    let countAnnule = 0

    let totalParticulier = 0
    let countParticulier = 0
    let totalEntreprise = 0
    let countEntreprise = 0

    // Répartition par nature (uniquement émis)
    const natureBreakdown: Record<string, { montant: number; count: number }> = {
      numeraire: { montant: 0, count: 0 },
      cheque: { montant: 0, count: 0 },
      virement: { montant: 0, count: 0 },
      nature: { montant: 0, count: 0 },
      abandon_frais: { montant: 0, count: 0 },
    }

    const currentYear = new Date().getFullYear()
    let totalAnneeEnCours = 0
    let countAnneeEnCours = 0

    for (const d of dons) {
      if (d.statut === 'emis') {
        totalEmis += d.montant
        countEmis++

        const year = new Date(d.dateDon).getFullYear()
        if (year === currentYear) {
          totalAnneeEnCours += d.montant
          countAnneeEnCours++
        }

        if (d.typeDonateur === 'particulier') {
          totalParticulier += d.montant
          countParticulier++
        } else if (d.typeDonateur === 'entreprise') {
          totalEntreprise += d.montant
          countEntreprise++
        }

        if (natureBreakdown[d.natureDon]) {
          natureBreakdown[d.natureDon].montant += d.montant
          natureBreakdown[d.natureDon].count++
        }
      } else if (d.statut === 'brouillon') {
        totalBrouillon += d.montant
        countBrouillon++
      } else if (d.statut === 'annule') {
        totalAnnule += d.montant
        countAnnule++
      }
    }

    return apiSuccess({
      stats: {
        totalEmis,
        countEmis,
        totalBrouillon,
        countBrouillon,
        totalAnnule,
        countAnnule,
        particulier: { total: totalParticulier, count: countParticulier },
        entreprise: { total: totalEntreprise, count: countEntreprise },
        anneeEnCours: { total: totalAnneeEnCours, count: countAnneeEnCours, year: currentYear },
        nature: natureBreakdown,
      }
    })
  } catch (error) {
    return handleRouteError(error, 'Erreur lors du calcul des statistiques de dons')
  }
}
