import { describe, it, expect } from 'vitest'
import { generateFallbackDraftArticle } from '@/lib/competition-summary-fallback'

describe('generateFallbackDraftArticle', () => {
  it('génère un article structuré avec titre, contenu HTML, instagramText et podiums', () => {
    const rawNotes = `
      Meeting Départemental Sprint à Cavaillon
      DUPONT Lucas (2010) FRA TRITON CLUB CAVAILLON - 50m NL : 26.45 (1er J15)
      MARTIN Léa (2011) FRA TRITON CLUB CAVAILLON - 100m Papillon : 1:08.20 (2e)
      BERNARD Tom (2009) FRA TRITON CLUB CAVAILLON - 100m Dos : 1:04.10 (3e)
      GARCIA Emma (2012) FRA - 50m Brasse : 38.50
    `

    const result = generateFallbackDraftArticle({
      competitionName: 'Meeting Départemental Sprint',
      lieu: 'Piscine Alphonse Roudière, Cavaillon',
      liveffnUrl: 'https://www.liveffn.com/cgi-bin/resultats.php?competition=94240&langue=fra',
      rawNotes,
    })

    expect(result.titre).toContain('Meeting Départemental Sprint')
    expect(result.slug).toContain('meeting-departemental-sprint')
    expect(result.contenu).toContain('<h2>')
    expect(result.contenu).toContain('Triton Club Cavaillon')
    expect(result.contenu).toContain('1ère place 🥇')
    expect(result.contenu).toContain('https://www.liveffn.com')
    expect(result.instagramText).toContain('#TritonClubCavaillon')
    expect(result.instagramText).toContain('Meeting Départemental Sprint')
    expect(result.podiums.length).toBeGreaterThan(0)
    expect(result.podiums[0].place).toBe(1)
  })

  it('fonctionne même avec des notes minimales sans plantage', () => {
    const result = generateFallbackDraftArticle({
      competitionName: 'Championnats Vaucluse',
      rawNotes: 'Bravo à tous les nageurs !',
    })

    expect(result.titre).toContain('Championnats Vaucluse')
    expect(result.contenu).toContain('Championnats Vaucluse')
    expect(result.slug).toBeDefined()
    expect(result.instagramText).toBeDefined()
    expect(Array.isArray(result.podiums)).toBe(true)
  })
})
