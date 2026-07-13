import { describe, expect, it } from 'vitest'
import { parseCalendarEventsFromText } from '@/lib/calendar/import-parser'

describe('parseCalendarEventsFromText', () => {
  it('extrait les événements datés et détecte le type', () => {
    const input = `
      OCTOBRE 2026
      12 Championnat régional benjamins
      14 Entraînement collectif à Pertuis
      20 22 Stage intensif vacances
    `

    const events = parseCalendarEventsFromText(input)

    expect(events).toHaveLength(3)
    expect(events[0]).toMatchObject({
      title: 'Championnat régional benjamins',
      date: '2026-10-12',
      type: 'competition',
      couleur: '#3b82f6',
    })
    expect(events[1]).toMatchObject({
      date: '2026-10-14',
      type: 'entrainement',
      couleur: '#8b5cf6',
    })
    expect(events[2]).toMatchObject({
      date: '2026-10-20',
      dateFin: '2026-10-22',
      type: 'stage',
      couleur: '#f59e0b',
    })
  })

  it('ignore les lignes invalides et dédoublonne', () => {
    const input = `
      SEPTEMBRE 2026
      Texte sans date
      01 Meeting de rentrée
      01 Meeting de rentrée
      33 Date invalide
    `

    const events = parseCalendarEventsFromText(input)
    expect(events).toHaveLength(1)
    expect(events[0].title).toBe('Meeting de rentrée')
  })
})

