import { prisma } from '@/lib/prisma'
import { apiSuccess } from '@/lib/api/response'
import { handleRouteError, requireCoach } from '@/lib/api/guards'

export async function GET() {
  try {
    const auth = await requireCoach()
    if (!auth.ok) return auth.response

    const groupes = await prisma.groupe.findMany({
      where: { actif: true },
      orderBy: { nom: 'asc' },
      select: { id: true, nom: true },
    })

    return apiSuccess({ groupes })
  } catch (error) {
    return handleRouteError(error, 'Erreur lors de la récupération des groupes')
  }
}
