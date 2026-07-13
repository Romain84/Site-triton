import { NextRequest, NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/auth/session'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'

const adminLogger = logger.withContext('Admin')

// PUT: Update an actualite
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
    const { titre, slug, contenu, datePubli, auteur, image, publie } = body

    const actualite = await prisma.actualite.update({
      where: { id },
      data: {
        titre,
        slug,
        contenu,
        datePubli: new Date(datePubli),
        auteur,
        image,
        publie,
      },
    })

    return NextResponse.json({ actualite })
  } catch (error) {
    adminLogger.error('Erreur lors de la mise à jour de l\'actualité', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

// DELETE: Delete an actualite
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

    await prisma.actualite.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    adminLogger.error('Erreur lors de la suppression de l\'actualité', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
