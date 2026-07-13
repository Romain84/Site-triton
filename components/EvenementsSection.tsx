import Link from 'next/link'
import SectionHeader from '@/components/ui/SectionHeader'
import { formatDayMonthBadgeFr, formatDateRangeFr } from '@/lib/date'

interface Event {
  id: string
  title: string
  date: Date
  dateFin?: Date | null
  heureDebut?: string | null
  lieu?: string | null
  type?: string | null
  couleur?: string | null
  description?: string | null
}

interface EvenementsSectionProps {
  events: Event[]
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const TYPE_LABELS: Record<string, string> = {
  competition:  'Compétition',
  stage:        'Stage',
  entrainement: 'Entraînement',
  evenement:    'Événement',
}

const TYPE_STYLES: Record<string, string> = {
  competition:  'bg-primary/10 text-primary-dark',
  stage:        'bg-amber-50 text-amber-700',
  entrainement: 'bg-violet-50 text-violet-700',
  evenement:    'bg-emerald-50 text-emerald-700',
}

/**
 * Extrait un résumé lisible depuis une description.
 * Si la description est une fiche structurée (__FICHE__:{...}),
 * retourne genre + récompense. Sinon retourne la première ligne.
 */
function getPublicResume(description: string | null | undefined): string | null {
  if (!description) return null
  if (description.startsWith('__FICHE__:')) {
    try {
      const sheet = JSON.parse(description.slice('__FICHE__:'.length))
      const parts: string[] = []
      if (sheet.genre) parts.push(sheet.genre)
      if (sheet.recompense && sheet.recompense !== 'Aucune') parts.push(sheet.recompense)
      return parts.join(' · ') || null
    } catch {
      return null
    }
  }
  return description.split('\n')[0] ?? null
}



// ─── Composant ────────────────────────────────────────────────────────────────

export default function EvenementsSection({ events }: EvenementsSectionProps) {
  if (events.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 h-full">
        <SectionHeader title="Événements à Venir" linkHref="/calendrier" linkLabel="Calendrier" />
        <div className="flex flex-col items-center justify-center py-8 text-gray-400">
          <svg className="w-12 h-12 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <p className="text-sm">Aucun événement à venir</p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 h-full">
      <SectionHeader title="Événements à Venir" linkHref="/calendrier" linkLabel="Calendrier" />

      <div className="space-y-2 mt-1">
        {events.slice(0, 4).map((event) => {
          const { day, month } = formatDayMonthBadgeFr(event.date)
          const couleur = event.couleur ?? '#94a3b8'
          const resume = getPublicResume(event.description)
          const isMultiDay = event.dateFin &&
            new Date(event.dateFin).toDateString() !== new Date(event.date).toDateString()

          return (
            <div
              key={event.id}
              className="flex items-stretch gap-3 rounded-xl overflow-hidden bg-gray-50/60 hover:bg-gray-50 transition-colors"
            >
              {/* Bande couleur gauche */}
              <div className="w-1 shrink-0 rounded-l-xl" style={{ backgroundColor: couleur }} />

              {/* Badge date */}
              <div className="flex flex-col items-center justify-center min-w-[40px] py-3">
                <span className="text-lg font-bold leading-none" style={{ color: couleur }}>
                  {day}
                </span>
                <span className="text-[10px] text-gray-400 uppercase tracking-wide mt-0.5">
                  {month}
                </span>
                {isMultiDay && (
                  <span className="text-[9px] text-gray-400 mt-0.5">
                    → {new Date(event.dateFin!).getDate()}
                  </span>
                )}
              </div>

              {/* Séparateur */}
              <div className="w-px bg-gray-200 my-3 shrink-0" />

              {/* Contenu */}
              <div className="flex-1 min-w-0 py-3 pr-3">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-semibold text-slate-800 text-sm leading-tight line-clamp-2">
                    {event.title}
                  </h3>
                  {event.type && (
                    <span className={`shrink-0 text-[10px] font-medium px-1.5 py-0.5 rounded-md ${TYPE_STYLES[event.type] ?? 'bg-gray-100 text-gray-600'}`}>
                      {TYPE_LABELS[event.type] ?? event.type}
                    </span>
                  )}
                </div>

                {/* Lieu + heure */}
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  {event.lieu && (
                    <span className="flex items-center gap-1 text-xs text-gray-500">
                      <svg className="w-3 h-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
                      </svg>
                      {event.lieu}
                    </span>
                  )}
                  {event.heureDebut && (
                    <span className="flex items-center gap-1 text-xs text-gray-400">
                      <svg className="w-3 h-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
                      </svg>
                      {event.heureDebut}
                    </span>
                  )}
                </div>

                {/* Résumé (conditions / récompenses) */}
                {resume && (
                  <p className="text-xs text-gray-400 mt-1 truncate">{resume}</p>
                )}

                {/* Plage de dates pour les événements multi-jours */}
                {isMultiDay && (
                  <p className="text-xs text-gray-400 mt-0.5">
                    {formatDateRangeFr(event.date, event.dateFin)}
                  </p>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {events.length > 4 && (
        <Link
          href="/calendrier"
          className="mt-3 flex items-center justify-center gap-1 text-xs text-gray-400 hover:text-primary transition-colors"
        >
          + {events.length - 4} autres événements
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/>
          </svg>
        </Link>
      )}
    </div>
  )
}
