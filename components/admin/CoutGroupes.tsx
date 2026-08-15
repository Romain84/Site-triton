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

type ViewMode = 'general' | 'alertes' | 'coachs'
type SortKey = 'nom' | 'cout' | 'benefice' | 'remplissage'

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmt = (n: number) =>
  n.toLocaleString('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })

const fmtD = (n: number) =>
  n.toLocaleString('fr-FR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })

function formatHeuresDuree(h: number): string {
  const ent = Math.floor(h)
  const min = Math.round((h - ent) * 60)
  if (min === 0) return `${ent}h`
  return `${ent}h${min.toString().padStart(2, '0')}`
}

const getBeneficeColor = (v: number) =>
  v > 0 ? 'text-emerald-700' : v < 0 ? 'text-rose-700' : 'text-slate-600'

const getBeneficeBg = (v: number) =>
  v > 0 ? 'bg-emerald-50/70' : v < 0 ? 'bg-rose-50/70' : 'bg-slate-50/70'

const sign = (v: number) => (v >= 0 ? '+' : '')

const ALERTE_CFG: Record<AlerteGroupe['type'], { border: string; bg: string; text: string; dot: string }> = {
  danger: { border: 'border-rose-200', bg: 'bg-rose-50/70', text: 'text-rose-900', dot: '🔴' },
  warning: { border: 'border-amber-200', bg: 'bg-amber-50/70', text: 'text-amber-900', dot: '🟡' },
  info: { border: 'border-blue-200', bg: 'bg-blue-50/70', text: 'text-blue-900', dot: '🔵' },
}

const SESSION_KEY = 'coutGroupes.resultat'
const SESSION_PARAMS_KEY = 'coutGroupes.params'

// ─── Export CSV ───────────────────────────────────────────────────────────────

function exportCSV(resultat: ResultatCalcul) {
  const sep = ';'
  const headers = [
    'Groupe',
    'Niveau',
    'Type',
    'Inscrits',
    'Places',
    'Taux remplissage (%)',
    'Tarif annuel (€)',
    'H/semaine',
    'Total heures',
    'Semaines',
    'Coût coaching (€)',
    'Coût compétitions (€)',
    'Coût licences (€)',
    'Marge sécurité (€)',
    'Coût total (€)',
    'Coût/inscrit (€)',
    'Revenu actuel (€)',
    'Revenu potentiel (€)',
    'Bénéfice actuel (€)',
    'Bénéfice potentiel (€)',
    'Marge (%)',
    'Seuil rentabilité',
    'Période début',
    'Période fin',
    'Source date',
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
    'TOTAL',
    '',
    '',
    t.totalInscrits,
    t.totalPlaces,
    t.tauxRemplissageMoyen.toFixed(1),
    '',
    '',
    t.totalHeures.toFixed(1),
    '',
    t.coutCoaching.toFixed(0),
    t.coutCompetitions.toFixed(0),
    t.coutLicences.toFixed(0),
    t.coutMargeSecurite.toFixed(0),
    t.coutTotal.toFixed(0),
    '',
    t.revenuActuel.toFixed(0),
    t.revenuPotentiel.toFixed(0),
    t.beneficeActuel.toFixed(0),
    t.beneficePotentiel.toFixed(0),
    t.margeActuelle.toFixed(1),
    '',
    '',
    '',
    '',
  ])

  const csv = [headers, ...rows]
    .map((row) => row.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(sep))
    .join('\n')

  const bom = '\uFEFF' // BOM UTF-8 pour Excel
  const blob = new Blob([bom + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `analyse-financiere-${new Date().toISOString().split('T')[0]}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

// ─── Skeletons ────────────────────────────────────────────────────────────────

function SkeletonKpi() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6 animate-pulse">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="bg-slate-100/70 rounded-2xl p-5 h-28 border border-slate-200/50" />
      ))}
    </div>
  )
}

function SkeletonTable() {
  return (
    <div className="animate-pulse space-y-3 mt-4">
      <div className="h-10 bg-slate-100 rounded-xl" />
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="h-14 bg-slate-50 rounded-xl" />
      ))}
    </div>
  )
}

// ─── Composant principal ──────────────────────────────────────────────────────

export default function CoutGroupes() {
  // Formulaire
  const [dateDebut, setDateDebut] = useState('')
  const [dateFin, setDateFin] = useState('')
  const [mode, setMode] = useState<'simple' | 'optimise'>('optimise') // Optimisé / réel par défaut
  const [margeSecurite, setMargeSecurite] = useState(0)
  const [coutFormationsPSE1, setCoutFormationsPSE1] = useState<number>(150)
  const [nbFormationsBNSSA, setNbFormationsBNSSA] = useState<string>('')
  const [includeComparaison, setIncludeComparaison] = useState(false)
  const [tauxOverride, setTauxOverride] = useState<string>('')

  // État
  const [loading, setLoading] = useState(false)
  const [rawResultat, setRawResultat] = useState<ResultatCalcul | null>(null)
  const [error, setError] = useState('')

  // UI
  const [showDetails, setShowDetails] = useState<Record<string, boolean>>({})
  const [showCostBreakdown, setShowCostBreakdown] = useState(false)
  const [showGroupCostBreakdown, setShowGroupCostBreakdown] = useState<Record<string, boolean>>({})
  const [showProjection, setShowProjection] = useState<Record<string, boolean>>({})
  const [viewMode, setViewMode] = useState<ViewMode>('general')
  const [sortBy, setSortBy] = useState<SortKey>('nom')

  // Simulation interactive
  const [simTarifPercent, setSimTarifPercent] = useState<number>(0)
  const [simRemplissageTarget, setSimRemplissageTarget] = useState<number>(0)
  const [simInscritsByGroupe, setSimInscritsByGroupe] = useState<Record<string, number>>({})

  // ── Persistance localStorage (préférences) ─────────────────────────────────
  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      const d = localStorage.getItem('coutGroupes.dateDebut')
      const f = localStorage.getItem('coutGroupes.dateFin')
      const m = localStorage.getItem('coutGroupes.mode')
      const mg = localStorage.getItem('coutGroupes.marge')
      if (d) setDateDebut(d)
      if (f) setDateFin(f)
      if (m === 'simple' || m === 'optimise') setMode(m)
      if (mg) setMargeSecurite(Number(mg))
    } catch {
      /* noop */
    }
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      localStorage.setItem('coutGroupes.dateDebut', dateDebut)
      localStorage.setItem('coutGroupes.dateFin', dateFin)
      localStorage.setItem('coutGroupes.mode', mode)
      localStorage.setItem('coutGroupes.marge', String(margeSecurite))
    } catch {
      /* noop */
    }
  }, [dateDebut, dateFin, mode, margeSecurite])

  // ── Persistance sessionStorage (résultats) ─────────────────────────────────
  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      const savedParams = sessionStorage.getItem(SESSION_PARAMS_KEY)
      const savedResultat = sessionStorage.getItem(SESSION_KEY)
      if (!savedParams || !savedResultat) return

      const params = JSON.parse(savedParams)
      if (
        params.dateDebut === dateDebut &&
        params.dateFin === dateFin &&
        params.mode === mode
      ) {
        setRawResultat(JSON.parse(savedResultat))
      }
    } catch {
      /* noop */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Auto-calcul sur mount si aucun résultat ───────────────────────────────
  useEffect(() => {
    if (typeof window === 'undefined') return
    const savedResultat = sessionStorage.getItem(SESSION_KEY)
    if (savedResultat) return

    const triggerInitialCalculation = async () => {
      setLoading(true)
      setError('')
      try {
        const d = localStorage.getItem('coutGroupes.dateDebut') || undefined
        const f = localStorage.getItem('coutGroupes.dateFin') || undefined
        const m = localStorage.getItem('coutGroupes.mode') || 'optimise'
        const mg = Number(localStorage.getItem('coutGroupes.marge') || '0')

        const response = await fetch('/api/admin/groupes/cout-saison', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            dateDebut: d || undefined,
            dateFin: f || undefined,
            mode: m,
            margeSecurite: mg,
            includeComparaison: false,
          }),
        })
        const data = await response.json()
        if (response.ok) {
          setRawResultat(data)
          try {
            sessionStorage.setItem(SESSION_KEY, JSON.stringify(data))
            sessionStorage.setItem(
              SESSION_PARAMS_KEY,
              JSON.stringify({ dateDebut: d || '', dateFin: f || '', mode: m })
            )
          } catch {
            /* noop */
          }
        }
      } catch (err) {
        setError(getErrorMessage(err))
      } finally {
        setLoading(false)
      }
    }

    triggerInitialCalculation()
  }, [])

  const sauvegarderResultat = useCallback(
    (data: ResultatCalcul) => {
      try {
        sessionStorage.setItem(SESSION_KEY, JSON.stringify(data))
        sessionStorage.setItem(
          SESSION_PARAMS_KEY,
          JSON.stringify({ dateDebut, dateFin, mode })
        )
      } catch {
        /* noop */
      }
    },
    [dateDebut, dateFin, mode]
  )

  // ── Calcul ─────────────────────────────────────────────────────────────────
  const handleCalculer = async () => {
    setLoading(true)
    setError('')
    setRawResultat(null)
    try {
      const tauxChargesOverride = tauxOverride !== '' ? Number(tauxOverride) : undefined

      const response = await fetch('/api/admin/groupes/cout-saison', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dateDebut: dateDebut || undefined,
          dateFin: dateFin || undefined,
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

  const toggleDetails = (id: string) => setShowDetails((p) => ({ ...p, [id]: !p[id] }))
  const toggleGroupCostBreakdown = (id: string) =>
    setShowGroupCostBreakdown((p) => ({ ...p, [id]: !p[id] }))
  const toggleProjection = (id: string) => setShowProjection((p) => ({ ...p, [id]: !p[id] }))

  // ── Calculateur de simulation interactive ──────────────────────────────────
  const displayData = (() => {
    if (!rawResultat) return null
    const hasCustomInscrits = Object.keys(simInscritsByGroupe).length > 0
    if (simTarifPercent === 0 && simRemplissageTarget === 0 && !hasCustomInscrits)
      return rawResultat

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

      const totalTarifInscritsSimules =
        inscrits2CoursSimules * tarifAnnuelSimule + inscrits1CoursSimules * tarif1CoursSimule
      const tarifMoyenSimule =
        inscritsSimules > 0 ? totalTarifInscritsSimules / inscritsSimules : tarifAnnuelSimule

      const reductionEnfantBureau = 50
      const tarifEnfantBureauSimule = tarifMoyenSimule * (1 - reductionEnfantBureau / 100)

      const revenuActuelSimule =
        inscritsPleinTarif * tarifMoyenSimule + enfantsBureau * tarifEnfantBureauSimule

      const revenuPotentielSimule = tarifMoyenSimule * g.placesTotal
      const coutLicencesSimule = g.prixLicence * inscritsSimules
      const coutTotalSimule =
        g.coutCoaching + g.coutCompetitions + coutLicencesSimule + g.coutMargeSecurite

      const beneficeActuelSimule = revenuActuelSimule - coutTotalSimule
      const beneficePotentielSimule = revenuPotentielSimule - coutTotalSimule
      const margeActuelleSimule =
        revenuActuelSimule > 0 ? (beneficeActuelSimule / revenuActuelSimule) * 100 : -100

      const tarifEffectifMoyenSimule =
        inscritsSimules > 0 ? revenuActuelSimule / inscritsSimules : tarifMoyenSimule
      const seuilRentabiliteSimule =
        tarifEffectifMoyenSimule > 0
          ? Math.ceil(coutTotalSimule / tarifEffectifMoyenSimule)
          : 0

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

    const totalHeuresGlobal = groupesSimules
      .filter((r) => r.nbSemaines > 0)
      .reduce((s, r) => s + r.totalHeures, 0)
    const coutCoachingGlobal = groupesSimules
      .filter((r) => r.nbSemaines > 0)
      .reduce((s, r) => s + r.coutCoaching, 0)
    const coutCompetitionsGlobal = groupesSimules
      .filter((r) => r.nbSemaines > 0)
      .reduce((s, r) => s + r.coutCompetitions, 0)
    const coutLicencesGlobal = groupesSimules
      .filter((r) => r.nbSemaines > 0)
      .reduce((s, r) => s + r.coutLicences, 0)
    const coutMargeGlobal = groupesSimules
      .filter((r) => r.nbSemaines > 0)
      .reduce((s, r) => s + r.coutMargeSecurite, 0)
    const coutTotalGlobal = groupesSimules
      .filter((r) => r.nbSemaines > 0)
      .reduce((s, r) => s + r.coutTotal, 0)
    const revenuActuelGlobal = groupesSimules
      .filter((r) => r.nbSemaines > 0)
      .reduce((s, r) => s + r.revenuActuel, 0)
    const revenuPotentielGlobal = groupesSimules
      .filter((r) => r.nbSemaines > 0)
      .reduce((s, r) => s + r.revenuPotentiel, 0)
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
        margeActuelle:
          revenuActuelGlobal > 0 ? (beneficeGlobal / revenuActuelGlobal) * 100 : -100,
        totalInscrits,
        totalPlaces,
        tauxRemplissageMoyen:
          totalPlaces > 0 ? (totalInscrits / totalPlaces) * 100 : 0,
      },
    }
  })()

  const resultat = displayData

  // ── Tri ────────────────────────────────────────────────────────────────────
  const groupesTries = displayData
    ? [...displayData.groupes].sort((a, b) => {
        if (sortBy === 'cout') return b.coutTotal - a.coutTotal
        if (sortBy === 'benefice') return b.beneficeActuel - a.beneficeActuel
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
      displayData.groupes.reduce(
        (s, g) => s + (g.alertes?.filter((a) => a.type === 'danger').length ?? 0),
        0
      )
    : 0

  const isSimulationActive =
    simTarifPercent !== 0 ||
    simRemplissageTarget !== 0 ||
    Object.keys(simInscritsByGroupe).length > 0 ||
    tauxOverride !== ''

  // ─── Rendu ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6 animate-fade-in">
      {/* ── En-tête & Contrôles Modernes ────────────────────────────────────── */}
      <div className="card p-6 bg-white border border-slate-200/90 rounded-2xl shadow-2xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 pb-5">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-8 h-8 rounded-xl bg-slate-900 text-white flex items-center justify-center text-sm font-bold shadow-xs">
                📐
              </span>
              <h2 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                Analyse des Coûts &amp; Rentabilité des Groupes
                <HelpTooltip title="Calcul prévisionnel & réalité économique">
                  <p>
                    Calcule avec précision les heures effectives de coaching, le reversement des
                    licences FFN, les forfaits compétitions et les recettes prévisionnelles.
                  </p>
                  <p className="mt-1">
                    Prend en compte les plannings actifs, le temps facturé, les vacances scolaires
                    et les séances annulées.
                  </p>
                </HelpTooltip>
              </h2>
            </div>
            <p className="text-xs text-slate-500 font-medium mt-1">
              Modélisation budgétaire par groupe et simulation de rentabilité en temps réel
            </p>
          </div>

          {/* Toggle Mode Segmenté */}
          <div className="inline-flex p-1 bg-slate-100 rounded-xl border border-slate-200/60 shadow-2xs self-start lg:self-auto">
            <button
              onClick={() => setMode('optimise')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                mode === 'optimise'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <span>✨</span>
              <span>Mode Réel / Partagé</span>
            </button>
            <button
              onClick={() => setMode('simple')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                mode === 'simple'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <span>Mode Autonome</span>
            </button>
          </div>
        </div>

        {/* Barre de sélection de dates & Action */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 mt-5 items-end">
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
              📅 Début de saison
            </label>
            <input
              type="date"
              value={dateDebut}
              onChange={(e) => setDateDebut(e.target.value)}
              aria-label="Date de début de saison"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all"
            />
          </div>
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
              📅 Fin de saison
            </label>
            <input
              type="date"
              value={dateFin}
              onChange={(e) => setDateFin(e.target.value)}
              aria-label="Date de fin de saison"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all"
            />
          </div>
          <div>
            <button
              onClick={handleCalculer}
              disabled={loading}
              className="w-full py-2 px-4 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-xs hover:scale-[1.01] active:scale-[0.99] transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <span>{loading ? '⏳' : '⚡'}</span>
              <span>{loading ? 'Calcul en cours…' : 'Actualiser le calcul'}</span>
            </button>
          </div>
        </div>

        {/* Paramètres avancés escamotables */}
        <details className="group mt-4 pt-3 border-t border-slate-100">
          <summary className="cursor-pointer select-none text-[11px] font-bold text-slate-500 hover:text-slate-900 flex items-center gap-1.5 list-none outline-none">
            <span className="inline-block transition-transform duration-200 group-open:rotate-90 text-[10px]">
              ▶
            </span>
            <span>Paramètres avancés (Taux horaire, Marges, PSE1/BNSSA)</span>
          </summary>
          <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 pt-2 bg-slate-50/60 p-4 rounded-xl border border-slate-100">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                Taux horaire simulé (€/h)
              </label>
              <input
                type="number"
                min={0}
                step={1}
                value={tauxOverride}
                onChange={(e) => setTauxOverride(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 focus:outline-none focus:border-slate-800"
                placeholder="Taux club par défaut"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                Marge de sécurité (%)
              </label>
              <input
                type="number"
                min={0}
                max={100}
                step={5}
                value={margeSecurite}
                onChange={(e) => setMargeSecurite(Number(e.target.value))}
                className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 focus:outline-none focus:border-slate-800"
                placeholder="0"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                Coût Formation PSE1 (€)
              </label>
              <input
                type="number"
                min={0}
                step={10}
                value={coutFormationsPSE1}
                onChange={(e) => setCoutFormationsPSE1(Number(e.target.value))}
                className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 focus:outline-none focus:border-slate-800"
                placeholder="150"
              />
            </div>
            <div className="flex items-center pt-3">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700 select-none">
                <input
                  type="checkbox"
                  checked={includeComparaison}
                  onChange={(e) => setIncludeComparaison(e.target.checked)}
                  className="w-4 h-4 text-slate-900 border-slate-300 rounded focus:ring-slate-900 cursor-pointer"
                />
                <span>Comparer Réel vs Autonome</span>
              </label>
            </div>
          </div>
        </details>

        {error && (
          <div className="mt-4 bg-rose-50 border border-rose-200 text-rose-800 px-4 py-3 rounded-xl text-xs font-semibold">
            ⚠️ {error}
          </div>
        )}
      </div>

      {/* ── Skeleton pendant le chargement ────────────────────────────────── */}
      {loading && (
        <div className="card p-6 bg-white border border-slate-200/90 rounded-2xl">
          <SkeletonKpi />
          <SkeletonTable />
        </div>
      )}

      {/* ── Résultats ─────────────────────────────────────────────────────── */}
      {resultat && !loading && (
        <div className="space-y-6">
          {/* ── Cockpit de Simulation Rapide ────────────────────────────────── */}
          <div className="bg-slate-900 text-white rounded-2xl p-5 border border-slate-800 shadow-sm relative overflow-hidden">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <span className="w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center text-sm">
                  🧪
                </span>
                <div>
                  <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-100">
                    Simulateur de Scénarios &amp; Recrutement
                  </h3>
                  <p className="text-[11px] text-slate-400 font-medium">
                    Testez instantanément l&apos;impact d&apos;une hausse tarifaire ou d&apos;un taux de remplissage cible
                  </p>
                </div>
              </div>

              {isSimulationActive && (
                <button
                  type="button"
                  onClick={() => {
                    setSimTarifPercent(0)
                    setSimRemplissageTarget(0)
                    setSimInscritsByGroupe({})
                    setTauxOverride('')
                  }}
                  className="px-3 py-1.5 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1.5 self-start sm:self-auto"
                >
                  <span>🔄</span>
                  <span>Réinitialiser simulation</span>
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4 text-xs">
              {/* Ajustement tarifaire */}
              <div className="space-y-2">
                <div className="flex justify-between font-bold text-slate-200">
                  <span>Variation des Cotisations (%)</span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-black font-mono ${
                      simTarifPercent > 0
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        : simTarifPercent < 0
                          ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                          : 'bg-white/10 text-slate-400'
                    }`}
                  >
                    {simTarifPercent > 0 ? '+' : ''}
                    {simTarifPercent}%
                  </span>
                </div>
                <input
                  type="range"
                  min={-20}
                  max={40}
                  step={5}
                  value={simTarifPercent}
                  onChange={(e) => setSimTarifPercent(Number(e.target.value))}
                  aria-label="Variation des cotisations en pourcentage"
                  className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-400"
                />
                <div className="flex justify-between text-[10px] text-slate-400 font-bold uppercase">
                  <span>-20%</span>
                  <span>0% (Tarifs Réels)</span>
                  <span>+40%</span>
                </div>
              </div>

              {/* Remplissage cible */}
              <div className="space-y-2">
                <div className="flex justify-between font-bold text-slate-200">
                  <span>Objectif de Remplissage Global</span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-black font-mono ${
                      simRemplissageTarget > 0
                        ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                        : 'bg-white/10 text-slate-400'
                    }`}
                  >
                    {simRemplissageTarget > 0 ? `${simRemplissageTarget}%` : 'Effectif Réel'}
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={5}
                  value={simRemplissageTarget}
                  onChange={(e) => setSimRemplissageTarget(Number(e.target.value))}
                  aria-label="Objectif de remplissage global en pourcentage"
                  className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-400"
                />
                <div className="flex justify-between text-[10px] text-slate-400 font-bold uppercase">
                  <span>Réel</span>
                  <span>75%</span>
                  <span>90%</span>
                  <span>100% (Plein)</span>
                </div>
              </div>
            </div>

            {isSimulationActive && (
              <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-emerald-300 font-semibold">
                <span>
                  ✨ Simulation active : les chiffres et tableaux ci-dessous intègrent vos hypothèses en direct.
                </span>
                <span className="font-mono text-xs">
                  {Object.keys(simInscritsByGroupe).length > 0 &&
                    `(${Object.keys(simInscritsByGroupe).length} groupes avec saisie manuelle)`}
                </span>
              </div>
            )}
          </div>

          {/* Comparaison modes */}
          {resultat.comparaison && (
            <div className="card p-5 bg-white border border-slate-200/90 rounded-2xl shadow-2xs">
              <h4 className="font-extrabold text-xs text-slate-900 mb-3 uppercase tracking-wider flex items-center gap-1.5">
                ⚖️ Économie du Partage de Bassin (Simple vs Optimisé)
              </h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                {[
                  {
                    label: 'Coût Cumulé Autonome',
                    val: `${fmt(resultat.comparaison.coutSimple)} €`,
                    bgClass: 'bg-slate-50 border border-slate-200/60',
                    textClass: 'text-slate-800',
                  },
                  {
                    label: 'Coût Réel Optimisé',
                    val: `${fmt(resultat.comparaison.coutOptimise)} €`,
                    bgClass: 'bg-indigo-50/60 border border-indigo-100',
                    textClass: 'text-indigo-900',
                  },
                  {
                    label: 'Économie Déduplication',
                    val: `-${fmt(resultat.comparaison.economie)} €`,
                    bgClass: 'bg-emerald-50/70 border border-emerald-100',
                    textClass: 'text-emerald-800',
                  },
                  {
                    label: 'Gain Budgétaire',
                    val: `-${fmtD(resultat.comparaison.economiePercent)}%`,
                    bgClass: 'bg-emerald-50/70 border border-emerald-100',
                    textClass: 'text-emerald-800',
                  },
                ].map(({ label, val, bgClass, textClass }) => (
                  <div key={label} className={`rounded-xl p-3.5 text-center ${bgClass}`}>
                    <div className="text-[10px] font-bold text-slate-500 mb-1 uppercase tracking-wider">
                      {label}
                    </div>
                    <div className={`font-black text-lg ${textClass}`}>{val}</div>
                  </div>
                ))}
              </div>
              <div className="text-[10px] font-semibold text-slate-400 mt-2.5 uppercase tracking-wide">
                {fmtD(resultat.comparaison.heuresDedupliquees)}h dédupliquées sur les créneaux partagés
              </div>
            </div>
          )}

          {/* ── Synthèse Financière (KPI) ─────────────────────────────────── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Volume Horaire */}
            <div className="bg-white border border-slate-200/90 p-5 rounded-2xl shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    Volume Coaching
                  </span>
                  <span className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700 text-sm">
                    ⏱️
                  </span>
                </div>
                <div className="text-2xl font-black text-slate-900 tracking-tight">
                  {fmt(resultat.totaux.totalHeures)} h
                </div>
              </div>
              <p className="text-xs text-slate-500 mt-3 font-medium">
                {resultat.nbSemainesTotales
                  ? `${resultat.nbSemainesTotales} semaines hors vacances`
                  : 'Saison complète'}
              </p>
            </div>

            {/* Coût Total */}
            <div className="bg-rose-50/40 border border-rose-200/70 p-5 rounded-2xl shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-bold text-rose-900 uppercase tracking-wider">
                    Coût Total Réel
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setShowCostBreakdown(!showCostBreakdown)}
                      className="text-[10px] font-bold text-rose-700 hover:text-rose-900 underline cursor-pointer"
                    >
                      {showCostBreakdown ? 'Fermer' : 'Détails'}
                    </button>
                    <span className="w-8 h-8 rounded-xl bg-rose-100 flex items-center justify-center text-rose-800 text-sm">
                      📉
                    </span>
                  </div>
                </div>
                <div className="text-2xl font-black text-rose-950 tracking-tight">
                  {fmt(resultat.totaux.coutTotal)} €
                </div>

                {/* Barre de répartition */}
                <div className="w-full h-1.5 rounded-full overflow-hidden flex mt-2.5 bg-slate-200">
                  {resultat.totaux.coutCoaching > 0 && (
                    <div
                      className="h-full bg-rose-500"
                      style={{
                        width: `${(resultat.totaux.coutCoaching / resultat.totaux.coutTotal) * 100}%`,
                      }}
                      title={`Coaching: ${fmt(resultat.totaux.coutCoaching)}€`}
                    />
                  )}
                  {resultat.totaux.coutCompetitions > 0 && (
                    <div
                      className="h-full bg-blue-500"
                      style={{
                        width: `${(resultat.totaux.coutCompetitions / resultat.totaux.coutTotal) * 100}%`,
                      }}
                      title={`Compétitions: ${fmt(resultat.totaux.coutCompetitions)}€`}
                    />
                  )}
                  {resultat.totaux.coutLicences > 0 && (
                    <div
                      className="h-full bg-violet-500"
                      style={{
                        width: `${(resultat.totaux.coutLicences / resultat.totaux.coutTotal) * 100}%`,
                      }}
                      title={`Licences FFN: ${fmt(resultat.totaux.coutLicences)}€`}
                    />
                  )}
                </div>

                {showCostBreakdown && (
                  <div className="mt-3 pt-2 border-t border-rose-200/80 space-y-1 text-xs text-rose-900 font-semibold animate-fade-in">
                    <div className="flex justify-between">
                      <span>👨‍🏫 Coaching</span>
                      <strong>{fmt(resultat.totaux.coutCoaching)} €</strong>
                    </div>
                    {resultat.totaux.coutCompetitions > 0 && (
                      <div className="flex justify-between">
                        <span>🏆 Compétitions</span>
                        <strong>{fmt(resultat.totaux.coutCompetitions)} €</strong>
                      </div>
                    )}
                    {resultat.totaux.coutLicences > 0 && (
                      <div className="flex justify-between">
                        <span>🎫 Licences FFN</span>
                        <strong>{fmt(resultat.totaux.coutLicences)} €</strong>
                      </div>
                    )}
                    {(resultat.totaux.coutFormationsPSE1 ?? 0) > 0 && (
                      <div className="flex justify-between">
                        <span>⛑️ Formations PSE1</span>
                        <strong>{fmt(resultat.totaux.coutFormationsPSE1 ?? 0)} €</strong>
                      </div>
                    )}
                  </div>
                )}
              </div>
              <p className="text-xs text-rose-800/80 mt-3 font-medium">
                Encadrement, licences &amp; logistique
              </p>
            </div>

            {/* Recettes Prévues */}
            <div className="bg-emerald-50/50 border border-emerald-200/70 p-5 rounded-2xl shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-bold text-emerald-900 uppercase tracking-wider">
                    Cotisations Prévues
                  </span>
                  <span className="w-8 h-8 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-800 text-sm">
                    📈
                  </span>
                </div>
                <div className="text-2xl font-black text-emerald-950 tracking-tight">
                  {fmt(resultat.totaux.revenuActuel)} €
                </div>
              </div>
              <p className="text-xs text-emerald-800/80 mt-3 font-medium">
                {resultat.totaux.totalInscrits} inscrits (Capacité 100%: {fmt(resultat.totaux.revenuPotentiel)} €)
              </p>
            </div>

            {/* Bénéfice Net */}
            <div
              className={`p-5 rounded-2xl shadow-2xs hover:shadow-xs transition-all border flex flex-col justify-between ${
                resultat.totaux.beneficeActuel >= 0
                  ? 'bg-slate-900 text-white border-slate-800'
                  : 'bg-rose-950 text-white border-rose-900'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-300">
                    Résultat Net Saison
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                      resultat.totaux.beneficeActuel >= 0
                        ? 'bg-emerald-500/20 text-emerald-300'
                        : 'bg-rose-500/20 text-rose-300'
                    }`}
                  >
                    Marge {fmtD(resultat.totaux.margeActuelle ?? 0)}%
                  </span>
                </div>
                <div className="text-2xl font-black tracking-tight text-white">
                  {sign(resultat.totaux.beneficeActuel)}
                  {fmt(resultat.totaux.beneficeActuel)} €
                </div>
              </div>
              <p className="text-xs mt-3 font-medium text-slate-400">
                Taux de remplissage global : {fmtD(resultat.totaux.tauxRemplissageMoyen)}%
              </p>
            </div>
          </div>

          {/* ── Navigation des Vues Détaillées ────────────────────────────── */}
          <div className="card p-6 bg-white border border-slate-200/90 rounded-2xl shadow-2xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4 mb-5">
              <div className="bg-slate-100/90 p-1.5 rounded-2xl flex flex-wrap gap-1 border border-slate-200/60">
                {(
                  [
                    {
                      key: 'general',
                      label: 'Rentabilité par Groupe',
                      count: displayData?.groupes.length,
                      icon: '🏊',
                    },
                    {
                      key: 'coachs',
                      label: 'Budget par Entraîneur',
                      count: displayData?.coachsCout?.length,
                      icon: '👨‍🏫',
                    },
                    {
                      key: 'alertes',
                      label: 'Alertes & Diagnostics',
                      count: nbAlertesTotal > 0 ? nbAlertesTotal : undefined,
                      badgeClass: nbAlertesDanger > 0 ? 'bg-rose-600 text-white' : undefined,
                      icon: '🔔',
                    },
                  ] as {
                    key: ViewMode
                    label: string
                    count?: number
                    icon: string
                    badgeClass?: string
                  }[]
                ).map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => setViewMode(tab.key)}
                    className={`py-2 px-3.5 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
                      viewMode === tab.key
                        ? 'bg-white text-slate-900 shadow-xs border border-slate-200/60'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
                    }`}
                  >
                    <span>{tab.icon}</span>
                    <span>{tab.label}</span>
                    {tab.count !== undefined && (
                      <span
                        className={`px-1.5 py-0.2 rounded-full text-[10px] font-extrabold ${
                          tab.badgeClass ||
                          (viewMode === tab.key
                            ? 'bg-slate-100 text-slate-700'
                            : 'bg-slate-200/70 text-slate-500')
                        }`}
                      >
                        {tab.count}
                      </span>
                    )}
                  </button>
                ))}
              </div>

              {/* Actions & Export */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => exportCSV(resultat)}
                  className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <span>📥</span>
                  <span>Exporter CSV</span>
                </button>
              </div>
            </div>

            {/* ══ VUE 1 : RENTABILITÉ PAR GROUPE ════════════════════════════ */}
            {viewMode === 'general' && (
              <div>
                <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
                  <div className="text-xs font-extrabold text-slate-500 uppercase tracking-wider">
                    Détail des {groupesTries.length} Groupes Actifs
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      Trier :
                    </span>
                    {(
                      [
                        { key: 'nom', label: 'Nom' },
                        { key: 'cout', label: 'Coût ↓' },
                        { key: 'benefice', label: 'Bénéfice ↓' },
                        { key: 'remplissage', label: 'Remplissage ↓' },
                      ] as { key: SortKey; label: string }[]
                    ).map((s) => (
                      <button
                        key={s.key}
                        onClick={() => setSortBy(s.key)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          sortBy === s.key
                            ? 'bg-slate-900 text-white shadow-xs'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200/80 overflow-hidden shadow-2xs">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px]">
                          <th className="py-3.5 px-4">Groupe &amp; Planning</th>
                          <th className="py-3.5 px-3 text-center">Volume H.</th>
                          <th className="py-3.5 px-4 text-center">
                            <span className="inline-flex items-center gap-1">
                              Inscrits / Capacité
                              <HelpTooltip title="Saisie d'inscrits en direct">
                                <p>
                                  Ajustez le chiffre dans la case pour simuler en temps réel la
                                  rentabilité du groupe.
                                </p>
                              </HelpTooltip>
                            </span>
                          </th>
                          <th className="py-3.5 px-4 text-right">Coût Réel</th>
                          <th className="py-3.5 px-4 text-right">Recettes</th>
                          <th className="py-3.5 px-4 text-right">Résultat Net</th>
                          <th className="py-3.5 px-4 text-center">
                            <span className="inline-flex items-center gap-1">
                              Équilibre &amp; Outils
                              <CalculationTooltip
                                title="Seuil de rentabilité"
                                formula="Coût Total ÷ Cotisation effective"
                                explanation="Nombre minimum d'adhérents requis pour amortir le groupe."
                                position="left"
                              />
                            </span>
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {groupesTries.map((groupe) => {
                          const nbAlertes = groupe.alertes?.length ?? 0
                          const hasDateGroupe =
                            groupe.sourceDate === 'groupe' && groupe.dateDebutUtilisee
                          return (
                            <Fragment key={groupe.groupeId}>
                              <tr className="hover:bg-slate-50/80 transition-colors">
                                <td className="py-3.5 px-4">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="font-bold text-slate-900 text-xs">
                                      {groupe.groupeNom}
                                    </span>
                                    {groupe.isCompetition && (
                                      <span className="px-1.5 py-0.5 text-[9px] rounded-md bg-blue-50 border border-blue-200 text-blue-800 font-extrabold">
                                        🏆 Compét.
                                      </span>
                                    )}
                                    {nbAlertes > 0 && (
                                      <span
                                        title={groupe.alertes
                                          .filter((a) => a.code !== 'DATE_GROUPE')
                                          .map((a) => a.message)
                                          .join(' | ')}
                                        className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold cursor-help ${
                                          groupe.alertes.some((a) => a.type === 'danger')
                                            ? 'bg-rose-100 text-rose-800'
                                            : 'bg-amber-100 text-amber-800'
                                        }`}
                                      >
                                        {groupe.alertes.some((a) => a.type === 'danger') ? '🔴' : '🟡'}{' '}
                                        {nbAlertes}
                                      </span>
                                    )}
                                  </div>
                                  {hasDateGroupe && (
                                    <div className="text-[10px] text-blue-600 mt-0.5 font-medium flex items-center gap-1">
                                      📅 Dates propres : {groupe.dateDebutUtilisee} → {groupe.dateFinUtilisee}
                                    </div>
                                  )}
                                </td>

                                <td className="py-3.5 px-3 text-center">
                                  <span className="font-bold text-slate-800">
                                    {groupe.heuresParSemaine.toFixed(1)}h/sem
                                  </span>
                                  <div className="text-[10px] text-slate-400 font-medium">
                                    {groupe.totalHeures.toFixed(0)}h / saison
                                  </div>
                                </td>

                                <td className="py-3.5 px-4 text-center">
                                  <div className="flex items-center justify-center gap-1.5">
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
                                      className={`w-14 px-1.5 py-0.5 text-center text-xs font-extrabold rounded-lg border transition-all cursor-pointer ${
                                        simInscritsByGroupe[groupe.groupeId] !== undefined
                                          ? 'bg-indigo-50 border-indigo-400 text-indigo-950 ring-2 ring-indigo-200/60'
                                          : 'bg-slate-50 border-slate-200 text-slate-800 hover:border-slate-300'
                                      }`}
                                      title="Modifier le nombre d'inscrits (calcul immédiat)"
                                    />
                                    <span className="text-slate-400 font-semibold">
                                      / {groupe.placesTotal}
                                    </span>
                                  </div>
                                  <div className="text-[10px] text-slate-500 font-medium mt-0.5">
                                    {groupe.tauxRemplissage.toFixed(0)}% rempli
                                  </div>
                                </td>

                                <td className="py-3.5 px-4 text-right">
                                  <div className="flex items-center justify-end gap-1.5">
                                    <div className="text-right">
                                      <div className="font-black text-slate-900 text-xs">
                                        {fmt(groupe.coutTotal)} €
                                      </div>
                                      {groupe.inscrits > 0 && (
                                        <div className="text-[10px] text-slate-400 font-medium">
                                          {fmt(groupe.coutParInscrit)} €/adh.
                                        </div>
                                      )}
                                    </div>
                                    <button
                                      onClick={() => toggleGroupCostBreakdown(groupe.groupeId)}
                                      className="text-slate-400 hover:text-slate-700 text-xs p-1 rounded-md hover:bg-slate-100 cursor-pointer"
                                      title="Voir la décomposition du coût"
                                    >
                                      {showGroupCostBreakdown[groupe.groupeId] ? '▲' : '▼'}
                                    </button>
                                  </div>
                                  {showGroupCostBreakdown[groupe.groupeId] && (
                                    <div className="mt-2 pt-2 border-t border-slate-200/80 space-y-1 text-[11px] text-right text-slate-600 animate-fade-in">
                                      <div className="flex justify-between gap-2">
                                        <span>👨‍🏫 Coaching</span>
                                        <strong>{fmt(groupe.coutCoaching)} €</strong>
                                      </div>
                                      {groupe.coutCompetitions > 0 && (
                                        <div className="flex justify-between gap-2">
                                          <span>🏆 Compétitions</span>
                                          <strong>{fmt(groupe.coutCompetitions)} €</strong>
                                        </div>
                                      )}
                                      {groupe.coutLicences > 0 && (
                                        <div className="flex justify-between gap-2">
                                          <span>🎫 Licences FFN</span>
                                          <strong>{fmt(groupe.coutLicences)} €</strong>
                                        </div>
                                      )}
                                      {(groupe.coutMargeSecurite ?? 0) > 0 && (
                                        <div className="flex justify-between gap-2 text-amber-800">
                                          <span>🛡️ Marge sécu.</span>
                                          <strong>{fmt(groupe.coutMargeSecurite)} €</strong>
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </td>

                                <td className="py-3.5 px-4 text-right">
                                  <div className="font-bold text-slate-800 text-xs">
                                    {fmt(groupe.revenuActuel)} €
                                  </div>
                                  <div className="text-[10px] text-slate-400 font-medium">
                                    (Plein : {fmt(groupe.revenuPotentiel)} €)
                                  </div>
                                </td>

                                <td className={`py-3.5 px-4 text-right ${getBeneficeBg(groupe.beneficeActuel)}`}>
                                  <div className={`font-black text-xs ${getBeneficeColor(groupe.beneficeActuel)}`}>
                                    {sign(groupe.beneficeActuel)}
                                    {fmt(groupe.beneficeActuel)} €
                                  </div>
                                  <div className={`text-[10px] font-bold ${getBeneficeColor(groupe.margeActuelle ?? 0)}`}>
                                    {fmtD(groupe.margeActuelle ?? 0)}%
                                  </div>
                                </td>

                                <td className="py-3.5 px-4 text-center">
                                  <div className="flex items-center justify-center gap-2">
                                    <span
                                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold ${
                                        groupe.inscrits >= groupe.seuilRentabilite
                                          ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                                          : 'bg-rose-50 border border-rose-200 text-rose-800'
                                      }`}
                                    >
                                      ≥ {groupe.seuilRentabilite} adh.
                                    </span>
                                    {groupe.plannings.length > 0 && (
                                      <button
                                        onClick={() => toggleDetails(groupe.groupeId)}
                                        className="p-1 rounded-md hover:bg-slate-200 text-slate-600 cursor-pointer"
                                        title="Voir les créneaux planning"
                                      >
                                        📅
                                      </button>
                                    )}
                                    {groupe.projection && (
                                      <button
                                        onClick={() => toggleProjection(groupe.groupeId)}
                                        className="p-1 rounded-md hover:bg-slate-200 text-slate-600 cursor-pointer"
                                        title="Voir les projections de rentabilité"
                                      >
                                        📊
                                      </button>
                                    )}
                                  </div>
                                </td>
                              </tr>

                              {/* Détail Planning Déroulé */}
                              {showDetails[groupe.groupeId] && groupe.plannings.length > 0 && (
                                <tr>
                                  <td colSpan={7} className="px-6 py-3 bg-slate-50 border-b border-slate-100">
                                    <div className="text-xs flex flex-wrap gap-4 text-slate-700 font-medium">
                                      {groupe.plannings.map((p, i) => (
                                        <span
                                          key={i}
                                          className="inline-flex items-center gap-1.5 bg-white px-2.5 py-1 rounded-lg border border-slate-200/80 shadow-2xs"
                                        >
                                          <strong>{p.jour}</strong> {p.heureDebut}–{p.heureFin}
                                          {p.coach && (
                                            <span className="text-slate-500 font-semibold">({p.coach})</span>
                                          )}
                                          {p.nbGroupesSimultanes && p.nbGroupesSimultanes > 1 && (
                                            <span className="text-[10px] bg-indigo-50 text-indigo-700 px-1 rounded">
                                              Partagé x{p.nbGroupesSimultanes}
                                            </span>
                                          )}
                                        </span>
                                      ))}
                                    </div>
                                  </td>
                                </tr>
                              )}

                              {/* Détail Projection Déroulé */}
                              {showProjection[groupe.groupeId] && groupe.projection && (
                                <tr>
                                  <td colSpan={7} className="px-6 py-4 bg-slate-50/80 border-b border-slate-100">
                                    <p className="text-xs font-extrabold uppercase tracking-wider text-slate-700 mb-2">
                                      📊 Projections de Rentabilité pour {groupe.groupeNom}
                                    </p>
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                      {[
                                        { label: '75% de Capacité', val: groupe.projection.projection75 },
                                        { label: '90% de Capacité', val: groupe.projection.projection90 },
                                        { label: '100% (Complet)', val: groupe.projection.projection100 },
                                      ].map(({ label, val }) => (
                                        <div
                                          key={label}
                                          className={`rounded-xl p-3 text-center border ${getBeneficeBg(val)} ${
                                            val >= 0 ? 'border-emerald-200' : 'border-rose-200'
                                          }`}
                                        >
                                          <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                                            {label}
                                          </div>
                                          <div className={`font-black text-sm ${getBeneficeColor(val)}`}>
                                            {sign(val)}
                                            {fmt(val)} €
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </td>
                                </tr>
                              )}
                            </Fragment>
                          )
                        })}

                        {/* Ligne TOTAL Globale */}
                        <tr className="bg-slate-100 font-black border-t-2 border-slate-300 text-xs">
                          <td className="py-4 px-4 text-slate-900 uppercase tracking-wider">
                            TOTAL ({groupesTries.length} groupes)
                          </td>
                          <td className="py-4 px-3 text-center text-slate-900">
                            {fmt(resultat.totaux.totalHeures)} h
                          </td>
                          <td className="py-4 px-4 text-center text-slate-900">
                            {resultat.totaux.totalInscrits} / {resultat.totaux.totalPlaces} (
                            {fmtD(resultat.totaux.tauxRemplissageMoyen)}%)
                          </td>
                          <td className="py-4 px-4 text-right text-rose-800 text-sm">
                            {fmt(resultat.totaux.coutTotal)} €
                          </td>
                          <td className="py-4 px-4 text-right text-slate-900 text-sm">
                            {fmt(resultat.totaux.revenuActuel)} €
                          </td>
                          <td
                            className={`py-4 px-4 text-right text-sm ${
                              resultat.totaux.beneficeActuel >= 0 ? 'text-emerald-800' : 'text-rose-800'
                            }`}
                          >
                            {sign(resultat.totaux.beneficeActuel)}
                            {fmt(resultat.totaux.beneficeActuel)} € (
                            {fmtD(resultat.totaux.margeActuelle ?? 0)}%)
                          </td>
                          <td className="py-4 px-4 text-center text-slate-500 text-[10px]">
                            {resultat.totaux.beneficeActuel >= 0 ? '✅ Bénéficiaire' : '⚠️ Déficitaire'}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* ══ VUE 2 : BUDGET PAR ENTRAÎNEUR ═════════════════════════════ */}
            {viewMode === 'coachs' && (
              <div>
                <div className="text-xs font-extrabold text-slate-500 uppercase tracking-wider mb-4">
                  Répartition des Heures &amp; Honoraires par Entraîneur
                </div>

                {!resultat.coachsCout || resultat.coachsCout.length === 0 ? (
                  <div className="text-center py-12 px-4 bg-slate-50/50 border border-dashed border-slate-200 rounded-2xl">
                    <span className="text-3xl mb-2">👨‍🏫</span>
                    <p className="font-bold text-slate-800 text-sm">Aucun coach trouvé dans les plannings</p>
                  </div>
                ) : (
                  <div className="rounded-2xl border border-slate-200/80 overflow-hidden shadow-2xs">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px]">
                            <th className="py-3.5 px-4">Entraîneur</th>
                            <th className="py-3.5 px-4 text-center">Volume Hebdo</th>
                            <th className="py-3.5 px-4 text-center">Total Heures Saison</th>
                            <th className="py-3.5 px-4 text-right">Budget Estimé</th>
                            <th className="py-3.5 px-4">Groupes Encadrés</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {[...resultat.coachsCout]
                            .sort((a, b) => b.coutTotal - a.coutTotal)
                            .map((coach) => {
                              const pct =
                                resultat.totaux.coutCoaching > 0
                                  ? (coach.coutTotal / resultat.totaux.coutCoaching) * 100
                                  : 0
                              return (
                                <tr key={coach.coachId} className="hover:bg-slate-50/80 transition-colors">
                                  <td className="py-3.5 px-4 font-bold text-slate-900 text-xs">
                                    {coach.coachNom}
                                  </td>
                                  <td className="py-3.5 px-4 text-center font-semibold text-slate-800">
                                    <span className="font-extrabold text-slate-900">
                                      {formatHeuresDuree(coach.heuresParSemaine)}
                                    </span>
                                    <span className="text-[10px] text-slate-400 block">
                                      ({coach.heuresParSemaine.toFixed(2)} h/sem)
                                    </span>
                                  </td>
                                  <td className="py-3.5 px-4 text-center font-bold text-slate-900">
                                    {coach.totalHeures.toFixed(1)} h
                                  </td>
                                  <td className="py-3.5 px-4 text-right">
                                    <div className="font-black text-slate-900 text-xs">
                                      {fmt(coach.coutTotal)} €
                                    </div>
                                    <div className="text-[10px] text-slate-400 font-medium">
                                      {pct.toFixed(1)}% du budget coaching
                                    </div>
                                    <div className="w-full bg-slate-100 rounded-full h-1 mt-1">
                                      <div
                                        className="bg-slate-900 h-1 rounded-full"
                                        style={{ width: `${pct}%` }}
                                      />
                                    </div>
                                  </td>
                                  <td className="py-3.5 px-4">
                                    <div className="flex flex-wrap gap-1">
                                      {coach.groupes.map((g, i) => (
                                        <span
                                          key={i}
                                          className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full text-[10px] font-semibold"
                                        >
                                          {g}
                                        </span>
                                      ))}
                                    </div>
                                  </td>
                                </tr>
                              )
                            })}
                          <tr className="bg-slate-100 font-black border-t-2 border-slate-300 text-xs">
                            <td className="py-4 px-4 text-slate-900 uppercase">TOTAL COACHS</td>
                            <td className="py-4 px-4 text-center text-slate-900">
                              {fmtD(resultat.coachsCout.reduce((s, c) => s + c.heuresParSemaine, 0))} h/sem
                            </td>
                            <td className="py-4 px-4 text-center text-slate-900">
                              {fmtD(resultat.coachsCout.reduce((s, c) => s + c.totalHeures, 0))} h
                            </td>
                            <td className="py-4 px-4 text-right text-slate-900 text-sm">
                              {fmt(resultat.totaux.coutCoaching)} €
                            </td>
                            <td />
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ══ VUE 3 : ALERTES & DIAGNOSTICS ═════════════════════════════ */}
            {viewMode === 'alertes' && (
              <div className="space-y-6">
                <div className="text-xs font-extrabold text-slate-500 uppercase tracking-wider">
                  Diagnostics &amp; Recommandations d&apos;Équilibre
                </div>

                {nbAlertesTotal === 0 ? (
                  <div className="text-center py-12 px-4 bg-emerald-50/50 border border-emerald-200/60 rounded-2xl">
                    <span className="text-3xl mb-2">🎉</span>
                    <p className="font-bold text-emerald-900 text-sm">
                      Tous les groupes sont rentables et équilibrés !
                    </p>
                    <p className="text-xs text-emerald-700/80 mt-1">
                      Aucun déficit ni sous-remplissage critique détecté sur la configuration actuelle.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Alertes Globales */}
                    {(resultat.alertesGlobales?.length ?? 0) > 0 && (
                      <div className="space-y-2">
                        {resultat.alertesGlobales.map((a, i) => {
                          const cfg = ALERTE_CFG[a.type]
                          return (
                            <div
                              key={i}
                              className={`flex items-center gap-2.5 px-4 py-3 rounded-xl border text-xs font-bold shadow-2xs ${cfg.bg} ${cfg.border} ${cfg.text}`}
                            >
                              <span>{cfg.dot}</span>
                              <span>{a.message}</span>
                            </div>
                          )
                        })}
                      </div>
                    )}

                    {/* Alertes par Groupe */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {resultat.groupes
                        .filter(
                          (g) =>
                            (g.alertes?.filter((a) => a.code !== 'DATE_GROUPE').length ?? 0) > 0
                        )
                        .sort((a, b) => {
                          const da = a.alertes.some((al) => al.type === 'danger') ? 0 : 1
                          const db = b.alertes.some((al) => al.type === 'danger') ? 0 : 1
                          return da - db || a.groupeNom.localeCompare(b.groupeNom)
                        })
                        .map((groupe) => (
                          <div
                            key={groupe.groupeId}
                            className="border border-slate-200/80 rounded-2xl p-4 bg-white shadow-2xs space-y-2"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-sm text-slate-900">{groupe.groupeNom}</span>
                              <span className="text-xs font-semibold text-slate-500">
                                {groupe.inscrits} / {groupe.placesTotal} inscrits
                              </span>
                            </div>
                            <div className="space-y-1.5">
                              {groupe.alertes
                                .filter((a) => a.code !== 'DATE_GROUPE')
                                .map((a, i) => {
                                  const cfg = ALERTE_CFG[a.type]
                                  return (
                                    <div
                                      key={i}
                                      className={`text-xs px-3 py-2 rounded-xl border font-semibold ${cfg.bg} ${cfg.border} ${cfg.text}`}
                                    >
                                      {cfg.dot} {a.message}
                                    </div>
                                  )
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
        </div>
      )}
    </div>
  )
}
