import { describe, expect, it } from 'vitest'
import { parseDateDebutSaison } from '@/lib/facture-calculations'
import { doitEnvoyerEmailAuClub, canTransitionFactureCoachStatus } from '@/lib/facture-utils'

describe('Analyse de la date de rentrée et début de saison', () => {
  it('analyse correctement le format textuel français avec jour de semaine ("Lundi 14 Septembre 2026")', () => {
    const d = parseDateDebutSaison('Lundi 14 Septembre 2026')
    expect(d).not.toBeNull()
    expect(d?.getFullYear()).toBe(2026)
    expect(d?.getMonth()).toBe(8) // 8 = septembre
    expect(d?.getDate()).toBe(14)
  })

  it('analyse correctement le format textuel français sans jour de semaine ("14 Septembre 2026")', () => {
    const d = parseDateDebutSaison('14 Septembre 2026')
    expect(d).not.toBeNull()
    expect(d?.getFullYear()).toBe(2026)
    expect(d?.getMonth()).toBe(8)
    expect(d?.getDate()).toBe(14)
  })

  it('analyse correctement le format avec "1er" ("Jeudi 1er Octobre 2026")', () => {
    const d = parseDateDebutSaison('Jeudi 1er Octobre 2026')
    expect(d).not.toBeNull()
    expect(d?.getFullYear()).toBe(2026)
    expect(d?.getMonth()).toBe(9) // 9 = octobre
    expect(d?.getDate()).toBe(1)
  })

  it('analyse correctement le format numérique français ("14/09/2026" et "14-09-2026")', () => {
    const d1 = parseDateDebutSaison('14/09/2026')
    expect(d1?.getDate()).toBe(14)
    expect(d1?.getMonth()).toBe(8)
    expect(d1?.getFullYear()).toBe(2026)

    const d2 = parseDateDebutSaison('14-09-2026')
    expect(d2?.getDate()).toBe(14)
    expect(d2?.getMonth()).toBe(8)
  })

  it('analyse correctement le format ISO ("2026-09-14")', () => {
    const d = parseDateDebutSaison('2026-09-14')
    expect(d?.getDate()).toBe(14)
    expect(d?.getMonth()).toBe(8)
    expect(d?.getFullYear()).toBe(2026)
  })

  it('retourne null si la chaîne est vide ou invalide', () => {
    expect(parseDateDebutSaison('')).toBeNull()
    expect(parseDateDebutSaison(null)).toBeNull()
    expect(parseDateDebutSaison(undefined)).toBeNull()
    expect(parseDateDebutSaison('date non valide')).toBeNull()
  })
})

describe('Règles de notification e-mail et de cycle de vie de facture', () => {
  it('interdit formellement l\'envoi d\'e-mail au club si la facture est en brouillon ("brouillon")', () => {
    expect(doitEnvoyerEmailAuClub('brouillon')).toBe(false)
  })

  it('interdit l\'envoi d\'e-mail au club si la facture est simplement générée non transmise ("generee")', () => {
    expect(doitEnvoyerEmailAuClub('generee')).toBe(false)
  })

  it('interdit l\'envoi d\'e-mail au club si la facture est null ou undefined', () => {
    expect(doitEnvoyerEmailAuClub(null)).toBe(false)
    expect(doitEnvoyerEmailAuClub(undefined)).toBe(false)
    expect(doitEnvoyerEmailAuClub('')).toBe(false)
  })

  it('autorise l\'envoi d\'e-mail au club UNIQUEMENT au statut "envoyee"', () => {
    expect(doitEnvoyerEmailAuClub('envoyee')).toBe(true)
  })

  it('interdit un nouvel envoi d\'e-mail au club lorsque la facture est déjà "payee"', () => {
    expect(doitEnvoyerEmailAuClub('payee')).toBe(false)
  })

  it('permet les transitions autorisées et le déverrouillage vers brouillon', () => {
    expect(canTransitionFactureCoachStatus('brouillon', 'generee')).toBe(true)
    expect(canTransitionFactureCoachStatus('generee', 'envoyee')).toBe(true)
    expect(canTransitionFactureCoachStatus('envoyee', 'brouillon')).toBe(true) // Déverrouillage admin
    expect(canTransitionFactureCoachStatus('payee', 'brouillon')).toBe(true) // Déverrouillage exceptionnel
  })
})
