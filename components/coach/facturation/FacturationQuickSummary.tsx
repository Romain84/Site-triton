'use client'

interface FacturationQuickSummaryProps {
  moisLabel: string
  annee: number
  totalHeures: number
  totalMontant: number
  alertes: number
}

export default function FacturationQuickSummary({
  moisLabel,
  annee,
  totalHeures,
  totalMontant,
  alertes,
}: FacturationQuickSummaryProps) {
  return (
    <div className="sticky top-4 z-10 mb-6">
      <div className="rounded-xl border border-indigo-200 bg-indigo-50/95 backdrop-blur px-4 py-3 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-indigo-700">Résumé rapide</p>
            <p className="text-sm text-indigo-900">
              {moisLabel} {annee}
            </p>
          </div>
          <div className="flex flex-wrap gap-2 text-sm">
            <span className="rounded-full bg-white px-3 py-1 text-gray-800 border border-gray-200">
              Heures: <strong>{totalHeures.toFixed(2)}h</strong>
            </span>
            <span className="rounded-full bg-white px-3 py-1 text-gray-800 border border-gray-200">
              Montant: <strong>{totalMontant.toFixed(2)}€</strong>
            </span>
            <span className={`rounded-full px-3 py-1 border ${alertes > 0 ? 'bg-red-100 text-red-800 border-red-200' : 'bg-emerald-100 text-emerald-800 border-emerald-200'}`}>
              Alertes: <strong>{alertes}</strong>
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
