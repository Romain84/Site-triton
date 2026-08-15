'use client'

import { useState } from 'react'
import { MonthlyOverviewItem, CumulativeOverviewItem, moisNoms } from './types'

interface FinanceChartProps {
  overview: MonthlyOverviewItem[]
  cumulativeOverview: CumulativeOverviewItem[]
}

export default function FinanceChart({ overview, cumulativeOverview }: FinanceChartProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)
  const [isCollapsed, setIsCollapsed] = useState(false)

  if (overview.length === 0) return null

  const paddingLeft = 60
  const paddingRight = 20
  const paddingTop = 30
  const paddingBottom = 40
  const chartWidth = 800 - paddingLeft - paddingRight
  const chartHeight = 300 - paddingTop - paddingBottom

  const minDomain = Math.min(0, ...overview.map(item => item.net), ...cumulativeOverview.map(item => item.cumulative))
  const maxDomain = Math.max(...overview.map(item => Math.max(item.income, item.expense)), ...cumulativeOverview.map(item => item.cumulative)) * 1.15
  const domainHeight = maxDomain - minDomain

  const getY = (v: number) => {
    if (domainHeight === 0) return paddingTop + chartHeight / 2
    return paddingTop + chartHeight - ((v - minDomain) / domainHeight) * chartHeight
  }

  const colWidth = chartWidth / overview.length
  const yZero = getY(0)

  const tickCount = 4
  const ticks = Array.from({ length: tickCount }, (_, idx) => {
    return minDomain + (idx * domainHeight) / (tickCount - 1)
  })

  const pathPoints = cumulativeOverview.map((item, idx) => {
    const cx = paddingLeft + idx * colWidth + colWidth / 2
    const cy = getY(item.cumulative)
    return `${idx === 0 ? 'M' : 'L'} ${cx} ${cy}`
  }).join(' ')

  const areaPoints = cumulativeOverview.length > 0
    ? `${pathPoints} L ${paddingLeft + (cumulativeOverview.length - 1) * colWidth + colWidth / 2} ${yZero} L ${paddingLeft + colWidth / 2} ${yZero} Z`
    : ''

  const barWidth = Math.max(4, colWidth * 0.18)
  const gap = 2

  return (
    <div className="card p-5 relative overflow-hidden bg-white border border-slate-200/90 shadow-2xs rounded-2xl">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2">
          <span className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700 text-sm">
            📊
          </span>
          <div>
            <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-900">
              Évolution de la Trésorerie
            </h3>
            <p className="text-[11px] text-slate-500 font-medium">Recettes, dépenses et solde cumulé mois par mois</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {!isCollapsed && (
            <div className="hidden md:flex items-center gap-4 text-xs font-semibold">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 bg-emerald-500 rounded-sm" />
                <span className="text-slate-600">Recettes</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 bg-sky-500 rounded-sm" />
                <span className="text-slate-600">Dépenses</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-1 bg-indigo-600 rounded-xs inline-block" />
                <span className="text-slate-600">Solde Restant</span>
              </span>
            </div>
          )}

          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="px-2.5 py-1 text-xs font-bold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200/80 rounded-lg transition-colors cursor-pointer"
          >
            {isCollapsed ? 'Afficher graphique' : 'Masquer'}
          </button>
        </div>
      </div>

      {!isCollapsed && (
        <div className="relative w-full overflow-x-auto select-none pt-4 animate-fade-in">
          <div className="min-w-[760px] relative">
            <svg viewBox="0 0 800 300" className="w-full h-auto">
            <defs>
              <linearGradient id="net-gradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#6366f1" stopOpacity="0.25" />
                <stop offset="100%" stopColor="#6366f1" stopOpacity="0" />
              </linearGradient>
              <linearGradient id="income-gradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#10b981" />
                <stop offset="100%" stopColor="#059669" />
              </linearGradient>
              <linearGradient id="expense-gradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#0ea5e9" />
                <stop offset="100%" stopColor="#0284c7" />
              </linearGradient>
              <filter id="shadow" x="-10%" y="-10%" width="120%" height="120%">
                <feDropShadow dx="0" dy="4" stdDeviation="4" floodColor="#6366f1" floodOpacity="0.25" />
              </filter>
            </defs>

            {/* Lignes de grille horizontales et étiquettes d'axe Y */}
            {ticks.map((tick, idx) => {
              const y = getY(tick)
              return (
                <g key={idx}>
                  <line x1={paddingLeft} y1={y} x2={800 - paddingRight} y2={y} stroke="#f1f5f9" strokeWidth={1} strokeDasharray={tick === 0 ? '0' : '4 4'} />
                  <text x={paddingLeft - 12} y={y + 3} textAnchor="end" className="text-[9px] font-bold fill-slate-400 font-mono">
                    {tick.toFixed(0)} €
                  </text>
                </g>
              )
            })}

            {/* Ligne d'axe X zéro */}
            <line x1={paddingLeft} y1={yZero} x2={800 - paddingRight} y2={yZero} stroke="#cbd5e1" strokeWidth={1.5} />

            {/* Arrière-plan de colonne au survol */}
            {hoveredIndex !== null && (
              <rect x={paddingLeft + hoveredIndex * colWidth + 4} y={paddingTop} width={colWidth - 8} height={chartHeight} fill="#f8fafc" rx={8} />
            )}

            {/* Histogrammes */}
            {overview.map((item, idx) => {
              const colX = paddingLeft + idx * colWidth
              const centerX = colX + colWidth / 2
              const yIncome = getY(item.income)
              const hIncome = yZero - yIncome
              const rxIncome = centerX - barWidth - gap
              const yExpense = getY(item.expense)
              const hExpense = yZero - yExpense
              const rxExpense = centerX + gap
              const isHovered = hoveredIndex === idx

              return (
                <g key={idx} className="transition-all duration-200">
                  {hIncome > 0 && (
                    <rect x={rxIncome} y={yIncome} width={barWidth} height={hIncome} fill="url(#income-gradient)" opacity={isHovered ? 1 : 0.85} rx={3} className="transition-all duration-150" />
                  )}
                  {hExpense > 0 && (
                    <rect x={rxExpense} y={yExpense} width={barWidth} height={hExpense} fill="url(#expense-gradient)" opacity={isHovered ? 1 : 0.85} rx={3} className="transition-all duration-150" />
                  )}
                </g>
              )
            })}

            {/* Zone dégradée et Courbe de tendance */}
            {overview.length > 0 && (
              <g>
                <path d={areaPoints} fill="url(#net-gradient)" />
                <path d={pathPoints} fill="none" stroke="#6366f1" strokeWidth={3} filter="url(#shadow)" strokeLinecap="round" strokeLinejoin="round" />
              </g>
            )}

            {/* Points et axes X */}
            {overview.map((item, idx) => {
              const colX = paddingLeft + idx * colWidth
              const centerX = colX + colWidth / 2
              const isHovered = hoveredIndex === idx
              return (
                <g key={idx}>
                  {isHovered && (
                    <line x1={centerX} y1={paddingTop} x2={centerX} y2={paddingTop + chartHeight} stroke="#64748b" strokeWidth={1.2} strokeDasharray="3 3" />
                  )}
                  <circle cx={centerX} cy={getY(cumulativeOverview[idx]?.cumulative || 0)} r={isHovered ? 6 : 4.5} fill="#6366f1" stroke="#ffffff" strokeWidth={2} className="transition-all duration-150" />
                  <text x={centerX} y={300 - 15} textAnchor="middle" className="text-[9px] font-extrabold fill-slate-500 uppercase">
                    {moisNoms[item.month - 1].slice(0, 3)}. {item.year.toString().slice(2)}
                  </text>
                </g>
              )
            })}

            {/* Zones de détection pour le survol */}
            {overview.map((_, idx) => {
              const colX = paddingLeft + idx * colWidth
              return (
                <rect key={idx} x={colX} y={paddingTop} width={colWidth} height={chartHeight} fill="transparent" className="cursor-pointer" onMouseEnter={() => setHoveredIndex(idx)} onMouseLeave={() => setHoveredIndex(null)} />
              )
            })}
          </svg>

          {/* Infobulle flottante */}
          {hoveredIndex !== null && (
            <div
              className="absolute z-10 bg-slate-950/95 text-white p-3.5 rounded-xl shadow-lg border border-slate-800 text-[11px] space-y-2 pointer-events-none transition-all duration-150"
              style={{
                left: `${Math.min(Math.max(paddingLeft, paddingLeft + hoveredIndex * colWidth + colWidth / 2 - 90), 800 - paddingRight - 180)}px`,
                top: `${Math.max(10, Math.min(getY(cumulativeOverview[hoveredIndex]?.cumulative || 0) - 110, 160))}px`,
              }}
            >
              <div className="font-extrabold text-[10px] uppercase tracking-wider text-slate-400 border-b border-slate-800 pb-1">
                {moisNoms[overview[hoveredIndex].month - 1]} {overview[hoveredIndex].year}
              </div>
              <div className="space-y-1">
                <div className="flex justify-between gap-6">
                  <span className="text-slate-400">Argent Reçu (Recettes) :</span>
                  <span className="font-bold text-emerald-400">+{overview[hoveredIndex].income.toFixed(2)} €</span>
                </div>
                <div className="flex justify-between gap-6">
                  <span className="text-slate-400">Argent Dépensé (Dépenses) :</span>
                  <span className="font-bold text-sky-400">-{overview[hoveredIndex].expense.toFixed(2)} €</span>
                </div>
                <div className="border-t border-slate-800 pt-1.5 flex justify-between gap-6">
                  <span className="text-slate-200 font-semibold">Gains / Pertes du mois :</span>
                  <span className={`font-black ${overview[hoveredIndex].net >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {overview[hoveredIndex].net >= 0 ? '+' : ''}{overview[hoveredIndex].net.toFixed(2)} €
                  </span>
                </div>
                <div className="flex justify-between gap-6">
                  <span className="text-slate-200 font-semibold">Solde Global Restant :</span>
                  <span className="font-black text-indigo-400">
                    {cumulativeOverview[hoveredIndex]?.cumulative.toFixed(2)} €
                  </span>
                </div>
              </div>
            </div>
          )}
          </div>
        </div>
      )}
    </div>
  )
}
