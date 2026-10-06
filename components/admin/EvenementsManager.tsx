'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import toast from 'react-hot-toast'
import { useConfirmDialog } from '@/components/ConfirmDialog'
import { getErrorMessage } from '@/lib/utils'
import { FicheCompetition } from '@/components/admin/FicheCompetition'
import { ficheResume, parseFicheDescription } from '@/lib/calendar/import-parser'
import { formatShortDateFr } from '@/lib/date'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Evenement {
  id: string
  title: string
  date: Date
  dateFin?: Date | null
  heureDebut?: string | null
  heureFin?: string | null
  description?: string | null
  lieu?: string | null
  type?: string | null
  coachId?: string | null
  couleur?: string | null
  pdfReglement?: string | null
  actif: boolean
}

interface GeneralRegulationsSynthesis {
  tarifs: string[]
  penalites: string[]
  categories: string[]
  reglesEngagements: string[]
}

interface EnrichDetail {
  sheetTitle:  string
  sheetDate:   string
  eventTitle:  string | null
  eventId:     string | null
  matched:     boolean
  score:       number
}

interface EnrichResult {
  sheets:     number
  enriched:   number
  notMatched: number
  synthesis:  GeneralRegulationsSynthesis | null
  details:    EnrichDetail[]
}

interface Coach {
  id: string
  prenom: string
  nom: string
}

