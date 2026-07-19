'use client'

import { useState } from 'react'

interface Session {
  id: string
  type: 'fixe' | 'tournant'
  titre: string
  date: string | Date
  heureDebut: string
  heureFin: string
  lieu: string | null
  groupe: string
  isMySession?: boolean
  coachName?: string | null
  couleur?: string | null
}

interface CoachAgendaBassinProps {
  sessions: Session[]
}

const laneKeys = [
  'Grand Bassin - Ligne 1',
  'Grand Bassin - Ligne 2',
  'Grand Bassin - Ligne 3',
  'Grand Bassin - Ligne 4',
  'Petit Bassin'
]

const laneLabels = [
  { key: 'Grand Bassin - Ligne 1', label: 'Ligne 1' },
  { key: 'Grand Bassin - Ligne 2', label: 'Ligne 2' },
  { key: 'Grand Bassin - Ligne 3', label: 'Ligne 3' },
  { key: 'Grand Bassin - Ligne 4', label: 'Ligne 4' },
  { key: 'Petit Bassin', label: 'Petit Bassin' }
]

interface CouleurStyle {
  bg: string
  text: string
  border: string
  badge: string
  accent: string
  gradient: string
  textColor: string
  textBorder: string
  borderStyle?: React.CSSProperties
  badgeStyle?: React.CSSProperties
  accentStyle?: React.CSSProperties
}

const getCardGradient = (hexColor: string | null | undefined): string => {
  const baseColor = hexColor || '#00bcd4'
  switch(baseColor.toLowerCase()) {
    case '#00bcd4': return 'linear-gradient(135deg, #00bcd4, #0097a7)' // Cyan
    case '#2196f3': return 'linear-gradient(135deg, #2196f3, #1976d2)' // Bleu
    case '#4caf50': return 'linear-gradient(135deg, #4caf50, #388e3c)' // Vert
    case '#ff9800': return 'linear-gradient(135deg, #ff9800, #f57c00)' // Orange
    case '#f44336': return 'linear-gradient(135deg, #f44336, #d32f2f)' // Rouge
    case '#9c27b0': return 'linear-gradient(135deg, #9c27b0, #7b1fa2)' // Violet
    case '#e91e63': return 'linear-gradient(135deg, #e91e63, #c2185b)' // Rose
    default: return `linear-gradient(135deg, ${baseColor}, ${baseColor})`
  }
}

