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
  RefreshCw
} from 'lucide-react'
import toast from 'react-hot-toast'
import { formatLongDateFr, formatCompactDateFr } from '@/lib/date'

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
  session?: { id: string; titre: string; date: string } | null
  inscriptions: Array<{
    id: string
    statut: string
    creneau: { heureDebut: string; heureFin: string; sessionId: string }
  }>
}

const GROUPES_CONSEILLES = [
  'ENF 1 (Éveil aquatique)',
  'ENF 2 (Apprentissage)',
  'Avenirs 1',
  'Avenirs 2',
  'Avenirs 3',
  'Avenirs Loisirs',
  'Jeune Loisir',
  'Juniors Loisirs',
  'Adultes Loisirs',
  'Compétition Benjamins',
  'Compétition Juniors',
  'Compétition Adultes',
  'AquaFitness',
  'Autre / À recontacter',
]

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

  // Filtres candidats
  const [candidatFilter, setCandidatFilter] = useState<'tous' | 'a_planifier' | 'planifie' | 'present' | 'absent'>('tous')
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
  const [importing, setImporting] = useState(false)

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

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [resSessions, resCandidats] = await Promise.all([
        fetch('/api/admin/tests-nage/sessions'),
        fetch('/api/admin/tests-nage/candidats'),
      ])

      const dataSessions = await resSessions.json()
      const dataCandidats = await resCandidats.json()

      if (resSessions.ok && dataSessions.sessions) {
        setSessions(dataSessions.sessions)
        if (dataSessions.sessions.length > 0 && !selectedSessionId) {
          setSelectedSessionId(dataSessions.sessions[0].id)
        }
      }
      if (resCandidats.ok && dataCandidats.candidats) {
        setCandidats(dataCandidats.candidats)
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

  const currentSession = useMemo(() => {
    return sessions.find((s) => s.id === selectedSessionId) || sessions[0] || null
  }, [sessions, selectedSessionId])

  // Copier le lien public
  const handleCopyPublicLink = () => {
    const url = `${window.location.origin}/tests-de-nage`
    navigator.clipboard.writeText(url)
    toast.success('Lien public copié dans le presse-papier !')
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

  // Filtrage des candidats
  const filteredCandidats = useMemo(() => {
    return candidats.filter((c) => {
      // Statut filter
      if (candidatFilter !== 'tous') {
        if (candidatFilter === 'a_planifier' && c.statut !== 'a_planifier') return false
        if (candidatFilter === 'planifie' && c.statut !== 'planifie') return false
        if (candidatFilter === 'present' && c.statut !== 'present') return false
        if (candidatFilter === 'absent' && c.statut !== 'absent') return false
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
      {/* ─── EN-TÊTE & ACTIONS PRINCIPALES ─── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white rounded-3xl p-6 border border-slate-200 shadow-xs print:hidden">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 bg-emerald-50 text-primary rounded-xl">
              <Waves className="w-5 h-5" />
            </span>
            <h2 className="text-xl font-black text-slate-900 tracking-tight">
              Tests de Nage & Niveau (Rentrée)
            </h2>
          </div>
          <p className="text-xs text-slate-500 font-medium mt-1">
            Génération des créneaux de 5 min, inscriptions parents en ligne, pointage bord de bassin et attribution des groupes.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleCopyPublicLink}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs transition-colors cursor-pointer"
            title="Lien public secret à envoyer aux parents"
          >
            <Copy className="w-3.5 h-3.5 text-primary" />
            <span>Copier le lien public</span>
          </button>

          <button
            onClick={() => setShowImportModal(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs transition-colors cursor-pointer"
          >
            <Upload className="w-3.5 h-3.5 text-slate-600" />
            <span>Importer listing</span>
          </button>

          <button
            onClick={() => setShowCreateSessionModal(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary hover:bg-primary-dark text-white font-bold text-xs transition-colors shadow-xs cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Créer une session</span>
          </button>
        </div>
      </div>

      {/* ─── BANDEAU DE STATISTIQUES GLOBAL ─── */}
      {currentSession && (
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3 print:hidden">
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
            <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Créneaux 5 min</span>
            <span className="text-xl font-black text-slate-900">{currentSession.stats.nbCreneaux}</span>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
            <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Capacité totale</span>
            <span className="text-xl font-black text-slate-900">{currentSession.stats.totalPlaces} places</span>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
            <span className="block text-[10px] font-bold uppercase tracking-wider text-emerald-600">Inscrits confirmés</span>
            <span className="text-xl font-black text-emerald-700">{currentSession.stats.totalInscrits}</span>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
            <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Places restantes</span>
            <span className="text-xl font-black text-slate-900">{currentSession.stats.placesRestantes}</span>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
            <span className="block text-[10px] font-bold uppercase tracking-wider text-emerald-600">Présents / Testés</span>
            <span className="text-xl font-black text-emerald-600">{currentSession.stats.totalPresents}</span>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
            <span className="block text-[10px] font-bold uppercase tracking-wider text-amber-600">Candidats Listing</span>
            <span className="text-xl font-black text-amber-700">{candidats.length}</span>
          </div>
        </div>
      )}

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
            📋 Feuille de passage (Bord de bassin)
          </button>

          <button
            onClick={() => setActiveSubTab('candidats')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeSubTab === 'candidats'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            👥 Suivi des Candidats ({candidats.length})
          </button>

          <button
            onClick={() => setActiveSubTab('sessions')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeSubTab === 'sessions'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            ⚙️ Sessions & Plages ({sessions.length})
          </button>
        </div>

        {activeSubTab === 'passages' && currentSession && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Imprimer</span>
            </button>
            <button
              onClick={handleExportCsv}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>
          </div>
        )}
      </div>

      {/* ─── VUE 1 : FEUILLE DE PASSAGE CHRONOLOGIQUE (BORD DE BASSIN) ─── */}
      {activeSubTab === 'passages' && (
        <div className="space-y-4">
          {/* Sélecteur de session si plusieurs */}
          {sessions.length > 1 && (
            <div className="flex items-center gap-2 bg-slate-50 p-2 rounded-2xl border border-slate-200 max-w-xl print:hidden">
              <span className="text-xs font-bold text-slate-500 pl-2">Session :</span>
              <select
                value={selectedSessionId}
                onChange={(e) => setSelectedSessionId(e.target.value)}
                className="flex-1 bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-900 outline-none cursor-pointer"
              >
                {sessions.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.titre} ({formatCompactDateFr(s.date)} · {s.heureDebut}-{s.heureFin})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* En-tête pour impression uniquement */}
          <div className="hidden print:block mb-6 text-center border-b pb-4">
            <h1 className="text-xl font-bold">Triton Club Cavaillon · Feuille de Passage Tests de Nage</h1>
            <p className="text-sm font-medium">
              {currentSession?.titre} · {currentSession && formatLongDateFr(currentSession.date)} ({currentSession?.heureDebut} à {currentSession?.heureFin})
            </p>
          </div>

          {!currentSession || currentSession.creneaux.length === 0 ? (
            <div className="bg-white rounded-3xl p-12 text-center border border-slate-200">
              <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <h3 className="text-base font-bold text-slate-800">Aucune session active</h3>
              <p className="text-xs text-slate-500 mt-1">Créez une session de tests pour générer automatiquement la feuille de passage.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {currentSession.creneaux.map((cr) => {
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
                        {cr.inscriptions.map((insc) => (
                          <div
                            key={insc.id}
                            className="py-3 flex flex-col lg:flex-row lg:items-center justify-between gap-3 text-xs"
                          >
                            {/* Colonne 1 : Identité & Contact */}
                            <div className="space-y-1 min-w-[240px]">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-slate-900 text-sm">
                                  {insc.nomEnfant} {insc.prenomEnfant}
                                </span>
                                {insc.age && (
                                  <span className="text-[11px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                                    {insc.age} ans
                                  </span>
                                )}
                              </div>
                              <p className="text-slate-500 text-[11px]">
                                {insc.nomParent && <span>Parent : {insc.nomParent} · </span>}
                                <a href={`tel:${insc.telephoneParent}`} className="text-slate-700 font-bold hover:underline">
                                  {insc.telephoneParent}
                                </a>
                              </p>
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
                                onClick={() => handleDeleteInscription(insc.id)}
                                className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer print:hidden shrink-0"
                                title="Supprimer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
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
                    <th className="py-2.5 px-3">Groupe retenu</th>
                    <th className="py-2.5 px-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {filteredCandidats.map((c) => {
                    const activeInsc = c.inscriptions && c.inscriptions.length > 0 ? c.inscriptions[0] : null
                    return (
                      <tr key={c.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-3 px-3 font-bold text-slate-900">
                          {c.nom} {c.prenom}
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
                            c.statut === 'planifie'
                              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                              : c.statut === 'present'
                              ? 'bg-blue-50 text-blue-800 border border-blue-200'
                              : c.statut === 'absent'
                              ? 'bg-red-50 text-red-800 border border-red-200'
                              : 'bg-amber-50 text-amber-800 border border-amber-200'
                          }`}>
                            {c.statut === 'planifie'
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
                        <td className="py-3 px-3 font-bold text-emerald-700">
                          {c.groupeRecommande || '-'}
                        </td>
                        <td className="py-3 px-3 text-right">
                          <button
                            onClick={async () => {
                              if (!confirm(`Supprimer définitivement ${c.nom} ${c.prenom} ?`)) return
                              await fetch(`/api/admin/tests-nage/candidats/${c.id}`, { method: 'DELETE' })
                              toast.success('Candidat supprimé')
                              loadData()
                            }}
                            className="p-1 text-slate-400 hover:text-red-600 rounded-md transition-colors cursor-pointer"
                            title="Supprimer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
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
            <button
              onClick={() => setShowCreateSessionModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary text-white font-bold text-xs hover:bg-primary-dark transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Nouvelle session</span>
            </button>
          </div>

          <div className="divide-y divide-slate-100">
            {sessions.map((s) => (
              <div key={s.id} className="py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-bold text-slate-900">{s.titre}</h4>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      s.actif ? 'bg-emerald-50 text-emerald-800' : 'bg-slate-100 text-slate-400'
                    }`}>
                      {s.actif ? 'Actif en ligne' : 'Masqué'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 font-medium">
                    📅 {formatLongDateFr(s.date)} · ⏰ {s.heureDebut} à {s.heureFin} ({s.dureeMinutes} min/test, {s.capaciteParCreneau} max/créneau) · 📍 {s.lieu}
                  </p>
                  <p className="text-xs text-slate-600">
                    <strong>{s.stats.totalInscrits}</strong> nageurs inscrits sur <strong>{s.stats.totalPlaces}</strong> places totales ({s.stats.nbCreneaux} créneaux générés).
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
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
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 text-slate-600 text-[11px] space-y-1">
                <p className="font-bold text-slate-900">Format accepté :</p>
                <p>Copiez-collez simplement les lignes depuis votre tableur (Excel, Google Sheets) ou un fichier texte. Colonnes reconnues automatiquement :</p>
                <p className="font-mono bg-white p-2 rounded-lg border border-slate-200 text-slate-800">
                  Nom &nbsp; Prénom &nbsp; Âge &nbsp; Nom_Parent &nbsp; Email &nbsp; Téléphone
                </p>
              </div>

              <div>
                <label className="block font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Collez vos lignes ci-dessous *
                </label>
                <textarea
                  rows={8}
                  required
                  value={importText}
                  onChange={(e) => setImportText(e.target.value)}
                  placeholder={`DUPONT Lucas 7 DUPONT Jean parent@exemple.fr 0600000000\nMARTIN Emma 8 MARTIN Claire claire@mail.fr 0611223344`}
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
    </div>
  )
}
