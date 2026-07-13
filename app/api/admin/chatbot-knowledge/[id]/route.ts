import { NextRequest, NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/auth/session'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { clearChatbotKnowledgeCache } from '@/lib/chatbot-knowledge'

const adminLogger = logger.withContext('Admin')

// PUT: Mettre à jour une entrée
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
    const { categorie, question, reponse, motsCles, priorite, actif } = body

    const entry = await prisma.chatbotKnowledge.update({
      where: { id },
      data: {
        categorie,
        question,
        reponse,
        motsCles: motsCles || null,
        priorite: priorite !== undefined ? priorite : undefined,
        actif: actif !== undefined ? actif : undefined,
      },
    })

    // Invalider le cache des connaissances
    clearChatbotKnowledgeCache()

    return NextResponse.json({ entry })
  } catch (error) {
    adminLogger.error('Erreur lors de la mise à jour de l\'entrée', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

// DELETE: Supprimer une entrée
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

    await prisma.chatbotKnowledge.delete({
      where: { id },
    })

    // Invalider le cache des connaissances
    clearChatbotKnowledgeCache()

    return NextResponse.json({ success: true })
  } catch (error) {
    adminLogger.error('Erreur lors de la suppression de l\'entrée', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
