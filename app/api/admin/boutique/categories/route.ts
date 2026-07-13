import { NextRequest, NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/auth/session'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'

// GET: Liste toutes les catégories
export async function GET(request: NextRequest) {
  try {
    const session = await getAdminSession()
    if (!session) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const categories = await prisma.categorieProduit.findMany({
      include: {
        _count: {
          select: { produits: true }
        }
      },
      orderBy: [{ ordre: 'asc' }, { nom: 'asc' }],
    })

    return NextResponse.json({ categories })
  } catch (error) {
    logger.error('Erreur lors du chargement des catégories', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

// POST: Créer une nouvelle catégorie
export async function POST(request: NextRequest) {
  try {
    const session = await getAdminSession()
    if (!session) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const body = await request.json()
    const { nom, slug, description, image, ordre, actif } = body

    // Validation
    if (!nom || !slug) {
      return NextResponse.json({ error: 'Le nom et le slug sont requis' }, { status: 400 })
    }

    // Vérifier si le slug existe déjà
    const existingCategorie = await prisma.categorieProduit.findUnique({
      where: { slug },
    })
    if (existingCategorie) {
      return NextResponse.json({ error: 'Ce slug est déjà utilisé' }, { status: 400 })
    }

    const categorie = await prisma.categorieProduit.create({
      data: {
        nom,
        slug,
        description: description || null,
        image: image || null,
        ordre: ordre !== undefined ? parseInt(ordre) : 0,
        actif: actif !== undefined ? actif : true,
      },
    })

    return NextResponse.json({ categorie }, { status: 201 })
  } catch (error) {
    logger.error('Erreur lors de la création de la catégorie', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