function getCouleurGroupe(nom: string, groupColor?: string | null): CouleurStyle {
  if (groupColor) {
    const hex = groupColor.startsWith('#') ? groupColor : `#${groupColor}`
    return {
      bg: '',
      text: '',
      border: '',
      badge: '',
      accent: '',
      gradient: getCardGradient(hex),
      textColor: '#ffffff',
      textBorder: 'rgba(255,255,255,0.2)',
      borderStyle: { borderLeftColor: hex },
      badgeStyle: { backgroundColor: `${hex}1c`, color: hex },
      accentStyle: { backgroundColor: hex }
    }
  }
  const n = nom || ''
  
  // 1. COMPÉTITIONS (Chaque groupe possède sa couleur et son identité propre)
  if (n.includes('Avenirs 1')) {
    return {
      bg: 'bg-sky-50/70',
      text: 'text-sky-850',
      border: 'border-sky-100',
      badge: 'bg-sky-100/60 text-sky-800',
      accent: 'bg-sky-300',
      gradient: 'linear-gradient(135deg, #f0f9ff, #bae6fd)', // Bleu ciel très clair
      textColor: '#0369a1',
      textBorder: '#bae6fd'
    }
  }
  if (n.includes('Avenirs 2')) {
    return {
      bg: 'bg-sky-50/80',
      text: 'text-sky-900',
      border: 'border-sky-200/50',
      badge: 'bg-sky-100 text-sky-900',
      accent: 'bg-sky-400',
      gradient: 'linear-gradient(135deg, #38bdf8, #0284c7)', // Bleu ciel vif
      textColor: '#ffffff',
      textBorder: 'rgba(255,255,255,0.2)'
    }
  }
  if (n.includes('Avenirs 3')) {
    return {
      bg: 'bg-sky-100/70',
      text: 'text-sky-955',
      border: 'border-sky-300/50',
      badge: 'bg-sky-200/60 text-sky-955',
      accent: 'bg-sky-500',
      gradient: 'linear-gradient(135deg, #00acc1, #006064)', // Turquoise foncé distinct
      textColor: '#ffffff',
      textBorder: 'rgba(255,255,255,0.2)'
    }
  }
  if (n.includes('Benjamins 1')) {
    return {
      bg: 'bg-blue-50/70',
      text: 'text-blue-800',
      border: 'border-blue-200/40',
      badge: 'bg-blue-100/60 text-blue-800',
      accent: 'bg-blue-300',
      gradient: 'linear-gradient(135deg, #f5f3ff, #ddd6fe)', // Violet lavande très clair
      textColor: '#6d28d9',
      textBorder: '#ddd6fe'
    }
  }
  if (n.includes('Benjamins 2')) {
    return {
      bg: 'bg-blue-50/80',
      text: 'text-blue-900',
      border: 'border-blue-300/40',
      badge: 'bg-blue-100 text-blue-900',
      accent: 'bg-blue-500',
      gradient: 'linear-gradient(135deg, #818cf8, #4338ca)', // Indigo royal
      textColor: '#ffffff',
      textBorder: 'rgba(255,255,255,0.2)'
    }
  }
  if (n.includes('Juniors Compétition') || (n.includes('Juniors') && n.toUpperCase().includes('COMP'))) {
    return {
      bg: 'bg-indigo-55/70',
      text: 'text-indigo-850',
      border: 'border-indigo-200/40',
      badge: 'bg-indigo-100/60 text-indigo-800',
      accent: 'bg-indigo-600',
      gradient: 'linear-gradient(135deg, #f0abfc, #a21caf)', // Fuchsia vibrant distinct
      textColor: '#ffffff',
      textBorder: 'rgba(255,255,255,0.2)'
    }
  }
  if (n.includes('Adultes Compétition') || (n.includes('Adultes') && n.toUpperCase().includes('COMP'))) {
    return {
      bg: 'bg-blue-100/60',
      text: 'text-blue-955',
      border: 'border-blue-300/50',
      badge: 'bg-blue-200/60 text-blue-955',
      accent: 'bg-blue-800',
      gradient: 'linear-gradient(135deg, #1e293b, #0f172a)', // Deep Navy / Black
      textColor: '#ffffff',
      textBorder: 'rgba(255,255,255,0.2)'
    }
  }

  // 2. LOISIRS (Chaque groupe possède sa couleur et son identité propre)
  if (n.includes('Jeunes Loisirs')) {
    return {
      bg: 'bg-emerald-50/70',
      text: 'text-emerald-800',
      border: 'border-emerald-200/40',
      badge: 'bg-emerald-100/60 text-emerald-800',
      accent: 'bg-emerald-300',
      gradient: 'linear-gradient(135deg, #f0fdf4, #bbf7d0)', // Vert menthe très clair
      textColor: '#166534',
      textBorder: '#bbf7d0'
    }
  }
  if (n.includes('Juniors Loisirs')) {
    return {
      bg: 'bg-emerald-50/80',
      text: 'text-emerald-900',
      border: 'border-emerald-300/40',
      badge: 'bg-emerald-100 text-emerald-900',
      accent: 'bg-emerald-400',
      gradient: 'linear-gradient(135deg, #99f6e4, #0d9488)', // Teal / Aquamarine distinct
      textColor: '#ffffff',
      textBorder: 'rgba(255,255,255,0.2)'
    }
  }
  if (n.includes('Adultes Loisirs 1')) {
    return {
      bg: 'bg-emerald-100/60',
      text: 'text-emerald-955',
      border: 'border-emerald-400/30',
      badge: 'bg-emerald-200/60 text-emerald-955',
      accent: 'bg-emerald-600',
      gradient: 'linear-gradient(135deg, #f7fee7, #d9f99d)', // Vert lime / Pomme clair distinct
      textColor: '#4d7c0f',
      textBorder: '#d9f99d'
    }
  }
  if (n.includes('Adultes Loisirs 2')) {
    return {
      bg: 'bg-emerald-100/70',
      text: 'text-emerald-955',
      border: 'border-emerald-500/30',
      badge: 'bg-emerald-200 text-emerald-955',
      accent: 'bg-emerald-800',
      gradient: 'linear-gradient(135deg, #15803d, #14532d)', // Vert forêt sombre
      textColor: '#ffffff',
      textBorder: 'rgba(255,255,255,0.1)'
    }
  }

  // 3. LE RESTE (Couleurs d'identité spécifiques choisies)
  if (n.includes('Natation Artistique') || n.toUpperCase().includes('ARTISTIQUE')) {
    return {
      bg: 'bg-fuchsia-50/60',
      text: 'text-fuchsia-800',
      border: 'border-fuchsia-200/40',
      badge: 'bg-fuchsia-100/60 text-fuchsia-800',
      accent: 'bg-fuchsia-400',
      gradient: 'linear-gradient(135deg, #fce7f3, #f472b6)', // Rose distinct
      textColor: '#db2777',
      textBorder: '#fbcfe8'
    }
  }
  if (n.includes('AquaGym') || n.toUpperCase().includes('AQUA')) {
    return {
      bg: 'bg-teal-50/60',
      text: 'text-teal-800',
      border: 'border-teal-200/40',
      badge: 'bg-teal-100/60 text-teal-800',
      accent: 'bg-teal-300',
      gradient: 'linear-gradient(135deg, #ecfeff, #a5f3fc)', // Cyan pastel distinct
      textColor: '#0891b2',
      textBorder: '#c5f2f7'
    }
  }
  if (n.includes('BNSSA')) {
    return {
      bg: 'bg-orange-50/60',
      text: 'text-orange-800',
      border: 'border-orange-200/40',
      badge: 'bg-orange-100/60 text-orange-800',
      accent: 'bg-orange-300',
      gradient: 'linear-gradient(135deg, #fca5a5, #b91c1c)', // Rouge écarlate
      textColor: '#ffffff',
      textBorder: '#ef4444'
    }
  }
  if (n.includes('Ecole de natation française (ENF 1)') || n.includes('ENF 1')) {
    return {
      bg: 'bg-rose-50/60',
      text: 'text-rose-800',
      border: 'border-rose-200/40',
      badge: 'bg-rose-100/60 text-rose-800',
      accent: 'bg-rose-300',
      gradient: 'linear-gradient(135deg, #fef9c3, #eab308)', // Jaune d'or distinct
      textColor: '#854d0e',
      textBorder: '#fef08a'
    }
  }
  if (n.includes('Ecole de natation française (ENF 2)') || n.includes('ENF 2')) {
    return {
      bg: 'bg-rose-50/70',
      text: 'text-rose-900',
      border: 'border-rose-300/40',
      badge: 'bg-rose-100 text-rose-900',
      accent: 'bg-rose-500',
      gradient: 'linear-gradient(135deg, #ffedd5, #f97316)', // Orange distinct
      textColor: '#c2410c',
      textBorder: '#fed7aa'
    }
  }

  // Fallbacks
  const u = n.toUpperCase()
  if (u.includes('COMP')) {
    return {
      bg: 'bg-blue-50/80',
      text: 'text-blue-900',
      border: 'border-blue-300/40',
      badge: 'bg-blue-100 text-blue-900',
      accent: 'bg-blue-600',
      gradient: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
      textColor: '#ffffff',
      textBorder: 'rgba(255,255,255,0.2)'
    }
  }
  if (u.includes('LOISIR')) {
    return {
      bg: 'bg-emerald-50/80',
      text: 'text-emerald-900',
      border: 'border-emerald-300/40',
      badge: 'bg-emerald-100 text-emerald-900',
      accent: 'bg-emerald-600',
      gradient: 'linear-gradient(135deg, #34d399, #047857)',
      textColor: '#ffffff',
      textBorder: 'rgba(255,255,255,0.2)'
    }
  }

  return {
    bg: 'bg-slate-50/80',
    text: 'text-slate-800',
    border: 'border-slate-200/40',
    badge: 'bg-slate-100 text-slate-800',
    accent: 'bg-slate-400',
    gradient: 'linear-gradient(135deg, #94a3b8, #475569)',
    textColor: '#ffffff',
    textBorder: 'rgba(255,255,255,0.2)'
  }
}

