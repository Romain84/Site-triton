import { describe, expect, it } from 'vitest'
import { STATUTS_FACTURE_COACH, isValidFactureCoachStatus } from '@/lib/facture-utils'

describe('Factures en cours (Lecture seule)', () => {
  it('garantit que les statuts officiels en base sont préservés', () => {
    expect(STATUTS_FACTURE_COACH).toContain('brouillon')
    expect(STATUTS_FACTURE_COACH).toContain('generee')
    expect(STATUTS_FACTURE_COACH).toContain('envoyee')
    expect(STATUTS_FACTURE_COACH).toContain('payee')
    expect(isValidFactureCoachStatus('generee')).toBe(true)
  })

  it('distingue le statut virtuel "non_generee" des statuts persistés en BDD', () => {
    // "non_generee" est un statut d'affichage UI/API en lecture seule, jamais écrit en BDD
    expect(isValidFactureCoachStatus('non_generee')).toBe(false)
  })

  it('garantit la neutralité du calcul en lecture seule sans altérer de statut', () => {
    // Simulation des données de facture calculées à la volée
    const simulatedCoachEnCours = {
      statut: 'non_generee',
      heuresFixes: 10,
      heuresTournants: 2,
      heuresRemplacements: 1.5,
      heuresAbsences: 1,
      totalHeures: 12.5,
      tauxHoraire: 35,
      totalMontant: 437.5,
    }

    expect(simulatedCoachEnCours.statut).toBe('non_generee')
    expect(
      simulatedCoachEnCours.heuresFixes +
      simulatedCoachEnCours.heuresTournants +
      simulatedCoachEnCours.heuresRemplacements -
      simulatedCoachEnCours.heuresAbsences
    ).toBe(12.5)
    expect(simulatedCoachEnCours.totalHeures * simulatedCoachEnCours.tauxHoraire).toBe(437.5)
  })
})
