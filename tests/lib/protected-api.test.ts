import { describe, expect, it } from 'vitest'
import { requiresSameOriginCheck } from '@/lib/security/protected-api'

describe('requiresSameOriginCheck', () => {
  it('protège les mutations admin', () => {
    expect(requiresSameOriginCheck('/api/admin/groupes', 'POST')).toBe(true)
    expect(requiresSameOriginCheck('/api/admin/groupes/abc', 'DELETE')).toBe(true)
  })

  it('protège les mutations coach et auth', () => {
    expect(requiresSameOriginCheck('/api/coach/facturation/ligne', 'POST')).toBe(true)
    expect(requiresSameOriginCheck('/api/auth/admin/login', 'POST')).toBe(true)
  })

  it('ignore les GET et le webhook Stripe', () => {
    expect(requiresSameOriginCheck('/api/admin/stats', 'GET')).toBe(false)
    expect(requiresSameOriginCheck('/api/checkout/webhook', 'POST')).toBe(false)
  })

  it('ignore les API publiques', () => {
    expect(requiresSameOriginCheck('/api/contact', 'POST')).toBe(false)
    expect(requiresSameOriginCheck('/api/checkout', 'POST')).toBe(false)
  })
})
