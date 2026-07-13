import { describe, expect, it, afterEach, vi } from 'vitest'
import { isSameOriginRequest } from '@/lib/security/origin'

describe('isSameOriginRequest', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('retourne true quand origin correspond à host en production (https)', () => {
    vi.stubEnv('NODE_ENV', 'production')

    const request = new Request('https://triton.example/api/test', {
      method: 'POST',
      headers: {
        origin: 'https://triton.example',
        host: 'triton.example',
      },
    })

    expect(isSameOriginRequest(request)).toBe(true)
  })

  it('retourne true quand x-forwarded-proto est fourni', () => {
    const request = new Request('http://triton.example/api/test', {
      method: 'POST',
      headers: {
        origin: 'https://triton.example',
        host: 'triton.example',
        'x-forwarded-proto': 'https',
      },
    })

    expect(isSameOriginRequest(request)).toBe(true)
  })

  it('retourne false si origin ne correspond pas', () => {
    const request = new Request('https://triton.example/api/test', {
      method: 'POST',
      headers: {
        origin: 'https://evil.example',
        host: 'triton.example',
      },
    })

    expect(isSameOriginRequest(request)).toBe(false)
  })

  it('retourne false si origin est absent', () => {
    const request = new Request('https://triton.example/api/test', {
      method: 'POST',
      headers: {
        host: 'triton.example',
      },
    })

    expect(isSameOriginRequest(request)).toBe(false)
  })
})
