'use client'

import { useState, useMemo, useCallback } from 'react'
import Link from 'next/link'
import {
  Clock,
  MapPin,
  User,
  CheckCircle2,
  AlertCircle,
  ChevronRight,
  Calendar,
  Waves,
  Sparkles,
  UserCheck,
  Palmtree,
  Ban,
  Hourglass,
  CalendarDays,
  Loader2,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { useConfirmDialog } from '@/components/ConfirmDialog'
import ModalDeclarerAbsence from '@/components/coach/ModalDeclarerAbsence'
import {
  AgendaJourDTO,
  AgendaSessionDTO,
  CoachOptionDTO,
} from '@/lib/services/coach-agenda-service'

// Rétrocompatibilité pour les éventuels imports externes
export type AgendaSession = AgendaSessionDTO

interface CoachAgendaBassinProps {
  initialJours?: AgendaJourDTO[]
  initialCoaches?: CoachOptionDTO[]
  sessions?: AgendaSessionDTO[] // rétrocompatibilité
  currentCoachId?: string
}

export default function CoachAgendaBassin({
  initialJours = [],
  initialCoaches = [],
  sessions: legacySessions,
  currentCoachId,
}: CoachAgendaBassinProps) {
  const { confirm } = useConfirmDialog()

  const [jours, setJours] = useState<AgendaJourDTO[]>(initialJours)
  const [coaches, setCoaches] = useState<CoachOptionDTO[]>(initialCoaches)
  const [loadingRefresh, setLoadingRefresh] = useState(false)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  // Filtre mes séances vs tout le bassin
  const [filterMySessionsOnly, setFilterMySessionsOnly] = useState(true)

  // Modale absence
  const [modalSession, setModalSession] = useState<AgendaSessionDTO | null>(null)

  // Recharger dynamiquement l'agenda depuis l'API
  const refreshAgenda = useCallback(async () => {
    try {
      setLoadingRefresh(true)
      const res = await fetch('/api/coach/agenda?jours=14')
      if (res.ok) {
        const data = await res.json()
        if (data.jours) setJours(data.jours)
        if (data.coaches) setCoaches(data.coaches)
      }
    } catch {
      // Ignorer l'erreur réseau silencieuse sur rafraîchissement
    } finally {
      setLoadingRefresh(false)
    }
  }, [])

  // Date sélectionnée par défaut : aujourd'hui ou premier jour disponible
  const [selectedDateKey, setSelectedDateKey] = useState<string>(() => {
    if (initialJours.length > 0) {
      const today = initialJours.find((j) => j.estAujourdhui)
      return today ? today.date : initialJours[0].date
    }
    return ''
  })

  // Jour courant sélectionné
  const currentJour = useMemo(() => {
    return jours.find((j) => j.date === selectedDateKey) || jours[0] || null
  }, [jours, selectedDateKey])

  // Filtrage des séances du jour
  const filteredSessions = useMemo(() => {
    if (!currentJour) return []
    const list = currentJour.sessions || []
    if (filterMySessionsOnly) {
      return list.filter(
        (s) => s.isMySession || s.isTournantLibre || !!s.remplacementDisponible
      )
    }
    return list
  }, [currentJour, filterMySessionsOnly])

  // Compteurs globaux pour les badges
  const totalMySessions = useMemo(() => {
    return jours.reduce(
      (sum, j) => sum + j.sessions.filter((s) => s.isMySession && !s.estAnnule).length,
      0
    )
  }, [jours])

  const totalRemplacementsDispos = useMemo(() => {
    return jours.reduce(
      (sum, j) =>
        sum +
        j.sessions.filter((s) => !!s.remplacementDisponible || s.isTournantLibre).length,
      0
    )
  }, [jours])

  // Actions
  const handleAccepterRemplacement = async (remplacementId: string) => {
    const ok = await confirm({
      title: 'Accepter ce remplacement ?',
      message: 'Ce créneau sera immédiatement ajouté à votre agenda et à votre facturation du mois.',
      confirmText: 'Confirmer le remplacement',
    })
    if (!ok) return

    setActionLoading(remplacementId)
    try {
      const res = await fetch(`/api/coach/remplacements/${remplacementId}/accepter`, {
        method: 'POST',
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erreur lors de l\'acceptation')
      toast.success('Remplacement accepté !')
      await refreshAgenda()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erreur'
      toast.error(msg)
    } finally {
      setActionLoading(null)
    }
  }

  const handleAnnulerAbsence = async (remplacementId: string) => {
    const ok = await confirm({
      title: 'Annuler votre absence ?',
      message: 'Votre cours régulier sera rétabli dans votre agenda et la déduction retirée de votre facture.',
      confirmText: 'Rétablir mon cours',
      variant: 'danger',
    })
    if (!ok) return

    setActionLoading(remplacementId)
    try {
      const res = await fetch(`/api/coach/remplacements/${remplacementId}`, {
        method: 'DELETE',
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erreur lors de l\'annulation')
      toast.success(data.message || 'Votre absence a été annulée')
      await refreshAgenda()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erreur'
      toast.error(msg)
    } finally {
      setActionLoading(null)
    }
  }

  const handlePrendreTournant = async (tournantId: string) => {
    setActionLoading(tournantId)
    try {
      const res = await fetch(`/api/coach/planning-tournant/${tournantId}/take`, {
        method: 'POST',
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erreur lors de la réservation')
      toast.success('Créneau tournant réservé !')
      await refreshAgenda()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erreur'
      toast.error(msg)
    } finally {
      setActionLoading(null)
    }
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
            Mes entraînements ({totalMySessions})
          </button>
          <button
            onClick={() => setFilterMySessionsOnly(false)}
            className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all ${
              !filterMySessionsOnly
                ? 'bg-slate-950 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-950'
            }`}
          >
            Tout le bassin
          </button>
        </div>

        <div className="flex items-center gap-2">
          {totalRemplacementsDispos > 0 && (
            <Link
              href="/coach/planning-tournant"
              className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-100/80 hover:bg-emerald-200/80 text-emerald-800 rounded-lg text-[11px] font-bold transition-colors"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>
                {totalRemplacementsDispos} créneau{totalRemplacementsDispos > 1 ? 'x' : ''} à pourvoir
              </span>
            </Link>
          )}

          {loadingRefresh && (
            <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
          )}
        </div>
      </div>

      {/* 14-DAY SELECTOR (TOUCH HORIZONTAL SCROLL) */}
      <div className="flex gap-2 overflow-x-auto pb-1.5 scrollbar-none">
        {jours.map((jour) => {
          const isSelected = jour.date === (currentJour?.date || selectedDateKey)
          const hasMySession = jour.sessions.some((s) => s.isMySession && !s.estAnnule && !s.absence)
          const hasMyAbsence = jour.sessions.some((s) => !!s.absence)
          const hasDispo = jour.sessions.some((s) => !!s.remplacementDisponible || s.isTournantLibre)
          const hasAnnule = jour.sessions.some((s) => s.estAnnule)

          return (
            <button
              key={jour.date}
              onClick={() => setSelectedDateKey(jour.date)}
              className={`flex-1 min-w-[95px] p-2.5 rounded-2xl text-center border transition-all duration-200 active:scale-95 ${
                isSelected
                  ? 'bg-cyan-50 border-cyan-400 text-slate-950 shadow-xs ring-1 ring-cyan-300'
                  : 'bg-white border-slate-200/80 text-slate-600 hover:border-slate-300'
              }`}
            >
              <p className="text-[11px] font-extrabold truncate">
                {jour.dateLabel}
              </p>

              <div className="flex items-center justify-center gap-1 mt-1.5 min-h-[10px]">
                {jour.estEnVacances ? (
                  <span title={`Vacances scolaires (${jour.nomVacances || ''})`}>
                    <Palmtree className="w-3 h-3 text-amber-500" />
                  </span>
                ) : (
                  <>
                    {hasMySession && (
                      <span className="w-1.5 h-1.5 rounded-full bg-cyan-600" title="Séance confirmée" />
                    )}
                    {hasMyAbsence && (
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500" title="Absence déclarée" />
                    )}
                    {hasDispo && (
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" title="Créneau / Remplacement libre" />
                    )}
                    {hasAnnule && (
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-500" title="Séance annulée par le club" />
                    )}
                    {!hasMySession && !hasMyAbsence && !hasDispo && !hasAnnule && (
                      <span className="text-[10px] text-slate-300 font-bold">—</span>
                    )}
                  </>
                )}
              </div>
            </button>
          )
        })}
      </div>

      {/* SESSIONS LIST FOR THE SELECTED DAY */}
      <div className="space-y-3 pt-1">
        {/* EN-TÊTE JOURNÉE VACANCES SCOLAIRES */}
        {currentJour?.estEnVacances && (
          <div className="bg-amber-50/80 border border-amber-200/80 rounded-2xl p-4 flex items-center gap-3 text-amber-900">
            <Palmtree className="w-5 h-5 text-amber-600 shrink-0" />
            <div className="text-xs">
              <p className="font-extrabold">
                Vacances scolaires {currentJour.nomVacances ? `(${currentJour.nomVacances})` : ''}
              </p>
              <p className="text-amber-700 font-medium mt-0.5">
                Les entraînements réguliers n&apos;ont pas lieu pendant cette période.
              </p>
            </div>
          </div>
        )}

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
            const isLoadingThisAction = actionLoading === session.id || actionLoading === session.absence?.id || actionLoading === session.remplacementDisponible?.id

            return (
              <div
                key={session.id}
                className={`p-4 sm:p-5 rounded-2xl border transition-all ${
                  session.estAnnule
                    ? 'bg-rose-50/40 border-rose-200'
                    : session.absence
                    ? 'bg-amber-50/40 border-amber-200'
                    : session.remplacementDisponible || session.isTournantLibre
                    ? 'bg-emerald-50/40 border-emerald-200 shadow-xs'
                    : session.estRemplacementEffectue
                    ? 'bg-purple-50/30 border-purple-200'
                    : session.isMySession
                    ? 'bg-white border-cyan-200 shadow-xs'
                    : 'bg-white/70 border-slate-200/70 opacity-80'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  {/* LEFT: TIME, GROUP, SPACES & STATUS */}
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-black bg-slate-900 text-white tracking-wide">
                        <Clock className="w-3 h-3 text-cyan-400 shrink-0" />
                        <span>{session.heureDebut} – {session.heureFin}</span>
                      </span>

                      <span
                        className="px-2.5 py-0.5 rounded-md text-xs font-extrabold"
                        style={{
                          backgroundColor: session.groupeCouleur ? `${session.groupeCouleur}20` : '#f1f5f9',
                          color: session.groupeCouleur || '#0f172a',
                        }}
                      >
                        {session.groupe}
                      </span>

                      {/* BADGES STATUT */}
                      {session.estAnnule && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-rose-100 text-rose-800">
                          <Ban className="w-3 h-3 text-rose-600" />
                          <span>Annulée club {session.motifAnnulation ? `(${session.motifAnnulation})` : ''}</span>
                        </span>
                      )}

                      {session.absence && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-amber-100 text-amber-900 border border-amber-300">
                          {session.absence.statut === 'accepte' ? (
                            <>
                              <UserCheck className="w-3 h-3 text-emerald-600" />
                              <span>Remplacé(e) par {session.absence.coachRemplacantNom || 'un coach'}</span>
                            </>
                          ) : session.absence.statut === 'sans_remplacant' ? (
                            <>
                              <AlertCircle className="w-3 h-3 text-slate-500" />
                              <span>Absent(e) sans remplaçant</span>
                            </>
                          ) : (
                            <>
                              <Hourglass className="w-3 h-3 text-amber-600" />
                              <span>Absence déclarée · Remplacement recherché</span>
                            </>
                          )}
                        </span>
                      )}

                      {session.estRemplacementEffectue && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-purple-100 text-purple-800 border border-purple-200">
                          <UserCheck className="w-3 h-3 text-purple-600" />
                          <span>Remplacement pour {session.coachRemplaceNom}</span>
                        </span>
                      )}

                      {session.remplacementDisponible && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-900 border border-emerald-300 animate-pulse">
                          <Sparkles className="w-3 h-3 text-emerald-600" />
                          <span>Remplacement à pourvoir ({session.remplacementDisponible.coachRemplaceNom})</span>
                        </span>
                      )}

                      {session.isTournantLibre && (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-purple-100 text-purple-800 border border-purple-200">
                          Créneau tournant libre
                        </span>
                      )}

                      {session.isMySession && !session.estAnnule && !session.absence && !session.estRemplacementEffectue && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-cyan-100 text-cyan-800">
                          <CheckCircle2 className="w-3 h-3 text-cyan-600" />
                          <span>Confirmé</span>
                        </span>
                      )}
                    </div>

                    {/* LIEU & COACHS */}
                    <div className="flex items-center gap-4 text-xs text-slate-500 font-medium flex-wrap pt-0.5">
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>{session.lieu || 'Piscine Alphonse Roudière'}</span>
                      </span>

                      {session.coachNames && !session.isMySession && (
                        <span className="flex items-center gap-1 text-slate-600 font-semibold">
                          <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>{session.coachNames}</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* RIGHT: ACTIONS */}
                  <div className="flex items-center gap-2 self-start sm:self-center shrink-0">
                    {/* ACTION 1: DÉCLARER ABSENCE (1 CLIC) */}
                    {session.isMySession && !session.estAnnule && !session.absence && !session.estRemplacementEffectue && (
                      <button
                        onClick={() => setModalSession(session)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-rose-600 text-white text-xs font-bold transition-all shadow-xs"
                      >
                        <span>✋ Je suis absent</span>
                      </button>
                    )}

                    {/* ACTION 2: ANNULER MON ABSENCE */}
                    {session.isMySession && session.absence && (
                      <button
                        onClick={() => handleAnnulerAbsence(session.absence!.id)}
                        disabled={isLoadingThisAction}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 text-xs font-bold transition-all"
                      >
                        {isLoadingThisAction ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <span>Annuler mon absence</span>
                        )}
                      </button>
                    )}

                    {/* ACTION 3: PRENDRE UN REMPLACEMENT À POURVOIR */}
                    {session.remplacementDisponible && (
                      <button
                        onClick={() => handleAccepterRemplacement(session.remplacementDisponible!.id)}
                        disabled={isLoadingThisAction}
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black shadow-xs transition-all"
                      >
                        {isLoadingThisAction ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <>
                            <UserCheck className="w-3.5 h-3.5" />
                            <span>Prendre le remplacement</span>
                          </>
                        )}
                      </button>
                    )}

                    {/* ACTION 4: PRENDRE UN CRÉNEAU TOURNANT */}
                    {session.isTournantLibre && (
                      <button
                        onClick={() => handlePrendreTournant(session.id)}
                        disabled={isLoadingThisAction}
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-black shadow-xs transition-all"
                      >
                        {isLoadingThisAction ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <>
                            <Sparkles className="w-3.5 h-3.5" />
                            <span>Prendre le créneau</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* MODALE DÉCLARATION D'ABSENCE 1-CLIC */}
      <ModalDeclarerAbsence
        isOpen={!!modalSession}
        onClose={() => setModalSession(null)}
        onSuccess={refreshAgenda}
        session={modalSession}
        coaches={coaches}
      />
    </div>
  )
}
