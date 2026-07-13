'use client'

import { MonthlyOverviewItem, moisNoms } from './types'

interface FinanceHistoryTableProps {
  overview: MonthlyOverviewItem[]
  soldeDepartSaison: number
}

export default function FinanceHistoryTable({ overview, soldeDepartSaison }: FinanceHistoryTableProps) {
  // Calcul du solde cumulé mois par mois (chronologiquement)
  const chronological = [...overview].reverse()
  let running = soldeDepartSaison
  const withCumulative = chronological.map(item => {
    running += item.net
    return { ...item, cumulative: running }
  }).reverse()

  return (
    <div className="card p-6">
      <h3 className="text-lg font-bold text-gray-800 mb-4">Évolution Financière Historique</h3>
      {overview.length === 0 ? (
        <p className="text-center text-gray-500 py-6">Aucun historique disponible pour le moment.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-300">
                <th className="text-left py-3 px-4 font-bold">Période</th>
                <th className="text-right py-3 px-4 font-bold">Recettes Globales</th>
                <th className="text-right py-3 px-4 font-bold">Dépenses Globales</th>
                <th className="text-right py-3 px-4 font-bold">Solde Net</th>
                <th className="text-right py-3 px-4 font-bold">Solde Cumulé</th>
              </tr>
            </thead>
            <tbody>
              {withCumulative.map((item, index) => (
                <tr key={index} className="border-b border-gray-100 hover:bg-slate-50/50 transition-colors">
                  <td className="py-3 px-4 font-semibold text-slate-800">
                    {moisNoms[item.month - 1]} {item.year}
                  </td>
                  <td className="text-right py-3 px-4 text-green-600 font-bold">
                    +{item.income.toFixed(2)} €
                  </td>
                  <td className="text-right py-3 px-4 text-red-500 font-bold">
                    -{item.expense.toFixed(2)} €
                  </td>
                  <td className={`text-right py-3 px-4 font-black ${item.net >= 0 ? 'text-emerald-600 bg-emerald-50/10' : 'text-red-600 bg-red-50/10'}`}>
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
      )}
    </div>
  )
}
