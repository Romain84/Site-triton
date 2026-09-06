'use client'

import { useEffect, useState, useMemo } from 'react'
import toast from 'react-hot-toast'
import { HelpTooltip } from '../ui/Tooltip'
import FinanceChart from './finance/FinanceChart'
import FinanceMetricCards from './finance/FinanceMetricCards'
import FinanceProjection from './finance/FinanceProjection'
import TransactionModal from './finance/TransactionModal'
import TransactionTable from './finance/TransactionTable'
import FinanceHistoryTable from './finance/FinanceHistoryTable'
import FinanceBilan from './finance/FinanceBilan'
import {
  FinancesData,
  moisNoms,
  statutsLabels,
  categoriesLabels,
  TransactionComptableItem,
  FactureCoachItem,
  CommandeItem,
} from './finance/types'

export default function FinancesManager() {
  const currentDate = new Date()
  const [selectedMois, setSelectedMois] = useState<number>(currentDate.getMonth() + 1)
  const [selectedAnnee, setSelectedAnnee] = useState<number>(currentDate.getFullYear())
  const [data, setData] = useState<FinancesData | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'bilan' | 'journal' | 'projection' | 'categories'>('bilan')
  const [journalSubFilter, setJournalSubFilter] = useState<'all' | 'comptabilite' | 'coaches' | 'boutique'>('all')
  const [journalSearch, setJournalSearch] = useState('')
  const [journalTypeFilter, setJournalTypeFilter] = useState<'all' | 'recette' | 'depense'>('all')

  // Modal de transaction
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [modalDefaultType, setModalDefaultType] = useState<'recette' | 'depense' | undefined>(undefined)
  const [editingTransaction, setEditingTransaction] = useState<TransactionComptableItem | null>(null)
  const [deleteTxConfirm, setDeleteTxConfirm] = useState<{ isOpen: boolean; id: string | null }>({ isOpen: false, id: null })

  // Catégories
  const [categories, setCategories] = useState<any[]>([])
  const [isAddCatModalOpen, setIsAddCatModalOpen] = useState(false)
  const [editingCat, setEditingCat] = useState<any | null>(null)
  const [newCatNom, setNewCatNom] = useState('')
  const [newCatType, setNewCatType] = useState<'recette' | 'depense' | 'double'>('recette')
  const [newCatCode, setNewCatCode] = useState('')
  const [deleteCatConfirm, setDeleteCatConfirm] = useState<{ isOpen: boolean; cat: any | null }>({ isOpen: false, cat: null })

  const anneesList = Array.from({ length: 5 }, (_, i) => currentDate.getFullYear() - 2 + i)

  // ─── Chargement des données ─────────────────────────────────────────────────
  const fetchFinances = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/admin/finances?mois=${selectedMois}&annee=${selectedAnnee}`)
      const resData = await response.json()
      if (response.ok) {
        setData(resData)
      } else {
        toast.error(resData.error || 'Erreur lors du chargement des données financières')
      }
    } catch {
      toast.error('Erreur réseau lors de la récupération des données financières')
    } finally {
      setLoading(false)
    }
  }

  const fetchCategories = async () => {
    try {
      const response = await fetch('/api/admin/finances/categories')
      const resData = await response.json()
      if (response.ok) {
        setCategories(resData.categories || [])
      }
    } catch {
      console.error('Erreur lors du chargement des catégories')
    }
  }

  useEffect(() => {
    fetchFinances()
    fetchCategories()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMois, selectedAnnee])

  const handleMarkAsPaid = async (factureId: string) => {
    try {
      setUpdatingId(factureId)
      const response = await fetch(`/api/admin/factures/${factureId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ statut: 'payee' }),
      })
      if (response.ok) {
        toast.success('Facture marquée comme Payée et PDF physiquement archivé')
        await fetchFinances()
      } else {
        const resData = await response.json()
        toast.error(resData.error || 'Erreur lors de la modification')
      }
    } catch {
      toast.error('Erreur lors du changement de statut')
    } finally {
      setUpdatingId(null)
    }
  }

  const handleDeleteTransaction = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/comptabilite/${id}`, { method: 'DELETE' })
      if (res.ok) {
        toast.success('Transaction supprimée avec succès')
        await fetchFinances()
      } else {
        const err = await res.json()
        toast.error(err.error || 'Erreur lors de la suppression')
      }
    } catch {
      toast.error('Erreur lors de la suppression')
    }
  }

  const handleDeleteCategory = async (cat: any) => {
    setDeleteCatConfirm({ isOpen: true, cat })
  }

  const confirmDeleteCategory = async () => {
    if (!deleteCatConfirm.cat) return
    const id = deleteCatConfirm.cat.id
    try {
      const res = await fetch(`/api/admin/finances/categories/${id}`, { method: 'DELETE' })
      const data = await res.json()
      if (res.ok) {
        toast.success('Catégorie supprimée avec succès')
        setDeleteCatConfirm({ isOpen: false, cat: null })
        await fetchCategories()
        await fetchFinances()
      } else {
        toast.error(data.error || 'Erreur lors de la suppression')
      }
    } catch {
      toast.error('Erreur réseau lors de la suppression')
    }
  }

  const handleCategorySubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newCatNom.trim()) return toast.error('Le nom est requis')

    const payload = {
      nom: newCatNom.trim(),
      type: newCatType,
      code: newCatCode.trim() || undefined
    }

    try {
      const url = editingCat ? `/api/admin/finances/categories/${editingCat.id}` : '/api/admin/finances/categories'
      const method = editingCat ? 'PUT' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json()

      if (res.ok) {
        toast.success(editingCat ? 'Catégorie modifiée avec succès' : 'Catégorie créée avec succès')
        setIsAddCatModalOpen(false)
        setEditingCat(null)
        setNewCatNom('')
        setNewCatType('recette')
        setNewCatCode('')
        await fetchCategories()
      } else {
        toast.error(data.error || 'Une erreur est survenue')
      }
    } catch {
      toast.error('Erreur réseau lors de l\'enregistrement')
    }
  }

  // ─── Données dérivées ───────────────────────────────────────────────────────
  const selectedPeriod = data?.selectedPeriod
  const overview = data?.overview || []
  const soldeDepartSaison = data?.soldeDepartSaison || 0

  const totalLifetimeIncome = overview.reduce((sum, item) => sum + item.income, 0)
  const totalLifetimeExpense = overview.reduce((sum, item) => sum + item.expense, 0)
  const tresorerieGlobale = soldeDepartSaison + totalLifetimeIncome - totalLifetimeExpense

  // Calcul du cumulé mois par mois
  const getCumulativeOverview = () => {
    const chronological = [...overview].reverse()
    let running = soldeDepartSaison
    const mapped = chronological.map(item => {
      running += item.net
      return { ...item, cumulative: running }
    })
    return mapped.reverse()
  }
  const cumulativeOverview = getCumulativeOverview()

  // Tendances M-1
  const currentMonthItem = overview.find(o => o.month === selectedMois && o.year === selectedAnnee)
  const prevMois = selectedMois === 1 ? 12 : selectedMois - 1
  const prevAnnee = selectedMois === 1 ? selectedAnnee - 1 : selectedAnnee
  const prevMonthItem = overview.find(o => o.month === prevMois && o.year === prevAnnee)

  const incomeTrend = currentMonthItem && prevMonthItem && prevMonthItem.income > 0
    ? ((currentMonthItem.income - prevMonthItem.income) / prevMonthItem.income) * 100
    : null

  const expenseTrend = currentMonthItem && prevMonthItem && prevMonthItem.expense > 0
    ? ((currentMonthItem.expense - prevMonthItem.expense) / prevMonthItem.expense) * 100
    : null

  const currentCumulativeItem = cumulativeOverview.find(o => o.month === selectedMois && o.year === selectedAnnee)
  const prevCumulativeItem = cumulativeOverview.find(o => o.month === prevMois && o.year === prevAnnee)
  const tresorerieTrend = currentCumulativeItem && prevCumulativeItem && prevCumulativeItem.cumulative !== 0
    ? ((currentCumulativeItem.cumulative - prevCumulativeItem.cumulative) / Math.abs(prevCumulativeItem.cumulative)) * 100
    : null

  const getCategoryLabel = (catCode: string) => {
    const found = categories?.find(c => c.code === catCode)
    return found ? found.nom : (categoriesLabels[catCode] || catCode)
  }

  // Liste unifiée des opérations du mois (comptabilité, factures coachs, commandes boutique)
  const unifiedOperations = useMemo(() => {
    if (!selectedPeriod) return []
    const list: Array<{
      id: string
      date: Date
      dateFormatted: string
      type: 'recette' | 'depense'
      source: 'comptabilite' | 'coaches' | 'boutique'
      sourceLabel: string
      sourceBadgeClass: string
      libelle: string
      categorie: string
      montant: number
      justificatif?: string | null
      rawTransaction?: TransactionComptableItem
      rawFacture?: FactureCoachItem
      rawCommande?: CommandeItem
    }> = []

    // 1. Écritures comptables manuelles
    selectedPeriod.transactions?.forEach(tx => {
      list.push({
        id: tx.id,
        date: new Date(tx.date),
        dateFormatted: new Date(tx.date).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' }),
        type: tx.type,
        source: 'comptabilite',
        sourceLabel: 'Écriture manuelle',
        sourceBadgeClass: 'bg-indigo-50 text-indigo-700 border border-indigo-200/60',
        libelle: tx.libelle,
        categorie: getCategoryLabel(tx.categorie),
        montant: tx.montant,
        justificatif: tx.justificatif,
        rawTransaction: tx,
      })
    })

    // 2. Factures Coachs
    selectedPeriod.factures?.forEach(fac => {
      const d = fac.datePaiement
        ? new Date(fac.datePaiement)
        : fac.createdAt
          ? new Date(fac.createdAt)
          : new Date(fac.annee, fac.mois - 1, 1)

      const formatted = fac.datePaiement
        ? new Date(fac.datePaiement).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
        : fac.createdAt
          ? new Date(fac.createdAt).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
          : `${moisNoms[fac.mois - 1]} ${fac.annee}`

      list.push({
        id: fac.id,
        date: d,
        dateFormatted: formatted,
        type: 'depense',
        source: 'coaches',
        sourceLabel: 'Facture Coach',
        sourceBadgeClass: 'bg-sky-50 text-sky-700 border border-sky-200/60',
        libelle: `Facture ${fac.numero} - ${fac.coach.prenom} ${fac.coach.nom || ''}`,
        categorie: 'Salaires & Indemnités',
        montant: fac.montantTotal,
        justificatif: fac.pdfPath,
        rawFacture: fac,
      })
    })

    // 3. Ventes Boutique
    selectedPeriod.commandes?.forEach(cmd => {
      list.push({
        id: cmd.id,
        date: new Date(cmd.createdAt),
        dateFormatted: new Date(cmd.createdAt).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' }),
        type: 'recette',
        source: 'boutique',
        sourceLabel: 'Vente Boutique',
        sourceBadgeClass: 'bg-emerald-50 text-emerald-700 border border-emerald-200/60',
        libelle: `Commande #${cmd.numeroCommande} - ${cmd.prenom} ${cmd.nom}`,
        categorie: 'Boutique officielle',
        montant: cmd.total,
        rawCommande: cmd,
      })
    })

    // Tri chronologique décroissant
    list.sort((a, b) => b.date.getTime() - a.date.getTime())
    return list
  }, [selectedPeriod, categories])

  // Filtrage du journal unifié
  const filteredUnifiedOps = useMemo(() => {
    return unifiedOperations.filter(op => {
      if (journalTypeFilter !== 'all' && op.type !== journalTypeFilter) return false
      if (journalSearch.trim()) {
        const q = journalSearch.toLowerCase()
        return (
          op.libelle.toLowerCase().includes(q) ||
          op.categorie.toLowerCase().includes(q) ||
          op.sourceLabel.toLowerCase().includes(q)
        )
      }
      return true
    })
  }, [unifiedOperations, journalTypeFilter, journalSearch])

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <p className="mt-3 text-slate-500 font-medium text-xs">Chargement du tableau de bord financier...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 pb-5">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div>
            <h2 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              Trésorerie &amp; Finances
              <HelpTooltip title="Suivi de la trésorerie">
                <p>Visualisation des rentrées d&apos;argent (boutique, cotisations) et des sorties (indemnités entraîneurs, frais courants).</p>
                <p className="mt-1">Les factures en statut &quot;Brouillon&quot; ne sont pas comptabilisées dans ces chiffres.</p>
              </HelpTooltip>
            </h2>
            <p className="text-xs text-slate-500 font-medium mt-0.5">Gestion comptable, factures et bilans du club</p>
          </div>

          {/* Sélecteur de période */}
          <div className="inline-flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200/60 shadow-xs shrink-0 max-w-fit sm:ml-2">
            <select value={selectedMois} onChange={(e) => setSelectedMois(Number(e.target.value))} aria-label="Sélectionner le mois" className="px-2.5 py-1.5 bg-white rounded-lg text-xs font-bold text-slate-800 border border-slate-200/40 outline-none focus:ring-0 cursor-pointer shadow-xs">
              {moisNoms.map((nom, index) => (
                <option key={index} value={index + 1}>{nom}</option>
              ))}
            </select>
            <select value={selectedAnnee} onChange={(e) => setSelectedAnnee(Number(e.target.value))} aria-label="Sélectionner l'année" className="px-2.5 py-1.5 bg-white rounded-lg text-xs font-bold text-slate-800 border border-slate-200/40 outline-none focus:ring-0 cursor-pointer shadow-xs">
              {anneesList.map((annee) => (
                <option key={annee} value={annee}>{annee}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Boutons d'action rapides */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => {
              setEditingTransaction(null)
              setModalDefaultType('recette')
              setIsModalOpen(true)
            }}
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center gap-1.5 cursor-pointer"
          >
            <span>➕</span>
            <span>Nouvelle Recette</span>
          </button>
          <button
            onClick={() => {
              setEditingTransaction(null)
              setModalDefaultType('depense')
              setIsModalOpen(true)
            }}
            className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-xs transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center gap-1.5 cursor-pointer"
          >
            <span>➖</span>
            <span>Nouvelle Dépense</span>
          </button>
        </div>
      </div>

      {/* Cartes métriques */}
      <FinanceMetricCards
        soldeDepartSaison={soldeDepartSaison}
        totalIncome={selectedPeriod?.totalIncome || 0}
        totalExpense={selectedPeriod?.totalExpense || 0}
        tresorerieGlobale={tresorerieGlobale}
        incomeTrend={incomeTrend}
        expenseTrend={expenseTrend}
        tresorerieTrend={tresorerieTrend}
      />

      {/* Graphique SVG avec toggle */}
      <FinanceChart
        overview={overview}
        cumulativeOverview={cumulativeOverview}
        soldeDepartSaison={soldeDepartSaison}
        selectedMois={selectedMois}
        selectedAnnee={selectedAnnee}
        onSelectMonth={(m, y) => {
          setSelectedMois(m)
          setSelectedAnnee(y)
        }}
      />

      {/* Onglets détaillés */}
      <div className="card p-5 bg-white border border-slate-200/90 rounded-2xl shadow-2xs">
        {/* Navigation principale par onglets */}
        <div className="bg-slate-100/90 p-1.5 rounded-2xl flex flex-wrap gap-1 mb-6 border border-slate-200/60 max-w-5xl">
          {[
            { id: 'bilan', label: 'Bilan Financier', icon: '📊' },
            { id: 'journal', label: 'Journal des Opérations', count: unifiedOperations.length, icon: '📒' },
            { id: 'projection', label: 'Prévisions & Budget', icon: '🔮' },
            { id: 'categories', label: 'Catégories & Paramètres', count: categories.length, icon: '⚙️' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`py-2 px-3.5 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-white text-slate-900 shadow-xs border border-slate-200/60'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
              }`}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
              {tab.count !== undefined && (
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-extrabold ${
                  activeTab === tab.id ? 'bg-slate-100 text-slate-700' : 'bg-slate-200/70 text-slate-500'
                }`}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ─── ONGLET 1 : BILAN FINANCIER ─── */}
        {activeTab === 'bilan' && (
          <FinanceBilan />
        )}

        {/* ─── ONGLET 2 : JOURNAL DES OPÉRATIONS ─── */}
        {activeTab === 'journal' && (
          <div className="space-y-6">
            {/* Sous-filtre par source de données */}
            <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-100">
              <div className="inline-flex flex-wrap items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200/60 text-xs font-bold">
                {[
                  { id: 'all', label: 'Toutes les opérations', count: unifiedOperations.length },
                  { id: 'comptabilite', label: 'Écritures manuelles', count: selectedPeriod?.transactions?.length || 0 },
                  { id: 'coaches', label: 'Factures Coachs', count: selectedPeriod?.factures?.length || 0 },
                  { id: 'boutique', label: 'Ventes Boutique', count: selectedPeriod?.commandes?.length || 0 },
                ].map((sub) => (
                  <button
                    key={sub.id}
                    onClick={() => setJournalSubFilter(sub.id as any)}
                    className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                      journalSubFilter === sub.id
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/40'
                    }`}
                  >
                    <span>{sub.label}</span>
                    <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                      journalSubFilter === sub.id ? 'bg-slate-100 text-slate-800' : 'bg-slate-200/70 text-slate-500'
                    }`}>
                      {sub.count}
                    </span>
                  </button>
                ))}
              </div>

              {journalSubFilter === 'all' && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setEditingTransaction(null)
                      setModalDefaultType('recette')
                      setIsModalOpen(true)
                    }}
                    className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200/60 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                  >
                    + Recette
                  </button>
                  <button
                    onClick={() => {
                      setEditingTransaction(null)
                      setModalDefaultType('depense')
                      setIsModalOpen(true)
                    }}
                    className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200/60 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                  >
                    - Dépense
                  </button>
                </div>
              )}
            </div>

            {/* Vue unifiée : TOUTES LES OPÉRATIONS */}
            {journalSubFilter === 'all' && (
              <div className="space-y-4">
                {/* Barre de recherche & filtre type */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                  <div className="relative w-full sm:w-80">
                    <input
                      type="text"
                      placeholder="Rechercher par tiers, libellé, poste..."
                      value={journalSearch}
                      onChange={(e) => setJournalSearch(e.target.value)}
                      className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-200/80 rounded-xl text-xs font-medium text-slate-800 focus:bg-white focus:border-slate-800 outline-none transition-all placeholder:text-slate-400"
                    />
                    <span className="absolute left-3 top-2.5 text-slate-400 text-xs">🔍</span>
                    {journalSearch && (
                      <button
                        onClick={() => setJournalSearch('')}
                        className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 text-xs cursor-pointer font-bold"
                      >
                        ✕
                      </button>
                    )}
                  </div>

                  <div className="inline-flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200/60 text-xs font-bold self-start sm:self-auto">
                    {[
                      { id: 'all', label: 'Tous flux' },
                      { id: 'recette', label: 'Recettes (+)' },
                      { id: 'depense', label: 'Dépenses (-)' },
                    ].map((f) => (
                      <button
                        key={f.id}
                        onClick={() => setJournalTypeFilter(f.id as any)}
                        className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                          journalTypeFilter === f.id
                            ? 'bg-white text-slate-900 shadow-xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Table unifiée */}
                {filteredUnifiedOps.length === 0 ? (
                  <div className="flex flex-col items-center justify-center text-center py-12 px-4 bg-slate-50/50 border border-dashed border-slate-200 rounded-2xl">
                    <span className="text-3xl mb-2">📒</span>
                    <p className="font-bold text-slate-800 text-sm">
                      {journalSearch
                        ? 'Aucune opération ne correspond à votre recherche'
                        : `Aucune opération financière enregistrée pour ${moisNoms[selectedMois - 1]} ${selectedAnnee}`}
                    </p>
                    <p className="text-xs text-slate-500 mt-1 max-w-sm">
                      {journalSearch
                        ? 'Vérifiez vos termes de recherche ou réinitialisez le filtre.'
                        : 'Enregistrez des écritures manuelles, validez des factures coachs ou consultez les ventes de la boutique.'}
                    </p>
                    {!journalSearch && overview.some(o => (o.income > 0 || o.expense > 0) && !(o.month === selectedMois && o.year === selectedAnnee)) && (() => {
                      const active = overview.find(o => (o.income > 0 || o.expense > 0) && !(o.month === selectedMois && o.year === selectedAnnee))
                      if (!active) return null
                      return (
                        <div className="mt-4 p-3.5 bg-indigo-50/90 border border-indigo-200/80 rounded-2xl text-xs flex flex-col sm:flex-row items-center gap-3 shadow-2xs">
                          <span className="text-indigo-950 font-medium">
                            💡 Des flux financiers ({active.income > 0 ? `+${active.income.toFixed(2)} €` : ''}{active.expense > 0 ? ` -${active.expense.toFixed(2)} €` : ''}) sont enregistrés pour <strong>{moisNoms[active.month - 1]} {active.year}</strong>.
                          </span>
                          <button
                            onClick={() => {
                              setSelectedMois(active.month)
                              setSelectedAnnee(active.year)
                            }}
                            className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs transition-all shadow-xs cursor-pointer shrink-0"
                          >
                            Consulter {moisNoms[active.month - 1]} {active.year} →
                          </button>
                        </div>
                      )
                    })()}
                  </div>
                ) : (
                  <div className="rounded-2xl border border-slate-200/80 overflow-hidden shadow-2xs">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px]">
                            <th className="py-3 px-4">Date</th>
                            <th className="py-3 px-4">Origine</th>
                            <th className="py-3 px-4">Libellé / Tiers</th>
                            <th className="py-3 px-4">Poste / Catégorie</th>
                            <th className="py-3 px-4 text-right">Montant</th>
                            <th className="py-3 px-4 text-center">Justificatif / Statut</th>
                            <th className="py-3 px-4 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {filteredUnifiedOps.map((op) => (
                            <tr key={`${op.source}-${op.id}`} className="hover:bg-slate-50/80 transition-colors">
                              <td className="py-3.5 px-4 text-slate-600 font-mono font-medium text-xs whitespace-nowrap">
                                {op.dateFormatted}
                              </td>
                              <td className="py-3.5 px-4 whitespace-nowrap">
                                <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${op.sourceBadgeClass}`}>
                                  {op.source === 'comptabilite' && '📒 '}
                                  {op.source === 'coaches' && '🏊 '}
                                  {op.source === 'boutique' && '🛍️ '}
                                  {op.sourceLabel}
                                </span>
                              </td>
                              <td className="py-3.5 px-4 text-xs font-semibold text-slate-900">
                                {op.libelle}
                              </td>
                              <td className="py-3.5 px-4 text-xs text-slate-600">
                                {op.categorie}
                              </td>
                              <td className={`py-3.5 px-4 text-right font-black text-sm whitespace-nowrap ${
                                op.type === 'recette' ? 'text-emerald-700' : 'text-rose-700'
                              }`}>
                                {op.type === 'recette' ? '+' : '-'}{op.montant.toFixed(2)} €
                              </td>
                              <td className="py-3.5 px-4 text-center whitespace-nowrap">
                                {op.source === 'comptabilite' && (
                                  op.justificatif ? (
                                    <a
                                      href={op.justificatif}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="px-2 py-0.5 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-bold inline-block cursor-pointer transition-colors"
                                    >
                                      📎 Voir
                                    </a>
                                  ) : (
                                    <span className="text-slate-300 text-xs">-</span>
                                  )
                                )}
                                {op.source === 'coaches' && (
                                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${statutsLabels[op.rawFacture?.statut || '']?.color || 'bg-slate-100 text-slate-700'}`}>
                                    {statutsLabels[op.rawFacture?.statut || '']?.label || op.rawFacture?.statut}
                                  </span>
                                )}
                                {op.source === 'boutique' && (
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                                    Encaissé CB
                                  </span>
                                )}
                              </td>
                              <td className="py-3.5 px-4 text-right space-x-1.5 whitespace-nowrap">
                                {op.source === 'comptabilite' && op.rawTransaction && (
                                  <>
                                    <button
                                      onClick={() => {
                                        setEditingTransaction(op.rawTransaction!)
                                        setModalDefaultType(op.rawTransaction!.type)
                                        setIsModalOpen(true)
                                      }}
                                      className="px-2.5 py-1 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
                                      aria-label={`Modifier l'écriture ${op.libelle}`}
                                    >
                                      Modifier
                                    </button>
                                    <button
                                      onClick={() => setDeleteTxConfirm({ isOpen: true, id: op.id })}
                                      className="px-2.5 py-1 text-xs font-bold text-red-700 bg-red-50 hover:bg-red-100 rounded-lg transition-colors cursor-pointer"
                                      aria-label={`Supprimer l'écriture ${op.libelle}`}
                                    >
                                      Supprimer
                                    </button>
                                  </>
                                )}
                                {op.source === 'coaches' && op.rawFacture && (
                                  <>
                                    {op.rawFacture.statut !== 'payee' && (
                                      <button
                                        onClick={() => handleMarkAsPaid(op.id)}
                                        disabled={updatingId === op.id}
                                        className="px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-100 hover:bg-emerald-200 text-emerald-900 transition-colors disabled:opacity-50 cursor-pointer"
                                      >
                                        {updatingId === op.id ? '...' : '✓ Payée'}
                                      </button>
                                    )}
                                    {op.rawFacture.pdfPath && (
                                      <a
                                        href={op.rawFacture.pdfPath}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="px-2 py-1 rounded-lg text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors inline-block cursor-pointer"
                                      >
                                        📄 PDF
                                      </a>
                                    )}
                                  </>
                                )}
                                {op.source === 'boutique' && (
                                  <span className="text-slate-400 text-xs italic">Automatisé</span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Vue spécialisée : COMPTABILITÉ MANUELLE */}
            {journalSubFilter === 'comptabilite' && (
              <TransactionTable
                transactions={selectedPeriod?.transactions || []}
                categories={categories}
                boutiqueCount={selectedPeriod?.commandes?.length || 0}
                boutiqueTotal={selectedPeriod?.commandes?.reduce((sum, c) => sum + c.total, 0) || 0}
                onViewBoutique={() => setJournalSubFilter('boutique')}
                onDelete={handleDeleteTransaction}
                onAddNew={(type) => {
                  setEditingTransaction(null)
                  setModalDefaultType(type)
                  setIsModalOpen(true)
                }}
                onEdit={(tx) => {
                  setEditingTransaction(tx)
                  setModalDefaultType(tx.type)
                  setIsModalOpen(true)
                }}
              />
            )}

            {/* Vue spécialisée : FACTURES ENTRAÎNEURS */}
            {journalSubFilter === 'coaches' && (
              <div>
                {selectedPeriod?.factures.length === 0 ? (
                  <div className="flex flex-col items-center justify-center text-center py-12 px-4 bg-slate-50/50 border border-dashed border-slate-200 rounded-2xl">
                    <span className="text-3xl mb-2">🏊</span>
                    <p className="font-bold text-slate-800 text-sm">Aucune facture entraîneur pour ce mois</p>
                    <p className="text-xs text-slate-500 mt-1 max-w-sm">
                      Les factures générées ou envoyées par les entraîneurs pour {moisNoms[selectedMois - 1]} {selectedAnnee} apparaîtront automatiquement ici.
                    </p>
                  </div>
                ) : (
                  <div className="rounded-2xl border border-slate-200/80 overflow-hidden shadow-2xs">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px]">
                            <th className="py-3 px-4">Numéro</th>
                            <th className="py-3 px-4">Entraîneur</th>
                            <th className="py-3 px-4 text-right">Montant</th>
                            <th className="py-3 px-4 text-center">Statut</th>
                            <th className="py-3 px-4 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {selectedPeriod?.factures.map((facture) => (
                            <tr key={facture.id} className="hover:bg-slate-50/80 transition-colors">
                              <td className="py-3.5 px-4 font-mono font-bold text-slate-700 text-xs">{facture.numero}</td>
                              <td className="py-3.5 px-4 font-extrabold text-slate-900">
                                {facture.coach.prenom} {facture.coach.nom || ''}
                              </td>
                              <td className="text-right py-3.5 px-4 font-black text-slate-900 text-sm">
                                {facture.montantTotal.toFixed(2)} €
                              </td>
                              <td className="text-center py-3.5 px-4">
                                <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${statutsLabels[facture.statut]?.color || 'bg-slate-100 text-slate-800'}`}>
                                  {statutsLabels[facture.statut]?.label || facture.statut}
                                </span>
                              </td>
                              <td className="text-right py-3.5 px-4 space-x-2">
                                {facture.statut !== 'payee' && (
                                  <button
                                    onClick={() => handleMarkAsPaid(facture.id)}
                                    disabled={updatingId === facture.id}
                                    className="px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-100 hover:bg-emerald-200 text-emerald-900 transition-colors disabled:opacity-50 cursor-pointer"
                                  >
                                    {updatingId === facture.id ? 'Virement...' : '✓ Marquer Payée'}
                                  </button>
                                )}
                                {facture.pdfPath ? (
                                  <a href={facture.pdfPath} target="_blank" rel="noopener noreferrer" className="px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors inline-block cursor-pointer">
                                    📄 PDF Archive
                                  </a>
                                ) : (
                                  <span className="text-xs text-slate-400 italic">Non archivé</span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Vue spécialisée : VENTES BOUTIQUE */}
            {journalSubFilter === 'boutique' && (
              <div>
                {selectedPeriod?.commandes.length === 0 ? (
                  <div className="flex flex-col items-center justify-center text-center py-12 px-4 bg-slate-50/50 border border-dashed border-slate-200 rounded-2xl">
                    <span className="text-3xl mb-2">🛍️</span>
                    <p className="font-bold text-slate-800 text-sm">Aucune vente boutique pour ce mois</p>
                    <p className="text-xs text-slate-500 mt-1 max-w-sm">
                      Les achats réalisés sur la boutique officielle pour {moisNoms[selectedMois - 1]} {selectedAnnee} s&apos;afficheront ici.
                    </p>
                  </div>
                ) : (
                  <div className="rounded-2xl border border-slate-200/80 overflow-hidden shadow-2xs">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px]">
                            <th className="py-3 px-4">N° Commande</th>
                            <th className="py-3 px-4">Adhérent / Client</th>
                            <th className="py-3 px-4">Date de Paiement</th>
                            <th className="text-right py-3 px-4">Montant Encaissé</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {selectedPeriod?.commandes.map((cmd) => (
                            <tr key={cmd.id} className="hover:bg-slate-50/80 transition-colors">
                              <td className="py-3.5 px-4 font-mono font-bold text-slate-700 text-xs">{cmd.numeroCommande}</td>
                              <td className="py-3.5 px-4 font-bold text-slate-800">{cmd.prenom} {cmd.nom}</td>
                              <td className="py-3.5 px-4 text-slate-500 font-medium">
                                {new Date(cmd.createdAt).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                              </td>
                              <td className="text-right py-3.5 px-4 font-black text-emerald-700 text-sm">+{cmd.total.toFixed(2)} €</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ─── ONGLET 3 : PRÉVISIONS & BUDGET ─── */}
        {activeTab === 'projection' && (
          <FinanceProjection
            tresorerieGlobale={tresorerieGlobale}
            anneesList={anneesList}
            isActive={activeTab === 'projection'}
          />
        )}

        {/* ─── ONGLET 4 : CATÉGORIES & PARAMÈTRES ─── */}
        {activeTab === 'categories' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-900">
                  Catégories de Saisie Comptable
                </h3>
                <p className="text-xs text-slate-500 font-medium">Structure des postes de recettes et dépenses du club</p>
              </div>
              <button
                onClick={() => {
                  setEditingCat(null)
                  setNewCatNom('')
                  setNewCatType('recette')
                  setNewCatCode('')
                  setIsAddCatModalOpen(true)
                }}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <span>➕</span>
                <span>Nouvelle catégorie</span>
              </button>
            </div>
            
            <div className="rounded-2xl border border-slate-200/80 overflow-hidden shadow-2xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px]">
                      <th className="py-3 px-4">Code</th>
                      <th className="py-3 px-4">Désignation</th>
                      <th className="py-3 px-4">Type de Flux</th>
                      <th className="text-center py-3 px-4">Type Système</th>
                      <th className="text-right py-3 px-4">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {categories.map((cat) => (
                      <tr key={cat.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3.5 px-4 font-mono font-bold text-slate-600">{cat.code}</td>
                        <td className="py-3.5 px-4 font-bold text-slate-900">{cat.nom}</td>
                        <td className="py-3.5 px-4">
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            cat.type === 'recette' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200/60' :
                            cat.type === 'depense' ? 'bg-rose-50 text-rose-800 border border-rose-200/60' : 'bg-amber-50 text-amber-800 border border-amber-200/60'
                          }`}>
                            {cat.type === 'recette' ? 'Recette (+)' :
                             cat.type === 'depense' ? 'Dépense (-)' : 'Double / Valorisation'}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          {cat.systeme ? (
                            <span className="text-slate-600 font-bold bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200/60 text-[10px]">Système</span>
                          ) : (
                            <span className="text-slate-400 text-[10px]">Personnalisé</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-right space-x-2">
                          <button
                            onClick={() => {
                              setEditingCat(cat)
                              setNewCatNom(cat.nom)
                              setNewCatType(cat.type)
                              setNewCatCode(cat.code)
                              setIsAddCatModalOpen(true)
                            }}
                            className="px-2.5 py-1 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
                            aria-label={`Modifier la catégorie ${cat.nom}`}
                          >
                            Modifier
                          </button>
                          {!cat.systeme && (
                            <button
                              onClick={() => handleDeleteCategory(cat)}
                              className="px-2.5 py-1 text-xs font-bold text-red-700 bg-red-50 hover:bg-red-100 rounded-lg transition-colors cursor-pointer"
                              aria-label={`Supprimer la catégorie ${cat.nom}`}
                            >
                              Supprimer
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modal de transaction */}
      <TransactionModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false)
          setEditingTransaction(null)
        }}
        onSuccess={fetchFinances}
        categories={categories}
        defaultType={modalDefaultType}
        selectedMois={selectedMois}
        selectedAnnee={selectedAnnee}
        transactionToEdit={editingTransaction}
      />

      {/* Modal d'ajout/modification de catégorie */}
      {isAddCatModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 animate-fade-in">
          <div className="bg-white rounded-3xl border border-slate-200/80 p-6 md:p-8 max-w-md w-full shadow-lg m-4 space-y-6">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-950">
                {editingCat ? 'Modifier la catégorie' : 'Nouvelle catégorie de saisie'}
              </h3>
              <button onClick={() => setIsAddCatModalOpen(false)} className="text-slate-400 hover:text-slate-650 font-bold cursor-pointer">✕</button>
            </div>

            <form onSubmit={handleCategorySubmit} className="space-y-4 text-sm font-light text-slate-750">
              <div>
                <label htmlFor="catNom" className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">Nom de la catégorie *</label>
                <input
                  type="text"
                  id="catNom"
                  required
                  value={newCatNom}
                  onChange={(e) => setNewCatNom(e.target.value)}
                  placeholder="Ex: Frais de déplacement..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200/85 rounded-lg focus:border-slate-800 focus:bg-white outline-none font-normal text-slate-800"
                />
              </div>

              {!editingCat && (
                <div>
                  <label htmlFor="catCode" className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">Code unique (facultatif)</label>
                  <input
                    type="text"
                    id="catCode"
                    value={newCatCode}
                    onChange={(e) => setNewCatCode(e.target.value)}
                    placeholder="Auto-généré si vide (ex: frais_deplacement)"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200/85 rounded-lg focus:border-slate-800 focus:bg-white outline-none font-normal text-slate-800 font-mono text-xs"
                  />
                </div>
              )}

              <div>
                <label htmlFor="catType" className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">Type de flux financier</label>
                <select
                  id="catType"
                  value={newCatType}
                  disabled={editingCat?.systeme}
                  onChange={(e) => setNewCatType(e.target.value as any)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200/85 rounded-lg outline-none text-slate-700 font-normal cursor-pointer disabled:opacity-50"
                >
                  <option value="recette">Recette (Entrée d&apos;argent)</option>
                  <option value="depense">Dépense (Sortie d&apos;argent)</option>
                  <option value="double">Double (Valorisation / Contributions volontaires)</option>
                </select>
                {editingCat?.systeme && (
                  <p className="text-[10px] text-slate-450 italic mt-1">Le type d&apos;une catégorie système ne peut pas être modifié.</p>
                )}
              </div>

              <div className="flex gap-3 pt-4 border-t border-slate-100">
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-slate-950 hover:bg-slate-900 text-white font-bold text-xs rounded-xl shadow-sm transition-colors cursor-pointer"
                >
                  {editingCat ? 'Enregistrer les modifications' : 'Créer la catégorie'}
                </button>
                <button
                  type="button"
                  onClick={() => setIsAddCatModalOpen(false)}
                  className="py-2.5 px-4 border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs rounded-xl transition-all cursor-pointer"
                >
                  Annuler
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirmation de suppression de catégorie */}
      {deleteCatConfirm.isOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-55 p-4 animate-fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-lg border border-slate-200">
            <div className="p-6 space-y-3">
              <div className="flex items-start gap-4">
                <div className="text-3xl">⚠️</div>
                <div className="flex-1">
                  <h3 className="text-base font-extrabold text-slate-900">Supprimer la catégorie</h3>
                  <p className="text-slate-500 text-xs mt-1 leading-relaxed">
                    Voulez-vous vraiment supprimer la catégorie <strong>{deleteCatConfirm.cat?.nom}</strong> ({deleteCatConfirm.cat?.code}) ?
                    Cette opération échouera si des écritures comptables utilisent déjà cette catégorie.
                  </p>
                </div>
              </div>
            </div>
            <div className="flex gap-3 p-4 bg-slate-50 rounded-b-2xl border-t border-slate-100">
              <button
                onClick={() => setDeleteCatConfirm({ isOpen: false, cat: null })}
                className="flex-1 px-4 py-2 border border-slate-200 hover:bg-slate-100 font-bold text-xs rounded-xl transition-colors cursor-pointer text-slate-700"
              >
                Annuler
              </button>
              <button
                onClick={confirmDeleteCategory}
                className="flex-1 px-4 py-2 text-white bg-red-650 hover:bg-red-700 font-bold text-xs rounded-xl transition-colors cursor-pointer"
              >
                Confirmer la suppression
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation de suppression d'écriture unifiée */}
      {deleteTxConfirm.isOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-55 p-4 animate-fade-in" role="dialog" aria-modal="true">
          <div className="bg-white rounded-3xl max-w-sm w-full shadow-lg border border-slate-200 p-6 space-y-4">
            <h3 className="text-base font-extrabold text-slate-950">
              Supprimer l&apos;opération ?
            </h3>
            <p className="text-xs text-slate-500 font-light leading-relaxed">
              Cette action est irréversible. L&apos;opération sera définitivement retirée des calculs de trésorerie.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setDeleteTxConfirm({ isOpen: false, id: null })}
                className="px-4 py-2 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
              >
                Annuler
              </button>
              <button
                onClick={async () => {
                  if (deleteTxConfirm.id) {
                    await handleDeleteTransaction(deleteTxConfirm.id)
                    setDeleteTxConfirm({ isOpen: false, id: null })
                  }
                }}
                className="px-4 py-2 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-xl transition-colors cursor-pointer"
              >
                Confirmer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tableau historique */}
      <FinanceHistoryTable overview={overview} soldeDepartSaison={soldeDepartSaison} />

    </div>
  )
}
