import { prisma } from '@/lib/prisma'
import { apiSuccess } from '@/lib/api/response'
import { handleRouteError, requireCoach } from '@/lib/api/guards'

export async function GET() {
  try {
    const auth = await requireCoach()
    if (!auth.ok) return auth.response

    const coaches = await prisma.coach.findMany({
      where: {
        actif: true,
        id: { not: auth.session.coachId },
      },
      select: {
        id: true,
        prenom: true,
        nom: true,
      },
      orderBy: [{ prenom: 'asc' }, { nom: 'asc' }],
    })

    return apiSuccess({ coaches })
  } catch (error) {
    return handleRouteError(error, 'Erreur lors de la récupération des coaches')
  }
}
