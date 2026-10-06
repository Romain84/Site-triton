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

  it('extrait fidèlement les compétitions du calendrier CD84 saison 2027', () => {
    const input = `
      CALENDRIER COMPÉTITIONS CD 84 - SAISON 2027
      JANVIER 2027
      23 24 Championnat départemental U12 et +, Maîtres Pertuis U12 et +, Maîtres
      30 31 Championnats de France de relais Maîtres Maîtres
      31 Championnat départemental U11 et - Avignon Stuart Mill U11 et -
      FEVRIER 2027
      12 14 Meeting Camille Muffat Nice Elites
      14 Championnat départemental U12 et + Orange U12 et +
      AVRIL 2027
      27 02/05 Championnats de France U14 et U15 U14 et U15
      JUIN 2027
      5 6 Vaucluse OPEN Carpentras U12 et +, Maîtres
      (26) 27 Finale départementale U11 et -, U12/U13 Sorgues
    `

    const events = parseCalendarEventsFromText(input)
    expect(events.length).toBe(8)

    // Vérifier 1er événement (Pertuis)
    expect(events[0]).toMatchObject({
      title: 'Championnat départemental U12 et +, Maîtres',
      date: '2027-01-23',
      dateFin: '2027-01-24',
      lieu: 'Pertuis',
      categories: 'U12 et +, Maîtres',
      type: 'competition',
    })

    // Vérifier événement à cheval sur 2 mois (27/04 au 02/05/2027)
    const chFrance = events.find(e => e.title.includes('Championnats de France U14 et U15'))
    expect(chFrance).toBeDefined()
    expect(chFrance?.date).toBe('2027-04-27')
    expect(chFrance?.dateFin).toBe('2027-05-02')

    // Vérifier événement avec date entre parenthèses ((26) 27 Finale départementale)
    const finaleDep = events.find(e => e.title.includes('Finale départementale'))
    expect(finaleDep).toBeDefined()
    expect(finaleDep?.date).toBe('2027-06-26')
    expect(finaleDep?.dateFin).toBe('2027-06-27')
    expect(finaleDep?.lieu).toBe('Sorgues')
  })
})

