'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import toast from 'react-hot-toast'
import { useConfirmDialog } from '@/components/ConfirmDialog'
import { getErrorMessage } from '@/lib/utils'

interface ChatbotSuggestion {
  id: string
  question: string
  reponse: string | null
  source: 'auto' | 'vote'
  statut: 'a_traiter' | 'integre' | 'ignore'
  createdAt: string
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

export default function ChatbotSuggestionsManager() {
  const [suggestions, setSuggestions] = useState<ChatbotSuggestion[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  
  // Tab & Filters
  const [activeTab, setActiveTab] = useState<'a_traiter' | 'integre' | 'ignore'>('a_traiter')
  const [searchTerm, setSearchTerm] = useState('')
  const [filterSource, setFilterSource] = useState<'all' | 'vote' | 'auto'>('all')

  // Selection
  const [selectedIds, setSelectedIds] = useState<string[]>([])

  // Pagination
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10

  // Correction & Integration Modal state
  const [promotingSuggestion, setPromotingSuggestion] = useState<ChatbotSuggestion | null>(null)
  
  // Form fields for Knowledge creation
  const [faqQuestion, setFaqQuestion] = useState('')
  const [faqReponse, setFaqReponse] = useState('')
  const [faqCategorie, setFaqCategorie] = useState('general')
  const [faqMotsCles, setFaqMotsCles] = useState('')
  const [faqPriorite, setFaqPriorite] = useState('0')
  const [faqActif, setFaqActif] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  const { confirm } = useConfirmDialog()

  const fetchSuggestions = useCallback(async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/admin/chatbot-knowledge/suggestions?statut=all')
      if (response.ok) {
        const data = await response.json()
        setSuggestions(data)
      } else {
        setError('Impossible de récupérer les suggestions d\'entraînement')
      }
    } catch {
      setError('Erreur lors du chargement des suggestions')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchSuggestions()
  }, [fetchSuggestions])

  // Single Ignore
  const handleIgnore = async (suggestion: ChatbotSuggestion) => {
    try {
      const response = await fetch(`/api/admin/chatbot-knowledge/suggestions/${suggestion.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ statut: 'ignore' }),
      })

      if (!response.ok) throw new Error('Erreur lors de la mise à jour')

      toast.success('Suggestion ignorée')
      
      // Update state locally
      setSuggestions((prev) =>
        prev.map((s) => (s.id === suggestion.id ? { ...s, statut: 'ignore' as const } : s))
      )
      setSelectedIds((prev) => prev.filter((id) => id !== suggestion.id))
    } catch (err) {
      toast.error(getErrorMessage(err))
    }
  }

  // Bulk actions handler
  const handleBulkAction = async (action: 'ignore' | 'delete') => {
    if (selectedIds.length === 0) return

    const messages = {
      ignore: 'ignorer',
      delete: 'supprimer définitivement',
    }

    const confirmed = await confirm({
      title: 'Action de masse',
      message: `Voulez-vous vraiment ${messages[action]} les ${selectedIds.length} suggestions sélectionnées ?`,
      confirmText: 'Confirmer',
      variant: action === 'delete' ? 'danger' : 'info',
    })
    if (!confirmed) return

    try {
      const response = await fetch('/api/admin/chatbot-knowledge/suggestions/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ids: selectedIds }),
      })

      if (!response.ok) {
        throw new Error('Erreur lors de l\'opération de masse')
      }

      toast.success('Opération de masse réussie')
      
      if (action === 'delete') {
        setSuggestions((prev) => prev.filter((s) => !selectedIds.includes(s.id)))
      } else {
        setSuggestions((prev) =>
          prev.map((s) => (selectedIds.includes(s.id) ? { ...s, statut: 'ignore' as const } : s))
        )
      }
      setSelectedIds([])
    } catch (err) {
      toast.error(getErrorMessage(err))
    }
  }

  // Open the correction + integration modal
  const openPromotionModal = (suggestion: ChatbotSuggestion) => {
    setPromotingSuggestion(suggestion)
    setFaqQuestion(suggestion.question)
    setFaqReponse(suggestion.reponse || '')
    setFaqCategorie('general')
    setFaqMotsCles('')
    setFaqPriorite('0')
    setFaqActif(true)
  }

  // Submit suggestion integration
  const handlePromoteToKnowledge = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!promotingSuggestion) return

    if (!faqQuestion.trim() || !faqReponse.trim()) {
      toast.error('La question et la réponse sont obligatoires')
      return
    }

    try {
      setSubmitting(true)

      // 1. Create entry in ChatbotKnowledge
      const resKnowledge = await fetch('/api/admin/chatbot-knowledge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          categorie: faqCategorie,
          question: faqQuestion.trim(),
          reponse: faqReponse.trim(),
          motsCles: faqMotsCles.trim() || null,
          priorite: parseInt(faqPriorite, 10) || 0,
          actif: faqActif,
        }),
      })

      if (!resKnowledge.ok) {
        const errData = await resKnowledge.json()
        throw new Error(errData.error || 'Impossible d\'ajouter l\'entrée dans la base de connaissances')
      }

      // 2. Mark the suggestion as integrated
      const resSug = await fetch(`/api/admin/chatbot-knowledge/suggestions/${promotingSuggestion.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: faqQuestion.trim(),
          statut: 'integre',
          reponse: faqReponse.trim(),
        }),
      })

      if (!resSug.ok) {
        throw new Error('Échec de la mise à jour de la suggestion')
      }

      toast.success('Résolu ! Entrée ajoutée à la base de connaissances du chatbot.')
      setPromotingSuggestion(null)
      await fetchSuggestions()
    } catch (err) {
      toast.error(getErrorMessage(err))
    } finally {
      setSubmitting(false)
    }
  }

  // Client-side filtering
  const filteredSuggestions = useMemo(() => {
    return suggestions.filter((s) => {
      const matchesTab = s.statut === activeTab
      
      const matchesSearch =
        s.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (s.reponse && s.reponse.toLowerCase().includes(searchTerm.toLowerCase()))
      
      const matchesSource =
        filterSource === 'all'
          ? true
          : filterSource === 'vote'
          ? s.source === 'vote'
          : s.source === 'auto'

      return matchesTab && matchesSearch && matchesSource
    })
  }, [suggestions, activeTab, searchTerm, filterSource])

  // Pagination Logic
  const totalPages = Math.max(1, Math.ceil(filteredSuggestions.length / itemsPerPage))
  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages)
    }
  }, [currentPage, totalPages])

  const paginatedSuggestions = useMemo(() => {
    const startIdx = (currentPage - 1) * itemsPerPage
    return filteredSuggestions.slice(startIdx, startIdx + itemsPerPage)
  }, [filteredSuggestions, currentPage])

  // Count metrics for badges
  const counts = useMemo(() => {
    const toProcess = suggestions.filter((s) => s.statut === 'a_traiter').length
    const integrated = suggestions.filter((s) => s.statut === 'integre').length
    const ignored = suggestions.filter((s) => s.statut === 'ignore').length
    const votes = suggestions.filter((s) => s.source === 'vote').length
    const autos = suggestions.filter((s) => s.source === 'auto').length
    return { toProcess, integrated, ignored, votes, autos }
  }, [suggestions])

  // Multi-select triggers
  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      const currentPageIds = paginatedSuggestions.map((s) => s.id)
      setSelectedIds((prev) => Array.from(new Set([...prev, ...currentPageIds])))
    } else {
      const currentPageIds = paginatedSuggestions.map((s) => s.id)
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

  const isAllPageSelected = paginatedSuggestions.length > 0 && paginatedSuggestions.every((s) => selectedIds.includes(s.id))

  if (loading && suggestions.length === 0) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        <span className="ml-3 text-slate-600 font-semibold text-sm">Chargement des suggestions d&apos;entraînement...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <span>💡</span> Entraînement Continu du Chatbot
          </h2>
          <p className="text-slate-500 text-sm mt-1">
            Capturez les questions des utilisateurs n&apos;ayant pas trouvé de réponse pour enrichir la base de connaissances du chatbot.
          </p>
        </div>
        <div>
          <button
            onClick={fetchSuggestions}
            className="px-3.5 py-2 bg-white border border-slate-200 text-slate-700 text-xs font-bold rounded-lg hover:bg-slate-50 transition-colors flex items-center gap-1.5 shadow-2xs cursor-pointer"
          >
            🔄 Actualiser
          </button>
        </div>
      </div>

      {/* Stats Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card p-4 bg-white border border-slate-200/80 shadow-2xs">
          <div className="flex justify-between items-center text-slate-400">
            <span className="text-[10px] font-bold uppercase tracking-wider">À Traiter</span>
            <span className="text-sm">📥</span>
          </div>
          <p className="text-2xl font-extrabold text-amber-600 mt-1">{counts.toProcess}</p>
          <p className="text-[10px] text-slate-400 mt-1">Questions sans réponse</p>
        </div>

        <div className="card p-4 bg-white border border-slate-200/80 shadow-2xs">
          <div className="flex justify-between items-center text-slate-400">
            <span className="text-[10px] font-bold uppercase tracking-wider">Intégrées</span>
            <span className="text-sm">✅</span>
          </div>
          <p className="text-2xl font-extrabold text-emerald-600 mt-1">{counts.integrated}</p>
          <p className="text-[10px] text-slate-400 mt-1">Résolues en base</p>
        </div>

        <div className="card p-4 bg-white border border-slate-200/80 shadow-2xs">
          <div className="flex justify-between items-center text-slate-400">
            <span className="text-[10px] font-bold uppercase tracking-wider">Auto-détectées</span>
            <span className="text-sm">🤖</span>
          </div>
          <p className="text-2xl font-extrabold text-slate-900 mt-1">{counts.autos}</p>
          <p className="text-[10px] text-slate-400 mt-1">Détectées par algorithme</p>
        </div>

        <div className="card p-4 bg-white border border-slate-200/80 shadow-2xs">
          <div className="flex justify-between items-center text-slate-400">
            <span className="text-[10px] font-bold uppercase tracking-wider">Votes négatifs</span>
            <span className="text-sm">👎</span>
          </div>
          <p className="text-2xl font-extrabold text-rose-600 mt-1">{counts.votes}</p>
          <p className="text-[10px] text-slate-400 mt-1">Mécontentements signalés</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200">
        <button
          onClick={() => {
            setActiveTab('a_traiter')
            setCurrentPage(1)
            setSelectedIds([])
          }}
          className={`py-3 px-5 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 cursor-pointer ${
            activeTab === 'a_traiter'
              ? 'border-primary text-primary'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <span>📥</span>
          <span>À Traiter</span>
          <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-bold ${activeTab === 'a_traiter' ? 'bg-primary/10 text-primary' : 'bg-slate-100 text-slate-500'}`}>
            {counts.toProcess}
          </span>
        </button>
        <button
          onClick={() => {
            setActiveTab('integre')
            setCurrentPage(1)
            setSelectedIds([])
          }}
          className={`py-3 px-5 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 cursor-pointer ${
            activeTab === 'integre'
              ? 'border-primary text-primary'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <span>✅</span>
          <span>Résolues / Intégrées</span>
          <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-bold ${activeTab === 'integre' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
            {counts.integrated}
          </span>
        </button>
        <button
          onClick={() => {
            setActiveTab('ignore')
            setCurrentPage(1)
            setSelectedIds([])
          }}
          className={`py-3 px-5 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 cursor-pointer ${
            activeTab === 'ignore'
              ? 'border-primary text-primary'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <span>🚫</span>
          <span>Ignorées</span>
          <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-bold ${activeTab === 'ignore' ? 'bg-slate-900/10 text-slate-900' : 'bg-slate-100 text-slate-500'}`}>
            {counts.ignored}
          </span>
        </button>
      </div>

      {/* Filters & Search Toolbar */}
      <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 flex-1">
          {/* Search bar */}
          <div className="md:col-span-2 relative">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Rechercher dans les questions utilisateur..."
              className="w-full px-4 py-2 pl-9 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
            />
            <span className="absolute left-3 top-2.5 text-xs text-slate-400">🔍</span>
          </div>

          {/* Source filter */}
          <div>
            <select
              value={filterSource}
              onChange={(e) => setFilterSource(e.target.value as any)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none bg-white text-slate-700"
            >
              <option value="all">Toutes les origines</option>
              <option value="vote">👍/👎 Pouce Bas uniquement</option>
              <option value="auto">🤖 Auto-détection uniquement</option>
            </select>
          </div>
        </div>

        <div className="text-xs text-slate-500">
          {filteredSuggestions.length} suggestion(s) filtrée(s)
        </div>
      </div>

      {/* Bulk actions bar */}
      {selectedIds.length > 0 && (
        <div className="bg-slate-900 text-white px-5 py-3 rounded-xl shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4 animate-slide-up">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            <span className="text-xs font-bold text-slate-250">
              {selectedIds.length} suggestions sélectionnées
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            {activeTab === 'a_traiter' && (
              <button
                onClick={() => handleBulkAction('ignore')}
                className="px-3.5 py-1.5 bg-slate-700 hover:bg-slate-650 text-white text-xs font-bold rounded-lg transition-colors cursor-pointer"
              >
                🚫 Ignorer la sélection
              </button>
            )}
            <button
              onClick={() => handleBulkAction('delete')}
              className="px-3.5 py-1.5 bg-red-650 hover:bg-red-750 text-white text-xs font-bold rounded-lg transition-colors cursor-pointer"
            >
              🗑️ Supprimer définitivement
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

      {/* Main card list */}
      <div className="space-y-4">
        {/* Bulk select header checkbox */}
        {filteredSuggestions.length > 0 && (
          <div className="flex items-center gap-3 bg-slate-50 border border-slate-200/80 px-5 py-2.5 rounded-lg text-xs">
            <input
              type="checkbox"
              checked={isAllPageSelected}
              onChange={handleSelectAll}
              className="w-4 h-4 text-primary border-slate-300 rounded focus:ring-primary cursor-pointer"
            />
            <span className="font-bold text-slate-650">Tout sélectionner sur cette page</span>
          </div>
        )}

        {paginatedSuggestions.map((suggestion) => {
          const isSelected = selectedIds.includes(suggestion.id)
          
          return (
            <div
              key={suggestion.id}
              className={`p-5 bg-white rounded-xl border transition-all flex items-start gap-4 shadow-sm hover:shadow-md ${
                isSelected ? 'border-primary ring-2 ring-primary/10' : 'border-slate-200'
              }`}
            >
              {/* Checkbox select */}
              <input
                type="checkbox"
                checked={isSelected}
                onChange={(e) => handleSelectRow(suggestion.id, e.target.checked)}
                className="w-4 h-4 text-primary border-slate-300 rounded focus:ring-primary mt-1.5 cursor-pointer shrink-0"
              />

              <div className="space-y-3 flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`inline-block px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                    suggestion.source === 'vote'
                      ? 'bg-rose-50 text-rose-700 border border-rose-100'
                      : 'bg-amber-50 text-amber-700 border border-amber-100'
                  }`}>
                    {suggestion.source === 'vote' ? '👎 Vote négatif' : '🤖 Auto-détection'}
                  </span>
                  <span className="text-slate-400 text-[10px] font-semibold">
                    Détecté le {new Date(suggestion.createdAt).toLocaleDateString('fr-FR')} à {new Date(suggestion.createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                
                <div>
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Question de l&apos;utilisateur :</h4>
                  <p className="text-slate-800 text-sm font-semibold bg-slate-50 border border-slate-100/60 p-3 rounded-lg mt-1 italic">
                    &quot;{suggestion.question}&quot;
                  </p>
                </div>

                {suggestion.reponse && (
                  <div>
                    <h5 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      {activeTab === 'integre' ? 'Réponse corrigée (Enregistrée en base) :' : 'Réponse temporaire générée par le robot :'}
                    </h5>
                    <p className="text-slate-600 text-xs mt-1 bg-slate-50 border border-slate-100/60 p-3 rounded-lg font-medium leading-relaxed">
                      {suggestion.reponse}
                    </p>
                  </div>
                )}
              </div>

              {/* Action buttons */}
              <div className="flex flex-col gap-2 shrink-0 min-w-[140px] text-center pt-2">
                {activeTab === 'a_traiter' && (
                  <>
                    <button
                      onClick={() => openPromotionModal(suggestion)}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-colors shadow-2xs flex items-center justify-center gap-1 cursor-pointer"
                    >
                      📝 Résoudre & Enregistrer
                    </button>
                    <button
                      onClick={() => handleIgnore(suggestion)}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition-colors border border-slate-200 flex items-center justify-center cursor-pointer"
                    >
                      Ignorer
                    </button>
                  </>
                )}

                {activeTab === 'integre' && (
                  <button
                    onClick={() => openPromotionModal(suggestion)}
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-colors shadow-2xs flex items-center justify-center gap-1 cursor-pointer"
                  >
                    📝 Corriger à nouveau
                  </button>
                )}

                {activeTab === 'ignore' && (
                  <button
                    onClick={() => openPromotionModal(suggestion)}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-bold transition-colors shadow-2xs flex items-center justify-center gap-1 cursor-pointer"
                  >
                    📝 Réintégrer & Enregistrer
                  </button>
                )}
              </div>
            </div>
          )
        })}

        {filteredSuggestions.length === 0 && (
          <div className="text-center py-16 bg-slate-50/50 border border-slate-200 border-dashed rounded-xl">
            <p className="text-5xl mb-4">💬</p>
            <p className="font-bold text-slate-700">Aucune suggestion dans cet onglet</p>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto leading-relaxed">
              {activeTab === 'a_traiter'
                ? 'Excellent ! Le chatbot répond correctement à toutes les demandes ou aucun retour négatif n\'a été formulé.'
                : 'Aucune question n\'est présente dans cette catégorie.'}
            </p>
          </div>
        )}
      </div>

      {/* Pagination controls */}
      {filteredSuggestions.length > 0 && (
        <div className="bg-slate-50 border border-slate-200 px-4 py-3 rounded-xl flex items-center justify-between text-xs">
          <span className="text-slate-500">
            Affichage de <span className="font-bold text-slate-850">{(currentPage - 1) * itemsPerPage + 1}</span> à{' '}
            <span className="font-bold text-slate-850">{Math.min(filteredSuggestions.length, currentPage * itemsPerPage)}</span> sur{' '}
            <span className="font-bold text-slate-850">{filteredSuggestions.length}</span> suggestions
          </span>

          <div className="flex items-center gap-1.5">
            <button
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="px-2.5 py-1.5 border border-slate-200 rounded bg-white text-slate-750 font-bold hover:bg-slate-50 transition-colors disabled:opacity-50 cursor-pointer"
            >
              Précédent
            </button>
            
            {Array.from({ length: totalPages }).map((_, idx) => {
              const pageNum = idx + 1
              return (
                <button
                  key={pageNum}
                  onClick={() => setCurrentPage(pageNum)}
                  className={`w-8 h-8 rounded text-xs font-bold transition-all cursor-pointer ${
                    pageNum === currentPage
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
              className="px-2.5 py-1.5 border border-slate-200 rounded bg-white text-slate-750 font-bold hover:bg-slate-50 transition-colors disabled:opacity-50 cursor-pointer"
            >
              Suivant
            </button>
          </div>
        </div>
      )}

      {/* Resolution & Integration Modal */}
      {promotingSuggestion && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden border border-slate-100 flex flex-col max-h-[90vh] animate-slide-up">
            
            {/* Header */}
            <div className="p-5 border-b border-slate-150 bg-slate-50 flex justify-between items-center">
              <div>
                <h3 className="font-extrabold text-slate-900 text-lg">📝 Intégrer à la base de connaissances</h3>
                <p className="text-xs text-slate-400 mt-0.5">Corrigez la réponse pour l&apos;ajouter de façon permanente dans la mémoire du chatbot.</p>
              </div>
              <button
                onClick={() => setPromotingSuggestion(null)}
                className="text-slate-400 hover:text-slate-650 bg-slate-200/50 hover:bg-slate-200 w-8 h-8 rounded-full flex items-center justify-center transition-colors font-bold text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handlePromoteToKnowledge} className="flex-1 overflow-y-auto p-6 space-y-4">
              {/* Readonly user query */}
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                  Question de l&apos;utilisateur (Telle que posée)
                </label>
                <input
                  type="text"
                  value={faqQuestion}
                  onChange={(e) => setFaqQuestion(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-lg bg-slate-50 text-slate-600 text-xs font-bold outline-none"
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Category select */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                    Catégorie de classement *
                  </label>
                  <select
                    value={faqCategorie}
                    onChange={(e) => setFaqCategorie(e.target.value)}
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
                    Priorité d&apos;analyse
                  </label>
                  <input
                    type="number"
                    value={faqPriorite}
                    onChange={(e) => setFaqPriorite(e.target.value)}
                    min="0"
                    max="100"
                    placeholder="0"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none text-slate-800"
                  />
                </div>
              </div>

              {/* Reponse */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Réponse finale corrigée (Mémoire permanente) *
                </label>
                <textarea
                  value={faqReponse}
                  onChange={(e) => setFaqReponse(e.target.value)}
                  rows={5}
                  placeholder="Rédigez ici la réponse complète et correcte que le chatbot donnera la prochaine fois..."
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none text-slate-800"
                  required
                />
              </div>

              {/* Keywords */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Mots-clés sémantiques (Optionnel)
                </label>
                <input
                  type="text"
                  value={faqMotsCles}
                  onChange={(e) => setFaqMotsCles(e.target.value)}
                  placeholder="tarif, cotisation, inscription, prix (séparés par des virgules)"
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none text-slate-800"
                />
              </div>

              {/* Actif */}
              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="faq-actif"
                  checked={faqActif}
                  onChange={(e) => setFaqActif(e.target.checked)}
                  className="w-4 h-4 text-primary border-slate-350 rounded focus:ring-primary cursor-pointer"
                />
                <label htmlFor="faq-actif" className="text-xs font-bold text-slate-700 cursor-pointer">
                  Activer immédiatement cette entrée pour le chatbot
                </label>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-4 border-t border-slate-100 justify-end -mx-6 -mb-6 p-4 bg-slate-50/50">
                <button
                  type="button"
                  onClick={() => setPromotingSuggestion(null)}
                  disabled={submitting}
                  className="px-5 py-2 bg-slate-200 hover:bg-slate-300 disabled:opacity-50 text-slate-800 text-xs font-bold rounded-lg transition-colors cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-primary hover:bg-primary-dark disabled:opacity-50 text-white text-xs font-bold rounded-lg transition-colors shadow-xs cursor-pointer"
                >
                  {submitting ? 'Enregistrement...' : 'Enregistrer dans la Base'}
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
