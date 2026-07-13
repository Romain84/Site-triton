'use client'

import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { HelpTooltip } from '@/components/ui/Tooltip'

interface Coach {
  id: string
  prenom: string
  nom: string | null
  email: string | null
}

interface Facture {
  id: string
  numero: string
  coachId: string
  coach: Coach
  mois: number
  annee: number
  montantTotal: number
  tauxHoraire: number
  statut: string
  createdAt: string
  updatedAt: string
  _count?: {
    lignes: number
  }
}

const moisNoms = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
]

const statutsLabels: { [key: string]: { label: string; color: string } } = {
  brouillon: { label: 'Brouillon', color: 'bg-gray-100 text-gray-800' },
  generee: { label: 'Générée', color: 'bg-blue-100 text-blue-800' },
  envoyee: { label: 'Envoyée', color: 'bg-yellow-100 text-yellow-800' },
  payee: { label: 'Payée', color: 'bg-green-100 text-green-800' },
}

export default function FacturesManager() {
  const [factures, setFactures] = useState<Facture[]>([])
  const [loading, setLoading] = useState(true)
  const [filterStatut, setFilterStatut] = useState<string>('all')
  const [filterCoach, setFilterCoach] = useState<string>('all')
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  
  // États pour le Drawer de prévisualisation
  const [selectedFactureId, setSelectedFactureId] = useState<string | null>(null)
  const [previewFacture, setPreviewFacture] = useState<any | null>(null)
  const [loadingPreview, setLoadingPreview] = useState(false)

  useEffect(() => {
    fetchFactures()
  }, [])

  const handleOpenPreview = async (factureId: string) => {
    setSelectedFactureId(factureId)
    setLoadingPreview(true)
    setPreviewFacture(null)
    try {
      const response = await fetch(`/api/admin/factures/${factureId}`)
      const data = await response.json()
      if (response.ok) {
        setPreviewFacture(data.facture)
      } else {
        toast.error(data.error || 'Erreur lors du chargement des détails')
        setSelectedFactureId(null)
      }
    } catch {
      toast.error('Erreur réseau lors de la récupération des détails')
      setSelectedFactureId(null)
    } finally {
      setLoadingPreview(false)
    }
  }

  const handleClosePreview = () => {
    setSelectedFactureId(null)
    setPreviewFacture(null)
  }

  const fetchFactures = async () => {
    try {
      const response = await fetch('/api/admin/factures')
      const data = await response.json()
      if (response.ok) {
        setFactures(data.factures || [])
      } else {
        toast.error(data.error || 'Erreur lors du chargement')
      }
    } catch (error) {
      toast.error('Erreur lors du chargement des factures')
    } finally {
      setLoading(false)
    }
  }

  const handleChangeStatut = async (factureId: string, newStatut: string) => {
    try {
      setUpdatingId(factureId)
      const response = await fetch(`/api/admin/factures/${factureId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ statut: newStatut }),
      })

      if (response.ok) {
        toast.success('Statut mis à jour avec succès')
        await fetchFactures()
      } else {
        const data = await response.json()
        toast.error(data.error || 'Erreur lors de la mise à jour')
      }
    } catch (error) {
      toast.error('Erreur lors de la mise à jour du statut')
    } finally {
      setUpdatingId(null)
    }
  }

  const uniqueCoaches = Array.from(
    new Set(factures.map(f => f.coachId))
  ).map(id => factures.find(f => f.coachId === id)!.coach)

  const filteredFactures = factures.filter(f => {
    if (filterStatut !== 'all' && f.statut !== filterStatut) return false
    if (filterCoach !== 'all' && f.coachId !== filterCoach) return false
    return true
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-gray-600">Chargement...</p>
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          Gestion des Factures
          <HelpTooltip title="Factures des coaches">
            <p>Suivi des factures mensuelles des coaches.</p>
            <p className="mt-1"><strong>Statuts :</strong></p>
            <p className="text-gray-400">• Brouillon : en cours de préparation</p>
            <p className="text-blue-400">• Générée : prête à être envoyée</p>
            <p className="text-yellow-400">• Envoyée : en attente de paiement</p>
            <p className="text-green-400">• Payée : règlement effectué</p>
          </HelpTooltip>
        </h2>
      </div>

      {/* Filtres */}
      <div className="card p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Filtrer par statut
            </label>
            <select
              value={filterStatut}
              onChange={(e) => setFilterStatut(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
            >
              <option value="all">Tous les statuts</option>
              <option value="brouillon">Brouillon</option>
              <option value="generee">Générée</option>
              <option value="envoyee">Envoyée</option>
              <option value="payee">Payée</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Filtrer par coach
            </label>
            <select
              value={filterCoach}
              onChange={(e) => setFilterCoach(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
            >
              <option value="all">Tous les coaches</option>
              {uniqueCoaches.map((coach) => (
                <option key={coach.id} value={coach.id}>
                  {coach.prenom} {coach.nom || ''}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Liste des factures */}
      {filteredFactures.length === 0 ? (
        <div className="card p-8 text-center">
          <p className="text-gray-600">Aucune facture trouvée</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredFactures.map((facture) => (
            <div key={facture.id} className="card p-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2 flex-wrap">
                    <h3 className="text-lg font-semibold">
                      {facture.numero}
                    </h3>
                    <span
                      className={`px-3 py-1 rounded-full text-sm font-medium ${
                        statutsLabels[facture.statut]?.color || 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {statutsLabels[facture.statut]?.label || facture.statut}
                    </span>
                    {facture._count && facture._count.lignes > 0 && (
                      <span className="bg-amber-100 text-amber-800 text-xs px-2.5 py-1 rounded-full font-bold border border-amber-200 flex items-center gap-1 animate-pulse">
                        ⚠️ À vérifier (Ajout manuel)
                      </span>
                    )}
                  </div>
                  <div className="text-sm text-gray-600 space-y-1">
                    <p>
                      <strong>Coach:</strong> {facture.coach.prenom} {facture.coach.nom || ''}
                    </p>
                    <p>
                      <strong>Période:</strong> {moisNoms[facture.mois - 1]} {facture.annee}
                    </p>
                    <p>
                      <strong>Montant total:</strong> {facture.montantTotal.toFixed(2)}€
                    </p>
                    <p>
                      <strong>Taux horaire:</strong> {facture.tauxHoraire.toFixed(2)}€/h
                    </p>
                  </div>
                  <div className="mt-4 flex gap-2">
                    <button
                      onClick={() => handleOpenPreview(facture.id)}
                      className="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-gray-50 hover:bg-gray-100 border border-gray-200 text-gray-700 hover:text-gray-900 transition-colors flex items-center gap-1.5"
                    >
                      🔎 Consulter le détail
                    </button>
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-sm font-medium text-gray-700">
                    Changer le statut:
                  </label>
                  <select
                    value={facture.statut}
                    onChange={(e) => handleChangeStatut(facture.id, e.target.value)}
                    disabled={updatingId === facture.id}
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <option value="brouillon">Brouillon</option>
                    <option value="generee">Générée</option>
                    <option value="envoyee">Envoyée</option>
                    <option value="payee">Payée</option>
                  </select>
                  {updatingId === facture.id && (
                    <p className="text-xs text-gray-500 text-center">
                      Mise à jour...
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Légende des statuts */}
      <div className="mt-8 card p-6">
        <h3 className="text-lg font-semibold mb-4">Légende des statuts</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <span className="px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-800">
              Brouillon
            </span>
            <p className="text-xs text-gray-600 mt-2">
              Facture en cours de création, non finalisée
            </p>
          </div>
          <div>
            <span className="px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
              Générée
            </span>
            <p className="text-xs text-gray-600 mt-2">
              Facture générée en PDF, prête à être envoyée
            </p>
          </div>
          <div>
            <span className="px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800">
              Envoyée
            </span>
            <p className="text-xs text-gray-600 mt-2">
              Facture envoyée au club, en attente de paiement
            </p>
          </div>
          <div>
            <span className="px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
              Payée
            </span>
            <p className="text-xs text-gray-600 mt-2">
              Virement reçu, facture réglée
            </p>
          </div>
        </div>
      </div>

      {/* ── Drawer Latéral de Prévisualisation Détaillée (Glassmorphic & Premium) ── */}
      {selectedFactureId && (
        <div className="fixed inset-0 z-50 flex justify-end">
          {/* Overlay flouté */}
          <div
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity duration-300"
            onClick={handleClosePreview}
          />

          {/* Contenu du Drawer */}
          <div className="relative w-full max-w-[550px] h-full bg-white shadow-2xl flex flex-col z-50 animate-slide-in overflow-hidden border-l border-slate-100">
            {/* Header */}
            <div className="px-6 py-5 bg-gradient-to-r from-sky-50 to-white border-b border-slate-100 flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-primary uppercase tracking-widest">
                  Aperçu détaillé
                </span>
                <h3 className="text-xl font-bold text-slate-800 mt-0.5">
                  {loadingPreview ? "Chargement..." : previewFacture?.numero}
                </h3>
              </div>
              <button
                onClick={handleClosePreview}
                className="w-9 h-9 rounded-full hover:bg-slate-100 border border-slate-200 text-slate-400 hover:text-slate-600 flex items-center justify-center transition-all"
                aria-label="Fermer"
              >
                ✕
              </button>
            </div>

            {/* Corps */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {loadingPreview ? (
                // Skeletons de chargement premium
                <div className="animate-pulse space-y-6">
                  <div className="h-20 bg-slate-50 border border-slate-100 rounded-xl" />
                  <div className="space-y-3">
                    <div className="h-4 bg-slate-100 rounded w-1/3" />
                    <div className="h-10 bg-slate-50 rounded" />
                    <div className="h-10 bg-slate-50 rounded" />
                  </div>
                  <div className="space-y-3">
                    <div className="h-4 bg-slate-100 rounded w-1/4" />
                    <div className="h-12 bg-slate-50 rounded" />
                  </div>
                </div>
              ) : previewFacture ? (
                <>
                  {/* Fiche d'identité du coach */}
                  <div className="bg-slate-50 border border-slate-100 p-4 rounded-xl space-y-2">
                    <h4 className="font-semibold text-slate-800 text-sm uppercase tracking-wider">
                      👨‍🏫 Informations Coach
                    </h4>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                      <p className="text-slate-500">Nom :</p>
                      <p className="font-medium text-slate-800">
                        {previewFacture.coach.prenom} {previewFacture.coach.nom || ""}
                      </p>
                      <p className="text-slate-500">Période :</p>
                      <p className="font-medium text-slate-800">
                        {moisNoms[previewFacture.mois - 1]} {previewFacture.annee}
                      </p>
                      {previewFacture.coach.siret && (
                        <>
                          <p className="text-slate-500">SIRET :</p>
                          <p className="font-medium text-slate-800 font-mono text-xs">
                            {previewFacture.coach.siret}
                          </p>
                        </>
                      )}
                      {previewFacture.coach.email && (
                        <>
                          <p className="text-slate-500">Email :</p>
                          <p className="font-medium text-slate-800 truncate">
                            {previewFacture.coach.email}
                          </p>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Lignes du Planning Fixe */}
                  <div className="space-y-3">
                    <h4 className="font-bold text-slate-900 text-sm border-b border-slate-100 pb-1.5 flex items-center justify-between">
                      🗓️ Planning Fixe
                      <span className="text-xs bg-sky-50 text-primary px-2 py-0.5 rounded-full font-medium">
                        {previewFacture.lignes
                          .filter((l: any) => l.type === "planning_fixe")
                          .reduce((sum: number, l: any) => sum + (l.heures ?? 0), 0)
                          .toFixed(1)}h
                      </span>
                    </h4>
                    <div className="space-y-2">
                      {previewFacture.lignes.filter((l: any) => l.type === "planning_fixe").length === 0 ? (
                        <p className="text-sm text-slate-400 italic">Aucune heure de planning fixe.</p>
                      ) : (
                        previewFacture.lignes
                          .filter((l: any) => l.type === "planning_fixe")
                          .map((l: any) => (
                            <div key={l.id} className="border border-slate-100 p-3 rounded-lg flex items-center justify-between bg-white text-sm">
                              <p className="font-medium text-slate-700 pr-4">{l.description}</p>
                              <div className="text-right shrink-0">
                                <p className="font-bold text-slate-800">{l.heures?.toFixed(1)}h</p>
                                <p className="text-xs text-slate-400">+{l.montant?.toFixed(0)}€</p>
                              </div>
                            </div>
                          ))
                      )}
                    </div>
                  </div>

                  {/* Lignes de Remplacements Effectués */}
                  <div className="space-y-3">
                    <h4 className="font-bold text-slate-900 text-sm border-b border-slate-100 pb-1.5 flex items-center justify-between">
                      ➕ Remplacements Effectués
                      <span className="text-xs bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full font-medium">
                        +{previewFacture.lignes
                          .filter((l: any) => l.type === "remplacement")
                          .reduce((sum: number, l: any) => sum + (l.heures ?? 0), 0)
                          .toFixed(1)}h
                      </span>
                    </h4>
                    <div className="space-y-2">
                      {previewFacture.lignes.filter((l: any) => l.type === "remplacement").length === 0 ? (
                        <p className="text-sm text-slate-400 italic">Aucun remplacement effectué.</p>
                      ) : (
                        previewFacture.lignes
                          .filter((l: any) => l.type === "remplacement")
                          .map((l: any) => (
                            <div key={l.id} className="border border-emerald-100 p-3 rounded-lg flex items-center justify-between bg-emerald-50/20 text-sm">
                              <p className="font-medium text-emerald-800 pr-4">{l.description}</p>
                              <div className="text-right shrink-0">
                                <p className="font-bold text-emerald-800">+{l.heures?.toFixed(1)}h</p>
                                <p className="text-xs text-emerald-600">+{l.montant?.toFixed(0)}€</p>
                              </div>
                            </div>
                          ))
                      )}
                    </div>
                  </div>

                  {/* Lignes d'Absences */}
                  <div className="space-y-3">
                    <h4 className="font-bold text-slate-900 text-sm border-b border-slate-100 pb-1.5 flex items-center justify-between">
                      ➖ Absences à Déduire
                      <span className="text-xs bg-red-50 text-red-700 px-2 py-0.5 rounded-full font-medium">
                        {previewFacture.lignes
                          .filter((l: any) => l.type === "absence")
                          .reduce((sum: number, l: any) => sum + (l.heures ?? 0), 0)
                          .toFixed(1)}h
                      </span>
                    </h4>
                    <div className="space-y-2">
                      {previewFacture.lignes.filter((l: any) => l.type === "absence").length === 0 ? (
                        <p className="text-sm text-slate-400 italic">Aucune absence déduite.</p>
                      ) : (
                        previewFacture.lignes
                          .filter((l: any) => l.type === "absence")
                          .map((l: any) => (
                            <div key={l.id} className="border border-red-100 p-3 rounded-lg flex items-center justify-between bg-red-50/20 text-sm">
                              <p className="font-medium text-red-800 pr-4">{l.description}</p>
                              <div className="text-right shrink-0">
                                <p className="font-bold text-red-800">-{Math.abs(l.heures ?? 0).toFixed(1)}h</p>
                                <p className="text-xs text-red-600">-{Math.abs(l.montant ?? 0).toFixed(0)}€</p>
                              </div>
                            </div>
                          ))
                      )}
                    </div>
                  </div>

                  {/* Autres Forfaits & Lignes */}
                  {previewFacture.lignes.filter((l: any) => !["planning_fixe", "remplacement", "absence"].includes(l.type)).length > 0 && (
                    <div className="space-y-3">
                      <h4 className="font-bold text-slate-900 text-sm border-b border-slate-100 pb-1.5">
                        🏆 Autres Forfaits & Activités
                      </h4>
                      <div className="space-y-2">
                        {previewFacture.lignes
                          .filter((l: any) => !["planning_fixe", "remplacement", "absence"].includes(l.type))
                          .map((l: any) => (
                            <div key={l.id} className="border border-slate-100 p-3 rounded-lg flex items-center justify-between bg-white text-sm">
                              <p className="font-medium text-slate-700 pr-4">{l.description}</p>
                              <div className="text-right shrink-0">
                                {l.heures && <p className="font-bold text-slate-800">{l.heures.toFixed(1)}h</p>}
                                <p className="text-sm font-bold text-slate-800">{l.montant?.toFixed(0)}€</p>
                              </div>
                            </div>
                          ))}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <p className="text-center text-slate-400 py-12">Aucune donnée trouvée.</p>
              )}
            </div>

            {/* Footer */}
            {previewFacture && (
              <div className="p-6 bg-slate-50 border-t border-slate-100 space-y-4">
                <div className="flex justify-between items-center text-slate-700 text-sm font-medium">
                  <span>Total heures travaillées :</span>
                  <span className="font-bold text-slate-900 text-base">
                    {previewFacture.totalHeures?.toFixed(1)}h
                  </span>
                </div>
                <div className="flex justify-between items-center p-4 bg-sky-50 border border-sky-100 rounded-xl">
                  <span className="font-bold text-slate-700">Total à payer :</span>
                  <div className="text-right">
                    <span className="text-2xl font-black text-primary">
                      {previewFacture.montantTotal?.toFixed(2)}€
                    </span>
                    <p className="text-[10px] text-slate-400 font-medium">
                      Calculé au taux de {previewFacture.tauxHoraire?.toFixed(2)}€/h
                    </p>
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  {/* PDF direct */}
                  {previewFacture.pdfPath && (
                    <a
                      href={previewFacture.pdfPath}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 py-3 text-center text-sm font-semibold rounded-xl border border-slate-200 text-slate-700 bg-white hover:bg-slate-50 hover:text-slate-900 transition-colors flex items-center justify-center gap-1.5"
                    >
                      📄 Ouvrir le PDF
                    </a>
                  )}

                  {/* Bouton de statut contextuel */}
                  <div className="flex-1 flex flex-col gap-1">
                    <select
                      value={previewFacture.statut}
                      onChange={(e) => {
                        handleChangeStatut(previewFacture.id, e.target.value);
                        // Mettre à jour l'état local dans le Drawer
                        setPreviewFacture((prev: any) => ({ ...prev, statut: e.target.value }));
                      }}
                      className="w-full py-3 px-3 text-center text-sm font-semibold rounded-xl border border-slate-300 text-slate-700 bg-white hover:bg-slate-50 focus:ring-2 focus:ring-primary outline-none transition-colors"
                    >
                      <option value="brouillon">Brouillon</option>
                      <option value="generee">Générée</option>
                      <option value="envoyee">Envoyée</option>
                      <option value="payee">Payée</option>
                    </select>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Styles d'animations premium */}
      <style>{`
        @keyframes slide-in {
          from {
            transform: translateX(100%);
          }
          to {
            transform: translateX(0);
          }
        }
        .animate-slide-in {
          animation: slide-in 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .backdrop-blur-xs {
          backdrop-filter: blur(2px);
        }
      `}</style>
    </div>
  )
}

