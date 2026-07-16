import { NextRequest, NextResponse } from 'next/server'
import { getChatResponse } from '@/lib/genkit-chat'
import { rateLimiter } from '@/lib/rate-limiter'
import { logger } from '@/lib/logger'
import { prisma } from '@/lib/prisma'

const chatLogger = logger.withContext('Chat')

// Quotas mensuels de tokens de sécurité par modèle
const MODEL_QUOTAS: Record<string, number> = {
  'mistral-large': 50000,    // 50k tokens
  'mistral-small': 500000,   // 500k tokens
  'ministral-8b': 1000000,  // 1M tokens
  'mistral-7b': 2000000,    // 2M tokens
}

/**
 * Vérifie si le quota mensuel de tokens pour le modèle sélectionné a été dépassé
 */
async function isMonthlyQuotaExceeded(modelName: string): Promise<boolean> {
  try {
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const normalizedModel = modelName.toLowerCase()

    const aggregate = await prisma.chatbotTokenLog.aggregate({
      where: {
        modelName: {
          equals: modelName,
          mode: 'insensitive',
        },
        createdAt: {
          gte: startOfMonth,
        },
      },
      _sum: {
        totalTokens: true,
      },
    })

    const totalTokens = aggregate._sum.totalTokens || 0
    const limit = MODEL_QUOTAS[normalizedModel] || MODEL_QUOTAS['mistral-small']
    return totalTokens >= limit
  } catch (error) {
    chatLogger.error('Erreur lors du calcul de la consommation mensuelle de tokens', error)
    return false // Ne pas bloquer le chat en cas d'erreur de base de données
  }
}

export async function POST(request: NextRequest) {
  try {
    // 1. Récupérer le modèle actif et vérifier le quota mensuel globale
    const settings = await prisma.settings.findFirst({ select: { chatbotModel: true } })
    const activeModel = settings?.chatbotModel || 'mistral-small'

    const quotaExceeded = await isMonthlyQuotaExceeded(activeModel)
    if (quotaExceeded) {
      return NextResponse.json(
        { error: "Le quota mensuel d'utilisation du chatbot a été atteint. Le chat est temporairement désactivé." },
        { status: 503 }
      )
    }

    // 2. Get user IP for rate limiting
    const ip = request.headers.get('x-forwarded-for') ||
               request.headers.get('x-real-ip') ||
               'unknown'

    // Check rate limit
    const rateLimitResult = rateLimiter.checkLimit(ip)

    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        {
          error: rateLimitResult.message || 'Trop de requêtes',
          resetTime: rateLimitResult.resetTime,
        },
        {
          status: 429,
          headers: {
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': rateLimitResult.resetTime.toString(),
          },
        }
      )
    }

    // Get message and optional conversation history from request body
    const { message, history: rawHistory } = await request.json()

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return NextResponse.json(
        { error: 'Message invalide' },
        { status: 400 }
      )
    }

    // Check message length (max 500 characters)
    if (message.length > 500) {
      return NextResponse.json(
        { error: 'Message trop long (max 500 caractères)' },
        { status: 400 }
      )
    }

    // Valider et assainir l'historique de conversation (optionnel)
    let validatedHistory: { role: 'user' | 'assistant'; content: string }[] | undefined
    if (Array.isArray(rawHistory)) {
      validatedHistory = rawHistory
        .slice(-6)
        .filter(
          (item: any) =>
            item &&
            typeof item === 'object' &&
            (item.role === 'user' || item.role === 'assistant') &&
            typeof item.content === 'string' &&
            item.content.length > 0 &&
            item.content.length <= 500
        )
        .map((item: any) => ({ role: item.role as 'user' | 'assistant', content: item.content }))
    }

    // Call Mistral AI via Genkit (avec historique de conversation)
    const response = await getChatResponse(message, validatedHistory)

    // Auto-detect unresolved questions (fallback responses)
    if (
      response.includes("Je n'ai pas cette information") ||
      response.includes("information non présente") ||
      response.includes("n'ai pas cette information précise")
    ) {
      try {
        // Enregistrer la question non résolue en base de données de manière asynchrone non-bloquante
        prisma.chatbotSuggestion.create({
          data: {
            question: message,
            reponse: response,
            source: 'auto',
            statut: 'a_traiter',
          }
        }).catch((err: any) => {
          chatLogger.error('Échec d\'enregistrement automatique de la suggestion chatbot', err)
        })
      } catch (err) {
        chatLogger.error('Erreur lors de la capture de la suggestion', err)
      }
    }

    // Return response with rate limit headers
    return NextResponse.json(
      {
        response,
        remaining: rateLimitResult.remaining,
        resetTime: rateLimitResult.resetTime,
      },
      {
        headers: {
          'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
          'X-RateLimit-Reset': rateLimitResult.resetTime.toString(),
        },
      }
    )

  } catch (error) {
    chatLogger.error('Erreur chatbot', error)

    // Check if it's a Mistral API error
    if (error instanceof Error) {
      if (error.message.includes('API key') || error.message.includes('MISTRAL_API_KEY') || error.message.includes('quota') || error.message.includes('401') || error.message.includes('403')) {
        return NextResponse.json(
          { error: 'Le chatbot est temporairement indisponible. Veuillez utiliser le formulaire de contact.' },
          { status: 503 }
        )
      }
    }

    return NextResponse.json(
      { error: 'Une erreur est survenue. Veuillez réessayer.' },
      { status: 500 }
    )
  }
}

// GET endpoint to check rate limit status and monthly quota
export async function GET(request: NextRequest) {
  try {
    const ip = request.headers.get('x-forwarded-for') ||
               request.headers.get('x-real-ip') ||
               'unknown'

    const stats = rateLimiter.getStats(ip)
    const rateLimitResult = rateLimiter.checkLimitReadOnly(ip)

    const settings = await prisma.settings.findFirst({ select: { chatbotModel: true } })
    const activeModel = settings?.chatbotModel || 'mistral-small'
    const quotaExceeded = await isMonthlyQuotaExceeded(activeModel)

    return NextResponse.json({
      available: rateLimitResult.allowed && !quotaExceeded,
      stats,
      remaining: rateLimitResult.remaining,
      resetTime: rateLimitResult.resetTime,
      monthlyQuotaExceeded: quotaExceeded,
    })
  } catch (error) {
    chatLogger.error('Erreur GET chatbot status', error)
    return NextResponse.json({
      available: true,
      remaining: 15,
      resetTime: Date.now() + 60000,
      monthlyQuotaExceeded: false,
    })
  }
}
