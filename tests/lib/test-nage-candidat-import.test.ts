import { describe, it, expect } from 'vitest'
import {
  cleanPhone,
  cleanEmail,
  normalizeGroupe,
  parseDateNaissance,
} from '@/lib/test-nage-candidat-import'

describe('test-nage-candidat-import helpers', () => {
  it('should clean and format French phone numbers correctly', () => {
    // Numéro standard 10 chiffres
    expect(cleanPhone('0784024886')).toBe('07 84 02 48 86')
    expect(cleanPhone('0611526588')).toBe('06 11 52 65 88')

    // Numéro avec préfixe international 33
    expect(cleanPhone('33641472950')).toBe('06 41 47 29 50')

    // Numéros corrompus issus d'exports Excel avec 19 chiffres et espaces
    expect(cleanPhone('7 840 248 860 672 440 000')).toBe('07 84 02 48 86 / 06 72 44 00 00')
    expect(cleanPhone('6 130 934 930 621 040 000')).toBe('06 13 09 34 93 / 06 21 04 00 00')
    expect(cleanPhone('7 658 079 590 765 610 000')).toBe('07 65 80 79 59 / 07 65 61 00 00')
  })

  it('should clean and format multiple comma-separated emails', () => {
    expect(cleanEmail('afsouk@hotmail.com,jlcarliez@gmail.com')).toBe('afsouk@hotmail.com, jlcarliez@gmail.com')
    expect(cleanEmail('laurent.mauri@gmail.com')).toBe('laurent.mauri@gmail.com')
  })

  it('should normalize group formulas to standard club groups', () => {
    expect(normalizeGroupe('ENF2 Seulement Mercredi (En cours)')).toBe('ENF 2 (Mercredi)')
    expect(normalizeGroupe('ENF 1 (En cours)')).toBe('ENF 1')
    expect(normalizeGroupe('ENF 2 (En cours)')).toBe('ENF 2')
    expect(normalizeGroupe('Avenir 1 (En cours)')).toBe('AVENIR 1')
    expect(normalizeGroupe('Avenir 2 (En cours)')).toBe('AVENIR 2')
    expect(normalizeGroupe('Avenir 3 (En cours)')).toBe('AVENIR 3')
    expect(normalizeGroupe('Avenirs loisirs (En cours)')).toBe('AVENIR LOISIR')
  })

  it('should parse French date of birth and calculate age', () => {
    const res = parseDateNaissance('08/05/2018')
    expect(res.date).toBeDefined()
    expect(res.date?.getFullYear()).toBe(2018)
    expect(res.date?.getMonth()).toBe(4) // May = index 4
    expect(res.date?.getDate()).toBe(8)
    expect(res.age).toBeGreaterThanOrEqual(7)
  })
})
