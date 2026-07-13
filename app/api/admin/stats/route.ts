import { prisma } from '@/lib/prisma'
import { apiError, apiSuccess } from '@/lib/api/response'
import { handleRouteError, requireAdmin } from '@/lib/api/guards'

export async function GET() {
  try {
    const auth = await requireAdmin()
    if (!auth.ok) return auth.response

    const [
      totalCoaches,
      totalGroupes,
      totalInscriptions,
      totalActualites,
      totalCommandes,
      commandesPayees,
      commandesEnAttente,
      chiffreAffairesBoutique,
      facturesCoachsPayees,
      facturesCoachsEnAttente,
      recentCommandes,
      recentRemplacements,
      recentFactures,
      recentLogs,
    ] = await Promise.all([
      prisma.coach.count({ where: { actif: true } }),
      prisma.groupe.count({ where: { actif: true } }),
      prisma.inscription.count(),
      prisma.actualite.count({ where: { publie: true } }),
      prisma.commande.count(),
      prisma.commande.count({ where: { statutPaiement: 'paye' } }),
      prisma.commande.count({ where: { statutPaiement: 'en_attente' } }),
      prisma.commande.aggregate({ _sum: { total: true }, where: { statutPaiement: 'paye' } }),
      prisma.factureCoach.count({ where: { statut: 'payee' } }),
      prisma.factureCoach.count({ where: { statut: { in: ['brouillon', 'generee', 'envoyee'] } } }),
      prisma.commande.findMany({
        where: {
          OR: [
            { statut: 'nouvelle' },
            { statutPaiement: 'en_attente' }
          ]
        },
        take: 3,
        include: {
          lignes: {
            include: {
              produit: true
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.remplacement.findMany({
        take: 4,
        orderBy: { date: 'desc' },
        include: {
          coachRemplace: { select: { prenom: true, nom: true } },
          coachRemplacant: { select: { prenom: true, nom: true } }
        }
      }),
      prisma.factureCoach.findMany({
        take: 4,
        orderBy: { createdAt: 'desc' },
        include: {
          coach: { select: { prenom: true, nom: true } }
        }
      }),
      prisma.adminAuditLog.findMany({
        take: 4,
        orderBy: { timestamp: 'desc' }
      })
    ])

    if (auth.session.role === 'superviseur') {
      return apiSuccess({
        totalCoaches,
        totalGroupes,
        totalInscriptions,
        totalActualites,
        totalCommandes,
        commandesPayees: 0,
        commandesEnAttente: 0,
        chiffreAffairesBoutique: 0,
        facturesCoachsPayees: 0,
        facturesCoachsEnAttente: 0,
        recentCommandes: [],
        recentRemplacements,
        recentFactures: [],
        recentLogs
      })
    }

    return apiSuccess({
      totalCoaches,
      totalGroupes,
      totalInscriptions,
      totalActualites,
      totalCommandes,
      commandesPayees,
      commandesEnAttente,
      chiffreAffairesBoutique: chiffreAffairesBoutique._sum.total || 0,
      facturesCoachsPayees,
      facturesCoachsEnAttente,
      recentCommandes,
      recentRemplacements,
      recentFactures,
      recentLogs
    })

  } catch (error) {
    return handleRouteError(error, 'Erreur lors de la récupération des statistiques')
  }
}
