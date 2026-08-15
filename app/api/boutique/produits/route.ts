import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'

// GET: Liste tous les produits actifs (API publique)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const categorieSlug = searchParams.get('categorie')

    const produits = await prisma.produit.findMany({
      where: {
        actif: true,
        ...(categorieSlug && {
          categorie: {
            slug: categorieSlug,
            actif: true,
          },
        }),
      },
      include: {
        categorie: true,
      },
      orderBy: [
        { enVedette: 'desc' },
        { ordre: 'asc' },
        { nom: 'asc' },
      ],
    })

    return NextResponse.json({ produits }, {
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
      },
    })
  } catch (error) {
    logger.error('Erreur lors du chargement des produits', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
