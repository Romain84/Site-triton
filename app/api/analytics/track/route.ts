import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

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

    let pays = 'France'
    let codePays = 'FR'
    let region = 'Provence-Alpes-Côte d\'Azur'
    let ville = 'Cavaillon'
    let latitude = 43.8333
    let longitude = 5.0333

    // Si IP publique valide, tenter une géolocalisation via ip-api
    const cleanIp = rawIp.replace('::ffff:', '')
    const isPrivateIp = cleanIp === '127.0.0.1' || cleanIp === '::1' || cleanIp.startsWith('192.168.') || cleanIp.startsWith('10.')

    if (!isPrivateIp) {
      try {
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 2500)
        const geoRes = await fetch(`http://ip-api.com/json/${cleanIp}?fields=status,country,countryCode,regionName,city,lat,lon`, {
          signal: controller.signal,
        })
        clearTimeout(timeoutId)

        if (geoRes.ok) {
          const geoData = await geoRes.json()
          if (geoData.status === 'success') {
            pays = geoData.country || pays
            codePays = geoData.countryCode || codePays
            region = geoData.regionName || region
            ville = geoData.city || ville
            latitude = geoData.lat || latitude
            longitude = geoData.lon || longitude
          }
        }
      } catch {
        // Fallback discret en cas de timeout
      }
    }

    // Auto-création de la table si elle n'existe pas encore dans PostgreSQL
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
      // Ignorer si déjà existante
    }

    // Génération ID CUID natif rapide
    const id = `v_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`

    // Insérer la visite
    await prisma.$executeRawUnsafe(
      `INSERT INTO "visites" ("id", "ip", "pays", "codePays", "region", "ville", "latitude", "longitude", "page", "appareil", "navigateur", "createdAt")
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW());`,
      id, cleanIp, pays, codePays, region, ville, latitude, longitude, page, appareil, navigateur
    )

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Erreur analytics track:', error)
    return NextResponse.json({ success: false }, { status: 500 })
  }
}
