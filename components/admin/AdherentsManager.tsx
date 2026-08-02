'use client'

import React, { useState, useEffect } from 'react'
import { Search, Download, Sparkles, Plus, Upload, Users, CheckCircle2, AlertCircle, CreditCard, RefreshCw } from 'lucide-react'
import { toast } from 'react-hot-toast'

interface Adherent {
  id: string
  memberNumber: string
  nom: string
  prenom: string
  email: string
  telephone: string
  groupe: string
  groupeId?: string
  statutDossier: 'valid' | 'missing_docs' | 'pending_payment'
  certificatMedical: boolean
  droitImage: boolean
  montantPaye: number
  montantTotal: number
  modePaiement: string
}

export default function AdherentsManager() {
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'valid' | 'missing_docs' | 'pending_payment'>('all')
  const [loading, setLoading] = useState(true)
  const [adherents, setAdherents] = useState<Adherent[]>([])

  // Modales
  const [showAddModal, setShowAddModal] = useState(false)
  const [showImportModal, setShowImportModal] = useState(false)
  const [importing, setImporting] = useState(false)

  // Formulaire Nouvel Adhérent
  const [newNom, setNewNom] = useState('')
  const [newPrenom, setNewPrenom] = useState('')
  const [newEmail, setNewEmail] = useState('')
  const [newTel, setNewTel] = useState('')
  const [newMontant, setNewMontant] = useState('330')
  const [newPaiement, setNewPaiement] = useState('CB MonClub')

  // CSV Import State
  const [csvPreview, setCsvPreview] = useState<any[]>([])

  const fetchAdherents = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/admin/adherents')
      const data = await res.json()
      if (res.ok && data.success && data.adherents) {
        if (data.adherents.length > 0) {
          setAdherents(data.adherents)
        } else {
          // Si BDD vide, afficher les données initiales de démonstration MonClub
          setAdherents(FALLBACK_DEMO_ADHERENTS)
        }
      } else {
        setAdherents(FALLBACK_DEMO_ADHERENTS)
      }
    } catch {
      setAdherents(FALLBACK_DEMO_ADHERENTS)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAdherents()
  }, [])

  const toggleValidation = async (adherent: Adherent) => {
    const nextStatus = adherent.statutDossier === 'valid' ? 'missing_docs' : 'valid'
    const updatedCertif = true
    const updatedPaye = nextStatus === 'valid'

    // Mise à jour optimiste du state local
    setAdherents((prev) =>
      prev.map((a) => {
        if (a.id === adherent.id) {
          return {
            ...a,
            statutDossier: nextStatus,
            certificatMedical: updatedCertif,
            montantPaye: updatedPaye ? a.montantTotal : a.montantPaye
          }
        }
        return a
      })
    )

    try {
      const res = await fetch('/api/admin/adherents', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: adherent.id,
          statutDossier: nextStatus,
          certificatMedical: updatedCertif,
          paye: updatedPaye
        })
      })
      if (res.ok) {
        toast.success(nextStatus === 'valid' ? 'Dossier validé avec succès !' : 'Dossier marqué comme incomplet.')
      }
    } catch {
      toast.error('Erreur lors de la mise à jour sur le serveur')
    }
  }

  const handleAddAdherent = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newNom || !newPrenom || !newEmail) {
      toast.error('Veuillez remplir les champs obligatoires (Nom, Prénom, Email)')
      return
    }

    try {
      const res = await fetch('/api/admin/adherents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nom: newNom,
          prenom: newPrenom,
          email: newEmail,
          telephone: newTel,
          montant: newMontant,
          modePaiement: newPaiement
        })
      })

      const data = await res.json()
      if (res.ok && data.success) {
        toast.success(`Adhérent ${newPrenom} ${newNom} créé avec succès !`)
        setShowAddModal(false)
        setNewNom('')
        setNewPrenom('')
        setNewEmail('')
        setNewTel('')
        fetchAdherents()
      } else {
        toast.error(data.error || 'Erreur lors de la création')
      }
    } catch {
      toast.error('Erreur réseau lors de la création')
    }
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (evt) => {
      const text = evt.target?.result as string
      if (!text) return

      const lines = text.split('\n').map((l) => l.trim()).filter(Boolean)
      if (lines.length <= 1) {
        toast.error('Fichier CSV vide ou invalide')
        return
      }

      const headers = lines[0].split(',').map((h) => h.trim().replace(/^"|"$/g, ''))
      const parsedRows = []

      for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(',').map((c) => c.trim().replace(/^"|"$/g, ''))
        if (cols.length >= 2) {
          parsedRows.push({
            nom: cols[1] || cols[0] || 'Nom',
            prenom: cols[2] || cols[1] || 'Prénom',
            email: cols[3] || 'email@triton-club.fr',
            telephone: cols[4] || '',
            montantTotal: parseFloat(cols[7] || '330') || 330,
            statutDossier: 'valid',
            modePaiement: cols[9] || 'CB MonClub'
          })
        }
      }

      setCsvPreview(parsedRows)
      toast.success(`${parsedRows.length} lignes détectées dans le fichier MonClub`)
    }
    reader.readAsText(file)
  }

  const confirmImport = async () => {
    if (csvPreview.length === 0) return

    try {
      setImporting(true)
      const res = await fetch('/api/admin/adherents/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rows: csvPreview })
      })

      const data = await res.json()
      if (res.ok && data.success) {
        toast.success(`🎉 ${data.count} adhérents MonClub importés en base de données !`)
        setShowImportModal(false)
        setCsvPreview([])
        fetchAdherents()
      } else {
        toast.error(data.error || 'Erreur lors de l\'importation')
      }
    } catch {
      toast.error('Erreur réseau lors de l\'importation')
    } finally {
      setImporting(false)
    }
  }

  const filteredAdherents = adherents.filter((a) => {
    const matchesSearch =
      `${a.prenom} ${a.nom}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.memberNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.groupe.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.email.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesStatus = statusFilter === 'all' || a.statutDossier === statusFilter

    return matchesSearch && matchesStatus
  })

  const exportCSV = () => {
    const headers = ['N Adherent', 'Nom', 'Prenom', 'Email', 'Telephone', 'Groupe', 'Statut', 'Montant Paye', 'Montant Total', 'Mode Paiement']
    const rows = adherents.map((a) => [
      a.memberNumber,
      a.nom,
      a.prenom,
      a.email,
      a.telephone,
      a.groupe,
      a.statutDossier,
      a.montantPaye,
      a.montantTotal,
      a.modePaiement
    ])

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n')
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `adherents_triton_club_${new Date().toISOString().split('T')[0]}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const totalValid = adherents.filter(a => a.statutDossier === 'valid').length
  const totalPending = adherents.filter(a => a.statutDossier === 'pending_payment').length
  const totalMissing = adherents.filter(a => a.statutDossier === 'missing_docs').length

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 text-white p-6 md:p-8 rounded-3xl border border-slate-800 shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-cyan-400" />
            <h2 className="text-2xl font-black tracking-tight">Gestion des Adhérents Triton (~300 Membres)</h2>
          </div>
          <p className="text-xs md:text-sm text-slate-300 font-medium max-w-xl">
            Suivi en temps réel des dossiers d&apos;inscription MonClub.fr, pièces justificatives, règlements et licences FFN.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <button
            onClick={() => setShowImportModal(true)}
            className="px-4 py-2.5 rounded-2xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black text-xs uppercase tracking-wider shadow-sm transition-all flex items-center gap-2 cursor-pointer"
          >
            <Upload className="w-4 h-4" />
            <span>Importer CSV MonClub</span>
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2.5 rounded-2xl bg-white hover:bg-slate-100 text-slate-950 font-black text-xs uppercase tracking-wider shadow-sm transition-all flex items-center gap-2 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Nouveau Membre</span>
          </button>
          <button
            onClick={exportCSV}
            className="px-4 py-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-white font-black text-xs uppercase tracking-wider shadow-sm transition-all flex items-center gap-2 cursor-pointer border border-slate-700"
          >
            <Download className="w-4 h-4" />
            <span>Exporter Registre CSV</span>
          </button>
        </div>
      </div>

      {/* Cards Statistiques Synthèse */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-900 font-black text-xl shrink-0">
            <Users className="w-6 h-6 text-slate-700" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Adhérents</p>
            <p className="text-2xl font-black text-slate-900">{adherents.length}</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600 font-black text-xl shrink-0">
            <CheckCircle2 className="w-6 h-6 text-emerald-600" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Dossiers Validés</p>
            <p className="text-2xl font-black text-emerald-700">{totalValid}</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-sky-50 flex items-center justify-center text-sky-600 font-black text-xl shrink-0">
            <CreditCard className="w-6 h-6 text-sky-600" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Paiement Partiel</p>
            <p className="text-2xl font-black text-sky-700">{totalPending}</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-600 font-black text-xl shrink-0">
            <AlertCircle className="w-6 h-6 text-amber-600" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Pièces Manquantes</p>
            <p className="text-2xl font-black text-amber-700">{totalMissing}</p>
          </div>
        </div>
      </div>

      {/* Filters & Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Rechercher un membre par nom, N° adhérent, groupe, email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-slate-900 outline-none"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto text-xs font-bold shrink-0">
          {[
            { id: 'all', label: `Tous (${adherents.length})` },
            { id: 'valid', label: `Validés (${totalValid})` },
            { id: 'pending_payment', label: `Paiement partiel (${totalPending})` },
            { id: 'missing_docs', label: `Pièces manquantes (${totalMissing})` }
          ].map((f) => (
            <button
              key={f.id}
              onClick={() => setStatusFilter(f.id as any)}
              className={`px-3 py-2 rounded-xl transition-all whitespace-nowrap cursor-pointer ${
                statusFilter === f.id
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {f.label}
            </button>
          ))}

          <button
            onClick={fetchAdherents}
            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors cursor-pointer"
            title="Actualiser"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Tableau des Adhérents */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400 font-bold text-sm">
            Chargement des adhérents MonClub...
          </div>
        ) : filteredAdherents.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <p className="text-3xl">🏊</p>
            <p className="text-slate-800 font-black text-sm">Aucun adhérent trouvé</p>
            <p className="text-slate-400 text-xs">Essayez un autre mot-clé ou modifiez le filtre de sélection.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-black uppercase text-[10px] tracking-wider">
                  <th className="py-3.5 px-4">N° Adhérent</th>
                  <th className="py-3.5 px-4">Nom & Prénom</th>
                  <th className="py-3.5 px-4">Groupe</th>
                  <th className="py-3.5 px-4">Pièces Justificatives</th>
                  <th className="py-3.5 px-4">Cotisation</th>
                  <th className="py-3.5 px-4 text-center">Statut Dossier</th>
                  <th className="py-3.5 px-4 text-right">Action Admin</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredAdherents.map((a) => (
                  <tr key={a.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-cyan-600">{a.memberNumber}</td>
                    <td className="py-3.5 px-4 font-extrabold text-slate-900">
                      {a.prenom} {a.nom}
                      <div className="text-[10px] text-slate-400 font-normal">{a.email}</div>
                      {a.telephone && <div className="text-[10px] text-slate-400 font-normal">{a.telephone}</div>}
                    </td>
                    <td className="py-3.5 px-4 text-slate-700 font-bold">{a.groupe}</td>
                    <td className="py-3.5 px-4">
                      <div className="space-y-0.5 text-[11px]">
                        {a.certificatMedical ? (
                          <span className="text-emerald-700 font-bold flex items-center gap-1">✓ Certificat Médical OK</span>
                        ) : (
                          <span className="text-amber-700 font-bold flex items-center gap-1">! Certificat en attente</span>
                        )}
                        <span className="text-slate-400 block text-[10px]">Droit image : {a.droitImage ? 'Accordé' : 'Refusé'}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-bold text-slate-800">
                      <div>{a.montantPaye} € / {a.montantTotal} €</div>
                      <div className="text-[10px] text-slate-400 font-normal">{a.modePaiement}</div>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      {a.statutDossier === 'valid' ? (
                        <span className="px-3 py-1 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800">
                          Validé
                        </span>
                      ) : a.statutDossier === 'pending_payment' ? (
                        <span className="px-3 py-1 rounded-full text-[10px] font-black bg-sky-100 text-sky-800">
                          Paiement partiel
                        </span>
                      ) : (
                        <span className="px-3 py-1 rounded-full text-[10px] font-black bg-amber-100 text-amber-800">
                          Pièces manquantes
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => toggleValidation(a)}
                        className={`px-3 py-1.5 rounded-xl font-bold text-[11px] transition-all cursor-pointer ${
                          a.statutDossier === 'valid'
                            ? 'bg-slate-100 text-slate-700 hover:bg-red-50 hover:text-red-700'
                            : 'bg-slate-900 text-white hover:bg-slate-800 shadow-xs'
                        }`}
                      >
                        {a.statutDossier === 'valid' ? 'Invalider' : 'Valider 1-Clic'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Nouveau Membre */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 md:p-8 space-y-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-black text-slate-900">Nouveau Membre Triton</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600 text-xl font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddAdherent} className="space-y-4 text-xs font-bold">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-700 mb-1">Prénom *</label>
                  <input
                    type="text"
                    required
                    value={newPrenom}
                    onChange={(e) => setNewPrenom(e.target.value)}
                    placeholder="Lucas"
                    className="w-full p-3 rounded-xl border border-slate-200 font-medium outline-none focus:border-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 mb-1">Nom *</label>
                  <input
                    type="text"
                    required
                    value={newNom}
                    onChange={(e) => setNewNom(e.target.value)}
                    placeholder="Dubois"
                    className="w-full p-3 rounded-xl border border-slate-200 font-medium outline-none focus:border-slate-900"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 mb-1">Email *</label>
                <input
                  type="email"
                  required
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="lucas.dubois@gmail.com"
                  className="w-full p-3 rounded-xl border border-slate-200 font-medium outline-none focus:border-slate-900"
                />
              </div>

              <div>
                <label className="block text-slate-700 mb-1">Téléphone</label>
                <input
                  type="tel"
                  value={newTel}
                  onChange={(e) => setNewTel(e.target.value)}
                  placeholder="06 12 34 56 78"
                  className="w-full p-3 rounded-xl border border-slate-200 font-medium outline-none focus:border-slate-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-700 mb-1">Montant Cotisation (€)</label>
                  <input
                    type="number"
                    value={newMontant}
                    onChange={(e) => setNewMontant(e.target.value)}
                    className="w-full p-3 rounded-xl border border-slate-200 font-medium outline-none focus:border-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 mb-1">Mode de Paiement</label>
                  <input
                    type="text"
                    value={newPaiement}
                    onChange={(e) => setNewPaiement(e.target.value)}
                    placeholder="CB MonClub"
                    className="w-full p-3 rounded-xl border border-slate-200 font-medium outline-none focus:border-slate-900"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 text-slate-700 font-bold hover:bg-slate-200 transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-slate-900 text-white font-black hover:bg-slate-800 transition-colors"
                >
                  Enregistrer l&apos;adhérent
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Import CSV MonClub */}
      {showImportModal && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 md:p-8 space-y-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-black text-slate-900">Importer Export MonClub (CSV)</h3>
              <button
                onClick={() => setShowImportModal(false)}
                className="text-slate-400 hover:text-slate-600 text-xl font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <p className="text-xs text-slate-600 font-medium">
                Sélectionnez le fichier CSV exporté depuis la plateforme MonClub.fr pour ajouter ou synchroniser les adhérents.
              </p>

              <input
                type="file"
                accept=".csv,.txt"
                onChange={handleFileUpload}
                className="w-full p-3 border border-dashed border-slate-300 rounded-2xl text-xs font-bold cursor-pointer file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-slate-900 file:text-white"
              />

              {csvPreview.length > 0 && (
                <div className="space-y-3 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                  <p className="text-xs font-extrabold text-slate-900">
                    Aperçu : {csvPreview.length} adhérents prêts à être créés
                  </p>
                  <div className="max-h-40 overflow-y-auto divide-y divide-slate-200 text-[11px]">
                    {csvPreview.slice(0, 5).map((row, idx) => (
                      <div key={idx} className="py-1.5 flex justify-between">
                        <span className="font-bold text-slate-800">{row.prenom} {row.nom}</span>
                        <span className="text-slate-500">{row.email}</span>
                      </div>
                    ))}
                    {csvPreview.length > 5 && (
                      <p className="text-[10px] text-slate-400 pt-1 italic">...et {csvPreview.length - 5} autres adhérents</p>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowImportModal(false)}
                className="px-4 py-2.5 rounded-xl bg-slate-100 text-slate-700 font-bold hover:bg-slate-200 transition-colors text-xs"
              >
                Annuler
              </button>
              <button
                type="button"
                disabled={csvPreview.length === 0 || importing}
                onClick={confirmImport}
                className="px-5 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black text-xs uppercase tracking-wider transition-colors disabled:opacity-50"
              >
                {importing ? 'Importation...' : `Confirmer l'import (${csvPreview.length})`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const FALLBACK_DEMO_ADHERENTS: Adherent[] = [
  {
    id: 'm-1',
    memberNumber: 'TRITON-2026-001',
    nom: 'Dubois',
    prenom: 'Lucas',
    email: 'lucas.dubois@gmail.com',
    telephone: '06 12 34 56 78',
    groupe: 'Natation Compétition (Benjamins)',
    statutDossier: 'valid',
    certificatMedical: true,
    droitImage: true,
    montantPaye: 330,
    montantTotal: 330,
    modePaiement: 'CB (3X SEPA)'
  },
  {
    id: 'm-2',
    memberNumber: 'TRITON-2026-002',
    nom: 'Rousseau',
    prenom: 'Camille',
    email: 'camille.rousseau@hotmail.fr',
    telephone: '06 99 88 77 11',
    groupe: 'Groupe Avenirs 2',
    statutDossier: 'pending_payment',
    certificatMedical: true,
    droitImage: true,
    montantPaye: 50,
    montantTotal: 280,
    modePaiement: 'Pass\'Sport + Chèque'
  },
  {
    id: 'm-3',
    memberNumber: 'TRITON-2026-003',
    nom: 'Moreau',
    prenom: 'Élodie',
    email: 'elodie.moreau@orange.fr',
    telephone: '07 44 55 66 77',
    groupe: 'AquaGym Tonic',
    statutDossier: 'valid',
    certificatMedical: true,
    droitImage: true,
    montantPaye: 290,
    montantTotal: 290,
    modePaiement: 'ANCV'
  },
  {
    id: 'm-4',
    memberNumber: 'TRITON-2026-004',
    nom: 'Vidal',
    prenom: 'Mathieu',
    email: 'mathieu.vidal@gmail.com',
    telephone: '06 33 22 11 00',
    groupe: 'ENF 1 - Débutants',
    statutDossier: 'missing_docs',
    certificatMedical: false,
    droitImage: true,
    montantPaye: 0,
    montantTotal: 240,
    modePaiement: 'Chèque (en attente)'
  }
]
