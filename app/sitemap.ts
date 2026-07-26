import { MetadataRoute } from 'next'
import { prisma } from '@/lib/prisma'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://tritoncavaillon.fr'

  // Pages statiques principales
  const staticRoutes = [
    '',
    '/le-club',
    '/actualites',
    '/planning',
    '/calendrier',
    '/groupes',
    '/inscription',
    '/boutique',
    '/galerie',
    '/contact',
    '/telechargements',
    '/mentions-legales',
    '/politique-confidentialite',
  ]

  const staticEntries: MetadataRoute.Sitemap = staticRoutes.map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date(),
    changeFrequency: route === '' ? 'daily' : 'weekly',
    priority: route === '' ? 1.0 : route === '/inscription' || route === '/planning' || route === '/groupes' ? 0.9 : 0.8,
  }))

  // Articles d'actualités dynamiques depuis la base de données
  try {
    const articles = await prisma.actualite.findMany({
      where: { publie: true },
      select: { id: true, slug: true, updatedAt: true, datePubli: true },
    })

    const articleEntries: MetadataRoute.Sitemap = articles.map((article) => ({
      url: `${baseUrl}/actualites/${article.slug || article.id}`,
      lastModified: article.updatedAt || article.datePubli || new Date(),
      changeFrequency: 'monthly',
      priority: 0.7,
    }))

    return [...staticEntries, ...articleEntries]
  } catch (error) {
    console.error('Erreur lors de la génération du sitemap dynamique:', error)
    return staticEntries
  }
}
