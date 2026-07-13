import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import type { Metadata } from 'next'
import EventActions from '@/components/EventActions'
import CalendrierFilter from '@/components/CalendrierFilter'

export const metadata: Metadata = {
  title: 'Calendrier',
  description: 'Calendrier des événements et compétitions du Triton Club Cavaillon',
}

export const dynamic = 'force-dynamic'

// ─── Types ────────────────────────────────────────────────────────────────────

interface CompetitionSession {
  label: string
  heureDebut: string | null
  echauffement: string | null
  epreuves: string[]
}

interface CompetitionSheet {
  title: string
  date: string
  dateFin: string | null
  lieu: string | null
  categories: string | null
  genre: string | null
  conditions: string | null
  recompense: string | null
  droits: { individuel?: string; relais?: string }
  sessions: CompetitionSession[]
  pageNumber?: number
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseFiche(description: string | null): CompetitionSheet | null {
  if (!description?.startsWith('__FICHE__:')) return null
  try { return JSON.parse(description.slice('__FICHE__:'.length)) } catch { return null }
}

function fmtH(h: string) { return h.replace('H', 'h') }

function groupByMonth<T extends { date: Date }>(items: T[]): Map<string, T[]> {
  const map = new Map<string, T[]>()
  for (const item of items) {
    const key = new Date(item.date).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(item)
  }
  return map
}

const TYPE_LABELS: Record<string, string> = {
  competition: 'Compétition', stage: 'Stage',
  entrainement: 'Entraînement', evenement: 'Événement',
}

function epreuveColor(e: string) {
  const u = e.toUpperCase()
  if (u.includes('NL'))    return 'bg-blue-50 text-blue-700 ring-1 ring-blue-100'
  if (u.includes('DOS'))   return 'bg-violet-50 text-violet-700 ring-1 ring-violet-100'
  if (u.includes('BR'))    return 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100'
  if (u.includes('PAP'))   return 'bg-amber-50 text-amber-700 ring-1 ring-amber-100'
  if (u.includes('4N'))    return 'bg-rose-50 text-rose-700 ring-1 ring-rose-100'
  if (u.includes('PAUSE')) return 'bg-gray-50 text-gray-400 ring-1 ring-gray-100'
  return 'bg-gray-100 text-gray-600 ring-1 ring-gray-200'
}

function formatBadgeLabel(text: string): string {
  if (!text) return text
  const u = text.toUpperCase().trim()
  
  if (u.includes('U11') || u === 'U11 ET -' || u === 'U11 ET MOINS') return 'Avenirs'
  if (u.includes('U12') || u.includes('U13') || u === 'U12 ET U13' || u === 'U12-U13') return 'Benjamins'
  if (u.includes('U14') || u.includes('U15') || u.includes('U16') || u.includes('U17') || u.includes('U18') || u === 'U14 À U18' || u === 'U14-U18' || u.includes('JUNIORS')) return 'Juniors'
  if (u.includes('MAITRE') || u.includes('MAÎTRE')) return 'Maitres'
  
  return text
}

function getGroupBadgeStyle(nom: string): string {
  const n = nom || ''
  const u = n.toUpperCase()

  // Competitions & Mapped categories
  if (nom === 'Avenirs' || n.includes('Avenirs 1') || n.includes('Avenirs 2') || n.includes('Avenirs 3') || n.includes('Avenirs')) {
    return 'bg-sky-50 text-sky-700 border-sky-200/50'
  }
  if (n.includes('Benjamins 1') || nom === 'Benjamins') {
    return 'bg-purple-50 text-purple-700 border-purple-200/50'
  }
  if (n.includes('Benjamins 2')) {
    return 'bg-indigo-50 text-indigo-700 border-indigo-200/50'
  }
  if (nom === 'Juniors' || n.includes('Juniors Compétition') || (n.includes('Juniors') && u.includes('COMP')) || n.includes('Juniors')) {
    return 'bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200/50'
  }
  if (n.includes('Adultes Compétition') || (n.includes('Adultes') && u.includes('COMP'))) {
    return 'bg-slate-900 text-slate-100 border-slate-800'
  }
  if (nom === 'Maitres' || n.includes('Maitres') || n.includes('Maitre') || n.includes('Maîtres') || n.includes('Maître')) {
    return 'bg-slate-850 text-slate-100 border-slate-750'
  }

  // Generic tags (styled nicely instead of plain gray)
  if (u.includes('QUALIFICATIVE')) {
    return 'bg-amber-50 text-amber-700 border-amber-250/50'
  }
  if (u === 'COMPÉTITION' || u === 'COMPETITION') {
    return 'bg-blue-50 text-blue-750 border-blue-200/50'
  }

  // Loisirs
  if (n.includes('Jeunes Loisirs')) return 'bg-emerald-50 text-emerald-700 border-emerald-200/50'
  if (n.includes('Juniors Loisirs')) return 'bg-teal-50 text-teal-700 border-teal-200/50'
  if (n.includes('Adultes Loisirs 1')) return 'bg-lime-50 text-lime-800 border-lime-200/50'
  if (n.includes('Adultes Loisirs 2')) return 'bg-green-800 text-green-50 border-green-700'

  // Rest
  if (n.includes('Natation Artistique') || u.includes('ARTISTIQUE')) return 'bg-pink-50 text-pink-700 border-pink-200/50'
  if (n.includes('AquaGym') || u.includes('AQUA')) return 'bg-cyan-50 text-cyan-700 border-cyan-200/50'
  if (n.includes('BNSSA')) return 'bg-red-50 text-red-700 border-red-200/50'
  if (n.includes('Ecole de natation française (ENF 1)') || n.includes('ENF 1')) return 'bg-yellow-50 text-yellow-800 border-yellow-250/50'
  if (n.includes('Ecole de natation française (ENF 2)') || n.includes('ENF 2')) return 'bg-orange-50 text-orange-700 border-orange-200/50'

  return 'bg-slate-50 text-slate-600 border-slate-200'
}

// ─── Data fetching ────────────────────────────────────────────────────────────

async function getEvenements(groupeId?: string) {
  try {
    const whereClause: any = {
      actif: true,
      date: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
    }

    if (groupeId && groupeId !== 'all') {
      whereClause.OR = [
        { groupeId: groupeId },
        { groupeId: null }
      ]
    }

    const [events, dbGroups] = await Promise.all([
      prisma.evenementCalendrier.findMany({
        where: whereClause,
        include: { coach: true, groupe: true },
        orderBy: { date: 'asc' },
      }),
      prisma.groupe.findMany({
        where: { actif: true },
        select: { id: true, nom: true }
      })
    ])

    // Filtrer en mémoire si un groupe spécifique est sélectionné
    let filteredEvents = events
    if (groupeId && groupeId !== 'all') {
      filteredEvents = events.filter(event => {
        if (event.groupeId === groupeId) return true
        if (event.groupeId === null) {
          if (event.description && event.description.includes('__TARGET_GROUPS__:')) {
            try {
              const parts = event.description.split('__TARGET_GROUPS__:')
              const targetGroupIds = JSON.parse(parts[1].trim())
              return targetGroupIds.includes(groupeId)
            } catch {
              return true
            }
          }
          return true
        }
        return false
      })
    }

    // Nettoyer la balise technique __TARGET_GROUPS__ et extraire les noms des groupes cibles
    return filteredEvents.map(event => {
      let targetGroupNames: string[] = []
      
      if (event.groupe) {
        targetGroupNames.push(event.groupe.nom)
      } else if (event.description && event.description.includes('__TARGET_GROUPS__:')) {
        try {
          const parts = event.description.split('__TARGET_GROUPS__:')
          const targetGroupIds = JSON.parse(parts[1].trim())
          targetGroupNames = targetGroupIds
            .map((id: string) => dbGroups.find(g => g.id === id)?.nom)
            .filter(Boolean)
        } catch {
          // fallback
        }
      }

      return {
        ...event,
        description: event.description
          ? event.description.split('__TARGET_GROUPS__:')[0].trim()
          : event.description,
        targetGroups: targetGroupNames
      }
    })
  } catch (error) {
    logger.error('Error fetching événements', error)
    return []
  }
}

// ─── Page ─────────────────────────────────────────────────────────────────────

type SearchParamsProps = { [key: string]: string | string[] | undefined } | Promise<{ [key: string]: string | string[] | undefined }>

export default async function CalendrierPage({ searchParams }: { searchParams: SearchParamsProps }) {
  const resolvedParams = searchParams instanceof Promise ? await searchParams : searchParams
  const groupeId = typeof resolvedParams?.groupeId === 'string' ? resolvedParams.groupeId : 'all'

  const [evenements, groupes] = await Promise.all([
    getEvenements(groupeId),
    prisma.groupe.findMany({
      where: { actif: true, niveau: 'competition' },
      select: { id: true, nom: true, niveau: true },
      orderBy: { ordre: 'asc' },
    })
  ])

  const grouped = groupByMonth(evenements)

  return (
    <div className="min-h-screen pt-32 md:pt-40 pb-20 bg-white">
      <div className="container mx-auto px-4 max-w-5xl space-y-12 animate-fade-in-up">

        {/* En-tête */}
        <div className="text-center space-y-3">
          <h1 className="text-4xl md:text-5xl font-extrabold text-slate-900 tracking-tight">
            Calendrier & Compétitions
          </h1>
          <p className="text-slate-500 font-light text-base md:text-lg max-w-xl mx-auto leading-relaxed">
            Restez informé de tous les événements, compétitions sportives et stages d&apos;entraînement programmés pour la saison.
          </p>
          <div className="flex items-center justify-center gap-3 pt-2 flex-wrap">
            {Object.entries(TYPE_LABELS).map(([type, label]) => {
              const bg = 
                type === 'competition' ? 'bg-primary' :
                type === 'stage' ? 'bg-amber-500' :
                type === 'entrainement' ? 'bg-indigo-500' : 'bg-emerald-500'
              
              return (
                <span key={type} className="inline-flex items-center gap-2 px-3 py-1 text-xs font-semibold text-slate-500 border border-slate-200 rounded-full">
                  <span className={`w-2 h-2 rounded-full ${bg}`} />
                  {label}
                </span>
              )
            })}
          </div>
        </div>

        {/* Filtre intelligent de groupe & Abonnement iCal */}
        <CalendrierFilter groupes={groupes} initialGroupeId={groupeId} />

        {evenements.length === 0 ? (
          <div className="text-center py-20 border border-slate-200/80 rounded-xl">
            <svg className="w-12 h-12 mx-auto text-slate-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
            </svg>
            <p className="text-slate-400 font-medium">Aucun événement à venir pour le moment.</p>
          </div>
        ) : (
          <div className="max-w-3xl mx-auto space-y-10">
            {[...grouped.entries()].map(([monthLabel, events]) => (
              <div key={monthLabel} className="space-y-4">
                {/* En-tête de mois */}
                <div className="flex items-center gap-3 pt-6 pb-2">
                  <h2 className="text-sm font-bold text-slate-900 uppercase tracking-widest">{monthLabel}</h2>
                  <div className="flex-1 h-px bg-slate-200" />
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    {events.length} {events.length > 1 ? 'événements' : 'événement'}
                  </span>
                </div>

                <div className="space-y-4">
                  {events.map((event) => {
                    const fiche = parseFiche(event.description)
                    const couleur = event.couleur ?? '#64748b'
                    const isMultiDay = event.dateFin &&
                      new Date(event.dateFin).toDateString() !== new Date(event.date).toDateString()

                    return (
                      <div key={event.id} className="bg-white rounded-xl border border-slate-200/80 overflow-hidden flex">
                        {/* Barre couleur */}
                        <div className="w-1 shrink-0" style={{ backgroundColor: couleur }} />

                        <div className="flex-1 p-5 md:p-6 space-y-4">
                          {/* Ligne principale : date + titre */}
                          <div className="flex items-start gap-5">

                            {/* Badge date */}
                            <div className="shrink-0 text-center min-w-[50px] pt-1">
                              <div className="text-3xl font-extrabold leading-none tracking-tight" style={{ color: couleur }}>
                                {new Date(event.date).getDate()}
                              </div>
                              <div className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-1">
                                {new Date(event.date).toLocaleDateString('fr-FR', { month: 'short' })}
                              </div>
                              {isMultiDay && (
                                <div className="text-[9px] text-slate-400 mt-1 font-bold">
                                  → {new Date(event.dateFin!).getDate()}
                                </div>
                              )}
                            </div>

                            {/* Contenu */}
                            <div className="flex-1 min-w-0">
                              {/* Badges type + targeted groups */}
                              <div className="flex flex-wrap items-center gap-1.5 mb-2">
                                {(() => {
                                  const badges: { label: string; style: string }[] = []
                                  const isCompetition = event.type === 'competition'
                                  if (event.type) {
                                    const label = TYPE_LABELS[event.type] ?? event.type
                                    badges.push({ label, style: 'text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ' + getGroupBadgeStyle(label) })
                                  }
                                  if (event.targetGroups) {
                                    for (const g of event.targetGroups) {
                                      const label = formatBadgeLabel(g)
                                      if (isCompetition && label.toLowerCase().includes('loisir')) {
                                        continue
                                      }
                                      if (!badges.some(b => b.label.toLowerCase() === label.toLowerCase())) {
                                        badges.push({ label, style: 'text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ' + getGroupBadgeStyle(label) })
                                      }
                                    }
                                  }
                                  if (fiche?.genre) {
                                    const label = formatBadgeLabel(fiche.genre)
                                    if (isCompetition && label.toLowerCase().includes('loisir')) {
                                      // skip
                                    } else if (!badges.some(b => b.label.toLowerCase() === label.toLowerCase())) {
                                      badges.push({ label, style: 'text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ' + getGroupBadgeStyle(label) })
                                    }
                                  }
                                  if (fiche?.categories) {
                                    const label = formatBadgeLabel(fiche.categories)
                                    if (isCompetition && label.toLowerCase().includes('loisir')) {
                                      // skip
                                    } else if (!badges.some(b => b.label.toLowerCase() === label.toLowerCase())) {
                                      badges.push({ label, style: 'text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ' + getGroupBadgeStyle(label) })
                                    }
                                  }
                                  if (badges.length === 0) {
                                    return (
                                      <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border border-slate-200 text-slate-500">
                                        Tout public
                                      </span>
                                    )
                                  }
                                  return badges.map((badge, idx) => (
                                    <span
                                      key={idx}
                                      className={badge.style}
                                    >
                                      {badge.label}
                                    </span>
                                  ))
                                })()}
                              </div>

                              {/* Titre */}
                              <h2 className="text-base md:text-lg font-bold text-slate-900 tracking-tight leading-snug">{event.title}</h2>

                              {/* Date complète si multi-jours */}
                              {isMultiDay && (
                                <p className="text-xs font-semibold text-slate-400 mt-1">
                                  Du {new Date(event.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })} au {new Date(event.dateFin!).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                                </p>
                              )}

                              {/* Infos pratiques */}
                              <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mt-3">
                                {event.lieu && (
                                  <span className="flex items-center gap-1 text-xs font-medium text-slate-400">
                                    <svg className="w-3.5 h-3.5 text-slate-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
                                    </svg>
                                    {event.lieu}
                                  </span>
                                )}
                                {event.heureDebut && (
                                  <span className="flex items-center gap-1 text-xs font-medium text-slate-400">
                                    <svg className="w-3.5 h-3.5 text-slate-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
                                    </svg>
                                    {event.heureDebut}{event.heureFin ? ` – ${event.heureFin}` : ''}
                                  </span>
                                )}
                                {event.coach && (
                                  <span className="flex items-center gap-1 text-xs font-medium text-slate-400">
                                    <svg className="w-3.5 h-3.5 text-slate-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
                                    </svg>
                                    {event.coach.prenom} {event.coach.nom}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* ── Contenu fiche enrichie ─────────────────── */}
                          {fiche ? (
                            <div className="mt-5 space-y-4 border-t border-slate-100 pt-4">

                              {/* Conditions */}
                              {fiche.conditions && (
                                <div>
                                  <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                                    Conditions de participation
                                  </h4>
                                  <p className="text-sm text-slate-600 leading-relaxed bg-slate-50 border border-slate-200 px-3 py-2 rounded-lg font-light">
                                    {fiche.conditions}
                                  </p>
                                </div>
                              )}

                              {/* Récompenses */}
                              {fiche.recompense && fiche.recompense !== 'Aucune' && (
                                <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg">
                                  <div>
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-0.5">Récompenses</span>
                                    <p className="text-sm text-slate-700 font-light">{fiche.recompense}</p>
                                  </div>
                                </div>
                              )}

                              {/* Programme */}
                              {fiche.sessions.length > 0 && (
                                <div>
                                  <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">
                                    Programme
                                  </h4>
                                  <div className="space-y-2.5">
                                    {fiche.sessions.map((session, i) => (
                                      <div key={i} className="rounded-lg overflow-hidden border border-slate-200">
                                        <div className="bg-slate-900 px-3 py-2 flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 text-white">
                                          <span className="text-xs font-semibold uppercase tracking-wider">{session.label}</span>
                                          <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-white/90 text-[11px] font-medium">
                                            {session.echauffement && <span>Échauffement : {fmtH(session.echauffement)}</span>}
                                            {session.heureDebut && <span>Début : {fmtH(session.heureDebut)}</span>}
                                          </div>
                                        </div>
                                        {session.epreuves.length > 0 && (
                                          <div className="px-3 py-2.5 flex flex-wrap gap-1.5 bg-white">
                                            {session.epreuves.map((e, j) => (
                                              <span key={j} className={`text-xs font-medium px-2 py-0.5 rounded ${epreuveColor(e)}`}>
                                                {e}
                                              </span>
                                            ))}
                                          </div>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                  {/* Légende */}
                                  <div className="flex flex-wrap gap-2 mt-3.5">
                                    {[['NL','bg-blue-50 text-blue-700 ring-1 ring-blue-100','Nage libre'],['DOS','bg-violet-50 text-violet-700 ring-1 ring-violet-100','Dos'],['BR','bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100','Brasse'],['PAP','bg-amber-50 text-amber-700 ring-1 ring-amber-100','Papillon'],['4N','bg-rose-50 text-rose-700 ring-1 ring-rose-100','4 nages']].map(([abbr,cls,label]) => (
                                      <span key={abbr} className={`text-[10px] px-2 py-0.5 rounded font-medium ${cls}`}>
                                        {abbr} <span className="opacity-60">— {label}</span>
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          ) : event.description && (
                            // Description texte simple (événements sans fiche)
                            <p className="mt-4 text-sm text-slate-500 border-t border-slate-100 pt-4 font-light">
                              {event.description}
                            </p>
                          )}

                          {/* PDF + Actions */}
                          <div className="mt-4 flex items-center gap-3 flex-wrap border-t border-slate-100 pt-4">
                            <EventActions event={event} />
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

