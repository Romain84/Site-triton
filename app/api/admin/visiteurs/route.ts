import { NextRequest, NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/auth/session'
import { prisma } from '@/lib/prisma'
import { isSameOriginRequest } from '@/lib/security/origin'

export async function GET(request: NextRequest) {
  try {
    if (!isSameOriginRequest(request)) {
      return NextResponse.json({ error: 'Origine non autorisée' }, { status: 403 })
    }

    const session = await getAdminSession()
    if (!session) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const now = new Date()
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

    // Compteurs globaux
    const [totalToday, totalWeek, totalMonth, totalAll] = await Promise.all([
      prisma.visite.count({ where: { createdAt: { gte: todayStart } } }),
      prisma.visite.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
      prisma.visite.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
      prisma.visite.count(),
    ])

    // Répartition par Pays
    const countriesGroup = await prisma.visite.groupBy({
      by: ['pays', 'codePays'],
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 15,
    })

    // Répartition par Villes
    const citiesGroup = await prisma.visite.groupBy({
      by: ['ville', 'pays', 'codePays'],
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 15,
    })

    // Coordonnées géographiques uniques agrégées pour la Carte Mondiale
    const locationsGroup = await prisma.visite.groupBy({
      by: ['latitude', 'longitude', 'ville', 'pays', 'codePays'],
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 100,
    })

    // Répartition par Appareil
    const devicesGroup = await prisma.visite.groupBy({
      by: ['appareil'],
      _count: { id: true },
    })

    // 50 Dernières Visites
    const recentVisits = await prisma.visite.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50,
      select: {
        id: true,
        ip: true,
        pays: true,
        codePays: true,
        region: true,
        ville: true,
        page: true,
        appareil: true,
        navigateur: true,
        createdAt: true,
      },
    })

    return NextResponse.json({
      stats: {
        today: totalToday,
        week: totalWeek,
        month: totalMonth,
        total: totalAll,
        uniqueCountries: countriesGroup.length,
      },
      topCountries: countriesGroup.map(c => ({
        pays: c.pays || 'France',
        codePays: c.codePays || 'FR',
        count: c._count.id,
      })),
      topCities: citiesGroup.map(c => ({
        ville: c.ville || 'Inconnu',
        pays: c.pays || 'France',
        codePays: c.codePays || 'FR',
        count: c._count.id,
      })),
      locations: locationsGroup.map(l => ({
        lat: l.latitude || 43.8333,
        lng: l.longitude || 5.0333,
        ville: l.ville || 'Inconnu',
        pays: l.pays || 'France',
        codePays: l.codePays || 'FR',
        count: l._count.id,
      })),
      devices: devicesGroup.map(d => ({
        name: d.appareil || 'Desktop',
        count: d._count.id,
      })),
      recentVisits,
    })
  } catch (error) {
    console.error('Erreur API admin visiteurs:', error)
    return NextResponse.json({ error: 'Erreur lors du chargement des statistiques' }, { status: 500 })
  }
}
