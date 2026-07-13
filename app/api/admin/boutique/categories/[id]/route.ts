import { NextRequest, NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/auth/session'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'

const boutiqueLogger = logger.withContext('Boutique')

// GET: Obtenir une catégorie
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getAdminSession()
    if (!session) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const { id } = await params

    const categorie = await prisma.categorieProduit.findUnique({
      where: { id },
      include: {
        produits: true,
      },
    })

    if (!categorie) {
      return NextResponse.json({ error: 'Catégorie non trouvée' }, { status: 404 })
    }

    return NextResponse.json({ categorie })
  } catch (error) {
    boutiqueLogger.error('Erreur lors de la récupération de la catégorie', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

// PUT: Mettre à jour une catégorie
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getAdminSession()
    if (!session) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    const { nom, slug, description, image, ordre, actif } = body

    // Vérifier si la catégorie existe
    const existingCategorie = await prisma.categorieProduit.findUnique({
      where: { id },
    })

    if (!existingCategorie) {
      return NextResponse.json({ error: 'Catégorie non trouvée' }, { status: 404 })
    }

    // Vérifier si le slug est déjà utilisé par une autre catégorie
    if (slug && slug !== existingCategorie.slug) {
      const slugExists = await prisma.categorieProduit.findFirst({
        where: {
          slug,
          NOT: { id },
        },
      })
      if (slugExists) {
        return NextResponse.json({ error: 'Ce slug est déjà utilisé' }, { status: 400 })
      }
    }

    const categorie = await prisma.categorieProduit.update({
      where: { id },
      data: {
        nom: nom || existingCategorie.nom,
        slug: slug || existingCategorie.slug,
        description: description !== undefined ? description : existingCategorie.description,
        image: image !== undefined ? image : existingCategorie.image,
        ordre: ordre !== undefined ? parseInt(ordre) : existingCategorie.ordre,
        actif: actif !== undefined ? actif : existingCategorie.actif,
      },
    })

    return NextResponse.json({ categorie })
  } catch (error) {
    boutiqueLogger.error('Erreur lors de la mise à jour de la catégorie', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

// DELETE: Supprimer une catégorie
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getAdminSession()
    if (!session) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const { id } = await params

    // Vérifier si la catégorie existe
    const existingCategorie = await prisma.categorieProduit.findUnique({
      where: { id },
      include: {
        _count: {
          select: { produits: true }
        }
      }
    })

    if (!existingCategorie) {
      return NextResponse.json({ error: 'Catégorie non trouvée' }, { status: 404 })
    }

    // Vérifier si la catégorie est utilisée par des produits
    if (existingCategorie._count.produits > 0) {
      return NextResponse.json({
        error: 'Cette catégorie ne peut pas être supprimée car elle est liée à des produits. Vous pouvez la désactiver à la place.'
      }, { status: 400 })
    }

    await prisma.categorieProduit.delete({
      where: { id },
    })

    return NextResponse.json({ message: 'Catégorie supprimée avec succès' })
  } catch (error) {
    boutiqueLogger.error('Erreur lors de la suppression de la catégorie', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
