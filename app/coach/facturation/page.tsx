'use client'

export const dynamic = 'force-dynamic'

import { Suspense, useCallback, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import CoachNav from '@/components/coach/CoachNav'
import { getErrorMessage } from '@/lib/utils'
import { useConfirmDialog } from '@/components/ConfirmDialog'
import toast from 'react-hot-toast'
import { Loader2, FileText, Receipt } from 'lucide-react'

import FactureHeader from '@/components/coach/facturation/FactureHeader'
import FactureSections from '@/components/coach/facturation/FactureSections'
import ModalPrestation from '@/components/coach/facturation/ModalPrestation'
import ModalCompetition from '@/components/coach/facturation/ModalCompetition'
import HistoriqueFactures from '@/components/coach/facturation/HistoriqueFactures'
import { FacturationData, LigneFacture } from '@/components/coach/facturation/types'

const MOIS_NOMS = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
]

export default function FacturationPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen py-12 bg-slate-50 text-center">
          <Loader2 className="w-6 h-6 animate-spin mx-auto text-cyan-600" />
          <p className="text-xs font-bold text-slate-500 mt-2">Chargement de la facturation...</p>
        </div>
      }
    >
      <FacturationContent />
    </Suspense>
  )
}

function FacturationContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { confirm } = useConfirmDialog()

  const currentDate = new Date()
  const [selectedMois, setSelectedMois] = useState(() => {
    const m = searchParams.get('mois')
    return m ? parseInt(m, 10) : currentDate.getMonth() + 1
  })
  const [selectedAnnee, setSelectedAnnee] = useState(() => {
    const a = searchParams.get('annee')
    return a ? parseInt(a, 10) : currentDate.getFullYear()
  })

  const [activeTab, setActiveTab] = useState<'mois' | 'historique'>('mois')
  const [refreshHistKey, setRefreshHistKey] = useState(0)
  const [loading, setLoading] = useState(true)
  const [generatingInvoice, setGeneratingInvoice] = useState(false)
  const [downloadingPDF, setDownloadingPDF] = useState(false)
  const [data, setData] = useState<FacturationData | null>(null)

  // Modales
  const [showModalPrestation, setShowModalPrestation] = useState(false)
  const [isSubmittingPrestation, setIsSubmittingPrestation] = useState(false)
  const [showModalCompetition, setShowModalCompetition] = useState(false)
  const [isSubmittingCompetition, setIsSubmittingCompetition] = useState(false)

  const fetchFacturation = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/coach/facturation/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mois: selectedMois, annee: selectedAnnee }),
      })

      if (res.status === 401) {
        router.push('/coach/login')
        return
      }

      const resData = await res.json()
      if (res.ok) {
        setData(resData)
      } else {
        toast.error(resData.error || 'Erreur lors du calcul de la facturation')
      }
    } catch {
      toast.error('Erreur de connexion au serveur')
    } finally {
      setLoading(false)
    }
  }, [selectedMois, selectedAnnee, router])

  useEffect(() => {
    fetchFacturation()
  }, [fetchFacturation])

  const handlePrevMonth = () => {
    if (selectedMois === 1) {
      setSelectedMois(12)
      setSelectedAnnee((prev) => prev - 1)
    } else {
      setSelectedMois((prev) => prev - 1)
    }
  }

  const handleNextMonth = () => {
    if (selectedMois === 12) {
      setSelectedMois(1)
      setSelectedAnnee((prev) => prev + 1)
    } else {
      setSelectedMois((prev) => prev + 1)
    }
  }

  const handleDownloadPDF = async (mois = selectedMois, annee = selectedAnnee) => {
    setDownloadingPDF(true)
    try {
      const response = await fetch('/api/coach/facturation/generer-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mois, annee }),
      })

      if (!response.ok) {
        const result = await response.json()
        throw new Error(result.error || 'Erreur lors de la génération du PDF')
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `facture-coach-${mois}-${annee}.pdf`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)

      toast.success('Facture PDF téléchargée')
      fetchFacturation()
    } catch (err) {
      toast.error(getErrorMessage(err))
    } finally {
      setDownloadingPDF(false)
    }
  }

  const handleGenerateInvoice = async () => {
    const confirmed = await confirm({
      title: 'Générer et transmettre la facture ?',
      message: `Voulez-vous officialiser votre facture pour ${MOIS_NOMS[selectedMois - 1]} ${selectedAnnee} d'un montant de ${data?.totalMontant.toFixed(2)} € ?\n\nLe document PDF officiel sera créé et transmis directement par e-mail au secrétariat du club ainsi qu'à votre adresse e-mail. Une fois générée, la facture sera verrouillée.`,
      confirmText: 'Oui, générer et envoyer',
      variant: 'success',
      icon: '📄',
    })

    if (!confirmed) return

    setGeneratingInvoice(true)
    try {
      const res = await fetch('/api/coach/facturation/generer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mois: selectedMois, annee: selectedAnnee }),
      })

      const resData = await res.json()
      if (res.ok) {
        toast.success(resData.message || 'Facture générée et transmise au club avec succès !')
        fetchFacturation()
        setRefreshHistKey((k) => k + 1)
      } else {
        toast.error(resData.error || 'Erreur lors de la génération de la facture')
      }
    } catch {
      toast.error('Erreur lors de la génération de la facture')
    } finally {
      setGeneratingInvoice(false)
    }
  }

  const handleRegenerateInvoice = async () => {
    const confirmed = await confirm({
      title: 'Régénérer la facture ?',
      message: `Voulez-vous actualiser votre facture de ${MOIS_NOMS[selectedMois - 1]} ${selectedAnnee} (${data?.totalMontant.toFixed(2)} €) avec vos récentes modifications ?`,
      confirmText: 'Oui, régénérer',
      variant: 'primary',
      icon: '🔄',
    })

    if (!confirmed) return

    setGeneratingInvoice(true)
    try {
      const res = await fetch('/api/coach/facturation/generer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mois: selectedMois, annee: selectedAnnee }),
      })

      const resData = await res.json()
      if (res.ok) {
        toast.success(resData.message || 'Facture régénérée avec succès !')
        fetchFacturation()
        setRefreshHistKey((k) => k + 1)
      } else {
        toast.error(resData.error || 'Erreur lors de la régénération')
      }
    } catch {
      toast.error('Erreur lors de la régénération')
    } finally {
      setGeneratingInvoice(false)
    }
  }

  const handleAddManualLine = async (description: string, heures: number, date?: string) => {
    if (data?.isBlocked) {
      toast.error('Cette facture est transmise au club et ne peut plus être modifiée.')
      return
    }

    setIsSubmittingPrestation(true)
    try {
      const res = await fetch('/api/coach/facturation/ligne', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mois: selectedMois,
          annee: selectedAnnee,
          description,
          heures,
          date: date || undefined,
        }),
      })

      const resData = await res.json()
      if (res.ok) {
        toast.success('Prestation ajoutée avec succès')
        setShowModalPrestation(false)
        fetchFacturation()
        setRefreshHistKey((k) => k + 1)
      } else {
        toast.error(resData.error || 'Erreur lors de l\'ajout')
      }
    } catch {
      toast.error('Erreur lors de l\'ajout')
    } finally {
      setIsSubmittingPrestation(false)
    }
  }

  const handleAddCompetition = async (payload: {
    typeCompetition: 'departementale' | 'regionale'
    format: 'demi_journee' | 'journee'
    nomCompetition: string
    lieu: string
    date: string
    distanceKm: number
  }) => {
    if (data?.isBlocked) {
      toast.error('Cette facture est transmise au club et ne peut plus être modifiée.')
      return
    }

    setIsSubmittingCompetition(true)
    try {
      const res = await fetch('/api/coach/facturation/competition', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mois: selectedMois,
          annee: selectedAnnee,
          ...payload,
        }),
      })

      const resData = await res.json()
      if (res.ok) {
        toast.success('Compétition ajoutée à votre facture')
        setShowModalCompetition(false)
        fetchFacturation()
        setRefreshHistKey((k) => k + 1)
      } else {
        toast.error(resData.error || 'Erreur lors de l\'enregistrement')
      }
    } catch {
      toast.error('Erreur lors de l\'enregistrement de la compétition')
    } finally {
      setIsSubmittingCompetition(false)
    }
  }

  const handleDeleteLine = async (ligneId: string, type?: string) => {
    if (data?.isBlocked) {
      toast.error('Cette facture a été transmise au club et ne peut plus être modifiée.')
      return
    }

    const isComp = type === 'competition' || type === 'forfait_transport'
    const confirmed = await confirm({
      title: isComp ? 'Supprimer cette compétition ?' : 'Supprimer cette prestation ?',
      message: isComp
        ? 'Voulez-vous supprimer cette compétition ? La rémunération et son éventuel forfait transport associé seront retirés de votre facture.'
        : 'Voulez-vous supprimer cette prestation manuelle ?',
      confirmText: 'Supprimer',
      variant: 'danger',
    })

    if (!confirmed) return

    try {
      const res = await fetch(`/api/coach/facturation/ligne/${ligneId}`, {
        method: 'DELETE',
      })
      if (res.ok) {
        toast.success(isComp ? 'Compétition supprimée' : 'Ligne supprimée')
        fetchFacturation()
        setRefreshHistKey((k) => k + 1)
      } else {
        toast.error('Erreur lors de la suppression')
      }
    } catch {
      toast.error('Erreur lors de la suppression')
    }
  }

  const allLignesFallback: LigneFacture[] = [
    ...(data?.lignesPlanningFixe || []),
    ...(data?.lignesPlanningTournant || []),
    ...(data?.lignesRemplacements || []),
    ...(data?.lignesAbsences || []),
    ...(data?.lignesManuelles || []).filter((l) => !['remplacement', 'absence'].includes(l.type)),
  ]

  return (
    <div className="min-h-screen pt-2 pb-24 sm:pb-12 bg-slate-50/50 text-slate-900">
      <div className="container mx-auto px-4 max-w-5xl space-y-6">
        <CoachNav />

        {/* ONGLETS NAVIGATION */}
        <div className="flex items-center gap-2 border-b border-slate-200/80 pb-3">
          <button
            type="button"
            onClick={() => setActiveTab('mois')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'mois'
                ? 'bg-cyan-600 text-white shadow-sm shadow-cyan-600/20'
                : 'bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200/70'
            }`}
          >
            <FileText className="w-4 h-4" />
            Facture du mois ({MOIS_NOMS[selectedMois - 1]} {selectedAnnee})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('historique')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'historique'
                ? 'bg-cyan-600 text-white shadow-sm shadow-cyan-600/20'
                : 'bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200/70'
            }`}
          >
            <Receipt className="w-4 h-4" />
            Historique de tous les PDF
          </button>
        </div>

        {activeTab === 'mois' ? (
          <>
            {/* EN-TÊTE FACTURATION & SÉLECTEUR */}
            <FactureHeader
              selectedMois={selectedMois}
              selectedAnnee={selectedAnnee}
              onPrevMonth={handlePrevMonth}
              onNextMonth={handleNextMonth}
              totalHeures={data?.totalHeures || 0}
              tauxHoraire={data?.tauxHoraire || 0}
              totalMontant={data?.totalMontant || 0}
              statut={data?.statut}
              isBlocked={data?.isBlocked}
              generatingInvoice={generatingInvoice}
              downloadingPDF={downloadingPDF}
              onGenerateInvoice={handleGenerateInvoice}
              onRegenerateInvoice={handleRegenerateInvoice}
              onDownloadPDF={() => handleDownloadPDF()}
              onOpenModalPrestation={() => setShowModalPrestation(true)}
              onOpenModalCompetition={() => setShowModalCompetition(true)}
            />

            {/* CONTENU PRINCIPAL OU CHARGEMENT */}
            {loading ? (
              <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center space-y-2">
                <Loader2 className="w-6 h-6 animate-spin mx-auto text-cyan-600" />
                <p className="text-xs text-slate-500 font-bold">Calcul des heures en cours...</p>
              </div>
            ) : (
              <FactureSections
                sections={data?.sections}
                allLignesFallback={allLignesFallback}
                isBlocked={data?.isBlocked}
                totalHeures={data?.totalHeures || 0}
                totalMontant={data?.totalMontant || 0}
                onDeleteLine={handleDeleteLine}
              />
            )}
          </>
        ) : (
          <HistoriqueFactures
            onDownloadPDF={handleDownloadPDF}
            onSelectMonth={(m, a) => {
              setSelectedMois(m)
              setSelectedAnnee(a)
              setActiveTab('mois')
            }}
            downloadingPdf={downloadingPDF}
            refreshKey={refreshHistKey}
          />
        )}

        {/* MODALE PRESTATION MANUELLE */}
        <ModalPrestation
          isOpen={showModalPrestation}
          onClose={() => setShowModalPrestation(false)}
          onSubmit={handleAddManualLine}
          isSubmitting={isSubmittingPrestation}
        />

        {/* MODALE COMPÉTITION & TRANSPORT */}
        <ModalCompetition
          isOpen={showModalCompetition}
          onClose={() => setShowModalCompetition(false)}
          selectedMois={selectedMois}
          selectedAnnee={selectedAnnee}
          onSubmit={handleAddCompetition}
          isSubmitting={isSubmittingCompetition}
        />
      </div>
    </div>
  )
}
