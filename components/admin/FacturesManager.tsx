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
  pdfPath?: string | null
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

interface CoachEnCoursItem {
  coach: {
    id: string
    prenom: string
    nom: string | null
    email: string | null
    telephone: string | null
    photo: string | null
    siret: string | null
    heuresAdminHebdo?: number | null
  }
  statut: string
  numero: string | null
  factureId: string | null
  pdfPath: string | null
  totalHeures: number
  totalMontant: number
  tauxHoraire: number
  heuresFixes: number
  heuresTournants: number
  heuresRemplacements: number
  heuresAbsences: number
  heuresManuelles: number
  details: any | null
}

const statutsLabels: { [key: string]: { label: string; color: string } } = {
  non_generee: { label: 'En cours (Non générée)', color: 'bg-slate-100 text-slate-700 border border-slate-200' },
  brouillon: { label: 'Brouillon', color: 'bg-gray-100 text-gray-800' },
  generee: { label: 'Générée', color: 'bg-blue-100 text-blue-800' },
  envoyee: { label: 'Envoyée', color: 'bg-yellow-100 text-yellow-800' },
  payee: { label: 'Payée', color: 'bg-green-100 text-green-800' },
}

export default function FacturesManager() {
  const [factures, setFactures] = useState<Facture[]>([])
  const [allCoaches, setAllCoaches] = useState<Coach[]>([])
  const [loading, setLoading] = useState(true)
  const [filterStatut, setFilterStatut] = useState<string>('all')
  const [filterCoach, setFilterCoach] = useState<string>('all')
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  
  // États pour le Drawer de prévisualisation
  const [selectedFactureId, setSelectedFactureId] = useState<string | null>(null)
  const [previewFacture, setPreviewFacture] = useState<any | null>(null)
  const [loadingPreview, setLoadingPreview] = useState(false)

  // États pour la vue par onglet
  const [activeTab, setActiveTab] = useState<'enregistrees' | 'en_cours'>('enregistrees')

  // États pour la vue "En cours (Lecture seule)"
  const [selectedMoisEnCours, setSelectedMoisEnCours] = useState(() => new Date().getMonth() + 1)
  const [selectedAnneeEnCours, setSelectedAnneeEnCours] = useState(() => new Date().getFullYear())
  const [enCoursData, setEnCoursData] = useState<{ coaches: CoachEnCoursItem[]; stats: any } | null>(null)
  const [loadingEnCours, setLoadingEnCours] = useState(false)
  const [readOnlyCoachPreview, setReadOnlyCoachPreview] = useState<CoachEnCoursItem | null>(null)

  // États pour la modale de génération manuelle
  const [showGenerateModal, setShowGenerateModal] = useState(false)
  const [selectedGenCoach, setSelectedGenCoach] = useState('')
  const [selectedGenMois, setSelectedGenMois] = useState(() => new Date().getMonth() + 1)
  const [selectedGenAnnee, setSelectedGenAnnee] = useState(() => new Date().getFullYear())
  const [previewGenDetails, setPreviewGenDetails] = useState<any | null>(null)
  const [loadingGenPreview, setLoadingGenPreview] = useState(false)
  const [generatingAction, setGeneratingAction] = useState<string | null>(null)

  useEffect(() => {
    fetchFactures()
    fetchCoaches()
  }, [])

  const fetchEnCours = async (mois: number, annee: number) => {
    setLoadingEnCours(true)
    try {
      const res = await fetch(`/api/admin/factures/en-cours?mois=${mois}&annee=${annee}`)
      const data = await res.json()
      if (res.ok) {
        setEnCoursData(data)
      } else {
        toast.error(data.error || 'Erreur lors du calcul des factures en cours')
      }
    } catch {
      toast.error('Erreur réseau lors de la récupération des factures en cours')
    } finally {
      setLoadingEnCours(false)
    }
  }

  const handleOpenReadOnlyPreview = (coachItem: CoachEnCoursItem) => {
    if (!coachItem.details) {
      toast.error('Détails de calcul non disponibles pour cet entraîneur')
      return
    }
    setReadOnlyCoachPreview(coachItem)
  }

  const fetchCoaches = async () => {
    try {
      const res = await fetch('/api/admin/coaches')
      const data = await res.json()
      if (res.ok && data.coaches) {
        setAllCoaches(data.coaches.map((c: any) => ({
          id: c.id,
          prenom: c.prenom,
          nom: c.nom,
          email: c.email,
        })))
      }
    } catch {
      // Fallback géré via factures
    }
  }

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

  const handleUnlockFacture = async (factureId: string, numero: string) => {
    if (!window.confirm(`Voulez-vous déverrouiller la facture ${numero} ?\nElle repassera en statut Brouillon et le coach pourra à nouveau modifier ses séances et prestations.`)) {
      return
    }

    try {
      setUpdatingId(factureId)
      const response = await fetch(`/api/admin/factures/${factureId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ statut: 'brouillon' }),
      })

      if (response.ok) {
        toast.success(`Facture ${numero} déverrouillée (repassée en brouillon)`)
        await fetchFactures()
        if (selectedFactureId === factureId) {
          await handleOpenPreview(factureId)
        }
      } else {
        const data = await response.json()
        toast.error(data.error || 'Erreur lors du déverrouillage')
      }
    } catch {
      toast.error('Erreur réseau lors du déverrouillage de la facture')
    } finally {
      setUpdatingId(null)
    }
  }

  const handleDeleteFacture = async (factureId: string, numero: string) => {
    if (!window.confirm(`Êtes-vous sûr de vouloir supprimer définitivement la facture ${numero} ?`)) {
      return
    }

    try {
      const response = await fetch(`/api/admin/factures/${factureId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        toast.success(`Facture ${numero} supprimée avec succès`)
        await fetchFactures()
      } else {
        const data = await response.json()
        toast.error(data.error || 'Erreur lors de la suppression')
      }
    } catch (error) {
      toast.error('Erreur réseau lors de la suppression')
    }
  }

  const handleOpenGenerateModal = () => {
    const defaultCoach = allCoaches.length > 0 ? allCoaches[0].id : (uniqueCoaches.length > 0 ? uniqueCoaches[0].id : '')
    setSelectedGenCoach(defaultCoach)
    const m = new Date().getMonth() + 1
    const a = new Date().getFullYear()
    setSelectedGenMois(m)
    setSelectedGenAnnee(a)
    setShowGenerateModal(true)
    if (defaultCoach) {
      fetchGenPreview(defaultCoach, m, a)
    }
  }

  const fetchGenPreview = async (coachId: string, mois: number, annee: number) => {
    if (!coachId) {
      setPreviewGenDetails(null)
      return
    }
    setLoadingGenPreview(true)
    try {
      const res = await fetch(`/api/admin/factures/generer?coachId=${coachId}&mois=${mois}&annee=${annee}`)
      const data = await res.json()
      if (res.ok && data.details) {
        setPreviewGenDetails(data.details)
      } else {
        setPreviewGenDetails(null)
      }
    } catch {
      setPreviewGenDetails(null)
    } finally {
      setLoadingGenPreview(false)
    }
  }

  const handleGenerateInvoice = async (envoyerClub: boolean) => {
    if (!selectedGenCoach) {
      toast.error('Veuillez sélectionner un coach')
      return
    }
    setGeneratingAction(envoyerClub ? 'send' : 'generate')
    try {
      const res = await fetch('/api/admin/factures/generer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          coachId: selectedGenCoach,
          mois: selectedGenMois,
          annee: selectedGenAnnee,
          envoyerClub,
        }),
      })
      const data = await res.json()
      if (res.ok) {
        toast.success(data.message || (envoyerClub ? 'Facture générée et envoyée au club par e-mail avec succès !' : 'Facture générée avec succès !'))
        setShowGenerateModal(false)
        await fetchFactures()
      } else {
        toast.error(data.error || 'Erreur lors de la génération de la facture')
      }
    } catch {
      toast.error('Erreur réseau lors de la génération')
    } finally {
      setGeneratingAction(null)
    }
  }

  const handleDrawerAction = async (envoyerClub: boolean) => {
    if (!previewFacture) return
    setGeneratingAction(envoyerClub ? 'drawer-send' : 'drawer-generate')
    try {
      const res = await fetch('/api/admin/factures/generer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          factureId: previewFacture.id,
          envoyerClub,
        }),
      })
      const data = await res.json()
      if (res.ok) {
        toast.success(data.message || (envoyerClub ? 'Facture envoyée au club avec succès !' : 'PDF généré avec succès !'))
        await fetchFactures()
        await handleOpenPreview(previewFacture.id)
      } else {
        toast.error(data.error || 'Erreur lors du traitement')
      }
    } catch {
      toast.error('Erreur réseau')
    } finally {
      setGeneratingAction(null)
    }
  }

  const handleQuickSendToClub = async (factureId: string) => {
    setGeneratingAction(`quick-${factureId}`)
    try {
      const res = await fetch('/api/admin/factures/generer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          factureId,
          envoyerClub: true,
        }),
      })
      const data = await res.json()
      if (res.ok) {
        toast.success(data.message || 'Facture envoyée au club par e-mail avec succès !')
        await fetchFactures()
      } else {
        toast.error(data.error || 'Erreur lors de l\'envoi')
      }
    } catch {
      toast.error('Erreur réseau')
    } finally {
      setGeneratingAction(null)
    }
  }

  const uniqueCoaches = Array.from(
    new Set(factures.map(f => f.coachId))
  ).map(id => factures.find(f => f.coachId === id)!.coach)

  const displayCoaches = allCoaches.length > 0 ? allCoaches : uniqueCoaches

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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
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
        <button
          onClick={handleOpenGenerateModal}
          className="px-4 py-2.5 bg-primary hover:bg-primary/90 text-white font-semibold rounded-xl shadow-sm transition-all flex items-center justify-center gap-2 text-sm shrink-0 cursor-pointer"
        >
          <span>✨</span> Générer une facture
        </button>
      </div>

      {/* ── Onglets de Navigation : Factures enregistrées vs Factures en cours ── */}
      <div className="flex border-b border-slate-200 mb-6 gap-2">
        <button
          onClick={() => setActiveTab('enregistrees')}
          className={`pb-3 px-4 font-bold text-sm border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'enregistrees'
              ? 'border-primary text-primary'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <span>📁</span>
          <span>Factures enregistrées</span>
          <span className="ml-1 px-2 py-0.5 rounded-full text-xs bg-slate-100 text-slate-600 font-semibold">
            {factures.length}
          </span>
        </button>

        <button
          onClick={() => {
            setActiveTab('en_cours')
            if (!enCoursData) {
              fetchEnCours(selectedMoisEnCours, selectedAnneeEnCours)
            }
          }}
          className={`pb-3 px-4 font-bold text-sm border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'en_cours'
              ? 'border-primary text-primary'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <span>👁️</span>
          <span>Factures en cours (Lecture seule)</span>
          <span className="ml-1 px-2 py-0.5 rounded-full text-[11px] bg-sky-50 text-sky-700 border border-sky-200 font-bold">
            Temps réel
          </span>
        </button>
      </div>

      {activeTab === 'enregistrees' && (
        <>
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
                  <div className="mt-4 flex gap-2 flex-wrap items-center">
                    <button
                      onClick={() => handleOpenPreview(facture.id)}
                      className="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-gray-50 hover:bg-gray-100 border border-gray-200 text-gray-700 hover:text-gray-900 transition-colors flex items-center gap-1.5"
                    >
                      🔎 Consulter le détail
                    </button>
                    {facture.pdfPath && (
                      <a
                        href={facture.pdfPath}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-sky-50 hover:bg-sky-100 border border-sky-200 text-sky-700 hover:text-sky-900 transition-colors flex items-center gap-1.5"
                      >
                        📄 PDF
                      </a>
                    )}
                    <button
                      onClick={() => handleQuickSendToClub(facture.id)}
                      disabled={generatingAction === `quick-${facture.id}`}
                      className="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 hover:text-emerald-900 transition-colors flex items-center gap-1.5 disabled:opacity-50"
                      title="Générer/mettre à jour le PDF et l'envoyer au club par e-mail"
                    >
                      {generatingAction === `quick-${facture.id}` ? 'Envoi...' : '✉️ Envoyer au club'}
                    </button>
                    {(facture.statut === 'envoyee' || facture.statut === 'payee') && (
                      <button
                        onClick={() => handleUnlockFacture(facture.id, facture.numero)}
                        disabled={updatingId === facture.id}
                        className="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-amber-50 hover:bg-amber-100 border border-amber-300 text-amber-800 transition-colors flex items-center gap-1.5 disabled:opacity-50"
                        title="Repasser en brouillon pour permettre au coach de modifier ses séances"
                      >
                        🔓 Déverrouiller
                      </button>
                    )}
                    <button
                      onClick={() => handleDeleteFacture(facture.id, facture.numero)}
                      className="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-red-50 hover:bg-red-100 border border-red-200 text-red-700 hover:text-red-900 transition-colors flex items-center gap-1.5"
                    >
                      🗑️ Supprimer
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
        </>
      )}

      {/* ── Onglet 2 : Factures en cours (Lecture seule) ── */}
      {activeTab === 'en_cours' && (
        <div className="space-y-6">
          {/* Bannière explicative & rassurance */}
          <div className="bg-sky-50/80 border border-sky-200/80 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <span className="text-2xl mt-0.5">💡</span>
              <div>
                <h4 className="font-bold text-slate-800 text-sm sm:text-base">
                  Mode consultation en temps réel (Strictement en lecture seule)
                </h4>
                <p className="text-xs sm:text-sm text-slate-600 mt-0.5 leading-relaxed">
                  Ce tableau calcule dynamiquement les heures (créneaux fixes, tournants, remplacements, déductions d&apos;absences, compétitions) pour chaque coach actif. <strong>Aucune facture n&apos;est créée ou modifiée en base de données.</strong>
                </p>
              </div>
            </div>
            <button
              onClick={() => fetchEnCours(selectedMoisEnCours, selectedAnneeEnCours)}
              disabled={loadingEnCours}
              className="px-4 py-2 bg-white hover:bg-sky-100 text-sky-800 border border-sky-200 font-semibold rounded-xl text-xs sm:text-sm shadow-2xs transition-all flex items-center gap-2 shrink-0 cursor-pointer disabled:opacity-50"
            >
              <span className={loadingEnCours ? 'animate-spin' : ''}>🔄</span>
              <span>{loadingEnCours ? 'Calcul en cours...' : 'Actualiser'}</span>
            </button>
          </div>

          {/* Filtres Mois & Année */}
          <div className="card p-4 sm:p-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 items-end">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                  Mois de calcul
                </label>
                <select
                  value={selectedMoisEnCours}
                  onChange={(e) => {
                    const m = parseInt(e.target.value, 10)
                    setSelectedMoisEnCours(m)
                    fetchEnCours(m, selectedAnneeEnCours)
                  }}
                  className="w-full px-3 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent text-sm bg-white font-medium"
                >
                  {moisNoms.map((nom, idx) => (
                    <option key={idx} value={idx + 1}>
                      {nom}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                  Année
                </label>
                <select
                  value={selectedAnneeEnCours}
                  onChange={(e) => {
                    const a = parseInt(e.target.value, 10)
                    setSelectedAnneeEnCours(a)
                    fetchEnCours(selectedMoisEnCours, a)
                  }}
                  className="w-full px-3 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent text-sm bg-white font-medium"
                >
                  {[2024, 2025, 2026, 2027].map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2 text-xs text-slate-500 pb-1">
                <span>📅 Période analysée :</span>
                <span className="font-bold text-slate-800">
                  {moisNoms[selectedMoisEnCours - 1]} {selectedAnneeEnCours}
                </span>
              </div>
            </div>
          </div>

          {/* Cartes statistiques globales */}
          {enCoursData?.stats && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="card p-4 border-l-4 border-l-primary">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total prévisionnel</p>
                <p className="text-xl sm:text-2xl font-black text-primary mt-1">
                  {enCoursData.stats.totalMontant.toFixed(2)} €
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">Tous coachs confondus</p>
              </div>

              <div className="card p-4 border-l-4 border-l-sky-400">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Volume d&apos;heures</p>
                <p className="text-xl sm:text-2xl font-black text-slate-800 mt-1">
                  {enCoursData.stats.totalHeures.toFixed(1)} h
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">Heures nettes calculées</p>
              </div>

              <div className="card p-4 border-l-4 border-l-emerald-400">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Coachs avec activité</p>
                <p className="text-xl sm:text-2xl font-black text-emerald-700 mt-1">
                  {enCoursData.stats.coachesActifs} / {enCoursData.stats.totalCoaches}
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">Ayant des heures ou forfaits</p>
              </div>

              <div className="card p-4 border-l-4 border-l-purple-400">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Statut des factures</p>
                <p className="text-xl sm:text-2xl font-black text-purple-700 mt-1">
                  {enCoursData.coaches.filter((c) => c.statut !== 'non_generee').length} générée(s)
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  {enCoursData.coaches.filter((c) => c.statut === 'non_generee').length} en attente
                </p>
              </div>
            </div>
          )}

          {/* Tableau des coachs */}
          {loadingEnCours ? (
            <div className="card p-12 text-center">
              <div className="inline-block animate-spin text-3xl mb-3">🔄</div>
              <p className="font-semibold text-slate-700">Calcul du prévisionnel en cours...</p>
              <p className="text-xs text-slate-400 mt-1">Analyse des plannings, remplacements et absences</p>
            </div>
          ) : !enCoursData || enCoursData.coaches.length === 0 ? (
            <div className="card p-8 text-center text-slate-500">
              <p className="font-medium">Aucun entraîneur actif trouvé.</p>
            </div>
          ) : (
            <div className="card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 border-b border-slate-200 text-xs font-bold uppercase tracking-wider text-slate-600">
                    <tr>
                      <th className="py-3.5 px-4">Coach</th>
                      <th className="py-3.5 px-4">Statut ce mois</th>
                      <th className="py-3.5 px-4 text-right">Fixes</th>
                      <th className="py-3.5 px-4 text-right">Rempl.</th>
                      <th className="py-3.5 px-4 text-right">Absences</th>
                      <th className="py-3.5 px-4 text-right">Total heures</th>
                      <th className="py-3.5 px-4 text-right">Taux</th>
                      <th className="py-3.5 px-4 text-right">Total prévisionnel</th>
                      <th className="py-3.5 px-4 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {enCoursData.coaches.map((c) => {
                      const statutStyle = statutsLabels[c.statut] || statutsLabels.brouillon
                      return (
                        <tr key={c.coach.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center text-sm shrink-0">
                                {c.coach.prenom?.[0] || 'C'}
                              </div>
                              <div>
                                <p className="font-bold text-slate-900">
                                  {c.coach.prenom} {c.coach.nom || ''}
                                </p>
                                <p className="text-xs text-slate-500">
                                  {c.coach.email || 'Sans email'}
                                </p>
                              </div>
                            </div>
                          </td>

                          <td className="py-3.5 px-4">
                            <div className="flex flex-col items-start gap-1">
                              <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${statutStyle.color}`}>
                                {statutStyle.label}
                              </span>
                              {c.numero && (
                                <span className="text-[10px] font-mono text-slate-500">
                                  N° {c.numero}
                                </span>
                              )}
                            </div>
                          </td>

                          <td className="py-3.5 px-4 text-right text-slate-700 font-medium">
                            {c.heuresFixes.toFixed(1)}h
                          </td>

                          <td className="py-3.5 px-4 text-right">
                            {c.heuresRemplacements > 0 ? (
                              <span className="text-emerald-700 font-semibold">
                                +{c.heuresRemplacements.toFixed(1)}h
                              </span>
                            ) : (
                              <span className="text-slate-300">-</span>
                            )}
                          </td>

                          <td className="py-3.5 px-4 text-right">
                            {c.heuresAbsences > 0 ? (
                              <span className="text-red-700 font-semibold">
                                -{c.heuresAbsences.toFixed(1)}h
                              </span>
                            ) : (
                              <span className="text-slate-300">-</span>
                            )}
                          </td>

                          <td className="py-3.5 px-4 text-right">
                            <span className="font-bold text-slate-900">
                              {c.totalHeures.toFixed(1)}h
                            </span>
                          </td>

                          <td className="py-3.5 px-4 text-right text-slate-600 text-xs">
                            {c.tauxHoraire.toFixed(2)} €/h
                          </td>

                          <td className="py-3.5 px-4 text-right">
                            <span className="text-base font-black text-primary">
                              {c.totalMontant.toFixed(2)} €
                            </span>
                          </td>

                          <td className="py-3.5 px-4 text-center">
                            <div className="flex items-center justify-center gap-2">
                              <button
                                type="button"
                                onClick={() => handleOpenReadOnlyPreview(c)}
                                className="px-3 py-1.5 text-xs font-semibold bg-white border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-100 hover:text-slate-900 transition-colors flex items-center gap-1 cursor-pointer shadow-2xs"
                                title="Voir le détail du calcul"
                              >
                                <span>🔍</span>
                                <span>Détail</span>
                              </button>

                              {c.pdfPath && (
                                <a
                                  href={c.pdfPath}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="px-2.5 py-1.5 text-xs font-semibold bg-sky-50 border border-sky-200 text-sky-800 rounded-lg hover:bg-sky-100 transition-colors flex items-center gap-1"
                                  title="Consulter le PDF officiel déjà généré"
                                >
                                  <span>📄</span>
                                  <span>PDF</span>
                                </a>
                              )}
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

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
                                <p className="text-xs text-slate-400">+{l.montant?.toFixed(2)}€</p>
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
                                <p className="text-xs text-emerald-600">+{l.montant?.toFixed(2)}€</p>
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
                                <p className="text-xs text-red-600">-{Math.abs(l.montant ?? 0).toFixed(2)}€</p>
                              </div>
                            </div>
                          ))
                      )}
                    </div>
                  </div>

                  {/* Autres Forfaits & Lignes */}
                  {previewFacture.lignes.filter((l: any) => !["planning_fixe", "remplacement", "absence"].includes(l.type)).length > 0 && (
                    <div className="space-y-3">
                      <h4 className="font-bold text-slate-900 text-sm border-b border-slate-100 pb-1.5 flex items-center justify-between">
                        <span>🏆 Autres Forfaits & Activités</span>
                        <span className="text-xs bg-emerald-50 text-primary px-2 py-0.5 rounded-full font-bold">
                          +{previewFacture.lignes
                            .filter((l: any) => !["planning_fixe", "remplacement", "absence"].includes(l.type))
                            .reduce((sum: number, l: any) => sum + (l.montant ?? 0), 0)
                            .toFixed(2)} €
                        </span>
                      </h4>
                      <div className="space-y-2">
                        {previewFacture.lignes
                          .filter((l: any) => !["planning_fixe", "remplacement", "absence"].includes(l.type))
                          .map((l: any) => {
                            const isComp = l.type === 'competition' || l.type === 'forfait_regional'
                            const isTransport = l.type === 'forfait_transport'
                            const isJournee = isComp && (l.demiJournees === 2 || l.heures === 2)

                            return (
                              <div key={l.id} className="border border-slate-100 p-3 rounded-xl flex items-center justify-between bg-white text-sm shadow-2xs">
                                <div className="space-y-1 pr-4">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    {isComp && (
                                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-primary border border-emerald-200/80">
                                        🏆 Compétition
                                      </span>
                                    )}
                                    {isTransport && (
                                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200/80">
                                        🚗 Forfait Transport
                                      </span>
                                    )}
                                    {l.type === 'manuel' && (
                                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
                                        ✏️ Prestation
                                      </span>
                                    )}
                                  </div>
                                  <p className="font-semibold text-slate-800 text-xs sm:text-sm">{l.description}</p>
                                </div>
                                <div className="text-right shrink-0">
                                  {isComp ? (
                                    <p className="font-bold text-slate-600 text-xs">
                                      {isJournee ? '1 journée' : '1 demi-j.'}
                                    </p>
                                  ) : isTransport ? (
                                    <p className="font-bold text-slate-600 text-xs">
                                      {l.heures} km aller
                                    </p>
                                  ) : l.heures ? (
                                    <p className="font-bold text-slate-600 text-xs">
                                      {l.heures.toFixed(1)}h
                                    </p>
                                  ) : null}
                                  <p className="text-sm font-black text-slate-900">
                                    {l.montant?.toFixed(2)} €
                                  </p>
                                </div>
                              </div>
                            )
                          })}
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
                    {(
                      previewFacture.totalHeures !== undefined && previewFacture.totalHeures !== null
                        ? previewFacture.totalHeures
                        : previewFacture.lignes
                            ?.filter((l: any) => ['planning_fixe', 'planning_tournant', 'remplacement', 'absence', 'manuel'].includes(l.type))
                            .reduce((sum: number, l: any) => {
                              if (l.type === 'absence') return sum - Math.abs(l.heures ?? 0)
                              return sum + (l.heures ?? 0)
                            }, 0) ?? 0
                    ).toFixed(1)}h
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

                <div className="space-y-2 pt-2">
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => handleDrawerAction(false)}
                      disabled={generatingAction === 'drawer-generate' || generatingAction === 'drawer-send'}
                      className="py-2.5 px-3 text-center text-xs sm:text-sm font-semibold rounded-xl border border-sky-200 text-sky-800 bg-sky-50 hover:bg-sky-100 transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
                    >
                      {generatingAction === 'drawer-generate' ? 'Génération...' : '⚡ Générer le PDF'}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDrawerAction(true)}
                      disabled={generatingAction === 'drawer-generate' || generatingAction === 'drawer-send'}
                      className="py-2.5 px-3 text-center text-xs sm:text-sm font-semibold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50 shadow-xs"
                    >
                      {generatingAction === 'drawer-send' ? 'Envoi...' : '✉️ Envoyer au club'}
                    </button>
                  </div>

                  <div className="flex gap-2">
                    {/* PDF direct */}
                    {previewFacture.pdfPath && (
                      <a
                        href={previewFacture.pdfPath}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 py-2.5 text-center text-xs sm:text-sm font-semibold rounded-xl border border-slate-200 text-slate-700 bg-white hover:bg-slate-50 hover:text-slate-900 transition-colors flex items-center justify-center gap-1.5"
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
                        className="w-full py-2.5 px-3 text-center text-xs sm:text-sm font-semibold rounded-xl border border-slate-300 text-slate-700 bg-white hover:bg-slate-50 focus:ring-2 focus:ring-primary outline-none transition-colors"
                      >
                        <option value="brouillon">Brouillon</option>
                        <option value="generee">Générée</option>
                        <option value="envoyee">Envoyée</option>
                        <option value="payee">Payée</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Drawer Latéral de Prévisualisation LECTURE SEULE (Facture en cours / non générée) ── */}
      {readOnlyCoachPreview && (
        <div className="fixed inset-0 z-50 flex justify-end">
          {/* Overlay flouté */}
          <div
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity duration-300"
            onClick={() => setReadOnlyCoachPreview(null)}
          />

          {/* Contenu du Drawer */}
          <div className="relative w-full max-w-[550px] h-full bg-white shadow-2xl flex flex-col z-50 animate-slide-in overflow-hidden border-l border-slate-100">
            {/* Header */}
            <div className="px-6 py-5 bg-gradient-to-r from-sky-50 via-white to-sky-50/50 border-b border-slate-100 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold text-sky-800 bg-sky-100 px-2 py-0.5 rounded-full uppercase tracking-wider">
                    Lecture seule · Temps réel
                  </span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${statutsLabels[readOnlyCoachPreview.statut]?.color || 'bg-slate-100 text-slate-700'}`}>
                    {statutsLabels[readOnlyCoachPreview.statut]?.label || readOnlyCoachPreview.statut}
                  </span>
                </div>
                <h3 className="text-xl font-bold text-slate-800 mt-1">
                  {readOnlyCoachPreview.coach.prenom} {readOnlyCoachPreview.coach.nom || ''}
                </h3>
                <p className="text-xs text-slate-500">
                  {moisNoms[selectedMoisEnCours - 1]} {selectedAnneeEnCours}
                </p>
              </div>
              <button
                onClick={() => setReadOnlyCoachPreview(null)}
                className="w-9 h-9 rounded-full hover:bg-slate-100 border border-slate-200 text-slate-400 hover:text-slate-600 flex items-center justify-center transition-all cursor-pointer"
                aria-label="Fermer"
              >
                ✕
              </button>
            </div>

            {/* Corps */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Message rassurance */}
              <div className="bg-amber-50/80 border border-amber-200/80 rounded-xl p-3 text-xs text-amber-900 flex items-center gap-2">
                <span className="text-base">🔒</span>
                <span>
                  <strong>Consultation uniquement :</strong> Ce calcul prévisionnel est affiché en lecture seule. Aucune facture n&apos;est enregistrée ou modifiée ici.
                </span>
              </div>

              {/* Fiche d'identité du coach */}
              <div className="bg-slate-50 border border-slate-100 p-4 rounded-xl space-y-2">
                <h4 className="font-semibold text-slate-800 text-sm uppercase tracking-wider">
                  👨‍🏫 Informations Coach
                </h4>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                  <p className="text-slate-500">Nom :</p>
                  <p className="font-medium text-slate-800">
                    {readOnlyCoachPreview.coach.prenom} {readOnlyCoachPreview.coach.nom || ''}
                  </p>
                  <p className="text-slate-500">Période :</p>
                  <p className="font-medium text-slate-800">
                    {moisNoms[selectedMoisEnCours - 1]} {selectedAnneeEnCours}
                  </p>
                  {readOnlyCoachPreview.coach.siret && (
                    <>
                      <p className="text-slate-500">SIRET :</p>
                      <p className="font-medium text-slate-800 font-mono text-xs">
                        {readOnlyCoachPreview.coach.siret}
                      </p>
                    </>
                  )}
                  {readOnlyCoachPreview.coach.email && (
                    <>
                      <p className="text-slate-500">Email :</p>
                      <p className="font-medium text-slate-800 truncate">
                        {readOnlyCoachPreview.coach.email}
                      </p>
                    </>
                  )}
                  {readOnlyCoachPreview.coach.telephone && (
                    <>
                      <p className="text-slate-500">Téléphone :</p>
                      <p className="font-medium text-slate-800">
                        {readOnlyCoachPreview.coach.telephone}
                      </p>
                    </>
                  )}
                  {readOnlyCoachPreview.numero && (
                    <>
                      <p className="text-slate-500">N° Facture :</p>
                      <p className="font-bold text-primary font-mono text-xs">
                        {readOnlyCoachPreview.numero}
                      </p>
                    </>
                  )}
                </div>
              </div>

              {/* Lignes Planning Fixe */}
              <div className="space-y-3">
                <h4 className="font-bold text-slate-900 text-sm border-b border-slate-100 pb-1.5 flex items-center justify-between">
                  <span>🗓️ Planning Fixe</span>
                  <span className="text-xs bg-sky-50 text-primary px-2 py-0.5 rounded-full font-medium">
                    {readOnlyCoachPreview.heuresFixes.toFixed(1)}h
                  </span>
                </h4>
                <div className="space-y-2">
                  {!readOnlyCoachPreview.details?.lignesPlanningFixe || readOnlyCoachPreview.details.lignesPlanningFixe.length === 0 ? (
                    <p className="text-sm text-slate-400 italic">Aucune heure de planning fixe.</p>
                  ) : (
                    readOnlyCoachPreview.details.lignesPlanningFixe.map((l: any, idx: number) => (
                      <div key={idx} className="border border-slate-100 p-3 rounded-lg flex items-center justify-between bg-white text-sm">
                        <p className="font-medium text-slate-700 pr-4">{l.description}</p>
                        <div className="text-right shrink-0">
                          <p className="font-bold text-slate-800">{l.heures?.toFixed(1)}h</p>
                          <p className="text-xs text-slate-400">+{l.montant?.toFixed(2)}€</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Lignes Planning Tournant si présent */}
              {readOnlyCoachPreview.details?.lignesPlanningTournant && readOnlyCoachPreview.details.lignesPlanningTournant.length > 0 && (
                <div className="space-y-3">
                  <h4 className="font-bold text-slate-900 text-sm border-b border-slate-100 pb-1.5 flex items-center justify-between">
                    <span>🔄 Planning Tournant</span>
                    <span className="text-xs bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full font-medium">
                      +{readOnlyCoachPreview.heuresTournants.toFixed(1)}h
                    </span>
                  </h4>
                  <div className="space-y-2">
                    {readOnlyCoachPreview.details.lignesPlanningTournant.map((l: any, idx: number) => (
                      <div key={idx} className="border border-indigo-100 p-3 rounded-lg flex items-center justify-between bg-indigo-50/20 text-sm">
                        <p className="font-medium text-indigo-800 pr-4">{l.description}</p>
                        <div className="text-right shrink-0">
                          <p className="font-bold text-indigo-800">+{l.heures?.toFixed(1)}h</p>
                          <p className="text-xs text-indigo-600">+{l.montant?.toFixed(2)}€</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Lignes Remplacements */}
              <div className="space-y-3">
                <h4 className="font-bold text-slate-900 text-sm border-b border-slate-100 pb-1.5 flex items-center justify-between">
                  <span>➕ Remplacements Effectués</span>
                  <span className="text-xs bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full font-medium">
                    +{readOnlyCoachPreview.heuresRemplacements.toFixed(1)}h
                  </span>
                </h4>
                <div className="space-y-2">
                  {!readOnlyCoachPreview.details?.lignesRemplacements || readOnlyCoachPreview.details.lignesRemplacements.length === 0 ? (
                    <p className="text-sm text-slate-400 italic">Aucun remplacement effectué ce mois-ci.</p>
                  ) : (
                    readOnlyCoachPreview.details.lignesRemplacements.map((l: any, idx: number) => (
                      <div key={idx} className="border border-emerald-100 p-3 rounded-lg flex items-center justify-between bg-emerald-50/20 text-sm">
                        <p className="font-medium text-emerald-800 pr-4">{l.description}</p>
                        <div className="text-right shrink-0">
                          <p className="font-bold text-emerald-800">+{l.heures?.toFixed(1)}h</p>
                          <p className="text-xs text-emerald-600">+{l.montant?.toFixed(2)}€</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Lignes d'Absences */}
              <div className="space-y-3">
                <h4 className="font-bold text-slate-900 text-sm border-b border-slate-100 pb-1.5 flex items-center justify-between">
                  <span>➖ Absences à Déduire</span>
                  <span className="text-xs bg-red-50 text-red-700 px-2 py-0.5 rounded-full font-medium">
                    -{readOnlyCoachPreview.heuresAbsences.toFixed(1)}h
                  </span>
                </h4>
                <div className="space-y-2">
                  {!readOnlyCoachPreview.details?.lignesAbsences || readOnlyCoachPreview.details.lignesAbsences.length === 0 ? (
                    <p className="text-sm text-slate-400 italic">Aucune absence déduite ce mois-ci.</p>
                  ) : (
                    readOnlyCoachPreview.details.lignesAbsences.map((l: any, idx: number) => (
                      <div key={idx} className="border border-red-100 p-3 rounded-lg flex items-center justify-between bg-red-50/20 text-sm">
                        <p className="font-medium text-red-800 pr-4">{l.description}</p>
                        <div className="text-right shrink-0">
                          <p className="font-bold text-red-800">-{Math.abs(l.heures ?? 0).toFixed(1)}h</p>
                          <p className="text-xs text-red-600">-{Math.abs(l.montant ?? 0).toFixed(2)}€</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Lignes Manuelles / Compétitions */}
              {readOnlyCoachPreview.details?.lignesManuelles && readOnlyCoachPreview.details.lignesManuelles.length > 0 && (
                <div className="space-y-3">
                  <h4 className="font-bold text-slate-900 text-sm border-b border-slate-100 pb-1.5 flex items-center justify-between">
                    <span>🏆 Compétitions & Forfaits</span>
                    <span className="text-xs bg-emerald-50 text-primary px-2 py-0.5 rounded-full font-bold">
                      +{readOnlyCoachPreview.details.lignesManuelles.reduce((sum: number, l: any) => sum + (l.montant ?? 0), 0).toFixed(2)} €
                    </span>
                  </h4>
                  <div className="space-y-2">
                    {readOnlyCoachPreview.details.lignesManuelles.map((l: any, idx: number) => {
                      const isComp = l.type === 'competition' || l.type === 'forfait_regional'
                      const isTransport = l.type === 'forfait_transport'
                      const isJournee = isComp && (l.demiJournees === 2 || l.heures === 2)

                      return (
                        <div key={idx} className="border border-slate-100 p-3 rounded-xl flex items-center justify-between bg-white text-sm shadow-2xs">
                          <div className="space-y-1 pr-4">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              {isComp && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-primary border border-emerald-200/80">
                                  🏆 Compétition
                                </span>
                              )}
                              {isTransport && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200/80">
                                  🚗 Transport
                                </span>
                              )}
                              {l.type === 'manuel' && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
                                  ✏️ Prestation
                                </span>
                              )}
                            </div>
                            <p className="font-semibold text-slate-800 text-xs sm:text-sm">{l.description}</p>
                          </div>
                          <div className="text-right shrink-0">
                            {isComp ? (
                              <p className="font-bold text-slate-600 text-xs">
                                {isJournee ? '1 journée' : '1 demi-j.'}
                              </p>
                            ) : isTransport ? (
                              <p className="font-bold text-slate-600 text-xs">
                                {l.heures} km aller
                              </p>
                            ) : l.heures ? (
                              <p className="font-bold text-slate-600 text-xs">
                                {l.heures.toFixed(1)}h
                              </p>
                            ) : null}
                            <p className="text-sm font-black text-slate-900">
                              {l.montant?.toFixed(2)} €
                            </p>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Footer LECTURE SEULE */}
            <div className="p-6 bg-slate-50 border-t border-slate-100 space-y-4">
              <div className="flex justify-between items-center text-slate-700 text-sm font-medium">
                <span>Total heures travaillées :</span>
                <span className="font-bold text-slate-900 text-base">
                  {readOnlyCoachPreview.totalHeures.toFixed(1)}h
                </span>
              </div>
              <div className="flex justify-between items-center p-4 bg-sky-50 border border-sky-100 rounded-xl">
                <div>
                  <span className="font-bold text-slate-700 block">Total prévisionnel :</span>
                  <span className="text-[10px] text-slate-500 font-medium">
                    Calculé au taux de {readOnlyCoachPreview.tauxHoraire?.toFixed(2)}€/h
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-2xl font-black text-primary">
                    {readOnlyCoachPreview.totalMontant.toFixed(2)} €
                  </span>
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                {readOnlyCoachPreview.pdfPath && (
                  <a
                    href={readOnlyCoachPreview.pdfPath}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 py-2.5 text-center text-xs sm:text-sm font-semibold rounded-xl border border-sky-200 text-sky-800 bg-sky-50 hover:bg-sky-100 transition-colors flex items-center justify-center gap-1.5"
                  >
                    📄 Ouvrir le PDF officiel
                  </a>
                )}
                <button
                  type="button"
                  onClick={() => setReadOnlyCoachPreview(null)}
                  className="flex-1 py-2.5 text-center text-xs sm:text-sm font-semibold rounded-xl border border-slate-200 text-slate-700 bg-white hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  Fermer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Génération Manuelle Facture */}
      {showGenerateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-5 border border-slate-100 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                  <span>✨</span> Générer une facture coach
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Calcul complet et génération officielle du PDF avec envoi optionnel au club
                </p>
              </div>
              <button
                onClick={() => setShowGenerateModal(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors text-lg"
              >
                ✕
              </button>
            </div>

            {/* Formulaire sélection */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">
                  Coach concerné
                </label>
                <select
                  value={selectedGenCoach}
                  onChange={(e) => {
                    setSelectedGenCoach(e.target.value)
                    fetchGenPreview(e.target.value, selectedGenMois, selectedGenAnnee)
                  }}
                  className="w-full px-3 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent text-sm bg-white"
                >
                  <option value="" disabled>-- Sélectionner un coach --</option>
                  {displayCoaches.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.prenom} {c.nom || ''} {c.email ? `(${c.email})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">
                    Mois
                  </label>
                  <select
                    value={selectedGenMois}
                    onChange={(e) => {
                      const m = parseInt(e.target.value)
                      setSelectedGenMois(m)
                      fetchGenPreview(selectedGenCoach, m, selectedGenAnnee)
                    }}
                    className="w-full px-3 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent text-sm bg-white"
                  >
                    {moisNoms.map((nom, idx) => (
                      <option key={idx} value={idx + 1}>
                        {nom}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">
                    Année
                  </label>
                  <select
                    value={selectedGenAnnee}
                    onChange={(e) => {
                      const a = parseInt(e.target.value)
                      setSelectedGenAnnee(a)
                      fetchGenPreview(selectedGenCoach, selectedGenMois, a)
                    }}
                    className="w-full px-3 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent text-sm bg-white"
                  >
                    {[2024, 2025, 2026, 2027].map((y) => (
                      <option key={y} value={y}>
                        {y}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Aperçu du calcul */}
            <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                  Aperçu du calcul automatique
                </span>
                {loadingGenPreview && (
                  <span className="text-xs text-primary font-medium animate-pulse">
                    Calcul en cours...
                  </span>
                )}
              </div>

              {previewGenDetails ? (
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between text-slate-600">
                    <span>Créneaux fixes ({previewGenDetails.lignesPlanningFixe?.length || 0}) :</span>
                    <span className="font-semibold text-slate-800">
                      {previewGenDetails.lignesPlanningFixe?.reduce((s: number, l: any) => s + (l.heures ?? 0), 0).toFixed(1)}h
                      {' · '}
                      {previewGenDetails.lignesPlanningFixe?.reduce((s: number, l: any) => s + (l.montant ?? 0), 0).toFixed(2)} €
                    </span>
                  </div>

                  {previewGenDetails.lignesRemplacements?.length > 0 && (
                    <div className="flex justify-between text-emerald-700">
                      <span>Remplacements effectués (+{previewGenDetails.lignesRemplacements.length}) :</span>
                      <span className="font-semibold">
                        +{previewGenDetails.lignesRemplacements.reduce((s: number, l: any) => s + (l.heures ?? 0), 0).toFixed(1)}h
                        {' · '}
                        +{previewGenDetails.lignesRemplacements.reduce((s: number, l: any) => s + (l.montant ?? 0), 0).toFixed(2)} €
                      </span>
                    </div>
                  )}

                  {previewGenDetails.lignesAbsences?.length > 0 && (
                    <div className="flex justify-between text-red-700">
                      <span>Absences déduites (-{previewGenDetails.lignesAbsences.length}) :</span>
                      <span className="font-semibold">
                        -{previewGenDetails.lignesAbsences.reduce((s: number, l: any) => s + Math.abs(l.heures ?? 0), 0).toFixed(1)}h
                        {' · '}
                        -{previewGenDetails.lignesAbsences.reduce((s: number, l: any) => s + Math.abs(l.montant ?? 0), 0).toFixed(2)} €
                      </span>
                    </div>
                  )}

                  {previewGenDetails.lignesManuelles?.length > 0 && (
                    <div className="flex justify-between text-slate-700">
                      <span>Compétitions / Forfaits ({previewGenDetails.lignesManuelles.length}) :</span>
                      <span className="font-semibold">
                        +{previewGenDetails.lignesManuelles.reduce((s: number, l: any) => s + (l.montant ?? 0), 0).toFixed(2)} €
                      </span>
                    </div>
                  )}

                  <div className="border-t border-slate-200 pt-3 flex justify-between items-baseline">
                    <span className="font-bold text-slate-900">Total à facturer :</span>
                    <span className="text-2xl font-black text-primary">
                      {previewGenDetails.totalMontant?.toFixed(2)} €
                    </span>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-slate-400 italic text-center py-2">
                  Sélectionnez un coach pour calculer l&apos;aperçu du mois.
                </p>
              )}
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowGenerateModal(false)}
                className="px-4 py-2.5 text-sm font-semibold rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 transition-colors"
              >
                Annuler
              </button>
              <div className="flex-1 flex flex-col sm:flex-row gap-2 justify-end">
                <button
                  type="button"
                  disabled={!selectedGenCoach || generatingAction !== null}
                  onClick={() => handleGenerateInvoice(false)}
                  className="px-4 py-2.5 text-sm font-semibold rounded-xl border border-primary text-primary hover:bg-primary/5 transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
                >
                  {generatingAction === 'generate' ? 'Génération...' : '⚡ Générer la facture'}
                </button>
                <button
                  type="button"
                  disabled={!selectedGenCoach || generatingAction !== null}
                  onClick={() => handleGenerateInvoice(true)}
                  className="px-4 py-2.5 text-sm font-semibold rounded-xl bg-primary hover:bg-primary/90 text-white shadow-sm transition-all disabled:opacity-50 flex items-center justify-center gap-1.5"
                >
                  {generatingAction === 'send' ? 'Génération & envoi...' : '✉️ Générer & Envoyer au club'}
                </button>
              </div>
            </div>
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

