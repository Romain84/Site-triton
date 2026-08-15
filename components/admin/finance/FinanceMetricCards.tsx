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
  soldeDepartSaison,
  totalIncome,
  totalExpense,
  tresorerieGlobale,
  incomeTrend,
  expenseTrend,
  tresorerieTrend,
}: FinanceMetricCardsProps) {
  const fmt = (n: number) => n.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Solde Initial */}
      <div className="bg-white border border-slate-200/90 p-5 rounded-2xl shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Solde Initial Saison
            </span>
            <span className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700 text-sm">
              🏦
            </span>
          </div>
          <div className="text-2xl font-black text-slate-900 tracking-tight">
            {fmt(soldeDepartSaison)} €
          </div>
        </div>
        <p className="text-xs text-slate-500 mt-3 font-medium">
          Caisse au démarrage de la saison
        </p>
      </div>

      {/* Recettes du mois */}
      <div className="bg-emerald-50/50 border border-emerald-200/70 p-5 rounded-2xl shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-emerald-900 uppercase tracking-wider">
              Recettes du Mois
            </span>
            <div className="flex items-center gap-1.5">
              {incomeTrend !== null && (
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                  incomeTrend >= 0 ? 'bg-emerald-200/70 text-emerald-900' : 'bg-rose-200/70 text-rose-900'
                }`}>
                  {incomeTrend >= 0 ? '+' : ''}{incomeTrend.toFixed(1)}%
                </span>
              )}
              <span className="w-8 h-8 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-800 text-sm">
                📈
              </span>
            </div>
          </div>
          <div className="text-2xl font-black text-emerald-950 tracking-tight">
            +{fmt(totalIncome)} €
          </div>
        </div>
        <p className="text-xs text-emerald-800/80 mt-3 font-medium">
          Cotisations, boutique &amp; subventions
        </p>
      </div>

      {/* Dépenses du mois */}
      <div className="bg-rose-50/40 border border-rose-200/70 p-5 rounded-2xl shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-rose-900 uppercase tracking-wider">
              Dépenses du Mois
            </span>
            <div className="flex items-center gap-1.5">
              {expenseTrend !== null && (
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                  expenseTrend <= 0 ? 'bg-emerald-200/70 text-emerald-900' : 'bg-rose-200/70 text-rose-900'
                }`}>
                  {expenseTrend > 0 ? '+' : ''}{expenseTrend.toFixed(1)}%
                </span>
              )}
              <span className="w-8 h-8 rounded-xl bg-rose-100 flex items-center justify-center text-rose-800 text-sm">
                📉
              </span>
            </div>
          </div>
          <div className="text-2xl font-black text-rose-950 tracking-tight">
            -{fmt(totalExpense)} €
          </div>
        </div>
        <p className="text-xs text-rose-800/80 mt-3 font-medium">
          Indemnités entraîneurs &amp; achats
        </p>
      </div>

      {/* Trésorerie Globale */}
      <div className={`p-5 rounded-2xl shadow-2xs hover:shadow-xs transition-all border flex flex-col justify-between ${
        tresorerieGlobale >= 0 
          ? 'bg-slate-900 text-white border-slate-800' 
          : 'bg-rose-950 text-white border-rose-900'
      }`}>
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-300">
              Trésorerie Globale
            </span>
            <div className="flex items-center gap-1.5">
              {tresorerieTrend !== null && (
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                  tresorerieTrend >= 0 ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'
                }`}>
                  {tresorerieTrend >= 0 ? '+' : ''}{tresorerieTrend.toFixed(1)}%
                </span>
              )}
              <span className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center text-white text-sm">
                💳
              </span>
            </div>
          </div>
          <div className="text-2xl font-black tracking-tight text-white">
            {fmt(tresorerieGlobale)} €
          </div>
        </div>
        <p className="text-xs mt-3 font-medium text-slate-400">
          Solde bancaire théorique disponible
        </p>
      </div>
    </div>
  )
}
