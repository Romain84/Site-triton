'use client'

import { useState } from 'react'

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
  const [mapType, setMapType] = useState<'roadmap' | 'satellite'>('roadmap')

  // Coordonnées du centre (Cavaillon par défaut)
  const defaultLat = locations.length > 0 ? locations[0].lat : 43.8333
  const defaultLng = locations.length > 0 ? locations[0].lng : 5.0333

  // URL Google Maps Embed directe garantie à 100% sans aucun script JS externe
  const mapUrl = mapType === 'satellite'
    ? `https://maps.google.com/maps?q=${defaultLat},${defaultLng}&t=k&z=6&ie=UTF8&iwloc=&output=embed`
    : `https://maps.google.com/maps?q=${defaultLat},${defaultLng}&t=m&z=5&ie=UTF8&iwloc=&output=embed`

  return (
    <div className="w-full bg-white rounded-2xl border border-slate-200 p-4 shadow-lg space-y-3 relative overflow-hidden">
      {/* En-tête de la carte */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
          <h2 className="text-sm font-bold text-slate-900">Carte Géographique des Visiteurs (Google Maps HD)</h2>
        </div>
        <div className="flex items-center gap-1.5 self-start sm:self-auto">
          <button
            onClick={() => setMapType('roadmap')}
            className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all ${
              mapType === 'roadmap'
                ? 'bg-primary text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            🗺️ Google Plan
          </button>
          <button
            onClick={() => setMapType('satellite')}
            className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all ${
              mapType === 'satellite'
                ? 'bg-primary text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            🛰️ Google Satellite
          </button>
        </div>
      </div>

      {/* Conteneur Iframe Google Maps */}
      <div className="relative w-full h-[450px] rounded-xl overflow-hidden bg-slate-100 border border-slate-200/80 shadow-inner">
        <iframe
          key={mapType + defaultLat + defaultLng}
          title="Google Maps Visiteurs Triton"
          width="100%"
          height="100%"
          style={{ border: 0 }}
          loading="lazy"
          allowFullScreen
          src={mapUrl}
          className="w-full h-full"
        />

        {/* Panneau latéral flottant de géolocalisation */}
        <div className="absolute top-3 right-3 z-20 max-w-xs bg-white/95 backdrop-blur border border-slate-200 p-3 rounded-xl shadow-xl max-h-48 overflow-y-auto hidden sm:block">
          <h3 className="text-xs font-bold text-slate-800 border-b border-slate-100 pb-1.5 mb-2 flex items-center justify-between">
            <span>📍 Villes Détectées</span>
            <span className="bg-red-100 text-red-700 text-[10px] font-extrabold px-1.5 py-0.5 rounded-full">
              {locations.length > 0 ? locations.length : 1}
            </span>
          </h3>
          <div className="space-y-1.5 text-xs">
            {locations.length > 0 ? (
              locations.map((loc, idx) => (
                <div key={idx} className="flex items-center justify-between text-[11px] py-1 border-b border-slate-50 last:border-0">
                  <span className="font-semibold text-slate-700 truncate">{loc.ville} <span className="text-slate-400 font-normal">({loc.codePays})</span></span>
                  <span className="font-extrabold text-red-600 bg-red-50 px-1.5 py-0.5 rounded">{loc.count} v.</span>
                </div>
              ))
            ) : (
              <div className="flex items-center justify-between text-[11px] py-1 text-slate-500 italic">
                <span>Cavaillon (Siège Club)</span>
                <span className="font-bold text-primary">En attente</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
