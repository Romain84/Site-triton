'use client'

import { useState, useMemo } from 'react'
import dynamic from 'next/dynamic'

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

// Composant Leaflet chargé dynamiquement côté client uniquement (désactivation SSR pour éviter tout problème de rendu)
const LeafletTileMap = dynamic(() => import('./LeafletTileMap'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full min-h-[520px] bg-slate-950 flex items-center justify-center text-slate-400 text-xs font-bold">
      <span className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mr-2" />
      Initialisation des tuiles Leaflet…
    </div>
  ),
})

// Définition des contours vectoriels de la France & Europe (Fond de carte haute définition)
const FRANCE_SVG_PATH = `
  M 320,80 L 360,70 L 400,85 L 440,110 L 480,120 L 520,150 L 535,190 L 515,225 L 485,250 L 490,290 
  L 460,335 L 430,370 L 375,395 L 340,390 L 315,365 L 290,370 L 260,340 L 225,320 L 200,285 L 180,250 
  L 190,210 L 165,185 L 175,160 L 220,155 L 255,130 L 290,110 Z
`

const SPAIN_SVG_PATH = `
  M 200,285 L 225,320 L 260,340 L 290,370 L 315,365 L 340,390 L 375,395 L 350,420 L 290,420 L 210,410 L 150,380 L 140,320 L 170,290 Z
`

const ITALY_SVG_PATH = `
  M 485,250 L 515,225 L 540,240 L 565,270 L 590,310 L 610,340 L 630,365 L 615,380 L 585,350 L 560,310 L 525,275 Z
`

const UK_SVG_PATH = `
  M 240,60 L 270,40 L 300,50 L 310,80 L 290,105 L 250,110 L 225,85 Z
`

