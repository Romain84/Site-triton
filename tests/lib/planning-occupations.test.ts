import { describe, it, expect } from 'vitest'
import {
  sanitizeOccupations,
  calculerAmplitude,
  eclaterParOccupation,
  libelleOccupations,
} from '@/lib/planning-occupations'

describe('planning-occupations', () => {
  describe('sanitizeOccupations', () => {
    it('ignore les entrées invalides ou inversées', () => {
      const input = [
        { espace: 'Ligne 1', heureDebut: '19:00', heureFin: '20:00' },
        { espace: '', heureDebut: '19:00', heureFin: '20:00' }, // espace vide
        { espace: 'Ligne 2', heureDebut: '20:00', heureFin: '19:00' }, // début après fin
        { espace: 'Ligne 3', heureDebut: '19:00', heureFin: '19:00' }, // début = fin
        { espace: 'Ligne 4', heureDebut: 'bad', heureFin: '20:00' }, // format invalide
        { espace: 'Ligne 1', heureDebut: '19:00', heureFin: '20:00' }, // doublon exact
      ]
      const sanitized = sanitizeOccupations(input)
      expect(sanitized).toEqual([
        { espace: 'Ligne 1', heureDebut: '19:00', heureFin: '20:00' },
      ])
    })
  })

  describe('calculerAmplitude', () => {
    it('calcule la plage englobante de plusieurs occupations', () => {
      const occupations = [
        { espace: 'PPG', heureDebut: '18:15', heureFin: '19:00' },
        { espace: 'Petit Bassin', heureDebut: '19:00', heureFin: '20:00' },
        { espace: 'Grand Bassin - Ligne 1', heureDebut: '19:15', heureFin: '20:00' },
      ]
      const amplitude = calculerAmplitude(occupations)
      expect(amplitude).toEqual({ heureDebut: '18:15', heureFin: '20:00' })
    })

    it('retourne null si aucune occupation', () => {
      expect(calculerAmplitude([])).toBeNull()
    })
  })

  describe('eclaterParOccupation', () => {
    it('éclate une séance multi-espaces en plusieurs entrées pour la grille', () => {
      const seance = {
        id: 'plan-1',
        lieu: 'Piscine',
        heureDebut: '18:15',
        heureFin: '20:00',
        occupations: [
          { espace: 'PPG', heureDebut: '18:15', heureFin: '19:00' },
          { espace: 'Petit Bassin', heureDebut: '19:00', heureFin: '20:00' },
        ],
      }
      const eclates = eclaterParOccupation([seance])
      expect(eclates).toHaveLength(2)
      expect(eclates[0]).toMatchObject({
        id: 'plan-1',
        lieu: 'PPG',
        heureDebut: '18:15',
        heureFin: '19:00',
        planningSourceId: 'plan-1',
      })
      expect(eclates[1]).toMatchObject({
        id: 'plan-1__1',
        lieu: 'Petit Bassin',
        heureDebut: '19:00',
        heureFin: '20:00',
        planningSourceId: 'plan-1',
      })
    })

    it('conserve une séance mono-espace telle quelle', () => {
      const seance = {
        id: 'plan-mono',
        lieu: 'Grand Bassin - Ligne 1',
        heureDebut: '19:00',
        heureFin: '20:00',
        occupations: [],
      }
      const eclates = eclaterParOccupation([seance])
      expect(eclates).toHaveLength(1)
      expect(eclates[0].planningSourceId).toBe('plan-mono')
    })
  })

  describe('libelleOccupations', () => {
    it('formate correctement une séance complexe (Natation Artistique)', () => {
      const seance = {
        id: '1',
        lieu: 'Piscine',
        heureDebut: '18:15',
        heureFin: '20:00',
        occupations: [
          { espace: 'PPG', heureDebut: '18:15', heureFin: '19:00' },
          { espace: 'Petit Bassin', heureDebut: '19:00', heureFin: '20:00' },
          { espace: 'Grand Bassin - Ligne 1', heureDebut: '19:15', heureFin: '20:00' },
          { espace: 'Grand Bassin - Ligne 2', heureDebut: '19:15', heureFin: '20:00' },
          { espace: 'Grand Bassin - Ligne 3', heureDebut: '19:15', heureFin: '20:00' },
          { espace: 'Grand Bassin - Ligne 4', heureDebut: '19:15', heureFin: '20:00' },
        ],
      }
      const libelle = libelleOccupations(seance)
      expect(libelle).toBe('PPG 18:15-19:00 · Petit Bassin 19:00-20:00 · Lignes 1-4 19:15-20:00')
    })

    it('omet les horaires si tous les espaces partagent les horaires globaux', () => {
      const seance = {
        id: '2',
        lieu: 'Piscine',
        heureDebut: '18:00',
        heureFin: '19:30',
        occupations: [
          { espace: 'Grand Bassin - Ligne 3', heureDebut: '18:00', heureFin: '19:30' },
          { espace: 'Grand Bassin - Ligne 4', heureDebut: '18:00', heureFin: '19:30' },
        ],
      }
      const libelle = libelleOccupations(seance)
      expect(libelle).toBe('Lignes 3-4')
    })
  })
})
