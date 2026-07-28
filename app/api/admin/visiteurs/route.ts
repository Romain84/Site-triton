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

    const now = new Date()
    const todayStartStr = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()
    const sevenDaysAgoStr = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()
    const thirtyDaysAgoStr = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString()

    // 1. Compteurs globaux via SQL natif robuste
    let totalToday = 0
    let totalWeek = 0
    let totalMonth = 0
    let totalAll = 0

    try {
      const todayRes: any[] = await prisma.$queryRawUnsafe(`SELECT COUNT(*)::int as count FROM "visites" WHERE "createdAt" >= $1::timestamp`, todayStartStr)
      const weekRes: any[] = await prisma.$queryRawUnsafe(`SELECT COUNT(*)::int as count FROM "visites" WHERE "createdAt" >= $1::timestamp`, sevenDaysAgoStr)
      const monthRes: any[] = await prisma.$queryRawUnsafe(`SELECT COUNT(*)::int as count FROM "visites" WHERE "createdAt" >= $1::timestamp`, thirtyDaysAgoStr)
      const totalRes: any[] = await prisma.$queryRawUnsafe(`SELECT COUNT(*)::int as count FROM "visites"`)

      totalToday = Number(todayRes[0]?.count || 0)
      totalWeek = Number(weekRes[0]?.count || 0)
      totalMonth = Number(monthRes[0]?.count || 0)
      totalAll = Number(totalRes[0]?.count || 0)
    } catch (err) {
      console.error('Erreur SQL counts visites:', err)
    }

    // 2. Top Pays
    let topCountries: any[] = []
    try {
      topCountries = await prisma.$queryRawUnsafe(`
        SELECT COALESCE(pays, 'France') as pays, COALESCE("codePays", 'FR') as "codePays", COUNT(*)::int as count
        FROM "visites"
        GROUP BY pays, "codePays"
        ORDER BY count DESC
        LIMIT 15
      `)
    } catch (e) {
      console.error('Erreur SQL topCountries:', e)
    }

    // 3. Top Villes
    let topCities: any[] = []
    try {
      topCities = await prisma.$queryRawUnsafe(`
        SELECT COALESCE(ville, 'Cavaillon') as ville, COALESCE(pays, 'France') as pays, COALESCE("codePays", 'FR') as "codePays", COUNT(*)::int as count
        FROM "visites"
        GROUP BY ville, pays, "codePays"
        ORDER BY count DESC
        LIMIT 15
      `)
    } catch (e) {
      console.error('Erreur SQL topCities:', e)
    }

    // 4. Coordonnées géographiques pour la carte
    let locations: any[] = []
    try {
      locations = await prisma.$queryRawUnsafe(`
        SELECT COALESCE(latitude, 43.8333) as lat, COALESCE(longitude, 5.0333) as lng,
               COALESCE(ville, 'Cavaillon') as ville, COALESCE(pays, 'France') as pays,
               COALESCE("codePays", 'FR') as "codePays", COUNT(*)::int as count
        FROM "visites"
        GROUP BY latitude, longitude, ville, pays, "codePays"
        ORDER BY count DESC
        LIMIT 100
      `)
    } catch (e) {
      console.error('Erreur SQL locations:', e)
    }

    // 5. Répartition Appareils
    let devices: any[] = []
    try {
      devices = await prisma.$queryRawUnsafe(`
        SELECT COALESCE(appareil, 'Desktop') as name, COUNT(*)::int as count
        FROM "visites"
        GROUP BY appareil
      `)
    } catch (e) {
      console.error('Erreur SQL devices:', e)
    }

    // 6. 50 Dernières Visites
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
      stats: {
        today: totalToday,
        week: totalWeek,
        month: totalMonth,
        total: totalAll,
        uniqueCountries: topCountries.length,
      },
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
      recentVisits,
    })
  } catch (error) {
    console.error('Erreur API admin visiteurs GET:', error)
    return NextResponse.json({
      stats: { today: 0, week: 0, month: 0, total: 0, uniqueCountries: 0 },
      topCountries: [],
      topCities: [],
      locations: [],
      devices: [],
      recentVisits: [],
    })
  }
}
