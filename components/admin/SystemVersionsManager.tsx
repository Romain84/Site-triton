'use client'

import { useState, useEffect } from 'react'

interface SystemVersionsData {
  name: string
  version: string
  runtime: {
    node: string
    platform: string
    arch: string
    env: string
  }
  dependencies: Record<string, string>
  devDependencies: Record<string, string>
}

export default function SystemVersionsManager() {
  const [data, setData] = useState<SystemVersionsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [searchFilter, setSearchFilter] = useState('')

  useEffect(() => {
    fetchVersions()
  }, [])

  const fetchVersions = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/admin/system-versions')
      if (res.ok) {
        const json = await res.json()
        setData(json)
      } else {
        setError('Impossible de charger les versions des composants')
      }
    } catch {
      setError('Erreur lors du chargement des versions')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center py-16">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        <span className="ml-3 text-slate-600 font-medium text-sm">Chargement des versions des composants...</span>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-xl">
        <p className="text-red-700 font-semibold">{error || 'Erreur inconnue'}</p>
      </div>
    )
  }

  const allDeps = [
    ...Object.entries(data.dependencies).map(([name, ver]) => ({ name, ver, type: 'Production' })),
    ...Object.entries(data.devDependencies).map(([name, ver]) => ({ name, ver, type: 'Développement' })),
  ]

  const filteredDeps = allDeps.filter(
    (item) =>
      item.name.toLowerCase().includes(searchFilter.toLowerCase()) ||
      item.type.toLowerCase().includes(searchFilter.toLowerCase())
  )

  const categories = [
    {
      title: '⚡ Core Framework & Runtime',
      color: 'bg-blue-50 border-blue-100 text-blue-900',
      packages: ['next', 'react', 'react-dom'],
    },
    {
      title: '🗄️ Base de Données & ORM',
      color: 'bg-emerald-50 border-emerald-100 text-emerald-900',
      packages: ['@prisma/client', 'prisma', '@prisma/adapter-pg', 'pg'],
    },
    {
      title: '🤖 Intelligence Artificielle & Chatbot',
      color: 'bg-purple-50 border-purple-100 text-purple-900',
      packages: ['genkit', 'genkitx-mistral'],
    },
    {
      title: '🖼️ Traitement d\'Image & Médias',
      color: 'bg-amber-50 border-amber-100 text-amber-900',
      packages: ['sharp', '@vercel/blob'],
    },
    {
      title: '💳 Paiements & E-Commerce',
      color: 'bg-indigo-50 border-indigo-100 text-indigo-900',
      packages: ['stripe', '@stripe/stripe-js'],
    },
    {
      title: '🎨 Interface Utilisateur & Animations',
      color: 'bg-rose-50 border-rose-100 text-rose-900',
      packages: ['framer-motion', 'lucide-react', 'recharts', 'react-hot-toast', '@dnd-kit/core', '@dnd-kit/sortable', '@dnd-kit/utilities', '@tanstack/react-query'],
    },
    {
      title: '🛡️ Sécurité, Auth & Utilitaires',
      color: 'bg-slate-100 border-slate-200 text-slate-900',
      packages: ['bcrypt', 'jose', 'zod', 'isomorphic-dompurify', 'nodemailer'],
    },
    {
      title: '📄 Génération de Documents PDF',
      color: 'bg-cyan-50 border-cyan-100 text-cyan-900',
      packages: ['jspdf', 'jspdf-autotable', 'pdf-parse'],
    },
    {
      title: '🛠️ Outillage Dev, Style & Compilateur',
      color: 'bg-orange-50 border-orange-100 text-orange-900',
      packages: ['typescript', 'tailwindcss', '@tailwindcss/postcss', 'postcss', 'autoprefixer', 'eslint', 'eslint-config-next', 'tsx', 'vitest'],
    },
  ]

  return (
    <div className="space-y-8 max-w-6xl">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Catalogue des Composants & Librairies</h2>
          <p className="text-sm text-slate-500 mt-1">
            Visualisez la version exacte de chaque module, dépendance et environnement d'exécution du projet.
          </p>
        </div>
        <button
          onClick={fetchVersions}
          className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-colors self-start md:self-auto cursor-pointer"
        >
          🔄 Rafraîchir
        </button>
      </div>

      {/* Cartes d'environnement Runtime */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="card p-4 bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-2xl shadow-md">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Node.js Runtime</div>
          <div className="text-xl font-mono font-bold mt-1.5 text-emerald-400">{data.runtime.node}</div>
          <div className="text-[10px] text-slate-400 mt-1 font-mono">{data.runtime.platform} ({data.runtime.arch})</div>
        </div>

        <div className="card p-4 bg-white border border-slate-200 rounded-2xl shadow-sm">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Framework Next.js</div>
          <div className="text-xl font-mono font-bold mt-1.5 text-slate-900">{data.dependencies['next'] || '16.x'}</div>
          <div className="text-[10px] text-slate-500 mt-1">App Router (Turbopack)</div>
        </div>

        <div className="card p-4 bg-white border border-slate-200 rounded-2xl shadow-sm">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">React Version</div>
          <div className="text-xl font-mono font-bold mt-1.5 text-blue-600">{data.dependencies['react'] || '19.x'}</div>
          <div className="text-[10px] text-slate-500 mt-1">React Server Components</div>
        </div>

        <div className="card p-4 bg-white border border-slate-200 rounded-2xl shadow-sm">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Prisma ORM</div>
          <div className="text-xl font-mono font-bold mt-1.5 text-indigo-600">{data.dependencies['@prisma/client'] || '7.x'}</div>
          <div className="text-[10px] text-slate-500 mt-1">PostgreSQL Driver</div>
        </div>
      </div>

      {/* Grille par Catégories */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {categories.map((cat) => (
          <div key={cat.title} className="card p-5 border border-slate-200 rounded-2xl shadow-sm space-y-3 bg-white flex flex-col justify-between">
            <div>
              <div className={`text-xs font-extrabold px-3 py-1.5 rounded-xl border mb-3 ${cat.color}`}>
                {cat.title}
              </div>
              <div className="space-y-2">
                {cat.packages.map((pkgName) => {
                  const ver = data.dependencies[pkgName] || data.devDependencies[pkgName] || 'Non installée'
                  return (
                    <div key={pkgName} className="flex items-center justify-between py-1 border-b border-slate-100 text-xs">
                      <span className="font-mono text-slate-700 font-medium truncate max-w-[170px]" title={pkgName}>
                        {pkgName}
                      </span>
                      <span className="font-mono font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded text-[11px]">
                        {ver}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Tableau exhaustif complet de toutes les dépendances */}
      <div className="card bg-white rounded-2xl border border-slate-200 shadow-md p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <h3 className="text-lg font-bold text-slate-900">Liste Complète ({allDeps.length} dépendances)</h3>
            <p className="text-xs text-slate-500 mt-0.5">Recherchez n'importe quelle librairie du fichier package.json</p>
          </div>
          <input
            type="text"
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            placeholder="Filtrer une librairie (ex: sharp, stripe, zod)..."
            className="input text-xs px-4 py-2 rounded-xl border border-slate-250 w-full sm:w-64"
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-4">Nom de la Librairie / Package</th>
                <th className="py-2.5 px-4">Version Spécifiée</th>
                <th className="py-2.5 px-4">Type de Dépendance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono">
              {filteredDeps.map((item) => (
                <tr key={item.name} className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-2.5 px-4 font-bold text-slate-800">{item.name}</td>
                  <td className="py-2.5 px-4 font-semibold text-emerald-700">{item.ver}</td>
                  <td className="py-2.5 px-4">
                    <span
                      className={`inline-block px-2 py-0.5 rounded text-[10px] font-sans font-bold ${
                        item.type === 'Production' ? 'bg-blue-50 text-blue-700 border border-blue-200' : 'bg-slate-100 text-slate-600 border border-slate-200'
                      }`}
                    >
                      {item.type}
                    </span>
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
