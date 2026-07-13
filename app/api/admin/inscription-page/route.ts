import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { apiError, apiSuccess } from '@/lib/api/response'
import { handleRouteError, requireAdmin } from '@/lib/api/guards'

export async function GET() {
  try {
    const auth = await requireAdmin()
    if (!auth.ok) return auth.response

    const blocks = await prisma.inscriptionBlock.findMany({
      orderBy: { ordre: 'asc' },
    })

    return apiSuccess({ blocks })
  } catch (error) {
    return handleRouteError(error, 'Erreur lors du chargement des blocs inscription')
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdmin()
    if (!auth.ok) return auth.response

    const body = await request.json()
    const { type, titre, contenu } = body

    // Get the max order
    const maxOrder = await prisma.inscriptionBlock.aggregate({
      _max: { ordre: true },
    })
    const nextOrdre = (maxOrder._max.ordre ?? -1) + 1

    const block = await prisma.inscriptionBlock.create({
      data: {
        type,
        titre: titre || null,
        contenu: contenu || {},
        ordre: nextOrdre,
        actif: true,
      },
    })

    return apiSuccess({ block }, 201)
  } catch (error) {
    return handleRouteError(error, 'Erreur lors de la création du bloc inscription')
  }
}
