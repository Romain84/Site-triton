import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import ActualitesClient from './ActualitesClient'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Actualités',
  description: 'Toutes les actualités du Triton Club Cavaillon',
}

export const dynamic = 'force-dynamic'

async function getActualites() {
  try {
    return await prisma.actualite.findMany({
      where: { publie: true },
      orderBy: { datePubli: 'desc' },
    })
  } catch (error) {
    logger.error('Error fetching actualités', error)
    return []
  }
}

export default async function ActualitesPage() {
  const actualites = await getActualites()

  // Sérialiser les objets Date en chaînes de caractères pour le composant client
  const serializedActualites = actualites.map((actu) => ({
    ...actu,
    datePubli: actu.datePubli.toISOString(),
    createdAt: actu.createdAt.toISOString(),
    updatedAt: actu.updatedAt.toISOString(),
  }))

  return (
    <main className="min-h-screen pt-40 pb-20 bg-gradient-to-br from-gray-50 to-slate-100">
      <ActualitesClient initialActualites={serializedActualites} />
    </main>
  )
}

