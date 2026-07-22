import { Pool } from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

function createPrismaClient() {
  const connectionString = process.env.DATABASE_URL

  if (!connectionString) {
    throw new Error('DATABASE_URL environment variable is not set')
  }

  const pool = new Pool({
    connectionString,
    max: 10, // Pool de 10 connexions max pour éviter d'atteindre la limite max_connections de Postgres
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
  })

  const adapter = new PrismaPg(pool)

  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  })
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient()

// Conserver l'instance unique dans globalThis (y compris en production)
// pour éviter la multiplication des pools de connexions et la saturation de PostgreSQL
globalForPrisma.prisma = prisma

export default prisma
