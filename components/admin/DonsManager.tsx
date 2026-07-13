'use client'

import { useState, useEffect, useCallback } from 'react'
import toast from 'react-hot-toast'
import Image from 'next/image'
import { numberToFrenchWords } from '@/lib/utils/number-to-letters'

interface UserRef {
  prenom: string
  nom: string | null
  email: string
}

interface Don {
  id: string
  numeroRecu: string
  typeDonateur: 'particulier' | 'entreprise'
  nomDonateur: string
  emailDonateur: string | null
  adresseDonateur: string
  siren: string | null
  montant: number
  montantLettres: string
  dateDon: string
  natureDon: 'numeraire' | 'cheque' | 'virement' | 'nature' | 'abandon_frais'
  descriptionNature: string | null
  modePaiement: string | null
  statut: 'brouillon' | 'emis' | 'annule'
  pdfUrl: string | null
  dateEmission: string | null
  commentaire: string | null
  signataire: string
  createdAt: string
  creePar?: UserRef | null
}

interface CompanyResult {
  siren: string
  nom_complet: string
  siege: {
    siret: string
    adresse: string
    code_postal: string
    libelle_commune: string
    etat_administratif: 'A' | 'C'
  }
}

interface Stats {
  totalEmis: number
  countEmis: number
  totalBrouillon: number
  countBrouillon: number
  totalAnnule: number
  countAnnule: number
  particulier: { total: number; count: number }
  entreprise: { total: number; count: number }
  anneeEnCours: { total: number; count: number; year: number }
  nature: Record<string, { montant: number; count: number }>
}

interface DonsManagerProps {
  currentUser?: {
    id: string
    email: string
    role: string
  } | null
}

