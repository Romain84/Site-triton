'use client'

import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { 
  Calendar, 
  Clock, 
  MapPin, 
  User, 
  Users, 
  Check, 
  Search, 
  ArrowLeft, 
  CheckCircle2, 
  AlertCircle, 
  Phone, 
  Waves, 
  Printer,
  RefreshCw,
  XCircle,
  ShieldCheck,
  Edit3,
  Lock,
  KeyRound,
  Eye,
  EyeOff
} from 'lucide-react'
import toast from 'react-hot-toast'
import { formatLongDateFr, formatWeekdayLongDateFr } from '@/lib/date'

interface CreneauItem {
  id: string
  heureDebut: string
  heureFin: string
  capacite: number
  nbInscrits: number
  placesRestantes: number
  estComplet: boolean
  isCurrent?: boolean
}

interface SessionItem {
  id: string
  titre: string
  description: string | null
  lieu: string
  date: string
  heureDebut: string
  heureFin: string
  dureeMinutes: number
  capaciteParCreneau: number
  consignes: string | null
  creneaux: CreneauItem[]
}

interface CandidatItem {
  id: string
  nom: string
  prenom: string
  age: number | null
  dateNaissance: string | null
  emailParentMasque?: string | null
  groupeRecommande?: string | null
}

interface ManageReservationData {
  inscription: {
    id: string
    nomEnfant: string
    prenomEnfant: string
    nomParent: string | null
    emailParent: string
    telephoneParent: string
    statut: string
    token: string
    remarques: string | null
  }
  creneau: {
    id: string
    heureDebut: string
    heureFin: string
  }
  session: {
    id: string
    titre: string
    date: string
    lieu: string
    dureeMinutes: number
    consignes: string | null
    creneaux: CreneauItem[]
  }
}

