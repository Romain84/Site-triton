import { describe, expect, it } from 'vitest'
import { formRateLimiter } from '@/lib/rate-limiter'

describe('formRateLimiter', () => {
  it('bloque après la limite minute pour un même IP/formulaire', () => {
    const ip = `test-ip-${Date.now()}`

    const r1 = formRateLimiter.checkLimit(ip, 'auth-admin-login')
    const r2 = formRateLimiter.checkLimit(ip, 'auth-admin-login')
    const r3 = formRateLimiter.checkLimit(ip, 'auth-admin-login')
    const r4 = formRateLimiter.checkLimit(ip, 'auth-admin-login')

    expect(r1.allowed).toBe(true)
    expect(r2.allowed).toBe(true)
    expect(r3.allowed).toBe(true)
    expect(r4.allowed).toBe(false)
  })

  it('isole les compteurs par type de formulaire', () => {
    const ip = `test-ip-types-${Date.now()}`

    // Saturer un type
    formRateLimiter.checkLimit(ip, 'auth-coach-login')
    formRateLimiter.checkLimit(ip, 'auth-coach-login')
    formRateLimiter.checkLimit(ip, 'auth-coach-login')
    const blocked = formRateLimiter.checkLimit(ip, 'auth-coach-login')

    // Un autre type reste disponible
    const otherType = formRateLimiter.checkLimit(ip, 'contact')

    expect(blocked.allowed).toBe(false)
    expect(otherType.allowed).toBe(true)
  })
})
