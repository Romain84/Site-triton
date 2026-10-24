import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { apiSuccess } from '@/lib/api/response'
import { handleRouteError, requireCoach } from '@/lib/api/guards'

export async function GET(request: NextRequest) {
  try {
    const auth = await requireCoach()
    if (!auth.ok) return auth.response

    const { searchParams } = new URL(request.url)
    const moisParam = searchParams.get('mois')
    const anneeParam = searchParams.get('annee')

    let dateFilter: any

    if (moisParam && anneeParam) {
      const mois = parseInt(moisParam, 10)
      const annee = parseInt(anneeParam, 10)

      // Fenêtre m-1 à m+1
      // Mois en JS va de 0 à 11. Pour mois (1-12) :
      // Début de m-1 : new Date(annee, mois - 2, 1)
      // Fin de m+1 : new Date(annee, mois + 1, 0, 23, 59, 59, 999)
      const startWindow = new Date(annee, mois - 2, 1, 0, 0, 0, 0)
      const endWindow = new Date(annee, mois + 1, 0, 23, 59, 59, 999)

      dateFilter = {
        gte: startWindow,
        lte: endWindow,
      }
    } else {
      // Date de seuil par défaut : 35 jours dans le passé
      const thresholdDate = new Date()
      thresholdDate.setDate(thresholdDate.getDate() - 35)
      dateFilter = {
        gte: thresholdDate,
      }
    }

    const evenements = await prisma.evenementCalendrier.findMany({
      where: {
        actif: true,
        date: dateFilter,
      },
      orderBy: { date: 'asc' },
      select: {
        id: true,
        title: true,
        date: true,
        dateFin: true,
        lieu: true,
        type: true,
      },
    })

    return apiSuccess({ evenements })
  } catch (error) {
    return handleRouteError(error, 'Erreur lors de la récupération des événements')
  }
}
