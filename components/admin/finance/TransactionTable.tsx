'use client'

import { useState } from 'react'
import { TransactionComptableItem, categoriesLabels } from './types'

interface TransactionTableProps {
  transactions: TransactionComptableItem[]
  categories: any[]
  onDelete: (id: string) => Promise<void>
  onAddNew: (type?: 'recette' | 'depense') => void
}

export default function TransactionTable({ transactions, categories, onDelete, onAddNew }: TransactionTableProps) {
  const [txFilter, setTxFilter] = useState<'all' | 'recette' | 'depense'>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; id: string | null }>({ isOpen: false, id: null })

  const getCategoryLabel = (catCode: string) => {
    const found = categories?.find(c => c.code === catCode)
    return found ? found.nom : (categoriesLabels[catCode] || catCode)
  }

  // Filtrer par type et recherche
  const filteredTransactions = transactions.filter(tx => {
    if (txFilter !== 'all' && tx.type !== txFilter) return false
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      const cat = getCategoryLabel(tx.categorie)
      return tx.libelle.toLowerCase().includes(q) || cat.toLowerCase().includes(q)
    }
    return true
  })

  // Export CSV
  const exportCSV = () => {
    const headers = 'Date;Type;Catégorie;Libellé;Montant (€)\n'
    const rows = filteredTransactions.map(tx => {
      const date = new Date(tx.date).toLocaleDateString('fr-FR')
      const type = tx.type === 'recette' ? 'Recette' : 'Dépense'
      const cat = getCategoryLabel(tx.categorie).replace(/🏛️|👥|🎁|🧾|🏊|🏢|⚙️/gu, '').trim()
      const montant = `${tx.type === 'recette' ? '+' : '-'}${tx.montant.toFixed(2)}`
      return `${date};${type};${cat};${tx.libelle};${montant}`
    }).join('\n')
    const blob = new Blob(['\ufeff' + headers + rows], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `transactions.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleDeleteConfirm = async () => {
    if (deleteConfirm.id) {
      await onDelete(deleteConfirm.id)
      setDeleteConfirm({ isOpen: false, id: null })
    }
  }

  return (
    <div>
      {/* Header avec filtres, recherche et actions */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-6 gap-4 border-b border-slate-100 pb-4">
        {/* Filtres par type */}
        <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl">
          <button
            onClick={() => setTxFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              txFilter === 'all' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Tout ({transactions.length})
          </button>
          <button
            onClick={() => setTxFilter('recette')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              txFilter === 'recette' ? 'bg-emerald-50 text-emerald-700 shadow-sm' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Recettes ({transactions.filter(t => t.type === 'recette').length})
          </button>
          <button
            onClick={() => setTxFilter('depense')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              txFilter === 'depense' ? 'bg-rose-50 text-rose-700 shadow-sm' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Dépenses ({transactions.filter(t => t.type === 'depense').length})
          </button>
        </div>

        {/* Recherche + Actions */}
        <div className="flex items-center gap-2 flex-wrap">
          <input
            type="text"
            placeholder="Rechercher..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs bg-white focus:outline-none focus:border-slate-400 w-40"
          />
          {filteredTransactions.length > 0 && (
            <button
              onClick={exportCSV}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-lg transition-colors flex items-center gap-1"
            >
              Export CSV
            </button>
          )}
          <button
            onClick={() => onAddNew()}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-lg transition-colors flex items-center gap-1.5 shadow-sm cursor-pointer"
          >
            Nouvelle opération
          </button>
        </div>
      </div>

      {/* Tableau */}
      {filteredTransactions.length === 0 ? (
        <p className="text-center text-gray-500 py-6">
          {searchQuery ? 'Aucun résultat pour cette recherche.' : txFilter === 'all'
            ? 'Aucune transaction enregistrée pour ce mois.'
            : txFilter === 'recette'
              ? 'Aucune recette enregistrée pour ce mois.'
              : 'Aucune dépense enregistrée pour ce mois.'}
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-300">
                <th className="text-left py-3 px-4 font-bold">Date</th>
                <th className="text-left py-3 px-4 font-bold">Type</th>
                <th className="text-left py-3 px-4 font-bold">Catégorie</th>
                <th className="text-left py-3 px-4 font-bold">Libellé</th>
                <th className="text-right py-3 px-4 font-bold">Montant</th>
                <th className="text-center py-3 px-4 font-bold">Justificatif</th>
                <th className="text-right py-3 px-4 font-bold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredTransactions.map((tx) => (
                <tr key={tx.id} className="border-b border-gray-100 hover:bg-slate-50/50 transition-colors">
                  <td className="py-3 px-4 text-slate-500 font-mono text-xs">
                    {new Date(tx.date).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                  </td>
                  <td className="py-3 px-4 font-semibold text-xs">
                    <span className={`px-2 py-0.5 rounded ${tx.type === 'recette' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
                      {tx.type === 'recette' ? 'Recette' : 'Dépense'}
                    </span>
                  </td>
                  <td className="py-3 px-4 font-medium text-slate-600 text-xs">
                    {getCategoryLabel(tx.categorie)}
                  </td>
                  <td className="py-3 px-4 font-bold text-slate-800 text-xs">{tx.libelle}</td>
                  <td className={`text-right py-3 px-4 font-black ${tx.type === 'recette' ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {tx.type === 'recette' ? '+' : '-'}{tx.montant.toFixed(2)} €
                  </td>
                  <td className="text-center py-3 px-4">
                    {tx.justificatif ? (
                      <a href={tx.justificatif} target="_blank" rel="noopener noreferrer" className="px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all inline-flex items-center gap-1">
                        Consulter
                      </a>
                    ) : (
                      <span className="text-xs text-slate-400 italic">Aucun</span>
                    )}
                  </td>
                  <td className="text-right py-3 px-4">
                    <button
                      onClick={() => setDeleteConfirm({ isOpen: true, id: tx.id })}
                      className="text-red-500 hover:text-red-700 text-xs font-bold transition-colors"
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

      {/* Dialog de confirmation de suppression */}
      {deleteConfirm.isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[100] p-4">
          <div className="bg-white rounded-lg max-w-md w-full shadow-xl">
            <div className="p-6">
              <div className="flex items-start gap-4">
                <div className="text-3xl">ℹ️</div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-gray-900 mb-2">Confirmer la suppression</h3>
                  <p className="text-gray-600">Voulez-vous vraiment supprimer cette opération et son justificatif ?</p>
                </div>
              </div>
            </div>
            <div className="flex gap-3 p-4 bg-gray-50 rounded-b-lg">
              <button onClick={() => setDeleteConfirm({ isOpen: false, id: null })} className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100 font-medium">
                Annuler
              </button>
              <button onClick={handleDeleteConfirm} className="flex-1 px-4 py-2 text-white rounded-lg font-medium bg-red-600 hover:bg-red-700">
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
