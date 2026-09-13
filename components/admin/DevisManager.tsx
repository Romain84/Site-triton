'use client'

import { useEffect, useState, useMemo } from 'react'
import toast from 'react-hot-toast'
import {
  FileText,
  Plus,
  Search,
  Download,
  Send,
  Trash2,
  Pencil,
  CheckCircle2,
  Clock,
  XCircle,
  AlertCircle,
  Zap,
  Loader2,
  X,
  ExternalLink,
  ChevronRight,
  Sparkles
} from 'lucide-react'

interface LigneDevis {
  id?: string
  description: string
  quantite: number
  prixUnitaire: number
  total: number
  ordre?: number
}

interface Devis {
  id: string
  numero: string
  titre: string
  clientNom: string
  clientEmail?: string | null
  clientTelephone?: string | null
  clientAdresse?: string | null
  dateEmission: string
  dateValidite: string
  statut: 'brouillon' | 'envoye' | 'accepte' | 'refuse' | string
  totalHT: number
  totalTVA: number
  totalTTC: number
  notes?: string | null
  pdfPath?: string | null
  createdAt: string
  updatedAt: string
  lignes: LigneDevis[]
}

const STATUTS_CONFIG: Record<string, { label: string; bg: string; text: string; border: string; icon: any }> = {
  brouillon: {
    label: 'Brouillon',
    bg: 'bg-slate-100',
    text: 'text-slate-700',
    border: 'border-slate-200',
    icon: Clock,
  },
  envoye: {
    label: 'Envoyé',
    bg: 'bg-amber-50',
    text: 'text-amber-800',
    border: 'border-amber-200',
    icon: Send,
  },
  accepte: {
    label: 'Accepté',
    bg: 'bg-emerald-50',
    text: 'text-emerald-800',
    border: 'border-emerald-200',
    icon: CheckCircle2,
  },
  refuse: {
    label: 'Refusé',
    bg: 'bg-rose-50',
    text: 'text-rose-800',
    border: 'border-rose-200',
    icon: XCircle,
  },
}

const DEFAULT_SSA_LINES: LigneDevis[] = [
  {
    description: 'Formation SSA (Surveillant Sauveteur Aquatique) - Préparation technique, physique et théorique aux épreuves de sauvetage aquatique, réglementation des baignades et entraînements en bassin.',
    quantite: 1,
    prixUnitaire: 350,
    total: 350,
  },
  {
    description: 'Formation PSE1 (Premiers Secours en Équipe de niveau 1) - Acquisition des compétences de secours et gestes d\'urgence en équipe.',
    quantite: 1,
    prixUnitaire: 200,
    total: 200,
  },
  {
    description: 'Formation PSE2 (Premiers Secours en Équipe de niveau 2) - Prise en charge d\'équipe avec matériel, immobilisations et bilans approfondis.',
    quantite: 1,
    prixUnitaire: 200,
    total: 200,
  },
]

