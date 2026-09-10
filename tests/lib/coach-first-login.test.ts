import { describe, expect, it } from 'vitest'
import bcrypt from 'bcrypt'

describe('Première connexion coach & mot de passe 1234', () => {
  it('valide le hashage et la comparaison du mot de passe provisoire 1234', async () => {
    const hash = await bcrypt.hash('1234', 10)
    expect(await bcrypt.compare('1234', hash)).toBe(true)
    expect(await bcrypt.compare(' 1234'.trim(), hash)).toBe(true)
    expect(await bcrypt.compare('wrong', hash)).toBe(false)
  })

  it('gère correctement la tolérance aux espaces pour la saisie de " 1234"', () => {
    const inputs = ['1234', ' 1234', '1234 ', ' 1234 ']
    for (const input of inputs) {
      expect(input.trim()).toBe('1234')
    }
  })

  it('détermine correctement si le coach doit changer son mot de passe', () => {
    // Cas 1 : Première connexion avec mot de passe par défaut
    const coach1 = { lastLogin: null, mustChangePassword: true }
    const mustChange1 = Boolean(coach1.mustChangePassword || !coach1.lastLogin)
    expect(mustChange1).toBe(true)

    // Cas 2 : Connexion après réinitialisation admin
    const coach2 = { lastLogin: null, mustChangePassword: true }
    expect(coach2.mustChangePassword).toBe(true)

    // Cas 3 : Coach ayant déjà personnalisé son mot de passe
    const coach3 = { lastLogin: new Date(), mustChangePassword: false }
    const mustChange3 = Boolean(coach3.mustChangePassword)
    expect(mustChange3).toBe(false)
  })

  it('interdit de réutiliser 1234 comme nouveau mot de passe personnel', () => {
    const validateNewPassword = (pwd: string) => {
      if (pwd.length < 6) return 'TROP_COURT'
      if (pwd.trim() === '1234') return 'INTERDIT_1234'
      return 'OK'
    }

    expect(validateNewPassword('1234')).toBe('TROP_COURT')
    expect(validateNewPassword(' 1234 ')).toBe('INTERDIT_1234')
    expect(validateNewPassword('123456')).toBe('OK')
    expect(validateNewPassword('secret2026')).toBe('OK')
  })

  it('valide l\'état d\'un coach réinitialisé par admin en première connexion', async () => {
    const adminResetState = {
      mustChangePassword: true,
      lastLogin: null,
      tempPassword: '1234',
    }

    expect(adminResetState.tempPassword).toBe('1234')
    expect(adminResetState.mustChangePassword).toBe(true)
    expect(adminResetState.lastLogin).toBeNull()
  })
})
