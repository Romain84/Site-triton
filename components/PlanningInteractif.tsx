'use client'

import { useState, useEffect } from 'react'

interface Planning {
  id: string
  jourSemaine: string
  heureDebut: string
  heureFin: string
  groupeId: string | null
  groupe: {
    id: string
    nom: string
  } | null
  coachs: Array<{
    id: string
    coach: {
      prenom: string
      nom: string | null
    }
  }>
  lieu: string | null
  couleur: string | null
  actif: boolean
}

interface Groupe {
  id: string
  nom: string
  niveau: string | null
  tarif: number | null
}

interface PlanningInteractifProps {
  plannings: Planning[]
  groupes: Groupe[]
}

const JOURS_ORDRE = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi']

const CATEGORIES = {
  all: 'Tous',
  enf: 'ENF (Apprentissage)',
  avenirs: 'Avenirs (U11 et -)',
  benjamins: 'Benjamins (U12 - U13)',
  juniors: 'Juniors (U14 - U18)',
  adultes: 'Adultes / Maîtres (25 ans et +)',
  loisirs: 'Loisirs',
  autres: 'Autres (Artistique, AquaGym, BNSSA)',
}

function categoriseGroupe(nom: string): string {
  const u = nom.toUpperCase()
  if (u.includes('ENF')) return 'enf'
  if (u.includes('AVENIRS')) return 'avenirs'
  if (u.includes('BENJAMINS')) return 'benjamins'
  if (u.includes('JUNIORS')) return 'juniors'
  if (u.includes('ADULTES') || u.includes('MAÎTRES') || u.includes('MAITRES')) return 'adultes'
  if (u.includes('LOISIRS')) return 'loisirs'
  return 'autres'
}

