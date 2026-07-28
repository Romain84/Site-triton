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

interface VisiteursMapLeafletProps {
  locations: LocationPoint[]
}

export default function VisiteursMapLeaflet({ locations }: VisiteursMapLeafletProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<any>(null)

  useEffect(() => {
    if (!mapRef.current) return

    // Injection dynamique de la feuille de style Leaflet si absente
    if (!document.getElementById('leaflet-css')) {
      const link = document.createElement('link')
      link.id = 'leaflet-css'
      link.rel = 'stylesheet'
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
      document.head.appendChild(link)
    }

    // Charger Leaflet JS dynamiquement
    const loadLeaflet = async () => {
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
      if (!L || !mapRef.current) return

      // Réinitialiser la carte si elle existe déjà
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove()
      }

      // Initialiser la carte Leaflet centrée sur la France / Europe (lat 46.5, lng 2.5) avec un zoom monde (zoom 3)
      const map = L.map(mapRef.current, {
        center: [43.8333, 5.0333], // Centré par défaut sur Cavaillon / France
        zoom: 4,
        zoomControl: true,
        scrollWheelZoom: false,
      })

      mapInstanceRef.current = map

      // Tuiles cartographiques magnifiques CartoDB Dark Matter
      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
        subdomains: 'abcd',
        maxZoom: 19,
      }).addTo(map)

      // Si aucune visite enregistrée encore, afficher le marqueur du Siège du Triton Club Cavaillon
      const pointsToDisplay = locations.length > 0 ? locations : [
        { lat: 43.8333, lng: 5.0333, ville: 'Cavaillon (Siège Club)', pays: 'France', codePays: 'FR', count: 1 }
      ]

      // Ajouter chaque point de visiteur avec un cercle lumineux pulsant
      pointsToDisplay.forEach((loc) => {
        const radius = Math.min(Math.max(Math.sqrt(loc.count) * 6, 8), 35)

        const circle = L.circleMarker([loc.lat, loc.lng], {
          radius: radius,
          fillColor: '#00e2e6',
          color: '#ffffff',
          weight: 2,
          opacity: 0.9,
          fillOpacity: 0.55,
        }).addTo(map)

        const popupContent = `
          <div style="font-family: sans-serif; padding: 4px; color: #0f172a;">
            <div style="font-weight: 800; font-size: 13px; color: #0284c7;">📍 ${loc.ville}</div>
            <div style="font-size: 11px; color: #475569; margin-top: 2px;">${loc.pays} (${loc.codePays})</div>
            <div style="margin-top: 6px; font-weight: 700; font-size: 12px; background: #e0f2fe; color: #0369a1; padding: 3px 8px; border-radius: 6px; display: inline-block;">
              ⚡ ${loc.count} visite${loc.count > 1 ? 's' : ''}
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

    loadLeaflet()

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove()
        mapInstanceRef.current = null
      }
    }
  }, [locations])

  return (
    <div className="w-full h-[450px] rounded-2xl overflow-hidden shadow-2xl border border-slate-800 relative">
      <div ref={mapRef} className="w-full h-full bg-slate-950" />
      <div className="absolute bottom-3 right-3 bg-slate-900/90 backdrop-blur border border-slate-700/80 px-3 py-1.5 rounded-xl text-[11px] text-slate-300 z-[1000] shadow-lg flex items-center gap-2">
        <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse" />
        Carte temps réel OpenStreetMap / CartoDB
      </div>
    </div>
  )
}
