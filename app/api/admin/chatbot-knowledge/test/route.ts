import { NextRequest, NextResponse } from 'next/server'
import { getChatResponse } from '@/lib/genkit-chat'
import { requireAdmin } from '@/lib/api/guards'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'

const testLogger = logger.withContext('AdminChatbotTest')

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdmin()
    if (!auth.ok) return auth.response

    const { question, history } = await request.json()

    if (!question || typeof question !== 'string' || question.trim().length === 0) {
      return NextResponse.json(
        { error: 'La question de test est requise' },
        { status: 400 }
      )
    }

    const settings = await prisma.settings.findFirst({ select: { chatbotModel: true } })
    const activeModel = settings?.chatbotModel || 'mistral-small'

    const startTime = Date.now()
    const response = await getChatResponse(question.trim(), history)
    const durationMs = Date.now() - startTime

    return NextResponse.json({
      success: true,
      question: question.trim(),
      response,
      model: activeModel,
      durationMs,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    testLogger.error('Erreur lors du test admin chatbot', error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Erreur lors du test du chatbot',
      },
      { status: 500 }
    )
  }
}

export async function DELETE() {
  try {
    const auth = await requireAdmin()
    if (!auth.ok) return auth.response

    const { clearChatbotKnowledgeCache } = await import('@/lib/chatbot-knowledge')
    clearChatbotKnowledgeCache()

    return NextResponse.json({
      success: true,
      message: 'Cache du chatbot invalidé avec succès',
    })
  } catch (error) {
    testLogger.error('Erreur lors de la purge du cache chatbot', error)
    return NextResponse.json(
      { error: 'Erreur lors de la purge du cache' },
      { status: 500 }
    )
  }
}

