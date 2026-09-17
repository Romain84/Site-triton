'use client'

import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { 
  Calendar, 
  Clock, 
  Users, 
  User, 
  Plus, 
  Upload, 
  Printer, 
  Download, 
  Copy, 
  Check, 
  Trash2, 
  Edit, 
  Search, 
  Filter, 
  AlertCircle, 
  CheckCircle2, 
  XCircle, 
  Waves,
  MapPin,
  ExternalLink,
  ChevronRight,
  RefreshCw,
  Mail,
  Send,
  FileText,
  Lock,
  Unlock
} from 'lucide-react'
import toast from 'react-hot-toast'
import { formatLongDateFr, formatCompactDateFr } from '@/lib/date'
import {
  generateFicheEvaluationPDF,
  generateFicheViergePDF,
  generateFichesJourneePDF,
  generateProgrammePassagePDF,
} from '@/lib/pdf'

interface InscriptionItem {
  id: string
  nomEnfant: string
  prenomEnfant: string
  age: number | null
  dateNaissance: string | null
  nomParent: string | null
  emailParent: string
  telephoneParent: string
  niveauEstime: string | null
  remarques: string | null
  statut: 'inscrit' | 'present' | 'absent' | 'annule'
  groupeRecommande: string | null
  commentaireCoach: string | null
  createdAt: string
  candidatId?: string | null
  candidat?: {
    id: string
    statut: string
    groupeRecommande?: string | null
    dateNaissance?: string | null
    age?: number | null
    telephoneParent?: string | null
    nomParent?: string | null
    emailParent?: string | null
  } | null
}

interface CreneauItem {
  id: string
  heureDebut: string
  heureFin: string
  capacite: number
  actif: boolean
  inscriptions: InscriptionItem[]
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
  actif: boolean
  bloquee?: boolean
  creneaux: CreneauItem[]
  stats: {
    nbCreneaux: number
    totalPlaces: number
    totalInscrits: number
    placesRestantes: number
    totalPresents: number
    totalAbsents: number
    totalCandidatsListing: number
  }
}

interface NotifierRecipientItem {
  id: string
  nomEnfant: string
  prenomEnfant: string
  nomParent: string | null
  emailParent: string
  telephoneParent: string
  creneauHoraire: string
}

interface CandidatItem {
  id: string
  sessionId: string | null
  nom: string
  prenom: string
  dateNaissance: string | null
  age: number | null
  nomParent: string | null
  emailParent: string | null
  telephoneParent: string | null
  statut: string
  groupeRecommande: string | null
  commentaireCoach: string | null
  derniereRelance?: string | null
  session?: { id: string; titre: string; date: string; lieu?: string | null } | null
  inscriptions: Array<{
    id: string
    statut: string
    creneau: {
      heureDebut: string
      heureFin: string
      sessionId: string
      session?: { id: string; titre: string; date: string; lieu?: string | null } | null
    }
  }>
}

export const GROUPES_CONSEILLES = [
  'ENF 1',
  'ENF 2',
  'AVENIR LOISIR',
  'AVENIR 1',
]

function formatRelanceLabel(dateStr?: string | null): { label: string; isRecent: boolean } | null {
  if (!dateStr) return null
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return null

  const now = new Date()
  const timeStr = d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
  const dateFormatted = d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })

  // Aujourd'hui
  if (d.toDateString() === now.toDateString()) {
    return { label: `Aujourd'hui à ${timeStr}`, isRecent: true }
  }

  // Hier
  const yesterday = new Date(now)
  yesterday.setDate(now.getDate() - 1)
  if (d.toDateString() === yesterday.toDateString()) {
    return { label: `Hier à ${timeStr}`, isRecent: true }
  }

  return { label: `${dateFormatted} à ${timeStr}`, isRecent: false }
}

