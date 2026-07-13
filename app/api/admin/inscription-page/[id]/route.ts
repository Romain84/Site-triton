import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { apiError, apiSuccess } from '@/lib/api/response'
import { handleRouteError, requireAdmin } from '@/lib/api/guards'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAdmin()
    if (!auth.ok) return auth.response

    const { id } = await params
    const body = await request.json()
    const { titre, contenu, actif } = body

    const block = await prisma.inscriptionBlock.update({
      where: { id },
      data: {
        ...(titre !== undefined && { titre }),
        ...(contenu !== undefined && { contenu }),
        ...(actif !== undefined && { actif }),
      },
    })

    return apiSuccess({ block })
  } catch (error) {
    return handleRouteError(error, 'Erreur lors de la mise à jour du bloc inscription')
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAdmin()
    if (!auth.ok) return auth.response

    const { id } = await params

    await prisma.inscriptionBlock.delete({
      where: { id },
    })

    return apiSuccess({ deleted: true })
  } catch (error) {
    return handleRouteError(error, 'Erreur lors de la suppression du bloc inscription')
  }
}
