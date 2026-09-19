'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import toast from 'react-hot-toast'
import { useConfirmDialog } from '@/components/ConfirmDialog'
import { getErrorMessage } from '@/lib/utils'

interface KnowledgeEntry {
  id: string
  categorie: string
  question: string
  reponse: string
  motsCles: string | null
  priorite: number
  actif: boolean
  createdAt: string
  updatedAt: string
}

const CATEGORIES = [
  { value: 'general', label: 'Général', icon: '💬' },
  { value: 'inscriptions', label: 'Inscriptions', icon: '📝' },
  { value: 'tarifs', label: 'Tarifs', icon: '💰' },
  { value: 'horaires', label: 'Horaires', icon: '🕒' },
  { value: 'competitions', label: 'Compétitions', icon: '🏆' },
  { value: 'equipement', label: 'Équipement', icon: '🏊' },
  { value: 'reglement', label: 'Règlement', icon: '📜' },
  { value: 'autre', label: 'Autre', icon: '⚙️' },
]

export default function ChatbotKnowledgeManager() {
  const [entries, setEntries] = useState<KnowledgeEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  
  // UI states
  const [showModal, setShowModal] = useState(false)
  const [editingEntry, setEditingEntry] = useState<KnowledgeEntry | null>(null)
  
  // Filters & Search
  const [searchTerm, setSearchTerm] = useState('')
  const [filterCategorie, setFilterCategorie] = useState<string>('')
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all')
  
  // Selection
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [bulkCategory, setBulkCategory] = useState<string>('')

  // Pagination
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10

  const { confirm } = useConfirmDialog()

  // Form state
  const [categorie, setCategorie] = useState('general')
  const [question, setQuestion] = useState('')
  const [reponse, setReponse] = useState('')
  const [motsCles, setMotsCles] = useState('')
  const [priorite, setPriorite] = useState('0')
  const [actif, setActif] = useState(true)

  // Simulator state
  const [showTester, setShowTester] = useState(true)
  const [testQuestion, setTestQuestion] = useState('')
  const [testResponse, setTestResponse] = useState<string | null>(null)
  const [testingLoading, setTestingLoading] = useState(false)
  const [testDurationMs, setTestDurationMs] = useState<number | null>(null)
  const [testModel, setTestModel] = useState<string | null>(null)
  const [clearingCache, setClearingCache] = useState(false)

  const handleRunTest = async (questionToTest?: string) => {
    const q = (questionToTest !== undefined ? questionToTest : testQuestion).trim()
    if (!q) {
      toast.error('Veuillez saisir une question à tester')
      return
    }
    if (questionToTest !== undefined) {
      setTestQuestion(q)
    }

    try {
      setTestingLoading(true)
      setTestResponse(null)
      const res = await fetch('/api/admin/chatbot-knowledge/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: q }),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Erreur lors du test')
      }

      setTestResponse(data.response)
      setTestDurationMs(data.durationMs)
      setTestModel(data.model)
    } catch (err) {
      toast.error(getErrorMessage(err))
    } finally {
      setTestingLoading(false)
    }
  }

  const handleClearCache = async () => {
    try {
      setClearingCache(true)
      const res = await fetch('/api/admin/chatbot-knowledge/test', { method: 'DELETE' })
      if (!res.ok) throw new Error('Erreur lors de la purge du cache')
      toast.success('Cache IA invalidé ! Les données fraîches sont rechargées.')
    } catch (err) {
      toast.error(getErrorMessage(err))
    } finally {
      setClearingCache(false)
    }
  }

  const fetchEntries = useCallback(async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/admin/chatbot-knowledge')
      if (response.ok) {
        const data = await response.json()
        setEntries(data.entries || [])
      } else {
        const errData = await response.json()
        setError(errData.error || 'Erreur lors du chargement des connaissances')
      }
    } catch {
      setError('Erreur lors du chargement de la base de connaissances')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchEntries()
  }, [fetchEntries])

  // Reset form inputs
  const resetForm = useCallback(() => {
    setCategorie('general')
    setQuestion('')
    setReponse('')
    setMotsCles('')
    setPriorite('0')
    setActif(true)
    setEditingEntry(null)
    setShowModal(false)
  }, [])

  // Open modal for editing
  const handleEdit = (entry: KnowledgeEntry) => {
    setEditingEntry(entry)
    setCategorie(entry.categorie)
    setQuestion(entry.question)
    setReponse(entry.reponse)
    setMotsCles(entry.motsCles || '')
    setPriorite(entry.priorite.toString())
    setActif(entry.actif)
    setShowModal(true)
  }

  // Open modal for creating
  const handleNewEntry = () => {
    setEditingEntry(null)
    setCategorie('general')
    setQuestion('')
    setReponse('')
    setMotsCles('')
    setPriorite('0')
    setActif(true)
    setShowModal(true)
  }

  // Submit form (create or edit)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!question.trim() || !reponse.trim()) {
      toast.error('La question et la réponse sont obligatoires')
      return
    }

    try {
      const url = editingEntry
        ? `/api/admin/chatbot-knowledge/${editingEntry.id}`
        : '/api/admin/chatbot-knowledge'

      const response = await fetch(url, {
        method: editingEntry ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          categorie,
          question: question.trim(),
          reponse: reponse.trim(),
          motsCles: motsCles.trim() || null,
          priorite: parseInt(priorite, 10) || 0,
          actif,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Erreur lors de l\'enregistrement')
      }

      await fetchEntries()
      resetForm()
      toast.success(editingEntry ? 'Entrée mise à jour' : 'Entrée ajoutée à la base')
    } catch (err) {
      const message = getErrorMessage(err)
      toast.error(message)
      setError(message)
    }
  }

  // Single delete
  const handleDelete = async (id: string) => {
    const confirmed = await confirm({
      title: 'Supprimer l\'entrée',
      message: 'Voulez-vous vraiment supprimer cette entrée de la base de connaissances ? Elle ne sera plus accessible pour le chatbot.',
      confirmText: 'Supprimer',
      variant: 'danger',
    })
    if (!confirmed) return

    try {
      const response = await fetch(`/api/admin/chatbot-knowledge/${id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Erreur lors de la suppression')
      }

      setEntries((prev) => prev.filter((e) => e.id !== id))
      setSelectedIds((prev) => prev.filter((selectedId) => selectedId !== id))
      toast.success('Entrée supprimée')
    } catch (err) {
      toast.error(getErrorMessage(err))
    }
  }

  // Bulk operations handler
  const handleBulkAction = async (action: 'activate' | 'deactivate' | 'delete' | 'change-category') => {
    if (selectedIds.length === 0) return

    const messages = {
      activate: 'activer',
      deactivate: 'désactiver',
      delete: 'supprimer définitivement',
      'change-category': 'déplacer de catégorie',
    }

    const confirmed = await confirm({
      title: 'Action de masse',
      message: `Voulez-vous vraiment ${messages[action]} les ${selectedIds.length} entrées sélectionnées ?`,
      confirmText: 'Confirmer',
      variant: action === 'delete' ? 'danger' : 'info',
    })
    if (!confirmed) return

    try {
      const response = await fetch('/api/admin/chatbot-knowledge/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          ids: selectedIds,
          categorie: action === 'change-category' ? bulkCategory : undefined,
        }),
      })

      if (!response.ok) {
        throw new Error('Erreur lors de l\'opération de masse')
      }

      toast.success('Opération de masse réussie')
      setSelectedIds([])
      setBulkCategory('')
      await fetchEntries()
    } catch (err) {
      toast.error(getErrorMessage(err))
    }
  }

  // Export knowledge base as JSON file
  const handleExportJSON = () => {
    try {
      const dataStr = JSON.stringify(entries, null, 2)
      const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr)
      
      const exportFileDefaultName = `chatbot-knowledge-${new Date().toISOString().slice(0, 10)}.json`
      
      const linkElement = document.createElement('a')
      linkElement.setAttribute('href', dataUri)
      linkElement.setAttribute('download', exportFileDefaultName)
      linkElement.click()
      toast.success('Base de connaissances exportée avec succès')
    } catch {
      toast.error('Erreur lors de l\'exportation')
    }
  }

  // Import JSON file
  const handleImportJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileReader = new FileReader()
    const file = e.target.files?.[0]
    if (!file) return

    fileReader.onload = async (event) => {
      try {
        const parsedData = JSON.parse(event.target?.result as string)
        if (!Array.isArray(parsedData)) {
          throw new Error("Le fichier JSON doit contenir un tableau d'entrées.")
        }

        // Basic validation
        for (const item of parsedData) {
          if (!item.question || !item.reponse) {
            throw new Error("Chaque entrée doit avoir au moins une 'question' et une 'reponse'.")
          }
        }

        const confirmed = await confirm({
          title: 'Importer la base',
          message: `Voulez-vous importer les ${parsedData.length} entrées de connaissances ? Les doublons éventuels seront ignorés.`,
          confirmText: 'Importer',
          variant: 'info',
        })
        if (!confirmed) return

        const response = await fetch('/api/admin/chatbot-knowledge/bulk', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'import',
            entries: parsedData,
          }),
        })

        if (!response.ok) {
          throw new Error('Erreur serveur lors de la sauvegarde des entrées')
        }

        const resData = await response.json()
        toast.success(`${resData.count} entrées importées avec succès !`)
        await fetchEntries()
      } catch (err) {
        toast.error(`Importation échouée: ${err instanceof Error ? err.message : 'Format JSON invalide'}`)
      } finally {
        // Reset file input value to allow uploading same file
        e.target.value = ''
      }
    }
    fileReader.readAsText(file)
  }

  // Filtered and searched entries
  const filteredEntries = useMemo(() => {
    return entries.filter((entry) => {
      const matchesSearch =
        entry.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
        entry.reponse.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (entry.motsCles && entry.motsCles.toLowerCase().includes(searchTerm.toLowerCase()))
      
      const matchesCategory = filterCategorie ? entry.categorie === filterCategorie : true
      
      const matchesStatus =
        filterStatus === 'all'
          ? true
          : filterStatus === 'active'
          ? entry.actif
          : !entry.actif

      return matchesSearch && matchesCategory && matchesStatus
    })
  }, [entries, searchTerm, filterCategorie, filterStatus])

  // Pagination Logic
  const totalPages = Math.max(1, Math.ceil(filteredEntries.length / itemsPerPage))
  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages)
    }
  }, [currentPage, totalPages])

  const paginatedEntries = useMemo(() => {
    const startIdx = (currentPage - 1) * itemsPerPage
    return filteredEntries.slice(startIdx, startIdx + itemsPerPage)
  }, [filteredEntries, currentPage])

  // Statistics calculation
  const stats = useMemo(() => {
    const total = entries.length
    const active = entries.filter((e) => e.actif).length
    const inactive = total - active
    
    // Group counts
    const countsByCategory: Record<string, number> = {}
    entries.forEach((e) => {
      countsByCategory[e.categorie] = (countsByCategory[e.categorie] || 0) + 1
    })

    const mostPopulatedCategory = Object.entries(countsByCategory)
      .sort((a, b) => b[1] - a[1])[0]?.[0] || 'Aucune'

    return { total, active, inactive, mostPopulatedCategory }
  }, [entries])

  // Multi-select actions
  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      const currentPageIds = paginatedEntries.map((e) => e.id)
      setSelectedIds((prev) => Array.from(new Set([...prev, ...currentPageIds])))
    } else {
      const currentPageIds = paginatedEntries.map((e) => e.id)
      setSelectedIds((prev) => prev.filter((id) => !currentPageIds.includes(id)))
    }
  }

  const handleSelectRow = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedIds((prev) => [...prev, id])
    } else {
      setSelectedIds((prev) => prev.filter((selectedId) => selectedId !== id))
    }
  }

  const isAllPageSelected = paginatedEntries.length > 0 && paginatedEntries.every((e) => selectedIds.includes(e.id))

  if (loading && entries.length === 0) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        <span className="ml-3 text-slate-600 font-semibold text-sm">Chargement de la base de connaissances...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Title Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <span>🤖</span> Base de connaissances du Chatbot
          </h2>
          <p className="text-slate-500 text-sm mt-1">
            Gérez la base de données interne qui fournit les connaissances et réponses à l&apos;intelligence artificielle.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {/* Export JSON */}
          <button
            onClick={handleExportJSON}
            className="px-3.5 py-2 bg-white border border-slate-200 text-slate-700 text-xs font-bold rounded-lg hover:bg-slate-50 transition-colors flex items-center gap-1.5 shadow-2xs cursor-pointer"
            title="Exporter la base en JSON"
          >
            <span>📥</span> Exporter base
          </button>
          
          {/* Import JSON */}
          <label className="px-3.5 py-2 bg-white border border-slate-200 text-slate-700 text-xs font-bold rounded-lg hover:bg-slate-50 transition-colors flex items-center gap-1.5 shadow-2xs cursor-pointer">
            <span>📤</span> Importer JSON
            <input
              type="file"
              accept=".json"
              onChange={handleImportJSON}
              className="hidden"
            />
          </label>

          {/* New Entry */}
          <button
            onClick={handleNewEntry}
            className="px-4 py-2 bg-primary hover:bg-primary-dark text-white text-xs font-extrabold rounded-lg transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
          >
            <span>+</span> Nouvelle entrée
          </button>
        </div>
      </div>

      {/* Stats Summary Panel */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card p-4 bg-white border border-slate-200/80 shadow-2xs">
          <div className="flex justify-between items-center text-slate-400">
            <span className="text-[10px] font-bold uppercase tracking-wider">Entrées totales</span>
            <span className="text-sm">📚</span>
          </div>
          <p className="text-2xl font-extrabold text-slate-900 mt-1">{stats.total}</p>
          <p className="text-[10px] text-slate-400 mt-1">Mémoire active globale</p>
        </div>

        <div className="card p-4 bg-white border border-slate-200/80 shadow-2xs">
          <div className="flex justify-between items-center text-slate-400">
            <span className="text-[10px] font-bold uppercase tracking-wider">Actives</span>
            <span className="text-sm">🟢</span>
          </div>
          <p className="text-2xl font-extrabold text-emerald-600 mt-1">{stats.active}</p>
          <p className="text-[10px] text-slate-400 mt-1">Exploitées par l&apos;I.A.</p>
        </div>

        <div className="card p-4 bg-white border border-slate-200/80 shadow-2xs">
          <div className="flex justify-between items-center text-slate-400">
            <span className="text-[10px] font-bold uppercase tracking-wider">Désactivées</span>
            <span className="text-sm">🔴</span>
          </div>
          <p className="text-2xl font-extrabold text-slate-400 mt-1">{stats.inactive}</p>
          <p className="text-[10px] text-slate-400 mt-1">Ignorées temporairement</p>
        </div>

        <div className="card p-4 bg-white border border-slate-200/80 shadow-2xs">
          <div className="flex justify-between items-center text-slate-400">
            <span className="text-[10px] font-bold uppercase tracking-wider">Catégorie dominante</span>
            <span className="text-sm">⚡</span>
          </div>
          <p className="text-lg font-extrabold text-slate-900 mt-1 truncate">
            {CATEGORIES.find((c) => c.value === stats.mostPopulatedCategory)?.label || stats.mostPopulatedCategory}
          </p>
          <p className="text-[10px] text-slate-400 mt-1">Majoritaire en base</p>
        </div>
      </div>

      {/* Simulator Test Panel */}
      <div className="bg-gradient-to-r from-primary/5 via-sky-50 to-indigo-50 border border-primary/20 rounded-2xl p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center text-lg font-bold">🧪</span>
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                Simulateur en Direct : Vérifier la Vérité Terrain
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-extrabold uppercase">
                  Température 0.1
                </span>
              </h3>
              <p className="text-xs text-slate-500">
                Testez en direct les réponses de l&apos;I.A. avec les plannings, séances annulées, SSA et tarifs temps réel.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleClearCache}
              disabled={clearingCache}
              className="px-3 py-1.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 shadow-2xs cursor-pointer disabled:opacity-50"
              title="Purger le cache en mémoire (5 min) pour recharger immédiatement les données fraîches de la base"
            >
              <span>{clearingCache ? '⏳' : '🔄'}</span> Purger le Cache IA
            </button>
            <button
              onClick={() => setShowTester(!showTester)}
              className="px-3 py-1.5 bg-primary hover:bg-primary-dark text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <span>{showTester ? 'Masquer le testeur' : 'Ouvrir le testeur'}</span>
            </button>
          </div>
        </div>

        {showTester && (
          <div className="space-y-4 pt-2 border-t border-primary/10">
            {/* Quick questions chips */}
            <div>
              <span className="text-[11px] font-bold text-slate-600 block mb-1.5">Questions rapides pour vérifier les cas sensibles :</span>
              <div className="flex flex-wrap gap-1.5">
                {[
                  "Combien coûte l'école de natation pour 1 cours ?",
                  "La séance du 16 septembre a-t-elle lieu ?",
                  "Quels sont les tarifs et horaires du SSA / BNSSA ?",
                  "Puis-je venir payer par chèque au bureau de la piscine ?",
                  "Comment annuler une inscription ou changer de groupe ?",
                ].map((quickQ, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => handleRunTest(quickQ)}
                    className="text-[11px] px-2.5 py-1 bg-white hover:bg-primary/10 border border-slate-200 hover:border-primary/40 rounded-full text-slate-700 transition-colors cursor-pointer"
                  >
                    💬 {quickQ}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Input */}
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                value={testQuestion}
                onChange={(e) => setTestQuestion(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleRunTest()}
                placeholder="Posez n'importe quelle question que pourrait poser un parent ou un adhérent..."
                className="flex-1 px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none text-slate-900"
              />
              <button
                type="button"
                onClick={() => handleRunTest()}
                disabled={testingLoading || !testQuestion.trim()}
                className="px-5 py-2.5 bg-primary hover:bg-primary-dark disabled:opacity-50 text-white text-xs font-bold rounded-xl transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer"
              >
                {testingLoading ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Génération en cours...</span>
                  </>
                ) : (
                  <>
                    <span>⚡</span>
                    <span>Tester la réponse</span>
                  </>
                )}
              </button>
            </div>

            {/* Response Box */}
            {testResponse && (
              <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-900">🤖 Réponse officielle générée</span>
                    {testModel && (
                      <span className="text-[10px] px-2 py-0.5 bg-slate-100 text-slate-600 rounded-md font-mono">
                        Modèle: {testModel}
                      </span>
                    )}
                  </div>
                  {testDurationMs !== null && (
                    <span className="text-[10px] text-slate-400 font-mono">
                      Temps: {(testDurationMs / 1000).toFixed(2)}s
                    </span>
                  )}
                </div>
                <div className="text-xs text-slate-800 leading-relaxed whitespace-pre-wrap font-sans">
                  {testResponse}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Quotas & Information */}
      <div className="bg-slate-50 border border-slate-200/80 p-4 rounded-xl shadow-3xs">
        <h3 className="text-xs font-bold text-slate-800 flex items-center gap-1.5 mb-1.5">
          <span>📊</span> Quotas & Limites de l&apos;I.A. (Mistral AI)
        </h3>
        <p className="text-[11px] text-slate-500 leading-relaxed font-normal">
          Le chatbot est configuré de façon asynchrone sécurisée. Les requêtes gratuites Mistral AI couvrent largement les besoins.
          Pour optimiser sa précision, le chatbot capture les questions n&apos;ayant pas reçu de réponse et les ajoute dans l&apos;onglet 
          <strong>Suggestions Chatbot</strong>. Vous pouvez ainsi y répondre pour enrichir la base de connaissances.
        </p>
      </div>

      {/* Search & Filters Controls */}
      <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-2xs space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          {/* Search bar */}
          <div className="md:col-span-2 relative">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Rechercher par question, réponse, mot-clé..."
              className="w-full px-4 py-2 pl-9 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
            />
            <span className="absolute left-3 top-2.5 text-xs text-slate-400">🔍</span>
          </div>

          {/* Category filter */}
          <div>
            <select
              value={filterCategorie}
              onChange={(e) => setFilterCategorie(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none bg-white text-slate-700"
            >
              <option value="">Toutes les catégories</option>
              {CATEGORIES.map((cat) => (
                <option key={cat.value} value={cat.value}>
                  {cat.icon} {cat.label}
                </option>
              ))}
            </select>
          </div>

          {/* Status filter */}
          <div>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as any)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none bg-white text-slate-700"
            >
              <option value="all">Tous les statuts</option>
              <option value="active">Actives uniquement</option>
              <option value="inactive">Désactivées uniquement</option>
            </select>
          </div>
        </div>

        <div className="flex justify-between items-center text-xs text-slate-500 pt-1 border-t border-slate-100">
          <span>{filteredEntries.length} entrée(s) trouvée(s)</span>
          {selectedIds.length > 0 && (
            <span className="font-bold text-primary">{selectedIds.length} sélectionnée(s)</span>
          )}
        </div>
      </div>

      {/* Bulk actions bar (shown if selection exists) */}
      {selectedIds.length > 0 && (
        <div className="bg-slate-900 text-white px-5 py-3 rounded-xl shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4 animate-slide-up">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            <span className="text-xs font-bold text-slate-200">
              {selectedIds.length} entrées sélectionnées
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => handleBulkAction('activate')}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg transition-colors cursor-pointer"
            >
              🟢 Activer
            </button>
            <button
              onClick={() => handleBulkAction('deactivate')}
              className="px-3 py-1.5 bg-slate-700 hover:bg-slate-650 text-white text-xs font-bold rounded-lg transition-colors cursor-pointer"
            >
              🔴 Désactiver
            </button>
            
            {/* Bulk change category */}
            <div className="flex items-center bg-slate-800 rounded-lg overflow-hidden border border-slate-700">
              <select
                value={bulkCategory}
                onChange={(e) => setBulkCategory(e.target.value)}
                className="px-2.5 py-1.5 bg-transparent text-white text-xs outline-none border-none cursor-pointer"
              >
                <option value="" className="bg-slate-900 text-slate-400">Classer dans...</option>
                {CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value} className="bg-slate-900 text-white">
                    {c.label}
                  </option>
                ))}
              </select>
              <button
                onClick={() => handleBulkAction('change-category')}
                disabled={!bulkCategory}
                className="px-3 py-1.5 bg-primary hover:bg-primary-dark disabled:opacity-50 text-white text-xs font-bold transition-colors border-none cursor-pointer"
              >
                Déplacer
              </button>
            </div>

            <button
              onClick={() => handleBulkAction('delete')}
              className="px-3 py-1.5 bg-red-650 hover:bg-red-750 text-white text-xs font-bold rounded-lg transition-colors cursor-pointer"
            >
              🗑️ Supprimer
            </button>
            
            <button
              onClick={() => setSelectedIds([])}
              className="text-xs text-slate-400 hover:text-white underline cursor-pointer"
            >
              Annuler
            </button>
          </div>
        </div>
      )}

      {/* Main Table view */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="py-3.5 px-4 w-12 text-center">
                  <input
                    type="checkbox"
                    checked={isAllPageSelected}
                    onChange={handleSelectAll}
                    className="w-4 h-4 text-primary border-slate-350 rounded focus:ring-primary cursor-pointer"
                  />
                </th>
                <th className="py-3.5 px-4 font-bold text-slate-750 text-xs uppercase tracking-wider w-36">Catégorie</th>
                <th className="py-3.5 px-4 font-bold text-slate-750 text-xs uppercase tracking-wider w-80">Question</th>
                <th className="py-3.5 px-4 font-bold text-slate-750 text-xs uppercase tracking-wider">Réponse</th>
                <th className="py-3.5 px-4 font-bold text-slate-750 text-xs uppercase tracking-wider w-20 text-center">Priorité</th>
                <th className="py-3.5 px-4 font-bold text-slate-750 text-xs uppercase tracking-wider w-24 text-center">Statut</th>
                <th className="py-3.5 px-4 font-bold text-slate-750 text-xs uppercase tracking-wider w-28 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {paginatedEntries.map((entry) => {
                const isSelected = selectedIds.includes(entry.id)
                const categoryObj = CATEGORIES.find((c) => c.value === entry.categorie)
                
                return (
                  <tr
                    key={entry.id}
                    className={`hover:bg-slate-50/50 transition-colors ${isSelected ? 'bg-primary/5 hover:bg-primary/5' : ''}`}
                  >
                    <td className="py-4 px-4 text-center">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={(e) => handleSelectRow(entry.id, e.target.checked)}
                        className="w-4 h-4 text-primary border-slate-300 rounded focus:ring-primary cursor-pointer"
                      />
                    </td>
                    <td className="py-4 px-4 font-medium text-slate-900">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold ${
                        entry.categorie === 'tarifs' ? 'bg-green-50 text-green-700 border border-green-100' :
                        entry.categorie === 'inscriptions' ? 'bg-blue-50 text-blue-700 border border-blue-100' :
                        entry.categorie === 'horaires' ? 'bg-purple-50 text-purple-700 border border-purple-100' :
                        entry.categorie === 'competitions' ? 'bg-orange-50 text-orange-700 border border-orange-100' :
                        'bg-slate-50 text-slate-700 border border-slate-200/60'
                      }`}>
                        <span>{categoryObj?.icon || '⚙️'}</span>
                        <span>{categoryObj?.label || entry.categorie}</span>
                      </span>
                    </td>
                    <td className="py-4 px-4 font-semibold text-slate-900 leading-relaxed">
                      <div className="max-w-[280px] truncate" title={entry.question}>
                        {entry.question}
                      </div>
                      {entry.motsCles && (
                        <p className="text-[10px] text-slate-400 font-medium mt-1">
                          🏷️ {entry.motsCles}
                        </p>
                      )}
                    </td>
                    <td className="py-4 px-4 text-slate-650 leading-relaxed">
                      <div className="max-w-md line-clamp-2" title={entry.reponse}>
                        {entry.reponse}
                      </div>
                    </td>
                    <td className="py-4 px-4 text-center text-slate-700 font-semibold">
                      {entry.priorite}
                    </td>
                    <td className="py-4 px-4 text-center">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        entry.actif
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                          : 'bg-slate-100 text-slate-500'
                      }`}>
                        {entry.actif ? 'Actif' : 'Inactif'}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-center font-bold">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => handleEdit(entry)}
                          className="text-primary hover:text-primary-dark font-extrabold cursor-pointer"
                        >
                          Modifier
                        </button>
                        <span className="text-slate-200">|</span>
                        <button
                          onClick={() => handleDelete(entry.id)}
                          className="text-red-500 hover:text-red-755 font-extrabold cursor-pointer"
                        >
                          Supprimer
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}

              {filteredEntries.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <p className="text-4xl mb-3">💬</p>
                    <p className="font-semibold text-sm">Aucune entrée trouvée</p>
                    <p className="text-[11px] text-slate-400 mt-1">
                      Modifiez vos critères de recherche ou ajoutez une nouvelle question en haut à droite.
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        {filteredEntries.length > 0 && (
          <div className="bg-slate-50/50 px-4 py-3 border-t border-slate-100 flex items-center justify-between">
            <span className="text-slate-500 text-xs">
              Affichage de <span className="font-bold text-slate-800">{Math.min(filteredEntries.length, (currentPage - 1) * itemsPerPage + 1)}</span> à{' '}
              <span className="font-bold text-slate-800">{Math.min(filteredEntries.length, currentPage * itemsPerPage)}</span> sur{' '}
              <span className="font-bold text-slate-800">{filteredEntries.length}</span> entrées
            </span>

            <div className="flex items-center gap-1.5">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="px-2.5 py-1.5 border border-slate-200 rounded bg-white text-slate-700 text-xs font-semibold hover:bg-slate-50 transition-colors disabled:opacity-50 cursor-pointer"
              >
                Précédent
              </button>
              
              {Array.from({ length: totalPages }).map((_, idx) => {
                const pageNum = idx + 1
                const isCurrent = pageNum === currentPage
                return (
                  <button
                    key={pageNum}
                    onClick={() => setCurrentPage(pageNum)}
                    className={`w-8 h-8 rounded text-xs font-bold transition-all cursor-pointer ${
                      isCurrent
                        ? 'bg-slate-900 text-white'
                        : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    {pageNum}
                  </button>
                )
              })}

              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="px-2.5 py-1.5 border border-slate-200 rounded bg-white text-slate-700 text-xs font-semibold hover:bg-slate-50 transition-colors disabled:opacity-50 cursor-pointer"
              >
                Suivant
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Creation/Edition Centered Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden border border-slate-100 flex flex-col max-h-[90vh] animate-slide-up">
            
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-150 bg-slate-50 flex justify-between items-center">
              <div>
                <h3 className="font-extrabold text-slate-900 text-lg">
                  {editingEntry ? '📝 Modifier l\'entrée de connaissance' : '✨ Nouvelle entrée de connaissance'}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Renseignez le texte sous forme de question/réponse pour entraîner le chatbot.
                </p>
              </div>
              <button
                onClick={resetForm}
                className="text-slate-400 hover:text-slate-650 bg-slate-200/50 hover:bg-slate-200 w-8 h-8 rounded-full flex items-center justify-center transition-colors font-bold text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Modal Form Content */}
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Category selection */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                    Catégorie *
                  </label>
                  <select
                    value={categorie}
                    onChange={(e) => setCategorie(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none bg-white text-slate-800"
                  >
                    {CATEGORIES.map((cat) => (
                      <option key={cat.value} value={cat.value}>
                        {cat.icon} {cat.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Priority */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                    Priorité
                  </label>
                  <input
                    type="number"
                    value={priorite}
                    onChange={(e) => setPriorite(e.target.value)}
                    min="0"
                    max="100"
                    placeholder="0"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none text-slate-800"
                  />
                  <span className="text-[10px] text-slate-400 block mt-1">
                    Valeur plus haute = analysée en premier par l&apos;I.A.
                  </span>
                </div>
              </div>

              {/* Question */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Question type ou Phrase déclencheur *
                </label>
                <input
                  type="text"
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  placeholder="Ex: Quelle est l'adresse de la piscine municipale ?"
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none text-slate-800"
                  required
                />
                <span className="text-[10px] text-slate-400 block mt-1">
                  Décrivez la question que l&apos;utilisateur va poser.
                </span>
              </div>

              {/* Reponse */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Réponse finale attendue (I.A. s&apos;en inspirera) *
                </label>
                <textarea
                  value={reponse}
                  onChange={(e) => setReponse(e.target.value)}
                  rows={5}
                  placeholder="Rédigez la réponse factuelle. Le chatbot l'utilisera mot pour mot ou la reformulera avec courtoisie..."
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none text-slate-800"
                  required
                />
              </div>

              {/* Keywords */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Mots-clés (optionnel)
                </label>
                <input
                  type="text"
                  value={motsCles}
                  onChange={(e) => setMotsCles(e.target.value)}
                  placeholder="adresse, localisation, piscine, cavaillon (séparés par des virgules)"
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none text-slate-800"
                />
                <span className="text-[10px] text-slate-400 block mt-1">
                  Aide à renforcer l&apos;association sémantique par l&apos;algorithme.
                </span>
              </div>

              {/* Actif */}
              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="modal-actif"
                  checked={actif}
                  onChange={(e) => setActif(e.target.checked)}
                  className="w-4 h-4 text-primary border-slate-350 rounded focus:ring-primary cursor-pointer"
                />
                <label htmlFor="modal-actif" className="text-xs font-bold text-slate-700 cursor-pointer">
                  Activer immédiatement cette entrée pour le chatbot
                </label>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4 border-t border-slate-100 justify-end -mx-6 -mb-6 p-4 bg-slate-50/50">
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-5 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-bold rounded-lg transition-colors cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-primary hover:bg-primary-dark text-white text-xs font-bold rounded-lg transition-colors shadow-xs cursor-pointer"
                >
                  {editingEntry ? 'Enregistrer les modifications' : 'Créer l\'entrée'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CSS Animation */}
      <style>{`
        @keyframes slide-up {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-slide-up {
          animation: slide-up 0.2s ease-out;
        }
      `}</style>
    </div>
  )
}
