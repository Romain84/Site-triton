'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { Clock, MapPin, User, CheckCircle2, AlertCircle, ChevronRight, Calendar, Waves, Sparkles } from 'lucide-react'

export interface AgendaSession {
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
  sessions: AgendaSession[]
  currentCoachId?: string
}

export default function CoachAgendaBassin({ sessions }: CoachAgendaBassinProps) {
  const [filterMySessionsOnly, setFilterMySessionsOnly] = useState(true)

  // 1. Group sessions by date string (YYYY-MM-DD)
  const daysMap = useMemo(() => {
    const map = new Map<string, { date: Date; sessions: AgendaSession[] }>()

    // Init with next 7 days
    const now = new Date()
    for (let i = 0; i < 7; i++) {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i)
      const dateKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
      map.set(dateKey, { date: d, sessions: [] })
    }

    sessions.forEach(s => {
      const d = typeof s.date === 'string' ? new Date(s.date) : s.date
      const dateKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
      if (map.has(dateKey)) {
        map.get(dateKey)!.sessions.push(s)
      } else {
        map.set(dateKey, { date: d, sessions: [s] })
      }
    })

    return map
  }, [sessions])

  const dateKeys = Array.from(daysMap.keys()).sort()
  const [selectedDateKey, setSelectedDateKey] = useState<string>(dateKeys[0] || '')

  const currentDayData = daysMap.get(selectedDateKey) || { date: new Date(), sessions: [] }

  const filteredSessions = useMemo(() => {
    const list = currentDayData.sessions || []
    if (filterMySessionsOnly) {
      return list.filter(s => s.isMySession || (!s.coachName && s.type === 'tournant'))
    }
    return list
  }, [currentDayData.sessions, filterMySessionsOnly])

  const totalMySessionsThisWeek = useMemo(() => {
    return sessions.filter(s => s.isMySession).length
  }, [sessions])

  const availableTournantsCount = useMemo(() => {
    return sessions.filter(s => s.type === 'tournant' && !s.coachName).length
  }, [sessions])

  const formatDayButton = (d: Date, idx: number) => {
    const dayNames = ['Dim.', 'Lun.', 'Mar.', 'Mer.', 'Jeu.', 'Ven.', 'Sam.']
    const dayName = idx === 0 ? "Aujourd'hui" : idx === 1 ? 'Demain' : `${dayNames[d.getDay()]} ${d.getDate()}`
    return dayName
  }

  return (
    <div className="space-y-4">
      {/* FILTER CONTROLS & STATS BAR */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 p-2.5 rounded-2xl border border-slate-200/60">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setFilterMySessionsOnly(true)}
            className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all ${
              filterMySessionsOnly
                ? 'bg-slate-950 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-950'
            }`}
          >
            Mes entraînements ({totalMySessionsThisWeek})
          </button>
          <button
            onClick={() => setFilterMySessionsOnly(false)}
            className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all ${
              !filterMySessionsOnly
                ? 'bg-slate-950 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-950'
            }`}
          >
            Tout le bassin ({sessions.length})
          </button>
        </div>

        {availableTournantsCount > 0 && (
          <Link
            href="/coach/planning-tournant"
            className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-100/80 hover:bg-emerald-200/80 text-emerald-800 rounded-lg text-[11px] font-bold transition-colors"
          >
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>{availableTournantsCount} créneau{availableTournantsCount > 1 ? 'x' : ''} à pourvoir</span>
          </Link>
        )}
      </div>

      {/* 7-DAY SELECTOR (TOUCH HORIZONTAL SCROLL) */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
        {dateKeys.map((key, idx) => {
          const day = daysMap.get(key)!
          const isSelected = key === selectedDateKey
          const hasMySessions = day.sessions.some(s => s.isMySession)
          const hasAvailable = day.sessions.some(s => s.type === 'tournant' && !s.coachName)

          return (
            <button
              key={key}
              onClick={() => setSelectedDateKey(key)}
              className={`flex-1 min-w-[95px] p-2.5 rounded-2xl text-center border transition-all duration-200 active:scale-95 ${
                isSelected
                  ? 'bg-cyan-50 border-cyan-300 text-slate-950 shadow-xs'
                  : 'bg-white border-slate-200/80 text-slate-600 hover:border-slate-300'
              }`}
            >
              <p className="text-[11px] font-extrabold truncate">
                {formatDayButton(day.date, idx)}
              </p>
              <div className="flex items-center justify-center gap-1 mt-1.5">
                {hasMySessions && (
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-600" title="Séance prévue" />
                )}
                {hasAvailable && (
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" title="Créneau libre" />
                )}
                {!hasMySessions && !hasAvailable && (
                  <span className="text-[10px] text-slate-300 font-bold">—</span>
                )}
              </div>
            </button>
          )
        })}
      </div>

      {/* SESSIONS LIST FOR THE SELECTED DAY */}
      <div className="space-y-2.5 pt-1">
        {filteredSessions.length === 0 ? (
          <div className="bg-white border border-slate-200/80 rounded-2xl p-8 text-center space-y-2">
            <div className="w-10 h-10 rounded-full bg-slate-50 text-slate-400 mx-auto flex items-center justify-center">
              <Waves className="w-5 h-5" />
            </div>
            <p className="text-sm font-bold text-slate-700">Aucun entraînement pour ce jour</p>
            <p className="text-xs text-slate-400 max-w-xs mx-auto">
              {filterMySessionsOnly
                ? "Vous n'avez pas de séance programmée à cette date."
                : "Aucune séance n'est prévue dans le bassin pour ce jour."}
            </p>
          </div>
        ) : (
          filteredSessions.map((session) => {
            const isTournantLibre = session.type === 'tournant' && !session.coachName

            return (
              <div
                key={session.id}
                className={`p-4 rounded-2xl border transition-all ${
                  isTournantLibre
                    ? 'bg-emerald-50/50 border-emerald-200'
                    : session.isMySession
                    ? 'bg-white border-cyan-200/80 shadow-xs'
                    : 'bg-white/70 border-slate-200/70 opacity-80'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                  {/* LEFT: TIME & GROUP */}
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-black bg-slate-900 text-white tracking-wide">
                        <Clock className="w-3 h-3 text-cyan-400 shrink-0" />
                        <span>{session.heureDebut} - {session.heureFin}</span>
                      </span>

                      <span className="px-2 py-0.5 rounded-md text-xs font-extrabold bg-slate-100 text-slate-800 border border-slate-200">
                        {session.groupe || session.titre}
                      </span>

                      {session.type === 'tournant' && (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-purple-50 text-purple-700 border border-purple-200">
                          Tournant
                        </span>
                      )}

                      {session.isMySession && (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-cyan-100 text-cyan-800">
                          Ma séance
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-3 text-xs text-slate-500 font-medium pt-0.5">
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>{session.lieu || 'Piscine Alphonse Roudière'}</span>
                      </span>

                      {session.coachName && !session.isMySession && (
                        <span className="flex items-center gap-1 text-slate-600 font-semibold">
                          <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>{session.coachName}</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* RIGHT: ACTIONS */}
                  <div>
                    {isTournantLibre ? (
                      <Link
                        href="/coach/planning-tournant"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-xs"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Prendre le créneau</span>
                      </Link>
                    ) : session.isMySession ? (
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-cyan-700 bg-cyan-50 px-2.5 py-1 rounded-lg">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Confirmé</span>
                      </span>
                    ) : null}
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
