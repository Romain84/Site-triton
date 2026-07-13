import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { apiSuccess } from '@/lib/api/response'
import { handleRouteError, requireAdmin } from '@/lib/api/guards'

// Tarification officielle Mistral AI par million de tokens (estimée en Euros)
// https://mistral.ai/technology/#pricing
const MODEL_PRICING: Record<string, { input: number; output: number }> = {
  'mistral-small': { input: 0.18, output: 0.55 }, // $0.2 / $0.6
  'mistral-large': { input: 1.85, output: 5.55 }, // $2.0 / $6.0
  'ministral-8b': { input: 0.09, output: 0.28 },  // $0.1 / $0.3
  'mistral-7b': { input: 0.046, output: 0.14 },   // $0.05 / $0.15
}

function calculateCost(modelName: string, promptTokens: number, completionTokens: number): number {
  const pricing = MODEL_PRICING[modelName.toLowerCase()] || MODEL_PRICING['mistral-small']
  const inputCost = (promptTokens / 1_000_000) * pricing.input
  const outputCost = (completionTokens / 1_000_000) * pricing.output
  return inputCost + outputCost
}

export async function GET() {
  try {
    const auth = await requireAdmin()
    if (!auth.ok) return auth.response

    // 1. Déterminer les dates du mois en cours
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

    // 2. Requêtes agrégées globales
    const aggregateGlobal = await prisma.chatbotTokenLog.aggregate({
      _sum: {
        promptTokens: true,
        completionTokens: true,
        totalTokens: true,
      },
      _count: true,
    })

    // 3. Requêtes agrégées pour le mois en cours
    const aggregateMonth = await prisma.chatbotTokenLog.aggregate({
      where: {
        createdAt: {
          gte: startOfMonth,
        },
      },
      _sum: {
        promptTokens: true,
        completionTokens: true,
        totalTokens: true,
      },
      _count: true,
    })

    // 4. Calculer le coût total par groupement de modèle
    const groupedLogs = await prisma.chatbotTokenLog.groupBy({
      by: ['modelName'],
      _sum: {
        promptTokens: true,
        completionTokens: true,
      },
    })

    let totalCostGlobal = 0
    groupedLogs.forEach((group) => {
      const model = group.modelName || 'mistral-small'
      const prompt = group._sum.promptTokens || 0
      const completion = group._sum.completionTokens || 0
      totalCostGlobal += calculateCost(model, prompt, completion)
    })

    // Coût du mois en cours
    const groupedLogsMonth = await prisma.chatbotTokenLog.groupBy({
      where: {
        createdAt: {
          gte: startOfMonth,
        },
      },
      by: ['modelName'],
      _sum: {
        promptTokens: true,
        completionTokens: true,
      },
    })

    let totalCostMonth = 0
    groupedLogsMonth.forEach((group) => {
      const model = group.modelName || 'mistral-small'
      const prompt = group._sum.promptTokens || 0
      const completion = group._sum.completionTokens || 0
      totalCostMonth += calculateCost(model, prompt, completion)
    })

    // 5. Historique des 100 derniers appels
    const recentLogs = await prisma.chatbotTokenLog.findMany({
      orderBy: {
        createdAt: 'desc',
      },
      take: 100,
    })

    // Calculer le coût pour chaque log récent pour l'affichage
    const recentLogsWithCost = recentLogs.map((log) => ({
      ...log,
      cost: calculateCost(log.modelName, log.promptTokens, log.completionTokens),
    }))

    return apiSuccess({
      global: {
        count: aggregateGlobal._count || 0,
        promptTokens: aggregateGlobal._sum.promptTokens || 0,
        completionTokens: aggregateGlobal._sum.completionTokens || 0,
        totalTokens: aggregateGlobal._sum.totalTokens || 0,
        cost: totalCostGlobal,
      },
      month: {
        count: aggregateMonth._count || 0,
        promptTokens: aggregateMonth._sum.promptTokens || 0,
        completionTokens: aggregateMonth._sum.completionTokens || 0,
        totalTokens: aggregateMonth._sum.totalTokens || 0,
        cost: totalCostMonth,
      },
      recentLogs: recentLogsWithCost,
    })
  } catch (error) {
    return handleRouteError(error, 'Erreur lors du calcul des statistiques du chatbot')
  }
}

export async function DELETE() {
  try {
    const auth = await requireAdmin()
    if (!auth.ok) return auth.response

    await prisma.chatbotTokenLog.deleteMany()

    return apiSuccess({ message: 'Historique des jetons vidé avec succès' })
  } catch (error) {
    return handleRouteError(error, 'Erreur lors de la suppression du journal des jetons')
  }
}
