import { NextRequest, NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/auth/session'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'

const albumLogger = logger.withContext('Album')

// GET: List all albums
export async function GET(request: NextRequest) {
  try {
    const session = await getAdminSession()
    if (!session) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const albums = await prisma.galerieAlbum.findMany({
      include: {
        medias: {
          orderBy: { ordre: 'asc' },
        },
      },
      orderBy: { ordre: 'asc' },
    })

    return NextResponse.json({ albums })
  } catch (error) {
    albumLogger.error('Erreur lors du chargement des albums', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

// POST: Create a new album
export async function POST(request: NextRequest) {
  try {
    const session = await getAdminSession()
    if (!session) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const body = await request.json()
    const { nom, slug, description, categorie, couverture, ordre, actif } = body

    const album = await prisma.galerieAlbum.create({
      data: {
        nom,
        slug,
        description,
        categorie,
        couverture,
        ordre,
        actif,
      },
    })

    return NextResponse.json({ album }, { status: 201 })
  } catch (error) {
    albumLogger.error('Erreur lors de la création de l\'album', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