export default function DonsManager({ currentUser }: DonsManagerProps) {
  // List & Stats state
  const [dons, setDons] = useState<Don[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)

  // Filters state
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [statutFilter, setStatutFilter] = useState('all')
  const [dateDebut, setDateDebut] = useState('')
  const [dateFin, setDateFin] = useState('')

  // Modals state
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [isDetailOpen, setIsDetailOpen] = useState(false)
  const [isCancelOpen, setIsCancelOpen] = useState(false)
  const [selectedDon, setSelectedDon] = useState<Don | null>(null)

  // Form state
  const [editingId, setEditingId] = useState<string | null>(null)
  const [typeDonateur, setTypeDonateur] = useState<'particulier' | 'entreprise'>('particulier')
  const [nomDonateur, setNomDonateur] = useState('')
  const [emailDonateur, setEmailDonateur] = useState('')
  const [adresseDonateur, setAdresseDonateur] = useState('')
  const [siren, setSiren] = useState('')
  const [montant, setMontant] = useState('')
  const [dateDon, setDateDon] = useState(new Date().toISOString().substring(0, 10))
  const [natureDon, setNatureDon] = useState<'numeraire' | 'cheque' | 'virement' | 'nature' | 'abandon_frais'>('virement')
  const [descriptionNature, setDescriptionNature] = useState('')
  const [modePaiement, setModePaiement] = useState('')
  const [commentaire, setCommentaire] = useState('')
  const [sendEmail, setSendEmail] = useState(true)
  const [signataire, setSignataire] = useState<'president' | 'tresoriere'>('president')

  // Autocomplete state
  const [searchCompany, setSearchCompany] = useState('')
  const [companyResults, setCompanyResults] = useState<CompanyResult[]>([])
  const [searchingCompany, setSearchingCompany] = useState(false)
  const [showClosedCompanies, setShowClosedCompanies] = useState(false)

  // Actions loading
  const [submitting, setSubmitting] = useState(false)
  const [cancelReason, setCancelReason] = useState('')
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null)

  // Club details for preview
  const [clubName, setClubName] = useState('Triton Club Cavaillon')
  const [nomPresident, setNomPresident] = useState('Le Président')
  const [titrePresident, setTitrePresident] = useState('Président')
  const [nomTresoriere, setNomTresoriere] = useState('La Trésorière')
  const [titreTresoriere, setTitreTresoriere] = useState('Trésorière')

  // Fetch Settings
  useEffect(() => {
    const fetchClubSettings = async () => {
      try {
        const response = await fetch('/api/admin/parametres')
        if (response.ok) {
          const data = await response.json()
          setClubName(data.settings.nomClub || 'Triton Club Cavaillon')
          setNomPresident(data.settings.nomSignataireRecu || 'Le Président')
          setTitrePresident(data.settings.titreSignataireRecu || 'Président')
          setNomTresoriere(data.settings.nomTresoriereRecu || 'La Trésorière')
          setTitreTresoriere(data.settings.titreTresoriereRecu || 'Trésorière')
        }
      } catch {
        // Erreur lors du chargement des paramètres du club
      }
    }
    fetchClubSettings()
  }, [])

  // Load Data
  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      // Build queries
      const queryParams = new URLSearchParams()
      if (search) queryParams.set('search', search)
      if (typeFilter !== 'all') queryParams.set('typeDonateur', typeFilter)
      if (statutFilter !== 'all') queryParams.set('statut', statutFilter)
      if (dateDebut) queryParams.set('dateDebut', dateDebut)
      if (dateFin) queryParams.set('dateFin', dateFin)

      const [resList, resStats] = await Promise.all([
        fetch(`/api/admin/dons?${queryParams.toString()}`),
        fetch('/api/admin/dons/stats')
      ])

      const dataList = await resList.json()
      const dataStats = await resStats.json()

      if (resList.ok) setDons(dataList.dons || [])
      if (resStats.ok) setStats(dataStats.stats || null)
    } catch {
      toast.error('Erreur lors du chargement des données')
    } finally {
      setLoading(false)
    }
  }, [search, typeFilter, statutFilter, dateDebut, dateFin])

  useEffect(() => {
    const timer = setTimeout(() => {
      void loadData()
    }, 300)
    return () => clearTimeout(timer)
  }, [loadData])

  // debounce company search
  useEffect(() => {
    if (typeDonateur !== 'entreprise' || searchCompany.trim().length < 3) {
      setCompanyResults([])
      return
    }

    const searchApi = async () => {
      setSearchingCompany(true)
      try {
        const res = await fetch(`/api/admin/recherche-entreprise?q=${encodeURIComponent(searchCompany)}`)
        if (res.ok) {
          const data = await res.json()
          setCompanyResults(data.results || [])
        }
      } catch {
        // fail silently
      } finally {
        setSearchingCompany(false)
      }
    }

    const debounce = setTimeout(() => {
      void searchApi()
    }, 400)

    return () => clearTimeout(debounce)
  }, [searchCompany, typeDonateur])

  const selectCompany = (c: CompanyResult) => {
    setNomDonateur(c.nom_complet)
    setSiren(c.siege.siret || c.siren)
    
    // Format full address
    const fullAddr = `${c.siege.adresse}`
    setAdresseDonateur(fullAddr)
    
    setSearchCompany('')
    setCompanyResults([])
    toast.success('Données de l\'entreprise pré-remplies')
  }

  const openCreateModal = () => {
    setEditingId(null)
    setTypeDonateur('particulier')
    setNomDonateur('')
    setEmailDonateur('')
    setAdresseDonateur('')
    setSiren('')
    setMontant('')
    setDateDon(new Date().toISOString().substring(0, 10))
    setNatureDon('virement')
    setDescriptionNature('')
    setModePaiement('')
    setCommentaire('')
    setSendEmail(true)
    setSignataire('president')
    setIsFormOpen(true)
  }

  const openEditModal = (don: Don) => {
    setEditingId(don.id)
    setTypeDonateur(don.typeDonateur)
    setNomDonateur(don.nomDonateur)
    setEmailDonateur(don.emailDonateur || '')
    setAdresseDonateur(don.adresseDonateur)
    setSiren(don.siren || '')
    setMontant(don.montant.toString())
    setDateDon(new Date(don.dateDon).toISOString().substring(0, 10))
    setNatureDon(don.natureDon)
    setDescriptionNature(don.descriptionNature || '')
    setModePaiement(don.modePaiement || '')
    setCommentaire(don.commentaire || '')
    setSendEmail(true)
    setSignataire(don.signataire as any || 'president')
    setIsFormOpen(true)
  }

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!nomDonateur.trim() || !adresseDonateur.trim() || !montant.trim()) {
      return toast.error('Veuillez remplir les champs obligatoires')
    }
    if (typeDonateur === 'entreprise' && !siren.trim()) {
      return toast.error('Le numéro SIRET/SIREN est obligatoire pour une entreprise')
    }
    if ((natureDon === 'nature' || natureDon === 'abandon_frais') && !descriptionNature.trim()) {
      return toast.error('Une description détaillée est requise pour cette nature de don')
    }

    setSubmitting(true)
    const payload = {
      typeDonateur,
      nomDonateur: nomDonateur.trim(),
      emailDonateur: emailDonateur.trim() || null,
      adresseDonateur: adresseDonateur.trim(),
      siren: typeDonateur === 'entreprise' ? siren.trim() : null,
      montant: parseFloat(montant),
      dateDon: new Date(dateDon).toISOString(),
      natureDon,
      descriptionNature: (natureDon === 'nature' || natureDon === 'abandon_frais') ? descriptionNature.trim() : null,
      modePaiement: modePaiement.trim() || null,
      commentaire: commentaire.trim() || null,
      signataire,
    }

    try {
      const url = editingId ? `/api/admin/dons/${editingId}` : '/api/admin/dons'
      const method = editingId ? 'PUT' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      const data = await res.json()

      if (res.ok) {
        toast.success(editingId ? 'Don mis à jour avec succès' : 'Don enregistré en brouillon')
        setIsFormOpen(false)
        await loadData()
      } else {
        toast.error(data.error || 'Erreur lors de l\'enregistrement')
      }
    } catch {
      toast.error('Erreur réseau')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Voulez-vous vraiment supprimer définitivement ce don en brouillon ?')) return
    setActionLoadingId(id)
    try {
      const res = await fetch(`/api/admin/dons/${id}`, { method: 'DELETE' })
      const data = await res.json()
      if (res.ok) {
        toast.success('Don supprimé avec succès')
        await loadData()
      } else {
        toast.error(data.error || 'Erreur lors de la suppression')
      }
    } catch {
      toast.error('Erreur réseau')
    } finally {
      setActionLoadingId(null)
    }
  }

  const handleEmitReceipt = async (id: string) => {
    if (!confirm('Confirmez-vous l\'émission de ce reçu fiscal ? Cette action va lui attribuer son numéro de reçu séquentiel définitif et générer son PDF officiel.')) return
    setActionLoadingId(id)
    try {
      const res = await fetch(`/api/admin/dons/${id}/recu`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sendEmail })
      })
      const data = await res.json()
      if (res.ok) {
        toast.success(data.emailEnvoye ? 'Reçu émis et envoyé par e-mail au donateur !' : 'Reçu fiscal émis avec succès !')
        setIsDetailOpen(false)
        await loadData()
      } else {
        toast.error(data.error || 'Erreur lors de l\'émission du reçu')
      }
    } catch {
      toast.error('Erreur réseau')
    } finally {
      setActionLoadingId(null)
    }
  }

  const handleCancelReceipt = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedDon) return
    if (!cancelReason.trim()) {
      return toast.error('Veuillez spécifier le motif d\'annulation')
    }

    setSubmitting(true)
    try {
      const res = await fetch(`/api/admin/dons/${selectedDon.id}/annuler`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ motif: cancelReason })
      })
      const data = await res.json()
      if (res.ok) {
        toast.success('Reçu fiscal annulé et trace préservée')
        setIsCancelOpen(false)
        setIsDetailOpen(false)
        await loadData()
      } else {
        toast.error(data.error || 'Erreur lors de l\'annulation')
      }
    } catch {
      toast.error('Erreur réseau')
    } finally {
      setSubmitting(false)
      setCancelReason('')
    }
  }

  const getStatutBadge = (statut: string) => {
    switch (statut) {
      case 'brouillon':
        return 'bg-gray-100 text-gray-700 font-semibold border border-gray-200'
      case 'emis':
        return 'bg-emerald-50 text-emerald-700 font-extrabold border border-emerald-200'
      case 'annule':
        return 'bg-rose-50 text-rose-700 font-extrabold border border-rose-200 line-through'
      default:
        return 'bg-slate-100 text-slate-700'
    }
  }

  const getNatureLabel = (nature: string) => {
    switch (nature) {
      case 'numeraire': return 'Espèces'
      case 'cheque': return 'Chèque'
      case 'virement': return 'Virement'
      case 'nature': return 'Don en nature'
      case 'abandon_frais': return 'Abandon de frais'
      default: return nature
    }
  }

  const formatEuro = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(amount)
  }

  return (
    <div className="space-y-6">
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-100 pb-5">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            🎗️ Module Reçus Fiscaux (Dons CERFA)
          </h2>
          <p className="text-slate-400 text-xs mt-1 font-medium">Gestion, numérotation séquentielle et archivage des reçus de dons d&apos;utilité publique</p>
        </div>

        <div className="flex flex-wrap gap-2">
          <a
            href={`/api/admin/dons/export?statut=${statutFilter}&typeDonateur=${typeFilter}`}
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl transition-all shadow-2xs flex items-center gap-1.5 bg-white cursor-pointer"
          >
            📥 Exporter le Registre (CSV)
          </a>
          <button
            onClick={openCreateModal}
            className="px-4 py-2 bg-slate-950 hover:bg-slate-900 text-white text-xs font-bold rounded-xl shadow-sm transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            ➕ Enregistrer un Don
          </button>
        </div>
      </div>

      {/* METRICS STACK */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="card p-5 bg-white border border-slate-200/80 rounded-2xl relative overflow-hidden group shadow-2xs">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Dons Émis (Exercice {stats.anneeEnCours.year})</p>
            <p className="text-2xl font-black text-slate-950 mt-3">{formatEuro(stats.anneeEnCours.total)}</p>
            <p className="text-[10px] text-emerald-600 font-bold mt-2 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              {stats.anneeEnCours.count} dons déclarés
            </p>
          </div>

          <div className="card p-5 bg-white border border-slate-200/80 rounded-2xl relative overflow-hidden group shadow-2xs">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Cumul Général Émis</p>
            <p className="text-2xl font-black text-slate-950 mt-3">{formatEuro(stats.totalEmis)}</p>
            <p className="text-[10px] text-slate-500 font-medium mt-2">
              Sur un total de <span className="font-bold text-slate-800">{stats.countEmis}</span> reçus fiscaux
            </p>
          </div>

          <div className="card p-5 bg-white border border-slate-200/80 rounded-2xl relative overflow-hidden group shadow-2xs">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Brouillons en attente</p>
            <p className="text-2xl font-black text-slate-950 mt-3">{formatEuro(stats.totalBrouillon)}</p>
            <p className="text-[10px] text-amber-600 font-bold mt-2">
              {stats.countBrouillon} brouillons à valider et émettre
            </p>
          </div>

          <div className="card p-5 bg-white border border-slate-200/80 rounded-2xl relative overflow-hidden group shadow-2xs">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Répartition Particulier / Ent.</p>
            <p className="text-2xl font-black text-slate-950 mt-3">{stats.particulier.count} / {stats.entreprise.count}</p>
            <p className="text-[10px] text-slate-500 font-medium mt-2">
              P: <span className="font-bold">{formatEuro(stats.particulier.total)}</span> | E: <span className="font-bold">{formatEuro(stats.entreprise.total)}</span>
            </p>
          </div>
        </div>
      )}

      {/* FILTER BAR PANEL */}
      <div className="card p-5 bg-white border border-slate-200/80 rounded-2xl shadow-2xs space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3.5 text-xs">
          {/* Text Search */}
          <div className="col-span-1 sm:col-span-2">
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Rechercher</label>
            <input
              type="text"
              placeholder="Rechercher par donateur ou n° de reçu..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-slate-800 focus:bg-white text-slate-800"
            />
          </div>

          {/* Type Filter */}
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Type de Donateur</label>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none text-slate-800 cursor-pointer"
            >
              <option value="all">Tous</option>
              <option value="particulier">Particulier</option>
              <option value="entreprise">Entreprise</option>
            </select>
          </div>

          {/* Statut Filter */}
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Statut</label>
            <select
              value={statutFilter}
              onChange={(e) => setStatutFilter(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none text-slate-800 cursor-pointer"
            >
              <option value="all">Tous</option>
              <option value="brouillon">Brouillon</option>
              <option value="emis">Émis</option>
              <option value="annule">Annulé</option>
            </select>
          </div>

          {/* Action Reset */}
          <div className="flex items-end">
            <button
              onClick={() => {
                setSearch('')
                setTypeFilter('all')
                setStatutFilter('all')
                setDateDebut('')
                setDateFin('')
              }}
              className="w-full py-2 border border-slate-250 hover:bg-slate-50 rounded-lg text-slate-700 font-bold transition-all text-center cursor-pointer"
            >
              🔄 Réinitialiser
            </button>
          </div>
        </div>

        {/* Date Ranges */}
        <div className="flex flex-wrap items-center gap-4 text-xs pt-1 border-t border-slate-50">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Période du</span>
            <input
              type="date"
              value={dateDebut}
              onChange={(e) => setDateDebut(e.target.value)}
              className="px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-slate-800"
            />
            <span className="text-slate-400">au</span>
            <input
              type="date"
              value={dateFin}
              onChange={(e) => setDateFin(e.target.value)}
              className="px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-slate-800"
            />
          </div>
        </div>
      </div>

      {/* TABLE PANEL */}
      <div className="card p-6 bg-white border border-slate-200/80 rounded-2xl shadow-2xs">
        {loading && dons.length === 0 ? (
          <div className="flex items-center justify-center py-16">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : dons.length === 0 ? (
          <p className="text-center text-slate-400 italic py-12 text-xs">
            Aucun reçu fiscal de don trouvé correspondant aux critères.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-slate-650">
                  <th className="text-left py-3 px-4 font-bold text-xs uppercase tracking-wider">N° Reçu</th>
                  <th className="text-left py-3 px-4 font-bold text-xs uppercase tracking-wider">Donateur</th>
                  <th className="text-center py-3 px-4 font-bold text-xs uppercase tracking-wider">Statut</th>
                  <th className="text-right py-3 px-4 font-bold text-xs uppercase tracking-wider">Montant</th>
                  <th className="text-left py-3 px-4 font-bold text-xs uppercase tracking-wider">Date Versement</th>
                  <th className="text-left py-3 px-4 font-bold text-xs uppercase tracking-wider">Nature</th>
                  <th className="text-right py-3 px-4 font-bold text-xs uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody>
                {dons.map((don) => (
                  <tr key={don.id} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-xs text-slate-700">
                      {don.numeroRecu}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-800">{don.nomDonateur}</div>
                      <div className="text-[10px] text-slate-400 font-medium">
                        {don.typeDonateur === 'entreprise' ? `🏢 Entreprise ${don.siren ? `· SIREN ${don.siren.substring(0, 9)}` : ''}` : '👤 Particulier'}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] tracking-wider uppercase font-semibold ${getStatutBadge(don.statut)}`}>
                        {don.statut === 'emis' ? 'Émis' : don.statut === 'annule' ? 'Annulé' : 'Brouillon'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-slate-900">
                      {formatEuro(don.montant)}
                    </td>
                    <td className="py-3 px-4 text-slate-600 text-xs">
                      {new Date(don.dateDon).toLocaleDateString('fr-FR')}
                    </td>
                    <td className="py-3 px-4 text-slate-650 text-xs font-medium">
                      {getNatureLabel(don.natureDon)}
                    </td>
                    <td className="py-3 px-4 text-right space-x-2">
                      <button
                        onClick={() => {
                          setSelectedDon(don)
                          setIsDetailOpen(true)
                        }}
                        className="px-2.5 py-1 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
                      >
                        Détails
                      </button>

                      {don.statut === 'brouillon' ? (
                        <>
                          <button
                            onClick={() => openEditModal(don)}
                            className="px-2.5 py-1 text-xs font-bold text-slate-800 bg-amber-50 hover:bg-amber-100 border border-amber-250/20 rounded-lg transition-colors cursor-pointer"
                            disabled={actionLoadingId === don.id}
                          >
                            Modifier
                          </button>
                          <button
                            onClick={() => handleDelete(don.id)}
                            className="px-2.5 py-1 text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors cursor-pointer"
                            disabled={actionLoadingId === don.id}
                          >
                            Supprimer
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => handleDelete(don.id)}
                          className="px-2.5 py-1 text-xs font-bold text-red-600 bg-red-50/50 hover:bg-red-100 rounded-lg transition-colors cursor-pointer"
                          disabled={actionLoadingId === don.id}
                        >
                          Supprimer
                        </button>
                      )}

                      {don.statut === 'emis' && don.pdfUrl && (
                        <a
                          href={don.pdfUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="px-2.5 py-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors cursor-pointer inline-block"
                        >
                          📄 PDF
                        </a>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* DETAILED VIEW MODAL */}
      {isDetailOpen && selectedDon && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 animate-fade-in p-4">
          <div className="bg-white rounded-3xl border border-slate-200/80 p-6 md:p-8 max-w-xl w-full shadow-lg m-4 space-y-6 overflow-y-auto max-h-[90vh]">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div>
                <span className={`px-2 py-0.5 rounded-full text-[9px] tracking-wider uppercase font-extrabold ${getStatutBadge(selectedDon.statut)}`}>
                  {selectedDon.statut}
                </span>
                <h3 className="text-base font-extrabold text-slate-950 mt-1.5">
                  Reçu Fiscal : {selectedDon.numeroRecu}
                </h3>
              </div>
              <button
                onClick={() => setIsDetailOpen(false)}
                className="text-slate-400 hover:text-slate-650 font-bold cursor-pointer text-lg"
              >
                ✕
              </button>
            </div>

            <div className="text-sm font-light text-slate-750 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Type de donateur</span>
                  <span className="font-semibold text-slate-800 capitalize">{selectedDon.typeDonateur}</span>
                </div>
                <div>
                  <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Identité / Dénomination</span>
                  <span className="font-semibold text-slate-800">{selectedDon.nomDonateur}</span>
                </div>
              </div>

              {selectedDon.siren && (
                <div>
                  <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">SIRET / SIREN</span>
                  <span className="font-mono text-slate-800">{selectedDon.siren}</span>
                </div>
              )}

              <div>
                <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Adresse</span>
                <span className="font-semibold text-slate-800">{selectedDon.adresseDonateur}</span>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Montant</span>
                  <span className="font-extrabold text-slate-900 text-lg">{formatEuro(selectedDon.montant)}</span>
                </div>
                <div>
                  <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Nature du don</span>
                  <span className="font-semibold text-slate-800">{getNatureLabel(selectedDon.natureDon)}</span>
                </div>
              </div>

              <div>
                <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Montant en toutes lettres</span>
                <span className="font-semibold text-slate-800 italic">{selectedDon.montantLettres}</span>
              </div>

              {selectedDon.descriptionNature && (
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                  <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Description de la nature du don</span>
                  <span className="text-slate-700 text-xs leading-relaxed">{selectedDon.descriptionNature}</span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Date du don</span>
                  <span className="font-semibold text-slate-800">{new Date(selectedDon.dateDon).toLocaleDateString('fr-FR')}</span>
                </div>
                <div>
                  <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Mode de versement</span>
                  <span className="font-semibold text-slate-800">{selectedDon.modePaiement || 'Non spécifié'}</span>
                </div>
              </div>

              {selectedDon.emailDonateur && (
                <div>
                  <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Email pour envoi de reçu</span>
                  <span className="font-semibold text-slate-800 font-mono text-xs">{selectedDon.emailDonateur}</span>
                </div>
              )}

              {selectedDon.commentaire && (
                <div>
                  <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Commentaire</span>
                  <span className="text-slate-650 text-xs block whitespace-pre-line">{selectedDon.commentaire}</span>
                </div>
              )}

              {selectedDon.dateEmission && (
                <div className="text-[11px] text-slate-400 font-medium">
                  Émis le {new Date(selectedDon.dateEmission).toLocaleString('fr-FR')}
                  {selectedDon.creePar && ` par ${selectedDon.creePar.prenom}`}
                </div>
              )}
            </div>

            {/* ACTION FOOTER */}
            <div className="flex flex-wrap gap-3 pt-5 border-t border-slate-100 justify-end">
              {selectedDon.statut === 'brouillon' && (
                <div className="w-full flex flex-col gap-3">
                  {selectedDon.emailDonateur && (
                    <label className="inline-flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                      <input
                        type="checkbox"
                        checked={sendEmail}
                        onChange={(e) => setSendEmail(e.target.checked)}
                        className="rounded border-slate-300 text-slate-800 focus:ring-slate-800 w-4 h-4 cursor-pointer"
                      />
                      <span>Envoyer automatiquement le reçu par e-mail au donateur</span>
                    </label>
                  )}
                  <div className="flex gap-2 justify-end">
                    <button
                      onClick={() => handleEmitReceipt(selectedDon.id)}
                      className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                      disabled={actionLoadingId === selectedDon.id}
                    >
                      🚀 Émettre le Reçu Fiscal Définitif
                    </button>
                    <button
                      onClick={() => openEditModal(selectedDon)}
                      className="px-4 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs rounded-xl transition-all cursor-pointer"
                    >
                      Modifier le brouillon
                    </button>
                  </div>
                </div>
              )}

              {selectedDon.statut === 'emis' && (
                <div className="flex gap-2">
                  {selectedDon.pdfUrl && (
                    <a
                      href={selectedDon.pdfUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="px-4 py-2.5 bg-slate-950 hover:bg-slate-900 text-white font-bold text-xs rounded-xl shadow-sm transition-colors flex items-center gap-1.5 cursor-pointer"
                    >
                      Télécharger le reçu PDF
                    </a>
                  )}
                  <button
                    onClick={() => {
                      setCancelReason('')
                      setIsCancelOpen(true)
                    }}
                    className="px-4 py-2.5 bg-red-55/10 hover:bg-red-55/20 text-red-650 border border-red-200/50 font-bold text-xs rounded-xl transition-colors cursor-pointer"
                  >
                    🚫 Annuler ce Reçu
                  </button>
                </div>
              )}

              <button
                type="button"
                onClick={() => setIsDetailOpen(false)}
                className="py-2.5 px-4 border border-slate-200 hover:bg-slate-50 text-slate-650 font-bold text-xs rounded-xl transition-all cursor-pointer"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CANCELLATION DIALOG */}
      {isCancelOpen && selectedDon && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-55 p-4">
          <div className="bg-white rounded-3xl border border-slate-200/80 p-6 max-w-md w-full shadow-lg m-4 space-y-5">
            <h3 className="text-base font-extrabold text-slate-950 flex items-center gap-2">
              ⚠️ Annulation du Reçu Fiscal
            </h3>
            <p className="text-slate-500 text-xs leading-relaxed">
              Vous allez annuler le reçu fiscal <strong>{selectedDon.numeroRecu}</strong>. 
              Le numéro restera réservé et tracé dans le registre mais marqué comme ANNULÉ. 
              L&apos;écriture comptable automatique correspondante sera supprimée.
            </p>

            <form onSubmit={handleCancelReceipt} className="space-y-4">
              <div>
                <label htmlFor="cancelReason" className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                  Motif de l&apos;annulation *
                </label>
                <textarea
                  id="cancelReason"
                  required
                  rows={3}
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder="Ex: Erreur de saisie de montant, donateur erroné, chèque rejeté..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:border-slate-800 focus:bg-white outline-none text-slate-800 text-xs"
                />
              </div>

              <div className="flex gap-3 pt-3 border-t border-slate-100">
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
                  disabled={submitting}
                >
                  {submitting ? 'Annulation...' : 'Confirmer l\'annulation'}
                </button>
                <button
                  type="button"
                  onClick={() => setIsCancelOpen(false)}
                  className="py-2.5 px-4 border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs rounded-xl transition-all cursor-pointer"
                >
                  Retour
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DONATION RECORDING FORM (CREATION / MODIFICATION) */}
      {isFormOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 animate-fade-in p-4">
          <div className="bg-white rounded-3xl border border-slate-200/80 p-6 md:p-8 max-w-4xl w-full shadow-lg m-4 space-y-6 overflow-y-auto max-h-[90vh]">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-950">
                {editingId ? 'Modifier le Don en Brouillon' : 'Enregistrer un nouveau Don'}
              </h3>
              <button
                onClick={() => setIsFormOpen(false)}
                className="text-slate-400 hover:text-slate-650 font-bold cursor-pointer text-lg"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
              
              {/* FORM FIELDS COL */}
              <form onSubmit={handleFormSubmit} className="space-y-4 text-xs font-light text-slate-750">
                {/* Donator Type */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Type de donateur *</label>
                  <div className="flex gap-4">
                    <label className="inline-flex items-center gap-1.5 cursor-pointer font-semibold text-slate-750">
                      <input
                        type="radio"
                        name="typeDonateur"
                        checked={typeDonateur === 'particulier'}
                        onChange={() => {
                          setTypeDonateur('particulier')
                          setSiren('')
                          setSearchCompany('')
                          setCompanyResults([])
                        }}
                        className="text-slate-950 focus:ring-slate-950 w-4 h-4 cursor-pointer"
                      />
                      👤 Particulier
                    </label>
                    <label className="inline-flex items-center gap-1.5 cursor-pointer font-semibold text-slate-750">
                      <input
                        type="radio"
                        name="typeDonateur"
                        checked={typeDonateur === 'entreprise'}
                        onChange={() => setTypeDonateur('entreprise')}
                        className="text-slate-950 focus:ring-slate-950 w-4 h-4 cursor-pointer"
                      />
                      🏢 Entreprise
                    </label>
                  </div>
                </div>

                {/* Company progressive search */}
                {typeDonateur === 'entreprise' && (
                  <div className="relative bg-slate-50 p-3 rounded-lg border border-slate-200/80">
                    <label htmlFor="searchCompany" className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                      Recherche progressive d&apos;entreprise
                    </label>
                    <input
                      type="text"
                      id="searchCompany"
                      value={searchCompany}
                      onChange={(e) => setSearchCompany(e.target.value)}
                      placeholder="Saisissez le nom d'entreprise ou SIREN..."
                      className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg outline-none text-slate-800 text-xs"
                    />
                    
                    {/* Active/Closed toggle */}
                    <div className="mt-1.5 flex items-center justify-between">
                      <label className="inline-flex items-center gap-1 cursor-pointer text-[10px] text-slate-400 font-semibold">
                        <input
                          type="checkbox"
                          checked={showClosedCompanies}
                          onChange={(e) => setShowClosedCompanies(e.target.checked)}
                          className="w-3 h-3 text-slate-950"
                        />
                        <span>Afficher établissements fermés</span>
                      </label>
                      {searchingCompany && <span className="text-[10px] text-blue-600 animate-pulse">Recherche Sirene...</span>}
                    </div>

                    {/* Results dropdown */}
                    {companyResults.length > 0 && (
                      <div className="absolute left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-md max-h-48 overflow-y-auto z-50 text-xs">
                        {companyResults
                          .filter(c => showClosedCompanies || c.siege.etat_administratif === 'A')
                          .map((c) => (
                            <button
                              key={c.siege.siret}
                              type="button"
                              onClick={() => selectCompany(c)}
                              className="w-full px-3 py-2 text-left hover:bg-slate-50 border-b border-slate-100 last:border-0 flex flex-col gap-0.5"
                            >
                              <div className="font-semibold text-slate-850 flex items-center justify-between">
                                <span>{c.nom_complet}</span>
                                <span className={`px-1.5 py-0.25 rounded text-[8px] font-bold ${
                                  c.siege.etat_administratif === 'A' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                                }`}>
                                  {c.siege.etat_administratif === 'A' ? 'ACTIF' : 'FERMÉ'}
                                </span>
                              </div>
                              <div className="text-[10px] text-slate-500">
                                SIRET: {c.siege.siret} · {c.siege.adresse}
                              </div>
                            </button>
                          ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Nom Donateur */}
                <div>
                  <label htmlFor="nomDonateur" className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                    {typeDonateur === 'entreprise' ? 'Raison Sociale *' : 'Nom & Prénom du donateur *'}
                  </label>
                  <input
                    type="text"
                    id="nomDonateur"
                    required
                    value={nomDonateur}
                    onChange={(e) => setNomDonateur(e.target.value)}
                    placeholder={typeDonateur === 'entreprise' ? 'Ex: SAS Triton France' : 'Ex: Romain Dupont'}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200/85 rounded-lg focus:border-slate-800 focus:bg-white outline-none font-normal text-slate-800"
                  />
                </div>

                {/* SIRET / SIREN */}
                {typeDonateur === 'entreprise' && (
                  <div>
                    <label htmlFor="siren" className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                      SIRET / SIREN de l&apos;entreprise *
                    </label>
                    <input
                      type="text"
                      id="siren"
                      required
                      value={siren}
                      onChange={(e) => setSiren(e.target.value)}
                      placeholder="Ex: 44866606500017"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200/85 rounded-lg focus:border-slate-800 focus:bg-white outline-none font-mono text-slate-800"
                    />
                  </div>
                )}

                {/* Adresse Donateur */}
                <div>
                  <label htmlFor="adresseDonateur" className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                    Adresse postale complète *
                  </label>
                  <textarea
                    id="adresseDonateur"
                    required
                    rows={2}
                    value={adresseDonateur}
                    onChange={(e) => setAdresseDonateur(e.target.value)}
                    placeholder="Numéro, rue, code postal et ville du donateur"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200/85 rounded-lg focus:border-slate-800 focus:bg-white outline-none font-normal text-slate-800"
                  />
                </div>

                {/* Email Donateur */}
                <div>
                  <label htmlFor="emailDonateur" className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                    Adresse email du donateur (Optionnel)
                  </label>
                  <input
                    type="email"
                    id="emailDonateur"
                    value={emailDonateur}
                    onChange={(e) => setEmailDonateur(e.target.value)}
                    placeholder="Pour l'envoi direct de l'accusé de réception et du PDF"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200/85 rounded-lg focus:border-slate-800 focus:bg-white outline-none font-normal text-slate-800 text-xs"
                  />
                </div>

                {/* Montant and Date */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="montant" className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Montant du don (€) *</label>
                    <input
                      type="number"
                      step="0.01"
                      id="montant"
                      required
                      value={montant}
                      onChange={(e) => setMontant(e.target.value)}
                      placeholder="Ex: 150.00"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200/85 rounded-lg focus:border-slate-800 focus:bg-white outline-none font-extrabold text-slate-800"
                    />
                  </div>
                  <div>
                    <label htmlFor="dateDon" className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Date du versement *</label>
                    <input
                      type="date"
                      id="dateDon"
                      required
                      value={dateDon}
                      onChange={(e) => setDateDon(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200/85 rounded-lg focus:border-slate-800 focus:bg-white outline-none font-normal text-slate-800 cursor-pointer"
                    />
                  </div>
                </div>

                {/* Nature and payment mode */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="natureDon" className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Nature du don *</label>
                    <select
                      id="natureDon"
                      value={natureDon}
                      onChange={(e) => setNatureDon(e.target.value as any)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200/85 rounded-lg outline-none text-slate-700 font-semibold cursor-pointer text-xs"
                    >
                      <option value="virement">Virement</option>
                      <option value="cheque">Chèque</option>
                      <option value="numeraire">Espèces</option>
                      <option value="nature">Don en nature</option>
                      <option value="abandon_frais">Abandon de frais bénévolat</option>
                    </select>
                  </div>
                  <div>
                    <label htmlFor="modePaiement" className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Mode paiement (complément)</label>
                    <input
                      type="text"
                      id="modePaiement"
                      value={modePaiement}
                      onChange={(e) => setModePaiement(e.target.value)}
                      placeholder="Ex: Société Générale, transaction 321"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200/85 rounded-lg focus:border-slate-800 focus:bg-white outline-none font-normal text-slate-800 text-xs"
                    />
                  </div>
                </div>
 
                {/* Signataire du reçu */}
                <div>
                  <label htmlFor="signataire" className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Signataire officiel du reçu fiscal *</label>
                  <select
                    id="signataire"
                    value={signataire}
                    onChange={(e) => setSignataire(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200/85 rounded-lg outline-none text-slate-750 font-semibold cursor-pointer text-xs"
                  >
                    <option value="president">Le Président ({nomPresident})</option>
                    <option value="tresoriere">La Trésorière ({nomTresoriere})</option>
                  </select>
                </div>

                {/* Description for In-Kind or Volunteer Expense */}
                {(natureDon === 'nature' || natureDon === 'abandon_frais') && (
                  <div>
                    <label htmlFor="descriptionNature" className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                      Description détaillée obligatoire *
                    </label>
                    <textarea
                      id="descriptionNature"
                      required
                      rows={2}
                      value={descriptionNature}
                      onChange={(e) => setDescriptionNature(e.target.value)}
                      placeholder={natureDon === 'nature' ? 'Ex: Don de 10 chronomètres de piscine d\'une valeur totale de 350€.' : 'Ex: Renoncement au remboursement des frais de déplacement saison 2025/2026 (700 km x 0.40€ = 280€).'}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200/85 rounded-lg focus:border-slate-800 focus:bg-white outline-none font-normal text-slate-800 text-xs"
                    />
                  </div>
                )}

                {/* Commentaire */}
                <div>
                  <label htmlFor="commentaire" className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Notes internes / Commentaire</label>
                  <textarea
                    id="commentaire"
                    rows={2}
                    value={commentaire}
                    onChange={(e) => setCommentaire(e.target.value)}
                    placeholder="Campagne d'adhésion, événement lié, etc. (Non visible sur le reçu fiscal)"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200/85 rounded-lg focus:border-slate-800 focus:bg-white outline-none font-normal text-slate-800 text-xs"
                  />
                </div>

                {/* SUBMIT BUTTONS */}
                <div className="flex gap-3 pt-4 border-t border-slate-100">
                  <button
                    type="submit"
                    className="flex-1 py-2.5 bg-slate-950 hover:bg-slate-900 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
                    disabled={submitting}
                  >
                    {submitting ? 'Enregistrement...' : editingId ? 'Mettre à jour le brouillon' : 'Enregistrer le brouillon'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsFormOpen(false)}
                    className="py-2.5 px-4 border border-slate-200 hover:bg-slate-55/10 text-slate-700 font-bold text-xs rounded-xl transition-all cursor-pointer bg-white"
                  >
                    Annuler
                  </button>
                </div>
              </form>

              {/* LIVE PREVIEW COL (Premium layout) */}
              <div className="hidden lg:block bg-slate-50 p-6 rounded-2xl border border-slate-200/80 shadow-2xs space-y-4 max-h-[70vh] overflow-y-auto">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                  Aperçu visuel en direct (Reçu fiscal)
                </span>
                
                <div className="bg-white border border-slate-300 rounded-lg p-5 text-[9px] text-slate-800 space-y-4 shadow-sm relative font-sans leading-relaxed">
                  
                  {/* Decorative badge */}
                  <div className="border border-slate-250 p-3 rounded">
                    <div className="flex justify-between items-start font-bold">
                      <span className="text-[10px] text-slate-600">TRITON CLUB CAVAILLON</span>
                      <span className="text-slate-900 font-mono text-[9px]">REÇU N° : TCC-2026-XXXXX</span>
                    </div>
                    <div className="text-center font-bold text-slate-900 text-[10px] mt-2">
                      REÇU FISCAL POUR DONS
                    </div>
                    <div className="text-center text-[7px] text-slate-500 italic mt-0.5">
                      {typeDonateur === 'entreprise' ? 'Modèle CERFA n° 16216 (Entreprises)' : 'Modèle CERFA n° 11580 (Particuliers)'}
                    </div>
                  </div>

                  {/* Benefit */}
                  <div>
                    <span className="block font-bold text-slate-850">1. ORGANISME BÉNÉFICIAIRE</span>
                    <span>Dénomination : {clubName}</span><br />
                     <span>Adresse : Piscine Alphonse Roudière, Bd Jean Moulin, Quartier La Clède, 84300 Cavaillon</span><br />
                     <span>Objet : Natation sportive et loisir · SIRET : 448 666 065 00017 · RNA : W841000669</span><br />
                    <span>Catégorie : Association reconnue d&apos;intérêt général.</span>
                  </div>

                  {/* Donor */}
                  <div className="border-t border-slate-100 pt-2">
                    <span className="block font-bold text-slate-850">2. DONATEUR</span>
                    <span>Nom / Raison Sociale : <strong className="text-slate-950 font-bold">{nomDonateur || '—'}</strong></span><br />
                    {typeDonateur === 'entreprise' && <span>SIRET/SIREN : <strong className="font-mono text-slate-900">{siren || '—'}</strong><br /></span>}
                    <span>Adresse : {adresseDonateur || '—'}</span>
                  </div>

                  {/* Donation metrics */}
                  <div className="border-t border-slate-100 pt-2">
                    <span className="block font-bold text-slate-850">3. CARACTÉRISTIQUES DU VERSEMENT</span>
                    <span>Date du versement : {new Date(dateDon).toLocaleDateString('fr-FR')}</span><br />
                    <span>Montant : <strong className="text-slate-950 font-black text-xs">{montant ? `${parseFloat(montant).toFixed(2)} €` : '0.00 €'}</strong></span><br />
                    <span className="italic block mt-1">Somme en lettres : {montant ? numberToFrenchWords(parseFloat(montant)) : '—'}</span>
                    <span>Nature du versement : {getNatureLabel(natureDon)} {modePaiement ? `(${modePaiement})` : ''}</span>
                    {descriptionNature && (natureDon === 'nature' || natureDon === 'abandon_frais') && (
                      <div className="mt-1 bg-slate-50 p-2 border border-slate-200 text-slate-650 italic text-[8px]">
                        Description : {descriptionNature}
                      </div>
                    )}
                  </div>

                  {/* Dispositions */}
                  <div className="border-t border-slate-100 pt-2 text-[8px] text-slate-600">
                    <span className="block font-bold text-[9px] text-slate-850">4. CERTIFICATION</span>
                    <p className="margin-0 leading-tight">
                      L&apos;association certifie que le donateur a versé la somme sans aucune contrepartie directe ou indirecte.
                      Ouvre droit à réduction d&apos;impôt sur {typeDonateur === 'entreprise' ? 'les sociétés (IS) de 60%' : 'le revenu (IR) de 66%'} (CGI Art. {typeDonateur === 'entreprise' ? '238 bis' : '200'}).
                    </p>
                  </div>

                  {/* Signee section */}
                  <div className="border-t border-slate-100 pt-2 flex justify-between items-end">
                    <div>Fait à Cavaillon, le {new Date().toLocaleDateString('fr-FR')}</div>
                    <div className="text-right">
                      <span className="block font-bold">Signature fac-similé :</span>
                      <span className="text-[8px] font-semibold block mt-1">{signataire === 'tresoriere' ? nomTresoriere : nomPresident}</span>
                      <span className="text-[8px] text-slate-500 font-medium italic block">{signataire === 'tresoriere' ? titreTresoriere : titrePresident}</span>
                    </div>
                  </div>

                </div>
              </div>

            </div>
          </div>
        </div>
      )}
    </div>
  )
}
