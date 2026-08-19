'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
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
  Edit3
} from 'lucide-react'
import toast from 'react-hot-toast'
import { formatLongDateFr } from '@/lib/date'

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
  nomParent: string | null
  emailParent: string | null
  telephoneParent: string | null
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

  // Mode hybride : recherche candidat pré-enregistré vs saisie libre
  const [isManualEntry, setIsManualEntry] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCandidat, setSelectedCandidat] = useState<CandidatItem | null>(null)

  // Champs du formulaire
  const [nomEnfant, setNomEnfant] = useState('')
  const [prenomEnfant, setPrenomEnfant] = useState('')
  const [nomParent, setNomParent] = useState('')
  const [emailParent, setEmailParent] = useState('')
  const [telephoneParent, setTelephoneParent] = useState('')
  const [remarques, setRemarques] = useState('')
  const [submitting, setSubmitting] = useState(false)

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

  // 1. Récupération des données publiques
  const fetchPublicData = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/tests-nage')
      const data = await res.json()
      if (res.ok && data.sessions) {
        setSessions(data.sessions)
        setCandidats(data.candidats || [])
        if (data.sessions.length > 0 && !selectedSessionId) {
          setSelectedSessionId(data.sessions[0].id)
        }
      }
    } catch (err) {
      console.error('Erreur chargement tests-nage:', err)
      toast.error('Impossible de charger les créneaux disponibles')
    } finally {
      setLoading(false)
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

  const currentSession = useMemo(() => {
    return sessions.find((s) => s.id === selectedSessionId) || sessions[0] || null
  }, [sessions, selectedSessionId])

  // Filtrage des candidats pour l'autocomplétion
  const filteredCandidats = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    if (!q || q.length < 2) return []
    return candidats.filter((c) => {
      const fullName = `${c.nom} ${c.prenom}`.toLowerCase()
      const reverseName = `${c.prenom} ${c.nom}`.toLowerCase()
      return fullName.includes(q) || reverseName.includes(q)
    }).slice(0, 5)
  }, [searchQuery, candidats])

  // Sélection d'un candidat pré-rempli
  const handleSelectCandidat = (c: CandidatItem) => {
    setSelectedCandidat(c)
    setNomEnfant(c.nom)
    setPrenomEnfant(c.prenom)
    setNomParent(c.nomParent || '')
    setEmailParent(c.emailParent || '')
    setTelephoneParent(c.telephoneParent || '')
    setSearchQuery(`${c.nom} ${c.prenom}`)

    if (!c.emailParent || !c.telephoneParent) {
      toast('Enfant sélectionné ! Veuillez renseigner votre email et téléphone ci-dessous pour la confirmation.', { icon: '📝' })
    } else {
      toast.success('Informations pré-remplies !')
    }
  }

  const handleClearSelectedCandidat = () => {
    setSelectedCandidat(null)
    setSearchQuery('')
    setNomEnfant('')
    setPrenomEnfant('')
    setNomParent('')
    setEmailParent('')
    setTelephoneParent('')
  }

  const handleSelectCreneau = (cr: CreneauItem) => {
    if (cr.estComplet) return
    setSelectedCreneau(cr)
    setStep(2)
    window.scrollTo({ top: 0, behavior: 'smooth' })
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

    setSubmitting(true)
    try {
      const res = await fetch('/api/tests-nage/reserver', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          creneauId: selectedCreneau.id,
          candidatId: selectedCandidat?.id || null,
          nomEnfant: nomEnfant.trim(),
          prenomEnfant: prenomEnfant.trim(),
          nomParent: nomParent.trim() || null,
          emailParent: emailParent.trim().toLowerCase(),
          telephoneParent: telephoneParent.trim(),
          remarques: remarques.trim() || null,
        }),
      })

      const data = await res.json()
      if (res.ok && data.success) {
        setConfirmationData(data.data)
        setStep(3)
        window.scrollTo({ top: 0, behavior: 'smooth' })
        toast.success('Votre créneau est confirmé !')
      } else {
        toast.error(data.error || "Une erreur est survenue lors de l'enregistrement")
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

            <div className="space-y-1 sm:col-span-2 border-t border-slate-200/60 pt-3">
              <span className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-primary" /> Lieu de rendez-vous :
              </span>
              <p className="font-medium text-slate-800">
                {manageData.session.lieu} · <strong>Hall d&apos;entrée de la piscine</strong> (5 minutes avant l&apos;heure)
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
                      className={`p-3 rounded-2xl border transition-all text-center flex flex-col items-center justify-center space-y-1 ${
                        isSelected
                          ? 'bg-primary text-white border-primary cursor-default shadow-xs'
                          : cr.estComplet
                          ? 'bg-slate-50 border-slate-200 text-slate-400 opacity-60 cursor-not-allowed'
                          : 'bg-white border-slate-200 hover:border-primary hover:shadow-xs cursor-pointer group'
                      }`}
                    >
                      <span className={`text-sm font-black font-mono ${
                        isSelected ? 'text-white' : cr.estComplet ? 'text-slate-400' : 'text-slate-900 group-hover:text-primary'
                      }`}>
                        {cr.heureDebut}
                      </span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                        isSelected
                          ? 'bg-white/20 text-white border-white/30'
                          : cr.estComplet
                          ? 'bg-slate-100 text-slate-400 border-slate-200'
                          : cr.placesRestantes === 1
                          ? 'bg-amber-50 text-amber-800 border-amber-200'
                          : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                      }`}>
                        {isSelected ? 'Actuel' : cr.estComplet ? 'Complet' : `${cr.placesRestantes} place(s)`}
                      </span>
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

  // ─── VUE 2 : PARCOURS PUBLIC CLASSIQUE (RÉSERVATION) ───
  if (sessions.length === 0) {
    return (
      <div className="bg-white rounded-3xl p-8 md:p-12 border border-slate-200 text-center max-w-2xl mx-auto space-y-4 shadow-xs">
        <div className="w-16 h-16 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mx-auto">
          <Calendar className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-slate-900">Aucune session de test ouverte pour le moment</h2>
        <p className="text-sm text-slate-600 font-normal leading-relaxed">
          Les créneaux de tests de nage pour la rentrée ne sont pas encore ouverts ou sont temporairement clôturés.
          Pour toute question, vous pouvez contacter le club par email à <a href="mailto:tritoncavaillon@gmail.com" className="text-primary font-bold underline">tritoncavaillon@gmail.com</a>.
        </p>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* ─── EN-TÊTE PRINCIPAL ─── */}
      <div className="text-center space-y-3">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 text-xs font-bold uppercase tracking-wider border border-emerald-200">
          <Waves className="w-3.5 h-3.5 text-primary" />
          <span>Tests de Nage & Niveau · Rentrée</span>
        </div>
        <h1 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight">
          Réservation de votre Test de Niveau
        </h1>
        <p className="text-xs md:text-sm text-slate-600 max-w-2xl mx-auto font-medium">
          Ce test individuel de <strong>{currentSession?.dureeMinutes || 5} minutes</strong> dans l&apos;eau permet à nos éducateurs diplômés d&apos;évaluer l&apos;aisance aquatique de votre enfant pour lui proposer le groupe le plus adapté.
        </p>
      </div>

      {/* ─── FIL D'ARIANE / PROGRESSION ─── */}
      {step < 3 && (
        <div className="flex items-center justify-center gap-2 max-w-md mx-auto">
          <div className="flex items-center gap-2">
            <span className={`w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center ${
              step >= 1 ? 'bg-primary text-white' : 'bg-slate-100 text-slate-400'
            }`}>
              1
            </span>
            <span className={`text-xs font-bold ${step >= 1 ? 'text-slate-900' : 'text-slate-400'}`}>
              Créneau horaire
            </span>
          </div>
          <div className={`w-12 h-0.5 ${step >= 2 ? 'bg-primary' : 'bg-slate-200'}`} />
          <div className="flex items-center gap-2">
            <span className={`w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center ${
              step >= 2 ? 'bg-primary text-white' : 'bg-slate-100 text-slate-400'
            }`}>
              2
            </span>
            <span className={`text-xs font-bold ${step >= 2 ? 'text-slate-900' : 'text-slate-400'}`}>
              Informations
            </span>
          </div>
        </div>
      )}

      {/* ─── ÉTAPE 1 : CHOIX DU CRÉNEAU HORAIRE ─── */}
      {step === 1 && currentSession && (
        <div className="space-y-6 animate-fade-in">
          {/* Sélecteur de session si plusieurs dates */}
          {sessions.length > 1 && (
            <div className="flex flex-wrap items-center justify-center gap-2 bg-slate-100 p-1.5 rounded-2xl max-w-lg mx-auto">
              {sessions.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setSelectedSessionId(s.id)}
                  className={`flex-1 py-2 px-4 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    selectedSessionId === s.id
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {formatLongDateFr(s.date)}
                </button>
              ))}
            </div>
          )}

          {/* Fiche d'information de la session */}
          <div className="bg-white rounded-2xl p-5 md:p-6 border border-slate-200 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-lg md:text-xl font-black text-slate-900">
                  {currentSession.titre}
                </h3>
                <p className="text-xs text-slate-500 font-medium flex items-center gap-1.5 mt-1">
                  <MapPin className="w-3.5 h-3.5 text-primary shrink-0" />
                  <span>{currentSession.lieu}</span>
                </p>
              </div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 shrink-0">
                <Calendar className="w-4 h-4 text-primary" />
                <span>{formatLongDateFr(currentSession.date)}</span>
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
                <span className="flex items-center gap-1.5 text-slate-700">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Disponible
                </span>
                <span className="flex items-center gap-1.5 text-slate-400">
                  <span className="w-2.5 h-2.5 rounded-full bg-slate-300" /> Complet
                </span>
              </div>
            </div>
          </div>

          {/* Grille des créneaux */}
          <div className="space-y-3">
            <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Clock className="w-4 h-4 text-primary" />
              <span>Choisissez votre heure de passage (créneaux de {currentSession.dureeMinutes} min) :</span>
            </h4>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5">
              {currentSession.creneaux.map((cr) => (
                <button
                  key={cr.id}
                  disabled={cr.estComplet}
                  onClick={() => handleSelectCreneau(cr)}
                  className={`p-3 rounded-2xl border transition-all text-center flex flex-col items-center justify-center space-y-1 ${
                    cr.estComplet
                      ? 'bg-slate-50 border-slate-200 text-slate-400 opacity-60 cursor-not-allowed'
                      : 'bg-white border-slate-200 hover:border-primary hover:shadow-xs cursor-pointer group'
                  }`}
                >
                  <span className={`text-sm font-black font-mono ${
                    cr.estComplet ? 'text-slate-400' : 'text-slate-900 group-hover:text-primary'
                  }`}>
                    {cr.heureDebut}
                  </span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                    cr.estComplet
                      ? 'bg-slate-100 text-slate-400 border-slate-200'
                      : cr.placesRestantes === 1
                      ? 'bg-amber-50 text-amber-800 border-amber-200'
                      : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  }`}>
                    {cr.estComplet ? 'Complet' : `${cr.placesRestantes} ${cr.placesRestantes > 1 ? 'places' : 'place'}`}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ─── ÉTAPE 2 : FORMULAIRE D'INSCRIPTION RAPIDE (HYBRIDE) ─── */}
      {step === 2 && selectedCreneau && currentSession && (
        <div className="space-y-6 animate-fade-in">
          {/* Récapitulatif du créneau choisi */}
          <div className="bg-emerald-50/60 border border-emerald-200/80 rounded-2xl p-4 md:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-primary text-white uppercase tracking-wider">
                  Créneau sélectionné
                </span>
                <span className="text-xs font-bold text-slate-700">
                  {formatLongDateFr(currentSession.date)}
                </span>
              </div>
              <h3 className="text-xl font-black text-slate-900">
                De {selectedCreneau.heureDebut} à {selectedCreneau.heureFin}
              </h3>
              <p className="text-xs text-slate-600">
                {currentSession.lieu} · Test individuel de {currentSession.dureeMinutes} minutes
              </p>
            </div>

            <button
              type="button"
              onClick={() => setStep(1)}
              className="inline-flex items-center gap-1.5 text-xs text-slate-700 hover:text-slate-900 font-bold bg-white border border-slate-200 px-3.5 py-2 rounded-xl transition-colors cursor-pointer shrink-0"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Modifier l&apos;horaire
            </button>
          </div>

          <form onSubmit={handleSubmitReservation} className="bg-white rounded-3xl p-6 md:p-8 border border-slate-200 shadow-xs space-y-6">
            
            {/* ─── RECHERCHE HYBRIDE DU CANDIDAT DANS LE LISTING ─── */}
            {!isManualEntry && candidats.length > 0 && (
              <div className="space-y-3 bg-slate-50 border border-slate-200 rounded-2xl p-5">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-800">
                    🔍 Votre enfant est déjà pré-inscrit au club ?
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setIsManualEntry(true)
                      handleClearSelectedCandidat()
                    }}
                    className="text-xs text-primary hover:underline font-bold cursor-pointer"
                  >
                    Nouvel arrivant ? Saisie libre
                  </button>
                </div>

                {!selectedCandidat ? (
                  <div className="space-y-2 relative">
                    <div className="relative">
                      <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Tapez le nom ou prénom de votre enfant..."
                        className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:border-primary focus:outline-none text-sm font-medium"
                      />
                    </div>

                    {/* Liste des résultats d'autocomplétion */}
                    {filteredCandidats.length > 0 && (
                      <div className="absolute z-10 left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-2xl shadow-lg overflow-hidden divide-y divide-slate-100">
                        {filteredCandidats.map((c) => (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => handleSelectCandidat(c)}
                            className="w-full px-4 py-3 text-left hover:bg-emerald-50/50 flex items-center justify-between transition-colors cursor-pointer"
                          >
                            <div>
                              <p className="text-sm font-bold text-slate-900">
                                {c.nom} {c.prenom}
                              </p>
                              <p className="text-xs text-slate-500">
                                {c.emailParent ? `${c.emailParent}` : ''} {c.telephoneParent ? `· ${c.telephoneParent}` : ''}
                              </p>
                            </div>
                            <span className="text-xs font-bold text-primary bg-emerald-50 px-2.5 py-1 rounded-lg">
                              Sélectionner
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="bg-white border border-emerald-200 rounded-xl p-3.5 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 bg-emerald-100 text-emerald-800 rounded-lg">
                        <Check className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-900">
                          {selectedCandidat.nom} {selectedCandidat.prenom}
                        </p>
                        <p className="text-xs text-slate-500">
                          {!selectedCandidat.emailParent || !selectedCandidat.telephoneParent
                            ? 'Complétez votre email et téléphone ci-dessous'
                            : 'Informations retrouvées et pré-remplies'}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleClearSelectedCandidat}
                      className="text-xs text-slate-500 hover:text-slate-800 font-bold px-2 py-1 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                    >
                      Changer
                    </button>
                  </div>
                )}
              </div>
            )}

            {isManualEntry && (
              <div className="flex items-center justify-between bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs">
                <span className="text-slate-600 font-medium">Mode saisie libre pour nouvel enfant</span>
                <button
                  type="button"
                  onClick={() => setIsManualEntry(false)}
                  className="text-primary font-bold hover:underline cursor-pointer"
                >
                  🔍 Rechercher dans la liste
                </button>
              </div>
            )}

            {/* ─── CHAMPS IDENTITÉ ENFANT ─── */}
            <div className="space-y-4">
              <h4 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2 flex items-center gap-2">
                <User className="w-4 h-4 text-primary" />
                <span>1. Identité de l&apos;enfant</span>
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                    Nom de l&apos;enfant *
                  </label>
                  <input
                    type="text"
                    required
                    value={nomEnfant}
                    onChange={(e) => setNomEnfant(e.target.value)}
                    placeholder="DUPONT"
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:border-primary focus:bg-white transition-colors outline-none text-sm font-medium uppercase"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                    Prénom de l&apos;enfant *
                  </label>
                  <input
                    type="text"
                    required
                    value={prenomEnfant}
                    onChange={(e) => setPrenomEnfant(e.target.value)}
                    placeholder="Lucas"
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:border-primary focus:bg-white transition-colors outline-none text-sm font-medium"
                  />
                </div>
              </div>
            </div>

            {/* ─── CHAMPS COORDONNÉES PARENT ─── */}
            <div className="space-y-4 pt-2">
              <h4 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2 flex items-center gap-2">
                <Phone className="w-4 h-4 text-primary" />
                <span>2. Coordonnées du responsable</span>
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
                    placeholder="parent@exemple.fr"
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:border-primary focus:bg-white transition-colors outline-none text-sm font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                    Téléphone *
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

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  Nom & Prénom du parent
                </label>
                <input
                  type="text"
                  value={nomParent}
                  onChange={(e) => setNomParent(e.target.value)}
                  placeholder="Jean Dupont"
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:border-primary focus:bg-white transition-colors outline-none text-sm font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  Remarques ou particularités à signaler au coach
                </label>
                <textarea
                  rows={2}
                  value={remarques}
                  onChange={(e) => setRemarques(e.target.value)}
                  placeholder="Ex: appréhende un peu le grand bassin, a déjà fait des cours l'an dernier..."
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:border-primary focus:bg-white transition-colors outline-none text-sm font-medium"
                />
              </div>
            </div>

            {/* ─── BOUTON DE VALIDATION ─── */}
            <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row gap-3">
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 py-3.5 px-6 rounded-xl bg-primary hover:bg-primary-dark text-white font-bold text-sm transition-colors shadow-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {submitting ? (
                  <span>Confirmation en cours...</span>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Confirmer la réservation du test</span>
                  </>
                )}
              </button>
            </div>
          </form>
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

            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-500 uppercase text-xs">Lieu :</span>
              <span className="font-bold text-slate-900 text-right">
                {confirmationData.lieu}
              </span>
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
