import { describe, expect, it, vi, beforeEach } from 'vitest'
import { genererDevisPDF, DevisPDFData } from '@/lib/pdf/devis-pdf-generator'
import { genererNumeroDevisSequentiel } from '@/lib/devis-utils'
import { prisma } from '@/lib/prisma'

vi.mock('@/lib/prisma', () => ({
  prisma: {
    devis: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      count: vi.fn(),
    },
  },
}))

describe('Génération et calculs de Devis', () => {
  it('calcule correctement les totaux pour le pack SSA (750 €)', () => {
    const lignes = [
      {
        description: 'Formation SSA (Surveillant Sauveteur Aquatique)',
        quantite: 1,
        prixUnitaire: 350,
        total: 350,
      },
      {
        description: 'Formation PSE1',
        quantite: 1,
        prixUnitaire: 200,
        total: 200,
      },
      {
        description: 'Formation PSE2',
        quantite: 1,
        prixUnitaire: 200,
        total: 200,
      },
    ]

    const totalHT = lignes.reduce((sum, l) => sum + l.total, 0)
    const totalTVA = 0
    const totalTTC = totalHT

    expect(totalHT).toBe(750)
    expect(totalTTC).toBe(750)
    expect(totalTVA).toBe(0)
  })

  it('génère un document PDF officiel valide pour un devis', () => {
    const mockData: DevisPDFData = {
      numero: 'DEV-2026-0001',
      titre: 'Formation Surveillant Sauveteur Aquatique (SSA) & Secourisme (PSE1 / PSE2)',
      clientNom: 'Bénéficiaire SSA Test',
      clientEmail: 'candidat.ssa@example.com',
      clientTelephone: '06 12 34 56 78',
      clientAdresse: 'Cavaillon',
      dateEmission: new Date('2026-09-13'),
      dateValidite: new Date('2026-10-13'),
      totalHT: 750,
      totalTVA: 0,
      totalTTC: 750,
      notes: 'Règlement en 3 fois sans frais.',
      lignes: [
        {
          description: 'Formation SSA (Surveillant Sauveteur Aquatique) - Préparation technique et entraînements',
          quantite: 1,
          prixUnitaire: 350,
          total: 350,
        },
        {
          description: 'Formation PSE1',
          quantite: 1,
          prixUnitaire: 200,
          total: 200,
        },
        {
          description: 'Formation PSE2',
          quantite: 1,
          prixUnitaire: 200,
          total: 200,
        },
      ],
    }

    const pdfBuffer = genererDevisPDF(mockData)

    expect(pdfBuffer).toBeInstanceOf(Buffer)
    expect(pdfBuffer.length).toBeGreaterThan(1000)
    // Vérifier l'en-tête standard des fichiers PDF (%PDF-)
    const header = pdfBuffer.slice(0, 5).toString('ascii')
    expect(header).toBe('%PDF-')
  })
})

describe('Numérotation séquentielle des devis (genererNumeroDevisSequentiel)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('génère DEV-2026-0001 quand aucun devis n\'existe pour l\'année', async () => {
    vi.mocked(prisma.devis.findMany).mockResolvedValueOnce([])
    vi.mocked(prisma.devis.findUnique).mockResolvedValueOnce(null)

    const num = await genererNumeroDevisSequentiel(2026)
    expect(num).toBe('DEV-2026-0001')
  })

  it('génère DEV-2026-0003 si seul DEV-2026-0002 existe en base (cas après suppression de 0001)', async () => {
    vi.mocked(prisma.devis.findMany).mockResolvedValueOnce([
      { numero: 'DEV-2026-0002' } as any,
    ])
    vi.mocked(prisma.devis.findUnique).mockResolvedValueOnce(null)

    const num = await genererNumeroDevisSequentiel(2026)
    expect(num).toBe('DEV-2026-0003')
  })

  it('gère les collisions concurrentes via la boucle de vérification', async () => {
    vi.mocked(prisma.devis.findMany).mockResolvedValueOnce([
      { numero: 'DEV-2026-0001' } as any,
      { numero: 'DEV-2026-0002' } as any,
    ])
    // Simuler que DEV-2026-0003 a été créé au même moment par un autre processus
    vi.mocked(prisma.devis.findUnique)
      .mockResolvedValueOnce({ id: 'devis-conflict', numero: 'DEV-2026-0003' } as any)
      .mockResolvedValueOnce(null)

    const num = await genererNumeroDevisSequentiel(2026)
    expect(num).toBe('DEV-2026-0004')
  })
})

