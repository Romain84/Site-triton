'use client'

import { useState, useEffect, useCallback, Fragment } from 'react'
import { getErrorMessage } from '@/lib/utils'
import { HelpTooltip, CalculationTooltip } from '@/components/ui/Tooltip'

// ─── Types ────────────────────────────────────────────────────────────────────

interface AlerteGroupe {
  type: 'danger' | 'warning' | 'info'
  code: string
  message: string
}

interface ProjectionRemplissage {
  tauxActuel: number
  beneficeActuel: number
  projection75: number
  projection90: number
  projection100: number
  inscritsSeuil: number
}

interface PlanningDetail {
  jour: string
  heureDebut: string
  heureFin: string
  duree: number
  coach?: string
  nbCoachsFactures: number
  nbGroupesSimultanes?: number
}

interface GroupeCout {
  groupeId: string
  groupeNom: string
  niveau: string | null
  isCompetition: boolean
  placesTotal: number
  inscrits: number
  inscrits1Cours: number
  inscrits2Cours: number
  inscritsEquivalents: number
  tarifAnnuel: number
  tarif1Cours: number
  tarifConseille: number
  libelleOption1: string | null
  libelleOption2: string | null
  prixLicence: number
  heuresParSemaine: number
  nbSemaines: number
  totalHeures: number
  coutCoaching: number
  coutFormationsPSE1: number
  heuresAnnuleesDeduites: number
  nbCompetitions: number
  coutCompetitions: number
  coutLicences: number
  coutMargeSecurite: number
  coutTotal: number
  coutParInscrit: number
  coutParHeure: number
  revenuActuel: number
  revenuPotentiel: number
  beneficeActuel: number
  beneficePotentiel: number
  margeActuelle: number
  seuilRentabilite: number
  tauxRemplissage: number
  alertes: AlerteGroupe[]
  projection: ProjectionRemplissage
  membresBureau: number
  enfantsBureau: number
  dateDebutUtilisee: string
  dateFinUtilisee: string
  sourceDate: 'global' | 'groupe'
  plannings: PlanningDetail[]
}

interface CoachCout {
  coachId: string
  coachNom: string
  heuresParSemaine: number
  totalHeures: number
  coutTotal: number
  groupes: string[]
}

interface ComparaisonModes {
  coutSimple: number
  coutOptimise: number
  economie: number
  economiePercent: number
  heuresDedupliquees: number
}

interface PeriodeVacances {
  nom: string
  dateDebut: string
  dateFin: string
}

interface ResultatCalcul {
  dateDebut: string | null
  dateFin: string | null
  nbSemainesTotales: number | null
  tauxHoraire: number
  forfaitCompetition: number
  nbDemiJourneesParCompetition: number
  margeSecurite: number
  coutFormationsPSE1?: number
  nbFormationsBNSSA?: number | null
  mode: 'simple' | 'optimise'
  groupes: GroupeCout[]
  coachsCout: CoachCout[]
  totaux: {
    totalHeures: number
    coutCoaching: number
    coutCompetitions: number
    coutLicences: number
    coutFormationsPSE1?: number
    coutMargeSecurite: number
    coutTotal: number
    revenuActuel: number
    revenuPotentiel: number
    beneficeActuel: number
    beneficePotentiel: number
    margeActuelle: number
    totalInscrits: number
    totalPlaces: number
    tauxRemplissageMoyen: number
  }
  alertesGlobales: AlerteGroupe[]
  heuresDedupliquees?: number
  comparaison?: ComparaisonModes
  periodesVacances: PeriodeVacances[]
}

