'use client'

import { useState, useEffect, useCallback } from 'react'
import { HelpTooltip } from '@/components/ui/Tooltip'
import { formatCompactDateFr } from '@/lib/date'
import { useConfirmDialog } from '@/components/ConfirmDialog'

interface Coach {
  id: string
  prenom: string
  nom: string | null
}

interface Remplacement {
  id: string
  coachRemplaceId: string
  coachRemplacantId: string | null
  coachRemplace: { id: string; prenom: string; nom: string | null }
  coachRemplacant: { id: string; prenom: string; nom: string | null } | null
  date: string
  heureDebut: string
  heureFin: string
  planningId: string | null
  motif: string | null
  description: string | null
  actif: boolean
}

interface RemplacementFormData {
  coachRemplaceId: string
  coachRemplacantId: string
  date: string
  heureDebut: string
  heureFin: string
  motif: string
  description: string
}

export default function RemplacementsManager() {
  const { confirm } = useConfirmDialog()
  const [remplacements, setRemplacements] = useState<Remplacement[]>([])
  const [coachs, setCoachs] = useState<Coach[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [filterMois, setFilterMois] = useState(new Date().getMonth() + 1)
  const [filterAnnee, setFilterAnnee] = useState(new Date().getFullYear())

  const [formData, setFormData] = useState<RemplacementFormData>({
    coachRemplaceId: '',
    coachRemplacantId: '',
    date: '',
    heureDebut: '',
    heureFin: '',
    motif: '',
    description: '',
  })

  const fetchCoachs = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/coaches')
      if (res.ok) {
        const data = await res.json()
        setCoachs(data.coaches || [])
      }
    } catch (err) {
      console.error('Erreur lors du chargement des coachs:', err)
    }
  }, [])

  const fetchRemplacements = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch(`/api/admin/remplacements?mois=${filterMois}&annee=${filterAnnee}`)
      if (res.ok) {
        const data = await res.json()
        setRemplacements(data.remplacements || [])
      } else {
        setError('Erreur lors du chargement des remplacements')
      }
    } catch (err) {
      setError('Erreur de connexion')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [filterMois, filterAnnee])

  useEffect(() => {
    fetchCoachs()
    fetchRemplacements()
  }, [fetchCoachs, fetchRemplacements])

  const resetForm = () => {
    setFormData({
      coachRemplaceId: '',
      coachRemplacantId: '',
      date: '',
      heureDebut: '',
      heureFin: '',
      motif: '',
      description: '',
    })
    setEditingId(null)
    setShowForm(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    try {
      const url = editingId
        ? `/api/admin/remplacements/${editingId}`
        : '/api/admin/remplacements'
      const method = editingId ? 'PUT' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (res.ok) {
        resetForm()
        fetchRemplacements()
      } else {
        const data = await res.json()
        setError(data.error || 'Erreur lors de la sauvegarde')
      }
    } catch (err) {
      setError('Erreur de connexion')
      console.error(err)
    }
  }

  const handleEdit = (remplacement: Remplacement) => {
    setFormData({
      coachRemplaceId: remplacement.coachRemplaceId,
      coachRemplacantId: remplacement.coachRemplacantId || '',
      date: new Date(remplacement.date).toISOString().split('T')[0],
      heureDebut: remplacement.heureDebut,
      heureFin: remplacement.heureFin,
      motif: remplacement.motif || '',
      description: remplacement.description || '',
    })
    setEditingId(remplacement.id)
    setShowForm(true)
  }

  const handleDelete = async (id: string) => {
    const confirmed = await confirm({
      title: 'Supprimer le remplacement',
      message: 'Voulez-vous vraiment supprimer ce remplacement ?',
      confirmText: 'Supprimer',
      cancelText: 'Annuler',
      variant: 'danger',
    })
    if (!confirmed) return

    try {
      const res = await fetch(`/api/admin/remplacements/${id}`, {
        method: 'DELETE',
      })

      if (res.ok) {
        fetchRemplacements()
      } else {
        const data = await res.json()
        setError(data.error || 'Erreur lors de la suppression')
      }
    } catch (err) {
      setError('Erreur de connexion')
      console.error(err)
    }
  }

  const getCoachName = (coach: { prenom: string; nom: string | null }) => {
    return `${coach.prenom} ${coach.nom || ''}`.trim()
  }

  const moisOptions = [
    { value: 1, label: 'Janvier' },
    { value: 2, label: 'Février' },
    { value: 3, label: 'Mars' },
    { value: 4, label: 'Avril' },
    { value: 5, label: 'Mai' },
    { value: 6, label: 'Juin' },
    { value: 7, label: 'Juillet' },
    { value: 8, label: 'Août' },
    { value: 9, label: 'Septembre' },
    { value: 10, label: 'Octobre' },
    { value: 11, label: 'Novembre' },
    { value: 12, label: 'Décembre' },
  ]

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          Gestion des Remplacements
          <HelpTooltip title="Remplacements">
            <p>Déclarez les remplacements entre coaches.</p>
            <p className="mt-1">Le coach remplaçant reçoit les heures en plus.</p>
            <p className="mt-1">Le coach remplacé voit les heures déduites.</p>
            <p className="mt-1">Ces modifications sont automatiquement reportées sur les factures mensuelles.</p>
          </HelpTooltip>
        </h2>
        <button
          onClick={() => setShowForm(true)}
          className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors"
        >
          + Nouveau remplacement
        </button>
      </div>

      {/* Filtres */}
      <div className="bg-white p-4 rounded-lg shadow flex gap-4 items-center">
        <label className="font-medium text-gray-700">Période :</label>
        <select
          value={filterMois}
          onChange={(e) => setFilterMois(parseInt(e.target.value))}
          className="px-3 py-2 border border-gray-300 rounded-lg"
        >
          {moisOptions.map((m) => (
            <option key={m.value} value={m.value}>
              {m.label}
            </option>
          ))}
        </select>
        <select
          value={filterAnnee}
          onChange={(e) => setFilterAnnee(parseInt(e.target.value))}
          className="px-3 py-2 border border-gray-300 rounded-lg"
        >
          {[2024, 2025, 2026].map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </select>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-lg">{error}</div>
      )}

      {/* Formulaire */}
      {showForm && (
        <div className="bg-white p-6 rounded-lg shadow-lg">
          <h3 className="text-lg font-semibold mb-4">
            {editingId ? 'Modifier le remplacement' : 'Nouveau remplacement'}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Coach absent *
                </label>
                <select
                  value={formData.coachRemplaceId}
                  onChange={(e) =>
                    setFormData({ ...formData, coachRemplaceId: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  required
                >
                  <option value="">Sélectionner le coach absent</option>
                  {coachs.map((coach) => (
                    <option key={coach.id} value={coach.id}>
                      {getCoachName(coach)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Coach remplaçant *
                </label>
                <select
                  value={formData.coachRemplacantId}
                  onChange={(e) =>
                    setFormData({ ...formData, coachRemplacantId: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  required
                >
                  <option value="">Sélectionner le remplaçant</option>
                  {coachs
                    .filter((c) => c.id !== formData.coachRemplaceId)
                    .map((coach) => (
                      <option key={coach.id} value={coach.id}>
                        {getCoachName(coach)}
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Date *
                </label>
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) =>
                    setFormData({ ...formData, date: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Heure début *
                  </label>
                  <input
                    type="time"
                    value={formData.heureDebut}
                    onChange={(e) =>
                      setFormData({ ...formData, heureDebut: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Heure fin *
                  </label>
                  <input
                    type="time"
                    value={formData.heureFin}
                    onChange={(e) =>
                      setFormData({ ...formData, heureFin: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Motif
                </label>
                <input
                  type="text"
                  value={formData.motif}
                  onChange={(e) =>
                    setFormData({ ...formData, motif: e.target.value })
                  }
                  placeholder="Maladie, congé, etc."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  placeholder="Notes supplémentaires"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <button
                type="button"
                onClick={resetForm}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Annuler
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors"
              >
                {editingId ? 'Mettre à jour' : 'Créer'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Liste des remplacements */}
      {loading ? (
        <div className="text-center py-8 text-gray-500">Chargement...</div>
      ) : remplacements.length === 0 ? (
        <div className="bg-white p-8 rounded-lg shadow text-center text-gray-500">
          Aucun remplacement pour cette période
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Coach absent
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Remplaçant
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Horaire
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Motif
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {remplacements.map((remp) => (
                <tr key={remp.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatCompactDateFr(remp.date)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2 py-1 text-xs font-semibold bg-red-100 text-red-700 rounded-full">
                      {getCoachName(remp.coachRemplace)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {remp.coachRemplacant ? (
                      <span className="px-2 py-1 text-xs font-semibold bg-green-100 text-green-700 rounded-full">
                        {getCoachName(remp.coachRemplacant)}
                      </span>
                    ) : (
                      <span className="px-2 py-1 text-xs font-semibold bg-amber-100 text-amber-800 rounded-full">
                        En attente d&apos;un remplaçant
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {remp.heureDebut} - {remp.heureFin}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {remp.motif || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => handleEdit(remp)}
                      className="text-primary hover:text-primary-dark mr-3"
                    >
                      Modifier
                    </button>
                    <button
                      onClick={() => handleDelete(remp.id)}
                      className="text-red-600 hover:text-red-900"
                    >
                      Supprimer
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Info */}
      <div className="bg-blue-50 p-4 rounded-lg text-sm text-blue-700">
        <strong>Impact sur la facturation :</strong>
        <ul className="mt-2 list-disc list-inside space-y-1">
          <li>Le coach absent verra ses heures diminuées du temps du remplacement</li>
          <li>Le coach remplaçant verra ses heures augmentées du temps du remplacement</li>
          <li>Les modifications sont automatiquement prises en compte dans le calcul de facturation</li>
        </ul>
      </div>
    </div>
  )
}
