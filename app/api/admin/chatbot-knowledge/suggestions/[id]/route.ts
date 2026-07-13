import { NextRequest, NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/auth/session'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'

const adminLogger = logger.withContext('Admin')

// PUT - Mettre à jour une suggestion
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getAdminSession()

    if (!session) {
      return NextResponse.json(
        { error: 'Non authentifié' },
        { status: 401 }
      )
    }

    const { id } = await params
    const body = await request.json()
    const { question, reponse, statut } = body

    const suggestionExistante = await prisma.chatbotSuggestion.findUnique({
      where: { id },
    })

    if (!suggestionExistante) {
      return NextResponse.json(
        { error: 'Suggestion non trouvée' },
        { status: 404 }
      )
    }

    const suggestion = await prisma.chatbotSuggestion.update({
      where: { id },
      data: {
        question: question !== undefined ? question : undefined,
        reponse: reponse !== undefined ? reponse : undefined,
        statut: statut !== undefined ? statut : undefined,
      },
    })

    return NextResponse.json(suggestion)
  } catch (error) {
    adminLogger.error('Erreur lors de la mise à jour de la suggestion', error)
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}

// DELETE - Supprimer une suggestion
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getAdminSession()

    if (!session) {
      return NextResponse.json(
        { error: 'Non authentifié' },
        { status: 401 }
      )
    }

    const { id } = await params

    const suggestionExistante = await prisma.chatbotSuggestion.findUnique({
      where: { id },
    })

    if (!suggestionExistante) {
      return NextResponse.json(
        { error: 'Suggestion non trouvée' },
        { status: 404 }
      )
    }

    await prisma.chatbotSuggestion.delete({
      where: { id },
    })

    return NextResponse.json({ message: 'Suggestion supprimée avec succès' })
  } catch (error) {
    adminLogger.error('Erreur lors de la suppression de la suggestion', error)
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}
