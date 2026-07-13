'use client'

import { useEffect, useState, Fragment } from 'react'
import { getErrorMessage } from '@/lib/utils'
import { HelpTooltip } from '@/components/ui/Tooltip'
import toast from 'react-hot-toast'
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

interface Planning {
  id: string
  jourSemaine: string
  heureDebut: string
  heureFin: string
  groupeId: string
  groupe: Groupe | null
  coachs: Array<{
    id: string
    coach: Coach
  }>
  lieu: string | null
  couleur: string | null
  actif: boolean
}

const JOURS_SEMAINE = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche']

const COULEURS = [
  { nom: 'Cyan', valeur: '#00bcd4' },
  { nom: 'Bleu', valeur: '#2196F3' },
  { nom: 'Vert', valeur: '#4CAF50' },
  { nom: 'Orange', valeur: '#FF9800' },
  { nom: 'Rouge', valeur: '#f44336' },
  { nom: 'Violet', valeur: '#9C27B0' },
  { nom: 'Rose', valeur: '#E91E63' },
]

const PRESET_LIEUX = [
  'Grand Bassin - Ligne 1',
  'Grand Bassin - Ligne 2',
  'Grand Bassin - Ligne 3',
  'Grand Bassin - Ligne 4',
  'Petit Bassin',
]

const timeToMinutes = (timeStr: string | null | undefined): number => {
  if (!timeStr) return 0
  const [h, m] = timeStr.split(':').map(Number)
  return h * 60 + m
}

const getCardGradient = (hexColor: string | null | undefined): string => {
  const baseColor = hexColor || '#00bcd4'
  switch(baseColor.toLowerCase()) {
    case '#00bcd4': return 'linear-gradient(135deg, #00bcd4, #0097a7)' // Cyan
    case '#2196f3': return 'linear-gradient(135deg, #2196f3, #1976d2)' // Bleu
    case '#4caf50': return 'linear-gradient(135deg, #4caf50, #388e3c)' // Vert
    case '#ff9800': return 'linear-gradient(135deg, #ff9800, #f57c00)' // Orange
    case '#f44336': return 'linear-gradient(135deg, #f44336, #d32f2f)' // Rouge
    case '#9c27b0': return 'linear-gradient(135deg, #9c27b0, #7b1fa2)' // Violet
    case '#e91e63': return 'linear-gradient(135deg, #e91e63, #c2185b)' // Rose
    default: return `linear-gradient(135deg, ${baseColor}, ${baseColor})`
  }
}

