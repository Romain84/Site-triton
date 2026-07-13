import { NextResponse } from 'next/server'
import { deleteAdminSession } from '@/lib/auth/session'
import { logger } from '@/lib/logger'

export async function POST() {
  try {
    await deleteAdminSession()

    return NextResponse.json({
      success: true,
    })
  } catch (error) {
    logger.withContext('Auth').error('Erreur lors de la déconnexion admin', error)
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}
