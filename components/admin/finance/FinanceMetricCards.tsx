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
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
      {/* Solde Initial (Saison) */}
      <div className="bg-slate-50/60 border border-slate-200/80 p-6 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
        <div className="flex items-center justify-between text-slate-800 text-xs font-extrabold uppercase tracking-widest mb-3">
          <span>Argent en début d&apos;année (Solde)</span>
        </div>
        <p className="text-3xl font-black text-slate-900">
          {soldeDepartSaison.toFixed(2)} €
        </p>
        <p className="text-xs text-slate-500 mt-3 font-semibold">
          Montant en caisse en début de saison
        </p>
      </div>

      {/* Recettes Globales */}
      <div className="bg-emerald-50/40 border border-emerald-100/80 p-6 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
        <div className="flex items-center justify-between text-emerald-800 text-xs font-extrabold uppercase tracking-widest mb-3">
          <span>Toutes les Recettes (Boutique, cotisations...)</span>
          <div className="flex items-center gap-1.5">
            {incomeTrend !== null && (
              <span className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-black ${
                incomeTrend >= 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
              }`}>
                {incomeTrend >= 0 ? '↗ +' : '↘ '}{incomeTrend.toFixed(1)}%
              </span>
            )}
          </div>
        </div>
        <p className="text-3xl font-black text-emerald-950">
          {totalIncome.toFixed(2)} €
        </p>
        <p className="text-xs text-emerald-600 mt-3 font-semibold">
          Boutique, cotisations et subventions reçues
        </p>
      </div>

      {/* Dépenses Globales */}
      <div className="bg-sky-50/40 border border-sky-100/80 p-6 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
        <div className="flex items-center justify-between text-sky-800 text-xs font-extrabold uppercase tracking-widest mb-3">
          <span>Toutes les Dépenses (Salaires, matériel...)</span>
          <div className="flex items-center gap-1.5">
            {expenseTrend !== null && (
              <span className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-black ${
                expenseTrend <= 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
              }`}>
                {expenseTrend > 0 ? '↗ +' : '↘ '}{expenseTrend.toFixed(1)}%
              </span>
            )}
          </div>
        </div>
        <p className="text-3xl font-black text-sky-950">
          {totalExpense.toFixed(2)} €
        </p>
        <p className="text-xs text-sky-600 mt-3 font-semibold">
          Entraîneurs payés, matériel acheté et frais
        </p>
      </div>

      {/* Trésorerie Actuelle */}
      <div className={`p-6 rounded-2xl shadow-sm hover:shadow-md transition-shadow border ${
        tresorerieGlobale >= 0 
          ? 'bg-indigo-50/60 border-indigo-200/70' 
          : 'bg-rose-50/40 border-rose-100'
      }`}>
        <div className="flex items-center justify-between text-xs font-extrabold uppercase tracking-widest mb-3">
          <span className={tresorerieGlobale >= 0 ? 'text-indigo-800' : 'text-rose-800'}>Solde actuel de la banque</span>
          <div className="flex items-center gap-1.5">
            {tresorerieTrend !== null && (
              <span className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-black ${
                tresorerieTrend >= 0 ? 'bg-indigo-100 text-indigo-800' : 'bg-rose-100 text-rose-800'
              }`}>
                {tresorerieTrend >= 0 ? '↗ +' : '↘ '}{tresorerieTrend.toFixed(1)}%
              </span>
            )}
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
          </div>
        </div>
        <p className={`text-3xl font-black ${tresorerieGlobale >= 0 ? 'text-indigo-700' : 'text-rose-700'}`}>
          {tresorerieGlobale.toFixed(2)} €
        </p>
        <p className={`text-xs mt-3 font-semibold ${tresorerieGlobale >= 0 ? 'text-indigo-600' : 'text-rose-600'}`}>
          Argent disponible actuellement pour le club
        </p>
      </div>
    </div>
  )
}
