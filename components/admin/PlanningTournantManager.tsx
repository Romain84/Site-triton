'use client'

import { useEffect, useState, Fragment } from 'react'
import { getErrorMessage } from '@/lib/utils'
import { HelpTooltip } from '@/components/ui/Tooltip'
import { useConfirmDialog } from '@/components/ConfirmDialog'

interface Coach {
  id: string
  prenom: string
  nom: string | null
}

interface Groupe {
  id: string
  nom: string
}

interface EvenementTournant {
  id: string
  titre: string
  date: string
  heureDebut: string
  heureFin: string
  description: string | null
  lieu: string | null
  actif: boolean
  groupeId: string | null
  groupe: Groupe | null
  groupes?: Groupe[] | null
  coachId: string | null
  coach: Coach | null
}

export default function PlanningTournantManager() {
  const { confirm } = useConfirmDialog()
  const [evenements, setEvenements] = useState<EvenementTournant[]>([])
  const [groupes, setGroupes] = useState<Groupe[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editingEvent, setEditingEvent] = useState<EvenementTournant | null>(null)

  // Form state
  const [titre, setTitre] = useState('')
  const [date, setDate] = useState('')
  const [heureDebut, setHeureDebut] = useState('')
  const [heureFin, setHeureFin] = useState('')
  const [description, setDescription] = useState('')
  const [lieu, setLieu] = useState('Piscine de Cavaillon')
  const [groupeIds, setGroupeIds] = useState<string[]>([])
  const [actif, setActif] = useState(true)

  useEffect(() => {
    fetchEvenements()
  }, [])

  const fetchEvenements = async () => {
    try {
      const response = await fetch('/api/admin/planning-tournant')
      if (response.ok) {
        const data = await response.json()
        setEvenements(data.evenements)
        setGroupes(data.groupes || [])
      }
    } catch (err) {
      setError('Erreur lors du chargement des événements')
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setTitre('')
    setDate('')
    setHeureDebut('')
    setHeureFin('')
    setDescription('')
    setLieu('Piscine de Cavaillon')
    setGroupeIds([])
    setActif(true)
    setEditingEvent(null)
    setShowForm(false)
  }

  const handleEdit = (event: EvenementTournant) => {
    setEditingEvent(event)
    setTitre(event.titre)
    setDate(new Date(event.date).toISOString().split('T')[0])
    setHeureDebut(event.heureDebut)
    setHeureFin(event.heureFin)
    setDescription(event.description || '')
    setLieu(event.lieu || 'Piscine de Cavaillon')
    setGroupeIds(event.groupes && event.groupes.length > 0
      ? event.groupes.map(g => g.id)
      : (event.groupeId ? [event.groupeId] : []))
    setActif(event.actif)
    setShowForm(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    try {
      const url = editingEvent
        ? `/api/admin/planning-tournant/${editingEvent.id}`
        : '/api/admin/planning-tournant'

      const response = await fetch(url, {
        method: editingEvent ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          titre,
          date,
          heureDebut,
          heureFin,
          description: description || null,
          lieu: lieu || null,
          groupeIds,
          actif,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Erreur lors de l\'enregistrement')
      }

      await fetchEvenements()
      resetForm()
    } catch (err) {
      setError(getErrorMessage(err))
    }
  }

  const handleDelete = async (id: string) => {
    const confirmed = await confirm({
      title: 'Supprimer l\'événement',
      message: 'Voulez-vous vraiment supprimer cet événement ?',
      confirmText: 'Supprimer',
      cancelText: 'Annuler',
      variant: 'danger',
    })
    if (!confirmed) return

    try {
      const response = await fetch(`/api/admin/planning-tournant/${id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Erreur lors de la suppression')
      }

      await fetchEvenements()
    } catch (err) {
      setError(getErrorMessage(err))
    }
  }

  const handleLibererCoach = async (id: string) => {
    const confirmed = await confirm({
      title: 'Libérer le créneau',
      message: 'Voulez-vous vraiment libérer ce créneau en retirant le coach assigné ?',
      confirmText: 'Libérer',
      cancelText: 'Annuler',
      variant: 'danger',
    })
    if (!confirmed) return

    try {
      const event = evenements.find(e => e.id === id)
      if (!event) return

      const response = await fetch(`/api/admin/planning-tournant/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...event,
          coachId: null,
        }),
      })

      if (!response.ok) {
        throw new Error('Erreur lors de la libération du créneau')
      }

      await fetchEvenements()
    } catch (err) {
      setError(getErrorMessage(err))
    }
  }

  if (loading) {
    return <p className="text-gray-600">Chargement...</p>
  }

  // Séparer les événements futurs et passés
  const now = new Date()
  const evenementsFuturs = evenements.filter(e => new Date(e.date) >= now)
  const evenementsPasses = evenements.filter(e => new Date(e.date) < now)

  const renderForm = () => (
    <div>
      <h3 className="text-xl font-bold mb-4">
        {editingEvent ? 'Modifier le créneau' : 'Nouveau créneau tournant'}
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
              placeholder="Ex: Remplacement cours ENF - Samedi matin"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Groupes concernés
            </label>
            <div className="border border-gray-300 rounded-lg p-3 max-h-40 overflow-y-auto space-y-2 bg-white">
              {groupes.length === 0 ? (
                <p className="text-sm text-gray-400">Aucun groupe actif</p>
              ) : (
                groupes.map(groupe => {
                  const isChecked = groupeIds.includes(groupe.id)
                  return (
                    <label key={groupe.id} className="flex items-center gap-2 cursor-pointer text-sm text-gray-700 hover:bg-gray-55 p-1 rounded transition-colors">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setGroupeIds([...groupeIds, groupe.id])
                          } else {
                            setGroupeIds(groupeIds.filter(id => id !== groupe.id))
                          }
                        }}
                        className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
                      />
                      <span>{groupe.nom}</span>
                    </label>
                  )
                })
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Date *
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
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
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Lieu
          </label>
          <input
            type="text"
            value={lieu}
            onChange={(e) => setLieu(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
            placeholder="Piscine de Cavaillon"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Description
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
            placeholder="Description optionnelle..."
          />
        </div>

        <div className="flex items-center">
          <input
            type="checkbox"
            id="actif"
            checked={actif}
            onChange={(e) => setActif(e.target.checked)}
            className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
          />
          <label htmlFor="actif" className="ml-2 text-sm text-gray-700">
            Créneau actif (visible pour les coaches)
          </label>
        </div>

        <div className="flex gap-4">
          <button
            type="submit"
            className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors"
          >
            {editingEvent ? 'Mettre à jour' : 'Créer'}
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

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            Gestion du Planning Tournant
            <HelpTooltip title="Planning Tournant">
              <p>Créneaux ponctuels que les coaches peuvent prendre ou libérer.</p>
              <p className="mt-1">Idéal pour les rotations, permanences ou créneaux occasionnels.</p>
              <p className="mt-1">Les coaches prennent les créneaux depuis leur espace personnel.</p>
            </HelpTooltip>
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            Créez des créneaux que les coaches peuvent prendre/libérer
          </p>
        </div>
        <button
          onClick={() => {
            setEditingEvent(null)
            setShowForm(!showForm)
          }}
          className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors"
        >
          {showForm && !editingEvent ? 'Annuler' : '+ Nouveau créneau'}
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6 rounded">
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {/* Form */}
      {showForm && !editingEvent && (
        <div className="card p-6 mb-6">
          {renderForm()}
        </div>
      )}

      {/* Tables */}
      <div className="space-y-6">
        {/* Événements futurs */}
        <div className="card overflow-hidden">
          <div className="bg-primary text-white px-6 py-3">
            <h3 className="font-bold">Créneaux à venir ({evenementsFuturs.length})</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Date</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Titre</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Groupe</th>
                  <th className="text-center py-3 px-4 font-semibold text-gray-700">Horaire</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Lieu</th>
                  <th className="text-center py-3 px-4 font-semibold text-gray-700">Coach</th>
                  <th className="text-center py-3 px-4 font-semibold text-gray-700">Statut</th>
                  <th className="text-center py-3 px-4 font-semibold text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody>
                {evenementsFuturs.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-8 text-gray-500">
                      Aucun créneau à venir
                    </td>
                  </tr>
                ) : (
                  evenementsFuturs.map((event) => (
                    <Fragment key={event.id}>
                      <tr className="border-t border-gray-200 hover:bg-gray-50">
                        <td className="py-3 px-4">
                          {new Date(event.date).toLocaleDateString('fr-FR')}
                        </td>
                        <td className="py-3 px-4 font-medium">{event.titre}</td>
                        <td className="py-3 px-4 text-sm text-gray-600">
                          {event.groupes && event.groupes.length > 0 
                            ? event.groupes.map(g => g.nom).join(', ') 
                            : (event.groupe?.nom || '-')}
                        </td>
                        <td className="py-3 px-4 text-center text-sm">
                          {event.heureDebut} - {event.heureFin}
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-600">
                          {event.lieu || '-'}
                        </td>
                        <td className="py-3 px-4 text-center">
                          {event.coach ? (
                            <div className="flex flex-col items-center">
                              <span className="text-sm font-medium">
                                {event.coach.prenom} {event.coach.nom}
                              </span>
                              <button
                                onClick={() => handleLibererCoach(event.id)}
                                className="text-xs text-red-600 hover:text-red-800 mt-1"
                              >
                                Libérer
                              </button>
                            </div>
                          ) : (
                            <span className="text-gray-400 text-sm">Disponible</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span
                            className={`inline-block px-2 py-1 rounded-full text-xs ${
                              event.actif
                                ? 'bg-green-100 text-green-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}
                          >
                            {event.actif ? 'Actif' : 'Inactif'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => handleEdit(event)}
                              className="text-primary hover:text-primary-dark text-sm font-medium"
                            >
                              Modifier
                            </button>
                            <span className="text-gray-300">|</span>
                            <button
                              onClick={() => handleDelete(event.id)}
                              className="text-red-600 hover:text-red-800 text-sm font-medium"
                            >
                              Supprimer
                            </button>
                          </div>
                        </td>
                      </tr>
                      {editingEvent?.id === event.id && (
                        <tr className="bg-gray-50 border-t border-b border-gray-200">
                          <td colSpan={8} className="p-6">
                            <div className="card p-6 bg-white border border-gray-200 rounded-lg shadow-sm text-left">
                              {renderForm()}
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Événements passés */}
        {evenementsPasses.length > 0 && (
          <div className="card overflow-hidden">
            <div className="bg-gray-600 text-white px-6 py-3">
              <h3 className="font-bold">Créneaux passés ({evenementsPasses.length})</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Date</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Titre</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Groupe</th>
                    <th className="text-center py-3 px-4 font-semibold text-gray-700">Horaire</th>
                    <th className="text-center py-3 px-4 font-semibold text-gray-700">Coach</th>
                    <th className="text-center py-3 px-4 font-semibold text-gray-700">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {evenementsPasses.map((event) => (
                    <tr key={event.id} className="border-t border-gray-200 hover:bg-gray-50">
                      <td className="py-3 px-4 text-gray-500">
                        {new Date(event.date).toLocaleDateString('fr-FR')}
                      </td>
                      <td className="py-3 px-4 text-gray-600">{event.titre}</td>
                      <td className="py-3 px-4 text-sm text-gray-500">
                        {event.groupes && event.groupes.length > 0 
                          ? event.groupes.map(g => g.nom).join(', ') 
                          : (event.groupe?.nom || '-')}
                      </td>
                      <td className="py-3 px-4 text-center text-sm text-gray-500">
                        {event.heureDebut} - {event.heureFin}
                      </td>
                      <td className="py-3 px-4 text-center text-sm">
                        {event.coach ? (
                          <span className="text-gray-700">
                            {event.coach.prenom} {event.coach.nom}
                          </span>
                        ) : (
                          <span className="text-gray-400">Non assigné</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => handleDelete(event.id)}
                          className="text-red-600 hover:text-red-800 text-sm font-medium"
                        >
                          Supprimer
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