interface ExtractedEvent {
  _id: string
  title: string
  date: string
  dateFin?: string | null
  // Champs enrichis par le parser (fiches de compétition section 5.3)
  heureDebut?: string | null
  heureFin?: string | null
  description?: string | null
  lieu?: string | null
  categories?: string | null
  type: string
  couleur: string
  selected: boolean
  isDuplicate?: boolean  // déjà présent en base (même date + titre similaire)
  pdfReglement?: string | null
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const getReglementUrl = (pdfPath: string | null | undefined, desc: string | null | undefined) => {
  if (!pdfPath) return ''
  const fiche = parseFicheDescription(desc)
  return fiche?.pageNumber ? `${pdfPath}#page=${fiche.pageNumber}` : pdfPath
}

const TYPE_LABELS: Record<string, string> = {
  evenement:    'Événement',
  competition:  'Compétition',
  entrainement: 'Entraînement',
  stage:        'Stage',
}

const TYPE_STYLES: Record<string, string> = {
  evenement:    'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
  competition:  'bg-blue-50 text-blue-700 ring-1 ring-blue-200',
  entrainement: 'bg-violet-50 text-violet-700 ring-1 ring-violet-200',
  stage:        'bg-amber-50 text-amber-700 ring-1 ring-amber-200',
}



function getMonthKey(date: Date) {
  const d = new Date(date)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function getMonthLabel(key: string) {
  const [year, month] = key.split('-')
  return new Date(Number(year), Number(month) - 1, 1)
    .toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
    .replace(/^\w/, c => c.toUpperCase())
}

function isUpcoming(date: Date) {
  return new Date(date) >= new Date(new Date().setHours(0, 0, 0, 0))
}

// ─── Helpers hors composant ───────────────────────────────────────────────────

const LAST_IMPORT_KEY = 'cd84_last_import'

/**
 * Clé de déduplication : même logique que la route bulk.
 * Date ISO + 30 premiers caractères du titre normalisé.
 */
function clientDedupeKey(date: string, title: string): string {
  const norm = title
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 30)
  return `${date}|${norm}`
}

// ─── Composant principal ──────────────────────────────────────────────────────

interface Groupe {
  id: string
  nom: string
  couleur?: string | null
}

export default function EvenementsManager() {
  const [evenements, setEvenements] = useState<Evenement[]>([])
  const [coaches, setCoaches] = useState<Coach[]>([])
  const [groupes, setGroupes] = useState<Groupe[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [uploadingPdf, setUploadingPdf] = useState(false)
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState<string>('all')
  const [filterPeriode, setFilterPeriode] = useState<'all' | 'upcoming' | 'past'>('all')
  const [deletingAll, setDeletingAll] = useState(false)
  const [ficheOuverte, setFicheOuverte] = useState<{ description: string; title: string } | null>(null)
  const [lastImport, setLastImport] = useState<string | null>(null)
  const [importSearch, setImportSearch] = useState('')
  const { confirm } = useConfirmDialog()

  useEffect(() => {
    const saved = localStorage.getItem(LAST_IMPORT_KEY)
    if (saved) setLastImport(saved)
  }, [])

  // Import calendrier
  const [showImportModal, setShowImportModal] = useState(false)
  const [importLoading, setImportLoading] = useState(false)
  const [importError, setImportError] = useState<string | null>(null)
  const [extractedEvents, setExtractedEvents] = useState<ExtractedEvent[]>([])
  const [importingEvents, setImportingEvents] = useState(false)
  const calendarPdfInputRef = useRef<HTMLInputElement>(null)
  
  // États pour déplier les lignes d'importation PDF
  const [expandedImportIds, setExpandedImportIds] = useState<Record<string, boolean>>({})
  const [importSynthesis, setImportSynthesis] = useState<GeneralRegulationsSynthesis | null>(null)

  // Import règlement (étape 2 : enrichissement)
  const reglementPdfInputRef = useRef<HTMLInputElement>(null)
  const [reglementLoading, setReglementLoading] = useState(false)
  const [showEnrichModal, setShowEnrichModal] = useState(false)
  const [enrichResult, setEnrichResult] = useState<EnrichResult | null>(null)

  // Importation Automatique Calendrier + Règlement en 1 étape
  const [showAutoImportModal, setShowAutoImportModal] = useState(false)
  const [autoImportLoading, setAutoImportLoading] = useState(false)
  const [calendarFile, setCalendarFile] = useState<File | null>(null)
  const [reglementFile, setReglementFile] = useState<File | null>(null)
  const [regionalFile, setRegionalFile] = useState<File | null>(null)

  const handleAutoImport = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!calendarFile) {
      toast.error('Veuillez sélectionner au moins le fichier PDF du calendrier')
      return
    }
    setAutoImportLoading(true)
    try {
      const fd = new FormData()
      fd.append('calendar', calendarFile)
      if (reglementFile) {
        fd.append('reglement', reglementFile)
      }
      if (regionalFile) {
        fd.append('regional', regionalFile)
      }

      const res = await fetch('/api/admin/import-calendrier-automatique', {
        method: 'POST',
        body: fd,
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error ?? 'Erreur lors de l\'importation automatique')
      }

      const data = await res.json()
      toast.success(`Importation réussie : ${data.insertionsCount} compétitions créées et distribuées sur les plannings !`)

      const now = new Date().toISOString()
      localStorage.setItem(LAST_IMPORT_KEY, now)
      setLastImport(now)

      await fetchData()
      setShowAutoImportModal(false)
      setCalendarFile(null)
      setReglementFile(null)
      setRegionalFile(null)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur lors de l\'importation')
    } finally {
      setAutoImportLoading(false)
    }
  }

  const toggleExpandImport = (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setExpandedImportIds(prev => ({ ...prev, [id]: !prev[id] }))
  }

  const emptyForm = {
    title: '', date: '', dateFin: '', heureDebut: '', heureFin: '',
    description: '', lieu: '', type: 'competition', coachId: '',
    couleur: '#3b82f6', pdfReglement: '', actif: true,
    targetGroupIds: [] as string[],
  }
  const [formData, setFormData] = useState(emptyForm)

  const [loadError, setLoadError] = useState(false)

  useEffect(() => { fetchData() }, [])

  const fetchData = async () => {
    setLoadError(false)
    try {
      const [evRes, coachRes, groupeRes] = await Promise.all([
        fetch('/api/admin/evenements'),
        fetch('/api/admin/coaches'),
        fetch('/api/admin/groupes'),
      ])
      if (!evRes.ok) throw new Error('Impossible de charger les événements')
      setEvenements((await evRes.json()).evenements)
      if (coachRes.ok) setCoaches((await coachRes.json()).coaches)
      if (groupeRes.ok) {
        const gData = await groupeRes.json()
        setGroupes(gData.groupes || (Array.isArray(gData) ? gData : []))
      }
    } catch (e) {
      console.error(e)
      setLoadError(true)
    } finally {
      setLoading(false)
    }
  }

  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')

  // ─── Stats ────────────────────────────────────────────────────────────────

  const stats = useMemo(() => {
    const total       = evenements.length
    const upcoming    = evenements.filter(e => isUpcoming(e.date)).length
    const competitions = evenements.filter(e => e.type === 'competition').length
    const actifs      = evenements.filter(e => e.actif).length
    return { total, upcoming, competitions, actifs }
  }, [evenements])

  // ─── Filtrage + groupement ────────────────────────────────────────────────

  const filtered = useMemo(() => {
    return evenements
      .filter(e => filterType === 'all' || e.type === filterType)
      .filter(e => {
        if (filterPeriode === 'upcoming') return isUpcoming(e.date)
        if (filterPeriode === 'past') return !isUpcoming(e.date)
        return true
      })
      .filter(e =>
        !search ||
        e.title.toLowerCase().includes(search.toLowerCase()) ||
        (e.lieu ?? '').toLowerCase().includes(search.toLowerCase())
      )
      .sort((a, b) => {
        const diff = new Date(a.date).getTime() - new Date(b.date).getTime()
        return sortOrder === 'asc' ? diff : -diff
      })
  }, [evenements, filterType, filterPeriode, search, sortOrder])

  const grouped = useMemo(() => {
    const map = new Map<string, Evenement[]>()
    for (const ev of filtered) {
      const key = getMonthKey(new Date(ev.date))
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(ev)
    }
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b))
  }, [filtered])

  // ─── CRUD ─────────────────────────────────────────────────────────────────

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const url = editingId ? `/api/admin/evenements/${editingId}` : '/api/admin/evenements'
    const method = editingId ? 'PUT' : 'POST'

    // Construction de la description finale incluant __TARGET_GROUPS__ si des groupes sont cochés
    let finalDescription = (formData.description || '').split('__TARGET_GROUPS__:')[0].trim()
    if (formData.targetGroupIds.length > 0) {
      finalDescription = `${finalDescription}\n__TARGET_GROUPS__:${JSON.stringify(formData.targetGroupIds)}`
    }

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title:       formData.title,
          date:        formData.date,
          type:        formData.type,
          couleur:     formData.couleur,
          actif:       formData.actif,
          coachId:     formData.coachId || null,
          dateFin:     formData.dateFin || null,
          heureDebut:  formData.heureDebut || null,
          heureFin:    formData.heureFin || null,
          description: finalDescription || null,
          lieu:        formData.lieu || null,
          pdfReglement: formData.pdfReglement || null,
        }),
      })
      if (res.ok) {
        const data = await res.json()
        if (editingId) {
          // Mise à jour locale — pas de rechargement complet
          setEvenements(prev => prev.map(e => e.id === editingId ? data.evenement : e))
        } else {
          setEvenements(prev => [data.evenement, ...prev])
        }
        resetForm()
        toast.success(editingId ? 'Événement modifié' : 'Événement créé')
      } else {
        const err = await res.json()
        toast.error('Erreur : ' + err.error)
      }
    } catch { toast.error('Erreur lors de la sauvegarde') }
  }

  const handleEdit = (ev: Evenement) => {
    setEditingId(ev.id)

    let extractedGroupIds: string[] = []
    let cleanDesc = ev.description || ''
    if (cleanDesc.includes('__TARGET_GROUPS__:')) {
      const parts = cleanDesc.split('__TARGET_GROUPS__:')
      cleanDesc = parts[0].trim()
      try {
        extractedGroupIds = JSON.parse(parts[1].trim())
      } catch {
        extractedGroupIds = []
      }
    }

    setFormData({
      title:       ev.title,
      date:        new Date(ev.date).toISOString().split('T')[0],
      dateFin:     ev.dateFin ? new Date(ev.dateFin).toISOString().split('T')[0] : '',
      heureDebut:  ev.heureDebut || '',
      heureFin:    ev.heureFin || '',
      description: cleanDesc,
      lieu:        ev.lieu || '',
      type:        ev.type || 'competition',
      coachId:     ev.coachId || '',
      couleur:     ev.couleur || '#3b82f6',
      pdfReglement: ev.pdfReglement || '',
      actif:       ev.actif,
      targetGroupIds: extractedGroupIds,
    })
    setShowForm(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleDelete = async (id: string) => {
    const ok = await confirm({
      title: 'Supprimer l\'événement',
      message: 'Êtes-vous sûr de vouloir supprimer cet événement ?',
      confirmText: 'Supprimer',
      variant: 'danger',
    })
    if (!ok) return
    try {
      const res = await fetch(`/api/admin/evenements/${id}`, { method: 'DELETE' })
      if (res.ok) {
        // Mise à jour locale immédiate — pas de rechargement réseau
        setEvenements(prev => prev.filter(e => e.id !== id))
        toast.success('Événement supprimé')
      } else {
        toast.error('Erreur lors de la suppression')
      }
    } catch { toast.error('Erreur lors de la suppression') }
  }

  // ── Toggle actif via PATCH (ne transmet que le champ modifié) ───────────
  const handleToggleActif = async (ev: Evenement) => {
    // Mise à jour optimiste immédiate
    setEvenements(prev => prev.map(e => e.id === ev.id ? { ...e, actif: !e.actif } : e))
    try {
      const res = await fetch(`/api/admin/evenements/${ev.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ actif: !ev.actif }),
      })
      if (res.ok) {
        toast.success(ev.actif ? 'Événement désactivé' : 'Événement activé')
      } else {
        // Rollback si erreur
        setEvenements(prev => prev.map(e => e.id === ev.id ? { ...e, actif: ev.actif } : e))
        toast.error('Erreur lors de la mise à jour')
      }
    } catch {
      setEvenements(prev => prev.map(e => e.id === ev.id ? { ...e, actif: ev.actif } : e))
      toast.error('Erreur réseau')
    }
  }

  // ── Export CSV ───────────────────────────────────────────────────────────
  const handleExportCSV = () => {
    const cols = ['Titre', 'Date', 'Date fin', 'Heure début', 'Heure fin', 'Lieu', 'Type', 'Catégories', 'Actif']
    const rows = filtered.map(ev => [
      ev.title,
      new Date(ev.date).toLocaleDateString('fr-FR'),
      ev.dateFin ? new Date(ev.dateFin).toLocaleDateString('fr-FR') : '',
      ev.heureDebut ?? '',
      ev.heureFin ?? '',
      ev.lieu ?? '',
      TYPE_LABELS[ev.type ?? ''] ?? ev.type ?? '',
      // Extraire les catégories depuis la description si fiche structurée
      ficheResume(ev.description) ?? '',
      ev.actif ? 'Oui' : 'Non',
    ].map(v => `"${String(v).replace(/"/g, '""')}"`))

    const csv = [cols.join(';'), ...rows.map(r => r.join(';'))].join('\n')
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href     = url
    a.download = `calendrier-cd84-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
    toast.success(`${filtered.length} événement(s) exporté(s)`)
  }

  // ── Nouveau : tout supprimer ─────────────────────────────────────────────
  const handleDeleteAll = async () => {
    const ok = await confirm({
      title: 'Supprimer tous les événements',
      message: `Supprimer les ${evenements.length} événements du calendrier ? Cette action est irréversible.`,
      confirmText: 'Tout supprimer',
      variant: 'danger',
    })
    if (!ok) return
    setDeletingAll(true)
    try {
      const res = await fetch('/api/admin/evenements', { method: 'DELETE' })
      if (res.ok) {
        const data = await res.json()
        setEvenements([])
        toast.success(`${data.deleted} événement(s) supprimé(s)`)
      } else {
        toast.error('Erreur lors de la suppression')
      }
    } catch (err) {
      console.error('handleDeleteAll erreur:', err)
      toast.error(`Erreur : ${err instanceof Error ? err.message : String(err)}`)
    }
    finally { setDeletingAll(false) }
  }

  const resetForm = () => {
    setFormData(emptyForm)
    setEditingId(null)
    setShowForm(false)
  }

  const handlePdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.type !== 'application/pdf') { toast.error('Veuillez sélectionner un fichier PDF'); return }
    setUploadingPdf(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch('/api/admin/upload-pdf', { method: 'POST', body: fd })
      if (!res.ok) { const err = await res.json(); throw new Error(err.error) }
      const data = await res.json()
      setFormData(prev => ({ ...prev, pdfReglement: data.path }))
      toast.success('PDF uploadé avec succès')
    } catch (err) {
      toast.error(getErrorMessage(err))
    } finally {
      setUploadingPdf(false)
      e.target.value = ''
    }
  }

  // ─── Import PDF ───────────────────────────────────────────────────────────

  const handleCalendarPdfImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.type !== 'application/pdf') { toast.error('Fichier PDF requis'); return }
    setImportLoading(true)
    setImportError(null)
    setExtractedEvents([])
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch('/api/admin/import-calendar-pdf', { method: 'POST', body: fd })
      if (!res.ok) { const err = await res.json(); throw new Error(err.error) }
      const data = await res.json()

      if (data.synthesis) {
        setImportSynthesis(data.synthesis)
      } else {
        setImportSynthesis(null)
      }

      if ((data.events ?? []).length === 0) {
        setImportError('Aucun événement détecté. Vérifiez le format du PDF.')
        return
      }

      // Construire le Set des événements déjà en base pour détection côté client
      const existingKeys = new Set(
        evenements.map(ev =>
          clientDedupeKey(new Date(ev.date).toISOString().slice(0, 10), ev.title)
        )
      )

      const events: ExtractedEvent[] = (data.events ?? []).map(
        (ev: Omit<ExtractedEvent, '_id' | 'selected' | 'isDuplicate'>, i: number) => {
          const isDuplicate = existingKeys.has(clientDedupeKey(ev.date, ev.title))
          return {
            ...ev,
            _id: `import-${i}-${Date.now()}`,
            selected: !isDuplicate,  // doublons décochés par défaut
            isDuplicate,
          }
        }
      )

      setExtractedEvents(events)

      const duplicates = events.filter(e => e.isDuplicate).length
      const enriched   = events.filter(e => e.heureDebut || e.description).length
      const parts: string[] = [`${events.length} événement(s) détecté(s)`]
      if (enriched > 0)   parts.push(`${enriched} avec fiche détaillée`)
      if (duplicates > 0) parts.push(`${duplicates} doublon(s) détecté(s) et décoché(s)`)
      toast.success(parts.join(' · '))

    } catch (err) {
      setImportError(`Impossible d'extraire les événements : ${err instanceof Error ? err.message : 'Erreur inconnue'}`)
      toast.error('Erreur lors de l\'analyse du PDF')
    } finally {
      setImportLoading(false)
      e.target.value = ''
    }
  }

  // ── Import en masse : 1 requête au lieu de N ─────────────────────────────
  const handleImportSelected = async () => {
    const toImport = extractedEvents.filter(ev => ev.selected)
    if (toImport.length === 0) { toast.error('Sélectionnez au moins un événement'); return }
    setImportingEvents(true)
    try {
      const res = await fetch('/api/admin/evenements/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          events: toImport.map(ev => ({
            title:        ev.title,
            date:         ev.date,
            dateFin:      ev.dateFin || null,
            heureDebut:   ev.heureDebut || null,
            heureFin:     ev.heureFin || null,
            description:  ev.description || (ev.categories ? `Catégories : ${ev.categories}` : null),
            lieu:         ev.lieu || null,
            type:         ev.type,
            couleur:      ev.couleur,
            coachId:      null,
            pdfReglement: ev.pdfReglement || null,
            actif:        true,
          })),
        }),
      })

      if (!res.ok) {
        const err = await res.json()
        toast.error(`Erreur : ${err.error ?? 'Import échoué'}`)
        return
      }

      const result = await res.json()
      const { created, skipped, duplicates } = result as {
        created: number; skipped: number; duplicates: string[]
      }

      const now = new Date().toISOString()
      localStorage.setItem(LAST_IMPORT_KEY, now)
      setLastImport(now)
      await fetchData()
      setShowImportModal(false)
      setExtractedEvents([])
      setImportSearch('')
      // Basculer sur "À venir" pour voir les événements importés
      setFilterPeriode('upcoming')

      if (skipped > 0) {
        toast.success(`${created} importé(s) · ${skipped} doublon(s) ignoré(s)`)
      } else {
        toast.success(`${created} événement(s) importé(s) !`)
      }
    } catch (err) {
      console.error('Erreur import bulk:', err)
      toast.error(`Erreur : ${err instanceof Error ? err.message : 'Erreur inconnue'}`)
    } finally {
      setImportingEvents(false)
    }
  }

  // ─── Import règlement (enrichissement) ───────────────────────────────────

  const handleReglementPdfImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.type !== 'application/pdf') { toast.error('Fichier PDF requis'); return }
    setReglementLoading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch('/api/admin/import-reglement-pdf', { method: 'POST', body: fd })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error ?? 'Erreur lors de l\'analyse du règlement')
      }
      const data: EnrichResult = await res.json()
      setEnrichResult(data)
      setShowEnrichModal(true)
      await fetchData() // Rafraîchir les événements enrichis
      toast.success(`${data.enriched} événement(s) enrichi(s) avec les fiches de compétition`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur lors de l\'import du règlement')
    } finally {
      setReglementLoading(false)
      e.target.value = ''
    }
  }

  const duplicateCount   = extractedEvents.filter(ev => ev.isDuplicate).length
  const selectedCount    = extractedEvents.filter(ev => ev.selected).length
  const toggleSelectAll  = (v: boolean) =>
    // Ne sélectionne que les non-doublons quand on coche "tout"
    setExtractedEvents(p => p.map(ev => ({ ...ev, selected: ev.isDuplicate ? false : v })))
  const toggleSelectAllIncludingDuplicates = (v: boolean) =>
    setExtractedEvents(p => p.map(ev => ({ ...ev, selected: v })))
  const toggleSelect = (id: string) =>
    setExtractedEvents(p => p.map(ev => ev._id === id ? { ...ev, selected: !ev.selected } : ev))

  // ─── Loading ──────────────────────────────────────────────────────────────

  if (loading) return (
    <div className="flex items-center justify-center py-24">
      <div className="flex flex-col items-center gap-3 text-gray-400">
        <svg className="animate-spin w-8 h-8" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
        </svg>
        <span className="text-sm font-medium">Chargement…</span>
      </div>
    </div>
  )

  if (loadError) return (
    <div className="flex flex-col items-center justify-center py-24 gap-4">
      <div className="w-14 h-14 bg-red-50 rounded-2xl flex items-center justify-center text-2xl">⚠️</div>
      <div className="text-center">
        <p className="font-semibold text-gray-800">Impossible de charger les événements</p>
        <p className="text-sm text-gray-400 mt-1">Vérifiez votre connexion ou les logs serveur</p>
      </div>
      <button onClick={() => { setLoading(true); fetchData() }}
        className="px-4 py-2 text-sm font-medium bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors">
        Réessayer
      </button>
    </div>
  )

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">

      {/* ── En-tête ──────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Gestion des événements</h2>
          <p className="text-sm text-gray-500 mt-0.5">{stats.total} événement{stats.total > 1 ? 's' : ''} enregistré{stats.total > 1 ? 's' : ''}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Export CSV */}
          {filtered.length > 0 && (
            <button
              onClick={handleExportCSV}
              title={`Exporter ${filtered.length} événement(s) en CSV`}
              className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>
              </svg>
              CSV
            </button>
          )}

          {/* Tout supprimer */}
          {evenements.length > 0 && (
            <button
              onClick={handleDeleteAll}
              disabled={deletingAll}
              title="Supprimer tous les événements"
              className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-red-600 bg-white border border-red-200 rounded-lg hover:bg-red-50 disabled:opacity-50 transition-colors"
            >
              {deletingAll ? (
                <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                </svg>
              )}
              {deletingAll ? 'Suppression…' : 'Tout supprimer'}
            </button>
          )}

          {/* Importation Automatique Calendrier + Règlement en 1 étape */}
          <div className="flex flex-col items-end gap-0.5">
            <button
              onClick={() => { setShowAutoImportModal(true); setCalendarFile(null); setReglementFile(null); setRegionalFile(null); }}
              className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg hover:bg-emerald-100 transition-colors cursor-pointer"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"/>
              </svg>
              📅 Importation Automatique
            </button>
            {lastImport && (
              <span className="text-xs text-gray-400">
                Dernier import : {new Date(lastImport).toLocaleDateString('fr-FR', {
                  day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
                })}
              </span>
            )}
          </div>

          {/* Nouvel événement */}
          <button
            onClick={() => { setShowForm(!showForm); if (showForm) resetForm() }}
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors"
          >
            {showForm ? (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
                </svg>
                Annuler
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/>
                </svg>
                Nouvel événement
              </>
            )}
          </button>
        </div>
      </div>

      {/* ── Stats ────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Total',        value: stats.total,        icon: '📅', color: 'bg-gray-50 border-gray-200',     periode: 'all'      },
          { label: 'À venir',      value: stats.upcoming,     icon: '⏳', color: 'bg-blue-50 border-blue-200',     periode: 'upcoming' },
          { label: 'Compétitions', value: stats.competitions, icon: '🏊', color: 'bg-indigo-50 border-indigo-200', periode: null       },
          { label: 'Actifs',       value: stats.actifs,       icon: '✅', color: 'bg-emerald-50 border-emerald-200', periode: null     },
        ].map(s => (
          <div
            key={s.label}
            onClick={() => { if (s.periode) setFilterPeriode(filterPeriode === s.periode ? 'all' : s.periode as 'all' | 'upcoming' | 'past') }}
            className={`${s.color} border rounded-xl px-4 py-3 flex items-center gap-3 ${s.periode ? 'cursor-pointer hover:opacity-80 transition-opacity' : ''} ${filterPeriode === s.periode && s.periode ? 'ring-2 ring-primary' : ''}`}
          >
            <span className="text-2xl">{s.icon}</span>
            <div>
              <p className="text-2xl font-bold text-gray-900 leading-none">{s.value}</p>
              <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Formulaire ───────────────────────────────────────────────────── */}
      {showForm && (
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="h-1 w-full" style={{ backgroundColor: formData.couleur }} />
          <div className="p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center text-white text-lg"
                style={{ backgroundColor: formData.couleur }}>
                {formData.type === 'competition' ? '🏊' : formData.type === 'stage' ? '🏕️' : formData.type === 'entrainement' ? '💪' : '📅'}
              </div>
              <div>
                <h3 className="font-bold text-gray-900">{editingId ? 'Modifier l\'événement' : 'Nouvel événement'}</h3>
                <p className="text-xs text-gray-400">Renseignez les informations ci-dessous</p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Informations générales</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Titre *</label>
                    <input type="text" required value={formData.title}
                      onChange={e => setFormData({ ...formData, title: e.target.value })}
                      placeholder="Championnat départemental U14..."
                      className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-lg bg-gray-50 focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Type *</label>
                    <select required value={formData.type}
                      onChange={e => setFormData({ ...formData, type: e.target.value })}
                      className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-lg bg-gray-50 focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none">
                      {Object.entries(TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Lieu</label>
                    <input type="text" value={formData.lieu}
                      onChange={e => setFormData({ ...formData, lieu: e.target.value })}
                      placeholder="Piscine de Pertuis…"
                      className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-lg bg-gray-50 focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none" />
                  </div>
                </div>
              </div>

              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Dates & Horaires</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Date début *</label>
                    <input type="date" required value={formData.date}
                      onChange={e => setFormData({ ...formData, date: e.target.value })}
                      className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-lg bg-gray-50 focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Date fin</label>
                    <input type="date" value={formData.dateFin}
                      onChange={e => setFormData({ ...formData, dateFin: e.target.value })}
                      className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-lg bg-gray-50 focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Heure début</label>
                    <input type="time" value={formData.heureDebut}
                      onChange={e => setFormData({ ...formData, heureDebut: e.target.value })}
                      className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-lg bg-gray-50 focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Heure fin</label>
                    <input type="time" value={formData.heureFin}
                      onChange={e => setFormData({ ...formData, heureFin: e.target.value })}
                      className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-lg bg-gray-50 focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none" />
                  </div>
                </div>
              </div>

              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Détails</p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Coach</label>
                    <select value={formData.coachId}
                      onChange={e => setFormData({ ...formData, coachId: e.target.value })}
                      className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-lg bg-gray-50 focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none">
                      <option value="">Aucun coach</option>
                      {coaches.map(c => <option key={c.id} value={c.id}>{c.prenom} {c.nom}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Couleur</label>
                    <div className="flex items-center gap-2">
                      <input type="color" value={formData.couleur}
                        onChange={e => setFormData({ ...formData, couleur: e.target.value })}
                        className="w-10 h-10 rounded-lg border border-gray-200 cursor-pointer p-0.5" />
                      <span className="text-sm text-gray-500 font-mono">{formData.couleur}</span>
                    </div>
                  </div>
                  <div className="flex items-end pb-1">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <div className={`w-10 h-5 rounded-full transition-colors relative ${formData.actif ? 'bg-primary' : 'bg-gray-200'}`}
                        onClick={() => setFormData({ ...formData, actif: !formData.actif })}>
                        <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${formData.actif ? 'translate-x-5' : 'translate-x-0.5'}`} />
                      </div>
                      <span className="text-sm font-medium text-gray-700">Événement actif</span>
                    </label>
                  </div>

                  {groupes.length > 0 && (
                    <div className="md:col-span-3 bg-gray-50/80 p-3.5 rounded-xl border border-gray-200/80 space-y-2">
                      <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        👥 Groupes ciblés & concernés par cette compétition
                      </label>
                      <p className="text-xs text-gray-500">
                        Sélectionnez les groupes d&apos;entraînement qui participent (ex: Juniors, Maîtres, Avenirs...) :
                      </p>
                      <div className="flex flex-wrap gap-2 pt-1">
                        {groupes.map(g => {
                          const isSelected = formData.targetGroupIds.includes(g.id)
                          return (
                            <button
                              key={g.id}
                              type="button"
                              onClick={() => {
                                setFormData(prev => {
                                  const exists = prev.targetGroupIds.includes(g.id)
                                  const nextIds = exists
                                    ? prev.targetGroupIds.filter(id => id !== g.id)
                                    : [...prev.targetGroupIds, g.id]
                                  
                                  if (!exists) {
                                    toast.success(`Groupe "${g.nom}" associé !`)
                                  } else {
                                    toast(`Groupe "${g.nom}" retiré`)
                                  }

                                  return { ...prev, targetGroupIds: nextIds }
                                })
                              }}
                              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all flex items-center gap-1.5 shadow-sm ${
                                isSelected
                                  ? 'bg-blue-600 text-white border-blue-700 font-semibold ring-2 ring-blue-300'
                                  : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-100'
                              }`}
                            >
                              <span
                                className="w-2.5 h-2.5 rounded-full inline-block shrink-0"
                                style={{ backgroundColor: g.couleur || '#3b82f6' }}
                              />
                              {g.nom}
                              {isSelected && <span className="ml-1 text-white font-bold">✓</span>}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  <div className="md:col-span-3">
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Description & Détails</label>
                    <textarea value={formData.description}
                      onChange={e => setFormData({ ...formData, description: e.target.value })}
                      rows={3} placeholder="Informations supplémentaires…"
                      className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-lg bg-gray-50 focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none resize-none" />
                  </div>

                  <div className="md:col-span-3">
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">PDF Règlement</label>
                    <div className="flex items-center gap-3 flex-wrap">
                      <label className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors cursor-pointer border border-gray-200">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/>
                        </svg>
                        {uploadingPdf ? 'Upload…' : 'Choisir un PDF'}
                        <input type="file" accept=".pdf,application/pdf" onChange={handlePdfUpload}
                          disabled={uploadingPdf} className="hidden" />
                      </label>
                      {formData.pdfReglement && (
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">
                          <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                          </svg>
                          <a href={getReglementUrl(formData.pdfReglement, formData.description)} target="_blank" rel="noopener noreferrer" className="hover:underline truncate max-w-48">
                            {formData.pdfReglement.split('/').pop()}
                          </a>
                          <button type="button" onClick={() => setFormData({ ...formData, pdfReglement: '' })} className="text-green-500 hover:text-red-600 ml-1">✕</button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
                <button type="submit"
                  className="px-5 py-2.5 text-sm font-semibold bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors">
                  {editingId ? 'Enregistrer les modifications' : 'Créer l\'événement'}
                </button>
                <button type="button" onClick={resetForm}
                  className="px-5 py-2.5 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors">
                  Annuler
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Filtres & recherche ───────────────────────────────────────────── */}
      <div className="flex items-center gap-3 flex-wrap">
        {/* Recherche */}
        <div className="relative flex-1 min-w-52">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
          </svg>
          <input
            type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher un événement ou un lieu…"
            className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all" />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">✕</button>
          )}
        </div>

        {/* Chips de filtre type */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {[['all', 'Tous'], ...Object.entries(TYPE_LABELS)].map(([v, l]) => (
            <button key={v} onClick={() => setFilterType(v)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                filterType === v ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}>
              {l}
            </button>
          ))}
        </div>

        {/* Chips période */}
        <div className="flex items-center gap-1.5">
          {([['all', 'Tous'], ['upcoming', 'À venir'], ['past', 'Passés']] as const).map(([v, l]) => (
            <button key={v} onClick={() => setFilterPeriode(v)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                filterPeriode === v ? 'bg-gray-700 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}>
              {l}
            </button>
          ))}
        </div>

        {/* Tri date */}
        <button
          onClick={() => setSortOrder(s => s === 'asc' ? 'desc' : 'asc')}
          title={sortOrder === 'asc' ? 'Tri croissant — cliquer pour inverser' : 'Tri décroissant — cliquer pour inverser'}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors shrink-0 ml-auto"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            {sortOrder === 'asc'
              ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12"/>
              : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h9m5-4v12m0 0l-4-4m4 4l4-4"/>
            }
          </svg>
          {sortOrder === 'asc' ? 'Plus ancien d\'abord' : 'Plus récent d\'abord'}
        </button>
      </div>

      {/* Résumé du filtre actif */}
      {(filterType !== 'all' || filterPeriode !== 'all' || search) && (
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <span>{filtered.length} résultat{filtered.length > 1 ? 's' : ''}</span>
          <button onClick={() => { setFilterType('all'); setFilterPeriode('all'); setSearch('') }}
            className="text-primary hover:underline">
            Réinitialiser les filtres
          </button>
        </div>
      )}

      {/* ── Timeline groupée par mois ─────────────────────────────────────── */}
      {grouped.length === 0 ? (
        <div className="bg-white border border-gray-200 border-dashed rounded-2xl py-16 flex flex-col items-center gap-3 text-gray-400">
          <svg className="w-12 h-12 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
          </svg>
          <p className="font-medium text-sm">Aucun événement{search || filterType !== 'all' || filterPeriode !== 'all' ? ' pour ces critères' : ''}</p>
          {!search && filterType === 'all' && filterPeriode === 'all' && (
            <button onClick={() => setShowForm(true)} className="mt-1 text-sm text-primary hover:underline">
              Créer le premier événement
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {grouped.map(([monthKey, events]) => (
            <div key={monthKey}>
              {/* En-tête de mois */}
              <div className="flex items-center gap-3 mb-3">
                <h3 className="text-sm font-bold text-gray-700 capitalize">{getMonthLabel(monthKey)}</h3>
                <div className="flex-1 h-px bg-gray-100" />
                <span className="text-xs text-gray-400">{events.length} événement{events.length > 1 ? 's' : ''}</span>
              </div>

              {/* Cartes d'événements */}
              <div className="space-y-2">
                {events.map(ev => {
                  const upcoming = isUpcoming(ev.date)
                  return (
                    <div key={ev.id}
                      className={`group bg-white border rounded-xl overflow-hidden flex transition-all hover:shadow-md ${
                        !ev.actif ? 'opacity-60' : ''
                      } ${upcoming ? 'border-gray-200' : 'border-gray-100'}`}>
                      {/* Bande couleur gauche */}
                      <div className="w-1 shrink-0" style={{ backgroundColor: ev.couleur ?? '#94a3b8' }} />

                      {/* Contenu principal */}
                      <div className="flex-1 px-4 py-3 flex items-center gap-4 min-w-0">
                        {/* Date */}
                        <div className="shrink-0 w-14 text-center">
                          <p className="text-xl font-bold text-gray-800 leading-none">
                            {new Date(ev.date).getDate()}
                          </p>
                          <p className="text-xs text-gray-400 uppercase tracking-wide mt-0.5">
                            {new Date(ev.date).toLocaleDateString('fr-FR', { month: 'short' })}
                          </p>
                          {ev.dateFin && (
                            <p className="text-xs text-gray-400 mt-0.5">
                              → {new Date(ev.dateFin).getDate()}
                            </p>
                          )}
                        </div>

                        {/* Séparateur */}
                        <div className="w-px h-10 bg-gray-100 shrink-0" />

                        {/* Infos */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-semibold text-gray-900 text-sm truncate">{ev.title}</p>
                            {!ev.actif && (
                              <span className="text-xs px-1.5 py-0.5 bg-gray-100 text-gray-400 rounded">inactif</span>
                            )}
                            {upcoming && ev.actif && (
                              <span className="text-xs px-1.5 py-0.5 bg-blue-50 text-blue-500 rounded font-medium">à venir</span>
                            )}
                          </div>
                          <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                            {ev.lieu && (
                              <span className="flex items-center gap-1 text-xs text-gray-500">
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
                                </svg>
                                {ev.lieu}
                              </span>
                            )}
                            {ev.heureDebut && (
                              <span className="flex items-center gap-1 text-xs text-gray-500">
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
                                </svg>
                                {ev.heureDebut}{ev.heureFin ? ` – ${ev.heureFin}` : ''}
                              </span>
                            )}
                            {ficheResume(ev.description) && (
                              <span className="text-xs text-gray-400 truncate max-w-xs">{ficheResume(ev.description)}</span>
                            )}
                          </div>
                        </div>

                        {/* Type + PDF + Fiche */}
                        <div className="shrink-0 flex items-center gap-2">
                          {/* Bouton fiche de compétition */}
                          {parseFicheDescription(ev.description) && (
                            <button
                              onClick={() => setFicheOuverte({ description: ev.description!, title: ev.title })}
                              title="Voir la fiche de compétition"
                              className="w-7 h-7 flex items-center justify-center bg-indigo-50 text-indigo-500 rounded-lg hover:bg-indigo-100 transition-colors"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"/>
                              </svg>
                            </button>
                          )}
                          {ev.pdfReglement && (
                            <a href={getReglementUrl(ev.pdfReglement, ev.description)} target="_blank" rel="noopener noreferrer"
                              title="Voir le règlement"
                              className="w-7 h-7 flex items-center justify-center bg-red-50 text-red-500 rounded-lg hover:bg-red-100 transition-colors">
                              <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd"/>
                              </svg>
                            </a>
                          )}
                          <span className={`text-xs px-2 py-1 rounded-lg font-medium ${TYPE_STYLES[ev.type ?? 'evenement'] ?? 'bg-gray-50 text-gray-600 ring-1 ring-gray-200'}`}>
                            {TYPE_LABELS[ev.type ?? ''] ?? ev.type}
                          </span>
                        </div>
                      </div>

                      {/* Actions (apparaissent au hover) */}
                      <div className="shrink-0 flex items-center gap-0.5 px-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        {/* Toggle actif */}
                        <button
                          onClick={() => handleToggleActif(ev)}
                          title={ev.actif ? 'Désactiver' : 'Activer'}
                          className={`p-2 rounded-lg transition-colors ${
                            ev.actif
                              ? 'text-gray-400 hover:text-amber-600 hover:bg-amber-50'
                              : 'text-emerald-500 hover:text-emerald-700 hover:bg-emerald-50'
                          }`}>
                          {ev.actif ? (
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"/>
                            </svg>
                          ) : (
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                            </svg>
                          )}
                        </button>
                        <button onClick={() => handleEdit(ev)} title="Modifier"
                          className="p-2 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                          </svg>
                        </button>
                        <button onClick={() => handleDelete(ev.id)} title="Supprimer"
                          className="p-2 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                          </svg>
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Modal Import PDF ──────────────────────────────────────────────── */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-amber-100 rounded-xl flex items-center justify-center text-lg">📄</div>
                <div>
                  <h3 className="font-bold text-gray-900">Étape 1 — Importer le calendrier PDF</h3>
                  <p className="text-xs text-gray-400 mt-0.5">Crée les événements depuis le fichier calendrier CD Vaucluse</p>
                </div>
              </div>
              <button onClick={() => { setShowImportModal(false); setExtractedEvents([]); setImportError(null); setImportSearch(''); setImportSynthesis(null) }}
                className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
                </svg>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {/* Zone upload */}
              {!importLoading && extractedEvents.length === 0 && (
                <div className="space-y-4">
                  <input ref={calendarPdfInputRef} type="file" accept=".pdf,application/pdf"
                    onChange={handleCalendarPdfImport} className="hidden" />
                  <button onClick={() => calendarPdfInputRef.current?.click()}
                    className="w-full border-2 border-dashed border-amber-200 rounded-2xl p-12 flex flex-col items-center gap-4 hover:border-amber-400 hover:bg-amber-50/50 transition-all group">
                    <div className="w-16 h-16 bg-amber-100 rounded-2xl flex items-center justify-center text-3xl group-hover:scale-110 transition-transform">📅</div>
                    <div className="text-center">
                      <p className="font-semibold text-gray-800">Sélectionner le PDF du calendrier</p>
                      <p className="text-sm text-gray-500 mt-1">
                        Ex : <code className="bg-gray-100 px-1.5 py-0.5 rounded text-xs">cdnatation84-calendrier-competitions-2026-v06.pdf</code>
                      </p>
                      <p className="text-xs text-gray-400 mt-1">Les dates et intitulés seront extraits. Ensuite, utilisez l'étape 2 pour enrichir avec les fiches du règlement sportif.</p>
                    </div>
                    <span className="px-5 py-2 bg-amber-500 text-white rounded-xl text-sm font-semibold group-hover:bg-amber-600 transition-colors shadow-sm">
                      Sélectionner le fichier
                    </span>
                  </button>
                </div>
              )}

              {/* Chargement */}
              {importLoading && (
                <div className="flex flex-col items-center justify-center py-20 gap-4">
                  <div className="w-14 h-14 border-4 border-amber-200 rounded-full animate-spin border-t-amber-500" />
                  <p className="font-medium text-gray-700">Analyse du calendrier…</p>
                  <p className="text-sm text-gray-400">Extraction du texte et des fiches de compétition</p>
                </div>
              )}

              {/* Erreur */}
              {importError && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex gap-3">
                  <span className="text-xl shrink-0">⚠️</span>
                  <div>
                    <p className="font-semibold text-red-800 text-sm">Erreur d&apos;extraction</p>
                    <p className="text-sm text-red-600 mt-0.5">{importError}</p>
                    <button onClick={() => { setImportError(null); calendarPdfInputRef.current?.click() }}
                      className="mt-2 text-sm text-red-700 underline">Réessayer</button>
                  </div>
                </div>
              )}

              {/* Synthèse du Règlement Sportif */}
              {extractedEvents.length > 0 && importSynthesis && (
                <div className="bg-gradient-to-br from-blue-50/80 to-indigo-50/50 border border-blue-100 rounded-2xl shadow-sm overflow-hidden p-5 space-y-4">
                  <div className="flex items-center gap-2 border-b border-blue-100 pb-2.5">
                    <span className="text-xl">🏆</span>
                    <div>
                      <h4 className="font-bold text-gray-800 text-sm">Synthèse des Règlements & Conditions CD84 (Saison 2026)</h4>
                      <p className="text-[10px] text-gray-400">Extrait automatiquement du document de règlement sportif départemental</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* Tarifs */}
                    <div className="bg-white/60 backdrop-blur-sm border border-white/50 rounded-xl p-3.5 space-y-2">
                      <p className="font-bold text-xs text-blue-800 flex items-center gap-1.5">
                        <span>💳</span> Droits d'engagement
                      </p>
                      <ul className="space-y-1 text-[11px] text-gray-600 leading-normal">
                        {importSynthesis.tarifs.map((t, idx) => (
                          <li key={idx} className="flex items-start gap-1">
                            <span className="text-blue-400 shrink-0">•</span>
                            <span>{t}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Pénalités */}
                    <div className="bg-white/60 backdrop-blur-sm border border-white/50 rounded-xl p-3.5 space-y-2">
                      <p className="font-bold text-xs text-amber-800 flex items-center gap-1.5">
                        <span>⚠️</span> Pénalités & Amendes
                      </p>
                      <ul className="space-y-1 text-[11px] text-gray-600 leading-normal">
                        {importSynthesis.penalites.map((p, idx) => (
                          <li key={idx} className="flex items-start gap-1">
                            <span className="text-amber-400 shrink-0">•</span>
                            <span>{p.replace(/^•\s*/, '')}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Catégories */}
                    <div className="bg-white/60 backdrop-blur-sm border border-white/50 rounded-xl p-3.5 space-y-2">
                      <p className="font-bold text-xs text-emerald-800 flex items-center gap-1.5">
                        <span>🏊</span> Catégories d'âges (2026)
                      </p>
                      <ul className="space-y-1 text-[11px] text-gray-600 leading-normal">
                        {importSynthesis.categories.map((c, idx) => (
                          <li key={idx} className="flex items-start gap-1">
                            <span className="text-emerald-400 shrink-0">•</span>
                            <span>{c}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Règles */}
                    <div className="bg-white/60 backdrop-blur-sm border border-white/50 rounded-xl p-3.5 space-y-2">
                      <p className="font-bold text-xs text-indigo-800 flex items-center gap-1.5">
                        <span>📋</span> Délais & Obligations
                      </p>
                      <ul className="space-y-1 text-[11px] text-gray-600 leading-normal">
                        {importSynthesis.reglesEngagements.map((r, idx) => (
                          <li key={idx} className="flex items-start gap-1">
                            <span className="text-indigo-400 shrink-0">•</span>
                            <span>{r}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )}

              {/* Tableau prévisualisation */}
              {extractedEvents.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-2 cursor-pointer text-sm">
                      <input type="checkbox"
                        checked={selectedCount === extractedEvents.filter(e => !e.isDuplicate).length && selectedCount > 0}
                        onChange={e => toggleSelectAll(e.target.checked)}
                        className="w-4 h-4 text-amber-500 rounded" />
                      <span className="font-medium text-gray-700">Tout sélectionner</span>
                      <span className="text-gray-400">— {selectedCount} / {extractedEvents.length}</span>
                    </label>
                    <div className="flex items-center gap-2 flex-wrap justify-end">
                      {/* Recherche dans le tableau */}
                      <div className="relative">
                        <svg className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
                        </svg>
                        <input
                          type="text"
                          value={importSearch}
                          onChange={e => setImportSearch(e.target.value)}
                          placeholder="Filtrer…"
                          className="pl-7 pr-3 py-1 text-xs border border-gray-200 rounded-lg bg-white focus:ring-1 focus:ring-amber-300 focus:border-amber-400 outline-none w-36"
                        />
                        {importSearch && (
                          <button onClick={() => setImportSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs">✕</button>
                        )}
                      </div>
                      {extractedEvents.some(e => e.heureDebut || e.description) && (
                        <span className="text-xs text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg">
                          ✓ {extractedEvents.filter(e => e.heureDebut || e.description).length} fiches
                        </span>
                      )}
                      {duplicateCount > 0 && (
                        <button
                          onClick={() => toggleSelectAllIncludingDuplicates(
                            extractedEvents.filter(e => e.isDuplicate).some(e => !e.selected)
                          )}
                          className="text-xs text-orange-600 bg-orange-50 px-2 py-1 rounded-lg hover:bg-orange-100 transition-colors"
                        >
                          ⚠ {duplicateCount} doublon{duplicateCount > 1 ? 's' : ''} — {
                            extractedEvents.filter(e => e.isDuplicate).some(e => e.selected)
                              ? 'désélectionner' : 'sélectionner'
                          }
                        </button>
                      )}
                      <button onClick={() => { setExtractedEvents([]); setImportError(null); setImportSearch(''); setImportSynthesis(null) }}
                        className="text-xs text-gray-400 hover:text-gray-600">
                        ← Autre PDF
                      </button>
                    </div>
                  </div>

                  <div className="border border-gray-200 rounded-xl overflow-hidden">
                    <div className="overflow-x-auto max-h-96">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50 sticky top-0">
                          <tr>
                            <th className="py-2.5 px-3 w-8"></th>
                            <th className="py-2.5 px-3 w-6"></th> {/* Chevron */}
                            <th className="py-2.5 px-3 w-5"></th>
                            <th className="py-2.5 px-3 text-left font-semibold text-gray-600 text-xs">Titre</th>
                            <th className="py-2.5 px-3 text-left font-semibold text-gray-600 text-xs">Date(s)</th>
                            <th className="py-2.5 px-3 text-left font-semibold text-gray-600 text-xs">Lieu</th>
                            <th className="py-2.5 px-3 text-left font-semibold text-gray-600 text-xs">Horaire</th>
                            <th className="py-2.5 px-3 text-left font-semibold text-gray-600 text-xs">Catégories</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                          {extractedEvents
                            .filter(ev =>
                              !importSearch ||
                              ev.title.toLowerCase().includes(importSearch.toLowerCase()) ||
                              (ev.lieu ?? '').toLowerCase().includes(importSearch.toLowerCase())
                            )
                            .map(ev => {
                              const isExpanded = !!expandedImportIds[ev._id]
                              return (
                                <tr key={ev._id} className="border-t border-gray-100">
                                  <td colSpan={8} className="p-0">
                                    <table className="w-full text-sm">
                                      <tbody>
                                        <tr className={`hover:bg-gray-50/50 ${ev.isDuplicate ? 'bg-orange-50/10' : ''}`}>
                                          {/* Select checkbox */}
                                          <td className="py-2.5 px-3 w-8 text-center">
                                            <input
                                              type="checkbox"
                                              checked={ev.selected}
                                              onChange={() => toggleSelect(ev._id)}
                                              onClick={e => e.stopPropagation()}
                                              className="w-4 h-4 text-amber-500 rounded focus:ring-amber-400"
                                            />
                                          </td>
                                          {/* Accordion Toggle Chevron */}
                                          <td className="py-2.5 px-3 w-6 text-center">
                                            {(ev.heureDebut || ev.description) ? (
                                              <button
                                                type="button"
                                                onClick={(e) => toggleExpandImport(ev._id, e)}
                                                className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                                              >
                                                <svg
                                                  className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                                                  fill="none"
                                                  stroke="currentColor"
                                                  viewBox="0 0 24 24"
                                                >
                                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                                </svg>
                                              </button>
                                            ) : null}
                                          </td>
                                          {/* Color marker dot */}
                                          <td className="py-2 px-3 w-5">
                                            <span className="inline-block w-3 h-3 rounded-full" style={{ backgroundColor: ev.couleur }} />
                                          </td>
                                          {/* Title */}
                                          <td className="py-2 px-3 font-medium text-gray-900">
                                            <div className="flex items-center gap-1.5 flex-wrap">
                                              {ev.title}
                                              {ev.isDuplicate && (
                                                <span title="Déjà présent en base" className="text-xs px-1.5 py-0.5 bg-orange-100 text-orange-600 rounded font-medium">
                                                  doublon
                                                </span>
                                              )}
                                            </div>
                                          </td>
                                          {/* Date */}
                                          <td className="py-2 px-3 text-gray-500 whitespace-nowrap text-xs w-36">
                                             {formatShortDateFr(ev.date)}
                                             {ev.dateFin && <span className="text-gray-400"> → {formatShortDateFr(ev.dateFin)}</span>}
                                          </td>
                                          {/* Lieu */}
                                          <td className="py-2 px-3 text-gray-500 text-xs w-28">{ev.lieu || '—'}</td>
                                          {/* Time */}
                                          <td className="py-2 px-3 text-gray-500 text-xs w-20 whitespace-nowrap">
                                            {ev.heureDebut || '—'}
                                          </td>
                                          {/* Categories */}
                                          <td className="py-2 px-3 text-gray-400 text-xs w-24 truncate">{ev.categories || '—'}</td>
                                        </tr>

                                        {/* Expanded Details Row */}
                                        {isExpanded && (ev.heureDebut || ev.description) && (
                                          <tr className="bg-gray-50/50">
                                            <td colSpan={8} className="p-4 border-t border-gray-100">
                                              <div className="border border-gray-200 rounded-xl bg-white p-4 shadow-sm space-y-4">
                                                {(() => {
                                                  const sheet = parseFicheDescription(ev.description)
                                                  if (!sheet) return <p className="text-xs text-gray-500">Pas de fiche de compétition détaillée disponible.</p>
                                                  return (
                                                    <div className="space-y-4 text-xs">
                                                      <div className="flex items-center justify-between border-b pb-2">
                                                        <h4 className="font-bold text-gray-800 text-sm">📋 {sheet.title || ev.title}</h4>
                                                        {sheet.lieu && <span className="text-gray-500 font-medium">📍 Lieu : {sheet.lieu}</span>}
                                                      </div>
                                                      
                                                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                        {/* Conditions & Awards */}
                                                        <div className="space-y-3">
                                                          {sheet.conditions && (
                                                            <div className="bg-blue-50/60 border border-blue-100 rounded-lg p-3">
                                                              <p className="font-bold text-blue-800 mb-1">💡 Conditions de participation :</p>
                                                              <p className="text-blue-900 leading-relaxed">{sheet.conditions}</p>
                                                            </div>
                                                          )}
                                                          {sheet.recompense && sheet.recompense !== 'Aucune' && (
                                                            <div className="bg-amber-50/60 border border-amber-100 rounded-lg p-3">
                                                              <p className="font-bold text-amber-800 mb-1">🏆 Récompenses :</p>
                                                              <p className="text-amber-900">{sheet.recompense}</p>
                                                            </div>
                                                          )}
                                                          <div className="flex gap-2">
                                                            {sheet.droits.individuel && (
                                                              <div className="flex-1 bg-emerald-50 border border-emerald-100 rounded-lg p-2.5 text-center">
                                                                <p className="text-emerald-600 font-semibold uppercase tracking-wide text-[10px]">Individuel</p>
                                                                <p className="text-sm font-bold text-emerald-700 mt-0.5">{sheet.droits.individuel}</p>
                                                              </div>
                                                            )}
                                                            {sheet.droits.relais && (
                                                              <div className="flex-1 bg-teal-50 border border-teal-100 rounded-lg p-2.5 text-center">
                                                                <p className="text-teal-600 font-semibold uppercase tracking-wide text-[10px]">Relais</p>
                                                                <p className="text-sm font-bold text-teal-700 mt-0.5">{sheet.droits.relais}</p>
                                                              </div>
                                                            )}
                                                          </div>
                                                        </div>
                                                        
                                                        {/* Sessions Program */}
                                                        <div className="space-y-3">
                                                          <p className="font-bold text-gray-700">📅 Programme des sessions :</p>
                                                          <div className="space-y-2">
                                                            {sheet.sessions.map((session, sIdx) => (
                                                              <div key={sIdx} className="border border-gray-100 rounded-lg overflow-hidden shadow-sm">
                                                                <div className="bg-gray-50 px-3 py-1.5 flex items-center justify-between font-semibold border-b">
                                                                  <span className="capitalize">{session.label}</span>
                                                                  <span className="text-[10px] text-gray-500 font-normal">
                                                                    {session.ouverturePortes && `Portes : ${session.ouverturePortes} · `}
                                                                    {session.echauffement && `Éch. : ${session.echauffement} · `}
                                                                    {session.heureDebut && `Début : ${session.heureDebut}`}
                                                                  </span>
                                                                </div>
                                                                {session.epreuves.length > 0 && (
                                                                  <div className="p-2 flex flex-wrap gap-1 bg-white">
                                                                    {session.epreuves.map((e, eIdx) => (
                                                                      <span key={eIdx} className="px-2 py-0.5 bg-gray-50 text-gray-600 border rounded text-[10px]">
                                                                        {e}
                                                                      </span>
                                                                    ))}
                                                                  </div>
                                                                )}
                                                              </div>
                                                            ))}
                                                          </div>
                                                        </div>
                                                      </div>
                                                    </div>
                                                  )
                                                })()}
                                              </div>
                                            </td>
                                          </tr>
                                        )}
                                      </tbody>
                                    </table>
                                  </td>
                                </tr>
                              )
                            })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {extractedEvents.length > 0 && (
              <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between bg-gray-50/80 rounded-b-2xl">
                <p className="text-sm text-gray-600">
                  <span className="font-bold text-gray-900">{selectedCount}</span> événement{selectedCount > 1 ? 's' : ''} à importer
                </p>
                <div className="flex gap-2">
                  <button onClick={() => { setShowImportModal(false); setExtractedEvents([]); setImportSearch(''); setImportSynthesis(null) }}
                    className="px-4 py-2 text-sm text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                    Annuler
                  </button>
                  <button onClick={handleImportSelected} disabled={selectedCount === 0 || importingEvents}
                    className="flex items-center gap-2 px-5 py-2 text-sm font-semibold bg-amber-500 text-white rounded-lg hover:bg-amber-600 disabled:opacity-50 transition-colors">
                    {importingEvents ? (
                      <><svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>Import en cours…</>
                    ) : (
                      <><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/></svg>Importer {selectedCount} événement{selectedCount > 1 ? 's' : ''}</>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      {/* ── Modal fiche compétition ───────────────────────────────────────── */}
      {ficheOuverte && (
        <FicheCompetition
          description={ficheOuverte.description}
          eventTitle={ficheOuverte.title}
          onClose={() => setFicheOuverte(null)}
        />
      )}

      {/* ── Modal résultat enrichissement règlement ───────────────────────── */}
      {showEnrichModal && enrichResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col">
            {/* En-tête */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-violet-100 rounded-xl flex items-center justify-center text-lg">✅</div>
                <div>
                  <h3 className="font-bold text-gray-900">Enrichissement terminé</h3>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {enrichResult.sheets} fiche(s) dans le règlement ·{' '}
                    <span className="text-violet-600 font-medium">{enrichResult.enriched} événement(s) enrichi(s)</span>
                    {enrichResult.notMatched > 0 && ` · ${enrichResult.notMatched} non associé(s)`}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowEnrichModal(false)}
                className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
                </svg>
              </button>
            </div>

            {/* Corps */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {/* Résumé stats */}
              <div className="grid grid-cols-3 gap-3 mb-4">
                <div className="bg-violet-50 border border-violet-100 rounded-xl p-3 text-center">
                  <p className="text-2xl font-bold text-violet-700">{enrichResult.sheets}</p>
                  <p className="text-xs text-violet-500 mt-0.5">Fiches trouvées</p>
                </div>
                <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3 text-center">
                  <p className="text-2xl font-bold text-emerald-700">{enrichResult.enriched}</p>
                  <p className="text-xs text-emerald-500 mt-0.5">Événements enrichis</p>
                </div>
                <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 text-center">
                  <p className="text-2xl font-bold text-amber-700">{enrichResult.notMatched}</p>
                  <p className="text-xs text-amber-500 mt-0.5">Non associés</p>
                </div>
              </div>

              {/* Tableau de correspondances */}
              <div className="rounded-xl border border-gray-100 overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Fiche règlement</th>
                      <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Événement enrichi</th>
                      <th className="px-4 py-2.5 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">Statut</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {enrichResult.details.map((d, i) => (
                      <tr key={i} className={d.matched ? 'bg-white' : 'bg-amber-50/50'}>
                        <td className="px-4 py-2.5">
                          <p className="font-medium text-gray-800 text-xs truncate max-w-[200px]">{d.sheetTitle}</p>
                          <p className="text-xs text-gray-400">
                            {d.sheetDate ? new Date(d.sheetDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                          </p>
                        </td>
                        <td className="px-4 py-2.5">
                          {d.eventTitle ? (
                            <p className="text-xs text-gray-700 truncate max-w-[200px]">{d.eventTitle}</p>
                          ) : (
                            <p className="text-xs text-amber-500 italic">Aucun événement à cette date</p>
                          )}
                        </td>
                        <td className="px-4 py-2.5 text-center">
                          {d.matched ? (
                            <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/>
                              </svg>
                              Enrichi
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                              </svg>
                              Non trouvé
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Synthèse règlement général si présente */}
              {enrichResult.synthesis && enrichResult.synthesis.tarifs.length > 0 && (
                <div className="mt-3 bg-gray-50 border border-gray-100 rounded-xl p-4">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Règlement général — tarifs extraits</p>
                  <ul className="space-y-1">
                    {enrichResult.synthesis.tarifs.slice(0, 5).map((t, i) => (
                      <li key={i} className="text-xs text-gray-600">· {t}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Pied */}
            <div className="px-6 py-4 border-t border-gray-100 flex justify-end bg-gray-50/80 rounded-b-2xl">
              <button
                onClick={() => setShowEnrichModal(false)}
                className="px-6 py-2 text-sm font-semibold bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal Importation Automatique Calendrier + Règlement ────────────────── */}
      {showAutoImportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg flex flex-col overflow-hidden animate-fade-in-up">
            {/* En-tête */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/50">
              <div className="flex items-center gap-2.5">
                <span className="text-xl">📅</span>
                <div>
                  <h3 className="font-bold text-gray-900">Importation Automatique FFN</h3>
                  <p className="text-xs text-gray-400 mt-0.5">Saison 2026 / 2027 — Détection intelligente</p>
                </div>
              </div>
              <button
                onClick={() => { if (!autoImportLoading) setShowAutoImportModal(false); }}
                className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 transition-colors cursor-pointer"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
                </svg>
              </button>
            </div>

            {/* Corps du Formulaire */}
            <form onSubmit={handleAutoImport} className="p-6 space-y-5">
              {/* Note informative */}
              <div className="bg-sky-50 border border-sky-100 p-4 rounded-xl text-xs text-sky-800 leading-relaxed font-medium space-y-1">
                <p className="font-bold text-sky-900 text-sm">💡 Comment ça marche ?</p>
                <p>Uploadez le PDF du calendrier (départemental ou régional). Si vous disposez déjà des règlements sportifs (CD84 et/ou PACA), ajoutez-les pour lier les fiches d&apos;épreuves, ouvertures de portes et horaires. Sinon, importez uniquement le calendrier : le système créera automatiquement toutes les compétitions futures sur les plannings des groupes !</p>
              </div>

              {/* Fichier 1 : Calendrier */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide">1. Calendrier des compétitions (PDF) *</label>
                <div className="relative border-2 border-dashed border-gray-200 rounded-xl p-4 hover:border-emerald-400 transition-colors bg-gray-50/30">
                  <input
                    type="file"
                    required
                    accept="application/pdf"
                    onChange={e => setCalendarFile(e.target.files?.[0] || null)}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <div className="text-center space-y-1">
                    <span className="text-2xl block">📅</span>
                    <span className="text-xs font-semibold text-gray-600 block">
                      {calendarFile ? calendarFile.name : 'Sélectionner le PDF du Calendrier (CD84 ou Régional)'}
                    </span>
                    {calendarFile && (
                      <span className="text-[10px] text-emerald-600 font-medium font-mono">Fichier sélectionné ({Math.round(calendarFile.size / 1024)} KB)</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Fichier 2 : Règlement CD84 */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide">2. Règlement sportif départemental CD84 (PDF) <span className="text-gray-400 font-normal lowercase">(optionnel)</span></label>
                <div className="relative border-2 border-dashed border-gray-200 rounded-xl p-4 hover:border-indigo-400 transition-colors bg-gray-50/30">
                  <input
                    type="file"
                    accept="application/pdf"
                    onChange={e => setReglementFile(e.target.files?.[0] || null)}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <div className="text-center space-y-1">
                    <span className="text-2xl block">🏆</span>
                    <span className="text-xs font-semibold text-gray-600 block">
                      {reglementFile ? reglementFile.name : 'Sélectionner le Règlement CD84 avec fiches détaillées (optionnel)'}
                    </span>
                    {reglementFile && (
                      <span className="text-[10px] text-indigo-600 font-medium font-mono">Fichier sélectionné ({Math.round(reglementFile.size / 1024)} KB)</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Fichier 3 : Règlement Régional */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide">3. Règlement sportif régional PACA (PDF) <span className="text-gray-400 font-normal lowercase">(optionnel - dès réception)</span></label>
                <div className="relative border-2 border-dashed border-gray-200 rounded-xl p-4 hover:border-violet-400 transition-colors bg-gray-50/30">
                  <input
                    type="file"
                    accept="application/pdf"
                    onChange={e => setRegionalFile(e.target.files?.[0] || null)}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <div className="text-center space-y-1">
                    <span className="text-2xl block">🌐</span>
                    <span className="text-xs font-semibold text-gray-600 block">
                      {regionalFile ? regionalFile.name : 'Sélectionner le Règlement PACA (optionnel)'}
                    </span>
                    {regionalFile && (
                      <span className="text-[10px] text-violet-600 font-medium font-mono">Fichier sélectionné ({Math.round(regionalFile.size / 1024)} KB)</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Boutons d'action */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  disabled={autoImportLoading}
                  onClick={() => setShowAutoImportModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-gray-500 bg-gray-50 hover:bg-gray-100 rounded-lg disabled:opacity-50 transition-colors cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={autoImportLoading || !calendarFile || !reglementFile}
                  className="px-5 py-2.5 text-xs font-black bg-primary text-white rounded-lg hover:bg-primary-dark shadow-sm hover:shadow transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center gap-1.5"
                >
                  {autoImportLoading ? (
                    <>
                      <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Traitement en cours…
                    </>
                  ) : (
                    <>
                      <span>🚀</span> Démarrer l&apos;importation
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

