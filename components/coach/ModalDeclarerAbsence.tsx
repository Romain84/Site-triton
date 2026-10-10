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

function parseTimeToMinutes(t: string): number {
  if (!t) return 0
  const [h, m] = t.split(':').map(Number)
  return (h || 0) * 60 + (m || 0)
}

function formatMinutesHM(min: number): string {
  if (min <= 0) return '0 min'
  const h = Math.floor(min / 60)
  const m = min % 60
  if (h === 0) return `${m} min`
  if (m === 0) return `${h}h00`
  return `${h}h${String(m).padStart(2, '0')}`
}

export default function ModalDeclarerAbsence({
  isOpen,
  onClose,
  onSuccess,
  session,
  coaches,
}: ModalDeclarerAbsenceProps) {
  const [typeDuree, setTypeDuree] = useState<'complete' | 'partielle'>('complete')
  const [heureDebut, setHeureDebut] = useState('')
  const [heureFin, setHeureFin] = useState('')
  const [motif, setMotif] = useState('')
  const [choixMode, setChoixMode] = useState<'designe' | 'ouvert'>('designe')
  const [selectedCoachId, setSelectedCoachId] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (session) {
      setHeureDebut(session.heureDebut)
      setHeureFin(session.heureFin)
      setTypeDuree('complete')
      setMotif('')
      setChoixMode('designe')
      setSelectedCoachId('')
    }
  }, [session, isOpen])

  if (!isOpen || !session) return null

  const dureeSessionMin = Math.max(
    0,
    parseTimeToMinutes(session.heureFin) - parseTimeToMinutes(session.heureDebut)
  )
  const dureeAbsenceMin = Math.max(
    0,
    parseTimeToMinutes(heureFin) - parseTimeToMinutes(heureDebut)
  )

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
      toast.error('Veuillez renseigner les horaires')
      return
    }

    if (parseTimeToMinutes(heureDebut) >= parseTimeToMinutes(heureFin)) {
      toast.error('L\'heure de fin doit être postérieure à l\'heure de début')
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
        sansRemplacant: false,
        statut: choixMode === 'designe' ? 'accepte' : 'en_attente',
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
        <div className="p-5 bg-slate-50/80 border-b border-slate-100 flex items-center justify-between gap-4 shrink-0">
          <h2 id="modal-absence-title" className="text-lg font-black text-slate-900">
            Signaler une absence
          </h2>

          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200/60 transition-colors cursor-pointer"
            aria-label="Fermer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* BODY */}
        <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-4">
          {/* RÉCAPITULATIF SÉANCE */}
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-between gap-3">
            <div className="space-y-0.5 min-w-0">
              <p className="font-extrabold text-sm text-slate-900 truncate">
                {session.groupe}
              </p>
              <p className="text-xs text-slate-500 font-medium">
                {session.dateAffichage} · {session.heureDebut} – {session.heureFin} ({formatMinutesHM(dureeSessionMin)})
              </p>
            </div>
            {session.lieu && (
              <span className="text-[11px] font-bold text-slate-600 bg-white px-2 py-0.5 rounded-md border border-slate-200 shrink-0">
                {session.lieu}
              </span>
            )}
          </div>

          {/* SÉLECTEUR DURÉE : TOUTE LA SÉANCE VS ABSENCE PARTIELLE */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700 block">
              Durée de l&apos;absence
            </label>

            <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-xl">
              <button
                type="button"
                onClick={() => {
                  setTypeDuree('complete')
                  setHeureDebut(session.heureDebut)
                  setHeureFin(session.heureFin)
                }}
                className={`py-2 px-3 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  typeDuree === 'complete'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Toute la séance ({formatMinutesHM(dureeSessionMin)})
              </button>

              <button
                type="button"
                onClick={() => setTypeDuree('partielle')}
                className={`py-2 px-3 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  typeDuree === 'partielle'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Absence partielle
              </button>
            </div>

            {/* HORAIRES SI ABSENCE PARTIELLE */}
            {typeDuree === 'partielle' && (
              <div className="p-3 bg-amber-50/60 border border-amber-200/80 rounded-xl space-y-2.5 animate-in fade-in duration-150">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                      Début d&apos;absence
                    </label>
                    <input
                      type="time"
                      required
                      value={heureDebut}
                      onChange={(e) => setHeureDebut(e.target.value)}
                      className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-800 focus:ring-2 focus:ring-cyan-500"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                      Fin d&apos;absence
                    </label>
                    <input
                      type="time"
                      required
                      value={heureFin}
                      onChange={(e) => setHeureFin(e.target.value)}
                      className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-800 focus:ring-2 focus:ring-cyan-500"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-1.5 text-xs text-amber-900 font-bold">
                  <Clock className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                  <span>
                    Absence : {formatMinutesHM(dureeAbsenceMin)} (sur {formatMinutesHM(dureeSessionMin)} de cours)
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* MOTIF DE L'ABSENCE */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 block">
              Motif <span className="text-slate-400 font-normal">(facultatif)</span>
            </label>

            <input
              type="text"
              placeholder="Ex : Maladie, impératif familial..."
              value={motif}
              onChange={(e) => setMotif(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:ring-2 focus:ring-cyan-500"
            />

            <div className="flex flex-wrap gap-1.5 pt-0.5">
              {motifsRapides.map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMotif(m)}
                  className={`text-[10px] px-2 py-0.5 rounded-md border transition-colors cursor-pointer ${
                    motif === m
                      ? 'bg-slate-900 border-slate-900 text-white font-bold'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>

          {/* CHOIX DU REMPLACEMENT (2 OPTIONS UNIQUEMENT) */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700 block">
              Remplacement
            </label>

            <div className="space-y-2">
              {/* Option 1 : Désigner un coach */}
              <label
                className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
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
                  className="mt-0.5 text-emerald-600 focus:ring-emerald-500"
                />
                <div className="space-y-2 flex-1">
                  <p className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Je désigne un entraîneur remplaçant</span>
                  </p>

                  {choixMode === 'designe' && (
                    <select
                      value={selectedCoachId}
                      onChange={(e) => setSelectedCoachId(e.target.value)}
                      required={choixMode === 'designe'}
                      className="w-full px-3 py-1.5 bg-white border border-emerald-300 rounded-lg text-xs font-bold text-slate-800 focus:ring-2 focus:ring-emerald-500"
                    >
                      <option value="">-- Sélectionner un entraîneur --</option>
                      {coaches.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.prenom} {c.nom || ''}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              </label>

              {/* Option 2 : Demande ouverte */}
              <label
                className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                  choixMode === 'ouvert'
                    ? 'bg-sky-50/50 border-sky-300 ring-1 ring-sky-300'
                    : 'bg-white border-slate-200 hover:border-slate-300'
                }`}
              >
                <input
                  type="radio"
                  name="choixMode"
                  value="ouvert"
                  checked={choixMode === 'ouvert'}
                  onChange={() => setChoixMode('ouvert')}
                  className="mt-0.5 text-sky-600 focus:ring-sky-500"
                />
                <div>
                  <p className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-sky-600" />
                    <span>Proposer le créneau à toute l&apos;équipe</span>
                  </p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Le remplacement sera visible par tous les entraîneurs dans « À pourvoir ».
                  </p>
                </div>
              </label>
            </div>
          </div>

          {/* ACTIONS */}
          <div className="pt-2 border-t border-slate-100 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-3.5 py-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-bold transition-colors cursor-pointer"
            >
              Annuler
            </button>

            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-950 hover:bg-slate-900 text-white text-xs font-black shadow-xs transition-all disabled:opacity-50 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
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
