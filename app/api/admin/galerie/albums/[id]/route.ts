import { NextRequest, NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/auth/session'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'

const albumLogger = logger.withContext('Album')

// PUT: Update an album
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
    const { nom, slug, description, categorie, couverture, ordre, actif } = body

    const album = await prisma.galerieAlbum.update({
      where: { id },
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

    return NextResponse.json({ album })
  } catch (error) {
    albumLogger.error('Erreur lors de la mise à jour de l\'album', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

// DELETE: Delete an album
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

    // Les médias seront supprimés automatiquement grâce à onDelete: Cascade
    await prisma.galerieAlbum.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    albumLogger.error('Erreur lors de la suppression de l\'album', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
