import { prisma } from '@/lib/prisma'
import { apiSuccess } from '@/lib/api/response'
import { handleRouteError } from '@/lib/api/guards'

export async function GET() {
  try {
    const blocks = await prisma.inscriptionBlock.findMany({
      where: { actif: true },
      orderBy: { ordre: 'asc' },
    })

    return apiSuccess({ blocks })
  } catch (error) {
    return handleRouteError(error, 'Erreur lors du chargement de la page inscription')
  }
}
