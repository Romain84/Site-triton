import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { sortVariantes } from '@/lib/boutique/sizes'

// GET: Obtenir un produit par slug (API publique)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params

    const produit = await prisma.produit.findUnique({
      where: { slug },
      include: {
        categorie: true,
        fournisseur: true,
        variantes: {
          where: { actif: true },
        },
      },
    })

    if (!produit || !produit.actif) {
      return NextResponse.json({ error: 'Produit non trouvé' }, { status: 404 })
    }

    if (produit.variantes && Array.isArray(produit.variantes)) {
      produit.variantes = sortVariantes(produit.variantes)
    }

    return NextResponse.json({ produit })
  } catch (error) {
    logger.error('Erreur lors de la récupération du produit', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
