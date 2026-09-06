import { describe, expect, it } from 'vitest'
import { sortTailles, sortVariantes, compareTailles } from '@/lib/boutique/sizes'

describe('Boutique sizes sorting (sortTailles & sortVariantes)', () => {
  it('correctly sorts poncho sizes (children first by age, then adult)', () => {
    const raw = ['Adulte ( Taille unique)', '10 / 13 Ans', '6 / 9 Ans']
    const sorted = sortTailles(raw)
    expect(sorted).toEqual(['6 / 9 Ans', '10 / 13 Ans', 'Adulte ( Taille unique)'])
  })

  it('correctly sorts towel dimensions (Petite before Grande)', () => {
    const raw = ['Grande (100cm X 150cm)', 'Petite (100cm X 50 cm)']
    const sorted = sortTailles(raw)
    expect(sorted).toEqual(['Petite (100cm X 50 cm)', 'Grande (100cm X 150cm)'])
  })

  it('correctly sorts clothing sizes from child years to adult letter sizes', () => {
    const raw = ['L', '6 Ans', 'XL', '10 Ans', 'M', 'XS', '8 Ans', '12 Ans', '2XL', 'S', '4XL', '3XL']
    const sorted = sortTailles(raw)
    expect(sorted).toEqual([
      '6 Ans',
      '8 Ans',
      '10 Ans',
      '12 Ans',
      'XS',
      'S',
      'M',
      'L',
      'XL',
      '2XL',
      '3XL',
      '4XL',
    ])
  })

  it('sorts variantes array with secondary color sorting', () => {
    const variantes = [
      { id: '1', taille: 'L', couleur: 'Noir' },
      { id: '2', taille: '6 Ans', couleur: 'Bleu' },
      { id: '3', taille: 'L', couleur: 'Blanc' },
      { id: '4', taille: 'S', couleur: 'Bleu' },
    ]

    const sorted = sortVariantes(variantes)
    expect(sorted.map((v) => `${v.taille} - ${v.couleur}`)).toEqual([
      '6 Ans - Bleu',
      'S - Bleu',
      'L - Blanc',
      'L - Noir',
    ])
  })
})
