import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAdminSession } from '@/lib/auth/session'
import { logger } from '@/lib/logger'

const boutiqueLogger = logger.withContext('Boutique')

export async function GET(request: NextRequest) {
  try {
    // Vérifier l'authentification admin
    const session = await getAdminSession()
    if (!session) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    // Récupérer toutes les commandes avec leurs lignes
    const commandes = await prisma.commande.findMany({
      include: {
        lignes: {
          include: {
            produit: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    return NextResponse.json({ commandes })
  } catch (error) {
    boutiqueLogger.error('Erreur lors de la récupération des commandes', error)
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des commandes' },
      { status: 500 }
    )
  }
}
