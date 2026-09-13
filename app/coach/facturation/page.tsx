'use client'

export const dynamic = 'force-dynamic'

import { Suspense, useCallback, useEffect, useState, useMemo } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import CoachNav from '@/components/coach/CoachNav'
import { getErrorMessage } from '@/lib/utils'
import { useConfirmDialog } from '@/components/ConfirmDialog'
import toast from 'react-hot-toast'
import {
  Receipt,
  Download,
  Send,
  Calendar,
  Clock,
  Euro,
  ChevronLeft,
  ChevronRight,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  FileText,
  Loader2,
  Building2,
  HelpCircle,
  TrendingUp,
  Percent,
  CalendarRange,
  ShieldCheck,
  Trophy,
  MapPin,
  ExternalLink,
  Car,
  Navigation,
  Sparkles,
  Lock,
  RotateCcw
} from 'lucide-react'
import {
  matchPiscineFrequente,
  isVaucluseLieu,
  getDefaultPiscinesFrequentes,
} from '@/lib/competition-distance'

interface LigneFacture {
  id?: string
  type: string
  description: string
  heures: number
  montant: number
  date?: string
  groupe?: string | null
  lieu?: string | null
  demiJournees?: number | null
  remplacementId?: string | null
}

interface FacturationData {
  mois: number
  annee: number
  tauxHoraire: number
  forfaitDemiJournee: number
  forfaitRegionalActif: boolean
  montantForfaitRegional: number
  lignesPlanningFixe: LigneFacture[]
  lignesPlanningTournant: LigneFacture[]
  lignesRemplacements: LigneFacture[]
  lignesAbsences: LigneFacture[]
  lignesManuelles: LigneFacture[]
  totalHeures: number
  totalMontant: number
  factureId?: string
  statut?: string
  isBlocked?: boolean
}

interface PastInvoice {
  id: string
  numero: string
  mois: number
  annee: number
  montantTotal: number
  statut: string
  datePaiement?: string | null
  createdAt?: string
}

interface CalendarEventItem {
  id: string
  title: string
  date: string
  lieu?: string | null
  type?: string | null
}

