import { describe, expect, it } from 'vitest'
import {
  isSuperviseurFinanceRoute,
  isSuperviseurBlockedUpload,
  maskSettingsForSuperviseur,
} from '@/lib/security/superviseur-guard'

describe('superviseur security guard', () => {
  describe('isSuperviseurFinanceRoute', () => {
    it('bloque hermétiquement toutes les routes financières et comptables', () => {
      expect(isSuperviseurFinanceRoute('/api/admin/finances')).toBe(true)
      expect(isSuperviseurFinanceRoute('/api/admin/finances/export')).toBe(true)
      expect(isSuperviseurFinanceRoute('/api/admin/comptabilite')).toBe(true)
      expect(isSuperviseurFinanceRoute('/api/admin/factures')).toBe(true)
      expect(isSuperviseurFinanceRoute('/api/admin/factures/123')).toBe(true)
      expect(isSuperviseurFinanceRoute('/api/admin/devis')).toBe(true)
      expect(isSuperviseurFinanceRoute('/api/admin/prestations')).toBe(true)
      expect(isSuperviseurFinanceRoute('/api/admin/dons')).toBe(true)
      expect(isSuperviseurFinanceRoute('/api/admin/dons/recu/456')).toBe(true)
      expect(isSuperviseurFinanceRoute('/api/admin/boutique')).toBe(true)
      expect(isSuperviseurFinanceRoute('/api/admin/boutique/commandes')).toBe(true)
      expect(isSuperviseurFinanceRoute('/api/admin/boutique/produits')).toBe(true)
      expect(isSuperviseurFinanceRoute('/api/admin/groupes/cout-saison')).toBe(true)
      expect(isSuperviseurFinanceRoute('/api/admin/database')).toBe(true)
      expect(isSuperviseurFinanceRoute('/api/admin/database/backups')).toBe(true)
    })

    it('autorise les routes opérationnelles nécessaires au superviseur', () => {
      expect(isSuperviseurFinanceRoute('/api/admin/groupes')).toBe(false)
      expect(isSuperviseurFinanceRoute('/api/admin/plannings')).toBe(false)
      expect(isSuperviseurFinanceRoute('/api/admin/tests-nage')).toBe(false)
      expect(isSuperviseurFinanceRoute('/api/admin/remplacements')).toBe(false)
      expect(isSuperviseurFinanceRoute('/api/admin/stages')).toBe(false)
      expect(isSuperviseurFinanceRoute('/api/admin/statistiques')).toBe(false)
      expect(isSuperviseurFinanceRoute('/api/admin/parametres')).toBe(false)
    })
  })

  describe('isSuperviseurBlockedUpload', () => {
    it('bloque les reçus fiscaux, factures, justificatifs et devis téléversés', () => {
      expect(isSuperviseurBlockedUpload('/uploads/recus/cerfa-2026-001.pdf')).toBe(true)
      expect(isSuperviseurBlockedUpload('/uploads/factures/facture-coach-01.pdf')).toBe(true)
      expect(isSuperviseurBlockedUpload('/uploads/justificatifs/facture-fournisseur.pdf')).toBe(true)
      expect(isSuperviseurBlockedUpload('/uploads/devis/devis-123.pdf')).toBe(true)
    })

    it('autorise les uploads publics ou opérationnels', () => {
      expect(isSuperviseurBlockedUpload('/uploads/photos/stage-ete.jpg')).toBe(false)
      expect(isSuperviseurBlockedUpload('/uploads/documents/statuts.pdf')).toBe(false)
    })
  })

  describe('maskSettingsForSuperviseur', () => {
    it('remplace les paramètres d argent et taux horaires par 0 / false', () => {
      const originalSettings = {
        nomClub: 'Triton Club Cavaillon',
        tauxHoraire: 35,
        forfaitCompetition: 150,
        nbCompetitionsAnnee: 20,
        nbDemiJourneesParCompetition: 2,
        forfaitRegionalActif: true,
        montantForfaitRegional: 50,
        reductionEnfantBureau: 50,
        soldeDepartSaison: 12000,
        debutCoursNormal: 'Lundi 21 Septembre 2026',
      }

      const masked = maskSettingsForSuperviseur(originalSettings)

      expect(masked.nomClub).toBe('Triton Club Cavaillon')
      expect(masked.debutCoursNormal).toBe('Lundi 21 Septembre 2026')
      expect(masked.tauxHoraire).toBe(0)
      expect(masked.forfaitCompetition).toBe(0)
      expect(masked.nbCompetitionsAnnee).toBe(0)
      expect(masked.nbDemiJourneesParCompetition).toBe(0)
      expect(masked.forfaitRegionalActif).toBe(false)
      expect(masked.montantForfaitRegional).toBe(0)
      expect(masked.reductionEnfantBureau).toBe(0)
      expect(masked.soldeDepartSaison).toBe(0)
    })
  })
})
