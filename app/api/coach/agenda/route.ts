import { NextRequest, NextResponse } from 'next/server'
import { getCoachSession } from '@/lib/auth/session'
import { getCoachAgenda } from '@/lib/services/coach-agenda-service'
import { logger } from '@/lib/logger'

const agendaLogger = logger.withContext('CoachAgendaAPI')

export async function GET(request: NextRequest) {
  try {
    const session = await getCoachSession()
    if (!session) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const nbJours = Math.min(30, Math.max(7, parseInt(searchParams.get('jours') || '14', 10)))

    const data = await getCoachAgenda(session.coachId, nbJours)
    return NextResponse.json(data)
  } catch (error) {
    agendaLogger.error('Erreur chargement agenda coach', error)
    return NextResponse.json({ error: 'Erreur lors du chargement de l\'agenda' }, { status: 500 })
  }
}
