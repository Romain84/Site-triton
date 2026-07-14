import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAdminSession } from '@/lib/auth/session'
import { logger } from '@/lib/logger'

const boutiqueLogger = logger.withContext('Boutique')

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Vérifier l'authentification admin
    const session = await getAdminSession()
    if (!session) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    const { statut, statutPaiement } = body

    // Mettre à jour le statut de la commande
    const commande = await prisma.commande.update({
      where: { id },
      data: { 
        statut: statut !== undefined ? statut : undefined,
        statutPaiement: statutPaiement !== undefined ? statutPaiement : undefined,
      },
    })

    return NextResponse.json({ commande })
  } catch (error) {
    boutiqueLogger.error('Erreur lors de la mise à jour de la commande', error)
    return NextResponse.json(
      { error: 'Erreur lors de la mise à jour de la commande' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Vérifier l'authentification admin
    const session = await getAdminSession()
    if (!session) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const { id } = await params

    // 1. Annuler et restaurer le stock (si la commande est en_attente)
    // Importation dynamique ou directe
    const { cancelCommandePayment } = await import('@/lib/checkout/fulfillment')
    await cancelCommandePayment(id)

    // 2. Supprimer la commande (les lignes associées seront supprimées en cascade)
    await prisma.commande.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    boutiqueLogger.error('Erreur lors de la suppression de la commande', error)
    return NextResponse.json(
      { error: 'Erreur lors de la suppression de la commande' },
      { status: 500 }
    )
  }
}
