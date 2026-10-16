import { describe, it, expect, vi } from 'vitest'
import { analyserControleMois } from '@/lib/services/facture-controle-service'
import { FactureCoachDetails } from '@/lib/facture-calculations'

// Mock prisma
vi.mock('@/lib/prisma', () => ({
  prisma: {
    planning: {
      findMany: vi.fn().mockResolvedValue([]),
    },
  },
}))

describe('Service Contrôle du mois - Détection des anomalies et points de vigilance', () => {
  const baseDetails: FactureCoachDetails = {
    mois: 9,
    annee: 2026,
    tauxHoraire: 30,
    forfaitDemiJournee: 50,
    forfaitRegionalActif: true,
    montantForfaitRegional: 50,
    lignesPlanningFixe: [],
    lignesPlanningTournant: [],
    lignesRemplacements: [],
    lignesAbsences: [],
    lignesManuelles: [],
    totalHeures: 10,
    totalMontant: 300,
    joursTravailles: [1, 8, 15, 22, 29],
  }

  it('détecte une absence orpheline sans créneau de cours correspondant', async () => {
    const details: FactureCoachDetails = {
      ...baseDetails,
      lignesAbsences: [
        {
          type: 'absence',
          description: 'Absence 17/09',
          heures: -1.5,
          montant: -45,
          date: new Date('2026-09-17'),
          estAbsenceOrpheline: true,
        },
      ],
    }

    const anomalies = await analyserControleMois('coach-1', 9, 2026, details)
    const orpheline = anomalies.find((a) => a.code === 'ABSENCE_ORPHELINE')
    expect(orpheline).toBeDefined()
    expect(orpheline?.severite).toBe('warning')
    expect(orpheline?.titre).toContain('Absence sans créneau correspondant')
  })

  it('détecte une absence dont la durée déclarée dépasse la durée du cours', async () => {
    const details: FactureCoachDetails = {
      ...baseDetails,
      lignesPlanningFixe: [
        {
          type: 'planning_fixe',
          description: 'AquaFitness 19:30-20:15',
          heures: 4,
          montant: 120,
          dureeUnitaireMinutes: 45,
          absencesAssociees: [
            {
              date: '29/09',
              dateComplete: '2026-09-29',
              type: 'absence',
              heures: -1,
              montant: -30,
              minutes: 75, // 1h15 déclarée sur un cours de 45 min
              texteDeduction: '− 1h',
              description: '↳ Absence 29/09',
            },
          ],
        },
      ],
    }

    const anomalies = await analyserControleMois('coach-1', 9, 2026, details)
    const tropLongue = anomalies.find((a) => a.code === 'ABSENCE_TROP_LONGUE')
    expect(tropLongue).toBeDefined()
    expect(tropLongue?.description).toContain('75 min')
    expect(tropLongue?.description).toContain('45 min')
  })

  it('détecte un remplacement simultané rémunéré à 0 €', async () => {
    const details: FactureCoachDetails = {
      ...baseDetails,
      lignesRemplacements: [
        {
          type: 'remplacement',
          description: 'Remplacement Benjamins',
          heures: 0,
          montant: 0,
          noteInfo: 'déjà payé (cours simultané)',
          date: new Date('2026-09-23'),
        },
      ],
    }

    const anomalies = await analyserControleMois('coach-1', 9, 2026, details)
    const simultane = anomalies.find((a) => a.code === 'REMPLACEMENT_SIMULTANE')
    expect(simultane).toBeDefined()
    expect(simultane?.titre).toContain('Remplacement simultané')
  })

  it('signale les séances annulées par le club', async () => {
    const details: FactureCoachDetails = {
      ...baseDetails,
      lignesPlanningFixe: [
        {
          type: 'planning_fixe',
          description: 'Juniors Compétition',
          heures: 6,
          montant: 180,
          absencesAssociees: [
            {
              date: '28/09',
              dateComplete: '2026-09-28',
              type: 'annulation',
              heures: -1.5,
              montant: -45,
              minutes: 90,
              texteDeduction: '− 1h30',
              description: '↳ Séance annulée 28/09 (piscine fermée)',
            },
          ],
        },
      ],
    }

    const anomalies = await analyserControleMois('coach-1', 9, 2026, details)
    const annulation = anomalies.find((a) => a.code === 'SEANCE_ANNULEE_CLUB')
    expect(annulation).toBeDefined()
    expect(annulation?.severite).toBe('info')
  })

  it('détecte une compétition régionale sans forfait transport associé', async () => {
    const details: FactureCoachDetails = {
      ...baseDetails,
      lignesManuelles: [
        {
          type: 'competition',
          description: 'Compétition Régionale : Championnats PACA (Antibes)',
          lieu: 'Antibes (06)',
          heures: 1,
          montant: 50,
          date: new Date('2026-09-20'),
        },
        // Aucun forfait transport
      ],
    }

    const anomalies = await analyserControleMois('coach-1', 9, 2026, details)
    const compSansTransport = anomalies.find((a) => a.code === 'COMPETITION_SANS_TRANSPORT')
    expect(compSansTransport).toBeDefined()
    expect(compSansTransport?.severite).toBe('warning')
  })

  it('retourne 0 anomalie sur une facture standard parfaitement conforme', async () => {
    const details: FactureCoachDetails = {
      ...baseDetails,
      lignesPlanningFixe: [
        {
          type: 'planning_fixe',
          description: 'Juniors Compétition',
          heures: 7.5,
          montant: 225,
          dureeUnitaireMinutes: 90,
          nbSeances: 5,
        },
      ],
    }

    const anomalies = await analyserControleMois('coach-1', 9, 2026, details)
    expect(anomalies).toHaveLength(0)
  })

  it('signale une demande de remplacement encore en attente d acceptation (REMPLACEMENT_EN_ATTENTE)', async () => {
    const details: FactureCoachDetails = {
      ...baseDetails,
      lignesPlanningFixe: [
        {
          type: 'planning_fixe',
          description: 'Juniors Compétition',
          heures: 6,
          montant: 180,
          dureeUnitaireMinutes: 90,
          absencesAssociees: [
            {
              date: '15/09',
              dateComplete: '2026-09-15',
              type: 'absence',
              enAttente: true,
              heures: -1.5,
              montant: -45,
              minutes: 90,
              texteDeduction: '− 1h30',
              description: '↳ Absence 15/09',
            },
          ],
        },
      ],
    }

    const anomalies = await analyserControleMois('coach-1', 9, 2026, details)
    const enAttente = anomalies.find((a) => a.code === 'REMPLACEMENT_EN_ATTENTE')
    expect(enAttente).toBeDefined()
    expect(enAttente?.severite).toBe('warning')
    expect(enAttente?.titre).toContain('Demande de remplacement en attente')
  })
})
