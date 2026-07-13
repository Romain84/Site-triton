import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'

// GET: Liste toutes les catégories actives (API publique)
export async function GET(request: NextRequest) {
  try {
    const categories = await prisma.categorieProduit.findMany({
      where: { actif: true },
      include: {
        _count: {
          select: {
            produits: {
              where: { actif: true },
            },
          },
        },
      },
      orderBy: [{ ordre: 'asc' }, { nom: 'asc' }],
    })

    return NextResponse.json({ categories })
  } catch (error) {
    logger.error('Erreur lors du chargement des catégories', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
