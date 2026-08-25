'use client'

import { useCallback, useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import CoachNav from '@/components/coach/CoachNav'
import { getErrorMessage } from '@/lib/utils'
import { useConfirmDialog } from '@/components/ConfirmDialog'
import toast from 'react-hot-toast'
import {
  Repeat,
  Clock,
  MapPin,
  Calendar,
  User,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  ArrowRight,
  Plus,
  Loader2
} from 'lucide-react'

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
  const [filterMode, setFilterMode] = useState<'available' | 'mine' | 'all'>('available')

  const fetchEvenements = useCallback(async () => {
    try {
      const response = await fetch('/api/coach/planning-tournant')
      if (response.status === 401) {
        router.push('/coach/login')
        return
      }
      const data = await response.json()
      setEvenements(data.evenements || [])
    } catch {
      toast.error('Erreur lors du chargement des créneaux')
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
        console.error('Erreur profil', err)
      } finally {
        await fetchEvenements()
      }
    }
    initPage()
  }, [fetchEvenements])

  const handleTake = async (id: string) => {
    setActionLoading(id)
    try {
      const response = await fetch(`/api/coach/planning-tournant/${id}/take`, {
        method: 'POST',
      })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Erreur lors de la prise du créneau')
      }
      toast.success('Créneau réservé avec succès !')
      await fetchEvenements()
    } catch (err) {
      toast.error(getErrorMessage(err))
    } finally {
      setActionLoading(null)
    }
  }

  const handleRelease = async (id: string) => {
    const confirmed = await confirm({
      title: 'Libérer ce créneau ?',
      message: 'Ce créneau sera immédiatement remis à disposition des autres entraîneurs du club.',
      confirmText: 'Oui, libérer',
      variant: 'danger',
    })

    if (!confirmed) return

    setActionLoading(id)
    try {
      const response = await fetch(`/api/coach/planning-tournant/${id}/release`, {
        method: 'POST',
      })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Erreur lors de la libération du créneau')
      }
      toast.success('Créneau libéré avec succès')
      await fetchEvenements()
    } catch (err) {
      toast.error(getErrorMessage(err))
    } finally {
      setActionLoading(null)
    }
  }

  const availableCount = useMemo(() => {
    return evenements.filter((e) => !e.coachId).length
  }, [evenements])

  const mineCount = useMemo(() => {
    return currentCoach ? evenements.filter((e) => e.coachId === currentCoach.id).length : 0
  }, [evenements, currentCoach])

  const filteredEvenements = useMemo(() => {
    if (filterMode === 'available') {
      return evenements.filter((e) => !e.coachId)
    }
    if (filterMode === 'mine' && currentCoach) {
      return evenements.filter((e) => e.coachId === currentCoach.id)
    }
    return evenements
  }, [evenements, filterMode, currentCoach])

  const formatDateFr = (dateStr: string) => {
    const d = new Date(dateStr)
    const jours = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi']
    const mois = ['Janv.', 'Févr.', 'Mars', 'Avr.', 'Mai', 'Juin', 'Juil.', 'Août', 'Sept.', 'Oct.', 'Nov.', 'Déc.']
    return `${jours[d.getDay()]} ${d.getDate()} ${mois[d.getMonth()]} ${d.getFullYear()}`
  }

  return (
    <div className="min-h-screen pt-2 pb-24 sm:pb-12 bg-slate-50/50 text-slate-900">
      <div className="container mx-auto px-4 max-w-5xl space-y-6">
        <CoachNav />

        {/* HEADER & QUICK LINK TO REMPLACEMENTS */}
        <header className="bg-white border border-slate-200/80 rounded-3xl p-5 sm:p-7 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-purple-50 text-purple-800 text-[11px] font-extrabold uppercase tracking-wider mb-1.5">
                <Repeat className="w-3 h-3 text-purple-600" />
                <span>Gestion des créneaux tournants</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-slate-950 tracking-tight">
                Planning Tournant
              </h1>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Consultez et prenez en charge les créneaux tournants de la saison en 1 clic.
              </p>
            </div>

            <Link
              href="/coach/remplacements"
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition-colors"
            >
              <span>Besoin d&apos;un remplaçant ?</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* FILTER TABS PILLS */}
          <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-100">
            <button
              onClick={() => setFilterMode('available')}
              className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 ${
                filterMode === 'available'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-slate-50 text-slate-700 hover:bg-slate-100'
              }`}
            >
              <span>À pourvoir</span>
              <span className={`px-1.5 py-0.2 text-[10px] rounded-full font-bold ${
                filterMode === 'available' ? 'bg-emerald-800 text-white' : 'bg-emerald-100 text-emerald-800'
              }`}>
                {availableCount}
              </span>
            </button>

            <button
              onClick={() => setFilterMode('mine')}
              className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 ${
                filterMode === 'mine'
                  ? 'bg-slate-950 text-white shadow-xs'
                  : 'bg-slate-50 text-slate-700 hover:bg-slate-100'
              }`}
            >
              <span>Mes créneaux pris</span>
              <span className={`px-1.5 py-0.2 text-[10px] rounded-full font-bold ${
                filterMode === 'mine' ? 'bg-slate-800 text-cyan-400' : 'bg-slate-200 text-slate-700'
              }`}>
                {mineCount}
              </span>
            </button>

            <button
              onClick={() => setFilterMode('all')}
              className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 ${
                filterMode === 'all'
                  ? 'bg-slate-950 text-white shadow-xs'
                  : 'bg-slate-50 text-slate-700 hover:bg-slate-100'
              }`}
            >
              <span>Tous ({evenements.length})</span>
            </button>
          </div>
        </header>

        {/* LIST OF SHIFTS */}
        <section className="space-y-3">
          {loading ? (
            <div className="bg-white border border-slate-200/80 rounded-3xl p-12 text-center space-y-2">
              <Loader2 className="w-6 h-6 animate-spin mx-auto text-cyan-600" />
              <p className="text-xs text-slate-500 font-bold">Chargement des créneaux...</p>
            </div>
          ) : filteredEvenements.length === 0 ? (
            <div className="bg-white border border-slate-200/80 rounded-3xl p-12 text-center space-y-2">
              <div className="w-12 h-12 rounded-full bg-slate-50 text-slate-400 mx-auto flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <p className="text-sm font-bold text-slate-700">Aucun créneau dans cette sélection</p>
              <p className="text-xs text-slate-400">
                {filterMode === 'available'
                  ? 'Tous les créneaux tournants sont actuellement attribués à un entraîneur.'
                  : 'Vous n\'avez aucun créneau tournant réservé.'}
              </p>
            </div>
          ) : (
            filteredEvenements.map((evt) => {
              const isMine = currentCoach && evt.coachId === currentCoach.id
              const isAvailable = !evt.coachId
              const isActionLoading = actionLoading === evt.id

              const groupNames = (evt.groupes && evt.groupes.length > 0)
                ? evt.groupes.map(g => g.nom).join(', ')
                : (evt.groupe?.nom || evt.titre)

              return (
                <div
                  key={evt.id}
                  className={`p-4 sm:p-5 rounded-2xl border transition-all ${
                    isAvailable
                      ? 'bg-emerald-50/40 border-emerald-200 hover:border-emerald-300'
                      : isMine
                      ? 'bg-white border-cyan-300 shadow-xs'
                      : 'bg-white border-slate-200/80'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    {/* LEFT DETAILS */}
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="px-2.5 py-0.5 rounded-lg text-xs font-black bg-slate-900 text-white tracking-wide">
                          {evt.heureDebut} - {evt.heureFin}
                        </span>

                        <span className="text-xs font-extrabold text-slate-900">
                          {formatDateFr(evt.date)}
                        </span>

                        {isAvailable ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-600 text-white animate-pulse">
                            Libre
                          </span>
                        ) : isMine ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-cyan-100 text-cyan-800">
                            Assigné à vous
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600">
                            Coach : {evt.coach?.prenom} {evt.coach?.nom || ''}
                          </span>
                        )}
                      </div>

                      <p className="text-xs sm:text-sm font-bold text-slate-800">
                        {groupNames}
                      </p>

                      <div className="flex items-center gap-3 text-xs text-slate-500 font-medium">
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-slate-400" />
                          <span>{evt.lieu || 'Piscine Alphonse Roudière'}</span>
                        </span>
                      </div>
                    </div>

                    {/* RIGHT ACTION BUTTON */}
                    <div className="shrink-0 pt-1 sm:pt-0">
                      {isAvailable ? (
                        <button
                          onClick={() => handleTake(evt.id)}
                          disabled={isActionLoading}
                          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black transition-all shadow-xs disabled:opacity-50"
                        >
                          {isActionLoading ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Sparkles className="w-4 h-4" />
                          )}
                          <span>Prendre ce créneau</span>
                        </button>
                      ) : isMine ? (
                        <button
                          onClick={() => handleRelease(evt.id)}
                          disabled={isActionLoading}
                          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-red-50 hover:bg-red-100 border border-red-200 text-red-700 text-xs font-bold transition-all disabled:opacity-50"
                        >
                          {isActionLoading ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : null}
                          <span>Libérer</span>
                        </button>
                      ) : null}
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </section>
      </div>
    </div>
  )
}
