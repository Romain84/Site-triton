import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'

const chatLogger = logger.withContext('Chat')

// POST - Enregistrer un feedback utilisateur négatif (pouce bas)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { question, reponse } = body

    if (!question) {
      return NextResponse.json(
        { error: 'La question est requise' },
        { status: 400 }
      )
    }

    // Vérifier si cette question a déjà été enregistrée récemment
    const existing = await prisma.chatbotSuggestion.findFirst({
      where: {
        question,
        statut: 'a_traiter',
      },
    })

    if (existing) {
      // Mettre à jour la source pour marquer qu'il y a eu un vote de mécontentement si elle était auto-détectée
      if (existing.source === 'auto') {
        await prisma.chatbotSuggestion.update({
          where: { id: existing.id },
          data: {
            source: 'vote',
            reponse: reponse || existing.reponse,
          },
        })
      }
      return NextResponse.json({ success: true, message: 'Suggestion déjà enregistrée et mise à jour' })
    }

    const suggestion = await prisma.chatbotSuggestion.create({
      data: {
        question,
        reponse: reponse || null,
        source: 'vote',
        statut: 'a_traiter',
      },
    })

    return NextResponse.json({ success: true, suggestion }, { status: 201 })
  } catch (error) {
    chatLogger.error('Erreur lors de l\'enregistrement du feedback chatbot', error)
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}
