import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

const icalLogger = logger.withContext('iCalCalendarAPI');

function formatICalDate(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  const y = date.getUTCFullYear();
  const m = pad(date.getUTCMonth() + 1);
  const d = pad(date.getUTCDate());
  const h = pad(date.getUTCHours());
  const min = pad(date.getUTCMinutes());
  const s = pad(date.getUTCSeconds());
  return `${y}${m}${d}T${h}${min}${s}Z`;
}

function escapeICalText(text: string | null): string {
  if (!text) return '';
  return text
    .replace(/\\/g, '\\\\')
    .replace(/,/g, '\\,')
    .replace(/;/g, '\\;')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '');
}

function getICalDescription(event: any): string {
  const desc = event.description || '';
  if (desc.startsWith('__FICHE__:')) {
    try {
      const sheet = JSON.parse(desc.slice('__FICHE__:'.length));
      let text = `Compétition : ${sheet.title || event.title}\n`;
      if (sheet.lieu) text += `Lieu : ${sheet.lieu}\n`;
      if (sheet.categories) text += `Catégories : ${sheet.categories}\n`;
      if (sheet.conditions) text += `Conditions : ${sheet.conditions}\n`;
      if (sheet.recompense && sheet.recompense !== 'Aucune') {
        text += `Récompenses : ${sheet.recompense}\n`;
      }
      
      if (sheet.sessions && sheet.sessions.length > 0) {
        text += `\n--- Programme des épreuves ---\n`;
        for (const session of sheet.sessions) {
          text += `• ${session.label}\n`;
          if (session.echauffement) text += `  - Échauffement : ${session.echauffement.replace('H', 'h')}\n`;
          if (session.heureDebut) text += `  - Début des épreuves : ${session.heureDebut.replace('H', 'h')}\n`;
          if (session.epreuves && session.epreuves.length > 0) {
            text += `  - Épreuves : ${session.epreuves.join(', ')}\n`;
          }
        }
      }
      
      if (event.pdfReglement) {
        text += `\nRèglement officiel : https://tritoncavaillon.fr${event.pdfReglement}\n`;
      }
      
      return text;
    } catch {
      return desc;
    }
  }
  return desc;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const groupeId = searchParams.get('groupeId');

    const whereClause: any = {
      actif: true,
    };

    let calendarName = 'Triton Club Cavaillon';

    if (groupeId && groupeId !== 'all') {
      const group = await prisma.groupe.findUnique({
        where: { id: groupeId },
        select: { nom: true }
      });
      if (group) {
        calendarName = `Triton Club - ${group.nom}`;
      }
      
      // Fetch events for this specific group or general events (groupeId = null)
      whereClause.OR = [
        { groupeId: groupeId },
        { groupeId: null }
      ];
    }

    const events = await prisma.evenementCalendrier.findMany({
      where: whereClause,
      orderBy: { date: 'asc' },
    });

    const icsLines: string[] = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Triton Club Cavaillon//NONSGML Agenda//FR',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      `X-WR-CALNAME:${calendarName}`,
      'X-WR-TIMEZONE:Europe/Paris',
      'BEGIN:VTIMEZONE',
      'TZID:Europe/Paris',
      'BEGIN:DAYLIGHT',
      'TZOFFSETFROM:+0100',
      'TZOFFSETTO:+0200',
      'TZNAME:CEST',
      'DTSTART:19700329T020000',
      'RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=-1SU',
      'END:DAYLIGHT',
      'BEGIN:STANDARD',
      'TZOFFSETFROM:+0200',
      'TZOFFSETTO:+0100',
      'TZNAME:CET',
      'DTSTART:19701025T030000',
      'RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU',
      'END:STANDARD',
      'END:VTIMEZONE'
    ];

    for (const event of events) {
      const uid = `${event.id}@tritoncavaillon.fr`;
      const dtstamp = formatICalDate(event.createdAt);
      
      // Date start and end
      const startDate = new Date(event.date);
      // If hourDebut is set like "08:00" or "08h00" or similar
      let startHours = 8;
      let startMinutes = 0;
      if (event.heureDebut) {
        const timeMatch = event.heureDebut.replace('h', ':').replace('H', ':').match(/(\d+):(\d+)/);
        if (timeMatch) {
          startHours = parseInt(timeMatch[1], 10);
          startMinutes = parseInt(timeMatch[2], 10);
        }
      }
      startDate.setHours(startHours, startMinutes, 0, 0);
      const dtstartStr = `DTSTART;TZID=Europe/Paris:${startDate.getFullYear()}${String(startDate.getMonth() + 1).padStart(2, '0')}${String(startDate.getDate()).padStart(2, '0')}T${String(startDate.getHours()).padStart(2, '0')}${String(startDate.getMinutes()).padStart(2, '0')}00`;

      let endDate = event.dateFin ? new Date(event.dateFin) : new Date(event.date);
      let endHours = 18;
      let endMinutes = 0;
      if (event.heureFin) {
        const timeMatch = event.heureFin.replace('h', ':').replace('H', ':').match(/(\d+):(\d+)/);
        if (timeMatch) {
          endHours = parseInt(timeMatch[1], 10);
          endMinutes = parseInt(timeMatch[2], 10);
        }
      }
      endDate.setHours(endHours, endMinutes, 0, 0);
      const dtendStr = `DTEND;TZID=Europe/Paris:${endDate.getFullYear()}${String(endDate.getMonth() + 1).padStart(2, '0')}${String(endDate.getDate()).padStart(2, '0')}T${String(endDate.getHours()).padStart(2, '0')}${String(endDate.getMinutes()).padStart(2, '0')}00`;

      const summary = escapeICalText(event.title);
      const description = escapeICalText(getICalDescription(event));
      const location = escapeICalText(event.lieu || 'Piscine couverte Alphonse Roudière, Avenue Jean Moulin, quartier La Clède, 84300 Cavaillon');

      icsLines.push(
        'BEGIN:VEVENT',
        `UID:${uid}`,
        `DTSTAMP:${dtstamp}`,
        dtstartStr,
        dtendStr,
        `SUMMARY:${summary}`,
        `DESCRIPTION:${description}`,
        `LOCATION:${location}`,
        'END:VEVENT'
      );
    }

    icsLines.push('END:VCALENDAR');

    const icsText = icsLines.join('\r\n');

    return new NextResponse(icsText, {
      headers: {
        'Content-Type': 'text/calendar; charset=utf-8',
        'Content-Disposition': `attachment; filename="triton-agenda.ics"`,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });

  } catch (error) {
    icalLogger.error('Error generating iCal feed', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
