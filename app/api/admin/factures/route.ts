import { prisma } from '@/lib/prisma'
import { apiSuccess } from '@/lib/api/response'
import { handleRouteError, requireAdmin } from '@/lib/api/guards'

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

    return apiSuccess({ factures })
  } catch (error) {
    return handleRouteError(error, 'Erreur lors de la récupération des factures')
  }
}
