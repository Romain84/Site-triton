'use client'

import { useState, useEffect } from 'react'
import { formatCompactDateFr } from '@/lib/date'

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
  stats: {
    today: number
    week: number
    month: number
    total: number
    uniqueCountries: number
  }
  topCountries: { pays: string; codePays: string; count: number }[]
  topCities: { ville: string; pays: string; codePays: string; count: number }[]
  locations: LocationPoint[]
  devices: { name: string; count: number }[]
  recentVisits: VisitItem[]
}

// Convertit les coordonnées Lat/Lng (WGS84) en coordonnées XY SVG (Projection Equirectangulaire)
function latLngToSvg(lat: number, lng: number, width: number = 800, height: number = 400) {
  const x = ((lng + 180) * (width / 360))
  const y = (((-1 * lat) + 90) * (height / 180))
  return { x, y }
}

import VisiteursMapSVG from './VisiteursMapSVG'

export default function VisiteursManager() {
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [filterPage, setFilterPage] = useState<string>('all')

  const fetchAnalytics = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/visiteurs')
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
    fetchAnalytics()
    const interval = setInterval(fetchAnalytics, 15000) // Rafraîchissement automatique toutes les 15s
    return () => clearInterval(interval)
  }, [])

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

  const stats = data?.stats || { today: 0, week: 0, month: 0, total: 0, uniqueCountries: 0 }
  const totalVisits = stats.total || 1

  return (
    <div className="space-y-6">
      {/* En-tête de section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
        <div>
          <div className="flex items-center gap-3">
            <span className="text-3xl">🌍</span>
            <div>
              <h1 className="text-xl font-bold text-slate-900">Statistiques & Géolocalisation des Visiteurs</h1>
              <p className="text-xs text-slate-500 mt-0.5">Trafic en temps réel et analyse de provenance des visiteurs du Triton Club</p>
            </div>
          </div>
        </div>
        <button
          onClick={fetchAnalytics}
          className="inline-flex items-center justify-center gap-2 px-4 py-2 text-xs font-semibold text-primary bg-primary/10 hover:bg-primary/20 rounded-xl transition-colors self-start md:self-auto"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Actualiser les données
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-emerald-500 to-teal-700 text-white p-5 rounded-2xl shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold tracking-wider uppercase text-emerald-100">Aujourd&apos;hui</span>
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-300 animate-pulse" />
          </div>
          <p className="text-3xl font-extrabold mt-2">{stats.today.toLocaleString()}</p>
          <p className="text-[11px] text-emerald-100 mt-1">visiteurs en direct</p>
        </div>

        <div className="bg-gradient-to-br from-blue-600 to-indigo-800 text-white p-5 rounded-2xl shadow-sm">
          <span className="text-xs font-semibold tracking-wider uppercase text-blue-100">7 derniers jours</span>
          <p className="text-3xl font-extrabold mt-2">{stats.week.toLocaleString()}</p>
          <p className="text-[11px] text-blue-100 mt-1">connexions cette semaine</p>
        </div>

        <div className="bg-gradient-to-br from-violet-600 to-purple-800 text-white p-5 rounded-2xl shadow-sm">
          <span className="text-xs font-semibold tracking-wider uppercase text-violet-100">30 derniers jours</span>
          <p className="text-3xl font-extrabold mt-2">{stats.month.toLocaleString()}</p>
          <p className="text-[11px] text-violet-100 mt-1">visites ce mois-ci</p>
        </div>

        <div className="bg-gradient-to-br from-amber-500 to-orange-700 text-white p-5 rounded-2xl shadow-sm">
          <span className="text-xs font-semibold tracking-wider uppercase text-amber-100">Pays Touchés</span>
          <p className="text-3xl font-extrabold mt-2">{stats.uniqueCountries}</p>
          <p className="text-[11px] text-amber-100 mt-1">pays différents enregistrés</p>
        </div>
      </div>

      {/* Carte Mondiale Vectorielle HD */}
      <VisiteursMapSVG locations={data?.locations || []} />

      {/* Top Villes et Top Pays */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Top Villes */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <span className="text-lg">🏙️</span> Top Villes de Provenance
            </h3>
            <span className="text-xs font-semibold text-slate-400 uppercase">Visites</span>
          </div>

          <div className="space-y-3">
            {data?.topCities.slice(0, 7).map((city, i) => {
              const pct = Math.round((city.count / totalVisits) * 100)
              return (
                <div key={i} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-slate-700 flex items-center gap-2">
                      <span className="w-5 text-center font-bold text-slate-400">{i + 1}.</span>
                      {city.ville} <span className="text-slate-400 text-[10px]">({city.pays})</span>
                    </span>
                    <span className="font-bold text-slate-900">{city.count} <span className="text-slate-400 font-normal">({pct}%)</span></span>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-primary h-full rounded-full transition-all duration-500"
                      style={{ width: `${Math.max(pct, 4)}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Top Pays */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <span className="text-lg">🚩</span> Top Pays
            </h3>
            <span className="text-xs font-semibold text-slate-400 uppercase">Part du trafic</span>
          </div>

          <div className="space-y-3">
            {data?.topCountries.slice(0, 7).map((country, i) => {
              const pct = Math.round((country.count / totalVisits) * 100)
              return (
                <div key={i} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-slate-700 flex items-center gap-2">
                      <span className="w-5 text-center font-bold text-slate-400">{i + 1}.</span>
                      {country.pays}
                    </span>
                    <span className="font-bold text-slate-900">{country.count} <span className="text-slate-400 font-normal">({pct}%)</span></span>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-indigo-600 h-full rounded-full transition-all duration-500"
                      style={{ width: `${Math.max(pct, 4)}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Tableau en direct des dernières visites */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <span className="text-lg">⚡</span> Journal des Dernières Visites en Direct
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">Historique des 50 dernières connexions enregistrées</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 font-medium">Filtrer page :</span>
            <input
              type="text"
              placeholder="Ex: /planning..."
              value={filterPage === 'all' ? '' : filterPage}
              onChange={e => setFilterPage(e.target.value || 'all')}
              className="px-3 py-1.5 text-xs border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-primary/20"
            />
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
              {data?.recentVisits
                .filter(v => filterPage === 'all' || v.page.toLowerCase().includes(filterPage.toLowerCase()))
                .map((v) => (
                  <tr key={v.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-6 py-3.5 font-medium whitespace-nowrap text-slate-900">
                      {formatCompactDateFr(v.createdAt)}
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
                ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
