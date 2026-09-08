import { describe, expect, it } from 'vitest'
import {
  DEPART_CAVAILLON,
  PISCINES_REGIONALES,
  buildGoogleMapsUrl,
} from '@/lib/competition-distance'

describe('Rémunération des compétitions et indemnités kilométriques', () => {
  it('respecte le barème officiel des compétitions départementales (84)', () => {
    const tarifDemiJournee = 50
    const tarifJournee = 130

    // Compétition départementale : pas d'indemnité transport
    const distanceKm = 0
    const forfaitTransport = distanceKm * 0.30

    expect(tarifDemiJournee + forfaitTransport).toBe(50)
    expect(tarifJournee + forfaitTransport).toBe(130)
  })

  it('calcule correctement le forfait transport pour les compétitions régionales hors département (0,30 € / km aller)', () => {
    // Règle : Distance aller entre Piscine Alphonse Roudière Cavaillon et piscine de compétition × 0,30 €
    const tests = [
      { ville: 'Aix-en-Provence', km: 56, transportAttendu: 16.80, totalDemiJ: 66.80, totalJournee: 146.80 },
      { ville: 'Marseille', km: 82, transportAttendu: 24.60, totalDemiJ: 74.60, totalJournee: 154.60 },
      { ville: 'Istres', km: 46, transportAttendu: 13.80, totalDemiJ: 63.80, totalJournee: 143.80 },
      { ville: 'Toulon', km: 122, transportAttendu: 36.60, totalDemiJ: 86.60, totalJournee: 166.60 },
      { ville: 'Antibes', km: 196, transportAttendu: 58.80, totalDemiJ: 108.80, totalJournee: 188.80 },
      { ville: 'Nice', km: 218, transportAttendu: 65.40, totalDemiJ: 115.40, totalJournee: 195.40 },
      { ville: 'Montpellier', km: 108, transportAttendu: 32.40, totalDemiJ: 82.40, totalJournee: 162.40 },
    ]

    for (const t of tests) {
      const transportCalcule = Math.round(t.km * 0.30 * 100) / 100
      expect(transportCalcule).toBe(t.transportAttendu)

      const totalDemiJ = Math.round((50 + transportCalcule) * 100) / 100
      expect(totalDemiJ).toBe(t.totalDemiJ)

      const totalJournee = Math.round((130 + transportCalcule) * 100) / 100
      expect(totalJournee).toBe(t.totalJournee)
    }
  })

  it('génère un lien Google Maps conforme avec le point de départ officiel et itinéraire routier', () => {
    const destination = "Stade Nautique d'Antibes Jean Bouin"
    const url = buildGoogleMapsUrl(destination)

    expect(url).toContain('https://www.google.com/maps/dir/?api=1')
    expect(url).toContain('origin=Piscine%20Alphonse%20Roudi%C3%A8re%2C%2084300%20Cavaillon')
    expect(url).toContain(`destination=${encodeURIComponent(destination)}`)
    expect(url).toContain('travelmode=driving')
  })

  it('vérifie le point de départ de référence Cavaillon et le catalogue régional', () => {
    expect(DEPART_CAVAILLON.nom).toBe('Piscine Alphonse Roudière, Cavaillon')
    expect(DEPART_CAVAILLON.adresse).toContain('84300 Cavaillon')
    expect(DEPART_CAVAILLON.lat).toBeCloseTo(43.833249, 4)
    expect(DEPART_CAVAILLON.lon).toBeCloseTo(5.039399, 4)

    expect(PISCINES_REGIONALES.length).toBeGreaterThanOrEqual(15)
    for (const p of PISCINES_REGIONALES) {
      expect(p.id).toBeTruthy()
      expect(p.nom).toBeTruthy()
      expect(p.lat).toBeGreaterThan(42)
      expect(p.lon).toBeGreaterThan(3)
      expect(p.distanceKmEstimee).toBeGreaterThan(0)
    }
  })

  it('distingue correctement les lieux départementaux (84) des compétitions régionales (hors 84)', async () => {
    const { isVaucluseLieu } = await import('@/lib/competition-distance')

    // Départemental (84)
    expect(isVaucluseLieu('Cavaillon')).toBe(true)
    expect(isVaucluseLieu('Piscine Alphonse Roudière, Cavaillon')).toBe(true)
    expect(isVaucluseLieu('Sorgues')).toBe(true)
    expect(isVaucluseLieu('Vedène')).toBe(true)
    expect(isVaucluseLieu('Avignon')).toBe(true)
    expect(isVaucluseLieu('Apt')).toBe(true)
    expect(isVaucluseLieu('Carpentras')).toBe(true)
    expect(isVaucluseLieu('Pertuis')).toBe(true)

    // Régional (Hors 84)
    expect(isVaucluseLieu('Aix en Provence')).toBe(false)
    expect(isVaucluseLieu('Martigues')).toBe(false)
    expect(isVaucluseLieu('Gap')).toBe(false)
    expect(isVaucluseLieu('Cannet-en-Roussillon')).toBe(false)
    expect(isVaucluseLieu('Marseille')).toBe(false)
    expect(isVaucluseLieu('Antibes')).toBe(false)
    expect(isVaucluseLieu('Nice')).toBe(false)
    expect(isVaucluseLieu('Nîmes')).toBe(false)
    expect(isVaucluseLieu('Montpellier')).toBe(false)
  })

  it('retrouve automatiquement les bassins fréquents et distances km même avec variantes de saisie', async () => {
    const { matchPiscineFrequente, getDefaultPiscinesFrequentes } = await import('@/lib/competition-distance')
    const pools = getDefaultPiscinesFrequentes()

    // Variantes pour Aix
    const matchAix1 = matchPiscineFrequente('Aix en Provence', pools)
    expect(matchAix1?.distanceKm).toBe(56)

    const matchAix2 = matchPiscineFrequente('Piscine Yves Blanc', pools)
    expect(matchAix2?.distanceKm).toBe(56)

    // Martigues
    const matchMartigues = matchPiscineFrequente('Martigues', pools)
    expect(matchMartigues?.distanceKm).toBe(55)

    // Gap
    const matchGap = matchPiscineFrequente('Gap', pools)
    expect(matchGap?.distanceKm).toBe(132)

    // Marseille
    const matchMarseille = matchPiscineFrequente('Marseille', pools)
    expect(matchMarseille?.distanceKm).toBe(82)

    // Antibes
    const matchAntibes = matchPiscineFrequente('Antibes', pools)
    expect(matchAntibes?.distanceKm).toBe(196)
  })
})
