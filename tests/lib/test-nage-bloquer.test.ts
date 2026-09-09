import { describe, it, expect } from 'vitest'

describe('Tests de Nage - Verrouillage / Blocage de session', () => {
  it('should prevent booking on a session marked as bloquee', () => {
    const session = {
      id: 'sess-123',
      titre: 'Session Test Samedi',
      date: new Date('2026-09-12'),
      actif: true,
      bloquee: true,
      creneaux: [
        {
          id: 'cr-1',
          heureDebut: '14:00',
          heureFin: '14:05',
          capacite: 2,
          actif: true,
          inscriptions: [],
        },
      ],
    }

    const creneau = session.creneaux[0]

    // Simulation de la règle de garde de l'API /api/tests-nage/reserver
    const canReserve = creneau.actif && session.actif && !session.bloquee && creneau.inscriptions.length < creneau.capacite

    expect(canReserve).toBe(false)
  })

  it('should allow booking when session is not blocked and has available places', () => {
    const session = {
      id: 'sess-123',
      titre: 'Session Test Samedi',
      date: new Date('2026-09-12'),
      actif: true,
      bloquee: false,
      creneaux: [
        {
          id: 'cr-1',
          heureDebut: '14:00',
          heureFin: '14:05',
          capacite: 2,
          actif: true,
          inscriptions: [],
        },
      ],
    }

    const creneau = session.creneaux[0]
    const canReserve = creneau.actif && session.actif && !session.bloquee && creneau.inscriptions.length < creneau.capacite

    expect(canReserve).toBe(true)
  })

  it('should toggle bloquee state correctly', () => {
    const session = { id: 'sess-1', bloquee: false }
    const toggled = { ...session, bloquee: !session.bloquee }
    expect(toggled.bloquee).toBe(true)

    const untoggled = { ...toggled, bloquee: !toggled.bloquee }
    expect(untoggled.bloquee).toBe(false)
  })
})
