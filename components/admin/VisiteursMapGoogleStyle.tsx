'use client'

import { useState, useMemo } from 'react'
import dynamic from 'next/dynamic'

interface LocationPoint {
  lat: number
  lng: number
  ville: string
  pays: string
  codePays: string
  codePostal?: string
  region?: string
  count: number
}

interface VisiteursMapProps {
  locations: LocationPoint[]
}

// Leaflet component loaded client-side only
const LeafletTileMap = dynamic(() => import('./LeafletTileMap'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full min-h-[520px] bg-slate-100 flex items-center justify-center text-slate-500 text-xs font-bold">
      <span className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mr-2" />
      Chargement de la carte…
    </div>
  ),
})

export default function VisiteursMapGoogleStyle({ locations }: VisiteursMapProps) {
  const [tileStyle, setTileStyle] = useState<'dark' | 'light' | 'satellite'>('light')
  const [selectedCity, setSelectedCity] = useState<LocationPoint | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [clusteringEnabled, setClusteringEnabled] = useState(true)

  const totalVisits = locations.reduce((sum, l) => sum + l.count, 0) || 1

  const filteredLocations = useMemo(() =>
    locations.filter(l =>
      l.ville.toLowerCase().includes(searchTerm.toLowerCase()) ||
      l.pays.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (l.codePostal && l.codePostal.includes(searchTerm))
    ),
    [locations, searchTerm]
  )

  const handleSelectCity = (loc: LocationPoint) => {
    setSelectedCity(loc)
  }

  return (
    <div className={`w-full bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden transition-all duration-300 ${
      isFullscreen ? 'fixed inset-4 z-50 h-[calc(100vh-32px)] m-0' : ''
    }`}>
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 p-4 border-b border-slate-100">
        <div className="flex items-center gap-2.5">
          <span className="w-3 h-3 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_#34d399]" />
          <div>
            <h2 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
              🗺️ Carte Interactive des Visiteurs
            </h2>
            <p className="text-[11px] text-slate-500 font-medium">
              Localisation géographique précise avec clustering dynamique
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Tile style selector */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button
              onClick={() => setTileStyle('light')}
              className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                tileStyle === 'light' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              🗺️ Clair
            </button>
            <button
              onClick={() => setTileStyle('dark')}
              className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                tileStyle === 'dark' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              🌙 Sombre
            </button>
            <button
              onClick={() => setTileStyle('satellite')}
              className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                tileStyle === 'satellite' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              🛰️ Satellite
            </button>
          </div>

          {/* Clustering toggle */}
          <button
            onClick={() => setClusteringEnabled(!clusteringEnabled)}
            className={`px-2.5 py-1 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
              clusteringEnabled
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : 'bg-slate-50 text-slate-500 border-slate-200'
            }`}
          >
            {clusteringEnabled ? '⚡ Clusters ON' : '⚡ Clusters OFF'}
          </button>

          {/* Quick center buttons */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => setSelectedCity({ lat: 43.8333, lng: 5.0333, ville: 'Cavaillon', pays: 'France', codePays: 'FR', count: 0 })}
              className="px-2.5 py-1 text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-all cursor-pointer"
              title="Centrer sur Cavaillon (siège)"
            >
              🏠 Siège
            </button>
            <button
              onClick={() => setSelectedCity({ lat: 46.603354, lng: 2.346301, ville: 'France', pays: 'France', codePays: 'FR', count: 0 })}
              className="px-2.5 py-1 text-xs font-bold text-violet-700 bg-violet-50 hover:bg-violet-100 border border-violet-200 rounded-lg transition-all cursor-pointer"
              title="Vue France entière"
            >
              🇫🇷 France
            </button>
          </div>

          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 border border-slate-200 rounded-xl text-xs font-bold transition-all cursor-pointer"
            title={isFullscreen ? 'Quitter plein écran' : 'Plein écran'}
          >
            {isFullscreen ? '✕ Réduire' : '⛶ Plein écran'}
          </button>
        </div>
      </div>

      {/* Map Container */}
      <div className={`relative w-full ${
        isFullscreen ? 'h-[calc(100%-60px)]' : 'h-[520px]'
      }`}>
        <LeafletTileMap
          locations={locations}
          mapStyle={tileStyle}
          onSelectCity={handleSelectCity}
          selectedCity={selectedCity}
          enableClustering={clusteringEnabled}
        />

        {/* City sidebar drawer */}
        <div className="absolute top-3 right-3 z-[1000] max-w-xs w-64 bg-white/95 backdrop-blur-md border border-slate-200 p-3 rounded-xl shadow-lg max-h-84 overflow-y-auto hidden sm:flex flex-col gap-2">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <span className="text-xs font-extrabold text-slate-800">📍 Villes ({filteredLocations.length})</span>
            <span className="text-[10px] text-slate-400 font-semibold">Tri par visites</span>
          </div>

          <input
            type="text"
            placeholder="🔍 Chercher une ville…"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
          />

          <div className="space-y-1 overflow-y-auto max-h-56 pr-0.5">
            {filteredLocations.length > 0 ? (
              filteredLocations.map((loc, idx) => {
                const isSelected = selectedCity?.ville === loc.ville
                const pct = Math.round((loc.count / totalVisits) * 100)
                return (
                  <button
                    key={idx}
                    onClick={() => handleSelectCity(loc)}
                    className={`w-full flex items-center justify-between text-[11px] p-2 rounded-lg transition-all text-left cursor-pointer ${
                      isSelected
                        ? 'bg-primary/10 border border-primary/30 text-slate-900 font-bold'
                        : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border border-transparent'
                    }`}
                  >
                    <div className="truncate pr-1">
                      <span className="font-bold text-slate-800">{loc.ville}</span>
                      {loc.codePostal && <span className="text-slate-400 text-[10px] ml-1">{loc.codePostal}</span>}
                      <span className="text-slate-400 text-[10px] ml-1">({loc.codePays})</span>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-black border ${
                        loc.count >= 15 ? 'bg-rose-50 text-rose-600 border-rose-200'
                        : loc.count >= 5 ? 'bg-amber-50 text-amber-600 border-amber-200'
                        : 'bg-emerald-50 text-emerald-600 border-emerald-200'
                      }`}>
                        {loc.count}v · {pct}%
                      </span>
                    </div>
                  </button>
                )
              })
            ) : (
              <p className="text-xs text-slate-400 italic text-center py-3">Aucune ville trouvée</p>
            )}
          </div>
        </div>

        {/* Selected city info bubble */}
        {selectedCity && selectedCity.count > 0 && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-[1000] bg-white/95 border border-slate-200 p-3 rounded-2xl shadow-lg text-center backdrop-blur-md flex items-center gap-3">
            <div className="text-left">
              <p className="font-extrabold text-sm text-slate-900 flex items-center gap-1.5">
                <span>📍</span> {selectedCity.ville}
                {selectedCity.codePostal && <span className="text-xs text-slate-400 font-normal">({selectedCity.codePostal})</span>}
              </p>
              <p className="text-xs text-slate-500">{selectedCity.pays}{selectedCity.region ? ` · ${selectedCity.region}` : ''}</p>
            </div>
            <div className="pl-3 border-l border-slate-200">
              <span className="px-3 py-1 rounded-full text-xs font-black bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-sm">
                {selectedCity.count} visite{selectedCity.count > 1 ? 's' : ''}
              </span>
            </div>
            <button
              onClick={() => setSelectedCity(null)}
              className="text-slate-400 hover:text-slate-700 text-xs font-bold ml-1 cursor-pointer"
            >
              ✕
            </button>
          </div>
        )}

        {/* Legend */}
        <div className="absolute bottom-3 left-3 z-[1000] bg-white/90 backdrop-blur-md border border-slate-200 px-3 py-2 rounded-xl shadow-sm flex items-center gap-4 text-[10px] text-slate-600">
          <span className="font-bold text-slate-800 uppercase tracking-wider text-[9px]">Trafic :</span>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
            <span>1-4</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3.5 h-3.5 rounded-full bg-amber-500 inline-block" />
            <span>5-14</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-5 h-5 rounded-full bg-rose-500 inline-block" />
            <span>15+</span>
          </div>
        </div>
      </div>
    </div>
  )
}
