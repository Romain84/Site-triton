import { prisma } from '@/lib/prisma'
import { apiSuccess } from '@/lib/api/response'
import { handleRouteError, requireCoach } from '@/lib/api/guards'

export async function GET() {
  try {
    const auth = await requireCoach()
    if (!auth.ok) return auth.response

    const evenements = await prisma.evenementTournant.findMany({
      where: {
        actif: true,
      },
      include: {
        coach: {
          select: { id: true, prenom: true, nom: true },
        },
        groupe: {
          select: { id: true, nom: true },
        },
        groupes: {
          select: { id: true, nom: true },
        },
      },
      orderBy: { date: 'asc' },
    })

    return apiSuccess({ evenements })
  } catch (error) {
    return handleRouteError(error, 'Erreur lors de la récupération des événements')
  }
}
