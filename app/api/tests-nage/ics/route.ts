import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

function formatIcsDateTime(date: Date, timeStr: string): string {
  const [h, m] = timeStr.split(':').map(Number)
  const d = new Date(date)
  const y = d.getFullYear()
  const mon = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const hour = String(h).padStart(2, '0')
  const min = String(m).padStart(2, '0')
  return `${y}${mon}${day}T${hour}${min}00`
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const token = searchParams.get('token')
    const id = searchParams.get('id')

    if (!token && !id) {
      return new NextResponse('Paramètre token ou id manquant', { status: 400 })
    }

    const inscription = await prisma.inscriptionTestNage.findFirst({
      where: token ? { token } : { id: id! },
      include: {
        creneau: {
          include: {
            session: true,
          },
        },
      },
    })

    if (!inscription) {
      return new NextResponse('Inscription non trouvée', { status: 404 })
    }

    const session = inscription.creneau.session
    const creneau = inscription.creneau

    const dtStart = formatIcsDateTime(session.date, creneau.heureDebut)
    const dtEnd = formatIcsDateTime(session.date, creneau.heureFin)
    const now = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'

    const icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Triton Club Cavaillon//Tests de Nage//FR',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'BEGIN:VEVENT',
      `UID:test-nage-${inscription.id}@triton-cavaillon.fr`,
      `DTSTAMP:${now}`,
      `DTSTART;TZID=Europe/Paris:${dtStart}`,
      `DTEND;TZID=Europe/Paris:${dtEnd}`,
      `SUMMARY:Test de Nage - ${inscription.prenomEnfant} ${inscription.nomEnfant}`,
      `DESCRIPTION:Test de niveau individuel de natation (${session.dureeMinutes} min).\\nLieu : ${session.lieu}\\nConsignes : Merci de vous présenter dans le hall d'entrée 5 minutes avant l'heure de votre créneau avec maillot\\, bonnet et lunettes.`,
      `LOCATION:${session.lieu}`,
      'STATUS:CONFIRMED',
      'BEGIN:VALARM',
      'TRIGGER:-PT30M',
      'ACTION:DISPLAY',
      'DESCRIPTION:Rappel : Test de Nage au Triton Club Cavaillon dans 30 minutes',
      'END:VALARM',
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\r\n')

    return new NextResponse(icsContent, {
      headers: {
        'Content-Type': 'text/calendar; charset=utf-8',
        'Content-Disposition': `attachment; filename="test-nage-${inscription.prenomEnfant.toLowerCase()}.ics"`,
      },
    })
  } catch (error) {
    console.error('Erreur génération ICS:', error)
    return new NextResponse('Erreur serveur', { status: 500 })
  }
}
