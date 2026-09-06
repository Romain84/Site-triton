'use client'

import { useState } from 'react'
import { MonthlyOverviewItem, moisNoms } from './types'

interface FinanceHistoryTableProps {
  overview: MonthlyOverviewItem[]
  soldeDepartSaison: number
}

export default function FinanceHistoryTable({ overview, soldeDepartSaison }: FinanceHistoryTableProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  // Calcul du solde cumulé mois par mois (chronologiquement)
  const chronological = [...overview].reverse()
  let running = soldeDepartSaison
  const withCumulative = chronological.map(item => {
    running += item.net
    return { ...item, cumulative: running }
  }).reverse()

  return (
    <div className="card p-5 bg-white border border-slate-200/90 rounded-2xl shadow-2xs transition-all">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between text-left group cursor-pointer"
        aria-expanded={isExpanded}
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700 font-bold group-hover:bg-slate-200 transition-colors">
            🗓️
          </div>
          <div>
            <h3 className="text-sm font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
              Historique Mensuel &amp; Solde Cumulé
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200/60">
                {overview.length} mois enregistrés
              </span>
            </h3>
            <p className="text-xs text-slate-500 font-medium">
              Synthèse mois par mois des entrées, sorties et évolution de trésorerie
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-500 group-hover:text-slate-800 transition-colors">
            {isExpanded ? 'Masquer' : 'Afficher'}
          </span>
          <span className={`text-slate-400 transform transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}>
            ▼
          </span>
        </div>
      </button>

      {isExpanded && (
        <div className="mt-5 pt-4 border-t border-slate-100 animate-fade-in">
          {overview.length === 0 ? (
            <p className="text-center text-slate-400 py-6 text-xs">Aucun historique disponible pour le moment.</p>
          ) : (
            <div className="rounded-xl border border-slate-200/80 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px]">
                      <th className="py-3 px-4">Période</th>
                      <th className="text-right py-3 px-4">Recettes Globales</th>
                      <th className="text-right py-3 px-4">Dépenses Globales</th>
                      <th className="text-right py-3 px-4">Solde Net</th>
                      <th className="text-right py-3 px-4">Solde Cumulé</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {withCumulative.map((item, index) => (
                      <tr key={index} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4 font-semibold text-slate-800">
                          {moisNoms[item.month - 1]} {item.year}
                        </td>
                        <td className="text-right py-3 px-4 text-emerald-600 font-bold">
                          +{item.income.toFixed(2)} €
                        </td>
                        <td className="text-right py-3 px-4 text-rose-600 font-bold">
                          -{item.expense.toFixed(2)} €
                        </td>
                        <td className={`text-right py-3 px-4 font-black ${item.net >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                          {item.net >= 0 ? '+' : ''}{item.net.toFixed(2)} €
                        </td>
                        <td className={`text-right py-3 px-4 font-black ${item.cumulative >= 0 ? 'text-indigo-600' : 'text-rose-600'}`}>
                          {item.cumulative.toFixed(2)} €
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
    </div>
  )
}
