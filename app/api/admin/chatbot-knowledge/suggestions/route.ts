import { NextRequest, NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/auth/session'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'

const adminLogger = logger.withContext('Admin')

// GET - Liste toutes les suggestions du chatbot
export async function GET(request: NextRequest) {
  try {
    const session = await getAdminSession()

    if (!session) {
      return NextResponse.json(
        { error: 'Non authentifié' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const statut = searchParams.get('statut')

    const where = statut && statut !== 'all' ? { statut } : {}

    const suggestions = await prisma.chatbotSuggestion.findMany({
      where,
      orderBy: {
        createdAt: 'desc',
      },
    })

    return NextResponse.json(suggestions)
  } catch (error) {
    adminLogger.error('Erreur lors de la récupération des suggestions du chatbot', error)
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}
