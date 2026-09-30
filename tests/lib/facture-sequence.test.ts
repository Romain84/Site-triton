import { describe, expect, it, vi, beforeEach } from 'vitest'
import {
  extraireInitialesCoach,
  genererNumeroFactureSequentiel,
  creerFactureCoachSecurisee,
} from '@/lib/facture-utils'
import { prisma } from '@/lib/prisma'

vi.mock('@/lib/prisma', () => ({
  prisma: {
    coach: {
      findUnique: vi.fn(),
    },
    factureCoach: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
    },
  },
}))

describe('Extraction des initiales des coachs', () => {
  it('extrait correctement les initiales des coachs réels du club', () => {
    expect(extraireInitialesCoach('Julie', 'PETRELLA')).toBe('JP')
    expect(extraireInitialesCoach('Florian ', 'Di-Giusto')).toBe('FD')
    expect(extraireInitialesCoach('Cindy', 'JOANNES')).toBe('CJ')
    expect(extraireInitialesCoach('Fabien', 'CHASTAN')).toBe('FC')
    expect(extraireInitialesCoach('Gaël', 'BERNARD')).toBe('GB')
    expect(extraireInitialesCoach('Hanne', 'ROSENOW')).toBe('HR')
    expect(extraireInitialesCoach('Isabelle', 'GREGOIRE')).toBe('IG')
    expect(extraireInitialesCoach('William', 'THEODET')).toBe('WT')
    expect(extraireInitialesCoach('Chloé', 'QUILLET')).toBe('CQ')
  })

  it('gère les cas limites (nom vide, minuscules, caractères spéciaux)', () => {
    expect(extraireInitialesCoach('Jean-Pierre', 'Dupont')).toBe('JD')
    expect(extraireInitialesCoach('Marc', null)).toBe('MA')
    expect(extraireInitialesCoach(null, null)).toBe('XX')
  })
})

describe('Numérotation séquentielle par coach avec initiales', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('génère F-TCC-2026-JP-0001 pour Julie Petrella si aucune facture n\'existe encore pour elle en 2026', async () => {
    vi.mocked(prisma.coach.findUnique).mockResolvedValue({
      id: 'coach-julie',
      prenom: 'Julie',
      nom: 'PETRELLA',
    } as any)
    vi.mocked(prisma.factureCoach.findMany).mockResolvedValue([])
    vi.mocked(prisma.factureCoach.findUnique).mockResolvedValue(null)

    const numero = await genererNumeroFactureSequentiel('coach-julie', 2026)
    expect(numero).toBe('F-TCC-2026-JP-0001')
  })

  it('génère F-TCC-2026-FD-0002 pour Florian Di-Giusto qui a déjà la facture historique F-TCC-2026-0001', async () => {
    vi.mocked(prisma.coach.findUnique).mockResolvedValue({
      id: 'coach-florian',
      prenom: 'Florian ',
      nom: 'Di-Giusto',
    } as any)
    // Florian a déjà la facture 0001 en base
    vi.mocked(prisma.factureCoach.findMany).mockResolvedValue([
      { numero: 'F-TCC-2026-0001' } as any,
    ])
    vi.mocked(prisma.factureCoach.findUnique).mockResolvedValue(null)

    const numero = await genererNumeroFactureSequentiel('coach-florian', 2026)
    expect(numero).toBe('F-TCC-2026-FD-0002')
  })

  it('génère F-TCC-2026-JP-0002 pour Julie si elle a déjà émis F-TCC-2026-JP-0001', async () => {
    vi.mocked(prisma.coach.findUnique).mockResolvedValue({
      id: 'coach-julie',
      prenom: 'Julie',
      nom: 'PETRELLA',
    } as any)
    vi.mocked(prisma.factureCoach.findMany).mockResolvedValue([
      { numero: 'F-TCC-2026-JP-0001' } as any,
    ])
    vi.mocked(prisma.factureCoach.findUnique).mockResolvedValue(null)

    const numero = await genererNumeroFactureSequentiel('coach-julie', 2026)
    expect(numero).toBe('F-TCC-2026-JP-0002')
  })

  it('génère F-TCC-2026-CJ-0001 pour Cindy de façon totalement indépendante de Florian et Julie', async () => {
    vi.mocked(prisma.coach.findUnique).mockResolvedValue({
      id: 'coach-cindy',
      prenom: 'Cindy',
      nom: 'JOANNES',
    } as any)
    // Pour Cindy, aucune facture n'existe dans sa série
    vi.mocked(prisma.factureCoach.findMany).mockResolvedValue([])
    vi.mocked(prisma.factureCoach.findUnique).mockResolvedValue(null)

    const numero = await genererNumeroFactureSequentiel('coach-cindy', 2026)
    expect(numero).toBe('F-TCC-2026-CJ-0001')
  })

  it('incrémente automatiquement si un numéro candidat est déjà pris (sécurité boucle while)', async () => {
    vi.mocked(prisma.coach.findUnique).mockResolvedValue({
      id: 'coach-julie',
      prenom: 'Julie',
      nom: 'PETRELLA',
    } as any)
    vi.mocked(prisma.factureCoach.findMany).mockResolvedValue([])
    // Simuler que F-TCC-2026-JP-0001 existe déjà en base au moment du check global
    vi.mocked(prisma.factureCoach.findUnique)
      .mockResolvedValueOnce({ id: 'f-1', numero: 'F-TCC-2026-JP-0001' } as any)
      .mockResolvedValueOnce(null)

    const numero = await genererNumeroFactureSequentiel('coach-julie', 2026)
    expect(numero).toBe('F-TCC-2026-JP-0002')
  })

  it('creerFactureCoachSecurisee réessaie automatiquement en cas de collision P2002', async () => {
    vi.mocked(prisma.coach.findUnique).mockResolvedValue({
      id: 'coach-test',
      prenom: 'Julie',
      nom: 'PETRELLA',
    } as any)
    vi.mocked(prisma.factureCoach.findMany).mockResolvedValue([])
    vi.mocked(prisma.factureCoach.findUnique).mockResolvedValue(null)

    const p2002Error = new Error('Unique constraint failed')
    ;(p2002Error as any).code = 'P2002'
    ;(p2002Error as any).meta = { target: ['numero'] }

    vi.mocked(prisma.factureCoach.create)
      .mockRejectedValueOnce(p2002Error)
      .mockResolvedValueOnce({
        id: 'facture-created',
        numero: 'F-TCC-2026-JP-0002',
        coachId: 'coach-test',
        mois: 9,
        annee: 2026,
        montantTotal: 150,
        tauxHoraire: 35,
        statut: 'generee',
      } as any)

    const result = await creerFactureCoachSecurisee({
      coachId: 'coach-test',
      mois: 9,
      annee: 2026,
      montantTotal: 150,
      tauxHoraire: 35,
      statut: 'generee',
    })

    expect(result.id).toBe('facture-created')
    expect(prisma.factureCoach.create).toHaveBeenCalledTimes(2)
  })
})
