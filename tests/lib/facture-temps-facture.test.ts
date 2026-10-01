import { describe, expect, it, vi, beforeEach } from 'vitest'
import { formatMinutesEnHM } from '@/components/admin/PlanningFixeManager'
import { calculerFactureCoach } from '@/lib/facture-calculations'
import { prisma } from '@/lib/prisma'

vi.mock('@/lib/prisma', () => ({
  prisma: {
    settings: {
      findFirst: vi.fn(),
    },
    factureCoach: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
    },
    periodeVacances: {
      findMany: vi.fn(),
    },
    seanceAnnulee: {
      findMany: vi.fn(),
    },
    planning: {
      findMany: vi.fn(),
    },
    coach: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
    },
    remplacement: {
      findMany: vi.fn(),
    },
    evenementTournant: {
      findMany: vi.fn(),
    },
  },
}))

describe('Formatage du temps facturé en Heure / Minute', () => {
  it('formate correctement les durées en minutes', () => {
    expect(formatMinutesEnHM(45)).toBe('0h45')
    expect(formatMinutesEnHM(60)).toBe('1h00')
    expect(formatMinutesEnHM(75)).toBe('1h15')
    expect(formatMinutesEnHM(90)).toBe('1h30')
    expect(formatMinutesEnHM(105)).toBe('1h45')
    expect(formatMinutesEnHM(120)).toBe('2h00')
    expect(formatMinutesEnHM(0)).toBe('0h00')
    expect(formatMinutesEnHM(null)).toBe('0h00')
    expect(formatMinutesEnHM(undefined)).toBe('0h00')
  })
})

describe('Calcul de facture avec tempsFacture sur le planning', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(prisma.settings.findFirst).mockResolvedValue({
      tauxHoraire: 30,
      forfaitCompetition: 150,
      forfaitRegionalActif: false,
      montantForfaitRegional: 50,
      debutCoursNormal: '2026-09-01',
      debutCoursBnssa: null,
    } as any)
    vi.mocked(prisma.periodeVacances.findMany).mockResolvedValue([])
    vi.mocked(prisma.seanceAnnulee.findMany).mockResolvedValue([])
    vi.mocked(prisma.coach.findUnique).mockResolvedValue({ heuresAdminHebdo: 0 } as any)
    vi.mocked(prisma.remplacement.findMany).mockResolvedValue([])
    vi.mocked(prisma.evenementTournant.findMany).mockResolvedValue([])
  })

  it('utilise planning.tempsFacture si renseigné plutôt que l\'arrondi automatique', async () => {
    vi.mocked(prisma.factureCoach.findUnique).mockResolvedValue(null)
    vi.mocked(prisma.planning.findMany).mockResolvedValue([
      {
        id: 'plan-1',
        jourSemaine: 'Lundi',
        heureDebut: '17:15',
        heureFin: '18:00', // 45 min réelles, mais tempsFacture = 75 min (1h15 = 1.25h)
        tempsFacture: 75,
        semaineImpaire: false,
        groupeId: 'grp-1',
        groupe: { nom: 'Avenirs 1' },
      } as any,
    ])

    const res = await calculerFactureCoach('coach-1', 9, 2026)

    expect(res.lignesPlanningFixe.length).toBeGreaterThan(0)
    const ligne = res.lignesPlanningFixe[0]
    expect(ligne.description).toContain('(Facturé 1h15)')
    // 4 lundis en septembre 2026 -> 4 * 1.25h = 5.0h
    expect(ligne.heures).toBe(5)
    expect(ligne.montant).toBe(5 * 30) // 150€
  })

  it('se replie sur l\'arrondi à la demi-heure si tempsFacture est absent ou null', async () => {
    vi.mocked(prisma.factureCoach.findUnique).mockResolvedValue(null)
    vi.mocked(prisma.planning.findMany).mockResolvedValue([
      {
        id: 'plan-2',
        jourSemaine: 'Lundi',
        heureDebut: '17:15',
        heureFin: '18:00', // 45 min réelles -> arrondi à 1.0h
        tempsFacture: null,
        semaineImpaire: false,
        groupeId: 'grp-1',
        groupe: { nom: 'Avenirs 1' },
      } as any,
    ])

    const res = await calculerFactureCoach('coach-1', 9, 2026)

    expect(res.lignesPlanningFixe.length).toBeGreaterThan(0)
    const ligne = res.lignesPlanningFixe[0]
    expect(ligne.description).not.toContain('(Facturé')
    // 4 lundis * 1.0h = 4.0h
    expect(ligne.heures).toBe(4)
    expect(ligne.montant).toBe(4 * 30)
  })

  it('ne modifie PAS une facture déjà générée, envoyée ou payée', async () => {
    vi.mocked(prisma.factureCoach.findUnique).mockResolvedValue({
      id: 'facture-deja-generée',
      statut: 'generee',
      montantTotal: 420,
      lignes: [],
    } as any)
    vi.mocked(prisma.planning.findMany).mockResolvedValue([])

    const res = await calculerFactureCoach('coach-1', 9, 2026)

    expect(res.isBlocked).toBe(true)
    expect(res.statut).toBe('generee')
    expect(res.totalMontant).toBe(420) // Le montant d'origine est strictement conservé
    expect(res.message).toContain('déjà été générée')
  })
})
