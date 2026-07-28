'use client'

import { useEffect, useRef } from 'react'

interface LocationPoint {
  lat: number
  lng: number
  ville: string
  pays: string
  codePays: string
  count: number
}

interface VisiteursMapGoogleStyleProps {
  locations: LocationPoint[]
}

export default function VisiteursMapGoogleStyle({ locations }: VisiteursMapGoogleStyleProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<any>(null)

  useEffect(() => {
    if (!mapContainerRef.current) return

    // Charger dynamiquement les CSS de Leaflet si non présents
    if (!document.getElementById('leaflet-style-google')) {
      const link = document.createElement('link')
      link.id = 'leaflet-style-google'
      link.rel = 'stylesheet'
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
      document.head.appendChild(link)
    }

    const initMap = async () => {
      // @ts-ignore
      if (typeof window !== 'undefined' && !window.L) {
        await new Promise((resolve) => {
          const script = document.createElement('script')
          script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
          script.onload = resolve
          document.body.appendChild(script)
        })
      }

      // @ts-ignore
      const L = window.L
      if (!L || !mapContainerRef.current) return

      // Détruire l'ancienne instance si elle existe
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove()
        mapInstanceRef.current = null
      }

      // Déterminer le centre de la carte (sur Cavaillon/France par défaut)
      const centerLat = locations.length > 0 ? (locations[0].lat || 43.8333) : 43.8333
      const centerLng = locations.length > 0 ? (locations[0].lng || 5.0333) : 5.0333

      // Initialiser la carte Leaflet
      const map = L.map(mapContainerRef.current, {
        center: [centerLat, centerLng],
        zoom: locations.length > 1 ? 3 : 5,
        zoomControl: true,
        scrollWheelZoom: false,
      })

      mapInstanceRef.current = map

      // Tuiles CartoDB Voyager : Style type Google Maps / Apple Maps (clair, moderne, villes et pays nets)
      L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>',
        subdomains: 'abcd',
        maxZoom: 19,
      }).addTo(map)

      // Forcer le redimensionnement instantané pour éviter tout décalage d'affichage
      setTimeout(() => {
        map.invalidateSize()
      }, 100)

      // Points de visites à afficher
      const pointsToDisplay = locations.length > 0 ? locations : [
        { lat: 43.8333, lng: 5.0333, ville: 'Cavaillon (Siège Club)', pays: 'France', codePays: 'FR', count: 1 }
      ]

      // Créer les marqueurs style Google Maps avec popups
      pointsToDisplay.forEach((loc) => {
        const radius = Math.min(Math.max(Math.sqrt(loc.count) * 7, 9), 32)

        // Marqueur cercle style Google Maps (Rouge / Orange Google vibrant)
        const circle = L.circleMarker([loc.lat, loc.lng], {
          radius: radius,
          fillColor: '#ea4335', // Rouge Google Maps
          color: '#ffffff',
          weight: 2.5,
          opacity: 1,
          fillOpacity: 0.7,
        }).addTo(map)

        const popupContent = `
          <div style="font-family: system-ui, -apple-system, sans-serif; padding: 6px 8px; min-width: 140px;">
            <div style="font-weight: 800; font-size: 14px; color: #1e293b; display: flex; items-center; gap: 4px;">
              📍 ${loc.ville}
            </div>
            <div style="font-size: 12px; color: #64748b; margin-top: 2px;">
              ${loc.pays} (${loc.codePays})
            </div>
            <div style="margin-top: 8px; font-weight: 700; font-size: 12px; background: #fef2f2; color: #dc2626; border: 1px solid #fecaca; padding: 4px 8px; border-radius: 6px; text-align: center;">
              ⚡ ${loc.count} connexion${loc.count > 1 ? 's' : ''}
            </div>
          </div>
        `

        circle.bindPopup(popupContent)
        circle.bindTooltip(`<b>${loc.ville}</b>: ${loc.count} visite(s)`, {
          permanent: false,
          direction: 'top',
        })
      })
    }

    initMap()

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove()
        mapInstanceRef.current = null
      }
    }
  }, [locations])

  return (
    <div className="w-full bg-white rounded-2xl border border-slate-200 p-2 shadow-lg relative overflow-hidden">
      {/* Fenêtre de la Carte Style Google Maps */}
      <div className="relative w-full h-[480px] rounded-xl overflow-hidden bg-slate-100">
        <div ref={mapContainerRef} className="w-full h-full z-10" />

        {/* Badge Google Maps / OpenStreetMap */}
        <div className="absolute bottom-3 left-3 z-[1000] bg-white/90 backdrop-blur border border-slate-200 px-3 py-1.5 rounded-xl text-[11px] font-semibold text-slate-700 shadow-md flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
          Carte style Google Maps · Vue satellite & géographique
        </div>
      </div>
    </div>
  )
}
