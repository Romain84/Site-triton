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

  it('fusionne 2 groupes gérés en même temps par un coach et ne paye qu\'une seule fois', async () => {
    vi.mocked(prisma.factureCoach.findUnique).mockResolvedValue(null)
    // Le coach gère Adultes Loisirs 1 et Adultes Loisirs 2 le même jour et à la même heure
    vi.mocked(prisma.planning.findMany).mockResolvedValue([
      {
        id: 'plan-g1',
        jourSemaine: 'Mercredi',
        heureDebut: '19:30',
        heureFin: '21:00', // 1h30
        tempsFacture: null,
        semaineImpaire: false,
        groupeId: 'grp-1',
        groupe: { nom: 'Adultes Loisirs 1' },
      } as any,
      {
        id: 'plan-g2',
        jourSemaine: 'Mercredi',
        heureDebut: '19:30',
        heureFin: '21:00', // 1h30
        tempsFacture: null,
        semaineImpaire: false,
        groupeId: 'grp-2',
        groupe: { nom: 'Adultes Loisirs 2' },
      } as any,
    ])

    const res = await calculerFactureCoach('coach-1', 9, 2026)

    // Doit générer 1 SEULE ligne regroupant les 2 groupes, et facturer 1.5h par date (5 mercredis en sept 2026 = 7.5h)
    // et NON PAS 2 lignes (7.5h + 7.5h = 15h)
    expect(res.lignesPlanningFixe).toHaveLength(1)
    const ligne = res.lignesPlanningFixe[0]
    expect(ligne.description).toContain('Adultes Loisirs 1')
    expect(ligne.description).toContain('Adultes Loisirs 2')
    // 5 mercredis en septembre 2026 * 1.5h = 7.5h
    expect(ligne.heures).toBe(7.5)
    expect(ligne.montant).toBe(7.5 * 30) // 225€ (et non 450€)
  })

  it('fusionne 2 groupes qui se chevauchent (ex: 19:30-20:30 et 19:30-21:00) et ne paye qu\'une seule fois pour la plage totale', async () => {
    vi.mocked(prisma.factureCoach.findUnique).mockResolvedValue(null)
    // Cas de Fabien Chastan : Juniors Loisirs (19:30-20:30) et Adultes Loisirs 2 (19:30-21:00)
    vi.mocked(prisma.planning.findMany).mockResolvedValue([
      {
        id: 'plan-fabien-1',
        jourSemaine: 'Jeudi',
        heureDebut: '19:30',
        heureFin: '20:30', // 1h
        tempsFacture: null,
        semaineImpaire: false,
        groupeId: 'grp-juniors',
        groupe: { nom: 'Juniors Loisirs' },
      } as any,
      {
        id: 'plan-fabien-2',
        jourSemaine: 'Jeudi',
        heureDebut: '19:30',
        heureFin: '21:00', // 1h30
        tempsFacture: null,
        semaineImpaire: false,
        groupeId: 'grp-adultes',
        groupe: { nom: 'Adultes Loisirs 2' },
      } as any,
    ])

    const res = await calculerFactureCoach('coach-1', 9, 2026)

    // Fusion en un créneau unique 19:30-21:00 (1.5h)
    expect(res.lignesPlanningFixe).toHaveLength(1)
    const ligne = res.lignesPlanningFixe[0]
    expect(ligne.description).toContain('19:30-21:00')
    expect(ligne.description).toContain('Adultes Loisirs 2')
    expect(ligne.description).toContain('Juniors Loisirs')
    // 4 jeudis en septembre 2026 * 1.5h = 6h (et non 4h + 6h = 10h)
    expect(ligne.heures).toBe(6)
    expect(ligne.montant).toBe(6 * 30)
  })

  it('applique le tempsFacture personnalisé sur le créneau fusionné multi-groupes', async () => {
    vi.mocked(prisma.factureCoach.findUnique).mockResolvedValue(null)
    // L\'admin a ajusté le temps facturé à 75 min (1h15) sur l'un des plannings
    vi.mocked(prisma.planning.findMany).mockResolvedValue([
      {
        id: 'plan-multi-1',
        jourSemaine: 'Mercredi',
        heureDebut: '14:30',
        heureFin: '15:30',
        tempsFacture: 75, // 1h15
        semaineImpaire: false,
        groupeId: 'grp-1',
        groupe: { nom: 'Jeunes Loisirs' },
      } as any,
      {
        id: 'plan-multi-2',
        jourSemaine: 'Mercredi',
        heureDebut: '14:30',
        heureFin: '15:30',
        tempsFacture: null,
        semaineImpaire: false,
        groupeId: 'grp-2',
        groupe: { nom: 'Natation Artistique' },
      } as any,
    ])

    const res = await calculerFactureCoach('coach-1', 9, 2026)

    expect(res.lignesPlanningFixe).toHaveLength(1)
    const ligne = res.lignesPlanningFixe[0]
    expect(ligne.description).toContain('(Facturé 1h15)')
    // 5 mercredis * 1.25h = 6.25h (payé 1 fois pour les 2 groupes)
    expect(ligne.heures).toBe(6.25)
    expect(ligne.montant).toBe(6.25 * 30)
  })

  it('ne fusionne PAS deux séances consécutives distinctes', async () => {
    vi.mocked(prisma.factureCoach.findUnique).mockResolvedValue(null)
    // Séances consécutives : 18:45-19:30 puis 19:30-21:00
    vi.mocked(prisma.planning.findMany).mockResolvedValue([
      {
        id: 'plan-c1',
        jourSemaine: 'Mardi',
        heureDebut: '18:45',
        heureFin: '19:30', // 45 min -> arrondi 1.0h
        tempsFacture: null,
        semaineImpaire: false,
        groupeId: 'grp-ppg',
        groupe: { nom: 'PPG' },
      } as any,
      {
        id: 'plan-c2',
        jourSemaine: 'Mardi',
        heureDebut: '19:30',
        heureFin: '21:00', // 1h30
        tempsFacture: null,
        semaineImpaire: false,
        groupeId: 'grp-comp',
        groupe: { nom: 'Adultes Compétition' },
      } as any,
    ])

    const res = await calculerFactureCoach('coach-1', 9, 2026)

    // Les deux cours se suivent et ne se chevauchent pas : 2 lignes séparées payées
    expect(res.lignesPlanningFixe).toHaveLength(2)
  })
})