type ViewMode = 'couts' | 'rentabilite' | 'alertes' | 'coachs'
type SortKey  = 'nom' | 'cout' | 'benefice' | 'remplissage'

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmt = (n: number) =>
  n.toLocaleString('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })

const fmtD = (n: number) =>
  n.toLocaleString('fr-FR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })

const getBeneficeColor = (v: number) =>
  v > 0 ? 'text-emerald-600' : v < 0 ? 'text-rose-600' : 'text-slate-500'

const getBeneficeBg = (v: number) =>
  v > 0 ? 'bg-emerald-50/50' : v < 0 ? 'bg-rose-50/50' : 'bg-slate-50/50'

const sign = (v: number) => (v >= 0 ? '+' : '')

const ALERTE_CFG: Record<AlerteGroupe['type'], { border: string; bg: string; text: string; dot: string }> = {
  danger:  { border: 'border-rose-100', bg: 'bg-rose-50/50', text: 'text-rose-700', dot: '🔴' },
  warning: { border: 'border-amber-100', bg: 'bg-amber-50/50', text: 'text-amber-700', dot: '🟡' },
  info:    { border: 'border-blue-100', bg: 'bg-blue-50/50', text: 'text-blue-700', dot: '🔵' },
}

const SESSION_KEY = 'coutGroupes.resultat'
const SESSION_PARAMS_KEY = 'coutGroupes.params'

// ─── Export CSV ───────────────────────────────────────────────────────────────

function exportCSV(resultat: ResultatCalcul) {
  const sep = ';'
  const headers = [
    'Groupe', 'Niveau', 'Type', 'Inscrits', 'Places', 'Taux remplissage (%)',
    'Tarif annuel (€)', 'H/semaine', 'Total heures', 'Semaines',
    'Coût coaching (€)', 'Coût compétitions (€)', 'Coût licences (€)',
    'Marge sécurité (€)', 'Coût total (€)', 'Coût/inscrit (€)',
    'Revenu actuel (€)', 'Revenu potentiel (€)',
    'Bénéfice actuel (€)', 'Bénéfice potentiel (€)', 'Marge (%)',
    'Seuil rentabilité', 'Période début', 'Période fin', 'Source date',
  ]

  const rows = resultat.groupes.map((g) => [
    g.groupeNom,
    g.niveau ?? '',
    g.isCompetition ? 'Compétition' : 'Loisir',
    g.inscrits,
    g.placesTotal,
    g.tauxRemplissage.toFixed(1),
    g.tarifAnnuel,
    g.heuresParSemaine.toFixed(1),
    g.totalHeures.toFixed(1),
    g.nbSemaines,
    g.coutCoaching.toFixed(0),
    g.coutCompetitions.toFixed(0),
    g.coutLicences.toFixed(0),
    g.coutMargeSecurite.toFixed(0),
    g.coutTotal.toFixed(0),
    g.coutParInscrit.toFixed(0),
    g.revenuActuel.toFixed(0),
    g.revenuPotentiel.toFixed(0),
    g.beneficeActuel.toFixed(0),
    g.beneficePotentiel.toFixed(0),
    g.margeActuelle.toFixed(1),
    g.seuilRentabilite,
    g.dateDebutUtilisee,
    g.dateFinUtilisee,
    g.sourceDate === 'groupe' ? 'Groupe' : 'Globale',
  ])

  // Ligne totaux
  const t = resultat.totaux
  rows.push([
    'TOTAL', '', '', t.totalInscrits, t.totalPlaces,
    t.tauxRemplissageMoyen.toFixed(1), '', '',
    t.totalHeures.toFixed(1), '',
    t.coutCoaching.toFixed(0), t.coutCompetitions.toFixed(0),
    t.coutLicences.toFixed(0), t.coutMargeSecurite.toFixed(0),
    t.coutTotal.toFixed(0), '',
    t.revenuActuel.toFixed(0), t.revenuPotentiel.toFixed(0),
    t.beneficeActuel.toFixed(0), t.beneficePotentiel.toFixed(0),
    t.margeActuelle.toFixed(1), '', '', '', '',
  ])

  const csv = [headers, ...rows]
    .map((row) => row.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(sep))
    .join('\n')

  const bom   = '\uFEFF' // BOM UTF-8 pour Excel
  const blob  = new Blob([bom + csv], { type: 'text/csv;charset=utf-8;' })
  const url   = URL.createObjectURL(blob)
  const a     = document.createElement('a')
  a.href      = url
  a.download  = `analyse-financiere-${new Date().toISOString().split('T')[0]}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function SkeletonKpi() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6 animate-pulse">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="bg-gray-100 rounded-lg p-4 h-24" />
      ))}
    </div>
  )
}

function SkeletonTable() {
  return (
    <div className="animate-pulse space-y-2 mt-4">
      <div className="h-8 bg-gray-100 rounded" />
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="h-12 bg-gray-50 rounded" />
      ))}
    </div>
  )
}

// ─── Composant principal ──────────────────────────────────────────────────────

export default function CoutGroupes() {
  // Formulaire
  const [dateDebut, setDateDebut]               = useState('')
  const [dateFin, setDateFin]                   = useState('')
  const [mode, setMode]                         = useState<'simple' | 'optimise'>('simple')
  const [margeSecurite, setMargeSecurite]       = useState(0)
  const [coutFormationsPSE1, setCoutFormationsPSE1] = useState<number>(150)
  const [nbFormationsBNSSA, setNbFormationsBNSSA]   = useState<string>('')
  const [includeComparaison, setIncludeComparaison] = useState(false)
  // NOUVEAU: simulation taux horaire
  const [tauxOverride, setTauxOverride]         = useState<string>('')

  // État
  const [loading, setLoading]   = useState(false)
  const [rawResultat, setRawResultat] = useState<ResultatCalcul | null>(null)
  const [error, setError]       = useState('')

  // UI
  const [showDetails, setShowDetails]                     = useState<Record<string, boolean>>({})
  const [showCostBreakdown, setShowCostBreakdown]         = useState(false)
  const [showGroupCostBreakdown, setShowGroupCostBreakdown] = useState<Record<string, boolean>>({})
  const [showProjection, setShowProjection]               = useState<Record<string, boolean>>({})
  const [viewMode, setViewMode]                           = useState<ViewMode>('couts')
  const [sortBy, setSortBy]                               = useState<SortKey>('nom')

  // NOUVEAU: états de simulation interactive client
  const [simTarifPercent, setSimTarifPercent]             = useState<number>(0)
  const [simRemplissageTarget, setSimRemplissageTarget]   = useState<number>(0)
  const [simInscritsByGroupe, setSimInscritsByGroupe]     = useState<Record<string, number>>({})

  // ── Persistance localStorage (préférences) ─────────────────────────────────
  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      const d  = localStorage.getItem('coutGroupes.dateDebut')
      const f  = localStorage.getItem('coutGroupes.dateFin')
      const m  = localStorage.getItem('coutGroupes.mode')
      const mg = localStorage.getItem('coutGroupes.marge')
      if (d) setDateDebut(d)
      if (f) setDateFin(f)
      if (m === 'simple' || m === 'optimise') setMode(m)
      if (mg) setMargeSecurite(Number(mg))
    } catch { /* noop */ }
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      localStorage.setItem('coutGroupes.dateDebut', dateDebut)
      localStorage.setItem('coutGroupes.dateFin', dateFin)
      localStorage.setItem('coutGroupes.mode', mode)
      localStorage.setItem('coutGroupes.marge', String(margeSecurite))
    } catch { /* noop */ }
  }, [dateDebut, dateFin, mode, margeSecurite])

  // ── NOUVEAU: persistance sessionStorage (résultats) ────────────────────────
  // Recharge les résultats à la navigation si les paramètres n'ont pas changé
  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      const savedParams  = sessionStorage.getItem(SESSION_PARAMS_KEY)
      const savedResultat = sessionStorage.getItem(SESSION_KEY)
      if (!savedParams || !savedResultat) return

      const params = JSON.parse(savedParams)
      // On restaure uniquement si dates + mode identiques
      if (
        params.dateDebut === dateDebut &&
        params.dateFin   === dateFin   &&
        params.mode      === mode
      ) {
        setRawResultat(JSON.parse(savedResultat))
      }
    } catch { /* noop */ }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // uniquement au mount

  // ── Auto-calcul sur mount si aucun résultat dans sessionStorage ───────────
  useEffect(() => {
    if (typeof window === 'undefined') return
    const savedResultat = sessionStorage.getItem(SESSION_KEY)
    if (savedResultat) return // déjà restauré depuis sessionStorage

    const triggerInitialCalculation = async () => {
      setLoading(true)
      setError('')
      try {
        const d = localStorage.getItem('coutGroupes.dateDebut') || undefined
        const f = localStorage.getItem('coutGroupes.dateFin') || undefined
        const m = localStorage.getItem('coutGroupes.mode') || 'simple'
        const mg = Number(localStorage.getItem('coutGroupes.marge') || '0')

        const response = await fetch('/api/admin/groupes/cout-saison', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            dateDebut:  d || undefined,
            dateFin:    f || undefined,
            mode:       m,
            margeSecurite: mg,
            includeComparaison: false,
          }),
        })
        const data = await response.json()
        if (response.ok) {
          setRawResultat(data)
          // sauvegarde dans sessionStorage
          try {
            sessionStorage.setItem(SESSION_KEY, JSON.stringify(data))
            sessionStorage.setItem(SESSION_PARAMS_KEY, JSON.stringify({ dateDebut: d || '', dateFin: f || '', mode: m }))
          } catch { /* noop */ }
        }
      } catch (err) {
        setError(getErrorMessage(err))
      } finally {
        setLoading(false)
      }
    }

    triggerInitialCalculation()
  }, [])

  const sauvegarderResultat = useCallback((data: ResultatCalcul) => {
    try {
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(data))
      sessionStorage.setItem(SESSION_PARAMS_KEY, JSON.stringify({ dateDebut, dateFin, mode }))
    } catch { /* noop — quota dépassé */ }
  }, [dateDebut, dateFin, mode])

  // ── Calcul ─────────────────────────────────────────────────────────────────
  const handleCalculer = async () => {
    setLoading(true)
    setError('')
    setRawResultat(null) // reset pour afficher skeleton
    try {
      const tauxChargesOverride = tauxOverride !== '' ? Number(tauxOverride) : undefined

      const response = await fetch('/api/admin/groupes/cout-saison', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dateDebut:  dateDebut || undefined,
          dateFin:    dateFin   || undefined,
          mode,
          margeSecurite,
          coutFormationsPSE1,
          nbFormationsBNSSA: nbFormationsBNSSA !== '' ? Number(nbFormationsBNSSA) : undefined,
          includeComparaison,
          tauxChargesOverride,
        }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Erreur lors du calcul')
      setRawResultat(data)
      sauvegarderResultat(data)
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  const toggleDetails            = (id: string) => setShowDetails((p) => ({ ...p, [id]: !p[id] }))
  const toggleGroupCostBreakdown = (id: string) => setShowGroupCostBreakdown((p) => ({ ...p, [id]: !p[id] }))
  const toggleProjection         = (id: string) => setShowProjection((p) => ({ ...p, [id]: !p[id] }))

  // NOUVEAU : Calculateur de simulation dynamique côté client
  const displayData = (() => {
    if (!rawResultat) return null
    const hasCustomInscrits = Object.keys(simInscritsByGroupe).length > 0
    if (simTarifPercent === 0 && simRemplissageTarget === 0 && !hasCustomInscrits) return rawResultat

    const coeffTarif = 1 + simTarifPercent / 100

    const simulateurGroupe = (g: GroupeCout): GroupeCout => {
      let inscritsSimules = g.inscrits
      if (simInscritsByGroupe[g.groupeId] !== undefined) {
        inscritsSimules = Math.max(0, simInscritsByGroupe[g.groupeId])
      } else if (simRemplissageTarget > 0) {
        const inscritsCibles = Math.ceil((simRemplissageTarget / 100) * g.placesTotal)
        if (inscritsCibles > g.inscrits) {
          inscritsSimules = inscritsCibles
        }
      }

      const ratio1Cours = g.inscrits > 0 ? g.inscrits1Cours / g.inscrits : 0
      const inscrits1CoursSimules = Math.round(inscritsSimules * ratio1Cours)
      const inscrits2CoursSimules = Math.max(0, inscritsSimules - inscrits1CoursSimules)
      const inscritsEquivalentsSimules = inscrits2CoursSimules + inscrits1CoursSimules * 0.5

      const membresBureau = g.membresBureau ?? 0
      const enfantsBureau = g.enfantsBureau ?? 0
      const inscritsPleinTarif = Math.max(0, inscritsSimules - membresBureau - enfantsBureau)

      const tarifAnnuelSimule = g.tarifAnnuel * coeffTarif
      const tarif1CoursSimule = g.tarif1Cours * coeffTarif

      const totalTarifInscritsSimules = (inscrits2CoursSimules * tarifAnnuelSimule) + (inscrits1CoursSimules * tarif1CoursSimule)
      const tarifMoyenSimule = inscritsSimules > 0 ? totalTarifInscritsSimules / inscritsSimules : tarifAnnuelSimule

      const reductionEnfantBureau = 50 // reduction du bureau
      const tarifEnfantBureauSimule = tarifMoyenSimule * (1 - reductionEnfantBureau / 100)

      const revenuActuelSimule =
        inscritsPleinTarif * tarifMoyenSimule + enfantsBureau * tarifEnfantBureauSimule

      const revenuPotentielSimule = tarifMoyenSimule * g.placesTotal
      const coutLicencesSimule = g.prixLicence * inscritsSimules
      const coutTotalSimule = g.coutCoaching + g.coutCompetitions + coutLicencesSimule + g.coutMargeSecurite

      const beneficeActuelSimule = revenuActuelSimule - coutTotalSimule
      const beneficePotentielSimule = revenuPotentielSimule - coutTotalSimule
      const margeActuelleSimule = revenuActuelSimule > 0 ? (beneficeActuelSimule / revenuActuelSimule) * 100 : -100

      const tarifEffectifMoyenSimule =
        inscritsSimules > 0 ? revenuActuelSimule / inscritsSimules : tarifMoyenSimule
      const seuilRentabiliteSimule =
        tarifEffectifMoyenSimule > 0 ? Math.ceil(coutTotalSimule / tarifEffectifMoyenSimule) : 0

      const tauxRemplissageSimule =
        g.placesTotal > 0 ? (inscritsEquivalentsSimules / g.placesTotal) * 100 : 0

      const beneficeAtTaux = (taux: number) =>
        Math.round(g.placesTotal * taux * tarifEffectifMoyenSimule - coutTotalSimule)

      const projectionSimulee = {
        tauxActuel: Math.round(tauxRemplissageSimule * 10) / 10,
        beneficeActuel: Math.round(beneficeActuelSimule),
        projection75: beneficeAtTaux(0.75),
        projection90: beneficeAtTaux(0.9),
        projection100: beneficeAtTaux(1.0),
        inscritsSeuil: seuilRentabiliteSimule,
      }

      return {
        ...g,
        inscrits: inscritsSimules,
        inscrits1Cours: inscrits1CoursSimules,
        inscrits2Cours: inscrits2CoursSimules,
        inscritsEquivalents: inscritsEquivalentsSimules,
        tarifAnnuel: tarifAnnuelSimule,
        tarif1Cours: tarif1CoursSimule,
        coutLicences: coutLicencesSimule,
        coutTotal: coutTotalSimule,
        coutParInscrit: inscritsSimules > 0 ? coutTotalSimule / inscritsSimules : 0,
        revenuActuel: revenuActuelSimule,
        revenuPotentiel: revenuPotentielSimule,
        beneficeActuel: beneficeActuelSimule,
        beneficePotentiel: beneficePotentielSimule,
        margeActuelle: margeActuelleSimule,
        seuilRentabilite: seuilRentabiliteSimule,
        tauxRemplissage: tauxRemplissageSimule,
        projection: projectionSimulee,
      }
    }

    const groupesSimules = rawResultat.groupes.map(simulateurGroupe)

    const totalHeuresGlobal = groupesSimules.filter((r) => r.nbSemaines > 0).reduce((s, r) => s + r.totalHeures, 0)
    const coutCoachingGlobal = groupesSimules.filter((r) => r.nbSemaines > 0).reduce((s, r) => s + r.coutCoaching, 0)
    const coutCompetitionsGlobal = groupesSimules.filter((r) => r.nbSemaines > 0).reduce((s, r) => s + r.coutCompetitions, 0)
    const coutLicencesGlobal = groupesSimules.filter((r) => r.nbSemaines > 0).reduce((s, r) => s + r.coutLicences, 0)
    const coutMargeGlobal = groupesSimules.filter((r) => r.nbSemaines > 0).reduce((s, r) => s + r.coutMargeSecurite, 0)
    const coutTotalGlobal = groupesSimules.filter((r) => r.nbSemaines > 0).reduce((s, r) => s + r.coutTotal, 0)
    const revenuActuelGlobal = groupesSimules.filter((r) => r.nbSemaines > 0).reduce((s, r) => s + r.revenuActuel, 0)
    const revenuPotentielGlobal = groupesSimules.filter((r) => r.nbSemaines > 0).reduce((s, r) => s + r.revenuPotentiel, 0)
    const totalInscrits = groupesSimules.reduce((s, r) => s + r.inscrits, 0)
    const totalPlaces = groupesSimules.reduce((s, r) => s + r.placesTotal, 0)
    const beneficeGlobal = revenuActuelGlobal - coutTotalGlobal

    return {
      ...rawResultat,
      groupes: groupesSimules,
      totaux: {
        totalHeures: totalHeuresGlobal,
        coutCoaching: coutCoachingGlobal,
        coutCompetitions: coutCompetitionsGlobal,
        coutLicences: coutLicencesGlobal,
        coutMargeSecurite: coutMargeGlobal,
        coutTotal: coutTotalGlobal,
        revenuActuel: revenuActuelGlobal,
        revenuPotentiel: revenuPotentielGlobal,
        beneficeActuel: beneficeGlobal,
        beneficePotentiel: revenuPotentielGlobal - coutTotalGlobal,
        margeActuelle: revenuActuelGlobal > 0 ? (beneficeGlobal / revenuActuelGlobal) * 100 : -100,
        totalInscrits,
        totalPlaces,
        tauxRemplissageMoyen: totalPlaces > 0 ? (totalInscrits / totalPlaces) * 100 : 0,
      }
    }
  })()

  const resultat = displayData

  const splitRevenu = (() => {
    if (!resultat) return { plein: 0, bureau: 0 }
    let plein = 0
    let bureau = 0
    for (const g of resultat.groupes) {
      const inscrits1C = g.inscrits1Cours
      const inscrits2C = Math.max(0, g.inscrits - inscrits1C)
      const tA = g.tarifAnnuel
      const t1 = g.tarif1Cours
      const tMoyen = g.inscrits > 0 ? (inscrits2C * tA + inscrits1C * t1) / g.inscrits : tA
      const pleins = Math.max(0, g.inscrits - g.membresBureau - g.enfantsBureau)
      plein += pleins * tMoyen
      bureau += g.enfantsBureau * tMoyen * 0.5
    }
    return { plein, bureau }
  })()

  // ── Tri ────────────────────────────────────────────────────────────────────
  const groupesTries = displayData
    ? [...displayData.groupes].sort((a, b) => {
        if (sortBy === 'cout')        return b.coutTotal - a.coutTotal
        if (sortBy === 'benefice')    return b.beneficeActuel - a.beneficeActuel
        if (sortBy === 'remplissage') return b.tauxRemplissage - a.tauxRemplissage
        return a.groupeNom.localeCompare(b.groupeNom)
      })
    : []

  // ── Comptages alertes ──────────────────────────────────────────────────────
  const nbAlertesTotal = displayData
    ? (displayData.alertesGlobales?.length ?? 0) +
      displayData.groupes.reduce((s, g) => s + (g.alertes?.length ?? 0), 0)
    : 0
  const nbAlertesDanger = displayData
    ? (displayData.alertesGlobales?.filter((a) => a.type === 'danger').length ?? 0) +
      displayData.groupes.reduce((s, g) => s + (g.alertes?.filter((a) => a.type === 'danger').length ?? 0), 0)
    : 0

  // ── Boutons de tri réutilisable ────────────────────────────────────────────
  const SortButtons = ({ options }: { options: { key: SortKey; label: string }[] }) => (
    <div className="flex items-center gap-2 text-sm flex-wrap">
      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Trier :</span>
      {options.map((s) => (
        <button
          key={s.key}
          onClick={() => setSortBy(s.key)}
          className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
            sortBy === s.key ? 'bg-slate-950 text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          {s.label}
        </button>
      ))}
    </div>
  )

  // ─── Rendu ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">

      {/* ── Formulaire Épuré ────────────────────────────────────────────────── */}
      <div className="card p-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
              Analyse Financière des Groupes
              <HelpTooltip title="Outil d'analyse financière">
                <p>Calculez le coût, les revenus et la rentabilité de chaque groupe sur une saison.</p>
                <p className="mt-1">Prend en compte les plannings actifs, le &quot;Temps à facturer&quot; (ex: 60 min = 1h), les vacances, les séances annulées et l&apos;exclusion PPG/Petit Bassin.</p>
                <p className="mt-1 text-xs text-indigo-300">💡 Vous pouvez modifier en temps réel le nombre d&apos;inscrits dans les tableaux pour simuler différents scénarios.</p>
              </HelpTooltip>
            </h2>
          </div>

          {/* Toggle Mode Segmenté */}
          <div className="inline-flex p-1 bg-slate-100/80 rounded-xl border border-slate-200/60 self-start lg:self-auto">
            <button
              onClick={() => setMode('simple')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                mode === 'simple' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Mode Simple
            </button>
            <button
              onClick={() => setMode('optimise')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                mode === 'optimise' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Mode Optimisé
            </button>
          </div>
        </div>

        {/* Barre de contrôle inline */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4 pt-4 border-t border-slate-100 items-end">
          <div>
            <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
              Début de saison
            </label>
            <input
              type="date" value={dateDebut}
              onChange={(e) => setDateDebut(e.target.value)}
              className="input w-full rounded-xl text-xs py-2 focus:ring-1 focus:ring-primary"
            />
          </div>
          <div>
            <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
              Fin de saison
            </label>
            <input
              type="date" value={dateFin}
              onChange={(e) => setDateFin(e.target.value)}
              className="input w-full rounded-xl text-xs py-2 focus:ring-1 focus:ring-primary"
            />
          </div>
          <div>
            <button onClick={handleCalculer} disabled={loading} className="btn-primary w-full py-2.5 rounded-xl shadow-xs hover:shadow-md transition-all font-bold text-xs cursor-pointer">
              {loading ? 'Calcul en cours…' : '📊 Recalculer'}
            </button>
          </div>
        </div>

        {/* Options avancées épurées */}
        <details className="group mt-3 pt-2 border-t border-slate-100">
          <summary className="cursor-pointer select-none text-[11px] font-bold text-slate-400 hover:text-slate-700 flex items-center gap-1.5 list-none outline-none">
            <span className="inline-block transition-transform duration-200 group-open:rotate-90 text-[9px]">▶</span>
            Options de simulation avancée
          </summary>
          <div className="mt-3 grid grid-cols-1 md:grid-cols-5 gap-3 pt-2">
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">Marge de sécurité (%)</label>
              <input
                type="number" min={0} max={100} step={5}
                value={margeSecurite}
                onChange={(e) => setMargeSecurite(Number(e.target.value))}
                className="input w-full text-xs py-1.5" placeholder="0"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">Simuler taux horaire (€/h)</label>
              <input
                type="number" min={0} step={1}
                value={tauxOverride}
                onChange={(e) => setTauxOverride(e.target.value)}
                className="input w-full text-xs py-1.5"
                placeholder="Taux réel"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">Prix Formation BNSSA (€/cand.)</label>
              <input
                type="number" min={0} step={10}
                value={coutFormationsPSE1}
                onChange={(e) => setCoutFormationsPSE1(Number(e.target.value))}
                className="input w-full text-xs py-1.5"
                placeholder="150"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">Nb Formations BNSSA (Optionnel)</label>
              <input
                type="number" min={0} step={1}
                value={nbFormationsBNSSA}
                onChange={(e) => setNbFormationsBNSSA(e.target.value)}
                className="input w-full text-xs py-1.5"
                placeholder="Tous les inscrits"
                title="Nombre de candidats nécessitant la formation (si certains l'ont déjà)"
              />
            </div>
            <div className="flex items-center pt-4">
              <label className="flex items-center gap-2 cursor-pointer text-xs">
                <input
                  type="checkbox" checked={includeComparaison}
                  onChange={(e) => setIncludeComparaison(e.target.checked)}
                  className="w-4 h-4 text-primary border-slate-300 rounded focus:ring-primary"
                />
                <span className="font-semibold text-slate-700">Comparer Simple/Optimisé</span>
              </label>
            </div>
          </div>
          <p className="mt-2 text-[11px] text-slate-500 flex items-center gap-1.5">
            <span>💡 <strong>Précisions :</strong> Le coût de formation PSE1/BNSSA s'applique <em>uniquement au(x) groupe(s) BNSSA</em>. Les licences FFN sont calculées avec le prix individuel défini sur la fiche de chaque groupe (`prixLicence`). La simultanéité du bassin se réfère au planning établi.</span>
          </p>
        </details>

        {error && (
          <div className="mt-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded text-sm">
            ⚠️ {error}
          </div>
        )}
      </div>

      {/* ── Skeleton pendant le chargement ────────────────────────────────── */}
      {loading && (
        <div className="card p-6">
          <div className="animate-pulse">
            <div className="h-6 w-48 bg-gray-200 rounded mb-6" />
            <SkeletonKpi />
            <div className="h-3 w-full bg-gray-100 rounded-full mb-6" />
            <SkeletonTable />
          </div>
        </div>
      )}

      {/* ── Résultats ─────────────────────────────────────────────────────── */}
      {resultat && !loading && (
        <div className="space-y-6">

          {/* Synthèse de la saison */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-indigo-100 rounded-3xl p-6 shadow-xs flex items-start gap-4">
            <span className="text-3xl leading-none">💡</span>
            <div className="space-y-1">
              <h4 className="text-sm font-extrabold text-slate-800 uppercase tracking-wider">Synthèse de la saison</h4>
              <p className="text-slate-600 text-sm leading-relaxed font-medium">
                Avec <strong>{resultat.totaux.totalInscrits}</strong> adhérents inscrits sur <strong>{resultat.totaux.totalPlaces}</strong> places disponibles ({fmtD(resultat.totaux.tauxRemplissageMoyen)}% de remplissage), 
                le club génère un revenu de <strong>{fmt(resultat.totaux.revenuActuel)}€</strong>. 
                Le coût de fonctionnement estimé (coaching, licences et compétitions) s&apos;élève à <strong>{fmt(resultat.totaux.coutTotal)}€</strong>.
                La situation dégage un {resultat.totaux.beneficeActuel >= 0 ? 'bénéfice net' : 'déficit net'} de <strong className={resultat.totaux.beneficeActuel >= 0 ? 'text-emerald-700 font-extrabold' : 'text-rose-700 font-extrabold'}>{fmt(resultat.totaux.beneficeActuel)}€</strong> (marge : {fmtD(resultat.totaux.margeActuelle)}%).
              </p>
            </div>
          </div>

          {/* NOUVEAU: Cockpit de Simulation Commerciale Interactive */}
          <div className="bg-slate-900 text-white rounded-3xl p-6 border border-slate-800 shadow-md space-y-4">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <div>
                <h4 className="text-sm font-extrabold uppercase tracking-wider text-slate-100 flex items-center gap-2">
                  <span>🧪</span> Cockpit de Simulation Commerciale
                </h4>
                <p className="text-[10px] text-slate-400 mt-1 font-normal uppercase">Ajustement en temps réel des variables tarifaires et de recrutement</p>
              </div>
              <button
                onClick={() => { setSimTarifPercent(0); setSimRemplissageTarget(0); setSimInscritsByGroupe({}); }}
                className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold px-3 py-1 rounded-lg transition-all cursor-pointer"
              >
                🔄 Réinitialiser
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
              {/* Ajustement tarifaire */}
              <div className="space-y-2">
                <div className="flex justify-between font-bold text-slate-200">
                  <span>Ajustement Tarifaire Annuel (€)</span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-black font-mono ${simTarifPercent > 0 ? 'bg-emerald-500 text-white' : simTarifPercent < 0 ? 'bg-rose-500 text-white' : 'bg-slate-800 text-slate-400'}`}>
                    {simTarifPercent > 0 ? '+' : ''}{simTarifPercent}%
                  </span>
                </div>
                <input
                  type="range"
                  min={-20}
                  max={50}
                  step={5}
                  value={simTarifPercent}
                  onChange={(e) => setSimTarifPercent(Number(e.target.value))}
                  className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                />
                <div className="flex justify-between text-[9px] text-slate-500 font-semibold uppercase">
                  <span>-20% (Baisse)</span>
                  <span>0% (Réel)</span>
                  <span>+50% (Hausse)</span>
                </div>
              </div>
              
              {/* Remplissage cible */}
              <div className="space-y-2">
                <div className="flex justify-between font-bold text-slate-200">
                  <span>Objectif Taux Remplissage Cible</span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-black font-mono ${simRemplissageTarget > 0 ? 'bg-indigo-500 text-white' : 'bg-slate-800 text-slate-400'}`}>
                    {simRemplissageTarget > 0 ? `${simRemplissageTarget}%` : 'Désactivé'}
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={5}
                  value={simRemplissageTarget}
                  onChange={(e) => setSimRemplissageTarget(Number(e.target.value))}
                  className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                />
                <div className="flex justify-between text-[9px] text-slate-500 font-semibold uppercase">
                  <span>Désactivé</span>
                  <span>75%</span>
                  <span>90%</span>
                  <span>100% (Plein)</span>
                </div>
              </div>
            </div>
            {(simTarifPercent !== 0 || simRemplissageTarget !== 0 || Object.keys(simInscritsByGroupe).length > 0) && (
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl text-[10px] font-bold uppercase tracking-wider text-center flex items-center justify-between">
                <span>⚠️ Mode simulation actif : Les données ci-dessous intègrent vos ajustements d&apos;inscrits ou de tarifs en temps réel.</span>
                <button
                  onClick={() => { setSimTarifPercent(0); setSimRemplissageTarget(0); setSimInscritsByGroupe({}); }}
                  className="underline hover:text-white cursor-pointer ml-2 text-[10px]"
                >
                  Réinitialiser tout
                </button>
              </div>
            )}
          </div>

          {/* Bandeau simulation */}
          {tauxOverride !== '' && (
            <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-amber-100 bg-amber-50/60 text-xs font-semibold text-amber-800 shadow-xs">
              🧪 Simulation active — taux horaire simulé à {tauxOverride}€/h
              (réel : {resultat.tauxHoraire !== Number(tauxOverride) ? '?' : resultat.tauxHoraire}€/h)
            </div>
          )}

          {/* Alertes globales */}
          {(resultat.alertesGlobales?.length ?? 0) > 0 && (
            <div className="space-y-2">
              {resultat.alertesGlobales.map((a, i) => {
                const cfg = ALERTE_CFG[a.type]
                return (
                  <div key={i} className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-xs font-semibold shadow-xs ${cfg.bg} ${cfg.border} ${cfg.text}`}>
                    {cfg.dot} {a.message}
                  </div>
                )
              })}
            </div>
          )}

          {/* Comparaison modes */}
          {resultat.comparaison && (
            <div className="card p-5 border border-slate-200/60 shadow-sm rounded-2xl">
              <h4 className="font-extrabold text-sm text-slate-800 mb-3 uppercase tracking-wider flex items-center gap-1.5">⚖️ Comparaison Simple vs Optimisé</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                {[
                  { label: 'Mode Simple',    val: fmt(resultat.comparaison.coutSimple),                          bgClass: 'bg-slate-50 border border-slate-200/60', textClass: 'text-slate-800' },
                  { label: 'Mode Optimisé',  val: fmt(resultat.comparaison.coutOptimise),                        bgClass: 'bg-indigo-50/60 border border-indigo-100', textClass: 'text-indigo-700' },
                  { label: 'Économie',       val: `-${fmt(resultat.comparaison.economie)}€`,                     bgClass: 'bg-emerald-50/50 border border-emerald-100', textClass: 'text-emerald-700' },
                  { label: 'Gain %',         val: `-${fmtD(resultat.comparaison.economiePercent)}%`,             bgClass: 'bg-emerald-50/50 border border-emerald-100', textClass: 'text-emerald-700' },
                ].map(({ label, val, bgClass, textClass }) => (
                  <div key={label} className={`rounded-xl p-3 text-center ${bgClass}`}>
                    <div className="text-[10px] font-bold text-slate-500 mb-1 uppercase tracking-wider">{label}</div>
                    <div className={`font-black text-lg ${textClass}`}>{val}</div>
                  </div>
                ))}
              </div>
              <div className="text-[10px] font-semibold text-slate-400 mt-2 uppercase tracking-wide">
                {fmtD(resultat.comparaison.heuresDedupliquees)}h dédupliquées en mode optimisé
              </div>
            </div>
          )}

          {/* ── Résumé financier ──────────────────────────────────────────── */}
          <div className="card p-6">
            <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
              <h3 className="text-lg font-extrabold text-slate-900 tracking-tight flex items-center gap-2">Résumé Financier</h3>
              <div className="flex gap-2 flex-wrap items-center">
                {/* NOUVEAU: bouton export CSV */}
                <button
                  onClick={() => exportCSV(resultat)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors shadow-xs cursor-pointer"
                >
                  ⬇️ Exporter CSV
                </button>
                <span className={`px-3 py-1.5 rounded-full text-xs font-bold border ${
                  resultat.mode === 'optimise' ? 'bg-emerald-50 border-emerald-100 text-emerald-800' : 'bg-indigo-50 border-indigo-100 text-indigo-800'
                }`}>
                  {resultat.mode === 'optimise' ? '🎯 Mode Optimisé' : '📊 Mode Simple'}
                </span>
                {resultat.margeSecurite > 0 && (
                  <span className="px-3 py-1.5 rounded-full text-xs font-bold bg-amber-50 border border-amber-100 text-amber-800">
                    🛡️ +{resultat.margeSecurite}% marge
                  </span>
                )}
              </div>
            </div>

            {/* Cartes Métriques Épurées */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5 mb-6">
              <div className="bg-slate-50/70 border border-slate-200/70 p-4 rounded-2xl shadow-2xs hover:shadow-xs transition-all">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Volume Horaire
                </div>
                <div className="text-2xl font-black text-slate-900 tracking-tight">
                  {fmt(resultat.totaux.totalHeures)}h
                </div>
                <div className="text-[11px] text-slate-500 mt-1.5 font-medium">
                  {resultat.nbSemainesTotales ? `${resultat.nbSemainesTotales} semaines hors vacances` : 'Volume saison'}
                </div>
              </div>

              <div className="bg-rose-50/40 border border-rose-100 p-4 rounded-2xl shadow-2xs hover:shadow-xs transition-all">
                <div className="flex items-center justify-between text-[10px] font-bold text-rose-800 uppercase tracking-wider mb-1">
                  <span>Coût Total</span>
                  <button onClick={() => setShowCostBreakdown(!showCostBreakdown)}
                    className="text-rose-700 hover:text-rose-950 font-bold underline cursor-pointer">
                    {showCostBreakdown ? 'Masquer' : 'Détails'}
                  </button>
                </div>
                <div className="text-2xl font-black text-rose-950 tracking-tight">
                  {fmt(resultat.totaux.coutTotal)} €
                </div>
                
                <div className="w-full h-1.5 rounded-full overflow-hidden flex mt-2.5 bg-slate-200" title="Répartition des dépenses">
                  {resultat.totaux.coutCoaching > 0 && (
                    <div 
                      className="h-full bg-rose-500" 
                      style={{ width: `${(resultat.totaux.coutCoaching / resultat.totaux.coutTotal) * 100}%` }}
                      title={`Coaching : ${fmt(resultat.totaux.coutCoaching)}€`}
                    />
                  )}
                  {resultat.totaux.coutCompetitions > 0 && (
                    <div 
                      className="h-full bg-blue-500" 
                      style={{ width: `${(resultat.totaux.coutCompetitions / resultat.totaux.coutTotal) * 100}%` }}
                      title={`Compétitions : ${fmt(resultat.totaux.coutCompetitions)}€`}
                    />
                  )}
                  {resultat.totaux.coutLicences > 0 && (
                    <div 
                      className="h-full bg-violet-500" 
                      style={{ width: `${(resultat.totaux.coutLicences / resultat.totaux.coutTotal) * 100}%` }}
                      title={`Licences : ${fmt(resultat.totaux.coutLicences)}€`}
                    />
                  )}
                </div>

                {showCostBreakdown && (
                  <div className="mt-2 pt-2 border-t border-rose-200/60 space-y-1 text-[11px] text-rose-900/90 font-medium">
                    <div className="flex justify-between"><span>👨‍🏫 Coaching</span><strong>{fmt(resultat.totaux.coutCoaching)}€</strong></div>
                    {resultat.totaux.coutCompetitions > 0 && <div className="flex justify-between"><span>🏆 Compétitions</span><strong>{fmt(resultat.totaux.coutCompetitions)}€</strong></div>}
                    {resultat.totaux.coutLicences > 0 && <div className="flex justify-between"><span>🎫 Licences</span><strong>{fmt(resultat.totaux.coutLicences)}€</strong></div>}
                    {(resultat.totaux.coutFormationsPSE1 ?? 0) > 0 && <div className="flex justify-between text-indigo-900"><span>⛑️ Formations PSE1</span><strong>{fmt(resultat.totaux.coutFormationsPSE1 ?? 0)}€</strong></div>}
                    {(resultat.totaux.coutMargeSecurite ?? 0) > 0 && <div className="flex justify-between text-amber-800"><span>🛡️ Marge sécu.</span><strong>{fmt(resultat.totaux.coutMargeSecurite)}€</strong></div>}
                  </div>
                )}
              </div>

              <div className="bg-violet-50/40 border border-violet-100 p-4 rounded-2xl shadow-2xs hover:shadow-xs transition-all">
                <div className="text-[10px] font-bold text-violet-800 uppercase tracking-wider mb-1">
                  Revenu Actuel
                </div>
                <div className="text-2xl font-black text-violet-950 tracking-tight">
                  {fmt(resultat.totaux.revenuActuel)} €
                </div>
                <div className="text-[11px] text-violet-700/80 mt-1.5 font-medium">
                  {resultat.totaux.totalInscrits} adhérents inscrits
                </div>
              </div>

              <div className="bg-amber-50/40 border border-amber-100 p-4 rounded-2xl shadow-2xs hover:shadow-xs transition-all">
                <div className="text-[10px] font-bold text-amber-800 uppercase tracking-wider mb-1">
                  Revenu Potentiel
                </div>
                <div className="text-2xl font-black text-amber-950 tracking-tight">
                  {fmt(resultat.totaux.revenuPotentiel)} €
                </div>
                <div className="text-[11px] text-amber-700/80 mt-1.5 font-medium">
                  Capacité à 100% ({resultat.totaux.totalPlaces} places)
                </div>
              </div>

              <div className={`p-4 rounded-2xl shadow-2xs hover:shadow-xs transition-all border ${
                resultat.totaux.beneficeActuel >= 0 
                  ? 'bg-emerald-50/40 border-emerald-100' 
                  : 'bg-rose-50/40 border-rose-100'
              }`}>
                <div className={`text-[10px] font-bold uppercase tracking-wider mb-1 ${resultat.totaux.beneficeActuel >= 0 ? 'text-emerald-800' : 'text-rose-800'}`}>
                  Bénéfice Net
                </div>
                <div className={`text-2xl font-black tracking-tight ${resultat.totaux.beneficeActuel >= 0 ? 'text-emerald-950' : 'text-rose-950'}`}>
                  {sign(resultat.totaux.beneficeActuel)}{fmt(resultat.totaux.beneficeActuel)} €
                </div>
                <div className={`text-[11px] font-semibold mt-1.5 ${resultat.totaux.beneficeActuel >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                  Marge : {fmtD(resultat.totaux.margeActuelle ?? 0)}%
                </div>
              </div>
            </div>

            {/* Barre remplissage */}
            <div className="mb-4">
              <div className="flex justify-between text-xs font-semibold mb-1">
                <span className="text-slate-600">Taux de remplissage global</span>
                <span className="text-slate-900">{fmtD(resultat.totaux.tauxRemplissageMoyen)}%</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all ${
                    resultat.totaux.tauxRemplissageMoyen >= 80 ? 'bg-emerald-500' :
                    resultat.totaux.tauxRemplissageMoyen >= 50 ? 'bg-amber-500' : 'bg-rose-500'
                  }`}
                  style={{ width: `${Math.min(100, resultat.totaux.tauxRemplissageMoyen)}%` }}
                />
              </div>
              <div className="flex justify-between text-[10px] text-slate-400 font-semibold mt-1.5 uppercase tracking-wide">
                <span>{resultat.totaux.totalInscrits} inscrits</span>
                <span>{resultat.totaux.totalPlaces} places</span>
              </div>
            </div>

            {/* Optimisation */}
            {resultat.mode === 'optimise' && (resultat.heuresDedupliquees ?? 0) > 0 && (
              <div className="p-4 bg-emerald-50/50 border-l-4 border-emerald-500 rounded-2xl shadow-xs">
                <h4 className="font-bold text-emerald-900 text-sm mb-2 flex items-center gap-1.5">💰 Économie réalisée avec l&apos;optimisation</h4>
                <div className="grid grid-cols-2 gap-4 text-xs font-semibold">
                  <div>
                    <span className="text-slate-600">Heures dédupliquées :</span>
                    <span className="ml-2 font-black text-emerald-700">{(resultat.heuresDedupliquees ?? 0).toFixed(2)}h</span>
                  </div>
                  <div>
                    <span className="text-slate-600">Économie estimée :</span>
                    <span className="ml-2 font-black text-emerald-700">
                      {fmt((resultat.heuresDedupliquees ?? 0) * resultat.tauxHoraire)}€
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Paramètres */}
            <div className="mt-5 pt-4 border-t border-slate-100 flex flex-wrap gap-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">
              <span>📌 {resultat.tauxHoraire}€/h</span>
              <span>🏆 {resultat.forfaitCompetition}€ × {resultat.nbDemiJourneesParCompetition} demi-j.</span>
              {(resultat.coutFormationsPSE1 ?? 0) > 0 && <span className="text-indigo-600">⛑️ PSE1 {resultat.coutFormationsPSE1}€/coach</span>}
              {resultat.margeSecurite > 0 && <span className="text-amber-600">🛡️ Marge {resultat.margeSecurite}%</span>}
            </div>

            {/* Vacances */}
            {resultat.periodesVacances.length > 0 && (
              <div className="mt-4">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Périodes exclues (Vacances) :</p>
                <div className="flex flex-wrap gap-2">
                  {resultat.periodesVacances.map((p, i) => (
                    <span key={i} className="inline-flex items-center bg-slate-150/50 border border-slate-200/40 text-slate-700 px-3 py-1 rounded-full text-xs font-semibold shadow-xs">
                      🏖️ {p.nom}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ── Navigation vues ──────────────────────────────────────────────── */}
          <div className="bg-slate-100 p-1 rounded-2xl flex flex-col sm:flex-row gap-1 border border-slate-200/50 max-w-2xl">
            {([
              { key: 'couts',       label: '💰 Vue Coûts' },
              { key: 'rentabilite', label: '📈 Vue Rentabilité' },
              {
                key: 'alertes',
                label: nbAlertesTotal > 0
                  ? `🔔 Alertes (${nbAlertesTotal}${nbAlertesDanger > 0 ? ' 🔴' : ''})`
                  : '🔔 Alertes',
              },
              { key: 'coachs', label: '👨‍🏫 Par Coach' },
            ] as { key: ViewMode; label: string }[]).map((tab) => (
              <button
                key={tab.key}
                onClick={() => setViewMode(tab.key)}
                className={`flex-1 py-2 px-3 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  viewMode === tab.key
                    ? 'bg-white text-slate-900 shadow-sm border border-slate-200/40'
                    : 'text-slate-500 hover:text-slate-800 hover:bg-slate-200/30'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* ── Tableaux ─────────────────────────────────────────────────────── */}
          <div className="card p-6">

            {/* ══ VUE COÛTS ══════════════════════════════════════════════════ */}
            {viewMode === 'couts' && (
              <>
                <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
                  <h3 className="text-xl font-bold">Détail des Coûts par Groupe</h3>
                  <SortButtons options={[
                    { key: 'nom', label: 'Nom' },
                    { key: 'cout', label: 'Coût ↓' },
                    { key: 'remplissage', label: 'Remplissage ↓' },
                  ]} />
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-300">
                        <th className="px-3 py-3 text-left   text-xs font-bold text-slate-700 uppercase tracking-wider">Groupe</th>
                        <th className="px-3 py-3 text-center text-xs font-bold text-slate-700 uppercase tracking-wider">Type</th>
                        <th className="px-3 py-3 text-center text-xs font-bold text-slate-700 uppercase tracking-wider">H/sem</th>
                        <th className="px-3 py-3 text-center text-xs font-bold text-slate-700 uppercase tracking-wider">
                          <span className="flex items-center justify-center gap-1">
                            Inscrits
                            <HelpTooltip title="Saisie d'inscrits interactive">
                              <p>Modifiez le nombre d&apos;inscrits dans la case pour simuler en temps réel l&apos;impact financier et le taux de remplissage.</p>
                            </HelpTooltip>
                          </span>
                        </th>
                        <th className="px-3 py-3 text-right  text-xs font-bold text-slate-700 uppercase tracking-wider">Coût Total</th>
                        <th className="px-3 py-3 text-center text-xs font-bold text-slate-700 uppercase tracking-wider">Planning</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {groupesTries.map((groupe) => {
                        const nbAlertes = groupe.alertes?.length ?? 0
                        const hasDateGroupe = groupe.sourceDate === 'groupe' && groupe.dateDebutUtilisee
                        return (
                          <Fragment key={groupe.groupeId}>
                            <tr className="hover:bg-slate-50/50 transition-colors">
                              <td className="px-3 py-3 text-sm font-medium text-slate-950">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  {groupe.groupeNom}
                                  {nbAlertes > 0 && (
                                    <span
                                      title={groupe.alertes.filter(a => a.code !== 'DATE_GROUPE').map((a) => a.message).join(' | ')}
                                      className={`text-xs px-1.5 py-0.5 rounded-full cursor-help ${
                                        groupe.alertes.some((a) => a.type === 'danger') ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'
                                      }`}
                                    >
                                      {groupe.alertes.some((a) => a.type === 'danger') ? '🔴' : '🟡'} {nbAlertes}
                                    </span>
                                  )}
                                </div>
                                {/* NOUVEAU: affichage période propre au groupe */}
                                {hasDateGroupe && (
                                  <div className="text-[10px] text-blue-500 mt-0.5 flex items-center gap-1">
                                    📅 {groupe.dateDebutUtilisee} → {groupe.dateFinUtilisee}
                                    <span className="bg-blue-50/50 text-blue-600 px-1 rounded">dates du groupe</span>
                                  </div>
                                )}
                              </td>
                              <td className="px-3 py-3 text-center">
                                {groupe.isCompetition ? (
                                  <div>
                                    <span className="px-2 py-1 text-xs rounded-full bg-blue-50 border border-blue-100 text-blue-800 font-bold">🏆 Compét.</span>
                                    <div className="text-[10px] text-slate-400 mt-1 font-medium">{groupe.nbCompetitions} compét.</div>
                                  </div>
                                ) : (
                                  <span className="px-2 py-1 text-xs rounded-full bg-slate-100 border border-slate-200/50 text-slate-600 font-bold">Loisir</span>
                                )}
                              </td>
                              <td className="px-3 py-3 text-sm text-center text-slate-700">
                                {groupe.heuresParSemaine.toFixed(1)}h
                                <div className="text-[10px] text-slate-400">{groupe.totalHeures.toFixed(0)}h/an</div>
                              </td>
                              <td className="px-3 py-3 text-sm text-center text-slate-700">
                                <div className="flex items-center justify-center gap-1">
                                  <input
                                    type="number"
                                    min={0}
                                    value={groupe.inscrits}
                                    onChange={(e) => {
                                      const val = parseInt(e.target.value, 10)
                                      setSimInscritsByGroupe((prev) => ({
                                        ...prev,
                                        [groupe.groupeId]: isNaN(val) ? 0 : Math.max(0, val),
                                      }))
                                    }}
                                    className={`w-14 px-1.5 py-0.5 text-center text-xs font-bold rounded border transition-all cursor-pointer ${
                                      simInscritsByGroupe[groupe.groupeId] !== undefined
                                        ? 'bg-indigo-50 border-indigo-400 text-indigo-900 ring-2 ring-indigo-200/50'
                                        : 'bg-slate-50 border-slate-200 text-slate-800 hover:border-slate-300'
                                    }`}
                                    title="Modifier le nombre d'inscrits pour ce groupe (calcul instantané)"
                                  />
                                  <span className="text-slate-400 text-xs font-medium">/ {groupe.placesTotal}</span>
                                </div>
                                {groupe.inscrits1Cours > 0 && (
                                  <div className="text-[10px] text-slate-500 font-normal mt-0.5">
                                    dont {groupe.inscrits1Cours} à {groupe.libelleOption1 || '1 cours'}
                                    <span className="block text-blue-600 font-semibold">({groupe.inscritsEquivalents.toFixed(1)} éq.)</span>
                                  </div>
                                )}
                                <div className="text-[10px] text-slate-400 font-medium mt-1">{groupe.tauxRemplissage.toFixed(0)}% rempli</div>
                              </td>
                              <td className="px-3 py-3">
                                <div className="flex items-center justify-end gap-2">
                                  <div className="text-right">
                                    <div className="text-sm font-bold text-slate-900">{fmt(groupe.coutTotal)}€</div>
                                    {groupe.inscrits > 0 && <div className="text-[10px] text-slate-500">{fmt(groupe.coutParInscrit)}€/inscrit</div>}
                                    {(groupe.coutParHeure ?? 0) > 0 && <div className="text-[10px] text-slate-400">{fmt(groupe.coutParHeure)}€/h</div>}
                                  </div>
                                  <button onClick={() => toggleGroupCostBreakdown(groupe.groupeId)}
                                    className="text-slate-500 hover:text-slate-800 hover:bg-slate-100/80 text-xs p-1 rounded transition-colors cursor-pointer">
                                    {showGroupCostBreakdown[groupe.groupeId] ? '▲' : '▼'}
                                  </button>
                                </div>
                                {showGroupCostBreakdown[groupe.groupeId] && (
                                  <div className="mt-2 pt-2 border-t border-slate-250/50 space-y-1 text-xs text-right text-slate-600">
                                    <div className="flex justify-between"><span className="text-slate-500">👨‍🏫 Coaching</span><span className="font-semibold">{fmt(groupe.coutCoaching)}€</span></div>
                                    {groupe.coutCompetitions > 0 && <div className="flex justify-between"><span className="text-slate-500">🏆 Compétitions</span><span className="font-semibold">{fmt(groupe.coutCompetitions)}€</span></div>}
                                    {groupe.coutLicences > 0 && <div className="flex justify-between"><span className="text-slate-500">🎫 Licences ({groupe.prixLicence}€ × {groupe.inscrits})</span><span className="font-semibold">{fmt(groupe.coutLicences)}€</span></div>}
                                    {(groupe.coutMargeSecurite ?? 0) > 0 && <div className="flex justify-between text-amber-700"><span>🛡️ Marge sécu.</span><span className="font-semibold">{fmt(groupe.coutMargeSecurite)}€</span></div>}
                                  </div>
                                )}
                              </td>
                              <td className="px-3 py-3 text-center">
                                {groupe.plannings.length > 0 && (
                                  <button onClick={() => toggleDetails(groupe.groupeId)} className="text-slate-500 hover:text-slate-800 text-xs cursor-pointer">
                                    {showDetails[groupe.groupeId] ? '▼' : '▶'}
                                  </button>
                                )}
                              </td>
                            </tr>
                            {showDetails[groupe.groupeId] && groupe.plannings.length > 0 && (
                              <tr>
                                <td colSpan={6} className="px-3 py-2 bg-slate-50/50">
                                  <div className="ml-4 text-xs flex flex-wrap gap-3 text-slate-600 font-medium">
                                    {groupe.plannings.map((p, i) => (
                                      <span key={i} className="inline-flex items-center gap-1">
                                        <strong>{p.jour}</strong> {p.heureDebut}–{p.heureFin}
                                        {p.coach && <span className="text-slate-400">({p.coach})</span>}
                                        {p.nbCoachsFactures !== 1 && <span className="text-slate-455">×{p.nbCoachsFactures.toFixed(1)}</span>}
                                      </span>
                                    ))}
                                  </div>
                                </td>
                              </tr>
                            )}
                          </Fragment>
                        )
                      })}
                      <tr className="bg-slate-100/80 font-bold border-t border-slate-350">
                        <td colSpan={4} className="px-3 py-3 text-sm text-slate-800">TOTAL</td>
                        <td className="px-3 py-3 text-sm text-right text-slate-900 bg-slate-100/50">
                          {fmt(resultat.totaux.coutTotal)}€
                          <div className="text-[10px] font-normal text-slate-500 mt-1">
                            👨‍🏫 {fmt(resultat.totaux.coutCoaching)}€ |
                            🏆 {fmt(resultat.totaux.coutCompetitions)}€ |
                            🎫 {fmt(resultat.totaux.coutLicences)}€
                            {(resultat.totaux.coutMargeSecurite ?? 0) > 0 && <> | 🛡️ {fmt(resultat.totaux.coutMargeSecurite)}€</>}
                          </div>
                        </td>
                        <td />
                      </tr>
                    </tbody>
                  </table>
                </div>
              </>
            )}

            {/* ══ VUE RENTABILITÉ ════════════════════════════════════════════ */}
            {viewMode === 'rentabilite' && (
              <>
                <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
                  <h3 className="text-xl font-bold">Analyse de Rentabilité par Groupe</h3>
                  <SortButtons options={[
                    { key: 'nom',      label: 'Nom' },
                    { key: 'benefice', label: 'Bénéfice ↓' },
                    { key: 'remplissage', label: 'Remplissage ↓' },
                  ]} />
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-300">
                        <th className="px-3 py-3 text-left   text-xs font-bold text-slate-700 uppercase tracking-wider">Groupe</th>
                        <th className="px-3 py-3 text-center text-xs font-bold text-slate-700 uppercase tracking-wider">
                          <span className="flex items-center justify-center gap-1">
                            Inscrits
                            <HelpTooltip title="Saisie d'inscrits interactive">
                              <p>Modifiez le nombre d&apos;inscrits dans la case pour simuler en temps réel le chiffre d&apos;affaires, le bénéfice et le seuil de rentabilité.</p>
                            </HelpTooltip>
                          </span>
                        </th>
                        <th className="px-3 py-3 text-center text-xs font-bold text-slate-700 uppercase tracking-wider">Capacité</th>
                        <th className="px-3 py-3 text-center text-xs font-bold text-slate-700 uppercase tracking-wider">Taux</th>
                        <th className="px-3 py-3 text-right  text-xs font-bold text-slate-700 uppercase tracking-wider">Tarif</th>
                        <th className="px-3 py-3 text-right  text-xs font-bold text-slate-700 uppercase tracking-wider">Coût</th>
                        <th className="px-3 py-3 text-right  text-xs font-bold text-slate-700 uppercase tracking-wider">Revenu</th>
                        <th className="px-3 py-3 text-right  text-xs font-bold text-slate-700 uppercase tracking-wider">Bénéfice</th>
                        <th className="px-3 py-3 text-center text-xs font-bold text-slate-700 uppercase tracking-wider">
                          <span className="flex items-center justify-center gap-1">
                            Seuil
                            <CalculationTooltip title="Seuil de rentabilité" formula="Coût Total ÷ Tarif effectif moyen" explanation="Nombre minimum d'inscrits pour couvrir les coûts. Le tarif effectif tient compte des membres/enfants bureau." example="3 000€ ÷ 230€ = 14 inscrits" position="left" />
                          </span>
                        </th>
                        <th className="px-3 py-3 text-center text-xs font-bold text-slate-700 uppercase tracking-wider">Projection</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {groupesTries.map((groupe) => (
                        <Fragment key={groupe.groupeId}>
                          <tr className="hover:bg-slate-50/50 transition-colors">
                            <td className="px-3 py-3 text-sm font-medium text-slate-950">
                              {groupe.groupeNom}
                              {groupe.isCompetition && <span className="ml-1 text-xs">🏆</span>}
                              {groupe.sourceDate === 'groupe' && groupe.dateDebutUtilisee && (
                                <div className="text-[10px] text-blue-500 mt-0.5">
                                  📅 {groupe.dateDebutUtilisee} → {groupe.dateFinUtilisee}
                                </div>
                              )}
                            </td>
                            <td className="px-3 py-3 text-sm text-center font-semibold text-slate-800">
                              <div className="flex items-center justify-center gap-1">
                                <input
                                  type="number"
                                  min={0}
                                  value={groupe.inscrits}
                                  onChange={(e) => {
                                    const val = parseInt(e.target.value, 10)
                                    setSimInscritsByGroupe((prev) => ({
                                      ...prev,
                                      [groupe.groupeId]: isNaN(val) ? 0 : Math.max(0, val),
                                    }))
                                  }}
                                  className={`w-14 px-1.5 py-0.5 text-center text-xs font-bold rounded border transition-all cursor-pointer ${
                                    simInscritsByGroupe[groupe.groupeId] !== undefined
                                      ? 'bg-indigo-50 border-indigo-400 text-indigo-900 ring-2 ring-indigo-200/50'
                                      : 'bg-slate-50 border-slate-200 text-slate-800 hover:border-slate-300'
                                  }`}
                                  title="Modifier le nombre d'inscrits pour ce groupe (calcul instantané)"
                                />
                              </div>
                              {groupe.inscrits1Cours > 0 && (
                                <div className="text-[10px] text-slate-500 font-normal mt-0.5">
                                  dont {groupe.inscrits1Cours} à {groupe.libelleOption1 || '1 cours'}
                                  <span className="block text-blue-600 font-semibold">({groupe.inscritsEquivalents.toFixed(1)} éq.)</span>
                                </div>
                              )}
                            </td>
                            <td className="px-3 py-3 text-sm text-center text-slate-500">{groupe.placesTotal}</td>
                            <td className="px-3 py-3 text-center">
                              <div className="flex items-center gap-1">
                                <div className="w-16 bg-slate-100 rounded-full h-1.5">
                                  <div className={`h-1.5 rounded-full ${groupe.tauxRemplissage >= 80 ? 'bg-emerald-500' : groupe.tauxRemplissage >= 50 ? 'bg-amber-500' : 'bg-rose-500'}`}
                                    style={{ width: `${Math.min(100, groupe.tauxRemplissage)}%` }} />
                                </div>
                                <span className="text-xs text-slate-500">{groupe.tauxRemplissage.toFixed(0)}%</span>
                              </div>
                            </td>
                            <td className="px-3 py-3 text-sm text-right text-slate-600">
                              {groupe.tarif1Cours > 0 ? (
                                <div className="space-y-0.5 text-xs text-slate-500 font-normal leading-tight">
                                  <div>{groupe.libelleOption1 || '1 cours'}: <span className="text-slate-800 font-semibold">{groupe.tarif1Cours}€</span></div>
                                  <div>{groupe.libelleOption2 || '2 cours'}: <span className="text-slate-800 font-semibold">{groupe.tarifAnnuel}€</span></div>
                                </div>
                              ) : (
                                <span>{groupe.tarifAnnuel}€</span>
                              )}
                            </td>
                            <td className="px-3 py-3 text-sm text-right text-rose-600">{fmt(groupe.coutTotal)}€</td>
                            <td className="px-3 py-3 text-sm text-right text-slate-700">
                              {fmt(groupe.revenuActuel)}€
                              <div className="text-xs text-slate-400 font-medium">(max: {fmt(groupe.revenuPotentiel)}€)</div>
                            </td>
                            <td className={`px-3 py-3 text-sm text-right font-bold ${getBeneficeBg(groupe.beneficeActuel)}`}>
                              <span className={getBeneficeColor(groupe.beneficeActuel)}>
                                {sign(groupe.beneficeActuel)}{fmt(groupe.beneficeActuel)}€
                              </span>
                              <div className={`text-xs font-semibold ${getBeneficeColor(groupe.margeActuelle ?? 0)}`}>
                                {fmtD(groupe.margeActuelle ?? 0)}%
                              </div>
                              <div className="text-[10px] text-slate-400 font-medium">
                                (max: {sign(groupe.beneficePotentiel)}{fmt(groupe.beneficePotentiel)}€)
                              </div>
                            </td>
                            <td className="px-3 py-3 text-center">
                              <div className="flex flex-col items-center gap-1.5">
                                <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${groupe.inscrits >= groupe.seuilRentabilite ? 'bg-emerald-50 border border-emerald-100 text-emerald-800' : 'bg-rose-50 border border-rose-100 text-rose-800'}`}>
                                  {groupe.seuilRentabilite} min
                                </span>
                                
                                {/* Jauge visuelle */}
                                <div className="relative w-28 bg-slate-100 border border-slate-200/60 rounded-full h-2 overflow-hidden">
                                  {/* Seuil de rentabilité en pointillés verticaux */}
                                  {groupe.placesTotal > 0 && (
                                    <div
                                      className="absolute top-0 bottom-0 border-l border-dashed border-slate-400 z-10"
                                      style={{ left: `${Math.min(100, (groupe.seuilRentabilite / (groupe.placesTotal || 1)) * 100)}%` }}
                                      title={`Seuil d'équilibre à ${groupe.seuilRentabilite} inscrits`}
                                    />
                                  )}
                                  {/* Remplissage réel */}
                                  <div
                                    className={`h-full rounded-full transition-all ${
                                      groupe.inscrits >= groupe.seuilRentabilite 
                                        ? 'bg-emerald-500' 
                                        : 'bg-rose-500'
                                    }`}
                                    style={{ width: `${Math.min(100, (groupe.inscrits / (groupe.placesTotal || 1)) * 100)}%` }}
                                  />
                                </div>
                                <span className="text-[10px] text-slate-400 font-semibold uppercase leading-none mt-0.5">
                                  {groupe.inscrits >= groupe.seuilRentabilite 
                                    ? 'Rentable' 
                                    : `-&/${groupe.seuilRentabilite - groupe.inscrits} requis`}
                                </span>
                              </div>
                            </td>
                            <td className="px-3 py-3 text-center">
                              {groupe.projection && (
                                <button onClick={() => toggleProjection(groupe.groupeId)}
                                  className="text-slate-500 hover:text-slate-800 text-xs cursor-pointer">
                                  {showProjection[groupe.groupeId] ? '▲' : '📊'}
                                </button>
                              )}
                            </td>
                          </tr>
                          {showProjection[groupe.groupeId] && groupe.projection && (
                            <tr>
                              <td colSpan={10} className="px-6 py-3 bg-slate-50/50">
                                <p className="text-xs font-semibold text-slate-700 mb-2">📊 Projection du bénéfice</p>
                                <div className="grid grid-cols-3 gap-3">
                                  {([
                                    { label: '75%', val: groupe.projection.projection75 },
                                    { label: '90%', val: groupe.projection.projection90 },
                                    { label: '100%', val: groupe.projection.projection100 },
                                  ]).map(({ label, val }) => (
                                    <div key={label} className={`rounded-xl p-2 text-center border ${getBeneficeBg(val)} ${val >= 0 ? 'border-emerald-100' : 'border-rose-100'}`}>
                                      <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">{label} rempli</div>
                                      <div className={`font-black text-sm ${getBeneficeColor(val)}`}>{sign(val)}{fmt(val)}€</div>
                                    </div>
                                  ))}
                                </div>
                              </td>
                            </tr>
                          )}
                        </Fragment>
                      ))}
                      <tr className="bg-slate-100/80 font-bold border-t border-slate-350">
                        <td className="px-3 py-3 text-sm text-slate-800">TOTAL</td>
                        <td className="px-3 py-3 text-sm text-center text-slate-800">{resultat.totaux.totalInscrits}</td>
                        <td className="px-3 py-3 text-sm text-center text-slate-800">{resultat.totaux.totalPlaces}</td>
                        <td className="px-3 py-3 text-sm text-center text-slate-800">{resultat.totaux.tauxRemplissageMoyen.toFixed(0)}%</td>
                        <td className="px-3 py-3 text-sm text-right text-slate-400">—</td>
                        <td className="px-3 py-3 text-sm text-right text-rose-600">{fmt(resultat.totaux.coutTotal)}€</td>
                        <td className="px-3 py-3 text-sm text-right text-slate-800">{fmt(resultat.totaux.revenuActuel)}€</td>
                        <td className={`px-3 py-3 text-sm text-right bg-slate-100/50 ${resultat.totaux.beneficeActuel >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                          <span>
                            {sign(resultat.totaux.beneficeActuel)}{fmt(resultat.totaux.beneficeActuel)}€
                          </span>
                          <div className={`text-xs font-semibold ${resultat.totaux.beneficeActuel >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                            {fmtD(resultat.totaux.margeActuelle ?? 0)}%
                          </div>
                        </td>
                        <td colSpan={2} />
                      </tr>
                    </tbody>
                  </table>
                </div>
              </>
            )}

            {/* ══ VUE ALERTES ════════════════════════════════════════════════ */}
            {viewMode === 'alertes' && (
              <div>
                <h3 className="text-lg font-extrabold text-slate-900 mb-4 uppercase tracking-tight flex items-center gap-2">Alertes actives</h3>
                {nbAlertesTotal === 0 ? (
                  <div className="text-center py-12 text-slate-400 bg-slate-50/50 rounded-2xl border border-slate-100">
                    <div className="text-3xl mb-3">✅</div>
                    <p className="font-semibold text-slate-600 text-sm">Aucune alerte — tous les groupes sont en ordre</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {(resultat.alertesGlobales?.length ?? 0) > 0 && (
                      <div>
                        <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-2.5">Globales</p>
                        <div className="space-y-2">
                          {resultat.alertesGlobales.map((a, i) => {
                            const cfg = ALERTE_CFG[a.type]
                            return <div key={i} className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-xs font-semibold shadow-xs ${cfg.bg} ${cfg.border} ${cfg.text}`}>{cfg.dot} {a.message}</div>
                          })}
                        </div>
                      </div>
                    )}
                    {resultat.groupes.filter((g) => (g.alertes?.filter(a => a.code !== 'DATE_GROUPE').length ?? 0) > 0).length > 0 && (
                      <div>
                        <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-2.5">Par groupe</p>
                        <div className="space-y-3">
                          {resultat.groupes
                            .filter((g) => (g.alertes?.filter(a => a.code !== 'DATE_GROUPE').length ?? 0) > 0)
                            .sort((a, b) => {
                              const da = a.alertes.some((al) => al.type === 'danger') ? 0 : 1
                              const db = b.alertes.some((al) => al.type === 'danger') ? 0 : 1
                              return da - db || a.groupeNom.localeCompare(b.groupeNom)
                            })
                            .map((groupe) => (
                              <div key={groupe.groupeId} className="border border-slate-200/60 rounded-xl p-4 bg-white shadow-xs">
                                <p className="font-bold text-sm text-slate-800 mb-2.5">{groupe.groupeNom}</p>
                                <div className="space-y-1.5">
                                  {groupe.alertes.filter(a => a.code !== 'DATE_GROUPE').map((a, i) => {
                                    const cfg = ALERTE_CFG[a.type]
                                    return <div key={i} className={`text-xs px-3 py-1.5 rounded-lg border font-medium ${cfg.bg} ${cfg.border} ${cfg.text}`}>{cfg.dot} {a.message}</div>
                                  })}
                                </div>
                              </div>
                            ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* ══ VUE COACHS ═════════════════════════════════════════════════ */}
            {viewMode === 'coachs' && (
              <div>
                <h3 className="text-lg font-extrabold text-slate-900 mb-4 uppercase tracking-tight flex items-center gap-2">Coût par Coach</h3>
                {(!resultat.coachsCout || resultat.coachsCout.length === 0) ? (
                  <div className="text-center py-12 text-slate-400 bg-slate-50/50 rounded-2xl border border-slate-100">
                    <div className="text-3xl mb-3">👨‍🏫</div>
                    <p className="font-semibold text-slate-600 text-sm">Aucun coach trouvé dans les plannings actifs</p>
                  </div>
                ) : (
                  <>
                    <div className="overflow-x-auto">
                      <table className="min-w-full text-sm">
                        <thead>
                          <tr className="border-b border-slate-300">
                            <th className="px-3 py-3 text-left   text-xs font-bold text-slate-700 uppercase tracking-wider">Coach</th>
                            <th className="px-3 py-3 text-center text-xs font-bold text-slate-700 uppercase tracking-wider">H/semaine</th>
                            <th className="px-3 py-3 text-center text-xs font-bold text-slate-700 uppercase tracking-wider">Total heures</th>
                            <th className="px-3 py-3 text-right  text-xs font-bold text-slate-700 uppercase tracking-wider">Coût saison</th>
                            <th className="px-3 py-3 text-left   text-xs font-bold text-slate-700 uppercase tracking-wider">Groupes</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {[...resultat.coachsCout].sort((a, b) => b.coutTotal - a.coutTotal).map((coach) => {
                            const pct = resultat.totaux.coutCoaching > 0
                              ? (coach.coutTotal / resultat.totaux.coutCoaching) * 100 : 0
                            return (
                              <tr key={coach.coachId} className="hover:bg-slate-50/50 transition-colors">
                                <td className="px-3 py-3 text-sm font-medium text-slate-900">{coach.coachNom}</td>
                                <td className="px-3 py-3 text-sm text-center text-slate-700">{coach.heuresParSemaine.toFixed(1)}h</td>
                                <td className="px-3 py-3 text-sm text-center text-slate-700">{coach.totalHeures.toFixed(1)}h</td>
                                <td className="px-3 py-3 bg-slate-50/40">
                                  <div className="text-right">
                                    <div className="text-sm font-bold text-slate-900">{fmt(coach.coutTotal)}€</div>
                                    <div className="text-[10px] text-slate-400">{pct.toFixed(1)}% du budget coaching</div>
                                    <div className="w-full bg-slate-200 rounded-full h-1 mt-1">
                                      <div className="bg-primary h-1 rounded-full" style={{ width: `${pct}%` }} />
                                    </div>
                                  </div>
                                </td>
                                <td className="px-3 py-3 text-xs text-slate-600">
                                  <div className="flex flex-wrap gap-1">
                                    {coach.groupes.map((g, i) => (
                                      <span key={i} className="bg-slate-100 px-2 py-0.5 rounded-full">{g}</span>
                                    ))}
                                  </div>
                                </td>
                              </tr>
                            )
                          })}
                          <tr className="bg-slate-100/80 font-bold border-t border-slate-350">
                            <td className="px-3 py-3 text-sm text-slate-800">TOTAL</td>
                            <td className="px-3 py-3 text-sm text-center text-slate-800">
                              {fmtD(resultat.coachsCout.reduce((s, c) => s + c.heuresParSemaine, 0))}h
                            </td>
                            <td className="px-3 py-3 text-sm text-center text-slate-800">
                              {fmtD(resultat.coachsCout.reduce((s, c) => s + c.totalHeures, 0))}h
                            </td>
                            <td className="px-3 py-3 text-sm text-right text-slate-900 bg-slate-100/50">
                              {fmt(resultat.totaux.coutCoaching)}€
                            </td>
                            <td />
                          </tr>
                        </tbody>
                      </table>
                    </div>
                    <p className="text-xs text-slate-400 mt-3 font-medium">
                      * En mode optimisé, les heures d&apos;un coach partagé sont réparties proportionnellement.
                      Le total heures tient compte des semaines propres à chaque groupe.
                    </p>
                  </>
                )}
              </div>
            )}

            {resultat.groupes.length === 0 && (
              <div className="text-center text-gray-500 py-8">Aucun groupe actif trouvé</div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
