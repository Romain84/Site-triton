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
  })

  it('confirms that pass-sport API route directory is removed', () => {
    const passSportRoutePath = path.join(process.cwd(), 'app', 'api', 'pass-sport')
    expect(fs.existsSync(passSportRoutePath)).toBe(false)
  })
})
