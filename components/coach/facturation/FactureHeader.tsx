'use client'

import {
  ChevronLeft,
  ChevronRight,
  Clock,
  Euro,
  FileText,
  Download,
  Plus,
  Trophy,
  RotateCcw,
  Lock,
  CheckCircle2,
  AlertCircle,
  Loader2,
} from 'lucide-react'
import { formatHeuresEnHM } from '@/lib/facture-format'

interface FactureHeaderProps {
  selectedMois: number
  selectedAnnee: number
  onPrevMonth: () => void
  onNextMonth: () => void
  totalHeures: number
  tauxHoraire: number
  totalMontant: number
  statut?: string
  isBlocked?: boolean
  generatingInvoice: boolean
  sendingEmail?: boolean
  downloadingPDF: boolean
  onGenerateInvoice: () => void
  onRegenerateInvoice: () => void
  onSendInvoice?: () => void
  onDownloadPDF: () => void
  onOpenModalPrestation: () => void
  onOpenModalCompetition: () => void
}

const MOIS_NOMS = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
]

export default function FactureHeader({
  selectedMois,
  selectedAnnee,
  onPrevMonth,
  onNextMonth,
  totalHeures,
  tauxHoraire,
  totalMontant,
  statut,
  isBlocked,
  generatingInvoice,
  downloadingPDF,
  onGenerateInvoice,
  onRegenerateInvoice,
  onDownloadPDF,
  onOpenModalPrestation,
  onOpenModalCompetition,
}: FactureHeaderProps) {
  const isBrouillon = !statut || statut === 'brouillon'
  const isGeneree = statut === 'generee'
  const isEnvoyee = statut === 'envoyee'
  const isPayee = statut === 'payee'

  const getStatutBadge = () => {
    switch (statut) {
      case 'brouillon': return 'bg-slate-100 text-slate-700 border border-slate-200'
      case 'generee': return 'bg-sky-50 text-sky-700 border border-sky-200'
      case 'envoyee': return 'bg-amber-50 text-amber-800 border border-amber-200'
      case 'payee': return 'bg-emerald-50 text-emerald-800 border border-emerald-200'
      default: return 'bg-slate-100 text-slate-700'
    }
  }

  const getStatutLabel = () => {
    switch (statut) {
      case 'brouillon': return 'Brouillon'
      case 'generee': return 'Générée'
      case 'envoyee': return 'Envoyée au club'
      case 'payee': return 'Payée'
      default: return 'Brouillon'
    }
  }

  return (
    <div className="space-y-3">
      {/* SÉLECTEUR DE MOIS (COMPACT & ÉPURÉ) */}
      <div className="bg-white border border-slate-200/80 rounded-2xl px-4 py-3 shadow-2xs flex items-center justify-between gap-4">
        <button
          type="button"
          onClick={onPrevMonth}
          className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
          aria-label="Mois précédent"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        <div className="text-center">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
            Période de facturation
          </p>
          <h1 className="text-base sm:text-lg font-black text-slate-950">
            {MOIS_NOMS[selectedMois - 1]} {selectedAnnee}
          </h1>
        </div>

        <button
          type="button"
          onClick={onNextMonth}
          className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
          aria-label="Mois suivant"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* PANNEAU PRINCIPAL : MÉTRIQUES COMPACTES & ACTIONS */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-5 shadow-2xs space-y-4">
        {/* 3 CARTES MÉTRIQUES COMPACTES (TAUX HORAIRE RETIRÉ) */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          {/* CARTE 1 : Heures validées */}
          <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50/80 border border-slate-200/60 hover:bg-slate-50 transition-colors">
            <div className="w-9 h-9 rounded-lg bg-sky-100/80 text-sky-700 flex items-center justify-center shrink-0">
              <Clock className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Heures validées
              </span>
              <p className="text-base sm:text-lg font-black text-slate-950 leading-tight">
                {formatHeuresEnHM(totalHeures)}
              </p>
            </div>
          </div>

          {/* CARTE 2 : Total à percevoir */}
          <div className="flex items-center gap-3 p-3 rounded-xl bg-emerald-50/50 border border-emerald-200/60 hover:bg-emerald-50/70 transition-colors">
            <div className="w-9 h-9 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
              <Euro className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <span className="block text-[10px] font-bold uppercase tracking-wider text-emerald-700">
                Total à percevoir
              </span>
              <p className="text-base sm:text-lg font-black text-emerald-800 leading-tight">
                {totalMontant.toFixed(2)} €
              </p>
            </div>
          </div>

          {/* CARTE 3 : Statut */}
          <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50/80 border border-slate-200/60 hover:bg-slate-50 transition-colors">
            <div className="w-9 h-9 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center shrink-0">
              {isPayee ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              ) : isEnvoyee ? (
                <Lock className="w-4 h-4 text-emerald-600" />
              ) : (
                <FileText className="w-4 h-4 text-slate-600" />
              )}
            </div>
            <div className="min-w-0">
              <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Statut
              </span>
              <div className="mt-0.5">
                <span className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase tracking-wider ${getStatutBadge()}`}>
                  {getStatutLabel()}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* BANNIÈRE CONTEXTUELLE D'ÉTAT (AFFINÉE) */}
        {isBrouillon && (
          <div className="p-3 bg-amber-50/80 border border-amber-200/70 rounded-xl flex items-start gap-2.5 text-amber-900 text-xs font-semibold leading-relaxed">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p>Facture en <strong>brouillon</strong>. Vérifiez vos séances et prestations ci-dessous.</p>
              <p className="text-[11px] text-amber-700 font-normal mt-0.5">
                Cliquez sur <strong>&quot;Générer la facture&quot;</strong> pour créer le document officiel et le transmettre directement au club.
              </p>
            </div>
          </div>
        )}

        {isGeneree && (
          <div className="p-3 bg-sky-50/80 border border-sky-200/70 rounded-xl flex items-start gap-2.5 text-sky-900 text-xs font-semibold leading-relaxed">
            <FileText className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />
            <div>
              <p>Facture générée. Cliquez sur <strong>&quot;Générer la facture&quot;</strong> pour l&apos;officialiser et la transmettre au club.</p>
            </div>
          </div>
        )}

        {isEnvoyee && (
          <div className="p-3 bg-emerald-50/80 border border-emerald-200/70 rounded-xl flex items-start gap-2.5 text-emerald-900 text-xs font-semibold leading-relaxed">
            <Lock className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
            <div>
              <p>🔒 <strong>Facture transmise au club.</strong> Tout est désormais verrouillé et archivé.</p>
            </div>
          </div>
        )}

        {isPayee && (
          <div className="p-3 bg-purple-50/80 border border-purple-200/70 rounded-xl flex items-start gap-2.5 text-purple-900 text-xs font-semibold leading-relaxed">
            <CheckCircle2 className="w-4 h-4 text-purple-700 shrink-0 mt-0.5" />
            <div>
              <p>✅ <strong>Facture payée.</strong> Le règlement a été effectué par le club pour ce mois.</p>
            </div>
          </div>
        )}

        {/* BARRE DE BOUTONS D'ACTION (COMPACTE & ÉLÉGANTE) */}
        <div className="flex flex-wrap items-center gap-2.5 pt-2 border-t border-slate-100">
          {/* ACTION : GÉNÉRER ET TRANSMETTRE */}
          {(isBrouillon || isGeneree) && (
            <button
              type="button"
              onClick={onGenerateInvoice}
              disabled={generatingInvoice || !totalMontant}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-700 text-white text-xs font-extrabold shadow-2xs transition-all disabled:opacity-50 cursor-pointer"
              title="Générer la facture officielle et l'envoyer directement au club et sur votre boîte e-mail"
            >
              {generatingInvoice ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileText className="w-3.5 h-3.5" />}
              <span>Générer la facture</span>
            </button>
          )}

          {/* ACTION : RÉGÉNÉRER */}
          {isBrouillon && !isBlocked && (
            <button
              type="button"
              onClick={onRegenerateInvoice}
              disabled={generatingInvoice}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all disabled:opacity-50 cursor-pointer"
              title="Recalculer les heures et synchroniser avec les dernières modifications"
            >
              <RotateCcw className={`w-3.5 h-3.5 ${generatingInvoice ? 'animate-spin' : ''}`} />
              <span>Régénérer</span>
            </button>
          )}

          {/* ACTION : TÉLÉCHARGER PDF */}
          {(isGeneree || isEnvoyee || isPayee) && (
            <button
              type="button"
              onClick={onDownloadPDF}
              disabled={downloadingPDF}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-2xs transition-all disabled:opacity-50 cursor-pointer"
            >
              {downloadingPDF ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
              <span>Télécharger PDF</span>
            </button>
          )}

          {/* AJOUTS MANUELS (SI NON VERROUILLÉ) */}
          {!isBlocked && (
            <div className="flex items-center gap-2 ml-auto">
              <button
                type="button"
                onClick={onOpenModalPrestation}
                className="inline-flex items-center gap-1 px-3 py-2 rounded-lg bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-semibold shadow-2xs transition-all cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5 text-cyan-600" />
                <span>Prestation libre</span>
              </button>

              <button
                type="button"
                onClick={onOpenModalCompetition}
                className="inline-flex items-center gap-1 px-3 py-2 rounded-lg bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-semibold shadow-2xs transition-all cursor-pointer"
              >
                <Trophy className="w-3.5 h-3.5 text-amber-500" />
                <span>Compétition</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