function getCouleurGroupe(nom: string): { bg: string; text: string; border: string; badge: string; accent: string; gradient: string; textColor: string; textBorder: string } {
  const n = nom || ''
   // 1. COMPÉTITIONS (Chaque groupe possède sa couleur et son identité propre)
  if (n.includes('Avenirs 1')) {
    return {
      bg: 'bg-sky-50/70',
      text: 'text-sky-850',
      border: 'border-sky-100',
      badge: 'bg-sky-100/60 text-sky-800',
      accent: 'bg-sky-300',
      gradient: 'linear-gradient(135deg, #f0f9ff, #bae6fd)', // Bleu ciel très clair
      textColor: '#0369a1',
      textBorder: '#bae6fd'
    }
  }
  if (n.includes('Avenirs 2')) {
    return {
      bg: 'bg-sky-50/80',
      text: 'text-sky-900',
      border: 'border-sky-200/50',
      badge: 'bg-sky-100 text-sky-900',
      accent: 'bg-sky-400',
      gradient: 'linear-gradient(135deg, #38bdf8, #0284c7)', // Bleu ciel vif
      textColor: '#ffffff',
      textBorder: 'rgba(255,255,255,0.2)'
    }
  }
  if (n.includes('Avenirs 3')) {
    return {
      bg: 'bg-sky-100/70',
      text: 'text-sky-955',
      border: 'border-sky-300/50',
      badge: 'bg-sky-200/60 text-sky-955',
      accent: 'bg-sky-500',
      gradient: 'linear-gradient(135deg, #00acc1, #006064)', // Turquoise foncé distinct
      textColor: '#ffffff',
      textBorder: 'rgba(255,255,255,0.2)'
    }
  }
  if (n.includes('Benjamins 1')) {
    return {
      bg: 'bg-blue-50/70',
      text: 'text-blue-800',
      border: 'border-blue-200/40',
      badge: 'bg-blue-100/60 text-blue-800',
      accent: 'bg-blue-300',
      gradient: 'linear-gradient(135deg, #f5f3ff, #ddd6fe)', // Violet lavande très clair
      textColor: '#6d28d9',
      textBorder: '#ddd6fe'
    }
  }
  if (n.includes('Benjamins 2')) {
    return {
      bg: 'bg-blue-50/80',
      text: 'text-blue-900',
      border: 'border-blue-300/40',
      badge: 'bg-blue-100 text-blue-900',
      accent: 'bg-blue-500',
      gradient: 'linear-gradient(135deg, #818cf8, #4338ca)', // Indigo royal
      textColor: '#ffffff',
      textBorder: 'rgba(255,255,255,0.2)'
    }
  }
  if (n.includes('Juniors Compétition') || (n.includes('Juniors') && n.toUpperCase().includes('COMP'))) {
    return {
      bg: 'bg-indigo-55/70',
      text: 'text-indigo-850',
      border: 'border-indigo-200/40',
      badge: 'bg-indigo-100/60 text-indigo-800',
      accent: 'bg-indigo-600',
      gradient: 'linear-gradient(135deg, #f0abfc, #a21caf)', // Fuchsia vibrant distinct
      textColor: '#ffffff',
      textBorder: 'rgba(255,255,255,0.2)'
    }
  }
  if (n.includes('Adultes Compétition') || (n.includes('Adultes') && n.toUpperCase().includes('COMP'))) {
    return {
      bg: 'bg-blue-100/60',
      text: 'text-blue-955',
      border: 'border-blue-300/50',
      badge: 'bg-blue-200/60 text-blue-955',
      accent: 'bg-blue-800',
      gradient: 'linear-gradient(135deg, #1e293b, #0f172a)', // Deep Navy / Black
      textColor: '#ffffff',
      textBorder: 'rgba(255,255,255,0.2)'
    }
  }

  // 2. LOISIRS (Chaque groupe possède sa couleur et son identité propre)
  if (n.includes('Jeunes Loisirs')) {
    return {
      bg: 'bg-emerald-50/70',
      text: 'text-emerald-800',
      border: 'border-emerald-200/40',
      badge: 'bg-emerald-100/60 text-emerald-800',
      accent: 'bg-emerald-300',
      gradient: 'linear-gradient(135deg, #f0fdf4, #bbf7d0)', // Vert menthe très clair
      textColor: '#166534',
      textBorder: '#bbf7d0'
    }
  }
  if (n.includes('Juniors Loisirs')) {
    return {
      bg: 'bg-emerald-50/80',
      text: 'text-emerald-900',
      border: 'border-emerald-300/40',
      badge: 'bg-emerald-100 text-emerald-900',
      accent: 'bg-emerald-400',
      gradient: 'linear-gradient(135deg, #99f6e4, #0d9488)', // Teal / Aquamarine distinct
      textColor: '#ffffff',
      textBorder: 'rgba(255,255,255,0.2)'
    }
  }
  if (n.includes('Adultes Loisirs 1')) {
    return {
      bg: 'bg-emerald-100/60',
      text: 'text-emerald-955',
      border: 'border-emerald-400/30',
      badge: 'bg-emerald-200/60 text-emerald-955',
      accent: 'bg-emerald-600',
      gradient: 'linear-gradient(135deg, #f7fee7, #d9f99d)', // Vert lime / Pomme clair distinct
      textColor: '#4d7c0f',
      textBorder: '#d9f99d'
    }
  }
  if (n.includes('Adultes Loisirs 2')) {
    return {
      bg: 'bg-emerald-100/70',
      text: 'text-emerald-955',
      border: 'border-emerald-500/30',
      badge: 'bg-emerald-200 text-emerald-955',
      accent: 'bg-emerald-800',
      gradient: 'linear-gradient(135deg, #15803d, #14532d)', // Vert forêt sombre
      textColor: '#ffffff',
      textBorder: 'rgba(255,255,255,0.1)'
    }
  }

  // 3. LE RESTE (Couleurs d'identité spécifiques choisies)
  if (n.includes('Natation Artistique') || n.toUpperCase().includes('ARTISTIQUE')) {
    return {
      bg: 'bg-fuchsia-50/60',
      text: 'text-fuchsia-800',
      border: 'border-fuchsia-200/40',
      badge: 'bg-fuchsia-100/60 text-fuchsia-800',
      accent: 'bg-fuchsia-400',
      gradient: 'linear-gradient(135deg, #fce7f3, #f472b6)', // Rose distinct
      textColor: '#db2777',
      textBorder: '#fbcfe8'
    }
  }
  if (n.includes('AquaGym') || n.toUpperCase().includes('AQUA')) {
    return {
      bg: 'bg-teal-50/60',
      text: 'text-teal-800',
      border: 'border-teal-200/40',
      badge: 'bg-teal-100/60 text-teal-800',
      accent: 'bg-teal-300',
      gradient: 'linear-gradient(135deg, #ecfeff, #a5f3fc)', // Cyan pastel distinct
      textColor: '#0891b2',
      textBorder: '#c5f2f7'
    }
  }
  if (n.includes('BNSSA')) {
    return {
      bg: 'bg-orange-50/60',
      text: 'text-orange-800',
      border: 'border-orange-200/40',
      badge: 'bg-orange-100/60 text-orange-800',
      accent: 'bg-orange-300',
      gradient: 'linear-gradient(135deg, #fca5a5, #b91c1c)', // Rouge écarlate
      textColor: '#ffffff',
      textBorder: '#ef4444'
    }
  }
  if (n.includes('Ecole de natation française (ENF 1)') || n.includes('ENF 1')) {
    return {
      bg: 'bg-rose-50/60',
      text: 'text-rose-800',
      border: 'border-rose-200/40',
      badge: 'bg-rose-100/60 text-rose-800',
      accent: 'bg-rose-300',
      gradient: 'linear-gradient(135deg, #fef9c3, #eab308)', // Jaune d'or distinct
      textColor: '#854d0e',
      textBorder: '#fef08a'
    }
  }
  if (n.includes('Ecole de natation française (ENF 2)') || n.includes('ENF 2')) {
    return {
      bg: 'bg-rose-50/70',
      text: 'text-rose-900',
      border: 'border-rose-300/40',
      badge: 'bg-rose-100 text-rose-900',
      accent: 'bg-rose-500',
      gradient: 'linear-gradient(135deg, #ffedd5, #f97316)', // Orange distinct
      textColor: '#c2410c',
      textBorder: '#fed7aa'
    }
  }

  // Fallbacks
  const u = n.toUpperCase()
  if (u.includes('COMP')) {
    return {
      bg: 'bg-blue-50/80',
      text: 'text-blue-900',
      border: 'border-blue-300/40',
      badge: 'bg-blue-100 text-blue-900',
      accent: 'bg-blue-600',
      gradient: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
      textColor: '#ffffff',
      textBorder: 'rgba(255,255,255,0.2)'
    }
  }
  if (u.includes('LOISIR')) {
    return {
      bg: 'bg-emerald-50/80',
      text: 'text-emerald-900',
      border: 'border-emerald-300/40',
      badge: 'bg-emerald-100 text-emerald-900',
      accent: 'bg-emerald-600',
      gradient: 'linear-gradient(135deg, #34d399, #047857)',
      textColor: '#ffffff',
      textBorder: 'rgba(255,255,255,0.2)'
    }
  }

  return {
    bg: 'bg-slate-50/80',
    text: 'text-slate-800',
    border: 'border-slate-200/40',
    badge: 'bg-slate-100 text-slate-800',
    accent: 'bg-slate-400',
    gradient: 'linear-gradient(135deg, #94a3b8, #475569)',
    textColor: '#ffffff',
    textBorder: 'rgba(255,255,255,0.2)'
  }
}

