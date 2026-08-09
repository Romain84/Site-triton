import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// Cache mémoire des adresses IP déjà géolocalisées pour éviter les requêtes API réseau répétées
const ipGeoCache = new Map<string, { pays: string; codePays: string; region: string; ville: string; latitude: number; longitude: number; codePostal: string; fai: string; timezone: string; timestamp: number }>()
const CACHE_TTL_MS = 24 * 60 * 60 * 1000 // 24 heures

// Fonction utilitaire pour tenter la géolocalisation avec fallback multi-fournisseurs
async function resolveGeoIp(ip: string, requestHeaders?: Headers) {
  // 1. IP locale ou loopback -> Cavaillon / Vaucluse
  if (!ip || ip === '127.0.0.1' || ip === '::1' || ip.startsWith('192.168.') || ip.startsWith('10.') || ip.startsWith('172.16.')) {
    return { pays: 'France', codePays: 'FR', region: 'Vaucluse', ville: 'Cavaillon', latitude: 43.8333, longitude: 5.0333, codePostal: '84300', fai: 'Réseau local', timezone: 'Europe/Paris' }
  }

  // 2. Vérifier le cache mémoire
  const cached = ipGeoCache.get(ip)
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached
  }

  // 3. Vérifier les en-têtes CDN / Reverse Proxy (Vercel / Cloudflare / OVH)
  if (requestHeaders) {
    const headerCity = requestHeaders.get('x-vercel-ip-city') || requestHeaders.get('cf-ipcity')
    const headerCountry = requestHeaders.get('x-vercel-ip-country') || requestHeaders.get('cf-ipcountry')
    const headerLat = parseFloat(requestHeaders.get('x-vercel-ip-latitude') || '')
    const headerLng = parseFloat(requestHeaders.get('x-vercel-ip-longitude') || '')

    if (headerCity && headerCountry && !isNaN(headerLat) && !isNaN(headerLng)) {
      const geoResult = {
        pays: headerCountry === 'FR' ? 'France' : headerCountry,
        codePays: headerCountry,
        region: 'PACA',
        ville: decodeURIComponent(headerCity),
        latitude: headerLat,
        longitude: headerLng,
        codePostal: '',
        fai: '',
        timezone: 'Europe/Paris',
      }
      ipGeoCache.set(ip, { ...geoResult, timestamp: Date.now() })
      return geoResult
    }
  }

  // 4. Fournisseur 1 : ip-api.com (gratuit, très précis, 45 req/min, aucune clé requise)
  try {
    const res = await fetch(`http://ip-api.com/json/${ip}?fields=status,country,countryCode,regionName,city,lat,lon,zip,isp,timezone`, {
      signal: AbortSignal.timeout(1200),
    }).catch(() => null)

    if (res && res.ok) {
      const data = await res.json()
      if (data.status === 'success' && data.city) {
        const geoResult = {
          pays: data.country || 'France',
          codePays: data.countryCode || 'FR',
          region: data.regionName || 'Provence-Alpes-Côte d\'Azur',
          ville: data.city,
          latitude: data.lat || 43.8333,
          longitude: data.lon || 5.0333,
          codePostal: data.zip || '',
          fai: data.isp || '',
          timezone: data.timezone || 'Europe/Paris',
        }
        ipGeoCache.set(ip, { ...geoResult, timestamp: Date.now() })
        return geoResult
      }
    }
  } catch {
    // Ignorer et passer au suivant
  }

  // 5. Fournisseur 2 : ipwho.is (gratuit, indépendant)
  try {
    const res = await fetch(`https://ipwho.is/${ip}`, {
      signal: AbortSignal.timeout(1200),
    }).catch(() => null)

    if (res && res.ok) {
      const data = await res.json()
      if (data.success && data.city) {
        const geoResult = {
          pays: data.country || 'France',
          codePays: data.country_code || 'FR',
          region: data.region || 'Provence-Alpes-Côte d\'Azur',
          ville: data.city,
          latitude: data.latitude || 43.8333,
          longitude: data.longitude || 5.0333,
          codePostal: data.postal || '',
          fai: data.connection?.isp || data.connection?.org || '',
          timezone: data.timezone?.id || 'Europe/Paris',
        }
        ipGeoCache.set(ip, { ...geoResult, timestamp: Date.now() })
        return geoResult
      }
    }
  } catch {
    // Ignorer et passer au suivant
  }

  // 6. Fournisseur 3 : ipapi.co
  try {
    const res = await fetch(`https://ipapi.co/${ip}/json/`, {
      headers: { 'User-Agent': 'TritonClub/1.0' },
      signal: AbortSignal.timeout(1200),
    }).catch(() => null)

    if (res && res.ok) {
      const data = await res.json()
      if (data.country_name) {
        const geoResult = {
          pays: data.country_name || 'France',
          codePays: data.country_code || 'FR',
          region: data.region || 'Provence-Alpes-Côte d\'Azur',
          ville: data.city || 'Cavaillon',
          latitude: data.latitude || 43.8333,
          longitude: data.longitude || 5.0333,
          codePostal: data.postal || '',
          fai: data.org || '',
          timezone: data.timezone || 'Europe/Paris',
        }
        ipGeoCache.set(ip, { ...geoResult, timestamp: Date.now() })
        return geoResult
      }
    }
  } catch {
    // Ignorer
  }

  // Fallback si tout échoue
  return { pays: 'France', codePays: 'FR', region: 'Vaucluse', ville: 'Cavaillon', latitude: 43.8333, longitude: 5.0333, codePostal: '84300', fai: 'Inconnu', timezone: 'Europe/Paris' }
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
    if (/chrome/i.test(userAgent) && !/edg/i.test(userAgent)) navigateur = 'Chrome'
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
          "codePostal" TEXT,
          "fai" TEXT,
          "timezone" TEXT DEFAULT 'Europe/Paris',
          "page" TEXT DEFAULT '/',
          "appareil" TEXT DEFAULT 'Desktop',
          "navigateur" TEXT DEFAULT 'Navigateur',
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
      `)
      // Migration colonnes pour bases existantes
      await prisma.$executeRawUnsafe(`ALTER TABLE "visites" ADD COLUMN IF NOT EXISTS "codePostal" TEXT;`)
      await prisma.$executeRawUnsafe(`ALTER TABLE "visites" ADD COLUMN IF NOT EXISTS "fai" TEXT;`)
      await prisma.$executeRawUnsafe(`ALTER TABLE "visites" ADD COLUMN IF NOT EXISTS "timezone" TEXT DEFAULT 'Europe/Paris';`)
    } catch {
      // Ignorer si existante
    }

    // 1. Géolocalisation avec fallback multi-fournisseurs et cache
    const geo = await resolveGeoIp(cleanIp, request.headers)

    // 2. Générer l'ID et exécuter l'INSERT immédiatement
    const id = `v_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`

    await prisma.$executeRawUnsafe(
      `INSERT INTO "visites" ("id", "ip", "pays", "codePays", "region", "ville", "latitude", "longitude", "codePostal", "fai", "timezone", "page", "appareil", "navigateur", "createdAt")
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, NOW());`,
      id, cleanIp, geo.pays, geo.codePays, geo.region, geo.ville, geo.latitude, geo.longitude, geo.codePostal, geo.fai, geo.timezone, page, appareil, navigateur
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
        "codePostal" TEXT,
        "fai" TEXT,
        "timezone" TEXT DEFAULT 'Europe/Paris',
        "page" TEXT DEFAULT '/',
        "appareil" TEXT DEFAULT 'Desktop',
        "navigateur" TEXT DEFAULT 'Navigateur',
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `)

    await prisma.$executeRawUnsafe(
      `INSERT INTO "visites" ("id", "ip", "pays", "codePays", "region", "ville", "latitude", "longitude", "codePostal", "fai", "timezone", "page", "appareil", "navigateur", "createdAt")
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, NOW());`,
      id, cleanIp, geo.pays, geo.codePays, geo.region, geo.ville, geo.latitude, geo.longitude, geo.codePostal, geo.fai, geo.timezone, page, appareil, 'Mobile Test'
    )
    return NextResponse.json({ success: true, message: 'Visite de test enregistrée avec succès !', id, ip: cleanIp, ville: geo.ville })
  } catch (err) {
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 })
  }
}
