import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// Fonction utilitaire pour tenter la géolocalisation sans jamais bloquer
async function resolveGeoIp(ip: string) {
  if (!ip || ip === '127.0.0.1' || ip === '::1' || ip.startsWith('192.168.') || ip.startsWith('10.')) {
    return { pays: 'France', codePays: 'FR', region: 'Vaucluse', ville: 'Cavaillon', latitude: 43.8333, longitude: 5.0333 }
  }

  try {
    const res = await fetch(`https://ipapi.co/${ip}/json/`, {
      headers: { 'User-Agent': 'TritonClub/1.0' },
      signal: AbortSignal.timeout(1500),
    }).catch(() => null)

    if (res && res.ok) {
      const data = await res.json()
      if (data.country_name) {
        return {
          pays: data.country_name || 'France',
          codePays: data.country_code || 'FR',
          region: data.region || 'Provence-Alpes-Côte d\'Azur',
          ville: data.city || 'Cavaillon',
          latitude: data.latitude || 43.8333,
          longitude: data.longitude || 5.0333,
        }
      }
    }
  } catch {
    // Ignorer si échec
  }

  return { pays: 'France', codePays: 'FR', region: 'Vaucluse', ville: 'Cavaillon', latitude: 43.8333, longitude: 5.0333 }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const page = body.page || '/'
    const userAgent = request.headers.get('user-agent') || ''

    // Détection de l'appareil
    let appareil = 'Desktop'
    if (/mobile/i.test(userAgent)) appareil = 'Mobile'
    else if (/tablet|ipad/i.test(userAgent)) appareil = 'Tablette'

    // Détection du navigateur
    let navigateur = 'Autre'
    if (/chrome/i.test(userAgent)) navigateur = 'Chrome'
    else if (/safari/i.test(userAgent) && !/chrome/i.test(userAgent)) navigateur = 'Safari'
    else if (/firefox/i.test(userAgent)) navigateur = 'Firefox'
    else if (/edg/i.test(userAgent)) navigateur = 'Edge'

    // Récupération de l'IP
    const rawIp = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
                  request.headers.get('x-real-ip') ||
                  '127.0.0.1'

    const cleanIp = rawIp.replace('::ffff:', '')

    // Auto-création de la table si manquante (garantie de structure)
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
    } catch {
      // Ignorer si existante
    }

    // 1. Tenter la géolocalisation rapide
    const geo = await resolveGeoIp(cleanIp)

    // 2. Générer l'ID et exécuter l'INSERT immédiatement
    const id = `v_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`

    await prisma.$executeRawUnsafe(
      `INSERT INTO "visites" ("id", "ip", "pays", "codePays", "region", "ville", "latitude", "longitude", "page", "appareil", "navigateur", "createdAt")
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW());`,
      id, cleanIp, geo.pays, geo.codePays, geo.region, geo.ville, geo.latitude, geo.longitude, page, appareil, navigateur
    )

    return NextResponse.json({ success: true, id, ville: geo.ville, ip: cleanIp })
  } catch (error) {
    console.error('Erreur analytics track POST:', error)
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 })
  }
}

// Permet un test rapide en ouvrant l'URL dans le navigateur mobile
export async function GET(request: NextRequest) {
  const page = request.nextUrl.searchParams.get('page') || '/'
  const userAgent = request.headers.get('user-agent') || ''
  let appareil = 'Desktop'
  if (/mobile/i.test(userAgent)) appareil = 'Mobile'

  const rawIp = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || '127.0.0.1'
  const cleanIp = rawIp.replace('::ffff:', '')

  const id = `v_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
  const geo = await resolveGeoIp(cleanIp)

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

    await prisma.$executeRawUnsafe(
      `INSERT INTO "visites" ("id", "ip", "pays", "codePays", "region", "ville", "latitude", "longitude", "page", "appareil", "navigateur", "createdAt")
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW());`,
      id, cleanIp, geo.pays, geo.codePays, geo.region, geo.ville, geo.latitude, geo.longitude, page, appareil, 'Mobile Test'
    )
    return NextResponse.json({ success: true, message: 'Visite de test enregistrée avec succès !', id, ip: cleanIp, ville: geo.ville })
  } catch (err) {
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 })
  }
}
