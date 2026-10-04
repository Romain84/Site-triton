import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { libelleOccupations } from '@/lib/planning-occupations'

function toIcsDate(date: Date) {
  return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
}

function buildEvent(uid: string, title: string, start: Date, end: Date, description?: string, location?: string) {
  return [
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${toIcsDate(new Date())}`,
    `DTSTART:${toIcsDate(start)}`,
    `DTEND:${toIcsDate(end)}`,
    `SUMMARY:${title.replace(/,/g, '\\,')}`,
    description ? `DESCRIPTION:${description.replace(/\n/g, '\\n')}` : undefined,
    location ? `LOCATION:${location.replace(/,/g, '\\,')}` : undefined,
    'END:VEVENT',
  ].filter(Boolean).join('\r\n')
}

// Exporte un flux ICS combinant planning fixe et événements calendrier.
export async function GET() {
  const [plannings, evenements] = await Promise.all([
    prisma.planning.findMany({
      where: { actif: true },
      include: {
        groupe: true,
        occupations: { orderBy: { ordre: 'asc' } },
      },
    }),
    prisma.evenementCalendrier.findMany({ where: { actif: true } }),
  ])

  const now = new Date()
  const events: string[] = []

  for (const planning of plannings) {
    const start = new Date(now)
    start.setHours(8, 0, 0, 0)
    const end = new Date(start)
    end.setHours(9, 0, 0, 0)

    events.push(
      buildEvent(
        `planning-${planning.id}@triton`,
        `Planning ${planning.jourSemaine} - ${planning.groupe?.nom || 'Cours'}`,
        start,
        end,
        `${planning.heureDebut} - ${planning.heureFin}`,
        libelleOccupations(planning) || planning.lieu || undefined
      )
    )
  }

  for (const evenement of evenements) {
    const start = new Date(evenement.date)
    const end = evenement.dateFin ? new Date(evenement.dateFin) : new Date(start.getTime() + 60 * 60 * 1000)

    events.push(
      buildEvent(
        `event-${evenement.id}@triton`,
        evenement.title,
        start,
        end,
        evenement.description || undefined,
        evenement.lieu || undefined
      )
    )
  }

  const ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Triton Club//Planning//FR',
    'CALSCALE:GREGORIAN',
    ...events,
    'END:VCALENDAR',
  ].join('\r\n')

  return new NextResponse(ics, {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': 'attachment; filename="triton-planning.ics"',
    },
  })
}
