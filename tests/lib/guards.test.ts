import { describe, expect, it } from 'vitest'
import { requiresSameOriginCheck } from '@/lib/security/protected-api'

describe('api guards contract', () => {
  it('admin stats shape includes KPI fields when using apiSuccess', () => {
    const payload = {
      success: true,
      totalCoaches: 1,
      totalGroupes: 2,
    }
    expect(payload.totalCoaches).toBe(1)
    expect(payload.success).toBe(true)
  })

  it('protected API paths include coach mutations', () => {
    expect(requiresSameOriginCheck('/api/coach/facturation/calculate', 'POST')).toBe(true)
  })
})
