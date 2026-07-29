'use client'
export const dynamic = 'force-dynamic';
import { Suspense, useCallback, useEffect, useState, useMemo } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import CoachNav from '@/components/coach/CoachNav'
import { logger } from '@/lib/logger'
import { getErrorMessage } from '@/lib/utils'
import { HelpTooltip, CalculationTooltip } from '@/components/ui/Tooltip'
import FacturationQuickSummary from '@/components/coach/facturation/FacturationQuickSummary'
import { useConfirmDialog } from '@/components/ConfirmDialog'
import toast from 'react-hot-toast'

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
  coachRemplaceId?: string | null
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
  joursTravailles?: number[]
  isBlocked?: boolean
  statut?: string
  message?: string
}

interface CalendarSession {
  id?: string
  type: 'fixe' | 'tournant' | 'remplacement' | 'absence' | 'competition' | 'forfait_regional'
  description: string
  heures: number
  montant: number
  dateStr: string // YYYY-MM-DD
  demiJournees?: number | null
  originalLigne: LigneFacture
}

interface SelectedDayDetails {
  dateStr: string
  sessions: CalendarSession[]
}

export default function FacturationPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen py-8 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="text-center py-20">
            <p className="text-gray-600">Chargement...</p>
          </div>
        </div>
      </div>
    }>
      <FacturationContent />
    </Suspense>
  )
}

function FacturationContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { confirm } = useConfirmDialog()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [data, setData] = useState<FacturationData | null>(null)

  // View mode switcher: table layout or monthly calendar view
  const [activeView, setActiveView] = useState<'table' | 'calendar'>('table')
  const [daySelectorDate, setDaySelectorDate] = useState<string | null>(null)
  const [selectedDayDetails, setSelectedDayDetails] = useState<SelectedDayDetails | null>(null)

  // Sélecteur de mois/année - initialize from URL params or current date
  const currentDate = new Date()
  const [selectedMois, setSelectedMois] = useState(() => {
    const moisParam = searchParams.get('mois')
    return moisParam ? parseInt(moisParam, 10) : currentDate.getMonth() + 1
  })
  const [selectedAnnee, setSelectedAnnee] = useState(() => {
    const anneeParam = searchParams.get('annee')
    return anneeParam ? parseInt(anneeParam, 10) : currentDate.getFullYear()
  })

  // Popup pour ajout/modification manuel
  const [showPopup, setShowPopup] = useState(false)
  const [popupType, setPopupType] = useState<'remplacement' | 'competition' | 'forfait_regional' | 'absence' | null>(null)
  const [editingLigne, setEditingLigne] = useState<LigneFacture | null>(null)
  const [conflictWarning, setConflictWarning] = useState<string | null>(null)

  // État export Abby & Popups
  const [loadingAbby, setLoadingAbby] = useState(false)
  const [abbyModal, setAbbyModal] = useState<{
    open: boolean
    type: 'missing_key' | 'error' | 'success'
    title: string
    message: string
    code?: string
    status?: number
    details?: string
  } | null>(null)

  // Formulaire absence
  const [absenceDate, setAbsenceDate] = useState('')
  const [absenceHeures, setAbsenceHeures] = useState('')
  const [absenceHeureDebut, setAbsenceHeureDebut] = useState('')
  const [absenceHeureFin, setAbsenceHeureFin] = useState('')

  // Formulaire remplacement
  const [remplacementDate, setRemplacementDate] = useState('')
  const [remplacementGroupe, setRemplacementGroupe] = useState('')
  const [remplacementHeures, setRemplacementHeures] = useState('')
  const [remplacementHeureDebut, setRemplacementHeureDebut] = useState('')
  const [remplacementHeureFin, setRemplacementHeureFin] = useState('')

  // Formulaire compétition
  const [competitionDate, setCompetitionDate] = useState('')
  const [competitionLieu, setCompetitionLieu] = useState('')
  const [competitionCategories, setCompetitionCategories] = useState<string[]>([])
  const [competitionDemiJournees, setCompetitionDemiJournees] = useState('')
  const [selectedEvenementId, setSelectedEvenementId] = useState('')

  // Formulaire forfait régional
  const [forfaitRegionalDate, setForfaitRegionalDate] = useState('')
  const [forfaitRegionalLieu, setForfaitRegionalLieu] = useState('')
  const [forfaitRegionalCategorie, setForfaitRegionalCategorie] = useState('')
  const [forfaitRegionalMontant, setForfaitRegionalMontant] = useState('')

  // Détection des conflits pour Remplacement
  useEffect(() => {
    if (popupType !== 'remplacement' || !remplacementDate || !remplacementHeureDebut || !remplacementHeureFin) {
      setConflictWarning(null)
      return
    }

    const checkConflict = async () => {
      try {
        const response = await fetch(
          `/api/coach/planning/check-conflit?date=${remplacementDate}&heureDebut=${remplacementHeureDebut}&heureFin=${remplacementHeureFin}`
        )
        if (response.ok) {
          const result = await response.json()
          if (result.conflict) {
            setConflictWarning(result.description)
          } else {
            setConflictWarning(null)
          }
        }
      } catch (err) {
        logger.error('Erreur lors de la vérification des conflits', err)
      }
    }

    const timer = setTimeout(checkConflict, 300)
    return () => clearTimeout(timer)
  }, [popupType, remplacementDate, remplacementHeureDebut, remplacementHeureFin])

  // Détection des conflits pour Absence
  useEffect(() => {
    if (popupType !== 'absence' || !absenceDate || !absenceHeureDebut || !absenceHeureFin) {
      setConflictWarning(null)
      return
    }

    const checkConflict = async () => {
      try {
        const response = await fetch(
          `/api/coach/planning/check-conflit?date=${absenceDate}&heureDebut=${absenceHeureDebut}&heureFin=${absenceHeureFin}`
        )
        if (response.ok) {
          const result = await response.json()
          if (result.conflict) {
            setConflictWarning(result.description)
          } else {
            setConflictWarning(null)
          }
        }
      } catch (err) {
        logger.error('Erreur lors de la vérification des conflits', err)
      }
    }

    const timer = setTimeout(checkConflict, 300)
    return () => clearTimeout(timer)
  }, [popupType, absenceDate, absenceHeureDebut, absenceHeureFin])

  // Auto-calculer la durée du remplacement
  useEffect(() => {
    if (remplacementHeureDebut && remplacementHeureFin) {
      const [hD, mD] = remplacementHeureDebut.split(':').map(Number)
      const [hF, mF] = remplacementHeureFin.split(':').map(Number)
      if (!isNaN(hD) && !isNaN(mD) && !isNaN(hF) && !isNaN(mF)) {
        const duration = (hF * 60 + mF - (hD * 60 + mD)) / 60
        if (duration > 0) {
          setRemplacementHeures(duration.toString())
        }
      }
    }
  }, [remplacementHeureDebut, remplacementHeureFin])

  // Auto-calculer la durée de l'absence
  useEffect(() => {
    if (absenceHeureDebut && absenceHeureFin) {
      const [hD, mD] = absenceHeureDebut.split(':').map(Number)
      const [hF, mF] = absenceHeureFin.split(':').map(Number)
      if (!isNaN(hD) && !isNaN(mD) && !isNaN(hF) && !isNaN(mF)) {
        const duration = (hF * 60 + mF - (hD * 60 + mD)) / 60
        if (duration > 0) {
          setAbsenceHeures(duration.toString())
        }
      }
    }
  }, [absenceHeureDebut, absenceHeureFin])

  // Liste des événements calendrier
  const [evenements, setEvenements] = useState<{ id: string; title: string; date: string; lieu: string | null }[]>([])
  const [evenementsError, setEvenementsError] = useState('')
  const [loadingEvenements, setLoadingEvenements] = useState(false)

  // Liste des groupes
  const [groupes, setGroupes] = useState<{ id: string; nom: string }[]>([])
  const [groupesError, setGroupesError] = useState('')
  const [loadingGroupes, setLoadingGroupes] = useState(false)

  // Liste des coaches pour le remplacement
  const [coaches, setCoaches] = useState<{ id: string; prenom: string; nom: string | null }[]>([])
  const [coachesError, setCoachesError] = useState('')
  const [loadingCoaches, setLoadingCoaches] = useState(false)
  const [remplacementCoachId, setRemplacementCoachId] = useState('')

  const fetchGroupes = useCallback(async () => {
    setGroupesError('')
    setLoadingGroupes(true)
    try {
      const response = await fetch('/api/coach/groupes')
      let result: { groupes?: { id: string; nom: string }[]; error?: string } = {}
      try {
        result = await response.json()
      } catch {
        // API peut répondre sans JSON
      }

      if (!response.ok) {
        throw new Error(result.error || 'Impossible de charger la liste des groupes.')
      }

      setGroupes(result.groupes || [])
    } catch (error) {
      setGroupesError(getErrorMessage(error))
      logger.error('Erreur lors de la récupération des groupes', error)
    } finally {
      setLoadingGroupes(false)
    }
  }, [])

  const fetchCoaches = useCallback(async () => {
    setCoachesError('')
    setLoadingCoaches(true)
    try {
      const response = await fetch('/api/coach/coaches')
      let result: { coaches?: { id: string; prenom: string; nom: string | null }[]; error?: string } = {}
      try {
        result = await response.json()
      } catch {
        // API peut répondre sans JSON
      }

      if (!response.ok) {
        throw new Error(result.error || 'Impossible de charger la liste des coaches.')
      }

      setCoaches(result.coaches || [])
    } catch (error) {
      setCoachesError(getErrorMessage(error))
      logger.error('Erreur lors de la récupération des coaches', error)
    } finally {
      setLoadingCoaches(false)
    }
  }, [])

  const fetchEvenements = useCallback(async () => {
    setEvenementsError('')
    setLoadingEvenements(true)
    try {
      const response = await fetch('/api/coach/evenements')
      let result: { evenements?: { id: string; title: string; date: string; lieu: string | null }[]; error?: string } = {}
      try {
        result = await response.json()
      } catch {
        // API peut répondre sans JSON
      }

      if (!response.ok) {
        throw new Error(result.error || 'Impossible de charger la liste des événements.')
      }

      setEvenements(result.evenements || [])
    } catch (error) {
      setEvenementsError(getErrorMessage(error))
      logger.error('Erreur lors de la récupération des événements', error)
    } finally {
      setLoadingEvenements(false)
    }
  }, [])

  const handleRetrySecondaryData = () => {
    void fetchGroupes()
    void fetchCoaches()
    void fetchEvenements()
  }

  const calculateFacture = useCallback(async () => {
    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/coach/facturation/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mois: selectedMois, annee: selectedAnnee }),
      })

      if (response.status === 401) {
        router.push('/coach/login')
        return
      }

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Erreur lors du calcul')
      }

      setData(result)
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }, [router, selectedMois, selectedAnnee])

  useEffect(() => {
    calculateFacture()
  }, [calculateFacture])

  useEffect(() => {
    fetchGroupes()
    fetchCoaches()
    fetchEvenements()
  }, [fetchGroupes, fetchCoaches, fetchEvenements])

  const handleAddManuel = (type: 'remplacement' | 'competition' | 'forfait_regional' | 'absence', dateStr?: string) => {
    setEditingLigne(null)
    setPopupType(type)
    setShowPopup(true)
    setConflictWarning(null)
    
    const defaultDate = dateStr || ''

    // Reset forms and pre-populate if dateStr is provided
    setRemplacementDate(defaultDate)
    setRemplacementGroupe('')
    setRemplacementHeures('')
    setRemplacementCoachId('')
    setRemplacementHeureDebut('')
    setRemplacementHeureFin('')
    setCompetitionDate(defaultDate)
    setCompetitionLieu('')
    setCompetitionCategories([])
    setCompetitionDemiJournees('')
    setSelectedEvenementId('')
    setForfaitRegionalDate(defaultDate)
    setForfaitRegionalLieu('')
    setForfaitRegionalCategorie('')
    setForfaitRegionalMontant('')
    setAbsenceDate(defaultDate)
    setAbsenceHeures('')
    setAbsenceHeureDebut('')
    setAbsenceHeureFin('')
  }

  const handleEditLigne = (ligne: LigneFacture) => {
    setEditingLigne(ligne)
    setPopupType(ligne.type as 'remplacement' | 'competition' | 'forfait_regional' | 'absence')
    setConflictWarning(null)

    // Utilisation des champs structurés (priorité) ou parsing regex (fallback)
    if (ligne.type === 'absence') {
      if (ligne.date) {
        setAbsenceDate(ligne.date.split('T')[0])
      }
      setAbsenceHeures(Math.abs(ligne.heures).toString())
      setAbsenceHeureDebut('')
      setAbsenceHeureFin('')
    } else if (ligne.type === 'remplacement') {
      if (ligne.groupe) setRemplacementGroupe(ligne.groupe)
      if (ligne.date) {
        setRemplacementDate(ligne.date.split('T')[0])
      }
      setRemplacementHeures(ligne.heures.toString())
      if (ligne.coachRemplaceId) setRemplacementCoachId(ligne.coachRemplaceId)
      else setRemplacementCoachId('')
      setRemplacementHeureDebut('')
      setRemplacementHeureFin('')

      // Fallback regex pour anciens enregistrements sans données structurées
      if (!ligne.groupe && !ligne.date) {
        const match = ligne.description.match(/Remplacement (.+?) - (.+?) \((.+?)h\)/)
        if (match) {
          setRemplacementGroupe(match[1])
          const dateParts = match[2].split('/')
          if (dateParts.length === 3) {
            setRemplacementDate(`${dateParts[2]}-${dateParts[1].padStart(2, '0')}-${dateParts[0].padStart(2, '0')}`)
          }
        }
      }
    } else if (ligne.type === 'competition') {
      if (ligne.lieu) setCompetitionLieu(ligne.lieu)
      if (ligne.date) setCompetitionDate(ligne.date.split('T')[0])
      if (ligne.demiJournees) setCompetitionDemiJournees(ligne.demiJournees.toString())
      else setCompetitionDemiJournees(ligne.heures.toString())

      // Extraction de la catégorie depuis la description (pas de champ DB)
      const match = ligne.description.match(/ - (.+?) - /)
      let catStr = ''
      if (match && match[1]) {
        catStr = match[1]
      } else {
        // Fallback complet ancienne regex
        const fullMatch = ligne.description.match(/Compétition (.+?) - (.+?) - (.+?)/)
        if (fullMatch) catStr = fullMatch[2]
      }

      if (catStr) {
        setCompetitionCategories(catStr.split(',').map((s) => s.trim()).filter(Boolean))
      } else {
        setCompetitionCategories([])
      }

      // Rechercher l'événement correspondant pour présélectionner la liste déroulante
      const matchedEvt = evenements.find((e) => {
        const d1 = e.date.split('T')[0]
        const d2 = ligne.date ? ligne.date.split('T')[0] : ''
        const titleLieu = `${e.title}${e.lieu ? ` (${e.lieu})` : ''}`
        return d1 === d2 && (titleLieu === ligne.lieu || e.title === ligne.lieu || e.lieu === ligne.lieu)
      })

      if (matchedEvt) {
        setSelectedEvenementId(matchedEvt.id)
      } else {
        setSelectedEvenementId('')
      }
    } else if (ligne.type === 'forfait_regional') {
      if (ligne.lieu) setForfaitRegionalLieu(ligne.lieu)
      if (ligne.date) setForfaitRegionalDate(ligne.date.split('T')[0])
      // Le montant est stocké directement
      setForfaitRegionalMontant(ligne.montant.toString())

      // Extraction de la catégorie
      const match = ligne.description.match(/ - (.+?) - /)
      if (match && match[1]) setForfaitRegionalCategorie(match[1])
    }

    setShowPopup(true)
  }

  const isAbsenceJourValide = () => {
    if (!absenceDate || !data?.joursTravailles) return true
    const day = new Date(absenceDate).getDay()
    return data.joursTravailles.includes(day)
  }

  const handleSubmitAbsence = async () => {
    if (!absenceDate || !absenceHeures || !data) return
    const confirmMessage = editingLigne
      ? 'Voulez-vous vraiment modifier cette absence ?'
      : 'Voulez-vous vraiment ajouter cette absence à la facture ?'
    const confirmed = await confirm({
      title: editingLigne ? 'Modifier l’absence' : 'Ajouter une absence',
      message: confirmMessage,
      confirmText: editingLigne ? 'Modifier' : 'Ajouter',
      cancelText: 'Annuler',
      variant: 'info'
    })
    if (!confirmed) return

    const heures = parseFloat(absenceHeures)
    const montant = heures * data.tauxHoraire

    const description = `Absence - ${new Date(absenceDate).toLocaleDateString('fr-FR')} (${heures}h)`

    try {
      const url = editingLigne
        ? `/api/coach/facturation/ligne/${editingLigne.id}`
        : '/api/coach/facturation/ligne'

      const response = await fetch(url, {
        method: editingLigne ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingLigne ? {
          description,
          date: absenceDate,
          heures,
          montant,
        } : {
          mois: selectedMois,
          annee: selectedAnnee,
          type: 'absence',
          description,
          date: absenceDate,
          heures,
          montant,
        }),
      })

      if (!response.ok) {
        const result = await response.json()
        throw new Error(result.error || 'Erreur lors de l\'ajout')
      }

      // Recharger les données
      await calculateFacture()
      setShowPopup(false)
    } catch (err) {
      setError(getErrorMessage(err))
    }
  }

  const handleSubmitRemplacement = async () => {
    if (!remplacementDate || !remplacementGroupe || !remplacementHeures || !remplacementCoachId || !data) return
    const confirmMessage = editingLigne
      ? 'Voulez-vous vraiment modifier ce remplacement ?'
      : 'Voulez-vous vraiment ajouter ce remplacement à la facture ?'
    const confirmed = await confirm({
      title: editingLigne ? 'Modifier le remplacement' : 'Ajouter un remplacement',
      message: confirmMessage,
      confirmText: editingLigne ? 'Modifier' : 'Ajouter',
      cancelText: 'Annuler',
      variant: 'info'
    })
    if (!confirmed) return

    const heures = parseFloat(remplacementHeures)
    const montant = heures * data.tauxHoraire

    // Trouver le nom du coach remplacé
    const coachRemplace = coaches.find((c) => c.id === remplacementCoachId)
    const coachNom = coachRemplace ? `${coachRemplace.prenom} ${coachRemplace.nom || ''}`.trim() : 'Coach'

    const description = `Remplacement de ${coachNom} - ${remplacementGroupe} - ${new Date(remplacementDate).toLocaleDateString('fr-FR')} (${heures}h)`

    try {
      const url = editingLigne
        ? `/api/coach/facturation/ligne/${editingLigne.id}`
        : '/api/coach/facturation/ligne'

      const response = await fetch(url, {
        method: editingLigne ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingLigne ? {
          description,
          date: remplacementDate,
          heures,
          montant,
          groupe: remplacementGroupe,
          coachRemplaceId: remplacementCoachId,
          heureDebut: remplacementHeureDebut,
          heureFin: remplacementHeureFin,
        } : {
          mois: selectedMois,
          annee: selectedAnnee,
          type: 'remplacement',
          description,
          date: remplacementDate,
          heures,
          montant,
          groupe: remplacementGroupe,
          coachRemplaceId: remplacementCoachId,
          heureDebut: remplacementHeureDebut,
          heureFin: remplacementHeureFin,
        }),
      })

      if (!response.ok) {
        const result = await response.json()
        throw new Error(result.error || 'Erreur lors de l\'ajout')
      }

      // Recharger les données
      await calculateFacture()
      setShowPopup(false)
    } catch (err) {
      setError(getErrorMessage(err))
    }
  }

  const handleSubmitCompetition = async () => {
    if (!competitionDate || !competitionLieu || competitionCategories.length === 0 || !competitionDemiJournees || !data) return
    const confirmMessage = editingLigne
      ? 'Voulez-vous vraiment modifier cette ligne compétition ?'
      : 'Voulez-vous vraiment ajouter cette ligne compétition à la facture ?'
    const confirmed = await confirm({
      title: editingLigne ? 'Modifier la compétition' : 'Ajouter une compétition',
      message: confirmMessage,
      confirmText: editingLigne ? 'Modifier' : 'Ajouter',
      cancelText: 'Annuler',
      variant: 'info'
    })
    if (!confirmed) return

    const demiJournees = parseFloat(competitionDemiJournees)
    const montant = demiJournees * data.forfaitDemiJournee

    const categoryStr = competitionCategories.join(', ')
    const description = `Compétition ${competitionLieu} - ${categoryStr} - ${new Date(competitionDate).toLocaleDateString('fr-FR')} (${demiJournees} demi-journées)`

    try {
      const url = editingLigne
        ? `/api/coach/facturation/ligne/${editingLigne.id}`
        : '/api/coach/facturation/ligne'

      const response = await fetch(url, {
        method: editingLigne ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingLigne ? {
          description,
          date: competitionDate,
          heures: demiJournees,
          montant,
          lieu: competitionLieu,
          demiJournees,
        } : {
          mois: selectedMois,
          annee: selectedAnnee,
          type: 'competition',
          description,
          date: competitionDate,
          heures: demiJournees,
          montant,
          lieu: competitionLieu,
          demiJournees,
        }),
      })

      if (!response.ok) {
        const result = await response.json()
        throw new Error(result.error || 'Erreur lors de l\'ajout')
      }

      // Recharger les données
      await calculateFacture()
      setShowPopup(false)
    } catch (err) {
      setError(getErrorMessage(err))
    }
  }

  const handleSubmitForfaitRegional = async () => {
    if (!forfaitRegionalDate || !forfaitRegionalLieu || !forfaitRegionalCategorie || !data) return
    const confirmMessage = editingLigne
      ? 'Voulez-vous vraiment modifier ce forfait régional ?'
      : 'Voulez-vous vraiment ajouter ce forfait régional à la facture ?'
    const confirmed = await confirm({
      title: editingLigne ? 'Modifier le forfait' : 'Ajouter un forfait',
      message: confirmMessage,
      confirmText: editingLigne ? 'Modifier' : 'Ajouter',
      cancelText: 'Annuler',
      variant: 'info'
    })
    if (!confirmed) return

    let montant: number
    if (data.forfaitRegionalActif) {
      if (!forfaitRegionalMontant) return
      montant = parseFloat(forfaitRegionalMontant)
    } else {
      montant = data.montantForfaitRegional
    }

    const description = `Forfait Régional ${forfaitRegionalLieu} - ${forfaitRegionalCategorie} - ${new Date(forfaitRegionalDate).toLocaleDateString('fr-FR')} (${montant.toFixed(2)}€)`

    try {
      const url = editingLigne
        ? `/api/coach/facturation/ligne/${editingLigne.id}`
        : '/api/coach/facturation/ligne'

      const response = await fetch(url, {
        method: editingLigne ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingLigne ? {
          description,
          date: forfaitRegionalDate,
          heures: 1,
          montant,
          lieu: forfaitRegionalLieu,
        } : {
          mois: selectedMois,
          annee: selectedAnnee,
          type: 'forfait_regional',
          description,
          date: forfaitRegionalDate,
          heures: 1,
          montant,
          lieu: forfaitRegionalLieu,
        }),
      })

      if (!response.ok) {
        const result = await response.json()
        throw new Error(result.error || 'Erreur lors de l\'ajout')
      }

      // Recharger les données
      await calculateFacture()
      setShowPopup(false)
    } catch (err) {
      setError(getErrorMessage(err))
    }
  }

  const handleDeleteLigne = async (ligneId: string) => {
    const confirmed = await confirm({
      title: 'Supprimer la ligne',
      message: 'Voulez-vous vraiment supprimer cette ligne de la facture ?',
      confirmText: 'Supprimer',
      cancelText: 'Annuler',
      variant: 'danger',
    })
    if (!confirmed) return

    try {
      const response = await fetch(`/api/coach/facturation/ligne/${ligneId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const result = await response.json()
        throw new Error(result.error || 'Erreur lors de la suppression')
      }

      // Recharger les données
      await calculateFacture()
    } catch (err) {
      setError(getErrorMessage(err))
    }
  }

  const handleGeneratePDF = async (openInNewTab: boolean = true) => {
    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/coach/facturation/generer-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mois: selectedMois, annee: selectedAnnee }),
      })

      if (!response.ok) {
        const result = await response.json()
        throw new Error(result.error || 'Erreur lors de la génération du PDF')
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)

      if (openInNewTab) {
        window.open(url, '_blank')
      } else {
        const a = document.createElement('a')
        a.href = url
        a.download = `facture-${selectedMois}-${selectedAnnee}.pdf`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        window.URL.revokeObjectURL(url)
      }
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  const handleSendEmail = async () => {
    const confirmed = await confirm({
      title: 'Envoyer la facture',
      message: 'Voulez-vous vraiment envoyer cette facture par e-mail au club ?',
      confirmText: 'Envoyer',
      cancelText: 'Annuler',
      variant: 'info',
    })
    if (!confirmed) return

    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/coach/facturation/envoyer-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mois: selectedMois, annee: selectedAnnee }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Erreur lors de l\'envoi de l\'email')
      }

      toast.success('Facture envoyée par e-mail avec succès !')
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  const handleExportAbby = async () => {
    setLoadingAbby(true)
    setError('')

    try {
      // 1. S'assurer que la facture/PDF existe ou est générée
      const pdfResponse = await fetch('/api/coach/facturation/generer-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mois: selectedMois, annee: selectedAnnee }),
      })

      if (!pdfResponse.ok) {
        const result = await pdfResponse.json()
        throw new Error(result.error || 'Erreur lors de la génération du PDF préalable')
      }

      // 2. Tenter l'exportation vers Abby
      const response = await fetch('/api/coach/facturation/exporter-abby', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mois: selectedMois, annee: selectedAnnee }),
      })

      const result = await response.json()

      if (!response.ok) {
        if (result.code === 'MISSING_API_KEY') {
          setAbbyModal({
            open: true,
            type: 'missing_key',
            title: 'Clé API Abby non renseignée',
            message: 'La facture ne sera pas exportée vers la plateforme Abby.',
            code: 'MISSING_API_KEY',
            details: 'Aucune clé API Abby n\'a été configurée sur votre profil coach. Pour synchroniser vos factures électroniques, veuillez d\'abord renseigner votre clé API dans vos paramètres de profil.',
          })
          return
        }

        setAbbyModal({
          open: true,
          type: 'error',
          title: 'Erreur lors de l\'exportation vers Abby',
          message: result.error || 'Une erreur est survenue lors de la communication avec l\'API Abby.',
          code: result.code,
          status: response.status,
        })
        return
      }

      setAbbyModal({
        open: true,
        type: 'success',
        title: 'Exportation réussie !',
        message: 'La facture a été transmise avec succès à la plateforme Abby.',
        details: result.invoiceNumber ? `Numéro de pièce sur Abby : ${result.invoiceNumber}` : undefined,
      })
    } catch (err) {
      setAbbyModal({
        open: true,
        type: 'error',
        title: 'Erreur d\'exportation',
        message: getErrorMessage(err),
        code: 'CLIENT_ERROR',
      })
    } finally {
      setLoadingAbby(false)
    }
  }

  const handleDayClick = (day: { dateStr: string }, sessions: CalendarSession[]) => {
    if (data?.isBlocked) {
      toast.dismiss()
      toast('Cette période est archivée et bloquée.', { icon: '🔒' })
      return
    }
    
    // Check screen width for responsive behavior
    if (window.innerWidth < 768) {
      setSelectedDayDetails({
        dateStr: day.dateStr,
        sessions
      })
    } else {
      setDaySelectorDate(day.dateStr)
    }
  }

  const moisNoms = [
    'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
    'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
  ]

  const annees = Array.from({ length: 5 }, (_, i) => currentDate.getFullYear() - 2 + i)

  // Memoized compilation of calendar days
  const calendarDays = useMemo(() => {
    const days: Array<{
      day: number
      month: number
      year: number
      isCurrentMonth: boolean
      dateStr: string
    }> = []

    const firstDayDate = new Date(selectedAnnee, selectedMois - 1, 1)
    
    let firstDayOfWeek = firstDayDate.getDay() - 1
    if (firstDayOfWeek === -1) firstDayOfWeek = 6 // Make Monday = 0, Sunday = 6

    const totalDaysInMonth = new Date(selectedAnnee, selectedMois, 0).getDate()
    const totalDaysInPrevMonth = new Date(selectedAnnee, selectedMois - 1, 0).getDate()

    // 1. Prev month padding
    const prevMonth = selectedMois === 1 ? 12 : selectedMois - 1
    const prevYear = selectedMois === 1 ? selectedAnnee - 1 : selectedAnnee
    for (let i = firstDayOfWeek - 1; i >= 0; i--) {
      const d = totalDaysInPrevMonth - i
      const dateStr = `${prevYear}-${String(prevMonth).padStart(2, '0')}-${String(d).padStart(2, '0')}`
      days.push({ day: d, month: prevMonth, year: prevYear, isCurrentMonth: false, dateStr })
    }

    // 2. Current month days
    for (let d = 1; d <= totalDaysInMonth; d++) {
      const dateStr = `${selectedAnnee}-${String(selectedMois).padStart(2, '0')}-${String(d).padStart(2, '0')}`
      days.push({ day: d, month: selectedMois, year: selectedAnnee, isCurrentMonth: true, dateStr })
    }

    // 3. Next month padding
    const nextMonth = selectedMois === 12 ? 1 : selectedMois + 1
    const nextYear = selectedMois === 12 ? selectedAnnee + 1 : selectedAnnee
    const totalGridCells = days.length <= 35 ? 35 : 42
    const remaining = totalGridCells - days.length
    for (let d = 1; d <= remaining; d++) {
      const dateStr = `${nextYear}-${String(nextMonth).padStart(2, '0')}-${String(d).padStart(2, '0')}`
      days.push({ day: d, month: nextMonth, year: nextYear, isCurrentMonth: false, dateStr })
    }

    return days
  }, [selectedMois, selectedAnnee])

  // Flat compilation of all sessions into calendar events
  const calendarSessions = useMemo(() => {
    if (!data) return []
    const sessions: CalendarSession[] = []

    // 1. Planning fixe (parse from descriptions e.g. "(01/06, 08/06, 15/06)")
    data.lignesPlanningFixe.forEach((ligne) => {
      const dates = parseDatesFromDescription(ligne.description, selectedAnnee)
      const count = dates.length
      const hoursPerSession = count > 0 ? (ligne.heures / count) : ligne.heures
      const montantPerSession = count > 0 ? (ligne.montant / count) : ligne.montant

      dates.forEach((dateStr) => {
        const [, mStr] = dateStr.split('-')
        if (parseInt(mStr, 10) === selectedMois) {
          sessions.push({
            type: 'fixe',
            description: ligne.description.replace(/\s*\([^)]+\)$/, ''),
            heures: hoursPerSession,
            montant: montantPerSession,
            dateStr,
            originalLigne: ligne
          })
        }
      })
    })

    // 2. Planning tournant
    data.lignesPlanningTournant.forEach((ligne) => {
      if (ligne.date) {
        const dateStr = ligne.date.split('T')[0]
        sessions.push({
          type: 'tournant',
          description: ligne.description,
          heures: ligne.heures,
          montant: ligne.montant,
          dateStr,
          originalLigne: ligne
        })
      }
    })

    // 3. Remplacements
    data.lignesRemplacements?.forEach((ligne) => {
      if (ligne.date) {
        const dateStr = ligne.date.split('T')[0]
        sessions.push({
          type: 'remplacement',
          description: ligne.description,
          heures: ligne.heures,
          montant: ligne.montant,
          dateStr,
          originalLigne: ligne
        })
      }
    })

    // 4. Absences
    data.lignesAbsences?.forEach((ligne) => {
      if (ligne.date) {
        const dateStr = ligne.date.split('T')[0]
        sessions.push({
          type: 'absence',
          description: ligne.description,
          heures: ligne.heures,
          montant: ligne.montant,
          dateStr,
          originalLigne: ligne
        })
      }
    })

    // 5. Manuelles
    data.lignesManuelles.forEach((ligne) => {
      if (ligne.date) {
        const dateStr = ligne.date.split('T')[0]
        sessions.push({
          type: (ligne.type as any) || 'remplacement',
          description: ligne.description,
          heures: ligne.heures,
          montant: ligne.montant,
          dateStr,
          demiJournees: ligne.demiJournees,
          originalLigne: ligne
        })
      }
    })

    return sessions
  }, [data, selectedMois, selectedAnnee])

  if (loading && !data) {
    return (
      <div className="min-h-screen py-8 bg-gray-50">
        <div className="container mx-auto px-4">
          <CoachNav />
          <div className="text-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-gray-600 font-medium">Chargement des données de facturation...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen py-8 bg-gray-50">
      <div className="container mx-auto px-4">
        <CoachNav />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-4xl font-extrabold tracking-tight text-slate-900">Facturation</h1>
            <p className="text-slate-500 text-sm mt-1">Gérez et déclarez vos heures d&apos;entraînement, absences et remplacements.</p>
          </div>
        </div>

        {data?.isBlocked && (
          <div className="bg-sky-50/80 backdrop-blur-xs border-l-4 border-sky-500 p-4 mb-6 rounded-2xl flex items-start gap-3 shadow-xs">
            <span className="text-2xl select-none">ℹ️</span>
            <div>
              <p className="font-bold text-sky-950">Période payée et archivée</p>
              <p className="text-sky-700 text-sm mt-0.5 font-medium">{data.message}</p>
            </div>
          </div>
        )}

        {(() => {
          const now = new Date()
          const isFuture = Number(selectedAnnee) > now.getFullYear() || 
                           (Number(selectedAnnee) === now.getFullYear() && Number(selectedMois) > now.getMonth() + 1);
          if (isFuture) {
            return (
              <div className="bg-amber-50/80 backdrop-blur-xs border-l-4 border-amber-500 p-4 mb-6 rounded-2xl flex items-start gap-3 shadow-xs">
                <span className="text-2xl select-none">⚠️</span>
                <div>
                  <p className="font-bold text-amber-950">Facturation future bloquée</p>
                  <p className="text-amber-700 text-sm mt-0.5 font-medium">Vous ne pouvez pas pré-facturer de créneaux automatiques pour un mois futur. Attendez le début de la période concernée.</p>
                </div>
              </div>
            )
          }
          return null
        })()}

        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6 rounded-2xl shadow-xs">
            <p className="text-red-700 font-medium">{error}</p>
          </div>
        )}
        {(groupesError || coachesError) && (
          <div className="bg-amber-50 border-l-4 border-amber-500 p-4 mb-6 rounded-2xl shadow-xs">
            <p className="text-amber-950 font-bold">Certaines données secondaires n&apos;ont pas pu être chargées.</p>
            {groupesError && <p className="text-amber-800 text-sm mt-1">Groupes : {groupesError}</p>}
            {coachesError && <p className="text-amber-800 text-sm mt-1">Coaches : {coachesError}</p>}
            <div className="mt-3">
              <button
                type="button"
                onClick={handleRetrySecondaryData}
                disabled={loadingGroupes || loadingCoaches}
                className="text-xs px-3.5 py-2 rounded-xl bg-amber-100/80 hover:bg-amber-200 text-amber-950 font-bold transition-all disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {loadingGroupes || loadingCoaches ? 'Réessai...' : 'Réessayer'}
              </button>
            </div>
          </div>
        )}

        {/* Sélecteur mois/année */}
        <div className="card p-6 mb-8 bg-white/80 backdrop-blur-md">
          <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Période de facturation</h2>
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                Mois
              </label>
              <select
                value={selectedMois}
                onChange={(e) => setSelectedMois(Number(e.target.value))}
                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl bg-slate-50/50 hover:bg-slate-50/80 focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm font-semibold text-slate-800 outline-none"
              >
                {moisNoms.map((nom, index) => (
                  <option key={index} value={index + 1}>
                    {nom}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex-1">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
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
          </div>
        </div>

        {data && (
          <>
            <FacturationQuickSummary
              moisLabel={moisNoms[selectedMois - 1]}
              annee={selectedAnnee}
              totalHeures={data.totalHeures}
              totalMontant={data.totalMontant}
              alertes={data.lignesAbsences.length}
            />

            {/* Récapitulatif Card Container */}
            <div className="card p-6 mb-8 relative overflow-hidden bg-white/95">
              {/* Semi-transparent loading blur overlay */}
              {loading && (
                <div className="absolute inset-0 bg-white/70 backdrop-blur-[1.5px] flex items-center justify-center z-40 transition-all">
                  <div className="flex flex-col items-center gap-3 bg-white/80 p-5 rounded-2xl border border-slate-100 shadow-lg">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
                    <p className="text-xs font-bold text-slate-600 uppercase tracking-wider">Recalcul...</p>
                  </div>
                </div>
              )}

              {/* Card Header with View Switcher */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div className="flex flex-col gap-1">
                  <h2 className="text-2xl font-bold text-slate-900">
                    Récapitulatif - {moisNoms[selectedMois - 1]} {selectedAnnee}
                  </h2>
                  <div className="text-xs text-slate-500 font-semibold flex items-center gap-2 flex-wrap">
                    <span>Taux: <strong className="text-slate-800">{data.tauxHoraire}€/h</strong></span>
                    <span className="text-slate-300">|</span>
                    <span>Forfait Comp.: <strong className="text-slate-800">{data.forfaitDemiJournee}€/demi-j.</strong></span>
                  </div>
                </div>

                <div className="flex items-center gap-4 shrink-0">
                  {/* View switcher toggle */}
                  <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200/50">
                    <button
                      type="button"
                      onClick={() => setActiveView('table')}
                      className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold uppercase transition-all duration-200 ${
                        activeView === 'table'
                          ? 'bg-white text-slate-900 shadow-xs'
                          : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                      Tableau
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveView('calendar')}
                      className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold uppercase transition-all duration-200 ${
                        activeView === 'calendar'
                          ? 'bg-white text-slate-900 shadow-xs'
                          : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      Calendrier
                    </button>
                  </div>
                </div>
              </div>

              {/* View Switcher Output */}
              {activeView === 'table' ? (
                /* TABLE LAYOUT */
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b-2 border-slate-100 text-slate-400 font-bold uppercase text-[10px] tracking-wider">
                        <th className="text-left py-3 px-4">
                          <span className="flex items-center gap-1">
                            Type
                            <HelpTooltip title="Types de lignes">
                              <p><strong>Planning fixe :</strong> Vos créneaux réguliers chaque semaine</p>
                              <p className="mt-1"><strong>Planning tournant :</strong> Créneaux partagés avec d&apos;autres coaches</p>
                              <p className="mt-1"><strong>Remplacement :</strong> Heures effectuées à la place d&apos;un coach</p>
                              <p className="mt-1"><strong>Absence :</strong> Heures déduites pour absence</p>
                              <p className="mt-1"><strong>Compétition :</strong> Accompagnement (forfait demi-journée)</p>
                            </HelpTooltip>
                          </span>
                        </th>
                        <th className="text-left py-3 px-4">Description</th>
                        <th className="text-right py-3 px-4">
                          <span className="flex items-center justify-end gap-1">
                            Heures/Unités
                            <HelpTooltip title="Calcul">
                              <p><strong>Heures :</strong> Nombre d&apos;heures × Taux horaire</p>
                              <p className="mt-1"><strong>Demi-journées :</strong> Nb demi-journées × Forfait compétition</p>
                            </HelpTooltip>
                          </span>
                        </th>
                        <th className="text-right py-3 px-4">Montant</th>
                        <th className="text-right py-3 px-4">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100/70 text-slate-700 font-medium">
                      {/* Planning fixe */}
                      {data.lignesPlanningFixe.map((ligne, index) => (
                        <tr key={`fixe-${index}`} className="hover:bg-slate-50/30 transition-colors">
                          <td className="py-3 px-4">
                            <span className="bg-blue-50 text-blue-700 border border-blue-200/40 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md">
                              Planning fixe
                            </span>
                          </td>
                          <td className="py-3 px-4">{ligne.description}</td>
                          <td className="text-right py-3 px-4">{ligne.heures.toFixed(2)}h</td>
                          <td className="text-right py-3 px-4 font-semibold text-slate-900">{ligne.montant.toFixed(2)}€</td>
                          <td className="text-right py-3 px-4 text-slate-300">-</td>
                        </tr>
                      ))}

                      {/* Planning tournant */}
                      {data.lignesPlanningTournant.map((ligne, index) => (
                        <tr key={`tournant-${index}`} className="hover:bg-slate-50/30 transition-colors">
                          <td className="py-3 px-4">
                            <span className="bg-green-50 text-green-700 border border-green-200/40 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md">
                              Planning tournant
                            </span>
                          </td>
                          <td className="py-3 px-4">{ligne.description}</td>
                          <td className="text-right py-3 px-4">{ligne.heures.toFixed(2)}h</td>
                          <td className="text-right py-3 px-4 font-semibold text-slate-900">{ligne.montant.toFixed(2)}€</td>
                          <td className="text-right py-3 px-4 text-slate-300">-</td>
                        </tr>
                      ))}

                      {/* Remplacements effectués (automatiques) */}
                      {data.lignesRemplacements?.map((ligne, index) => (
                        <tr key={`remp-${index}`} className="bg-emerald-50/30 hover:bg-emerald-50/50 transition-colors">
                          <td className="py-3 px-4">
                            <span className="bg-emerald-50 text-emerald-800 border border-emerald-200/40 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md">
                              Remplacement
                            </span>
                          </td>
                          <td className="py-3 px-4">{ligne.description}</td>
                          <td className="text-right py-3 px-4">+{ligne.heures.toFixed(2)}h</td>
                          <td className="text-right py-3 px-4 text-emerald-600 font-bold">+{ligne.montant.toFixed(2)}€</td>
                          <td className="text-right py-3 px-4 text-slate-400 text-xs font-bold uppercase tracking-widest select-none">Auto</td>
                        </tr>
                      ))}

                      {/* Absences (automatiques) */}
                      {data.lignesAbsences?.map((ligne, index) => (
                        <tr key={`abs-${index}`} className="bg-red-50/30 hover:bg-red-50/50 transition-colors">
                          <td className="py-3 px-4">
                            <span className="bg-red-50 text-red-800 border border-red-200/40 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md">
                              Absence
                            </span>
                          </td>
                          <td className="py-3 px-4">{ligne.description}</td>
                          <td className="text-right py-3 px-4 text-red-600">-{ligne.heures.toFixed(2)}h</td>
                          <td className="text-right py-3 px-4 text-red-600 font-bold">-{ligne.montant.toFixed(2)}€</td>
                          <td className="text-right py-3 px-4 text-slate-400 text-xs font-bold uppercase tracking-widest select-none">Auto</td>
                        </tr>
                      ))}

                      {/* Lignes manuelles */}
                      {data.lignesManuelles.map((ligne, index) => (
                        <tr key={`manuel-${ligne.id || index}`} className={`hover:bg-slate-50/30 transition-colors ${ligne.type === 'absence' ? 'bg-red-50/20' : 'bg-amber-50/20'}`}>
                          <td className="py-3 px-4">
                            <span className={`${
                              ligne.type === 'absence' ? 'bg-red-50 text-red-800 border-red-200/40' :
                              ligne.type === 'competition' ? 'bg-purple-50 text-purple-800 border-purple-200/40' :
                              ligne.type === 'forfait_regional' ? 'bg-orange-50 text-orange-850 border-orange-200/40' :
                              'bg-amber-50 text-amber-800 border-amber-200/40'
                            } text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border`}>
                              {ligne.type === 'remplacement' ? 'Remplacement' : ligne.type === 'competition' ? 'Compétition' : ligne.type === 'absence' ? 'Absence' : 'Forfait Rég.'}
                            </span>
                          </td>
                          <td className="py-3 px-4">{ligne.description}</td>
                          <td className="text-right py-3 px-4">
                            {ligne.type === 'remplacement' || ligne.type === 'absence'
                              ? `${ligne.heures.toFixed(2)}h`
                              : ligne.type === 'competition'
                                ? `${ligne.demiJournees ?? ligne.heures} demi-j.`
                                : `${ligne.heures.toFixed(1)} unit.`}
                          </td>
                          <td className="text-right py-3 px-4 font-bold text-slate-900">{ligne.montant.toFixed(2)}€</td>
                          <td className="text-right py-3 px-4">
                            {ligne.id && (
                              <div className="flex gap-3.5 justify-end">
                                <button
                                  onClick={() => handleEditLigne(ligne)}
                                  className="text-blue-600 hover:text-blue-800 text-xs font-bold uppercase tracking-wider transition-colors"
                                >
                                  Modifier
                                </button>
                                <button
                                  onClick={() => handleDeleteLigne(ligne.id!)}
                                  className="text-red-650 hover:text-red-800 text-xs font-bold uppercase tracking-wider transition-colors"
                                >
                                  Supprimer
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}

                      {/* Total Row */}
                      <tr className="border-t-2 border-slate-350 font-bold bg-slate-50/50">
                        <td className="py-4 px-4" colSpan={2}>
                          <span className="flex items-center gap-2 text-slate-900">
                            TOTAL REVENUS DU MOIS
                            <CalculationTooltip
                              title="Calcul du total"
                              formula="(Heures planning × Taux) + (Demi-journées × Forfait) + Forfaits régionaux - Absences"
                              explanation="Le total inclut toutes les heures (planning fixe, tournant, remplacements), les compétitions (en forfait demi-journée), les forfaits régionaux, moins les absences."
                              example={`${data.totalHeures.toFixed(1)}h × ${data.tauxHoraire}€ = ${data.totalMontant.toFixed(2)}€`}
                            />
                          </span>
                        </td>
                        <td className="text-right py-4 px-4 text-slate-900">{data.totalHeures.toFixed(2)}h</td>
                        <td className="text-right py-4 px-4 text-primary text-base font-extrabold">{data.totalMontant.toFixed(2)}€</td>
                        <td></td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              ) : (
                /* INTERACTIVE CALENDAR VIEW */
                <div className="mb-6 relative">
                  <div className="grid grid-cols-7 border-t border-l border-slate-200/80 rounded-xl overflow-hidden shadow-xs">
                    {/* Days of week header */}
                    {['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].map((d) => (
                      <div key={d} className="bg-slate-50/80 border-r border-b border-slate-200/80 py-3 text-center text-[10px] font-bold text-slate-400 uppercase tracking-widest select-none">
                        {d}
                      </div>
                    ))}

                    {/* Days of month grid */}
                    {calendarDays.map((day, idx) => {
                      const daySessions = calendarSessions.filter((s) => s.dateStr === day.dateStr)
                      const isToday = day.dateStr === currentDate.toISOString().split('T')[0]
                      
                      return (
                        <div
                          key={`${day.dateStr}-${idx}`}
                          onClick={() => handleDayClick(day, daySessions)}
                          className={`min-h-[100px] md:min-h-[135px] border-r border-b border-slate-200/80 p-2 flex flex-col justify-between transition-all duration-200 cursor-pointer relative group ${
                            day.isCurrentMonth 
                              ? 'bg-white hover:bg-slate-50/30' 
                              : 'bg-slate-50/30 text-slate-300'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1.5">
                            <span className={`text-xs font-bold flex items-center justify-center w-5.5 h-5.5 rounded-full select-none ${
                              isToday 
                                ? 'bg-primary text-white shadow-xs' 
                                : day.isCurrentMonth ? 'text-slate-700' : 'text-slate-300'
                            }`}>
                              {day.day}
                            </span>
                            
                            {/* Discret add button on hover for current month days */}
                            {day.isCurrentMonth && !data.isBlocked && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setDaySelectorDate(day.dateStr)
                                }}
                                className="opacity-0 group-hover:opacity-100 transition-opacity p-1 bg-slate-100 hover:bg-primary hover:text-white text-slate-500 rounded-full w-5.5 h-5.5 flex items-center justify-center cursor-pointer shadow-xs"
                                aria-label="Ajouter séance"
                              >
                                <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3.5} d="M12 4v16m8-8H4" />
                                </svg>
                              </button>
                            )}
                          </div>

                          {/* Desktop sessions view (list of pills) */}
                          <div className="hidden md:flex flex-col gap-1 mt-1 grow overflow-y-auto max-h-[85px] scrollbar-none">
                            {daySessions.map((session, sIdx) => {
                              const isManual = !!session.originalLigne.id
                              let pillBgClass = ''
                              
                              switch (session.type) {
                                case 'fixe':
                                  pillBgClass = 'bg-blue-50 text-blue-700 border-blue-200/40 hover:bg-blue-100/50'
                                  break
                                case 'tournant':
                                  pillBgClass = 'bg-green-50 text-green-700 border-green-200/40 hover:bg-green-100/50'
                                  break
                                case 'remplacement':
                                  pillBgClass = 'bg-amber-50/80 text-amber-850 border-amber-200/40 hover:bg-amber-100/50'
                                  break
                                case 'absence':
                                  pillBgClass = 'bg-red-50 text-red-800 border-red-200/40 hover:bg-red-100/50'
                                  break
                                case 'competition':
                                  pillBgClass = 'bg-purple-50 text-purple-700 border-purple-200/40 hover:bg-purple-100/50'
                                  break
                                case 'forfait_regional':
                                  pillBgClass = 'bg-orange-50 text-orange-800 border-orange-200/40 hover:bg-orange-100/50'
                                  break
                              }

                              return (
                                <div
                                  key={sIdx}
                                  onClick={(e) => {
                                    if (isManual) {
                                      e.stopPropagation()
                                      handleEditLigne(session.originalLigne)
                                    } else {
                                      e.stopPropagation()
                                      toast.dismiss()
                                      toast('Séance automatique, non modifiable.', { icon: 'ℹ️' })
                                    }
                                  }}
                                  className={`text-[9px] px-1.5 py-0.5 rounded-md border font-bold truncate flex items-center justify-between gap-1 transition-all duration-150 ${pillBgClass} ${
                                    isManual ? 'hover:shadow-xs hover:scale-[1.01] cursor-pointer' : 'cursor-default'
                                  }`}
                                  title={`${session.description} (${session.heures}h)`}
                                >
                                  <span className="truncate">{formatPillDescription(session)}</span>
                                  {isManual && <span className="text-[8px] font-bold opacity-60">✎</span>}
                                </div>
                              )
                            })}
                          </div>

                          {/* Mobile sessions view (horizontal row of tiny dots) */}
                          <div className="flex md:hidden gap-1.5 mt-1 justify-center flex-wrap">
                            {daySessions.map((session, sIdx) => {
                              let dotColor = ''
                              switch (session.type) {
                                case 'fixe': dotColor = 'bg-blue-500'; break
                                case 'tournant': dotColor = 'bg-green-500'; break
                                case 'remplacement': dotColor = 'bg-yellow-500'; break
                                case 'absence': dotColor = 'bg-red-500'; break
                                case 'competition': dotColor = 'bg-purple-500'; break
                                case 'forfait_regional': dotColor = 'bg-orange-500'; break
                              }
                              return (
                                <span
                                  key={sIdx}
                                  className={`w-1.5 h-1.5 rounded-full shrink-0 ${dotColor}`}
                                  title={session.description}
                                />
                              )
                            })}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Boutons d'ajout manuel */}
              {!data.isBlocked && (
                <div className="mt-8 border-t border-slate-100 pt-6">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Déclarer un événement manuel</h3>
                  <div className="flex gap-3 flex-wrap">
                    <button
                      onClick={() => handleAddManuel('absence')}
                      className="px-5 py-2 bg-red-50 border border-red-100 hover:bg-red-100 text-red-700 rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-200 active:scale-[0.98]"
                    >
                      + Absence
                    </button>
                    <button
                      onClick={() => handleAddManuel('remplacement')}
                      className="px-5 py-2 bg-amber-50 border border-amber-100 hover:bg-amber-100/80 text-amber-850 rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-200 active:scale-[0.98]"
                    >
                      + Remplacement
                    </button>
                    <button
                      onClick={() => handleAddManuel('competition')}
                      className="px-5 py-2 bg-purple-50 border border-purple-100 hover:bg-purple-100 text-purple-700 rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-200 active:scale-[0.98]"
                    >
                      + Compétition
                    </button>
                    <button
                      onClick={() => handleAddManuel('forfait_regional')}
                      className="px-5 py-2 bg-orange-50 border border-orange-100 hover:bg-orange-100 text-orange-700 rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-200 active:scale-[0.98]"
                    >
                      + Forfait Régional
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Actions de facturation */}
            <div className="flex gap-4 flex-wrap">
              <button
                onClick={() => handleGeneratePDF(true)}
                disabled={loading}
                className="flex-1 min-w-[200px] px-6 py-3 bg-slate-900 text-white rounded-xl text-sm font-semibold hover:bg-slate-800 transition-colors disabled:opacity-50 active:scale-[0.99] shadow-sm flex items-center justify-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
                {loading ? 'Génération...' : 'Visualiser le PDF'}
              </button>
              <button
                onClick={() => handleGeneratePDF(false)}
                disabled={loading}
                className="flex-1 min-w-[200px] px-6 py-3 bg-white border border-slate-200 text-slate-700 rounded-xl text-sm font-semibold hover:bg-slate-50 transition-colors disabled:opacity-50 active:scale-[0.99] flex items-center justify-center gap-2 shadow-xs"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Télécharger PDF
              </button>
              <button
                onClick={handleSendEmail}
                disabled={loading || loadingAbby}
                className="flex-1 min-w-[200px] px-6 py-3 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-primary-dark transition-colors disabled:opacity-50 active:scale-[0.99] shadow-sm flex items-center justify-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
                {loading ? 'Envoi...' : 'Demander le paiement'}
              </button>
              <button
                onClick={handleExportAbby}
                disabled={loading || loadingAbby}
                className="flex-1 min-w-[200px] px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl text-sm font-semibold hover:from-blue-700 hover:to-indigo-700 transition-all disabled:opacity-50 active:scale-[0.99] shadow-sm flex items-center justify-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                {loadingAbby ? 'Exportation Abby...' : 'Exporter vers Abby'}
              </button>
            </div>
          </>
        )}

        {/* 1. Modal - Click Day Action Picker */}
        {daySelectorDate && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl animate-fade-in-up border border-slate-100">
              <div className="flex justify-between items-center mb-5">
                <div>
                  <h4 className="text-base font-bold text-slate-800">
                    Sélectionnez une déclaration
                  </h4>
                  <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mt-0.5">
                    {new Date(daySelectorDate).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
                  </p>
                </div>
                <button
                  onClick={() => setDaySelectorDate(null)}
                  className="text-slate-400 hover:text-slate-600 transition-colors rounded-full hover:bg-slate-100 p-1"
                  aria-label="Fermer"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="grid grid-cols-1 gap-2.5">
                <button
                  onClick={() => {
                    handleAddManuel('absence', daySelectorDate)
                    setDaySelectorDate(null)
                  }}
                  className="flex items-center gap-3 w-full px-4 py-3 bg-red-50/50 hover:bg-red-50 border border-red-100/50 hover:border-red-200 text-red-700 rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-150 hover:translate-x-1"
                >
                  <span className="w-2 h-2 rounded-full bg-red-500 shrink-0" />
                  Déclarer une Absence
                </button>
                <button
                  onClick={() => {
                    handleAddManuel('remplacement', daySelectorDate)
                    setDaySelectorDate(null)
                  }}
                  className="flex items-center gap-3 w-full px-4 py-3 bg-amber-50/50 hover:bg-amber-50 border border-amber-100/50 hover:border-amber-200 text-amber-850 rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-150 hover:translate-x-1"
                >
                  <span className="w-2 h-2 rounded-full bg-yellow-500 shrink-0" />
                  Déclarer un Remplacement
                </button>
                <button
                  onClick={() => {
                    handleAddManuel('competition', daySelectorDate)
                    setDaySelectorDate(null)
                  }}
                  className="flex items-center gap-3 w-full px-4 py-3 bg-purple-50/50 hover:bg-purple-50 border border-purple-100/50 hover:border-purple-200 text-purple-700 rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-150 hover:translate-x-1"
                >
                  <span className="w-2 h-2 rounded-full bg-purple-500 shrink-0" />
                  Déclarer une Compétition
                </button>
                <button
                  onClick={() => {
                    handleAddManuel('forfait_regional', daySelectorDate)
                    setDaySelectorDate(null)
                  }}
                  className="flex items-center gap-3 w-full px-4 py-3 bg-orange-50/50 hover:bg-orange-50 border border-orange-100/50 hover:border-orange-200 text-orange-700 rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-150 hover:translate-x-1"
                >
                  <span className="w-2 h-2 rounded-full bg-orange-500 shrink-0" />
                  Déclarer un Forfait Régional
                </button>
              </div>

              <button
                onClick={() => setDaySelectorDate(null)}
                className="w-full mt-4 py-2.5 border border-slate-200 text-slate-500 hover:text-slate-700 hover:bg-slate-50 rounded-xl text-xs font-bold uppercase tracking-widest transition-colors"
              >
                Annuler
              </button>
            </div>
          </div>
        )}

        {/* 2. Modal - Mobile Day Sessions Details */}
        {selectedDayDetails && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl animate-fade-in-up border border-slate-100 max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h4 className="text-base font-bold text-slate-800">
                    Séances du jour
                  </h4>
                  <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mt-0.5">
                    {new Date(selectedDayDetails.dateStr).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedDayDetails(null)}
                  className="text-slate-400 hover:text-slate-600 transition-colors rounded-full hover:bg-slate-100 p-1"
                  aria-label="Fermer"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="space-y-3 mb-6">
                {selectedDayDetails.sessions.length === 0 ? (
                  <p className="text-xs text-slate-500 py-6 text-center font-medium">
                    Aucun créneau enregistré pour ce jour.
                  </p>
                ) : (
                  selectedDayDetails.sessions.map((session, sIdx) => {
                    const isManual = !!session.originalLigne.id
                    let typeLabel = ''
                    let typeColor = ''
                    switch (session.type) {
                      case 'fixe': typeLabel = 'Planning fixe'; typeColor = 'bg-blue-50 text-blue-700 border-blue-200/45'; break
                      case 'tournant': typeLabel = 'Planning tournant'; typeColor = 'bg-green-50 text-green-700 border-green-200/45'; break
                      case 'remplacement': typeLabel = 'Remplacement'; typeColor = 'bg-amber-50 text-amber-850 border-amber-200/45'; break
                      case 'absence': typeLabel = 'Absence'; typeColor = 'bg-red-50 text-red-700 border-red-200/45'; break
                      case 'competition': typeLabel = 'Compétition'; typeColor = 'bg-purple-50 text-purple-700 border-purple-200/45'; break
                      case 'forfait_regional': typeLabel = 'Forfait Régional'; typeColor = 'bg-orange-50 text-orange-700 border-orange-200/45'; break
                    }
                    return (
                      <div key={sIdx} className="p-3 border border-slate-100 rounded-xl bg-slate-50/50 flex items-start justify-between gap-3">
                        <div className="space-y-1">
                          <span className={`inline-block px-1.5 py-0.5 rounded text-[8px] font-bold uppercase border ${typeColor}`}>
                            {typeLabel}
                          </span>
                          <p className="text-xs text-slate-800 font-bold leading-snug">
                            {session.description}
                          </p>
                          <p className="text-[10px] text-slate-500 font-semibold">
                            {session.heures.toFixed(2)}h — {session.montant.toFixed(2)}€
                          </p>
                        </div>
                        {isManual && (
                          <button
                            onClick={() => {
                              setSelectedDayDetails(null)
                              handleEditLigne(session.originalLigne)
                            }}
                            className="text-[10px] font-bold text-primary hover:text-primary-dark transition-colors px-2 py-1 rounded-lg border border-slate-200 hover:border-slate-300 bg-white shadow-xs shrink-0 uppercase tracking-wider"
                          >
                            Éditer
                          </button>
                        )}
                      </div>
                    )
                  })
                )}
              </div>

              <div className="flex gap-2.5">
                {!data?.isBlocked && (
                  <button
                    onClick={() => {
                      const date = selectedDayDetails.dateStr
                      setSelectedDayDetails(null)
                      setDaySelectorDate(date)
                    }}
                    className="flex-1 py-2.5 bg-slate-900 text-white rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-slate-800 transition-colors text-center"
                  >
                    Déclarer
                  </button>
                )}
                <button
                  onClick={() => setSelectedDayDetails(null)}
                  className="flex-1 py-2.5 border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors text-center"
                >
                  Fermer
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 3. Modal - Form Add/Edit Manual Popup */}
        {showPopup && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
            <div className="bg-white rounded-2xl p-6 md:p-8 max-w-md w-full my-8 max-h-[90vh] overflow-y-auto shadow-xl border border-slate-100/80 animate-fade-in-up transition-all">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-xl md:text-2xl font-extrabold text-slate-900 leading-tight">
                    {editingLigne
                      ? (popupType === 'remplacement' ? 'Modifier le remplacement' : popupType === 'competition' ? 'Modifier la compétition' : popupType === 'absence' ? 'Modifier l\'absence' : 'Modifier le forfait régional')
                      : (popupType === 'remplacement' ? 'Ajouter un remplacement' : popupType === 'competition' ? 'Ajouter une compétition' : popupType === 'absence' ? 'Ajouter une absence' : 'Ajouter un forfait régional')
                    }
                  </h3>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Déclaration manuelle</p>
                </div>
                <button
                  onClick={() => setShowPopup(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors shrink-0"
                  aria-label="Fermer"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Form - Absence */}
              {popupType === 'absence' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                      Date de l&apos;absence
                    </label>
                    <input
                      type="date"
                      value={absenceDate}
                      onChange={(e) => setAbsenceDate(e.target.value)}
                      className="w-full px-4 py-2.5 border border-slate-200 rounded-xl bg-slate-50/50 hover:bg-slate-50/80 focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm font-semibold text-slate-800 outline-none"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                        Heure de début
                      </label>
                      <input
                        type="time"
                        value={absenceHeureDebut}
                        onChange={(e) => setAbsenceHeureDebut(e.target.value)}
                        className="w-full px-4 py-2.5 border border-slate-200 rounded-xl bg-slate-50/50 hover:bg-slate-50/80 focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm font-semibold text-slate-800 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                        Heure de fin
                      </label>
                      <input
                        type="time"
                        value={absenceHeureFin}
                        onChange={(e) => setAbsenceHeureFin(e.target.value)}
                        className="w-full px-4 py-2.5 border border-slate-200 rounded-xl bg-slate-50/50 hover:bg-slate-50/80 focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm font-semibold text-slate-800 outline-none"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                      Nombre d&apos;heures d&apos;absence
                    </label>
                    <input
                      type="number"
                      step="0.5"
                      value={absenceHeures}
                      onChange={(e) => setAbsenceHeures(e.target.value)}
                      placeholder="Ex: 1.5"
                      className="w-full px-4 py-2.5 border border-slate-200 rounded-xl bg-slate-50/50 hover:bg-slate-50/80 focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm font-semibold text-slate-800 outline-none"
                    />
                  </div>
                  {conflictWarning && (
                    <div className="bg-amber-50 border-l-4 border-amber-500 p-3.5 rounded-xl flex items-start gap-2 shadow-xs">
                      <svg className="w-5 h-5 text-amber-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                      <div>
                        <p className="text-xs text-amber-950 font-bold">Conflit de planning détecté :</p>
                        <p className="text-[10px] text-amber-800 mt-0.5 font-medium">{conflictWarning}</p>
                      </div>
                    </div>
                  )}
                  {!isAbsenceJourValide() && (
                    <div className="bg-orange-50 border-l-4 border-orange-500 p-3 rounded-xl">
                      <p className="text-xs text-orange-850 font-semibold leading-relaxed">
                        ⚠️ Attention : Vous n&apos;avez pas de cours régulier ce jour-là. Êtes-vous sûr de vouloir déclarer une absence ?
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Form - Remplacement */}
              {popupType === 'remplacement' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                      Coach remplacé
                    </label>
                    <select
                      value={remplacementCoachId}
                      onChange={(e) => setRemplacementCoachId(e.target.value)}
                      className="w-full px-4 py-2.5 border border-slate-200 rounded-xl bg-slate-50/50 hover:bg-slate-50/80 focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm font-semibold text-slate-800 outline-none"
                    >
                      <option value="">-- Sélectionner le coach remplacé --</option>
                      {coaches.map((coach) => (
                        <option key={coach.id} value={coach.id}>
                          {coach.prenom} {coach.nom || ''}
                        </option>
                      ))}
                    </select>
                    <p className="text-[10px] text-slate-400 font-semibold mt-1 flex items-center gap-1">
                      <span>ℹ️</span>
                      Une déduction sera automatiquement créée pour ce coach
                    </p>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                      Date
                    </label>
                    <input
                      type="date"
                      value={remplacementDate}
                      onChange={(e) => setRemplacementDate(e.target.value)}
                      className="w-full px-4 py-2.5 border border-slate-200 rounded-xl bg-slate-50/50 hover:bg-slate-50/80 focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm font-semibold text-slate-800 outline-none"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                        Heure de début
                      </label>
                      <input
                        type="time"
                        value={remplacementHeureDebut}
                        onChange={(e) => setRemplacementHeureDebut(e.target.value)}
                        className="w-full px-4 py-2.5 border border-slate-200 rounded-xl bg-slate-50/50 hover:bg-slate-50/80 focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm font-semibold text-slate-800 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                        Heure de fin
                      </label>
                      <input
                        type="time"
                        value={remplacementHeureFin}
                        onChange={(e) => setRemplacementHeureFin(e.target.value)}
                        className="w-full px-4 py-2.5 border border-slate-200 rounded-xl bg-slate-50/50 hover:bg-slate-50/80 focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm font-semibold text-slate-800 outline-none"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                      Groupe
                    </label>
                    <select
                      value={remplacementGroupe}
                      onChange={(e) => setRemplacementGroupe(e.target.value)}
                      className="w-full px-4 py-2.5 border border-slate-200 rounded-xl bg-slate-50/50 hover:bg-slate-50/80 focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm font-semibold text-slate-800 outline-none"
                    >
                      <option value="">-- Sélectionner un groupe --</option>
                      {groupes.map((groupe) => (
                        <option key={groupe.id} value={groupe.nom}>
                          {groupe.nom}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                      Nombre d&apos;heures
                    </label>
                    <input
                      type="number"
                      step="0.5"
                      value={remplacementHeures}
                      onChange={(e) => setRemplacementHeures(e.target.value)}
                      placeholder="Ex: 1.5"
                      className="w-full px-4 py-2.5 border border-slate-200 rounded-xl bg-slate-50/50 hover:bg-slate-50/80 focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm font-semibold text-slate-800 outline-none"
                    />
                  </div>
                  {conflictWarning && (
                    <div className="bg-amber-50 border-l-4 border-amber-500 p-3.5 rounded-xl flex items-start gap-2 shadow-xs">
                      <svg className="w-5 h-5 text-amber-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                      <div>
                        <p className="text-xs text-amber-950 font-bold">Conflit de planning détecté :</p>
                        <p className="text-[10px] text-amber-800 mt-0.5 font-medium">{conflictWarning}</p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Form - Compétition */}
              {popupType === 'competition' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                      Événement du calendrier
                    </label>
                    {loadingEvenements ? (
                      <p className="text-xs text-slate-500 font-medium">Chargement des événements...</p>
                    ) : evenementsError ? (
                      <p className="text-xs text-red-500 font-medium">Erreur : {evenementsError}</p>
                    ) : (
                      <select
                        value={selectedEvenementId}
                        onChange={(e) => {
                          const id = e.target.value
                          setSelectedEvenementId(id)
                          const evt = evenements.find((ev) => ev.id === id)
                          if (evt) {
                            setCompetitionDate(evt.date.split('T')[0])
                            setCompetitionLieu(`${evt.title}${evt.lieu ? ` (${evt.lieu})` : ''}`)
                          } else {
                            setCompetitionDate('')
                            setCompetitionLieu('')
                          }
                        }}
                        className="w-full px-4 py-2.5 border border-slate-200 rounded-xl bg-slate-50/50 hover:bg-slate-50/80 focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm font-semibold text-slate-800 outline-none"
                      >
                        <option value="">-- Sélectionner un événement --</option>
                        {evenements.map((evt) => (
                          <option key={evt.id} value={evt.id}>
                            {new Date(evt.date).toLocaleDateString('fr-FR')} - {evt.title} {evt.lieu ? `(${evt.lieu})` : ''}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                      Date de la compétition
                    </label>
                    <input
                      type="date"
                      value={competitionDate}
                      onChange={(e) => setCompetitionDate(e.target.value)}
                      className="w-full px-4 py-2.5 border border-slate-200 rounded-xl bg-slate-50/50 hover:bg-slate-50/80 focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm font-semibold text-slate-800 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                      Lieu / Événement sélectionné
                    </label>
                    <input
                      type="text"
                      value={competitionLieu}
                      readOnly
                      placeholder="Sélectionnez un événement ci-dessus"
                      className="w-full px-4 py-2.5 border border-slate-200 rounded-xl bg-slate-100 text-slate-500 transition-all text-sm font-semibold outline-none cursor-default"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                      Catégories
                    </label>
                    <div className="grid grid-cols-2 gap-2 border border-slate-200 rounded-xl p-3 bg-slate-50/50">
                      {['Avenirs', 'Benjamins', 'Juniors', 'Adultes'].map((cat) => (
                        <label key={cat} className="flex items-center gap-2 cursor-pointer p-1.5 hover:bg-white rounded-lg transition-colors border border-transparent hover:border-slate-100">
                          <input
                            type="checkbox"
                            checked={competitionCategories.includes(cat)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setCompetitionCategories([...competitionCategories, cat])
                              } else {
                                setCompetitionCategories(competitionCategories.filter((c) => c !== cat))
                              }
                            }}
                            className="rounded border-slate-350 text-primary focus:ring-primary w-4 h-4 transition-colors"
                          />
                          <span className="text-xs text-slate-700 font-bold select-none">{cat}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                      Nombre de demi-journées
                    </label>
                    <input
                      type="number"
                      step="0.5"
                      value={competitionDemiJournees}
                      onChange={(e) => setCompetitionDemiJournees(e.target.value)}
                      placeholder="Ex: 2"
                      className="w-full px-4 py-2.5 border border-slate-200 rounded-xl bg-slate-50/50 hover:bg-slate-50/80 focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm font-semibold text-slate-800 outline-none"
                    />
                  </div>
                </div>
              )}

              {/* Form - Forfait Régional */}
              {popupType === 'forfait_regional' && data && (
                <div className="space-y-4">
                  {data.forfaitRegionalActif ? (
                    <div className="bg-emerald-50 border-l-4 border-emerald-500 p-3.5 rounded-xl">
                      <p className="text-xs text-emerald-950 font-bold leading-relaxed">
                        Mode libre : Vous pouvez saisir le montant de votre choix pour ce forfait régional.
                      </p>
                    </div>
                  ) : (
                    <div className="bg-blue-50 border-l-4 border-blue-500 p-3.5 rounded-xl">
                      <p className="text-xs text-blue-950 font-bold leading-relaxed">
                        Mode fixe : Le montant du forfait régional est fixé à <strong>{data.montantForfaitRegional}€</strong> par l&apos;administration.
                      </p>
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                      Date de la compétition
                    </label>
                    <input
                      type="date"
                      value={forfaitRegionalDate}
                      onChange={(e) => setForfaitRegionalDate(e.target.value)}
                      className="w-full px-4 py-2.5 border border-slate-200 rounded-xl bg-slate-50/50 hover:bg-slate-50/80 focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm font-semibold text-slate-800 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                      Lieu
                    </label>
                    <input
                      type="text"
                      value={forfaitRegionalLieu}
                      onChange={(e) => setForfaitRegionalLieu(e.target.value)}
                      placeholder="Ville ou nom de la compétition"
                      className="w-full px-4 py-2.5 border border-slate-200 rounded-xl bg-slate-50/50 hover:bg-slate-50/80 focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm font-semibold text-slate-800 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                      Catégorie
                    </label>
                    <select
                      value={forfaitRegionalCategorie}
                      onChange={(e) => setForfaitRegionalCategorie(e.target.value)}
                      className="w-full px-4 py-2.5 border border-slate-200 rounded-xl bg-slate-50/50 hover:bg-slate-50/80 focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm font-semibold text-slate-800 outline-none"
                    >
                      <option value="">-- Sélectionner une catégorie --</option>
                      <option value="Avenirs">Avenirs</option>
                      <option value="Benjamins">Benjamins</option>
                      <option value="Juniors">Juniors</option>
                      <option value="Adultes">Adultes</option>
                    </select>
                  </div>

                  {data.forfaitRegionalActif ? (
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                        Montant (€)
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={forfaitRegionalMontant}
                        onChange={(e) => setForfaitRegionalMontant(e.target.value)}
                        placeholder="Ex: 75.00"
                        className="w-full px-4 py-2.5 border border-slate-200 rounded-xl bg-slate-50/50 hover:bg-slate-50/80 focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm font-semibold text-slate-800 outline-none"
                      />
                    </div>
                  ) : (
                    <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Montant du forfait</span>
                        <span className="text-lg font-extrabold text-primary">{data.montantForfaitRegional.toFixed(2)}€</span>
                      </div>
                      <p className="text-[10px] text-slate-400 font-semibold mt-1">
                        Fixé par l&apos;administration (non modifiable)
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Form Buttons */}
              <div className="flex flex-col-reverse md:flex-row gap-3 mt-8">
                <button
                  onClick={() => setShowPopup(false)}
                  className="w-full md:flex-1 px-5 py-3 border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 transition-colors font-bold text-xs uppercase tracking-wider"
                >
                  Annuler
                </button>
                <button
                  onClick={popupType === 'remplacement' ? handleSubmitRemplacement : popupType === 'competition' ? handleSubmitCompetition : popupType === 'absence' ? handleSubmitAbsence : handleSubmitForfaitRegional}
                  className="w-full md:flex-1 px-5 py-3 bg-primary text-white rounded-xl hover:bg-primary-dark transition-colors font-bold text-xs uppercase tracking-wider shadow-sm"
                >
                  {editingLigne ? 'Modifier' : 'Ajouter'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal d'alerte / Erreur Abby */}
        {abbyModal?.open && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
            <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl animate-fade-in-up border border-slate-100 relative overflow-hidden">
              {/* Header Icon */}
              <div className="flex items-center gap-4 mb-5">
                <div
                  className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${
                    abbyModal.type === 'missing_key'
                      ? 'bg-amber-100 text-amber-600'
                      : abbyModal.type === 'error'
                      ? 'bg-red-100 text-red-600'
                      : 'bg-emerald-100 text-emerald-600'
                  }`}
                >
                  {abbyModal.type === 'missing_key' && (
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  )}
                  {abbyModal.type === 'error' && (
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  )}
                  {abbyModal.type === 'success' && (
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
                <div>
                  <h3 className="text-lg font-extrabold text-slate-900 leading-tight">
                    {abbyModal.title}
                  </h3>
                  {abbyModal.code && (
                    <span className="inline-block mt-1 px-2.5 py-0.5 bg-slate-100 text-slate-600 text-[10px] font-mono font-bold rounded-md uppercase">
                      Code: {abbyModal.code} {abbyModal.status ? `(${abbyModal.status})` : ''}
                    </span>
                  )}
                </div>
              </div>

              {/* Body message */}
              <div className="space-y-3 mb-6">
                <p className="text-slate-900 font-bold text-sm leading-relaxed">
                  {abbyModal.message}
                </p>
                {abbyModal.details && (
                  <p className="text-slate-600 text-xs leading-relaxed bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                    {abbyModal.details}
                  </p>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3">
                {abbyModal.type === 'missing_key' ? (
                  <>
                    <button
                      onClick={() => {
                        setAbbyModal(null)
                        router.push('/coach/profil')
                      }}
                      className="flex-1 px-5 py-3 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold text-xs uppercase tracking-wider transition-all shadow-sm active:scale-[0.98]"
                    >
                      Configurer mon profil
                    </button>
                    <button
                      onClick={() => setAbbyModal(null)}
                      className="px-5 py-3 border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 transition-colors font-bold text-xs uppercase tracking-wider"
                    >
                      Fermer
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => setAbbyModal(null)}
                    className="w-full px-5 py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold text-xs uppercase tracking-wider transition-all shadow-sm active:scale-[0.98]"
                  >
                    Fermer
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

/**
 * Helpers
 */

/**
 * Extracts date strings formatted as YYYY-MM-DD from recurring fixed plannings descriptions.
 * Match e.g. "Lundi 18:00-19:30 - Elite (01/06, 08/06, 15/06)"
 */
function parseDatesFromDescription(description: string, year: number): string[] {
  const match = description.match(/\(([^)]+)\)/)
  if (!match) return []
  const datesContent = match[1]
  const dateParts = datesContent.split(',')
  const result: string[] = []
  
  for (const part of dateParts) {
    const cleaned = part.trim()
    const dayMonth = cleaned.split('/')
    if (dayMonth.length === 2) {
      const day = dayMonth[0].trim().padStart(2, '0')
      const month = dayMonth[1].trim().padStart(2, '0')
      result.push(`${year}-${month}-${day}`)
    }
  }
  return result
}

/**
 * Strips verbose elements of the line description to make clean, compact pills for desktop view
 */
function formatPillDescription(session: CalendarSession): string {
  const desc = session.description
  
  if (session.type === 'fixe') {
    // "Lundi 18:00-19:30 - Elite" -> "1.5h - Elite"
    const parts = desc.split('-')
    const grp = parts[parts.length - 1]?.trim() || desc
    return `${session.heures.toFixed(1)}h - ${grp}`
  }
  
  if (session.type === 'tournant') {
    const parts = desc.split('-')
    const grp = parts[parts.length - 1]?.trim() || 'Tournant'
    return `${session.heures.toFixed(1)}h - ${grp}`
  }
  
  if (session.type === 'remplacement') {
    const match = desc.match(/Remplacement de ([^\s-]+)/)
    if (match) {
      return `Rempl. ${match[1]}`
    }
    return `Rempl. ${session.heures.toFixed(1)}h`
  }
  
  if (session.type === 'absence') {
    return `Absence (-${session.heures.toFixed(1)}h)`
  }
  
  if (session.type === 'competition') {
    const cleanLieu = desc.replace('Compétition', '').split('-')[0]?.trim() || 'Compétition'
    return `Comp. ${cleanLieu}`
  }
  
  if (session.type === 'forfait_regional') {
    const cleanLieu = desc.replace('Forfait Régional', '').split('-')[0]?.trim() || 'Forfait'
    return `Rég. ${cleanLieu}`
  }
  
  return desc
}
