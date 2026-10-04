'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import toast from 'react-hot-toast'
import { HelpTooltip } from '@/components/ui/Tooltip'
import { formatCompactDateFr } from '@/lib/date'
import { useConfirmDialog } from '@/components/ConfirmDialog'

interface Coach {
  id: string
  prenom: string
  nom: string | null
  photo?: string | null
  email?: string | null
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
  statut?: string
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

interface PrestationItem {
  id: string
  factureId: string
  type: string
  date: string
  description: string
  heures: number | null
  montant: number
  lieu: string | null
  groupe: string | null
  createdAt: string
  facture: {
    id: string
    numero: string
    mois: number
    annee: number
    statut: string
    tauxHoraire: number
    coach: {
      id: string
      prenom: string
      nom: string | null
      photo: string | null
      email: string | null
    }
  }
}

export default function RemplacementsManager() {
  const { confirm } = useConfirmDialog()
  const [remplacements, setRemplacements] = useState<Remplacement[]>([])
  const [coachs, setCoachs] = useState<Coach[]>([])
  const [prestations, setPrestations] = useState<PrestationItem[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingPrestations, setLoadingPrestations] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Navigation et sous-onglets
  const [activeSubTab, setActiveSubTab] = useState<'remplacements' | 'prestations'>('remplacements')

  // Filtres
  const [filterMois, setFilterMois] = useState(new Date().getMonth() + 1)
  const [filterAnnee, setFilterAnnee] = useState(new Date().getFullYear())
  const [filterCoachId, setFilterCoachId] = useState<string>('')

  // Formulaire Remplacement / Absence
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [sansRemplacement, setSansRemplacement] = useState(false)
  const [formData, setFormData] = useState<RemplacementFormData>({
    coachRemplaceId: '',
    coachRemplacantId: '',
    date: '',
    heureDebut: '',
    heureFin: '',
    motif: '',
    description: '',
  })

  // Modale Ajouter une Prestation
  const [showPrestationModal, setShowPrestationModal] = useState(false)
  const [submittingPrestation, setSubmittingPrestation] = useState(false)
  const [prestationForm, setPrestationForm] = useState({
    coachId: '',
    date: new Date().toISOString().split('T')[0],
    description: '',
    modeCalcul: 'taux' as 'taux' | 'forfait',
    heures: 1.0,
    tauxHoraire: 35,
    montantForfait: 50,
    lieu: '',
    groupe: '',
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

  const fetchPrestations = useCallback(async () => {
    try {
      setLoadingPrestations(true)
      let url = `/api/admin/prestations?mois=${filterMois}&annee=${filterAnnee}`
      if (filterCoachId) {
        url += `&coachId=${filterCoachId}`
      }
      const res = await fetch(url)
      if (res.ok) {
        const data = await res.json()
        setPrestations(data.prestations || [])
      }
    } catch (err) {
      console.error('Erreur chargement prestations:', err)
    } finally {
      setLoadingPrestations(false)
    }
  }, [filterMois, filterAnnee, filterCoachId])

  useEffect(() => {
    fetchCoachs()
    fetchRemplacements()
    fetchPrestations()
  }, [fetchCoachs, fetchRemplacements, fetchPrestations])

  // Remplacements filtrés par le coach sélectionné le cas échéant
  const filteredRemplacements = useMemo(() => {
    if (!filterCoachId) return remplacements
    return remplacements.filter(
      (r) => r.coachRemplaceId === filterCoachId || r.coachRemplacantId === filterCoachId
    )
  }, [remplacements, filterCoachId])

  const resetForm = () => {
    setFormData({
      coachRemplaceId: filterCoachId || '',
      coachRemplacantId: '',
      date: '',
      heureDebut: '',
      heureFin: '',
      motif: '',
      description: '',
    })
    setSansRemplacement(false)
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

      const payload = {
        ...formData,
        coachRemplacantId: sansRemplacement ? null : (formData.coachRemplacantId || null),
        statut: sansRemplacement ? 'sans_remplacant' : (formData.coachRemplacantId ? 'accepte' : 'en_attente'),
      }

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (res.ok) {
        toast.success(
          sansRemplacement
            ? 'Absence sans remplacement enregistrée (déduite de la facture)'
            : 'Remplacement enregistré avec succès'
        )
        resetForm()
        fetchRemplacements()
      } else {
        const data = await res.json()
        setError(data.error || 'Erreur lors de la sauvegarde')
        toast.error(data.error || 'Erreur lors de la sauvegarde')
      }
    } catch (err) {
      setError('Erreur de connexion')
      toast.error('Erreur de connexion')
      console.error(err)
    }
  }

  const handleEdit = (remplacement: Remplacement) => {
    const isSans = !remplacement.coachRemplacantId || remplacement.statut === 'sans_remplacant'
    setSansRemplacement(isSans)
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
      title: 'Supprimer l\'enregistrement',
      message: 'Voulez-vous vraiment supprimer cet enregistrement d\'absence / remplacement ? Les factures concernées seront automatiquement actualisées.',
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
        toast.success('Supprimé avec succès (factures actualisées)')
        fetchRemplacements()
      } else {
        const data = await res.json()
        setError(data.error || 'Erreur lors de la suppression')
        toast.error(data.error || 'Erreur lors de la suppression')
      }
    } catch (err) {
      setError('Erreur de connexion')
      toast.error('Erreur de connexion')
      console.error(err)
    }
  }

