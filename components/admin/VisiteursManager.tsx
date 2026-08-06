'use client'

import { useState, useEffect } from 'react'
import VisiteursMapGoogleStyle from './VisiteursMapGoogleStyle'

interface LocationPoint {
  lat: number
  lng: number
  ville: string
  pays: string
  codePays: string
  count: number
}

interface VisitItem {
  id: string
  ip: string
  pays: string
  codePays: string
  region: string
  ville: string
  page: string
  appareil: string
  navigateur: string
  createdAt: string
}

interface AnalyticsData {
  period: string
  stats: {
    today: number
    uniqueToday: number
    week: number
    uniqueWeek: number
    month: number
    uniqueMonth: number
    total: number
    uniqueTotal: number
    uniqueCountries: number
  }
  topPages: { page: string; count: number }[]
  topCountries: { pays: string; codePays: string; count: number }[]
  topCities: { ville: string; pays: string; codePays: string; count: number }[]
  locations: LocationPoint[]
  devices: { name: string; count: number }[]
  browsers: { name: string; count: number }[]
  hourlyDistribution: { hour: string; count: number }[]
  dailyTrends: { date: string; count: number; unique: number }[]
  recentVisits: VisitItem[]
}

function formatDateHeureFr(dateInput: string | Date) {
  try {
    const d = new Date(dateInput)
    if (isNaN(d.getTime())) return String(dateInput)
    const dateStr = d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
    const timeStr = d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    return `${dateStr} à ${timeStr}`
  } catch {
    return String(dateInput)
  }
}

function formatTimeAgoFr(dateInput: string | Date) {
  try {
    const d = new Date(dateInput)
    const diffSec = Math.floor((Date.now() - d.getTime()) / 1000)
    if (diffSec < 15) return 'À l\'instant'
    if (diffSec < 60) return `Il y a ${diffSec}s`
    const diffMin = Math.floor(diffSec / 60)
    if (diffMin < 60) return `Il y a ${diffMin} min`
    const diffHours = Math.floor(diffMin / 60)
    if (diffHours < 24) return `Il y a ${diffHours}h`
    return `${Math.floor(diffHours / 24)}j`
  } catch {
    return ''
  }
}

function getCountryFlag(codePays: string): string {
  if (!codePays || codePays.length !== 2) return '🌐'
  const codePoints = codePays
    .toUpperCase()
    .split('')
    .map(char => 127397 + char.charCodeAt(0))
  return String.fromCodePoint(...codePoints)
}

