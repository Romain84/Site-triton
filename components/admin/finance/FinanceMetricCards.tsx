'use client'

interface FinanceMetricCardsProps {
  soldeDepartSaison: number
  totalIncome: number
  totalExpense: number
  tresorerieGlobale: number
  incomeTrend: number | null
  expenseTrend: number | null
  tresorerieTrend: number | null
}

export default function FinanceMetricCards({
  soldeDepartSaison, totalIncome, totalExpense, tresorerieGlobale,
  incomeTrend, expenseTrend, tresorerieTrend,
}: FinanceMetricCardsProps) {
  const fmt = (n: number) => n.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Solde Initial */}
      <div className="bg-slate-50/70 border border-slate-200/80 p-5 rounded-2xl shadow-2xs hover:shadow-xs transition-all">
        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
          Solde Initial (Saison)
        </div>
        <div className="text-2xl font-black text-slate-900 tracking-tight">
          {fmt(soldeDepartSaison)} €
        </div>
        <p className="text-[11px] text-slate-500 mt-2 font-medium">
          Montant en caisse au démarrage
        </p>
      </div>

      {/* Recettes */}
      <div className="bg-emerald-50/40 border border-emerald-100 p-5 rounded-2xl shadow-2xs hover:shadow-xs transition-all">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider">Recettes du Mois</span>
          {incomeTrend !== null && (
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
              incomeTrend >= 0 ? 'bg-emerald-100/80 text-emerald-800' : 'bg-rose-100/80 text-rose-800'
            }`}>
              {incomeTrend >= 0 ? '+' : ''}{incomeTrend.toFixed(1)}%
            </span>
          )}
        </div>
        <div className="text-2xl font-black text-emerald-950 tracking-tight">
          +{fmt(totalIncome)} €
        </div>
        <p className="text-[11px] text-emerald-700/80 mt-2 font-medium">
          Cotisations, boutique &amp; subventions
        </p>
      </div>

      {/* Dépenses */}
      <div className="bg-rose-50/30 border border-rose-100 p-5 rounded-2xl shadow-2xs hover:shadow-xs transition-all">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[10px] font-bold text-rose-800 uppercase tracking-wider">Dépenses du Mois</span>
          {expenseTrend !== null && (
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
              expenseTrend <= 0 ? 'bg-emerald-100/80 text-emerald-800' : 'bg-rose-100/80 text-rose-800'
            }`}>
              {expenseTrend > 0 ? '+' : ''}{expenseTrend.toFixed(1)}%
            </span>
          )}
        </div>
        <div className="text-2xl font-black text-rose-950 tracking-tight">
          -{fmt(totalExpense)} €
        </div>
        <p className="text-[11px] text-rose-700/80 mt-2 font-medium">
          Salaires entraîneur &amp; achats
        </p>
      </div>

      {/* Solde Trésorerie */}
      <div className={`p-5 rounded-2xl shadow-2xs hover:shadow-xs transition-all border ${
        tresorerieGlobale >= 0 
          ? 'bg-indigo-50/50 border-indigo-100' 
          : 'bg-rose-50/50 border-rose-200'
      }`}>
        <div className="flex items-center justify-between mb-1.5">
          <span className={`text-[10px] font-bold uppercase tracking-wider ${tresorerieGlobale >= 0 ? 'text-indigo-800' : 'text-rose-800'}`}>
            Trésorerie Globale
          </span>
          {tresorerieTrend !== null && (
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
              tresorerieTrend >= 0 ? 'bg-indigo-100/80 text-indigo-800' : 'bg-rose-100/80 text-rose-800'
            }`}>
              {tresorerieTrend >= 0 ? '+' : ''}{tresorerieTrend.toFixed(1)}%
            </span>
          )}
        </div>
        <div className={`text-2xl font-black tracking-tight ${tresorerieGlobale >= 0 ? 'text-indigo-950' : 'text-rose-950'}`}>
          {fmt(tresorerieGlobale)} €
        </div>
        <p className={`text-[11px] mt-2 font-medium ${tresorerieGlobale >= 0 ? 'text-indigo-700/80' : 'text-rose-700/80'}`}>
          Solde bancaire théorique disponible
        </p>
      </div>
    </div>
  )
}