interface AdminPiscineItem {
  id: string
  nom: string
  distanceKm: number
}


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

  const [activeTab, setActiveTab] = useState<'mensuel' | 'urssaf'>('mensuel')

  const currentDate = new Date()
  const [selectedMois, setSelectedMois] = useState(() => {
    const m = searchParams.get('mois')
    return m ? parseInt(m, 10) : currentDate.getMonth() + 1
  })
  const [selectedAnnee, setSelectedAnnee] = useState(() => {
    const a = searchParams.get('annee')
    return a ? parseInt(a, 10) : currentDate.getFullYear()
  })

  // Paramètres URSSAF personnalisables par le coach
  const [isAcre, setIsAcre] = useState(false)
  const [hasVersementLiberatoire, setHasVersementLiberatoire] = useState(false)

  const [loading, setLoading] = useState(true)
  const [generatingInvoice, setGeneratingInvoice] = useState(false)
  const [generatingPdf, setGeneratingPdf] = useState(false)
  const [sendingEmail, setSendingEmail] = useState(false)
  const [data, setData] = useState<FacturationData | null>(null)
  const [allInvoicesOfYear, setAllInvoicesOfYear] = useState<PastInvoice[]>([])

  // Modal ajout ligne manuelle
  const [showAddModal, setShowAddModal] = useState(false)
  const [manualDescription, setManualDescription] = useState('')
  const [manualHeures, setManualHeures] = useState('1')
  const [manualDate, setManualDate] = useState('')
  const [addingLine, setAddingLine] = useState(false)

  // Modal ajout compétition
  const [showCompModal, setShowCompModal] = useState(false)
  const [compType, setCompType] = useState<'departementale' | 'regionale'>('departementale')
  const [compFormat, setCompFormat] = useState<'demi_journee' | 'journee'>('demi_journee')
  const [compNom, setCompNom] = useState('')
  const [compLieu, setCompLieu] = useState('')
  const [compDate, setCompDate] = useState('')
  const [compDistanceKm, setCompDistanceKm] = useState<string>('0')
  const [submittingComp, setSubmittingComp] = useState(false)
  const [calendarEvents, setCalendarEvents] = useState<CalendarEventItem[]>([])
  const [loadingEvents, setLoadingEvents] = useState(false)
  const [selectedEventChoice, setSelectedEventChoice] = useState<string>('manual')
  const [adminPiscines, setAdminPiscines] = useState<AdminPiscineItem[]>(() => getDefaultPiscinesFrequentes())
  const [selectedPiscinePreset, setSelectedPiscinePreset] = useState<string>('')
  const [calculatingRoute, setCalculatingRoute] = useState(false)

  const moisNoms = [
    'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
    'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
  ]

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

      // Charger toutes les factures de l'année pour le récapitulatif URSSAF
      const resHist = await fetch(`/api/coach/facturation/historique?annee=${selectedAnnee}`)
      if (resHist.ok) {
        const histData = await resHist.json()
        setAllInvoicesOfYear(histData.factures || [])
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
    setGeneratingPdf(true)
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
      setGeneratingPdf(false)
    }
  }

  const handleGenerateInvoice = async () => {
    const isRegen = data?.statut === 'generee'
    const confirmed = await confirm({
      title: isRegen ? 'Régénérer la facture ?' : 'Générer la facture ?',
      message: isRegen
        ? `Voulez-vous actualiser votre facture de ${moisNoms[selectedMois - 1]} ${selectedAnnee} (${data?.totalMontant.toFixed(2)} €) avec vos récentes modifications ?`
        : `Voulez-vous générer officiellement votre facture pour ${moisNoms[selectedMois - 1]} ${selectedAnnee} d'un montant de ${data?.totalMontant.toFixed(2)} € ? Vous pourrez encore la modifier tant qu'elle n'est pas envoyée au club.`,
      confirmText: isRegen ? 'Oui, régénérer' : 'Oui, générer la facture',
      variant: isRegen ? 'primary' : 'success',
      icon: isRegen ? '🔄' : '📄',
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
        toast.success(resData.message || 'Facture générée avec succès !')
        fetchFacturation()
      } else {
        toast.error(resData.error || 'Erreur lors de la génération de la facture')
      }
    } catch {
      toast.error('Erreur lors de la génération de la facture')
    } finally {
      setGeneratingInvoice(false)
    }
  }

  const handleSendEmail = async () => {
    if (!data?.statut || data.statut === 'brouillon') {
      toast.error('Veuillez d\'abord cliquer sur "Générer la facture" avant de l\'envoyer au club.')
      return
    }

    const confirmed = await confirm({
      title: 'Envoyer la facture au club ?',
      message: `Voulez-vous envoyer votre facture de ${moisNoms[selectedMois - 1]} ${selectedAnnee} (${data?.totalMontant.toFixed(2)} €) par e-mail au secrétariat du club ? Attention : une fois envoyée, la facture sera entièrement verrouillée et ne pourra plus être modifiée.`,
      confirmText: 'Oui, envoyer au club',
      variant: 'success',
      icon: '✉️',
    })

    if (!confirmed) return

    setSendingEmail(true)
    try {
      const res = await fetch('/api/coach/facturation/envoyer-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mois: selectedMois, annee: selectedAnnee }),
      })

      const resData = await res.json()
      if (res.ok) {
        toast.success(resData.message || 'Facture envoyée avec succès au club !')
        fetchFacturation()
      } else {
        toast.error(resData.error || 'Erreur lors de l\'envoi')
      }
    } catch {
      toast.error('Erreur lors de l\'envoi')
    } finally {
      setSendingEmail(false)
    }
  }

  const handleAddManualLine = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!manualDescription || !manualHeures) return
    if (data?.isBlocked) {
      toast.error('Cette facture est transmise au club et ne peut plus être modifiée.')
      return
    }

    setAddingLine(true)
    try {
      const res = await fetch('/api/coach/facturation/ligne', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mois: selectedMois,
          annee: selectedAnnee,
          description: manualDescription,
          heures: parseFloat(manualHeures),
          date: manualDate || undefined,
        }),
      })

      const resData = await res.json()
      if (res.ok) {
        toast.success('Ligne ajoutée avec succès')
        setShowAddModal(false)
        setManualDescription('')
        setManualHeures('1')
        setManualDate('')
        fetchFacturation()
      } else {
        toast.error(resData.error || 'Erreur lors de l\'ajout')
      }
    } catch {
      toast.error('Erreur lors de l\'ajout')
    } finally {
      setAddingLine(false)
    }
  }

  const handleOpenCompModal = async () => {
    if (data?.isBlocked) {
      toast.error('Cette facture est transmise au club et ne peut plus être modifiée.')
      return
    }

    setCompNom('')
    setCompLieu('')
    setCompType('departementale')
    setCompFormat('demi_journee')
    setCompDistanceKm('0')
    setSelectedEventChoice('manual')
    setSelectedPiscinePreset('')

    const today = new Date()
    const currentMonthNum = today.getMonth() + 1
    const currentYearNum = today.getFullYear()
    const dayStr =
      currentMonthNum === selectedMois && currentYearNum === selectedAnnee
        ? today.getDate().toString().padStart(2, '0')
        : '01'
    setCompDate(`${selectedAnnee}-${selectedMois.toString().padStart(2, '0')}-${dayStr}`)
    setShowCompModal(true)

    // Charger les événements calendrier de la fenêtre m-1 à m+1
    setLoadingEvents(true)
    try {
      const resEvents = await fetch(`/api/coach/evenements?mois=${selectedMois}&annee=${selectedAnnee}`)
      if (resEvents.ok) {
        const evData = await resEvents.json()
        setCalendarEvents(evData.evenements || [])
      }
    } catch {
      // Ignorer silencieusement si pas d'événements
    } finally {
      setLoadingEvents(false)
    }

    // Charger les bassins fréquents configurés par l'admin
    try {
      const resPiscines = await fetch('/api/coach/facturation/calculer-distance')
      if (resPiscines.ok) {
        const pData = await resPiscines.json()
        if (pData.piscines && Array.isArray(pData.piscines)) {
          setAdminPiscines(pData.piscines)
        }
      }
    } catch {
      // Ignorer
    }
  }

  const handleSelectEvent = (choice: string) => {
    setSelectedEventChoice(choice)
    if (choice === 'manual') {
      return
    }

    const ev = calendarEvents.find((e) => e.id === choice)
    if (!ev) return

    // 1. Nom de la compétition
    setCompNom(ev.title)

    // 2. Synchronisation automatique de la date
    if (ev.date) {
      const dateStr = typeof ev.date === 'string' ? ev.date.substring(0, 10) : new Date(ev.date).toISOString().substring(0, 10)
      setCompDate(dateStr)
    }

    // 3. Détection intelligente du niveau et bassin
    const poolsToSearch = adminPiscines.length > 0 ? adminPiscines : getDefaultPiscinesFrequentes()
    let isReg = false
    if (ev.lieu) {
      // Si le lieu est dans le Vaucluse (84) -> Départementale, sinon Régionale
      isReg = !isVaucluseLieu(ev.lieu)
    } else {
      const lowerTitle = (ev.title || '').toLowerCase()
      isReg =
        lowerTitle.includes('région') ||
        lowerTitle.includes('region') ||
        lowerTitle.includes('paca') ||
        lowerTitle.includes('interclub') ||
        lowerTitle.includes('france') ||
        lowerTitle.includes('elites') ||
        lowerTitle.includes('national')
    }

    if (isReg) {
      setCompType('regionale')
      const match = matchPiscineFrequente(ev.lieu, poolsToSearch)
      if (match) {
        setSelectedPiscinePreset(match.id)
        setCompLieu(match.nom)
        setCompDistanceKm(match.distanceKm.toString())
      } else if (ev.lieu) {
        setSelectedPiscinePreset('custom')
        setCompLieu(ev.lieu)
        const catMatch = matchPiscineFrequente(ev.lieu, getDefaultPiscinesFrequentes())
        if (catMatch) {
          setCompDistanceKm(catMatch.distanceKm.toString())
        }
      }
    } else {
      setCompType('departementale')
      setCompLieu('')
      setCompDistanceKm('0')
      setSelectedPiscinePreset('')
    }
  }

  const handleSelectLevel = (level: 'departementale' | 'regionale') => {
    setCompType(level)
    const poolsToSearch = adminPiscines.length > 0 ? adminPiscines : getDefaultPiscinesFrequentes()
    if (level === 'departementale') {
      setCompDistanceKm('0')
      setCompLieu('')
      setSelectedPiscinePreset('')
    } else {
      // Régionale : si un lieu existe déjà, tenter de retrouver sa distance
      if (compLieu) {
        const match = matchPiscineFrequente(compLieu, poolsToSearch)
        if (match) {
          setSelectedPiscinePreset(match.id)
          setCompLieu(match.nom)
          setCompDistanceKm(match.distanceKm.toString())
        }
      } else if (poolsToSearch.length > 0 && (!compDistanceKm || compDistanceKm === '0')) {
        // Pré-remplir avec le premier bassin fréquent pour que la distance ne soit pas 0
        const first = poolsToSearch[0]
        setSelectedPiscinePreset(first.id)
        setCompLieu(first.nom)
        setCompDistanceKm(first.distanceKm.toString())
      }
    }
  }

  const handleCalculateRoute = async () => {
    const dest = compLieu.trim()
    if (!dest) {
      toast.error('Veuillez renseigner un nom de ville ou de piscine pour calculer le trajet.')
      return
    }

    setCalculatingRoute(true)
    try {
      const res = await fetch('/api/coach/facturation/calculer-distance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ destination: dest }),
      })
      const d = await res.json()
      if (res.ok && d.distanceKm > 0) {
        setCompDistanceKm(d.distanceKm.toString())
        if (d.resolvedLabel) {
          setCompLieu(d.resolvedLabel)
        }
        toast.success(`Trajet calculé : ${d.distanceKm} km (${d.dureeTexte || ''})`)
      } else {
        toast.error(d.error || 'Impossible de calculer la distance automatiquement. Veuillez indiquer les km manuellement.')
      }
    } catch {
      toast.error('Erreur lors du calcul de distance routière')
    } finally {
      setCalculatingRoute(false)
    }
  }

  const handleAddCompetition = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!compNom.trim() || !compDate) {
      toast.error('Veuillez renseigner le nom et la date de la compétition.')
      return
    }

    const distanceNum = compType === 'regionale' ? parseFloat(compDistanceKm) || 0 : 0

    if (compType === 'regionale') {
      if (!compLieu.trim()) {
        toast.error('Veuillez renseigner le bassin de compétition pour une compétition régionale.')
        return
      }
      if (distanceNum <= 0) {
        toast.error('Veuillez indiquer la distance aller en km (ou choisir une piscine) pour que le trajet soit pris en compte.')
        return
      }
    }

    setSubmittingComp(true)
    try {
      const lieuFinal = compType === 'regionale' ? compLieu.trim() : 'Vaucluse (84)'

      const res = await fetch('/api/coach/facturation/competition', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mois: selectedMois,
          annee: selectedAnnee,
          typeCompetition: compType,
          format: compFormat,
          nomCompetition: compNom.trim(),
          lieu: lieuFinal,
          date: compDate,
          distanceKm: distanceNum,
        }),
      })

      const resData = await res.json()
      if (res.ok) {
        toast.success('Compétition ajoutée à votre facture')
        setShowCompModal(false)
        fetchFacturation()
      } else {
        toast.error(resData.error || 'Erreur lors de l\'enregistrement')
      }
    } catch {
      toast.error('Erreur lors de l\'enregistrement de la compétition')
    } finally {
      setSubmittingComp(false)
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
      } else {
        toast.error('Erreur lors de la suppression')
      }
    } catch {
      toast.error('Erreur lors de la suppression')
    }
  }

  // CALCULS LÉGAUX URSSAF POUR COACH BNC (PRESTATIONS DE SERVICES LIBÉRALES)
  // Taux légal 2026 : 25,6% (cotisations BNC SSI) + 0,2% (CFP) = 25,8%
  // ACRE : 12,8% + 0,2% = 13,0%
  // Versement libératoire IR : +2,2%
  const tauxCotisationSociale = useMemo(() => {
    let taux = isAcre ? 12.8 : 25.6
    taux += 0.2 // Contribution Formation Professionnelle obligatoire
    if (hasVersementLiberatoire) {
      taux += 2.2 // Option versement libératoire de l'IR
    }
    return taux
  }, [isAcre, hasVersementLiberatoire])

  // Ventilation par trimestre des sommes RÉELLEMENT ENCAISSÉES (statut 'payee')
  const urssafStats = useMemo(() => {
    const trimestres = [
      { id: 'T1', nom: 'Trimestre 1', moisNums: [1, 2, 3], dateLimite: '30 avril', moisTexte: 'Janv. - Févr. - Mars', encaisse: 0, factureAttente: 0, factures: [] as PastInvoice[] },
      { id: 'T2', nom: 'Trimestre 2', moisNums: [4, 5, 6], dateLimite: '31 juillet', moisTexte: 'Avr. - Mai - Juin', encaisse: 0, factureAttente: 0, factures: [] as PastInvoice[] },
      { id: 'T3', nom: 'Trimestre 3', moisNums: [7, 8, 9], dateLimite: '31 octobre', moisTexte: 'Juil. - Août - Sept.', encaisse: 0, factureAttente: 0, factures: [] as PastInvoice[] },
      { id: 'T4', nom: 'Trimestre 4', moisNums: [10, 11, 12], dateLimite: `31 janvier ${selectedAnnee + 1}`, moisTexte: 'Oct. - Nov. - Déc.', encaisse: 0, factureAttente: 0, factures: [] as PastInvoice[] },
    ]

    let totalAnnuelEncaisse = 0
    let totalAnnuelEnAttente = 0

    allInvoicesOfYear.forEach((facture) => {
      // Déterminer le mois de rattachement légal pour l'encaissement
      let moisEncaissement = facture.mois
      if (facture.datePaiement) {
        const d = new Date(facture.datePaiement)
        if (d.getFullYear() === selectedAnnee) {
          moisEncaissement = d.getMonth() + 1
        }
      }

      const tIndex = trimestres.findIndex((t) => t.moisNums.includes(moisEncaissement))
      if (tIndex !== -1) {
        trimestres[tIndex].factures.push(facture)
        if (facture.statut === 'payee') {
          trimestres[tIndex].encaisse += facture.montantTotal
          totalAnnuelEncaisse += facture.montantTotal
        } else {
          trimestres[tIndex].factureAttente += facture.montantTotal
          totalAnnuelEnAttente += facture.montantTotal
        }
      }
    })

    const cotisationsEstimees = (totalAnnuelEncaisse * tauxCotisationSociale) / 100
    const netEstime = totalAnnuelEncaisse - cotisationsEstimees

    return {
      trimestres,
      totalAnnuelEncaisse,
      totalAnnuelEnAttente,
      cotisationsEstimees,
      netEstime,
    }
  }, [allInvoicesOfYear, selectedAnnee, tauxCotisationSociale])

  const allLignes = [
    ...(data?.lignesPlanningFixe || []),
    ...(data?.lignesPlanningTournant || []),
    ...(data?.lignesRemplacements || []),
    ...(data?.lignesAbsences || []),
    ...(data?.lignesManuelles || []),
  ]

  const getStatutBadge = (statut?: string) => {
    switch (statut) {
      case 'brouillon': return 'bg-amber-50 text-amber-800 border border-amber-200/80'
      case 'generee': return 'bg-sky-50 text-sky-800 border border-sky-200/80'
      case 'envoyee': return 'bg-emerald-50 text-emerald-800 border border-emerald-200/80'
      case 'payee': return 'bg-purple-50 text-purple-800 border border-purple-200/80'
      default: return 'bg-amber-50 text-amber-800 border border-amber-200/80'
    }
  }

  const getStatutLabel = (statut?: string) => {
    switch (statut) {
      case 'brouillon': return 'Brouillon'
      case 'generee': return 'Générée'
      case 'envoyee': return 'Envoyée au club'
      case 'payee': return 'Payée'
      default: return 'Brouillon'
    }
  }

  return (
    <div className="min-h-screen pt-2 pb-24 sm:pb-12 bg-slate-50/50 text-slate-900">
      <div className="container mx-auto px-4 max-w-5xl space-y-6">
        <CoachNav />

        {/* TOP VIEW TABS */}
        <div className="flex items-center justify-between gap-3 bg-white border border-slate-200 rounded-2xl p-1.5 shadow-xs">
          <div className="flex items-center gap-1.5 w-full sm:w-auto">
            <button
              onClick={() => setActiveTab('mensuel')}
              className={`flex-1 sm:flex-none px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 ${
                activeTab === 'mensuel'
                  ? 'bg-slate-950 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-950 hover:bg-slate-100'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Facture mensuelle</span>
            </button>

            <button
              onClick={() => setActiveTab('urssaf')}
              className={`flex-1 sm:flex-none px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 ${
                activeTab === 'urssaf'
                  ? 'bg-slate-950 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-950 hover:bg-slate-100'
              }`}
            >
              <Building2 className="w-3.5 h-3.5" />
              <span>Déclaration URSSAF / Trimestres</span>
            </button>
          </div>

          <div className="hidden sm:flex items-center gap-1 px-3 py-1 bg-slate-50 border border-slate-200/60 rounded-xl text-xs font-bold text-slate-600">
            <span>Année {selectedAnnee}</span>
          </div>
        </div>

        {activeTab === 'mensuel' ? (
          /* ========================================================= */
          /* VUE 1 : FACTURE MENSUELLE CLASSIQUE                       */
          /* ========================================================= */
          <>
            {/* MONTH PICKER BAR */}
            <div className="bg-white border border-slate-200 rounded-3xl p-4 sm:p-5 shadow-xs flex items-center justify-between gap-4">
              <button
                onClick={handlePrevMonth}
                className="p-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
                aria-label="Mois précédent"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>

              <div className="text-center">
                <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                  Période de facturation
                </p>
                <h1 className="text-xl sm:text-2xl font-black text-slate-950">
                  {moisNoms[selectedMois - 1]} {selectedAnnee}
                </h1>
              </div>

              <button
                onClick={handleNextMonth}
                className="p-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
                aria-label="Mois suivant"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>

            {loading ? (
              <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center space-y-2">
                <Loader2 className="w-6 h-6 animate-spin mx-auto text-cyan-600" />
                <p className="text-xs text-slate-500 font-bold">Calcul des heures en cours...</p>
              </div>
            ) : (
              <>
                {/* STATS & ACTIONS SUMMARY CARD */}
                <div className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-7 shadow-xs space-y-6">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-150 space-y-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Heures validées</span>
                      <p className="text-xl sm:text-2xl font-black text-slate-950">
                        {data?.totalHeures.toFixed(2)} h
                      </p>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-150 space-y-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Taux horaire</span>
                      <p className="text-xl sm:text-2xl font-black text-slate-950">
                        {data?.tauxHoraire.toFixed(2)} €
                      </p>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-150 space-y-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Total à percevoir</span>
                      <p className="text-xl sm:text-2xl font-black text-emerald-700">
                        {data?.totalMontant.toFixed(2)} €
                      </p>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-150 space-y-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Statut</span>
                      <p className="pt-0.5">
                        <span className={`inline-block px-2.5 py-0.5 rounded-md text-[11px] font-black uppercase tracking-wider ${getStatutBadge(data?.statut)}`}>
                          {getStatutLabel(data?.statut)}
                        </span>
                      </p>
                    </div>
                  </div>

                  {/* NOTE PÉDAGOGIQUE POUR LE MOIS EN COURS */}
                  {selectedMois === (new Date().getMonth() + 1) && selectedAnnee === new Date().getFullYear() && (
                    <div className="p-3.5 bg-blue-50/80 border border-blue-200/70 rounded-2xl flex items-start gap-3 text-blue-900 text-xs font-medium">
                      <Clock className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                      <div className="space-y-0.5">
                        <p className="font-bold text-blue-950">Mois en cours : cumul progressif des séances</p>
                        <p className="text-[11px] text-blue-700 font-normal leading-relaxed">
                          Les créneaux hebdomadaires récurrents de votre planning s&apos;accumulent au fur et à mesure des jours écoulés jusqu&apos;à la fin du mois.
                          {data && data.totalMontant <= 0 && (
                            <span className="block mt-1 text-blue-800 font-semibold">
                              ℹ️ Vos séances régulières ne sont comptabilisées qu&apos;à leur date effective. C&apos;est pourquoi votre solde actuel ne reflète pour l&apos;instant que les éventuelles déductions ou forfaits.
                            </span>
                          )}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* BANNIÈRE CONTEXTUELLE D'ÉTAT */}
                  {(!data?.statut || data.statut === 'brouillon') && (
                    <div className="p-4 bg-amber-50/90 border border-amber-200/80 rounded-2xl flex items-start gap-3 text-amber-900 text-xs font-semibold leading-relaxed">
                      <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                      <div>
                        <p>Cette facture est en <strong>brouillon</strong>. Vérifiez vos séances et prestations ci-dessous.</p>
                        <p className="text-[11px] text-amber-700 font-normal mt-0.5">
                          Cliquez sur <strong>&quot;Générer la facture&quot;</strong> pour officialiser le document avec son numéro officiel et pouvoir ensuite l&apos;envoyer au club.
                        </p>
                      </div>
                    </div>
                  )}

                  {data?.statut === 'generee' && (
                    <div className="p-4 bg-sky-50/90 border border-sky-200/80 rounded-2xl flex items-start gap-3 text-sky-900 text-xs font-semibold leading-relaxed">
                      <FileText className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />
                      <div>
                        <p>Facture générée avec succès ! <strong>Elle n&apos;est pas encore transmise au club.</strong></p>
                        <p className="text-[11px] text-sky-700 font-normal mt-0.5">
                          Vous pouvez encore ajouter ou supprimer des prestations si besoin (pensez à cliquer sur <em>&quot;Régénérer&quot;</em>). Dès que vous êtes prêt, cliquez sur <strong>&quot;Envoyer au club&quot;</strong>.
                        </p>
                      </div>
                    </div>
                  )}

                  {data?.statut === 'envoyee' && (
                    <div className="p-4 bg-emerald-50/90 border border-emerald-200/80 rounded-2xl flex items-start gap-3 text-emerald-900 text-xs font-semibold leading-relaxed">
                      <Lock className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                      <div>
                        <p>🔒 <strong>Facture envoyée au club.</strong> Tout est désormais verrouillé.</p>
                        <p className="text-[11px] text-emerald-700 font-normal mt-0.5">
                          Cette facture a été transmise par e-mail au secrétariat du club. Aucune modification (ajout ou suppression) n&apos;est plus permise.
                        </p>
                      </div>
                    </div>
                  )}

                  {data?.statut === 'payee' && (
                    <div className="p-4 bg-purple-50/90 border border-purple-200/80 rounded-2xl flex items-start gap-3 text-purple-900 text-xs font-semibold leading-relaxed">
                      <CheckCircle2 className="w-4 h-4 text-purple-700 shrink-0 mt-0.5" />
                      <div>
                        <p>✅ <strong>Facture payée et archivée.</strong></p>
                        <p className="text-[11px] text-purple-700 font-normal mt-0.5">
                          Le règlement a été effectué par le club pour ce mois.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* ACTION BUTTONS */}
                  <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-100">
                    {/* CAS 1 : BROUILLON */}
                    {(!data?.statut || data.statut === 'brouillon') && (
                      <>
                        <button
                          onClick={handleGenerateInvoice}
                          disabled={generatingInvoice || !data?.totalMontant}
                          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary hover:bg-primary-dark text-white text-xs font-black shadow-xs transition-all disabled:opacity-50"
                        >
                          {generatingInvoice ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4 text-white" />}
                          <span>Générer la facture</span>
                        </button>

                        <button
                          disabled={true}
                          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-100 text-slate-400 border border-slate-200 text-xs font-bold cursor-not-allowed"
                          title="Générez d'abord la facture avant de l'envoyer au club"
                        >
                          <Send className="w-4 h-4 text-slate-400" />
                          <span>Envoyer au club</span>
                        </button>

                        <button
                          onClick={() => handleDownloadPDF()}
                          disabled={generatingPdf}
                          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all disabled:opacity-50"
                        >
                          {generatingPdf ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4 text-slate-600" />}
                          <span>Prévisualiser PDF</span>
                        </button>
                      </>
                    )}

                    {/* CAS 2 : GÉNÉRÉE NON ENVOYÉE */}
                    {data?.statut === 'generee' && (
                      <>
                        <button
                          onClick={handleSendEmail}
                          disabled={sendingEmail}
                          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black shadow-xs transition-all disabled:opacity-50"
                        >
                          {sendingEmail ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4 text-white" />}
                          <span>Envoyer au club</span>
                        </button>

                        <button
                          onClick={() => handleDownloadPDF()}
                          disabled={generatingPdf}
                          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-950 hover:bg-slate-800 text-white text-xs font-black shadow-xs transition-all disabled:opacity-50"
                        >
                          {generatingPdf ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4 text-emerald-400" />}
                          <span>Télécharger la facture PDF</span>
                        </button>

                        <button
                          onClick={handleGenerateInvoice}
                          disabled={generatingInvoice}
                          className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-sky-50 hover:bg-sky-100 text-sky-800 border border-sky-200 text-xs font-bold transition-all disabled:opacity-50"
                          title="Régénérer la facture avec vos nouvelles modifications avant l'envoi"
                        >
                          {generatingInvoice ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-3.5 h-3.5 text-sky-600" />}
                          <span>Régénérer</span>
                        </button>
                      </>
                    )}

                    {/* CAS 3 : DÉJÀ ENVOYÉE */}
                    {data?.statut === 'envoyee' && (
                      <>
                        <button
                          onClick={() => handleDownloadPDF()}
                          disabled={generatingPdf}
                          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-950 hover:bg-slate-800 text-white text-xs font-black shadow-xs transition-all disabled:opacity-50"
                        >
                          {generatingPdf ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4 text-emerald-400" />}
                          <span>Télécharger la facture PDF</span>
                        </button>

                        <button
                          onClick={handleSendEmail}
                          disabled={sendingEmail}
                          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-200 text-xs font-bold transition-all disabled:opacity-50"
                        >
                          {sendingEmail ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4 text-emerald-700" />}
                          <span>Renvoyer au club</span>
                        </button>
                      </>
                    )}

                    {/* CAS 4 : PAYÉE */}
                    {data?.statut === 'payee' && (
                      <button
                        onClick={() => handleDownloadPDF()}
                        disabled={generatingPdf}
                        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-950 hover:bg-slate-800 text-white text-xs font-black shadow-xs transition-all disabled:opacity-50"
                      >
                        {generatingPdf ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4 text-emerald-400" />}
                        <span>Télécharger PDF archivé</span>
                      </button>
                    )}

                    {/* ACTIONS D'AJOUT : ACTIVES SEULEMENT SI NON BLOQUÉE */}
                    <div className="flex items-center gap-2 ml-auto flex-wrap">
                      {!data?.isBlocked ? (
                        <>
                          <button
                            onClick={handleOpenCompModal}
                            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-primary hover:bg-primary-dark text-white text-xs font-bold shadow-xs transition-all"
                          >
                            <Trophy className="w-3.5 h-3.5 text-white" />
                            <span>Déclarer une compétition</span>
                          </button>

                          <button
                            onClick={() => setShowAddModal(true)}
                            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Ajouter une prestation</span>
                          </button>
                        </>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 border border-slate-200 text-slate-500 text-xs font-bold">
                          <Lock className="w-3.5 h-3.5 text-slate-400" />
                          <span>Modifications verrouillées</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* BREAKDOWN LIST */}
                <div className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-7 shadow-xs space-y-4">
                  <h2 className="text-base font-black text-slate-950 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-slate-400" />
                    <span>Détail des séances et prestations ({allLignes.length})</span>
                  </h2>

                  {allLignes.length === 0 ? (
                    <div className="text-center py-8 text-slate-400 space-y-1">
                      <p className="text-xs font-bold">Aucune séance effectuée pour ce mois</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-100">
                      {allLignes.map((l, idx) => {
                        const isDeletable = l.id && ['manuel', 'competition', 'forfait_transport', 'forfait_regional'].includes(l.type)
                        const dateFormatted = l.date ? new Date(l.date).toLocaleDateString('fr-FR') : null

                        return (
                          <div key={l.id || idx} className="py-3.5 first:pt-0 last:pb-0 flex items-center justify-between gap-3">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                {l.type === 'absence' && (
                                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-red-50 text-red-700 border border-red-200/80">
                                    Absence déduite
                                  </span>
                                )}
                                {l.type === 'remplacement' && (
                                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-blue-50 text-blue-700 border border-blue-200/80">
                                    Remplacement effectué
                                  </span>
                                )}
                                {l.type === 'competition' && (
                                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-50 text-primary border border-emerald-200/80">
                                    <Trophy className="w-3 h-3 text-primary" />
                                    Compétition
                                  </span>
                                )}
                                {l.type === 'forfait_transport' && (
                                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-50/80 text-emerald-800 border border-emerald-200/80">
                                    <Car className="w-3 h-3 text-emerald-700" />
                                    Forfait transport
                                  </span>
                                )}
                                <p className="text-xs font-extrabold text-slate-900">
                                  {l.description}
                                </p>
                              </div>
                              <p className="text-[11px] text-slate-500">
                                {dateFormatted ? `Date : ${dateFormatted} · ` : ''}
                                {l.type === 'competition'
                                  ? (l.demiJournees === 2 || l.heures === 2 ? '1 journée complète (130 €)' : '1 demi-journée (50 €)')
                                  : l.type === 'forfait_transport'
                                  ? `${l.heures} km aller × 0,30 €/km`
                                  : l.heures !== undefined && l.heures !== 0
                                  ? `${Math.abs(l.heures)} heure${Math.abs(l.heures) > 1 ? 's' : ''}`
                                  : ''}
                              </p>
                            </div>

                            <div className="flex items-center gap-3">
                              <span className={`text-xs font-black ${l.montant < 0 ? 'text-red-600' : 'text-slate-950'}`}>
                                {l.montant < 0 ? `-${Math.abs(l.montant).toFixed(2)} €` : `${l.montant.toFixed(2)} €`}
                              </span>
                              {isDeletable && (
                                <button
                                  onClick={() => handleDeleteLine(l.id!, l.type)}
                                  className="p-1.5 text-slate-400 hover:text-red-600 transition-colors rounded-lg hover:bg-red-50"
                                  title={l.type === 'competition' || l.type === 'forfait_transport' ? 'Supprimer la compétition' : 'Supprimer'}
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>

                {/* PAST INVOICES ARCHIVE */}
                {allInvoicesOfYear.length > 0 && (
                  <div className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-7 shadow-xs space-y-4">
                    <h2 className="text-base font-black text-slate-950 flex items-center gap-2">
                      <Receipt className="w-4 h-4 text-slate-400" />
                      <span>Historique des factures ({selectedAnnee})</span>
                    </h2>

                    <div className="grid sm:grid-cols-3 gap-3">
                      {allInvoicesOfYear.map((inv) => (
                        <div
                          key={inv.id}
                          className="p-4 rounded-2xl bg-slate-50 border border-slate-200/60 flex items-center justify-between"
                        >
                          <div>
                            <p className="text-xs font-black text-slate-900">
                              {moisNoms[inv.mois - 1]} {inv.annee}
                            </p>
                            <p className="text-[10px] text-slate-400 font-mono">N° {inv.numero}</p>
                            <p className="text-xs font-extrabold text-emerald-700 mt-1">
                              {inv.montantTotal.toFixed(2)} €
                            </p>
                          </div>

                          <button
                            onClick={() => handleDownloadPDF(inv.mois, inv.annee)}
                            className="p-2 rounded-xl bg-white hover:bg-slate-200 border border-slate-200 text-slate-700 transition-colors shadow-2xs"
                            title="Télécharger PDF"
                          >
                            <Download className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </>
        ) : (
          /* ========================================================= */
          /* VUE 2 : RÉCAPITULATIF LÉGAL URSSAF BNC (TRIMESTRES)       */
          /* ========================================================= */
          <div className="space-y-6">
            {/* HEADER URSSAF */}
            <div className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-7 shadow-xs space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl sm:text-2xl font-black text-slate-950 tracking-tight">
                    Déclarations URSSAF {selectedAnnee}
                  </h2>
                  <p className="text-xs text-slate-500 font-medium mt-0.5">
                    Régime Micro-BNC (Prestations de services libérales) · Comptabilité de caisse (recettes encaissées).
                  </p>
                </div>

                {/* SÉLECTEUR D'ANNÉE */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setSelectedAnnee((a) => a - 1)}
                    className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="text-sm font-black px-2">{selectedAnnee}</span>
                  <button
                    onClick={() => setSelectedAnnee((a) => a + 1)}
                    className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* OPTIONS FISCALES PERSONNALISABLES */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/60 flex flex-wrap items-center justify-between gap-4 text-xs">
                <div className="flex items-center gap-4 flex-wrap">
                  <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-700">
                    <input
                      type="checkbox"
                      checked={isAcre}
                      onChange={(e) => setIsAcre(e.target.checked)}
                      className="w-4 h-4 rounded text-slate-950 focus:ring-0"
                    />
                    <span>Bénéficiaire ACRE (50% de réduction)</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-700">
                    <input
                      type="checkbox"
                      checked={hasVersementLiberatoire}
                      onChange={(e) => setHasVersementLiberatoire(e.target.checked)}
                      className="w-4 h-4 rounded text-slate-950 focus:ring-0"
                    />
                    <span>Option versement libératoire IR (+2,2%)</span>
                  </label>
                </div>

                <div className="text-[11px] font-black text-slate-600">
                  Taux calculé : <span className="text-slate-950 text-xs">{tauxCotisationSociale.toFixed(1)} %</span> (dont 0,2% CFP)
                </div>
              </div>

              {/* SYNTHÈSE ANNUELLE */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-150 space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    Chiffre d&apos;Affaires Encaissé
                  </span>
                  <p className="text-xl sm:text-2xl font-black text-slate-950">
                    {urssafStats.totalAnnuelEncaisse.toFixed(2)} €
                  </p>
                  <p className="text-[10px] text-slate-400">Total payé sur l&apos;année</p>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-150 space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    Cotisations estimées
                  </span>
                  <p className="text-xl sm:text-2xl font-black text-slate-700">
                    {urssafStats.cotisationsEstimees.toFixed(2)} €
                  </p>
                  <p className="text-[10px] text-slate-400">À {tauxCotisationSociale.toFixed(1)}%</p>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-150 space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    Revenu Net Estimé
                  </span>
                  <p className="text-xl sm:text-2xl font-black text-emerald-700">
                    {urssafStats.netEstime.toFixed(2)} €
                  </p>
                  <p className="text-[10px] text-emerald-600/80 font-bold">Après cotisations</p>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-150 space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    En attente de paiement
                  </span>
                  <p className="text-xl sm:text-2xl font-black text-amber-700">
                    {urssafStats.totalAnnuelEnAttente.toFixed(2)} €
                  </p>
                  <p className="text-[10px] text-amber-600/80 font-medium">Non déclarable tant que non payé</p>
                </div>
              </div>
            </div>

            {/* GRILLE DES 4 TRIMESTRES CIVILS */}
            <div className="grid md:grid-cols-2 gap-4">
              {urssafStats.trimestres.map((t) => {
                const cotisT = (t.encaisse * tauxCotisationSociale) / 100
                const netT = t.encaisse - cotisT

                return (
                  <div
                    key={t.id}
                    className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 shadow-xs space-y-4"
                  >
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded-md text-xs font-black bg-slate-950 text-white">
                            {t.id}
                          </span>
                          <h3 className="text-sm font-black text-slate-900">{t.nom}</h3>
                        </div>
                        <p className="text-[11px] text-slate-400 font-medium mt-0.5">{t.moisTexte}</p>
                      </div>

                      <div className="text-right">
                        <span className="text-[10px] font-bold text-slate-400 block">Date limite de déclaration</span>
                        <span className="text-xs font-black text-slate-800">{t.dateLimite}</span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-150">
                        <div>
                          <span className="text-[10px] font-bold uppercase text-slate-500 block">
                            Montant exact à déclarer à l&apos;URSSAF
                          </span>
                          <span className="text-[10px] text-slate-400">
                            Case : Autres prestations de services (BNC)
                          </span>
                        </div>
                        <p className="text-lg font-black text-slate-950">
                          {t.encaisse.toFixed(2)} €
                        </p>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="p-2.5 rounded-xl bg-slate-50/60 border border-slate-150">
                          <span className="text-[10px] text-slate-500 font-medium block">Cotisations ({tauxCotisationSociale.toFixed(1)}%)</span>
                          <span className="font-bold text-slate-700">{cotisT.toFixed(2)} €</span>
                        </div>
                        <div className="p-2.5 rounded-xl bg-emerald-50/50 border border-emerald-100">
                          <span className="text-[10px] text-emerald-800 font-medium block">Net estimé</span>
                          <span className="font-extrabold text-emerald-800">{netT.toFixed(2)} €</span>
                        </div>
                      </div>

                      {t.factureAttente > 0 && (
                        <p className="text-[10px] text-amber-700 font-medium pt-1">
                          ⚠️ {t.factureAttente.toFixed(2)} € en cours de traitement (à reporter sur le trimestre où le paiement sera reçu).
                        </p>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>

            {/* RAPPEL LÉGAL OFFICIEL */}
            <div className="bg-slate-100/70 border border-slate-200/80 rounded-2xl p-4 text-xs text-slate-600 space-y-1.5">
              <p className="font-black text-slate-800 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-slate-700" />
                <span>Rappels légaux pour les éducateurs et coachs sportifs indépendants</span>
              </p>
              <ul className="list-disc list-inside text-[11px] text-slate-500 space-y-1 leading-relaxed">
                <li>
                  <strong>Comptabilité d&apos;encaissement :</strong> Vous devez déclarer uniquement les montants <em>effectivement reçus sur votre compte bancaire</em> au cours du mois ou du trimestre, indépendamment de la date d&apos;émission de la facture.
                </li>
                <li>
                  <strong>Plafond de franchise en base de TVA :</strong> 36 800 € (seuil majoré 39 100 €). En dessous de ce seuil, vos factures sont exonérées de TVA (art. 293 B du CGI).
                </li>
                <li>
                  <strong>Cumul d&apos;activité :</strong> Ce récapitulatif comptabilise exclusivement vos prestations au sein du Triton Club Cavaillon. Si vous facturez d&apos;autres clients, additionnez vos recettes avant de valider votre déclaration sur <em>autoentrepreneur.urssaf.fr</em>.
                </li>
              </ul>
            </div>
          </div>
        )}

        {/* MODAL AJOUT COMPÉTITION */}
        {showCompModal && (
          <div className="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-xl w-full shadow-2xl space-y-5 my-8 border border-slate-200">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-primary shrink-0">
                    <Trophy className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-base sm:text-lg font-black text-slate-950">
                      Déclarer une compétition
                    </h3>
                    <p className="text-xs text-slate-500">
                      Rémunération officielle &amp; forfait transport kilométrique
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowCompModal(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 transition-colors"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleAddCompetition} className="space-y-4">
                {/* 1. NIVEAU DE LA COMPÉTITION */}
                <div className="space-y-1.5">
                  <label className="text-xs font-black text-slate-800">
                    Niveau de la compétition *
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <button
                      type="button"
                      onClick={() => handleSelectLevel('departementale')}
                      className={`p-3.5 rounded-2xl border text-left transition-all ${
                        compType === 'departementale'
                          ? 'border-primary bg-emerald-50/50 ring-1 ring-primary text-slate-950 shadow-xs'
                          : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-800'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black">Départementale</span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                          compType === 'departementale' ? 'bg-primary text-white' : 'bg-slate-100 text-slate-600'
                        }`}>
                          Vaucluse (84)
                        </span>
                      </div>
                      <p className="text-[11px] mt-1 text-slate-600">
                        Demi-j. 50 € · Journée 130 €<br />
                        <span className="text-slate-400 font-medium">Sans forfait transport</span>
                      </p>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleSelectLevel('regionale')}
                      className={`p-3.5 rounded-2xl border text-left transition-all ${
                        compType === 'regionale'
                          ? 'border-primary bg-emerald-50/50 ring-1 ring-primary text-slate-950 shadow-xs'
                          : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-800'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black">Régionale</span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                          compType === 'regionale' ? 'bg-primary text-white' : 'bg-slate-100 text-slate-600'
                        }`}>
                          Hors 84
                        </span>
                      </div>
                      <p className="text-[11px] mt-1 text-slate-600">
                        Demi-j. 50 € · Journée 130 €<br />
                        <span className="text-primary font-bold">
                          + Forfait transport (0,30 €/km aller)
                        </span>
                      </p>
                    </button>
                  </div>
                </div>

                {/* 2. FORMAT DE LA PRESTATION */}
                <div className="space-y-1.5">
                  <label className="text-xs font-black text-slate-800">
                    Format de la prestation *
                  </label>
                  <div className="grid grid-cols-2 gap-2.5">
                    <button
                      type="button"
                      onClick={() => setCompFormat('demi_journee')}
                      className={`p-3 rounded-2xl border text-center transition-all ${
                        compFormat === 'demi_journee'
                          ? 'border-primary bg-emerald-50/50 ring-1 ring-primary shadow-xs'
                          : 'border-slate-200 bg-white hover:bg-slate-50'
                      }`}
                    >
                      <span className="text-xs font-black block text-slate-900">Demi-journée</span>
                      <span className={`text-sm font-extrabold ${compFormat === 'demi_journee' ? 'text-primary' : 'text-slate-600'}`}>
                        50,00 €
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setCompFormat('journee')}
                      className={`p-3 rounded-2xl border text-center transition-all ${
                        compFormat === 'journee'
                          ? 'border-primary bg-emerald-50/50 ring-1 ring-primary shadow-xs'
                          : 'border-slate-200 bg-white hover:bg-slate-50'
                      }`}
                    >
                      <span className="text-xs font-black block text-slate-900">Journée complète</span>
                      <span className={`text-sm font-extrabold ${compFormat === 'journee' ? 'text-primary' : 'text-slate-600'}`}>
                        130,00 €
                      </span>
                    </button>
                  </div>
                </div>

                {/* 3. NOM DE LA COMPÉTITION & SÉLECTION CALENDRIER */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-black text-slate-800">
                      Nom de la compétition *
                    </label>
                    <span className="text-[10px] text-slate-400">
                      {loadingEvents ? 'Recherche des événements...' : `${calendarEvents.length} événement(s) trouvé(s)`}
                    </span>
                  </div>

                  {/* Dropdown choix événement ou saisie manuelle */}
                  <select
                    value={selectedEventChoice}
                    onChange={(e) => handleSelectEvent(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-900 focus:bg-white focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none transition-all"
                  >
                    <option value="manual">✏️ Saisie manuelle</option>
                    {calendarEvents.length > 0 && (
                      <optgroup label="Événements du club (m-1, m, m+1)">
                        {calendarEvents.map((ev) => {
                          const evDateStr = new Date(ev.date).toLocaleDateString('fr-FR', {
                            day: '2-digit',
                            month: '2-digit',
                          })
                          return (
                            <option key={ev.id} value={ev.id}>
                              📅 {evDateStr} - {ev.title} {ev.lieu ? `(${ev.lieu})` : ''}
                            </option>
                          )
                        })}
                      </optgroup>
                    )}
                  </select>

                  {/* Champ d'édition ou affichage du nom */}
                  {selectedEventChoice === 'manual' ? (
                    <input
                      type="text"
                      required
                      placeholder="Ex: Trophée Départemental, Championnats Régionaux PACA..."
                      value={compNom}
                      onChange={(e) => setCompNom(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:bg-white focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none"
                    />
                  ) : (
                    <div className="flex items-center justify-between px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs">
                      <span className="font-semibold text-slate-900 truncate">
                        {compNom || 'Compétition sélectionnée'}
                      </span>
                      <button
                        type="button"
                        onClick={() => setSelectedEventChoice('manual')}
                        className="text-[11px] font-bold text-primary hover:underline shrink-0 ml-2"
                      >
                        Modifier le titre
                      </button>
                    </div>
                  )}
                </div>

                {/* 4. DATE DE LA COMPÉTITION (AVEC SYNCHRONISATION AUTOMATIQUE) */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-black text-slate-800">Date *</label>
                    {selectedEventChoice !== 'manual' && (
                      <span className="text-[10px] font-black text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 inline-flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        <span>Synchronisation automatique de la date</span>
                      </span>
                    )}
                  </div>
                  <input
                    type="date"
                    required
                    value={compDate}
                    onChange={(e) => setCompDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-900 focus:bg-white focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none"
                  />
                </div>

                {/* 5. LIEU / BASSIN & DISTANCE (UNIQUEMENT POUR COMPÉTITION RÉGIONALE - ABSENT EN DÉPARTEMENTALE) */}
                {compType === 'regionale' && (
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-primary" />
                          <span>Piscine / Bassin de compétition (Hors 84) *</span>
                        </label>
                        <span className="text-[10px] text-slate-500 font-medium">Départ : Cavaillon</span>
                      </div>

                      {/* Sélecteur des bassins fréquents admin */}
                      {adminPiscines.length > 0 && (
                        <select
                          value={selectedPiscinePreset}
                          onChange={(e) => {
                            const val = e.target.value
                            setSelectedPiscinePreset(val)
                            const pools = adminPiscines.length > 0 ? adminPiscines : getDefaultPiscinesFrequentes()
                            if (val === 'custom') {
                              setCompLieu('')
                              setCompDistanceKm('')
                            } else {
                              const found = pools.find((p) => p.id === val)
                              if (found) {
                                setCompLieu(found.nom)
                                setCompDistanceKm(found.distanceKm.toString())
                              }
                            }
                          }}
                          className="w-full px-3 py-2.5 rounded-xl bg-white border border-slate-200 text-xs font-semibold text-slate-900 focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none transition-all"
                        >
                          <option value="">Sélectionner un bassin fréquent (paramètres admin)...</option>
                          {adminPiscines.map((p) => (
                            <option key={p.id} value={p.id}>
                              🏊 {p.nom} ({p.distanceKm} km aller)
                            </option>
                          ))}
                          <option value="custom">✏️ Autre bassin / Saisie personnalisée</option>
                        </select>
                      )}

                      {/* Champ texte pour le lieu avec auto-détection et calcul rapide */}
                      {(selectedPiscinePreset === 'custom' || !selectedPiscinePreset || adminPiscines.length === 0) && (
                        <div className="space-y-1.5">
                          <div className="flex gap-2">
                            <input
                              type="text"
                              required
                              placeholder="Ex: Piscine Yves Blanc (Aix), Stade Nautique Jean Bouin (Antibes)..."
                              value={compLieu}
                              onChange={(e) => {
                                const val = e.target.value
                                setCompLieu(val)
                                const pools = adminPiscines.length > 0 ? adminPiscines : getDefaultPiscinesFrequentes()
                                const match = matchPiscineFrequente(val, pools)
                                if (match) {
                                  setCompDistanceKm(match.distanceKm.toString())
                                }
                              }}
                              className="flex-1 px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs font-medium text-slate-900 focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none"
                            />
                            <button
                              type="button"
                              onClick={handleCalculateRoute}
                              disabled={calculatingRoute || !compLieu.trim()}
                              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold disabled:opacity-50 transition-all shrink-0 cursor-pointer"
                              title="Calculer l'itinéraire routier le plus rapide depuis Cavaillon"
                            >
                              {calculatingRoute ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <Navigation className="w-3.5 h-3.5 text-emerald-400" />
                              )}
                              <span>Calculer km</span>
                            </button>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Saisie simple de la distance aller & calcul direct */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 items-end">
                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-slate-700">
                          Distance aller depuis Cavaillon (km) * :
                        </label>
                        <input
                          type="number"
                          min="1"
                          step="1"
                          required
                          value={compDistanceKm}
                          onChange={(e) => setCompDistanceKm(e.target.value)}
                          placeholder="Ex: 56"
                          className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs font-black text-slate-900 focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none"
                        />
                      </div>

                      <div className="p-2.5 rounded-xl bg-white border border-emerald-200/80 shadow-2xs">
                        <span className="text-[10px] text-slate-500 font-bold block">Forfait transport calculé</span>
                        <p className="text-xs font-mono font-black text-primary">
                          {parseFloat(compDistanceKm) || 0} km × 0,30 € = {((parseFloat(compDistanceKm) || 0) * 0.3).toFixed(2)} €
                        </p>
                      </div>
                    </div>

                    {/* Alerte si la distance n'est pas encore renseignée */}
                    {(!compDistanceKm || parseFloat(compDistanceKm) <= 0) && (
                      <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-[11px] text-amber-800 flex items-center gap-2">
                        <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                        <span>Indiquez la distance aller (en km) ou choisissez une piscine pour que le forfait transport soit calculé et ajouté.</span>
                      </div>
                    )}

                    {/* Lien discret de vérification Google Maps */}
                    <div className="pt-1 flex items-center justify-between text-[11px]">
                      <span className="text-slate-400 text-[10px]">Départ : Piscine Alphonse Roudière, Cavaillon</span>
                      <a
                        href={`https://www.google.com/maps/dir/?api=1&origin=Piscine+Alphonse+Roudi%C3%A8re,+84300+Cavaillon&destination=${encodeURIComponent(compLieu || 'PACA')}&travelmode=driving`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-slate-600 hover:text-primary font-bold underline transition-colors"
                        title="Vérifier l'itinéraire le plus rapide sur Google Maps"
                      >
                        <span>Vérifier sur Google Maps</span>
                        <ExternalLink className="w-2.5 h-2.5 text-slate-400" />
                      </a>
                    </div>
                  </div>
                )}

                {/* 6. RÉCAPITULATIF LIVE */}
                <div className="p-4 rounded-2xl bg-slate-950 text-white space-y-2">
                  <div className="flex items-center justify-between text-xs text-slate-300">
                    <span>
                      Forfait compétition ({compFormat === 'journee' ? 'Journée complète' : 'Demi-journée'})
                    </span>
                    <span className="font-bold text-white font-mono">
                      {compFormat === 'journee' ? '130,00 €' : '50,00 €'}
                    </span>
                  </div>

                  {compType === 'regionale' && (
                    <div className="flex items-center justify-between text-xs text-slate-300">
                      <span>
                        Forfait transport aller ({parseFloat(compDistanceKm) || 0} km × 0,30 €)
                      </span>
                      <span className="font-bold text-emerald-400 font-mono">
                        + {((parseFloat(compDistanceKm) || 0) * 0.3).toFixed(2)} €
                      </span>
                    </div>
                  )}

                  <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
                    <span className="text-xs font-black text-slate-200">
                      Total ajouté à votre facture
                    </span>
                    <span className="text-base sm:text-lg font-black text-emerald-400 font-mono">
                      {(
                        (compFormat === 'journee' ? 130 : 50) +
                        (compType === 'regionale' ? (parseFloat(compDistanceKm) || 0) * 0.3 : 0)
                      ).toFixed(2)}{' '}
                      €
                    </span>
                  </div>
                </div>

                {/* 7. ACTIONS FOOTER */}
                <div className="pt-2 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowCompModal(false)}
                    className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    disabled={submittingComp || !compNom.trim() || !compDate || (compType === 'regionale' && (!compDistanceKm || parseFloat(compDistanceKm) <= 0))}
                    className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-primary hover:bg-primary-dark text-white text-xs font-black disabled:opacity-50 shadow-xs transition-all cursor-pointer"
                  >
                    {submittingComp ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trophy className="w-3.5 h-3.5" />}
                    <span>Ajouter à ma facture</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL AJOUT LIGNE MANUELLE */}
        {showAddModal && (
          <div className="fixed inset-0 z-50 bg-slate-950/40 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-xl space-y-4">
              <h3 className="text-base font-black text-slate-950">
                Ajouter une prestation manuelle
              </h3>

              <form onSubmit={handleAddManualLine} className="space-y-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Description *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Stage vacances, réunion technique..."
                    value={manualDescription}
                    onChange={(e) => setManualDescription(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:bg-white focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700">Nombre d&apos;heures *</label>
                    <input
                      type="number"
                      step="0.25"
                      min="0.25"
                      required
                      value={manualHeures}
                      onChange={(e) => setManualHeures(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:bg-white focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700">Date (optionnelle)</label>
                    <input
                      type="date"
                      value={manualDate}
                      onChange={(e) => setManualDate(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:bg-white focus:outline-none"
                    />
                  </div>
                </div>

                <div className="pt-3 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    disabled={addingLine}
                    className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-slate-950 hover:bg-slate-800 text-white text-xs font-extrabold disabled:opacity-50"
                  >
                    {addingLine ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                    <span>Ajouter</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