export default function TestsNageManager() {
  const [sessions, setSessions] = useState<SessionItem[]>([])
  const [candidats, setCandidats] = useState<CandidatItem[]>([])
  const [loading, setLoading] = useState(true)
  const [activeSubTab, setActiveSubTab] = useState<'passages' | 'candidats' | 'sessions'>('passages')
  const [selectedSessionId, setSelectedSessionId] = useState<string>('')

  // Modals state
  const [showCreateSessionModal, setShowCreateSessionModal] = useState(false)
  const [showImportModal, setShowImportModal] = useState(false)
  const [showManualAddModal, setShowManualAddModal] = useState(false)
  const [manualAddCreneauId, setManualAddCreneauId] = useState<string>('')

  // Filtres de créneaux (Feuille de passage)
  const [creneauFilter, setCreneauFilter] = useState<'tous' | 'a_venir' | 'avec_inscrits'>('tous')

  // Modale de fusion de sessions
  const [showFusionModal, setShowFusionModal] = useState(false)
  const [fusionSourceSessionId, setFusionSourceSessionId] = useState<string>('')
  const [fusionTargetSessionId, setFusionTargetSessionId] = useState<string>('')
  const [fusionLoading, setFusionLoading] = useState(false)

  // Filtres candidats
  const [candidatFilter, setCandidatFilter] = useState<'tous' | 'a_planifier' | 'planifie' | 'present' | 'absent' | 'hors_listing' | 'relances'>('tous')
  const [candidatSearch, setCandidatSearch] = useState('')

  // Formulaire création session
  const [newSessionTitre, setNewSessionTitre] = useState('Tests de Nage - Rentrée Septembre')
  const [newSessionDate, setNewSessionDate] = useState(new Date().toISOString().split('T')[0])
  const [newSessionHeureDebut, setNewSessionHeureDebut] = useState('14:00')
  const [newSessionHeureFin, setNewSessionHeureFin] = useState('17:00')
  const [newSessionDuree, setNewSessionDuree] = useState(5)
  const [newSessionCapacite, setNewSessionCapacite] = useState(2)
  const [newSessionLieu, setNewSessionLieu] = useState('Piscine couverte Alphonse Roudière')
  const [creatingSession, setCreatingSession] = useState(false)

  // Formulaire import candidats
  const [importText, setImportText] = useState('')
  const [importFileName, setImportFileName] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = React.useRef<HTMLInputElement>(null)
  const [importing, setImporting] = useState(false)

  const handleFileUpload = (file: File) => {
    if (!file) return
    setImportFileName(file.name)
    const reader = new FileReader()
    reader.onload = (e) => {
      const text = e.target?.result as string
      if (text) {
        setImportText(text)
        const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0)
        toast.success(`Fichier "${file.name}" chargé (${lines.length} lignes)`)
      }
    }
    reader.readAsText(file, 'UTF-8')
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleFileUpload(file)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files?.[0]
    if (file) handleFileUpload(file)
  }

  // Formulaire inscription manuelle
  const [manualNom, setManualNom] = useState('')
  const [manualPrenom, setManualPrenom] = useState('')
  const [manualAge, setManualAge] = useState('')
  const [manualNomParent, setManualNomParent] = useState('')
  const [manualEmail, setManualEmail] = useState('')
  const [manualTel, setManualTel] = useState('')
  const [manualNiveau, setManualNiveau] = useState('Débutant')
  const [manualRemarques, setManualRemarques] = useState('')
  const [manualSubmitting, setManualSubmitting] = useState(false)

  // Modale de relance des candidats
  const [showRelanceModal, setShowRelanceModal] = useState(false)
  const [relanceCandidateIds, setRelanceCandidateIds] = useState<string[]>([])
  const [relanceTargetName, setRelanceTargetName] = useState('')
  const [relanceCustomSubject, setRelanceCustomSubject] = useState('Rappel : Réservez votre créneau pour le Test de Nage (Triton Club Cavaillon)')
  const [relanceCustomMessage, setRelanceCustomMessage] = useState('')
  const [relancing, setRelancing] = useState(false)

  // Modale de notification de report / incident technique pour une session
  const [showNotifierAnnulationModal, setShowNotifierAnnulationModal] = useState(false)
  const [sessionToNotify, setSessionToNotify] = useState<SessionItem | null>(null)
  const [notifierLoading, setNotifierLoading] = useState(false)
  const [notifierCustomSubject, setNotifierCustomSubject] = useState('')
  const [notifierCustomMessage, setNotifierCustomMessage] = useState('')
  const [notifierBloquerSession, setNotifierBloquerSession] = useState(true)
  const [notifierRecipients, setNotifierRecipients] = useState<NotifierRecipientItem[]>([])
  const [notifierExcludedIds, setNotifierExcludedIds] = useState<string[]>([])
  const [notifierSearchFilter, setNotifierSearchFilter] = useState('')

  const [afficherBoutonTest, setAfficherBoutonTest] = useState<boolean>(true)
  const [codeAccesTestsNage, setCodeAccesTestsNage] = useState<string>('')
  const [togglingBoutonTest, setTogglingBoutonTest] = useState(false)

  // Modale d'association d'une inscription hors listing avec un candidat du listing
  const [showAssocierModal, setShowAssocierModal] = useState(false)
  const [associerInscription, setAssocierInscription] = useState<InscriptionItem | null>(null)
  const [associerSearch, setAssocierSearch] = useState('')
  const [selectedTargetCandidatId, setSelectedTargetCandidatId] = useState<string | null>(null)
  const [associating, setAssociating] = useState(false)

  // Modale d'édition / complétion des informations d'un candidat
  const [showEditCandidatModal, setShowEditCandidatModal] = useState(false)
  const [editingCandidatId, setEditingCandidatId] = useState<string | null>(null)
  const [editNom, setEditNom] = useState('')
  const [editPrenom, setEditPrenom] = useState('')
  const [editDateNaissance, setEditDateNaissance] = useState('')
  const [editAge, setEditAge] = useState('')
  const [editNomParent, setEditNomParent] = useState('')
  const [editEmail, setEditEmail] = useState('')
  const [editTel, setEditTel] = useState('')
  const [editStatut, setEditStatut] = useState('a_planifier')
  const [editGroupeRecommande, setEditGroupeRecommande] = useState('')
  const [editCommentaireCoach, setEditCommentaireCoach] = useState('')
  const [savingCandidat, setSavingCandidat] = useState(false)

  // Modale d'ajout direct d'un candidat (sans créneau obligatoire)
  const [showCreateCandidatModal, setShowCreateCandidatModal] = useState(false)
  const [createNom, setCreateNom] = useState('')
  const [createPrenom, setCreatePrenom] = useState('')
  const [createDateNaissance, setCreateDateNaissance] = useState('')
  const [createAge, setCreateAge] = useState('')
  const [createNomParent, setCreateNomParent] = useState('')
  const [createEmail, setCreateEmail] = useState('')
  const [createTel, setCreateTel] = useState('')
  const [createGroupeRecommande, setCreateGroupeRecommande] = useState('')
  const [createCommentaireCoach, setCreateCommentaireCoach] = useState('')
  const [creatingCandidat, setCreatingCandidat] = useState(false)

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [resSessions, resCandidats, resSettings] = await Promise.all([
        fetch('/api/admin/tests-nage/sessions'),
        fetch('/api/admin/tests-nage/candidats'),
        fetch('/api/admin/parametres'),
      ])

      const dataSessions = await resSessions.json()
      const dataCandidats = await resCandidats.json()
      const dataSettings = await resSettings.json()

      if (resSessions.ok && dataSessions.sessions) {
        setSessions(dataSessions.sessions)
        if (dataSessions.sessions.length > 0 && !selectedSessionId) {
          setSelectedSessionId(dataSessions.sessions[0].id)
        }
      }
      if (resCandidats.ok && dataCandidats.candidats) {
        setCandidats(dataCandidats.candidats)
      }
      if (resSettings.ok && dataSettings.settings) {
        setAfficherBoutonTest(dataSettings.settings.afficherBoutonTest ?? true)
        setCodeAccesTestsNage(dataSettings.settings.codeAccesTestsNage || '')
      }
    } catch (err) {
      console.error('Erreur chargement admin tests-nage:', err)
      toast.error('Erreur lors du chargement des données')
    } finally {
      setLoading(false)
    }
  }, [selectedSessionId])

  useEffect(() => {
    loadData()
  }, [loadData])

  const handleToggleBoutonTest = async () => {
    const newValue = !afficherBoutonTest
    setTogglingBoutonTest(true)
    try {
      const res = await fetch('/api/admin/parametres', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ afficherBoutonTest: newValue }),
      })
      if (res.ok) {
        setAfficherBoutonTest(newValue)
        toast.success(newValue ? 'Inscriptions publiques activées (/tests-de-nage ouvert)' : 'Inscriptions publiques fermées (/tests-de-nage verrouillé)')
      } else {
        toast.error('Erreur lors de la mise à jour')
      }
    } catch {
      toast.error('Erreur réseau')
    } finally {
      setTogglingBoutonTest(false)
    }
  }

  // Détection des créneaux passés (pour alléger l'interface)
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
    return currentSession.creneaux.filter((cr) => {
      if (creneauFilter === 'avec_inscrits') return cr.inscriptions.length > 0
      if (creneauFilter === 'a_venir') return !isCreneauPasse(currentSession.date, cr.heureFin)
      return true
    })
  }, [currentSession, creneauFilter, isCreneauPasse])

  // Copier le lien public
  const handleCopyPublicLink = () => {
    let url = `${window.location.origin}/tests-de-nage`
    if (codeAccesTestsNage.trim()) {
      url += `?code=${encodeURIComponent(codeAccesTestsNage.trim())}`
    }
    navigator.clipboard.writeText(url)
    toast.success(codeAccesTestsNage.trim() ? 'Lien d\'accès direct avec mot de passe copié !' : 'Lien public copié !')
  }

  // Création d'une session avec génération automatique
  const handleCreateSession = async (e: React.FormEvent) => {
    e.preventDefault()
    setCreatingSession(true)
    try {
      const res = await fetch('/api/admin/tests-nage/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          titre: newSessionTitre,
          date: newSessionDate,
          heureDebut: newSessionHeureDebut,
          heureFin: newSessionHeureFin,
          dureeMinutes: newSessionDuree,
          capaciteParCreneau: newSessionCapacite,
          lieu: newSessionLieu,
        }),
      })

      const data = await res.json()
      if (res.ok) {
        toast.success(data.message || 'Session créée avec succès')
        setShowCreateSessionModal(false)
        await loadData()
      } else {
        toast.error(data.error || 'Erreur lors de la création')
      }
    } catch {
      toast.error('Erreur de connexion')
    } finally {
      setCreatingSession(false)
    }
  }

  // Import de candidats en masse
  const handleImportCandidats = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!importText.trim()) return toast.error('Veuillez coller la liste des candidats')

    setImporting(true)
    try {
      const res = await fetch('/api/admin/tests-nage/candidats/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: selectedSessionId || null,
          texteBrut: importText,
        }),
      })

      const data = await res.json()
      if (res.ok) {
        toast.success(data.message || 'Importation réussie')
        setShowImportModal(false)
        setImportText('')
        await loadData()
      } else {
        toast.error(data.error || "Erreur lors de l'import")
      }
    } catch {
      toast.error('Erreur de connexion')
    } finally {
      setImporting(false)
    }
  }

  // Suppression globale de l'ensemble du listing des candidats
  const handleDeleteAllCandidats = async () => {
    if (candidats.length === 0) {
      return toast.error('Aucun candidat dans le listing')
    }
    if (
      !confirm(
        `⚠️ ATTENTION : Vous êtes sur le point de supprimer définitivement TOUT le listing des ${candidats.length} candidats.\n\nCette action est irréversible. Confirmez-vous la suppression ?`
      )
    ) {
      return
    }

    try {
      const res = await fetch('/api/admin/tests-nage/candidats', {
        method: 'DELETE',
      })
      const data = await res.json()
      if (res.ok && data.success) {
        toast.success(data.message || 'Tous les candidats ont été supprimés avec succès')
        loadData()
      } else {
        toast.error(data.error || 'Erreur lors de la suppression du listing')
      }
    } catch {
      toast.error('Erreur réseau lors de la suppression')
    }
  }

  // Inscription manuelle d'un enfant par l'admin
  const handleManualAddInscription = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!manualAddCreneauId) return toast.error('Créneau non défini')
    if (!manualNom.trim() || !manualPrenom.trim()) return toast.error("Nom et prénom requis")

    setManualSubmitting(true)
    try {
      const res = await fetch('/api/admin/tests-nage/inscriptions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          creneauId: manualAddCreneauId,
          nomEnfant: manualNom.trim(),
          prenomEnfant: manualPrenom.trim(),
          age: manualAge ? parseInt(manualAge, 10) : null,
          nomParent: manualNomParent.trim() || null,
          emailParent: manualEmail.trim() || null,
          telephoneParent: manualTel.trim() || null,
          niveauEstime: manualNiveau,
          remarques: manualRemarques.trim() || null,
        }),
      })

      if (res.ok) {
        toast.success('Enfant inscrit avec succès')
        setShowManualAddModal(false)
        setManualNom('')
        setManualPrenom('')
        setManualAge('')
        setManualNomParent('')
        setManualEmail('')
        setManualTel('')
        setManualRemarques('')
        await loadData()
      } else {
        const data = await res.json()
        toast.error(data.error || "Erreur lors de l'inscription")
      }
    } catch {
      toast.error('Erreur de connexion')
    } finally {
      setManualSubmitting(false)
    }
  }

  // Mise à jour de l'évaluation d'un nageur (statut, groupe, note)
  const handleUpdateInscription = async (
    inscriptionId: string,
    updates: Partial<InscriptionItem>
  ) => {
    try {
      const res = await fetch(`/api/admin/tests-nage/inscriptions/${inscriptionId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      })

      if (res.ok) {
        toast.success('Mise à jour enregistrée')
        await loadData()
      } else {
        toast.error('Erreur lors de la mise à jour')
      }
    } catch {
      toast.error('Erreur de connexion')
    }
  }

  // Ouvrir la modale d'édition / complétion pour un candidat
  const handleOpenEditCandidat = (c: CandidatItem) => {
    setEditingCandidatId(c.id)
    setEditNom(c.nom || '')
    setEditPrenom(c.prenom || '')
    setEditDateNaissance(c.dateNaissance ? c.dateNaissance.split('T')[0] : '')
    setEditAge(c.age !== null && c.age !== undefined ? String(c.age) : '')
    setEditNomParent(c.nomParent || '')
    setEditEmail(c.emailParent || '')
    setEditTel(c.telephoneParent || '')
    setEditStatut(c.statut || 'a_planifier')
    setEditGroupeRecommande(c.groupeRecommande || '')
    setEditCommentaireCoach(c.commentaireCoach || '')
    setShowEditCandidatModal(true)
  }

  // Ouvrir l'édition depuis une inscription (bord de bassin)
  const handleOpenEditFromInscription = (insc: InscriptionItem) => {
    if (insc.candidatId) {
      const c = candidats.find((cand) => cand.id === insc.candidatId)
      if (c) {
        handleOpenEditCandidat(c)
        return
      }
    }
    // Si pas de candidat direct, on pré-remplit avec les données de l'inscription
    setEditingCandidatId(insc.candidatId || null)
    setEditNom(insc.nomEnfant || '')
    setEditPrenom(insc.prenomEnfant || '')
    setEditDateNaissance(insc.dateNaissance ? insc.dateNaissance.split('T')[0] : '')
    setEditAge(insc.age !== null && insc.age !== undefined ? String(insc.age) : '')
    setEditNomParent(insc.nomParent || '')
    setEditEmail(insc.emailParent || '')
    setEditTel(insc.telephoneParent || '')
    setEditStatut(insc.statut === 'annule' ? 'a_planifier' : (insc.statut as string) || 'planifie')
    setEditGroupeRecommande(insc.groupeRecommande || '')
    setEditCommentaireCoach(insc.commentaireCoach || '')
    setShowEditCandidatModal(true)
  }

  // Enregistrer les modifications sur un candidat
  const handleSaveCandidat = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editNom.trim() || !editPrenom.trim()) {
      return toast.error('Nom et prénom obligatoires')
    }

    setSavingCandidat(true)
    try {
      if (editingCandidatId) {
        const res = await fetch(`/api/admin/tests-nage/candidats/${editingCandidatId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            nom: editNom.trim(),
            prenom: editPrenom.trim(),
            dateNaissance: editDateNaissance ? editDateNaissance : null,
            age: editAge ? parseInt(editAge, 10) : null,
            nomParent: editNomParent.trim() || null,
            emailParent: editEmail.trim() || null,
            telephoneParent: editTel.trim() || null,
            statut: editStatut,
            groupeRecommande: editGroupeRecommande || null,
            commentaireCoach: editCommentaireCoach.trim() || null,
          }),
        })

        if (res.ok) {
          toast.success('Informations du candidat mises à jour !')
          setShowEditCandidatModal(false)
          await loadData()
        } else {
          const err = await res.json()
          toast.error(err.error || 'Erreur lors de la sauvegarde')
        }
      } else {
        // Si créé sans ID existant
        const res = await fetch('/api/admin/tests-nage/candidats', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId: selectedSessionId || null,
            nom: editNom.trim(),
            prenom: editPrenom.trim(),
            dateNaissance: editDateNaissance ? editDateNaissance : null,
            age: editAge ? parseInt(editAge, 10) : null,
            nomParent: editNomParent.trim() || null,
            emailParent: editEmail.trim() || null,
            telephoneParent: editTel.trim() || null,
            statut: editStatut,
            groupeRecommande: editGroupeRecommande || null,
            commentaireCoach: editCommentaireCoach.trim() || null,
          }),
        })

        if (res.ok) {
          toast.success('Candidat enregistré avec succès !')
          setShowEditCandidatModal(false)
          await loadData()
        } else {
          const err = await res.json()
          toast.error(err.error || "Erreur lors de l'enregistrement")
        }
      }
    } catch {
      toast.error('Erreur de connexion')
    } finally {
      setSavingCandidat(false)
    }
  }

  // Création directe d'un nouveau candidat (dans le suivi)
  const handleCreateCandidat = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!createNom.trim() || !createPrenom.trim()) {
      return toast.error('Nom et prénom obligatoires')
    }

    setCreatingCandidat(true)
    try {
      const res = await fetch('/api/admin/tests-nage/candidats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: selectedSessionId || null,
          nom: createNom.trim(),
          prenom: createPrenom.trim(),
          dateNaissance: createDateNaissance ? createDateNaissance : null,
          age: createAge ? parseInt(createAge, 10) : null,
          nomParent: createNomParent.trim() || null,
          emailParent: createEmail.trim() || null,
          telephoneParent: createTel.trim() || null,
          statut: 'a_planifier',
          groupeRecommande: createGroupeRecommande || null,
          commentaireCoach: createCommentaireCoach.trim() || null,
        }),
      })

      if (res.ok) {
        toast.success('Nouveau candidat ajouté au listing !')
        setShowCreateCandidatModal(false)
        setCreateNom('')
        setCreatePrenom('')
        setCreateDateNaissance('')
        setCreateAge('')
        setCreateNomParent('')
        setCreateEmail('')
        setCreateTel('')
        setCreateGroupeRecommande('')
        setCreateCommentaireCoach('')
        await loadData()
      } else {
        const err = await res.json()
        toast.error(err.error || "Erreur lors de l'ajout du candidat")
      }
    } catch {
      toast.error('Erreur de connexion')
    } finally {
      setCreatingCandidat(false)
    }
  }

  // Suppression d'une inscription
  const handleDeleteInscription = async (inscriptionId: string) => {
    if (!confirm('Supprimer cette inscription et libérer la place sur le créneau ?')) return
    try {
      const res = await fetch(`/api/admin/tests-nage/inscriptions/${inscriptionId}`, {
        method: 'DELETE',
      })
      if (res.ok) {
        toast.success('Inscription supprimée')
        await loadData()
      } else {
        toast.error('Erreur lors de la suppression')
      }
    } catch {
      toast.error('Erreur de connexion')
    }
  }

  // Envoi de relance par email aux candidats non planifiés
  const handleSendRelance = async (e: React.FormEvent) => {
    e.preventDefault()
    setRelancing(true)
    try {
      const res = await fetch('/api/admin/tests-nage/candidats/relancer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          candidateIds: relanceCandidateIds.length > 0 ? relanceCandidateIds : undefined,
          all: relanceCandidateIds.length === 0,
          sessionId: selectedSessionId || undefined,
          customSubject: relanceCustomSubject.trim() || undefined,
          customMessage: relanceCustomMessage.trim() || undefined,
        }),
      })

      const data = await res.json()
      if (res.ok && data.success) {
        toast.success(data.message || `${data.count} relance(s) envoyée(s) avec succès !`)
        setShowRelanceModal(false)
        setRelanceCandidateIds([])
        setRelanceCustomMessage('')
        await loadData()
      } else {
        toast.error(data.error || 'Erreur lors de l\'envoi des relances')
      }
    } catch {
      toast.error('Erreur de connexion')
    } finally {
      setRelancing(false)
    }
  }

  // Basculer l'état actif d'un créneau (ex: pause)
  const handleToggleCreneau = async (creneauId: string, currentActif: boolean) => {
    try {
      const res = await fetch(`/api/admin/tests-nage/creneaux/${creneauId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ actif: !currentActif }),
      })
      if (res.ok) {
        toast.success(currentActif ? 'Créneau désactivé (pause)' : 'Créneau réactivé')
        await loadData()
      }
    } catch {
      toast.error('Erreur de connexion')
    }
  }

  // Suppression d'une session
  const handleDeleteSession = async (sessionId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette session et tous ses créneaux associés ?')) return
    try {
      const res = await fetch(`/api/admin/tests-nage/sessions/${sessionId}`, {
        method: 'DELETE',
      })
      if (res.ok) {
        toast.success('Session supprimée')
        await loadData()
      }
    } catch {
      toast.error('Erreur lors de la suppression')
    }
  }

  // Verrouiller / Déverrouiller manuellement les inscriptions d'une session
  const handleToggleBloquerSession = async (session: SessionItem) => {
    const nouveauStatutBloque = !session.bloquee
    try {
      setSessions((prev) =>
        prev.map((s) => (s.id === session.id ? { ...s, bloquee: nouveauStatutBloque } : s))
      )
      const res = await fetch(`/api/admin/tests-nage/sessions/${session.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bloquee: nouveauStatutBloque }),
      })
      if (res.ok) {
        toast.success(
          nouveauStatutBloque
            ? '🔒 Inscriptions bloquées pour cette séance'
            : '🟢 Inscriptions rouvertes pour cette séance'
        )
      } else {
        toast.error('Erreur lors de la modification de la séance')
        await loadData()
      }
    } catch {
      toast.error('Erreur de connexion')
      await loadData()
    }
  }

  // Ouvrir la modale d'avertissement de report / incident technique
  const handleOpenNotifierModal = (session: SessionItem) => {
    setSessionToNotify(session)
    setNotifierCustomSubject(
      `⚠️ Incident technique piscine : Report de votre test de nage du ${formatCompactDateFr(session.date)}`
    )
    setNotifierCustomMessage(
      `En raison d'un problème technique imprévu survenu à la piscine couverte Alphonse Roudière ayant contraint la fermeture du bassin, la séance de tests de ce mercredi 16 septembre a dû être annulée.\n\nNous vous prions d'accepter toutes nos excuses pour ce désagrément indépendant de notre volonté.\n\nDe nouveaux créneaux ont été ouverts pour votre enfant. Merci de cliquer sur le bouton ci-dessous pour choisir votre nouvelle date et votre horaire en 1 clic (toutes vos données sont conservées).`
    )
    setNotifierBloquerSession(true)

    // Extraire tous les inscrits actifs de la séance
    const list: NotifierRecipientItem[] = session.creneaux.flatMap((c) =>
      c.inscriptions
        .filter((ins) => ins.statut !== 'annule')
        .map((ins) => ({
          id: ins.id,
          nomEnfant: ins.nomEnfant,
          prenomEnfant: ins.prenomEnfant,
          nomParent: ins.nomParent,
          emailParent: ins.emailParent,
          telephoneParent: ins.telephoneParent,
          creneauHoraire: `${c.heureDebut} à ${c.heureFin}`,
        }))
    )
    list.sort((a, b) => a.nomEnfant.localeCompare(b.nomEnfant))
    setNotifierRecipients(list)
    setNotifierExcludedIds([])
    setNotifierSearchFilter('')

    setShowNotifierAnnulationModal(true)
  }

  // Retirer un enfant du listing de notification
  const handleRemoveNotifierRecipient = (id: string) => {
    setNotifierExcludedIds((prev) => (prev.includes(id) ? prev : [...prev, id]))
  }

  // Réintégrer un enfant dans le listing de notification
  const handleRestoreNotifierRecipient = (id: string) => {
    setNotifierExcludedIds((prev) => prev.filter((item) => item !== id))
  }

  // Réintégrer tous les enfants
  const handleRestoreAllNotifierRecipients = () => {
    setNotifierExcludedIds([])
  }

  // Exclure tous les enfants
  const handleExcludeAllNotifierRecipients = () => {
    setNotifierExcludedIds(notifierRecipients.map((r) => r.id))
  }

  // Envoi effectif des e-mails d'annulation et de reprogrammation
  const handleSendNotificationAnnulation = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!sessionToNotify) return

    const targetInscriptionIds = notifierRecipients
      .filter((r) => !notifierExcludedIds.includes(r.id))
      .map((r) => r.id)

    if (targetInscriptionIds.length === 0) {
      toast.error('Veuillez sélectionner au moins un enfant destinataire.')
      return
    }

    setNotifierLoading(true)
    try {
      const res = await fetch(`/api/admin/tests-nage/sessions/${sessionToNotify.id}/notifier-annulation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customSubject: notifierCustomSubject.trim() || undefined,
          customMessage: notifierCustomMessage.trim() || undefined,
          bloquerSession: notifierBloquerSession,
          targetInscriptionIds,
        }),
      })
      const data = await res.json()
      if (res.ok && data.success) {
        toast.success(data.message || `${data.count} email(s) envoyés avec succès !`)
        setShowNotifierAnnulationModal(false)
        await loadData()
      } else {
        toast.error(data.error || 'Erreur lors de l’envoi des notifications')
      }
    } catch {
      toast.error('Erreur réseau lors de la notification')
    } finally {
      setNotifierLoading(false)
    }
  }

  // Fusion de deux sessions sans perte de données
  const handleFusionSessions = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!fusionSourceSessionId || !fusionTargetSessionId) {
      toast.error('Veuillez sélectionner la session à intégrer et la session principale cible')
      return
    }
    if (fusionSourceSessionId === fusionTargetSessionId) {
      toast.error('Veuillez sélectionner deux sessions distinctes pour la fusion')
      return
    }

    setFusionLoading(true)
    try {
      const res = await fetch('/api/admin/tests-nage/sessions/fusionner', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceSessionId: fusionSourceSessionId,
          targetSessionId: fusionTargetSessionId,
        }),
      })

      const data = await res.json()
      if (res.ok) {
        toast.success(data.message || 'Sessions fusionnées avec succès !')
        setShowFusionModal(false)
        setSelectedSessionId(fusionTargetSessionId)
        await loadData()
      } else {
        toast.error(data.error || 'Erreur lors de la fusion')
      }
    } catch {
      toast.error('Erreur réseau lors de la fusion')
    } finally {
      setFusionLoading(false)
    }
  }

  // Export CSV de la session courante
  const handleExportCsv = () => {
    if (!currentSession) return

    let csvContent = 'data:text/csv;charset=utf-8,'
    csvContent += 'Heure Debut;Heure Fin;Nom Enfant;Prenom Enfant;Age;Niveau Estime;Statut;Groupe Recommande;Commentaire Coach;Nom Parent;Telephone;Email\n'

    currentSession.creneaux.forEach((cr) => {
      if (cr.inscriptions.length === 0) {
        csvContent += `${cr.heureDebut};${cr.heureFin};(Créneau libre);;;;;;;;;\n`
      } else {
        cr.inscriptions.forEach((insc) => {
          csvContent += `"${cr.heureDebut}";"${cr.heureFin}";"${insc.nomEnfant}";"${insc.prenomEnfant}";"${insc.age || ''}";"${insc.niveauEstime || ''}";"${insc.statut}";"${insc.groupeRecommande || ''}";"${(insc.commentaireCoach || '').replace(/"/g, '""')}";"${insc.nomParent || ''}";"${insc.telephoneParent}";"${insc.emailParent}"\n`
        })
      }
    })

    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `tests_nage_${currentSession.date.split('T')[0]}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // Télécharger la fiche d'évaluation individuelle d'un enfant
  const handleDownloadFicheIndividuelle = (insc: InscriptionItem, creneau?: CreneauItem) => {
    try {
      const rawDateNais = insc.dateNaissance || insc.candidat?.dateNaissance
      const rawAge = insc.age ?? insc.candidat?.age
      const tel = insc.telephoneParent || insc.candidat?.telephoneParent
      const parent = insc.nomParent || insc.candidat?.nomParent
      const email = insc.emailParent || insc.candidat?.emailParent
      const groupe = insc.groupeRecommande || insc.candidat?.groupeRecommande

      const doc = generateFicheEvaluationPDF({
        nomEnfant: insc.nomEnfant,
        prenomEnfant: insc.prenomEnfant,
        dateNaissance: rawDateNais,
        age: rawAge,
        nomParent: parent,
        emailParent: email,
        telephoneParent: tel,
        niveauEstime: insc.niveauEstime,
        remarques: insc.remarques,
        statut: insc.statut,
        dateTest: currentSession?.date,
        heureDebut: creneau?.heureDebut,
        heureFin: creneau?.heureFin,
        lieuTest: currentSession?.lieu,
        titreSession: currentSession?.titre,
        groupeRecommande: groupe,
        commentaireCoach: insc.commentaireCoach,
        isVierge: false,
      })
      const safeNom = (insc.nomEnfant || 'enfant').toLowerCase().replace(/[^a-z0-9]/g, '_')
      const safePrenom = (insc.prenomEnfant || '').toLowerCase().replace(/[^a-z0-9]/g, '_')
      doc.save(`fiche_evaluation_${safeNom}_${safePrenom}.pdf`)
      toast.success(`Fiche d'évaluation de ${insc.prenomEnfant} ${insc.nomEnfant} téléchargée !`)
    } catch (err) {
      console.error('Erreur génération fiche individuelle:', err)
      toast.error('Erreur lors de la génération de la fiche d\'évaluation')
    }
  }

  // Télécharger toutes les fiches d'évaluation de la journée (session sélectionnée)
  const handleDownloadToutesFichesJournee = () => {
    if (!currentSession) {
      toast.error('Veuillez sélectionner une session')
      return
    }
    const totalInscrits = currentSession.stats.totalInscrits
    if (totalInscrits === 0) {
      toast.error('Aucun enfant inscrit sur cette journée')
      return
    }
    try {
      const doc = generateFichesJourneePDF(currentSession)
      const dateFormatted = formatCompactDateFr(currentSession.date).replace(/\//g, '-')
      doc.save(`fiches_evaluation_journee_${dateFormatted}.pdf`)
      toast.success(`${totalInscrits} fiche(s) d'évaluation de la journée téléchargée(s) !`)
    } catch (err) {
      console.error('Erreur génération fiches journée:', err)
      toast.error('Erreur lors de la génération des fiches de la journée')
    }
  }

  // Télécharger une fiche d'évaluation vierge
  const handleDownloadFicheVierge = () => {
    try {
      const doc = generateFicheViergePDF({
        titre: currentSession?.titre,
        date: currentSession?.date,
        lieu: currentSession?.lieu,
      })
      doc.save('fiche_evaluation_vierge.pdf')
      toast.success('Fiche d\'évaluation vierge téléchargée !')
    } catch (err) {
      console.error('Erreur génération fiche vierge:', err)
      toast.error('Erreur lors de la génération de la fiche vierge')
    }
  }

  // Télécharger le programme des passages de la journée en PDF (format A4 bord de bassin)
  const handleDownloadProgrammePDF = () => {
    if (!currentSession) {
      toast.error('Veuillez sélectionner une session')
      return
    }
    if (currentSession.creneaux.length === 0) {
      toast.error('Cette session ne contient aucun créneau')
      return
    }
    try {
      const doc = generateProgrammePassagePDF(currentSession)
      const dateFormatted = formatCompactDateFr(currentSession.date).replace(/\//g, '-')
      doc.save(`programme_tests_nage_${dateFormatted}.pdf`)
      toast.success('Programme des passages (PDF) téléchargé !')
    } catch (err) {
      console.error('Erreur génération programme PDF:', err)
      toast.error('Erreur lors de la génération du programme PDF')
    }
  }

  // Filtrage des candidats
  const filteredCandidats = useMemo(() => {
    return candidats.filter((c) => {
      // Statut filter
      if (candidatFilter !== 'tous') {
        if (candidatFilter === 'a_planifier' && c.statut !== 'a_planifier') return false
        if (candidatFilter === 'planifie' && c.statut !== 'planifie') return false
        if (candidatFilter === 'present' && c.statut !== 'present') return false
        if (candidatFilter === 'absent' && c.statut !== 'absent') return false
        if (candidatFilter === 'hors_listing' && c.statut !== 'hors_listing') return false
        if (candidatFilter === 'relances' && !c.derniereRelance) return false
      }
      // Search text
      if (candidatSearch.trim()) {
        const q = candidatSearch.toLowerCase()
        const match =
          c.nom.toLowerCase().includes(q) ||
          c.prenom.toLowerCase().includes(q) ||
          (c.emailParent && c.emailParent.toLowerCase().includes(q)) ||
          (c.telephoneParent && c.telephoneParent.includes(q))
        if (!match) return false
      }
      return true
    })
  }, [candidats, candidatFilter, candidatSearch])

  // Nombre de candidats hors listing
  const horsListingCount = useMemo(() => {
    return candidats.filter((c) => c.statut === 'hors_listing').length
  }, [candidats])

  // Nombre de candidats relancés par email
  const relancedCount = useMemo(() => {
    return candidats.filter((c) => !!c.derniereRelance).length
  }, [candidats])

  // Candidats à planifier ayant une adresse email valide (pour relance)
  const unplanifiedWithEmail = useMemo(() => {
    return candidats.filter((c) => c.statut === 'a_planifier' && c.emailParent && c.emailParent.includes('@'))
  }, [candidats])

  // Liste des candidats éligibles pour l'association (exclut les hors_listing)
  const candidatesForAssociation = useMemo(() => {
    if (!showAssocierModal) return []
    const baseList = candidats.filter((c) => c.statut !== 'hors_listing')
    if (!associerSearch.trim()) return baseList.slice(0, 30)
    const q = associerSearch.toLowerCase().trim()
    return baseList
      .filter(
        (c) =>
          c.nom.toLowerCase().includes(q) ||
          c.prenom.toLowerCase().includes(q) ||
          (c.nomParent && c.nomParent.toLowerCase().includes(q)) ||
          (c.emailParent && c.emailParent.toLowerCase().includes(q))
      )
      .slice(0, 30)
  }, [candidats, showAssocierModal, associerSearch])

  // Valider l'association d'une inscription hors listing avec un candidat du listing
  const handleAssocierCandidat = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!associerInscription || !selectedTargetCandidatId) {
      return toast.error('Veuillez sélectionner un enfant du listing')
    }

    setAssociating(true)
    try {
      const res = await fetch('/api/admin/tests-nage/candidats/associer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          inscriptionId: associerInscription.id,
          targetCandidatId: selectedTargetCandidatId,
        }),
      })

      const data = await res.json()
      if (res.ok && data.success) {
        toast.success(data.message || 'Association validée avec succès !')
        setShowAssocierModal(false)
        setAssocierInscription(null)
        setSelectedTargetCandidatId(null)
        await loadData()
      } else {
        toast.error(data.error || "Erreur lors de l'association")
      }
    } catch {
      toast.error('Erreur réseau lors de la communication avec le serveur')
    } finally {
      setAssociating(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-slate-500 font-medium">Chargement des sessions de tests de nage...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* ─── EN-TÊTE ÉPURÉ & BARRE D'ACTIONS COMPACTE ─── */}
      <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-xs space-y-3.5 print:hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h2 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
                Tests de Nage & Niveau
              </h2>
              {/* Badge interactif discret d'ouverture/fermeture */}
              <button
                type="button"
                onClick={handleToggleBoutonTest}
                disabled={togglingBoutonTest}
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-black cursor-pointer transition-all ${
                  afficherBoutonTest
                    ? 'bg-emerald-100 hover:bg-emerald-200 text-emerald-900 border border-emerald-300'
                    : 'bg-rose-100 hover:bg-rose-200 text-rose-900 border border-rose-300'
                }`}
                title="Cliquer pour ouvrir ou fermer les inscriptions publiques"
              >
                <span>{afficherBoutonTest ? '🟢 Inscriptions Ouvertes' : '🔒 Inscriptions Closes'}</span>
              </button>
              {codeAccesTestsNage.trim() && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-800 border border-blue-200">
                  Code : {codeAccesTestsNage.trim()}
                </span>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleCopyPublicLink}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs transition-colors cursor-pointer"
              title="Lien public pour les parents"
            >
              <Copy className="w-3.5 h-3.5 text-primary" />
              <span>Lien public</span>
            </button>

            <button
              onClick={() => setShowImportModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs transition-colors cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5 text-slate-600" />
              <span>Importer listing</span>
            </button>

            <button
              onClick={() => setShowCreateSessionModal(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-primary hover:bg-primary-dark text-white font-bold text-xs transition-colors shadow-xs cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Créer session</span>
            </button>
          </div>
        </div>
      </div>

      {/* ─── ONGLETS DE NAVIGATION SOUS-MODULE ─── */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-2 print:hidden">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveSubTab('passages')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeSubTab === 'passages'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            Feuille de passage
          </button>

          <button
            onClick={() => setActiveSubTab('candidats')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeSubTab === 'candidats'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            Suivi des Candidats
          </button>

          <button
            onClick={() => setActiveSubTab('sessions')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeSubTab === 'sessions'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            Sessions & Plages
          </button>
        </div>

        {activeSubTab === 'passages' && currentSession && (
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleDownloadToutesFichesJournee}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black shadow-xs transition-colors cursor-pointer"
              title="Télécharger un PDF unique contenant les fiches d'évaluation de tous les enfants de la journée (1 page par enfant)"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>📑 Toutes les fiches ({currentSession.stats.totalInscrits})</span>
            </button>
            <button
              onClick={handleDownloadProgrammePDF}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-black shadow-xs transition-colors cursor-pointer"
              title="Télécharger le programme officiel des passages (PDF imprimable A4)"
            >
              <Download className="w-3.5 h-3.5" />
              <span>📄 Programme (PDF)</span>
            </button>
            <button
              onClick={handleExportCsv}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>CSV</span>
            </button>
          </div>
        )}
      </div>

      {/* ─── VUE 1 : FEUILLE DE PASSAGE CHRONOLOGIQUE (BORD DE BASSIN) ─── */}
      {activeSubTab === 'passages' && (
        <div className="space-y-4">
          {/* Sélecteur de session et état de verrouillage */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 p-2.5 rounded-2xl border border-slate-200 print:hidden">
            <div className="flex items-center gap-2 flex-1 min-w-[280px]">
              {sessions.length > 1 ? (
                <>
                  <span className="text-xs font-bold text-slate-500 pl-2">Session :</span>
                  <select
                    value={selectedSessionId}
                    onChange={(e) => setSelectedSessionId(e.target.value)}
                    className="flex-1 bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-900 outline-none cursor-pointer"
                  >
                    {sessions.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.titre} ({formatCompactDateFr(s.date)} · {s.heureDebut}-{s.heureFin}) {s.bloquee ? '🔒 [Bloquée]' : ''}
                      </option>
                    ))}
                  </select>
                </>
              ) : currentSession ? (
                <div className="text-xs font-bold text-slate-800 pl-2">
                  Session : <span className="text-primary">{currentSession.titre}</span> ({formatCompactDateFr(currentSession.date)})
                </div>
              ) : null}
            </div>

            {currentSession && (
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleOpenNotifierModal(currentSession)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold text-xs bg-red-50 hover:bg-red-100 text-red-800 border border-red-200 transition-colors cursor-pointer shadow-3xs"
                  title="Envoyer un email d'explication et de reprogrammation aux familles inscrites à cette séance suite à l'incident technique"
                >
                  <Mail className="w-3.5 h-3.5 text-red-600 shrink-0" />
                  <span>Notifier report / Incident ({currentSession.stats.totalInscrits})</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleToggleBloquerSession(currentSession)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold text-xs transition-colors cursor-pointer border shadow-3xs ${
                    currentSession.bloquee
                      ? 'bg-amber-100 hover:bg-amber-200 text-amber-900 border-amber-300'
                      : 'bg-white hover:bg-slate-100 text-slate-800 border-slate-200'
                  }`}
                  title={currentSession.bloquee ? 'Cliquer pour rouvrir les inscriptions publiques pour cette séance' : 'Cliquer pour bloquer les inscriptions publiques (même si la séance n\'est pas complète)'}
                >
                  {currentSession.bloquee ? (
                    <>
                      <Lock className="w-3.5 h-3.5 text-amber-700" />
                      <span>🔒 Inscriptions bloquées</span>
                    </>
                  ) : (
                    <>
                      <Unlock className="w-3.5 h-3.5 text-emerald-600" />
                      <span>🟢 Inscriptions ouvertes</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </div>

          {/* ─── VUE IMPRESSION DÉDIÉE (A4 / PDF PROPRE ET SIMPLE) ─── */}
          {currentSession && (
            <div className="hidden print:block font-sans text-slate-900">
              <div className="border-b-2 border-slate-900 pb-3 mb-4 flex items-start justify-between">
                <div>
                  <h1 className="text-xl font-black uppercase tracking-tight">Triton Club Cavaillon · Programme des Tests</h1>
                  <p className="text-sm font-bold text-slate-800 mt-0.5">
                    {currentSession.titre} — {formatLongDateFr(currentSession.date)}
                  </p>
                  <p className="text-xs text-slate-600">
                    📍 {currentSession.lieu} · ⏰ {currentSession.heureDebut} à {currentSession.heureFin} ({currentSession.dureeMinutes} min / créneau)
                  </p>
                </div>
                <div className="text-right">
                  <span className="inline-block px-3 py-1 bg-slate-100 border border-slate-300 font-bold text-xs rounded-md">
                    {currentSession.stats.totalInscrits} nageurs inscrits
                  </span>
                  <p className="text-[10px] text-slate-400 mt-1">Imprimé le {new Date().toLocaleDateString('fr-FR')}</p>
                </div>
              </div>

              <table className="w-full border-collapse text-xs border border-slate-300">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-300 font-black text-slate-800 text-[11px]">
                    <th className="py-2 px-2 text-left w-24 border-r border-slate-300">Horaire</th>
                    <th className="py-2 px-2 text-left border-r border-slate-300">Nageur (Nom Prénom)</th>
                    <th className="py-2 px-2 text-center w-12 border-r border-slate-300">Âge</th>
                    <th className="py-2 px-2 text-left w-28 border-r border-slate-300">Téléphone</th>
                    <th className="py-2 px-2 text-left border-r border-slate-300">Niveau / Remarques</th>
                    <th className="py-2 px-2 text-center w-20 border-r border-slate-300">Pointage</th>
                    <th className="py-2 px-2 text-left w-44">Groupe attribué & Visa</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {currentSession.creneaux.map((cr) => {
                    if (cr.inscriptions.length === 0) {
                      return (
                        <tr key={cr.id} className="text-slate-400 bg-slate-50/40 break-inside-avoid">
                          <td className="py-1.5 px-2 font-mono font-bold border-r border-slate-300">{cr.heureDebut} - {cr.heureFin}</td>
                          <td colSpan={6} className="py-1.5 px-2 italic text-[11px] text-slate-400">Créneau libre</td>
                        </tr>
                      )
                    }
                    return cr.inscriptions.map((insc, idx) => {
                      const isHorsListing = !insc.candidatId || insc.candidat?.statut === 'hors_listing' || (insc.statut as string) === 'hors_listing'
                      return (
                        <tr key={insc.id} className={`break-inside-avoid ${isHorsListing ? 'bg-rose-50/60 font-semibold' : ''}`}>
                          {idx === 0 ? (
                            <td rowSpan={cr.inscriptions.length} className="py-1.5 px-2 font-mono font-bold align-top border-r border-slate-300 bg-slate-50">
                              {cr.heureDebut} - {cr.heureFin}
                            </td>
                          ) : null}
                          <td className="py-1.5 px-2 border-r border-slate-300">
                            <span className="font-bold">{insc.nomEnfant} {insc.prenomEnfant}</span>
                            {isHorsListing && <span className="ml-1 text-[9px] text-red-700 font-bold">[Hors listing]</span>}
                            {insc.nomParent && <span className="block text-[10px] text-slate-500">Par: {insc.nomParent}</span>}
                          </td>
                          <td className="py-1.5 px-2 text-center border-r border-slate-300">{insc.age ? `${insc.age} ans` : '-'}</td>
                          <td className="py-1.5 px-2 font-mono text-[11px] border-r border-slate-300">{insc.telephoneParent || '-'}</td>
                          <td className="py-1.5 px-2 text-[11px] border-r border-slate-300">
                            {insc.niveauEstime && <span>{insc.niveauEstime}</span>}
                            {insc.remarques && <span className="block text-[10px] text-slate-500 italic">{insc.remarques}</span>}
                          </td>
                          <td className="py-1.5 px-2 text-center border-r border-slate-300 font-mono">
                            {insc.statut === 'present' ? '✓ Présent' : insc.statut === 'absent' ? '✗ Absent' : '[   ]'}
                          </td>
                          <td className="py-1.5 px-2 text-[11px]">
                            {insc.groupeRecommande ? (
                              <span className="font-bold text-slate-900">{insc.groupeRecommande}</span>
                            ) : (
                              <span className="text-slate-300">....................................</span>
                            )}
                          </td>
                        </tr>
                      )
                    })
                  })}
                </tbody>
              </table>
            </div>
          )}

          {!currentSession || currentSession.creneaux.length === 0 ? (
            <div className="bg-white rounded-3xl p-12 text-center border border-slate-200">
              <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <h3 className="text-base font-bold text-slate-800">Aucune session active</h3>
              <p className="text-xs text-slate-500 mt-1">Créez une session de tests pour générer automatiquement la feuille de passage.</p>
            </div>
          ) : (
            <div className="space-y-3 print:hidden">
              {/* Filtre d'affichage des créneaux pour ne pas surcharger l'interface */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 bg-slate-50 p-3 rounded-2xl border border-slate-200 text-xs">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-slate-700">Affichage créneaux :</span>
                  <div className="inline-flex rounded-xl bg-white p-1 border border-slate-200 shadow-3xs">
                    <button
                      type="button"
                      onClick={() => setCreneauFilter('tous')}
                      className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                        creneauFilter === 'tous'
                          ? 'bg-slate-900 text-white shadow-3xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Tous ({currentSession.creneaux.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setCreneauFilter('a_venir')}
                      className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                        creneauFilter === 'a_venir'
                          ? 'bg-primary text-white shadow-3xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                      title="Masque les créneaux dont l'horaire est déjà passé aujourd'hui"
                    >
                      🕒 À venir & En cours ({currentSession.creneaux.filter((cr) => !isCreneauPasse(currentSession.date, cr.heureFin)).length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setCreneauFilter('avec_inscrits')}
                      className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                        creneauFilter === 'avec_inscrits'
                          ? 'bg-emerald-600 text-white shadow-3xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      👥 Avec inscrits ({currentSession.creneaux.filter((cr) => cr.inscriptions.length > 0).length})
                    </button>
                  </div>
                </div>

                {creneauFilter === 'a_venir' && currentSession.creneaux.some((cr) => isCreneauPasse(currentSession.date, cr.heureFin)) && (
                  <span className="text-[11px] font-medium text-slate-500 italic">
                    💡 Créneaux passés masqués pour ne pas surcharger l&apos;interface
                  </span>
                )}
              </div>

              {visibleCreneaux.length === 0 ? (
                <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-xs text-slate-500 font-medium space-y-2">
                  <p>Aucun créneau ne correspond au filtre sélectionné.</p>
                  <button
                    type="button"
                    onClick={() => setCreneauFilter('tous')}
                    className="font-bold text-primary hover:underline cursor-pointer"
                  >
                    Afficher tous les créneaux ({currentSession.creneaux.length}) →
                  </button>
                </div>
              ) : (
                visibleCreneaux.map((cr) => {
                const isComplet = cr.inscriptions.length >= cr.capacite
                return (
                  <div
                    key={cr.id}
                    className={`bg-white rounded-2xl border transition-all p-4 ${
                      !cr.actif
                        ? 'border-dashed border-slate-200 bg-slate-50/60 opacity-60'
                        : isComplet
                        ? 'border-emerald-200 shadow-2xs'
                        : cr.inscriptions.length > 0
                        ? 'border-amber-200'
                        : 'border-slate-200/80'
                    }`}
                  >
                    {/* Ligne en-tête du créneau */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-sm md:text-base font-black px-2.5 py-1 rounded-xl bg-slate-900 text-white">
                          {cr.heureDebut} – {cr.heureFin}
                        </span>
                        <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${
                          !cr.actif
                            ? 'bg-slate-100 text-slate-500 border-slate-200'
                            : isComplet
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                            : cr.inscriptions.length > 0
                            ? 'bg-amber-50 text-amber-800 border-amber-200'
                            : 'bg-slate-50 text-slate-500 border-slate-200'
                        }`}>
                          {!cr.actif ? 'Pause / Inactif' : `${cr.inscriptions.length}/${cr.capacite} nageur${cr.capacite > 1 ? 's' : ''}`}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 print:hidden">
                        {cr.inscriptions.length < cr.capacite && cr.actif && (
                          <button
                            onClick={() => {
                              setManualAddCreneauId(cr.id)
                              setShowManualAddModal(true)
                            }}
                            className="inline-flex items-center gap-1 text-[11px] font-bold text-primary hover:bg-emerald-50 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
                          >
                            <Plus className="w-3 h-3" />
                            <span>Ajouter un nageur</span>
                          </button>
                        )}
                        <button
                          onClick={() => handleToggleCreneau(cr.id, cr.actif)}
                          className="text-[11px] font-bold text-slate-400 hover:text-slate-700 px-2 py-1 rounded-lg transition-colors cursor-pointer"
                          title={cr.actif ? 'Mettre en pause' : 'Réactiver'}
                        >
                          {cr.actif ? '⏸️ Pause' : '▶️ Activer'}
                        </button>
                      </div>
                    </div>

                    {/* Liste des nageurs inscrits sur ce créneau */}
                    {cr.inscriptions.length === 0 ? (
                      <div className="py-3 text-center text-xs text-slate-400 font-medium">
                        Créneau libre (aucune inscription)
                      </div>
                    ) : (
                      <div className="divide-y divide-slate-100 mt-2">
                        {cr.inscriptions.map((insc) => {
                          const isHorsListing = !insc.candidatId || insc.candidat?.statut === 'hors_listing' || (insc.statut as string) === 'hors_listing'
                          const linkedCandidat = insc.candidatId ? candidats.find((c) => c.id === insc.candidatId) : null
                          const relanceInfo = linkedCandidat?.derniereRelance ? formatRelanceLabel(linkedCandidat.derniereRelance) : null
                          return (
                          <div
                            key={insc.id}
                            className={`py-3 flex flex-col lg:flex-row lg:items-center justify-between gap-3 text-xs transition-colors ${
                              isHorsListing
                                ? 'bg-rose-50/90 -mx-3 px-3.5 rounded-2xl border-2 border-rose-300 shadow-3xs my-1.5'
                                : ''
                            }`}
                          >
                            {/* Colonne 1 : Identité & Contact */}
                            <div className="space-y-1 min-w-[240px]">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className={`text-sm ${isHorsListing ? 'font-black text-rose-950' : 'font-bold text-slate-900'}`}>
                                  {insc.nomEnfant} {insc.prenomEnfant}
                                </span>
                                {isHorsListing && (
                                  <>
                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-600 text-white shadow-3xs">
                                      ⚠️ HORS LISTING
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setAssocierInscription(insc)
                                        setAssocierSearch(insc.nomEnfant)
                                        setSelectedTargetCandidatId(null)
                                        setShowAssocierModal(true)
                                      }}
                                      className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-rose-700 hover:bg-rose-800 text-white font-black text-[10px] transition-colors cursor-pointer shadow-3xs"
                                      title="Associer cette réservation à un enfant du listing (ex: le parent a mis son propre nom)"
                                    >
                                      <span>🔗 Associer au listing</span>
                                    </button>
                                  </>
                                )}
                                {insc.age && (
                                  <span className={`text-[11px] font-bold px-2 py-0.5 rounded-md ${
                                    isHorsListing ? 'text-rose-800 bg-rose-100' : 'text-slate-500 bg-slate-100'
                                  }`}>
                                    {insc.age} ans
                                  </span>
                                )}
                              </div>
                              {isHorsListing && (
                                <p className="text-[10px] font-black text-rose-700">
                                  ⚠️ Cet enfant n&apos;était pas dans le listing initial importé
                                </p>
                              )}
                              <p className="text-slate-500 text-[11px]">
                                {insc.nomParent && <span>Parent : {insc.nomParent} · </span>}
                                <a href={`tel:${insc.telephoneParent}`} className="text-slate-700 font-bold hover:underline">
                                  {insc.telephoneParent}
                                </a>
                              </p>
                              {relanceInfo && (
                                <p className="text-amber-800 text-[10px] font-semibold flex items-center gap-1">
                                  <Mail className="w-3 h-3 text-amber-600 shrink-0" />
                                  <span>Relancé : {relanceInfo.label}</span>
                                </p>
                              )}
                              {insc.niveauEstime && (
                                <p className="text-[11px] text-slate-600 italic">
                                  Niveau estimé : {insc.niveauEstime}
                                </p>
                              )}
                              {insc.remarques && (
                                <p className="text-[11px] text-amber-800 bg-amber-50/80 px-2 py-1 rounded-lg border border-amber-200/60">
                                  Remarque : {insc.remarques}
                                </p>
                              )}
                            </div>

                            {/* Colonne 2 : Pointage Présence rapide */}
                            <div className="flex items-center gap-1.5 print:hidden">
                              <button
                                onClick={() => handleUpdateInscription(insc.id, { statut: 'present' })}
                                className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${
                                  insc.statut === 'present'
                                    ? 'bg-emerald-600 text-white shadow-xs'
                                    : 'bg-slate-100 text-slate-600 hover:bg-emerald-50 hover:text-emerald-700'
                                }`}
                              >
                                ✓ Présent
                              </button>
                              <button
                                onClick={() => handleUpdateInscription(insc.id, { statut: 'absent' })}
                                className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${
                                  insc.statut === 'absent'
                                    ? 'bg-red-600 text-white shadow-xs'
                                    : 'bg-slate-100 text-slate-600 hover:bg-red-50 hover:text-red-700'
                                }`}
                              >
                                ✗ Absent
                              </button>
                            </div>

                            {/* Colonne 3 : Groupe recommandé & Commentaire */}
                            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 flex-1 max-w-xl">
                              <select
                                value={insc.groupeRecommande || ''}
                                onChange={(e) =>
                                  handleUpdateInscription(insc.id, {
                                    groupeRecommande: e.target.value || null,
                                    statut: 'present', // automatiquement marqué présent dès que le groupe est validé
                                  })
                                }
                                className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-800 outline-none focus:border-primary cursor-pointer"
                              >
                                <option value="">🎯 Groupe conseillé...</option>
                                {insc.groupeRecommande && !GROUPES_CONSEILLES.includes(insc.groupeRecommande) && (
                                  <option value={insc.groupeRecommande}>{insc.groupeRecommande}</option>
                                )}
                                {GROUPES_CONSEILLES.map((grp) => (
                                  <option key={grp} value={grp}>
                                    {grp}
                                  </option>
                                ))}
                              </select>

                              <input
                                type="text"
                                defaultValue={insc.commentaireCoach || ''}
                                onBlur={(e) => {
                                  if (e.target.value !== (insc.commentaireCoach || '')) {
                                    handleUpdateInscription(insc.id, {
                                      commentaireCoach: e.target.value.trim() || null,
                                    })
                                  }
                                }}
                                placeholder="Note technique du coach..."
                                className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-medium text-slate-800 outline-none focus:border-primary focus:bg-white transition-colors"
                              />

                              <button
                                type="button"
                                onClick={() => handleOpenEditFromInscription(insc)}
                                className="p-1.5 text-slate-500 hover:text-primary hover:bg-slate-100 rounded-lg transition-colors cursor-pointer print:hidden shrink-0"
                                title="Modifier / Compléter les informations du candidat"
                              >
                                <Edit className="w-3.5 h-3.5" />
                              </button>

                              <button
                                onClick={() => handleDownloadFicheIndividuelle(insc, cr)}
                                className="p-1.5 text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer print:hidden shrink-0"
                                title="Télécharger la fiche d'évaluation de cet enfant (PDF)"
                              >
                                <FileText className="w-3.5 h-3.5" />
                              </button>

                              <button
                                onClick={() => handleDeleteInscription(insc.id)}
                                className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer print:hidden shrink-0"
                                title="Supprimer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })
          )}
        </div>
      )}
    </div>
  )}

      {/* ─── VUE 2 : SUIVI DES CANDIDATS (LISTING GLOBAL) ─── */}
      {activeSubTab === 'candidats' && (
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4">
          {/* Barre de recherche et filtres */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="text"
                value={candidatSearch}
                onChange={(e) => setCandidatSearch(e.target.value)}
                placeholder="Rechercher un candidat par nom, parent, téléphone..."
                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:border-primary focus:outline-none"
              />
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              {unplanifiedWithEmail.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setRelanceCandidateIds([])
                    setRelanceTargetName(`Toutes les familles non planifiées (${unplanifiedWithEmail.length} enfants)`)
                    setRelanceCustomSubject('Rappel : Réservez votre créneau pour le Test de Nage (Triton Club Cavaillon)')
                    setRelanceCustomMessage('')
                    setShowRelanceModal(true)
                  }}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs transition-colors cursor-pointer shadow-xs mr-2"
                >
                  <Mail className="w-3.5 h-3.5" />
                  <span>Relancer les non-inscrits ({unplanifiedWithEmail.length})</span>
                </button>
              )}
              <button
                onClick={() => setCandidatFilter('tous')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                  candidatFilter === 'tous' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Tous ({candidats.length})
              </button>
              <button
                onClick={() => setCandidatFilter('a_planifier')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                  candidatFilter === 'a_planifier' ? 'bg-amber-500 text-white' : 'bg-amber-50 text-amber-800'
                }`}
              >
                🟡 Non planifiés
              </button>
              <button
                onClick={() => setCandidatFilter('planifie')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                  candidatFilter === 'planifie' ? 'bg-emerald-600 text-white' : 'bg-emerald-50 text-emerald-800'
                }`}
              >
                🟢 Créneau réservé
              </button>
              <button
                onClick={() => setCandidatFilter('present')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                  candidatFilter === 'present' ? 'bg-blue-600 text-white' : 'bg-blue-50 text-blue-800'
                }`}
              >
                🔵 Testés
              </button>
              <button
                onClick={() => setCandidatFilter('hors_listing')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                  candidatFilter === 'hors_listing' ? 'bg-rose-600 text-white' : 'bg-rose-50 text-rose-800 border border-rose-200'
                }`}
              >
                🔴 Hors listing ({horsListingCount})
              </button>
              <button
                onClick={() => setCandidatFilter('relances')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                  candidatFilter === 'relances' ? 'bg-purple-700 text-white' : 'bg-purple-50 text-purple-900 border border-purple-200'
                }`}
              >
                📧 Relancés ({relancedCount})
              </button>

              <button
                type="button"
                onClick={() => {
                  setCreateNom('')
                  setCreatePrenom('')
                  setCreateDateNaissance('')
                  setCreateAge('')
                  setCreateNomParent('')
                  setCreateEmail('')
                  setCreateTel('')
                  setCreateGroupeRecommande('')
                  setCreateCommentaireCoach('')
                  setShowCreateCandidatModal(true)
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition-colors cursor-pointer shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Nouveau Candidat</span>
              </button>

              {candidats.length > 0 && (
                <button
                  type="button"
                  onClick={handleDeleteAllCandidats}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold text-xs transition-colors cursor-pointer ml-auto"
                  title="Supprimer définitivement l'ensemble des candidats du listing"
                >
                  <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                  <span>Supprimer tout le listing ({candidats.length})</span>
                </button>
              )}
            </div>
          </div>

          {/* Tableau des candidats */}
          {filteredCandidats.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-xs font-medium">
              Aucun candidat ne correspond à vos critères de recherche.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 uppercase tracking-wider font-bold text-[10px]">
                    <th className="py-2.5 px-3">Candidat</th>
                    <th className="py-2.5 px-3">Âge</th>
                    <th className="py-2.5 px-3">Responsable</th>
                    <th className="py-2.5 px-3">Téléphone</th>
                    <th className="py-2.5 px-3">Statut</th>
                    <th className="py-2.5 px-3">Créneau réservé</th>
                    <th className="py-2.5 px-3">Dernière relance</th>
                    <th className="py-2.5 px-3">Groupe retenu</th>
                    <th className="py-2.5 px-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {filteredCandidats.map((c) => {
                    const activeInsc = c.inscriptions && c.inscriptions.length > 0 ? c.inscriptions[0] : null
                    const isHorsListing = c.statut === 'hors_listing'
                    return (
                      <tr
                        key={c.id}
                        className={`transition-colors ${
                          isHorsListing
                            ? 'bg-rose-50/80 border-l-4 border-l-rose-500 hover:bg-rose-100/70'
                            : 'hover:bg-slate-50/60'
                        }`}
                      >
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className={isHorsListing ? 'font-black text-rose-950' : 'font-bold text-slate-900'}>
                              {c.nom} {c.prenom}
                            </span>
                            {isHorsListing && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-600 text-white shadow-3xs">
                                ⚠️ HORS LISTING
                              </span>
                            )}
                          </div>
                          {isHorsListing && (
                            <span className="text-[10px] font-bold text-rose-700 block mt-0.5">
                              Non présent dans le listing initial
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-slate-500">
                          {c.age ? `${c.age} ans` : '-'}
                        </td>
                        <td className="py-3 px-3 text-slate-600">
                          {c.nomParent || '-'}
                        </td>
                        <td className="py-3 px-3 font-mono font-medium">
                          {c.telephoneParent ? (
                            <a href={`tel:${c.telephoneParent}`} className="hover:text-primary">
                              {c.telephoneParent}
                            </a>
                          ) : (
                            '-'
                          )}
                        </td>
                        <td className="py-3 px-3">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            c.statut === 'hors_listing'
                              ? 'bg-rose-100 text-rose-800 border border-rose-300 font-black'
                              : c.statut === 'planifie'
                              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                              : c.statut === 'present'
                              ? 'bg-blue-50 text-blue-800 border border-blue-200'
                              : c.statut === 'absent'
                              ? 'bg-red-50 text-red-800 border border-red-200'
                              : 'bg-amber-50 text-amber-800 border border-amber-200'
                          }`}>
                            {c.statut === 'hors_listing'
                              ? '🔴 Hors listing'
                              : c.statut === 'planifie'
                              ? '🟢 Planifié'
                              : c.statut === 'present'
                              ? '🔵 Présent'
                              : c.statut === 'absent'
                              ? '🔴 Absent'
                              : '🟡 À planifier'}
                          </span>
                        </td>
                        <td className="py-3 px-3 font-medium">
                          {activeInsc ? (
                            <span className="font-bold text-slate-900">
                              {activeInsc.creneau.heureDebut} – {activeInsc.creneau.heureFin}
                            </span>
                          ) : (
                            <span className="text-slate-400 italic">Non réservé</span>
                          )}
                        </td>
                        <td className="py-3 px-3">
                          {c.derniereRelance ? (
                            <div className="flex flex-col gap-0.5">
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-900 border border-amber-200 w-fit shadow-3xs">
                                <Mail className="w-2.5 h-2.5 text-amber-600 shrink-0" />
                                <span>{formatRelanceLabel(c.derniereRelance)?.label}</span>
                              </span>
                              <span className="text-[9px] text-slate-400 font-medium pl-1">
                                {formatCompactDateFr(c.derniereRelance)}
                              </span>
                            </div>
                          ) : (
                            <span className="text-slate-400 italic text-[11px]">Aucune</span>
                          )}
                        </td>
                        <td className="py-3 px-3 font-bold text-emerald-700">
                          {c.groupeRecommande || '-'}
                        </td>
                        <td className="py-3 px-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            {c.statut === 'hors_listing' && activeInsc && (
                              <button
                                type="button"
                                onClick={() => {
                                  const fullInsc = currentSession?.creneaux
                                    .flatMap((cr) => cr.inscriptions)
                                    .find((i) => i.id === activeInsc.id)
                                  if (fullInsc) {
                                    setAssocierInscription(fullInsc)
                                  } else {
                                    setAssocierInscription({
                                      id: activeInsc.id,
                                      nomEnfant: c.nom,
                                      prenomEnfant: c.prenom,
                                      age: c.age,
                                      dateNaissance: c.dateNaissance,
                                      nomParent: c.nomParent,
                                      emailParent: c.emailParent || '',
                                      telephoneParent: c.telephoneParent || '',
                                      niveauEstime: null,
                                      remarques: null,
                                      statut: 'inscrit',
                                      groupeRecommande: c.groupeRecommande,
                                      commentaireCoach: c.commentaireCoach,
                                      createdAt: new Date().toISOString(),
                                    })
                                  }
                                  setAssocierSearch(c.nom)
                                  setSelectedTargetCandidatId(null)
                                  setShowAssocierModal(true)
                                }}
                                className="inline-flex items-center gap-1 px-2.5 py-1 text-rose-700 bg-rose-100 hover:bg-rose-200 rounded-lg font-black text-[11px] transition-colors cursor-pointer shadow-3xs"
                                title="Associer au véritable enfant du listing initial"
                              >
                                <span>🔗 Associer</span>
                              </button>
                            )}
                            {c.statut === 'a_planifier' && c.emailParent && c.emailParent.includes('@') && (
                              <button
                                type="button"
                                onClick={() => {
                                  setRelanceCandidateIds([c.id])
                                  setRelanceTargetName(`${c.prenom} ${c.nom} (${c.emailParent})`)
                                  setRelanceCustomSubject('Rappel : Réservez votre créneau pour le Test de Nage (Triton Club Cavaillon)')
                                  setRelanceCustomMessage('')
                                  setShowRelanceModal(true)
                                }}
                                className="p-1.5 text-amber-600 hover:bg-amber-50 rounded-md transition-colors cursor-pointer"
                                title="Envoyer un email de relance"
                              >
                                <Mail className="w-3.5 h-3.5" />
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => handleOpenEditCandidat(c)}
                              className="p-1.5 text-slate-500 hover:text-primary hover:bg-slate-100 rounded-md transition-colors cursor-pointer"
                              title="Modifier / Compléter les informations du candidat"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                try {
                                  const doc = generateFicheEvaluationPDF({
                                    nomEnfant: c.nom,
                                    prenomEnfant: c.prenom,
                                    dateNaissance: c.dateNaissance,
                                    age: c.age,
                                    nomParent: c.nomParent,
                                    emailParent: c.emailParent,
                                    telephoneParent: c.telephoneParent,
                                    niveauEstime: null,
                                    remarques: null,
                                    statut: c.statut,
                                    dateTest: (activeInsc?.creneau as any)?.session?.date || c.session?.date || currentSession?.date,
                                    heureDebut: activeInsc?.creneau?.heureDebut,
                                    heureFin: activeInsc?.creneau?.heureFin,
                                    lieuTest: (activeInsc?.creneau as any)?.session?.lieu || c.session?.lieu || currentSession?.lieu,
                                    titreSession: (activeInsc?.creneau as any)?.session?.titre || c.session?.titre || currentSession?.titre,
                                    groupeRecommande: c.groupeRecommande,
                                    commentaireCoach: c.commentaireCoach,
                                    isVierge: false,
                                  })
                                  const safeNom = (c.nom || 'enfant').toLowerCase().replace(/[^a-z0-9]/g, '_')
                                  const safePrenom = (c.prenom || '').toLowerCase().replace(/[^a-z0-9]/g, '_')
                                  doc.save(`fiche_evaluation_${safeNom}_${safePrenom}.pdf`)
                                  toast.success(`Fiche d'évaluation de ${c.prenom} ${c.nom} téléchargée !`)
                                } catch (err) {
                                  console.error('Erreur génération fiche candidat:', err)
                                  toast.error('Erreur lors de la génération de la fiche')
                                }
                              }}
                              className="p-1.5 text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-md transition-colors cursor-pointer"
                              title="Télécharger la fiche d'évaluation (PDF)"
                            >
                              <FileText className="w-3.5 h-3.5" />
                            </button>

                            <button
                              onClick={async () => {
                                if (!confirm(`Supprimer définitivement ${c.nom} ${c.prenom} ?`)) return
                                await fetch(`/api/admin/tests-nage/candidats/${c.id}`, { method: 'DELETE' })
                                toast.success('Candidat supprimé')
                                loadData()
                              }}
                              className="p-1.5 text-slate-400 hover:text-red-600 rounded-md transition-colors cursor-pointer"
                              title="Supprimer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ─── VUE 3 : GESTION DES SESSIONS DE TESTS ─── */}
      {activeSubTab === 'sessions' && (
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900">
              Sessions de tests configurées
            </h3>
            <div className="flex items-center gap-2">
              {sessions.length > 1 && (
                <button
                  type="button"
                  onClick={() => {
                    setFusionSourceSessionId(sessions[1]?.id || '')
                    setFusionTargetSessionId(sessions[0]?.id || '')
                    setShowFusionModal(true)
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-800 border border-purple-200 font-bold text-xs transition-colors cursor-pointer"
                  title="Fusionner deux sessions en une seule sans perdre aucune réservation"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-purple-700" />
                  <span>Fusionner 2 sessions</span>
                </button>
              )}
              <button
                onClick={() => setShowCreateSessionModal(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary text-white font-bold text-xs hover:bg-primary-dark transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Nouvelle session</span>
              </button>
            </div>
          </div>

          <div className="divide-y divide-slate-100">
            {sessions.map((s) => (
              <div key={s.id} className="py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="text-sm font-bold text-slate-900">{s.titre}</h4>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      s.actif ? 'bg-emerald-50 text-emerald-800' : 'bg-slate-100 text-slate-400'
                    }`}>
                      {s.actif ? 'Actif en ligne' : 'Masqué'}
                    </span>
                    {s.bloquee ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                        <Lock className="w-3 h-3 text-amber-700" />
                        Inscriptions bloquées
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-900 border border-emerald-300">
                        <Unlock className="w-3 h-3 text-emerald-700" />
                        Inscriptions ouvertes
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 font-medium">
                    📅 {formatLongDateFr(s.date)} · ⏰ {s.heureDebut} à {s.heureFin} ({s.dureeMinutes} min/test, {s.capaciteParCreneau} max/créneau) · 📍 {s.lieu}
                  </p>
                  <p className="text-xs text-slate-600">
                    <strong>{s.stats.totalInscrits}</strong> nageurs inscrits sur <strong>{s.stats.totalPlaces}</strong> places totales ({s.stats.nbCreneaux} créneaux générés).
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleOpenNotifierModal(s)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold text-xs bg-red-50 hover:bg-red-100 text-red-800 border border-red-200 transition-colors cursor-pointer shadow-3xs"
                    title="Notifier les familles de cette séance en cas de report ou incident technique"
                  >
                    <Mail className="w-3.5 h-3.5 text-red-600 shrink-0" />
                    <span>Notifier report ({s.stats.totalInscrits})</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleToggleBloquerSession(s)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold text-xs transition-colors cursor-pointer border ${
                      s.bloquee
                        ? 'bg-amber-100 hover:bg-amber-200 text-amber-900 border-amber-300 shadow-3xs'
                        : 'bg-white hover:bg-slate-100 text-slate-800 border-slate-200 shadow-3xs'
                    }`}
                    title={s.bloquee ? 'Cliquer pour rouvrir les inscriptions' : 'Cliquer pour bloquer les inscriptions'}
                  >
                    {s.bloquee ? (
                      <>
                        <Unlock className="w-3.5 h-3.5 text-amber-700" />
                        <span>Débloquer</span>
                      </>
                    ) : (
                      <>
                        <Lock className="w-3.5 h-3.5 text-slate-600" />
                        <span>Bloquer la séance</span>
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => {
                      setSelectedSessionId(s.id)
                      setActiveSubTab('passages')
                    }}
                    className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs transition-colors cursor-pointer"
                  >
                    Voir la feuille de passage
                  </button>
                  <button
                    onClick={() => handleDeleteSession(s.id)}
                    className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors cursor-pointer"
                    title="Supprimer la session"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ─── MODALE 1 : CRÉATION DE SESSION DE TESTS ─── */}
      {showCreateSessionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-3xl p-6 md:p-8 max-w-lg w-full border border-slate-200 shadow-xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-black text-slate-900">
                Créer une Session de Tests de Nage
              </h3>
              <button
                onClick={() => setShowCreateSessionModal(false)}
                className="text-slate-400 hover:text-slate-700 font-bold text-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateSession} className="space-y-4 text-xs font-medium text-slate-700">
              <div>
                <label className="block font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Titre de la session *
                </label>
                <input
                  type="text"
                  required
                  value={newSessionTitre}
                  onChange={(e) => setNewSessionTitre(e.target.value)}
                  placeholder="Tests de Rentrée - Mercredi 2 Septembre"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:border-primary focus:bg-white outline-none text-xs font-semibold"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Date de la session *
                  </label>
                  <input
                    type="date"
                    required
                    value={newSessionDate}
                    onChange={(e) => setNewSessionDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:border-primary focus:bg-white outline-none text-xs font-semibold"
                  />
                </div>

                <div>
                  <label className="block font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Lieu
                  </label>
                  <input
                    type="text"
                    value={newSessionLieu}
                    onChange={(e) => setNewSessionLieu(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:border-primary focus:bg-white outline-none text-xs font-semibold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Heure début *
                  </label>
                  <input
                    type="time"
                    required
                    value={newSessionHeureDebut}
                    onChange={(e) => setNewSessionHeureDebut(e.target.value)}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:border-primary focus:bg-white outline-none text-xs font-semibold"
                  />
                </div>

                <div>
                  <label className="block font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Heure fin *
                  </label>
                  <input
                    type="time"
                    required
                    value={newSessionHeureFin}
                    onChange={(e) => setNewSessionHeureFin(e.target.value)}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:border-primary focus:bg-white outline-none text-xs font-semibold"
                  />
                </div>

                <div>
                  <label className="block font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Durée (min)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="30"
                    value={newSessionDuree}
                    onChange={(e) => setNewSessionDuree(parseInt(e.target.value, 10))}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:border-primary focus:bg-white outline-none text-xs font-semibold"
                  />
                </div>

                <div>
                  <label className="block font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Max nageurs
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={newSessionCapacite}
                    onChange={(e) => setNewSessionCapacite(parseInt(e.target.value, 10))}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:border-primary focus:bg-white outline-none text-xs font-semibold"
                  />
                </div>
              </div>

              <div className="bg-emerald-50 border border-emerald-200/80 rounded-2xl p-3 text-emerald-900 text-[11px] leading-relaxed">
                ℹ️ <strong>Génération automatique :</strong> Tous les créneaux de {newSessionDuree} minutes seront automatiquement calculés et créés entre {newSessionHeureDebut} et {newSessionHeureFin} (capacité : {newSessionCapacite} nageurs par créneau).
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateSessionModal(false)}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition-colors cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={creatingSession}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-primary hover:bg-primary-dark text-white font-bold transition-colors cursor-pointer disabled:opacity-50"
                >
                  {creatingSession ? 'Génération...' : 'Générer la session'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── MODALE 2 : IMPORT LISTING CANDIDATS ─── */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-3xl p-6 md:p-8 max-w-xl w-full border border-slate-200 shadow-xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-black text-slate-900">
                Importer un Listing de Candidats (Excel / CSV)
              </h3>
              <button
                onClick={() => setShowImportModal(false)}
                className="text-slate-400 hover:text-slate-700 font-bold text-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleImportCandidats} className="space-y-4 text-xs font-medium text-slate-700">
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 text-slate-600 text-[11px] space-y-1.5">
                <p className="font-bold text-slate-900">Format accepté (Excel / CSV / Fichier texte) :</p>
                <p>Importez directement votre fichier <strong>.csv</strong> ou copiez-collez vos lignes. Détection automatique intelligente des colonnes :</p>
                <p className="font-mono bg-white p-2 rounded-lg border border-slate-200 text-slate-800 text-[10.5px]">
                  Nom ; Prénom ; Date de naissance ; Email ; N° téléphone ; Genre ; Formule ; Notes
                </p>
                <p className="text-emerald-800 font-bold bg-emerald-50 border border-emerald-200/60 p-2 rounded-lg flex items-center gap-1.5">
                  <span>✨</span>
                  <span><strong>Anti-doublon & complétion :</strong> Calcul de l&apos;âge exact, réparation des numéros Excel corrompus et complétion automatique des données manquantes.</span>
                </p>
              </div>

              {/* Zone de Glisser-Déposer / Sélection Directe Fichier CSV */}
              <input
                type="file"
                ref={fileInputRef}
                accept=".csv,.txt,.tsv,text/csv,text/plain"
                onChange={handleFileChange}
                className="hidden"
              />

              <div
                onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-4 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-2 ${
                  dragOver
                    ? 'border-primary bg-primary/5 scale-[1.01]'
                    : importFileName
                    ? 'border-emerald-400 bg-emerald-50/50'
                    : 'border-slate-300 hover:border-primary hover:bg-slate-50/80 bg-slate-50/40'
                }`}
              >
                <div className="p-2.5 rounded-full bg-white shadow-2xs text-primary border border-slate-200">
                  <Upload className="w-5 h-5" />
                </div>
                {importFileName ? (
                  <div>
                    <p className="font-bold text-emerald-900 text-xs flex items-center justify-center gap-1.5">
                      <Check className="w-4 h-4 text-emerald-600" />
                      <span>Fichier sélectionné : <strong>{importFileName}</strong></span>
                    </p>
                    <p className="text-[10.5px] text-slate-500 mt-0.5">
                      {importText.split(/\r?\n/).filter((l) => l.trim().length > 0).length} ligne(s) chargée(s) · Cliquez pour changer de fichier
                    </p>
                  </div>
                ) : (
                  <div>
                    <p className="font-bold text-slate-800 text-xs">
                      Glissez-déposez votre fichier <strong>.csv</strong> ici, ou <span className="text-primary underline">cliquez pour parcourir vos fichiers</span>
                    </p>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      Formats supportés : .csv, .txt, .tsv (export Excel avec points-virgules ou virgules)
                    </p>
                  </div>
                )}
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block font-bold uppercase tracking-wider text-slate-700">
                    Aperçu ou collage direct des données *
                  </label>
                  {candidats.length > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        setShowImportModal(false)
                        handleDeleteAllCandidats()
                      }}
                      className="text-[11px] font-bold text-rose-600 hover:text-rose-800 hover:underline cursor-pointer flex items-center gap-1"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>Vider le listing actuel ({candidats.length})</span>
                    </button>
                  )}
                </div>
                <textarea
                  rows={6}
                  required
                  value={importText}
                  onChange={(e) => {
                    setImportText(e.target.value)
                    if (!e.target.value) setImportFileName(null)
                  }}
                  placeholder={`Nom;Prénom;Date de naissance;Email;N° téléphone;Genre;Formule;Notes\nCARLIEZ KOYTCHA;Keya;08/05/2018;afsouk@hotmail.com;0784024886;féminin;ENF2 Seulement Mercredi (En cours);TEST ENF`}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:border-primary focus:bg-white outline-none font-mono text-xs"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowImportModal(false)}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition-colors cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={importing}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-primary hover:bg-primary-dark text-white font-bold transition-colors cursor-pointer disabled:opacity-50"
                >
                  {importing ? 'Importation en cours...' : 'Importer les candidats'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── MODALE 3 : INSCRIPTION MANUELLE ADMIN ─── */}
      {showManualAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-3xl p-6 md:p-8 max-w-lg w-full border border-slate-200 shadow-xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-black text-slate-900">
                Inscrire un Nageur sur ce Créneau
              </h3>
              <button
                onClick={() => setShowManualAddModal(false)}
                className="text-slate-400 hover:text-slate-700 font-bold text-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleManualAddInscription} className="space-y-3.5 text-xs font-medium text-slate-700">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Nom de l&apos;enfant *
                  </label>
                  <input
                    type="text"
                    required
                    value={manualNom}
                    onChange={(e) => setManualNom(e.target.value)}
                    placeholder="DUPONT"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:border-primary outline-none font-bold uppercase"
                  />
                </div>
                <div>
                  <label className="block font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Prénom *
                  </label>
                  <input
                    type="text"
                    required
                    value={manualPrenom}
                    onChange={(e) => setManualPrenom(e.target.value)}
                    placeholder="Lucas"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:border-primary outline-none font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Âge
                  </label>
                  <input
                    type="number"
                    min="3"
                    max="20"
                    value={manualAge}
                    onChange={(e) => setManualAge(e.target.value)}
                    placeholder="7"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:border-primary outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Niveau estimé
                  </label>
                  <select
                    value={manualNiveau}
                    onChange={(e) => setManualNiveau(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:border-primary outline-none"
                  >
                    <option value="Débutant">Débutant</option>
                    <option value="Aisance aquatique">Aisance aquatique</option>
                    <option value="Apprentissage">Apprentissage</option>
                    <option value="Nageur 25m+">Nageur 25m+</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Nom du parent
                  </label>
                  <input
                    type="text"
                    value={manualNomParent}
                    onChange={(e) => setManualNomParent(e.target.value)}
                    placeholder="Jean Dupont"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:border-primary outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Téléphone
                  </label>
                  <input
                    type="tel"
                    value={manualTel}
                    onChange={(e) => setManualTel(e.target.value)}
                    placeholder="06 00 00 00 00"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:border-primary outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Email du parent
                </label>
                <input
                  type="email"
                  value={manualEmail}
                  onChange={(e) => setManualEmail(e.target.value)}
                  placeholder="parent@exemple.fr"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:border-primary outline-none"
                />
              </div>

              <div>
                <label className="block font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Remarques
                </label>
                <textarea
                  rows={2}
                  value={manualRemarques}
                  onChange={(e) => setManualRemarques(e.target.value)}
                  placeholder="Notes..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:border-primary outline-none"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowManualAddModal(false)}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition-colors cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={manualSubmitting}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-primary hover:bg-primary-dark text-white font-bold transition-colors cursor-pointer disabled:opacity-50"
                >
                  {manualSubmitting ? 'Enregistrement...' : 'Inscrire le nageur'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── MODALE D'ENVOI DE RELANCE CANDIDATS ─── */}
      {showRelanceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-3xl p-6 md:p-8 max-w-lg w-full border border-slate-200 shadow-xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center">
                  <Mail className="w-4 h-4" />
                </div>
                <h3 className="text-base font-bold text-slate-900">
                  Relance par email
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowRelanceModal(false)}
                className="text-slate-400 hover:text-slate-600 font-bold text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSendRelance} className="space-y-4 text-xs">
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 space-y-1">
                <span className="text-[10px] font-bold uppercase text-slate-500">Destinataires :</span>
                <p className="text-sm font-bold text-slate-900">
                  {relanceTargetName || `${unplanifiedWithEmail.length} familles`}
                </p>
                <p className="text-[11px] text-slate-500">
                  Chaque parent recevra un email individuel avec le lien vers la réservation.
                </p>
              </div>

              <div>
                <label className="block font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Objet du message
                </label>
                <input
                  type="text"
                  required
                  value={relanceCustomSubject}
                  onChange={(e) => setRelanceCustomSubject(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:border-primary outline-none font-medium text-xs"
                />
              </div>

              <div>
                <label className="block font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Message personnalisé (optionnel)
                </label>
                <textarea
                  rows={3}
                  value={relanceCustomMessage}
                  onChange={(e) => setRelanceCustomMessage(e.target.value)}
                  placeholder="Ex: Les créneaux se remplissent vite, merci de choisir votre horaire de test avant vendredi..."
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:border-primary outline-none text-xs"
                />
              </div>

              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-emerald-900 text-[11px] space-y-1">
                <p className="font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-primary shrink-0" />
                  Contenu inclus automatiquement dans l&apos;email :
                </p>
                <ul className="list-disc pl-4 space-y-0.5 text-emerald-800">
                  <li>Bouton d&apos;action direct vers la page de réservation</li>
                  <li>Recherche facilitée du nom de l&apos;enfant</li>
                  <li>Coordonnées du club et consignes</li>
                </ul>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowRelanceModal(false)}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition-colors cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={relancing}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-primary hover:bg-primary-dark text-white font-bold transition-colors cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5 shadow-xs"
                >
                  {relancing ? (
                    <span>Envoi en cours...</span>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      <span>Envoyer la relance</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── MODALE D'ENVOI DE NOTIFICATION REPORT / INCIDENT TECHNIQUE ─── */}
      {showNotifierAnnulationModal && sessionToNotify && (() => {
        const activeRecipients = notifierRecipients.filter(
          (r) => !notifierExcludedIds.includes(r.id)
        )
        const q = notifierSearchFilter.trim().toLowerCase()
        const filteredActiveRecipients = activeRecipients.filter((r) => {
          if (!q) return true
          return (
            r.nomEnfant.toLowerCase().includes(q) ||
            r.prenomEnfant.toLowerCase().includes(q) ||
            (r.nomParent && r.nomParent.toLowerCase().includes(q)) ||
            r.emailParent.toLowerCase().includes(q)
          )
        })
        const excludedRecipients = notifierRecipients.filter((r) =>
          notifierExcludedIds.includes(r.id)
        )

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
            <div className="bg-white rounded-3xl p-6 md:p-8 max-w-2xl w-full border border-slate-200 shadow-xl space-y-5 max-h-[92vh] overflow-y-auto">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-2xl bg-red-100 text-red-700 flex items-center justify-center font-bold">
                    <AlertCircle className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-slate-900 leading-tight">
                      Notifier report / Incident technique
                    </h3>
                    <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                      {sessionToNotify.titre} — {formatLongDateFr(sessionToNotify.date)}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowNotifierAnnulationModal(false)}
                  className="text-slate-400 hover:text-slate-600 font-bold text-sm cursor-pointer p-1"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleSendNotificationAnnulation} className="space-y-4 text-xs">
                {/* SECTION GESTION SÉLECTIVE DES DESTINATAIRES */}
                <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/60 pb-2.5">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black uppercase tracking-wider text-slate-700">
                          Destinataires ciblés :
                        </span>
                        <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-800 font-black text-[11px]">
                          {activeRecipients.length} / {notifierRecipients.length}
                        </span>
                        {excludedRecipients.length > 0 && (
                          <span className="text-[11px] font-bold text-amber-700">
                            ({excludedRecipients.length} exclu{excludedRecipients.length > 1 ? 's' : ''})
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Cliquez sur un enfant pour le <strong>retirer</strong> du listing d&apos;envoi.
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5 self-start sm:self-auto">
                      {excludedRecipients.length > 0 && (
                        <button
                          type="button"
                          onClick={handleRestoreAllNotifierRecipients}
                          className="px-2.5 py-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg cursor-pointer transition-colors"
                        >
                          Tout réintégrer ({excludedRecipients.length})
                        </button>
                      )}
                      {activeRecipients.length > 0 && (
                        <button
                          type="button"
                          onClick={handleExcludeAllNotifierRecipients}
                          className="px-2.5 py-1 text-[10px] font-bold text-slate-600 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg cursor-pointer transition-colors"
                        >
                          Tout retirer
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Recherche rapide si plus de 6 inscrits */}
                  {notifierRecipients.length > 6 && (
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                      <input
                        type="text"
                        value={notifierSearchFilter}
                        onChange={(e) => setNotifierSearchFilter(e.target.value)}
                        placeholder="Rechercher un enfant dans la liste..."
                        className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 outline-none focus:border-primary"
                      />
                    </div>
                  )}

                  {/* Badges cliquables des enfants retenus */}
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                      Enfants qui recevront l&apos;e-mail ({filteredActiveRecipients.length}) :
                    </span>

                    {filteredActiveRecipients.length === 0 ? (
                      <div className="p-3 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl text-center text-xs font-bold">
                        {notifierRecipients.length === 0
                          ? 'Aucun enfant inscrit sur cette séance.'
                          : activeRecipients.length === 0
                          ? 'Tous les enfants ont été retirés. Aucun e-mail ne sera envoyé.'
                          : 'Aucun enfant ne correspond à votre recherche.'}
                      </div>
                    ) : (
                      <div className="max-h-44 overflow-y-auto p-2 bg-white border border-slate-200 rounded-xl flex flex-wrap gap-1.5">
                        {filteredActiveRecipients.map((r) => (
                          <button
                            key={r.id}
                            type="button"
                            onClick={() => handleRemoveNotifierRecipient(r.id)}
                            title="Cliquer pour retirer cet enfant de l'envoi"
                            className="group inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 hover:bg-red-50 text-slate-800 hover:text-red-700 border border-slate-200 hover:border-red-300 rounded-lg text-xs font-bold transition-all cursor-pointer shadow-2xs"
                          >
                            <span>
                              {r.nomEnfant} {r.prenomEnfant}
                            </span>
                            <span className="text-[10px] text-slate-400 group-hover:text-red-500 font-mono font-normal">
                              ({r.creneauHoraire})
                            </span>
                            <span className="text-slate-400 group-hover:text-red-600 font-bold ml-0.5 text-xs">
                              ✕
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Enfants retirés (possibilité de réintégrer en 1 clic) */}
                  {excludedRecipients.length > 0 && (
                    <div className="space-y-1 pt-2 border-t border-slate-200/60">
                      <span className="text-[10px] font-bold text-red-600 uppercase tracking-wider block">
                        Enfants exclus de cet envoi ({excludedRecipients.length}) — Cliquer pour réintégrer :
                      </span>
                      <div className="max-h-24 overflow-y-auto p-2 bg-red-50/40 border border-red-200/60 rounded-xl flex flex-wrap gap-1.5">
                        {excludedRecipients.map((r) => (
                          <button
                            key={r.id}
                            type="button"
                            onClick={() => handleRestoreNotifierRecipient(r.id)}
                            title="Cliquer pour réintégrer cet enfant"
                            className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-white hover:bg-emerald-50 text-slate-400 line-through hover:no-underline hover:text-emerald-700 border border-dashed border-red-200 hover:border-emerald-300 rounded-lg text-[11px] font-medium transition-all cursor-pointer"
                          >
                            <span>
                              {r.nomEnfant} {r.prenomEnfant}
                            </span>
                            <span className="text-emerald-600 font-bold no-underline text-xs">+</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Objet de l&apos;e-mail
                  </label>
                  <input
                    type="text"
                    required
                    value={notifierCustomSubject}
                    onChange={(e) => setNotifierCustomSubject(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:border-primary outline-none font-semibold text-xs text-slate-900"
                  />
                </div>

                <div>
                  <label className="block font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Message explicatif aux parents
                  </label>
                  <textarea
                    rows={4}
                    required
                    value={notifierCustomMessage}
                    onChange={(e) => setNotifierCustomMessage(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:border-primary outline-none text-xs text-slate-800 leading-relaxed font-normal"
                  />
                </div>

                <div className="flex items-center gap-2 p-3 bg-slate-50 border border-slate-200 rounded-xl">
                  <input
                    type="checkbox"
                    id="bloquerSessionCheckbox"
                    checked={notifierBloquerSession}
                    onChange={(e) => setNotifierBloquerSession(e.target.checked)}
                    className="w-4 h-4 text-primary rounded cursor-pointer"
                  />
                  <label htmlFor="bloquerSessionCheckbox" className="text-[11px] text-slate-700 cursor-pointer font-bold">
                    Verrouiller cette séance (aucun parent ne pourra réserver sur cette date annulée)
                  </label>
                </div>

                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-emerald-900 text-[11px] space-y-1">
                  <p className="font-bold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-primary shrink-0" />
                    Inclus automatiquement dans chaque e-mail :
                  </p>
                  <ul className="list-disc pl-4 space-y-0.5 text-emerald-800">
                    <li>Bouton direct personnalisé vers l&apos;espace de reprogrammation</li>
                    <li>Nom, prénom de l&apos;enfant et horaire d&apos;origine</li>
                    <li>Coordonnées de contact du club en cas de question</li>
                  </ul>
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowNotifierAnnulationModal(false)}
                    className="flex-1 py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition-colors cursor-pointer"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    disabled={notifierLoading || activeRecipients.length === 0}
                    className="flex-1 py-2.5 px-4 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold transition-colors cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5 shadow-xs"
                  >
                    {notifierLoading ? (
                      <span>Envoi en cours...</span>
                    ) : (
                      <>
                        <Send className="w-3.5 h-3.5" />
                        <span>
                          Envoyer les e-mails ({activeRecipients.length} destinataire{activeRecipients.length > 1 ? 's' : ''})
                        </span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )
      })()}

      {/* ─── MODALE : ASSOCIER UNE INSCRIPTION HORS LISTING AU LISTING INITIAL ─── */}
      {showAssocierModal && associerInscription && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in print:hidden">
          <div className="bg-white rounded-3xl p-6 max-w-xl w-full border border-slate-200 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="p-1.5 bg-rose-50 text-rose-600 rounded-lg font-black text-sm">🔗</span>
                <h3 className="text-base font-black text-slate-900">
                  Associer l&apos;inscription à un enfant du listing
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAssocierModal(false)}
                className="text-slate-400 hover:text-slate-700 font-bold text-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Fiche actuelle de l'inscription */}
            <div className="bg-rose-50 border border-rose-200 rounded-2xl p-3.5 text-xs space-y-1">
              <span className="text-[10px] font-black uppercase tracking-wider text-rose-800 block">
                Réservation actuelle (Nom saisi par le parent) :
              </span>
              <p className="text-sm font-black text-rose-950">
                {associerInscription.nomEnfant} {associerInscription.prenomEnfant}
                {associerInscription.age ? ` (${associerInscription.age} ans)` : ''}
              </p>
              <p className="text-slate-600 text-[11px]">
                Parent / Contact : {associerInscription.telephoneParent} · {associerInscription.emailParent}
                {associerInscription.nomParent && ` (Parent: ${associerInscription.nomParent})`}
              </p>
            </div>

            <p className="text-xs text-slate-500 font-medium leading-relaxed">
              💡 <strong>Rattachement :</strong> Choisissez ci-dessous le véritable enfant pré-inscrit dans votre fichier MonClub. Son statut passera en <strong>🟢 Planifié</strong> et le nom sur le créneau sera automatiquement corrigé :
            </p>

            {/* Recherche de l'enfant dans le listing */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={associerSearch}
                onChange={(e) => setAssocierSearch(e.target.value)}
                placeholder="Rechercher par nom ou prénom de l'enfant..."
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:border-primary focus:bg-white"
              />
            </div>

            {/* Liste de sélection des candidats */}
            <div className="max-h-60 overflow-y-auto divide-y divide-slate-100 border border-slate-200 rounded-2xl">
              {candidatesForAssociation.length === 0 ? (
                <div className="p-4 text-center text-xs text-slate-400">
                  Aucun candidat trouvé pour cette recherche.
                </div>
              ) : (
                candidatesForAssociation.map((c) => {
                  const isSelected = selectedTargetCandidatId === c.id
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setSelectedTargetCandidatId(c.id)}
                      className={`w-full p-3 text-left flex items-center justify-between transition-colors cursor-pointer ${
                        isSelected ? 'bg-emerald-50 border-l-4 border-l-primary' : 'hover:bg-slate-50'
                      }`}
                    >
                      <div className="space-y-0.5">
                        <p className="text-xs font-black text-slate-900">
                          {c.nom} {c.prenom} {c.age ? `(${c.age} ans)` : ''}
                        </p>
                        <p className="text-[10px] text-slate-500">
                          {c.groupeRecommande ? <span className="font-bold text-emerald-700">{c.groupeRecommande} · </span> : null}
                          {c.nomParent ? `Parent : ${c.nomParent}` : c.emailParent || 'Sans contact'}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          c.statut === 'planifie'
                            ? 'bg-slate-100 text-slate-600'
                            : 'bg-amber-100 text-amber-800'
                        }`}>
                          {c.statut === 'planifie' ? 'Déjà planifié' : 'Non planifié'}
                        </span>
                        <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                          isSelected ? 'border-primary bg-primary text-white' : 'border-slate-300'
                        }`}>
                          {isSelected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                        </div>
                      </div>
                    </button>
                  )
                })
              )}
            </div>

            {/* Boutons d'action */}
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowAssocierModal(false)}
                className="flex-1 py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleAssocierCandidat}
                disabled={!selectedTargetCandidatId || associating}
                className="flex-1 py-2.5 px-4 rounded-xl bg-primary hover:bg-primary-dark text-white font-bold text-xs transition-colors cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5 shadow-xs"
              >
                {associating ? 'Association en cours...' : 'Valider l&apos;association'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODALE : MODIFIER / COMPLÉTER LES INFORMATIONS D'UN CANDIDAT ─── */}
      {showEditCandidatModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in print:hidden">
          <div className="bg-white rounded-3xl p-6 md:p-8 max-w-lg w-full border border-slate-200 shadow-xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="p-2 bg-emerald-50 text-emerald-700 rounded-xl font-black text-sm">✏️</span>
                <div>
                  <h3 className="text-base font-black text-slate-900">
                    Compléter / Modifier la Fiche Candidat
                  </h3>
                  <p className="text-[11px] text-slate-500 font-medium">
                    Mise à jour en direct des coordonnées, critères et groupe
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowEditCandidatModal(false)}
                className="text-slate-400 hover:text-slate-700 font-bold text-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveCandidat} className="space-y-3.5 text-xs font-medium text-slate-700">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Nom de l&apos;enfant *
                  </label>
                  <input
                    type="text"
                    required
                    value={editNom}
                    onChange={(e) => setEditNom(e.target.value)}
                    placeholder="DUPONT"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:border-primary focus:bg-white outline-none font-bold"
                  />
                </div>
                <div>
                  <label className="block font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Prénom *
                  </label>
                  <input
                    type="text"
                    required
                    value={editPrenom}
                    onChange={(e) => setEditPrenom(e.target.value)}
                    placeholder="Lucas"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:border-primary focus:bg-white outline-none font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Date de naissance
                  </label>
                  <input
                    type="date"
                    value={editDateNaissance}
                    onChange={(e) => {
                      const val = e.target.value
                      setEditDateNaissance(val)
                      if (val) {
                        const birth = new Date(val)
                        const now = new Date()
                        let calculatedAge = now.getFullYear() - birth.getFullYear()
                        const m = now.getMonth() - birth.getMonth()
                        if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) {
                          calculatedAge--
                        }
                        if (!isNaN(calculatedAge) && calculatedAge >= 0) {
                          setEditAge(String(calculatedAge))
                        }
                      }
                    }}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:border-primary focus:bg-white outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Âge (ans)
                  </label>
                  <input
                    type="number"
                    min="3"
                    max="99"
                    value={editAge}
                    onChange={(e) => setEditAge(e.target.value)}
                    placeholder="Ex: 8"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:border-primary focus:bg-white outline-none font-mono"
                  />
                </div>
              </div>

              <div className="border-t border-slate-100 pt-3 space-y-3">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                  Responsable légal & Contact
                </span>

                <div>
                  <label className="block font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Nom du Responsable (Parent / Tuteur)
                  </label>
                  <input
                    type="text"
                    value={editNomParent}
                    onChange={(e) => setEditNomParent(e.target.value)}
                    placeholder="Ex: Dupont Marc"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:border-primary focus:bg-white outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold uppercase tracking-wider text-slate-700 mb-1">
                      Téléphone portable
                    </label>
                    <input
                      type="tel"
                      value={editTel}
                      onChange={(e) => setEditTel(e.target.value)}
                      placeholder="06 12 34 56 78"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:border-primary focus:bg-white outline-none font-mono"
                    />
                  </div>
                  <div>
                    <label className="block font-bold uppercase tracking-wider text-slate-700 mb-1">
                      Email
                    </label>
                    <input
                      type="email"
                      value={editEmail}
                      onChange={(e) => setEditEmail(e.target.value)}
                      placeholder="parent@exemple.fr"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:border-primary focus:bg-white outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="border-t border-slate-100 pt-3 space-y-3">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                  Évaluation sportive & Statut
                </span>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold uppercase tracking-wider text-slate-700 mb-1">
                      Statut
                    </label>
                    <select
                      value={editStatut}
                      onChange={(e) => setEditStatut(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:border-primary focus:bg-white outline-none font-bold"
                    >
                      <option value="a_planifier">🟡 À planifier</option>
                      <option value="planifie">🟢 Planifié (créneau)</option>
                      <option value="present">🔵 Présent / Testé</option>
                      <option value="absent">🔴 Absent</option>
                      <option value="hors_listing">⚠️ Hors listing</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-bold uppercase tracking-wider text-slate-700 mb-1">
                      Groupe recommandé
                    </label>
                    <select
                      value={editGroupeRecommande}
                      onChange={(e) => setEditGroupeRecommande(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:border-primary focus:bg-white outline-none font-bold"
                    >
                      <option value="">🎯 Aucun / En attente</option>
                      {editGroupeRecommande && !GROUPES_CONSEILLES.includes(editGroupeRecommande) && (
                        <option value={editGroupeRecommande}>{editGroupeRecommande}</option>
                      )}
                      {GROUPES_CONSEILLES.map((grp) => (
                        <option key={grp} value={grp}>
                          {grp}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Commentaire / Notes du Coach
                  </label>
                  <textarea
                    rows={3}
                    value={editCommentaireCoach}
                    onChange={(e) => setEditCommentaireCoach(e.target.value)}
                    placeholder="Observations techniques : aisance, respiration, niveau de nage..."
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:border-primary focus:bg-white outline-none"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowEditCandidatModal(false)}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition-colors cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={savingCandidat}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-primary hover:bg-primary-dark text-white font-bold transition-colors cursor-pointer disabled:opacity-50 shadow-xs"
                >
                  {savingCandidat ? 'Enregistrement...' : 'Enregistrer la fiche'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── MODALE : AJOUTER UN NOUVEAU CANDIDAT DIRECT ─── */}
      {showCreateCandidatModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in print:hidden">
          <div className="bg-white rounded-3xl p-6 md:p-8 max-w-lg w-full border border-slate-200 shadow-xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="p-2 bg-primary/10 text-primary rounded-xl font-black text-sm">➕</span>
                <div>
                  <h3 className="text-base font-black text-slate-900">
                    Ajouter un Nouveau Candidat
                  </h3>
                  <p className="text-[11px] text-slate-500 font-medium">
                    Enregistrement direct dans le listing de suivi des tests
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateCandidatModal(false)}
                className="text-slate-400 hover:text-slate-700 font-bold text-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateCandidat} className="space-y-3.5 text-xs font-medium text-slate-700">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Nom de l&apos;enfant *
                  </label>
                  <input
                    type="text"
                    required
                    value={createNom}
                    onChange={(e) => setCreateNom(e.target.value)}
                    placeholder="DUPONT"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:border-primary focus:bg-white outline-none font-bold"
                  />
                </div>
                <div>
                  <label className="block font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Prénom *
                  </label>
                  <input
                    type="text"
                    required
                    value={createPrenom}
                    onChange={(e) => setCreatePrenom(e.target.value)}
                    placeholder="Lucas"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:border-primary focus:bg-white outline-none font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Date de naissance
                  </label>
                  <input
                    type="date"
                    value={createDateNaissance}
                    onChange={(e) => {
                      const val = e.target.value
                      setCreateDateNaissance(val)
                      if (val) {
                        const birth = new Date(val)
                        const now = new Date()
                        let calculatedAge = now.getFullYear() - birth.getFullYear()
                        const m = now.getMonth() - birth.getMonth()
                        if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) {
                          calculatedAge--
                        }
                        if (!isNaN(calculatedAge) && calculatedAge >= 0) {
                          setCreateAge(String(calculatedAge))
                        }
                      }
                    }}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:border-primary focus:bg-white outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Âge (ans)
                  </label>
                  <input
                    type="number"
                    min="3"
                    max="99"
                    value={createAge}
                    onChange={(e) => setCreateAge(e.target.value)}
                    placeholder="Ex: 7"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:border-primary focus:bg-white outline-none font-mono"
                  />
                </div>
              </div>

              <div className="border-t border-slate-100 pt-3 space-y-3">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                  Responsable légal & Contact
                </span>

                <div>
                  <label className="block font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Nom du Parent / Responsable
                  </label>
                  <input
                    type="text"
                    value={createNomParent}
                    onChange={(e) => setCreateNomParent(e.target.value)}
                    placeholder="Ex: Jean Dupont"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:border-primary focus:bg-white outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold uppercase tracking-wider text-slate-700 mb-1">
                      Téléphone portable
                    </label>
                    <input
                      type="tel"
                      value={createTel}
                      onChange={(e) => setCreateTel(e.target.value)}
                      placeholder="06 00 00 00 00"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:border-primary focus:bg-white outline-none font-mono"
                    />
                  </div>
                  <div>
                    <label className="block font-bold uppercase tracking-wider text-slate-700 mb-1">
                      Email du responsable
                    </label>
                    <input
                      type="email"
                      value={createEmail}
                      onChange={(e) => setCreateEmail(e.target.value)}
                      placeholder="parent@exemple.fr"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:border-primary focus:bg-white outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="border-t border-slate-100 pt-3 space-y-3">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                  Orientation & Notes éventuelles
                </span>

                <div>
                  <label className="block font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Groupe pressenti / conseillé (optionnel)
                  </label>
                  <select
                    value={createGroupeRecommande}
                    onChange={(e) => setCreateGroupeRecommande(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:border-primary focus:bg-white outline-none font-bold"
                  >
                    <option value="">🎯 Aucun / À évaluer lors du test</option>
                    {GROUPES_CONSEILLES.map((grp) => (
                      <option key={grp} value={grp}>
                        {grp}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Commentaire / Notes particulières
                  </label>
                  <textarea
                    rows={2}
                    value={createCommentaireCoach}
                    onChange={(e) => setCreateCommentaireCoach(e.target.value)}
                    placeholder="Remarques éventuelles, antécédents de natation..."
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:border-primary focus:bg-white outline-none"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateCandidatModal(false)}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition-colors cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={creatingCandidat}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-primary hover:bg-primary-dark text-white font-bold transition-colors cursor-pointer disabled:opacity-50 shadow-xs"
                >
                  {creatingCandidat ? 'Ajout en cours...' : 'Ajouter le candidat'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── MODALE : FUSION DE DEUX SESSIONS ─── */}
      {showFusionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-3xl p-6 md:p-8 max-w-lg w-full border border-slate-200 shadow-xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-800 flex items-center justify-center font-bold text-sm">
                  🔄
                </div>
                <h3 className="text-base font-black text-slate-900">
                  Fusionner deux sessions de tests
                </h3>
              </div>
              <button
                onClick={() => setShowFusionModal(false)}
                className="text-slate-400 hover:text-slate-700 font-bold text-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Cette opération regroupe <strong>tous les créneaux et toutes les inscriptions</strong> de la session source dans la session cible. <strong>Aucune réservation ni donnée n&apos;est perdue.</strong>
            </p>

            <form onSubmit={handleFusionSessions} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="block font-bold uppercase tracking-wider text-slate-700">
                  1. Session à intégrer (sera fusionnée et supprimée) :
                </label>
                <select
                  value={fusionSourceSessionId}
                  onChange={(e) => setFusionSourceSessionId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:border-purple-500 focus:bg-white outline-none font-bold"
                  required
                >
                  <option value="">Sélectionnez la session source...</option>
                  {sessions.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.titre} ({formatCompactDateFr(s.date)} · {s.heureDebut}-{s.heureFin}) — {s.stats.totalInscrits} inscrits
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="block font-bold uppercase tracking-wider text-slate-700">
                  2. Session cible (session principale conservée) :
                </label>
                <select
                  value={fusionTargetSessionId}
                  onChange={(e) => setFusionTargetSessionId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:border-purple-500 focus:bg-white outline-none font-bold"
                  required
                >
                  <option value="">Sélectionnez la session principale cible...</option>
                  {sessions.filter((s) => s.id !== fusionSourceSessionId).map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.titre} ({formatCompactDateFr(s.date)} · {s.heureDebut}-{s.heureFin}) — {s.stats.totalInscrits} inscrits
                    </option>
                  ))}
                </select>
              </div>

              <div className="p-3.5 bg-purple-50 rounded-2xl border border-purple-200 text-purple-900 text-[11px] space-y-1.5">
                <p className="font-bold">✨ Résultat de la fusion :</p>
                <ul className="list-disc list-inside space-y-1 text-purple-800 font-medium">
                  <li>Tous les créneaux horaires sont conservés et rassemblés sous une même séance.</li>
                  <li>Toutes les réservations, présences et fiches d&apos;évaluation restent intactes.</li>
                  <li>L&apos;amplitude horaire globale de la session est automatiquement recalculée.</li>
                </ul>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowFusionModal(false)}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition-colors cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={fusionLoading || !fusionSourceSessionId || !fusionTargetSessionId || fusionSourceSessionId === fusionTargetSessionId}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-purple-700 hover:bg-purple-800 text-white font-bold transition-colors cursor-pointer disabled:opacity-50 shadow-xs flex items-center justify-center gap-1.5"
                >
                  {fusionLoading ? 'Fusion en cours...' : '🔄 Confirmer la fusion'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
