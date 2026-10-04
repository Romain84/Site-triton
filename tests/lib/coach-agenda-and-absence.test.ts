import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getCoachAgenda } from '@/lib/services/coach-agenda-service'
import { formatHeuresEnHM, formatMinutesEnHM } from '@/lib/facture-format'
import { prisma } from '@/lib/prisma'

vi.mock('@/lib/prisma', () => ({
  prisma: {
    periodeVacances: { findMany: vi.fn() },
    seanceAnnulee: { findMany: vi.fn() },
    remplacement: { findMany: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() },
    evenementTournant: { findMany: vi.fn() },
    planning: { findMany: vi.fn(), findUnique: vi.fn() },
    coach: { findMany: vi.fn(), findUnique: vi.fn() },
    factureCoach: { findUnique: vi.fn(), update: vi.fn() },
    ligneFactureCoach: { deleteMany: vi.fn() },
  },
}))

describe('Lot 3 — Agenda Coach réel et déclarations', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('1. Formate les durées en h/min sans perte de précision', () => {
    expect(formatHeuresEnHM(4.25)).toBe('4h15')
    expect(formatHeuresEnHM(7.5)).toBe('7h30')
    expect(formatHeuresEnHM(1.0)).toBe('1h00')
    expect(formatHeuresEnHM(0)).toBe('0h00')
    expect(formatHeuresEnHM(-1.5)).toBe('− 1h30')

    expect(formatMinutesEnHM(45)).toBe('0h45')
    expect(formatMinutesEnHM(60)).toBe('1h00')
    expect(formatMinutesEnHM(90)).toBe('1h30')
    expect(formatMinutesEnHM(105)).toBe('1h45')
  })

  it('2. Filtre les créneaux réguliers pendant les vacances scolaires', async () => {
    const mockCoachId = 'coach-1'
    const now = new Date()
    const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)

    // Vacances englobant demain
    vi.mocked(prisma.periodeVacances.findMany).mockResolvedValue([
      {
        id: 'vac-1',
        nom: 'Toussaint',
        dateDebut: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0),
        dateFin: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 5, 23, 59, 59),
      },
    ] as any)

    vi.mocked(prisma.seanceAnnulee.findMany).mockResolvedValue([])
    vi.mocked(prisma.remplacement.findMany).mockResolvedValue([])
    vi.mocked(prisma.evenementTournant.findMany).mockResolvedValue([])

    const joursNom = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi']
    const tomorrowDayNom = joursNom[tomorrow.getDay()]

    vi.mocked(prisma.planning.findMany).mockResolvedValue([
      {
        id: 'plan-1',
        jourSemaine: tomorrowDayNom,
        heureDebut: '18:00',
        heureFin: '19:30',
        semaineImpaire: false,
        tempsFacture: 90,
        groupe: { id: 'g1', nom: 'Jeunes', couleur: '#0284c7' },
        coachs: [{ coachId: mockCoachId, coach: { id: mockCoachId, prenom: 'Alex', nom: 'Dupond' } }],
        occupations: [],
      },
    ] as any)

    vi.mocked(prisma.coach.findMany).mockResolvedValue([
      { id: mockCoachId, prenom: 'Alex', nom: 'Dupond', email: 'alex@triton.fr' },
      { id: 'coach-2', prenom: 'Claire', nom: 'Martin', email: 'claire@triton.fr' },
    ] as any)

    const agenda = await getCoachAgenda(mockCoachId, 3)

    // Le jour de demain est marqué en vacances
    const jourDemain = agenda.jours[1]
    expect(jourDemain.estEnVacances).toBe(true)
    expect(jourDemain.nomVacances).toBe('Toussaint')
    // Et le créneau régulier n'a pas été ajouté
    expect(jourDemain.sessions.filter((s) => s.type === 'fixe')).toHaveLength(0)
  })

  it('3. Détecte les séances annulées par le club (Lot 2) dans l\'agenda', async () => {
    const mockCoachId = 'coach-1'
    const now = new Date()

    vi.mocked(prisma.periodeVacances.findMany).mockResolvedValue([])

    // Annulation club pour aujourd'hui
    vi.mocked(prisma.seanceAnnulee.findMany).mockResolvedValue([
      {
        id: 'annul-1',
        date: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12, 0, 0),
        motif: 'Piscine fermée - vidange',
        planningId: 'plan-aquafit',
        groupeId: null,
        coachId: null,
      },
    ] as any)

    vi.mocked(prisma.remplacement.findMany).mockResolvedValue([])
    vi.mocked(prisma.evenementTournant.findMany).mockResolvedValue([])

    const joursNom = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi']
    const todayDayNom = joursNom[now.getDay()]

    vi.mocked(prisma.planning.findMany).mockResolvedValue([
      {
        id: 'plan-aquafit',
        jourSemaine: todayDayNom,
        heureDebut: '19:30',
        heureFin: '20:15',
        semaineImpaire: false,
        tempsFacture: 60,
        groupe: { id: 'g-aqua', nom: 'AquaFitness', couleur: '#10b981' },
        coachs: [{ coachId: mockCoachId, coach: { id: mockCoachId, prenom: 'Lorenzo', nom: 'V' } }],
        occupations: [],
      },
    ] as any)

    vi.mocked(prisma.coach.findMany).mockResolvedValue([])

    const agenda = await getCoachAgenda(mockCoachId, 1)
    const jourAujourdhui = agenda.jours[0]

    expect(jourAujourdhui.sessions).toHaveLength(1)
    const session = jourAujourdhui.sessions[0]
    expect(session.estAnnule).toBe(true)
    expect(session.motifAnnulation).toBe('Piscine fermée - vidange')
  })

  it('4. Relie correctement les absences déclarées et les remplacements pris', async () => {
    const coachAbsentId = 'coach-lorenzo'
    const coachRemplacantId = 'coach-florian'
    const now = new Date()

    vi.mocked(prisma.periodeVacances.findMany).mockResolvedValue([])
    vi.mocked(prisma.seanceAnnulee.findMany).mockResolvedValue([])

    // Remplacement validé entre Lorenzo et Florian pour aujourd'hui
    vi.mocked(prisma.remplacement.findMany).mockResolvedValue([
      {
        id: 'remp-123',
        coachRemplaceId: coachAbsentId,
        coachRemplacantId: coachRemplacantId,
        date: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12, 0, 0),
        heureDebut: '19:30',
        heureFin: '20:15',
        planningId: 'plan-aqua',
        statut: 'accepte',
        motif: 'Maladie',
        actif: true,
        coachRemplace: { id: coachAbsentId, prenom: 'Lorenzo', nom: 'V', email: 'l@triton.fr' },
        coachRemplacant: { id: coachRemplacantId, prenom: 'Florian', nom: 'D', email: 'f@triton.fr' },
      },
    ] as any)

    vi.mocked(prisma.evenementTournant.findMany).mockResolvedValue([])

    const joursNom = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi']
    const todayDayNom = joursNom[now.getDay()]

    vi.mocked(prisma.planning.findMany).mockResolvedValue([
      {
        id: 'plan-aqua',
        jourSemaine: todayDayNom,
        heureDebut: '19:30',
        heureFin: '20:15',
        semaineImpaire: false,
        tempsFacture: 60,
        groupe: { id: 'g-aqua', nom: 'AquaFitness', couleur: '#10b981' },
        coachs: [{ coachId: coachAbsentId, coach: { id: coachAbsentId, prenom: 'Lorenzo', nom: 'V' } }],
        occupations: [],
      },
    ] as any)

    vi.mocked(prisma.coach.findMany).mockResolvedValue([])

    // A) Vu par Lorenzo (absent)
    const agendaLorenzo = await getCoachAgenda(coachAbsentId, 1)
    const sessionLorenzo = agendaLorenzo.jours[0].sessions[0]
    expect(sessionLorenzo.absence).not.toBeNull()
    expect(sessionLorenzo.absence?.statut).toBe('accepte')
    expect(sessionLorenzo.absence?.coachRemplacantNom).toBe('Florian D')

    // B) Vu par Florian (remplaçant)
    const agendaFlorian = await getCoachAgenda(coachRemplacantId, 1)
    const sessionFlorian = agendaFlorian.jours[0].sessions[0]
    expect(sessionFlorian.isMySession).toBe(true)
    expect(sessionFlorian.estRemplacementEffectue).toBe(true)
    expect(sessionFlorian.coachRemplaceNom).toBe('Lorenzo V')
  })
})
