'use client'

import { useState, useEffect, useRef } from 'react'

interface LocationPoint {
  lat: number
  lng: number
  ville: string
  pays: string
  codePays: string
  count: number
}

interface VisiteursMapProps {
  locations: LocationPoint[]
}

declare global {
  interface Window {
    L: any
  }
}

// Projection équirectangulaire pour carte vectorielle de secours (sans CDN externe)
function latLngToSvgCoords(lat: number, lng: number, width: number = 800, height: number = 400) {
  const x = ((lng + 180) * (width / 360))
  const y = (((-1 * lat) + 90) * (height / 180))
  return { x, y }
}

export default function VisiteursMapGoogleStyle({ locations }: VisiteursMapProps) {
  const [mapStyle, setMapStyle] = useState<'dark' | 'light' | 'satellite'>('dark')
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<any>(null)
  const markersRef = useRef<any[]>([])
  const [leafletLoaded, setLeafletLoaded] = useState(false)
  const [useFallbackMap, setUseFallbackMap] = useState(false)
  const [selectedCity, setSelectedCity] = useState<LocationPoint | null>(null)

  const totalVisits = locations.reduce((sum, l) => sum + l.count, 0) || 1
  const maxCount = Math.max(...locations.map((l) => l.count), 1)

  // Chargeur de script Leaflet résilient avec timeout et fallback automatique
  useEffect(() => {
    if (typeof window === 'undefined') return

    // 1. Déjà disponible dans la fenêtre
    if (window.L) {
      setLeafletLoaded(true)
      return
    }

    // 2. Vérifier si un tag script existe déjà
    const existingScript = document.querySelector('script[src*="leaflet"]') as HTMLScriptElement
    if (existingScript) {
      const checkInterval = setInterval(() => {
        if (window.L) {
          setLeafletLoaded(true)
          clearInterval(checkInterval)
        }
      }, 100)

      const timer = setTimeout(() => {
        clearInterval(checkInterval)
        if (!window.L) setUseFallbackMap(true)
      }, 2500)

      return () => {
        clearInterval(checkInterval)
        clearTimeout(timer)
      }
    }

    // 3. Injecter Leaflet CSS
    if (!document.querySelector('link[href*="leaflet"]')) {
      const cssLink = document.createElement('link')
      cssLink.rel = 'stylesheet'
      cssLink.href = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.css'
      document.head.appendChild(cssLink)
    }

    // 4. Injecter Leaflet JS avec fallback
    const jsScript = document.createElement('script')
    jsScript.src = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.js'
    jsScript.async = true

    jsScript.onload = () => {
      if (window.L) setLeafletLoaded(true)
    }

    jsScript.onerror = () => {
      const fallbackScript = document.createElement('script')
      fallbackScript.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
      fallbackScript.onload = () => {
        if (window.L) setLeafletLoaded(true)
        else setUseFallbackMap(true)
      }
      fallbackScript.onerror = () => setUseFallbackMap(true)
      document.body.appendChild(fallbackScript)
    }

    document.body.appendChild(jsScript)

    // Timeout de sécurité : si le CDN est bloqué par le navigateur / adblocker après 2.5s -> Basculer sur la carte vectorielle
    const timeout = setTimeout(() => {
      if (!window.L) {
        setUseFallbackMap(true)
      }
    }, 2500)

    return () => clearTimeout(timeout)
  }, [])

  // Initialisation et mise à jour de la carte Leaflet
  useEffect(() => {
    if (!leafletLoaded || useFallbackMap || !mapContainerRef.current) return
    const L = window.L

    try {
      if (!mapInstanceRef.current) {
        const initialLat = locations.length > 0 ? locations[0].lat : 43.8333
        const initialLng = locations.length > 0 ? locations[0].lng : 5.0333

        const map = L.map(mapContainerRef.current, {
          center: [initialLat, initialLng],
          zoom: 5,
          zoomControl: false,
        })

        L.control.zoom({ position: 'topleft' }).addTo(map)
        mapInstanceRef.current = map
      }

      const map = mapInstanceRef.current

      let tileUrl = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
      let attribution = '&copy; OpenStreetMap &copy; CARTO'

      if (mapStyle === 'light') {
        tileUrl = 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png'
      } else if (mapStyle === 'satellite') {
        tileUrl = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
        attribution = '&copy; Esri World Imagery'
      }

      map.eachLayer((layer: any) => {
        if (layer instanceof L.TileLayer) {
          map.removeLayer(layer)
        }
      })

      L.tileLayer(tileUrl, { attribution, maxZoom: 19 }).addTo(map)

      markersRef.current.forEach((m) => map.removeLayer(m))
      markersRef.current = []

      if (locations.length > 0) {
        locations.forEach((loc) => {
          const sizeRatio = loc.count / maxCount
          const radius = Math.max(8, Math.min(48, Math.sqrt(loc.count) * 6.5 + 4))

          let color = '#10b981'
          let fillColor = '#10b981'

          if (loc.count >= 15 || sizeRatio > 0.4) {
            color = '#f43f5e'
            fillColor = '#ef4444'
          } else if (loc.count >= 5 || sizeRatio > 0.15) {
            color = '#f59e0b'
            fillColor = '#f59e0b'
          }

          const pct = Math.round((loc.count / totalVisits) * 100)

          const marker = L.circleMarker([loc.lat, loc.lng], {
            radius,
            color,
            weight: 2,
            opacity: 0.9,
            fillColor,
            fillOpacity: mapStyle === 'dark' ? 0.65 : 0.5,
          }).addTo(map)

          const popupContent = `
            <div style="font-family: sans-serif; padding: 4px; text-align: center;">
              <div style="font-weight: 800; font-size: 13px; color: #0f172a;">${loc.ville} (${loc.codePays})</div>
              <div style="font-size: 11px; color: #64748b; margin-top: 2px;">${loc.pays}</div>
              <div style="margin-top: 6px; display: inline-block; padding: 3px 8px; background: #3b82f6; color: white; border-radius: 9999px; font-weight: 800; font-size: 11px;">
                ${loc.count} visite${loc.count > 1 ? 's' : ''} (${pct}%)
              </div>
            </div>
          `

          marker.bindPopup(popupContent)
          marker.on('click', () => setSelectedCity(loc))
          markersRef.current.push(marker)
        })

        if (locations.length > 1) {
          const bounds = L.latLngBounds(locations.map((l) => [l.lat, l.lng]))
          map.fitBounds(bounds, { padding: [40, 40], maxZoom: 8 })
        }
      }
    } catch (err) {
      console.warn('Leaflet error, switching to fallback map:', err)
      setUseFallbackMap(true)
    }
  }, [leafletLoaded, locations, mapStyle, useFallbackMap])

  const flyToLocation = (loc: LocationPoint) => {
    setSelectedCity(loc)
    if (mapInstanceRef.current && window.L && !useFallbackMap) {
      mapInstanceRef.current.flyTo([loc.lat, loc.lng], 10, { duration: 1.2 })
    }
  }

  return (
    <div className="w-full bg-slate-900 rounded-2xl border border-slate-800 p-4 shadow-xl space-y-3 relative text-white overflow-hidden">
      {/* En-tête de la Carte */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2.5">
          <span className="w-3 h-3 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_#34d399]" />
          <div>
            <h2 className="text-sm font-extrabold text-white flex items-center gap-2">
              Carte des Visiteurs & Taille Proportionnelle des Villes
            </h2>
            <p className="text-[11px] text-slate-400 font-medium">
              La taille des cercles grandit en fonction du nombre de connexions enregistrées dans chaque ville
            </p>
          </div>
        </div>

        {/* Boutons de style de carte */}
        <div className="flex items-center gap-1 bg-slate-800/80 p-1 rounded-xl border border-slate-700/80 self-start sm:self-auto">
          <button
            onClick={() => setMapStyle('dark')}
            className={`px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              mapStyle === 'dark' ? 'bg-primary text-white shadow-xs' : 'text-slate-400 hover:text-white'
            }`}
          >
            🌙 Mode Sombre
          </button>
          <button
            onClick={() => setMapStyle('light')}
            className={`px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              mapStyle === 'light' ? 'bg-primary text-white shadow-xs' : 'text-slate-400 hover:text-white'
            }`}
          >
            🗺️ Plan Clair
          </button>
          <button
            onClick={() => setMapStyle('satellite')}
            className={`px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              mapStyle === 'satellite' ? 'bg-primary text-white shadow-xs' : 'text-slate-400 hover:text-white'
            }`}
          >
            🛰️ Satellite HD
          </button>
        </div>
      </div>

      {/* Conteneur de la Carte */}
      <div className="relative w-full h-[500px] rounded-xl overflow-hidden bg-slate-950 border border-slate-800">
        {!useFallbackMap ? (
          <>
            {!leafletLoaded && (
              <div className="absolute inset-0 flex items-center justify-center bg-slate-900 text-slate-400 text-xs font-bold z-30">
                <span className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mr-2" />
                Chargement de la carte interactive…
              </div>
            )}
            <div ref={mapContainerRef} className="w-full h-full z-10" />
          </>
        ) : (
          /* Carte Vectorielle de secours ultra rapide sans aucun script tiers */
          <div className="relative w-full h-full bg-slate-950 flex flex-col items-center justify-center overflow-hidden">
            <svg viewBox="0 0 800 400" className="w-full h-full opacity-90">
              <rect width="800" height="400" fill="#090d16" />
              {/* Villes avec cercles proportionnels SVG */}
              {locations.map((loc, idx) => {
                const { x, y } = latLngToSvgCoords(loc.lat, loc.lng, 800, 400)
                const radius = Math.max(10, Math.min(45, Math.sqrt(loc.count) * 6 + 4))
                const isSelected = selectedCity?.ville === loc.ville
                const color = loc.count >= 15 ? '#ef4444' : loc.count >= 5 ? '#f59e0b' : '#10b981'

                return (
                  <g key={idx} className="cursor-pointer" onClick={() => setSelectedCity(loc)}>
                    <circle
                      cx={x} cy={y} r={radius * 1.4}
                      fill={color} opacity="0.25"
                      className="animate-ping"
                    />
                    <circle
                      cx={x} cy={y} r={radius}
                      fill={color} fillOpacity="0.7"
                      stroke={isSelected ? '#ffffff' : color}
                      strokeWidth={isSelected ? 3 : 1.5}
                    />
                    <text
                      x={x} y={y + 4}
                      textAnchor="middle" fill="#ffffff"
                      fontSize={Math.max(10, Math.min(14, radius * 0.7))}
                      fontWeight="bold"
                    >
                      {loc.count}
                    </text>
                  </g>
                )
              })}
            </svg>

            {selectedCity && (
              <div className="absolute bottom-4 left-4 z-30 bg-slate-900/95 border border-primary/40 p-3 rounded-xl shadow-xl text-xs">
                <div className="font-extrabold text-white">{selectedCity.ville} ({selectedCity.codePays})</div>
                <div className="text-slate-400 text-[11px]">{selectedCity.pays}</div>
                <div className="mt-1 font-bold text-primary">{selectedCity.count} visite(s)</div>
              </div>
            )}
          </div>
        )}

        {/* Tiroir / Liste latérale interactive des villes */}
        <div className="absolute top-3 right-3 z-20 max-w-xs w-64 bg-slate-900/95 backdrop-blur-md border border-slate-800 p-3 rounded-xl shadow-2xl max-h-80 overflow-y-auto hidden sm:block">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-2">
            <span className="text-xs font-extrabold text-slate-200">📍 Villes ({locations.length})</span>
            <span className="text-[10px] text-slate-400 font-semibold">Taille cercle = Visites</span>
          </div>
          <div className="space-y-1.5">
            {locations.length > 0 ? (
              locations.map((loc, idx) => {
                const isSelected = selectedCity?.ville === loc.ville
                return (
                  <button
                    key={idx}
                    onClick={() => flyToLocation(loc)}
                    className={`w-full flex items-center justify-between text-[11px] p-2 rounded-lg transition-all text-left cursor-pointer ${
                      isSelected
                        ? 'bg-primary/20 border border-primary/40 text-white font-bold'
                        : 'bg-slate-800/40 hover:bg-slate-800 text-slate-300 border border-transparent'
                    }`}
                  >
                    <div className="truncate pr-1">
                      <span className="font-bold text-white">{loc.ville}</span>
                      <span className="text-slate-400 text-[10px] ml-1">({loc.codePays})</span>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-black bg-rose-500/20 text-rose-300 border border-rose-500/30">
                        {loc.count} v.
                      </span>
                    </div>
                  </button>
                )
              })
            ) : (
              <p className="text-xs text-slate-500 italic text-center py-2">En attente de connexions…</p>
            )}
          </div>
        </div>

        {/* Légende d'échelle des tailles de cercles */}
        <div className="absolute bottom-3 left-3 z-20 bg-slate-900/90 backdrop-blur-md border border-slate-800 px-3 py-2 rounded-xl shadow-lg flex items-center gap-4 text-[10px] text-slate-300">
          <span className="font-bold text-white uppercase tracking-wider text-[9px]">Échelle des cercles :</span>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
            <span>1-3 visites</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-4 h-4 rounded-full bg-amber-500 inline-block" />
            <span>4-14 visites</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-6 h-6 rounded-full bg-rose-500 inline-block" />
            <span>15+ visites</span>
          </div>
        </div>
      </div>
    </div>
  )
}
