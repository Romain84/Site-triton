import { NextRequest, NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/auth/session'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'

const mediaLogger = logger.withContext('Media')

// POST: Create a new media
export async function POST(request: NextRequest) {
  try {
    const session = await getAdminSession()
    if (!session) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const body = await request.json()
    const { albumId, titre, description, url, type, ordre, actif } = body

    const media = await prisma.galerieMedia.create({
      data: {
        albumId,
        titre,
        description,
        url,
        type,
        ordre,
        actif,
      },
    })

    return NextResponse.json({ media }, { status: 201 })
  } catch (error) {
    mediaLogger.error('Erreur lors de la création du média', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
