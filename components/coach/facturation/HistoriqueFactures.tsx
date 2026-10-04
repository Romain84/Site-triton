'use client'

import { Receipt, Download, Loader2 } from 'lucide-react'
import { PastInvoice } from './types'

interface HistoriqueFacturesProps {
  invoices: PastInvoice[]
  selectedAnnee: number
  onDownloadPDF: (mois: number, annee: number) => void
  downloadingPdf?: boolean
}

const MOIS_NOMS = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
]

export default function HistoriqueFactures({
  invoices,
  selectedAnnee,
  onDownloadPDF,
  downloadingPdf,
}: HistoriqueFacturesProps) {
  if (!invoices || invoices.length === 0) {
    return null
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

  return (
    <div className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-7 shadow-xs space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-black text-slate-950 flex items-center gap-2">
          <Receipt className="w-4 h-4 text-slate-400" />
          <span>Historique des factures ({selectedAnnee})</span>
        </h2>
        <span className="text-xs text-slate-400 font-bold">
          {invoices.length} facture{invoices.length > 1 ? 's' : ''}
        </span>
      </div>

      <div className="grid sm:grid-cols-3 gap-3">
        {invoices.map((inv) => (
          <div
            key={inv.id}
            className="p-4 rounded-2xl bg-slate-50 border border-slate-200/60 flex items-center justify-between gap-3"
          >
            <div className="space-y-0.5 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-xs font-black text-slate-900 truncate">
                  {MOIS_NOMS[inv.mois - 1]} {inv.annee}
                </p>
                <span className={`text-[9px] font-black px-1.5 py-0.5 rounded ${getStatutBadge(inv.statut)}`}>
                  {getStatutLabel(inv.statut)}
                </span>
              </div>
              <p className="text-[10px] text-slate-400 font-mono">N° {inv.numero}</p>
              <p className="text-xs font-extrabold text-emerald-700 pt-0.5">
                {inv.montantTotal.toFixed(2)} €
              </p>
            </div>

            <button
              type="button"
              onClick={() => onDownloadPDF(inv.mois, inv.annee)}
              disabled={downloadingPdf}
              className="p-2.5 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 transition-colors shadow-2xs shrink-0 cursor-pointer disabled:opacity-50"
              title="Télécharger PDF"
            >
              <Download className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
