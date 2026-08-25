'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import CoachNav from '@/components/coach/CoachNav'
import toast from 'react-hot-toast'
import {
  Repeat,
  Clock,
  User,
  Plus,
  CheckCircle2,
  Calendar,
  AlertCircle,
  Sparkles,
  ArrowRight,
  Loader2,
  Send
} from 'lucide-react'

interface Coach {
  id: string
  prenom: string
  nom: string | null
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

export default function CoachRemplacementsPage() {
  const [activeTab, setActiveTab] = useState<'ouvertes' | 'mes_absences' | 'declarer'>('ouvertes')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  const [demandesOuvertes, setDemandesOuvertes] = useState<Remplacement[]>([])
  const [mesAbsences, setMesAbsences] = useState<Remplacement[]>([])
  const [mesRemplacements, setMesRemplacements] = useState<Remplacement[]>([])
  const [coaches, setCoaches] = useState<Coach[]>([])

  // Form state
  const [date, setDate] = useState('')
  const [heureDebut, setHeureDebut] = useState('18:00')
  const [heureFin, setHeureFin] = useState('19:30')
  const [motif, setMotif] = useState('')
  const [description, setDescription] = useState('')
  const [coachRemplacantId, setCoachRemplacantId] = useState('')

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      const [resRemplacements, resCoaches] = await Promise.all([
        fetch('/api/coach/remplacements'),
        fetch('/api/coach/coaches'),
      ])

      if (resRemplacements.ok) {
        const data = await resRemplacements.json()
        setDemandesOuvertes(data.demandesOuvertes || [])
        setMesAbsences(data.mesAbsences || [])
        setMesRemplacements(data.mesRemplacements || [])
      }

      if (resCoaches.ok) {
        const data = await resCoaches.json()
        setCoaches(data.coaches || [])
      }
    } catch {
      toast.error('Erreur lors du chargement des remplacements')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleAccepter = async (id: string) => {
    try {
      setSubmitting(true)
      const res = await fetch(`/api/coach/remplacements/${id}/accepter`, {
        method: 'POST',
      })

      const data = await res.json()
      if (res.ok) {
        toast.success('Remplacement accepté avec succès !')
        fetchData()
      } else {
        toast.error(data.error || 'Erreur lors de l\'acceptation')
      }
    } catch {
      toast.error('Erreur réseau')
    } finally {
      setSubmitting(false)
    }
  }

  const handleSubmitAbsence = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!date || !heureDebut || !heureFin) {
      toast.error('Veuillez remplir la date et les horaires')
      return
    }

