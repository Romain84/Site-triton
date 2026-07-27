'use client'

import { useState, useEffect } from 'react'
import { useToast } from '@/hooks/useToast'
import { formatLongDateFr } from '@/lib/date'

interface Podium {
  id: string
  nageurNom: string
  categorie?: string | null
  epreuve?: string | null
  place: number
  estVirtuel: boolean
  competition: string
  date: string
  temps?: string | null
}

interface NageurStats {
  total: number
  or: number
  argent: number
  bronze: number
  virtuels: number
  podiums: Podium[]
}

export default function PodiumsManager() {
  const toast = useToast()
  const [loading, setLoading] = useState(true)
  const [podiums, setPodiums] = useState<Podium[]>([])
  const [statsParNageur, setStatsParNageur] = useState<Record<string, NageurStats>>({})
  const [filterNageur, setFilterNageur] = useState('')

  useEffect(() => {
    fetchPodiums()
  }, [])

  const fetchPodiums = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/podiums')
      if (res.ok) {
        const data = await res.json()
        setPodiums(data.data?.podiums || [])
        setStatsParNageur(data.data?.statsParNageur || {})
      }
    } catch {
      toast.error('Erreur lors du chargement du bilan des podiums.')
    } finally {
      setLoading(false)
    }
  }

  const filteredNageurs = Object.keys(statsParNageur).filter((nom) =>
    nom.toLowerCase().includes(filterNageur.toLowerCase())
  )

  if (loading) {
    return <p className="text-slate-600 font-medium">Chargement du bilan des podiums de la saison...</p>
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">🏅 Bilan des Podiums & Palmarès de la Saison</h2>
          <p className="text-sm text-slate-600 mt-1">
            Sauvegarde automatique des podiums officiels et virtuels (par année d'âge J14, J15, J16...) extraits par l'IA.
          </p>
        </div>
        <div className="bg-slate-900 text-white px-4 py-2.5 rounded-xl font-bold text-sm shadow-xs flex items-center gap-2">
          <span>🏆 Total Podiums Saison :</span>
          <span className="text-amber-400 text-base">{podiums.length}</span>
        </div>
      </div>

      {/* Filtre de recherche */}
      <div className="card p-4 bg-white border border-slate-200 rounded-xl">
        <input
          type="text"
          value={filterNageur}
          onChange={(e) => setFilterNageur(e.target.value)}
          placeholder="🔍 Rechercher un nageur..."
          className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm outline-none focus:border-slate-800"
        />
      </div>

      {/* Palmarès par Nageur */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredNageurs.length === 0 ? (
          <div className="col-span-2 text-center py-12 bg-slate-50 border border-dashed border-slate-300 rounded-xl text-slate-500">
            Aucun podium enregistré pour le moment cette saison. Les podiums s'ajouteront automatiquement lors de la génération d'articles de compétition !
          </div>
        ) : (
          filteredNageurs.map((nom) => {
            const stat = statsParNageur[nom]
            return (
              <div key={nom} className="card p-5 bg-white border border-slate-200 rounded-2xl shadow-2xs space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <h3 className="font-bold text-lg text-slate-900 flex items-center gap-2">
                    <span>🏊‍♂️</span> {nom}
                  </h3>
                  <div className="flex items-center gap-1.5 text-xs font-bold">
                    {stat.or > 0 && <span className="px-2 py-0.5 bg-amber-100 text-amber-800 rounded-md">🥇 {stat.or}</span>}
                    {stat.argent > 0 && <span className="px-2 py-0.5 bg-slate-200 text-slate-800 rounded-md">🥈 {stat.argent}</span>}
                    {stat.bronze > 0 && <span className="px-2 py-0.5 bg-amber-900/10 text-amber-900 rounded-md">🥉 {stat.bronze}</span>}
                  </div>
                </div>

                <div className="space-y-2">
                  {stat.podiums.map((pod) => (
                    <div key={pod.id} className="text-xs p-2.5 bg-slate-50 border border-slate-200/60 rounded-xl flex items-center justify-between">
                      <div>
                        <span className="font-bold text-slate-800">{pod.epreuve}</span>
                        {pod.temps && <span className="text-slate-500 ml-1 font-mono">({pod.temps})</span>}
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          {pod.competition} • {formatLongDateFr(pod.date)}
                        </p>
                      </div>
                      <div className="text-right">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          pod.place === 1 ? 'bg-amber-400 text-slate-950' : pod.place === 2 ? 'bg-slate-300 text-slate-900' : 'bg-amber-700 text-white'
                        }`}>
                          {pod.place === 1 ? '1er (Or)' : pod.place === 2 ? '2e (Arg)' : '3e (Br)'}
                        </span>
                        {pod.estVirtuel && (
                          <span className="block text-[9px] font-bold text-purple-700 mt-0.5">
                            📊 Année {pod.categorie}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
