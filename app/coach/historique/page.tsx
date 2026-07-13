'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import CoachNav from '@/components/coach/CoachNav'
import { getErrorMessage } from '@/lib/utils'

interface Facture {
  id: string
  numero: string
  mois: number
  annee: number
  montantTotal: number
  statut: string
  createdAt: string
}

export default function HistoriquePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [factures, setFactures] = useState<Facture[]>([])
  const [selectedAnnee, setSelectedAnnee] = useState(new Date().getFullYear())
  const [selectedStatut, setSelectedStatut] = useState('')

  const fetchFactures = useCallback(async () => {
    setLoading(true)
    setError('')

    try {
      const params = new URLSearchParams()
      params.append('annee', selectedAnnee.toString())
      if (selectedStatut) {
        params.append('statut', selectedStatut)
      }
      const response = await fetch(`/api/coach/facturation/historique?${params}`)

      if (response.status === 401) {
        router.push('/coach/login')
        return
      }

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Erreur lors du chargement')
      }

      setFactures(data.factures)
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }, [router, selectedAnnee, selectedStatut])

  useEffect(() => {
    fetchFactures()
  }, [fetchFactures])

  const handleDownloadPDF = async (mois: number, annee: number) => {
    try {
      const response = await fetch('/api/coach/facturation/generer-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mois, annee }),
      })

      if (!response.ok) {
        const result = await response.json()
        throw new Error(result.error || 'Erreur lors de la génération')
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `facture-${mois}-${annee}.pdf`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)
    } catch (err) {
      setError(getErrorMessage(err))
    }
  }

  const moisNoms = [
    'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
    'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
  ]

  const currentDate = new Date()
  const annees = Array.from({ length: 10 }, (_, i) => currentDate.getFullYear() - 5 + i)

  const getStatutColor = (statut: string) => {
    switch (statut) {
      case 'brouillon':
        return 'bg-slate-50 text-slate-700 border-slate-200/40'
      case 'generee':
        return 'bg-blue-50 text-blue-800 border-blue-200/40'
      case 'envoyee':
        return 'bg-green-50 text-green-800 border-green-200/40'
      case 'payee':
        return 'bg-purple-50 text-purple-800 border-purple-200/40'
      default:
        return 'bg-slate-50 text-slate-700 border-slate-200/40'
    }
  }

  const getStatutLabel = (statut: string) => {
    switch (statut) {
      case 'brouillon':
        return 'Brouillon'
      case 'generee':
        return 'Générée'
      case 'envoyee':
        return 'Envoyée'
      case 'payee':
        return 'Payée'
      default:
        return statut
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen py-8 bg-gray-50">
        <div className="container mx-auto px-4">
          <CoachNav />
          <div className="text-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-gray-650 font-medium">Chargement de l&apos;historique...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen py-8 bg-gray-50 animate-fade-in-up text-slate-800">
      <div className="container mx-auto px-4">
        <CoachNav />

        <div className="mb-8">
          <h1 className="text-4xl font-extrabold tracking-tight text-slate-900">Historique des factures</h1>
          <p className="text-slate-500 text-sm mt-1">Retrouvez et téléchargez vos factures mensuelles archivées.</p>
        </div>

        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6 rounded-2xl shadow-xs">
            <p className="text-red-700 font-medium">{error}</p>
          </div>
        )}

        {/* Filtres */}
        <div className="card p-6 mb-8 bg-white/80 backdrop-blur-md">
          <h2 className="text-xs font-bold text-slate-450 uppercase tracking-widest mb-4">Filtres de recherche</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-550 uppercase tracking-wider mb-2">
                Année
              </label>
              <select
                value={selectedAnnee}
                onChange={(e) => setSelectedAnnee(Number(e.target.value))}
                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl bg-slate-50/50 hover:bg-slate-50/80 focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm font-semibold text-slate-800 outline-none"
              >
                {annees.map((annee) => (
                  <option key={annee} value={annee}>
                    {annee}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-550 uppercase tracking-wider mb-2">
                Statut
              </label>
              <select
                value={selectedStatut}
                onChange={(e) => setSelectedStatut(e.target.value)}
                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl bg-slate-50/50 hover:bg-slate-50/80 focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm font-semibold text-slate-800 outline-none"
              >
                <option value="">Tous les statuts</option>
                <option value="brouillon">Brouillon</option>
                <option value="generee">Générée</option>
                <option value="envoyee">Envoyée</option>
                <option value="payee">Payée</option>
              </select>
            </div>
            <div className="flex items-end">
              <button
                type="button"
                onClick={() => {
                  setSelectedAnnee(new Date().getFullYear())
                  setSelectedStatut('')
                }}
                className="w-full px-4 py-2.5 border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 transition-all duration-200 font-bold text-xs uppercase tracking-wider active:scale-[0.98]"
              >
                Réinitialiser
              </button>
            </div>
          </div>
        </div>

        {/* Liste des factures */}
        {factures.length === 0 ? (
          <div className="card p-8 text-center text-slate-500 font-semibold bg-white/85">
            <p>Aucune facture trouvée pour ces critères</p>
          </div>
        ) : (
          <>
            {/* Vue Desktop - Table */}
            <div className="hidden md:block card overflow-hidden bg-white/95">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200/60 text-slate-450 font-bold uppercase text-[10px] tracking-wider select-none">
                      <th className="text-left py-4 px-6">
                        Numéro
                      </th>
                      <th className="text-left py-4 px-6">
                        Période
                      </th>
                      <th className="text-right py-4 px-6">
                        Montant
                      </th>
                      <th className="text-center py-4 px-6">
                        Statut
                      </th>
                      <th className="text-center py-4 px-6">
                        Date de création
                      </th>
                      <th className="text-center py-4 px-6">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700 font-semibold">
                    {factures.map((facture) => (
                      <tr key={facture.id} className="hover:bg-slate-50/20 transition-colors">
                        <td className="py-4 px-6 font-mono text-xs text-slate-500">
                          {facture.numero}
                        </td>
                        <td className="py-4 px-6">
                          {moisNoms[facture.mois - 1]} {facture.annee}
                        </td>
                        <td className="py-4 px-6 text-right font-extrabold text-slate-900">
                          {facture.montantTotal.toFixed(2)}€
                        </td>
                        <td className="py-4 px-6 text-center">
                          <span className={`inline-block text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 border rounded-md ${getStatutColor(facture.statut)}`}>
                            {getStatutLabel(facture.statut)}
                          </span>
                        </td>
                        <td className="py-4 px-6 text-center text-xs text-slate-500">
                          {new Date(facture.createdAt).toLocaleDateString('fr-FR')}
                        </td>
                        <td className="py-4 px-6 text-center">
                          <div className="flex items-center justify-center gap-3">
                            <button
                              onClick={() => router.push(`/coach/facturation?mois=${facture.mois}&annee=${facture.annee}`)}
                              className="text-primary hover:text-primary-dark text-xs font-bold uppercase tracking-wider transition-colors"
                            >
                              Voir
                            </button>
                            <span className="text-slate-200">|</span>
                            <button
                              onClick={() => handleDownloadPDF(facture.mois, facture.annee)}
                              className="text-slate-500 hover:text-slate-800 text-xs font-bold uppercase tracking-wider transition-colors"
                            >
                              Télécharger
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Vue Mobile - Cards */}
            <div className="md:hidden space-y-4">
              {factures.map((facture) => (
                <div key={facture.id} className="card p-5 bg-white hover:border-slate-350 hover:shadow-md hover:shadow-slate-100/50 hover:-translate-y-1 transition-all duration-300 relative overflow-hidden">
                  <div className="flex items-start justify-between mb-4 gap-4">
                    <div>
                      <p className="font-mono text-xs text-slate-400 select-none leading-none mb-1">{facture.numero}</p>
                      <p className="font-bold text-lg text-slate-900 leading-tight">{moisNoms[facture.mois - 1]} {facture.annee}</p>
                    </div>
                    <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 border rounded-md shrink-0 ${getStatutColor(facture.statut)}`}>
                      {getStatutLabel(facture.statut)}
                    </span>
                  </div>
                  <div className="space-y-2 mb-5">
                    <div className="flex justify-between items-center text-sm font-semibold text-slate-650">
                      <span>Montant:</span>
                      <span className="font-extrabold text-primary text-base">{facture.montantTotal.toFixed(2)}€</span>
                    </div>
                    <div className="flex justify-between items-center text-xs font-semibold text-slate-500">
                      <span>Créée le:</span>
                      <span>{new Date(facture.createdAt).toLocaleDateString('fr-FR')}</span>
                    </div>
                  </div>
                  <div className="flex gap-2.5">
                    <button
                      onClick={() => router.push(`/coach/facturation?mois=${facture.mois}&annee=${facture.annee}`)}
                      className="flex-1 px-4 py-2.5 bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 transition-colors text-xs font-bold uppercase tracking-wider text-center"
                    >
                      Voir
                    </button>
                    <button
                      onClick={() => handleDownloadPDF(facture.mois, facture.annee)}
                      className="flex-1 px-4 py-2.5 bg-primary text-white rounded-xl hover:bg-primary-dark transition-colors text-xs font-bold uppercase tracking-wider text-center shadow-sm"
                    >
                      PDF
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Statistiques récapitulatives */}
        {factures.length > 0 && (
          <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="card p-6 text-center bg-white/90 backdrop-blur-xs">
              <p className="text-xs font-bold text-slate-450 uppercase tracking-widest mb-2">Total factures</p>
              <p className="text-3xl font-black text-primary">{factures.length}</p>
            </div>
            <div className="card p-6 text-center bg-white/90 backdrop-blur-xs">
              <p className="text-xs font-bold text-slate-450 uppercase tracking-widest mb-2">Montant total</p>
              <p className="text-3xl font-black text-primary">
                {factures.reduce((sum, f) => sum + f.montantTotal, 0).toFixed(2)}€
              </p>
            </div>
            <div className="card p-6 text-center bg-white/90 backdrop-blur-xs">
              <p className="text-xs font-bold text-slate-450 uppercase tracking-widest mb-2">Factures envoyées</p>
              <p className="text-3xl font-black text-primary">
                {factures.filter((f) => f.statut === 'envoyee').length}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