export default function VisiteursManager() {
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState<'today' | '7d' | '30d' | 'all'>('30d')
  const [searchQuery, setSearchQuery] = useState('')

  const exportVisitsCSV = () => {
    if (!data?.recentVisits || data.recentVisits.length === 0) return
    const headers = ['Horodatage', 'Ville', 'Pays', 'Page', 'Appareil', 'Navigateur', 'IP']
    const rows = data.recentVisits.map(v => [
      formatDateHeureFr(v.createdAt),
      `"${v.ville}"`,
      `"${v.pays}"`,
      `"${v.page}"`,
      `"${v.appareil}"`,
      `"${v.navigateur}"`,
      `"${v.ip}"`,
    ])
    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(';'), ...rows.map(r => r.join(';'))].join('\n')
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `visites-triton-club-${period}-${new Date().toISOString().slice(0,10)}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const fetchAnalytics = async (selectedPeriod: string = period) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/visiteurs?period=${selectedPeriod}`)
      if (res.ok) {
        const json = await res.json()
        setData(json)
      }
    } catch (e) {
      console.error('Erreur chargement visiteurs:', e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAnalytics(period)
    const interval = setInterval(() => fetchAnalytics(period), 15000)
    return () => clearInterval(interval)
  }, [period])

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-3">
          <div className="inline-block animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
          <p className="text-sm font-medium text-slate-500">Chargement des Statistiques Visiteurs...</p>
        </div>
      </div>
    )
  }

  const stats = data?.stats || { today: 0, uniqueToday: 0, week: 0, uniqueWeek: 0, month: 0, uniqueMonth: 0, total: 0, uniqueTotal: 0, uniqueCountries: 0 }
  const totalVisits = stats.total || 1
  const maxHourlyCount = Math.max(...(data?.hourlyDistribution.map(h => h.count) || [1]), 1)
  const maxDailyCount = Math.max(...(data?.dailyTrends.map(d => d.count) || [1]), 1)

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* En-tête de section avec Sélecteur de Période */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-100 shadow-xs">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center text-2xl font-bold shrink-0">
            🌍
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">Statistiques Visiteurs & Géolocalisation</h1>
            <p className="text-xs text-slate-500 mt-0.5 font-medium">Analyse en temps réel de l&apos;audience, des villes d&apos;origine et du comportement sur le site</p>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {/* Onglets de filtrage par période */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200/80">
            <button
              onClick={() => setPeriod('today')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                period === 'today' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              24h
            </button>
            <button
              onClick={() => setPeriod('7d')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                period === '7d' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              7 Jours
            </button>
            <button
              onClick={() => setPeriod('30d')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                period === '30d' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              30 Jours
            </button>
            <button
              onClick={() => setPeriod('all')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                period === 'all' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Tout
            </button>
          </div>

          <button
            onClick={() => fetchAnalytics(period)}
            className="inline-flex items-center justify-center gap-2 px-3.5 py-2 text-xs font-semibold text-primary bg-primary/10 hover:bg-primary/20 rounded-xl transition-colors cursor-pointer"
          >
            🔄 Actualiser
          </button>
        </div>
      </div>

      {/* KPI Cards avec distinction Visiteurs Uniques / Total */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-emerald-500 to-teal-700 text-white p-5 rounded-2xl shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold tracking-wider uppercase text-emerald-100">Aujourd&apos;hui (24h)</span>
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-300 animate-pulse" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <p className="text-3xl font-extrabold">{stats.today.toLocaleString()}</p>
            <span className="text-xs text-emerald-100 font-medium">visites</span>
          </div>
          <p className="text-[11px] text-emerald-100 font-medium mt-1">
            👤 <span className="font-bold text-white">{stats.uniqueToday}</span> visiteurs uniques (IPs)
          </p>
        </div>

        <div className="bg-gradient-to-br from-blue-600 to-indigo-800 text-white p-5 rounded-2xl shadow-xs relative overflow-hidden">
          <span className="text-xs font-semibold tracking-wider uppercase text-blue-100">7 derniers jours</span>
          <div className="mt-3 flex items-baseline gap-2">
            <p className="text-3xl font-extrabold">{stats.week.toLocaleString()}</p>
            <span className="text-xs text-blue-100 font-medium">visites</span>
          </div>
          <p className="text-[11px] text-blue-100 font-medium mt-1">
            👤 <span className="font-bold text-white">{stats.uniqueWeek}</span> visiteurs uniques
          </p>
        </div>

        <div className="bg-gradient-to-br from-violet-600 to-purple-800 text-white p-5 rounded-2xl shadow-xs relative overflow-hidden">
          <span className="text-xs font-semibold tracking-wider uppercase text-violet-100">30 derniers jours</span>
          <div className="mt-3 flex items-baseline gap-2">
            <p className="text-3xl font-extrabold">{stats.month.toLocaleString()}</p>
            <span className="text-xs text-violet-100 font-medium">visites</span>
          </div>
          <p className="text-[11px] text-violet-100 font-medium mt-1">
            👤 <span className="font-bold text-white">{stats.uniqueMonth}</span> visiteurs uniques
          </p>
        </div>

        <div className="bg-gradient-to-br from-amber-500 to-orange-700 text-white p-5 rounded-2xl shadow-xs relative overflow-hidden">
          <span className="text-xs font-semibold tracking-wider uppercase text-amber-100">Pays & Portée</span>
          <div className="mt-3 flex items-baseline gap-2">
            <p className="text-3xl font-extrabold">{stats.uniqueCountries}</p>
            <span className="text-xs text-amber-100 font-medium">pays enregistrés</span>
          </div>
          <p className="text-[11px] text-amber-100 font-medium mt-1">
            Total historique : <span className="font-bold text-white">{stats.total.toLocaleString()}</span> connexions
          </p>
        </div>
      </div>

      {/* Carte Mondiale Leaflet HD */}
      <VisiteursMapGoogleStyle locations={data?.locations || []} />

      {/* GRAPHIQUES : Tendance Quotidienne & Pics d'Affluence par Heure */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Graphique 1: Tendance des Visites par Jour (30 Derniers Jours) */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <span>📈</span> Évolution Quotidienne du Trafic
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">Visites quotidiennes sur les 30 derniers jours</p>
            </div>
            <span className="text-xs font-extrabold px-2.5 py-1 rounded-full bg-blue-50 text-blue-600 border border-blue-100">
              30 Jours
            </span>
          </div>

          <div className="h-48 flex items-end justify-between gap-1 pt-6 px-1">
            {data?.dailyTrends && data.dailyTrends.length > 0 ? (
              data.dailyTrends.slice(-21).map((item, idx) => {
                const heightPct = Math.max((item.count / maxDailyCount) * 100, 6)
                const dayLabel = item.date.slice(8, 10) + '/' + item.date.slice(5, 7)
                return (
                  <div key={idx} className="flex-1 flex flex-col items-center gap-1.5 group relative">
                    {/* Tooltip Hover */}
                    <div className="absolute bottom-full mb-2 hidden group-hover:flex flex-col items-center bg-slate-900 text-white text-[10px] p-2 rounded-lg shadow-xl z-30 pointer-events-none whitespace-nowrap">
                      <span className="font-bold">{item.date}</span>
                      <span>{item.count} visites ({item.unique} uniques)</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-t-md h-36 flex items-end overflow-hidden">
                      <div
                        className="w-full bg-gradient-to-t from-blue-600 to-indigo-500 rounded-t-md group-hover:from-indigo-500 group-hover:to-blue-400 transition-all duration-300"
                        style={{ height: `${heightPct}%` }}
                      />
                    </div>
                    <span className="text-[9px] font-semibold text-slate-400 truncate w-full text-center">
                      {dayLabel}
                    </span>
                  </div>
                )
              })
            ) : (
              <p className="text-xs text-slate-400 italic text-center w-full py-12">Aucune donnée disponible</p>
            )}
          </div>
        </div>

        {/* Graphique 2: Heures de Pointe (0h à 23h) */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <span>⏰</span> Pics d&apos;Affluence par Heure (0h - 23h)
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">Distribution horaire des visites enregistrées</p>
            </div>
            <span className="text-xs font-extrabold px-2.5 py-1 rounded-full bg-purple-50 text-purple-600 border border-purple-100">
              Heures de Pointe
            </span>
          </div>

          <div className="h-48 flex items-end justify-between gap-1 pt-6 px-1">
            {data?.hourlyDistribution.map((item, idx) => {
              const heightPct = Math.max((item.count / maxHourlyCount) * 100, 4)
              return (
                <div key={idx} className="flex-1 flex flex-col items-center gap-1.5 group relative">
                  {/* Tooltip Hover */}
                  <div className="absolute bottom-full mb-2 hidden group-hover:flex flex-col items-center bg-slate-900 text-white text-[10px] p-2 rounded-lg shadow-xl z-30 pointer-events-none whitespace-nowrap">
                    <span className="font-bold">{item.hour}</span>
                    <span>{item.count} connexions</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-t-md h-36 flex items-end overflow-hidden">
                    <div
                      className="w-full bg-gradient-to-t from-purple-600 to-pink-500 rounded-t-md group-hover:from-purple-500 group-hover:to-pink-400 transition-all duration-300"
                      style={{ height: `${heightPct}%` }}
                    />
                  </div>
                  <span className="text-[8px] font-bold text-slate-400">
                    {idx % 3 === 0 ? item.hour : ''}
                  </span>
                </div>
              )
            })}
          </div>
        </div>

      </div>

      {/* RÉSULTATS : Top Pages, Top Villes, Top Pays & Appareils */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Top Pages Consultées */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <span>📄</span> Top Pages Consultées
            </h3>
            <span className="text-xs font-semibold text-slate-400 uppercase">Vues</span>
          </div>

          <div className="space-y-3">
            {data?.topPages && data.topPages.length > 0 ? (
              data.topPages.slice(0, 7).map((p, i) => {
                const pct = Math.round((p.count / totalVisits) * 100)
                return (
                  <div key={i} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-mono font-medium text-slate-700 truncate max-w-[200px]" title={p.page}>
                        <span className="text-slate-400 mr-1 font-bold">{i + 1}.</span> {p.page}
                      </span>
                      <span className="font-bold text-slate-900">{p.count} <span className="text-slate-400 font-normal">({pct}%)</span></span>
                    </div>
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                        style={{ width: `${Math.max(pct, 4)}%` }}
                      />
                    </div>
                  </div>
                )
              })
            ) : (
              <p className="text-xs text-slate-400 italic py-4 text-center">Aucune page enregistrée</p>
            )}
          </div>
        </div>

        {/* Top Villes */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <span>🏙️</span> Top Villes de Provenance
            </h3>
            <span className="text-xs font-semibold text-slate-400 uppercase">Visites</span>
          </div>

          <div className="space-y-3">
            {data?.topCities && data.topCities.length > 0 ? (
              data.topCities.slice(0, 7).map((city, i) => {
                const pct = Math.round((city.count / totalVisits) * 100)
                return (
                  <div key={i} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-slate-700 flex items-center gap-1.5 truncate">
                        <span className="w-4 font-bold text-slate-400">{i + 1}.</span>
                        <span>{city.ville}</span>
                        <span className="text-slate-400 text-[10px]">({city.pays})</span>
                      </span>
                      <span className="font-bold text-slate-900 shrink-0">{city.count} <span className="text-slate-400 font-normal">({pct}%)</span></span>
                    </div>
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-primary h-full rounded-full transition-all duration-500"
                        style={{ width: `${Math.max(pct, 4)}%` }}
                      />
                    </div>
                  </div>
                )
              })
            ) : (
              <p className="text-xs text-slate-400 italic py-4 text-center">Aucune ville enregistrée</p>
            )}
          </div>
        </div>

        {/* Top Pays & Répartition Appareils */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-xs space-y-5">
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <span>🚩</span> Top Pays
              </h3>
              <span className="text-xs font-semibold text-slate-400 uppercase">Trafic</span>
            </div>

            <div className="space-y-2">
              {data?.topCountries && data.topCountries.length > 0 ? (
                data.topCountries.slice(0, 5).map((country, i) => {
                  const pct = Math.round((country.count / totalVisits) * 100)
                  return (
                    <div key={i} className="flex items-center justify-between text-xs p-1.5 rounded-lg hover:bg-slate-50">
                      <span className="font-semibold text-slate-800 flex items-center gap-2">
                        <span>{getCountryFlag(country.codePays)}</span>
                        <span>{country.pays}</span>
                      </span>
                      <span className="font-bold text-slate-900">{country.count} <span className="text-slate-400 text-[10px]">({pct}%)</span></span>
                    </div>
                  )
                })
              ) : (
                <p className="text-xs text-slate-400 italic text-center py-2">Aucun pays</p>
              )}
            </div>
          </div>

          <div className="border-t border-slate-100 pt-4 space-y-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Appareils & Navigateurs</span>
            <div className="grid grid-cols-2 gap-2 text-xs pt-1">
              {data?.devices.map((d, idx) => (
                <div key={idx} className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 text-center">
                  <p className="text-[10px] text-slate-400 font-bold uppercase">{d.name}</p>
                  <p className="text-base font-extrabold text-slate-900 mt-0.5">{d.count}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>

      {/* Tableau en direct des dernières visites */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-xs overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <span className="text-lg">⚡</span> Journal des Dernières Visites en Direct
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">Historique temps réel des connexions au site avec adresses IP et villes</p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <button
              onClick={exportVisitsCSV}
              className="px-3.5 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              📥 Exporter CSV ({period})
            </button>
            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="🔍 Filtrer (IP, Ville, Page)..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="px-3 py-1.5 text-xs border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-primary/20 w-48 sm:w-64"
              />
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold">
              <tr>
                <th className="px-6 py-3">Horodatage</th>
                <th className="px-6 py-3">Localisation</th>
                <th className="px-6 py-3">Page consultée</th>
                <th className="px-6 py-3">Appareil</th>
                <th className="px-6 py-3">Navigateur</th>
                <th className="px-6 py-3">Adresse IP</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {data?.recentVisits && data.recentVisits.length > 0 ? (
                data.recentVisits
                  .filter(v =>
                    !searchQuery ||
                    v.page.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    v.ville.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    v.pays.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    v.ip.includes(searchQuery)
                  )
                  .map((v) => (
                    <tr key={v.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-6 py-3.5 font-medium whitespace-nowrap text-slate-900">
                        <div className="flex items-center gap-2">
                          <span>{formatDateHeureFr(v.createdAt)}</span>
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                            {formatTimeAgoFr(v.createdAt)}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-3.5 whitespace-nowrap">
                        <span className="font-semibold text-slate-800">{v.ville}</span>, <span className="text-slate-500">{v.pays}</span>
                      </td>
                      <td className="px-6 py-3.5 font-mono text-slate-600 max-w-xs truncate">
                        {v.page}
                      </td>
                      <td className="px-6 py-3.5 whitespace-nowrap">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                          v.appareil === 'Mobile' ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-800'
                        }`}>
                          {v.appareil}
                        </span>
                      </td>
                      <td className="px-6 py-3.5 text-slate-600 whitespace-nowrap">
                        {v.navigateur}
                      </td>
                      <td className="px-6 py-3.5 font-mono text-slate-400 text-[11px] whitespace-nowrap">
                        {v.ip}
                      </td>
                    </tr>
                  ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-slate-400 italic">
                    Aucune visite enregistrée pour le moment.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
