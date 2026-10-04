import { describe, expect, it, vi, beforeEach } from 'vitest'
import { formatMinutesEnHM } from '@/components/admin/PlanningFixeManager'
import { calculerFactureCoach, formatHeuresEnHM, structurerFactureSections } from '@/lib/facture-calculations'
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

  it('se replie sur la durée réelle exacte sans arrondi si tempsFacture est absent ou null', async () => {
    vi.mocked(prisma.factureCoach.findUnique).mockResolvedValue(null)
    vi.mocked(prisma.planning.findMany).mockResolvedValue([
      {
        id: 'plan-2',
        jourSemaine: 'Lundi',
        heureDebut: '17:15',
        heureFin: '18:00', // 45 min réelles = 0.75h (plus d'arrondi automatique à 1h)
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
    // 4 lundis * 0.75h = 3.0h
    expect(ligne.heures).toBe(3)
    expect(ligne.montant).toBe(3 * 30)
  })

  it('ne modifie PAS une facture déjà envoyée au club ou payée', async () => {
    vi.mocked(prisma.factureCoach.findUnique).mockResolvedValue({
      id: 'facture-deja-envoyee',
      statut: 'envoyee',
      montantTotal: 420,
      lignes: [],
    } as any)
    vi.mocked(prisma.planning.findMany).mockResolvedValue([])

    const res = await calculerFactureCoach('coach-1', 9, 2026)

    expect(res.isBlocked).toBe(true)
    expect(res.statut).toBe('envoyee')
    expect(res.totalMontant).toBe(420) // Le montant d'origine est strictement conservé
    expect(res.message).toContain('transmise au club')
  })

  it('permet de recalculer et régénérer une facture au statut generee avant son envoi', async () => {
    vi.mocked(prisma.factureCoach.findUnique).mockResolvedValue({
      id: 'facture-generee-brouillon',
      statut: 'generee',
      montantTotal: 100, // Ancien montant avant ajout d'un créneau
      lignes: [],
    } as any)
    vi.mocked(prisma.planning.findMany).mockResolvedValue([
      {
        id: 'plan-regen',
        jourSemaine: 'Lundi',
        heureDebut: '18:00',
        heureFin: '19:00', // 60 min -> 4 lundis = 4h
        tempsFacture: 60,
        semaineImpaire: false,
        groupeId: 'grp-1',
        groupe: { nom: 'Groupe Test' },
      } as any,
    ])

    const res = await calculerFactureCoach('coach-1', 9, 2026)

    expect(res.isBlocked).toBe(false) // Non verrouillée avant envoi officiel
    expect(res.statut).toBe('generee')
    expect(res.totalMontant).toBe(4 * 30) // Recalculé à 120€ au lieu de rester figé à 100€
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

  it('neutralise le doublon quand un remplacement a lieu en même temps qu\'un cours régulier (Option B)', async () => {
    vi.mocked(prisma.factureCoach.findUnique).mockResolvedValue(null)
    // Coach a cours tous les lundis de 17:15 à 18:00 (tempsFacture = 60 min)
    vi.mocked(prisma.planning.findMany).mockResolvedValue([
      {
        id: 'plan-regulier',
        jourSemaine: 'Lundi',
        heureDebut: '17:15',
        heureFin: '18:00',
        tempsFacture: 60,
        semaineImpaire: false,
        groupeId: 'grp-avenirs',
        groupe: { nom: 'Avenirs 1' },
      } as any,
    ])

    // Le lundi 14/09/2026 de 17:15 à 18:00, le coach effectue un remplacement pour un collègue
    vi.mocked(prisma.remplacement.findMany).mockResolvedValueOnce([
      {
        id: 'remp-simultane',
        coachRemplaceId: 'coach-2',
        coachRemplacantId: 'coach-1',
        date: new Date('2026-09-14T12:00:00Z'),
        heureDebut: '17:15',
        heureFin: '18:00',
        motif: 'Absence maladie',
        coachRemplace: { prenom: 'Paul', nom: 'Dupont' },
      } as any,
    ]).mockResolvedValueOnce([]) // Aucun remplacement reçu (pas d'absence)

    const res = await calculerFactureCoach('coach-1', 9, 2026)

    // Le planning fixe compte les 4 lundis de 1.0h = 4.0h
    expect(res.lignesPlanningFixe).toHaveLength(1)
    expect(res.lignesPlanningFixe[0].heures).toBe(4)

    // La ligne de remplacement est affichée mais neutralisée à 0h et 0€ car déjà payée
    expect(res.lignesRemplacements).toHaveLength(1)
    const ligneRemp = res.lignesRemplacements[0]
    expect(ligneRemp.heures).toBe(0)
    expect(ligneRemp.montant).toBe(0)
    expect(ligneRemp.description).toContain('déjà rémunéré dans planning fixe')

    // Total d'heures du coach : 4.0h (et non 4.0h + 1.0h = 5.0h)
    expect(res.totalHeures).toBe(4)
    expect(res.totalMontant).toBe(4 * 30)
  })

  it('rémunère normalement un remplacement effectué sur une plage horaire différente sans chevauchement', async () => {
    vi.mocked(prisma.factureCoach.findUnique).mockResolvedValue(null)
    // Coach a cours les lundis de 17:15 à 18:00 (tempsFacture = 60 min)
    vi.mocked(prisma.planning.findMany).mockResolvedValue([
      {
        id: 'plan-regulier',
        jourSemaine: 'Lundi',
        heureDebut: '17:15',
        heureFin: '18:00',
        tempsFacture: 60,
        semaineImpaire: false,
        groupeId: 'grp-avenirs',
        groupe: { nom: 'Avenirs 1' },
      } as any,
    ])

    // Le lundi 14/09/2026, remplacement le soir de 19:30 à 21:00 (pas de cours régulier à cette heure)
    vi.mocked(prisma.remplacement.findMany).mockResolvedValueOnce([
      {
        id: 'remp-soir',
        coachRemplaceId: 'coach-2',
        coachRemplacantId: 'coach-1',
        date: new Date('2026-09-14T12:00:00Z'),
        heureDebut: '19:30',
        heureFin: '21:00',
        motif: 'Remplacement',
        coachRemplace: { prenom: 'Paul', nom: 'Dupont' },
      } as any,
    ]).mockResolvedValueOnce([])

    const res = await calculerFactureCoach('coach-1', 9, 2026)

    // Planning fixe = 4.0h
    expect(res.lignesPlanningFixe[0].heures).toBe(4)

    // Remplacement du soir rémunéré normalement (+1.5h)
    expect(res.lignesRemplacements).toHaveLength(1)
    expect(res.lignesRemplacements[0].heures).toBe(1.5)
    expect(res.lignesRemplacements[0].montant).toBe(1.5 * 30)

    // Total heures = 5.5h
    expect(res.totalHeures).toBe(5.5)
    expect(res.totalMontant).toBe(5.5 * 30)
  })
})

describe('Déductions proportionnelles des absences et calculs fiabilisés (Lot 1)', () => {
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
    vi.mocked(prisma.factureCoach.findUnique).mockResolvedValue(null)
    vi.mocked(prisma.evenementTournant.findMany).mockResolvedValue([])
  })

  it('Cas Lorenzo : créneau majoré 19:30-20:15 (45 min payées 1h), absence saisie 19:30-20:45 -> déduit exactement 1h (et non 1h30)', async () => {
    // Lorenzo a cours tous les mardis de 19:30 à 20:15 (45 min réelles, mais tempsFacture = 60 min)
    // 5 mardis en septembre 2026 (01, 08, 15, 22, 29) -> 5h payées
    vi.mocked(prisma.planning.findMany).mockResolvedValue([
      {
        id: 'plan-lorenzo',
        jourSemaine: 'Mardi',
        heureDebut: '19:30',
        heureFin: '20:15',
        tempsFacture: 60,
        semaineImpaire: false,
        groupeId: 'grp-aquafit',
        groupe: { nom: 'AquaFitness' },
        coachs: [{ coachId: 'lorenzo', coach: { prenom: 'Lorenzo' } }],
      } as any,
    ])

    // Absence déclarée le 29/09/2026 de 19:30 à 20:45 (1h15)
    vi.mocked(prisma.remplacement.findMany)
      .mockResolvedValueOnce([]) // Aucun remplacement effectué
      .mockResolvedValueOnce([   // Absence reçue
        {
          id: 'remp-lorenzo-abs',
          coachRemplaceId: 'lorenzo',
          coachRemplacantId: null,
          date: new Date('2026-09-29T12:00:00Z'),
          heureDebut: '19:30',
          heureFin: '20:45',
          motif: 'Raison personnelle',
          statut: 'sans_remplacant',
          coachRemplacant: null,
        } as any,
      ])

    const res = await calculerFactureCoach('lorenzo', 9, 2026)

    // Planning fixe = 5h
    expect(res.lignesPlanningFixe[0].heures).toBe(5)

    // Déduction d'absence = EXACTEMENT -1.0h (-30€), pas -1.5h (-45€) !
    expect(res.lignesAbsences).toHaveLength(1)
    const ligneAbs = res.lignesAbsences[0]
    expect(ligneAbs.heures).toBe(-1)
    expect(ligneAbs.montant).toBe(-30)
    expect(ligneAbs.description).toContain('(-1h00)')

    // Total net : 5h - 1h = 4h (120€)
    expect(res.totalHeures).toBe(4)
    expect(res.totalMontant).toBe(120)
  })

  it('Absence partielle sur créneau majoré : 19:30-20:15 (45 min payées 1h), absence saisie 19:30-19:45 (15 min) -> déduit 20 min', async () => {
    vi.mocked(prisma.planning.findMany).mockResolvedValue([
      {
        id: 'plan-majore',
        jourSemaine: 'Mardi',
        heureDebut: '19:30',
        heureFin: '20:15',
        tempsFacture: 60,
        semaineImpaire: false,
        groupeId: 'grp-aquafit',
        groupe: { nom: 'AquaFitness' },
        coachs: [{ coachId: 'coach-1', coach: { prenom: 'Coach' } }],
      } as any,
    ])

    // Absence 15 min pendant le créneau (15 / 45 * 60 = 20 min = 1/3h)
    vi.mocked(prisma.remplacement.findMany)
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        {
          id: 'remp-partiel-maj',
          coachRemplaceId: 'coach-1',
          coachRemplacantId: null,
          date: new Date('2026-09-29T12:00:00Z'),
          heureDebut: '19:30',
          heureFin: '19:45',
          motif: 'Retard',
          statut: 'sans_remplacant',
          coachRemplacant: null,
        } as any,
      ])

    const res = await calculerFactureCoach('coach-1', 9, 2026)

    expect(res.lignesAbsences).toHaveLength(1)
    const ligneAbs = res.lignesAbsences[0]
    expect(ligneAbs.heures).toBeCloseTo(-20 / 60, 4)
    expect(ligneAbs.montant).toBeCloseTo(-10, 2) // 20 min à 30€/h = 10€
    expect(ligneAbs.description).toContain('(-0h20)')
  })

  it('Absence partielle sur créneau standard : 19:30-21:00 (1h30), absence saisie 19:30-20:00 (30 min) -> déduit 30 min (-0.5h)', async () => {
    vi.mocked(prisma.planning.findMany).mockResolvedValue([
      {
        id: 'plan-std',
        jourSemaine: 'Mardi',
        heureDebut: '19:30',
        heureFin: '21:00',
        tempsFacture: 90,
        semaineImpaire: false,
        groupeId: 'grp-1',
        groupe: { nom: 'Adultes' },
        coachs: [{ coachId: 'coach-1', coach: { prenom: 'Coach' } }],
      } as any,
    ])

    vi.mocked(prisma.remplacement.findMany)
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        {
          id: 'remp-partiel-std',
          coachRemplaceId: 'coach-1',
          coachRemplacantId: null,
          date: new Date('2026-09-29T12:00:00Z'),
          heureDebut: '19:30',
          heureFin: '20:00',
          motif: 'Départ tôt',
          statut: 'sans_remplacant',
          coachRemplacant: null,
        } as any,
      ])

    const res = await calculerFactureCoach('coach-1', 9, 2026)

    expect(res.lignesAbsences).toHaveLength(1)
    const ligneAbs = res.lignesAbsences[0]
    expect(ligneAbs.heures).toBe(-0.5)
    expect(ligneAbs.montant).toBe(-15) // 0.5h * 30€ = 15€
    expect(ligneAbs.description).toContain('(-0h30)')
  })

  it('Absence sur 2 cours simultanés du même coach -> déduit une seule fois', async () => {
    // Coach gère Adultes Loisirs 1 et Adultes Loisirs 2 le mardi 19:30-21:00 (fusionnés en 1 créneau payé 1h30)
    vi.mocked(prisma.planning.findMany).mockResolvedValue([
      {
        id: 'plan-sim-1',
        jourSemaine: 'Mardi',
        heureDebut: '19:30',
        heureFin: '21:00',
        tempsFacture: 90,
        semaineImpaire: false,
        groupeId: 'grp-1',
        groupe: { nom: 'Adultes Loisirs 1' },
        coachs: [{ coachId: 'coach-1', coach: { prenom: 'Coach' } }],
      } as any,
      {
        id: 'plan-sim-2',
        jourSemaine: 'Mardi',
        heureDebut: '19:30',
        heureFin: '21:00',
        tempsFacture: 90,
        semaineImpaire: false,
        groupeId: 'grp-2',
        groupe: { nom: 'Adultes Loisirs 2' },
        coachs: [{ coachId: 'coach-1', coach: { prenom: 'Coach' } }],
      } as any,
    ])

    // Absence de 30 min (19:30-20:00)
    vi.mocked(prisma.remplacement.findMany)
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        {
          id: 'remp-abs-simultane',
          coachRemplaceId: 'coach-1',
          coachRemplacantId: null,
          date: new Date('2026-09-29T12:00:00Z'),
          heureDebut: '19:30',
          heureFin: '20:00',
          motif: 'Absence 30 min',
          statut: 'sans_remplacant',
          coachRemplacant: null,
        } as any,
      ])

    const res = await calculerFactureCoach('coach-1', 9, 2026)

    // Déduit UNE SEULE FOIS 30 min (-0.5h) et non 2 fois (-1.0h)
    expect(res.lignesAbsences).toHaveLength(1)
    expect(res.lignesAbsences[0].heures).toBe(-0.5)
    expect(res.lignesAbsences[0].montant).toBe(-15)
  })

  it('Absence déclarée hors de tout créneau planifié -> 0h déduite', async () => {
    vi.mocked(prisma.planning.findMany).mockResolvedValue([
      {
        id: 'plan-soir',
        jourSemaine: 'Mardi',
        heureDebut: '19:30',
        heureFin: '21:00',
        tempsFacture: 90,
        semaineImpaire: false,
        groupeId: 'grp-1',
        groupe: { nom: 'Adultes' },
        coachs: [{ coachId: 'coach-1', coach: { prenom: 'Coach' } }],
      } as any,
    ])

    // Absence saisie à 14:00-15:00 le mardi (aucun créneau à cette heure)
    vi.mocked(prisma.remplacement.findMany)
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        {
          id: 'remp-hors-creneau',
          coachRemplaceId: 'coach-1',
          coachRemplacantId: null,
          date: new Date('2026-09-29T12:00:00Z'),
          heureDebut: '14:00',
          heureFin: '15:00',
          motif: 'Rendez-vous après-midi',
          statut: 'sans_remplacant',
          coachRemplacant: null,
        } as any,
      ])

    const res = await calculerFactureCoach('coach-1', 9, 2026)

    expect(res.lignesAbsences).toHaveLength(1)
    const ligneAbs = res.lignesAbsences[0]
    expect(ligneAbs.heures).toBe(0)
    expect(ligneAbs.montant).toBe(0)
    expect(ligneAbs.description).toContain('Hors créneau planifié : 0h déduite')
  })

  it('Remplacement proportionnel : remplaçant d\'un créneau de 45 min payé 60 min effectue les 45 min -> payé 60 min (1h00)', async () => {
    // Le remplaçant n'a aucun cours régulier
    vi.mocked(prisma.planning.findMany)
      .mockResolvedValueOnce([]) // ses propres cours
      .mockResolvedValueOnce([   // cours du coach remplacé
        {
          id: 'plan-collegue',
          jourSemaine: 'Mardi',
          heureDebut: '19:30',
          heureFin: '20:15',
          tempsFacture: 60,
          coachs: [{ coachId: 'coach-collegue', coach: { prenom: 'Collègue' } }],
        } as any,
      ])

    vi.mocked(prisma.remplacement.findMany)
      .mockResolvedValueOnce([
        {
          id: 'remp-effectue-majore',
          coachRemplaceId: 'coach-collegue',
          coachRemplacantId: 'coach-remplacant',
          planningId: 'plan-collegue',
          date: new Date('2026-09-29T12:00:00Z'),
          heureDebut: '19:30',
          heureFin: '20:15',
          motif: 'Remplacement séance AquaFitness',
          coachRemplace: { id: 'coach-collegue', prenom: 'Paul', nom: 'Dupont' },
        } as any,
      ])
      .mockResolvedValueOnce([]) // pas d'absence pour le remplaçant

    const res = await calculerFactureCoach('coach-remplacant', 9, 2026)

    expect(res.lignesRemplacements).toHaveLength(1)
    const ligneRemp = res.lignesRemplacements[0]
    // 45 min effectuées sur créneau de 45 min payé 60 min -> payé 1h00 (30€)
    expect(ligneRemp.heures).toBe(1)
    expect(ligneRemp.montant).toBe(30)
    expect(ligneRemp.description).toContain('(1h00 facturées)')
  })
})

