'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import toast from 'react-hot-toast'
import { useConfirmDialog } from '@/components/ConfirmDialog'
import { getErrorMessage } from '@/lib/utils'
import ModalAnnulerSeance from '@/components/admin/ModalAnnulerSeance'

interface SeanceAnnulee {
  id: string
  date: string
  motif: string | null
  planningId: string | null
  groupeId: string | null
  coachId: string | null
  createdAt: string
  coachNom?: string | null
  groupeNom?: string | null
  planningInfo?: {
    jourSemaine: string
    heureDebut: string
    heureFin: string
    groupeNom: string
    tempsFacture?: number | null
    coachsNoms: string
  } | null
}

export default function SeancesAnnuleesManager() {
  const [cancellations, setCancellations] = useState<SeanceAnnulee[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [filterPeriod, setFilterPeriod] = useState<'all' | 'upcoming' | 'past'>('all')
  const [searchTerm, setSearchTerm] = useState('')
  const { confirm } = useConfirmDialog()

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/admin/seances-annulees')
      if (res.ok) {
        const data = await res.json()
        setCancellations(data)
      } else {
        throw new Error('Erreur de chargement')
      }
    } catch (err) {
      setError('Erreur lors du chargement des séances annulées')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleDelete = async (id: string) => {
    const confirmed = await confirm({
      title: 'Supprimer l\'annulation',
      message: 'Voulez-vous vraiment réactiver cette séance ? Les heures prévues seront de nouveau rémunérées aux coachs concernés sur leur facture.',
      confirmText: 'Réactiver la séance',
      variant: 'danger',
    })
    if (!confirmed) return

    try {
      const response = await fetch(`/api/admin/seances-annulees/${id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Erreur lors de la suppression')
      }

      await fetchData()
      toast.success('Annulation supprimée, séance réactivée')
    } catch (err) {
      const message = getErrorMessage(err)
      toast.error(message)
      setError(message)
    }
  }

  // Filtrage
  const now = new Date()
  now.setHours(0, 0, 0, 0)

  const filteredCancellations = useMemo(() => {
    return cancellations.filter((c) => {
      const cDate = new Date(c.date)
      cDate.setHours(0, 0, 0, 0)

      if (filterPeriod === 'upcoming' && cDate < now) return false
      if (filterPeriod === 'past' && cDate >= now) return false

      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase().trim()
        const motif = (c.motif || '').toLowerCase()
        const coach = (c.coachNom || '').toLowerCase()
        const groupe = (c.groupeNom || '').toLowerCase()
        const planning = c.planningInfo
          ? `${c.planningInfo.groupeNom} ${c.planningInfo.coachsNoms} ${c.planningInfo.heureDebut}`.toLowerCase()
          : ''
        if (!motif.includes(term) && !coach.includes(term) && !groupe.includes(term) && !planning.includes(term)) {
          return false
        }
      }

      return true
    })
  }, [cancellations, filterPeriod, searchTerm, now])

  // Statistiques
  const stats = useMemo(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const upcoming = cancellations.filter((c) => new Date(c.date) >= today).length
    const thisMonth = cancellations.filter((c) => {
      const d = new Date(c.date)
      return d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear()
    }).length

    return {
      total: cancellations.length,
      upcoming,
      thisMonth,
    }
  }, [cancellations])

  const getTargetBadge = (c: SeanceAnnulee) => {
    if (c.planningInfo) {
      return (
        <div className="flex flex-col gap-0.5">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-purple-50 text-purple-800 border border-purple-200">
            <span>📅</span>
            <span>{c.planningInfo.heureDebut} – {c.planningInfo.heureFin} : {c.planningInfo.groupeNom}</span>
          </span>
          {c.planningInfo.coachsNoms && (
            <span className="text-[11px] text-slate-500 pl-1">
              Coach : <span className="font-semibold text-slate-700">{c.planningInfo.coachsNoms}</span>
            </span>
          )}
        </div>
      )
    }

    if (c.coachNom) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-indigo-50 text-indigo-800 border border-indigo-200">
          <span>👤</span>
          <span>Coach : {c.coachNom}</span>
        </span>
      )
    }

    if (c.groupeNom) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-cyan-50 text-cyan-800 border border-cyan-200">
          <span>👥</span>
          <span>Groupe : {c.groupeNom}</span>
        </span>
      )
    }

    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-rose-50 text-rose-800 border border-rose-200">
        <span>🏊</span>
        <span>Piscine fermée (Tous les cours)</span>
      </span>
    )
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        <span className="ml-3 text-slate-600 font-medium text-sm">Chargement des séances annulées...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-2xl">🚫</span>
            <h2 className="text-2xl font-black text-slate-800">Séances Annulées & Exceptions</h2>
          </div>
          <p className="text-slate-600 text-sm mt-1">
            Déclarez des fermetures exceptionnelles (piscine fermée, vidange, jour férié). Déduit automatiquement le temps facturé sur chaque coach sans avoir à créer d'absence individuelle.
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="px-4 py-2.5 bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-700 hover:to-rose-800 text-white rounded-xl shadow-md transition-all font-bold text-sm flex items-center gap-2 shrink-0"
        >
          <span>+</span>
          <span>Annuler une séance / Fermeture</span>
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-xl text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Cartes métriques */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-lg">
            📋
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total exceptions</div>
            <div className="text-xl font-black text-slate-800">{stats.total}</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center text-lg">
            ⏳
          </div>
          <div>
            <div className="text-xs font-semibold text-amber-700 uppercase tracking-wider">À venir</div>
            <div className="text-xl font-black text-amber-900">{stats.upcoming}</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-700 flex items-center justify-center text-lg">
            🗓️
          </div>
          <div>
            <div className="text-xs font-semibold text-rose-700 uppercase tracking-wider">Ce mois-ci</div>
            <div className="text-xl font-black text-rose-900">{stats.thisMonth}</div>
          </div>
        </div>
      </div>

      {/* Barre d'outils et filtres */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 w-full sm:w-auto">
          <button
            onClick={() => setFilterPeriod('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              filterPeriod === 'all'
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Toutes ({cancellations.length})
          </button>
          <button
            onClick={() => setFilterPeriod('upcoming')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              filterPeriod === 'upcoming'
                ? 'bg-amber-600 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            À venir ({stats.upcoming})
          </button>
          <button
            onClick={() => setFilterPeriod('past')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              filterPeriod === 'past'
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Passées
          </button>
        </div>

        <div className="w-full sm:w-72">
          <input
            type="text"
            placeholder="Rechercher (motif, groupe, coach)..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-3.5 py-1.5 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-primary focus:border-transparent"
          />
        </div>
      </div>

      {/* Tableau des annulations */}
      <div className="card overflow-hidden bg-white rounded-2xl border border-slate-200 shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-600 uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Date de la séance</th>
                <th className="py-3 px-4">Portée & Impact</th>
                <th className="py-3 px-4">Motif d'annulation</th>
                <th className="py-3 px-4 text-center">Enregistrée le</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {filteredCancellations.map((c) => {
                const cDate = new Date(c.date)
                const isUpcoming = cDate >= now

                return (
                  <tr key={c.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-800 capitalize">
                          {cDate.toLocaleDateString('fr-FR', {
                            weekday: 'long',
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric',
                          })}
                        </span>
                        {isUpcoming && (
                          <span className="text-[10px] font-bold uppercase tracking-wider bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded">
                            À venir
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3.5 px-4">{getTargetBadge(c)}</td>
                    <td className="py-3.5 px-4 font-medium text-slate-700">
                      {c.motif || <span className="text-slate-400 italic">Piscine fermée</span>}
                    </td>
                    <td className="py-3.5 px-4 text-center text-xs text-slate-500">
                      {new Date(c.createdAt).toLocaleDateString('fr-FR')}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => handleDelete(c.id)}
                        className="text-red-600 hover:text-red-800 text-xs font-bold transition-colors bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-lg border border-red-200"
                        title="Réactiver cette séance"
                      >
                        Réactiver
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {filteredCancellations.length === 0 && (
          <div className="text-center py-16 text-slate-500 bg-slate-50/30">
            <p className="text-4xl mb-3">🏊</p>
            <p className="font-bold text-base text-slate-700">Aucune séance annulée pour ce filtre</p>
            <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
              Toutes les séances se déroulent normalement. Pour enregistrer une fermeture de piscine ou une séance annulée, cliquez sur le bouton ci-dessus.
            </p>
          </div>
        )}
      </div>

      {/* Modale d'annulation en 1 clic */}
      <ModalAnnulerSeance
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={() => fetchData()}
      />
    </div>
  )
}