export default function CoachAgendaBassin({ sessions }: CoachAgendaBassinProps) {
  const [selectedDayIdx, setSelectedDayIdx] = useState(0)
  const [selectedSession, setSelectedSession] = useState<Session | null>(null)

  const now = new Date()
  const days = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i)
    return {
      date: d,
      label: d.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric' }),
      isToday: i === 0
    }
  })

  const targetDate = days[selectedDayIdx].date

  const timeToMinutes = (timeStr: string | null | undefined): number => {
    if (!timeStr) return 0
    const [h, m] = timeStr.split(':').map(Number)
    return h * 60 + m
  }

  const overlaps = (p1: any, p2: any): boolean => {
    const start1 = timeToMinutes(p1.heureDebut)
    const end1 = timeToMinutes(p1.heureFin)
    const start2 = timeToMinutes(p2.heureDebut)
    const end2 = timeToMinutes(p2.heureFin)
    return start1 < end2 && start2 < end1
  }

  // Filter sessions for targetDate
  const daySessions = sessions.filter(s => {
    const sDate = new Date(s.date)
    return sDate.toDateString() === targetDate.toDateString()
  })

  const hasPPG = daySessions.some(s => {
    const lieu = s.lieu || ''
    return lieu.toUpperCase().includes('PPG')
  })

  const localLaneKeys = [
    'Grand Bassin - Ligne 1',
    'Grand Bassin - Ligne 2',
    'Grand Bassin - Ligne 3',
    'Grand Bassin - Ligne 4',
    'Petit Bassin'
  ]
  if (hasPPG) {
    localLaneKeys.push('PPG')
  }

  const localLaneLabels = [
    { key: 'Grand Bassin - Ligne 1', label: 'Ligne 1' },
    { key: 'Grand Bassin - Ligne 2', label: 'Ligne 2' },
    { key: 'Grand Bassin - Ligne 3', label: 'Ligne 3' },
    { key: 'Grand Bassin - Ligne 4', label: 'Ligne 4' },
    { key: 'Petit Bassin', label: 'Petit Bassin' }
  ]
  if (hasPPG) {
    localLaneLabels.push({ key: 'PPG', label: 'PPG' })
  }

  // Group by lane
  const laneAssignments: { [key: string]: Session[] } = {
    'Grand Bassin - Ligne 1': [],
    'Grand Bassin - Ligne 2': [],
    'Grand Bassin - Ligne 3': [],
    'Grand Bassin - Ligne 4': [],
    'Petit Bassin': [],
  }
  if (hasPPG) {
    laneAssignments['PPG'] = []
  }

  const explicitSessions: Session[] = []
  const genericSessions: Session[] = []

  daySessions.forEach(s => {
    const lieu = s.lieu || ''
    if (localLaneKeys.includes(lieu)) {
      explicitSessions.push(s)
    } else {
      let matchedKey: string | null = null
      if (lieu.includes('Ligne 1')) matchedKey = 'Grand Bassin - Ligne 1'
      else if (lieu.includes('Ligne 2')) matchedKey = 'Grand Bassin - Ligne 2'
      else if (lieu.includes('Ligne 3')) matchedKey = 'Grand Bassin - Ligne 3'
      else if (lieu.includes('Ligne 4')) matchedKey = 'Grand Bassin - Ligne 4'
      else if (lieu.includes('Petit Bassin')) matchedKey = 'Petit Bassin'
      else if (lieu.toUpperCase().includes('PPG')) matchedKey = 'PPG'

      if (matchedKey) {
        explicitSessions.push({ ...s, lieu: matchedKey })
      } else {
        genericSessions.push(s)
      }
    }
  })

  explicitSessions.forEach(s => {
    if (s.lieu && laneAssignments[s.lieu]) {
      laneAssignments[s.lieu].push(s)
    }
  })

  const sortedGeneric = [...genericSessions].sort((a, b) => {
    return timeToMinutes(a.heureDebut) - timeToMinutes(b.heureDebut)
  })

  sortedGeneric.forEach(s => {
    let assigned = false
    for (const laneKey of localLaneKeys) {
      const hasOverlap = laneAssignments[laneKey].some(existing => overlaps(s, existing))
      if (!hasOverlap) {
        laneAssignments[laneKey].push(s)
        assigned = true
        break
      }
    }
    if (!assigned) {
      laneAssignments['Grand Bassin - Ligne 1'].push(s)
    }
  })

  return (
    <div className="space-y-4">
      {/* Day Selector Bar */}
      <div className="flex justify-between items-center bg-slate-50/50 p-1.5 rounded-2xl border border-slate-200/60 shadow-2xs overflow-x-auto gap-1">
        {days.map((day, idx) => {
          const sessionsCount = sessions.filter(s => new Date(s.date).toDateString() === day.date.toDateString()).length
          const isActive = selectedDayIdx === idx
          return (
            <button
              key={idx}
              onClick={() => setSelectedDayIdx(idx)}
              className={`flex-1 min-w-[70px] py-2 px-1 rounded-xl text-center transition-all cursor-pointer flex flex-col items-center gap-0.5 ${
                isActive
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800'
              }`}
            >
              <span className="text-[10px] font-black uppercase tracking-wider">{day.label.split(' ')[0]}</span>
              <span className="text-xs font-black">{day.date.getDate()}</span>
              {sessionsCount > 0 && (
                <span className={`text-[8px] px-1 py-0.25 rounded-full font-extrabold ${
                  isActive ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
                }`}>
                  {sessionsCount}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Pool Grid */}
      <div className="bg-slate-55/40 border border-slate-200/80 rounded-2xl p-4 overflow-x-auto shadow-inner bg-slate-100">
        <div className="min-w-[650px] relative h-[480px] bg-gradient-to-b from-cyan-300/10 via-sky-400/5 to-blue-500/10 border-2 border-slate-900 rounded-xl overflow-hidden flex">
          {/* Timeline ruler */}
          <div className="w-12 shrink-0 bg-slate-900 text-slate-400 font-mono text-[8px] select-none flex flex-col justify-between py-2 text-center border-r border-slate-800">
            <div className="h-6" />
            <div className="relative flex-grow h-[calc(100%-1.5rem)]">
              {Array.from({ length: 15 }).map((_, idx) => {
                const hour = 8 + idx
                const topPct = (idx / 14) * 100
                return (
                  <span
                    key={hour}
                    className="absolute left-0 right-0 text-center font-bold -translate-y-1/2"
                    style={{ top: `${topPct}%` }}
                  >
                    {hour.toString().padStart(2, '0')}:00
                  </span>
                )
              })}
            </div>
          </div>

          {/* Lanes */}
          <div className={`flex-grow relative grid h-full ${hasPPG ? 'grid-cols-6' : 'grid-cols-5'}`}>
            {/* Horizontal lines */}
            <div className="absolute inset-0 pointer-events-none z-0 mt-6 h-[calc(100%-1.5rem)]">
              {Array.from({ length: 15 }).map((_, idx) => {
                const topPct = (idx / 14) * 100
                return (
                  <div
                    key={idx}
                    className="absolute left-0 right-0 border-t border-cyan-400/10"
                    style={{ top: `${topPct}%` }}
                  />
                )
              })}
            </div>

            {/* Vertical lane separators */}
            {(hasPPG ? [16.66, 33.33, 50, 66.66, 83.33] : [20, 40, 60, 80]).map((leftPct, idx) => (
              <div
                key={idx}
                className="absolute top-6 bottom-0 w-1 -ml-0.5 z-20 pointer-events-none opacity-60"
                style={{
                  left: `${leftPct}%`,
                  background: 'repeating-linear-gradient(to bottom, #ef4444 0px, #ef4444 8px, #ffffff 8px, #ffffff 16px)',
                  borderRadius: '9999px',
                }}
              />
            ))}

            {/* Lanes columns mapping */}
            {localLaneLabels.map((lane) => {
              const laneSessions = laneAssignments[lane.key] || []
              const sorted = [...laneSessions].sort((a, b) => timeToMinutes(a.heureDebut) - timeToMinutes(b.heureDebut))
              
              // Column placement logic
              const columns: Session[][] = []
              sorted.forEach(s => {
                let placed = false
                for (let i = 0; i < columns.length; i++) {
                  const col = columns[i]
                  const last = col[col.length - 1]
                  const lastEnd = timeToMinutes(last.heureFin)
                  const sStart = timeToMinutes(s.heureDebut)
                  if (sStart >= lastEnd) {
                    col.push(s)
                    placed = true
                    break
                  }
                }
                if (!placed) {
                  columns.push([s])
                }
              })

              const totalCols = columns.length

              return (
                <div key={lane.key} className="relative h-full flex flex-col pt-6 border-r border-cyan-400/10 last:border-r-0">
                  {/* Lane Header */}
                  <div className="absolute top-0 left-0 right-0 h-6 bg-slate-900 border-b border-slate-800 flex items-center justify-center z-10">
                    <span className="text-[8px] font-black text-white uppercase tracking-wider select-none">
                      {lane.label}
                    </span>
                  </div>

                  {/* Lane items container */}
                  <div className="relative flex-grow h-[calc(100%-1.5rem)]">
                    {columns.map((col, colIdx) => {
                      const leftPct = (colIdx / totalCols) * 100

                      return col.map((session) => {
                        const startMin = timeToMinutes(session.heureDebut)
                        const endMin = timeToMinutes(session.heureFin)
                        const topPct = ((startMin - 480) / 840) * 100
                        const heightPct = ((endMin - startMin) / 840) * 100

                        const duration = endMin - startMin
                        const isShort = duration <= 50

                        const isMine = session.isMySession
                        const color = getCouleurGroupe(session.titre, session.couleur)

                        // Calculate colSpan
                        let colSpan = 1
                        for (let nextColIdx = colIdx + 1; nextColIdx < totalCols; nextColIdx++) {
                          const hasOverlap = columns[nextColIdx].some(other => {
                            const oStart = timeToMinutes(other.heureDebut)
                            const oEnd = timeToMinutes(other.heureFin)
                            return startMin < oEnd && endMin > oStart
                          })
                          if (!hasOverlap) {
                            colSpan++
                          } else {
                            break
                          }
                        }
                        const widthPct = (colSpan / totalCols) * 100

                        return (
                          <div
                            key={session.id}
                            onClick={() => setSelectedSession(session)}
                            style={{
                              top: `${topPct}%`,
                              height: `${heightPct}%`,
                              left: `calc(${leftPct}% + 1px)`,
                              width: `calc(${widthPct}% - 2px)`,
                              ...(isMine && {
                                background: color.gradient,
                                color: color.textColor,
                                borderColor: color.textBorder
                              })
                            }}
                            className={`absolute rounded-lg flex flex-col justify-center border cursor-pointer hover:shadow-sm hover:-translate-y-0.25 transition-all duration-200 select-none overflow-hidden ${
                              isShort ? 'p-1 gap-0' : 'p-1.5 gap-0.5'
                            } ${
                              isMine
                                ? 'ring-2 ring-primary/30 z-30 shadow-sm'
                                : 'bg-slate-50 text-slate-400 border-slate-200/80 border-dashed opacity-60 hover:opacity-80 z-20'
                            }`}
                          >
                            <div className={`min-w-0 ${isShort ? 'space-y-0' : 'space-y-0.5'}`}>
                              <p className={`font-black truncate leading-tight ${isMine ? '' : 'text-slate-600 font-bold'} ${
                                isShort ? 'text-[8.5px] sm:text-[9.5px]' : 'text-[9px] sm:text-[10px]'
                              }`}>
                                {session.titre}
                              </p>
                              <p className={`font-extrabold leading-none ${isMine ? 'opacity-85' : 'text-slate-550'} ${
                                isShort ? 'text-[7.5px] sm:text-[8px]' : 'text-[8px] sm:text-[9px]'
                              }`}>
                                {session.heureDebut} - {session.heureFin}
                              </p>
                              {!isShort && !isMine && session.coachName && (
                                <p className="text-[7.5px] text-slate-450 font-semibold truncate leading-none mt-0.5">
                                  👤 {session.coachName}
                                </p>
                              )}
                            </div>
                          </div>
                        )
                      })
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Detail Modal */}
      {selectedSession && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-xl border border-slate-100 flex flex-col relative">
            <button
              onClick={() => setSelectedSession(null)}
              className="absolute top-3 right-3 text-slate-400 hover:text-slate-600 transition-colors font-bold cursor-pointer"
            >
              ✕
            </button>

            <div className="mb-3">
              <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider ${
                selectedSession.isMySession
                  ? 'bg-primary/10 text-primary border border-primary/20'
                  : 'bg-slate-100 text-slate-700 border border-slate-200'
              }`}>
                {selectedSession.isMySession ? 'Mon cours' : 'Autre cours'} • Séance {selectedSession.type === 'fixe' ? 'Fixe' : 'Tournante'}
              </span>
              <h3 className="text-lg font-black text-slate-900 mt-2 leading-tight">
                {selectedSession.titre}
              </h3>
            </div>

            <div className="space-y-2 mb-4 text-xs text-slate-600">
              <p>📅 <strong>{new Date(selectedSession.date).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}</strong></p>
              <p>⏰ <strong>{selectedSession.heureDebut} - {selectedSession.heureFin}</strong></p>
              <p>🏊 <strong>{selectedSession.lieu || 'Piscine Municipale'}</strong></p>
              {selectedSession.coachName && (
                <p>👤 Coach(s) : <strong>{selectedSession.coachName}</strong></p>
              )}
            </div>

            <button
              onClick={() => setSelectedSession(null)}
              className="w-full bg-slate-900 text-white font-bold text-xs uppercase tracking-wider py-2.5 rounded-xl hover:bg-slate-800 transition-colors"
            >
              Fermer
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
