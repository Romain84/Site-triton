import { NextRequest, NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/auth/session'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'

// GET: Liste tous les produits
export async function GET(request: NextRequest) {
  try {
    const session = await getAdminSession()
    if (!session) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const produits = await prisma.produit.findMany({
      include: {
        categorie: true,
        fournisseur: true,
        variantes: true,
        _count: {
          select: { lignesCommande: true }
        }
      },
      orderBy: [{ ordre: 'asc' }, { nom: 'asc' }],
    })

    return NextResponse.json({ produits })
  } catch (error) {
    logger.error('Erreur lors du chargement des produits', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

// POST: Créer un nouveau produit
export async function POST(request: NextRequest) {
  try {
    const session = await getAdminSession()
    if (!session) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

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
    } = body

    // Validation
    if (!nom || !slug) {
      return NextResponse.json({ error: 'Le nom et le slug sont requis' }, { status: 400 })
    }

    if (prix === undefined || prix === null || prix < 0) {
      return NextResponse.json({ error: 'Le prix est requis et doit être positif' }, { status: 400 })
    }

    // Vérifier si le slug existe déjà
    const existingProduit = await prisma.produit.findUnique({
      where: { slug },
    })
    if (existingProduit) {
      return NextResponse.json({ error: 'Ce slug est déjà utilisé' }, { status: 400 })
    }

    const produit = await prisma.produit.create({
      data: {
        nom,
        slug,
        description: description || null,
        descriptionCourte: descriptionCourte || null,
        prix: parseFloat(prix),
        prixAchat: prixAchat !== undefined ? parseFloat(prixAchat) : 0,
        tauxTVA: tauxTVA !== undefined ? parseFloat(tauxTVA) : 20,
        prixPromo: prixPromo ? parseFloat(prixPromo) : null,
        enPromo: enPromo || false,
        stock: stock !== undefined ? parseInt(stock) : 0,
        gererStock: gererStock !== undefined ? gererStock : true,
        stockIllimite: stockIllimite || false,
        image: image || null,
        images: images ? JSON.stringify(images) : null,
        categorieId: categorieId || null,
        fournisseurId: fournisseurId || null,
        tailles: tailles ? JSON.stringify(tailles) : null,
        couleurs: couleurs ? JSON.stringify(couleurs) : null,
        poids: poids ? parseInt(poids) : null,
        metaTitle: metaTitle || null,
        metaDescription: metaDescription || null,
        actif: actif !== undefined ? actif : true,
        enVedette: enVedette || false,
        personnalisable: personnalisable || false,
        prixFlocage: prixFlocage !== undefined ? parseFloat(prixFlocage) : 0,
        ordre: ordre !== undefined ? parseInt(ordre) : 0,
      },
      include: {
        categorie: true,
        fournisseur: true,
      },
    })

    return NextResponse.json({ produit }, { status: 201 })
  } catch (error) {
    logger.error('Erreur lors de la création du produit', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
