'use client'

import { useState, useEffect, useCallback } from 'react'
import toast from 'react-hot-toast'
import { useConfirmDialog } from '@/components/ConfirmDialog'
import { getErrorMessage } from '@/lib/utils'

interface SeanceAnnulee {
  id: string
  date: string
  motif: string | null
  planningId: string | null
  groupeId: string | null
  coachId: string | null
  createdAt: string
}

interface Coach {
  id: string
  prenom: string
  nom: string | null
}

interface Groupe {
  id: string
  nom: string
}

interface Planning {
  id: string
  jourSemaine: string
  heureDebut: string
  heureFin: string
  groupe?: { nom: string }
}

export default function SeancesAnnuleesManager() {
  const [cancellations, setCancellations] = useState<SeanceAnnulee[]>([])
  const [coaches, setCoaches] = useState<Coach[]>([])
  const [groupes, setGroupes] = useState<Groupe[]>([])
  const [plannings, setPlannings] = useState<Planning[]>([])

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showForm, setShowForm] = useState(false)
  const { confirm } = useConfirmDialog()

  // Form states
  const [date, setDate] = useState('')
  const [motif, setMotif] = useState('')
  const [targetType, setTargetType] = useState<'general' | 'coach' | 'groupe' | 'planning'>('general')
  const [coachId, setCoachId] = useState('')
  const [groupeId, setGroupeId] = useState('')
  const [planningId, setPlanningId] = useState('')

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      const [resCancellations, resCoaches, resGroupes, resPlannings] = await Promise.all([
        fetch('/api/admin/seances-annulees'),
        fetch('/api/admin/coaches'),
        fetch('/api/admin/groupes'),
        fetch('/api/admin/planning-fixe'),
      ])

      if (resCancellations.ok) {
        const data = await resCancellations.json()
        setCancellations(data)
      }

      if (resCoaches.ok) {
        const data = await resCoaches.json()
        setCoaches(data.coaches || data)
      }

      if (resGroupes.ok) {
        const data = await resGroupes.json()
        setGroupes(data.groupes || data)
      }

      if (resPlannings.ok) {
        const data = await resPlannings.json()
        setPlannings(data.plannings || data)
      }
    } catch (err) {
      setError('Erreur lors du chargement des données')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const resetForm = () => {
    setDate('')
    setMotif('')
    setTargetType('general')
    setCoachId('')
    setGroupeId('')
    setPlanningId('')
    setShowForm(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!date) {
      toast.error('La date est obligatoire')
      return
    }

    try {
      const response = await fetch('/api/admin/seances-annulees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date,
          motif: motif.trim() || null,
          coachId: targetType === 'coach' ? coachId : null,
          groupeId: targetType === 'groupe' ? groupeId : null,
          planningId: targetType === 'planning' ? planningId : null,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Erreur lors de l\'enregistrement')
      }

      await fetchData()
      resetForm()
      toast.success('Annulation enregistrée avec succès')
    } catch (err) {
      const message = getErrorMessage(err)
      toast.error(message)
      setError(message)
    }
  }

  const handleDelete = async (id: string) => {
    const confirmed = await confirm({
      title: 'Supprimer l\'annulation',
      message: 'Voulez-vous vraiment annuler cette exception ? Les heures de cette séance seront de nouveau facturées aux coachs.',
      confirmText: 'Supprimer',
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
      toast.success('Annulation supprimée')
    } catch (err) {
      const message = getErrorMessage(err)
      toast.error(message)
      setError(message)
    }
  }

  const getTargetDescription = (cancellation: SeanceAnnulee) => {
    if (cancellation.coachId) {
      const coach = coaches.find((c) => c.id === cancellation.coachId)
      return `Coach : ${coach ? `${coach.prenom} ${coach.nom || ''}`.trim() : 'Inconnu'}`
    }
    if (cancellation.groupeId) {
      const groupe = groupes.find((g) => g.id === cancellation.groupeId)
      return `Groupe : ${groupe ? groupe.nom : 'Inconnu'}`
    }
    if (cancellation.planningId) {
      const planning = plannings.find((p) => p.id === cancellation.planningId)
      return `Créneau : ${planning ? `${planning.jourSemaine} ${planning.heureDebut}-${planning.heureFin}` : 'Inconnu'}`
    }
    return 'Générale (Tous les cours)'
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        <span className="ml-3 text-gray-600">Chargement des données...</span>
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold">Séances Annulées & Exceptions</h2>
          <p className="text-gray-600 text-sm mt-1">
            Déclarez des annulations exceptionnelles pour les déduire automatiquement des calculs de facturation
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors font-medium flex items-center gap-2"
        >
          {showForm ? 'Annuler' : '+ Déclarer une exception'}
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6 rounded">
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {/* Form */}
      {showForm && (
        <div className="card p-6 mb-6 bg-white/80 backdrop-blur border border-slate-200 rounded-xl shadow-lg">
          <h3 className="text-xl font-bold mb-4 text-slate-800">
            Enregistrer une Annulation de Séance
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Date de l'annulation *
                </label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Motif d'annulation
                </label>
                <input
                  type="text"
                  value={motif}
                  onChange={(e) => setMotif(e.target.value)}
                  placeholder="Ex: Vidange piscine, Jour férié, Panne technique..."
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Cible de l'annulation
              </label>
              <div className="flex flex-wrap gap-4 p-2 bg-slate-50 rounded-lg border border-slate-200">
                <label className="flex items-center text-sm cursor-pointer">
                  <input
                    type="radio"
                    name="targetType"
                    checked={targetType === 'general'}
                    onChange={() => setTargetType('general')}
                    className="w-4 h-4 text-primary focus:ring-primary mr-2"
                  />
                  Générale (Tout le club)
                </label>
                <label className="flex items-center text-sm cursor-pointer">
                  <input
                    type="radio"
                    name="targetType"
                    checked={targetType === 'coach'}
                    onChange={() => setTargetType('coach')}
                    className="w-4 h-4 text-primary focus:ring-primary mr-2"
                  />
                  Coach spécifique
                </label>
                <label className="flex items-center text-sm cursor-pointer">
                  <input
                    type="radio"
                    name="targetType"
                    checked={targetType === 'groupe'}
                    onChange={() => setTargetType('groupe')}
                    className="w-4 h-4 text-primary focus:ring-primary mr-2"
                  />
                  Groupe spécifique
                </label>
                <label className="flex items-center text-sm cursor-pointer">
                  <input
                    type="radio"
                    name="targetType"
                    checked={targetType === 'planning'}
                    onChange={() => setTargetType('planning')}
                    className="w-4 h-4 text-primary focus:ring-primary mr-2"
                  />
                  Créneau spécifique
                </label>
              </div>
            </div>

            {/* Target Selectors */}
            {targetType === 'coach' && (
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Sélectionner le coach impacté
                </label>
                <select
                  value={coachId}
                  onChange={(e) => setCoachId(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                >
                  <option value="">-- Sélectionner un coach --</option>
                  {coaches.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.prenom} {c.nom || ''}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {targetType === 'groupe' && (
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Sélectionner le groupe concerné
                </label>
                <select
                  value={groupeId}
                  onChange={(e) => setGroupeId(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                >
                  <option value="">-- Sélectionner un groupe --</option>
                  {groupes.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.nom}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {targetType === 'planning' && (
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Sélectionner le créneau horaire
                </label>
                <select
                  value={planningId}
                  onChange={(e) => setPlanningId(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                >
                  <option value="">-- Sélectionner un créneau --</option>
                  {plannings.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.jourSemaine} {p.heureDebut}-{p.heureFin} {p.groupe ? `(${p.groupe.nom})` : ''}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="flex gap-4 pt-4">
              <button
                type="submit"
                className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors font-semibold"
              >
                Enregistrer
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="px-6 py-2 bg-slate-200 text-slate-800 rounded-lg hover:bg-slate-300 transition-colors"
              >
                Annuler
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Table */}
      <div className="card overflow-hidden bg-white rounded-xl border border-slate-200 shadow-md">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left py-3 px-4 font-semibold text-slate-700">Date</th>
                <th className="text-left py-3 px-4 font-semibold text-slate-700">Impact/Cible</th>
                <th className="text-left py-3 px-4 font-semibold text-slate-700">Motif</th>
                <th className="text-center py-3 px-4 font-semibold text-slate-700">Date d'enregistrement</th>
                <th className="text-center py-3 px-4 font-semibold text-slate-700">Action</th>
              </tr>
            </thead>
            <tbody>
              {cancellations.filter((c) => !getTargetDescription(c).includes('Inconnu')).map((c) => (
                <tr key={c.id} className="border-t border-slate-100 hover:bg-slate-50 transition-colors">
                  <td className="py-3 px-4 font-medium text-slate-900">
                    {new Date(c.date).toLocaleDateString('fr-FR', {
                      weekday: 'long',
                      day: '2-digit',
                      month: 'long',
                      year: 'numeric',
                    })}
                  </td>
                  <td className="py-3 px-4">
                    <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-semibold ${
                      c.coachId ? 'bg-indigo-50 text-indigo-700 border border-indigo-200' :
                      c.groupeId ? 'bg-cyan-50 text-cyan-700 border border-cyan-200' :
                      c.planningId ? 'bg-purple-50 text-purple-700 border border-purple-200' :
                      'bg-teal-50 text-teal-700 border border-teal-200'
                    }`}>
                      {getTargetDescription(c)}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-slate-600">
                    {c.motif || <span className="text-slate-400 italic">Non spécifié</span>}
                  </td>
                  <td className="py-3 px-4 text-center text-slate-500 text-sm">
                    {new Date(c.createdAt).toLocaleDateString('fr-FR')}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <button
                      onClick={() => handleDelete(c.id)}
                      className="text-red-500 hover:text-red-700 text-sm font-semibold transition-colors bg-red-50 hover:bg-red-100 px-3 py-1 rounded-lg"
                    >
                      Supprimer
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {cancellations.length === 0 && !showForm && (
          <div className="text-center py-16 text-slate-500 bg-slate-50/50">
            <p className="text-5xl mb-4">📅</p>
            <p className="font-semibold text-lg">Aucune séance annulée ou exception</p>
            <p className="text-sm mt-1 text-slate-400 max-w-sm mx-auto">
              Toutes les séances se déroulent normalement pour l'instant. Cliquez sur "+ Déclarer une exception" pour en enregistrer une.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
