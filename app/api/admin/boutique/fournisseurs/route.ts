import { NextRequest, NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/auth/session'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'

const boutiqueLogger = logger.withContext('BoutiqueFournisseurs')

// GET: Liste tous les fournisseurs
export async function GET(request: NextRequest) {
  try {
    const session = await getAdminSession()
    if (!session) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const fournisseurs = await prisma.fournisseur.findMany({
      include: {
        _count: {
          select: { produits: true }
        }
      },
      orderBy: { nom: 'asc' },
    })

    return NextResponse.json({ fournisseurs })
  } catch (error) {
    boutiqueLogger.error('Erreur lors du chargement des fournisseurs', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

// POST: Créer un nouveau fournisseur
export async function POST(request: NextRequest) {
  try {
    const session = await getAdminSession()
    if (!session) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const body = await request.json()
    const { nom, contact, telephone, email, actif, guideTailles } = body

    // Validation
    if (!nom) {
      return NextResponse.json({ error: 'Le nom du fournisseur est requis' }, { status: 400 })
    }

    // Vérifier si le nom existe déjà
    const existingFournisseur = await prisma.fournisseur.findUnique({
      where: { nom },
    })
    if (existingFournisseur) {
      return NextResponse.json({ error: 'Ce nom de fournisseur est déjà utilisé' }, { status: 400 })
    }

    const fournisseur = await prisma.fournisseur.create({
      data: {
        nom,
        contact: contact || null,
        telephone: telephone || null,
        email: email || null,
        guideTailles: guideTailles || null,
        actif: actif !== undefined ? actif : true,
      },
    })

    return NextResponse.json({ fournisseur }, { status: 201 })
  } catch (error) {
    boutiqueLogger.error('Erreur lors de la création du fournisseur', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
