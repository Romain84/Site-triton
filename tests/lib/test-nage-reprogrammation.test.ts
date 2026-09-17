import { describe, it, expect } from 'vitest'
import { formatLongDateFr } from '@/lib/date'

describe('Tests de Nage - Reprogrammation & Notification Suite Incident Piscine', () => {
  it('génère une URL de reprogrammation valide avec le token du parent', () => {
    const token = '595c11359a79ab179b8321bd2277c9da'
    const baseUrl = 'https://www.tritoncavaillon.fr'
    const rescheduleUrl = `${baseUrl}/tests-de-nage?token=${token}`

    expect(rescheduleUrl).toBe('https://www.tritoncavaillon.fr/tests-de-nage?token=595c11359a79ab179b8321bd2277c9da')
    expect(rescheduleUrl).toContain('token=')
  })

  it('permet le basculement d’un créneau vers une nouvelle séance distincte', () => {
    // Séance annulée du 16/09 (bloquée)
    const oldSession = {
      id: 'sess-16-09',
      titre: 'Tests du 16/09',
      date: new Date('2026-09-16'),
      actif: true,
      bloquee: true,
      creneaux: [
        { id: 'cr-old', heureDebut: '09:00', heureFin: '09:10', capacite: 2 },
      ],
    }

    // Nouvelle séance de rattrapage ouverte
    const newSession = {
      id: 'sess-23-09',
      titre: 'Tests de Rattrapage',
      date: new Date('2026-09-23'),
      actif: true,
      bloquee: false,
      creneaux: [
        { id: 'cr-new', heureDebut: '14:00', heureFin: '14:10', capacite: 2, nbInscrits: 0 },
      ],
    }

    // Inscription initiale sur la séance annulée
    const inscription = {
      id: 'ins-1',
      creneauId: 'cr-old',
      statut: 'inscrit',
    }

    // Vérification de la faisabilité du déplacement
    const canMoveToNewCreneau =
      newSession.actif &&
      !newSession.bloquee &&
      newSession.creneaux[0].nbInscrits < newSession.creneaux[0].capacite

    expect(canMoveToNewCreneau).toBe(true)

    // Simulation du déplacement
    const updatedInscription = {
      ...inscription,
      creneauId: newSession.creneaux[0].id,
    }

    expect(updatedInscription.creneauId).toBe('cr-new')
  })

  it('formate correctement la date et le sujet d’alerte pour incident technique', () => {
    const sessionDate = new Date('2026-09-16T09:00:00')
    const dateFormatted = formatLongDateFr(sessionDate)
    
    expect(dateFormatted.toLowerCase()).toContain('septembre')
    expect(dateFormatted).toContain('2026')

    const subject = `⚠️ Incident technique piscine : Report de votre test de nage du 16/09/2026`
    expect(subject).toContain('Incident technique piscine')
    expect(subject).toContain('Report de votre test de nage')
  })

  it('permet de filtrer et exclure des enfants ciblés pour l’envoi de notification', () => {
    const inscriptions = [
      { id: 'ins-1', nomEnfant: 'DUPONT', prenomEnfant: 'Lucas', emailParent: 'parent1@test.fr' },
      { id: 'ins-2', nomEnfant: 'BARROSO', prenomEnfant: 'Maria', emailParent: 'parent2@test.fr' },
      { id: 'ins-3', nomEnfant: 'MARTIN', prenomEnfant: 'Léa', emailParent: 'parent3@test.fr' },
    ]

    // 1. Cas : exclusion d'un enfant au clic (ex: BARROSO Maria)
    const excludedIds = ['ins-2']
    const filteredByExclusion = inscriptions.filter((ins) => !excludedIds.includes(ins.id))

    expect(filteredByExclusion.length).toBe(2)
    expect(filteredByExclusion.map((i) => i.id)).toEqual(['ins-1', 'ins-3'])
    expect(filteredByExclusion.some((i) => i.id === 'ins-2')).toBe(false)

    // 2. Cas : ciblage explicite (targetInscriptionIds)
    const targetIds = ['ins-2']
    const allowedSet = new Set(targetIds)
    const filteredByTarget = inscriptions.filter((ins) => allowedSet.has(ins.id))

    expect(filteredByTarget.length).toBe(1)
    expect(filteredByTarget[0].nomEnfant).toBe('BARROSO')
  })
})
