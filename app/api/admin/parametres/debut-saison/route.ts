import { NextRequest, NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/auth/session'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { logAdminAudit } from '@/lib/admin-audit'

const adminLogger = logger.withContext('Admin')

function incrementYears(str: string | null): string | null {
  if (!str) return str
  return str.replace(/\b(20\d{2})\b/g, (match) => {
    return (parseInt(match) + 1).toString()
  })
}

export async function POST(request: NextRequest) {
  try {
    const session = await getAdminSession()

    if (!session) {
      return NextResponse.json(
        { error: 'Non authentifié' },
        { status: 401 }
      )
    }

    // Récupérer les paramètres actuels
    const settings = await prisma.settings.findFirst()

    if (!settings) {
      return NextResponse.json(
        { error: 'Paramètres introuvables' },
        { status: 404 }
      )
    }

    // Calculer les nouvelles valeurs
    const newTexteFiligrane = incrementYears(settings.texteFiligrane) || 'Saison Nouvelle'
    const newDebutCoursNormal = incrementYears(settings.debutCoursNormal)
    const newDebutCoursBnssa = incrementYears(settings.debutCoursBnssa)
    const newDatesTests = settings.datesTests
      ? settings.datesTests.map(d => incrementYears(d) as string)
      : []

    // Mettre à jour les paramètres
    const updatedSettings = await prisma.settings.update({
      where: { id: settings.id },
      data: {
        interSaisonActif: false,
        texteFiligrane: newTexteFiligrane,
        debutCoursNormal: newDebutCoursNormal,
        debutCoursBnssa: newDebutCoursBnssa,
        datesTests: newDatesTests,
      },
    })

    logAdminAudit({
      action: 'settings.season.start',
      actorId: session.userId,
      actorRole: session.role,
      targetType: 'Settings',
      targetId: settings.id,
      details: {
        oldFiligrane: settings.texteFiligrane,
        newFiligrane: newTexteFiligrane,
      },
    })

    adminLogger.info(`Nouvelle saison déclarée : ${newTexteFiligrane}`)

    return NextResponse.json({
      success: true,
      settings: {
        interSaisonActif: updatedSettings.interSaisonActif,
        texteFiligrane: updatedSettings.texteFiligrane,
        debutCoursNormal: updatedSettings.debutCoursNormal,
        debutCoursBnssa: updatedSettings.debutCoursBnssa,
        datesTests: updatedSettings.datesTests,
      }
    })
  } catch (error) {
    adminLogger.error('Erreur lors de la déclaration du début de la saison', error)
    return NextResponse.json(
      { error: 'Erreur serveur lors de la déclaration du début de la saison' },
      { status: 500 }
    )
  }
}
