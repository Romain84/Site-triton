'use client'

import { useState, useEffect } from 'react'
import {
  X,
  Calendar,
  Clock,
  UserCheck,
  Users,
  AlertTriangle,
  Loader2,
  CheckCircle2,
  HelpCircle,
  MapPin,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { AgendaSessionDTO, CoachOptionDTO } from '@/lib/services/coach-agenda-service'

interface ModalDeclarerAbsenceProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  session: AgendaSessionDTO | null
  coaches: CoachOptionDTO[]
}

export default function ModalDeclarerAbsence({
  isOpen,
  onClose,
  onSuccess,
  session,
  coaches,
}: ModalDeclarerAbsenceProps) {
  const [heureDebut, setHeureDebut] = useState('')
  const [heureFin, setHeureFin] = useState('')
  const [motif, setMotif] = useState('')
  const [choixMode, setChoixMode] = useState<'designe' | 'ouvert' | 'aucun'>('designe')
  const [selectedCoachId, setSelectedCoachId] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (session) {
      setHeureDebut(session.heureDebut)
      setHeureFin(session.heureFin)
      setMotif('')
      setChoixMode('designe')
      setSelectedCoachId('')
    }
  }, [session, isOpen])

  if (!isOpen || !session) return null

  const motifsRapides = [
    'Maladie',
    'Raisons personnelles',
    'Formation',
    'Déplacement professionnel',
    'Compétition extérieure',
  ]

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!heureDebut || !heureFin) {
      toast.error('Veuillez renseigner les horaires de début et de fin')
      return
    }

    if (choixMode === 'designe' && !selectedCoachId) {
      toast.error('Veuillez sélectionner le coach qui vous remplace')
      return
    }

    try {
      setIsSubmitting(true)

      const payload = {
        date: session.date,
        heureDebut,
        heureFin,
        planningId: session.planningId || undefined,
        motif: motif.trim() || undefined,
        coachRemplacantId: choixMode === 'designe' ? selectedCoachId : undefined,
        sansRemplacant: choixMode === 'aucun',
        statut: choixMode === 'designe' ? 'accepte' : choixMode === 'aucun' ? 'sans_remplacant' : 'en_attente',
      }

      const res = await fetch('/api/coach/remplacements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Erreur lors de la déclaration de l\'absence')
      }

      toast.success(data.message || 'Absence enregistrée avec succès')
      onSuccess()
      onClose()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erreur inconnue'
      toast.error(msg)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[92vh]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-absence-title"
      >
        {/* HEADER */}
        <div className="p-5 sm:p-6 bg-linear-to-b from-slate-50 to-white border-b border-slate-100 flex items-start justify-between gap-4 shrink-0">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse" />
              <span className="text-[11px] font-black uppercase tracking-wider text-rose-600">
                Déclaration d&apos;absence
              </span>
            </div>
            <h2 id="modal-absence-title" className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Signaler mon absence
            </h2>
          </div>

          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition-colors"
            aria-label="Fermer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* BODY */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 overflow-y-auto space-y-5">
          {/* RECAP CRÉNEAU SÉLECTIONNÉ */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2.5">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <span className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-cyan-600" />
                <span>{session.dateAffichage}</span>
              </span>

              <span
                className="px-2.5 py-0.5 rounded-md text-xs font-black"
                style={{
                  backgroundColor: session.groupeCouleur ? `${session.groupeCouleur}20` : '#f1f5f9',
                  color: session.groupeCouleur || '#0f172a',
                }}
              >
                {session.groupe}
              </span>
            </div>

            <div className="flex items-center gap-3 text-xs text-slate-500 font-medium flex-wrap">
              <span className="flex items-center gap-1 text-slate-700 font-bold">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                <span>{session.heureDebut} – {session.heureFin}</span>
                <span className="text-slate-400 font-normal">({session.dureeFormattee})</span>
              </span>

              {session.tempsFactureFormatte && session.tempsFactureFormatte !== session.dureeFormattee && (
                <span className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200 text-[10px] font-bold">
                  Temps facturé : {session.tempsFactureFormatte}
                </span>
              )}

              <span className="flex items-center gap-1 text-slate-500">
                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                <span>{session.lieu || 'Piscine'}</span>
              </span>
            </div>
          </div>

          {/* HORAIRES D'ABSENCE PRÉ-REMPLIS */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700">
                Plage horaire d&apos;absence
              </label>
              <span className="text-[10px] font-medium text-emerald-600 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />
                <span>Pré-rempli selon le créneau</span>
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-semibold text-slate-400 block mb-1">
                  Début
                </label>
                <input
                  type="time"
                  required
                  value={heureDebut}
                  onChange={(e) => setHeureDebut(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-cyan-500"
                />
              </div>
              <div>
                <label className="text-[10px] font-semibold text-slate-400 block mb-1">
                  Fin
                </label>
                <input
                  type="time"
                  required
                  value={heureFin}
                  onChange={(e) => setHeureFin(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-cyan-500"
                />
              </div>
            </div>
            <p className="text-[10px] text-slate-400">
              Modifiez ces horaires uniquement en cas d&apos;absence partielle (ex: 30 minutes).
            </p>
          </div>

          {/* MOTIF DE L'ABSENCE */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700">
              Motif de l&apos;absence <span className="text-slate-400 font-normal">(facultatif)</span>
            </label>

            <input
              type="text"
              placeholder="Ex : Raisons familiales, rendez-vous médical..."
              value={motif}
              onChange={(e) => setMotif(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-cyan-500"
            />

            {/* Chips motifs rapides */}
            <div className="flex flex-wrap gap-1.5 pt-1">
              {motifsRapides.map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMotif(m)}
                  className={`text-[11px] px-2.5 py-1 rounded-lg border transition-colors ${
                    motif === m
                      ? 'bg-cyan-50 border-cyan-300 text-cyan-800 font-bold'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>

          {/* CHOIX DU REMPLACEMENT */}
          <div className="space-y-2.5">
            <label className="text-xs font-bold text-slate-700">
              Organisation du remplacement
            </label>

            <div className="space-y-2">
              {/* Option 1 : Désigner un remplaçant */}
              <label
                className={`flex items-start gap-3 p-3.5 rounded-2xl border cursor-pointer transition-all ${
                  choixMode === 'designe'
                    ? 'bg-emerald-50/50 border-emerald-300 ring-1 ring-emerald-300'
                    : 'bg-white border-slate-200 hover:border-slate-300'
                }`}
              >
                <input
                  type="radio"
                  name="choixMode"
                  value="designe"
                  checked={choixMode === 'designe'}
                  onChange={() => setChoixMode('designe')}
                  className="mt-1 text-emerald-600 focus:ring-emerald-500"
                />
                <div className="space-y-2 flex-1">
                  <div>
                    <p className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                      <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Je désigne un entraîneur remplaçant</span>
                    </p>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Validation directe sans attente. Vous et votre collègue recevrez un email de confirmation.
                    </p>
                  </div>

                  {choixMode === 'designe' && (
                    <div className="pt-1.5">
                      <select
                        value={selectedCoachId}
                        onChange={(e) => setSelectedCoachId(e.target.value)}
                        required={choixMode === 'designe'}
                        className="w-full px-3 py-2 bg-white border border-emerald-300 rounded-xl text-xs font-bold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                      >
                        <option value="">-- Choisir un entraîneur du club --</option>
                        {coaches.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.prenom} {c.nom || ''}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              </label>

              {/* Option 2 : Demande ouverte */}
              <label
                className={`flex items-start gap-3 p-3.5 rounded-2xl border cursor-pointer transition-all ${
                  choixMode === 'ouvert'
                    ? 'bg-cyan-50/50 border-cyan-300 ring-1 ring-cyan-300'
                    : 'bg-white border-slate-200 hover:border-slate-300'
                }`}
              >
                <input
                  type="radio"
                  name="choixMode"
                  value="ouvert"
                  checked={choixMode === 'ouvert'}
                  onChange={() => setChoixMode('ouvert')}
                  className="mt-1 text-cyan-600 focus:ring-cyan-500"
                />
                <div>
                  <p className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-cyan-600" />
                    <span>Proposer le créneau à toute l&apos;équipe</span>
                  </p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Le créneau sera affiché dans les « Remplacements à pourvoir » pour tous les entraîneurs.
                  </p>
                </div>
              </label>

              {/* Option 3 : Sans remplaçant */}
              <label
                className={`flex items-start gap-3 p-3.5 rounded-2xl border cursor-pointer transition-all ${
                  choixMode === 'aucun'
                    ? 'bg-slate-100 border-slate-300 ring-1 ring-slate-300'
                    : 'bg-white border-slate-200 hover:border-slate-300'
                }`}
              >
                <input
                  type="radio"
                  name="choixMode"
                  value="aucun"
                  checked={choixMode === 'aucun'}
                  onChange={() => setChoixMode('aucun')}
                  className="mt-1 text-slate-600 focus:ring-slate-500"
                />
                <div>
                  <p className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-slate-500" />
                    <span>Pas de remplaçant nécessaire</span>
                  </p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Cours annulé ou déjà assuré seul par un autre entraîneur présent sur le créneau.
                  </p>
                </div>
              </label>
            </div>
          </div>

          {/* FOOTER ACTIONS */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-bold transition-colors"
            >
              Annuler
            </button>

            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-950 hover:bg-slate-900 text-white text-xs font-black shadow-md transition-all disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Enregistrement...</span>
                </>
              ) : (
                <span>Confirmer mon absence</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
