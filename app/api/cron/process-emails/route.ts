import { NextRequest, NextResponse } from 'next/server'
import { processEmailQueue } from '@/lib/email'
import { logger } from '@/lib/logger'

const cronLogger = logger.withContext('CronEmails')

export async function POST(request: NextRequest) {
  return handleRequest(request)
}

export async function GET(request: NextRequest) {
  return handleRequest(request)
}

async function handleRequest(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    const token = authHeader?.startsWith('Bearer ')
      ? authHeader.substring(7)
      : request.nextUrl.searchParams.get('secret')

    const cronSecret = process.env.CRON_SECRET

    // Bloquer l'exécution si aucun secret n'est configuré en production
    if (!cronSecret) {
      cronLogger.error('La variable d\'environnement CRON_SECRET n\'est pas configurée.')
      return NextResponse.json(
        { error: 'Service temporairement indisponible' },
        { status: 500 }
      )
    }

    if (token !== cronSecret) {
      cronLogger.warn('Tentative d\'accès non autorisée à l\'API de Cron.')
      return NextResponse.json(
        { error: 'Non autorisé' },
        { status: 401 }
      )
    }

    cronLogger.info('Déclenchement du traitement de la file d\'attente d\'e-mails...')
    await processEmailQueue()

    return NextResponse.json({
      success: true,
      message: 'Traitement de la file d\'attente d\'e-mails terminé.',
    })
  } catch (error) {
    cronLogger.error('Erreur lors du traitement de la file d\'attente d\'e-mails:', error)
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    )
  }
}
