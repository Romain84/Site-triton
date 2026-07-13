'use client'

import { useCallback, useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { useConfirmDialog } from '@/components/ConfirmDialog'
import { getErrorMessage } from '@/lib/utils'
import { HelpTooltip } from '@/components/ui/Tooltip'
import { formatCompactDateFr } from '@/lib/date'

interface PeriodeVacances {
  id: string
  nom: string
  description: string | null
  dateDebut: string
  dateFin: string
  type: string
  impacteFacturation: boolean
  actif: boolean
  couleur: string | null
}

export default function VacancesManager() {
  const [loading, setLoading] = useState(true)
  const [periodes, setPeriodes] = useState<PeriodeVacances[]>([])
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const { confirm } = useConfirmDialog()
  const [anneeSelectionnee, setAnneeSelectionnee] = useState(
    new Date().getFullYear().toString()
  )

  // Import Zone B
  const [importingZoneB, setImportingZoneB] = useState(false)
  const [showImportResult, setShowImportResult] = useState(false)
  const [importResult, setImportResult] = useState<{
    created: number
    skipped: number
    annee: number
    details: Array<{ nom: string; dateDebut: string; dateFin: string; status: 'created' | 'skipped' }>
  } | null>(null)

  // État du modal
  const [showModal, setShowModal] = useState(false)
  const [editingPeriode, setEditingPeriode] = useState<PeriodeVacances | null>(null)

  // État du formulaire
  const [formNom, setFormNom] = useState('')
  const [formDescription, setFormDescription] = useState('')
  const [formDateDebut, setFormDateDebut] = useState('')
  const [formDateFin, setFormDateFin] = useState('')
  const [formType, setFormType] = useState('vacances')
  const [formImpacteFacturation, setFormImpacteFacturation] = useState(true)
  const [formActif, setFormActif] = useState(true)
  const [formCouleur, setFormCouleur] = useState('#dc2626')

  const fetchPeriodes = useCallback(async () => {
    try {
      setLoading(true)
      const response = await fetch(
        `/api/admin/vacances?annee=${anneeSelectionnee}&_t=${Date.now()}`,
        { cache: 'no-store' }
      )
      if (response.ok) {
        const data = await response.json()
        setPeriodes(data)
      }
    } catch (err) {
      setError('Erreur lors du chargement des périodes')
    } finally {
      setLoading(false)
    }
  }, [anneeSelectionnee])

  const handleImportZoneB = async () => {
    setImportingZoneB(true)
    setError('')
    try {
      const yearParam = anneeSelectionnee || new Date().getFullYear().toString()
      const res = await fetch(
        `/api/admin/vacances/import-zone-b?annee=${yearParam}`,
        { method: 'POST' }
      )
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Erreur lors de l\'import')
      setImportResult(data)
      setShowImportResult(true)
      await fetchPeriodes()
      toast.success(`${data.created} période(s) importée(s) depuis data.education.gouv.fr`)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erreur inconnue'
      toast.error(msg)
      setError(msg)
    } finally {
      setImportingZoneB(false)
    }
  }

  useEffect(() => {
    fetchPeriodes()
  }, [fetchPeriodes])

  const resetForm = () => {
    setFormNom('')
    setFormDescription('')
    setFormDateDebut('')
    setFormDateFin('')
    setFormType('vacances')
    setFormImpacteFacturation(true)
    setFormActif(true)
    setFormCouleur('#dc2626')
    setEditingPeriode(null)
  }

  const handleOpenModal = (periode?: PeriodeVacances) => {
    if (periode) {
      setEditingPeriode(periode)
      setFormNom(periode.nom)
      setFormDescription(periode.description || '')
      setFormDateDebut(periode.dateDebut.split('T')[0])
      setFormDateFin(periode.dateFin.split('T')[0])
      setFormType(periode.type)
      setFormImpacteFacturation(periode.impacteFacturation)
      setFormActif(periode.actif)
      setFormCouleur(periode.couleur || '#dc2626')
    } else {
      resetForm()
    }
    setShowModal(true)
  }

  const handleCloseModal = () => {
    setShowModal(false)
    resetForm()
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    try {
      const body = {
        nom: formNom,
        description: formDescription || null,
        dateDebut: new Date(formDateDebut).toISOString(),
        dateFin: new Date(formDateFin + 'T23:59:59').toISOString(),
        type: formType,
        impacteFacturation: formImpacteFacturation,
        actif: formActif,
        couleur: formCouleur,
      }

      const url = editingPeriode
        ? `/api/admin/vacances/${editingPeriode.id}`
        : '/api/admin/vacances'
      const method = editingPeriode ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Erreur lors de l\'enregistrement')
      }

      toast.success(editingPeriode ? 'Période modifiée' : 'Période créée')
      setSuccess(
        editingPeriode
          ? 'Période modifiée avec succès'
          : 'Période créée avec succès'
      )
      handleCloseModal()
      fetchPeriodes()
    } catch (err) {
      const message = getErrorMessage(err)
      toast.error(message)
      setError(message)
    }
  }

  const handleDelete = async (id: string) => {
    const confirmed = await confirm({
      title: 'Supprimer la période',
      message: 'Êtes-vous sûr de vouloir supprimer cette période ?',
      confirmText: 'Supprimer',
      variant: 'danger',
    })
    if (!confirmed) return

    try {
      const response = await fetch(`/api/admin/vacances/${id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Erreur lors de la suppression')
      }

      setSuccess('Période supprimée avec succès')
      fetchPeriodes()
    } catch (err) {
      setError(getErrorMessage(err))
    }
  }

  const getTypeBadge = (type: string) => {
    const badges: Record<string, string> = {
      vacances: 'bg-blue-100 text-blue-800',
      fermeture: 'bg-red-100 text-red-800',
      ferie: 'bg-green-100 text-green-800',
    }
    return badges[type] || 'bg-gray-100 text-gray-800'
  }

  // Générer les années pour le sélecteur
  const currentYear = new Date().getFullYear()
  const years = Array.from({ length: 5 }, (_, i) => currentYear - 1 + i)

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          Gestion des vacances et fermetures
          <HelpTooltip title="Vacances et fermetures">
            <p>Définissez les périodes sans activité du club.</p>
            <p className="mt-1"><strong>Impact :</strong> Ces périodes sont exclues du calcul des semaines d&apos;activité et de la facturation des coaches.</p>
            <p className="mt-1"><strong>Types :</strong> Vacances scolaires, jours fériés, fermetures exceptionnelles.</p>
          </HelpTooltip>
        </h2>
        <div className="flex items-center gap-2">
          {/* Import automatique Zone B */}
          <button
            onClick={handleImportZoneB}
            disabled={importingZoneB}
            title="Importe automatiquement les vacances scolaires Zone B (Aix-Marseille) depuis data.education.gouv.fr"
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-lg hover:bg-indigo-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {importingZoneB ? (
              <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/>
              </svg>
            )}
            {importingZoneB ? 'Import en cours…' : '🏫 Auto-import Zone B'}
          </button>

          <button
            onClick={() => handleOpenModal()}
            className="btn-primary"
          >
            Ajouter une période
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6 rounded">
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {success && (
        <div className="bg-green-50 border-l-4 border-green-500 p-4 mb-6 rounded">
          <p className="text-green-700">{success}</p>
        </div>
      )}

      {/* Sélecteur d'année */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Filtrer par année
        </label>
        <select
          value={anneeSelectionnee}
          onChange={(e) => setAnneeSelectionnee(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
        >
          <option value="">Toutes les années</option>
          {years.map((year) => (
            <option key={year} value={year}>
              {year}
            </option>
          ))}
        </select>
      </div>

      {/* Liste des périodes */}
      {loading ? (
        <p className="text-gray-600">Chargement...</p>
      ) : periodes.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          Aucune période de vacances définie
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Nom
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Dates
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Facturation
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Statut
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {periodes.map((periode) => (
                <tr key={periode.id}>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      {periode.couleur && (
                        <div
                          className="w-4 h-4 rounded"
                          style={{ backgroundColor: periode.couleur }}
                        />
                      )}
                      <div>
                        <div className="font-medium text-gray-900">
                          {periode.nom}
                        </div>
                        {periode.description && (
                          <div className="text-sm text-gray-500">
                            {periode.description}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`px-2 py-1 text-xs font-medium rounded-full ${getTypeBadge(
                        periode.type
                      )}`}
                    >
                      {periode.type}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {formatCompactDateFr(periode.dateDebut)} - {formatCompactDateFr(periode.dateFin)}
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`px-2 py-1 text-xs font-medium rounded-full ${
                        periode.impacteFacturation
                          ? 'bg-orange-100 text-orange-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {periode.impacteFacturation ? 'Exclue' : 'Facturée'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`px-2 py-1 text-xs font-medium rounded-full ${
                        periode.actif
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {periode.actif ? 'Actif' : 'Inactif'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right space-x-2">
                    <button
                      onClick={() => handleOpenModal(periode)}
                      className="text-primary hover:text-primary-dark font-medium"
                    >
                      Modifier
                    </button>
                    <button
                      onClick={() => handleDelete(periode.id)}
                      className="text-red-600 hover:text-red-700 font-medium"
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

      {/* Modal d'ajout/modification */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h3 className="text-xl font-bold mb-4">
                {editingPeriode ? 'Modifier la période' : 'Ajouter une période'}
              </h3>

              {error && (
                <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-4 rounded">
                  <p className="text-red-700">{error}</p>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nom de la période *
                  </label>
                  <input
                    type="text"
                    value={formNom}
                    onChange={(e) => setFormNom(e.target.value)}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    placeholder="Ex: Vacances de Noël 2024"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description
                  </label>
                  <textarea
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                    rows={2}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    placeholder="Description optionnelle"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Date de début *
                    </label>
                    <input
                      type="date"
                      value={formDateDebut}
                      onChange={(e) => setFormDateDebut(e.target.value)}
                      required
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Date de fin *
                    </label>
                    <input
                      type="date"
                      value={formDateFin}
                      onChange={(e) => setFormDateFin(e.target.value)}
                      required
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Type
                    </label>
                    <select
                      value={formType}
                      onChange={(e) => setFormType(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    >
                      <option value="vacances">Vacances</option>
                      <option value="fermeture">Fermeture</option>
                      <option value="ferie">Jour férié</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Couleur
                    </label>
                    <input
                      type="color"
                      value={formCouleur}
                      onChange={(e) => setFormCouleur(e.target.value)}
                      className="w-full h-10 px-2 py-1 border border-gray-300 rounded-lg"
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formImpacteFacturation}
                      onChange={(e) => setFormImpacteFacturation(e.target.checked)}
                      className="mr-2 h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                    />
                    <span className="text-sm text-gray-700">
                      Exclure cette période de la facturation des coachs
                    </span>
                  </label>

                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formActif}
                      onChange={(e) => setFormActif(e.target.checked)}
                      className="mr-2 h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                    />
                    <span className="text-sm text-gray-700">Période active</span>
                  </label>
                </div>

                <div className="flex justify-end gap-3 mt-6">
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                  >
                    Annuler
                  </button>
                  <button type="submit" className="btn-primary">
                    {editingPeriode ? 'Modifier' : 'Créer'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal résultat import Zone B ──────────────────────────────────── */}
      {showImportResult && importResult && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[85vh] flex flex-col">
            {/* En-tête */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-indigo-100 rounded-xl flex items-center justify-center text-lg">🏫</div>
                <div>
                  <h3 className="font-bold text-gray-900">Import Zone B — Aix-Marseille</h3>
                  <p className="text-xs text-gray-400">
                    Saison {importResult.annee}–{importResult.annee + 1} ·{' '}
                    <span className="text-indigo-600 font-medium">{importResult.created} créée(s)</span>
                    {importResult.skipped > 0 && ` · ${importResult.skipped} doublon(s)`}
                  </p>
                </div>
              </div>
              <button onClick={() => {
                setShowImportResult(false)
                window.location.reload()
              }}
                className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
                </svg>
              </button>
            </div>

            {/* Corps */}
            <div className="flex-1 overflow-y-auto p-4">
              {/* Stats */}
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-3 text-center">
                  <p className="text-2xl font-bold text-indigo-700">{importResult.created}</p>
                  <p className="text-xs text-indigo-500 mt-0.5">Périodes créées</p>
                </div>
                <div className="bg-gray-50 border border-gray-100 rounded-xl p-3 text-center">
                  <p className="text-2xl font-bold text-gray-500">{importResult.skipped}</p>
                  <p className="text-xs text-gray-400 mt-0.5">Doublons ignorés</p>
                </div>
              </div>

              {/* Note dimanche */}
              <div className="mb-3 px-3 py-2 bg-amber-50 border border-amber-100 rounded-lg text-xs text-amber-700">
                <strong>📅 Ajustement dimanche :</strong> Les vacances qui débutent officiellement un samedi ont été décalées au dimanche pour correspondre au calendrier du club.
              </div>

              {/* Liste */}
              <div className="rounded-xl border border-gray-100 overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase">Période</th>
                      <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase">Dates</th>
                      <th className="px-4 py-2.5 text-center text-xs font-semibold text-gray-500 uppercase">Statut</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {importResult.details.map((d, i) => (
                      <tr key={i} className={d.status === 'created' ? 'bg-white' : 'bg-gray-50'}>
                        <td className="px-4 py-2.5 font-medium text-gray-800 text-xs">{d.nom}</td>
                        <td className="px-4 py-2.5 text-xs text-gray-500">
                          {new Date(d.dateDebut).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                          {' → '}
                          {new Date(d.dateFin).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </td>
                        <td className="px-4 py-2.5 text-center">
                          {d.status === 'created' ? (
                            <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                              ✓ Créée
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-xs font-medium text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                              Doublon
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-gray-100 flex justify-end bg-gray-50/80 rounded-b-2xl">
              <button
                onClick={() => {
                  setShowImportResult(false)
                  window.location.reload()
                }}
                className="px-6 py-2 text-sm font-semibold bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

