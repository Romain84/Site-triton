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
      <div className="flex flex-col lg:flex-row justify-between items-stretch lg:items-center mb-6 gap-4 border-b border-slate-100 pb-4">
        {/* Filtres par type */}
        <div className="flex items-center gap-1.5 bg-slate-100/80 p-1 rounded-xl border border-slate-200/50">
          <button
            onClick={() => setTxFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              txFilter === 'all' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Tout ({transactions.length})
          </button>
          <button
            onClick={() => setTxFilter('recette')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              txFilter === 'recette' ? 'bg-emerald-50 text-emerald-800 shadow-2xs font-extrabold' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Recettes ({transactions.filter(t => t.type === 'recette').length})
          </button>
          <button
            onClick={() => setTxFilter('depense')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              txFilter === 'depense' ? 'bg-rose-50 text-rose-800 shadow-2xs font-extrabold' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Dépenses ({transactions.filter(t => t.type === 'depense').length})
          </button>
        </div>

        {/* Recherche + Actions */}
        <div className="flex items-center gap-2 flex-wrap">
          <input
            type="text"
            placeholder="Rechercher écriture..."
            aria-label="Rechercher une opération comptable"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="px-3.5 py-2 border border-slate-200 rounded-xl text-xs bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 w-48 transition-all"
          />
          {filteredTransactions.length > 0 && (
            <button
              onClick={exportCSV}
              className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <span>📥</span>
              <span>Export CSV</span>
            </button>
          )}
          <button
            onClick={() => onAddNew()}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
          >
            <span>➕</span>
            <span>Nouvelle opération</span>
          </button>
        </div>
      </div>

      {/* Tableau */}
      {filteredTransactions.length === 0 ? (
        <div className="flex flex-col items-center justify-center text-center py-12 px-4 bg-slate-50/50 border border-dashed border-slate-200 rounded-2xl">
          <span className="text-3xl mb-2">📒</span>
          <p className="font-bold text-slate-800 text-sm">
            {searchQuery ? 'Aucun résultat trouvé pour cette recherche' : 'Aucune écriture comptable pour ce mois'}
          </p>
          <p className="text-xs text-slate-500 mt-1 max-w-sm">
            {searchQuery ? 'Essayez un autre mot-clé ou réinitialisez le filtre.' : 'Utilisez les boutons Recette ou Dépense pour enregistrer une nouvelle opération.'}
          </p>
        </div>
      ) : (
        <div className="rounded-2xl border border-slate-200/80 overflow-hidden shadow-2xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px]">
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Catégorie</th>
                  <th className="py-3 px-4">Libellé</th>
                  <th className="py-3 px-4 text-right">Montant</th>
                  <th className="py-3 px-4 text-center">Justificatif</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredTransactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4 text-slate-600 font-mono font-medium text-xs">
                      {new Date(tx.date).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                    </td>
                    <td className="py-3.5 px-4 font-bold text-xs">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] ${
                        tx.type === 'recette'
                          ? 'bg-emerald-50 text-emerald-800 border border-emerald-200/60'
                          : 'bg-rose-50 text-rose-800 border border-rose-200/60'
                      }`}>
                        {tx.type === 'recette' ? 'Recette' : 'Dépense'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-xs font-bold text-slate-800">
                      {getCategoryLabel(tx.categorie)}
                    </td>
                    <td className="py-3.5 px-4 text-xs font-medium text-slate-900">
                      {tx.libelle}
                    </td>
                    <td className={`py-3.5 px-4 text-right font-black text-sm ${
                      tx.type === 'recette' ? 'text-emerald-700' : 'text-rose-700'
                    }`}>
                      {tx.type === 'recette' ? '+' : '-'}{tx.montant.toFixed(2)} €
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      {tx.justificatif ? (
                        <a
                          href={tx.justificatif}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-2 py-0.5 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-bold inline-block cursor-pointer transition-colors"
                        >
                          📎 Voir
                        </a>
                      ) : (
                        <span className="text-slate-300 text-xs">-</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => setDeleteConfirm({ isOpen: true, id: tx.id })}
                        className="px-2.5 py-1 text-xs font-bold text-red-700 bg-red-50 hover:bg-red-100 rounded-lg transition-colors cursor-pointer"
                        aria-label={`Supprimer l'écriture ${tx.libelle}`}
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

      {/* Modal Confirmation Suppression */}
      {deleteConfirm.isOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 animate-fade-in" role="dialog" aria-modal="true" aria-labelledby="modal-delete-title">
          <div className="bg-white rounded-3xl border border-slate-200/80 p-6 max-w-sm w-full shadow-lg m-4 space-y-4">
            <h3 id="modal-delete-title" className="text-base font-extrabold text-slate-950">
              Supprimer l&apos;opération ?
            </h3>
            <p className="text-xs text-slate-500 font-light leading-relaxed">
              Cette action est irréversible. L&apos;opération sera définitivement retirée des calculs de trésorerie.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setDeleteConfirm({ isOpen: false, id: null })}
                className="px-4 py-2 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
              >
                Annuler
              </button>
              <button
                onClick={handleDeleteConfirm}
                className="px-4 py-2 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-xl transition-colors cursor-pointer"
              >
                Confirmer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