  // Fonctions Prestations
  const handleOpenPrestationModal = (coachIdToSelect?: string) => {
    const targetCoachId = coachIdToSelect || filterCoachId || (coachs.length > 0 ? coachs[0].id : '')
    const now = new Date()
    const isCurrentMonth = filterMois === (now.getMonth() + 1) && filterAnnee === now.getFullYear()
    const defaultDateStr = isCurrentMonth
      ? now.toISOString().split('T')[0]
      : `${filterAnnee}-${String(filterMois).padStart(2, '0')}-01`

    setPrestationForm({
      coachId: targetCoachId,
      date: defaultDateStr,
      description: '',
      modeCalcul: 'taux',
      heures: 1.0,
      tauxHoraire: 35,
      montantForfait: 50,
      lieu: '',
      groupe: '',
    })
    setShowPrestationModal(true)
  }

  const handlePrestationSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!prestationForm.coachId) {
      toast.error('Veuillez sélectionner un coach')
      return
    }
    if (!prestationForm.description.trim()) {
      toast.error('Veuillez saisir un intitulé pour la prestation')
      return
    }

    setSubmittingPrestation(true)
    try {
      const heuresNum = prestationForm.modeCalcul === 'taux' ? Number(prestationForm.heures) || 0 : 0
      const montantNum = prestationForm.modeCalcul === 'forfait'
        ? Number(prestationForm.montantForfait) || 0
        : Number((heuresNum * (Number(prestationForm.tauxHoraire) || 35)).toFixed(2))

      const res = await fetch('/api/admin/prestations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          coachId: prestationForm.coachId,
          date: prestationForm.date,
          description: prestationForm.description.trim(),
          heures: heuresNum,
          montant: montantNum,
          tauxHoraire: Number(prestationForm.tauxHoraire) || 35,
          lieu: prestationForm.lieu.trim() || null,
          groupe: prestationForm.groupe.trim() || null,
        }),
      })

      const data = await res.json()
      if (res.ok) {
        toast.success(data.message || 'Prestation enregistrée avec succès')
        setShowPrestationModal(false)
        fetchPrestations()
        setActiveSubTab('prestations')
      } else {
        toast.error(data.error || 'Erreur lors de l\'enregistrement de la prestation')
      }
    } catch {
      toast.error('Erreur réseau lors de l\'ajout de la prestation')
    } finally {
      setSubmittingPrestation(false)
    }
  }

  const handleDeletePrestation = async (id: string, desc: string) => {
    const confirmed = await confirm({
      title: 'Supprimer la prestation',
      message: `Voulez-vous vraiment supprimer la prestation "${desc}" ? La facture du coach sera automatiquement recalculée.`,
      confirmText: 'Supprimer',
      cancelText: 'Annuler',
      variant: 'danger',
    })
    if (!confirmed) return

    try {
      const res = await fetch(`/api/admin/prestations/${id}`, {
        method: 'DELETE',
      })
      if (res.ok) {
        toast.success('Prestation supprimée et facture actualisée')
        fetchPrestations()
      } else {
        const data = await res.json()
        toast.error(data.error || 'Erreur lors de la suppression')
      }
    } catch {
      toast.error('Erreur réseau')
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

  const statutsFactureBadge = (statut: string) => {
    switch (statut) {
      case 'brouillon':
        return 'bg-slate-100 text-slate-700 border-slate-200'
      case 'generee':
        return 'bg-blue-50 text-blue-700 border-blue-200'
      case 'envoyee':
        return 'bg-amber-50 text-amber-700 border-amber-200'
      case 'payee':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200'
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200'
    }
  }

  return (
    <div className="space-y-6">
      {/* ── En-tête principal avec Titre & Boutons d'action ── */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            Gestion des Remplacements & Prestations
            <HelpTooltip title="Remplacements, Absences & Prestations">
              <p>Suivez les remplacements entre entraîneurs, les déclarations d&apos;absences et ajoutez des prestations ponctuelles.</p>
              <p className="mt-1">Le coach remplaçant reçoit les heures en plus sur sa facture.</p>
              <p className="mt-1">Le coach absent voit ses heures déduites.</p>
              <p className="mt-1">Les prestations manuelles (stages, réunions, vacations) sont immédiatement intégrées à la facture du coach concerné.</p>
            </HelpTooltip>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Affectations d&apos;entraîneurs, déductions d&apos;absences et prestations complémentaires
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <a
            href="/admin?tab=seances-annulees"
            className="px-3.5 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-semibold rounded-xl text-sm transition-all flex items-center gap-2 cursor-pointer"
            title="Annuler une séance pour tout le club ou plusieurs coachs en un clic"
          >
            <span>🚫</span>
            <span>Piscine fermée / Séances club</span>
          </a>

          <button
            onClick={() => handleOpenPrestationModal()}
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl text-sm transition-all shadow-sm flex items-center gap-2 cursor-pointer"
          >
            <span>✨</span>
            <span>Ajouter une prestation</span>
          </button>

          <button
            onClick={() => {
              resetForm()
              setShowForm(true)
            }}
            className="px-4 py-2.5 bg-primary hover:bg-primary/90 text-white font-semibold rounded-xl text-sm transition-all shadow-sm flex items-center gap-2 cursor-pointer"
          >
            <span>🔄</span>
            <span>Nouveau remplacement / Absence</span>
          </button>
        </div>
      </div>

      {/* ── Filtres : Période (Mois, Année) & Entraîneur ── */}
      <div className="bg-white p-4 rounded-xl shadow-xs border border-slate-200/80 flex flex-wrap gap-4 items-center justify-between">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Mois :</label>
            <select
              value={filterMois}
              onChange={(e) => setFilterMois(parseInt(e.target.value))}
              className="px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
            >
              {moisOptions.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Année :</label>
            <select
              value={filterAnnee}
              onChange={(e) => setFilterAnnee(parseInt(e.target.value))}
              className="px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
            >
              {[2024, 2025, 2026, 2027].map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Coach :</label>
            <select
              value={filterCoachId}
              onChange={(e) => setFilterCoachId(e.target.value)}
              className="px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white font-medium text-slate-800"
            >
              <option value="">Tous les entraîneurs ({coachs.length})</option>
              {coachs.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.prenom} {c.nom || ''}
                </option>
              ))}
            </select>
          </div>
        </div>

        {filterCoachId && (
          <button
            onClick={() => setFilterCoachId('')}
            className="text-xs text-primary hover:underline font-medium cursor-pointer"
          >
            ✕ Réinitialiser le filtre coach
          </button>
        )}
      </div>

      {/* ── Sous-onglets de navigation ── */}
      <div className="flex border-b border-slate-200 gap-2">
        <button
          onClick={() => setActiveSubTab('remplacements')}
          className={`pb-3 px-4 font-bold text-sm border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
            activeSubTab === 'remplacements'
              ? 'border-primary text-primary'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <span>🔄</span>
          <span>Remplacements & Absences</span>
          <span className="ml-1 px-2 py-0.5 rounded-full text-xs bg-slate-100 text-slate-600 font-semibold">
            {filteredRemplacements.length}
          </span>
        </button>

        <button
          onClick={() => setActiveSubTab('prestations')}
          className={`pb-3 px-4 font-bold text-sm border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
            activeSubTab === 'prestations'
              ? 'border-primary text-primary'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <span>✨</span>
          <span>Prestations complémentaires</span>
          <span className="ml-1 px-2 py-0.5 rounded-full text-xs bg-emerald-50 text-emerald-700 font-semibold border border-emerald-200">
            {prestations.length}
          </span>
        </button>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-lg">{error}</div>
      )}

      {/* ── Formulaire Remplacement / Absence ── */}
      {showForm && (
        <div className="bg-white p-6 rounded-2xl shadow-lg border border-slate-100">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-bold text-slate-900">
              {editingId ? 'Modifier le remplacement / l\'absence' : 'Nouveau remplacement ou déclaration d\'absence'}
            </h3>
            <button
              onClick={resetForm}
              className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 flex items-center justify-center cursor-pointer"
            >
              ✕
            </button>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Toggle Absence sans remplacement */}
            <div className="p-3.5 bg-red-50/70 border border-red-200 rounded-xl">
              <label className="flex items-center gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={sansRemplacement}
                  onChange={(e) => {
                    const checked = e.target.checked
                    setSansRemplacement(checked)
                    if (checked) {
                      setFormData({ ...formData, coachRemplacantId: '' })
                    }
                  }}
                  className="w-4 h-4 text-red-600 focus:ring-red-500 border-gray-300 rounded cursor-pointer"
                />
                <span className="text-sm font-bold text-red-900">
                  🔴 Déclarer une absence sans remplacement (déduite de la facture)
                </span>
              </label>
              <p className="text-xs text-red-700/80 ml-6.5 mt-1 font-medium">
                {sansRemplacement
                  ? 'Aucun coach remplaçant ne sera assigné. Les heures de ce créneau seront automatiquement déduites de la facture du coach absent.'
                  : 'Cochez cette case si le coach est absent et que la séance n\'est pas reprise par un collègue.'}
              </p>
            </div>

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
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-white"
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
                <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center justify-between">
                  <span>Coach remplaçant {sansRemplacement ? '(Non applicable)' : '*'}</span>
                  {sansRemplacement && (
                    <span className="text-xs font-semibold text-red-600 bg-red-100 px-2 py-0.5 rounded-full">
                      Sans remplaçant
                    </span>
                  )}
                </label>
                <select
                  value={formData.coachRemplacantId}
                  onChange={(e) =>
                    setFormData({ ...formData, coachRemplacantId: e.target.value })
                  }
                  disabled={sansRemplacement}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent ${
                    sansRemplacement
                      ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                      : 'border-gray-300 bg-white'
                  }`}
                  required={!sansRemplacement}
                >
                  <option value="">
                    {sansRemplacement ? '-- Aucun remplaçant (absence non remplacée) --' : 'Sélectionner le remplaçant'}
                  </option>
                  {!sansRemplacement &&
                    coachs
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-white"
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-white"
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-white"
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-white"
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-white"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <button
                type="button"
                onClick={resetForm}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors cursor-pointer"
              >
                Annuler
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors cursor-pointer font-semibold"
              >
                {editingId ? 'Mettre à jour' : 'Enregistrer'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── VUE 1 : Remplacements & Absences ── */}
      {activeSubTab === 'remplacements' && (
        <div className="space-y-6">
          {loading ? (
            <div className="bg-white p-12 rounded-xl text-center text-slate-500 shadow-xs border border-slate-100">
              <div className="inline-block animate-spin text-2xl mb-2">🔄</div>
              <p>Chargement des remplacements...</p>
            </div>
          ) : filteredRemplacements.length === 0 ? (
            <div className="bg-white p-8 rounded-xl shadow-xs border border-slate-100 text-center text-gray-500 space-y-3">
              <p className="text-base font-medium">Aucun remplacement ou absence pour cette période</p>
              {filterCoachId && (
                <p className="text-xs text-slate-400">
                  (Filtre appliqué pour l&apos;entraîneur sélectionné)
                </p>
              )}
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-xs border border-slate-200/80 overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-slate-50 text-xs font-bold uppercase tracking-wider text-slate-600">
                  <tr>
                    <th className="px-6 py-3.5 text-left">Date</th>
                    <th className="px-6 py-3.5 text-left">Coach absent</th>
                    <th className="px-6 py-3.5 text-left">Remplaçant</th>
                    <th className="px-6 py-3.5 text-left">Horaire</th>
                    <th className="px-6 py-3.5 text-left">Motif</th>
                    <th className="px-6 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                  {filteredRemplacements.map((remp) => (
                    <tr key={remp.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">
                        {formatCompactDateFr(remp.date)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-2.5 py-1 text-xs font-semibold bg-red-100 text-red-700 rounded-full">
                          {getCoachName(remp.coachRemplace)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {remp.coachRemplacant ? (
                          <span className="px-2.5 py-1 text-xs font-semibold bg-green-100 text-green-700 rounded-full">
                            {getCoachName(remp.coachRemplacant)}
                          </span>
                        ) : remp.statut === 'sans_remplacant' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold bg-red-50 text-red-700 border border-red-200 rounded-full">
                            🔴 Sans remplacement (déduite)
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 text-xs font-semibold bg-amber-100 text-amber-800 rounded-full">
                            En attente d&apos;un remplaçant
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-600">
                        {remp.heureDebut} - {remp.heureFin}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-500">
                        {remp.motif || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right font-medium">
                        <button
                          onClick={() => handleEdit(remp)}
                          className="text-primary hover:text-primary-dark mr-3 cursor-pointer"
                        >
                          Modifier
                        </button>
                        <button
                          onClick={() => handleDelete(remp.id)}
                          className="text-red-600 hover:text-red-900 cursor-pointer"
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

          {/* Info légale & facturation */}
          <div className="bg-blue-50/80 border border-blue-200 p-4 rounded-xl text-sm text-blue-900">
            <strong className="flex items-center gap-2 font-bold text-blue-950">
              ℹ️ Impact direct sur la facturation des entraîneurs :
            </strong>
            <ul className="mt-2 list-disc list-inside space-y-1 text-xs text-blue-800">
              <li><strong>Absence sans remplacement :</strong> Les heures sont automatiquement <u>déduites</u> de la facture du coach absent.</li>
              <li><strong>Remplacement validé :</strong> Les heures sont déduites du coach absent et <u>ajoutées</u> à la facture du coach remplaçant.</li>
              <li><strong>Synchronisation en direct :</strong> Le montant total des factures ouvertes (brouillons ou générées) est instantanément recalculé et mis à jour.</li>
            </ul>
          </div>
        </div>
      )}

      {/* ── VUE 2 : Prestations Complémentaires ── */}
      {activeSubTab === 'prestations' && (
        <div className="space-y-6">
          {loadingPrestations ? (
            <div className="bg-white p-12 rounded-xl text-center text-slate-500 shadow-xs border border-slate-100">
              <div className="inline-block animate-spin text-2xl mb-2">🔄</div>
              <p>Chargement des prestations...</p>
            </div>
          ) : prestations.length === 0 ? (
            <div className="bg-white p-12 rounded-2xl shadow-xs border border-slate-100 text-center space-y-4">
              <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center text-2xl mx-auto">
                ✨
              </div>
              <div className="max-w-md mx-auto">
                <h4 className="font-bold text-slate-900 text-base">Aucune prestation complémentaire</h4>
                <p className="text-xs text-slate-500 mt-1">
                  Ajoutez des prestations spécifiques pour un entraîneur (stages vacances, réunions pédagogiques, vacations, formations, etc.).
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleOpenPrestationModal()}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl text-sm transition-all shadow-xs inline-flex items-center gap-2 cursor-pointer"
              >
                <span>✨</span>
                <span>Ajouter une première prestation</span>
              </button>
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-xs border border-slate-200/80 overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-slate-50 text-xs font-bold uppercase tracking-wider text-slate-600">
                  <tr>
                    <th className="px-6 py-3.5 text-left">Date</th>
                    <th className="px-6 py-3.5 text-left">Coach concerné</th>
                    <th className="px-6 py-3.5 text-left">Intitulé / Prestation</th>
                    <th className="px-6 py-3.5 text-right">Volume</th>
                    <th className="px-6 py-3.5 text-right">Montant net</th>
                    <th className="px-6 py-3.5 text-center">Facture rattachée</th>
                    <th className="px-6 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                  {prestations.map((p) => {
                    const coachItem = p.facture?.coach
                    return (
                      <tr key={p.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap font-medium text-slate-900">
                          {formatCompactDateFr(p.date)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center text-xs shrink-0">
                              {coachItem?.prenom?.[0] || 'C'}
                            </div>
                            <div>
                              <p className="font-bold text-slate-900 leading-tight">
                                {coachItem ? `${coachItem.prenom} ${coachItem.nom || ''}` : 'Coach inconnu'}
                              </p>
                              {coachItem?.email && (
                                <p className="text-[11px] text-slate-400">{coachItem.email}</p>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="space-y-0.5">
                            <p className="font-semibold text-slate-800">{p.description}</p>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              {p.groupe && (
                                <span className="inline-flex items-center text-[10px] px-2 py-0.5 rounded-full font-medium bg-slate-100 text-slate-700">
                                  👥 {p.groupe}
                                </span>
                              )}
                              {p.lieu && (
                                <span className="inline-flex items-center text-[10px] px-2 py-0.5 rounded-full font-medium bg-sky-50 text-sky-700">
                                  📍 {p.lieu}
                                </span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right font-medium text-slate-700">
                          {p.heures && p.heures > 0 ? (
                            <span>{p.heures.toFixed(1)} h</span>
                          ) : (
                            <span className="text-slate-400 text-xs">Forfait fixe</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <span className="font-black text-emerald-700 text-base">
                            +{p.montant.toFixed(2)} €
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          {p.facture ? (
                            <div className="flex flex-col items-center gap-1">
                              <span className="font-mono text-xs text-slate-600 font-semibold">
                                {p.facture.numero}
                              </span>
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${statutsFactureBadge(p.facture.statut)}`}>
                                {p.facture.statut}
                              </span>
                            </div>
                          ) : (
                            <span className="text-xs text-slate-400">-</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <button
                            type="button"
                            onClick={() => handleDeletePrestation(p.id, p.description)}
                            className="text-red-600 hover:text-red-900 font-semibold text-xs cursor-pointer p-1.5 rounded-lg hover:bg-red-50 transition-colors"
                            title="Supprimer la prestation"
                          >
                            Supprimer
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Rassurance Prestations */}
          <div className="bg-emerald-50/70 border border-emerald-200 p-4 rounded-xl text-sm text-emerald-950 flex items-start gap-3">
            <span className="text-xl mt-0.5">💡</span>
            <div className="space-y-1 text-xs text-emerald-900">
              <p className="font-bold text-emerald-950 text-sm">
                Rattachement automatique aux factures mensuelles
              </p>
              <p>
                Toute prestation ajoutée est immédiatement rattachée à la facture mensuelle du coach concerné ({moisOptions[filterMois - 1]?.label} {filterAnnee}).
              </p>
              <p>
                Elle est visible sur l&apos;espace personnel de l&apos;entraîneur, dans l&apos;onglet <strong>Factures &gt; Factures en cours</strong> et sera automatiquement intégrée sur le PDF de facturation officiel.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── MODALE : Ajouter une Prestation pour le coach sélectionné ── */}
      {showPrestationModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5 border border-slate-100 max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                  <span>✨</span> Ajouter une prestation coach
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Rémunération ponctuelle intégrée directement à la facture du coach
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowPrestationModal(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors text-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Formulaire */}
            <form onSubmit={handlePrestationSubmit} className="space-y-4">
              {/* Choix du coach */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  Coach concerné *
                </label>
                <select
                  value={prestationForm.coachId}
                  onChange={(e) => setPrestationForm({ ...prestationForm, coachId: e.target.value })}
                  className="w-full px-3 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent text-sm bg-white font-medium"
                  required
                >
                  <option value="" disabled>-- Sélectionner un entraîneur --</option>
                  {coachs.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.prenom} {c.nom || ''} {c.email ? `(${c.email})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Date */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  Date de la prestation *
                </label>
                <input
                  type="date"
                  value={prestationForm.date}
                  onChange={(e) => setPrestationForm({ ...prestationForm, date: e.target.value })}
                  className="w-full px-3 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent text-sm bg-white"
                  required
                />
              </div>

              {/* Mode de calcul : Au taux horaire ou Forfait fixe */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  Type de calcul
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setPrestationForm({ ...prestationForm, modeCalcul: 'taux' })}
                    className={`p-3 rounded-xl border text-center transition-all cursor-pointer ${
                      prestationForm.modeCalcul === 'taux'
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-900 font-bold ring-1 ring-emerald-600'
                        : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <span className="text-xs block">⏱️ Au taux horaire</span>
                    <span className="text-[11px] text-slate-500 font-normal">Heures × Taux (€/h)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPrestationForm({ ...prestationForm, modeCalcul: 'forfait' })}
                    className={`p-3 rounded-xl border text-center transition-all cursor-pointer ${
                      prestationForm.modeCalcul === 'forfait'
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-900 font-bold ring-1 ring-emerald-600'
                        : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <span className="text-xs block">💶 Montant forfaitaire</span>
                    <span className="text-[11px] text-slate-500 font-normal">Montant fixe en euros</span>
                  </button>
                </div>
              </div>

              {/* Détail selon le mode de calcul */}
              {prestationForm.modeCalcul === 'taux' ? (
                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/80 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">
                        Nombre d&apos;heures *
                      </label>
                      <input
                        type="number"
                        step="0.25"
                        min="0.25"
                        value={prestationForm.heures}
                        onChange={(e) => setPrestationForm({ ...prestationForm, heures: parseFloat(e.target.value) || 0 })}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white font-semibold"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">
                        Taux horaire (€/h)
                      </label>
                      <input
                        type="number"
                        step="0.5"
                        min="0"
                        value={prestationForm.tauxHoraire}
                        onChange={(e) => setPrestationForm({ ...prestationForm, tauxHoraire: parseFloat(e.target.value) || 0 })}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
                        required
                      />
                    </div>
                  </div>

                  <div className="flex justify-between items-center pt-1 border-t border-slate-200 text-xs">
                    <span className="text-slate-500 font-medium">Montant calculé :</span>
                    <span className="text-base font-black text-emerald-700">
                      {((Number(prestationForm.heures) || 0) * (Number(prestationForm.tauxHoraire) || 0)).toFixed(2)} €
                    </span>
                  </div>
                </div>
              ) : (
                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/80 space-y-2">
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Montant net du forfait (€) *
                  </label>
                  <input
                    type="number"
                    step="1"
                    min="1"
                    value={prestationForm.montantForfait}
                    onChange={(e) => setPrestationForm({ ...prestationForm, montantForfait: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white font-black text-primary"
                    required
                  />
                </div>
              )}

              {/* Intitulé de la prestation */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  Intitulé / Description *
                </label>
                <input
                  type="text"
                  value={prestationForm.description}
                  onChange={(e) => setPrestationForm({ ...prestationForm, description: e.target.value })}
                  placeholder="Ex : Stage vacances, Réunion pédagogique, Vacation..."
                  className="w-full px-3 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent text-sm bg-white"
                  required
                />
                {/* Suggestions rapides */}
                <div className="flex items-center gap-1.5 flex-wrap mt-2">
                  <span className="text-[10px] text-slate-400 font-semibold uppercase">Suggestions :</span>
                  {['Stage vacances', 'Réunion pédagogique', 'Formation', 'Vacation surveillance', 'Encadrement compétition'].map((sugg) => (
                    <button
                      key={sugg}
                      type="button"
                      onClick={() => setPrestationForm({ ...prestationForm, description: sugg })}
                      className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-full text-[10px] font-medium transition-colors cursor-pointer"
                    >
                      {sugg}
                    </button>
                  ))}
                </div>
              </div>

              {/* Lieu & Groupe optionnels */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Groupe (optionnel)
                  </label>
                  <input
                    type="text"
                    value={prestationForm.groupe}
                    onChange={(e) => setPrestationForm({ ...prestationForm, groupe: e.target.value })}
                    placeholder="Ex : ENF, Masters..."
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Lieu (optionnel)
                  </label>
                  <input
                    type="text"
                    value={prestationForm.lieu}
                    onChange={(e) => setPrestationForm({ ...prestationForm, lieu: e.target.value })}
                    placeholder="Ex : Bassin Cavaillon..."
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
                  />
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowPrestationModal(false)}
                  className="px-4 py-2.5 text-sm font-semibold rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={submittingPrestation}
                  className="px-4 py-2.5 text-sm font-semibold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-all disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
                >
                  {submittingPrestation ? (
                    <>
                      <span className="animate-spin">🔄</span>
                      <span>Enregistrement...</span>
                    </>
                  ) : (
                    <>
                      <span>✨</span>
                      <span>Enregistrer la prestation</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
