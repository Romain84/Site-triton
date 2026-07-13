import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { apiError, apiSuccess } from '@/lib/api/response'
import { handleRouteError, requireAdmin } from '@/lib/api/guards'
import { clearChatbotKnowledgeCache } from '@/lib/chatbot-knowledge'

export async function GET() {
  try {
    const auth = await requireAdmin()
    if (!auth.ok) return auth.response

    const entries = await prisma.chatbotKnowledge.findMany({
      orderBy: [
        { categorie: 'asc' },
        { priorite: 'desc' },
        { createdAt: 'desc' },
      ],
    })

    return apiSuccess({ entries })
  } catch (error) {
    return handleRouteError(error, 'Erreur lors de la récupération de la base de connaissances')
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdmin()
    if (!auth.ok) return auth.response

    const body = await request.json()
    const { categorie, question, reponse, motsCles, priorite, actif } = body

    if (!categorie || !question || !reponse) {
      return apiError(
        'Catégorie, question et réponse sont obligatoires',
        400,
        undefined,
        'VALIDATION_ERROR'
      )
    }

    const entry = await prisma.chatbotKnowledge.create({
      data: {
        categorie,
        question,
        reponse,
        motsCles: motsCles || null,
        priorite: priorite || 0,
        actif: actif !== undefined ? actif : true,
      },
    })

    // Invalider le cache des connaissances
    clearChatbotKnowledgeCache()

    return apiSuccess({ entry }, 201)
  } catch (error) {
    return handleRouteError(error, 'Erreur lors de la création de l\'entrée')
  }
}
