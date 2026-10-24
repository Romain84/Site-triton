'use client'

import { useEffect, useState } from 'react'
import {
  Trophy,
  MapPin,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Navigation,
  Loader2,
  X,
  CalendarDays,
} from 'lucide-react'
import { toast } from 'react-hot-toast'
import {
  matchPiscineFrequente,
  isVaucluseLieu,
  getDefaultPiscinesFrequentes,
} from '@/lib/competition-distance'
import { CalendarEventItem, AdminPiscineItem, LigneFacture } from './types'

export interface ModalCompetitionPayload {
  typeCompetition: 'departementale' | 'regionale'
  format: 'demi_journee' | 'journee'
  nomCompetition: string
  lieu: string
  date: string
  distanceKm: number
}

interface ModalCompetitionProps {
  isOpen: boolean
  onClose: () => void
  selectedMois: number
  selectedAnnee: number
  existingCompetitions?: LigneFacture[]
  onSubmit: (payload: ModalCompetitionPayload | ModalCompetitionPayload[]) => Promise<boolean | void>
  isSubmitting: boolean
}

interface MultiDayOption {
  date: string
  label: string
}

function getDaysBetween(dateStartStr: string, dateEndStr?: string | null): MultiDayOption[] {
  if (!dateEndStr) return []
  const start = new Date(dateStartStr)
  const end = new Date(dateEndStr)
  if (isNaN(start.getTime()) || isNaN(end.getTime()) || start >= end) {
    return []
  }

  const days: MultiDayOption[] = []
  const current = new Date(start)
  while (current <= end && days.length < 7) {
    const iso = current.toISOString().substring(0, 10)
    const formatted = current.toLocaleDateString('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    })
    const label = formatted.charAt(0).toUpperCase() + formatted.slice(1)
    days.push({ date: iso, label })
    current.setDate(current.getDate() + 1)
  }
  return days
}

function checkEventAlreadyDeclared(
  ev: CalendarEventItem,
  existingList: LigneFacture[] = []
): boolean {
  if (!existingList || existingList.length === 0) return false

  const evDateStr =
    typeof ev.date === 'string'
      ? ev.date.substring(0, 10)
      : new Date(ev.date).toISOString().substring(0, 10)
  const evDateFinStr = ev.dateFin
    ? typeof ev.dateFin === 'string'
      ? ev.dateFin.substring(0, 10)
      : new Date(ev.dateFin).toISOString().substring(0, 10)
    : null
  const evTitleLower = (ev.title || '').toLowerCase().trim()

  return existingList.some((line) => {
    const lineDesc = (line.description || '').toLowerCase()
    const lineDate = line.date
      ? typeof line.date === 'string'
        ? line.date.substring(0, 10)
        : new Date(line.date).toISOString().substring(0, 10)
      : ''

    const titleMatch =
      evTitleLower.length > 5 &&
      (lineDesc.includes(evTitleLower) || evTitleLower.includes(lineDesc))
    const dateMatch =
      lineDate &&
      (lineDate === evDateStr ||
        (evDateFinStr && lineDate >= evDateStr && lineDate <= evDateFinStr))

    return (
      titleMatch ||
      (dateMatch &&
        evTitleLower.split(' ').some((w) => w.length > 4 && lineDesc.includes(w)))
    )
  })
}

export default function ModalCompetition({
  isOpen,
  onClose,
  selectedMois,
  selectedAnnee,
  existingCompetitions = [],
  onSubmit,
  isSubmitting,
}: ModalCompetitionProps) {
  const [compType, setCompType] = useState<'departementale' | 'regionale'>('departementale')
  const [compFormat, setCompFormat] = useState<'demi_journee' | 'journee'>('demi_journee')
  const [compNom, setCompNom] = useState('')
  const [compLieu, setCompLieu] = useState('')
  const [compDate, setCompDate] = useState('')
  const [compDistanceKm, setCompDistanceKm] = useState<string>('0')

  const [calendarEvents, setCalendarEvents] = useState<CalendarEventItem[]>([])
  const [loadingEvents, setLoadingEvents] = useState(false)
  const [selectedEventChoice, setSelectedEventChoice] = useState<string>('')
  const [adminPiscines, setAdminPiscines] = useState<AdminPiscineItem[]>(() =>
    getDefaultPiscinesFrequentes()
  )
  const [selectedPiscinePreset, setSelectedPiscinePreset] = useState<string>('')
  const [calculatingRoute, setCalculatingRoute] = useState(false)

  // Gestion multi-jours (Week-end)
  const [isMultiDay, setIsMultiDay] = useState(false)
  const [availableDays, setAvailableDays] = useState<MultiDayOption[]>([])
  const [multiDayMode, setMultiDayMode] = useState<'single' | 'both'>('single')
  const [day1Format, setDay1Format] = useState<'demi_journee' | 'journee'>('demi_journee')
  const [day2Format, setDay2Format] = useState<'demi_journee' | 'journee'>('journee')
  const [regionalTransportTrips, setRegionalTransportTrips] = useState<number>(1)

  // Initialisation et chargement des événements dès l'ouverture
  useEffect(() => {
    if (!isOpen) return

    setCompNom('')
    setCompLieu('')
    setCompType('departementale')
    setCompFormat('demi_journee')
    setCompDistanceKm('0')
    setSelectedEventChoice('')
    setSelectedPiscinePreset('')
    setIsMultiDay(false)
    setAvailableDays([])
    setMultiDayMode('single')
    setDay1Format('demi_journee')
    setDay2Format('journee')
    setRegionalTransportTrips(1)

    const today = new Date()
    const currentMonthNum = today.getMonth() + 1
    const currentYearNum = today.getFullYear()
    const dayStr =
      currentMonthNum === selectedMois && currentYearNum === selectedAnnee
        ? today.getDate().toString().padStart(2, '0')
        : '01'
    setCompDate(`${selectedAnnee}-${selectedMois.toString().padStart(2, '0')}-${dayStr}`)

    // 1. Événements calendrier
    setLoadingEvents(true)
    fetch(`/api/coach/evenements?mois=${selectedMois}&annee=${selectedAnnee}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.evenements) setCalendarEvents(data.evenements)
      })
      .catch(() => {})
      .finally(() => setLoadingEvents(false))

    // 2. Bassins fréquents
    fetch('/api/coach/facturation/calculer-distance')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.piscines && Array.isArray(data.piscines)) {
          setAdminPiscines(data.piscines)
        }
      })
      .catch(() => {})
  }, [isOpen, selectedMois, selectedAnnee])

  if (!isOpen) return null

  const selectedEvent = calendarEvents.find((e) => e.id === selectedEventChoice)
  const isSelectedEventDeclared = Boolean(
    selectedEventChoice &&
      selectedEventChoice !== 'manual' &&
      selectedEvent &&
      checkEventAlreadyDeclared(selectedEvent, existingCompetitions)
  )

  const handleSelectEvent = (choice: string) => {
    setSelectedEventChoice(choice)
    if (!choice || choice === 'manual') {
      setIsMultiDay(false)
      setAvailableDays([])
      setMultiDayMode('single')
      if (choice === 'manual') return
      setCompNom('')
      return
    }

    const ev = calendarEvents.find((e) => e.id === choice)
    if (!ev) return

    setCompNom(ev.title)

    // Détection multi-jours
    const days = getDaysBetween(ev.date, ev.dateFin)
    if (days.length >= 2) {
      setIsMultiDay(true)
      setAvailableDays(days)
      setMultiDayMode('single')
      setCompDate(days[0].date)
      setDay1Format('demi_journee')
      setDay2Format('journee')
    } else {
      setIsMultiDay(false)
      setAvailableDays([])
      setMultiDayMode('single')
      if (ev.date) {
        const dateStr =
          typeof ev.date === 'string'
            ? ev.date.substring(0, 10)
            : new Date(ev.date).toISOString().substring(0, 10)
        setCompDate(dateStr)
      }
    }

    const poolsToSearch =
      adminPiscines.length > 0 ? adminPiscines : getDefaultPiscinesFrequentes()
    let isReg = false
    if (ev.lieu) {
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
    const poolsToSearch =
      adminPiscines.length > 0 ? adminPiscines : getDefaultPiscinesFrequentes()
    if (level === 'departementale') {
      setCompDistanceKm('0')
      setCompLieu('')
      setSelectedPiscinePreset('')
    } else {
      if (compLieu) {
        const match = matchPiscineFrequente(compLieu, poolsToSearch)
        if (match) {
          setSelectedPiscinePreset(match.id)
          setCompLieu(match.nom)
          setCompDistanceKm(match.distanceKm.toString())
        }
      } else if (poolsToSearch.length > 0 && (!compDistanceKm || compDistanceKm === '0')) {
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
        toast.error(
          d.error ||
            'Impossible de calculer la distance automatiquement. Veuillez indiquer les km manuellement.'
        )
      }
    } catch {
      toast.error('Erreur lors du calcul de distance routière')
    } finally {
      setCalculatingRoute(false)
    }
  }

  const distanceNum = compType === 'regionale' ? parseFloat(compDistanceKm) || 0 : 0
  const transportUnitaire = distanceNum * 0.3

  const totalCalculé =
    isMultiDay && multiDayMode === 'both'
      ? (day1Format === 'journee' ? 130 : 50) +
        (day2Format === 'journee' ? 130 : 50) +
        (compType === 'regionale' ? transportUnitaire * regionalTransportTrips : 0)
      : (compFormat === 'journee' ? 130 : 50) +
        (compType === 'regionale' ? transportUnitaire : 0)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!compNom.trim()) {
      toast.error('Veuillez choisir une compétition dans la liste ou renseigner un titre en saisie manuelle.')
      return
    }

    if (compType === 'regionale') {
      if (!compLieu.trim()) {
        toast.error('Veuillez renseigner le bassin de compétition pour une compétition régionale.')
        return
      }
      if (distanceNum <= 0) {
        toast.error(
          'Veuillez indiquer la distance aller en km (ou choisir une piscine) pour que le trajet soit pris en compte.'
        )
        return
      }
    }

    const lieuFinal = compType === 'regionale' ? compLieu.trim() : 'Vaucluse (84)'

    // Cas multi-jours complet (2 jours)
    if (isMultiDay && multiDayMode === 'both' && availableDays.length >= 2) {
      const payload1: ModalCompetitionPayload = {
        typeCompetition: compType,
        format: day1Format,
        nomCompetition: `${compNom.trim()} (${availableDays[0].label.split(' ')[0]})`,
        lieu: lieuFinal,
        date: availableDays[0].date,
        distanceKm: distanceNum,
      }

      const payload2: ModalCompetitionPayload = {
        typeCompetition: compType,
        format: day2Format,
        nomCompetition: `${compNom.trim()} (${availableDays[1].label.split(' ')[0]})`,
        lieu: lieuFinal,
        date: availableDays[1].date,
        distanceKm: regionalTransportTrips === 2 ? distanceNum : 0,
      }

      await onSubmit([payload1, payload2])
      return
    }

    if (!compDate) {
      toast.error('Veuillez renseigner la date de la compétition.')
      return
    }

    await onSubmit({
      typeCompetition: compType,
      format: compFormat,
      nomCompetition: compNom.trim(),
      lieu: lieuFinal,
      date: compDate,
      distanceKm: distanceNum,
    })
  }

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-xl w-full shadow-2xl space-y-5 my-8 border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600 shrink-0">
              <Trophy className="w-5 h-5 text-amber-600" />
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
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
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
                    ? 'border-cyan-600 bg-cyan-50/50 ring-1 ring-cyan-600 text-slate-950 shadow-xs'
                    : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-800'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black">Départementale</span>
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                      compType === 'departementale'
                        ? 'bg-cyan-600 text-white'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    Vaucluse (84)
                  </span>
                </div>
                <p className="text-[11px] mt-1 text-slate-600">
                  Demi-j. 50 € · Journée 130 €
                  <br />
                  <span className="text-slate-400 font-medium">Sans forfait transport</span>
                </p>
              </button>

              <button
                type="button"
                onClick={() => handleSelectLevel('regionale')}
                className={`p-3.5 rounded-2xl border text-left transition-all ${
                  compType === 'regionale'
                    ? 'border-cyan-600 bg-cyan-50/50 ring-1 ring-cyan-600 text-slate-950 shadow-xs'
                    : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-800'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black">Régionale</span>
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                      compType === 'regionale'
                        ? 'bg-cyan-600 text-white'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    Hors 84
                  </span>
                </div>
                <p className="text-[11px] mt-1 text-slate-600">
                  Demi-j. 50 € · Journée 130 €
                  <br />
                  <span className="text-emerald-700 font-bold">
                    + Forfait transport (0,30 €/km aller)
                  </span>
                </p>
              </button>
            </div>
          </div>

          {/* 2. NOM DE LA COMPÉTITION & SÉLECTION CALENDRIER */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-black text-slate-800">
                Nom de la compétition *
              </label>
              <span className="text-[10px] text-slate-400">
                {loadingEvents
                  ? 'Recherche des événements...'
                  : `${calendarEvents.length} événement(s) trouvé(s)`}
              </span>
            </div>

            <select
              value={selectedEventChoice}
              onChange={(e) => handleSelectEvent(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-900 focus:bg-white focus:border-cyan-600 focus:outline-none transition-all"
            >
              <option value="">Choix de la compétition ou autre</option>
              <option value="manual">✏️ Saisie manuelle</option>
              {calendarEvents.length > 0 && (
                <optgroup label="Événements du club (m-1, m, m+1)">
                  {calendarEvents.map((ev) => {
                    const isDeclared = checkEventAlreadyDeclared(ev, existingCompetitions)
                    const evDateStr = new Date(ev.date).toLocaleDateString('fr-FR', {
                      day: '2-digit',
                      month: '2-digit',
                    })
                    const evDateFinStr = ev.dateFin
                      ? ' - ' +
                        new Date(ev.dateFin).toLocaleDateString('fr-FR', {
                          day: '2-digit',
                          month: '2-digit',
                        })
                      : ''

                    return (
                      <option key={ev.id} value={ev.id}>
                        📅 {evDateStr}
                        {evDateFinStr} - {ev.title} {ev.lieu ? `(${ev.lieu})` : ''}{' '}
                        {isDeclared ? '⚠️ (Déjà sur votre facture)' : ''}
                      </option>
                    )
                  })}
                </optgroup>
              )}
            </select>

            {selectedEventChoice === 'manual' ? (
              <input
                type="text"
                required
                autoFocus
                placeholder="Ex: Trophée Départemental, Championnats Régionaux PACA..."
                value={compNom}
                onChange={(e) => setCompNom(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:bg-white focus:border-cyan-600 focus:outline-none"
              />
            ) : selectedEventChoice ? (
              <div className="flex items-center justify-between px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs">
                <span className="font-semibold text-slate-900 truncate">
                  {compNom || 'Compétition sélectionnée'}
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedEventChoice('manual')}
                  className="text-[11px] font-bold text-cyan-600 hover:underline shrink-0 ml-2 cursor-pointer"
                >
                  Modifier le titre
                </button>
              </div>
            ) : (
              <p className="text-[11px] text-slate-500 italic px-1">
                Choisissez une compétition officielle dans la liste ci-dessus ou optez pour la saisie manuelle.
              </p>
            )}

            {/* Avertissement préventif si doublon détecté */}
            {isSelectedEventDeclared && (
              <div className="flex items-start gap-2.5 p-3 rounded-2xl bg-amber-50 border border-amber-200/80 text-amber-900 text-xs animate-in fade-in duration-200">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <span className="font-bold block">Compétition déjà présente sur votre facture</span>
                  <p className="text-[11px] text-amber-800">
                    Une prestation pour cette compétition figure déjà sur votre facture de ce mois. Vous pouvez toutefois ajouter une autre journée ou session ci-dessous.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* 3. OPTION MULTI-JOURS (SI L'ÉVÉNEMENT DURE 2 JOURS OU PLUS) */}
          {isMultiDay && availableDays.length >= 2 && (
            <div className="p-3.5 rounded-2xl bg-cyan-50/60 border border-cyan-200/80 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-black text-cyan-950">
                  <CalendarDays className="w-4 h-4 text-cyan-600" />
                  <span>Compétition sur plusieurs jours ({availableDays.length} jours)</span>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-100 text-cyan-800">
                  Week-end
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setMultiDayMode('single')}
                  className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                    multiDayMode === 'single'
                      ? 'bg-white border-cyan-600 text-cyan-950 shadow-xs ring-1 ring-cyan-600'
                      : 'bg-white/60 border-slate-200 text-slate-600 hover:bg-white'
                  }`}
                >
                  <span className="text-xs font-bold block">Journée unique</span>
                  <span className="block text-[10px] text-slate-500">1 seul jour de présence</span>
                </button>

                <button
                  type="button"
                  onClick={() => setMultiDayMode('both')}
                  className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                    multiDayMode === 'both'
                      ? 'bg-white border-cyan-600 text-cyan-950 shadow-xs ring-1 ring-cyan-600'
                      : 'bg-white/60 border-slate-200 text-slate-600 hover:bg-white'
                  }`}
                >
                  <span className="text-xs font-bold block">Tout le week-end</span>
                  <span className="block text-[10px] text-slate-500">Les 2 jours complets / demi-j.</span>
                </button>
              </div>
            </div>
          )}

          {/* 4. CONFIGURATION DES FORMATS & JOURNÉES */}
          {isMultiDay && multiDayMode === 'both' && availableDays.length >= 2 ? (
            /* CONFIGURATION 2 JOURS EN PARALLÈLE */
            <div className="space-y-3">
              {/* Jour 1 */}
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-slate-900">
                    Jour 1 · {availableDays[0].label}
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono">
                    {availableDays[0].date}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setDay1Format('demi_journee')}
                    className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                      day1Format === 'demi_journee'
                        ? 'border-cyan-600 bg-white ring-1 ring-cyan-600 text-cyan-950 shadow-2xs'
                        : 'border-slate-200 bg-white/70 text-slate-600 hover:bg-white'
                    }`}
                  >
                    <span className="text-xs font-bold block">Demi-journée</span>
                    <span className="text-xs font-extrabold text-slate-900">50,00 €</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setDay1Format('journee')}
                    className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                      day1Format === 'journee'
                        ? 'border-cyan-600 bg-white ring-1 ring-cyan-600 text-cyan-950 shadow-2xs'
                        : 'border-slate-200 bg-white/70 text-slate-600 hover:bg-white'
                    }`}
                  >
                    <span className="text-xs font-bold block">Journée complète</span>
                    <span className="text-xs font-extrabold text-slate-900">130,00 €</span>
                  </button>
                </div>
              </div>

              {/* Jour 2 */}
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-slate-900">
                    Jour 2 · {availableDays[1].label}
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono">
                    {availableDays[1].date}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setDay2Format('demi_journee')}
                    className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                      day2Format === 'demi_journee'
                        ? 'border-cyan-600 bg-white ring-1 ring-cyan-600 text-cyan-950 shadow-2xs'
                        : 'border-slate-200 bg-white/70 text-slate-600 hover:bg-white'
                    }`}
                  >
                    <span className="text-xs font-bold block">Demi-journée</span>
                    <span className="text-xs font-extrabold text-slate-900">50,00 €</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setDay2Format('journee')}
                    className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                      day2Format === 'journee'
                        ? 'border-cyan-600 bg-white ring-1 ring-cyan-600 text-cyan-950 shadow-2xs'
                        : 'border-slate-200 bg-white/70 text-slate-600 hover:bg-white'
                    }`}
                  >
                    <span className="text-xs font-bold block">Journée complète</span>
                    <span className="text-xs font-extrabold text-slate-900">130,00 €</span>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* CONFIGURATION FORMAT UNIQUE & DATE */
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-black text-slate-800">
                  Format de la prestation *
                </label>
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setCompFormat('demi_journee')}
                    className={`p-3 rounded-2xl border text-center transition-all cursor-pointer ${
                      compFormat === 'demi_journee'
                        ? 'border-cyan-600 bg-cyan-50/50 ring-1 ring-cyan-600 shadow-xs'
                        : 'border-slate-200 bg-white hover:bg-slate-50'
                    }`}
                  >
                    <span className="text-xs font-black block text-slate-900">Demi-journée</span>
                    <span
                      className={`text-sm font-extrabold ${
                        compFormat === 'demi_journee' ? 'text-cyan-700' : 'text-slate-600'
                      }`}
                    >
                      50,00 €
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setCompFormat('journee')}
                    className={`p-3 rounded-2xl border text-center transition-all cursor-pointer ${
                      compFormat === 'journee'
                        ? 'border-cyan-600 bg-cyan-50/50 ring-1 ring-cyan-600 shadow-xs'
                        : 'border-slate-200 bg-white hover:bg-slate-50'
                    }`}
                  >
                    <span className="text-xs font-black block text-slate-900">Journée complète</span>
                    <span
                      className={`text-sm font-extrabold ${
                        compFormat === 'journee' ? 'text-cyan-700' : 'text-slate-600'
                      }`}
                    >
                      130,00 €
                    </span>
                  </button>
                </div>
              </div>

              {/* DATE DE LA COMPÉTITION */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-black text-slate-800">Date *</label>
                  {selectedEventChoice && selectedEventChoice !== 'manual' && (
                    <span className="text-[10px] font-black text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 inline-flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                      <span>Synchronisation automatique</span>
                    </span>
                  )}
                </div>

                {isMultiDay && availableDays.length >= 2 ? (
                  <select
                    value={compDate}
                    onChange={(e) => setCompDate(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-900 focus:bg-white focus:border-cyan-600 focus:outline-none"
                  >
                    {availableDays.map((d) => (
                      <option key={d.date} value={d.date}>
                        📅 {d.label} ({new Date(d.date).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })})
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="date"
                    required
                    value={compDate}
                    onChange={(e) => setCompDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-900 focus:bg-white focus:border-cyan-600 focus:outline-none"
                  />
                )}
              </div>
            </div>
          )}

          {/* 5. LIEU & DISTANCE (RÉGIONALE UNIQUEMENT) */}
          {compType === 'regionale' && (
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-cyan-600" />
                    <span>Piscine / Bassin de compétition (Hors 84) *</span>
                  </label>
                  <span className="text-[10px] text-slate-500 font-medium">Départ : Cavaillon</span>
                </div>

                {adminPiscines.length > 0 && (
                  <select
                    value={selectedPiscinePreset}
                    onChange={(e) => {
                      const val = e.target.value
                      setSelectedPiscinePreset(val)
                      const pools =
                        adminPiscines.length > 0 ? adminPiscines : getDefaultPiscinesFrequentes()
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
                    className="w-full px-3 py-2.5 rounded-xl bg-white border border-slate-200 text-xs font-semibold text-slate-900 focus:border-cyan-600 focus:outline-none transition-all"
                  >
                    <option value="">Sélectionner un bassin fréquent...</option>
                    {adminPiscines.map((p) => (
                      <option key={p.id} value={p.id}>
                        🏊 {p.nom} ({p.distanceKm} km aller)
                      </option>
                    ))}
                    <option value="custom">✏️ Autre bassin / Saisie personnalisée</option>
                  </select>
                )}

                {(selectedPiscinePreset === 'custom' ||
                  !selectedPiscinePreset ||
                  adminPiscines.length === 0) && (
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
                          const pools =
                            adminPiscines.length > 0
                              ? adminPiscines
                              : getDefaultPiscinesFrequentes()
                          const match = matchPiscineFrequente(val, pools)
                          if (match) {
                            setCompDistanceKm(match.distanceKm.toString())
                          }
                        }}
                        className="flex-1 px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs font-medium text-slate-900 focus:border-cyan-600 focus:outline-none"
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
                    className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs font-black text-slate-900 focus:border-cyan-600 focus:outline-none"
                  />
                </div>

                <div className="p-2.5 rounded-xl bg-white border border-emerald-200/80 shadow-2xs">
                  <span className="text-[10px] text-slate-500 font-bold block">
                    Forfait transport (base 1 trajet aller)
                  </span>
                  <p className="text-xs font-mono font-black text-emerald-700">
                    {parseFloat(compDistanceKm) || 0} km × 0,30 € ={' '}
                    {((parseFloat(compDistanceKm) || 0) * 0.3).toFixed(2)} €
                  </p>
                </div>
              </div>

              {/* Option transport spécifique pour week-end 2 jours */}
              {isMultiDay && multiDayMode === 'both' && (
                <div className="p-3 rounded-xl bg-white border border-cyan-100 space-y-2 mt-2">
                  <span className="text-[11px] font-bold text-slate-800 block">
                    Option de trajet pour le week-end :
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setRegionalTransportTrips(1)}
                      className={`p-2 rounded-xl border text-left transition-all cursor-pointer ${
                        regionalTransportTrips === 1
                          ? 'border-cyan-600 bg-cyan-50/50 text-cyan-950 font-bold ring-1 ring-cyan-600'
                          : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <span className="text-xs block">1 aller-retour week-end</span>
                      <span className="text-[10px] text-slate-500 font-normal">
                        Hébergement sur place ou 1 seul trajet ({((parseFloat(compDistanceKm) || 0) * 0.3).toFixed(2)} €)
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setRegionalTransportTrips(2)}
                      className={`p-2 rounded-xl border text-left transition-all cursor-pointer ${
                        regionalTransportTrips === 2
                          ? 'border-cyan-600 bg-cyan-50/50 text-cyan-950 font-bold ring-1 ring-cyan-600'
                          : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <span className="text-xs block">2 allers-retours</span>
                      <span className="text-[10px] text-slate-500 font-normal">
                        Aller-retour chaque jour ({(((parseFloat(compDistanceKm) || 0) * 0.3) * 2).toFixed(2)} €)
                      </span>
                    </button>
                  </div>
                </div>
              )}

              {(!compDistanceKm || parseFloat(compDistanceKm) <= 0) && (
                <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-[11px] text-amber-800 flex items-center gap-2">
                  <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                  <span>
                    Indiquez la distance aller (en km) ou choisissez une piscine pour que le forfait
                    transport soit calculé.
                  </span>
                </div>
              )}

              <div className="pt-1 flex items-center justify-between text-[11px]">
                <span className="text-slate-400 text-[10px]">
                  Départ : Piscine Alphonse Roudière, Cavaillon
                </span>
                <a
                  href={`https://www.google.com/maps/dir/?api=1&origin=Piscine+Alphonse+Roudi%C3%A8re,+84300+Cavaillon&destination=${encodeURIComponent(
                    compLieu || 'PACA'
                  )}&travelmode=driving`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-slate-600 hover:text-cyan-700 font-bold underline transition-colors"
                >
                  <span>Vérifier sur Google Maps</span>
                  <ExternalLink className="w-2.5 h-2.5 text-slate-400" />
                </a>
              </div>
            </div>
          )}

          {/* 6. RÉCAPITULATIF LIVE */}
          <div className="p-4 rounded-2xl bg-slate-950 text-white space-y-2">
            {isMultiDay && multiDayMode === 'both' ? (
              <>
                <div className="flex items-center justify-between text-xs text-slate-300">
                  <span>
                    Jour 1 ({availableDays[0]?.label.split(' ')[0]}) :{' '}
                    {day1Format === 'journee' ? 'Journée complète' : 'Demi-journée'}
                  </span>
                  <span className="font-bold text-white font-mono">
                    {day1Format === 'journee' ? '130,00 €' : '50,00 €'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs text-slate-300">
                  <span>
                    Jour 2 ({availableDays[1]?.label.split(' ')[0]}) :{' '}
                    {day2Format === 'journee' ? 'Journée complète' : 'Demi-journée'}
                  </span>
                  <span className="font-bold text-white font-mono">
                    {day2Format === 'journee' ? '130,00 €' : '50,00 €'}
                  </span>
                </div>
              </>
            ) : (
              <div className="flex items-center justify-between text-xs text-slate-300">
                <span>
                  Forfait compétition ({compFormat === 'journee' ? 'Journée complète' : 'Demi-journée'})
                </span>
                <span className="font-bold text-white font-mono">
                  {compFormat === 'journee' ? '130,00 €' : '50,00 €'}
                </span>
              </div>
            )}

            {compType === 'regionale' && (
              <div className="flex items-center justify-between text-xs text-slate-300">
                <span>
                  Forfait transport ({parseFloat(compDistanceKm) || 0} km × 0,30 €
                  {isMultiDay && multiDayMode === 'both' && regionalTransportTrips === 2 ? ' × 2 allers-retours' : ''})
                </span>
                <span className="font-bold text-emerald-400 font-mono">
                  + {((parseFloat(compDistanceKm) || 0) * 0.3 * (isMultiDay && multiDayMode === 'both' ? regionalTransportTrips : 1)).toFixed(2)} €
                </span>
              </div>
            )}

            <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
              <span className="text-xs font-black text-slate-200">
                Total ajouté à votre facture
              </span>
              <span className="text-base sm:text-lg font-black text-emerald-400 font-mono">
                {totalCalculé.toFixed(2)} €
              </span>
            </div>
          </div>

          {/* 7. ACTIONS FOOTER */}
          <div className="pt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={
                isSubmitting ||
                !compNom.trim() ||
                (!isMultiDay && !compDate) ||
                (isMultiDay && multiDayMode === 'single' && !compDate) ||
                (compType === 'regionale' &&
                  (!compDistanceKm || parseFloat(compDistanceKm) <= 0))
              }
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white text-xs font-black disabled:opacity-50 shadow-xs transition-all cursor-pointer"
            >
              {isSubmitting ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Trophy className="w-3.5 h-3.5" />
              )}
              <span>
                {isMultiDay && multiDayMode === 'both'
                  ? `Ajouter les 2 journées (${totalCalculé.toFixed(2)} €)`
                  : 'Ajouter à ma facture'}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
