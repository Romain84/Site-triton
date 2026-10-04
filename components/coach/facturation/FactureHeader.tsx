'use client'

import {
  ChevronLeft,
  ChevronRight,
  Clock,
  Euro,
  FileText,
  Download,
  Send,
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
  sendingEmail: boolean
  downloadingPDF: boolean
  onGenerateInvoice: () => void
  onRegenerateInvoice: () => void
  onSendInvoice: () => void
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
  sendingEmail,
  downloadingPDF,
  onGenerateInvoice,
  onRegenerateInvoice,
  onSendInvoice,
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
    <div className="space-y-4">
      {/* SÉLECTEUR DE MOIS */}
      <div className="bg-white border border-slate-200/80 rounded-3xl p-4 sm:p-5 shadow-xs flex items-center justify-between gap-4">
        <button
          type="button"
          onClick={onPrevMonth}
          className="p-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
          aria-label="Mois précédent"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        <div className="text-center">
          <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">
            Période de facturation
          </p>
          <h1 className="text-xl sm:text-2xl font-black text-slate-950">
            {MOIS_NOMS[selectedMois - 1]} {selectedAnnee}
          </h1>
        </div>

        <button
          type="button"
          onClick={onNextMonth}
          className="p-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
          aria-label="Mois suivant"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* 4 CARTES MÉTRIQUES */}
      <div className="bg-white border border-slate-200/80 rounded-3xl p-5 sm:p-7 shadow-xs space-y-5">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-150 space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Heures validées
            </span>
            <p className="text-xl sm:text-2xl font-black text-slate-950">
              {formatHeuresEnHM(totalHeures)}
            </p>
            <p className="text-[10px] font-semibold text-slate-400">
              ({totalHeures ? totalHeures.toFixed(2) : '0.00'} h)
            </p>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-150 space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Taux horaire
            </span>
            <p className="text-xl sm:text-2xl font-black text-slate-950">
              {tauxHoraire.toFixed(2)} €
            </p>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-150 space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Total à percevoir
            </span>
            <p className="text-xl sm:text-2xl font-black text-emerald-700">
              {totalMontant.toFixed(2)} €
            </p>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-150 space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Statut
            </span>
            <p className="pt-0.5">
              <span className={`inline-block px-2.5 py-0.5 rounded-md text-[11px] font-black uppercase tracking-wider ${getStatutBadge()}`}>
                {getStatutLabel()}
              </span>
            </p>
          </div>
        </div>

        {/* BANNIÈRE CONTEXTUELLE D'ÉTAT */}
        {isBrouillon && (
          <div className="p-4 bg-amber-50/90 border border-amber-200/80 rounded-2xl flex items-start gap-3 text-amber-900 text-xs font-semibold leading-relaxed">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p>Cette facture est en <strong>brouillon</strong>. Vérifiez vos séances et prestations ci-dessous.</p>
              <p className="text-[11px] text-amber-700 font-normal mt-0.5">
                Cliquez sur <strong>&quot;Générer la facture&quot;</strong> pour officialiser le document avec son numéro officiel.
              </p>
            </div>
          </div>
        )}

        {isGeneree && (
          <div className="p-4 bg-sky-50/90 border border-sky-200/80 rounded-2xl flex items-start gap-3 text-sky-900 text-xs font-semibold leading-relaxed">
            <FileText className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />
            <div>
              <p>Facture générée avec succès ! <strong>Elle n&apos;est pas encore transmise au club.</strong></p>
              <p className="text-[11px] text-sky-700 font-normal mt-0.5">
                Vérifiez le document PDF, puis cliquez sur <strong>&quot;Envoyer au club&quot;</strong> pour validation et règlement.
              </p>
            </div>
          </div>
        )}

        {isEnvoyee && (
          <div className="p-4 bg-emerald-50/90 border border-emerald-200/80 rounded-2xl flex items-start gap-3 text-emerald-900 text-xs font-semibold leading-relaxed">
            <Lock className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
            <div>
              <p>🔒 <strong>Facture envoyée au club.</strong> Tout est désormais verrouillé.</p>
              <p className="text-[11px] text-emerald-700 font-normal mt-0.5">
                Cette facture a été transmise par e-mail au secrétariat du club. Aucune modification n&apos;est plus permise.
              </p>
            </div>
          </div>
        )}

        {isPayee && (
          <div className="p-4 bg-purple-50/90 border border-purple-200/80 rounded-2xl flex items-start gap-3 text-purple-900 text-xs font-semibold leading-relaxed">
            <CheckCircle2 className="w-4 h-4 text-purple-700 shrink-0 mt-0.5" />
            <div>
              <p>✅ <strong>Facture payée et archivée.</strong></p>
              <p className="text-[11px] text-purple-700 font-normal mt-0.5">
                Le règlement a été effectué par le club pour ce mois.
              </p>
            </div>
          </div>
        )}

        {/* BARRE DE BOUTONS D'ACTION */}
        <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-100">
          {/* ACTION : GÉNÉRER */}
          {isBrouillon && (
            <button
              type="button"
              onClick={onGenerateInvoice}
              disabled={generatingInvoice || !totalMontant}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white text-xs font-black shadow-xs transition-all disabled:opacity-50"
            >
              {generatingInvoice ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileText className="w-3.5 h-3.5" />}
              <span>Générer la facture</span>
            </button>
          )}

          {/* ACTION : ENVOYER AU CLUB */}
          {isGeneree && (
            <button
              type="button"
              onClick={onSendInvoice}
              disabled={sendingEmail}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black shadow-xs transition-all disabled:opacity-50"
            >
              {sendingEmail ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
              <span>Envoyer au club</span>
            </button>
          )}

          {/* ACTION : RÉGÉNÉRER */}
          {(isBrouillon || isGeneree) && !isBlocked && (
            <button
              type="button"
              onClick={onRegenerateInvoice}
              disabled={generatingInvoice}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all disabled:opacity-50"
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
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-xs transition-all disabled:opacity-50"
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
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-bold shadow-2xs transition-all"
              >
                <Plus className="w-3.5 h-3.5 text-cyan-600" />
                <span>Prestation libre</span>
              </button>

              <button
                type="button"
                onClick={onOpenModalCompetition}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-bold shadow-2xs transition-all"
              >
                <Trophy className="w-3.5 h-3.5 text-amber-500" />
                <span>Compétition / Déplacement</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
