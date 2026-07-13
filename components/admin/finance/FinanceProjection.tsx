'use client'

import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import { moisNoms } from './types'

interface FinanceProjectionProps {
  tresorerieGlobale: number
  anneesList: number[]
  isActive: boolean
}

export default function FinanceProjection({ tresorerieGlobale, anneesList, isActive }: FinanceProjectionProps) {
  const currentDate = new Date()
  const nextMonthDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1)

  const [projMois, setProjMois] = useState<number>(nextMonthDate.getMonth() + 1)
  const [projAnnee, setProjAnnee] = useState<number>(nextMonthDate.getFullYear())
  const [projHistoryMonths, setProjHistoryMonths] = useState<number>(3)
  const [projectionData, setProjectionData] = useState<any | null>(null)
  const [projectionLoading, setProjectionLoading] = useState<boolean>(false)
  const [simDepensesPercent, setSimDepensesPercent] = useState<number>(0)
  const [simRecettesExtra, setSimRecettesExtra] = useState<number>(0)

  const fetchProjection = async () => {
    setProjectionLoading(true)
    try {
      const response = await fetch(`/api/admin/finances/projection?mois=${projMois}&annee=${projAnnee}&historiqueMois=${projHistoryMonths}`)
      const resData = await response.json()
      if (response.ok) {
        setProjectionData(resData.projection)
      } else {
        toast.error(resData.error || 'Erreur lors du chargement de la projection')
      }
    } catch {
      toast.error('Erreur réseau lors de la récupération de la projection')
    } finally {
      setProjectionLoading(false)
    }
  }

  useEffect(() => {
    if (isActive) {
      fetchProjection()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive, projMois, projAnnee, projHistoryMonths])

  return (
    <div className="space-y-8">
      {/* Panneau de contrôle */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 bg-slate-50 border border-slate-200/80 p-6 rounded-3xl">
        <div>
          <h4 className="text-sm font-extrabold uppercase tracking-wider text-slate-950 flex items-center gap-1.5">
            Prévision du Budget Futur
          </h4>
          <p className="text-xs text-slate-400 mt-1 font-normal">Choisissez un mois pour estimer automatiquement son budget de départ et de fin.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-600">Mois à simuler :</span>
            <select value={projMois} onChange={(e) => setProjMois(Number(e.target.value))} className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs bg-white focus:outline-none">
              {moisNoms.map((nom, index) => (
                <option key={index} value={index + 1}>{nom}</option>
              ))}
            </select>
            <select value={projAnnee} onChange={(e) => setProjAnnee(Number(e.target.value))} className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs bg-white focus:outline-none">
              {anneesList.map((annee) => (
                <option key={annee} value={annee}>{annee}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-600">Historique de référence :</span>
            <select value={projHistoryMonths} onChange={(e) => setProjHistoryMonths(Number(e.target.value))} className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs bg-white focus:outline-none">
              <option value={3}>3 derniers mois (recommandé)</option>
              <option value={6}>6 derniers mois</option>
              <option value={12}>1 an d&apos;historique</option>
            </select>
          </div>
        </div>
      </div>

      {/* Contenu principal */}
      {(() => {
        if (projectionLoading) {
          return (
            <div className="flex flex-col items-center justify-center py-12 space-y-3">
              <div className="w-8 h-8 border-4 border-slate-900 border-t-transparent rounded-full animate-spin" />
              <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Calcul de la simulation...</p>
            </div>
          )
        }

        if (!projectionData) {
          return <p className="text-center text-gray-500 py-6">Aucune donnée disponible pour cette simulation.</p>
        }

        const simulatedGeneralCost = projectionData.totals.generalCost * (1 + simDepensesPercent / 100)
        const simulatedTotalExpenses = projectionData.totals.coachesCost + simulatedGeneralCost
        const simulatedEndingBalance = tresorerieGlobale - simulatedTotalExpenses + simRecettesExtra

        const startVal = tresorerieGlobale
        const postExpensesVal = startVal - simulatedTotalExpenses
        const finalVal = postExpensesVal + simRecettesExtra

        const chartValues = [startVal, postExpensesVal, finalVal]
        const minVal = Math.min(0, ...chartValues) * 0.95
        const maxVal = Math.max(1000, ...chartValues) * 1.05
        const range = Math.max(1, maxVal - minVal)

        const getChartY = (v: number) => {
          return 180 - ((v - minVal) / range) * 130
        }

        const p1 = { x: 80, y: getChartY(startVal) }
        const p2 = { x: 260, y: getChartY(postExpensesVal) }
        const p3 = { x: 440, y: getChartY(finalVal) }

        return (
          <div className="space-y-8">
            {/* Cockpit de Simulation Budgétaire & SVG Chart */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
              {/* Sliders Panel */}
              <div className="lg:col-span-1 bg-white border border-slate-200 p-5 rounded-2xl shadow-sm flex flex-col justify-between space-y-4">
                <div>
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-1.5 mb-1">
                    Ajustements du Budget
                  </h4>
                  <p className="text-[9px] text-slate-400 font-semibold uppercase">Simulez des variations de trésorerie</p>
                </div>

                <div className="space-y-4 flex-grow">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-600 block">📈 Évolution des frais de fonctionnement</label>
                    <select value={simDepensesPercent} onChange={(e) => setSimDepensesPercent(Number(e.target.value))} className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 bg-slate-50 focus:bg-white focus:outline-none focus:border-slate-800 cursor-pointer shadow-xs">
                      <option value={0}>Aucune variation (frais normaux)</option>
                      <option value={-10}>Légère baisse (-10%)</option>
                      <option value={-25}>Fortes économies (-25%)</option>
                      <option value={-50}>Frais divisés par 2 (-50%)</option>
                      <option value={10}>Inflation / Légère hausse (+10%)</option>
                      <option value={25}>Forte hausse (+25%)</option>
                      <option value={50}>Hausse majeure (+50%)</option>
                      <option value={100}>Doublement des frais (+100%)</option>
                    </select>
                    <p className="text-[8px] text-slate-400 font-medium">Estimez l&apos;impact d&apos;une hausse ou d&apos;une baisse des charges.</p>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-600 block">💵 Recettes supplémentaires attendues</label>
                    <div className="relative rounded-lg shadow-sm">
                      <input type="number" min="0" max="100000" step="100" value={simRecettesExtra} onChange={(e) => setSimRecettesExtra(Number(e.target.value) || 0)} className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 bg-slate-50 focus:bg-white focus:outline-none focus:border-slate-800 font-mono" placeholder="ex: 1500" />
                      <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                        <span className="text-slate-400 text-xs font-bold font-mono">€</span>
                      </div>
                    </div>
                    <p className="text-[8px] text-slate-400 font-medium">Saisissez l&apos;aide, partenariat ou subvention attendue pour ce mois.</p>
                  </div>
                </div>

                <button onClick={() => { setSimDepensesPercent(0); setSimRecettesExtra(0) }} className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all border border-slate-200">
                  Remettre à zéro
                </button>
              </div>

              {/* Chart Panel (SVG) */}
              <div className="lg:col-span-2 bg-slate-900 text-white rounded-2xl p-5 border border-slate-800 shadow-xl flex flex-col justify-between space-y-4">
                <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                  <div>
                    <h4 className="text-xs font-extrabold uppercase tracking-widest text-indigo-400">
                      Estimation de l&apos;argent disponible
                    </h4>
                    <p className="text-[9px] text-slate-500 font-semibold uppercase mt-0.5">Évolution estimée en fin de mois</p>
                  </div>
                  <div className="text-right">
                    <span className="text-[9px] text-slate-400 font-bold block uppercase">Argent estimé restant</span>
                    <span className={`text-sm font-black ${finalVal >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {finalVal.toFixed(2)} €
                    </span>
                  </div>
                </div>

                <svg viewBox="0 0 520 200" className="w-full h-auto select-none">
                  <line x1="50" y1="180" x2="480" y2="180" stroke="#334155" strokeWidth="1" />
                  {minVal < 0 && (
                    <line x1="50" y1={getChartY(0)} x2="480" y2={getChartY(0)} stroke="#ef4444" strokeWidth="1" strokeDasharray="4 4" opacity="0.4" />
                  )}
                  <defs>
                    <linearGradient id="projGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#6366f1" stopOpacity="0.25" />
                      <stop offset="100%" stopColor="#6366f1" stopOpacity="0" />
                    </linearGradient>
                    <filter id="shadow-predict" x="-10%" y="-10%" width="120%" height="120%">
                      <feDropShadow dx="0" dy="4" stdDeviation="4" floodColor="#6366f1" floodOpacity="0.25" />
                    </filter>
                  </defs>
                  <path d={`M ${p1.x} 180 L ${p1.x} ${p1.y} L ${p2.x} ${p2.y} L ${p3.x} ${p3.y} L ${p3.x} 180 Z`} fill="url(#projGradient)" />
                  <path d={`M ${p1.x} ${p1.y} L ${p2.x} ${p2.y} L ${p3.x} ${p3.y}`} fill="none" stroke="#6366f1" strokeWidth="3.5" filter="url(#shadow-predict)" strokeLinecap="round" strokeLinejoin="round" />
                  <circle cx={p1.x} cy={p1.y} r="5" fill="#ffffff" stroke="#6366f1" strokeWidth="2.5" />
                  <circle cx={p2.x} cy={p2.y} r="5" fill="#ffffff" stroke="#f43f5e" strokeWidth="2.5" />
                  <circle cx={p3.x} cy={p3.y} r="5" fill="#ffffff" stroke="#10b981" strokeWidth="2.5" />
                  <text x={p1.x} y={p1.y - 10} textAnchor="middle" fill="#94a3b8" className="text-[9px] font-bold font-mono">{startVal.toFixed(0)} €</text>
                  <text x={p2.x} y={p2.y + 14} textAnchor="middle" fill="#f43f5e" className="text-[9px] font-bold font-mono">{postExpensesVal.toFixed(0)} €</text>
                  <text x={p3.x} y={p3.y - 10} textAnchor="middle" fill="#10b981" className="text-[9px] font-bold font-mono">{finalVal.toFixed(0)} €</text>
                  <text x={p1.x} y="195" textAnchor="middle" fill="#64748b" className="text-[9px] font-bold uppercase">1. Solde Actuel</text>
                  <text x={p2.x} y="195" textAnchor="middle" fill="#64748b" className="text-[9px] font-bold uppercase">2. Après Charges</text>
                  <text x={p3.x} y="195" textAnchor="middle" fill="#64748b" className="text-[9px] font-bold uppercase">3. Fin de mois</text>
                </svg>
              </div>
            </div>

            {/* Cartes métriques de projection */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="card p-6 border-l-4 border-sky-500 bg-white shadow-sm">
                <div className="flex items-center justify-between text-slate-500 text-[10px] font-extrabold uppercase tracking-wider mb-2">
                  <span>Rémunération des Entraîneurs</span>
                </div>
                <p className="text-2xl font-black text-slate-900">{projectionData.totals.coachesCost.toFixed(2)} €</p>
                <p className="text-[10px] text-slate-500 mt-2 font-semibold">Indemnités estimées pour les cours du mois</p>
              </div>

              <div className="card p-6 border-l-4 border-amber-500 bg-white shadow-sm">
                <div className="flex items-center justify-between text-slate-500 text-[10px] font-extrabold uppercase tracking-wider mb-2">
                  <span>Frais mensuels &amp; courants</span>
                  <div className="flex items-center gap-1">
                    {simDepensesPercent !== 0 && (
                      <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold text-white ${simDepensesPercent > 0 ? 'bg-rose-500' : 'bg-green-500'}`}>
                        {simDepensesPercent > 0 ? '+' : ''}{simDepensesPercent}%
                      </span>
                    )}
                  </div>
                </div>
                <p className="text-2xl font-black text-slate-900">{simulatedGeneralCost.toFixed(2)} €</p>
                <p className="text-[10px] text-slate-500 mt-2 font-semibold">Frais mensuels et courants (moyenne historique ou minimum garanti)</p>
              </div>

              <div className="card p-6 border-l-4 border-slate-950 bg-slate-950 text-white shadow-sm">
                <div className="flex items-center justify-between text-slate-400 text-[10px] font-extrabold uppercase tracking-wider mb-2">
                  <span>Argent estimé restant</span>
                </div>
                <p className="text-2xl font-black text-white">{simulatedEndingBalance.toFixed(2)} €</p>
                <p className="text-[10px] text-slate-400 mt-2 font-semibold">Estimation globale pour la fin du mois</p>
              </div>
            </div>

            {/* Calendrier & Jours fériés */}
            <div className="card p-5 bg-indigo-50/40 border border-indigo-100 rounded-3xl flex items-start gap-4">
              <div className="space-y-1 text-xs">
                <h5 className="font-extrabold text-indigo-955 uppercase tracking-wide">Calendrier &amp; Jours Fériés</h5>
                {projectionData.calendarInfo.feries.length > 0 ? (
                  <div className="pt-2 flex flex-wrap items-center gap-2">
                    <span className="font-bold text-indigo-955 uppercase text-[9px] tracking-wide">Jours fériés détectés ({projectionData.calendarInfo.feries.length}) :</span>
                    {projectionData.calendarInfo.feries.map((f: any, idx: number) => (
                      <span key={idx} className="px-2.5 py-1 bg-white border border-indigo-200 text-indigo-900 rounded-full font-bold text-[9px] shadow-sm flex items-center gap-1">
                        {f.nom} ({f.date})
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-indigo-800 italic text-[10px] pt-1">Aucun jour férié national ne tombe ce mois-ci sur un jour ouvré.</p>
                )}
              </div>
            </div>

            {/* Détails coaches & dépenses */}
            <details className="cursor-pointer group bg-slate-50 border border-slate-200 rounded-3xl p-5 transition-all">
              <summary className="font-extrabold text-xs text-slate-700 select-none uppercase tracking-wider flex justify-between items-center list-none outline-none">
                <span className="flex items-center gap-2">
                  Voir le détail des calculs (facultatif)
                </span>
                <span className="transition-transform duration-200 group-open:rotate-180 text-slate-400">▼</span>
              </summary>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-5 cursor-default" onClick={(e) => e.stopPropagation()}>
                {/* Ventilation Salaires Coaches */}
                <div className="card p-6 border border-slate-200/80 bg-white shadow-sm space-y-4">
                  <div>
                    <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-900">Détail des Indemnités par Entraîneur</h4>
                    <p className="text-[10px] text-slate-400 font-semibold uppercase mt-0.5">Calculé sur les cours planifiés de ce mois</p>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-slate-200 font-extrabold text-slate-500 text-[10px] uppercase tracking-wider">
                          <th className="text-left py-2 px-3">Entraîneur</th>
                          <th className="text-center py-2 px-2">Créneaux</th>
                          <th className="text-center py-2 px-2">Cours</th>
                          <th className="text-right py-2 px-2">Heures</th>
                          <th className="text-right py-2 px-3">Total Estimé</th>
                        </tr>
                      </thead>
                      <tbody>
                        {projectionData.coachesProjection.map((coach: any) => (
                          <tr key={coach.coachId} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                            <td className="py-2.5 px-3 font-semibold text-slate-800">{coach.prenom} {coach.nom}</td>
                            <td className="text-center py-2.5 px-2 font-bold text-slate-600">{coach.plannings.length}</td>
                            <td className="text-center py-2.5 px-2 font-bold text-slate-600">{coach.sessionsCount}</td>
                            <td className="text-right py-2.5 px-2 font-mono text-slate-600">{coach.hoursCount.toFixed(1)} h</td>
                            <td className="text-right py-2.5 px-3 font-black text-slate-800">{coach.projectedCost.toFixed(2)} €</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Audit de Fonctionnement Historique */}
                <div className="card p-6 border border-slate-200/80 bg-white shadow-sm space-y-4">
                  <div>
                    <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-900">Historique des Frais Généraux</h4>
                    <p className="text-[10px] text-slate-400 font-semibold uppercase mt-0.5">Moyenne des dépenses des mois passés</p>
                  </div>
                  <div className="space-y-4">
                    <div className="bg-slate-50 rounded-2xl p-4 flex flex-col space-y-2 border border-slate-100">
                      <div className="flex justify-between items-center text-xs font-semibold border-b border-slate-200 pb-2 mb-1">
                        <span className="text-slate-500 uppercase text-[9px] tracking-wider font-extrabold">Mois Passé</span>
                        <span className="text-slate-500 uppercase text-[9px] tracking-wider font-extrabold">Total Dépensé</span>
                      </div>
                      {projectionData.generalProjection.history.map((h: any, idx: number) => (
                        <div key={idx} className="flex justify-between items-center text-xs">
                          <span className="font-bold text-slate-700">{moisNoms[h.month - 1]} {h.year}</span>
                          <span className="font-mono text-rose-600 font-bold">-{h.total.toFixed(2)} €</span>
                        </div>
                      ))}
                    </div>
                    <div className="flex justify-between items-center p-3 bg-rose-50/50 border border-rose-100 rounded-xl text-xs font-bold">
                      <span className="text-rose-950">Moyenne estimée :</span>
                      <span className="text-rose-700 font-black">{projectionData.generalProjection.average.toFixed(2)} € / mois</span>
                    </div>
                  </div>
                </div>
              </div>
            </details>
          </div>
        )
      })()}
    </div>
  )
}
