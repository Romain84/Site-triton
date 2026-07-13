import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { apiSuccess } from '@/lib/api/response'
import { handleRouteError, requireAdmin } from '@/lib/api/guards'

export async function PUT(request: NextRequest) {
  try {
    const auth = await requireAdmin()
    if (!auth.ok) return auth.response

    const body = await request.json()
    const { blocks } = body as { blocks: { id: string; ordre: number }[] }

    // Update all blocks in a transaction
    await prisma.$transaction(
      blocks.map((b) =>
        prisma.inscriptionBlock.update({
          where: { id: b.id },
          data: { ordre: b.ordre },
        })
      )
    )

    return apiSuccess({ reordered: true })
  } catch (error) {
    return handleRouteError(error, 'Erreur lors du réordonnancement des blocs')
  }
}
