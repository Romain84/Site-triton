import { describe, expect, it, vi, beforeEach } from 'vitest'
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

describe('Lot 2 — Gestion des séances annulées par le club (Piscine fermée, etc.)', () => {
  const coachId = 'coach-1'

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(prisma.settings.findFirst).mockResolvedValue({
      tauxHoraire: 30, // 30 €/h
      forfaitCompetition: 150,
      forfaitRegionalActif: false,
      montantForfaitRegional: 50,
      debutCoursNormal: '2026-09-01',
      debutCoursBnssa: null,
    } as any)
    vi.mocked(prisma.periodeVacances.findMany).mockResolvedValue([])
    vi.mocked(prisma.coach.findUnique).mockResolvedValue({ heuresAdminHebdo: 0 } as any)
    vi.mocked(prisma.factureCoach.findUnique).mockResolvedValue(null)
    vi.mocked(prisma.evenementTournant.findMany).mockResolvedValue([])
    vi.mocked(prisma.remplacement.findMany).mockResolvedValue([])
  })

  it('déduit exactement le tempsFacture d\'une séance annulée pour fermeture générale du club', async () => {
    // Mardi 19:30-21:00 (1h30, tempsFacture = 90 min)
    // En septembre 2026, il y a 5 mardis (01, 08, 15, 22, 29) -> 5 * 1.5h = 7.5h (225 €)
    vi.mocked(prisma.planning.findMany).mockResolvedValue([
      {
        id: 'plan-mardi',
        jourSemaine: 'Mardi',
        heureDebut: '19:30',
        heureFin: '21:00',
        tempsFacture: 90,
        semaineImpaire: false,
        actif: true,
        groupeId: 'grp-juniors',
        groupe: { id: 'grp-juniors', nom: 'Juniors Compétition' },
        coachs: [{ coachId, coach: { id: coachId, prenom: 'Claire' } }],
        occupations: [],
      } as any,
    ])

    // Annulation générale le mardi 29/09/2026 : piscine fermée
    vi.mocked(prisma.seanceAnnulee.findMany).mockResolvedValue([
      {
        id: 'annul-29',
        date: new Date('2026-09-29T12:00:00.000Z'),
        motif: 'Piscine fermée (panne technique)',
        planningId: null,
        groupeId: null,
        coachId: null,
      } as any,
    ])

    const res = await calculerFactureCoach(coachId, 9, 2026)

    // 1. Planning fixe conserve ses 5 occurrences au calendrier (7.5h = 225€)
    expect(res.lignesPlanningFixe.length).toBe(1)
    const ligneFixe = res.lignesPlanningFixe[0]
    expect(ligneFixe.heures).toBe(7.5)
    expect(ligneFixe.montant).toBe(225)
    expect(ligneFixe.datesBadges).toEqual(['01/09', '08/09', '15/09', '22/09', '29/09'])

    // 2. La déduction d'annulation est générée dans lignesAbsences
    expect(res.lignesAbsences.length).toBe(1)
    const ligneAnnul = res.lignesAbsences[0]
    expect(ligneAnnul.heures).toBe(-1.5) // Exactement -1h30 déduit
    expect(ligneAnnul.montant).toBe(-45) // -45 € (1.5h * 30€/h)
    expect(ligneAnnul.description).toContain('Séance annulée (Piscine fermée (panne technique))')

    // 3. Imbrication directe sous la séance (Lot 7)
    expect(ligneFixe.absencesAssociees).toBeDefined()
    expect(ligneFixe.absencesAssociees?.length).toBe(1)
    const absAssoc = ligneFixe.absencesAssociees![0]
    expect(absAssoc.type).toBe('annulation')
    expect(absAssoc.heures).toBe(-1.5)
    expect(absAssoc.montant).toBe(-45)
    expect(absAssoc.texteDeduction).toBe('− 1h30')
    expect(absAssoc.description).toContain('↳ Séance annulée 29/09')

    // 4. Totaux nets : 7.5h - 1.5h = 6.0h (180 €)
    expect(res.totalHeures).toBe(6)
    expect(res.totalMontant).toBe(180)

    // 5. Sous-total de la section PLANNING RÉGULIER net
    const sectionFixe = res.sections?.find((s) => s.id === 'planning_fixe')
    expect(sectionFixe).toBeDefined()
    expect(sectionFixe?.sousTotalHeures).toBe(6)
    expect(sectionFixe?.sousTotalMontant).toBe(180)
    expect(sectionFixe?.sousTotalDureeHM).toBe('6h00')
  })

  it('déduit le tempsFacture majoré (cas Lorenzo 45 min facturées 1h)', async () => {
    // Lorenzo : AquaFitness le mardi 19:30-20:15 (45 min réelles mais tempsFacture = 60 min)
    // 5 mardis en septembre -> 5 * 1h = 5h
    vi.mocked(prisma.planning.findMany).mockResolvedValue([
      {
        id: 'plan-lorenzo',
        jourSemaine: 'Mardi',
        heureDebut: '19:30',
        heureFin: '20:15',
        tempsFacture: 60, // 1h facturée
        semaineImpaire: false,
        actif: true,
        groupeId: 'grp-aquafit',
        groupe: { id: 'grp-aquafit', nom: 'AquaFitness' },
        coachs: [{ coachId, coach: { id: coachId, prenom: 'Lorenzo' } }],
        occupations: [],
      } as any,
    ])

    // Annulation du mardi 29/09
    vi.mocked(prisma.seanceAnnulee.findMany).mockResolvedValue([
      {
        id: 'annul-29',
        date: new Date('2026-09-29T12:00:00.000Z'),
        motif: 'Vidange bassin',
        planningId: 'plan-lorenzo',
        groupeId: null,
        coachId: null,
      } as any,
    ])

    const res = await calculerFactureCoach(coachId, 9, 2026)

    // Doit déduire exactement 1h (tempsFacture = 60 min), pas 45 min ni 1h30
    expect(res.lignesAbsences.length).toBe(1)
    const ligneAnnul = res.lignesAbsences[0]
    expect(ligneAnnul.heures).toBe(-1)
    expect(ligneAnnul.montant).toBe(-30) // 1h * 30€/h

    // Total net : 5h - 1h = 4h
    expect(res.totalHeures).toBe(4)
    expect(res.totalMontant).toBe(120)
  })

  it('ne déduit qu\'une seule fois lors de cours simultanés pour le même coach', async () => {
    // Le même coach a deux groupes en même temps : 19:30 - 21:00 (fusionnés en une séance payée 1h30)
    vi.mocked(prisma.planning.findMany).mockResolvedValue([
      {
        id: 'plan-g1',
        jourSemaine: 'Mardi',
        heureDebut: '19:30',
        heureFin: '21:00',
        tempsFacture: 90,
        semaineImpaire: false,
        actif: true,
        groupeId: 'grp-b1',
        groupe: { id: 'grp-b1', nom: 'Benjamins 1' },
        coachs: [{ coachId, coach: { id: coachId, prenom: 'Claire' } }],
      } as any,
      {
        id: 'plan-g2',
        jourSemaine: 'Mardi',
        heureDebut: '19:30',
        heureFin: '21:00',
        tempsFacture: 90,
        semaineImpaire: false,
        actif: true,
        groupeId: 'grp-juniors',
        groupe: { id: 'grp-juniors', nom: 'Juniors Compétition' },
        coachs: [{ coachId, coach: { id: coachId, prenom: 'Claire' } }],
      } as any,
    ])

    // Annulation générale le 29/09
    vi.mocked(prisma.seanceAnnulee.findMany).mockResolvedValue([
      {
        id: 'annul-general',
        date: new Date('2026-09-29T12:00:00.000Z'),
        motif: 'Piscine fermée',
        planningId: null,
        groupeId: null,
        coachId: null,
      } as any,
    ])

    const res = await calculerFactureCoach(coachId, 9, 2026)

    // Cours fusionné : 7.5h scheduled
    expect(res.lignesPlanningFixe.length).toBe(1)
    expect(res.lignesPlanningFixe[0].heures).toBe(7.5)

    // L'annulation ne doit déduire qu'une seule fois 1.5h (pas 2 * 1.5h = 3.0h)
    expect(res.lignesAbsences.length).toBe(1)
    expect(res.lignesAbsences[0].heures).toBe(-1.5)
    expect(res.totalHeures).toBe(6)
    expect(res.totalMontant).toBe(180)
  })

  it('ne pénalise pas doublement le coach s\'il avait aussi posé une absence le jour où le club a annulé la séance', async () => {
    vi.mocked(prisma.planning.findMany).mockResolvedValue([
      {
        id: 'plan-mardi',
        jourSemaine: 'Mardi',
        heureDebut: '19:30',
        heureFin: '21:00',
        tempsFacture: 90,
        semaineImpaire: false,
        actif: true,
        groupeId: 'grp-juniors',
        groupe: { id: 'grp-juniors', nom: 'Juniors' },
        coachs: [{ coachId, coach: { id: coachId, prenom: 'Claire' } }],
      } as any,
    ])

    // 1. Séance annulée par le club le 29/09
    vi.mocked(prisma.seanceAnnulee.findMany).mockResolvedValue([
      {
        id: 'annul-club',
        date: new Date('2026-09-29T12:00:00.000Z'),
        motif: 'Piscine fermée',
        planningId: null,
        groupeId: null,
        coachId: null,
      } as any,
    ])

    // 2. Le coach avait aussi déclaré une absence le 29/09 de 19:30 à 21:00
    vi.mocked(prisma.remplacement.findMany).mockResolvedValue([
      {
        id: 'remp-absence-coach',
        coachRemplaceId: coachId,
        coachRemplacantId: null,
        date: new Date('2026-09-29T12:00:00.000Z'),
        heureDebut: '19:30',
        heureFin: '21:00',
        statut: 'sans_remplacant',
        motif: 'Déplacement personnel',
        coachRemplacant: null,
      } as any,
    ])

    const res = await calculerFactureCoach(coachId, 9, 2026)

    // La séance étant déjà déduite pour fermeture club, l'absence coach ne doit PAS déduire 1h30 supplémentaire !
    // Total déduit = 1.5h (et non 3h)
    const totalDeductionsHeures = res.lignesAbsences.reduce((sum, l) => sum + Math.abs(l.heures), 0)
    expect(totalDeductionsHeures).toBe(1.5)
    expect(res.totalHeures).toBe(6) // 7.5h - 1.5h = 6h
  })

  it('ne rémunère pas un coach remplaçant si la séance qu\'il devait remplacer a été annulée par le club', async () => {
    // Le coach connecté est le remplaçant (coachId = 'remplacant-1')
    const rempCoachId = 'remplacant-1'

    vi.mocked(prisma.planning.findMany).mockResolvedValue([]) // Pas de cours régulier

    // Séance annulée le 29/09
    vi.mocked(prisma.seanceAnnulee.findMany).mockResolvedValue([
      {
        id: 'annul-club',
        date: new Date('2026-09-29T12:00:00.000Z'),
        motif: 'Piscine fermée',
        planningId: null,
        groupeId: null,
        coachId: null,
      } as any,
    ])

    // Remplacement accepté pour le 29/09
    vi.mocked(prisma.remplacement.findMany).mockResolvedValue([
      {
        id: 'remp-1',
        coachRemplaceId: 'titulaire-1',
        coachRemplacantId: rempCoachId,
        date: new Date('2026-09-29T12:00:00.000Z'),
        heureDebut: '19:30',
        heureFin: '21:00',
        statut: 'accepte',
        coachRemplace: { id: 'titulaire-1', prenom: 'Julien' },
      } as any,
    ])

    const res = await calculerFactureCoach(rempCoachId, 9, 2026)

    // Le remplacement doit être à 0h car la séance a été annulée par le club
    expect(res.lignesRemplacements.length).toBe(1)
    const ligneRemp = res.lignesRemplacements[0]
    expect(ligneRemp.heures).toBe(0)
    expect(ligneRemp.montant).toBe(0)
    expect(ligneRemp.noteInfo).toContain('séance annulée par le club')
    expect(res.totalHeures).toBe(0)
  })
})
