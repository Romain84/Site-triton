import { NextRequest, NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/auth/session'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'

const adminLogger = logger.withContext('Admin')

export async function POST(request: NextRequest) {
  try {
    const session = await getAdminSession()
    if (!session) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const body = await request.json()
    const { action, ids } = body

    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: 'Aucun identifiant fourni' }, { status: 400 })
    }

    if (action === 'ignore') {
      await prisma.chatbotSuggestion.updateMany({
        where: { id: { in: ids } },
        data: { statut: 'ignore' },
      })
      return NextResponse.json({ success: true })
    }

    if (action === 'delete') {
      await prisma.chatbotSuggestion.deleteMany({
        where: { id: { in: ids } },
      })
      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: 'Action inconnue' }, { status: 400 })
  } catch (error) {
    adminLogger.error('Erreur lors de l\'action de masse sur les suggestions', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
