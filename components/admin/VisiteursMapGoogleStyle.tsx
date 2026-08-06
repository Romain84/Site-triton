'use client'

import { useState, useEffect, useRef } from 'react'
import 'leaflet/dist/leaflet.css'

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

// Projection Equirectangulaire pour la carte SVG interactive (Fallback & Mode Vectoriel)
function latLngToSvg(lat: number, lng: number, width: number = 800, height: number = 420) {
  const x = ((lng + 180) * (width / 360))
  const y = (((-1 * lat) + 90) * (height / 180))
  return { x, y }
}

export default function VisiteursMapGoogleStyle({ locations }: VisiteursMapProps) {
  const [mapStyle, setMapStyle] = useState<'dark' | 'light' | 'satellite' | 'svg'>('dark')
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<any>(null)
  const markersRef = useRef<any[]>([])
  const LRef = useRef<any>(null)
  const [leafletLoaded, setLeafletLoaded] = useState(false)
  const [selectedCity, setSelectedCity] = useState<LocationPoint | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [isFullscreen, setIsFullscreen] = useState(false)

  const totalVisits = locations.reduce((sum, l) => sum + l.count, 0) || 1
  const maxCount = Math.max(...locations.map((l) => l.count), 1)

  // Chargement natif de Leaflet via import() dynamique (npm package)
  useEffect(() => {
    let isMounted = true

    if (typeof window !== 'undefined') {
      import('leaflet').then((L) => {
        if (!isMounted) return
        LRef.current = L.default || L

        // Fix icônes par défaut de Leaflet sous Webpack / Next.js
        delete (LRef.current.Icon.Default.prototype as any)._getIconUrl
        LRef.current.Icon.Default.mergeOptions({
          iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
          iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
          shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
        })

        setLeafletLoaded(true)
      }).catch((err) => {
        console.warn('Leaflet import warning, bascule vers mode Vectoriel SVG:', err)
        setMapStyle('svg')
      })
    }

    return () => {
      isMounted = false
    }
  }, [])

  // Initialisation et mise à jour de la carte Leaflet
  useEffect(() => {
    if (!leafletLoaded || !mapContainerRef.current || mapStyle === 'svg') return
    const L = LRef.current
    if (!L) return

    try {
      if (!mapInstanceRef.current) {
        if ((mapContainerRef.current as any)._leaflet_id) {
          (mapContainerRef.current as any)._leaflet_id = null
        }

        const initialLat = locations.length > 0 ? locations[0].lat : 43.8333
        const initialLng = locations.length > 0 ? locations[0].lng : 5.0333

        const map = L.map(mapContainerRef.current, {
          center: [initialLat, initialLng],
          zoom: 6,
          zoomControl: false,
        })

        L.control.zoom({ position: 'topleft' }).addTo(map)
        mapInstanceRef.current = map
      }

      const map = mapInstanceRef.current

      // Nettoyer les tuiles
      map.eachLayer((layer: any) => {
        if (layer instanceof L.TileLayer) {
          map.removeLayer(layer)
        }
      })

      // Tuiles configurées avec fallback
      let tileUrl = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
      let attribution = '&copy; OpenStreetMap contributors'
      let subdomains = ['a', 'b', 'c']

      if (mapStyle === 'dark') {
        tileUrl = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
        attribution = '&copy; OpenStreetMap &copy; CARTO'
        subdomains = ['a', 'b', 'c', 'd']
      } else if (mapStyle === 'light') {
        tileUrl = 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png'
        attribution = '&copy; OpenStreetMap &copy; CARTO'
        subdomains = ['a', 'b', 'c', 'd']
      } else if (mapStyle === 'satellite') {
        tileUrl = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
        attribution = '&copy; Esri World Imagery'
        subdomains = []
      }

      const tileLayerOptions: any = { attribution, maxZoom: 19 }
      if (subdomains.length > 0) tileLayerOptions.subdomains = subdomains

      const tileLayer = L.tileLayer(tileUrl, tileLayerOptions)
      tileLayer.on('tileerror', () => {
        if (mapStyle !== 'light') {
          L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(map)
        }
      })
      tileLayer.addTo(map)

      // Marqueurs
      markersRef.current.forEach((m) => map.removeLayer(m))
      markersRef.current = []

      if (locations.length > 0) {
        locations.forEach((loc) => {
          const sizeRatio = loc.count / maxCount
          const radius = Math.max(6, Math.min(32, Math.sqrt(loc.count) * 3.8 + 3))

          let color = '#10b981'
          let fillColor = '#10b981'

          if (loc.count >= 15 || sizeRatio > 0.35) {
            color = '#f43f5e'
            fillColor = '#ef4444'
          } else if (loc.count >= 5 || sizeRatio > 0.12) {
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
            fillOpacity: 0.5,
          }).addTo(map)

          const popupContent = `
            <div style="font-family: system-ui, sans-serif; padding: 6px; text-align: center; min-width: 140px;">
              <div style="font-weight: 800; font-size: 13px; color: #0f172a; display: flex; align-items: center; justify-content: center; gap: 4px;">
                📍 ${loc.ville} <span style="font-size: 11px; color: #64748b;">(${loc.codePays})</span>
              </div>
              <div style="font-size: 11px; color: #64748b; margin-top: 2px;">${loc.pays}</div>
              <div style="margin-top: 8px; display: inline-block; padding: 4px 10px; background: linear-gradient(to right, #2563eb, #3b82f6); color: white; border-radius: 9999px; font-weight: 800; font-size: 11px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
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
          map.fitBounds(bounds, { padding: [50, 50], maxZoom: 8 })
        }
      }

      setTimeout(() => {
        if (mapInstanceRef.current) {
          mapInstanceRef.current.invalidateSize()
        }
      }, 100)
    } catch (err) {
      console.error('Erreur Leaflet tile setup:', err)
    }
  }, [leafletLoaded, locations, mapStyle])

  const flyToLocation = (loc: LocationPoint) => {
    setSelectedCity(loc)
    if (mapStyle !== 'svg' && mapInstanceRef.current && LRef.current) {
      mapInstanceRef.current.flyTo([loc.lat, loc.lng], 11, { duration: 1.2 })
    }
  }

  const filteredLocations = locations.filter(l =>
    l.ville.toLowerCase().includes(searchTerm.toLowerCase()) ||
    l.pays.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className={`w-full bg-slate-900 rounded-2xl border border-slate-800 p-4 shadow-xl space-y-3 relative text-white overflow-hidden transition-all duration-300 ${
      isFullscreen ? 'fixed inset-4 z-50 h-[calc(100vh-32px)] m-0' : ''
    }`}>
      {/* En-tête de la Carte */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2.5">
          <span className="w-3 h-3 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_#34d399]" />
          <div>
            <h2 className="text-sm font-extrabold text-white flex items-center gap-2">
              Carte des Visiteurs & Taille Proportionnelle des Villes
            </h2>
            <p className="text-[11px] text-slate-400 font-medium">
              La taille des cercles s&apos;adapte automatiquement au volume des connexions géolocalisées
            </p>
          </div>
        </div>

        {/* Boutons de style de carte & plein écran */}
        <div className="flex items-center gap-2 flex-wrap self-start sm:self-auto">
          <div className="flex items-center gap-1 bg-slate-800/80 p-1 rounded-xl border border-slate-700/80">
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
            <button
              onClick={() => setMapStyle('svg')}
              className={`px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                mapStyle === 'svg' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-400 hover:text-white'
              }`}
            >
              ✨ Carte Vectorielle SVG
            </button>
          </div>

          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
            title={isFullscreen ? 'Quitter plein écran' : 'Plein écran'}
          >
            {isFullscreen ? '✕ Réduire' : '⛶ Plein écran'}
          </button>
        </div>
      </div>

      {/* Conteneur Principal de la Carte */}
      <div className={`relative w-full rounded-xl overflow-hidden bg-slate-950 border border-slate-800 ${
        isFullscreen ? 'h-[calc(100%-60px)]' : 'h-[520px]'
      }`}>
        
        {/* MODE MAP LEAFLET HD */}
        {mapStyle !== 'svg' && (
          <div ref={mapContainerRef} className="w-full h-full min-h-[520px] z-10 relative" />
        )}

        {/* MODE CARTE VECTORIELLE SVG (Ultra-rapide, zéro dépendance CDN) */}
        {mapStyle === 'svg' && (
          <div className="w-full h-full relative bg-slate-950 flex items-center justify-center overflow-hidden">
            {/* Grille de repères vectoriels */}
            <svg className="w-full h-full absolute inset-0 opacity-15 pointer-events-none" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                  <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#3b82f6" strokeWidth="0.5" />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#grid)" />
            </svg>

            {/* Carte Monde & France Vectorielle */}
            <svg viewBox="0 0 800 420" className="w-full h-full relative z-10">
              {/* Villes avec cercles de trafic proportionnels */}
              {locations.map((loc, idx) => {
                const { x, y } = latLngToSvg(loc.lat, loc.lng)
                const sizeRatio = loc.count / maxCount
                const radius = Math.max(6, Math.min(28, Math.sqrt(loc.count) * 4 + 4))
                const isSelected = selectedCity?.ville === loc.ville

                let fillColor = '#10b981'
                if (loc.count >= 15 || sizeRatio > 0.35) fillColor = '#f43f5e'
                else if (loc.count >= 5 || sizeRatio > 0.12) fillColor = '#f59e0b'

                return (
                  <g
                    key={idx}
                    className="cursor-pointer group"
                    onClick={() => setSelectedCity(loc)}
                  >
                    {/* Pulsation lumineuse pour ville sélectionnée ou fort trafic */}
                    <circle
                      cx={x}
                      cy={y}
                      r={radius * 1.5}
                      fill={fillColor}
                      opacity={isSelected ? 0.4 : 0.25}
                      className="animate-ping"
                    />

                    {/* Cercle de la ville */}
                    <circle
                      cx={x}
                      cy={y}
                      r={radius}
                      fill={fillColor}
                      fillOpacity={0.7}
                      stroke={isSelected ? '#ffffff' : fillColor}
                      strokeWidth={isSelected ? 3 : 1.5}
                      className="transition-all duration-300 group-hover:scale-125 origin-center"
                    />

                    {/* Texte de la ville si sélectionnée */}
                    <text
                      x={x}
                      y={y - radius - 6}
                      textAnchor="middle"
                      fill="#ffffff"
                      fontSize="11"
                      fontWeight="bold"
                      className="drop-shadow-md pointer-events-none"
                    >
                      {loc.ville} ({loc.count}v)
                    </text>
                  </g>
                )
              })}
            </svg>

            {/* Info bulle de ville sélectionnée en mode SVG */}
            {selectedCity && (
              <div className="absolute bottom-14 left-1/2 -translate-x-1/2 z-30 bg-slate-900/95 border border-slate-700 p-3 rounded-xl shadow-2xl text-center backdrop-blur-md">
                <p className="font-extrabold text-sm text-white">📍 {selectedCity.ville} ({selectedCity.codePays})</p>
                <p className="text-xs text-slate-400 mt-0.5">{selectedCity.pays}</p>
                <span className="inline-block mt-2 px-3 py-1 rounded-full text-xs font-black bg-primary text-white">
                  {selectedCity.count} visite{selectedCity.count > 1 ? 's' : ''} enregistrée{selectedCity.count > 1 ? 's' : ''}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Tiroir / Liste latérale interactive des villes avec barre de recherche */}
        <div className="absolute top-3 right-3 z-20 max-w-xs w-64 bg-slate-900/95 backdrop-blur-md border border-slate-800 p-3 rounded-xl shadow-2xl max-h-84 overflow-y-auto hidden sm:flex flex-col gap-2">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <span className="text-xs font-extrabold text-slate-200">📍 Villes ({filteredLocations.length})</span>
            <span className="text-[10px] text-slate-400 font-semibold">Tri par visites</span>
          </div>

          <input
            type="text"
            placeholder="🔍 Chercher une ville..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-2.5 py-1 text-xs bg-slate-950 border border-slate-800 rounded-lg text-white placeholder-slate-500 outline-none focus:border-primary"
          />

          <div className="space-y-1 overflow-y-auto max-h-56 pr-0.5">
            {filteredLocations.length > 0 ? (
              filteredLocations.map((loc, idx) => {
                const isSelected = selectedCity?.ville === loc.ville
                return (
                  <button
                    key={idx}
                    onClick={() => flyToLocation(loc)}
                    className={`w-full flex items-center justify-between text-[11px] p-2 rounded-lg transition-all text-left cursor-pointer ${
                      isSelected
                        ? 'bg-primary/25 border border-primary/50 text-white font-bold'
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
              <p className="text-xs text-slate-500 italic text-center py-3">Aucune ville trouvée</p>
            )}
          </div>
        </div>

        {/* Légende d'échelle des tailles de cercles */}
        <div className="absolute bottom-3 left-3 z-20 bg-slate-900/90 backdrop-blur-md border border-slate-800 px-3 py-2 rounded-xl shadow-lg flex items-center gap-4 text-[10px] text-slate-300">
          <span className="font-bold text-white uppercase tracking-wider text-[9px]">Trafic par cercle :</span>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
            <span>1-4 v.</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3.5 h-3.5 rounded-full bg-amber-500 inline-block" />
            <span>5-14 v.</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-5 h-5 rounded-full bg-rose-500 inline-block" />
            <span>15+ v.</span>
          </div>
        </div>
      </div>
    </div>
  )
}
