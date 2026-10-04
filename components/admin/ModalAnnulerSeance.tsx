'use client'

import { useState, useEffect, useMemo } from 'react'
import toast from 'react-hot-toast'
import { getErrorMessage } from '@/lib/utils'

interface Planning {
  id: string
  jourSemaine: string
  heureDebut: string
  heureFin: string
  tempsFacture?: number | null
  groupe?: { nom: string; couleur?: string | null } | null
  coachs?: Array<{ coach: { id: string; prenom: string; nom?: string | null } }>
}

interface ModalAnnulerSeanceProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  defaultDate?: string
  defaultPlanningId?: string
}

const MOTIFS_RAPIDES = [
  'Piscine fermée',
  'Vidange technique',
  'Compétition club',
  'Panne chauffage / technique',
  'Jour férié',
  'Intempéries',
]

const JOURS_MAP: { [key: number]: string } = {
  0: 'Dimanche',
  1: 'Lundi',
  2: 'Mardi',
  3: 'Mercredi',
  4: 'Jeudi',
  5: 'Vendredi',
  6: 'Samedi',
}

export default function ModalAnnulerSeance({
  isOpen,
  onClose,
  onSuccess,
  defaultDate,
  defaultPlanningId,
}: ModalAnnulerSeanceProps) {
  const [date, setDate] = useState(defaultDate || new Date().toISOString().split('T')[0])
  const [motif, setMotif] = useState('Piscine fermée')
  const [mode, setMode] = useState<'journee' | 'soiree' | 'selection'>('journee')
  const [selectedPlanningIds, setSelectedPlanningIds] = useState<string[]>([])
  const [plannings, setPlannings] = useState<Planning[]>([])
  const [loadingPlannings, setLoadingPlannings] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  // Synchroniser la date par défaut si fournie
  useEffect(() => {
    if (defaultDate) {
      setDate(defaultDate)
    }
    if (defaultPlanningId) {
      setMode('selection')
      setSelectedPlanningIds([defaultPlanningId])
    }
  }, [defaultDate, defaultPlanningId, isOpen])

  // Charger les plannings fixes pour connaître les créneaux du jour
  useEffect(() => {
    if (!isOpen) return
    const fetchPlannings = async () => {
      try {
        setLoadingPlannings(true)
        const res = await fetch('/api/admin/planning-fixe')
        if (res.ok) {
          const data = await res.json()
          setPlannings(data.plannings || data || [])
        }
      } catch (err) {
        console.error('Erreur chargement plannings:', err)
      } finally {
        setLoadingPlannings(false)
      }
    }
    fetchPlannings()
  }, [isOpen])

  // Déterminer le jour de la semaine correspondant à la date choisie
  const jourChoisi = useMemo(() => {
    if (!date) return ''
    const [y, m, d] = date.split('-').map(Number)
    if (!y || !m || !d) return ''
    const dt = new Date(y, m - 1, d)
    return JOURS_MAP[dt.getDay()] || ''
  }, [date])

  const dateFormatee = useMemo(() => {
    if (!date) return ''
    const [y, m, d] = date.split('-').map(Number)
    if (!y || !m || !d) return ''
    const dt = new Date(y, m - 1, d)
    return dt.toLocaleDateString('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })
  }, [date])

  // Créneaux du jour sélectionné
  const planningsDuJour = useMemo(() => {
    if (!jourChoisi) return []
    return plannings
      .filter((p) => p.jourSemaine === jourChoisi)
      .sort((a, b) => a.heureDebut.localeCompare(b.heureDebut))
  }, [plannings, jourChoisi])

  // Gestion de la sélection automatique selon le mode
  useEffect(() => {
    if (mode === 'journee') {
      setSelectedPlanningIds(planningsDuJour.map((p) => p.id))
    } else if (mode === 'soiree') {
      // Créneaux débutant à 18h ou plus
      setSelectedPlanningIds(
        planningsDuJour.filter((p) => p.heureDebut >= '18:00').map((p) => p.id)
      )
    }
  }, [mode, planningsDuJour])

  const togglePlanning = (id: string) => {
    setMode('selection')
    setSelectedPlanningIds((prev) =>
      prev.includes(id) ? prev.filter((pId) => pId !== id) : [...prev, id]
    )
  }

  const handleSelectAll = () => {
    setMode('selection')
    setSelectedPlanningIds(planningsDuJour.map((p) => p.id))
  }

  const handleDeselectAll = () => {
    setMode('selection')
    setSelectedPlanningIds([])
  }

  // Calcul du résumé des coachs impactés
  const coachsImpactes = useMemo(() => {
    const set = new Set<string>()
    const planningsCibles = mode === 'journee'
      ? planningsDuJour
      : planningsDuJour.filter((p) => selectedPlanningIds.includes(p.id))

    for (const p of planningsCibles) {
      if (p.coachs && p.coachs.length > 0) {
        for (const c of p.coachs) {
          set.add(`${c.coach.prenom} ${c.coach.nom || ''}`.trim())
        }
      }
    }
    return Array.from(set)
  }, [planningsDuJour, selectedPlanningIds, mode])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!date) {
      toast.error('Veuillez sélectionner une date')
      return
    }

    try {
      setSubmitting(true)

      let body: any = {
        date,
        motif: motif.trim() || 'Piscine fermée',
      }

      if (mode === 'journee') {
        // Annulation générale pour toute la journée
        body.annulerTout = true
      } else {
        if (selectedPlanningIds.length === 0) {
          toast.error('Veuillez sélectionner au moins un créneau à annuler')
          setSubmitting(false)
          return
        }
        body.planningIds = selectedPlanningIds
      }

      const res = await fetch('/api/admin/seances-annulees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Erreur lors de l\'enregistrement')
      }

      toast.success(
        mode === 'journee'
          ? `Fermeture de la journée du ${dateFormatee} enregistrée`
          : `${selectedPlanningIds.length} séance(s) annulée(s) le ${dateFormatee}`
      )
      onSuccess()
      onClose()
    } catch (err) {
      toast.error(getErrorMessage(err))
    } finally {
      setSubmitting(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden border border-slate-200">
        {/* En-tête */}
        <div className="px-6 py-4 bg-gradient-to-r from-red-600 to-rose-700 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🚫</span>
            <div>
              <h3 className="font-bold text-lg leading-tight">Annuler une séance / Fermeture club</h3>
              <p className="text-xs text-red-100">
                Déduit automatiquement les heures sur les factures de chaque coach concerné
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Corps */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5 flex-1">
          {/* 1. Date */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">
              Date concernée *
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-3.5 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm font-medium"
              required
            />
            {dateFormatee && (
              <p className="text-xs font-semibold text-red-700 mt-1 capitalize">
                📅 {dateFormatee} ({planningsDuJour.length} créneau{planningsDuJour.length > 1 ? 'x' : ''} au planning)
              </p>
            )}
          </div>

          {/* 2. Portée de l'annulation */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Portée de l'annulation
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <button
                type="button"
                onClick={() => setMode('journee')}
                className={`p-3 rounded-xl border text-left transition-all ${
                  mode === 'journee'
                    ? 'border-red-500 bg-red-50/80 ring-2 ring-red-400 text-red-900 font-semibold'
                    : 'border-slate-200 hover:border-slate-300 text-slate-700'
                }`}
              >
                <div className="text-base mb-1">🏊 Piscine fermée</div>
                <div className="text-xs text-slate-500 font-normal">Toute la journée (tous les cours)</div>
              </button>

              <button
                type="button"
                onClick={() => setMode('soiree')}
                className={`p-3 rounded-xl border text-left transition-all ${
                  mode === 'soiree'
                    ? 'border-red-500 bg-red-50/80 ring-2 ring-red-400 text-red-900 font-semibold'
                    : 'border-slate-200 hover:border-slate-300 text-slate-700'
                }`}
              >
                <div className="text-base mb-1">🌙 Toute la soirée</div>
                <div className="text-xs text-slate-500 font-normal">Tous les cours après 18h</div>
              </button>

              <button
                type="button"
                onClick={() => setMode('selection')}
                className={`p-3 rounded-xl border text-left transition-all ${
                  mode === 'selection'
                    ? 'border-red-500 bg-red-50/80 ring-2 ring-red-400 text-red-900 font-semibold'
                    : 'border-slate-200 hover:border-slate-300 text-slate-700'
                }`}
              >
                <div className="text-base mb-1">🎯 Sélection libre</div>
                <div className="text-xs text-slate-500 font-normal">Choisir au cas par cas</div>
              </button>
            </div>
          </div>

          {/* 3. Liste des créneaux si sélection manuelle ou vérification */}
          {planningsDuJour.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                  Créneaux du {jourChoisi} ({planningsDuJour.length})
                </span>
                <div className="flex gap-2 text-xs">
                  <button
                    type="button"
                    onClick={handleSelectAll}
                    className="text-red-700 hover:underline font-semibold"
                  >
                    Tout cocher
                  </button>
                  <span className="text-slate-300">•</span>
                  <button
                    type="button"
                    onClick={handleDeselectAll}
                    className="text-slate-600 hover:underline"
                  >
                    Tout décocher
                  </button>
                </div>
              </div>

              <div className="max-h-52 overflow-y-auto border border-slate-200 rounded-xl divide-y divide-slate-100 bg-slate-50/50">
                {planningsDuJour.map((p) => {
                  const isChecked = selectedPlanningIds.includes(p.id)
                  const coachsList = p.coachs?.map((c) => c.coach.prenom).join(', ') || 'Sans coach'
                  const tempsFactureStr = p.tempsFacture ? `${Math.floor(p.tempsFacture / 60)}h${p.tempsFacture % 60 ? String(p.tempsFacture % 60).padStart(2, '0') : '00'}` : ''

                  return (
                    <label
                      key={p.id}
                      className={`flex items-center justify-between p-2.5 px-3 cursor-pointer transition-colors ${
                        isChecked ? 'bg-red-50/60' : 'hover:bg-slate-100/60'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => togglePlanning(p.id)}
                          className="w-4 h-4 text-red-600 rounded border-slate-300 focus:ring-red-500"
                        />
                        <div>
                          <div className="text-xs font-bold text-slate-800 flex items-center gap-2">
                            <span>{p.groupe?.nom || 'Séance'}</span>
                            <span className="text-slate-500 font-normal">
                              ({p.heureDebut} – {p.heureFin})
                            </span>
                            {tempsFactureStr && (
                              <span className="text-[10px] bg-slate-200/70 text-slate-700 px-1.5 py-0.2 rounded font-mono">
                                Facturé {tempsFactureStr}
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-500">
                            Coach : <span className="font-semibold text-slate-700">{coachsList}</span>
                          </div>
                        </div>
                      </div>
                      {isChecked && (
                        <span className="text-[11px] font-bold text-red-700 bg-red-100/80 px-2 py-0.5 rounded-full">
                          Annulé
                        </span>
                      )}
                    </label>
                  )
                })}
              </div>
            </div>
          )}

          {planningsDuJour.length === 0 && !loadingPlannings && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800">
              ℹ️ Aucun créneau régulier programmé un {jourChoisi}. Vous pouvez néanmoins enregistrer une fermeture générale pour cette date.
            </div>
          )}

          {/* 4. Motif d'annulation */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">
              Motif d'annulation *
            </label>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {MOTIFS_RAPIDES.map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMotif(m)}
                  className={`text-xs px-2.5 py-1 rounded-lg border transition-all ${
                    motif === m
                      ? 'bg-red-600 text-white border-red-600 font-semibold shadow-sm'
                      : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
            <input
              type="text"
              value={motif}
              onChange={(e) => setMotif(e.target.value)}
              placeholder="Ex: Piscine fermée, vidange technique..."
              className="w-full px-3.5 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm"
              required
            />
          </div>

          {/* 5. Récapitulatif d'impact en direct */}
          <div className="p-3.5 bg-gradient-to-r from-red-50 to-rose-50 border border-red-200 rounded-xl text-xs space-y-1">
            <div className="font-bold text-red-900 flex items-center gap-1.5">
              <span>⚡ Impact facturation automatique :</span>
            </div>
            <p className="text-red-800">
              {mode === 'journee'
                ? `Tous les créneaux du ${dateFormatee} seront déduits sur les factures des coachs.`
                : `${selectedPlanningIds.length} créneau(x) annulé(s) le ${dateFormatee}.`}
            </p>
            {coachsImpactes.length > 0 && (
              <p className="text-red-700 font-medium pt-0.5">
                Coachs concernés : {coachsImpactes.join(', ')}
              </p>
            )}
            <p className="text-[11px] text-red-600 italic pt-1">
              Les coachs verront la ligne en rouge directement sous leur séance : « ↳ Séance annulée ({motif}) ».
            </p>
          </div>

          {/* Boutons d'action */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 text-sm font-semibold text-slate-600 hover:text-slate-800 rounded-xl hover:bg-slate-100 transition-colors"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2.5 bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-700 hover:to-rose-800 text-white text-sm font-bold rounded-xl shadow-md transition-all flex items-center gap-2 disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Enregistrement...</span>
                </>
              ) : (
                <>
                  <span>🚫</span>
                  <span>Confirmer l'annulation</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
