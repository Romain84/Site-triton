'use client'

export const dynamic = 'force-dynamic'

import { Suspense, useCallback, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import CoachNav from '@/components/coach/CoachNav'
import { getErrorMessage } from '@/lib/utils'
import { useConfirmDialog } from '@/components/ConfirmDialog'
import toast from 'react-hot-toast'
import {
  Receipt,
  Download,
  Send,
  Calendar,
  Clock,
  Euro,
  ChevronLeft,
  ChevronRight,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  FileText,
  Loader2,
  Sparkles
} from 'lucide-react'

interface LigneFacture {
  id?: string
  type: string
  description: string
  heures: number
  montant: number
  date?: string
  groupe?: string | null
  lieu?: string | null
  demiJournees?: number | null
}

interface FacturationData {
  mois: number
  annee: number
  tauxHoraire: number
  forfaitDemiJournee: number
  forfaitRegionalActif: boolean
  montantForfaitRegional: number
  lignesPlanningFixe: LigneFacture[]
  lignesPlanningTournant: LigneFacture[]
  lignesRemplacements: LigneFacture[]
  lignesAbsences: LigneFacture[]
  lignesManuelles: LigneFacture[]
  totalHeures: number
  totalMontant: number
  factureId?: string
  statut?: string
  isBlocked?: boolean
}

interface PastInvoice {
  id: string
  numero: string
  mois: number
  annee: number
  montantTotal: number
  statut: string
}

export default function FacturationPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen py-12 bg-slate-50 text-center">
          <Loader2 className="w-6 h-6 animate-spin mx-auto text-cyan-600" />
          <p className="text-xs font-bold text-slate-500 mt-2">Chargement de la facturation...</p>
        </div>
      }
    >
      <FacturationContent />
    </Suspense>
  )
}

function FacturationContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { confirm } = useConfirmDialog()

  const currentDate = new Date()
  const [selectedMois, setSelectedMois] = useState(() => {
    const m = searchParams.get('mois')
    return m ? parseInt(m, 10) : currentDate.getMonth() + 1
  })
  const [selectedAnnee, setSelectedAnnee] = useState(() => {
    const a = searchParams.get('annee')
    return a ? parseInt(a, 10) : currentDate.getFullYear()
  })

  const [loading, setLoading] = useState(true)
  const [generatingPdf, setGeneratingPdf] = useState(false)
  const [sendingEmail, setSendingEmail] = useState(false)
  const [data, setData] = useState<FacturationData | null>(null)
  const [pastInvoices, setPastInvoices] = useState<PastInvoice[]>([])

  // Modal ajout ligne manuelle
  const [showAddModal, setShowAddModal] = useState(false)
  const [manualDescription, setManualDescription] = useState('')
  const [manualHeures, setManualHeures] = useState('1')
  const [manualDate, setManualDate] = useState('')
  const [addingLine, setAddingLine] = useState(false)

  const moisNoms = [
    'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
    'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
  ]

  const fetchFacturation = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/coach/facturation/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mois: selectedMois, annee: selectedAnnee }),
      })

      if (res.status === 401) {
        router.push('/coach/login')
        return
      }

      const resData = await res.json()
      if (res.ok) {
        setData(resData)
      } else {
        toast.error(resData.error || 'Erreur lors du calcul de la facturation')
      }

      // Load past invoices
      const resHist = await fetch(`/api/coach/facturation/historique?annee=${selectedAnnee}`)
      if (resHist.ok) {
        const histData = await resHist.json()
        setPastInvoices(histData.factures || [])
      }
    } catch {
      toast.error('Erreur de connexion au serveur')
    } finally {
      setLoading(false)
    }
  }, [selectedMois, selectedAnnee, router])

  useEffect(() => {
    fetchFacturation()
  }, [fetchFacturation])

  const handlePrevMonth = () => {
    if (selectedMois === 1) {
      setSelectedMois(12)
      setSelectedAnnee((prev) => prev - 1)
    } else {
      setSelectedMois((prev) => prev - 1)
    }
  }

  const handleNextMonth = () => {
    if (selectedMois === 12) {
      setSelectedMois(1)
      setSelectedAnnee((prev) => prev + 1)
    } else {
      setSelectedMois((prev) => prev + 1)
    }
  }

  const handleDownloadPDF = async (mois = selectedMois, annee = selectedAnnee) => {
    setGeneratingPdf(true)
    try {
      const response = await fetch('/api/coach/facturation/generer-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mois, annee }),
      })

      if (!response.ok) {
        const result = await response.json()
        throw new Error(result.error || 'Erreur lors de la génération du PDF')
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `facture-coach-${mois}-${annee}.pdf`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)

      toast.success('Facture PDF téléchargée !')
      fetchFacturation()
    } catch (err) {
      toast.error(getErrorMessage(err))
    } finally {
      setGeneratingPdf(false)
    }
  }

  const handleSendEmail = async () => {
    const confirmed = await confirm({
      title: 'Transmettre la facture au club ?',
      message: `Voulez-vous envoyer votre facture de ${moisNoms[selectedMois - 1]} ${selectedAnnee} (${data?.totalMontant.toFixed(2)} €) par e-mail au secrétariat du club ?`,
      confirmText: 'Oui, transmettre',
    })

    if (!confirmed) return

    setSendingEmail(true)
    try {
      const res = await fetch('/api/coach/facturation/envoyer-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mois: selectedMois, annee: selectedAnnee }),
      })

      const resData = await res.json()
      if (res.ok) {
        toast.success(resData.message || 'Facture transmise avec succès au club !')
        fetchFacturation()
      } else {
        toast.error(resData.error || 'Erreur lors de l\'envoi')
      }
    } catch {
      toast.error('Erreur lors de l\'envoi')
    } finally {
      setSendingEmail(false)
    }
  }

  const handleAddManualLine = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!manualDescription || !manualHeures) return

    setAddingLine(true)
    try {
      const res = await fetch('/api/coach/facturation/ligne', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mois: selectedMois,
          annee: selectedAnnee,
          description: manualDescription,
          heures: parseFloat(manualHeures),
          date: manualDate || undefined,
        }),
      })

      const resData = await res.json()
      if (res.ok) {
        toast.success('Ligne ajoutée avec succès !')
        setShowAddModal(false)
        setManualDescription('')
        setManualHeures('1')
        setManualDate('')
        fetchFacturation()
      } else {
        toast.error(resData.error || 'Erreur lors de l\'ajout')
      }
    } catch {
      toast.error('Erreur lors de l\'ajout')
    } finally {
      setAddingLine(false)
    }
  }

  const handleDeleteLine = async (ligneId: string) => {
    const confirmed = await confirm({
      title: 'Supprimer cette ligne ?',
      message: 'Voulez-vous supprimer cette prestation manuelle ?',
      confirmText: 'Supprimer',
      variant: 'danger',
    })

    if (!confirmed) return

    try {
      const res = await fetch(`/api/coach/facturation/ligne/${ligneId}`, {
        method: 'DELETE',
      })
      if (res.ok) {
        toast.success('Ligne supprimée')
        fetchFacturation()
      } else {
        toast.error('Erreur lors de la suppression')
      }
    } catch {
      toast.error('Erreur lors de la suppression')
    }
  }

  const allLignes = [
    ...(data?.lignesPlanningFixe || []),
    ...(data?.lignesPlanningTournant || []),
    ...(data?.lignesRemplacements || []),
    ...(data?.lignesManuelles || []),
  ]

  const getStatutBadge = (statut?: string) => {
    switch (statut) {
      case 'brouillon': return 'bg-slate-100 text-slate-700'
      case 'generee': return 'bg-blue-50 text-blue-700 border border-blue-200'
      case 'envoyee': return 'bg-amber-50 text-amber-700 border border-amber-200'
      case 'payee': return 'bg-emerald-50 text-emerald-700 border border-emerald-200'
      default: return 'bg-slate-100 text-slate-700'
    }
  }

  return (
    <div className="min-h-screen pt-2 pb-24 sm:pb-12 bg-slate-50/50 text-slate-900">
      <div className="container mx-auto px-4 max-w-5xl space-y-6">
        <CoachNav />

        {/* MONTH PICKER BAR */}
        <div className="bg-white border border-slate-200/80 rounded-3xl p-4 sm:p-5 shadow-xs flex items-center justify-between gap-4">
          <button
            onClick={handlePrevMonth}
            className="p-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
            aria-label="Mois précédent"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          <div className="text-center">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-cyan-50 text-cyan-800 text-[10px] font-extrabold uppercase tracking-wider mb-0.5">
              <Calendar className="w-3 h-3 text-cyan-600" />
              <span>Facturation Mensuelle</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-950">
              {moisNoms[selectedMois - 1]} {selectedAnnee}
            </h1>
          </div>

          <button
            onClick={handleNextMonth}
            className="p-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
            aria-label="Mois suivant"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {loading ? (
          <div className="bg-white border border-slate-200/80 rounded-3xl p-12 text-center space-y-2">
            <Loader2 className="w-6 h-6 animate-spin mx-auto text-cyan-600" />
            <p className="text-xs text-slate-500 font-bold">Calcul des heures en cours...</p>
          </div>
        ) : (
          <>
            {/* STATS & ACTIONS SUMMARY CARD */}
            <div className="bg-white border border-slate-200/80 rounded-3xl p-5 sm:p-7 shadow-xs space-y-6">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-150 space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Heures validées</span>
                  <p className="text-xl sm:text-2xl font-black text-slate-950">
                    {data?.totalHeures.toFixed(2)} h
                  </p>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-150 space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Taux horaire</span>
                  <p className="text-xl sm:text-2xl font-black text-slate-950">
                    {data?.tauxHoraire.toFixed(2)} €
                  </p>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-150 space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Total à percevoir</span>
                  <p className="text-xl sm:text-2xl font-black text-emerald-700">
                    {data?.totalMontant.toFixed(2)} €
                  </p>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-150 space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Statut</span>
                  <p className="pt-0.5">
                    <span className={`inline-block px-2.5 py-0.5 rounded-md text-[11px] font-black uppercase tracking-wider ${getStatutBadge(data?.statut)}`}>
                      {data?.statut || 'Brouillon'}
                    </span>
                  </p>
                </div>
              </div>

              {/* ACTION BUTTONS */}
              <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-100">
                <button
                  onClick={() => handleDownloadPDF()}
                  disabled={generatingPdf}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-950 hover:bg-slate-800 text-white text-xs font-extrabold shadow-xs transition-all disabled:opacity-50"
                >
                  {generatingPdf ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4 text-cyan-400" />}
                  <span>Télécharger la facture PDF</span>
                </button>

                <button
                  onClick={handleSendEmail}
                  disabled={sendingEmail || !data?.totalMontant}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-cyan-50 hover:bg-cyan-100 text-cyan-900 text-xs font-bold transition-all disabled:opacity-50"
                >
                  {sendingEmail ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4 text-cyan-600" />}
                  <span>Transmettre au club</span>
                </button>

                <button
                  onClick={() => setShowAddModal(true)}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all ml-auto"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Ajouter une prestation</span>
                </button>
              </div>
            </div>

            {/* BREAKDOWN LIST */}
            <div className="bg-white border border-slate-200/80 rounded-3xl p-5 sm:p-7 shadow-xs space-y-4">
              <h2 className="text-base font-black text-slate-950 flex items-center gap-2">
                <FileText className="w-4 h-4 text-slate-400" />
                <span>Détail des séances et prestations ({allLignes.length})</span>
              </h2>

              {allLignes.length === 0 ? (
                <div className="text-center py-8 text-slate-400 space-y-1">
                  <p className="text-xs font-bold">Aucune séance effectuée pour ce mois</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {allLignes.map((l, idx) => (
                    <div key={l.id || idx} className="py-3 first:pt-0 last:pb-0 flex items-center justify-between gap-3">
                      <div className="space-y-0.5">
                        <p className="text-xs font-extrabold text-slate-900">
                          {l.description}
                        </p>
                        <p className="text-[11px] text-slate-500">
                          {l.date ? `Date : ${l.date} · ` : ''}
                          {l.heures > 0 ? `${l.heures} heure${l.heures > 1 ? 's' : ''}` : ''}
                        </p>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="text-xs font-black text-slate-950">
                          {l.montant.toFixed(2)} €
                        </span>
                        {l.id && l.type === 'manuel' && (
                          <button
                            onClick={() => handleDeleteLine(l.id!)}
                            className="p-1 text-slate-400 hover:text-red-600 transition-colors"
                            title="Supprimer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* PAST INVOICES ARCHIVE */}
            {pastInvoices.length > 0 && (
              <div className="bg-white border border-slate-200/80 rounded-3xl p-5 sm:p-7 shadow-xs space-y-4">
                <h2 className="text-base font-black text-slate-950 flex items-center gap-2">
                  <Receipt className="w-4 h-4 text-slate-400" />
                  <span>Historique des factures ({selectedAnnee})</span>
                </h2>

                <div className="grid sm:grid-cols-3 gap-3">
                  {pastInvoices.map((inv) => (
                    <div
                      key={inv.id}
                      className="p-4 rounded-2xl bg-slate-50 border border-slate-200/60 flex items-center justify-between"
                    >
                      <div>
                        <p className="text-xs font-black text-slate-900">
                          {moisNoms[inv.mois - 1]} {inv.annee}
                        </p>
                        <p className="text-[10px] text-slate-400 font-mono">N° {inv.numero}</p>
                        <p className="text-xs font-extrabold text-emerald-700 mt-1">
                          {inv.montantTotal.toFixed(2)} €
                        </p>
                      </div>

                      <button
                        onClick={() => handleDownloadPDF(inv.mois, inv.annee)}
                        className="p-2 rounded-xl bg-white hover:bg-slate-200 border border-slate-200 text-slate-700 transition-colors shadow-2xs"
                        title="Télécharger PDF"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {/* MODAL AJOUT LIGNE MANUELLE */}
        {showAddModal && (
          <div className="fixed inset-0 z-50 bg-slate-950/40 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-xl space-y-4">
              <h3 className="text-base font-black text-slate-950">
                Ajouter une prestation manuelle
              </h3>

              <form onSubmit={handleAddManualLine} className="space-y-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Description *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Stage vacances, réunion technique..."
                    value={manualDescription}
                    onChange={(e) => setManualDescription(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:bg-white focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700">Nombre d&apos;heures *</label>
                    <input
                      type="number"
                      step="0.25"
                      min="0.25"
                      required
                      value={manualHeures}
                      onChange={(e) => setManualHeures(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:bg-white focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700">Date (optionnelle)</label>
                    <input
                      type="date"
                      value={manualDate}
                      onChange={(e) => setManualDate(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:bg-white focus:outline-none"
                    />
                  </div>
                </div>

                <div className="pt-3 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    disabled={addingLine}
                    className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-slate-950 hover:bg-slate-800 text-white text-xs font-extrabold disabled:opacity-50"
                  >
                    {addingLine ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                    <span>Ajouter</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
