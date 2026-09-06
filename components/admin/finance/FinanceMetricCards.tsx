'use client'

interface FinanceMetricCardsProps {
  soldeDepartSaison: number
  totalIncome: number
  totalExpense: number
  tresorerieGlobale: number
  incomeTrend?: number | null
  expenseTrend?: number | null
  tresorerieTrend?: number | null
  saisonLabel?: string
}

export default function FinanceMetricCards({
  soldeDepartSaison,
  totalIncome,
  totalExpense,
  tresorerieGlobale,
  incomeTrend,
  expenseTrend,
  tresorerieTrend,
  saisonLabel,
}: FinanceMetricCardsProps) {
  const fmt = (n: number) => n.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  const seasonNet = totalIncome - totalExpense

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
              {tresorerieTrend !== null && tresorerieTrend !== undefined && (
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
          Solde bancaire théorique disponible (Solde départ : {fmt(soldeDepartSaison)} €)
        </p>
      </div>

      {/* Recettes de la Saison */}
      <div className="bg-emerald-50/50 border border-emerald-200/70 p-5 rounded-2xl shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-emerald-900 uppercase tracking-wider">
              Recettes Saison
            </span>
            <div className="flex items-center gap-1.5">
              {incomeTrend !== null && incomeTrend !== undefined && (
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
          Cotisations, boutique &amp; subventions ({saisonLabel || 'Saison en cours'})
        </p>
      </div>

      {/* Dépenses de la Saison */}
      <div className="bg-rose-50/40 border border-rose-200/70 p-5 rounded-2xl shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-rose-900 uppercase tracking-wider">
              Dépenses Saison
            </span>
            <div className="flex items-center gap-1.5">
              {expenseTrend !== null && expenseTrend !== undefined && (
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
          Indemnités entraîneurs, achats &amp; frais ({saisonLabel || 'Saison en cours'})
        </p>
      </div>

      {/* Résultat Net Saison */}
      <div className={`p-5 rounded-2xl shadow-2xs hover:shadow-xs transition-all border flex flex-col justify-between ${
        seasonNet >= 0
          ? 'bg-emerald-50/30 border-emerald-200/60'
          : 'bg-rose-50/30 border-rose-200/60'
      }`}>
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className={`text-[11px] font-bold uppercase tracking-wider ${seasonNet >= 0 ? 'text-emerald-900' : 'text-rose-900'}`}>
              Résultat Net Saison
            </span>
            <span className={`w-8 h-8 rounded-xl flex items-center justify-center text-sm ${
              seasonNet >= 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
            }`}>
              ⚖️
            </span>
          </div>
          <div className={`text-2xl font-black tracking-tight ${
            seasonNet >= 0 ? 'text-emerald-950' : 'text-rose-950'
          }`}>
            {seasonNet >= 0 ? '+' : ''}{fmt(seasonNet)} €
          </div>
        </div>
        <p className={`text-xs mt-3 font-medium ${seasonNet >= 0 ? 'text-emerald-800/80' : 'text-rose-800/80'}`}>
          {seasonNet >= 0 ? 'Bilan de saison excédentaire' : 'Bilan de saison déficitaire'}
        </p>
      </div>
    </div>
  )
}