export default function TestNageBooking() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const tokenParam = searchParams.get('token')

  const [sessions, setSessions] = useState<SessionItem[]>([])
  const [candidats, setCandidats] = useState<CandidatItem[]>([])
  const [loading, setLoading] = useState(true)

  // Mode Gestion de réservation (si token présent)
  const [manageData, setManageData] = useState<ManageReservationData | null>(null)
  const [manageLoading, setManageLoading] = useState(false)
  const [isChangingSlot, setIsChangingSlot] = useState(false)
  const [isCancelling, setIsCancelling] = useState(false)
  const [cancelMotif, setCancelMotif] = useState('')
  const [actionLoading, setActionLoading] = useState(false)

  // Navigation steps: 1 = Choix créneau, 2 = Formulaire, 3 = Confirmation
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [selectedSessionId, setSelectedSessionId] = useState<string>('')
  const [selectedCreneau, setSelectedCreneau] = useState<CreneauItem | null>(null)

  // Suggestions directes dans les champs nom & prénom
  const [selectedCandidat, setSelectedCandidat] = useState<CandidatItem | null>(null)
  const [showNomSuggestions, setShowNomSuggestions] = useState(false)
  const [showPrenomSuggestions, setShowPrenomSuggestions] = useState(false)

  // Champs du formulaire
  const [nomEnfant, setNomEnfant] = useState('')
  const [prenomEnfant, setPrenomEnfant] = useState('')
  const [nomParent, setNomParent] = useState('')
  const [emailParent, setEmailParent] = useState('')
  const [telephoneParent, setTelephoneParent] = useState('')
  const [remarques, setRemarques] = useState('')
  const [showOptionalFields, setShowOptionalFields] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [bookingError, setBookingError] = useState<string | null>(null)

  // Données de confirmation
  const [confirmationData, setConfirmationData] = useState<{
    id: string
    nomEnfant: string
    prenomEnfant: string
    date: string
    heureDebut: string
    heureFin: string
    lieu: string
    consignes: string | null
  } | null>(null)

  // Gestion du verrouillage et mot de passe d'accès
  const [isOpen, setIsOpen] = useState(true)
  const [codeRequired, setCodeRequired] = useState(false)
  const [isCodeValid, setIsCodeValid] = useState(true)
  const [closedMessage, setClosedMessage] = useState('')
  const [accessCode, setAccessCode] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return sessionStorage.getItem('triton_tests_code') || searchParams.get('code') || ''
    }
    return ''
  })
  const [inputCode, setInputCode] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [verifyingCode, setVerifyingCode] = useState(false)
  const [showCodePromptForClosed, setShowCodePromptForClosed] = useState(false)

  // 1. Récupération des données publiques
  const fetchPublicData = async (codeToTry?: string) => {
    setLoading(true)
    const code = codeToTry !== undefined ? codeToTry : accessCode
    try {
      const url = new URL('/api/tests-nage', window.location.origin)
      if (code) url.searchParams.set('code', code)
      if (tokenParam) url.searchParams.set('token', tokenParam)
      const cid = searchParams.get('c') || searchParams.get('candidatId')
      if (cid) url.searchParams.set('c', cid)

      const res = await fetch(url.toString(), {
        headers: code ? { 'x-tests-code': code } : {},
      })
      const data = await res.json()

      if (res.ok) {
        setIsOpen(data.ouvert !== false)
        const isProtected = Boolean(data.codeRequis)
        setCodeRequired(isProtected)
        setIsCodeValid(Boolean(data.codeValide))
        if (data.message) setClosedMessage(data.message)

        if (data.sessions && data.codeValide) {
          setSessions(data.sessions)
          setCandidats(data.candidats || [])
          if (data.sessions.length > 0 && !selectedSessionId) {
            setSelectedSessionId(data.sessions[0].id)
          }
          if (isProtected && code) {
            sessionStorage.setItem('triton_tests_code', code)
            setAccessCode(code)
          } else if (!isProtected) {
            sessionStorage.removeItem('triton_tests_code')
            setAccessCode('')
          }
        } else if (!isProtected) {
          sessionStorage.removeItem('triton_tests_code')
          setAccessCode('')
        }
      }
    } catch (err) {
      console.error('Erreur chargement tests-nage:', err)
      toast.error('Impossible de charger les créneaux disponibles')
    } finally {
      setLoading(false)
    }
  }

  // Validation manuelle du mot de passe
  const handleValidateCode = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!inputCode.trim()) {
      return toast.error('Veuillez saisir le mot de passe d\'accès')
    }
    setVerifyingCode(true)
    try {
      const cleanCode = inputCode.trim()
      const url = new URL('/api/tests-nage', window.location.origin)
      url.searchParams.set('code', cleanCode)

      const res = await fetch(url.toString(), {
        headers: { 'x-tests-code': cleanCode },
      })
      const data = await res.json()

      if (res.ok && data.codeValide && data.sessions) {
        toast.success('Code d\'accès validé !')
        setAccessCode(cleanCode)
        sessionStorage.setItem('triton_tests_code', cleanCode)
        setIsCodeValid(true)
        setIsOpen(true)
        setSessions(data.sessions)
        setCandidats(data.candidats || [])
        if (data.sessions.length > 0 && !selectedSessionId) {
          setSelectedSessionId(data.sessions[0].id)
        }
      } else {
        toast.error(data.message || 'Mot de passe ou code d\'accès incorrect')
      }
    } catch {
      toast.error('Erreur de connexion lors de la vérification')
    } finally {
      setVerifyingCode(false)
    }
  }

  // 2. Récupération d'une réservation existante par token
  const fetchReservationByToken = async (token: string) => {
    setManageLoading(true)
    try {
      const res = await fetch(`/api/tests-nage/reservation?token=${token}`)
      const data = await res.json()
      if (res.ok && data.success && data.data) {
        setManageData(data.data)
      } else {
        toast.error(data.error || 'Réservation introuvable ou lien expiré')
        setManageData(null)
      }
    } catch {
      toast.error('Erreur lors de la récupération de votre réservation')
    } finally {
      setManageLoading(false)
    }
  }

  useEffect(() => {
    fetchPublicData()
    if (tokenParam) {
      fetchReservationByToken(tokenParam)
    }
  }, [tokenParam])

  // Reconnaissance immédiate si lien magique candidat (?c=... ou ?candidatId=...)
  useEffect(() => {
    const cid = searchParams.get('c') || searchParams.get('candidatId')
    if (cid && candidats.length > 0 && !selectedCandidat) {
      const match = candidats.find((c) => c.id === cid)
      if (match) {
        handleSelectCandidat(match)
      }
    }
  }, [searchParams, candidats, selectedCandidat])

  // Ouvrir automatiquement les champs optionnels si déjà renseignés
  useEffect(() => {
    if (nomParent || remarques) {
      setShowOptionalFields(true)
    }
  }, [nomParent, remarques])

  // Détection des créneaux passés (si la session a lieu aujourd'hui)
  const isCreneauPasse = useCallback((sessionDateStr?: string | Date | null, heureFinStr?: string | null) => {
    if (!sessionDateStr || !heureFinStr) return false
    const sessionDate = new Date(sessionDateStr)
    const now = new Date()
    const isToday =
      sessionDate.getFullYear() === now.getFullYear() &&
      sessionDate.getMonth() === now.getMonth() &&
      sessionDate.getDate() === now.getDate()

    if (isToday) {
      const [h, m] = heureFinStr.split(':').map(Number)
      const slotEndMinutes = h * 60 + m
      const nowMinutes = now.getHours() * 60 + now.getMinutes()
      return slotEndMinutes < nowMinutes
    }

    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
    const sessionStart = new Date(sessionDate.getFullYear(), sessionDate.getMonth(), sessionDate.getDate()).getTime()
    return sessionStart < todayStart
  }, [])

  const currentSession = useMemo(() => {
    return sessions.find((s) => s.id === selectedSessionId) || sessions[0] || null
  }, [sessions, selectedSessionId])

  const visibleCreneaux = useMemo(() => {
    if (!currentSession) return []
    return currentSession.creneaux.filter((cr) => !isCreneauPasse(currentSession.date, cr.heureFin))
  }, [currentSession, isCreneauPasse])

  // Suggestions directes basées sur le nom de l'enfant
  const nomSuggestions = useMemo(() => {
    const q = nomEnfant.trim().toLowerCase()
    if (!q || q.length < 2 || (selectedCandidat && selectedCandidat.nom.toLowerCase() === q)) return []
    return candidats.filter((c) => {
      const nom = c.nom.toLowerCase()
      const fullName = `${c.nom} ${c.prenom}`.toLowerCase()
      return nom.includes(q) || fullName.includes(q)
    }).slice(0, 6)
  }, [nomEnfant, candidats, selectedCandidat])

  // Suggestions directes basées sur le prénom de l'enfant
  const prenomSuggestions = useMemo(() => {
    const q = prenomEnfant.trim().toLowerCase()
    if (!q || q.length < 2 || (selectedCandidat && selectedCandidat.prenom.toLowerCase() === q)) return []
    return candidats.filter((c) => {
      const prenom = c.prenom.toLowerCase()
      const reverseName = `${c.prenom} ${c.nom}`.toLowerCase()
      return prenom.includes(q) || reverseName.includes(q)
    }).slice(0, 6)
  }, [prenomEnfant, candidats, selectedCandidat])

  // Sélection d'un candidat pré-enregistré : remplissage du nom/prénom et liaison du dossier
  const handleSelectCandidat = (c: CandidatItem) => {
    setSelectedCandidat(c)
    setNomEnfant(c.nom)
    setPrenomEnfant(c.prenom)
    setShowNomSuggestions(false)
    setShowPrenomSuggestions(false)
    toast.success(`Dossier de ${c.prenom} ${c.nom} reconnu !`, { icon: '✨' })
  }

  const handleClearSelectedCandidat = () => {
    setSelectedCandidat(null)
    setNomEnfant('')
    setPrenomEnfant('')
    setNomParent('')
    setEmailParent('')
    setTelephoneParent('')
  }

  const handleSelectCreneau = (cr: CreneauItem) => {
    if (cr.estComplet) return
    setSelectedCreneau(cr)
    setTimeout(() => {
      const formEl = document.getElementById('booking-form')
      if (formEl) {
        formEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
      }
    }, 60)
  }

  const handleSubmitReservation = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedCreneau) return toast.error('Veuillez sélectionner un créneau')
    if (!nomEnfant.trim()) return toast.error("Veuillez saisir le nom de l'enfant")
    if (!prenomEnfant.trim()) return toast.error("Veuillez saisir le prénom de l'enfant")
    if (!emailParent.trim()) {
      return toast.error("Veuillez saisir votre adresse email pour recevoir la confirmation")
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailParent.trim())) {
      return toast.error("L'adresse email n'est pas valide (ex: parent@exemple.fr)")
    }
    if (!telephoneParent.trim()) {
      return toast.error('Veuillez saisir un numéro de téléphone')
    }

    // Réconciliation automatique si le parent a saisi le nom sans cliquer sur le bouton
    const matchedCandidat = selectedCandidat || candidats.find(
      (c) => c.nom.trim().toLowerCase() === nomEnfant.trim().toLowerCase() &&
             c.prenom.trim().toLowerCase() === prenomEnfant.trim().toLowerCase()
    )

    setSubmitting(true)
    setBookingError(null)
    try {
      const res = await fetch('/api/tests-nage/reserver', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(accessCode ? { 'x-tests-code': accessCode } : {}),
        },
        body: JSON.stringify({
          creneauId: selectedCreneau.id,
          candidatId: matchedCandidat?.id || null,
          nomEnfant: nomEnfant.trim(),
          prenomEnfant: prenomEnfant.trim(),
          nomParent: nomParent.trim() || null,
          emailParent: emailParent.trim().toLowerCase(),
          telephoneParent: telephoneParent.trim(),
          remarques: remarques.trim() || null,
          code: accessCode || null,
        }),
      })

      const data = await res.json()
      if (res.ok && data.success) {
        setBookingError(null)
        setConfirmationData(data.data)
        setStep(3)
        window.scrollTo({ top: 0, behavior: 'smooth' })
        toast.success('Votre créneau est confirmé !')
      } else {
        const errMsg = data.error || "Une erreur est survenue lors de l'enregistrement"
        setBookingError(errMsg)
        toast.error(errMsg, { duration: 6000 })
        fetchPublicData()
      }
    } catch {
      toast.error('Erreur de connexion au serveur. Veuillez réessayer.')
    } finally {
      setSubmitting(false)
    }
  }

  // Action parent : Déplacer le créneau
  const handleChangeSlot = async (newCreneauId: string) => {
    if (!manageData || !tokenParam) return
    setActionLoading(true)
    try {
      const res = await fetch('/api/tests-nage/modifier', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: tokenParam,
          newCreneauId,
        }),
      })
      const data = await res.json()
      if (res.ok && data.success) {
        toast.success('Votre créneau a bien été modifié !')
        setIsChangingSlot(false)
        fetchReservationByToken(tokenParam)
      } else {
        toast.error(data.error || 'Impossible de modifier le créneau')
      }
    } catch {
      toast.error('Erreur de connexion au serveur')
    } finally {
      setActionLoading(false)
    }
  }

  // Action parent : Annuler la réservation
  const handleCancelBooking = async () => {
    if (!manageData || !tokenParam) return
    setActionLoading(true)
    try {
      const res = await fetch('/api/tests-nage/annuler', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: tokenParam,
          motif: cancelMotif.trim() || null,
        }),
      })
      const data = await res.json()
      if (res.ok && data.success) {
        toast.success('Votre réservation a bien été annulée.')
        setIsCancelling(false)
        fetchReservationByToken(tokenParam)
      } else {
        toast.error(data.error || "Impossible d'annuler la réservation")
      }
    } catch {
      toast.error('Erreur de connexion au serveur')
    } finally {
      setActionLoading(false)
    }
  }

  if (loading || manageLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        <p className="text-sm font-medium text-slate-500">Chargement en cours...</p>
      </div>
    )
  }

  // ─── VUE 1 : GESTION DE RÉSERVATION VIA TOKEN (MODIFIER / ANNULER) ───
  if (tokenParam && manageData) {
    const isCancelled = manageData.inscription.statut === 'annule'
    const dateStr = manageData.session.date.split('T')[0].replace(/-/g, '')
    const hDeb = manageData.creneau.heureDebut.replace(':', '') + '00'
    const hFin = manageData.creneau.heureFin.replace(':', '') + '00'
    const title = `Test de Nage - ${manageData.inscription.prenomEnfant} ${manageData.inscription.nomEnfant}`
    const desc = `Test individuel de natation au Triton Club Cavaillon.\nLieu : ${manageData.session.lieu}\nPrésentez-vous dans le hall d'entrée 5 minutes avant avec maillot, bonnet et lunettes.`
    const gcalUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(title)}&dates=${dateStr}T${hDeb}/${dateStr}T${hFin}&ctz=Europe/Paris&details=${encodeURIComponent(desc)}&location=${encodeURIComponent(manageData.session.lieu)}`

    return (
      <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 text-xs font-bold uppercase tracking-wider border border-emerald-200">
            <ShieldCheck className="w-3.5 h-3.5 text-primary" />
            <span>Gestion de votre rendez-vous</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-slate-900">
            Test de Nage & Niveau
          </h1>
        </div>

        {/* Fiche de réservation actuelle */}
        <div className="bg-white rounded-3xl p-6 md:p-8 border border-slate-200 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
            <div>
              <span className="text-xs font-bold text-slate-500 uppercase">Candidat :</span>
              <h2 className="text-xl md:text-2xl font-black text-slate-900">
                {manageData.inscription.prenomEnfant} {manageData.inscription.nomEnfant}
              </h2>
            </div>
            <div>
              {isCancelled ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-bold">
                  <XCircle className="w-4 h-4 text-red-600" />
                  Rendez-vous annulé
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  Créneau confirmé
                </span>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 p-5 rounded-2xl border border-slate-200/80 text-sm">
            <div className="space-y-1">
              <span className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-primary" /> Date :
              </span>
              <p className="font-bold text-slate-900">{formatLongDateFr(manageData.session.date)}</p>
            </div>

            <div className="space-y-1">
              <span className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-primary" /> Horaire précis :
              </span>
              <p className="font-black text-primary text-base">
                {manageData.creneau.heureDebut} à {manageData.creneau.heureFin} ({manageData.session.dureeMinutes} min)
              </p>
            </div>

            <div className="sm:col-span-2 p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-950 space-y-1">
              <div className="flex items-center gap-1.5 font-black text-xs uppercase tracking-wider text-amber-900">
                <MapPin className="w-4 h-4 text-amber-700 shrink-0" />
                <span>Lieu de rendez-vous :</span>
              </div>
              <p className="text-base font-black text-slate-950">
                {manageData.session.lieu}
              </p>
              <p className="text-xs text-amber-900/80 font-medium">
                Rendez-vous dans le hall d&apos;entrée 5 minutes avant l&apos;heure avec maillot, bonnet et lunettes.
              </p>
            </div>
          </div>

          {/* Boutons d'actions si réservation active */}
          {!isCancelled && !isChangingSlot && !isCancelling && (
            <div className="space-y-4 pt-2">
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  type="button"
                  onClick={() => setIsChangingSlot(true)}
                  className="flex-1 py-3 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs uppercase tracking-wider transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-xs"
                >
                  <RefreshCw className="w-4 h-4 text-emerald-400" />
                  Modifier mon horaire
                </button>

                <button
                  type="button"
                  onClick={() => setIsCancelling(true)}
                  className="flex-1 py-3 px-4 rounded-xl bg-red-50 hover:bg-red-100 border border-red-200 text-red-700 font-bold text-xs uppercase tracking-wider transition-colors flex items-center justify-center gap-2 cursor-pointer"
                >
                  <XCircle className="w-4 h-4 text-red-600" />
                  Annuler ce rendez-vous
                </button>
              </div>

              {/* Boutons Agenda */}
              <div className="flex flex-col sm:flex-row gap-2 pt-2 border-t border-slate-100">
                <a
                  href={gcalUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 py-2 px-3 rounded-xl bg-white border border-slate-200 text-slate-700 hover:text-slate-900 hover:bg-slate-50 font-bold text-xs text-center transition-colors flex items-center justify-center gap-1.5"
                >
                  <Calendar className="w-3.5 h-3.5 text-primary" />
                  <span>Google Agenda</span>
                </a>
                <a
                  href={`/api/tests-nage/ics?token=${manageData.inscription.token}`}
                  download
                  className="flex-1 py-2 px-3 rounded-xl bg-white border border-slate-200 text-slate-700 hover:text-slate-900 hover:bg-slate-50 font-bold text-xs text-center transition-colors flex items-center justify-center gap-1.5"
                >
                  <Calendar className="w-3.5 h-3.5 text-slate-500" />
                  <span>Apple / Outlook (.ics)</span>
                </a>
              </div>
            </div>
          )}

          {/* SÉLECTEUR DE NOUVEAU CRÉNEAU POUR MODIFICATION */}
          {isChangingSlot && (
            <div className="space-y-4 pt-2 border-t border-slate-100 animate-fade-in">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Edit3 className="w-4 h-4 text-primary" />
                  <span>Choisissez un nouvel horaire :</span>
                </h3>
                <button
                  type="button"
                  onClick={() => setIsChangingSlot(false)}
                  className="text-xs text-slate-500 hover:text-slate-800 font-bold cursor-pointer"
                >
                  Fermer
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
                {manageData.session.creneaux.map((cr) => {
                  const isSelected = cr.id === manageData.creneau.id
                  return (
                    <button
                      key={cr.id}
                      disabled={cr.estComplet && !isSelected || actionLoading}
                      onClick={() => !isSelected && handleChangeSlot(cr.id)}
                      className={`p-3 rounded-2xl border-2 transition-all text-center flex flex-col items-center justify-center space-y-1 relative overflow-hidden select-none ${
                        isSelected
                          ? 'bg-primary text-white border-primary cursor-default shadow-xs'
                          : cr.estComplet
                          ? 'bg-slate-100/90 border-slate-200 text-slate-400 cursor-not-allowed'
                          : 'bg-white border-slate-200 hover:border-primary hover:shadow-xs cursor-pointer group'
                      }`}
                    >
                      <span className={`text-sm font-black font-mono ${
                        isSelected ? 'text-white' : cr.estComplet ? 'text-slate-400/80' : 'text-slate-900 group-hover:text-primary'
                      }`}>
                        {cr.heureDebut}
                      </span>
                      {cr.estComplet && !isSelected ? (
                        <>
                          <span className="text-[9px] font-semibold text-slate-400">
                            0 place
                          </span>
                          {/* Tampon COMPLET officiel */}
                          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <span className="transform -rotate-12 px-2.5 py-0.5 border-2 border-red-600 bg-red-50/95 text-red-600 font-black text-[11px] tracking-widest uppercase rounded shadow-xs">
                              COMPLET
                            </span>
                          </div>
                        </>
                      ) : (
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                          isSelected
                            ? 'bg-white/20 text-white border-white/30'
                            : cr.placesRestantes === 1
                            ? 'bg-amber-50 text-amber-800 border-amber-200'
                            : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                        }`}>
                          {isSelected ? 'Actuel' : `${cr.placesRestantes} place(s)`}
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* CONFIRMATION D'ANNULATION */}
          {isCancelling && (
            <div className="space-y-4 pt-2 border-t border-slate-100 animate-fade-in bg-red-50/50 p-5 rounded-2xl border border-red-200">
              <h3 className="text-sm font-bold text-red-900 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-600" />
                <span>Êtes-vous sûr de vouloir annuler ce rendez-vous ?</span>
              </h3>
              <p className="text-xs text-red-700">
                Votre créneau sera immédiatement libéré pour une autre famille.
              </p>
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Motif d&apos;annulation (optionnel) :
                </label>
                <input
                  type="text"
                  value={cancelMotif}
                  onChange={(e) => setCancelMotif(e.target.value)}
                  placeholder="Ex: empêchement, changement de planning..."
                  className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-xs outline-none focus:border-red-500"
                />
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={handleCancelBooking}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs uppercase tracking-wider transition-colors cursor-pointer shadow-xs disabled:opacity-50"
                >
                  {actionLoading ? 'Annulation en cours...' : 'Confirmer l\'annulation'}
                </button>
                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={() => setIsCancelling(false)}
                  className="py-2.5 px-4 rounded-xl bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 font-bold text-xs uppercase tracking-wider transition-colors cursor-pointer"
                >
                  Conserver mon créneau
                </button>
              </div>
            </div>
          )}

          {/* Message si annulé */}
          {isCancelled && (
            <div className="text-center space-y-4 pt-2">
              <p className="text-xs text-slate-600">
                Vous avez libéré ce créneau. Si vous souhaitez choisir un nouvel horaire, vous pouvez réserver ci-dessous.
              </p>
              <button
                type="button"
                onClick={() => {
                  router.push('/tests-de-nage')
                  setManageData(null)
                }}
                className="py-3 px-6 rounded-xl bg-primary hover:bg-primary-dark text-white font-bold text-xs uppercase tracking-wider transition-colors cursor-pointer shadow-xs"
              >
                Réserver un nouveau créneau
              </button>
            </div>
          )}
        </div>

        {/* Bouton retour / inscrire un autre enfant */}
        <div className="text-center">
          <button
            type="button"
            onClick={() => {
              router.push('/tests-de-nage')
              setManageData(null)
            }}
            className="text-xs text-slate-500 hover:text-slate-800 font-bold underline cursor-pointer"
          >
            ← Inscrire un autre enfant ou voir les créneaux
          </button>
        </div>
      </div>
    )
  }

  // ─── VUE 2 : PARCOURS FERMÉ / VERROUILLÉ ───
  if (!isOpen && !isCodeValid) {
    return (
      <div className="bg-white rounded-3xl p-8 md:p-12 border border-slate-200 text-center max-w-xl mx-auto space-y-6 shadow-sm animate-fade-in">
        <div className="w-16 h-16 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center mx-auto border border-amber-200 shadow-2xs">
          <Lock className="w-8 h-8" />
        </div>
        <div className="space-y-2">
          <span className="text-[11px] font-black uppercase tracking-widest text-amber-800 bg-amber-100/80 px-3 py-1 rounded-full border border-amber-200">
            Inscriptions Closes
          </span>
          <h2 className="text-2xl font-black text-slate-900 pt-1">
            Les réservations de tests sont actuellement fermées
          </h2>
          <p className="text-sm text-slate-600 font-normal leading-relaxed">
            {closedMessage || "Les réservations de créneaux de tests de niveau pour cette période ne sont pas ouvertes ou sont temporairement suspendues."}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <Link
            href="/contact"
            className="w-full sm:w-auto px-6 py-3 rounded-xl bg-slate-950 hover:bg-slate-900 text-white text-xs font-bold transition-all shadow-xs"
          >
            Nous contacter
          </Link>
          <Link
            href="/inscription"
            className="w-full sm:w-auto px-6 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all"
          >
            Guide des inscriptions
          </Link>
        </div>

        {/* Option de déverrouillage si code d'accès privé (uniquement si un code est réellement configuré) */}
        {codeRequired && (
          <div className="pt-4 border-t border-slate-100">
            {!showCodePromptForClosed ? (
              <button
                type="button"
                onClick={() => setShowCodePromptForClosed(true)}
                className="text-xs text-slate-400 hover:text-slate-700 font-semibold underline flex items-center justify-center gap-1.5 mx-auto cursor-pointer"
              >
                <KeyRound className="w-3.5 h-3.5" />
                <span>Vous disposez d&apos;un code d&apos;accès privé ?</span>
              </button>
            ) : (
              <form onSubmit={handleValidateCode} className="space-y-3 max-w-sm mx-auto animate-fade-in pt-2">
                <label className="text-xs font-bold text-slate-700 block text-left">
                  Saisissez votre mot de passe d&apos;accès :
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={inputCode}
                    onChange={(e) => setInputCode(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-mono pr-10 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <button
                  type="submit"
                  disabled={verifyingCode}
                  className="w-full py-2.5 bg-primary hover:bg-primary-dark text-slate-950 font-black text-xs rounded-xl shadow-xs transition-all cursor-pointer disabled:opacity-50"
                >
                  {verifyingCode ? 'Vérification...' : 'Déverrouiller les créneaux'}
                </button>
              </form>
            )}
          </div>
        )}
      </div>
    )
  }

  // ─── VUE 3 : PARCOURS MOT DE PASSE REQUIS ───
  if (codeRequired && !isCodeValid) {
    return (
      <div className="bg-white rounded-3xl p-8 md:p-12 border border-slate-200 text-center max-w-md mx-auto space-y-6 shadow-sm animate-fade-in">
        <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto border border-blue-200 shadow-2xs">
          <KeyRound className="w-8 h-8" />
        </div>
        <div className="space-y-2">
          <span className="text-[11px] font-black uppercase tracking-widest text-blue-800 bg-blue-100/80 px-3 py-1 rounded-full border border-blue-200">
            Accès Privé
          </span>
          <h2 className="text-2xl font-black text-slate-900 pt-1">
            Code d&apos;accès requis
          </h2>
          <p className="text-xs text-slate-600 font-normal leading-relaxed">
            La réservation des créneaux de tests de niveau est actuellement restreinte. Veuillez saisir le mot de passe fourni par le club pour continuer :
          </p>
        </div>

        <form onSubmit={handleValidateCode} className="space-y-4 text-left">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 block">
              Mot de passe ou code secret :
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={inputCode}
                onChange={(e) => setInputCode(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm font-mono pr-10 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                autoFocus
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={verifyingCode}
            className="w-full py-3 bg-primary hover:bg-primary-dark text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl shadow-xs transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <KeyRound className="w-4 h-4" />
            <span>{verifyingCode ? 'Vérification...' : 'Déverrouiller les créneaux'}</span>
          </button>
        </form>

        <div className="pt-2">
          <Link
            href="/contact"
            className="text-xs text-slate-500 hover:text-slate-800 font-medium underline"
          >
            Vous n&apos;avez pas reçu le code ? Contactez le club
          </Link>
        </div>
      </div>
    )
  }

  // ─── VUE 4 : AUCUNE SESSION DISPONIBLE ───
  if (sessions.length === 0) {
    return (
      <div className="bg-white rounded-3xl p-8 md:p-12 border border-slate-200 text-center max-w-2xl mx-auto space-y-4 shadow-xs">
        <div className="w-16 h-16 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mx-auto">
          <Calendar className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-slate-900">Aucune session de test ouverte pour le moment</h2>
        <p className="text-sm text-slate-600 font-normal leading-relaxed">
          Les créneaux de tests de nage pour la rentrée ne sont pas encore ouverts ou sont temporairement clôturés.
          Pour toute question, vous pouvez contacter le club via notre <Link href="/contact" className="text-primary font-bold underline">formulaire de contact</Link>.
        </p>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-10 sm:space-y-12">
      {/* ─── EN-TÊTE PRINCIPAL AVEC ESPACEMENT AÉRÉ ─── */}
      <div className="text-center space-y-5 sm:space-y-6 pt-2">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-50 text-emerald-800 text-xs font-bold uppercase tracking-wider border border-emerald-200 shadow-3xs">
          <Waves className="w-3.5 h-3.5 text-primary" />
          <span>Tests de Nage & Niveau · Rentrée</span>
        </div>

        <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-slate-900 tracking-tight leading-tight">
          Réservation de votre Test de Niveau
        </h1>

        <p className="text-sm sm:text-base text-slate-600 max-w-2xl mx-auto font-medium leading-relaxed">
          Test individuel de <strong>{currentSession?.dureeMinutes || 5} minutes</strong> dans l&apos;eau pour évaluer l&apos;aisance aquatique de votre enfant et lui proposer le groupe le plus adapté.
        </p>

        {/* ─── BANDEAU INFORMATION ADHÉSION & GARANTIE SÉRÉNITÉ (SIMPLIFIÉ & PRO) ─── */}
        <div className="pt-3">
          <div className="bg-sky-50/80 border border-sky-200/90 rounded-3xl p-5 md:p-6 max-w-2xl mx-auto text-left shadow-xs space-y-3.5">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-xl bg-sky-100 text-sky-800 flex items-center justify-center shrink-0">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <span className="text-xs font-black uppercase tracking-wider text-sky-950">
                Adhésion préalable & Garantie Sérénité
              </span>
            </div>

            <p className="text-xs sm:text-sm text-sky-950 font-medium leading-relaxed">
              Pour participer au test de niveau, les nouveaux adhérents doivent être préalablement inscrits sur <strong>MonClub</strong> avec adhésion réglée.
            </p>

            <div className="bg-white/90 border border-sky-100 rounded-2xl p-3.5 flex items-start gap-2.5 text-xs text-slate-700 shadow-3xs">
              <span className="font-bold text-emerald-700 shrink-0">Garantie Sérénité :</span>
              <span className="leading-relaxed">
                Si le niveau n&apos;est pas validé ou si aucun horaire ne vous convient, votre adhésion est <strong>intégralement remboursée sans délai</strong>.
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ─── PROCESSUS DE RÉSERVATION DIRECT & FLUIDE EN 1 SEUL ÉCRAN ─── */}
      {!confirmationData && currentSession && (
        <div className="space-y-8 animate-fade-in">
          
          {/* BANDEAU ACCUEIL PERSONNALISÉ SI LIEN MAGIQUE OU ENFANT RECONNU */}
          {selectedCandidat && (
            <div className="bg-emerald-50/90 border-2 border-emerald-300 rounded-3xl p-4 sm:p-5 flex items-center justify-between shadow-xs animate-fade-in">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center font-black text-sm shrink-0 shadow-2xs">
                  <Check className="w-5 h-5 stroke-[3]" />
                </div>
                <div className="space-y-0.5">
                  <p className="text-sm sm:text-base font-black text-emerald-950">
                    Bonjour ! Dossier reconnu : {selectedCandidat.nom} {selectedCandidat.prenom} {selectedCandidat.age ? `(${selectedCandidat.age} ans)` : ''}
                  </p>
                  <p className="text-xs text-emerald-800 font-medium">
                    {selectedCandidat.groupeRecommande ? <span className="font-bold">Souhait : {selectedCandidat.groupeRecommande} · </span> : null}
                    {selectedCandidat.emailParentMasque ? <span>Dossier lié à l&apos;email : <strong className="font-mono text-emerald-950">{selectedCandidat.emailParentMasque}</strong>. </span> : null}
                    Choisissez simplement votre créneau ci-dessous pour valider votre test !
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleClearSelectedCandidat}
                className="text-xs font-bold text-slate-500 hover:text-slate-900 px-3 py-1.5 hover:bg-emerald-100 rounded-xl transition-colors cursor-pointer shrink-0"
              >
                Changer d&apos;enfant
              </button>
            </div>
          )}

          {/* Sélecteur de session / date mis en valeur */}
          {sessions.length > 1 && (
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 px-1">
                <h3 className="text-sm sm:text-base font-black text-slate-900 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-primary" />
                  <span>1. Choisissez la date de votre test :</span>
                </h3>
                <span className="text-xs font-bold text-slate-500 bg-slate-100 px-3 py-1 rounded-full w-fit">
                  {sessions.length} dates proposées
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                {sessions.map((s) => {
                  const isSelected = selectedSessionId === s.id
                  const totalPlaces = s.creneaux.reduce((acc, cr) => acc + cr.capacite, 0)
                  const totalRestantes = s.creneaux.reduce((acc, cr) => acc + cr.placesRestantes, 0)
                  const isSessionFull = totalRestantes <= 0
                  const weekday = formatWeekdayLongDateFr(s.date)
                  const capitalizedWeekday = weekday.charAt(0).toUpperCase() + weekday.slice(1)

                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => {
                        setSelectedSessionId(s.id)
                        setSelectedCreneau(null)
                      }}
                      className={`relative p-4 sm:p-5 rounded-2xl text-left transition-all cursor-pointer border-2 flex flex-col justify-between gap-3 group ${
                        isSelected
                          ? 'bg-emerald-50/90 border-emerald-600 ring-4 ring-emerald-100 shadow-md scale-[1.01]'
                          : 'bg-white border-slate-200 hover:border-emerald-500 hover:bg-emerald-50/30 hover:shadow-xs'
                      }`}
                    >
                      <div className="space-y-1.5 w-full">
                        <div className="flex items-center justify-between gap-2">
                          <span className={`text-[11px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full ${
                            isSelected
                              ? 'bg-emerald-600 text-white shadow-3xs'
                              : 'bg-slate-100 text-slate-700 group-hover:bg-emerald-100 group-hover:text-emerald-800'
                          }`}>
                            {capitalizedWeekday}
                          </span>

                          {isSelected ? (
                            <span className="inline-flex items-center gap-1 text-xs font-black text-emerald-700">
                              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                              Date choisie
                            </span>
                          ) : (
                            <span className="text-[11px] font-bold text-slate-400 group-hover:text-emerald-600 transition-colors">
                              Choisir cette date →
                            </span>
                          )}
                        </div>

                        <p className="text-base sm:text-lg font-black text-slate-900">
                          {formatLongDateFr(s.date)}
                        </p>

                        <p className="text-xs text-slate-500 font-medium flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-primary shrink-0" />
                          <span>De {s.heureDebut} à {s.heureFin} ({s.dureeMinutes} min / test)</span>
                        </p>
                      </div>

                      <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between gap-2 text-xs w-full">
                        <span className="text-slate-500 truncate max-w-[160px]" title={s.lieu}>
                          📍 {s.lieu}
                        </span>

                        {isSessionFull ? (
                          <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded border border-red-200 bg-red-50 text-red-700">
                            Complet
                          </span>
                        ) : (
                          <span className={`text-[11px] font-black px-2 py-0.5 rounded-md ${
                            totalRestantes <= 5
                              ? 'bg-amber-100 text-amber-900 border border-amber-200'
                              : 'bg-emerald-100 text-emerald-900 border border-emerald-200'
                          }`}>
                            {totalRestantes} {totalRestantes > 1 ? 'places dispo' : 'place dispo'}
                          </span>
                        )}
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* Fiche d'information de la session */}
          <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200 shadow-xs space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-lg md:text-xl font-black text-slate-900">
                  {currentSession.titre}
                </h3>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  Séance officielle d&apos;évaluation de niveau
                </p>
              </div>
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 shrink-0 shadow-3xs">
                <Calendar className="w-4 h-4 text-primary" />
                <span>{formatLongDateFr(currentSession.date)}</span>
              </div>
            </div>

            {/* ─── MISE EN AVANT VISUELLE DU LIEU DU TEST ─── */}
            <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-amber-50 to-amber-100/60 border-2 border-amber-300 flex items-start gap-3.5 shadow-xs">
              <div className="w-10 h-10 rounded-xl bg-amber-200/90 text-amber-900 flex items-center justify-center shrink-0 shadow-2xs mt-0.5">
                <MapPin className="w-5 h-5 text-amber-900 stroke-[2.5]" />
              </div>
              <div className="space-y-1 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] font-black uppercase tracking-wider bg-amber-200 text-amber-950 px-2 py-0.5 rounded-md">
                    📍 Lieu du test
                  </span>
                  <span className="text-[11px] font-bold text-amber-800">
                    ⚠️ Attention : le lieu varie selon la période (bassin d&apos;été / hiver)
                  </span>
                </div>
                <p className="text-base sm:text-lg font-black text-slate-950 leading-tight">
                  {currentSession.lieu}
                </p>
                <p className="text-xs text-slate-600 font-medium pt-0.5">
                  Présentez-vous dans le hall d&apos;entrée 5 minutes avant l&apos;heure avec maillot, bonnet et lunettes.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-4 text-xs text-slate-600">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-primary shrink-0" />
                <span>Durée du test : <strong>{currentSession.dureeMinutes} min</strong></span>
              </div>
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-primary shrink-0" />
                <span>Capacité : <strong>Max {currentSession.capaciteParCreneau} enfants</strong> par créneau</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1.5 text-slate-700 font-medium">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Disponible
                </span>
                <span className="flex items-center gap-1.5 text-red-700 font-bold">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-500" /> Tampon COMPLET
                </span>
              </div>
            </div>
          </div>

          {/* Grille des créneaux horaires */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Clock className="w-4 h-4 text-primary" />
                <span>{sessions.length > 1 ? '2. Cliquez sur votre heure de passage :' : '1. Cliquez sur votre heure de passage :'}</span>
              </h4>
              {selectedCreneau && (
                <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200 animate-fade-in">
                  ✓ {selectedCreneau.heureDebut} sélectionné
                </span>
              )}
            </div>

            {visibleCreneaux.length === 0 ? (
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 text-center text-xs text-slate-500 font-medium">
                Tous les créneaux pour cette date sont terminés. Veuillez choisir une autre date ou contacter le club.
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5">
                {visibleCreneaux.map((cr) => {
                const isSelected = selectedCreneau?.id === cr.id
                return (
                  <button
                    key={cr.id}
                    type="button"
                    disabled={cr.estComplet}
                    onClick={() => handleSelectCreneau(cr)}
                    className={`p-3 sm:p-3.5 rounded-2xl border-2 transition-all text-center flex flex-col items-center justify-center space-y-1 relative overflow-hidden select-none ${
                      isSelected
                        ? 'bg-emerald-600 text-white border-emerald-600 ring-4 ring-emerald-100 shadow-md scale-105 z-10 cursor-pointer'
                        : cr.estComplet
                        ? 'bg-slate-100/90 border-slate-200 text-slate-400 cursor-not-allowed'
                        : 'bg-white border-slate-200 hover:border-primary hover:shadow-xs group cursor-pointer'
                    }`}
                  >
                    <span className={`text-sm sm:text-base font-black font-mono ${
                      isSelected ? 'text-white' : cr.estComplet ? 'text-slate-400/80' : 'text-slate-900 group-hover:text-primary'
                    }`}>
                      {cr.heureDebut}
                    </span>

                    {cr.estComplet ? (
                      <>
                        <span className="text-[9px] font-semibold text-slate-400">
                          0 place
                        </span>
                        {/* Tampon COMPLET officiel */}
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                          <span className="transform -rotate-12 px-2.5 py-0.5 border-2 border-red-600 bg-red-50/95 text-red-600 font-black text-[11px] sm:text-xs tracking-widest uppercase rounded shadow-xs">
                            COMPLET
                          </span>
                        </div>
                      </>
                    ) : (
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                        isSelected
                          ? 'bg-white/20 text-white border-white/40'
                          : cr.placesRestantes === 1
                          ? 'bg-amber-50 text-amber-800 border-amber-200'
                          : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                      }`}>
                        {isSelected ? '✓ Choisi' : `${cr.placesRestantes} ${cr.placesRestantes > 1 ? 'places' : 'place'}`}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
            )}
          </div>

          {/* Formulaire d'inscription rapide directement sous les créneaux */}
          <div id="booking-form" className="scroll-mt-24">
            <form onSubmit={handleSubmitReservation} className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xs space-y-6">
              {/* Encart dynamique créneau sélectionné */}
              {selectedCreneau ? (
                <div className="bg-emerald-50/80 border border-emerald-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-3xs animate-fade-in">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-black shrink-0">
                      ✓
                    </div>
                    <div>
                      <p className="text-sm font-black text-emerald-950">
                        Créneau sélectionné : {selectedCreneau.heureDebut} à {selectedCreneau.heureFin} ({formatLongDateFr(currentSession.date)})
                      </p>
                      <p className="text-xs text-emerald-800 font-medium">
                        {currentSession.lieu} · Test de {currentSession.dureeMinutes} min
                      </p>
                    </div>
                  </div>
                  <span className="text-[11px] text-slate-500 font-medium italic shrink-0">
                    (Cliquez sur une autre heure au-dessus pour changer)
                  </span>
                </div>
              ) : (
                <div className="bg-sky-50/80 border border-sky-200 rounded-2xl p-3.5 flex items-center gap-2.5 text-xs text-sky-900 font-bold">
                  <Clock className="w-4 h-4 text-sky-700 shrink-0" />
                  <span>👆 Cliquez sur une case horaire ci-dessus pour la réserver.</span>
                </div>
              )}

              {/* ─── CHAMPS IDENTITÉ ENFANT AVEC AUTOCOMPLÉTION DIRECTE ─── */}
              <div className="space-y-4">
                <h4 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2 flex items-center gap-2">
                  <User className="w-4 h-4 text-primary" />
                  <span>2. Coordonnées de l&apos;enfant</span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Champ Nom avec autocomplétion directe */}
                  <div className="relative">
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                      Nom de l&apos;enfant *
                    </label>
                    <input
                      type="text"
                      required
                      value={nomEnfant}
                      onFocus={() => setShowNomSuggestions(true)}
                      onBlur={() => setTimeout(() => setShowNomSuggestions(false), 200)}
                      onChange={(e) => {
                        setNomEnfant(e.target.value)
                        setShowNomSuggestions(true)
                        if (selectedCandidat && e.target.value.trim().toUpperCase() !== selectedCandidat.nom.toUpperCase()) {
                          setSelectedCandidat(null)
                        }
                      }}
                      placeholder="Tapez le nom..."
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:border-primary focus:bg-white transition-colors outline-none text-sm font-medium uppercase"
                    />

                    {/* Dropdown suggestions directes par Nom */}
                    {showNomSuggestions && nomSuggestions.length > 0 && (
                      <div className="absolute z-30 left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden divide-y divide-slate-100 max-h-60 overflow-y-auto animate-fade-in">
                        <div className="px-3 py-1.5 bg-slate-50 text-[10px] font-black text-slate-500 uppercase tracking-wider">
                          Enfants pré-inscrits correspondants :
                        </div>
                        {nomSuggestions.map((c) => (
                          <button
                            key={c.id}
                            type="button"
                            onMouseDown={(e) => {
                              e.preventDefault()
                              handleSelectCandidat(c)
                            }}
                            className="w-full px-3.5 py-2.5 text-left hover:bg-emerald-50/70 flex items-center justify-between transition-colors cursor-pointer group"
                          >
                            <div className="space-y-0.5">
                              <p className="text-sm font-black text-slate-900 group-hover:text-primary transition-colors">
                                {c.nom} {c.prenom} {c.age ? <span className="text-xs font-bold text-slate-400">({c.age} ans)</span> : ''}
                              </p>
                              <p className="text-xs text-slate-500 flex items-center gap-2 flex-wrap">
                                {c.groupeRecommande && (
                                  <span className="font-bold text-emerald-800 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200/60 text-[10px]">
                                    {c.groupeRecommande}
                                  </span>
                                )}
                                {c.emailParentMasque && (
                                  <span className="font-mono text-slate-400 text-[11px]">✉️ {c.emailParentMasque}</span>
                                )}
                              </p>
                            </div>
                            <span className="text-[11px] font-black text-primary bg-emerald-50 group-hover:bg-emerald-100 px-2.5 py-1 rounded-lg transition-colors shrink-0">
                              Sélectionner
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Champ Prénom avec autocomplétion directe */}
                  <div className="relative">
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                      Prénom de l&apos;enfant *
                    </label>
                    <input
                      type="text"
                      required
                      value={prenomEnfant}
                      onFocus={() => setShowPrenomSuggestions(true)}
                      onBlur={() => setTimeout(() => setShowPrenomSuggestions(false), 200)}
                      onChange={(e) => {
                        setPrenomEnfant(e.target.value)
                        setShowPrenomSuggestions(true)
                        if (selectedCandidat && e.target.value.trim().toLowerCase() !== selectedCandidat.prenom.toLowerCase()) {
                          setSelectedCandidat(null)
                        }
                      }}
                      placeholder="Lucas"
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:border-primary focus:bg-white transition-colors outline-none text-sm font-medium"
                    />

                    {/* Dropdown suggestions directes par Prénom */}
                    {showPrenomSuggestions && prenomSuggestions.length > 0 && (
                      <div className="absolute z-30 left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden divide-y divide-slate-100 max-h-60 overflow-y-auto animate-fade-in">
                        <div className="px-3 py-1.5 bg-slate-50 text-[10px] font-black text-slate-500 uppercase tracking-wider">
                          Enfants pré-inscrits correspondants :
                        </div>
                        {prenomSuggestions.map((c) => (
                          <button
                            key={c.id}
                            type="button"
                            onMouseDown={(e) => {
                              e.preventDefault()
                              handleSelectCandidat(c)
                            }}
                            className="w-full px-3.5 py-2.5 text-left hover:bg-emerald-50/70 flex items-center justify-between transition-colors cursor-pointer group"
                          >
                            <div className="space-y-0.5">
                              <p className="text-sm font-black text-slate-900 group-hover:text-primary transition-colors">
                                {c.nom} {c.prenom} {c.age ? <span className="text-xs font-bold text-slate-400">({c.age} ans)</span> : ''}
                              </p>
                              <p className="text-xs text-slate-500 flex items-center gap-2 flex-wrap">
                                {c.groupeRecommande && (
                                  <span className="font-bold text-emerald-800 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200/60 text-[10px]">
                                    {c.groupeRecommande}
                                  </span>
                                )}
                                {c.emailParentMasque && (
                                  <span className="font-mono text-slate-400 text-[11px]">✉️ {c.emailParentMasque}</span>
                                )}
                              </p>
                            </div>
                            <span className="text-[11px] font-black text-primary bg-emerald-50 group-hover:bg-emerald-100 px-2.5 py-1 rounded-lg transition-colors shrink-0">
                              Sélectionner
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Badge Enfant Reconnu / Pré-rempli */}
                  {selectedCandidat && (
                    <div className="sm:col-span-2 bg-emerald-50/90 border border-emerald-200 rounded-2xl p-3 sm:p-3.5 flex items-center justify-between shadow-3xs animate-fade-in">
                      <div className="flex items-center gap-3">
                        <div className="w-7 h-7 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-black text-xs shrink-0 shadow-2xs">
                          <Check className="w-4 h-4 stroke-[3]" />
                        </div>
                        <div className="space-y-0.5">
                          <p className="text-xs sm:text-sm font-black text-emerald-950">
                            Enfant reconnu : {selectedCandidat.nom} {selectedCandidat.prenom} {selectedCandidat.age ? `(${selectedCandidat.age} ans)` : ''}
                          </p>
                          <p className="text-[11px] text-emerald-800 font-medium">
                            {selectedCandidat.groupeRecommande ? <span className="font-bold">Souhait : {selectedCandidat.groupeRecommande} · </span> : null}
                            {selectedCandidat.emailParentMasque ? <span>Dossier associé : <strong className="font-mono text-emerald-950">{selectedCandidat.emailParentMasque}</strong></span> : 'Dossier pré-inscrit reconnu'}
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={handleClearSelectedCandidat}
                        className="text-xs font-bold text-slate-500 hover:text-slate-900 px-2.5 py-1 hover:bg-emerald-100/80 rounded-xl transition-colors cursor-pointer shrink-0"
                      >
                        Effacer
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* ─── CHAMPS COORDONNÉES PARENT ─── */}
              <div className="space-y-4 pt-2">
                <h4 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2 flex items-center gap-2">
                  <Phone className="w-4 h-4 text-primary" />
                  <span>3. Coordonnées de contact</span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                      Email de contact *
                    </label>
                    <input
                      type="email"
                      required
                      value={emailParent}
                      onChange={(e) => setEmailParent(e.target.value)}
                      placeholder={selectedCandidat?.emailParentMasque ? `Votre email (ex: ${selectedCandidat.emailParentMasque})` : "parent@exemple.fr"}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:border-primary focus:bg-white transition-colors outline-none text-sm font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                      Téléphone portable *
                    </label>
                    <input
                      type="tel"
                      required
                      value={telephoneParent}
                      onChange={(e) => setTelephoneParent(e.target.value)}
                      placeholder="06 00 00 00 00"
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:border-primary focus:bg-white transition-colors outline-none text-sm font-medium"
                    />
                  </div>
                </div>
              </div>

              {/* Options repliables pour minimiser l'effort et la charge visuelle */}
              {!showOptionalFields ? (
                <button
                  type="button"
                  onClick={() => setShowOptionalFields(true)}
                  className="text-xs font-bold text-slate-500 hover:text-slate-800 flex items-center gap-1.5 cursor-pointer pt-1"
                >
                  <span>+ Ajouter le nom du parent ou une remarque (optionnel)</span>
                </button>
              ) : (
                <div className="space-y-4 pt-2 border-t border-slate-100 animate-fade-in">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                      Nom & Prénom du parent (optionnel)
                    </label>
                    <input
                      type="text"
                      value={nomParent}
                      onChange={(e) => setNomParent(e.target.value)}
                      placeholder="Ex: Sophie Martin"
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:border-primary focus:bg-white transition-colors outline-none text-sm font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                      Remarques ou particularités pour le coach (optionnel)
                    </label>
                    <textarea
                      rows={2}
                      value={remarques}
                      onChange={(e) => setRemarques(e.target.value)}
                      placeholder="Ex: appréhende un peu le grand bain, a déjà pris des cours..."
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:border-primary focus:bg-white transition-colors outline-none text-sm font-medium"
                    />
                  </div>
                </div>
              )}

              {/* ─── ALERTE ERREUR / DOUBLE RÉSERVATION ─── */}
              {bookingError && (
                <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 text-xs flex items-start gap-3 animate-fade-in shadow-3xs">
                  <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="font-black text-sm text-rose-950">{bookingError}</p>
                    <p className="text-[11px] text-rose-700 font-medium">
                      💡 Pour modifier ou changer l&apos;horaire de votre créneau existant, utilisez le lien de modification présent dans l&apos;email de confirmation reçu lors de votre première inscription.
                    </p>
                  </div>
                </div>
              )}

              {/* ─── BOUTON DE VALIDATION DIRECT ─── */}
              <div className="pt-4 border-t border-slate-100">
                <button
                  type="submit"
                  disabled={submitting || !selectedCreneau}
                  className={`w-full py-4 px-6 rounded-2xl font-black text-sm sm:text-base transition-all flex items-center justify-center gap-2.5 shadow-md ${
                    !selectedCreneau
                      ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                      : submitting
                      ? 'bg-primary text-white opacity-60 cursor-wait'
                      : 'bg-primary hover:bg-primary-dark text-white cursor-pointer hover:shadow-lg active:scale-[0.99]'
                  }`}
                >
                  {submitting ? (
                    <span>Confirmation en cours...</span>
                  ) : !selectedCreneau ? (
                    <>
                      <Clock className="w-5 h-5" />
                      <span>👆 Choisissez votre horaire ci-dessus pour confirmer</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-5 h-5" />
                      <span>
                        Confirmer mon créneau à {selectedCreneau.heureDebut}
                        {prenomEnfant.trim() ? ` · ${prenomEnfant.trim()}` : ''}
                      </span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── ÉTAPE 3 : CONFIRMATION RÉUSSIE ─── */}
      {step === 3 && confirmationData && (
        <div className="bg-white rounded-3xl p-6 md:p-10 border border-slate-200 shadow-sm space-y-8 animate-fade-in max-w-2xl mx-auto">
          <div className="text-center space-y-3">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-800 rounded-full flex items-center justify-center mx-auto shadow-xs">
              <Check className="w-8 h-8 stroke-[3]" />
            </div>
            <h2 className="text-2xl md:text-3xl font-black text-slate-900">
              Réservation confirmée !
            </h2>
            <p className="text-xs md:text-sm text-slate-600 font-medium">
              Un email récapitulatif a été envoyé à <strong>{emailParent}</strong>.
            </p>
          </div>

          {/* Fiche récapitulative */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 md:p-6 space-y-4 text-xs md:text-sm">
            <div className="flex items-center justify-between border-b border-slate-200/80 pb-3">
              <span className="font-bold text-slate-500 uppercase text-xs">Candidat :</span>
              <span className="font-black text-slate-900 text-base">
                {confirmationData.prenomEnfant} {confirmationData.nomEnfant}
              </span>
            </div>

            <div className="flex items-center justify-between border-b border-slate-200/80 pb-3">
              <span className="font-bold text-slate-500 uppercase text-xs">Date du test :</span>
              <span className="font-bold text-slate-900">
                {formatLongDateFr(confirmationData.date)}
              </span>
            </div>

            <div className="flex items-center justify-between border-b border-slate-200/80 pb-3">
              <span className="font-bold text-slate-500 uppercase text-xs">Créneau horaire :</span>
              <span className="font-black text-primary text-base">
                {confirmationData.heureDebut} – {confirmationData.heureFin}
              </span>
            </div>

            {/* MISE EN AVANT DU LIEU DU TEST */}
            <div className="p-4 rounded-2xl bg-amber-50 border-2 border-amber-300 text-amber-950 flex items-start gap-3">
              <div className="w-8 h-8 rounded-xl bg-amber-200 text-amber-900 flex items-center justify-center shrink-0 mt-0.5">
                <MapPin className="w-4 h-4 text-amber-900" />
              </div>
              <div className="space-y-0.5">
                <span className="text-[10px] font-black uppercase tracking-wider text-amber-800 block">
                  Lieu de rendez-vous :
                </span>
                <span className="text-sm font-black text-slate-950 block">
                  {confirmationData.lieu}
                </span>
                <span className="text-xs text-amber-900/80 block pt-0.5">
                  Vérifiez bien le bassin (extérieur ou couvert) avant de vous déplacer.
                </span>
              </div>
            </div>
          </div>

          {/* Consignes hall d'entrée */}
          <div className="bg-emerald-50/60 border border-emerald-200/80 rounded-2xl p-4 md:p-5 text-xs text-emerald-950 space-y-2">
            <p className="font-bold text-emerald-900 flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4 text-primary shrink-0" />
              Consignes pratiques pour le jour du test :
            </p>
            <ul className="space-y-1 text-emerald-800/90 font-medium pl-5 list-disc">
              <li>Présentez-vous dans le hall d&apos;entrée de la piscine <strong>5 minutes avant l&apos;heure</strong> de votre créneau.</li>
              <li>Équipement requis : <strong>maillot de bain, bonnet de bain et lunettes</strong>.</li>
            </ul>
          </div>

          {/* Boutons Ajout à l'agenda */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-center space-y-2.5">
            <p className="text-xs font-bold text-slate-700">📅 Enregistrer ce rendez-vous dans votre calendrier :</p>
            <div className="flex flex-col sm:flex-row gap-2">
              <a
                href={(() => {
                  const dateStr = confirmationData.date.split('T')[0].replace(/-/g, '')
                  const hDeb = confirmationData.heureDebut.replace(':', '') + '00'
                  const hFin = confirmationData.heureFin.replace(':', '') + '00'
                  const title = `Test de Nage - ${confirmationData.prenomEnfant} ${confirmationData.nomEnfant}`
                  const desc = `Test individuel de natation au Triton Club Cavaillon.\nLieu : ${confirmationData.lieu}\nPrésentez-vous dans le hall d'entrée 5 minutes avant avec maillot, bonnet et lunettes.`
                  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(title)}&dates=${dateStr}T${hDeb}/${dateStr}T${hFin}&ctz=Europe/Paris&details=${encodeURIComponent(desc)}&location=${encodeURIComponent(confirmationData.lieu)}`
                })()}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 py-2.5 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs text-center transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Calendar className="w-3.5 h-3.5 text-primary" />
                <span>+ Google Agenda</span>
              </a>
              <a
                href={`/api/tests-nage/ics?id=${confirmationData.id}`}
                download
                className="flex-1 py-2.5 px-3 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 text-slate-800 font-bold text-xs text-center transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
              >
                <Calendar className="w-3.5 h-3.5 text-slate-600" />
                <span>Apple / Outlook (.ics)</span>
              </a>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <button
              onClick={() => window.print()}
              className="flex-1 py-3 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs uppercase tracking-wider transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              Imprimer le récapitulatif
            </button>
            <button
              onClick={() => {
                setStep(1)
                setSelectedCreneau(null)
                handleClearSelectedCandidat()
                setConfirmationData(null)
                fetchPublicData()
              }}
              className="flex-1 py-3 px-4 rounded-xl bg-primary hover:bg-primary-dark text-white font-bold text-xs uppercase tracking-wider transition-colors cursor-pointer"
            >
              Inscrire un autre enfant
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
