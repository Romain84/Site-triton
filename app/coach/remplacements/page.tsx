'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { formatCompactDateFr } from '@/lib/date'

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
  const [activeTab, setActiveTab] = useState<'ouvertes' | 'declarer' | 'historique'>('ouvertes')
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
      toast.error('Erreur lors du chargement des données')
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
        toast.success(data.message || 'Remplacement accepté avec succès !')
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
          coachRemplacantId: coachRemplacantId || null,
        }),
      })

      const data = await res.json()
      if (res.ok) {
        toast.success(data.message || 'Absence enregistrée !')
        setDate('')
        setMotif('')
        setDescription('')
        setCoachRemplacantId('')
        setActiveTab('historique')
        fetchData()
      } else {
        toast.error(data.error || 'Erreur lors de l\'enregistrement')
      }
    } catch {
      toast.error('Erreur de connexion')
    } finally {
      setSubmitting(false)
    }
  }

  const formatHours = (hD: string, hF: string) => {
    const [h1, m1] = hD.split(':').map(Number)
    const [h2, m2] = hF.split(':').map(Number)
    const mins = (h2 * 60 + m2) - (h1 * 60 + m1)
    const hrs = Math.max(0.5, mins / 60)
    return `${hrs}h`
  }

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Link href="/coach/dashboard" className="text-xs font-bold text-slate-400 hover:text-slate-600 transition-colors">
                ← Tableau de bord
              </Link>
            </div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
              <span>🔄</span> Bourse des Remplacements
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Proposez vos absences et prenez les remplacements de vos collègues. La facturation des 2 coachs est automatiquement mise à jour.
            </p>
          </div>

          <button
            onClick={() => setActiveTab('declarer')}
            className="px-4 py-2.5 bg-primary text-white rounded-xl hover:bg-primary-dark font-bold text-xs uppercase tracking-wider shadow-sm transition-all flex items-center gap-2 self-start sm:self-auto"
          >
            <span>➕</span> Déclarer une absence
          </button>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div
            onClick={() => setActiveTab('ouvertes')}
            className={`cursor-pointer p-4 rounded-xl border transition-all ${
              activeTab === 'ouvertes' ? 'bg-amber-500/10 border-amber-500/40' : 'bg-white border-slate-200/80 hover:border-slate-300'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-amber-700">Créneaux à pourvoir</span>
              <span className="text-xl">🙋‍♂️</span>
            </div>
            <p className="text-2xl font-black text-slate-900 mt-1">{demandesOuvertes.length}</p>
            <p className="text-[11px] text-slate-500">Demandes en attente d&apos;un remplaçant</p>
          </div>

          <div
            onClick={() => setActiveTab('historique')}
            className={`cursor-pointer p-4 rounded-xl border transition-all ${
              activeTab === 'historique' ? 'bg-blue-500/10 border-blue-500/40' : 'bg-white border-slate-200/80 hover:border-slate-300'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-blue-700">Mes absences</span>
              <span className="text-xl">📅</span>
            </div>
            <p className="text-2xl font-black text-slate-900 mt-1">{mesAbsences.length}</p>
            <p className="text-[11px] text-slate-500">Absences que j&apos;ai déclarées</p>
          </div>

          <div
            onClick={() => setActiveTab('historique')}
            className={`cursor-pointer p-4 rounded-xl border transition-all ${
              activeTab === 'historique' ? 'bg-emerald-500/10 border-emerald-500/40' : 'bg-white border-slate-200/80 hover:border-slate-300'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-700">Mes remplacements</span>
              <span className="text-xl">✅</span>
            </div>
            <p className="text-2xl font-black text-slate-900 mt-1">{mesRemplacements.length}</p>
            <p className="text-[11px] text-slate-500">Remplacements effectués par mes soins</p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex bg-slate-200/60 p-1.5 rounded-xl gap-1 text-xs font-bold">
          <button
            onClick={() => setActiveTab('ouvertes')}
            className={`flex-1 py-2.5 rounded-lg transition-all flex items-center justify-center gap-2 ${
              activeTab === 'ouvertes' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>🙋‍♂️</span> Créneaux à pourvoir ({demandesOuvertes.length})
          </button>

          <button
            onClick={() => setActiveTab('declarer')}
            className={`flex-1 py-2.5 rounded-lg transition-all flex items-center justify-center gap-2 ${
              activeTab === 'declarer' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>➕</span> Déclarer une absence
          </button>

          <button
            onClick={() => setActiveTab('historique')}
            className={`flex-1 py-2.5 rounded-lg transition-all flex items-center justify-center gap-2 ${
              activeTab === 'historique' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>📋</span> Mon historique ({mesAbsences.length + mesRemplacements.length})
          </button>
        </div>

        {/* Tab 1: Créneaux à pourvoir */}
        {activeTab === 'ouvertes' && (
          <div className="space-y-4">
            {loading ? (
              <div className="bg-white p-8 text-center text-slate-400 rounded-2xl border border-slate-200">
                Chargement des créneaux...
              </div>
            ) : demandesOuvertes.length === 0 ? (
              <div className="bg-white p-12 text-center rounded-2xl border border-slate-200/80 shadow-xs">
                <span className="text-4xl block mb-2">✨</span>
                <h3 className="text-base font-bold text-slate-900">Aucune demande de remplacement en attente</h3>
                <p className="text-xs text-slate-500 mt-1">Tous les créneaux des autres coachs sont actuellement assurés.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {demandesOuvertes.map((item) => (
                  <div key={item.id} className="bg-white p-5 rounded-2xl border border-amber-200 shadow-sm flex flex-col justify-between space-y-4 hover:border-amber-400 transition-colors">
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                          À remplacer
                        </span>
                        <span className="text-xs font-mono font-bold text-slate-600">
                          ⏱️ {formatHours(item.heureDebut, item.heureFin)}
                        </span>
                      </div>

                      <h3 className="text-base font-black text-slate-900">
                        {formatCompactDateFr(item.date)} ({item.heureDebut} - {item.heureFin})
                      </h3>

                      <p className="text-xs font-semibold text-slate-700 mt-1">
                        👤 Coach absent : <span className="text-primary font-bold">{item.coachRemplace?.prenom} {item.coachRemplace?.nom}</span>
                      </p>

                      {item.motif && (
                        <p className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-200/60 mt-3 italic">
                          💡 &quot;{item.motif}&quot;
                        </p>
                      )}
                    </div>

                    <button
                      disabled={submitting}
                      onClick={() => handleAccepter(item.id)}
                      className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-sm active:scale-[0.98] flex items-center justify-center gap-2"
                    >
                      <span>🙋‍♂️</span> Prendre ce remplacement
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Formulaire déclaration d'absence */}
        {activeTab === 'declarer' && (
          <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200/80 shadow-xs">
            <h2 className="text-lg font-bold text-slate-900 mb-2">Déclarer une absence & demander un remplacement</h2>
            <p className="text-xs text-slate-500 mb-6">
              Remplissez les informations de votre absence. Dès qu&apos;un collègue acceptera ou si vous lui désignez un coach, les lignes de facturation seront automatiquement créées pour vous deux.
            </p>

            <form onSubmit={handleSubmitAbsence} className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                    Date du créneau *
                  </label>
                  <input
                    type="date"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-primary focus:border-transparent font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                    Heure début *
                  </label>
                  <input
                    type="time"
                    required
                    value={heureDebut}
                    onChange={(e) => setHeureDebut(e.target.value)}
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-primary focus:border-transparent font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                    Heure fin *
                  </label>
                  <input
                    type="time"
                    required
                    value={heureFin}
                    onChange={(e) => setHeureFin(e.target.value)}
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-primary focus:border-transparent font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  Groupe / Lieu / Motif (Optionnel)
                </label>
                <input
                  type="text"
                  placeholder="ex: Groupe Avenir - Grand Bassin (Déplacement pro)"
                  value={motif}
                  onChange={(e) => setMotif(e.target.value)}
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  Designation directe du coach remplaçant (Optionnel)
                </label>
                <select
                  value={coachRemplacantId}
                  onChange={(e) => setCoachRemplacantId(e.target.value)}
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-primary focus:border-transparent bg-white"
                >
                  <option value="">-- Proposer à tous les coachs (ouvert) --</option>
                  {coaches.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.prenom} {c.nom}
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-slate-500 mt-1">
                  Si vous laissez vide, la demande sera publiée sur la bourse des remplacements pour tous les coachs.
                </p>
              </div>

              <div className="pt-2 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setActiveTab('ouvertes')}
                  className="px-5 py-2.5 border border-slate-300 text-slate-700 hover:bg-slate-50 font-bold text-xs uppercase tracking-wider rounded-xl transition-all"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2.5 bg-primary text-white hover:bg-primary-dark font-bold text-xs uppercase tracking-wider rounded-xl shadow-sm transition-all"
                >
                  {submitting ? 'Envoi...' : 'Valider la demande'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Tab 3: Historique */}
        {activeTab === 'historique' && (
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="p-6 border-b border-slate-200/60">
              <h2 className="text-lg font-bold text-slate-900">Mon historique des absences & remplacements</h2>
            </div>

            <div className="divide-y divide-slate-100">
              {mesAbsences.length === 0 && mesRemplacements.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-sm">
                  Aucun historique pour le moment.
                </div>
              ) : (
                <>
                  {mesAbsences.map((abs) => (
                    <div key={abs.id} className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/60 transition-colors">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 bg-blue-100 text-blue-800 text-[10px] font-black uppercase rounded">
                            Mon absence
                          </span>
                          {abs.statut === 'accepte' ? (
                            <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-black uppercase rounded">
                              Remplacé(e) par {abs.coachRemplacant?.prenom} {abs.coachRemplacant?.nom}
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 bg-amber-100 text-amber-800 text-[10px] font-black uppercase rounded">
                              En attente d&apos;un remplaçant
                            </span>
                          )}
                        </div>
                        <p className="font-bold text-slate-900 text-sm">
                          {formatCompactDateFr(abs.date)} ({abs.heureDebut} - {abs.heureFin})
                        </p>
                        {abs.motif && <p className="text-xs text-slate-500">{abs.motif}</p>}
                      </div>

                      <div className="text-right text-xs font-mono font-bold text-slate-600">
                        {abs.statut === 'accepte' ? (
                          <span className="text-emerald-700 font-bold block">✓ Facture synchronisée</span>
                        ) : (
                          <span className="text-amber-600 font-medium block">⏱️ En attente</span>
                        )}
                      </div>
                    </div>
                  ))}

                  {mesRemplacements.map((rem) => (
                    <div key={rem.id} className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/60 transition-colors bg-emerald-50/20">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-black uppercase rounded">
                            Remplacement pris par moi
                          </span>
                        </div>
                        <p className="font-bold text-slate-900 text-sm">
                          {formatCompactDateFr(rem.date)} ({rem.heureDebut} - {rem.heureFin})
                        </p>
                        <p className="text-xs text-slate-600">
                          Coach remplacé(e) : <strong className="text-slate-900">{rem.coachRemplace?.prenom} {rem.coachRemplace?.nom}</strong>
                        </p>
                      </div>

                      <div className="text-right text-xs font-mono font-bold text-emerald-700">
                        ✓ Ajouté à ma facture
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