export default function PlanningFixeManager() {
  const { confirm } = useConfirmDialog()
  const [plannings, setPlannings] = useState<Planning[]>([])
  const [coaches, setCoaches] = useState<Coach[]>([])
  const [groupes, setGroupes] = useState<Groupe[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editingPlanning, setEditingPlanning] = useState<Planning | null>(null)

  // View states
  const [viewMode, setViewMode] = useState<'liste' | 'bassin'>('bassin')
  const [selectedDayBassin, setSelectedDayBassin] = useState<string>('Lundi')
  const [activeDragLane, setActiveDragLane] = useState<string | null>(null)
  const [filterCoachId, setFilterCoachId] = useState<string>('')
  const [filterGroupeId, setFilterGroupeId] = useState<string>('')

  // Form state
  const [jourSemaine, setJourSemaine] = useState('Lundi')
  const [heureDebut, setHeureDebut] = useState('')
  const [heureFin, setHeureFin] = useState('')
  const [groupeId, setGroupeId] = useState('')
  const [coachIds, setCoachIds] = useState<string[]>([])
  
  // Custom lieu selector state
  const [lieuType, setLieuType] = useState('Grand Bassin - Ligne 1')
  const [lieuCustom, setLieuCustom] = useState('')
  
  const [couleur, setCouleur] = useState('#00bcd4')
  const [actif, setActif] = useState(true)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const response = await fetch('/api/admin/planning-fixe')
      if (response.ok) {
        const data = await response.json()
        setPlannings(data.plannings)
        setCoaches(data.coaches)
        setGroupes(data.groupes)
      }
    } catch (err) {
      setError('Erreur lors du chargement des données')
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setJourSemaine('Lundi')
    setHeureDebut('')
    setHeureFin('')
    setGroupeId('')
    setCoachIds([])
    setLieuType('Grand Bassin - Ligne 1')
    setLieuCustom('')
    setCouleur('#00bcd4')
    setActif(true)
    setEditingPlanning(null)
    setShowForm(false)
  }

  const handleEdit = (planning: Planning) => {
    setEditingPlanning(planning)
    setJourSemaine(planning.jourSemaine)
    setHeureDebut(planning.heureDebut)
    setHeureFin(planning.heureFin)
    setGroupeId(planning.groupeId)
    setCoachIds(planning.coachs.map(c => c.coach.id))
    
    const currentLieu = planning.lieu || 'Grand Bassin - Ligne 1'
    if (PRESET_LIEUX.includes(currentLieu)) {
      setLieuType(currentLieu)
      setLieuCustom('')
    } else {
      setLieuType('Autre')
      setLieuCustom(currentLieu)
    }
    
    setCouleur(planning.couleur || '#00bcd4')
    setActif(planning.actif)
    setShowForm(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    const finalLieu = lieuType === 'Autre' ? lieuCustom : lieuType

    try {
      const url = editingPlanning
        ? `/api/admin/planning-fixe/${editingPlanning.id}`
        : '/api/admin/planning-fixe'

      const response = await fetch(url, {
        method: editingPlanning ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jourSemaine,
          heureDebut,
          heureFin,
          groupeId,
          coachIds,
          lieu: finalLieu,
          couleur,
          actif,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Erreur lors de l\'enregistrement')
      }

      await fetchData()
      resetForm()
    } catch (err) {
      setError(getErrorMessage(err))
    }
  }

  const handleDrop = async (e: React.DragEvent, targetLane: string) => {
    e.preventDefault()
    const planningId = e.dataTransfer.getData('text/plain')
    if (!planningId) return

    const planning = plannings.find(p => p.id === planningId)
    if (!planning) return

    if (planning.lieu === targetLane) return

    try {
      // Optimistic update
      setPlannings(prev => prev.map(p => p.id === planning.id ? { ...p, lieu: targetLane } : p))

      const response = await fetch(`/api/admin/planning-fixe/${planning.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jourSemaine: planning.jourSemaine,
          heureDebut: planning.heureDebut,
          heureFin: planning.heureFin,
          groupeId: planning.groupeId,
          coachIds: planning.coachs.map(c => c.coach.id),
          lieu: targetLane,
          couleur: planning.couleur,
          actif: planning.actif,
        }),
      })

      if (!response.ok) {
        throw new Error('Erreur lors du déplacement')
      }
      
      toast.success(`Créneau déplacé dans ${targetLane}`)
      await fetchData()
    } catch (err) {
      toast.error(getErrorMessage(err))
      await fetchData() // rollback on error
    }
  }

  const handleDelete = async (id: string) => {
    const confirmed = await confirm({
      title: 'Supprimer le créneau',
      message: 'Voulez-vous vraiment supprimer ce créneau hebdomadaire ?',
      confirmText: 'Supprimer',
      cancelText: 'Annuler',
      variant: 'danger',
    })
    if (!confirmed) return

    try {
      const response = await fetch(`/api/admin/planning-fixe/${id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Erreur lors de la suppression')
      }

      await fetchData()
    } catch (err) {
      setError(getErrorMessage(err))
    }
  }

  if (loading) {
    return <p className="text-gray-600">Chargement...</p>
  }  // Group plannings by day
  const planningsByDay: { [key: string]: Planning[] } = {}
  JOURS_SEMAINE.forEach(jour => {
    planningsByDay[jour] = plannings.filter(p => p.jourSemaine === jour)
  })

  const renderForm = () => (
    <div>
      <h3 className="text-xl font-bold mb-4">
        {editingPlanning ? 'Modifier le créneau' : 'Nouveau créneau hebdomadaire'}
      </h3>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Jour de la semaine *
            </label>
            <select
              value={jourSemaine}
              onChange={(e) => setJourSemaine(e.target.value)}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
            >
              {JOURS_SEMAINE.map(jour => (
                <option key={jour} value={jour}>{jour}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Groupe *
            </label>
            <select
              value={groupeId}
              onChange={(e) => setGroupeId(e.target.value)}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
            >
              <option value="">-- Sélectionner un groupe --</option>
              {groupes.map(groupe => (
                <option key={groupe.id} value={groupe.id}>{groupe.nom}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
          <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
            Coachs assignés
            <HelpTooltip title="Attribution des coaches">
              <p>Sélectionnez un ou plusieurs coaches pour ce créneau.</p>
              <p className="mt-1">Chaque coach sélectionné sera facturé pour ce créneau chaque semaine (hors vacances).</p>
            </HelpTooltip>
          </label>
          <div className="border border-gray-300 rounded-lg p-3 max-h-48 overflow-y-auto">
            {coaches.length === 0 && (
              <p className="text-gray-500 text-sm">Aucun coach disponible</p>
            )}
            {coaches.map(coach => (
              <label key={coach.id} className="flex items-center gap-2 py-2 cursor-pointer hover:bg-gray-50 px-2 rounded">
                <input
                  type="checkbox"
                  checked={coachIds.includes(coach.id)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setCoachIds([...coachIds, coach.id])
                    } else {
                      setCoachIds(coachIds.filter(id => id !== coach.id))
                    }
                  }}
                  className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
                />
                <span className="text-sm">{coach.prenom} {coach.nom}</span>
              </label>
            ))}
          </div>
          <p className="text-xs text-gray-500 mt-1">
            {coachIds.length === 0 && 'Aucun coach sélectionné'}
            {coachIds.length === 1 && '1 coach sélectionné'}
            {coachIds.length > 1 && `${coachIds.length} coachs sélectionnés`}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Lieu / Emplacement *
            </label>
            <select
              value={lieuType}
              onChange={(e) => setLieuType(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent mb-2"
            >
              {PRESET_LIEUX.map(p => (
                <option key={p} value={p}>{p}</option>
              ))}
              <option value="Autre">Autre lieu (Saisie manuelle)</option>
            </select>
            {lieuType === 'Autre' && (
              <input
                type="text"
                value={lieuCustom}
                onChange={(e) => setLieuCustom(e.target.value)}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent animate-fadeIn"
                placeholder="Saisissez le lieu (ex: Salle de gym)"
              />
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Couleur
            </label>
            <select
              value={couleur}
              onChange={(e) => setCouleur(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
            >
              {COULEURS.map(c => (
                <option key={c.valeur} value={c.valeur}>
                  {c.nom}
                </option>
              ))}
            </select>
            <div className="mt-2 flex items-center gap-2">
              <div
                className="w-8 h-8 rounded border border-gray-300"
                style={{ backgroundColor: couleur }}
              />
              <span className="text-sm text-gray-600">Aperçu de la couleur</span>
            </div>
          </div>
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
            Créneau actif
          </label>
        </div>

        <div className="flex gap-4">
          <button
            type="submit"
            className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors"
          >
            {editingPlanning ? 'Mettre à jour' : 'Créer'}
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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            Gestion du Planning Fixe
            <HelpTooltip title="Planning Fixe">
              <p>Créneaux hebdomadaires récurrents pour chaque groupe.</p>
              <p className="mt-1">Ces créneaux sont automatiquement comptabilisés dans la facturation des coaches chaque mois.</p>
              <p className="mt-1">Pour les rotations entre coaches, utilisez le Planning Tournant.</p>
            </HelpTooltip>
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            Gérez les créneaux hebdomadaires et assignez les coaches
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="bg-slate-100 p-1 rounded-xl border border-slate-200 flex gap-1 shadow-sm">
            <button
              onClick={() => setViewMode('bassin')}
              className={`px-3 py-1.5 text-xs font-black rounded-lg transition-all flex items-center gap-1 ${
                viewMode === 'bassin'
                  ? 'bg-white text-primary shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              🏊 Vue Bassin
            </button>
            <button
              onClick={() => setViewMode('liste')}
              className={`px-3 py-1.5 text-xs font-black rounded-lg transition-all flex items-center gap-1 ${
                viewMode === 'liste'
                  ? 'bg-white text-primary shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              📋 Vue Liste
            </button>
          </div>
          <button
            onClick={() => {
              setEditingPlanning(null)
              setShowForm(!showForm)
            }}
            className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors text-sm font-semibold shadow-sm"
          >
            {showForm && !editingPlanning ? 'Annuler' : '+ Nouveau créneau'}
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6 rounded">
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {/* Form */}
      {showForm && !editingPlanning && (
        <div className="card p-6 mb-6">
          {renderForm()}
        </div>
      )}

      {/* View Switcher and Content */}
      {viewMode === 'liste' ? (
        <div className="space-y-6">
          {JOURS_SEMAINE.map(jour => (
            <div key={jour} className="card overflow-hidden">
              <div className="bg-gradient-to-r from-primary to-primary-dark text-white px-6 py-3">
                <h3 className="font-bold text-lg">
                  {jour} ({planningsByDay[jour].length} créneaux)
                </h3>
              </div>
              {planningsByDay[jour].length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  Aucun créneau pour ce jour
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="text-left py-3 px-4 font-semibold text-gray-700">Horaire</th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-700">Groupe</th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-700">Coach</th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-700">Lieu</th>
                        <th className="text-center py-3 px-4 font-semibold text-gray-700">Statut</th>
                        <th className="text-center py-3 px-4 font-semibold text-gray-700">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {planningsByDay[jour].map((planning) => (
                        <Fragment key={planning.id}>
                          <tr className="border-t border-gray-200 hover:bg-gray-50">
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-2">
                                <div
                                  className="w-3 h-3 rounded-full"
                                  style={{ backgroundColor: planning.couleur || '#00bcd4' }}
                                />
                                <span className="font-medium">
                                  {planning.heureDebut} - {planning.heureFin}
                                </span>
                              </div>
                            </td>
                            <td className="py-3 px-4">
                              {planning.groupe?.nom || '-'}
                            </td>
                            <td className="py-3 px-4">
                              {planning.coachs.length > 0 ? (
                                <div className="flex flex-wrap gap-1">
                                  {planning.coachs.map((c) => (
                                    <span key={c.id} className="inline-block px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                                      {c.coach.prenom} {c.coach.nom}
                                    </span>
                                  ))}
                                </div>
                              ) : (
                                <span className="text-gray-400">Non assigné</span>
                              )}
                            </td>
                            <td className="py-3 px-4 text-sm text-gray-600">
                              {planning.lieu || '-'}
                            </td>
                            <td className="py-3 px-4 text-center">
                              <span
                                className={`inline-block px-2 py-1 rounded-full text-xs ${
                                  planning.actif
                                    ? 'bg-green-100 text-green-800'
                                    : 'bg-gray-100 text-gray-800'
                                }`}
                              >
                                {planning.actif ? 'Actif' : 'Inactif'}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-center">
                              <div className="flex items-center justify-center gap-2">
                                <button
                                  onClick={() => handleEdit(planning)}
                                  className="text-primary hover:text-primary-dark text-sm font-medium"
                                >
                                  Modifier
                                </button>
                                <span className="text-gray-300">|</span>
                                <button
                                  onClick={() => handleDelete(planning.id)}
                                  className="text-red-600 hover:text-red-800 text-sm font-medium"
                                >
                                  Supprimer
                                </button>
                              </div>
                            </td>
                          </tr>
                          {editingPlanning?.id === planning.id && (
                            <tr className="bg-gray-50 border-t border-b border-gray-200">
                              <td colSpan={6} className="p-6">
                                <div className="card p-6 bg-white border border-gray-200 rounded-lg shadow-sm text-left">
                                  {renderForm()}
                                </div>
                              </td>
                            </tr>
                          )}
                        </Fragment>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-6">
          {/* Day Switcher */}
          <div className="flex flex-wrap gap-2 mb-4 bg-slate-100 p-2 rounded-xl border border-slate-200">
            {JOURS_SEMAINE.map(day => {
              const count = plannings.filter(p => p.jourSemaine === day).length
              return (
                <button
                  key={day}
                  onClick={() => setSelectedDayBassin(day)}
                  className={`px-4 py-2 rounded-lg font-bold text-sm transition-all flex items-center gap-2 ${
                    selectedDayBassin === day
                      ? 'bg-primary text-white shadow-md'
                      : 'text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {day}
                  <span className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded-full ${
                    selectedDayBassin === day ? 'bg-white text-primary' : 'bg-slate-200 text-slate-700'
                  }`}>
                    {count}
                  </span>
                </button>
              )
            })}
          </div>

          {/* Compute dynamic lane assignments & stats */}
          {(() => {
            const dayPlannings = plannings.filter(p => p.jourSemaine === selectedDayBassin)
            
            const laneKeys = [
              'Grand Bassin - Ligne 1',
              'Grand Bassin - Ligne 2',
              'Grand Bassin - Ligne 3',
              'Grand Bassin - Ligne 4',
              'Petit Bassin'
            ]

            const laneAssignments: { [key: string]: Planning[] } = {
              'Grand Bassin - Ligne 1': [],
              'Grand Bassin - Ligne 2': [],
              'Grand Bassin - Ligne 3': [],
              'Grand Bassin - Ligne 4': [],
              'Petit Bassin': [],
            }
            
            const explicitPlannings: Planning[] = []
            const genericPlannings: Planning[] = []
            
            dayPlannings.forEach(p => {
              const lieu = p.lieu || ''
              if (laneKeys.includes(lieu)) {
                explicitPlannings.push(p)
              } else {
                let matchedKey: string | null = null
                if (lieu.includes('Ligne 1')) matchedKey = 'Grand Bassin - Ligne 1'
                else if (lieu.includes('Ligne 2')) matchedKey = 'Grand Bassin - Ligne 2'
                else if (lieu.includes('Ligne 3')) matchedKey = 'Grand Bassin - Ligne 3'
                else if (lieu.includes('Ligne 4')) matchedKey = 'Grand Bassin - Ligne 4'
                else if (lieu.includes('Petit Bassin')) matchedKey = 'Petit Bassin'
                
                if (matchedKey) {
                  explicitPlannings.push({ ...p, lieu: matchedKey })
                } else {
                  genericPlannings.push(p)
                }
              }
            })
            
            explicitPlannings.forEach(p => {
              if (p.lieu && laneAssignments[p.lieu]) {
                laneAssignments[p.lieu].push(p)
              }
            })
            
            const sortedGeneric = [...genericPlannings].sort((a, b) => {
              return timeToMinutes(a.heureDebut) - timeToMinutes(b.heureDebut)
            })
            
            const overlaps = (p1: Planning, p2: Planning): boolean => {
              const start1 = timeToMinutes(p1.heureDebut)
              const end1 = timeToMinutes(p1.heureFin)
              const start2 = timeToMinutes(p2.heureDebut)
              const end2 = timeToMinutes(p2.heureFin)
              return start1 < end2 && start2 < end1
            }
            
            sortedGeneric.forEach(p => {
              let assigned = false
              for (const laneKey of laneKeys) {
                const hasOverlap = laneAssignments[laneKey].some(existing => overlaps(p, existing))
                if (!hasOverlap) {
                  laneAssignments[laneKey].push(p)
                  assigned = true
                  break
                }
              }
              if (!assigned) {
                laneAssignments['Grand Bassin - Ligne 1'].push(p)
              }
            })

            return (
              <>
                {/* Quick Filters Toolbar */}
                <div className="bg-white border border-slate-200/80 rounded-xl p-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-center gap-2 select-none">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">🔍 FILTRES INTERACTIFS</span>
                  </div>
                  
                  <div className="flex flex-wrap items-center gap-4">
                    {/* Filter 1: Coach */}
                    <div className="flex items-center gap-2">
                      <label className="text-xs font-bold text-slate-500">Coach :</label>
                      <select
                        value={filterCoachId}
                        onChange={(e) => setFilterCoachId(e.target.value)}
                        className="px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-semibold focus:ring-2 focus:ring-primary focus:border-transparent outline-none bg-slate-50 text-slate-700 cursor-pointer"
                      >
                        <option value="">-- Tous les Coachs --</option>
                        {coaches.map(c => (
                          <option key={c.id} value={c.id}>{c.prenom} {c.nom}</option>
                        ))}
                      </select>
                    </div>

                    {/* Filter 2: Group */}
                    <div className="flex items-center gap-2">
                      <label className="text-xs font-bold text-slate-500">Groupe :</label>
                      <select
                        value={filterGroupeId}
                        onChange={(e) => setFilterGroupeId(e.target.value)}
                        className="px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-semibold focus:ring-2 focus:ring-primary focus:border-transparent outline-none bg-slate-50 text-slate-700 cursor-pointer"
                      >
                        <option value="">-- Tous les Groupes --</option>
                        {groupes.map(g => (
                          <option key={g.id} value={g.id}>{g.nom}</option>
                        ))}
                      </select>
                    </div>

                    {/* Reset button if any filter is active */}
                    {(filterCoachId || filterGroupeId) && (
                      <button
                        onClick={() => { setFilterCoachId(''); setFilterGroupeId(''); }}
                        className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-extrabold border border-slate-200 transition-colors cursor-pointer"
                      >
                        ❌ Effacer
                      </button>
                    )}
                  </div>
                </div>

                {/* Swimming Pool Grid */}
                <div className="bg-slate-100 rounded-2xl p-4 shadow-inner border border-slate-200 mb-6">
                  <div className="flex items-center justify-between mb-4 px-2">
                    <span className="text-sm font-bold text-slate-700 flex items-center gap-1.5 select-none">
                      🏊 Bassin de Cavaillon • {selectedDayBassin}
                    </span>
                    <span className="text-xs text-slate-500 italic select-none">
                      Axe vertical : 08:00 - 22:00 • Glisser un créneau pour changer de couloir • Cliquer pour modifier
                    </span>
                  </div>

                  <div className="relative h-[720px] bg-gradient-to-b from-cyan-300/10 via-sky-400/5 to-blue-500/10 border-4 border-slate-800 rounded-xl overflow-hidden shadow-lg flex">
                    
                    {/* Ruler column (left) */}
                    <div className="w-14 flex-shrink-0 bg-slate-900 text-slate-400 font-mono text-[9px] select-none flex flex-col justify-between py-4 text-center border-r border-slate-800">
                      <div className="h-10 border-b border-slate-800" />
                      <div className="relative flex-grow h-[calc(100%-2.5rem)]">
                        {Array.from({ length: 15 }).map((_, idx) => {
                          const hour = 8 + idx
                          const topPct = (idx / 14) * 100
                          return (
                            <span
                              key={hour}
                              className="absolute left-0 right-0 text-center font-black -translate-y-1/2 text-slate-400"
                              style={{ top: `${topPct}%` }}
                            >
                              {hour.toString().padStart(2, '0')}:00
                            </span>
                          )
                        })}
                      </div>
                    </div>

                    {/* Lanes column container */}
                    <div className="flex-grow relative grid grid-cols-5 h-full">
                      
                      {/* Horizontal grid lines */}
                      <div className="absolute inset-0 pointer-events-none z-0 mt-10 h-[calc(100%-2.5rem)]">
                        {Array.from({ length: 15 }).map((_, idx) => {
                          const topPct = (idx / 14) * 100
                          return (
                            <div
                              key={idx}
                              className="absolute left-0 right-0 border-t border-cyan-400/15"
                              style={{ top: `${topPct}%` }}
                            />
                          )
                        })}
                      </div>

                      {/* Repeating pool lane separators (vertical ropes) */}
                      {[20, 40, 60, 80].map((leftPct, idx) => {
                        return (
                          <div
                            key={idx}
                            className="absolute top-10 bottom-0 w-1.5 -ml-0.75 z-20 pointer-events-none shadow-sm"
                            style={{
                              left: `${leftPct}%`,
                              background: 'repeating-linear-gradient(to bottom, #ef4444 0px, #ef4444 12px, #ffffff 12px, #ffffff 24px)',
                              borderRadius: '9999px',
                              opacity: 0.8,
                            }}
                          />
                        )
                      })}

                      {/* Lanes mapping */}
                      {[
                        { key: 'Grand Bassin - Ligne 1', label: 'Ligne 1' },
                        { key: 'Grand Bassin - Ligne 2', label: 'Ligne 2' },
                        { key: 'Grand Bassin - Ligne 3', label: 'Ligne 3' },
                        { key: 'Grand Bassin - Ligne 4', label: 'Ligne 4' },
                        { key: 'Petit Bassin', label: 'Petit Bassin' },
                      ].map((lane, laneIdx) => {
                        const columnPlannings = laneAssignments[lane.key] || []
                        
                        // Compute side-by-side layout for overlapping plannings in this lane
                        const sortedPlannings = [...columnPlannings].sort((a, b) => {
                          return timeToMinutes(a.heureDebut) - timeToMinutes(b.heureDebut)
                        })
                        
                        const columns: Planning[][] = []
                        sortedPlannings.forEach(p => {
                          let placed = false
                          for (let i = 0; i < columns.length; i++) {
                            const col = columns[i]
                            const last = col[col.length - 1]
                            const lastEnd = timeToMinutes(last.heureFin)
                            const pStart = timeToMinutes(p.heureDebut)
                            if (pStart >= lastEnd) {
                              col.push(p)
                              placed = true
                              break
                            }
                          }
                          if (!placed) {
                            columns.push([p])
                          }
                        })
                        
                        const totalCols = columns.length
                        const isHovered = activeDragLane === lane.key
                        
                        return (
                          <div
                            key={lane.key}
                            onDragOver={(e) => e.preventDefault()}
                            onDragEnter={() => setActiveDragLane(lane.key)}
                            onDragLeave={() => {
                              if (activeDragLane === lane.key) setActiveDragLane(null)
                            }}
                            onDrop={(e) => {
                              setActiveDragLane(null)
                              handleDrop(e, lane.key)
                            }}
                            className={`relative h-full flex flex-col z-10 border-r border-dashed transition-all duration-150 ${
                              laneIdx === 3 ? 'border-r-4 border-solid border-rose-500/20' : 'border-r-cyan-200/20'
                            } ${isHovered ? 'bg-cyan-500/10 scale-[1.005] ring-2 ring-cyan-400 ring-inset' : ''} last:border-r-0`}
                          >
                            {/* Lane Header */}
                            <div className="h-10 flex items-center justify-center bg-slate-900/80 border-b border-slate-800 select-none">
                              <span className="text-white text-xs font-black tracking-wider uppercase">{lane.label}</span>
                            </div>

                            {/* Lane Body where blocks are rendered */}
                            <div className="relative flex-grow h-[calc(100%-2.5rem)] py-2">
                              {columns.map((col, colIdx) => {
                                const widthPct = 100 / totalCols
                                const leftPct = colIdx * widthPct
                                
                                return col.map(planning => {
                                  const startMin = Math.max(480, Math.min(1320, timeToMinutes(planning.heureDebut)))
                                  const endMin = Math.max(480, Math.min(1320, timeToMinutes(planning.heureFin)))
                                  const topPct = ((startMin - 480) / 840) * 100
                                  const heightPct = Math.max(5, ((endMin - startMin) / 840) * 100)
                                  
                                  const isDynamicallyAssigned = planning.lieu !== lane.key
                                  const color = getCouleurGroupe(planning.groupe?.nom || '')

                                  // Apply quick filters
                                  const isCoachFiltered = filterCoachId && !planning.coachs.some(c => c.coach.id === filterCoachId)
                                  const isGroupeFiltered = filterGroupeId && planning.groupeId !== filterGroupeId
                                  const isDimmed = isCoachFiltered || isGroupeFiltered
                                  
                                  return (
                                    <div
                                      key={planning.id}
                                      draggable
                                      onDragStart={(e) => {
                                        e.dataTransfer.setData('text/plain', planning.id)
                                        e.dataTransfer.effectAllowed = 'move'
                                      }}
                                      onClick={() => {
                                        handleEdit(planning)
                                        setShowForm(true)
                                        window.scrollTo({ top: 0, behavior: 'smooth' })
                                      }}
                                      style={{
                                        top: `${topPct}%`,
                                        height: `${heightPct}%`,
                                        left: `calc(${leftPct}% + 2px)`,
                                        width: `calc(${widthPct}% - 4px)`,
                                        background: planning.couleur ? getCardGradient(planning.couleur) : color.gradient,
                                        color: planning.couleur ? '#ffffff' : color.textColor,
                                        borderColor: planning.couleur ? 'rgba(255, 255, 255, 0.2)' : color.textBorder
                                      }}
                                      className={`absolute rounded-xl p-2 shadow-md cursor-grab active:cursor-grabbing hover:scale-[1.03] hover:shadow-xl hover:z-30 transition-all duration-300 overflow-hidden flex flex-col justify-between group border select-none ${
                                        !planning.actif ? 'opacity-50 stripe-bg' : ''
                                      } ${
                                        isDimmed ? 'opacity-15 scale-[0.96] blur-[0.5px] pointer-events-none' : ''
                                      }`}
                                    >
                                      <div className="leading-tight">
                                        <p className="font-extrabold text-xs tracking-wide truncate drop-shadow-sm flex items-center gap-1">
                                          {planning.groupe?.nom}
                                          {isDynamicallyAssigned && (
                                            <span className="text-[9px] opacity-75" title="Assignation automatique au couloir">⚡</span>
                                          )}
                                        </p>
                                        <p className="text-[9px] font-bold opacity-90 drop-shadow-sm mt-0.5">
                                          {planning.heureDebut} - {planning.heureFin}
                                        </p>
                                      </div>
                                      
                                      <div className="text-[9px] truncate opacity-95 font-semibold mt-1 flex flex-wrap gap-0.5">
                                        {planning.coachs.map(c => (
                                          <span key={c.id} className="bg-white/20 px-1 py-0.5 rounded truncate max-w-full">
                                            {c.coach.prenom}
                                          </span>
                                        ))}
                                        {planning.coachs.length === 0 && <span className="italic text-[8px] opacity-75">Sans coach</span>}
                                      </div>

                                      {/* Tooltip on hover */}
                                      <div className="absolute inset-0 bg-slate-950/95 p-3 text-xs rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col justify-between pointer-events-none z-30 border border-slate-700">
                                        <div>
                                          <p className="font-bold text-cyan-400 text-xs mb-1">{planning.groupe?.nom}</p>
                                          <div className="space-y-1 text-slate-300 text-[10px]">
                                            <p><span className="text-slate-400">⏰ Horaire:</span> {planning.heureDebut} - {planning.heureFin}</p>
                                            <p><span className="text-slate-400">📍 Lieu original:</span> {planning.lieu || 'Non spécifié'}</p>
                                            {isDynamicallyAssigned && (
                                              <p className="text-cyan-300 font-bold"><span className="text-slate-400">📍 Placé dans:</span> {lane.label} (auto)</p>
                                            )}
                                            <p className="font-medium text-slate-200">
                                              👤 Coachs: {planning.coachs.map(c => `${c.coach.prenom} ${c.coach.nom || ''}`).join(', ') || 'Aucun'}
                                            </p>
                                            <p>
                                              <span className="text-slate-400">Statut:</span>{' '}
                                              <span className={planning.actif ? 'text-emerald-400 font-bold' : 'text-slate-400'}>
                                                {planning.actif ? 'Actif' : 'Inactif'}
                                              </span>
                                            </p>
                                          </div>
                                        </div>
                                        <p className="text-[9px] text-cyan-300 text-right font-bold uppercase tracking-wider mt-1">Cliquer pour modifier</p>
                                      </div>
                                    </div>
                                  )
                                })
                              })}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>

              </>
            )
          })()}
        </div>
      )}
    </div>
  )
}

