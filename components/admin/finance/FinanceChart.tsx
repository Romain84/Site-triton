'use client'

import { useState, useMemo } from 'react'
import { MonthlyOverviewItem, CumulativeOverviewItem, moisNoms } from './types'

interface FinanceChartProps {
  overview: MonthlyOverviewItem[]
  cumulativeOverview?: CumulativeOverviewItem[]
  soldeDepartSaison?: number
  selectedMois?: number
  selectedAnnee?: number
  onSelectMonth?: (mois: number, annee: number) => void
}

export default function FinanceChart({
  overview,
  soldeDepartSaison = 0,
  selectedMois,
  selectedAnnee,
  onSelectMonth,
}: FinanceChartProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)
  const [isCollapsed, setIsCollapsed] = useState(false)

  // Déterminer la saison en cours par défaut (1er août au 31 juillet)
  const defaultSeason = useMemo(() => {
    const now = new Date()
    const m = now.getMonth() + 1
    const y = now.getFullYear()
    return m >= 8 ? `${y}-${y + 1}` : `${y - 1}-${y}`
  }, [])

  const [selectedSeason, setSelectedSeason] = useState<string>(defaultSeason)

  // Liste des saisons sélectionnables
  const seasonsList = useMemo(() => {
    const now = new Date()
    const baseYear = now.getFullYear()
    const list: string[] = []
    for (let i = 1; i >= -3; i--) {
      const y = baseYear + i
      list.push(`${y}-${y + 1}`)
    }
    if (selectedSeason && !list.includes(selectedSeason)) {
      list.unshift(selectedSeason)
    }
    return list
  }, [selectedSeason])

  const [yearStartStr, yearEndStr] = selectedSeason.split('-')
  const yearStart = parseInt(yearStartStr) || new Date().getFullYear()
  const yearEnd = parseInt(yearEndStr) || (yearStart + 1)

  const now = new Date()
  const nowYear = now.getFullYear()
  const nowMonth = now.getMonth() + 1

  // Les 12 mois consécutifs de la saison sportive (du 1er Août au 31 Juillet)
  const seasonMonths = useMemo(() => [
    { month: 8, year: yearStart, label: 'Août' },
    { month: 9, year: yearStart, label: 'Sep.' },
    { month: 10, year: yearStart, label: 'Oct.' },
    { month: 11, year: yearStart, label: 'Nov.' },
    { month: 12, year: yearStart, label: 'Déc.' },
    { month: 1, year: yearEnd, label: 'Jan.' },
    { month: 2, year: yearEnd, label: 'Fév.' },
    { month: 3, year: yearEnd, label: 'Mar.' },
    { month: 4, year: yearEnd, label: 'Avr.' },
    { month: 5, year: yearEnd, label: 'Mai' },
    { month: 6, year: yearEnd, label: 'Jui.' },
    { month: 7, year: yearEnd, label: 'Juil.' },
  ], [yearStart, yearEnd])

  // Données mois par mois de la saison (toujours 12 mois complets)
  const chartOverview = useMemo(() => {
    return seasonMonths.map((sm) => {
      const isFuture = sm.year > nowYear || (sm.year === nowYear && sm.month > nowMonth)
      const isCurrent = sm.year === nowYear && sm.month === nowMonth
      const found = overview.find((o) => o.month === sm.month && o.year === sm.year)
      const income = found ? found.income : 0
      const expense = found ? found.expense : 0
      const net = income - expense
      return {
        month: sm.month,
        year: sm.year,
        label: sm.label,
        income,
        expense,
        net,
        isFuture,
        isCurrent,
        hasActivity: Boolean(found && (income > 0 || expense > 0)),
      }
    })
  }, [seasonMonths, overview, nowYear, nowMonth])

  // Trésorerie cumulée mois par mois pour la saison (à partir du solde de départ)
  const chartCumulative = useMemo(() => {
    let running = soldeDepartSaison || 0
    return chartOverview.map((item) => {
      running += item.net
      return {
        month: item.month,
        year: item.year,
        cumulative: running,
        isFuture: item.isFuture,
      }
    })
  }, [chartOverview, soldeDepartSaison])

  // Totaux saisonniers
  const seasonTotalIncome = useMemo(() => chartOverview.reduce((sum, item) => sum + item.income, 0), [chartOverview])
  const seasonTotalExpense = useMemo(() => chartOverview.reduce((sum, item) => sum + item.expense, 0), [chartOverview])
  const seasonNetResult = seasonTotalIncome - seasonTotalExpense

  // Solde à date (dernier mois écoulé ou en cours)
  const currentSeasonBalance = useMemo(() => {
    const activeMonths = chartCumulative.filter((c) => !c.isFuture)
    if (activeMonths.length > 0) {
      return activeMonths[activeMonths.length - 1].cumulative
    }
    return soldeDepartSaison || 0
  }, [chartCumulative, soldeDepartSaison])

  const paddingLeft = 60
  const paddingRight = 20
  const paddingTop = 30
  const paddingBottom = 40
  const chartWidth = 800 - paddingLeft - paddingRight
  const chartHeight = 300 - paddingTop - paddingBottom
  const yBottom = paddingTop + chartHeight

  const allValues = [
    0,
    ...(soldeDepartSaison ? [soldeDepartSaison] : []),
    ...chartOverview.map((item) => item.income),
    ...chartOverview.map((item) => item.expense),
    ...chartOverview.map((item) => item.net),
    ...chartCumulative.map((item) => item.cumulative),
  ]
  const rawMin = Math.min(...allValues)
  const rawMax = Math.max(...allValues)
  const minDomain = rawMin < 0 ? rawMin * 1.15 : 0
  const maxDomain = rawMax > 0 ? rawMax * 1.15 : 100
  const domainHeight = (maxDomain - minDomain) || 100

  const getY = (v: number) => {
    if (domainHeight === 0) return paddingTop + chartHeight / 2
    return paddingTop + chartHeight - ((v - minDomain) / domainHeight) * chartHeight
  }

  const colWidth = chartWidth / 12
  const yZero = getY(0)

  const tickCount = 4
  const ticks = Array.from({ length: tickCount }, (_, idx) => {
    return minDomain + (idx * domainHeight) / (tickCount - 1)
  })

  // Indice du dernier mois ayant une activité ou n'étant pas dans le futur
  const lastActiveIndex = chartOverview.reduce((lastIdx, item, idx) => {
    return (!item.isFuture || item.hasActivity) ? idx : lastIdx
  }, 0)

  // Points pour la portion réelle/passée (ligne continue)
  const solidPoints = chartCumulative.slice(0, lastActiveIndex + 1).map((item, idx) => {
    const cx = paddingLeft + idx * colWidth + colWidth / 2
    const cy = getY(item.cumulative)
    return `${idx === 0 ? 'M' : 'L'} ${cx} ${cy}`
  }).join(' ')

  // Points pour la projection future (ligne pointillée)
  const futurePoints = lastActiveIndex < chartCumulative.length - 1
    ? chartCumulative.slice(lastActiveIndex).map((item, i) => {
        const actualIdx = lastActiveIndex + i
        const cx = paddingLeft + actualIdx * colWidth + colWidth / 2
        const cy = getY(item.cumulative)
        return `${i === 0 ? 'M' : 'L'} ${cx} ${cy}`
      }).join(' ')
    : ''

  const solidAreaPoints = solidPoints.length > 0
    ? `${solidPoints} L ${paddingLeft + lastActiveIndex * colWidth + colWidth / 2} ${yBottom} L ${paddingLeft + colWidth / 2} ${yBottom} Z`
    : ''

  const barWidth = Math.max(6, colWidth * 0.18)
  const gap = 2

  return (
    <div className="card p-5 relative overflow-hidden bg-white border border-slate-200/90 shadow-2xs rounded-2xl">
      {/* En-tête du graphique avec sélecteur de saison */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2.5">
          <span className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-700 text-sm shadow-2xs">
            📊
          </span>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-900">
                Évolution de la Trésorerie
              </h3>
              <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-indigo-50 text-indigo-700 border border-indigo-200/60">
                Saison {selectedSeason}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 font-medium">
              Saison sportive du 1er Août au 31 Juillet • 12 mois
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Sélecteur de saison */}
          <div className="flex items-center gap-1.5 bg-slate-100/80 p-1 rounded-xl border border-slate-200/60 text-xs">
            <span className="text-[11px] font-bold text-slate-500 pl-1">Saison :</span>
            <select
              value={selectedSeason}
              onChange={(e) => setSelectedSeason(e.target.value)}
              className="px-2 py-1 bg-white border border-slate-200/60 rounded-lg text-xs font-bold text-slate-800 outline-none cursor-pointer shadow-2xs"
            >
              {seasonsList.map((s) => (
                <option key={s} value={s}>
                  {s} {s === defaultSeason ? '(en cours)' : ''}
                </option>
              ))}
            </select>
          </div>

          {!isCollapsed && (
            <div className="hidden lg:flex items-center gap-4 text-xs font-semibold">
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
                <span className="text-slate-600">Solde cumulé</span>
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
                    <line
                      x1={paddingLeft}
                      y1={y}
                      x2={800 - paddingRight}
                      y2={y}
                      stroke="#f1f5f9"
                      strokeWidth={1}
                      strokeDasharray={tick === 0 ? '0' : '4 4'}
                    />
                    <text x={paddingLeft - 12} y={y + 3} textAnchor="end" className="text-[9px] font-bold fill-slate-400 font-mono">
                      {tick.toFixed(0)} €
                    </text>
                  </g>
                )
              })}

              {/* Ligne d'axe X zéro */}
              <line x1={paddingLeft} y1={yZero} x2={800 - paddingRight} y2={yZero} stroke="#cbd5e1" strokeWidth={1.5} />

              {/* Colonne du mois actuellement sélectionné */}
              {chartOverview.map((item, idx) => {
                const isSelected = selectedMois !== undefined && selectedAnnee !== undefined && item.month === selectedMois && item.year === selectedAnnee
                if (!isSelected) return null
                const colX = paddingLeft + idx * colWidth
                return (
                  <rect
                    key={`selected-${idx}`}
                    x={colX + 2}
                    y={paddingTop}
                    width={colWidth - 4}
                    height={chartHeight}
                    fill="#f1f5f9"
                    stroke="#818cf8"
                    strokeWidth={1.4}
                    strokeDasharray="3 3"
                    rx={8}
                  />
                )
              })}

              {/* Arrière-plan de colonne au survol */}
              {hoveredIndex !== null && (
                <rect
                  x={paddingLeft + hoveredIndex * colWidth + 3}
                  y={paddingTop}
                  width={colWidth - 6}
                  height={chartHeight}
                  fill="#f8fafc"
                  rx={8}
                />
              )}

              {/* Histogrammes (Recettes & Dépenses) */}
              {chartOverview.map((item, idx) => {
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
                      <rect
                        x={rxIncome}
                        y={yIncome}
                        width={barWidth}
                        height={hIncome}
                        fill="url(#income-gradient)"
                        opacity={isHovered ? 1 : 0.9}
                        rx={3}
                        className="transition-all duration-150"
                      />
                    )}
                    {hExpense > 0 && (
                      <rect
                        x={rxExpense}
                        y={yExpense}
                        width={barWidth}
                        height={hExpense}
                        fill="url(#expense-gradient)"
                        opacity={isHovered ? 1 : 0.9}
                        rx={3}
                        className="transition-all duration-150"
                      />
                    )}
                  </g>
                )
              })}

              {/* Zone dégradée et Courbe de trésorerie cumulée */}
              {solidAreaPoints && (
                <path d={solidAreaPoints} fill="url(#net-gradient)" />
              )}
              {solidPoints && (
                <path
                  d={solidPoints}
                  fill="none"
                  stroke="#6366f1"
                  strokeWidth={3}
                  filter="url(#shadow)"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )}
              {futurePoints && (
                <path
                  d={futurePoints}
                  fill="none"
                  stroke="#a5b4fc"
                  strokeWidth={2}
                  strokeDasharray="4 4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )}

              {/* Points et étiquettes d'axe X */}
              {chartOverview.map((item, idx) => {
                const colX = paddingLeft + idx * colWidth
                const centerX = colX + colWidth / 2
                const isHovered = hoveredIndex === idx
                const isSelected = selectedMois !== undefined && selectedAnnee !== undefined && item.month === selectedMois && item.year === selectedAnnee

                return (
                  <g key={idx}>
                    {isHovered && (
                      <line
                        x1={centerX}
                        y1={paddingTop}
                        x2={centerX}
                        y2={paddingTop + chartHeight}
                        stroke="#64748b"
                        strokeWidth={1.2}
                        strokeDasharray="3 3"
                      />
                    )}
                    <circle
                      cx={centerX}
                      cy={getY(chartCumulative[idx]?.cumulative || 0)}
                      r={isHovered ? 6.5 : isSelected ? 5.5 : item.isFuture && !item.hasActivity ? 3.5 : 4.5}
                      fill={isSelected ? '#4338ca' : item.isFuture && !item.hasActivity ? '#c7d2fe' : '#6366f1'}
                      stroke="#ffffff"
                      strokeWidth={isSelected ? 2.5 : item.isFuture && !item.hasActivity ? 1.5 : 2}
                      className="transition-all duration-150"
                    />
                    <text
                      x={centerX}
                      y={300 - 15}
                      textAnchor="middle"
                      className={`text-[9px] uppercase ${
                        isSelected
                          ? 'fill-indigo-950 font-black'
                          : item.isCurrent
                          ? 'fill-slate-900 font-black'
                          : item.isFuture && !item.hasActivity
                          ? 'fill-slate-400 font-bold'
                          : 'fill-slate-600 font-extrabold'
                      }`}
                    >
                      {item.label} {item.year.toString().slice(2)}
                    </text>
                    {isSelected && (
                      <circle cx={centerX} y={300 - 6} r={2.5} fill="#4338ca" />
                    )}
                    {item.isCurrent && !isSelected && (
                      <circle cx={centerX} y={300 - 6} r={2} fill="#10b981" />
                    )}
                  </g>
                )
              })}

              {/* Zones invisibles de détection de clic et de survol */}
              {chartOverview.map((item, idx) => {
                const colX = paddingLeft + idx * colWidth
                return (
                  <rect
                    key={idx}
                    x={colX}
                    y={paddingTop}
                    width={colWidth}
                    height={chartHeight + 35}
                    fill="transparent"
                    className={onSelectMonth ? 'cursor-pointer' : ''}
                    onClick={() => onSelectMonth?.(item.month, item.year)}
                    onMouseEnter={() => setHoveredIndex(idx)}
                    onMouseLeave={() => setHoveredIndex(null)}
                  />
                )
              })}
            </svg>

            {/* Infobulle flottante */}
            {hoveredIndex !== null && (
              <div
                className="absolute z-10 bg-slate-950/95 text-white p-3.5 rounded-xl shadow-lg border border-slate-800 text-[11px] space-y-2 pointer-events-none transition-all duration-150"
                style={{
                  left: `${Math.min(Math.max(paddingLeft, paddingLeft + hoveredIndex * colWidth + colWidth / 2 - 95), 800 - paddingRight - 190)}px`,
                  top: `${Math.max(10, Math.min(getY(chartCumulative[hoveredIndex]?.cumulative || 0) - 115, 160))}px`,
                }}
              >
                <div className="font-extrabold text-[10px] uppercase tracking-wider text-slate-400 border-b border-slate-800 pb-1 flex justify-between items-center gap-2">
                  <span>{moisNoms[chartOverview[hoveredIndex].month - 1]} {chartOverview[hoveredIndex].year}</span>
                  {selectedMois === chartOverview[hoveredIndex].month && selectedAnnee === chartOverview[hoveredIndex].year ? (
                    <span className="text-[9px] bg-indigo-500/30 text-indigo-300 px-1.5 py-0.2 rounded font-bold">Sélectionné</span>
                  ) : chartOverview[hoveredIndex].isCurrent ? (
                    <span className="text-[9px] bg-emerald-500/30 text-emerald-300 px-1.5 py-0.2 rounded font-bold">En cours</span>
                  ) : chartOverview[hoveredIndex].isFuture ? (
                    <span className="text-[9px] bg-slate-800 text-slate-400 px-1.5 py-0.2 rounded font-bold">À venir</span>
                  ) : null}
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between gap-6">
                    <span className="text-slate-400">Recettes :</span>
                    <span className="font-bold text-emerald-400">+{chartOverview[hoveredIndex].income.toFixed(2)} €</span>
                  </div>
                  <div className="flex justify-between gap-6">
                    <span className="text-slate-400">Dépenses :</span>
                    <span className="font-bold text-sky-400">-{chartOverview[hoveredIndex].expense.toFixed(2)} €</span>
                  </div>
                  <div className="border-t border-slate-800 pt-1.5 flex justify-between gap-6">
                    <span className="text-slate-200 font-semibold">Résultat mensuel :</span>
                    <span className={`font-black ${chartOverview[hoveredIndex].net >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {chartOverview[hoveredIndex].net >= 0 ? '+' : ''}{chartOverview[hoveredIndex].net.toFixed(2)} €
                    </span>
                  </div>
                  <div className="flex justify-between gap-6">
                    <span className="text-slate-200 font-semibold">Trésorerie cumulée :</span>
                    <span className="font-black text-indigo-400">
                      {chartCumulative[hoveredIndex]?.cumulative.toFixed(2)} €
                    </span>
                  </div>
                  {onSelectMonth && (
                    <div className="border-t border-slate-800 pt-1.5 text-[10px] text-indigo-300 font-bold text-center">
                      👆 Cliquer pour afficher ce mois
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Bandeau récapitulatif de la saison en bas du graphique */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3.5 mt-2 border-t border-slate-100">
            <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/50 shadow-2xs">
              <span className="text-[10px] uppercase font-extrabold text-slate-400 block tracking-wider">Recettes Saison</span>
              <span className="text-xs font-black text-emerald-700 font-mono">+{seasonTotalIncome.toFixed(2)} €</span>
            </div>
            <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/50 shadow-2xs">
              <span className="text-[10px] uppercase font-extrabold text-slate-400 block tracking-wider">Dépenses Saison</span>
              <span className="text-xs font-black text-sky-700 font-mono">-{seasonTotalExpense.toFixed(2)} €</span>
            </div>
            <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/50 shadow-2xs">
              <span className="text-[10px] uppercase font-extrabold text-slate-400 block tracking-wider">Résultat Net Saison</span>
              <span className={`text-xs font-black font-mono ${seasonNetResult >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                {seasonNetResult >= 0 ? '+' : ''}{seasonNetResult.toFixed(2)} €
              </span>
            </div>
            <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/50 shadow-2xs">
              <span className="text-[10px] uppercase font-extrabold text-slate-400 block tracking-wider">Solde à ce jour</span>
              <span className="text-xs font-black text-indigo-700 font-mono">{currentSeasonBalance.toFixed(2)} €</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
