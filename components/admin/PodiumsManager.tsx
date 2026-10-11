'use client'

import { useState, useEffect, useMemo } from 'react'
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
  const [competitions, setCompetitions] = useState<string[]>([])
  const [selectedCompetition, setSelectedCompetition] = useState<string>('')
  const [activeTab, setActiveTab] = useState<'scratch' | 'categorie'>('scratch')
  const [filterNageur, setFilterNageur] = useState('')
  const [actionLoading, setActionLoading] = useState(false)

  useEffect(() => {
    fetchPodiums()
  }, [])

  const fetchPodiums = async (compFilter = selectedCompetition) => {
    setLoading(true)
    try {
      const url = compFilter ? `/api/admin/podiums?competition=${encodeURIComponent(compFilter)}` : '/api/admin/podiums'
      const res = await fetch(url)
      if (res.ok) {
        const data = await res.json()
        const rawPodiums: Podium[] = data.podiums || data.data?.podiums || []
        const rawComps = data.competitions || data.data?.competitions || []
        setPodiums(rawPodiums)
        if (rawComps.length > 0) {
          setCompetitions(rawComps)
        }
      }
    } catch {
      toast.error('Erreur lors du chargement du bilan des podiums.')
    } finally {
      setLoading(false)
    }
  }

  const handleSelectCompetition = (comp: string) => {
    setSelectedCompetition(comp)
    fetchPodiums(comp)
  }

  const handleDeletePodium = async (id: string) => {
    if (!confirm('Supprimer ce podium du palmarès ?')) return
    setActionLoading(true)
    try {
      const res = await fetch(`/api/admin/podiums?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
      })
      if (res.ok) {
        toast.success('Podium supprimé du palmarès.')
        await fetchPodiums()
      } else {
        toast.error('Erreur lors de la suppression.')
      }
    } catch {
      toast.error('Erreur réseau lors de la suppression.')
    } finally {
      setActionLoading(false)
    }
  }

  const handleDeleteCompetitionPodiums = async () => {
    if (!selectedCompetition) return
    const confirmed = confirm(
      `⚠️ Êtes-vous sûr de vouloir supprimer TOUS les podiums enregistrés pour la compétition "${selectedCompetition}" ?`
    )
    if (!confirmed) return

    setActionLoading(true)
    try {
      const res = await fetch(`/api/admin/podiums?competition=${encodeURIComponent(selectedCompetition)}`, {
        method: 'DELETE',
      })
      if (res.ok) {
        toast.success(`Tous les podiums de la compétition "${selectedCompetition}" ont été supprimés.`)
        setSelectedCompetition('')
        await fetchPodiums('')
      } else {
        toast.error('Erreur lors de la suppression des podiums de la compétition.')
      }
    } catch {
      toast.error('Erreur réseau.')
    } finally {
      setActionLoading(false)
    }
  }

  const handleDeleteSwimmerPodiums = async (nom: string) => {
    const isScratch = activeTab === 'scratch'
    const labelType = isScratch ? 'scratch' : 'par catégorie'
    const confirmed = confirm(`Supprimer tous les podiums (${labelType}) de ${nom} ?`)
    if (!confirmed) return

    setActionLoading(true)
    try {
      const res = await fetch(`/api/admin/podiums?nageurNom=${encodeURIComponent(nom)}`, {
        method: 'DELETE',
      })
      if (res.ok) {
        toast.success(`Podiums de ${nom} supprimés.`)
        await fetchPodiums()
      } else {
        toast.error('Erreur lors de la suppression.')
      }
    } catch {
      toast.error('Erreur réseau.')
    } finally {
      setActionLoading(false)
    }
  }

  const handlePurgeAll = async () => {
    const promptValue = prompt(
      '⚠️ ATTENTION : Vous allez supprimer L\'INTÉGRALITÉ des podiums et du palmarès du club cette saison.\nPour confirmer, tapez SUPPRIMER ci-dessous :'
    )
    if (promptValue !== 'SUPPRIMER') {
      if (promptValue !== null) toast.error('Confirmation incorrecte. Opération annulée.')
      return
    }

    setActionLoading(true)
    try {
      const res = await fetch('/api/admin/podiums?purge=true', {
        method: 'DELETE',
      })
      if (res.ok) {
        toast.success('Tout le palmarès a été réinitialisé.')
        setSelectedCompetition('')
        await fetchPodiums('')
      } else {
        toast.error('Erreur lors de la réinitialisation.')
      }
    } catch {
      toast.error('Erreur réseau.')
    } finally {
      setActionLoading(false)
    }
  }

  // Filtrage selon l'onglet actif (Scratch vs Par Catégorie)
  const scratchPodiums = useMemo(() => podiums.filter(p => !p.estVirtuel), [podiums])
  const categoryPodiums = useMemo(() => podiums.filter(p => p.estVirtuel), [podiums])

  const displayedPodiums = activeTab === 'scratch' ? scratchPodiums : categoryPodiums

  // Groupement des statistiques par nageur pour l'onglet actif
  const statsParNageur = useMemo(() => {
    const stats: Record<string, NageurStats> = {}
    for (const pod of displayedPodiums) {
      const nom = pod.nageurNom
      if (!stats[nom]) {
        stats[nom] = { total: 0, or: 0, argent: 0, bronze: 0, virtuels: 0, podiums: [] }
      }
      stats[nom].total += 1
      if (pod.place === 1) stats[nom].or += 1
      if (pod.place === 2) stats[nom].argent += 1
      if (pod.place === 3) stats[nom].bronze += 1
      if (pod.estVirtuel) stats[nom].virtuels += 1
      stats[nom].podiums.push(pod)
    }
    return stats
  }, [displayedPodiums])

  const filteredNageurs = useMemo(() => {
    return Object.keys(statsParNageur).filter((nom) =>
      nom.toLowerCase().includes(filterNageur.toLowerCase())
    )
  }, [statsParNageur, filterNageur])

  if (loading && podiums.length === 0) {
    return <p className="text-slate-600 font-medium">Chargement du bilan des podiums de la saison...</p>
  }

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">🏅 Bilan des Podiums & Palmarès de la Saison</h2>
          <p className="text-sm text-slate-600 mt-1">
            Classement officiel de la saison séparé en médailles <strong>Scratch</strong> et performances <strong>Par Catégorie</strong>.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => fetchPodiums()}
            disabled={actionLoading}
            className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all cursor-pointer disabled:opacity-50"
            title="Rafraîchir les podiums"
          >
            🔄 Actualiser
          </button>

          {podiums.length > 0 && (
            <button
              type="button"
              onClick={handlePurgeAll}
              disabled={actionLoading}
              className="px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold rounded-xl transition-all cursor-pointer"
              title="Vider tous les podiums"
            >
              🗑️ Vider tout le palmarès
            </button>
          )}

          <div className="bg-slate-900 text-white px-4 py-2 rounded-xl font-bold text-sm shadow-xs flex items-center gap-2">
            <span>🏆 Total Saison :</span>
            <span className="text-amber-400 text-base">{podiums.length}</span>
          </div>
        </div>
      </div>

      {/* Les 2 Onglets Principaux : Scratch et Par Catégorie */}
      <div className="flex border-b border-slate-200 gap-2">
        <button
          type="button"
          onClick={() => setActiveTab('scratch')}
          className={`pb-3 pt-2 px-5 text-sm font-bold border-b-2 transition-all flex items-center gap-2.5 cursor-pointer ${
            activeTab === 'scratch'
              ? 'border-amber-500 text-amber-700 font-extrabold'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <span>🥇 Podiums Scratch</span>
          <span
            className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
              activeTab === 'scratch' ? 'bg-amber-100 text-amber-900' : 'bg-slate-100 text-slate-600'
            }`}
          >
            {scratchPodiums.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('categorie')}
          className={`pb-3 pt-2 px-5 text-sm font-bold border-b-2 transition-all flex items-center gap-2.5 cursor-pointer ${
            activeTab === 'categorie'
              ? 'border-purple-600 text-purple-700 font-extrabold'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <span>📊 Podiums Par Catégorie (Année d&apos;âge)</span>
          <span
            className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
              activeTab === 'categorie' ? 'bg-purple-100 text-purple-900' : 'bg-slate-100 text-slate-600'
            }`}
          >
            {categoryPodiums.length}
          </span>
        </button>
      </div>

      {/* Barre de filtres et d'actions par compétition */}
      <div className="card p-4 bg-white border border-slate-200 rounded-xl flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="w-full md:w-1/2">
          <input
            type="text"
            value={filterNageur}
            onChange={(e) => setFilterNageur(e.target.value)}
            placeholder={`🔍 Rechercher un nageur (${activeTab === 'scratch' ? 'Scratch' : 'Catégorie'})...`}
            className="w-full px-3.5 py-2 border border-slate-300 rounded-lg text-sm outline-none focus:border-slate-800"
          />
        </div>

        <div className="w-full md:w-1/2 flex items-center gap-2 justify-end">
          <select
            value={selectedCompetition}
            onChange={(e) => handleSelectCompetition(e.target.value)}
            className="px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white text-slate-800 outline-none focus:border-slate-800 flex-1 max-w-xs"
          >
            <option value="">Toutes les compétitions</option>
            {competitions.map((comp) => (
              <option key={comp} value={comp}>
                {comp}
              </option>
            ))}
          </select>

          {selectedCompetition && (
            <button
              type="button"
              onClick={handleDeleteCompetitionPodiums}
              disabled={actionLoading}
              className="px-3 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-lg transition-colors whitespace-nowrap cursor-pointer shadow-xs disabled:opacity-50"
              title={`Supprimer tous les podiums de ${selectedCompetition}`}
            >
              🗑️ Supprimer cette compète
            </button>
          )}
        </div>
      </div>

      {/* Description de l'onglet actif */}
      <div className="px-4 py-2.5 rounded-xl text-xs font-medium border flex items-center gap-2 bg-slate-50 text-slate-700 border-slate-200">
        {activeTab === 'scratch' ? (
          <>
            <span className="text-base">🥇</span>
            <span>
              <strong>Onglet Scratch</strong> : Présente les médailles obtenues au classement général absolu de chaque course (tous âges et clubs réunis).
            </span>
          </>
        ) : (
          <>
            <span className="text-base">📊</span>
            <span>
              <strong>Onglet Par Catégorie</strong> : Valorise les jeunes nageurs classés dans le Top 3 de leur propre année de naissance (Avenirs, Benjamins 2013-2014, Juniors 2009-2012).
            </span>
          </>
        )}
      </div>

      {/* Palmarès par Nageur */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredNageurs.length === 0 ? (
          <div className="col-span-2 text-center py-12 bg-slate-50 border border-dashed border-slate-300 rounded-xl text-slate-500">
            {displayedPodiums.length === 0
              ? activeTab === 'scratch'
                ? "Aucun podium scratch officiel enregistré pour le moment."
                : "Aucun podium par catégorie d'âge enregistré pour le moment."
              : "Aucun résultat ne correspond à votre recherche."}
          </div>
        ) : (
          filteredNageurs.map((nom) => {
            const stat = statsParNageur[nom]
            return (
              <div key={nom} className="card p-5 bg-white border border-slate-200 rounded-2xl shadow-2xs space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{activeTab === 'scratch' ? '🏊‍♂️' : '🌟'}</span>
                    <div>
                      <h3 className="font-bold text-base text-slate-900 leading-tight">{nom}</h3>
                      <p className="text-[11px] text-slate-500">
                        {stat.total} podium{stat.total > 1 ? 's' : ''} ({activeTab === 'scratch' ? 'Scratch' : 'par catégorie'})
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1 text-xs font-bold">
                      {stat.or > 0 && <span className="px-2 py-0.5 bg-amber-100 text-amber-800 rounded-md">🥇 {stat.or}</span>}
                      {stat.argent > 0 && <span className="px-2 py-0.5 bg-slate-200 text-slate-800 rounded-md">🥈 {stat.argent}</span>}
                      {stat.bronze > 0 && <span className="px-2 py-0.5 bg-amber-900/10 text-amber-900 rounded-md">🥉 {stat.bronze}</span>}
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDeleteSwimmerPodiums(nom)}
                      disabled={actionLoading}
                      className="p-1 text-slate-400 hover:text-rose-600 transition-colors text-xs ml-1 cursor-pointer"
                      title={`Supprimer tous les podiums de ${nom}`}
                    >
                      🗑️
                    </button>
                  </div>
                </div>

                <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                  {stat.podiums.map((pod) => (
                    <div key={pod.id} className="text-xs p-2.5 bg-slate-50 border border-slate-200/60 rounded-xl flex items-center justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-slate-800 truncate">{pod.epreuve}</p>
                        <p className="text-[11px] text-slate-500 mt-0.5 truncate">
                          {pod.competition} • {pod.temps ? <span className="font-mono font-semibold text-slate-700">{pod.temps}</span> : ''} • {formatLongDateFr(pod.date)}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <div className="text-right">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            pod.place === 1 ? 'bg-amber-400 text-slate-950' : pod.place === 2 ? 'bg-slate-300 text-slate-900' : 'bg-amber-700 text-white'
                          }`}>
                            {pod.place === 1 ? '1er (Or)' : pod.place === 2 ? '2e (Arg)' : '3e (Br)'}
                          </span>
                          {pod.estVirtuel && (
                            <span className="block text-[9px] font-bold text-purple-700 mt-0.5">
                              📊 {pod.categorie || 'Catégorie'}
                            </span>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={() => handleDeletePodium(pod.id)}
                          disabled={actionLoading}
                          className="text-slate-400 hover:text-rose-600 transition-colors p-1 text-xs cursor-pointer"
                          title="Supprimer ce résultat"
                        >
                          ✕
                        </button>
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
