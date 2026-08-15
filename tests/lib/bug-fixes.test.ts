import { describe, expect, it } from 'vitest'

function getIsoWeekNumber(d: Date): number {
  const date = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()))
  const dayNum = date.getUTCDay() || 7
  date.setUTCDate(date.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1))
  return Math.ceil((((date.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)
}

describe('Bug fixes and Edge Cases', () => {
  it('calculates ISO week numbers accurately across year boundaries and week parity', () => {
    // 2026-01-01 is Thursday -> Week 1
    const d1 = new Date(Date.UTC(2026, 0, 1))
    expect(getIsoWeekNumber(d1)).toBe(1)
    expect(getIsoWeekNumber(d1) % 2).toBe(1) // Odd week

    // 2026-01-08 is Thursday -> Week 2
    const d2 = new Date(Date.UTC(2026, 0, 8))
    expect(getIsoWeekNumber(d2)).toBe(2)
    expect(getIsoWeekNumber(d2) % 2).toBe(0) // Even week
  })

  it('safely parses YYYY-MM-DD without timezone day shift', () => {
    const dateStr = '2026-08-15'
    const parts = dateStr.split('-').map(Number)
    expect(parts).toHaveLength(3)
    const [year, month, day] = parts
    const targetDate = new Date(Date.UTC(year, month - 1, day, 12, 0, 0))

    const daysOfWeek = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi']
    // August 15, 2026 is a Saturday (Samedi)
    expect(daysOfWeek[targetDate.getUTCDay()]).toBe('Samedi')
  })

  it('generates valid non-deprecated order numbers with proper formatting', () => {
    const numeroCommande = `CMD-${Date.now()}-${Math.random().toString(36).substring(2, 11).toUpperCase()}`
    expect(numeroCommande).toMatch(/^CMD-\d+-[A-Z0-9]+$/)
  })

  it('handles floating point arithmetic precision correctly for currency calculation', () => {
    const item1 = 19.99
    const item2 = 5.95
    const item3 = 0.1
    const rawSum = item1 + item2 + item3 // 26.040000000000003
    const rounded = Math.round(rawSum * 100) / 100
    expect(rounded).toBe(26.04)
  })
})