    try {
      setSubmitting(true)
      const res = await fetch('/api/coach/remplacements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date,
          heureDebut,
          heureFin,
          motif,
          description,
          coachRemplacantId: coachRemplacantId || undefined,
        }),
      })

      const data = await res.json()
      if (res.ok) {
        toast.success('Votre demande d\'absence a été transmise !')
        setDate('')
        setMotif('')
        setDescription('')
        setCoachRemplacantId('')
        setActiveTab('mes_absences')
        fetchData()
      } else {
        toast.error(data.error || 'Erreur lors de la déclaration')
      }
    } catch {
      toast.error('Erreur lors de la soumission')
    } finally {
      setSubmitting(false)
    }
  }

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

        {/* HEADER & TABS */}
        <header className="bg-white border border-slate-200/80 rounded-3xl p-5 sm:p-7 shadow-xs space-y-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-800 text-[11px] font-extrabold uppercase tracking-wider mb-1.5">
              <Repeat className="w-3 h-3 text-indigo-600" />
              <span>Solidarité & Remplacements</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-950 tracking-tight">
              Remplacements & Absences
            </h1>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Déclarez une absence ou venez en renfort auprès de vos collègues entraîneurs.
            </p>
          </div>

          {/* TABS PILLS */}
          <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-100">
            <button
              onClick={() => setActiveTab('ouvertes')}
              className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 ${
                activeTab === 'ouvertes'
                  ? 'bg-slate-950 text-white shadow-xs'
                  : 'bg-slate-50 text-slate-700 hover:bg-slate-100'
              }`}
            >
              <span>Demandes ouvertes</span>
              <span className={`px-1.5 py-0.2 text-[10px] rounded-full font-bold ${
                activeTab === 'ouvertes' ? 'bg-slate-800 text-cyan-400' : 'bg-slate-200 text-slate-700'
              }`}>
                {demandesOuvertes.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('mes_absences')}
              className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 ${
                activeTab === 'mes_absences'
                  ? 'bg-slate-950 text-white shadow-xs'
                  : 'bg-slate-50 text-slate-700 hover:bg-slate-100'
              }`}
            >
              <span>Mes absences</span>
              <span className={`px-1.5 py-0.2 text-[10px] rounded-full font-bold ${
                activeTab === 'mes_absences' ? 'bg-slate-800 text-cyan-400' : 'bg-slate-200 text-slate-700'
              }`}>
                {mesAbsences.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('declarer')}
              className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 ${
                activeTab === 'declarer'
                  ? 'bg-cyan-600 text-white shadow-xs'
                  : 'bg-cyan-50 text-cyan-800 hover:bg-cyan-100'
              }`}
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Déclarer une absence</span>
            </button>
          </div>
        </header>

        {/* CONTENT TABS */}
        <section>
          {loading ? (
            <div className="bg-white border border-slate-200/80 rounded-3xl p-12 text-center space-y-2">
              <Loader2 className="w-6 h-6 animate-spin mx-auto text-cyan-600" />
              <p className="text-xs text-slate-500 font-bold">Chargement...</p>
            </div>
          ) : activeTab === 'ouvertes' ? (
            <div className="space-y-3">
              {demandesOuvertes.length === 0 ? (
                <div className="bg-white border border-slate-200/80 rounded-3xl p-12 text-center space-y-2">
                  <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 mx-auto flex items-center justify-center">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <p className="text-sm font-bold text-slate-700">Aucune demande de remplacement en attente</p>
                  <p className="text-xs text-slate-400">Tous les entraînements sont actuellement couverts !</p>
                </div>
              ) : (
                demandesOuvertes.map((demande) => (
                  <div key={demande.id} className="p-4 sm:p-5 rounded-2xl bg-white border border-amber-200 shadow-xs space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="px-2.5 py-0.5 rounded-lg text-xs font-black bg-slate-900 text-white">
                            {demande.heureDebut} - {demande.heureFin}
                          </span>
                          <span className="text-xs font-extrabold text-slate-900">
                            {formatDateFr(demande.date)}
                          </span>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-900">
                            À remplacer
                          </span>
                        </div>
                        <p className="text-xs font-bold text-slate-700">
                          Entraîneur : {demande.coachRemplace?.prenom} {demande.coachRemplace?.nom || ''}
                        </p>
                        {demande.motif && (
                          <p className="text-xs text-slate-500 italic">
                            Motif : {demande.motif}
                          </p>
                        )}
                      </div>

                      <button
                        onClick={() => handleAccepter(demande.id)}
                        disabled={submitting}
                        className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black transition-all shadow-xs disabled:opacity-50"
                      >
                        <Sparkles className="w-4 h-4" />
                        <span>Je remplace mon collègue</span>
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          ) : activeTab === 'mes_absences' ? (
            <div className="space-y-3">
              {mesAbsences.length === 0 ? (
                <div className="bg-white border border-slate-200/80 rounded-3xl p-12 text-center space-y-2">
                  <p className="text-sm font-bold text-slate-700">Vous n&apos;avez déclaré aucune absence</p>
                  <p className="text-xs text-slate-400">Si vous avez un imprévu, cliquez sur &quot;Déclarer une absence&quot;.</p>
                </div>
              ) : (
                mesAbsences.map((abs) => (
                  <div key={abs.id} className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200/80 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="px-2.5 py-0.5 rounded-lg text-xs font-black bg-slate-900 text-white">
                          {abs.heureDebut} - {abs.heureFin}
                        </span>
                        <span className="text-xs font-extrabold text-slate-900">
                          {formatDateFr(abs.date)}
                        </span>
                      </div>

                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                        abs.statut === 'accepte'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}>
                        {abs.statut === 'accepte' ? 'Remplacé' : 'En attente'}
                      </span>
                    </div>

                    {abs.coachRemplacant && (
                      <p className="text-xs font-semibold text-emerald-700 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Remplacé par {abs.coachRemplacant.prenom} {abs.coachRemplacant.nom || ''}</span>
                      </p>
                    )}
                  </div>
                ))
              )}
            </div>
          ) : (
            /* FORMULAIRE DE DECLARATION D'ABSENCE */
            <form onSubmit={handleSubmitAbsence} className="bg-white border border-slate-200/80 rounded-3xl p-5 sm:p-7 shadow-xs space-y-5">
              <h2 className="text-base font-black text-slate-950">
                Déclarer une absence / Demander un remplaçant
              </h2>

              <div className="grid sm:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Date de l&apos;absence *</label>
                  <input
                    type="date"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-900 focus:bg-white focus:border-cyan-500 focus:outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Heure de début *</label>
                  <input
                    type="time"
                    required
                    value={heureDebut}
                    onChange={(e) => setHeureDebut(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-900 focus:bg-white focus:border-cyan-500 focus:outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Heure de fin *</label>
                  <input
                    type="time"
                    required
                    value={heureFin}
                    onChange={(e) => setHeureFin(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-900 focus:bg-white focus:border-cyan-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Motif (optionnel)</label>
                  <input
                    type="text"
                    placeholder="Ex: Déplacement, maladie, examen..."
                    value={motif}
                    onChange={(e) => setMotif(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:bg-white focus:border-cyan-500 focus:outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Collègue déjà prévenu (optionnel)</label>
                  <select
                    value={coachRemplacantId}
                    onChange={(e) => setCoachRemplacantId(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:bg-white focus:border-cyan-500 focus:outline-none"
                  >
                    <option value="">Tous les coachs (ouvert à tous)</option>
                    {coaches.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.prenom} {c.nom || ''}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setActiveTab('ouvertes')}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-slate-950 hover:bg-slate-800 text-white text-xs font-extrabold shadow-xs transition-all disabled:opacity-50"
                >
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  <span>Envoyer la demande</span>
                </button>
              </div>
            </form>
          )}
        </section>
      </div>
    </div>
  )
}
