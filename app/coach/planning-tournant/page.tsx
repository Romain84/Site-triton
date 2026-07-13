'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import CoachNav from '@/components/coach/CoachNav'
import { getErrorMessage } from '@/lib/utils'
import { formatWeekdayLongDateFr } from '@/lib/date'
import { useConfirmDialog } from '@/components/ConfirmDialog'

interface Coach {
  id: string
  prenom: string
  nom: string | null
}

interface Evenement {
  id: string
  titre: string
  date: string
  heureDebut: string
  heureFin: string
  description: string | null
  lieu: string | null
  coachId: string | null
  coach: Coach | null
  groupe?: { id: string; nom: string } | null
  groupes?: Array<{ id: string; nom: string }> | null
}

export default function PlanningTournantPage() {
  const router = useRouter()
  const { confirm } = useConfirmDialog()
  const [evenements, setEvenements] = useState<Evenement[]>([])
  const [currentCoach, setCurrentCoach] = useState<Coach | null>(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [error, setError] = useState('')

  const fetchEvenements = useCallback(async () => {
    try {
      const response = await fetch('/api/coach/planning-tournant')

      if (response.status === 401) {
        router.push('/coach/login')
        return
      }

      const data = await response.json()
      setEvenements(data.evenements || [])
    } catch (err) {
      setError('Erreur lors du chargement des créneaux')
    } finally {
      setLoading(false)
    }
  }, [router])

  useEffect(() => {
    const initPage = async () => {
      try {
        const res = await fetch('/api/auth/coach/me')
        if (res.ok) {
          const data = await res.json()
          setCurrentCoach(data.coach)
        }
      } catch (err) {
        console.error('Erreur lors de la récupération du profil', err)
      } finally {
        await fetchEvenements()
      }
    }
    initPage()
  }, [fetchEvenements])

  const handleTake = async (id: string) => {
    setActionLoading(id)
    setError('')

    try {
      const response = await fetch(`/api/coach/planning-tournant/${id}/take`, {
        method: 'POST',
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Erreur lors de la prise du créneau')
      }

      await fetchEvenements()
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setActionLoading(null)
    }
  }

  const handleRelease = async (id: string) => {
    const confirmed = await confirm({
      title: 'Libérer le créneau',
      message: 'Voulez-vous vraiment libérer ce créneau ?',
      confirmText: 'Libérer',
      cancelText: 'Annuler',
      variant: 'danger',
    })
    if (!confirmed) return

    setActionLoading(id)
    setError('')

    try {
      const response = await fetch(`/api/coach/planning-tournant/${id}/release`, {
        method: 'POST',
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Erreur lors de la libération du créneau')
      }

      await fetchEvenements()
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setActionLoading(null)
    }
  }

  const calculateDuration = (debut: string, fin: string) => {
    const [hD, mD] = debut.split(':').map(Number)
    const [hF, mF] = fin.split(':').map(Number)
    const duration = (hF * 60 + mF - (hD * 60 + mD)) / 60
    return duration.toFixed(2)
  }

  if (loading) {
    return (
      <div className="min-h-screen py-8 bg-gray-50">
        <div className="container mx-auto px-4">
          <CoachNav />
          <div className="text-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-gray-600 font-medium">Chargement des créneaux...</p>
          </div>
        </div>
      </div>
    )
  }

  const evenementsPris = evenements.filter(e => e.coachId === currentCoach?.id)
  const evenementsDisponibles = evenements.filter(e => !e.coachId)

  return (
    <div className="min-h-screen py-8 bg-gray-50 animate-fade-in-up">
      <div className="container mx-auto px-4">
        <CoachNav />

        <div className="mb-8">
          <h1 className="text-4xl font-extrabold tracking-tight text-slate-900">Planning tournant</h1>
          <p className="text-slate-500 text-sm mt-1">Déclarez vos présences sur les créneaux tournants partagés.</p>
        </div>

        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6 rounded-2xl shadow-xs">
            <p className="text-red-700 font-medium">{error}</p>
          </div>
        )}

        {/* Créneaux disponibles */}
        <div className="mb-12">
          <div className="flex items-center gap-2 mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <h2 className="text-lg font-black uppercase tracking-wider text-slate-900">Créneaux disponibles</h2>
          </div>

          {evenementsDisponibles.length === 0 ? (
            <div className="card p-8 text-center text-slate-500 font-semibold bg-white/80">
              Aucun créneau disponible pour le moment
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {evenementsDisponibles.map((event) => (
                <div key={event.id} className="card p-6 bg-white hover:border-slate-350 hover:shadow-md hover:shadow-slate-100/50 hover:-translate-y-1 transition-all duration-300 relative overflow-hidden flex flex-col justify-between">
                  <div>
                    <div className="flex items-start justify-between mb-4 gap-4">
                      <h3 className="text-xl font-bold text-slate-950 leading-tight">{event.titre}</h3>
                      <span className="bg-emerald-50 text-emerald-800 border border-emerald-200/40 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md shrink-0">
                        Disponible
                      </span>
                               <div className="space-y-2.5 mb-4">
                      <p className="flex items-center gap-2 text-sm text-slate-655 font-semibold">
                        <svg className="w-4 h-4 text-slate-400 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <span>{formatWeekdayLongDateFr(event.date)}</span>
                      </p>
                      <p className="flex items-center gap-2 text-sm text-slate-655 font-semibold">
                        <svg className="w-4 h-4 text-slate-400 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span>
                          {event.heureDebut} - {event.heureFin} ({calculateDuration(event.heureDebut, event.heureFin)}h)
                        </span>
                      </p>
                      {event.lieu && (
                        <p className="flex items-center gap-2 text-sm text-slate-655 font-semibold">
                          <svg className="w-4 h-4 text-slate-400 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                          <span>{event.lieu}</span>
                        </p>
                      )}
                      {(event.groupes && event.groupes.length > 0) ? (
                        <p className="flex items-center gap-2 text-sm text-slate-655 font-semibold">
                          <svg className="w-4 h-4 text-slate-400 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                          </svg>
                          <span>Groupes : <strong>{event.groupes.map(g => g.nom).join(', ')}</strong></span>
                        </p>
                      ) : (event.groupe && (
                        <p className="flex items-center gap-2 text-sm text-slate-655 font-semibold">
                          <svg className="w-4 h-4 text-slate-400 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                          </svg>
                          <span>Groupe : <strong>{event.groupe.nom}</strong></span>
                        </p>
                      ))}
                    </div>           </div>

                    {event.description && (
                      <p className="text-slate-500 text-xs font-medium bg-slate-50/50 border border-slate-100 rounded-xl p-3.5 mb-5 select-none leading-relaxed">
                        {event.description}
                      </p>
                    )}
                  </div>

                  <button
                    onClick={() => handleTake(event.id)}
                    disabled={actionLoading !== null}
                    className="w-full bg-primary text-white font-bold text-xs uppercase tracking-wider py-3.5 rounded-xl hover:bg-primary-dark transition-all duration-200 disabled:opacity-50 active:scale-[0.98] shadow-sm flex items-center justify-center gap-2"
                  >
                    {actionLoading === event.id ? (
                      <span className="flex items-center gap-1.5">
                        <svg className="animate-spin h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth={4} />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        Prise en cours...
                      </span>
                    ) : 'Prendre ce créneau'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Mes créneaux */}
        <div>
          <div className="flex items-center gap-2 mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-primary" />
            <h2 className="text-lg font-black uppercase tracking-wider text-slate-900">Mes créneaux</h2>
          </div>

          {evenementsPris.length === 0 ? (
            <div className="card p-8 text-center text-slate-500 font-semibold bg-white/80">
              Vous n&apos;avez pas encore pris de créneaux
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {evenementsPris.map((event) => (
                <div key={event.id} className="card p-6 bg-white hover:border-slate-350 hover:shadow-md hover:shadow-slate-100/50 hover:-translate-y-1 transition-all duration-300 relative overflow-hidden flex flex-col justify-between border-l-4 border-l-primary">
                  <div>
                    <div className="flex items-start justify-between mb-4 gap-4">
                      <h3 className="text-xl font-bold text-slate-950 leading-tight">{event.titre}</h3>
                      <span className="bg-blue-50 text-blue-800 border border-blue-200/40 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md shrink-0">
                        Confirmé
                      </span>
                    </div>

                    <div className="space-y-2.5 mb-4">
                      <p className="flex items-center gap-2 text-sm text-slate-655 font-semibold">
                        <svg className="w-4 h-4 text-slate-400 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <span>{formatWeekdayLongDateFr(event.date)}</span>
                      </p>
                      <p className="flex items-center gap-2 text-sm text-slate-655 font-semibold">
                        <svg className="w-4 h-4 text-slate-400 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span>
                          {event.heureDebut} - {event.heureFin} ({calculateDuration(event.heureDebut, event.heureFin)}h)
                        </span>
                      </p>
                      {event.lieu && (
                        <p className="flex items-center gap-2 text-sm text-slate-655 font-semibold">
                          <svg className="w-4 h-4 text-slate-400 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                          <span>{event.lieu}</span>
                        </p>
                      )}
                      {(event.groupes && event.groupes.length > 0) ? (
                        <p className="flex items-center gap-2 text-sm text-slate-655 font-semibold">
                          <svg className="w-4 h-4 text-slate-400 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                          </svg>
                          <span>Groupes : <strong>{event.groupes.map(g => g.nom).join(', ')}</strong></span>
                        </p>
                      ) : (event.groupe && (
                        <p className="flex items-center gap-2 text-sm text-slate-655 font-semibold">
                          <svg className="w-4 h-4 text-slate-400 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                          </svg>
                          <span>Groupe : <strong>{event.groupe.nom}</strong></span>
                        </p>
                      ))}
                    </div>

                    {event.description && (
                      <p className="text-slate-500 text-xs font-medium bg-slate-50/50 border border-slate-100 rounded-xl p-3.5 mb-5 select-none leading-relaxed">
                        {event.description}
                      </p>
                    )}
                  </div>

                  <button
                    onClick={() => handleRelease(event.id)}
                    disabled={actionLoading !== null}
                    className="w-full bg-red-50 hover:bg-red-100 border border-red-100 text-red-600 font-bold text-xs uppercase tracking-wider py-3.5 rounded-xl transition-all duration-200 disabled:opacity-50 active:scale-[0.98] flex items-center justify-center gap-2"
                  >
                    {actionLoading === event.id ? (
                      <span className="flex items-center gap-1.5">
                        <svg className="animate-spin h-3.5 w-3.5 text-red-650" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth={4} />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        Libération en cours...
                      </span>
                    ) : 'Libérer ce créneau'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
