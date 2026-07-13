import { prisma } from '@/lib/prisma'
import { apiError, apiSuccess } from '@/lib/api/response'
import { handleRouteError, requireAdmin } from '@/lib/api/guards'

export async function GET() {
  try {
    const auth = await requireAdmin()
    if (!auth.ok) return auth.response

    const user = await prisma.user.findUnique({
      where: { id: auth.session.userId },
      select: {
        id: true,
        email: true,
        role: true,
      },
    })

    if (!user) {
      return apiError('Utilisateur non trouvé', 404, undefined, 'NOT_FOUND')
    }

    return apiSuccess({ user })
  } catch (error) {
    return handleRouteError(error, 'Erreur lors de la récupération du profil admin')
  }
}
