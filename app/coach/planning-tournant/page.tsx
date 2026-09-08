'use client'

import { useCallback, useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import CoachNav from '@/components/coach/CoachNav'
import { getErrorMessage } from '@/lib/utils'
import { useConfirmDialog } from '@/components/ConfirmDialog'
import toast from 'react-hot-toast'
import {
  Repeat,
  MapPin,
  CheckCircle2,
  Sparkles,
  Plus,
  Loader2,
  Send,
  UserCheck
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

interface Remplacement {
  id: string
  coachRemplaceId: string
  coachRemplacantId: string | null
  coachRemplace?: { id: string; prenom: string; nom: string | null }
  coachRemplacant?: { id: string; prenom: string; nom: string | null }
  date: string
  heureDebut: string
  heureFin: string
  motif: string | null
  description: string | null
  statut: 'en_attente' | 'accepte' | 'annule'
}

export default function PlanningTournantPage() {
  const router = useRouter()
  const { confirm } = useConfirmDialog()

  // Coach session
  const [currentCoach, setCurrentCoach] = useState<Coach | null>(null)

  // Créneaux tournants state
  const [evenements, setEvenements] = useState<Evenement[]>([])
  const [loadingTournants, setLoadingTournants] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [filterMode, setFilterMode] = useState<'available' | 'mine' | 'all'>('available')

  // Remplacements state
  const [demandesOuvertes, setDemandesOuvertes] = useState<Remplacement[]>([])
  const [mesAbsences, setMesAbsences] = useState<Remplacement[]>([])
  const [coaches, setCoaches] = useState<Coach[]>([])
  const [loadingRemplacements, setLoadingRemplacements] = useState(true)
  const [remplacementTab, setRemplacementTab] = useState<'ouvertes' | 'mes_absences' | 'declarer'>('ouvertes')
  const [submittingAbsence, setSubmittingAbsence] = useState(false)

  // Form state pour déclaration d'absence
  const [absenceDate, setAbsenceDate] = useState('')
  const [absenceHeureDebut, setAbsenceHeureDebut] = useState('18:00')
  const [absenceHeureFin, setAbsenceHeureFin] = useState('19:30')
  const [absenceMotif, setAbsenceMotif] = useState('')
  const [absenceCoachRemplacantId, setAbsenceCoachRemplacantId] = useState('')

  const fetchEvenements = useCallback(async () => {
    try {
      setLoadingTournants(true)
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
      setLoadingTournants(false)
    }
  }, [router])

  const fetchRemplacements = useCallback(async () => {
    try {
      setLoadingRemplacements(true)
      const [resRemplacements, resCoaches] = await Promise.all([
        fetch('/api/coach/remplacements'),
        fetch('/api/coach/coaches'),
      ])

      if (resRemplacements.ok) {
        const data = await resRemplacements.json()
        setDemandesOuvertes(data.demandesOuvertes || [])
        setMesAbsences(data.mesAbsences || [])
      }

      if (resCoaches.ok) {
        const data = await resCoaches.json()
        setCoaches(data.coaches || [])
      }
    } catch {
      toast.error('Erreur lors du chargement des remplacements')
    } finally {
      setLoadingRemplacements(false)
    }
  }, [])

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
        await Promise.all([fetchEvenements(), fetchRemplacements()])
      }
    }
    initPage()
  }, [fetchEvenements, fetchRemplacements])

  // Actions Créneaux Tournants
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

  // Actions Remplacements
  const handleAccepterRemplacement = async (id: string) => {
    setActionLoading(`rempl-${id}`)
    try {
      const res = await fetch(`/api/coach/remplacements/${id}/accepter`, {
        method: 'POST',
      })
      const data = await res.json()
      if (res.ok) {
        toast.success('Remplacement accepté avec succès !')
        await fetchRemplacements()
      } else {
        toast.error(data.error || 'Erreur lors de l\'acceptation')
      }
    } catch {
      toast.error('Erreur réseau')
    } finally {
      setActionLoading(null)
    }
  }

  const handleSubmitAbsence = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!absenceDate || !absenceHeureDebut || !absenceHeureFin) {
      toast.error('Veuillez renseigner la date et les horaires')
      return
    }

    try {
      setSubmittingAbsence(true)
      const res = await fetch('/api/coach/remplacements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: absenceDate,
          heureDebut: absenceHeureDebut,
          heureFin: absenceHeureFin,
          motif: absenceMotif.trim() || undefined,
          coachRemplacantId: absenceCoachRemplacantId || undefined,
        }),
      })

      const data = await res.json()
      if (res.ok) {
        toast.success('Votre demande d\'absence a été transmise !')
        setAbsenceDate('')
        setAbsenceMotif('')
        setAbsenceCoachRemplacantId('')
        setRemplacementTab('mes_absences')
        await fetchRemplacements()
      } else {
        toast.error(data.error || 'Erreur lors de la déclaration')
      }
    } catch {
      toast.error('Erreur lors de la soumission')
    } finally {
      setSubmittingAbsence(false)
    }
  }

  // Calculs filtres Tournants
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
      <div className="container mx-auto px-4 max-w-7xl space-y-6">
        <CoachNav />

        {/* EN-TÊTE DE LA PAGE UNIFIÉE */}
        <header className="bg-white border border-slate-200/80 rounded-3xl p-5 sm:p-7 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 text-primary text-[11px] font-extrabold uppercase tracking-wider mb-1.5 border border-emerald-200/60">
                <Repeat className="w-3 h-3 text-primary" />
                <span>Créneaux Tournants &amp; Remplacements</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-slate-950 tracking-tight">
                Planning &amp; Entraide Coachs
              </h1>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Gérez vos créneaux tournants et assurez l&apos;entraide pour les remplacements sur une seule interface.
              </p>
            </div>

            {/* Badges compteurs rapides */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold border border-slate-200/60">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span>{availableCount} tournant{availableCount > 1 ? 's' : ''} libre{availableCount > 1 ? 's' : ''}</span>
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold border border-slate-200/60">
                <span className="w-2 h-2 rounded-full bg-amber-500" />
                <span>{demandesOuvertes.length} remplacement{demandesOuvertes.length > 1 ? 's' : ''} en attente</span>
              </span>
            </div>
          </div>
        </header>

        {/* GRILLE 2 COLONNES */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          {/* COLONNE 1 : CRÉNEAUX TOURNANTS */}
          <div className="space-y-4">
            <div className="bg-white border border-slate-200/80 rounded-3xl p-5 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-base sm:text-lg font-black text-slate-950 flex items-center gap-2">
                    <Repeat className="w-4 h-4 text-primary" />
                    <span>Créneaux Tournants</span>
                  </h2>
                  <p className="text-[11px] text-slate-500 font-medium">
                    Prenez ou libérez vos créneaux tournants de saison
                  </p>
                </div>

                {/* Filtres Créneaux */}
                <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl w-fit">
                  <button
                    type="button"
                    onClick={() => setFilterMode('available')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      filterMode === 'available'
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <span>À pourvoir</span>
                    {availableCount > 0 && (
                      <span className="ml-1 px-1.5 py-0.2 text-[10px] rounded-full bg-emerald-600 text-white font-black">
                        {availableCount}
                      </span>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilterMode('mine')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      filterMode === 'mine'
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <span>Mes créneaux</span>
                    {mineCount > 0 && (
                      <span className="ml-1 px-1.5 py-0.2 text-[10px] rounded-full bg-slate-900 text-white font-black">
                        {mineCount}
                      </span>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilterMode('all')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      filterMode === 'all'
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <span>Tous</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Liste des créneaux */}
            <div className="space-y-3">
              {loadingTournants ? (
                <div className="bg-white border border-slate-200/80 rounded-3xl p-10 text-center space-y-2">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto text-primary" />
                  <p className="text-xs text-slate-500 font-bold">Chargement des créneaux...</p>
                </div>
              ) : filteredEvenements.length === 0 ? (
                <div className="bg-white border border-slate-200/80 rounded-3xl p-8 text-center space-y-2">
                  <div className="w-10 h-10 rounded-full bg-slate-50 text-slate-400 mx-auto flex items-center justify-center">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <p className="text-xs font-bold text-slate-700">Aucun créneau dans cette sélection</p>
                  <p className="text-[11px] text-slate-400">
                    {filterMode === 'available'
                      ? 'Tous les créneaux tournants sont actuellement pourvus.'
                      : 'Aucun créneau ne correspond à vos filtres.'}
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
                      className={`p-4 rounded-2xl border transition-all ${
                        isAvailable
                          ? 'bg-emerald-50/40 border-emerald-200 hover:border-emerald-300'
                          : isMine
                          ? 'bg-white border-primary/40 shadow-xs'
                          : 'bg-white border-slate-200/80'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="px-2 py-0.5 rounded-lg text-xs font-black bg-slate-900 text-white tracking-wide font-mono">
                              {evt.heureDebut} - {evt.heureFin}
                            </span>
                            <span className="text-xs font-extrabold text-slate-900">
                              {formatDateFr(evt.date)}
                            </span>
                            {isAvailable ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-600 text-white">
                                Libre
                              </span>
                            ) : isMine ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800">
                                Pour vous
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600">
                                Coach : {evt.coach?.prenom} {evt.coach?.nom || ''}
                              </span>
                            )}
                          </div>
                          <p className="text-xs font-bold text-slate-800">
                            {groupNames}
                          </p>
                          <div className="flex items-center gap-2 text-[11px] text-slate-500 font-medium">
                            <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span>{evt.lieu || 'Piscine Alphonse Roudière'}</span>
                          </div>
                        </div>

                        <div className="shrink-0 pt-1 sm:pt-0">
                          {isAvailable ? (
                            <button
                              type="button"
                              onClick={() => handleTake(evt.id)}
                              disabled={isActionLoading}
                              className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary hover:bg-primary-dark text-white text-xs font-black transition-all shadow-xs disabled:opacity-50 cursor-pointer"
                            >
                              {isActionLoading ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <Sparkles className="w-3.5 h-3.5" />
                              )}
                              <span>Prendre</span>
                            </button>
                          ) : isMine ? (
                            <button
                              type="button"
                              onClick={() => handleRelease(evt.id)}
                              disabled={isActionLoading}
                              className="w-full sm:w-auto inline-flex items-center justify-center gap-1 px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 text-xs font-bold transition-all disabled:opacity-50 cursor-pointer"
                            >
                              {isActionLoading ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
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
            </div>
          </div>

          {/* COLONNE 2 : REMPLACEMENTS & ABSENCES */}
          <div className="space-y-4">
            <div className="bg-white border border-slate-200/80 rounded-3xl p-5 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-base sm:text-lg font-black text-slate-950 flex items-center gap-2">
                    <UserCheck className="w-4 h-4 text-primary" />
                    <span>Remplacements &amp; Absences</span>
                  </h2>
                  <p className="text-[11px] text-slate-500 font-medium">
                    Solidarité entre entraîneurs du club
                  </p>
                </div>

                {/* Onglets Remplacements */}
                <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl w-fit flex-wrap">
                  <button
                    type="button"
                    onClick={() => setRemplacementTab('ouvertes')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      remplacementTab === 'ouvertes'
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <span>À pourvoir</span>
                    {demandesOuvertes.length > 0 && (
                      <span className="ml-1 px-1.5 py-0.2 text-[10px] rounded-full bg-amber-600 text-white font-black">
                        {demandesOuvertes.length}
                      </span>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => setRemplacementTab('mes_absences')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      remplacementTab === 'mes_absences'
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <span>Mes absences</span>
                    {mesAbsences.length > 0 && (
                      <span className="ml-1 px-1.5 py-0.2 text-[10px] rounded-full bg-slate-900 text-white font-black">
                        {mesAbsences.length}
                      </span>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => setRemplacementTab('declarer')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      remplacementTab === 'declarer'
                        ? 'bg-primary text-white shadow-xs'
                        : 'bg-emerald-50 text-primary hover:bg-emerald-100'
                    }`}
                  >
                    <span className="flex items-center gap-1">
                      <Plus className="w-3 h-3" />
                      <span>Déclarer</span>
                    </span>
                  </button>
                </div>
              </div>
            </div>

            {/* Contenu Colonne 2 */}
            {loadingRemplacements ? (
              <div className="bg-white border border-slate-200/80 rounded-3xl p-10 text-center space-y-2">
                <Loader2 className="w-6 h-6 animate-spin mx-auto text-primary" />
                <p className="text-xs text-slate-500 font-bold">Chargement des remplacements...</p>
              </div>
            ) : remplacementTab === 'ouvertes' ? (
              <div className="space-y-3">
                {demandesOuvertes.length === 0 ? (
                  <div className="bg-white border border-slate-200/80 rounded-3xl p-8 text-center space-y-2">
                    <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 mx-auto flex items-center justify-center">
                      <CheckCircle2 className="w-5 h-5" />
                    </div>
                    <p className="text-xs font-bold text-slate-700">Aucun remplacement en attente</p>
                    <p className="text-[11px] text-slate-400">
                      Tous les entraînements sont couverts par les entraîneurs du club.
                    </p>
                  </div>
                ) : (
                  demandesOuvertes.map((demande) => {
                    const isActionLoading = actionLoading === `rempl-${demande.id}`
                    return (
                      <div
                        key={demande.id}
                        className="p-4 rounded-2xl bg-white border border-amber-200/90 shadow-xs space-y-3"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="px-2 py-0.5 rounded-lg text-xs font-black bg-slate-900 text-white font-mono">
                                {demande.heureDebut} - {demande.heureFin}
                              </span>
                              <span className="text-xs font-extrabold text-slate-900">
                                {formatDateFr(demande.date)}
                              </span>
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-900">
                                À remplacer
                              </span>
                            </div>
                            <p className="text-xs font-bold text-slate-800">
                              Entraîneur : {demande.coachRemplace?.prenom} {demande.coachRemplace?.nom || ''}
                            </p>
                            {demande.motif && (
                              <p className="text-[11px] text-slate-500 italic">
                                Motif : {demande.motif}
                              </p>
                            )}
                          </div>

                          <button
                            type="button"
                            onClick={() => handleAccepterRemplacement(demande.id)}
                            disabled={isActionLoading}
                            className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-primary hover:bg-primary-dark text-white text-xs font-black transition-all shadow-xs disabled:opacity-50 cursor-pointer shrink-0"
                          >
                            {isActionLoading ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Sparkles className="w-3.5 h-3.5" />
                            )}
                            <span>Je remplace mon collègue</span>
                          </button>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            ) : remplacementTab === 'mes_absences' ? (
              <div className="space-y-3">
                {mesAbsences.length === 0 ? (
                  <div className="bg-white border border-slate-200/80 rounded-3xl p-8 text-center space-y-2">
                    <p className="text-xs font-bold text-slate-700">Vous n&apos;avez déclaré aucune absence</p>
                    <p className="text-[11px] text-slate-400">
                      En cas d&apos;imprévu, basculez sur l&apos;onglet « Déclarer ».
                    </p>
                  </div>
                ) : (
                  mesAbsences.map((abs) => (
                    <div
                      key={abs.id}
                      className="p-4 rounded-2xl bg-white border border-slate-200/80 space-y-2"
                    >
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="px-2 py-0.5 rounded-lg text-xs font-black bg-slate-900 text-white font-mono">
                            {abs.heureDebut} - {abs.heureFin}
                          </span>
                          <span className="text-xs font-extrabold text-slate-900">
                            {formatDateFr(abs.date)}
                          </span>
                        </div>

                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                            abs.statut === 'accepte'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {abs.statut === 'accepte' ? 'Remplacé' : 'En attente'}
                        </span>
                      </div>

                      {abs.coachRemplacant ? (
                        <p className="text-xs font-semibold text-emerald-700 flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                          <span>Remplacé par {abs.coachRemplacant.prenom} {abs.coachRemplacant.nom || ''}</span>
                        </p>
                      ) : (
                        <p className="text-[11px] text-slate-500 italic">
                          Demande visible par tous les collègues
                        </p>
                      )}
                    </div>
                  ))
                )}
              </div>
            ) : (
              /* FORMULAIRE DE DÉCLARATION D'ABSENCE */
              <form
                onSubmit={handleSubmitAbsence}
                className="bg-white border border-slate-200/80 rounded-3xl p-5 shadow-xs space-y-4"
              >
                <div className="border-b border-slate-100 pb-2">
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-900">
                    Déclarer une absence / Demander un remplaçant
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Renseignez vos horaires pour alerter vos collègues
                  </p>
                </div>

                <div className="space-y-3">
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-700">Date de l&apos;absence *</label>
                    <input
                      type="date"
                      required
                      value={absenceDate}
                      onChange={(e) => setAbsenceDate(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-900 focus:bg-white focus:border-primary focus:outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-700">Heure début *</label>
                      <input
                        type="time"
                        required
                        value={absenceHeureDebut}
                        onChange={(e) => setAbsenceHeureDebut(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-900 focus:bg-white focus:border-primary focus:outline-none font-mono"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-700">Heure fin *</label>
                      <input
                        type="time"
                        required
                        value={absenceHeureFin}
                        onChange={(e) => setAbsenceHeureFin(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-900 focus:bg-white focus:border-primary focus:outline-none font-mono"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-700">Motif (optionnel)</label>
                    <input
                      type="text"
                      placeholder="Ex: Déplacement pro, empêchement..."
                      value={absenceMotif}
                      onChange={(e) => setAbsenceMotif(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:bg-white focus:border-primary focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-700">Collègue déjà prévenu (optionnel)</label>
                    <select
                      value={absenceCoachRemplacantId}
                      onChange={(e) => setAbsenceCoachRemplacantId(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:bg-white focus:border-primary focus:outline-none"
                    >
                      <option value="">Tous les coachs (ouvert à tous)</option>
                      {coaches
                        .filter((c) => !currentCoach || c.id !== currentCoach.id)
                        .map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.prenom} {c.nom || ''}
                          </option>
                        ))}
                    </select>
                  </div>
                </div>

                <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setRemplacementTab('ouvertes')}
                    className="px-3.5 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    disabled={submittingAbsence}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary hover:bg-primary-dark text-white text-xs font-extrabold shadow-xs transition-all disabled:opacity-50 cursor-pointer"
                  >
                    {submittingAbsence ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Send className="w-3.5 h-3.5" />
                    )}
                    <span>Envoyer la demande</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
