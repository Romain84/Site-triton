import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { apiError, apiSuccess } from '@/lib/api/response'
import { handleRouteError, requireAdmin } from '@/lib/api/guards'
import { clearChatbotKnowledgeCache } from '@/lib/chatbot-knowledge'

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdmin()
    if (!auth.ok) return auth.response

    const body = await request.json()
    const { action, ids, entries, categorie } = body

    if (action === 'activate') {
      await prisma.chatbotKnowledge.updateMany({
        where: { id: { in: ids } },
        data: { actif: true },
      })
      clearChatbotKnowledgeCache()
      return apiSuccess({ success: true })
    }

    if (action === 'deactivate') {
      await prisma.chatbotKnowledge.updateMany({
        where: { id: { in: ids } },
        data: { actif: false },
      })
      clearChatbotKnowledgeCache()
      return apiSuccess({ success: true })
    }

    if (action === 'delete') {
      await prisma.chatbotKnowledge.deleteMany({
        where: { id: { in: ids } },
      })
      clearChatbotKnowledgeCache()
      return apiSuccess({ success: true })
    }

    if (action === 'change-category') {
      await prisma.chatbotKnowledge.updateMany({
        where: { id: { in: ids } },
        data: { categorie },
      })
      clearChatbotKnowledgeCache()
      return apiSuccess({ success: true })
    }

    if (action === 'import') {
      if (!Array.isArray(entries)) {
        return apiError('Format invalide', 400)
      }

      const created = await prisma.chatbotKnowledge.createMany({
        data: entries.map((e: any) => ({
          categorie: e.categorie || 'general',
          question: e.question,
          reponse: e.reponse,
          motsCles: e.motsCles || null,
          priorite: e.priorite !== undefined ? parseInt(e.priorite, 10) : 0,
          actif: e.actif !== undefined ? Boolean(e.actif) : true,
        })),
        skipDuplicates: true,
      })

      clearChatbotKnowledgeCache()
      return apiSuccess({ success: true, count: created.count })
    }

    return apiError('Action inconnue', 400)
  } catch (error) {
    return handleRouteError(error, 'Erreur lors de l\'action de masse')
  }
}
