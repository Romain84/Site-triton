import { NextRequest, NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/auth/session'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'

const boutiqueLogger = logger.withContext('Boutique')

// GET: Obtenir un produit
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

    const produit = await prisma.produit.findUnique({
      where: { id },
      include: {
        categorie: true,
        variantes: true,
      },
    })

    if (!produit) {
      return NextResponse.json({ error: 'Produit non trouvé' }, { status: 404 })
    }

    return NextResponse.json({ produit })
  } catch (error) {
    boutiqueLogger.error('Erreur lors de la récupération du produit', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

// PUT: Mettre à jour un produit
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
    const {
      nom,
      slug,
      description,
      descriptionCourte,
      prix,
      prixAchat,
      tauxTVA,
      prixPromo,
      enPromo,
      stock,
      gererStock,
      stockIllimite,
      image,
      images,
      categorieId,
      fournisseurId,
      tailles,
      couleurs,
      poids,
      metaTitle,
      metaDescription,
      actif,
      enVedette,
      personnalisable,
      prixFlocage,
      ordre,
      lienExterne,
      guideTailles,
    } = body

    // Vérifier si le produit existe
    const existingProduit = await prisma.produit.findUnique({
      where: { id },
    })

    if (!existingProduit) {
      return NextResponse.json({ error: 'Produit non trouvé' }, { status: 404 })
    }

    // Vérifier si le slug est déjà utilisé par un autre produit
    if (slug && slug !== existingProduit.slug) {
      const slugExists = await prisma.produit.findFirst({
        where: {
          slug,
          NOT: { id },
        },
      })
      if (slugExists) {
        return NextResponse.json({ error: 'Ce slug est déjà utilisé' }, { status: 400 })
      }
    }

    // Vérifier si la catégorie existe
    if (categorieId && categorieId !== existingProduit.categorieId) {
      const categorieExists = await prisma.categorieProduit.findUnique({
        where: { id: categorieId },
      })
      if (!categorieExists) {
        return NextResponse.json({ error: 'Catégorie non trouvée' }, { status: 400 })
      }
    }

    // Vérifier si le fournisseur existe
    if (fournisseurId && fournisseurId !== existingProduit.fournisseurId) {
      const fournisseurExists = await prisma.fournisseur.findUnique({
        where: { id: fournisseurId },
      })
      if (!fournisseurExists) {
        return NextResponse.json({ error: 'Fournisseur non trouvé' }, { status: 400 })
      }
    }

    const existingProduitTyped = existingProduit as any;
    const oldPrixAchat = existingProduitTyped.prixAchat !== undefined ? existingProduitTyped.prixAchat : 0;
    const oldTauxTVA = existingProduitTyped.tauxTVA !== undefined ? existingProduitTyped.tauxTVA : 20;
    const oldPrixFlocage = existingProduitTyped.prixFlocage !== undefined ? existingProduitTyped.prixFlocage : 0;

    const produit = await prisma.produit.update({
      where: { id },
      data: {
        nom: nom || existingProduit.nom,
        slug: slug || existingProduit.slug,
        description: description !== undefined ? description : existingProduit.description,
        descriptionCourte: descriptionCourte !== undefined ? descriptionCourte : existingProduit.descriptionCourte,
        prix: prix !== undefined ? parseFloat(prix) : existingProduit.prix,
        prixAchat: prixAchat !== undefined ? parseFloat(prixAchat) : oldPrixAchat,
        tauxTVA: tauxTVA !== undefined ? parseFloat(tauxTVA) : oldTauxTVA,
        prixPromo: prixPromo !== undefined ? (prixPromo ? parseFloat(prixPromo) : null) : existingProduit.prixPromo,
        enPromo: enPromo !== undefined ? enPromo : existingProduit.enPromo,
        stock: stock !== undefined ? parseInt(stock) : existingProduit.stock,
        gererStock: gererStock !== undefined ? gererStock : existingProduit.gererStock,
        stockIllimite: stockIllimite !== undefined ? stockIllimite : existingProduit.stockIllimite,
        image: image !== undefined ? image : existingProduit.image,
        images: images !== undefined ? JSON.stringify(images) : existingProduit.images,
        categorieId: categorieId !== undefined ? categorieId : existingProduit.categorieId,
        fournisseurId: fournisseurId !== undefined ? fournisseurId : existingProduit.fournisseurId,
        tailles: tailles !== undefined ? JSON.stringify(tailles) : existingProduit.tailles,
        couleurs: couleurs !== undefined ? JSON.stringify(couleurs) : existingProduit.couleurs,
        poids: poids !== undefined ? (poids ? parseInt(poids) : null) : existingProduit.poids,
        metaTitle: metaTitle !== undefined ? metaTitle : existingProduit.metaTitle,
        metaDescription: metaDescription !== undefined ? metaDescription : existingProduit.metaDescription,
        lienExterne: lienExterne !== undefined ? lienExterne : existingProduit.lienExterne,
        guideTailles: guideTailles !== undefined ? guideTailles : existingProduit.guideTailles,
        actif: actif !== undefined ? actif : existingProduit.actif,
        enVedette: enVedette !== undefined ? enVedette : existingProduit.enVedette,
        personnalisable: personnalisable !== undefined ? personnalisable : existingProduit.personnalisable,
        prixFlocage: prixFlocage !== undefined ? parseFloat(prixFlocage) : oldPrixFlocage,
        ordre: ordre !== undefined ? parseInt(ordre) : existingProduit.ordre,
      },
      include: {
        categorie: true,
        fournisseur: true,
        variantes: true,
      },
    })

    return NextResponse.json({ produit })
  } catch (error) {
    boutiqueLogger.error('Erreur lors de la mise à jour du produit', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

// DELETE: Supprimer un produit
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

    // Vérifier si le produit existe
    const existingProduit = await prisma.produit.findUnique({
      where: { id },
      include: {
        _count: {
          select: { lignesCommande: true }
        }
      }
    })

    if (!existingProduit) {
      return NextResponse.json({ error: 'Produit non trouvé' }, { status: 404 })
    }

    // Vérifier si le produit est utilisé dans des commandes
    if (existingProduit._count.lignesCommande > 0) {
      return NextResponse.json({
        error: 'Ce produit ne peut pas être supprimé car il est lié à des commandes. Vous pouvez le désactiver à la place.'
      }, { status: 400 })
    }

    await prisma.produit.delete({
      where: { id },
    })

    return NextResponse.json({ message: 'Produit supprimé avec succès' })
  } catch (error) {
    boutiqueLogger.error('Erreur lors de la suppression du produit', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