export default function VisiteursMapGoogleStyle({ locations }: VisiteursMapProps) {
  const [mapEngine, setMapEngine] = useState<'vector' | 'leaflet'>('vector')
  const [tileStyle, setTileStyle] = useState<'dark' | 'light' | 'satellite'>('dark')
  const [viewPreset, setViewPreset] = useState<'france' | 'europe' | 'world'>('france')
  const [zoomLevel, setZoomLevel] = useState<number>(1)
  const [selectedCity, setSelectedCity] = useState<LocationPoint | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [isFullscreen, setIsFullscreen] = useState(false)

  const totalVisits = locations.reduce((sum, l) => sum + l.count, 0) || 1
  const maxCount = Math.max(...locations.map((l) => l.count), 1)

  // Bounding box selon le preset sélectionné
  const bounds = useMemo(() => {
    if (viewPreset === 'france') {
      return { minLat: 41.0, maxLat: 51.5, minLng: -5.0, maxLng: 9.8 }
    } else if (viewPreset === 'europe') {
      return { minLat: 34.0, maxLat: 65.0, minLng: -11.0, maxLng: 32.0 }
    } else {
      return { minLat: -55.0, maxLat: 75.0, minLng: -160.0, maxLng: 180.0 }
    }
  }, [viewPreset])

  // Projection (Lat, Lng) -> (x, y) en pixels SVG (Base 800x450)
  const projectPoint = (lat: number, lng: number) => {
    const width = 800
    const height = 450
    const normX = (lng - bounds.minLng) / (bounds.maxLng - bounds.minLng)
    const normY = (bounds.maxLat - lat) / (bounds.maxLat - bounds.minLat)

    // S'assurer d'un espacement correct
    const x = Math.max(20, Math.min(width - 20, normX * width))
    const y = Math.max(20, Math.min(height - 20, normY * height))

    return { x, y }
  }

  const filteredLocations = locations.filter(l =>
    l.ville.toLowerCase().includes(searchTerm.toLowerCase()) ||
    l.pays.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handleSelectCity = (loc: LocationPoint) => {
    setSelectedCity(loc)
    // Ajuster la vue selon la position de la ville
    if (loc.pays === 'France' || loc.codePays === 'FR') {
      setViewPreset('france')
    } else if (['IT', 'ES', 'DE', 'GB', 'BE', 'CH', 'NL', 'PT', 'AT'].includes(loc.codePays)) {
      setViewPreset('europe')
    } else {
      setViewPreset('world')
    }
  }

  return (
    <div className={`w-full bg-slate-900 rounded-2xl border border-slate-800 p-4 shadow-xl space-y-3 relative text-white overflow-hidden transition-all duration-300 ${
      isFullscreen ? 'fixed inset-4 z-50 h-[calc(100vh-32px)] m-0' : ''
    }`}>
      {/* En-tête de la Carte */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2.5">
          <span className="w-3 h-3 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_#34d399]" />
          <div>
            <h2 className="text-sm font-extrabold text-white flex items-center gap-2">
              Carte des Visiteurs & Concentré Géographique des Villes
            </h2>
            <p className="text-[11px] text-slate-400 font-medium">
              Représentation en temps réel du volume de connexions avec cercles proportionnels
            </p>
          </div>
        </div>

        {/* Sélecteurs de moteur de carte & présélection de zooms */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Presets de Zoom rapide */}
          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => { setMapEngine('vector'); setViewPreset('france'); }}
              className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                mapEngine === 'vector' && viewPreset === 'france' ? 'bg-primary text-white shadow-xs' : 'text-slate-400 hover:text-white'
              }`}
            >
              🇫🇷 France
            </button>
            <button
              onClick={() => { setMapEngine('vector'); setViewPreset('europe'); }}
              className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                mapEngine === 'vector' && viewPreset === 'europe' ? 'bg-primary text-white shadow-xs' : 'text-slate-400 hover:text-white'
              }`}
            >
              🇪🇺 Europe
            </button>
            <button
              onClick={() => { setMapEngine('vector'); setViewPreset('world'); }}
              className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                mapEngine === 'vector' && viewPreset === 'world' ? 'bg-primary text-white shadow-xs' : 'text-slate-400 hover:text-white'
              }`}
            >
              🌐 Monde
            </button>
          </div>

          {/* Styles de carte Leaflet / Tuiles */}
          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => { setMapEngine('leaflet'); setTileStyle('dark'); }}
              className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                mapEngine === 'leaflet' && tileStyle === 'dark' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-400 hover:text-white'
              }`}
            >
              🌙 Sombre (Tuiles)
            </button>
            <button
              onClick={() => { setMapEngine('leaflet'); setTileStyle('light'); }}
              className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                mapEngine === 'leaflet' && tileStyle === 'light' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-400 hover:text-white'
              }`}
            >
              🗺️ Clair (Tuiles)
            </button>
            <button
              onClick={() => { setMapEngine('leaflet'); setTileStyle('satellite'); }}
              className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                mapEngine === 'leaflet' && tileStyle === 'satellite' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-400 hover:text-white'
              }`}
            >
              🛰️ Satellite
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

      {/* Conteneur Principal de la Carte (Résolution garantie sans écran noir) */}
      <div className={`relative w-full rounded-xl overflow-hidden bg-slate-950 border border-slate-800 ${
        isFullscreen ? 'h-[calc(100%-60px)]' : 'h-[520px]'
      }`}>
        
        {/* MOTEUR 1: CARTE VECTORIELLE INTERACTIVE HD (Défaut, 0ms de temps de charge, 100% garanti) */}
        {mapEngine === 'vector' && (
          <div className="w-full h-full relative bg-slate-950 flex items-center justify-center overflow-hidden">
            {/* Arrière-plan avec repères géométriques haute technologie */}
            <svg className="w-full h-full absolute inset-0 opacity-20 pointer-events-none" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <pattern id="grid-pattern" width="40" height="40" patternUnits="userSpaceOnUse">
                  <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#3b82f6" strokeWidth="0.5" />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#grid-pattern)" />
            </svg>

            {/* Canvas Vectoriel SVG interactif */}
            <svg viewBox="0 0 800 450" className="w-full h-full relative z-10 transition-transform duration-500 ease-out" style={{ transform: `scale(${zoomLevel})` }}>
              {/* Formes vectorielles stylisées des pays en fond (France, Espagne, Italie, UK) */}
              {viewPreset === 'france' && (
                <g className="opacity-40">
                  <path d={FRANCE_SVG_PATH} fill="#1e293b" stroke="#334155" strokeWidth="2" />
                  <path d={SPAIN_SVG_PATH} fill="#0f172a" stroke="#1e293b" strokeWidth="1" />
                  <path d={ITALY_SVG_PATH} fill="#0f172a" stroke="#1e293b" strokeWidth="1" />
                  <path d={UK_SVG_PATH} fill="#0f172a" stroke="#1e293b" strokeWidth="1" />
                  
                  {/* Point de repère central Cavaillon / Provence */}
                  <g transform="translate(435, 330)">
                    <circle r="4" fill="#3b82f6" opacity="0.6" className="animate-ping" />
                    <text x="8" y="4" fill="#94a3b8" fontSize="10" fontWeight="bold">Siège Triton Club (Cavaillon)</text>
                  </g>
                </g>
              )}

              {/* Villes avec marqueurs de trafic proportionnels */}
              {locations.map((loc, idx) => {
                const { x, y } = projectPoint(loc.lat, loc.lng)
                const sizeRatio = loc.count / maxCount
                const radius = Math.max(7, Math.min(30, Math.sqrt(loc.count) * 4.2 + 3))
                const isSelected = selectedCity?.ville === loc.ville

                let color = '#10b981' // Vert émeraude
                let fillColor = '#10b981'

                if (loc.count >= 15 || sizeRatio > 0.35) {
                  color = '#f43f5e' // Rose rouge
                  fillColor = '#ef4444'
                } else if (loc.count >= 5 || sizeRatio > 0.12) {
                  color = '#f59e0b' // Ambre
                  fillColor = '#f59e0b'
                }

                return (
                  <g
                    key={idx}
                    className="cursor-pointer group"
                    onClick={() => handleSelectCity(loc)}
                  >
                    {/* Anneau de pulsation dynamique */}
                    <circle
                      cx={x}
                      cy={y}
                      r={radius * 1.6}
                      fill={color}
                      opacity={isSelected ? 0.45 : 0.2}
                      className="animate-ping"
                    />

                    {/* Cercle principal de la ville */}
                    <circle
                      cx={x}
                      cy={y}
                      r={radius}
                      fill={fillColor}
                      fillOpacity={0.75}
                      stroke={isSelected ? '#ffffff' : color}
                      strokeWidth={isSelected ? 3 : 1.5}
                      className="transition-all duration-300 group-hover:scale-125 origin-center shadow-2xl"
                    />

                    {/* Badge texte de la ville au survol ou sélection */}
                    <g transform={`translate(${x}, ${y - radius - 8})`}>
                      <rect
                        x="-45"
                        y="-16"
                        width="90"
                        height="18"
                        rx="9"
                        fill="#0f172a"
                        fillOpacity="0.9"
                        stroke={isSelected ? '#3b82f6' : '#334155'}
                        strokeWidth="1"
                        className="transition-all duration-200 group-hover:opacity-100"
                      />
                      <text
                        x="0"
                        y="-4"
                        textAnchor="middle"
                        fill="#ffffff"
                        fontSize="9.5"
                        fontWeight="800"
                        className="pointer-events-none"
                      >
                        {loc.ville} ({loc.count}v)
                      </text>
                    </g>
                  </g>
                )
              })}
            </svg>

            {/* Contrôles de zoom sur la carte vectorielle */}
            <div className="absolute bottom-4 right-4 z-20 flex flex-col gap-1 bg-slate-900/90 border border-slate-800 p-1 rounded-xl shadow-xl backdrop-blur-md">
              <button
                onClick={() => setZoomLevel(prev => Math.min(prev + 0.3, 2.5))}
                className="w-8 h-8 flex items-center justify-center text-sm font-bold text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                title="Zoomer"
              >
                +
              </button>
              <button
                onClick={() => setZoomLevel(1)}
                className="w-8 h-8 flex items-center justify-center text-xs font-bold text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                title="Réinitialiser zoom"
              >
                🎯
              </button>
              <button
                onClick={() => setZoomLevel(prev => Math.max(prev - 0.3, 0.8))}
                className="w-8 h-8 flex items-center justify-center text-sm font-bold text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                title="Dézoomer"
              >
                -
              </button>
            </div>

            {/* Info Bulle de la Ville Sélectionnée */}
            {selectedCity && (
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-30 bg-slate-900/95 border border-slate-700 p-3 rounded-2xl shadow-2xl text-center backdrop-blur-md flex items-center gap-3">
                <div className="text-left">
                  <p className="font-extrabold text-sm text-white flex items-center gap-1.5">
                    <span>📍</span> {selectedCity.ville} <span className="text-xs text-slate-400 font-normal">({selectedCity.codePays})</span>
                  </p>
                  <p className="text-xs text-slate-400">{selectedCity.pays}</p>
                </div>
                <div className="pl-3 border-l border-slate-800">
                  <span className="px-3 py-1 rounded-full text-xs font-black bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-xs">
                    {selectedCity.count} visite{selectedCity.count > 1 ? 's' : ''}
                  </span>
                </div>
                <button
                  onClick={() => setSelectedCity(null)}
                  className="text-slate-500 hover:text-white text-xs font-bold ml-1 cursor-pointer"
                >
                  ✕
                </button>
              </div>
            )}
          </div>
        )}

        {/* MOTEUR 2: LEAFLET TILE MAP (Côté client uniquement sans SSR) */}
        {mapEngine === 'leaflet' && (
          <LeafletTileMap
            locations={locations}
            mapStyle={tileStyle}
            onSelectCity={handleSelectCity}
          />
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
                    onClick={() => handleSelectCity(loc)}
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