describe('Lot 7 — Lignes de facture lisibles et structurées (3 niveaux, absences imbriquées, sections)', () => {
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

  it('formatHeuresEnHM formate correctement les heures positives et négatives', () => {
    expect(formatHeuresEnHM(7.5)).toBe('7h30')
    expect(formatHeuresEnHM(1.5)).toBe('1h30')
    expect(formatHeuresEnHM(1.75)).toBe('1h45')
    expect(formatHeuresEnHM(0)).toBe('0h00')
    expect(formatHeuresEnHM(-1.5)).toBe('− 1h30')
    expect(formatHeuresEnHM(-1.0)).toBe('− 1h00')
    expect(formatHeuresEnHM(null)).toBe('0h00')
    expect(formatHeuresEnHM(undefined)).toBe('0h00')
  })

  it('génère les 3 niveaux et imbrique l\'absence sous le créneau régulier correspondant avec sous-total net', async () => {
    vi.mocked(prisma.factureCoach.findUnique).mockResolvedValue(null)
    vi.mocked(prisma.planning.findMany).mockResolvedValue([
      {
        id: 'plan-juniors',
        jourSemaine: 'Mardi',
        heureDebut: '19:30',
        heureFin: '21:00', // 1h30 = 90 min
        tempsFacture: 90,
        semaineImpaire: false,
        groupeId: 'grp-1',
        groupe: { nom: 'Juniors Compétition' },
        occupations: [],
      } as any,
    ])

    // Absence le mardi 29/09 sur ce créneau (piscine fermée)
    vi.mocked(prisma.remplacement.findMany)
      .mockResolvedValueOnce([]) // effectues
      .mockResolvedValueOnce([   // recus (absences)
        {
          id: 'remp-absence-29',
          coachRemplaceId: 'coach-1',
          coachRemplacantId: null,
          date: new Date('2026-09-29T12:00:00Z'),
          heureDebut: '19:30',
          heureFin: '21:00',
          motif: 'piscine fermée',
          coachRemplacant: null,
        } as any,
      ])

    const res = await calculerFactureCoach('coach-1', 9, 2026)

    // Vérifier la ligne du planning fixe
    expect(res.lignesPlanningFixe).toHaveLength(1)
    const ligneFixe = res.lignesPlanningFixe[0]
    expect(ligneFixe.titre).toBe('Juniors Compétition')
    expect(ligneFixe.sousTitre).toBe('Mardi 19:30 – 21:00')
    expect(ligneFixe.datesBadges).toEqual(['01/09', '08/09', '15/09', '22/09', '29/09'])
    expect(ligneFixe.detailCalculDuree).toBe('5 × 1h30 = 7h30')
    expect(ligneFixe.heures).toBe(7.5)
    expect(ligneFixe.montant).toBe(225)

    // Vérifier l'absence imbriquée sous ce créneau
    expect(ligneFixe.absencesAssociees).toBeDefined()
    expect(ligneFixe.absencesAssociees).toHaveLength(1)
    const absAssociee = ligneFixe.absencesAssociees![0]
    expect(absAssociee.date).toBe('29/09')
    expect(absAssociee.motif).toBe('piscine fermée')
    expect(absAssociee.heures).toBe(-1.5)
    expect(absAssociee.montant).toBe(-45)
    expect(absAssociee.texteDeduction).toBe('− 1h30')
    expect(absAssociee.description).toContain('↳ Absence 29/09 (piscine fermée)')

    // Vérifier les sections
    expect(res.sections).toBeDefined()
    const secPlanning = res.sections!.find((s) => s.id === 'planning_fixe')
    expect(secPlanning).toBeDefined()
    expect(secPlanning!.titre).toBe('PLANNING RÉGULIER')
    // Sous-total net : 7h30 - 1h30 = 6h00 (180 €)
    expect(secPlanning!.sousTotalHeures).toBe(6)
    expect(secPlanning!.sousTotalMontant).toBe(180)
    expect(secPlanning!.sousTotalDureeHM).toBe('6h00')

    // Total général du mois
    expect(res.totalHeures).toBe(6)
    expect(res.totalMontant).toBe(180)
  })

  it('affiche les occupations / espaces multiples dans le sous-titre de la séance', async () => {
    vi.mocked(prisma.factureCoach.findUnique).mockResolvedValue(null)
    vi.mocked(prisma.planning.findMany).mockResolvedValue([
      {
        id: 'plan-synchro',
        jourSemaine: 'Vendredi',
        heureDebut: '18:15',
        heureFin: '20:00', // 1h45 = 105 min
        tempsFacture: 105,
        semaineImpaire: false,
        groupe: { nom: 'Natation Artistique' },
        occupations: [
          { espace: 'PPG' },
          { espace: 'Petit Bassin' },
          { espace: 'Lignes 1-4' },
        ],
      } as any,
    ])

    const res = await calculerFactureCoach('coach-claire', 9, 2026)

    expect(res.lignesPlanningFixe).toHaveLength(1)
    const ligne = res.lignesPlanningFixe[0]
    expect(ligne.titre).toBe('Natation Artistique')
    expect(ligne.sousTitre).toBe('Vendredi 18:15 – 20:00 · PPG, Petit Bassin, Lignes 1-4')
    expect(ligne.espaces).toEqual(['PPG', 'Petit Bassin', 'Lignes 1-4'])
  })

  it('structure les remplacements et les sections avec sous-totaux cohérents', async () => {
    vi.mocked(prisma.factureCoach.findUnique).mockResolvedValue({
      id: 'fact-1',
      statut: 'brouillon',
      lignes: [
        {
          id: 'lig-comp',
          type: 'competition',
          description: 'Championnat Régional PACA',
          lieu: 'Avignon',
          date: new Date('2026-09-20'),
          demiJournees: 2,
          montant: 130,
        },
        {
          id: 'lig-transport',
          type: 'forfait_transport',
          description: 'Déplacement Avignon',
          lieu: 'Avignon',
          date: new Date('2026-09-20'),
          heures: 40,
          montant: 24,
        },
      ],
    } as any)

    vi.mocked(prisma.planning.findMany)
      .mockResolvedValueOnce([]) // planning du coach
      .mockResolvedValueOnce([   // planning du coach remplacé
        {
          id: 'plan-flo',
          jourSemaine: 'Lundi',
          heureDebut: '19:30',
          heureFin: '21:00',
          tempsFacture: 90,
          groupe: { nom: 'Adultes Compétition' },
          coachs: [{ coachId: 'coach-flo' }],
        } as any,
      ])

    vi.mocked(prisma.remplacement.findMany)
      .mockResolvedValueOnce([
        {
          id: 'remp-flo',
          coachRemplaceId: 'coach-flo',
          coachRemplacantId: 'coach-1',
          date: new Date('2026-09-21T12:00:00Z'),
          heureDebut: '19:30',
          heureFin: '21:00',
          coachRemplace: { prenom: 'Florian', nom: 'Di-Giusto' },
        } as any,
      ])
      .mockResolvedValueOnce([])

    const res = await calculerFactureCoach('coach-1', 9, 2026)

    // Vérifier la ligne de remplacement
    expect(res.lignesRemplacements).toHaveLength(1)
    const remp = res.lignesRemplacements[0]
    expect(remp.titre).toBe('Adultes Compétition — pour Florian Di-Giusto')
    expect(remp.detailCalculDuree).toBe('1h30')
    expect(remp.datesBadges).toEqual(['21/09'])
    expect(remp.heures).toBe(1.5)
    expect(remp.montant).toBe(45)

    // Vérifier les sections générées
    expect(res.sections).toBeDefined()
    const secRemp = res.sections!.find((s) => s.id === 'remplacements')
    expect(secRemp).toBeDefined()
    expect(secRemp!.sousTotalHeures).toBe(1.5)
    expect(secRemp!.sousTotalMontant).toBe(45)
    expect(secRemp!.sousTotalDureeHM).toBe('1h30')

    const secComp = res.sections!.find((s) => s.id === 'competitions')
    expect(secComp).toBeDefined()
    expect(secComp!.sousTotalMontant).toBe(154) // 130 + 24

    // Total montant = 45 + 154 = 199 €
    expect(res.totalMontant).toBe(199)
    expect(res.totalHeures).toBe(1.5)
  })
})

