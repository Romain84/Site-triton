import { NextRequest, NextResponse } from 'next/server'
import { getCoachSession } from '@/lib/auth/session'
import { logger } from '@/lib/logger'

const coachLogger = logger.withContext('CoachDistance')

import {
  DEPART_CAVAILLON,
  PISCINES_REGIONALES,
  haversineDistance,
  buildGoogleMapsUrl,
} from '@/lib/competition-distance'

export async function POST(request: NextRequest) {
  try {
    const session = await getCoachSession()
    if (!session) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const body = await request.json()
    const { destination, piscineId } = body

    if (!destination && !piscineId) {
      return NextResponse.json(
        { error: 'Veuillez renseigner un lieu ou choisir une piscine' },
        { status: 400 }
      )
    }

    let targetLat: number | null = null
    let targetLon: number | null = null
    let resolvedLabel = destination || ''
    let distanceKm = 0
    let dureeMinutes = 0

    // 1. Recherche dans le catalogue prédéfini
    if (piscineId) {
      const preset = PISCINES_REGIONALES.find((p) => p.id === piscineId)
      if (preset) {
        targetLat = preset.lat
        targetLon = preset.lon
        resolvedLabel = `${preset.nom}, ${preset.ville}`
        distanceKm = preset.distanceKmEstimee
      }
    }

    // 2. Si pas trouvé dans les presets, recherche géocodage
    if (targetLat === null || targetLon === null) {
      // Vérifier correspondance partielle avec catalogue
      const cleanDest = destination.trim().toLowerCase()
      const matchPreset = PISCINES_REGIONALES.find(
        (p) =>
          cleanDest.includes(p.ville.toLowerCase()) ||
          p.nom.toLowerCase().includes(cleanDest)
      )

      if (matchPreset) {
        targetLat = matchPreset.lat
        targetLon = matchPreset.lon
        resolvedLabel = `${matchPreset.nom}, ${matchPreset.ville}`
        distanceKm = matchPreset.distanceKmEstimee
      } else {
        // Géocodage externe : d'abord l'API BAN (Base Adresse Nationale - France, très rapide)
        try {
          const banRes = await fetch(
            `https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(destination)}&limit=1`,
            { signal: AbortSignal.timeout(3000) }
          )
          if (banRes.ok) {
            const banData = await banRes.json()
            if (banData.features && banData.features.length > 0) {
              const coords = banData.features[0].geometry.coordinates
              targetLon = coords[0]
              targetLat = coords[1]
              resolvedLabel = banData.features[0].properties.label || destination
            }
          }
        } catch {
          // Si BAN échoue, tentative Nominatim
          try {
            const nomRes = await fetch(
              `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(destination)}&limit=1&countrycodes=fr`,
              {
                headers: { 'User-Agent': 'TritonClubCavaillon/1.0' },
                signal: AbortSignal.timeout(3000),
              }
            )
            if (nomRes.ok) {
              const nomData = await nomRes.json()
              if (nomData.length > 0) {
                targetLat = parseFloat(nomData[0].lat)
                targetLon = parseFloat(nomData[0].lon)
                resolvedLabel = nomData[0].display_name
              }
            }
          } catch {
            // Ignorer, on traitera les coordonnées manquantes
          }
        }
      }
    }

    // 3. Calcul de l'itinéraire routier le plus rapide (OSRM Driving)
    if (targetLat !== null && targetLon !== null) {
      try {
        const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${DEPART_CAVAILLON.lon},${DEPART_CAVAILLON.lat};${targetLon},${targetLat}?overview=false`
        const osrmRes = await fetch(osrmUrl, { signal: AbortSignal.timeout(4000) })
        if (osrmRes.ok) {
          const osrmData = await osrmRes.json()
          if (osrmData.routes && osrmData.routes.length > 0) {
            const route = osrmData.routes[0]
            // Distance en mètres convertie en kilomètres, arrondie au km supérieur ou plus proche
            distanceKm = Math.round(route.distance / 1000)
            dureeMinutes = Math.round(route.duration / 60)
          }
        }
      } catch (err) {
        coachLogger.warn('Erreur OSRM router, utilisation du calcul approché', err)
      }

      // Si le calcul routier OSRM a échoué mais qu'on a les coordonnées GPS
      if (distanceKm === 0) {
        const distOiseau = haversineDistance(
          DEPART_CAVAILLON.lat,
          DEPART_CAVAILLON.lon,
          targetLat,
          targetLon
        )
        // Facteur de sinuosité routière moyen ~1.28
        distanceKm = Math.round(distOiseau * 1.28)
        dureeMinutes = Math.round((distanceKm / 85) * 60) // moyenne 85 km/h
      }
    }

    // Calcul du forfait transport : distance aller × 0,30 €
    const forfaitTransport = Math.round(distanceKm * 0.30 * 100) / 100
    const googleMapsUrl = buildGoogleMapsUrl(resolvedLabel || destination)

    let dureeTexte = ''
    if (dureeMinutes > 0) {
      const h = Math.floor(dureeMinutes / 60)
      const m = dureeMinutes % 60
      dureeTexte = h > 0 ? `${h}h${m.toString().padStart(2, '0')}` : `${m} min`
    }

    return NextResponse.json({
      success: true,
      distanceKm,
      forfaitTransport,
      dureeMinutes,
      dureeTexte,
      resolvedLabel,
      googleMapsUrl,
    })
  } catch (error) {
    coachLogger.error('Erreur lors du calcul de distance', error)
    return NextResponse.json(
      { error: 'Erreur lors du calcul de distance' },
      { status: 500 }
    )
  }
}

// GET endpoint pour renvoyer la liste des piscines régionales prédéfinies
export async function GET() {
  return NextResponse.json({
    piscines: PISCINES_REGIONALES,
    depart: DEPART_CAVAILLON,
    tarifKm: 0.30,
  })
}
