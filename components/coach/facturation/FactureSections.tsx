'use client'

import {
  Clock,
  CalendarRange,
  CheckCircle2,
  Trophy,
  Sparkles,
  AlertCircle,
  Car,
  Trash2,
  FileText,
} from 'lucide-react'
import { formatHeuresEnHM } from '@/lib/facture-format'
import { SectionFacture, LigneFacture } from './types'

interface FactureSectionsProps {
  sections?: SectionFacture[]
  allLignesFallback: LigneFacture[]
  isBlocked?: boolean
  totalHeures: number
  totalMontant: number
  onDeleteLine: (ligneId: string, type?: string) => void
}

export default function FactureSections({
  sections,
  allLignesFallback,
  isBlocked,
  totalHeures,
  totalMontant,
  onDeleteLine,
}: FactureSectionsProps) {
  const getSectionIcon = (type: string) => {
    switch (type) {
      case 'planning_fixe':
        return <Clock className="w-4 h-4 text-emerald-600" />
      case 'planning_tournant':
        return <CalendarRange className="w-4 h-4 text-cyan-600" />
      case 'remplacements':
        return <CheckCircle2 className="w-4 h-4 text-blue-600" />
      case 'competitions':
        return <Trophy className="w-4 h-4 text-amber-600" />
      case 'prestations':
        return <Sparkles className="w-4 h-4 text-violet-600" />
      case 'autres_absences':
        return <AlertCircle className="w-4 h-4 text-red-600" />
      default:
        return <FileText className="w-4 h-4 text-slate-500" />
    }
  }

  if (sections && sections.length > 0) {
    const totalLinesCount = sections.reduce((acc, s) => acc + s.lignes.length, 0)

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-black text-slate-950 flex items-center gap-2">
            <FileText className="w-4 h-4 text-slate-400" />
            <span>Détail des séances et prestations ({totalLinesCount})</span>
          </h2>
        </div>

        <div className="space-y-4">
          {sections.map((sec) => (
            <div
              key={sec.id}
              className="bg-white border border-slate-200/90 rounded-3xl overflow-hidden shadow-xs"
            >
              {/* EN-TÊTE DE SECTION */}
              <div className="px-5 py-3.5 bg-slate-50/80 border-b border-slate-100 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  {getSectionIcon(sec.type)}
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-900">
                    {sec.titre}
                  </h3>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-200/70 text-slate-700">
                    {sec.lignes.length}
                  </span>
                </div>

                <div className="flex items-center gap-2 text-xs font-black">
                  {sec.sousTotalHeures !== 0 && (
                    <span className="text-slate-500 font-bold">
                      {sec.sousTotalDureeHM || formatHeuresEnHM(sec.sousTotalHeures)}
                    </span>
                  )}
                  <span className={sec.sousTotalMontant < 0 ? 'text-red-600' : 'text-slate-950'}>
                    {sec.sousTotalMontant < 0
                      ? `-${Math.abs(sec.sousTotalMontant).toFixed(2)} €`
                      : `${sec.sousTotalMontant.toFixed(2)} €`}
                  </span>
                </div>
              </div>

              {/* LIGNES DE LA SECTION */}
              <div className="divide-y divide-slate-100 p-3 sm:p-4 space-y-2">
                {sec.lignes.map((l, idx) => {
                  const isDeletable =
                    l.id &&
                    ['manuel', 'competition', 'forfait_transport', 'forfait_regional'].includes(l.type)
                  const dateFormatted = l.date ? new Date(l.date).toLocaleDateString('fr-FR') : null

                  return (
                    <div
                      key={l.id || idx}
                      className="p-3 rounded-2xl hover:bg-slate-50/70 transition-colors space-y-2"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1 flex-1 min-w-0">
                          {/* NIVEAU 1 : Titre (Groupes ou Remplacement ou Compétition) */}
                          <div className="flex items-center gap-2 flex-wrap">
                            {l.type === 'competition' && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-50 text-amber-800 border border-amber-200/80">
                                <Trophy className="w-3 h-3 text-amber-600" />
                                Compétition
                              </span>
                            )}
                            {l.type === 'forfait_transport' && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-50 text-emerald-800 border border-emerald-200/80">
                                <Car className="w-3 h-3 text-emerald-700" />
                                Transport
                              </span>
                            )}
                            {l.type === 'remplacement' && !l.titre?.includes('— pour') && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-blue-50 text-blue-800 border border-blue-200/80">
                                Remplacement
                              </span>
                            )}
                            <p className="text-sm font-extrabold text-slate-950 truncate">
                              {l.titre || l.description}
                            </p>
                            {l.noteInfo && (
                              <span className="text-[10px] bg-slate-100 text-slate-500 font-semibold px-2 py-0.5 rounded-full border border-slate-200/60">
                                {l.noteInfo}
                              </span>
                            )}
                          </div>

                          {/* NIVEAU 2 : Sous-titre (Jour + Horaires + Bassin) */}
                          {l.sousTitre ? (
                            <p className="text-xs text-slate-500 font-medium">
                              {l.sousTitre}
                            </p>
                          ) : l.type === 'competition' ? (
                            <p className="text-xs text-slate-500 font-medium">
                              {dateFormatted ? `${dateFormatted} · ` : ''}
                              {l.demiJournees === 2 || l.heures === 2 ? '1 journée complète (130 €)' : '1 demi-journée (50 €)'}
                              {l.lieu ? ` · ${l.lieu}` : ''}
                            </p>
                          ) : l.type === 'forfait_transport' ? (
                            <p className="text-xs text-slate-500 font-medium">
                              {dateFormatted ? `${dateFormatted} · ` : ''}
                              {l.heures} km aller × 0,30 €/km
                              {l.lieu ? ` · Destination : ${l.lieu}` : ''}
                            </p>
                          ) : dateFormatted ? (
                            <p className="text-xs text-slate-500 font-medium">
                              Date : {dateFormatted}
                            </p>
                          ) : null}

                          {/* NIVEAU 3 : Badges des dates du mois (très lisible et compact) */}
                          {l.datesBadges && l.datesBadges.length > 0 && (
                            <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mr-0.5">
                                Séances :
                              </span>
                              {l.datesBadges.map((badge, bIdx) => (
                                <span
                                  key={bIdx}
                                  className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200/70"
                                >
                                  {badge}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* DURÉE & MONTANT + BOUTON SUPPRIMER */}
                        <div className="flex items-center gap-3 shrink-0 text-right">
                          <div className="space-y-0.5">
                            <p className="text-sm font-black text-slate-950">
                              {l.montant < 0
                                ? `-${Math.abs(l.montant).toFixed(2)} €`
                                : `${l.montant.toFixed(2)} €`}
                            </p>
                            <p className="text-[11px] font-bold text-slate-500">
                              {l.detailCalculDuree ||
                                (l.heures !== undefined && l.heures !== 0
                                  ? formatHeuresEnHM(l.heures)
                                  : '')}
                            </p>
                          </div>

                          {isDeletable && !isBlocked && (
                            <button
                              type="button"
                              onClick={() => onDeleteLine(l.id!, l.type)}
                              className="p-1.5 text-slate-400 hover:text-red-600 transition-colors rounded-lg hover:bg-red-50"
                              title="Supprimer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* ABSENCES IMBRIQUÉES EN ROUGE DIRECTEMENT SOUS LA SÉANCE */}
                      {l.absencesAssociees && l.absencesAssociees.length > 0 && (
                        <div className="ml-2 sm:ml-4 mt-2 pt-2 border-l-2 border-red-300 pl-3 space-y-1.5">
                          {l.absencesAssociees.map((abs, aIdx) => (
                            <div
                              key={abs.id || aIdx}
                              className="flex items-center justify-between gap-3 px-3 py-1.5 rounded-xl bg-red-50/70 border border-red-200/60 text-xs"
                            >
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-bold text-red-800">
                                  {abs.type === 'annulation' || abs.description?.includes('Séance annulée')
                                    ? `↳ Séance annulée ${abs.date}`
                                    : `↳ Absence ${abs.date}`}
                                </span>
                                {abs.motif && (
                                  <span className="text-[11px] text-red-700/80 italic">
                                    ({abs.motif})
                                  </span>
                                )}
                                {abs.coachRemplacantNom && (
                                  <span className="text-[10px] bg-white border border-red-200 text-red-700 px-1.5 py-0.5 rounded font-semibold">
                                    Remplacé par {abs.coachRemplacantNom}
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-2.5 shrink-0 text-right">
                                <span className="text-red-700 font-semibold text-[11px]">
                                  {abs.texteDeduction || formatHeuresEnHM(abs.heures)}
                                </span>
                                <span className="text-red-700 font-black">
                                  −{Math.abs(abs.montant).toFixed(2)} €
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>

              {/* SOUS-TOTAL DE SECTION */}
              <div className="flex items-center justify-between px-5 py-2.5 bg-slate-50 border-t border-slate-100 text-xs">
                <span className="font-bold text-slate-600 uppercase tracking-wider text-[10px]">
                  Sous-total {sec.titre}
                </span>
                <div className="flex items-center gap-3">
                  {sec.sousTotalHeures !== 0 && (
                    <span className="font-bold text-slate-600">
                      {sec.sousTotalDureeHM || formatHeuresEnHM(sec.sousTotalHeures)}
                    </span>
                  )}
                  <span className="font-black text-slate-950 text-sm">
                    {sec.sousTotalMontant < 0
                      ? `-${Math.abs(sec.sousTotalMontant).toFixed(2)} €`
                      : `${sec.sousTotalMontant.toFixed(2)} €`}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* BANDEAU SYNTHÈSE TOTALE NETTE */}
        <div className="p-4 sm:p-5 rounded-3xl bg-slate-900 text-white flex items-center justify-between shadow-xs">
          <div>
            <p className="text-[10px] uppercase font-black tracking-wider text-slate-400">
              Total net du mois
            </p>
            <p className="text-xs text-slate-300 font-semibold">
              {formatHeuresEnHM(totalHeures)} ({totalHeures.toFixed(2)} h) validées
            </p>
          </div>
          <div className="text-right">
            <p className="text-xl sm:text-2xl font-black text-emerald-400">
              {totalMontant.toFixed(2)} €
            </p>
          </div>
        </div>
      </div>
    )
  }

  // FALLBACK SANS SECTIONS STRUCTUREES
  return (
    <div className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-7 shadow-xs space-y-4">
      <h2 className="text-base font-black text-slate-950 flex items-center gap-2">
        <FileText className="w-4 h-4 text-slate-400" />
        <span>Détail des séances et prestations ({allLignesFallback.length})</span>
      </h2>

      {allLignesFallback.length === 0 ? (
        <div className="text-center py-8 text-slate-400 space-y-1">
          <p className="text-xs font-bold">Aucune séance effectuée pour ce mois</p>
        </div>
      ) : (
        <div className="divide-y divide-slate-100">
          {allLignesFallback.map((l, idx) => {
            const isDeletable =
              l.id &&
              ['manuel', 'competition', 'forfait_transport', 'forfait_regional'].includes(l.type)
            const dateFormatted = l.date ? new Date(l.date).toLocaleDateString('fr-FR') : null

            return (
              <div
                key={l.id || idx}
                className="py-3.5 first:pt-0 last:pb-0 flex items-center justify-between gap-3"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    {l.type === 'absence' && (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-red-50 text-red-700 border border-red-200/80">
                        Absence déduite
                      </span>
                    )}
                    {l.type === 'remplacement' && (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-blue-50 text-blue-700 border border-blue-200/80">
                        Remplacement effectué
                      </span>
                    )}
                    {l.type === 'competition' && (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-50 text-amber-800 border border-amber-200/80">
                        <Trophy className="w-3 h-3 text-amber-600" />
                        Compétition
                      </span>
                    )}
                    {l.type === 'forfait_transport' && (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-50/80 text-emerald-800 border border-emerald-200/80">
                        <Car className="w-3 h-3 text-emerald-700" />
                        Forfait transport
                      </span>
                    )}
                    <p className="text-xs font-extrabold text-slate-900">
                      {l.description}
                    </p>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    {dateFormatted ? `Date : ${dateFormatted} · ` : ''}
                    {l.type === 'competition'
                      ? l.demiJournees === 2 || l.heures === 2
                        ? '1 journée complète (130 €)'
                        : '1 demi-journée (50 €)'
                      : l.type === 'forfait_transport'
                      ? `${l.heures} km aller × 0,30 €/km`
                      : l.heures !== undefined && l.heures !== 0
                      ? `${Math.abs(l.heures)} heure${Math.abs(l.heures) > 1 ? 's' : ''}`
                      : ''}
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <span
                    className={`text-xs font-black ${l.montant < 0 ? 'text-red-600' : 'text-slate-950'}`}
                  >
                    {l.montant < 0
                      ? `-${Math.abs(l.montant).toFixed(2)} €`
                      : `${l.montant.toFixed(2)} €`}
                  </span>
                  {isDeletable && !isBlocked && (
                    <button
                      type="button"
                      onClick={() => onDeleteLine(l.id!, l.type)}
                      className="p-1.5 text-slate-400 hover:text-red-600 transition-colors rounded-lg hover:bg-red-50"
                      title="Supprimer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
