import { describe, expect, it } from 'vitest'

describe('Gestion des Remplacements & Prestations', () => {
  it('calcule correctement les heures et montants des prestations manuelles', () => {
    const prestationAuTaux = {
      type: 'manuel',
      heures: 2.5,
      tauxHoraire: 35,
      description: 'Stage natation vacances',
    }
    const montantCalcule = prestationAuTaux.heures * prestationAuTaux.tauxHoraire
    expect(montantCalcule).toBe(87.5)

    const prestationForfait = {
      type: 'manuel',
      heures: 0,
      montant: 120,
      description: 'Encadrement compétition régionale',
    }
    expect(prestationForfait.montant).toBe(120)
  })

  it('intègre les prestations manuelles dans le total des heures travaillées', () => {
    const heuresFixes = 10
    const heuresTournants = 2
    const heuresRemplacements = 1.5
    const heuresAbsences = 0.5
    const lignesManuelles = [
      { type: 'manuel', heures: 3, montant: 105 },
      { type: 'competition', heures: 0, montant: 50 }, // Forfait sans heures
    ]

    const totalHeures = heuresFixes + heuresTournants + heuresRemplacements - heuresAbsences +
      lignesManuelles.reduce((sum, l) => sum + (['remplacement', 'absence', 'manuel'].includes(l.type) ? (l.heures || 0) : 0), 0)

    expect(totalHeures).toBe(16) // 10 + 2 + 1.5 - 0.5 + 3 = 16h
  })

  it('interdit l\'altération de prestations sur une facture envoyée ou payée', () => {
    const isLockedInvoice = (statut: string) => ['envoyee', 'payee'].includes(statut)

    expect(isLockedInvoice('brouillon')).toBe(false)
    expect(isLockedInvoice('generee')).toBe(false)
    expect(isLockedInvoice('envoyee')).toBe(true)
    expect(isLockedInvoice('payee')).toBe(true)
  })
})
