import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin, handleRouteError } from '@/lib/api/guards'

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAdmin()
    if (!auth.ok) return auth.response

    const url = new URL(request.url)
    const period = url.searchParams.get('period') || '30d' // 'today' | '7d' | '30d' | 'all'

    // Auto-création de la table si absente dans PostgreSQL
    try {
      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "visites" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "ip" TEXT,
          "pays" TEXT DEFAULT 'France',
          "codePays" TEXT DEFAULT 'FR',
          "region" TEXT,
          "ville" TEXT DEFAULT 'Inconnu',
          "latitude" DOUBLE PRECISION DEFAULT 43.8333,
          "longitude" DOUBLE PRECISION DEFAULT 5.0333,
          "page" TEXT DEFAULT '/',
          "appareil" TEXT DEFAULT 'Desktop',
          "navigateur" TEXT DEFAULT 'Navigateur',
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
      `)
    } catch (e) {
      console.warn('Notice verification table visites:', e)
    }

    // Clause WHERE selon la période sélectionnée
    let whereClause = ''
    if (period === 'today') {
      whereClause = `WHERE "createdAt" >= NOW() - INTERVAL '24 hours'`
    } else if (period === '7d') {
      whereClause = `WHERE "createdAt" >= NOW() - INTERVAL '7 days'`
    } else if (period === '30d') {
      whereClause = `WHERE "createdAt" >= NOW() - INTERVAL '30 days'`
    }

    // 1. Compteurs globaux & Visiteurs Uniques
    let totalToday = 0, totalWeek = 0, totalMonth = 0, totalAll = 0
    let uniqueToday = 0, uniqueWeek = 0, uniqueMonth = 0, uniqueTotal = 0

    try {
      const todayRes: any[] = await prisma.$queryRawUnsafe(`SELECT COUNT(*)::int as total, COUNT(DISTINCT ip)::int as "unique" FROM "visites" WHERE "createdAt" >= NOW() - INTERVAL '24 hours'`)
      const weekRes: any[] = await prisma.$queryRawUnsafe(`SELECT COUNT(*)::int as total, COUNT(DISTINCT ip)::int as "unique" FROM "visites" WHERE "createdAt" >= NOW() - INTERVAL '7 days'`)
      const monthRes: any[] = await prisma.$queryRawUnsafe(`SELECT COUNT(*)::int as total, COUNT(DISTINCT ip)::int as "unique" FROM "visites" WHERE "createdAt" >= NOW() - INTERVAL '30 days'`)
      const totalRes: any[] = await prisma.$queryRawUnsafe(`SELECT COUNT(*)::int as total, COUNT(DISTINCT ip)::int as "unique" FROM "visites"`)

      totalToday = Number(todayRes[0]?.total || 0)
      uniqueToday = Number(todayRes[0]?.unique || 0)

      totalWeek = Number(weekRes[0]?.total || 0)
      uniqueWeek = Number(weekRes[0]?.unique || 0)

      totalMonth = Number(monthRes[0]?.total || 0)
      uniqueMonth = Number(monthRes[0]?.unique || 0)

      totalAll = Number(totalRes[0]?.total || 0)
      uniqueTotal = Number(totalRes[0]?.unique || 0)
    } catch (err) {
      console.error('Erreur SQL counts visites:', err)
    }

    // 2. Top Pages Consultées
    let topPages: any[] = []
    try {
      topPages = await prisma.$queryRawUnsafe(`
        SELECT COALESCE(page, '/') as page, COUNT(*)::int as count
        FROM "visites"
        ${whereClause}
        GROUP BY page
        ORDER BY count DESC
        LIMIT 10
      `)
    } catch (e) {
      console.error('Erreur SQL topPages:', e)
    }

    // 3. Top Pays
    let topCountries: any[] = []
    try {
      topCountries = await prisma.$queryRawUnsafe(`
        SELECT COALESCE(pays, 'France') as pays, COALESCE("codePays", 'FR') as "codePays", COUNT(*)::int as count
        FROM "visites"
        ${whereClause}
        GROUP BY pays, "codePays"
        ORDER BY count DESC
        LIMIT 15
      `)
    } catch (e) {
      console.error('Erreur SQL topCountries:', e)
    }

    // 4. Top Villes
    let topCities: any[] = []
    try {
      topCities = await prisma.$queryRawUnsafe(`
        SELECT COALESCE(ville, 'Cavaillon') as ville, COALESCE(pays, 'France') as pays, COALESCE("codePays", 'FR') as "codePays", COUNT(*)::int as count
        FROM "visites"
        ${whereClause}
        GROUP BY ville, pays, "codePays"
        ORDER BY count DESC
        LIMIT 15
      `)
    } catch (e) {
      console.error('Erreur SQL topCities:', e)
    }

    // 5. Coordonnées pour la carte
    let locations: any[] = []
    try {
      locations = await prisma.$queryRawUnsafe(`
        SELECT COALESCE(latitude, 43.8333) as lat, COALESCE(longitude, 5.0333) as lng,
               COALESCE(ville, 'Cavaillon') as ville, COALESCE(pays, 'France') as pays,
               COALESCE("codePays", 'FR') as "codePays", COUNT(*)::int as count
        FROM "visites"
        ${whereClause}
        GROUP BY latitude, longitude, ville, pays, "codePays"
        ORDER BY count DESC
        LIMIT 100
      `)
    } catch (e) {
      console.error('Erreur SQL locations:', e)
    }

    // 6. Appareils & Navigateurs
    let devices: any[] = []
    let browsers: any[] = []
    try {
      devices = await prisma.$queryRawUnsafe(`
        SELECT COALESCE(appareil, 'Desktop') as name, COUNT(*)::int as count
        FROM "visites"
        ${whereClause}
        GROUP BY appareil
      `)
      browsers = await prisma.$queryRawUnsafe(`
        SELECT COALESCE(navigateur, 'Autre') as name, COUNT(*)::int as count
        FROM "visites"
        ${whereClause}
        GROUP BY navigateur
        ORDER BY count DESC
        LIMIT 6
      `)
    } catch (e) {
      console.error('Erreur SQL devices/browsers:', e)
    }

    // 7. Pics d'affluence par Heure (0h à 23h)
    let hourlyDistribution: any[] = []
    try {
      const rawHours: any[] = await prisma.$queryRawUnsafe(`
        SELECT EXTRACT(HOUR FROM "createdAt")::int as hour, COUNT(*)::int as count
        FROM "visites"
        ${whereClause}
        GROUP BY hour
        ORDER BY hour ASC
      `)
      const hourMap = new Map<number, number>()
      rawHours.forEach((r: any) => hourMap.set(r.hour, r.count))
      for (let h = 0; h < 24; h++) {
        hourlyDistribution.push({
          hour: `${h}h`,
          count: hourMap.get(h) || 0,
        })
      }
    } catch (e) {
      console.error('Erreur SQL hourlyDistribution:', e)
    }

    // 8. Tendance des Visites par Jour (30 derniers jours)
    let dailyTrends: any[] = []
    try {
      dailyTrends = await prisma.$queryRawUnsafe(`
        SELECT TO_CHAR(DATE("createdAt"), 'YYYY-MM-DD') as date, COUNT(*)::int as count, COUNT(DISTINCT ip)::int as "unique"
        FROM "visites"
        WHERE "createdAt" >= NOW() - INTERVAL '30 days'
        GROUP BY DATE("createdAt")
        ORDER BY DATE("createdAt") ASC
      `)
    } catch (e) {
      console.error('Erreur SQL dailyTrends:', e)
    }

    // 9. 50 Dernières Visites
    let recentVisits: any[] = []
    try {
      recentVisits = await prisma.$queryRawUnsafe(`
        SELECT id, ip, COALESCE(pays, 'France') as pays, COALESCE("codePays", 'FR') as "codePays",
               COALESCE(region, 'PACA') as region, COALESCE(ville, 'Cavaillon') as ville,
               COALESCE(page, '/') as page, COALESCE(appareil, 'Desktop') as appareil,
               COALESCE(navigateur, 'Navigateur') as navigateur, "createdAt"
        FROM "visites"
        ORDER BY "createdAt" DESC
        LIMIT 50
      `)
    } catch (e) {
      console.error('Erreur SQL recentVisits:', e)
    }

    return NextResponse.json({
      period,
      stats: {
        today: totalToday,
        uniqueToday,
        week: totalWeek,
        uniqueWeek,
        month: totalMonth,
        uniqueMonth,
        total: totalAll,
        uniqueTotal,
        uniqueCountries: topCountries.length,
      },
      topPages: topPages.map((p: any) => ({
        page: p.page || '/',
        count: Number(p.count || 0),
      })),
      topCountries: topCountries.map((c: any) => ({
        pays: c.pays || 'France',
        codePays: c.codePays || 'FR',
        count: Number(c.count || 0),
      })),
      topCities: topCities.map((c: any) => ({
        ville: c.ville || 'Cavaillon',
        pays: c.pays || 'France',
        codePays: c.codePays || 'FR',
        count: Number(c.count || 0),
      })),
      locations: locations.map((l: any) => ({
        lat: Number(l.lat || 43.8333),
        lng: Number(l.lng || 5.0333),
        ville: l.ville || 'Cavaillon',
        pays: l.pays || 'France',
        codePays: l.codePays || 'FR',
        count: Number(l.count || 0),
      })),
      devices: devices.map((d: any) => ({
        name: d.name || 'Desktop',
        count: Number(d.count || 0),
      })),
      browsers: browsers.map((b: any) => ({
        name: b.name || 'Autre',
        count: Number(b.count || 0),
      })),
      hourlyDistribution,
      dailyTrends,
      recentVisits,
    })
  } catch (error) {
    return handleRouteError(error, 'Erreur lors de la récupération des statistiques visiteurs')
  }
}
