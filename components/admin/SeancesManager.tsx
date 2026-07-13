'use client'

import { useCallback, useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { useConfirmDialog } from '@/components/ConfirmDialog'
import { getErrorMessage } from '@/lib/utils'
import { formatWeekdayLongDateFr } from '@/lib/date'

interface Groupe {
  id: string
  nom: string
}

interface Seance {
  id: string
  titre: string
  description: string | null
  groupeId: string | null
  groupe: Groupe | null
  dateSeance: string
  heureDebut: string
  heureFin: string
  placesTotal: number
  placesRestantes: number
  prix: number
  actif: boolean
  _count?: {
    reservations: number
  }
}

export default function SeancesManager() {
  const [seances, setSeances] = useState<Seance[]>([])
  const [groupes, setGroupes] = useState<Groupe[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingSeance, setEditingSeance] = useState<Seance | null>(null)
  const [includePassees, setIncludePassees] = useState(false)
  const { confirm } = useConfirmDialog()

  // Form state
  const [titre, setTitre] = useState('')
  const [description, setDescription] = useState('')
  const [groupeId, setGroupeId] = useState('')
  const [dateSeance, setDateSeance] = useState('')
  const [heureDebut, setHeureDebut] = useState('10:00')
  const [heureFin, setHeureFin] = useState('11:00')
  const [placesTotal, setPlacesTotal] = useState('')
  const [prix, setPrix] = useState('')
  const [actif, setActif] = useState(true)

  const fetchSeances = useCallback(async () => {
    try {
      const response = await fetch(`/api/admin/seances?includePassees=${includePassees}`)
      if (response.ok) {
        const data = await response.json()
        setSeances(data.seances)
      }
    } catch (error) {
      toast.error('Erreur lors du chargement des séances')
    } finally {
      setLoading(false)
    }
  }, [includePassees])

  const fetchGroupes = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/groupes')
      if (response.ok) {
        const data = await response.json()
        setGroupes(data.groupes || [])
      }
    } catch (error) {
      console.error('Erreur lors du chargement des groupes')
    }
  }, [])

  useEffect(() => {
    fetchSeances()
    fetchGroupes()
  }, [fetchSeances, fetchGroupes])

  const resetForm = () => {
    setTitre('')
    setDescription('')
    setGroupeId('')
    setDateSeance('')
    setHeureDebut('10:00')
    setHeureFin('11:00')
    setPlacesTotal('')
    setPrix('')
    setActif(true)
    setEditingSeance(null)
    setShowForm(false)
  }

  const handleEdit = (seance: Seance) => {
    setEditingSeance(seance)
    setTitre(seance.titre)
    setDescription(seance.description || '')
    setGroupeId(seance.groupeId || '')
    setDateSeance(seance.dateSeance.split('T')[0])
    setHeureDebut(seance.heureDebut)
    setHeureFin(seance.heureFin)
    setPlacesTotal(seance.placesTotal.toString())
    setPrix(seance.prix.toString())
    setActif(seance.actif)
    setShowForm(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      const url = editingSeance
        ? `/api/admin/seances/${editingSeance.id}`
        : '/api/admin/seances'

      const response = await fetch(url, {
        method: editingSeance ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          titre,
          description: description || null,
          groupeId: groupeId || null,
          dateSeance,
          heureDebut,
          heureFin,
          placesTotal: parseInt(placesTotal),
          prix: parseFloat(prix),
          actif,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Erreur lors de l\'enregistrement')
      }

      await fetchSeances()
      resetForm()
      toast.success(editingSeance ? 'Séance modifiée' : 'Séance créée')
    } catch (error) {
      toast.error(getErrorMessage(error))
    }
  }

  const handleDelete = async (id: string) => {
    const confirmed = await confirm({
      title: 'Supprimer la séance',
      message: 'Voulez-vous vraiment supprimer cette séance ?',
      confirmText: 'Supprimer',
      variant: 'danger',
    })
    if (!confirmed) return

    try {
      const response = await fetch(`/api/admin/seances/${id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Erreur lors de la suppression')
      }

      await fetchSeances()
      toast.success('Séance supprimée')
    } catch (error) {
      toast.error(getErrorMessage(error))
    }
  }

  const handleToggleActif = async (seance: Seance) => {
    try {
      const response = await fetch(`/api/admin/seances/${seance.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ actif: !seance.actif }),
      })

      if (!response.ok) throw new Error('Erreur')

      await fetchSeances()
      toast.success(seance.actif ? 'Séance désactivée' : 'Séance activée')
    } catch {
      toast.error('Erreur lors de la modification')
    }
  }

  const renderForm = () => (
    <div>
      <h3 className="text-xl font-bold mb-4">
        {editingSeance ? 'Modifier la séance' : 'Nouvelle séance'}
      </h3>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Titre *
            </label>
            <input
              type="text"
              value={titre}
              onChange={(e) => setTitre(e.target.value)}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              placeholder="Ex: Séance Aquagym"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Groupe associé (optionnel)
            </label>
            <select
              value={groupeId}
              onChange={(e) => setGroupeId(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
            >
              <option value="">-- Aucun groupe --</option>
              {groupes.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.nom}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Description
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
            placeholder="Description de la séance..."
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Date *
            </label>
            <input
              type="date"
              value={dateSeance}
              onChange={(e) => setDateSeance(e.target.value)}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Heure début *
            </label>
            <input
              type="time"
              value={heureDebut}
              onChange={(e) => setHeureDebut(e.target.value)}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Heure fin *
            </label>
            <input
              type="time"
              value={heureFin}
              onChange={(e) => setHeureFin(e.target.value)}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Places *
            </label>
            <input
              type="number"
              value={placesTotal}
              onChange={(e) => setPlacesTotal(e.target.value)}
              required
              min="1"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              placeholder="10"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Prix (€) *
            </label>
            <input
              type="number"
              step="0.01"
              value={prix}
              onChange={(e) => setPrix(e.target.value)}
              required
              min="0"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              placeholder="15.00"
            />
          </div>

          <div className="flex items-end">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={actif}
                onChange={(e) => setActif(e.target.checked)}
                className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
              />
              <span className="text-sm text-gray-700">Séance active (visible publiquement)</span>
            </label>
          </div>
        </div>

        <div className="flex gap-4">
          <button
            type="submit"
            className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors"
          >
            {editingSeance ? 'Mettre à jour' : 'Créer'}
          </button>
          <button
            type="button"
            onClick={resetForm}
            className="px-6 py-2 bg-gray-300 text-gray-800 rounded-lg hover:bg-gray-400 transition-colors"
          >
            Annuler
          </button>
        </div>
      </form>
    </div>
  )

  if (loading) {
    return <p className="text-gray-600">Chargement...</p>
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">Séances Exceptionnelles</h2>
        <button
          onClick={() => {
            setEditingSeance(null)
            setShowForm(!showForm)
          }}
          className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors"
        >
          {showForm && !editingSeance ? 'Annuler' : '+ Nouvelle séance'}
        </button>
      </div>

      {/* Filtre */}
      <div className="mb-4">
        <label className="flex items-center gap-2 text-sm text-gray-600">
          <input
            type="checkbox"
            checked={includePassees}
            onChange={(e) => setIncludePassees(e.target.checked)}
            className="rounded border-gray-300"
          />
          Afficher les séances passées
        </label>
      </div>

      {/* Formulaire */}
      {showForm && !editingSeance && (
        <div className="card p-6 mb-6">
          {renderForm()}
        </div>
      )}

      {/* Liste des séances */}
      {seances.length === 0 ? (
        <div className="card p-8 text-center text-gray-500">
          <p>Aucune séance {!includePassees ? 'à venir' : ''}.</p>
          <p className="text-sm mt-2">Cliquez sur &quot;Nouvelle séance&quot; pour en créer une.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {seances.map((seance) => {
            const isPast = new Date(seance.dateSeance) < new Date(new Date().setHours(0, 0, 0, 0))
            const reservations = seance._count?.reservations || 0

            if (editingSeance?.id === seance.id) {
              return (
                <div
                  key={seance.id}
                  className="col-span-1 md:col-span-2 lg:col-span-3 card p-6 border-2 border-primary shadow-md text-left"
                >
                  {renderForm()}
                </div>
              )
            }

            return (
              <div
                key={seance.id}
                className={`card p-4 ${isPast ? 'opacity-60' : ''} ${!seance.actif ? 'border-l-4 border-gray-400' : ''}`}
              >
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-bold text-lg">{seance.titre}</h3>
                  <span
                    className={`px-2 py-1 rounded-full text-xs ${
                      seance.actif ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {seance.actif ? 'Active' : 'Inactive'}
                  </span>
                </div>

                {seance.groupe && (
                  <p className="text-sm text-primary mb-2">{seance.groupe.nom}</p>
                )}

                <p className="text-sm text-gray-600 mb-2">{formatWeekdayLongDateFr(seance.dateSeance)}</p>
                <p className="text-sm text-gray-600 mb-3">
                  {seance.heureDebut} - {seance.heureFin}
                </p>

                <div className="flex justify-between items-center mb-3">
                  <div>
                    <span
                      className={`font-semibold ${
                        seance.placesRestantes === 0
                          ? 'text-red-600'
                          : seance.placesRestantes <= 3
                          ? 'text-amber-600'
                          : 'text-green-600'
                      }`}
                    >
                      {seance.placesRestantes}/{seance.placesTotal} places
                    </span>
                    {reservations > 0 && (
                      <span className="text-xs text-gray-500 ml-2">
                        ({reservations} résa)
                      </span>
                    )}
                  </div>
                  <span className="font-bold text-primary">{seance.prix.toFixed(2)} €</span>
                </div>

                <div className="flex gap-2 pt-2 border-t">
                  <button
                    onClick={() => handleEdit(seance)}
                    className="flex-1 text-sm text-primary hover:text-primary-dark"
                  >
                    Modifier
                  </button>
                  <button
                    onClick={() => handleToggleActif(seance)}
                    className="flex-1 text-sm text-gray-600 hover:text-gray-800"
                  >
                    {seance.actif ? 'Désactiver' : 'Activer'}
                  </button>
                  <button
                    onClick={() => handleDelete(seance.id)}
                    className="flex-1 text-sm text-red-600 hover:text-red-800"
                  >
                    Supprimer
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
