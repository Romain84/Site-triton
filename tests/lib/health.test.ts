import { describe, expect, it, vi } from 'vitest'
import { GET } from '@/app/api/health/route'
import { prisma } from '@/lib/prisma'

vi.mock('@/lib/prisma', () => ({
  prisma: {
    $queryRaw: vi.fn(),
  },
}))

describe('GET /api/health', () => {
  it('returns healthy status with database connected when db responds', async () => {
    vi.mocked(prisma.$queryRaw).mockResolvedValueOnce([{ 1: 1 }])

    const response = await GET()
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.status).toBe('healthy')
    expect(data.database.status).toBe('connected')
    expect(typeof data.uptime).toBe('number')
    expect(data.timestamp).toBeDefined()
    expect(response.headers.get('Cache-Control')).toContain('no-store')
  })

  it('returns unhealthy 503 status when database connection fails', async () => {
    vi.mocked(prisma.$queryRaw).mockRejectedValueOnce(new Error('PostgreSQL connection timeout'))

    const response = await GET()
    const data = await response.json()

    expect(response.status).toBe(503)
    expect(data.status).toBe('unhealthy')
    expect(data.database.status).toBe('disconnected')
    expect(data.database.error).toBe('PostgreSQL connection timeout')
  })
})
