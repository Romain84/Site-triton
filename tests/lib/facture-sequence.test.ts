import { describe, expect, it, vi, beforeEach } from 'vitest'
import { genererNumeroFactureSequentiel, creerFactureCoachSecurisee } from '@/lib/facture-utils'
import { prisma } from '@/lib/prisma'

vi.mock('@/lib/prisma', () => ({
  prisma: {
    factureCoach: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
    },
  },
}))

describe('Numérotation séquentielle et continue des factures coach', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('génère F-TCC-2026-0001 si aucune facture n\'existe encore pour l\'année', async () => {
    vi.mocked(prisma.factureCoach.findMany).mockResolvedValue([])
    vi.mocked(prisma.factureCoach.findUnique).mockResolvedValue(null)

    const numero = await genererNumeroFactureSequentiel('coach-123', 2026)
    expect(numero).toBe('F-TCC-2026-0001')
  })

  it('génère F-TCC-2026-0002 pour un AUTRE coach lorsque Florian a déjà la facture 0001 (anti-collision)', async () => {
    // Florian a déjà la facture 0001
    vi.mocked(prisma.factureCoach.findMany).mockResolvedValue([
      { numero: 'F-TCC-2026-0001' } as any,
    ])
    vi.mocked(prisma.factureCoach.findUnique).mockResolvedValue(null)

    // Un autre coach (ex: Gaël ou William) génère sa première facture
    const numero = await genererNumeroFactureSequentiel('coach-gael', 2026)
    expect(numero).toBe('F-TCC-2026-0002')
  })

  it('gère correctement les trous de numérotation sans régresser', async () => {
    // Si la facture 0002 a été supprimée mais que 0001 et 0003 existent
    vi.mocked(prisma.factureCoach.findMany).mockResolvedValue([
      { numero: 'F-TCC-2026-0001' } as any,
      { numero: 'F-TCC-2026-0003' } as any,
    ])
    vi.mocked(prisma.factureCoach.findUnique).mockResolvedValue(null)

    const numero = await genererNumeroFactureSequentiel('coach-lorenzo', 2026)
    expect(numero).toBe('F-TCC-2026-0004')
  })

  it('incrémente automatiquement si un numéro candidat est déjà pris (sécurité boucle while)', async () => {
    vi.mocked(prisma.factureCoach.findMany).mockResolvedValue([
      { numero: 'F-TCC-2026-0001' } as any,
    ])
    // Simuler que 0002 existe au moment du findUnique (ex: inséré simultanément)
    vi.mocked(prisma.factureCoach.findUnique)
      .mockResolvedValueOnce({ id: 'f-2', numero: 'F-TCC-2026-0002' } as any)
      .mockResolvedValueOnce(null)

    const numero = await genererNumeroFactureSequentiel('coach-test', 2026)
    expect(numero).toBe('F-TCC-2026-0003')
  })

  it('creerFactureCoachSecurisee réessaie automatiquement en cas de collision P2002', async () => {
    vi.mocked(prisma.factureCoach.findMany).mockResolvedValue([])
    vi.mocked(prisma.factureCoach.findUnique).mockResolvedValue(null)

    // Première tentative échoue avec P2002 (collision concurrente)
    const p2002Error = new Error('Unique constraint failed')
    ;(p2002Error as any).code = 'P2002'
    ;(p2002Error as any).meta = { target: ['numero'] }

    vi.mocked(prisma.factureCoach.create)
      .mockRejectedValueOnce(p2002Error)
      .mockResolvedValueOnce({
        id: 'facture-created',
        numero: 'F-TCC-2026-0002',
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
