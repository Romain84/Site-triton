import { NextResponse } from 'next/server'
import { deleteCoachSession } from '@/lib/auth/session'
import { logger } from '@/lib/logger'

export async function POST() {
  try {
    await deleteCoachSession()

    return NextResponse.json({ success: true })
  } catch (error) {
    logger.withContext('Auth').error('Erreur lors de la déconnexion', error)
    return NextResponse.json(
      { error: 'Erreur lors de la déconnexion' },
      { status: 500 }
    )
  }
}
