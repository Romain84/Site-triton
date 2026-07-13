import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { apiError, apiSuccess } from '@/lib/api/response'
import { handleRouteError, requireAdmin } from '@/lib/api/guards'

export async function GET() {
  try {
    const auth = await requireAdmin()
    if (!auth.ok) return auth.response

    const actualites = await prisma.actualite.findMany({
      orderBy: { datePubli: 'desc' },
    })

    return apiSuccess({ actualites })
  } catch (error) {
    return handleRouteError(error, 'Erreur lors du chargement des actualités')
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdmin()
    if (!auth.ok) return auth.response

    const body = await request.json()
    const { titre, slug, contenu, datePubli, auteur, image, publie } = body

    const actualite = await prisma.actualite.create({
      data: {
        titre,
        slug,
        contenu,
        datePubli: new Date(datePubli),
        auteur,
        image,
        publie,
      },
    })

    return apiSuccess({ actualite }, 201)
  } catch (error) {
    return handleRouteError(error, 'Erreur lors de la création de l\'actualité')
  }
}