function getCouleurGroupe(nom: string): { bg: string; text: string; border: string; badge: string; accent: string; gradient: string; textColor: string; textBorder: string } {
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
      gradient: 'linear-gradient(135deg, #1e293b, #0f172a)', // Bleu nuit profond / Noir
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

export default function PlanningInteractif({ plannings, groupes }: PlanningInteractifProps) {
  const [filtre, setFiltre] = useState<string>('all')
  const [viewMode, setViewMode] = useState<'grille' | 'tableau' | 'bassin'>(() => {
    if (typeof window === 'undefined') return 'grille'
    const saved = localStorage.getItem('planning_view_mode')
    return saved === 'tableau' || saved === 'grille' || saved === 'bassin' ? (saved as any) : 'grille'
  })

  const [selectedDayTimeline, setSelectedDayTimeline] = useState<string>('Lundi')
  const [selectedDayBassin, setSelectedDayBassin] = useState<string>('Lundi')
  const [selectedPlanningDetails, setSelectedPlanningDetails] = useState<Planning | null>(null)

  // Synchroniser les jours sélectionnés si nécessaire
  useEffect(() => {
    setSelectedDayBassin(selectedDayTimeline)
  }, [selectedDayTimeline])

  const timeToMinutes = (timeStr: string | null | undefined): number => {
    if (!timeStr) return 0
    const [h, m] = timeStr.split(':').map(Number)
    return h * 60 + m
  }

  const overlaps = (p1: Planning, p2: Planning): boolean => {
    const start1 = timeToMinutes(p1.heureDebut)
    const end1 = timeToMinutes(p1.heureFin)
    const start2 = timeToMinutes(p2.heureDebut)
    const end2 = timeToMinutes(p2.heureFin)
    return start1 < end2 && start2 < end1
  }

  const renderPoolGrid = (day: string, planningsForDay: Planning[], isPrintOnly: boolean = false) => {
    const laneKeys = [
      'Grand Bassin - Ligne 1',
      'Grand Bassin - Ligne 2',
      'Grand Bassin - Ligne 3',
      'Grand Bassin - Ligne 4',
      'Petit Bassin'
    ]

    const laneAssignments: { [key: string]: Planning[] } = {
      'Grand Bassin - Ligne 1': [],
      'Grand Bassin - Ligne 2': [],
      'Grand Bassin - Ligne 3': [],
      'Grand Bassin - Ligne 4': [],
      'Petit Bassin': [],
    }
    
    const explicitPlannings: Planning[] = []
    const genericPlannings: Planning[] = []
    
    planningsForDay.forEach(p => {
      const lieu = p.lieu || ''
      if (laneKeys.includes(lieu)) {
        explicitPlannings.push(p)
      } else {
        let matchedKey: string | null = null
        if (lieu.includes('Ligne 1')) matchedKey = 'Grand Bassin - Ligne 1'
        else if (lieu.includes('Ligne 2')) matchedKey = 'Grand Bassin - Ligne 2'
        else if (lieu.includes('Ligne 3')) matchedKey = 'Grand Bassin - Ligne 3'
        else if (lieu.includes('Ligne 4')) matchedKey = 'Grand Bassin - Ligne 4'
        else if (lieu.includes('Petit Bassin')) matchedKey = 'Petit Bassin'
        
        if (matchedKey) {
          explicitPlannings.push({ ...p, lieu: matchedKey })
        } else {
          genericPlannings.push(p)
        }
      }
    })
    
    explicitPlannings.forEach(p => {
      if (p.lieu && laneAssignments[p.lieu]) {
        laneAssignments[p.lieu].push(p)
      }
    })
    
    const sortedGeneric = [...genericPlannings].sort((a, b) => {
      return timeToMinutes(a.heureDebut) - timeToMinutes(b.heureDebut)
    })
    
    sortedGeneric.forEach(p => {
      let assigned = false
      for (const laneKey of laneKeys) {
        const hasOverlap = laneAssignments[laneKey].some(existing => overlaps(p, existing))
        if (!hasOverlap) {
          laneAssignments[laneKey].push(p)
          assigned = true
          break
        }
      }
      if (!assigned) {
        laneAssignments['Grand Bassin - Ligne 1'].push(p)
      }
    })

    return (
      <div className="bg-slate-100 rounded-3xl p-5 shadow-inner border border-slate-200/80 overflow-x-auto print:bg-white print:border-0 print:p-0">
        <div className="min-w-[800px]">
          {/* Day Name header inside the printable page */}
          {isPrintOnly ? (
            <div className="text-center mb-6">
              <h2 className="text-3xl font-black uppercase tracking-widest text-slate-900 border-b-2 border-slate-900 pb-2">
                🏊 PLANNING - {day}
              </h2>
            </div>
          ) : (
            <div className="flex items-center justify-between mb-4 px-2 print:hidden">
              <span className="text-xs font-black text-slate-655 flex items-center gap-1.5 uppercase tracking-wider select-none">
                🏊 Bassin de Cavaillon • {day}
              </span>
              <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wide select-none">
                08:00 - 22:00 • Cliquez sur un cours pour plus d&apos;informations
              </span>
            </div>
          )}

          <div className="relative h-[720px] bg-gradient-to-b from-cyan-300/10 via-sky-400/5 to-blue-500/10 border-4 border-slate-900 rounded-2xl overflow-hidden shadow-md flex print:border-0 print:shadow-none">
            
            {/* Ruler column (left) */}
            <div className="w-16 flex-shrink-0 bg-slate-900 text-slate-400 font-mono text-[9px] select-none flex flex-col justify-between py-4 text-center border-r border-slate-800">
              <div className="h-10 border-b border-slate-800" />
              <div className="relative flex-grow h-[calc(100%-2.5rem)]">
                {Array.from({ length: 15 }).map((_, idx) => {
                  const hour = 8 + idx
                  const topPct = (idx / 14) * 100
                  return (
                    <span
                      key={hour}
                      className="absolute left-0 right-0 text-center font-black -translate-y-1/2 text-slate-400"
                      style={{ top: `${topPct}%` }}
                    >
                      {hour.toString().padStart(2, '0')}:00
                    </span>
                  )
                })}
              </div>
            </div>

            {/* Lanes column container */}
            <div className="flex-grow relative grid grid-cols-5 h-full">
              
              {/* Horizontal grid lines */}
              <div className="absolute inset-0 pointer-events-none z-0 mt-10 h-[calc(100%-2.5rem)]">
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

              {/* Repeating pool lane separators (vertical ropes) */}
              {[20, 40, 60, 80].map((leftPct, idx) => {
                return (
                  <div
                    key={idx}
                    className="absolute top-10 bottom-0 w-1.5 -ml-0.75 z-20 pointer-events-none shadow-xs"
                    style={{
                      left: `${leftPct}%`,
                      background: 'repeating-linear-gradient(to bottom, #ef4444 0px, #ef4444 12px, #ffffff 12px, #ffffff 24px)',
                      borderRadius: '9999px',
                      opacity: 0.8,
                    }}
                  />
                )
              })}

              {/* Lanes mapping */}
              {[
                { key: 'Grand Bassin - Ligne 1', label: 'Ligne 1' },
                { key: 'Grand Bassin - Ligne 2', label: 'Ligne 2' },
                { key: 'Grand Bassin - Ligne 3', label: 'Ligne 3' },
                { key: 'Grand Bassin - Ligne 4', label: 'Ligne 4' },
                { key: 'Petit Bassin', label: 'Petit Bassin' },
              ].map((lane, laneIdx) => {
                const columnPlannings = laneAssignments[lane.key] || []
                
                const sortedPlannings = [...columnPlannings].sort((a, b) => {
                  return timeToMinutes(a.heureDebut) - timeToMinutes(b.heureDebut)
                })
                
                const columns: Planning[][] = []
                sortedPlannings.forEach(p => {
                  let placed = false
                  for (let i = 0; i < columns.length; i++) {
                    const col = columns[i]
                    const last = col[col.length - 1]
                    const lastEnd = timeToMinutes(last.heureFin)
                    const pStart = timeToMinutes(p.heureDebut)
                    if (pStart >= lastEnd) {
                      col.push(p)
                      placed = true
                      break
                    }
                  }
                  if (!placed) {
                    columns.push([p])
                  }
                })
                
                const totalCols = columns.length
                
                return (
                  <div
                    key={lane.key}
                    className="relative h-full flex flex-col pt-10 border-r border-cyan-400/10 last:border-r-0"
                  >
                    <div className="absolute top-0 left-0 right-0 h-10 bg-slate-900 border-b border-slate-800 flex items-center justify-center z-10">
                      <span className="text-[10px] font-black text-white uppercase tracking-wider select-none">
                        {lane.label}
                      </span>
                    </div>
                    <div className="relative flex-grow h-[calc(100%-2.5rem)]">
                      {columns.map((col, colIdx) => {
                        const leftPct = (colIdx / totalCols) * 100
                        const widthPct = 100 / totalCols
                        
                        return col.map((planning) => {
                          const startMin = timeToMinutes(planning.heureDebut)
                          const endMin = timeToMinutes(planning.heureFin)
                          const topPct = ((startMin - 480) / 840) * 100
                          const heightPct = ((endMin - startMin) / 840) * 100
                          
                          const color = getCouleurGroupe(planning.groupe?.nom || '')
                          
                          return (
                            <div
                              key={planning.id}
                              onClick={() => setSelectedPlanningDetails(planning)}
                              title={`${planning.groupe?.nom}\nHoraires : ${planning.heureDebut} - ${planning.heureFin}\nLieu : ${planning.lieu || 'Piscine'}${planning.coachs && planning.coachs.length > 0 ? `\nCoach(s) : ${planning.coachs.map(c => c.coach.prenom).join(', ')}` : ''}`}
                              style={{
                                top: `${topPct}%`,
                                height: `${heightPct}%`,
                                left: `calc(${leftPct}% + 2px)`,
                                width: `calc(${widthPct}% - 4px)`,
                                background: planning.couleur ? getCardGradient(planning.couleur) : color.gradient,
                                color: planning.couleur ? '#ffffff' : color.textColor,
                                borderColor: planning.couleur ? 'rgba(255, 255, 255, 0.2)' : color.textBorder
                              }}
                              className="absolute rounded-xl p-2.5 print:p-1 flex flex-col justify-between border cursor-pointer hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 select-none overflow-hidden shadow-sm"
                            >
                              <div className="min-w-0 space-y-0.5 print:space-y-0">
                                <p className="font-black text-[10px] md:text-xs print:text-[8px] print:leading-tight print:whitespace-normal print:break-words truncate leading-tight">
                                  {planning.groupe?.nom}
                                </p>
                                <p className="text-[9px] font-extrabold leading-none print:text-[7.5px] print:leading-none opacity-85">
                                  {planning.heureDebut} - {planning.heureFin}
                                </p>
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
      </div>
    )
  }

  // Filtrer les groupes selon la catégorie sélectionnée
  const groupesFiltres = groupes.filter((groupe) => {
    if (filtre === 'all') return true
    return categoriseGroupe(groupe.nom) === filtre
  })

  // Plannings filtrés par groupe actif
  const planningsFiltres = plannings.filter(p => {
    if (p.jourSemaine === 'Dimanche') return false // Supprimer dimanche
    if (!p.groupe) return false
    if (filtre === 'all') return true
    return categoriseGroupe(p.groupe.nom) === filtre
  })

  // Organiser les plannings par jour et groupe
  const planningParJourEtGroupe: Record<string, Record<string, Planning[]>> = {}
  JOURS_ORDRE.forEach((jour) => {
    planningParJourEtGroupe[jour] = {}
    groupes.forEach((groupe) => {
      planningParJourEtGroupe[jour][groupe.id] = planningsFiltres.filter(
        (p) => p.jourSemaine === jour && p.groupeId === groupe.id
      )
    })
  })

  const handleExportPDF = () => {
    window.print()
  }

  return (
    <div className="space-y-10 animate-fade-in-up">
      {/* En-tête épuré et aérien */}
      <div className="text-center space-y-3 print:hidden">
        <h1 className="text-4xl md:text-6xl font-black text-slate-900 tracking-tight leading-tight animate-fade-in">
          Planning des Entraînements
        </h1>
        <div className="flex items-center justify-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-cyan-500 animate-pulse" />
          <p className="text-slate-400 font-extrabold text-xs tracking-widest uppercase">Saison 2026 - 2027</p>
        </div>
      </div>

      {/* Barre d'outils et sélecteurs de vue */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-white/70 backdrop-blur-md p-3 rounded-2xl border border-slate-200/50 shadow-sm max-w-4xl mx-auto print:hidden">
        <div className="inline-flex rounded-xl bg-slate-100 p-1 border border-slate-200/25">
          <button
            onClick={() => { setViewMode('grille'); localStorage.setItem('planning_view_mode', 'grille') }}
            className={`px-4 py-2 rounded-lg font-bold text-xs tracking-wider uppercase transition-all duration-200 cursor-pointer ${
              viewMode === 'grille'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            📅 Par Jour (Timeline)
          </button>
          <button
            onClick={() => { setViewMode('tableau'); localStorage.setItem('planning_view_mode', 'tableau') }}
            className={`px-4 py-2 rounded-lg font-bold text-xs tracking-wider uppercase transition-all duration-200 cursor-pointer ${
              viewMode === 'tableau'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            🗓️ Semaine Globale
          </button>
          <button
            onClick={() => { setViewMode('bassin'); localStorage.setItem('planning_view_mode', 'bassin') }}
            className={`px-4 py-2 rounded-lg font-bold text-xs tracking-wider uppercase transition-all duration-200 cursor-pointer ${
              viewMode === 'bassin'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            🏊 Vue Bassin
          </button>
        </div>

        <button
          onClick={handleExportPDF}
          className="px-4 py-2.5 bg-slate-950 hover:bg-slate-900 text-white font-bold text-xs tracking-wider uppercase rounded-xl transition-all duration-200 cursor-pointer shadow-xs"
        >
          🖨️ Imprimer / PDF
        </button>
      </div>

      {/* Filtres par catégorie épurés */}
      <div className="flex flex-wrap justify-center gap-2 max-w-5xl mx-auto print:hidden">
        {Object.entries(CATEGORIES).map(([key, label]) => {
          const isActive = filtre === key
          return (
            <button
              key={key}
              onClick={() => setFiltre(key)}
              className={`px-4 py-2 rounded-full font-bold text-xs tracking-wider uppercase transition-all cursor-pointer ${
                isActive
                  ? 'bg-slate-900 text-white shadow-sm border border-slate-900'
                  : 'bg-white text-slate-650 border border-slate-200 hover:border-slate-400 hover:text-slate-900'
              }`}
            >
              {label}
            </button>
          )
        })}
      </div>

      {/* === VUE 1 : AGENDA TIMELINE (PAR JOUR) === */}
      {/* === VUE 1 : AGENDA TIMELINE (PAR JOUR) === */}
      {viewMode === 'grille' && (
        <div className="max-w-3xl mx-auto space-y-8">
          {/* Day Selector Bar */}
          <div className="flex justify-between items-center bg-white p-2 rounded-2xl border border-slate-200/60 shadow-xs print:hidden overflow-x-auto">
            {JOURS_ORDRE.map((day) => {
              const sessionsDay = planningsFiltres.filter(p => p.jourSemaine === day)
              const isActive = selectedDayTimeline === day
              return (
                <button
                  key={day}
                  onClick={() => setSelectedDayTimeline(day)}
                  className={`flex-1 min-w-[75px] py-3 px-2 rounded-xl text-center transition-all cursor-pointer flex flex-col items-center gap-1 ${
                    isActive
                       ? 'bg-slate-950 text-white shadow-md'
                       : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
                  }`}
                >
                  <span className="text-xs font-black uppercase tracking-wider">{day}</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-extrabold ${
                    isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
                  }`}>
                    {sessionsDay.length}
                  </span>
                </button>
              )
            })}
          </div>

          {/* Timeline list (Screen Only) */}
          <div className="relative border-l border-slate-200/80 ml-4 md:ml-32 py-4 space-y-6 print:hidden">
            {(() => {
              const dayPlannings = planningsFiltres
                .filter(p => p.jourSemaine === selectedDayTimeline)
                .sort((a, b) => a.heureDebut.localeCompare(b.heureDebut))

              if (dayPlannings.length === 0) {
                return (
                  <div className="bg-white rounded-3xl p-8 border border-slate-200/60 text-center space-y-3 shadow-2xs ml-6">
                    <p className="text-3xl">🌊</p>
                    <h4 className="text-slate-800 font-extrabold text-sm uppercase tracking-wider">Aucun entraînement</h4>
                    <p className="text-slate-400 text-xs font-medium">Il n&apos;y a aucune séance prévue pour ce jour ou cette catégorie.</p>
                  </div>
                )
              }

              return dayPlannings.map((session) => {
                const color = getCouleurGroupe(session.groupe?.nom || '')
                return (
                  <div key={session.id} className="relative pl-8 md:pl-0">
                    
                    {/* Time on left for Desktop */}
                    <div className="hidden md:block absolute -left-32 top-1.5 w-24 text-right">
                      <p className="text-sm font-black text-slate-900">{session.heureDebut}</p>
                      <p className="text-[10px] text-slate-400 font-extrabold">{session.heureFin}</p>
                    </div>

                    {/* Bullet marker on timeline */}
                    <div className={`absolute -left-1.5 top-3.5 w-3 h-3 rounded-full border-2 border-white shadow-xs ${color.accent}`} />

                    {/* Spacious Card */}
                    <div
                      onClick={() => setSelectedPlanningDetails(session)}
                      className={`bg-white hover:bg-slate-50/50 border border-slate-200/60 rounded-3xl p-5 md:p-6 shadow-2xs hover:shadow-md transition-all duration-200 cursor-pointer ml-6 relative group border-l-4 ${color.border}`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="space-y-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className={`px-2 py-0.5 rounded text-[9px] font-extrabold uppercase tracking-wider ${color.badge}`}>
                              {session.groupe ? categoriseGroupe(session.groupe.nom).toUpperCase() : 'AUTRE'}
                            </span>
                            <span className="md:hidden text-xs font-black text-slate-700">
                              {session.heureDebut} - {session.heureFin}
                            </span>
                          </div>
                          
                          <h3 className="text-base md:text-lg font-black text-slate-900 group-hover:text-cyan-600 transition-colors">
                            {session.groupe?.nom}
                          </h3>

                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-slate-500 font-medium">
                            <span className="flex items-center gap-1">
                              📍 {session.lieu || 'Piscine Municipale'}
                            </span>
                            {session.coachs.length > 0 && (
                              <span className="flex items-center gap-1">
                                👨‍🏫 {session.coachs.map(c => c.coach.prenom).join(', ')}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="sm:text-right shrink-0">
                          <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-slate-400 group-hover:text-slate-800 transition-colors">
                            Détails & Inscription <span>→</span>
                          </span>
                        </div>
                      </div>
                    </div>

                  </div>
                )
              })
            })()}
          </div>

          {/* Timeline list (Print Only: loop through all days) */}
          <div className="hidden print:block print:space-y-0">
            {JOURS_ORDRE.map((day) => {
              const dayPlannings = planningsFiltres
                .filter(p => p.jourSemaine === day)
                .sort((a, b) => a.heureDebut.localeCompare(b.heureDebut))

              if (dayPlannings.length === 0) return null

              return (
                <div key={day} className="page-break-container py-4">
                  {/* Day Header */}
                  <div className="text-center mb-8 border-b-2 border-slate-900 pb-3">
                    <h2 className="text-2xl font-black uppercase tracking-widest text-slate-900">
                      📅 PLANNING - {day}
                    </h2>
                  </div>

                  {/* Timeline list */}
                  <div className="relative border-l border-slate-300 ml-28 py-2 space-y-4">
                    {dayPlannings.map((session) => {
                      const color = getCouleurGroupe(session.groupe?.nom || '')
                      return (
                        <div key={session.id} className="relative">
                          {/* Time on left (always visible in print) */}
                          <div className="absolute -left-28 top-1 w-20 text-right">
                            <p className="text-xs font-black text-slate-900">{session.heureDebut}</p>
                            <p className="text-[9px] text-slate-500 font-extrabold">{session.heureFin}</p>
                          </div>

                          {/* Bullet marker on timeline */}
                          <div className={`absolute -left-1.5 top-2.5 w-3 h-3 rounded-full border-2 border-white shadow-xs ${color.accent}`} />

                          {/* Card */}
                          <div className={`bg-white border border-slate-200 rounded-2xl p-4 ml-6 border-l-4 ${color.border}`}>
                            <div className="flex justify-between items-center">
                              <div>
                                <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider ${color.badge}`}>
                                  {session.groupe ? categoriseGroupe(session.groupe.nom).toUpperCase() : 'AUTRE'}
                                </span>
                                <h3 className="text-sm font-black text-slate-900 mt-1">
                                  {session.groupe?.nom}
                                </h3>
                                <div className="flex gap-x-4 mt-1 text-[10px] text-slate-500 font-medium">
                                  <span>📍 {session.lieu || 'Piscine'}</span>
                                  {session.coachs.length > 0 && (
                                    <span>👨‍🏫 {session.coachs.map(c => c.coach.prenom).join(', ')}</span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* === VUE 2 : WEEKLY TABLE (DAYS AS COLUMNS, GROUPS AS ROWS) === */}
      {viewMode === 'tableau' && (
        <div className="bg-white rounded-3xl border border-slate-200/70 shadow-xs overflow-hidden max-w-6xl mx-auto">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-900 text-white">
                  <th className="p-4 print:p-2 font-black text-xs uppercase tracking-wider sticky left-0 bg-slate-900 z-10 min-w-[200px] print:min-w-0 border-r border-slate-800">
                    Groupe / Section
                  </th>
                  {JOURS_ORDRE.map((jour) => (
                    <th key={jour} className="p-4 print:p-2 font-black text-xs uppercase tracking-wider text-center border-r border-slate-800 min-w-[120px] print:min-w-0 last:border-r-0">
                      {jour}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-800">
                {groupesFiltres.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-12 text-center text-slate-400 italic text-xs font-semibold">
                      Aucun groupe ne correspond à cette catégorie.
                    </td>
                  </tr>
                ) : (
                  groupesFiltres.map((groupe) => {
                    const color = getCouleurGroupe(groupe.nom)
                    return (
                      <tr key={groupe.id} className="hover:bg-slate-50/30 transition-colors">
                        <td className="p-4 print:p-2 font-bold text-slate-900 sticky left-0 bg-white shadow-[2px_0_5px_rgba(0,0,0,0.03)] z-10 border-r border-slate-100">
                          <div className="flex flex-col gap-1 items-start">
                            <span className="text-xs font-black">{groupe.nom}</span>
                            <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider mt-1 ${color.badge}`}>
                              {categoriseGroupe(groupe.nom)}
                            </span>
                          </div>
                        </td>
                        {JOURS_ORDRE.map((jour) => {
                          const sessions = planningParJourEtGroupe[jour]?.[groupe.id] || []
                          return (
                            <td key={jour} className="p-3 print:p-1 text-center border-r border-slate-100 bg-white last:border-r-0">
                              {sessions.length > 0 ? (
                                <div className="space-y-1">
                                  {sessions.map((session) => (
                                    <div
                                      key={session.id}
                                      onClick={() => setSelectedPlanningDetails(session)}
                                      title={`${session.groupe?.nom || groupe.nom}\nHoraires : ${session.heureDebut} - ${session.heureFin}\nLieu : ${session.lieu || 'Piscine'}${session.coachs && session.coachs.length > 0 ? `\nCoach(s) : ${session.coachs.map(c => c.coach.prenom).join(', ')}` : ''}`}
                                      style={{
                                        background: session.couleur ? getCardGradient(session.couleur) : color.gradient,
                                        color: session.couleur ? '#ffffff' : color.textColor,
                                        borderColor: session.couleur ? 'rgba(255, 255, 255, 0.1)' : color.textBorder
                                      }}
                                      className="p-2 print:p-1 rounded-xl print:rounded-lg border text-[11px] print:text-[8.5px] font-black cursor-pointer shadow-2xs hover:shadow-xs transition-all"
                                    >
                                      <div>{session.heureDebut} - {session.heureFin}</div>
                                      <div className="text-[9px] print:text-[7px] print:leading-none font-bold mt-0.5 uppercase tracking-wide truncate max-w-[110px] print:max-w-none mx-auto opacity-75">
                                        {session.lieu || 'Piscine'}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <span className="text-slate-200 font-light select-none">·</span>
                              )}
                            </td>
                          )
                        })}
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* === VUE 3 : BASSIN VIEW (PISCINE INTERACTIVE) === */}
      {viewMode === 'bassin' && (
        <div className="space-y-6 max-w-5xl mx-auto">
          {/* Day Switcher */}
          <div className="flex flex-wrap justify-center gap-2 mb-6 bg-slate-100/80 p-1.5 rounded-xl border border-slate-200/40 print:hidden">
            {JOURS_ORDRE.map(day => {
              const count = planningsFiltres.filter(p => p.jourSemaine === day).length
              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => setSelectedDayBassin(day)}
                  className={`px-4 py-2 rounded-lg font-bold text-xs uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer ${
                    selectedDayBassin === day
                      ? 'bg-slate-900 text-white shadow-sm'
                      : 'text-slate-655 hover:text-slate-950 hover:bg-slate-55/10'
                  }`}
                >
                  {day}
                  <span className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded-full ${
                    selectedDayBassin === day ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
                  }`}>
                    {count}
                  </span>
                </button>
              )
            })}
          </div>

          {/* 1. Screen view: only show currently selected day */}
          <div className="print:hidden">
            {renderPoolGrid(selectedDayBassin, planningsFiltres.filter(p => p.jourSemaine === selectedDayBassin), false)}
          </div>

          {/* 2. Print view: loop through all 7 days, each on its own page */}
          <div className="hidden print:block print:space-y-0">
            {JOURS_ORDRE.map((day) => {
              const dayPlannings = planningsFiltres.filter(p => p.jourSemaine === day)
              if (dayPlannings.length === 0) return null // Only print days that have planning slots
              return (
                <div key={day} className="page-break-container">
                  {renderPoolGrid(day, dayPlannings, true)}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* === MODAL DETAILS (Pop-up detailed view) === */}
      {selectedPlanningDetails && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-xl border border-slate-100 flex flex-col relative animate-fade-in-up">
            {/* Close Button */}
            <button
              onClick={() => setSelectedPlanningDetails(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-650 transition-colors font-bold cursor-pointer"
            >
              ✕
            </button>

            <div className="mb-4">
              <span className="bg-cyan-50 text-cyan-800 border border-cyan-200/40 text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md">
                Détails du cours
              </span>
              <h3 className="text-xl font-black text-slate-900 mt-2.5 leading-tight">
                {selectedPlanningDetails.groupe?.nom}
              </h3>
            </div>

            <div className="space-y-3.5 mb-6">
              <div className="flex items-center gap-3 text-slate-600 font-semibold text-sm">
                <span>📅 {selectedPlanningDetails.jourSemaine}</span>
              </div>

              <div className="flex items-center gap-3 text-slate-600 font-semibold text-sm">
                <span>⏰ {selectedPlanningDetails.heureDebut} - {selectedPlanningDetails.heureFin}</span>
              </div>

              <div className="flex items-center gap-3 text-slate-600 font-semibold text-sm">
                <span>🏊 {selectedPlanningDetails.lieu || 'Piscine Municipale'}</span>
              </div>

              {selectedPlanningDetails.coachs && selectedPlanningDetails.coachs.length > 0 && (
                <div className="flex items-start gap-3 text-slate-600 font-semibold text-sm border-t border-slate-100 pt-3">
                  <div>
                    <span className="block text-[10px] text-slate-400 font-black uppercase tracking-wider">Entraîneur(s) :</span>
                    <span className="block mt-0.5 text-slate-800 font-bold">
                      {selectedPlanningDetails.coachs.map(c => `${c.coach.prenom} ${c.coach.nom || ''}`).join(', ')}
                    </span>
                  </div>
                </div>
              )}
            </div>

            <a
              href="/inscription"
              className="w-full bg-slate-950 text-white font-bold text-center text-xs uppercase tracking-wider py-3.5 rounded-xl hover:bg-slate-900 transition-colors shadow-sm active:scale-[0.98]"
            >
              S&apos;inscrire à ce groupe
            </a>
          </div>
        </div>
      )}

      <style>{`
        @media print {
          @page {
            size: ${viewMode === 'grille' ? 'portrait' : 'landscape'};
            margin: 1cm !important;
          }
          body {
            background: white !important;
            color: black !important;
          }
          header, footer, nav, [role="navigation"], .print\\:hidden {
            display: none !important;
          }
          /* Force browser to print backgrounds and colors */
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          /* Scale pool grid height to fit on a single page */
          .relative.h-\\[720px\\] {
            height: 580px !important;
            min-height: 580px !important;
            display: flex !important;
            page-break-inside: avoid !important;
          }
          .overflow-x-auto {
            overflow: visible !important;
          }
          table {
            width: 100% !important;
            table-layout: auto !important;
          }
          .page-break-container {
            page-break-after: always !important;
            break-after: page !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          .page-break-container:last-child {
            page-break-after: avoid !important;
            break-after: avoid !important;
          }
        }
      `}</style>
    </div>
  )
}
