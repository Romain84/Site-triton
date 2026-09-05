import { describe, expect, it } from 'vitest'
import { getClientIp } from '@/lib/api/request'
import { NextRequest } from 'next/server'
import fs from 'fs'
import path from 'path'

describe('Security fixes and hardening', () => {
  it('getClientIp correctly handles single and multi-IP x-forwarded-for headers', () => {
    const req1 = new NextRequest('http://localhost:3000/api/test', {
      headers: {
        'x-forwarded-for': '198.51.100.1, 10.0.0.1, 192.168.1.1',
      },
    })
    expect(getClientIp(req1)).toBe('198.51.100.1')

    const req2 = new NextRequest('http://localhost:3000/api/test', {
      headers: {
        'x-real-ip': '203.0.113.5',
      },
    })
    expect(getClientIp(req2)).toBe('203.0.113.5')

    const req3 = new NextRequest('http://localhost:3000/api/test')
    expect(getClientIp(req3)).toBe('unknown')

    // Test rejection of malicious/injected headers
    const req4 = new NextRequest('http://localhost:3000/api/test', {
      headers: {
        'x-forwarded-for': '<script>alert(1)</script>, 192.168.1.1',
      },
    })
    expect(getClientIp(req4)).toBe('unknown')
  })

  it('anonymizes IPv4 and IPv6 addresses according to CNIL/GDPR', async () => {
    const { anonymizeIp } = await import('@/lib/api/request')
    // IPv4: masks last octet (/24)
    expect(anonymizeIp('198.51.100.42')).toBe('198.51.100.0')
    expect(anonymizeIp('::ffff:192.168.1.155')).toBe('192.168.1.0')
    expect(anonymizeIp('10.0.0.99')).toBe('10.0.0.0')

    // IPv6: masks last 80 bits
    expect(anonymizeIp('2001:0db8:85a3:0000:0000:8a2e:0370:7334')).toBe('2001:0db8:85a3::')

    // Unknown or invalid
    expect(anonymizeIp('unknown')).toBe('unknown')
  })

  it('confirms that pass-sport API route directory is removed', () => {
    const passSportRoutePath = path.join(process.cwd(), 'app', 'api', 'pass-sport')
    expect(fs.existsSync(passSportRoutePath)).toBe(false)
  })
})