export default function DevisManager({
  currentUser,
}: {
  currentUser?: { id: string; email: string; role: string } | null
}) {
  const [devisList, setDevisList] = useState<Devis[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterStatut, setFilterStatut] = useState<string>('tous')

  // Modale création / édition
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingDevis, setEditingDevis] = useState<Devis | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Champs du formulaire
  const [formClientNom, setFormClientNom] = useState('')
  const [formClientEmail, setFormClientEmail] = useState('')
  const [formClientTelephone, setFormClientTelephone] = useState('')
  const [formClientAdresse, setFormClientAdresse] = useState('')
  const [formTitre, setFormTitre] = useState('')
  const [formDateEmission, setFormDateEmission] = useState('')
  const [formDateValidite, setFormDateValidite] = useState('')
  const [formStatut, setFormStatut] = useState('brouillon')
  const [formNotes, setFormNotes] = useState('')
  const [formLignes, setFormLignes] = useState<LigneDevis[]>([])

  // Actions asynchrones
  const [sendingEmailId, setSendingEmailId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [updatingStatutId, setUpdatingStatutId] = useState<string | null>(null)

  const fetchDevis = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/admin/devis')
      const data = await res.json()
      if (res.ok) {
        setDevisList(data.devis || [])
      } else {
        toast.error(data.error || 'Erreur lors du chargement des devis')
      }
    } catch (err) {
      toast.error('Erreur réseau lors de la récupération des devis')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDevis()
  }, [])

  // Formatage Euro
  const formatEuro = (val: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 2,
    }).format(val || 0)
  }

  // Statistiques calculées
  const stats = useMemo(() => {
    const total = devisList.length
    const brouillons = devisList.filter(d => d.statut === 'brouillon').length
    const envoyes = devisList.filter(d => d.statut === 'envoye').length
    const acceptes = devisList.filter(d => d.statut === 'accepte').length
    const montantTotal = devisList.reduce((acc, d) => acc + (d.totalTTC || 0), 0)
    const montantAccepte = devisList
      .filter(d => d.statut === 'accepte')
      .reduce((acc, d) => acc + (d.totalTTC || 0), 0)

    return { total, brouillons, envoyes, acceptes, montantTotal, montantAccepte }
  }, [devisList])

  // Filtrage
  const filteredDevis = useMemo(() => {
    return devisList.filter(d => {
      const matchStatut = filterStatut === 'tous' || d.statut === filterStatut
      const search = searchQuery.toLowerCase().trim()
      const matchSearch =
        !search ||
        d.numero.toLowerCase().includes(search) ||
        d.clientNom.toLowerCase().includes(search) ||
        d.titre.toLowerCase().includes(search) ||
        (d.clientEmail && d.clientEmail.toLowerCase().includes(search))
      return matchStatut && matchSearch
    })
  }, [devisList, filterStatut, searchQuery])

  // Initialisation du formulaire pour nouveau devis
  const handleOpenCreateModal = (withSSAPack: boolean = false) => {
    setEditingDevis(null)
    const today = new Date().toISOString().split('T')[0]
    const validite = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

    setFormClientNom('')
    setFormClientEmail('')
    setFormClientTelephone('')
    setFormClientAdresse('')
    setFormDateEmission(today)
    setFormDateValidite(validite)
    setFormStatut('brouillon')

    if (withSSAPack) {
      setFormTitre('Formation Surveillant Sauveteur Aquatique (SSA) & Secourisme (PSE1 / PSE2)')
      setFormClientNom('Bénéficiaire Formation SSA')
      setFormNotes(
        'Règlement échelonné possible en 3 fois sans frais. Attestation de compétences et diplômes délivrés à l\'issue des épreuves.'
      )
      setFormLignes(JSON.parse(JSON.stringify(DEFAULT_SSA_LINES)))
    } else {
      setFormTitre('')
      setFormNotes('')
      setFormLignes([
        {
          description: '',
          quantite: 1,
          prixUnitaire: 0,
          total: 0,
        },
      ])
    }

    setIsModalOpen(true)
  }

  // Charger le modèle SSA dans le formulaire en cours
  const handleApplySSAPack = () => {
    setFormTitre('Formation Surveillant Sauveteur Aquatique (SSA) & Secourisme (PSE1 / PSE2)')
    if (!formClientNom.trim()) {
      setFormClientNom('Bénéficiaire Formation SSA')
    }
    setFormNotes(
      'Règlement échelonné possible en 3 fois sans frais. Attestation de compétences et diplômes délivrés à l\'issue des épreuves.'
    )
    setFormLignes(JSON.parse(JSON.stringify(DEFAULT_SSA_LINES)))
    toast.success('Pack Formation SSA (750 €) chargé avec succès !')
  }

  // Ouvrir modal en édition
  const handleOpenEditModal = (devis: Devis) => {
    setEditingDevis(devis)
    setFormClientNom(devis.clientNom)
    setFormClientEmail(devis.clientEmail || '')
    setFormClientTelephone(devis.clientTelephone || '')
    setFormClientAdresse(devis.clientAdresse || '')
    setFormTitre(devis.titre)
    setFormDateEmission(new Date(devis.dateEmission).toISOString().split('T')[0])
    setFormDateValidite(new Date(devis.dateValidite).toISOString().split('T')[0])
    setFormStatut(devis.statut)
    setFormNotes(devis.notes || '')
    setFormLignes(
      devis.lignes.map(l => ({
        id: l.id,
        description: l.description,
        quantite: l.quantite,
        prixUnitaire: l.prixUnitaire,
        total: l.total,
      }))
    )
    setIsModalOpen(true)
  }

  // Gestion des lignes dynamiques
  const handleLigneChange = (index: number, field: keyof LigneDevis, value: any) => {
    const updated = [...formLignes]
    const item = { ...updated[index], [field]: value }

    if (field === 'quantite' || field === 'prixUnitaire') {
      const qte = field === 'quantite' ? Number(value) : item.quantite
      const pu = field === 'prixUnitaire' ? Number(value) : item.prixUnitaire
      item.total = Math.round((qte || 0) * (pu || 0) * 100) / 100
    }

    updated[index] = item
    setFormLignes(updated)
  }

  const handleAddLigne = () => {
    setFormLignes([
      ...formLignes,
      {
        description: '',
        quantite: 1,
        prixUnitaire: 0,
        total: 0,
      },
    ])
  }

  const handleRemoveLigne = (index: number) => {
    if (formLignes.length <= 1) {
      toast.error('Le devis doit comporter au moins une prestation')
      return
    }
    const updated = formLignes.filter((_, i) => i !== index)
    setFormLignes(updated)
  }

  // Calcul du total du formulaire
  const currentTotalTTC = useMemo(() => {
    return formLignes.reduce((sum, l) => sum + (Number(l.total) || 0), 0)
  }, [formLignes])

  // Soumission du formulaire (Création ou Mise à jour)
  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formClientNom.trim()) {
      toast.error('Le nom du client est requis')
      return
    }
    if (!formTitre.trim()) {
      toast.error('L\'objet ou titre du devis est requis')
      return
    }
    if (formLignes.length === 0 || formLignes.some(l => !l.description.trim())) {
      toast.error('Chaque ligne doit avoir une désignation / description')
      return
    }

    setIsSubmitting(true)
    try {
      const payload = {
        titre: formTitre,
        clientNom: formClientNom,
        clientEmail: formClientEmail || null,
        clientTelephone: formClientTelephone || null,
        clientAdresse: formClientAdresse || null,
        dateEmission: formDateEmission,
        dateValidite: formDateValidite,
        statut: formStatut,
        notes: formNotes || null,
        lignes: formLignes,
      }

      if (editingDevis) {
        // PATCH
        const res = await fetch(`/api/admin/devis/${editingDevis.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        const data = await res.json()
        if (res.ok) {
          toast.success(`Devis ${data.devis.numero} mis à jour`)
          setIsModalOpen(false)
          fetchDevis()
        } else {
          toast.error(data.error || 'Erreur lors de la mise à jour')
        }
      } else {
        // POST
        const res = await fetch('/api/admin/devis', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        const data = await res.json()
        if (res.ok) {
          toast.success(`Devis ${data.devis.numero} créé avec succès !`)
          setIsModalOpen(false)
          fetchDevis()
        } else {
          toast.error(data.error || 'Erreur lors de la création')
        }
      }
    } catch (err) {
      toast.error('Erreur réseau')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Changement de statut rapide
  const handleQuickStatutChange = async (devisId: string, newStatut: string) => {
    try {
      setUpdatingStatutId(devisId)
      const res = await fetch(`/api/admin/devis/${devisId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ statut: newStatut }),
      })
      const data = await res.json()
      if (res.ok) {
        toast.success(`Statut mis à jour : ${STATUTS_CONFIG[newStatut]?.label || newStatut}`)
        setDevisList(prev => prev.map(d => (d.id === devisId ? { ...d, statut: newStatut } : d)))
      } else {
        toast.error(data.error || 'Erreur lors du changement de statut')
      }
    } catch {
      toast.error('Erreur réseau')
    } finally {
      setUpdatingStatutId(null)
    }
  }

  // Envoi par email
  const handleSendEmail = async (devis: Devis) => {
    if (!devis.clientEmail) {
      toast.error('Ce devis n\'a pas d\'adresse e-mail client. Modifiez-le pour en ajouter une.')
      return
    }

    const confirmSend = window.confirm(
      `Envoyer le devis ${devis.numero} (${formatEuro(devis.totalTTC)}) par e-mail à ${devis.clientEmail} avec le PDF en pièce jointe ?`
    )
    if (!confirmSend) return

    try {
      setSendingEmailId(devis.id)
      const res = await fetch(`/api/admin/devis/${devis.id}/envoyer`, {
        method: 'POST',
      })
      const data = await res.json()
      if (res.ok) {
        toast.success(data.message || 'Devis envoyé avec succès !')
        fetchDevis()
      } else {
        toast.error(data.error || 'Erreur lors de l\'envoi')
      }
    } catch {
      toast.error('Erreur réseau lors de l\'envoi du devis')
    } finally {
      setSendingEmailId(null)
    }
  }

  // Suppression
  const handleDelete = async (devis: Devis) => {
    const confirmDelete = window.confirm(
      `Êtes-vous sûr de vouloir supprimer définitivement le devis ${devis.numero} (${devis.clientNom}) ?`
    )
    if (!confirmDelete) return

    try {
      setDeletingId(devis.id)
      const res = await fetch(`/api/admin/devis/${devis.id}`, {
        method: 'DELETE',
      })
      const data = await res.json()
      if (res.ok) {
        toast.success('Devis supprimé avec succès')
        setDevisList(prev => prev.filter(d => d.id !== devis.id))
      } else {
        toast.error(data.error || 'Erreur lors de la suppression')
      }
    } catch {
      toast.error('Erreur réseau lors de la suppression')
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="space-y-6">
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-2xs">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="flex items-center justify-center w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100 text-lg font-bold">
              📝
            </span>
            <div>
              <h1 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">
                Devis & Formations
              </h1>
              <p className="text-xs md:text-sm text-slate-500 font-medium">
                Édition, gestion et génération des devis officiels du Triton Club Cavaillon
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* BOUTON RAPIDE SSA */}
          <button
            onClick={() => handleOpenCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs md:text-sm font-bold rounded-xl shadow-xs transition-all transform active:scale-95"
            title="Créer rapidement le devis Formation SSA (SSA + PSE1 + PSE2 = 750 €)"
          >
            <Zap className="w-4 h-4 text-amber-300" />
            <span>Devis Express SSA (750 €)</span>
          </button>

          {/* BOUTON NOUVEAU DEVIS */}
          <button
            onClick={() => handleOpenCreateModal(false)}
            className="flex items-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs md:text-sm font-bold rounded-xl shadow-xs transition-all active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Nouveau Devis</span>
          </button>
        </div>
      </div>

      {/* KPI STATS CARDS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 md:p-5 rounded-2xl border border-slate-200/80 shadow-2xs">
          <p className="text-[10px] md:text-xs font-bold uppercase tracking-wider text-slate-400">Total Devis</p>
          <p className="text-2xl md:text-3xl font-black text-slate-900 mt-1">{stats.total}</p>
          <p className="text-[10px] text-slate-500 mt-1 font-medium">Toutes périodes confondues</p>
        </div>

        <div className="bg-white p-4 md:p-5 rounded-2xl border border-slate-200/80 shadow-2xs">
          <p className="text-[10px] md:text-xs font-bold uppercase tracking-wider text-amber-600">En attente / Envoyés</p>
          <p className="text-2xl md:text-3xl font-black text-amber-900 mt-1">{stats.envoyes}</p>
          <p className="text-[10px] text-slate-500 mt-1 font-medium">
            {stats.brouillons} brouillon{stats.brouillons > 1 ? 's' : ''} en cours
          </p>
        </div>

        <div className="bg-white p-4 md:p-5 rounded-2xl border border-slate-200/80 shadow-2xs">
          <p className="text-[10px] md:text-xs font-bold uppercase tracking-wider text-emerald-600">Devis Validés</p>
          <p className="text-2xl md:text-3xl font-black text-emerald-900 mt-1">{stats.acceptes}</p>
          <p className="text-[10px] text-emerald-600 mt-1 font-bold">
            Total : {formatEuro(stats.montantAccepte)}
          </p>
        </div>

        <div className="bg-white p-4 md:p-5 rounded-2xl border border-slate-200/80 shadow-2xs">
          <p className="text-[10px] md:text-xs font-bold uppercase tracking-wider text-slate-400">Montant Devisé Total</p>
          <p className="text-2xl md:text-3xl font-black text-slate-900 mt-1">{formatEuro(stats.montantTotal)}</p>
          <p className="text-[10px] text-slate-500 mt-1 font-medium">Exonéré de TVA (art. 293 B)</p>
        </div>
      </div>

      {/* FILTRES ET RECHERCHE */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
        {/* Recherche */}
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Rechercher par N°, client, titre..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs md:text-sm font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Boutons de filtres statut */}
        <div className="flex flex-wrap items-center gap-1.5 w-full sm:w-auto">
          {[
            { id: 'tous', label: 'Tous' },
            { id: 'brouillon', label: 'Brouillons' },
            { id: 'envoye', label: 'Envoyés' },
            { id: 'accepte', label: 'Acceptés' },
            { id: 'refuse', label: 'Refusés' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setFilterStatut(tab.id)}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                filterStatut === tab.id
                  ? 'bg-emerald-600 text-white shadow-2xs'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* TABLEAU DES DEVIS */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-3">
            <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
            <p className="text-xs font-bold text-slate-500">Chargement des devis...</p>
          </div>
        ) : filteredDevis.length === 0 ? (
          <div className="py-16 text-center px-4">
            <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-base font-bold text-slate-800">Aucun devis trouvé</p>
            <p className="text-xs text-slate-500 mt-1">
              {searchQuery || filterStatut !== 'tous'
                ? 'Modifiez vos filtres ou termes de recherche.'
                : 'Commencez par créer un premier devis ou générez le devis express SSA.'}
            </p>
            <button
              onClick={() => handleOpenCreateModal(true)}
              className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-all"
            >
              <Zap className="w-4 h-4 text-amber-300" />
              Créer le devis SSA (750 €)
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/70 text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
                  <th className="py-3.5 px-4">N° Devis</th>
                  <th className="py-3.5 px-4">Client / Destinataire</th>
                  <th className="py-3.5 px-4">Objet & Prestations</th>
                  <th className="py-3.5 px-4">Dates</th>
                  <th className="py-3.5 px-4 text-right">Montant Net</th>
                  <th className="py-3.5 px-4 text-center">Statut</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredDevis.map(devis => {
                  const statutCfg = STATUTS_CONFIG[devis.statut] || STATUTS_CONFIG.brouillon
                  const dateEmStr = new Date(devis.dateEmission).toLocaleDateString('fr-FR')
                  const dateValStr = new Date(devis.dateValidite).toLocaleDateString('fr-FR')

                  return (
                    <tr key={devis.id} className="hover:bg-slate-50/80 transition-colors group">
                      {/* N° DEVIS */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="font-mono font-bold text-slate-900 bg-slate-100 px-2 py-1 rounded-md border border-slate-200">
                          {devis.numero}
                        </span>
                      </td>

                      {/* CLIENT */}
                      <td className="py-3.5 px-4">
                        <p className="font-bold text-slate-900">{devis.clientNom}</p>
                        {devis.clientEmail && (
                          <p className="text-[11px] text-slate-500 font-medium">{devis.clientEmail}</p>
                        )}
                        {devis.clientTelephone && (
                          <p className="text-[10px] text-slate-400">{devis.clientTelephone}</p>
                        )}
                      </td>

                      {/* OBJET & LIGNES */}
                      <td className="py-3.5 px-4 max-w-xs">
                        <p className="font-semibold text-slate-900 truncate" title={devis.titre}>
                          {devis.titre}
                        </p>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          {devis.lignes.length} prestation{devis.lignes.length > 1 ? 's' : ''}
                        </p>
                      </td>

                      {/* DATES */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <p className="text-slate-700 font-medium">Émis : {dateEmStr}</p>
                        <p className="text-[10px] text-slate-400">Valide : {dateValStr}</p>
                      </td>

                      {/* MONTANT TOTAL */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <span className="text-sm font-black text-slate-950">
                          {formatEuro(devis.totalTTC)}
                        </span>
                        <p className="text-[9px] text-slate-400 uppercase font-semibold">TTC Exonéré</p>
                      </td>

                      {/* STATUT DROPDOWN */}
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <div className="inline-flex items-center gap-1">
                          <select
                            value={devis.statut}
                            disabled={updatingStatutId === devis.id}
                            onChange={e => handleQuickStatutChange(devis.id, e.target.value)}
                            className={`text-[11px] font-bold px-2.5 py-1 rounded-full border cursor-pointer transition-all ${statutCfg.bg} ${statutCfg.text} ${statutCfg.border} focus:outline-none focus:ring-1 focus:ring-emerald-500`}
                          >
                            <option value="brouillon">⏳ Brouillon</option>
                            <option value="envoye">✉️ Envoyé</option>
                            <option value="accepte">✅ Accepté</option>
                            <option value="refuse">❌ Refusé</option>
                          </select>
                        </div>
                      </td>

                      {/* ACTIONS */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Télécharger PDF */}
                          <a
                            href={`/api/admin/devis/${devis.id}/pdf`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors border border-transparent hover:border-emerald-200"
                            title="Voir et Télécharger le PDF officiel"
                          >
                            <Download className="w-4 h-4" />
                          </a>

                          {/* Envoyer par Email */}
                          <button
                            onClick={() => handleSendEmail(devis)}
                            disabled={sendingEmailId === devis.id}
                            className="p-1.5 text-slate-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors border border-transparent hover:border-blue-200"
                            title="Envoyer le devis par e-mail au client"
                          >
                            {sendingEmailId === devis.id ? (
                              <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                            ) : (
                              <Send className="w-4 h-4" />
                            )}
                          </button>

                          {/* Modifier */}
                          <button
                            onClick={() => handleOpenEditModal(devis)}
                            className="p-1.5 text-slate-600 hover:text-amber-700 hover:bg-amber-50 rounded-lg transition-colors border border-transparent hover:border-amber-200"
                            title="Modifier ce devis"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>

                          {/* Supprimer */}
                          <button
                            onClick={() => handleDelete(devis)}
                            disabled={deletingId === devis.id}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                            title="Supprimer ce devis"
                          >
                            {deletingId === devis.id ? (
                              <Loader2 className="w-4 h-4 animate-spin text-rose-600" />
                            ) : (
                              <Trash2 className="w-4 h-4" />
                            )}
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

      {/* MODALE CRÉATION / MODIFICATION DE DEVIS */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs overflow-y-auto">
          <div className="relative w-full max-w-4xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-8">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 bg-slate-50/70">
              <div className="flex items-center gap-3">
                <span className="flex items-center justify-center w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 font-black">
                  📝
                </span>
                <div>
                  <h2 className="text-lg font-black text-slate-900">
                    {editingDevis ? `Modifier le Devis ${editingDevis.numero}` : 'Créer un Nouveau Devis'}
                  </h2>
                  <p className="text-xs text-slate-500 font-medium">
                    {editingDevis
                      ? 'Mise à jour des prestations et régénération automatique du PDF'
                      : 'Numérotation séquentielle automatique (DEV-AAAA-XXXX)'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {/* Bouton charger pack SSA dans le modal */}
                <button
                  type="button"
                  onClick={handleApplySSAPack}
                  className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 text-xs font-bold rounded-xl transition-all"
                  title="Pré-remplir avec le pack Formation SSA (750 €)"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  <span>Modèle SSA (750 €)</span>
                </button>

                <button
                  onClick={() => setIsModalOpen(false)}
                  className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSubmitForm} className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
              {/* SECTION CLIENT */}
              <div className="space-y-3">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <span>1. Destinataire / Bénéficiaire</span>
                </h3>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Nom / Raison Sociale <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: Dupont Jean, Mairie de..., Entreprise X"
                      value={formClientNom}
                      onChange={e => setFormClientNom(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs md:text-sm font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Adresse E-mail (pour envoi direct)
                    </label>
                    <input
                      type="email"
                      placeholder="client@exemple.fr"
                      value={formClientEmail}
                      onChange={e => setFormClientEmail(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs md:text-sm font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Téléphone
                    </label>
                    <input
                      type="tel"
                      placeholder="06 12 34 56 78"
                      value={formClientTelephone}
                      onChange={e => setFormClientTelephone(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs md:text-sm font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Adresse Postale / Ville
                    </label>
                    <input
                      type="text"
                      placeholder="12 rue des Oliviers, 84300 Cavaillon"
                      value={formClientAdresse}
                      onChange={e => setFormClientAdresse(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs md:text-sm font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>
              </div>

              {/* SECTION OBJET & VALIDITÉ */}
              <div className="space-y-3 pt-2 border-t border-slate-100">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-400">
                  2. Objet & Validité du Devis
                </h3>

                <div className="grid sm:grid-cols-3 gap-4">
                  <div className="sm:col-span-3">
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Objet / Intitulé du Devis <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: Formation Surveillant Sauveteur Aquatique (SSA) & Secourisme"
                      value={formTitre}
                      onChange={e => setFormTitre(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs md:text-sm font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Date d'émission
                    </label>
                    <input
                      type="date"
                      value={formDateEmission}
                      onChange={e => setFormDateEmission(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Date de fin de validité
                    </label>
                    <input
                      type="date"
                      value={formDateValidite}
                      onChange={e => setFormDateValidite(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Statut
                    </label>
                    <select
                      value={formStatut}
                      onChange={e => setFormStatut(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                      <option value="brouillon">⏳ Brouillon</option>
                      <option value="envoye">✉️ Envoyé</option>
                      <option value="accepte">✅ Accepté</option>
                      <option value="refuse">❌ Refusé</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* SECTION PRESTATIONS / LIGNES DYNAMIQUES */}
              <div className="space-y-3 pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-400">
                    3. Détail des Prestations
                  </h3>
                  <button
                    type="button"
                    onClick={handleAddLigne}
                    className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Ajouter une ligne</span>
                  </button>
                </div>

                <div className="space-y-3">
                  {formLignes.map((ligne, idx) => (
                    <div
                      key={idx}
                      className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-2xl space-y-2 relative group"
                    >
                      <div className="flex items-center justify-between text-[11px] font-bold text-slate-400">
                        <span>Ligne #{idx + 1}</span>
                        {formLignes.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveLigne(idx)}
                            className="text-rose-500 hover:text-rose-700 p-1 rounded-md hover:bg-rose-50 transition-colors"
                            title="Supprimer cette ligne"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>

                      <div className="grid sm:grid-cols-12 gap-3 items-end">
                        {/* Description */}
                        <div className="sm:col-span-7">
                          <label className="block text-[11px] font-bold text-slate-600 mb-1">
                            Désignation / Descriptif
                          </label>
                          <textarea
                            rows={2}
                            required
                            placeholder="Intitulé de la formation ou prestation..."
                            value={ligne.description}
                            onChange={e => handleLigneChange(idx, 'description', e.target.value)}
                            className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500"
                          />
                        </div>

                        {/* Quantité */}
                        <div className="sm:col-span-2">
                          <label className="block text-[11px] font-bold text-slate-600 mb-1">
                            Quantité
                          </label>
                          <input
                            type="number"
                            min="1"
                            step="1"
                            value={ligne.quantite}
                            onChange={e => handleLigneChange(idx, 'quantite', e.target.value)}
                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-center focus:outline-none focus:ring-2 focus:ring-emerald-500"
                          />
                        </div>

                        {/* Prix unitaire */}
                        <div className="sm:col-span-3">
                          <label className="block text-[11px] font-bold text-slate-600 mb-1">
                            Prix Unit. Net (€)
                          </label>
                          <div className="relative">
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={ligne.prixUnitaire}
                              onChange={e => handleLigneChange(idx, 'prixUnitaire', e.target.value)}
                              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-right pr-7 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                            />
                            <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold">
                              €
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Sous-total ligne */}
                      <div className="flex justify-end pt-1 text-xs">
                        <span className="text-slate-500 font-medium mr-2">Sous-total ligne :</span>
                        <span className="font-extrabold text-slate-900">{formatEuro(ligne.total)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* SECTION CONDITIONS ET TOTAL */}
              <div className="grid sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100 items-start">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Conditions de règlement & Remarques (affichées sur le devis)
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Ex: Règlement en 3 fois sans frais par chèques ou virement. Validité 30 jours."
                    value={formNotes}
                    onChange={e => setFormNotes(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  <p className="text-[10px] text-slate-400 mt-1 italic">
                    Mention TVA : TVA non applicable, art. 293 B du Code Général des Impôts (statut associatif).
                  </p>
                </div>

                {/* BOX RECAPITULATIF FINANCIER */}
                <div className="bg-slate-50 border border-slate-200/80 p-4 rounded-2xl space-y-2">
                  <div className="flex justify-between text-xs text-slate-600">
                    <span>Total HT :</span>
                    <span className="font-bold">{formatEuro(currentTotalTTC)}</span>
                  </div>
                  <div className="flex justify-between text-xs text-slate-600">
                    <span>TVA (0% exonérée) :</span>
                    <span className="font-bold">0,00 €</span>
                  </div>
                  <div className="border-t border-slate-200 pt-2 flex justify-between items-baseline">
                    <span className="text-xs font-black text-slate-900 uppercase">Total Net à Payer :</span>
                    <span className="text-xl font-black text-emerald-600">
                      {formatEuro(currentTotalTTC)}
                    </span>
                  </div>
                </div>
              </div>

              {/* MODAL FOOTER ACTIONS */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-2.5 border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-bold rounded-xl transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black rounded-xl shadow-xs transition-all disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Génération en cours...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>{editingDevis ? 'Enregistrer les modifications' : 'Créer & Générer le Devis PDF'}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
