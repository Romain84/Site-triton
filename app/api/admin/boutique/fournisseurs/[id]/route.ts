import { NextRequest, NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/auth/session'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'

const boutiqueLogger = logger.withContext('BoutiqueFournisseurDetail')

// GET: Obtenir un fournisseur
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

    const fournisseur = await prisma.fournisseur.findUnique({
      where: { id },
      include: {
        produits: true,
      },
    })

    if (!fournisseur) {
      return NextResponse.json({ error: 'Fournisseur non trouvé' }, { status: 404 })
    }

    return NextResponse.json({ fournisseur })
  } catch (error) {
    boutiqueLogger.error('Erreur lors de la récupération du fournisseur', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

// PUT: Mettre à jour un fournisseur
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
    const { nom, contact, telephone, email, actif, guideTailles } = body

    // Vérifier si le fournisseur existe
    const existingFournisseur = await prisma.fournisseur.findUnique({
      where: { id },
    })

    if (!existingFournisseur) {
      return NextResponse.json({ error: 'Fournisseur non trouvé' }, { status: 404 })
    }

    // Vérifier si le nom est déjà utilisé par un autre fournisseur
    if (nom && nom !== existingFournisseur.nom) {
      const nomExists = await prisma.fournisseur.findFirst({
        where: {
          nom,
          NOT: { id },
        },
      })
      if (nomExists) {
        return NextResponse.json({ error: 'Ce nom de fournisseur est déjà utilisé' }, { status: 400 })
      }
    }

    const fournisseur = await prisma.fournisseur.update({
      where: { id },
      data: {
        nom: nom || existingFournisseur.nom,
        contact: contact !== undefined ? contact : existingFournisseur.contact,
        telephone: telephone !== undefined ? telephone : existingFournisseur.telephone,
        email: email !== undefined ? email : existingFournisseur.email,
        guideTailles: guideTailles !== undefined ? guideTailles : existingFournisseur.guideTailles,
        actif: actif !== undefined ? actif : existingFournisseur.actif,
      },
    })

    return NextResponse.json({ fournisseur })
  } catch (error) {
    boutiqueLogger.error('Erreur lors de la mise à jour du fournisseur', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

// DELETE: Supprimer un fournisseur
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

    // Vérifier si le fournisseur existe
    const existingFournisseur = await prisma.fournisseur.findUnique({
      where: { id },
      include: {
        _count: {
          select: { produits: true }
        }
      }
    })

    if (!existingFournisseur) {
      return NextResponse.json({ error: 'Fournisseur non trouvé' }, { status: 404 })
    }

    // Vérifier si le fournisseur est lié à des produits
    if (existingFournisseur._count.produits > 0) {
      return NextResponse.json({
        error: 'Ce fournisseur ne peut pas être supprimé car il est lié à des produits. Vous pouvez le désactiver à la place.'
      }, { status: 400 })
    }

    await prisma.fournisseur.delete({
      where: { id },
    })

    return NextResponse.json({ message: 'Fournisseur supprimé avec succès' })
  } catch (error) {
    boutiqueLogger.error('Erreur lors de la suppression du fournisseur', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
