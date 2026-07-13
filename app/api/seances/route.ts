import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { apiError, apiSuccess } from '@/lib/api/response'

// GET: Liste des séances disponibles (public)
export async function GET() {
  try {
    const now = new Date()
    now.setHours(0, 0, 0, 0)

    const seances = await prisma.seanceExceptionnelle.findMany({
      where: {
        actif: true,
        dateSeance: {
          gte: now,
        },
        placesRestantes: {
          gt: 0,
        },
      },
      include: {
        groupe: {
          select: { id: true, nom: true },
        },
      },
      orderBy: { dateSeance: 'asc' },
    })

    return apiSuccess({ seances })
  } catch (error) {
    logger.error('Erreur lors du chargement des séances', error)
    return apiError('Erreur serveur', 500, undefined, 'INTERNAL_SERVER_ERROR')
  }
}
