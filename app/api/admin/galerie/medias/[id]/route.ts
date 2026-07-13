import { NextRequest, NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/auth/session'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'

const mediaLogger = logger.withContext('Media')

// PUT: Update a media
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
    const { titre, description, url, type, ordre, actif } = body

    const media = await prisma.galerieMedia.update({
      where: { id },
      data: {
        titre,
        description,
        url,
        type,
        ordre,
        actif,
      },
    })

    return NextResponse.json({ media })
  } catch (error) {
    mediaLogger.error('Erreur lors de la mise à jour du média', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

// DELETE: Delete a media
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

    await prisma.galerieMedia.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    mediaLogger.error('Erreur lors de la suppression du média', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
