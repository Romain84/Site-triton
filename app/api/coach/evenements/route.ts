import { prisma } from '@/lib/prisma'
import { apiSuccess } from '@/lib/api/response'
import { handleRouteError, requireCoach } from '@/lib/api/guards'

export async function GET() {
  try {
    const auth = await requireCoach()
    if (!auth.ok) return auth.response

    // Date de seuil : 1 mois et 5 jours dans le passé (35 jours au total)
    const thresholdDate = new Date()
    thresholdDate.setDate(thresholdDate.getDate() - 35)

    const evenements = await prisma.evenementCalendrier.findMany({
      where: {
        actif: true,
        date: {
          gte: thresholdDate,
        },
      },
      orderBy: { date: 'asc' },
      select: {
        id: true,
        title: true,
        date: true,
        lieu: true,
        type: true,
      },
    })

    return apiSuccess({ evenements })
  } catch (error) {
    return handleRouteError(error, 'Erreur lors de la récupération des événements')
  }
}
