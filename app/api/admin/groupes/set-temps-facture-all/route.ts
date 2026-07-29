import { NextRequest, NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/auth/session'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'

export async function POST(request: NextRequest) {
  try {
    const session = await getAdminSession()
    if (!session) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const { valeur = 60 } = await request.json().catch(() => ({ valeur: 60 }))

    const result = await prisma.groupe.updateMany({
      data: {
        tempsFacture: Number(valeur),
      },
    })

    logger.withContext('Admin').info(`Tous les groupes mis à jour avec tempsFacture = ${valeur} (${result.count} groupes)`)

    return NextResponse.json({
      success: true,
      message: `Tous les ${result.count} groupes ont été mis à jour avec ${valeur} minutes de temps à facturer.`,
      count: result.count,
    })
  } catch (error) {
    logger.withContext('Admin').error('Erreur lors de la mise à jour massive de tempsFacture', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
