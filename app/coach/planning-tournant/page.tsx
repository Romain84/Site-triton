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
  UserCheck,
  Calendar,
  Clock,
  AlertCircle,
  HelpCircle,
  Users,
  Hourglass,
  Ban,
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
  description?: string | null
  statut: 'en_attente' | 'accepte' | 'annule' | 'sans_remplacant'
}

interface PlanningRegular {
  id: string
  jourSemaine: string
  heureDebut: string
  heureFin: string
  nomSession?: string | null
  groupe?: { id: string; nom: string } | null
}

const JOURS_SEMAINE_FR = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi']

export default function PlanningTournantPage() {
  const router = useRouter()
  const { confirm } = useConfirmDialog()

  // Coach session
  const [currentCoach, setCurrentCoach] = useState<Coach | null>(null)

  // Navigation 2 onglets principaux
  const [mainTab, setMainTab] = useState<'a_pourvoir' | 'mes_creneaux'>('a_pourvoir')

  // Données
  const [evenements, setEvenements] = useState<Evenement[]>([])
  const [loadingTournants, setLoadingTournants] = useState(true)
  const [demandesOuvertes, setDemandesOuvertes] = useState<Remplacement[]>([])
  const [mesAbsences, setMesAbsences] = useState<Remplacement[]>([])
  const [mesRemplacements, setMesRemplacements] = useState<Remplacement[]>([])
  const [mesPlannings, setMesPlannings] = useState<PlanningRegular[]>([])
  const [coaches, setCoaches] = useState<Coach[]>([])
  const [loadingRemplacements, setLoadingRemplacements] = useState(true)

  // Actions
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  // Formulaire rapide déclaration absence
  const [showDeclareForm, setShowDeclareForm] = useState(false)
  const [absenceDate, setAbsenceDate] = useState('')
  const [absenceHeureDebut, setAbsenceHeureDebut] = useState('18:00')
  const [absenceHeureFin, setAbsenceHeureFin] = useState('19:30')
  const [absencePlanningId, setAbsencePlanningId] = useState<string>('')
  const [absenceMotif, setAbsenceMotif] = useState('')
  const [absenceCoachRemplacantId, setAbsenceCoachRemplacantId] = useState('')
  const [submittingAbsence, setSubmittingAbsence] = useState(false)

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
        setMesRemplacements(data.mesRemplacements || [])
        setMesPlannings(data.mesPlannings || [])
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

  // Actions
  const handleTakeTournant = async (id: string) => {
    setActionLoading(`tourn-${id}`)
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

  const handleReleaseTournant = async (id: string) => {
    const confirmed = await confirm({
      title: 'Libérer ce créneau ?',
      message: 'Ce créneau sera immédiatement remis à disposition des autres entraîneurs du club.',
      confirmText: 'Oui, libérer',
      variant: 'danger',
    })

    if (!confirmed) return

    setActionLoading(`tourn-${id}`)
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

  const handleAccepterRemplacement = async (id: string) => {
    const ok = await confirm({
      title: 'Accepter ce remplacement ?',
      message: 'Ce créneau sera automatiquement ajouté à votre planning et à votre facturation.',
      confirmText: 'Prendre ce remplacement',
    })
    if (!ok) return

    setActionLoading(`rempl-${id}`)
    try {
      const res = await fetch(`/api/coach/remplacements/${id}/accepter`, {
        method: 'POST',
      })
      const data = await res.json()
      if (res.ok) {
        toast.success('Remplacement accepté !')
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

  const handleAnnulerAbsence = async (id: string) => {
    const ok = await confirm({
      title: 'Annuler votre absence ?',
      message: 'Votre cours régulier sera rétabli et la déduction retirée de votre facture.',
      confirmText: 'Rétablir mon cours',
      variant: 'danger',
    })
    if (!ok) return

    setActionLoading(`cancel-abs-${id}`)
    try {
      const res = await fetch(`/api/coach/remplacements/${id}`, {
        method: 'DELETE',
      })
      const data = await res.json()
      if (res.ok) {
        toast.success(data.message || 'Absence annulée')
        await fetchRemplacements()
      } else {
        toast.error(data.error || 'Erreur lors de l\'annulation')
      }
    } catch {
      toast.error('Erreur réseau')
    } finally {
      setActionLoading(null)
    }
  }

  const parseTimeToMin = (t: string) => {
    if (!t) return 0
    const [h, m] = t.split(':').map(Number)
    return (h || 0) * 60 + (m || 0)
  }

  const getCreneauxForDate = useCallback(
    (dateStr: string) => {
      if (!dateStr) return []
      const [y, m, d] = dateStr.split('-').map(Number)
      if (!y || !m || !d) return []
      const dateObj = new Date(y, m - 1, d, 12, 0, 0)
      const jourNom = JOURS_SEMAINE_FR[dateObj.getDay()]

      const rawDuJour = mesPlannings
        .filter((p) => p.jourSemaine === jourNom)
        .sort((a, b) => parseTimeToMin(a.heureDebut) - parseTimeToMin(b.heureDebut))

      // Fusionner les groupes simultanés au même horaire
      const merged: Array<{
        id: string
        heureDebut: string
        heureFin: string
        debutMin: number
        finMin: number
        label: string
      }> = []

      for (const p of rawDuJour) {
        const deb = parseTimeToMin(p.heureDebut)
        const fin = parseTimeToMin(p.heureFin)
        const nom = p.nomSession || p.groupe?.nom || 'Cours'
        const last = merged.length > 0 ? merged[merged.length - 1] : null

        if (last && deb < last.finMin) {
          if (fin > last.finMin) {
            last.finMin = fin
            last.heureFin = p.heureFin
          }
          if (!last.label.includes(nom)) {
            last.label = `${last.label} · ${nom}`
          }
        } else {
          merged.push({
            id: p.id,
            heureDebut: p.heureDebut,
            heureFin: p.heureFin,
            debutMin: deb,
            finMin: fin,
            label: nom,
          })
        }
      }

      return merged
    },
    [mesPlannings]
  )

  const creneauxDuJourSelectionne = useMemo(() => {
    return getCreneauxForDate(absenceDate)
  }, [absenceDate, getCreneauxForDate])

  const handleAbsenceDateChange = (newDate: string) => {
    setAbsenceDate(newDate)
    const slots = getCreneauxForDate(newDate)
    if (slots.length > 0) {
      setAbsenceHeureDebut(slots[0].heureDebut)
      setAbsenceHeureFin(slots[0].heureFin)
      setAbsencePlanningId(slots[0].id)
    } else {
      setAbsencePlanningId('')
    }
  }

  const handleSubmitAbsence = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!absenceDate || !absenceHeureDebut || !absenceHeureFin) {
      toast.error('Veuillez renseigner la date et les horaires')
      return
    }

    if (parseTimeToMin(absenceHeureDebut) >= parseTimeToMin(absenceHeureFin)) {
      toast.error('L\'heure de fin doit être postérieure à l\'heure de début')
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
          planningId: absencePlanningId || undefined,
          motif: absenceMotif.trim() || undefined,
          coachRemplacantId: absenceCoachRemplacantId || undefined,
          sansRemplacant: false,
          statut: absenceCoachRemplacantId ? 'accepte' : 'en_attente',
        }),
      })

      const data = await res.json()
      if (res.ok) {
        toast.success(data.message || 'Absence enregistrée avec succès')
        setAbsenceDate('')
        setAbsencePlanningId('')
        setAbsenceMotif('')
        setAbsenceCoachRemplacantId('')
        setShowDeclareForm(false)
        setMainTab('mes_creneaux')
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

  // Créneaux tournants libres
  const tournantsLibres = useMemo(() => {
    return evenements.filter((e) => !e.coachId)
  }, [evenements])

  // Mes créneaux tournants
  const mesTournants = useMemo(() => {
    if (!currentCoach) return []
    return evenements.filter((e) => e.coachId === currentCoach.id)
  }, [evenements, currentCoach])

  // Compteur total à pourvoir
  const totalAPourvoir = tournantsLibres.length + demandesOuvertes.length

  const formatDateFr = (dStr: string) => {
    return new Date(dStr).toLocaleDateString('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    })
  }

  return (
    <div className="min-h-screen pt-2 pb-24 sm:pb-12 bg-slate-50/50 text-slate-900">
      <div className="container mx-auto px-4 max-w-5xl space-y-6">
        <CoachNav />

        {/* HEADER */}
        <header className="bg-white border border-slate-200/80 rounded-3xl p-5 sm:p-7 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="w-2.5 h-2.5 rounded-full bg-cyan-500 animate-pulse" />
                <span className="text-[11px] font-black uppercase tracking-wider text-cyan-700">
                  Gestion des entraînements
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-slate-950 tracking-tight">
                Remplacements &amp; Créneaux
              </h1>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Consultez les créneaux à pourvoir ou gérez vos demandes d&apos;absences.
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                setShowDeclareForm(!showDeclareForm)
                if (!showDeclareForm) setMainTab('mes_creneaux')
              }}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-950 hover:bg-slate-900 text-white text-xs font-black shadow-xs transition-all self-start sm:self-center"
            >
              <Plus className="w-4 h-4 text-cyan-400" />
              <span>{showDeclareForm ? 'Fermer le formulaire' : 'Déclarer une absence'}</span>
            </button>
          </div>

          {/* SÉLECTEUR 2 ONGLETS PRINCIPAUX */}
          <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setMainTab('a_pourvoir')}
              className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black transition-all ${
                mainTab === 'a_pourvoir'
                  ? 'bg-slate-950 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:text-slate-950 hover:bg-slate-200/60'
              }`}
            >
              <Sparkles className="w-4 h-4 text-emerald-400" />
              <span>À pourvoir</span>
              {totalAPourvoir > 0 && (
                <span className="px-2 py-0.5 text-[10px] rounded-full bg-emerald-500 text-white font-extrabold animate-pulse">
                  {totalAPourvoir}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setMainTab('mes_creneaux')}
              className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black transition-all ${
                mainTab === 'mes_creneaux'
                  ? 'bg-slate-950 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:text-slate-950 hover:bg-slate-200/60'
              }`}
            >
              <Users className="w-4 h-4 text-cyan-400" />
              <span>Mes demandes &amp; créneaux</span>
              {(mesAbsences.length > 0 || mesTournants.length > 0) && (
                <span className="px-2 py-0.5 text-[10px] rounded-full bg-slate-200 text-slate-800 font-extrabold">
                  {mesAbsences.length + mesTournants.length}
                </span>
              )}
            </button>
          </div>
        </header>

        {/* FORMULAIRE RAPIDE DÉCLARATION ABSENCE */}
        {showDeclareForm && (
          <section className="bg-white border border-rose-200 rounded-3xl p-5 sm:p-6 shadow-sm space-y-4 animate-in fade-in duration-200">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                <span>Déclarer une absence ponctuelle</span>
              </h2>
            </div>

            <form onSubmit={handleSubmitAbsence} className="space-y-4 pt-1">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">Date *</label>
                  <input
                    type="date"
                    required
                    value={absenceDate}
                    onChange={(e) => handleAbsenceDateChange(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-cyan-500"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">Heure de début *</label>
                  <input
                    type="time"
                    required
                    value={absenceHeureDebut}
                    onChange={(e) => {
                      setAbsenceHeureDebut(e.target.value)
                      setAbsencePlanningId('')
                    }}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-cyan-500"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">Heure de fin *</label>
                  <input
                    type="time"
                    required
                    value={absenceHeureFin}
                    onChange={(e) => {
                      setAbsenceHeureFin(e.target.value)
                      setAbsencePlanningId('')
                    }}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-cyan-500"
                  />
                </div>
              </div>

              {/* SÉLECTEUR INTELLIGENT DES CRÉNEAUX DU JOUR */}
              {absenceDate && (
                <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
                  {creneauxDuJourSelectionne.length > 0 ? (
                    <>
                      <p className="text-[11px] font-bold text-slate-700 flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-cyan-600 shrink-0" />
                        <span>Vos cours prévus ce jour (cliquez pour sélectionner) :</span>
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {creneauxDuJourSelectionne.map((slot) => {
                          const isSelected =
                            absenceHeureDebut === slot.heureDebut && absenceHeureFin === slot.heureFin
                          return (
                            <button
                              key={slot.id}
                              type="button"
                              onClick={() => {
                                setAbsenceHeureDebut(slot.heureDebut)
                                setAbsenceHeureFin(slot.heureFin)
                                setAbsencePlanningId(slot.id)
                              }}
                              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                                isSelected
                                  ? 'bg-cyan-600 text-white border-cyan-600 shadow-2xs'
                                  : 'bg-white text-slate-700 border-slate-200 hover:border-cyan-400 hover:text-cyan-900'
                              }`}
                            >
                              {slot.heureDebut} – {slot.heureFin} · {slot.label}
                            </button>
                          )
                        })}

                        {creneauxDuJourSelectionne.length > 1 && (
                          <button
                            type="button"
                            onClick={() => {
                              const first = creneauxDuJourSelectionne[0]
                              const last = creneauxDuJourSelectionne[creneauxDuJourSelectionne.length - 1]
                              setAbsenceHeureDebut(first.heureDebut)
                              setAbsenceHeureFin(last.heureFin)
                              setAbsencePlanningId('')
                            }}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                              absenceHeureDebut === creneauxDuJourSelectionne[0].heureDebut &&
                              absenceHeureFin ===
                                creneauxDuJourSelectionne[creneauxDuJourSelectionne.length - 1].heureFin
                                ? 'bg-slate-900 text-white border-slate-900 shadow-2xs'
                                : 'bg-white text-slate-700 border-slate-200 hover:border-slate-400'
                            }`}
                          >
                            Tous mes cours ({creneauxDuJourSelectionne[0].heureDebut} –{' '}
                            {creneauxDuJourSelectionne[creneauxDuJourSelectionne.length - 1].heureFin})
                          </button>
                        )}
                      </div>
                    </>
                  ) : (
                    <div className="flex items-center gap-2 text-xs font-semibold text-amber-800">
                      <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                      <span>
                        Aucun cours régulier n&apos;est planifié pour vous à cette date. Vérifiez le jour choisi.
                      </span>
                    </div>
                  )}
                </div>
              )}

              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">
                  Motif <span className="text-slate-400 font-normal">(facultatif)</span>
                </label>
                <input
                  type="text"
                  placeholder="Ex : Raisons personnelles, maladie, déplacement..."
                  value={absenceMotif}
                  onChange={(e) => setAbsenceMotif(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-cyan-500"
                />
              </div>

              {/* Choix remplaçant */}
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1.5">
                <label className="text-[11px] font-bold text-slate-700 block">
                  Entraîneur remplaçant
                </label>
                <select
                  value={absenceCoachRemplacantId}
                  onChange={(e) => setAbsenceCoachRemplacantId(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold focus:outline-hidden focus:ring-2 focus:ring-cyan-500"
                >
                  <option value="">-- Proposer à toute l&apos;équipe (demande ouverte) --</option>
                  {coaches
                    .filter((c) => c.id !== currentCoach?.id)
                    .map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.prenom} {c.nom || ''} (désignation directe)
                      </option>
                    ))}
                </select>
                <p className="text-[10px] text-slate-400">
                  Si aucun remplaçant n&apos;est désigné, le créneau sera proposé à l&apos;équipe dans les remplacements à pourvoir.
                </p>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowDeclareForm(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={submittingAbsence}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-950 text-white text-xs font-black hover:bg-slate-900 transition-all shadow-xs disabled:opacity-50"
                >
                  {submittingAbsence ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>Confirmer l&apos;absence</span>}
                </button>
              </div>
            </form>
          </section>
        )}

        {/* CONTENU ONGLETS */}

        {/* ===================== ONGLET 1 : À POURVOIR ===================== */}
        {mainTab === 'a_pourvoir' && (
          <div className="space-y-6">
            {/* 1.1 REMPLACEMENTS DEMANDÉS PAR LES COLLÈGUES */}
            <div className="space-y-3">
              <h2 className="text-base font-black text-slate-950 flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-emerald-600" />
                <span>Remplacements ouverts à l&apos;équipe ({demandesOuvertes.length})</span>
              </h2>

              {loadingRemplacements ? (
                <div className="bg-white border border-slate-200/80 rounded-3xl p-8 text-center space-y-2">
                  <Loader2 className="w-5 h-5 animate-spin mx-auto text-cyan-600" />
                  <p className="text-xs text-slate-500 font-bold">Chargement des remplacements...</p>
                </div>
              ) : demandesOuvertes.length === 0 ? (
                <div className="bg-white border border-slate-200/80 rounded-2xl p-6 text-center text-xs text-slate-500">
                  <CheckCircle2 className="w-6 h-6 text-emerald-500 mx-auto mb-1.5" />
                  <p className="font-bold text-slate-700">Aucun remplacement en attente</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">Tous les collègues sont présents ou ont trouvé un remplaçant.</p>
                </div>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  {demandesOuvertes.map((r) => {
                    const isAction = actionLoading === `rempl-${r.id}`
                    return (
                      <div
                        key={r.id}
                        className="bg-white border border-emerald-200 rounded-2xl p-4 shadow-xs space-y-3 hover:border-emerald-300 transition-all"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center justify-between gap-2">
                            <span className="px-2 py-0.5 rounded-md text-xs font-black bg-slate-900 text-white font-mono">
                              {r.heureDebut} – {r.heureFin}
                            </span>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800">
                              À pourvoir
                            </span>
                          </div>

                          <p className="text-xs font-extrabold text-slate-900 pt-1">
                            {formatDateFr(r.date)}
                          </p>

                          <p className="text-xs text-slate-600 font-medium">
                            Collègue absent : <strong>{r.coachRemplace?.prenom} {r.coachRemplace?.nom || ''}</strong>
                          </p>

                          {r.motif && (
                            <p className="text-[11px] text-slate-500 italic">
                              Motif : « {r.motif} »
                            </p>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={() => handleAccepterRemplacement(r.id)}
                          disabled={isAction}
                          className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black shadow-xs transition-all disabled:opacity-50"
                        >
                          {isAction ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <>
                              <UserCheck className="w-4 h-4" />
                              <span>Prendre ce remplacement</span>
                            </>
                          )}
                        </button>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* 1.2 CRÉNEAUX TOURNANTS LIBRES */}
            <div className="space-y-3 pt-2">
              <h2 className="text-base font-black text-slate-950 flex items-center gap-2">
                <Repeat className="w-4 h-4 text-purple-600" />
                <span>Créneaux tournants libres ({tournantsLibres.length})</span>
              </h2>

              {loadingTournants ? (
                <div className="bg-white border border-slate-200/80 rounded-3xl p-8 text-center space-y-2">
                  <Loader2 className="w-5 h-5 animate-spin mx-auto text-purple-600" />
                  <p className="text-xs text-slate-500 font-bold">Chargement des créneaux tournants...</p>
                </div>
              ) : tournantsLibres.length === 0 ? (
                <div className="bg-white border border-slate-200/80 rounded-2xl p-6 text-center text-xs text-slate-500">
                  <CheckCircle2 className="w-6 h-6 text-purple-500 mx-auto mb-1.5" />
                  <p className="font-bold text-slate-700">Aucun créneau tournant libre</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">Tous les créneaux tournants ont été attribués.</p>
                </div>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  {tournantsLibres.map((evt) => {
                    const isAction = actionLoading === `tourn-${evt.id}`
                    const groupNames =
                      evt.groupes && evt.groupes.length > 0
                        ? evt.groupes.map((g) => g.nom).join(', ')
                        : evt.groupe?.nom || evt.titre

                    return (
                      <div
                        key={evt.id}
                        className="bg-white border border-purple-200 rounded-2xl p-4 shadow-xs space-y-3 hover:border-purple-300 transition-all"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center justify-between gap-2">
                            <span className="px-2 py-0.5 rounded-md text-xs font-black bg-slate-900 text-white font-mono">
                              {evt.heureDebut} – {evt.heureFin}
                            </span>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-purple-100 text-purple-800">
                              Tournant libre
                            </span>
                          </div>

                          <p className="text-xs font-extrabold text-slate-900 pt-1">
                            {formatDateFr(evt.date)}
                          </p>

                          <p className="text-xs font-bold text-purple-950">
                            {groupNames}
                          </p>

                          <p className="text-[11px] text-slate-500 flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5 text-slate-400" />
                            <span>{evt.lieu || 'Piscine Alphonse Roudière'}</span>
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleTakeTournant(evt.id)}
                          disabled={isAction}
                          className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-black shadow-xs transition-all disabled:opacity-50"
                        >
                          {isAction ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <>
                              <Sparkles className="w-4 h-4" />
                              <span>Prendre le créneau</span>
                            </>
                          )}
                        </button>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ===================== ONGLET 2 : MES CRÉNEAUX & DEMANDES ===================== */}
        {mainTab === 'mes_creneaux' && (
          <div className="space-y-6">
            {/* 2.1 MES ABSENCES DÉCLARÉES */}
            <div className="space-y-3">
              <h2 className="text-base font-black text-slate-950 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-amber-600" />
                <span>Mes absences déclarées ({mesAbsences.length})</span>
              </h2>

              {mesAbsences.length === 0 ? (
                <div className="bg-white border border-slate-200/80 rounded-2xl p-6 text-center text-xs text-slate-400">
                  Vous n&apos;avez aucune absence déclarée en cours.
                </div>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  {mesAbsences.map((abs) => {
                    const isAction = actionLoading === `cancel-abs-${abs.id}`
                    return (
                      <div
                        key={abs.id}
                        className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs space-y-3"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center justify-between gap-2">
                            <span className="px-2 py-0.5 rounded-md text-xs font-black bg-slate-900 text-white font-mono">
                              {abs.heureDebut} – {abs.heureFin}
                            </span>

                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                                abs.statut === 'accepte'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : abs.statut === 'sans_remplacant'
                                  ? 'bg-slate-100 text-slate-700'
                                  : 'bg-amber-100 text-amber-800'
                              }`}
                            >
                              {abs.statut === 'accepte'
                                ? 'Pourvu'
                                : abs.statut === 'sans_remplacant'
                                ? 'Sans remplaçant'
                                : 'En recherche'}
                            </span>
                          </div>

                          <p className="text-xs font-extrabold text-slate-900 pt-1">
                            {formatDateFr(abs.date)}
                          </p>

                          {abs.coachRemplacant ? (
                            <p className="text-xs text-emerald-700 font-bold flex items-center gap-1">
                              <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
                              <span>Remplacé(e) par : {abs.coachRemplacant.prenom} {abs.coachRemplacant.nom || ''}</span>
                            </p>
                          ) : abs.statut === 'sans_remplacant' ? (
                            <p className="text-xs text-slate-500">
                              Séance sans remplaçant
                            </p>
                          ) : (
                            <p className="text-xs text-amber-700 flex items-center gap-1">
                              <Hourglass className="w-3.5 h-3.5" />
                              <span>Visible par vos collègues pour prise en charge</span>
                            </p>
                          )}

                          {abs.motif && (
                            <p className="text-[11px] text-slate-500 italic">
                              Motif : « {abs.motif} »
                            </p>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={() => handleAnnulerAbsence(abs.id)}
                          disabled={isAction}
                          className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-bold transition-all disabled:opacity-50"
                        >
                          {isAction ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <span>Annuler mon absence</span>
                          )}
                        </button>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* 2.2 MES CRÉNEAUX TOURNANTS RÉSERVÉS */}
            <div className="space-y-3 pt-2">
              <h2 className="text-base font-black text-slate-950 flex items-center gap-2">
                <Repeat className="w-4 h-4 text-cyan-600" />
                <span>Mes créneaux tournants réservés ({mesTournants.length})</span>
              </h2>

              {mesTournants.length === 0 ? (
                <div className="bg-white border border-slate-200/80 rounded-2xl p-6 text-center text-xs text-slate-400">
                  Vous n&apos;avez réservé aucun créneau tournant pour le moment.
                </div>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  {mesTournants.map((evt) => {
                    const isAction = actionLoading === `tourn-${evt.id}`
                    const groupNames =
                      evt.groupes && evt.groupes.length > 0
                        ? evt.groupes.map((g) => g.nom).join(', ')
                        : evt.groupe?.nom || evt.titre

                    return (
                      <div
                        key={evt.id}
                        className="bg-white border border-cyan-200 rounded-2xl p-4 shadow-xs space-y-3"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center justify-between gap-2">
                            <span className="px-2 py-0.5 rounded-md text-xs font-black bg-slate-900 text-white font-mono">
                              {evt.heureDebut} – {evt.heureFin}
                            </span>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-cyan-100 text-cyan-800">
                              Confirmé
                            </span>
                          </div>

                          <p className="text-xs font-extrabold text-slate-900 pt-1">
                            {formatDateFr(evt.date)}
                          </p>

                          <p className="text-xs font-bold text-slate-900">
                            {groupNames}
                          </p>

                          <p className="text-[11px] text-slate-500 flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5 text-slate-400" />
                            <span>{evt.lieu || 'Piscine Alphonse Roudière'}</span>
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleReleaseTournant(evt.id)}
                          disabled={isAction}
                          className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl border border-rose-200 text-rose-700 hover:bg-rose-50 text-xs font-bold transition-all disabled:opacity-50"
                        >
                          {isAction ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <span>Libérer ce créneau</span>
                          )}
                        </button>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* 2.3 MES REMPLACEMENTS EFFECTUÉS */}
            {mesRemplacements.length > 0 && (
              <div className="space-y-3 pt-2">
                <h2 className="text-base font-black text-slate-950 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Remplacements pris en charge ({mesRemplacements.length})</span>
                </h2>

                <div className="grid gap-3 sm:grid-cols-2">
                  {mesRemplacements.map((r) => (
                    <div
                      key={r.id}
                      className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs space-y-1.5"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="px-2 py-0.5 rounded-md text-xs font-black bg-slate-900 text-white font-mono">
                          {r.heureDebut} – {r.heureFin}
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800">
                          Assuré par vous
                        </span>
                      </div>

                      <p className="text-xs font-extrabold text-slate-900 pt-1">
                        {formatDateFr(r.date)}
                      </p>

                      <p className="text-xs text-slate-600">
                        Pour : <strong>{r.coachRemplace?.prenom} {r.coachRemplace?.nom || ''}</strong>
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
