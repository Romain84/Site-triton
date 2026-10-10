'use client'

import { useEffect, useState, useMemo, useCallback } from 'react'
import { Receipt, Download, Loader2, Calendar, FileText, ChevronRight, Euro, CheckCircle2, Clock } from 'lucide-react'
import { PastInvoice } from './types'

interface HistoriqueFacturesProps {
  onDownloadPDF: (mois: number, annee: number) => void
  onSelectMonth?: (mois: number, annee: number) => void
  downloadingPdf?: boolean
  refreshKey?: number
}

const MOIS_NOMS = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
]

export default function HistoriqueFactures({
  onDownloadPDF,
  onSelectMonth,
  downloadingPdf,
  refreshKey,
}: HistoriqueFacturesProps) {
  const [invoices, setInvoices] = useState<PastInvoice[]>([])
  const [loading, setLoading] = useState(true)
  const [filterAnnee, setFilterAnnee] = useState<string>('all')
  const [filterStatut, setFilterStatut] = useState<string>('all')
  const [downloadingId, setDownloadingId] = useState<string | null>(null)

  const fetchAllHistory = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/coach/facturation/historique')
      if (res.ok) {
        const data = await res.json()
        setInvoices(data.factures || [])
      }
    } catch {
      // Ignorer l'erreur réseau silencieuse
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchAllHistory()
  }, [fetchAllHistory, refreshKey])

  const availableYears = useMemo(() => {
    const years = Array.from(new Set(invoices.map((inv) => inv.annee))).filter(Boolean)
    const currentYear = new Date().getFullYear()
    if (!years.includes(currentYear)) years.push(currentYear)
    return years.sort((a, b) => b - a)
  }, [invoices])

  const filteredInvoices = useMemo(() => {
    return invoices.filter((inv) => {
      if (filterAnnee !== 'all' && inv.annee !== Number(filterAnnee)) return false
      if (filterStatut !== 'all' && inv.statut !== filterStatut) return false
      return true
    })
  }, [invoices, filterAnnee, filterStatut])

  const stats = useMemo(() => {
    const totalMontant = invoices.reduce((sum, inv) => sum + (inv.montantTotal || 0), 0)
    const totalPaye = invoices
      .filter((inv) => inv.statut === 'payee')
      .reduce((sum, inv) => sum + (inv.montantTotal || 0), 0)
    const totalEnAttente = invoices
      .filter((inv) => inv.statut === 'envoyee')
      .reduce((sum, inv) => sum + (inv.montantTotal || 0), 0)
    return {
      totalFactures: invoices.length,
      totalMontant,
      totalPaye,
      totalEnAttente,
    }
  }, [invoices])

  const handleDownload = async (inv: PastInvoice) => {
    setDownloadingId(inv.id)
    try {
      await onDownloadPDF(inv.mois, inv.annee)
    } finally {
      setDownloadingId(null)
    }
  }

  const getStatutBadge = (statut: string) => {
    switch (statut) {
      case 'brouillon':
        return 'bg-slate-100 text-slate-700'
      case 'generee':
        return 'bg-sky-50 text-sky-700 border border-sky-200'
      case 'envoyee':
        return 'bg-amber-50 text-amber-800 border border-amber-200'
      case 'payee':
        return 'bg-emerald-50 text-emerald-800 border border-emerald-200'
      default:
        return 'bg-slate-100 text-slate-700'
    }
  }

  const getStatutLabel = (statut: string) => {
    switch (statut) {
      case 'brouillon':
        return 'Brouillon'
      case 'generee':
        return 'Générée'
      case 'envoyee':
        return 'Envoyée'
      case 'payee':
        return 'Payée'
      default:
        return statut
    }
  }

  if (loading) {
    return (
      <div className="bg-white border border-slate-200/80 rounded-3xl p-12 text-center space-y-2">
        <Loader2 className="w-6 h-6 animate-spin mx-auto text-cyan-600" />
        <p className="text-xs text-slate-500 font-bold">Chargement de vos factures...</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* 3 CHIFFRES CLÉS COMPACTS */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-3.5 rounded-2xl bg-white border border-slate-200/80 shadow-2xs space-y-0.5">
          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>Total perçu (payé)</span>
          </span>
          <p className="text-xl font-black text-emerald-800">
            {stats.totalPaye.toFixed(2)} €
          </p>
        </div>

        <div className="p-3.5 rounded-2xl bg-white border border-slate-200/80 shadow-2xs space-y-0.5">
          <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-amber-600" />
            <span>En attente de paiement</span>
          </span>
          <p className="text-xl font-black text-amber-800">
            {stats.totalEnAttente.toFixed(2)} €
          </p>
        </div>

        <div className="p-3.5 rounded-2xl bg-white border border-slate-200/80 shadow-2xs space-y-0.5">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
            <Receipt className="w-3.5 h-3.5 text-slate-400" />
            <span>Total factures</span>
          </span>
          <p className="text-xl font-black text-slate-900">
            {stats.totalFactures} facture{stats.totalFactures > 1 ? 's' : ''}
          </p>
        </div>
      </div>

      {/* FILTRES COMPACTS */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-3.5 shadow-2xs flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-bold text-slate-600">Filtrer par :</span>

          {/* Année */}
          <select
            value={filterAnnee}
            onChange={(e) => setFilterAnnee(e.target.value)}
            className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg font-semibold text-slate-800 focus:ring-1 focus:ring-cyan-500 cursor-pointer"
          >
            <option value="all">Toutes les années</option>
            {availableYears.map((y) => (
              <option key={y} value={y}>
                Année {y}
              </option>
            ))}
          </select>

          {/* Statut */}
          <select
            value={filterStatut}
            onChange={(e) => setFilterStatut(e.target.value)}
            className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg font-semibold text-slate-800 focus:ring-1 focus:ring-cyan-500 cursor-pointer"
          >
            <option value="all">Tous les statuts</option>
            <option value="payee">Payée</option>
            <option value="envoyee">Envoyée</option>
            <option value="generee">Générée</option>
            <option value="brouillon">Brouillon</option>
          </select>

          {(filterAnnee !== 'all' || filterStatut !== 'all') && (
            <button
              type="button"
              onClick={() => {
                setFilterAnnee('all')
                setFilterStatut('all')
              }}
              className="text-cyan-600 hover:underline font-bold ml-1 cursor-pointer"
            >
              Réinitialiser
            </button>
          )}
        </div>

        <span className="text-slate-400 font-semibold text-[11px]">
          {filteredInvoices.length} document{filteredInvoices.length > 1 ? 's' : ''}
        </span>
      </div>

      {/* LISTE DE TOUTES LES FACTURES / PDF */}
      {filteredInvoices.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-3xl p-10 text-center space-y-2">
          <p className="text-sm font-bold text-slate-700">Aucune facture trouvée</p>
          <p className="text-xs text-slate-400">Aucun document ne correspond aux filtres sélectionnés.</p>
        </div>
      ) : (
        <div className="grid gap-2.5">
          {filteredInvoices.map((inv) => (
            <div
              key={inv.id}
              className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-2xs hover:border-slate-300 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
            >
              {/* INFOS FACTURE */}
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 font-black text-xs flex items-center justify-center shrink-0">
                  📄
                </div>
                <div className="min-w-0 space-y-0.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-black text-slate-900 truncate">
                      {MOIS_NOMS[inv.mois - 1]} {inv.annee}
                    </p>
                    <span className="text-xs font-mono font-semibold text-slate-400">
                      N° {inv.numero}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] font-black px-2 py-0.5 rounded-md ${getStatutBadge(inv.statut)}`}>
                      {getStatutLabel(inv.statut)}
                    </span>
                    <span className="text-xs font-black text-slate-900">
                      {inv.montantTotal.toFixed(2)} €
                    </span>
                  </div>
                </div>
              </div>

              {/* ACTIONS DIRECTES */}
              <div className="flex items-center gap-2 self-end sm:self-auto shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                {onSelectMonth && (
                  <button
                    type="button"
                    onClick={() => onSelectMonth(inv.mois, inv.annee)}
                    className="px-3 py-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
                  >
                    🔎 Détail
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => handleDownload(inv)}
                  disabled={downloadingPdf || downloadingId === inv.id}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-700 text-white text-xs font-bold shadow-2xs transition-all disabled:opacity-50 cursor-pointer"
                  title="Télécharger la facture PDF officielle"
                >
                  {downloadingId === inv.id ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Download className="w-3.5 h-3.5" />
                  )}
                  <span>PDF</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
