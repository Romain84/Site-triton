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

interface VisiteursMapSVGProps {
  locations: LocationPoint[]
}

// Projection Miller / Equirectangulaire ajustée pour transformer (lat, lng) en (x, y) dans un espace SVG 1000x500
function latLngToXY(lat: number, lng: number) {
  // Longitude de -180 à +180 -> X de 0 à 1000
  const x = ((lng + 180) / 360) * 1000
  // Latitude de +90 (Nord) à -90 (Sud) -> Y de 0 à 500
  // Petite correction de projection pour équilibrer la déformation des pôles
  const latRad = (lat * Math.PI) / 180
  const y = (250 - (latRad * 250) / (Math.PI / 1.8))
  return { x: Math.max(20, Math.min(980, x)), y: Math.max(20, Math.min(480, y)) }
}

export default function VisiteursMapSVG({ locations }: VisiteursMapSVGProps) {
  const [activePoint, setActivePoint] = useState<LocationPoint | null>(null)

  // Si pas encore de localisations enregistrées, afficher le siège social Cavaillon comme point de démonstration
  const displayLocations = locations.length > 0 ? locations : [
    { lat: 43.8333, lng: 5.0333, ville: 'Cavaillon (Siège Club)', pays: 'France', codePays: 'FR', count: 1 }
  ]

  return (
    <div className="w-full bg-slate-950 rounded-2xl border border-slate-800/80 p-4 shadow-2xl relative overflow-hidden">
      {/* Barre de contrôle / Informations */}
      <div className="flex items-center justify-between mb-3 text-xs text-slate-300">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping" />
          <span className="font-bold text-white">Géolocalisation des Connexions</span>
        </div>
        {activePoint ? (
          <div className="bg-cyan-950/80 border border-cyan-700/60 px-3 py-1 rounded-lg text-cyan-200 font-semibold flex items-center gap-2 animate-fade-in">
            <span>📍 {activePoint.ville} ({activePoint.pays})</span>
            <span className="bg-cyan-500/20 text-cyan-300 px-1.5 py-0.5 rounded text-[11px]">
              {activePoint.count} visite{activePoint.count > 1 ? 's' : ''}
            </span>
          </div>
        ) : (
          <span className="text-slate-400 italic">Survolez les points néons pour voir la ville et le pays</span>
        )}
      </div>

      {/* Rendu SVG interactif de la Carte du Monde */}
      <div className="relative w-full aspect-[2/1] bg-slate-900/90 rounded-xl overflow-hidden border border-slate-800 flex items-center justify-center">
        <svg viewBox="0 0 1000 500" className="w-full h-full select-none">
          <defs>
            {/* Gradients pour effet néon / cyber */}
            <radialGradient id="glow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#0284c7" stopOpacity="0" />
            </radialGradient>
            <linearGradient id="landGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#1e293b" />
              <stop offset="100%" stopColor="#0f172a" />
            </linearGradient>
          </defs>

          {/* LIGNES DE GRILLE CARTOGRAPHIQUE */}
          <g stroke="#334155" strokeWidth="0.5" strokeDasharray="3 3" opacity="0.4">
            {/* Équateur */}
            <line x1="0" y1="250" x2="1000" y2="250" stroke="#475569" strokeWidth="1" />
            {/* Méridien de Greenwich */}
            <line x1="500" y1="0" x2="500" y2="500" stroke="#475569" strokeWidth="1" />
            {/* Parallèles */}
            <line x1="0" y1="125" x2="1000" y2="125" />
            <line x1="0" y1="375" x2="1000" y2="375" />
            {/* Méridiens */}
            <line x1="250" y1="0" x2="250" y2="500" />
            <line x1="750" y1="0" x2="750" y2="500" />
          </g>

          {/* VRAIS CONTOURS VECTORIELS DES CONTINENTS */}
          <g fill="url(#landGrad)" stroke="#334155" strokeWidth="0.8" opacity="0.85">
            {/* Europe */}
            <path d="M 470,110 L 490,100 L 520,95 L 560,90 L 590,110 L 580,140 L 540,160 L 500,165 L 480,150 L 465,130 Z" />
            {/* Afrique */}
            <path d="M 470,170 L 530,170 L 570,210 L 580,260 L 550,340 L 510,360 L 480,310 L 460,250 L 450,200 Z" />
            {/* Asie */}
            <path d="M 590,90 L 750,70 L 850,90 L 890,140 L 840,220 L 760,240 L 700,220 L 650,210 L 600,170 L 580,130 Z" />
            {/* Amérique du Nord */}
            <path d="M 120,80 L 250,70 L 320,100 L 300,170 L 250,210 L 200,200 L 150,160 L 100,120 Z" />
            {/* Amérique du Sud */}
            <path d="M 270,230 L 340,240 L 370,300 L 330,390 L 290,410 L 270,330 L 260,270 Z" />
            {/* Océanie / Australie */}
            <path d="M 760,300 L 860,290 L 890,340 L 850,390 L 780,380 L 750,330 Z" />
            {/* Royaume-Uni / Irlande */}
            <path d="M 465,115 L 480,110 L 485,125 L 470,130 Z" />
            {/* Japon */}
            <path d="M 870,140 L 895,150 L 885,175 L 865,165 Z" />
          </g>

          {/* REPERES ET MARQUEURS LUMINEUX DES VISITES */}
          {displayLocations.map((loc, idx) => {
            const { x, y } = latLngToXY(loc.lat, loc.lng)
            const radius = Math.min(Math.max(Math.sqrt(loc.count) * 4, 6), 22)
            const isActive = activePoint?.ville === loc.ville

            return (
              <g
                key={idx}
                className="cursor-pointer transition-all duration-300"
                onMouseEnter={() => setActivePoint(loc)}
                onMouseLeave={() => setActivePoint(null)}
                onClick={() => setActivePoint(loc)}
              >
                {/* Halo d'onde pulsante */}
                <circle
                  cx={x}
                  cy={y}
                  r={radius * 2}
                  className="fill-cyan-400/20 animate-ping"
                  style={{ animationDuration: `${Math.max(1.8, 3.5 - idx * 0.3)}s` }}
                />

                {/* Halo lumineux */}
                <circle
                  cx={x}
                  cy={y}
                  r={radius * 1.3}
                  fill="url(#glow)"
                />

                {/* Bulle principale */}
                <circle
                  cx={x}
                  cy={y}
                  r={radius}
                  fill={isActive ? '#38bdf8' : '#0284c7'}
                  stroke="#ffffff"
                  strokeWidth={isActive ? 2.5 : 1.5}
                />

                {/* Centre brillant */}
                <circle cx={x} cy={y} r={2.5} fill="#ffffff" />

                {/* Label de la ville si actif ou unique */}
                {(isActive || displayLocations.length === 1) && (
                  <g>
                    <rect
                      x={x - 45}
                      y={y - radius - 24}
                      width={90}
                      height={20}
                      rx={4}
                      fill="#0f172a"
                      stroke="#38bdf8"
                      strokeWidth={1}
                      opacity={0.95}
                    />
                    <text
                      x={x}
                      y={y - radius - 10}
                      textAnchor="middle"
                      fill="#ffffff"
                      fontSize="10"
                      fontWeight="bold"
                    >
                      {loc.ville}
                    </text>
                  </g>
                )}
              </g>
            )
          })}
        </svg>

        {/* Légende en bas de carte */}
        <div className="absolute bottom-2.5 left-2.5 bg-slate-900/90 backdrop-blur border border-slate-800 px-3 py-1.5 rounded-lg text-[11px] text-slate-300 flex items-center gap-3 shadow-lg">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 inline-block animate-pulse" />
            Ville visitée
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-white inline-block" />
            Position géolocalisée (Lat / Lng)
          </span>
        </div>
      </div>
    </div>
  )
}
