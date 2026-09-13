import { describe, expect, it } from 'vitest'
import { genererGuideCoachPDF } from '@/lib/pdf/guide-coach-pdf-generator'

describe('Guide Utilisateur Entraîneur (PDF)', () => {
  it('génère un document PDF binaire valide pour les coachs', () => {
    const buffer = genererGuideCoachPDF()

    expect(buffer).toBeDefined()
    expect(buffer).toBeInstanceOf(Buffer)
    expect(buffer.length).toBeGreaterThan(10000)

    // Vérification de l'en-tête standard PDF (%PDF-)
    const pdfHeader = buffer.subarray(0, 5).toString('ascii')
    expect(pdfHeader).toBe('%PDF-')

    // Vérification de la signature EOF PDF (%%EOF)
    const pdfContent = buffer.toString('latin1')
    expect(pdfContent).toContain('%%EOF')
    expect(pdfContent).toContain('TRITON CLUB CAVAILLON')
    expect(pdfContent).toContain('ESPACE COACH')
  })
})
