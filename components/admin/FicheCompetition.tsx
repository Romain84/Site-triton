'use client'

import { useEffect } from 'react'
import { parseFicheDescription } from '@/lib/calendar/import-parser'
import type { CompetitionSheet, CompetitionSession } from '@/lib/calendar/import-parser'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmtH(h: string): string {
  return h.replace('H', 'h')
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })
}

// Colore les épreuves selon la nage
function epreuveColor(e: string): string {
  const u = e.toUpperCase()
  if (u.includes('NL'))  return 'bg-blue-50 text-blue-700 ring-blue-200'
  if (u.includes('DOS')) return 'bg-violet-50 text-violet-700 ring-violet-200'
  if (u.includes('BR'))  return 'bg-emerald-50 text-emerald-700 ring-emerald-200'
  if (u.includes('PAP')) return 'bg-amber-50 text-amber-700 ring-amber-200'
  if (u.includes('4N'))  return 'bg-rose-50 text-rose-700 ring-rose-200'
  if (u.includes('FINALE') || u.includes('DEMI')) return 'bg-gray-100 text-gray-600 ring-gray-200'
  if (u.includes('PAUSE')) return 'bg-gray-50 text-gray-400 ring-gray-100'
  return 'bg-gray-50 text-gray-600 ring-gray-200'
}

// ─── Session card ─────────────────────────────────────────────────────────────

function SessionCard({ session, index }: { session: CompetitionSession; index: number }) {
  const colors = [
    'from-blue-500 to-blue-600',
    'from-indigo-500 to-indigo-600',
    'from-violet-500 to-violet-600',
    'from-purple-500 to-purple-600',
  ]
  const gradient = colors[index % colors.length]

  return (
    <div className="rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
      {/* Header session */}
      <div className={`bg-gradient-to-r ${gradient} px-4 py-3 flex items-center justify-between`}>
        <span className="font-semibold text-white capitalize text-sm">{session.label}</span>
        <div className="flex items-center gap-3 text-white/90 text-xs">
          {session.echauffement && (
            <span className="flex items-center gap-1">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z"/>
              </svg>
              Éch. {fmtH(session.echauffement)}
            </span>
          )}
          {session.heureDebut && (
            <span className="flex items-center gap-1">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
              Début {fmtH(session.heureDebut)}
            </span>
          )}
        </div>
      </div>

      {/* Épreuves en chips */}
      {session.epreuves.length > 0 && (
        <div className="px-4 py-3 flex flex-wrap gap-1.5 bg-white">
          {session.epreuves.map((e, i) => (
            <span
              key={i}
              className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium ring-1 ${epreuveColor(e)}`}
            >
              {e}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Section wrapper ──────────────────────────────────────────────────────────

function Section({
  icon, title, children, accent = 'gray',
}: {
  icon: React.ReactNode
  title: string
  children: React.ReactNode
  accent?: 'blue' | 'emerald' | 'amber' | 'red' | 'gray'
}) {
  const accentColors: Record<string, string> = {
    blue:    'bg-blue-50 text-blue-600',
    emerald: 'bg-emerald-50 text-emerald-600',
    amber:   'bg-amber-50 text-amber-600',
    red:     'bg-red-50 text-red-600',
    gray:    'bg-gray-100 text-gray-500',
  }
  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${accentColors[accent]}`}>
          {icon}
        </div>
        <h4 className="text-sm font-bold text-gray-800 uppercase tracking-wide">{title}</h4>
      </div>
      {children}
    </div>
  )
}

// ─── Modal principal ──────────────────────────────────────────────────────────

interface Props {
  description: string | null | undefined
  eventTitle: string
  onClose: () => void
}

export function FicheCompetition({ description, eventTitle, onClose }: Props) {
  const sheet = parseFicheDescription(description)

  // Fermer avec Escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  if (!sheet) return null

  const hasDroits = sheet.droits.individuel || sheet.droits.relais

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">

        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div className="bg-gradient-to-br from-blue-600 to-indigo-700 px-6 py-5 shrink-0">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              {/* Titre */}
              <h2 className="text-lg font-bold text-white leading-tight">{sheet.title || eventTitle}</h2>

              {/* Date + lieu */}
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-blue-100 text-sm">
                <span className="flex items-center gap-1.5">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                  </svg>
                  {fmtDate(sheet.date)}
                  {sheet.dateFin && sheet.dateFin !== sheet.date && (
                    <> → {fmtDate(sheet.dateFin)}</>
                  )}
                </span>
                {sheet.lieu && (
                  <span className="flex items-center gap-1.5">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
                    </svg>
                    {sheet.lieu}
                  </span>
                )}
              </div>

              {/* Badges */}
              <div className="flex flex-wrap gap-2 mt-3">
                {sheet.genre && (
                  <span className="px-2.5 py-1 bg-white/20 text-white text-xs font-semibold rounded-lg">
                    {sheet.genre}
                  </span>
                )}
                {sheet.categories && (
                  <span className="px-2.5 py-1 bg-white/15 text-blue-100 text-xs font-medium rounded-lg">
                    {sheet.categories}
                  </span>
                )}
              </div>
            </div>

            {/* Close */}
            <button
              onClick={onClose}
              className="shrink-0 w-8 h-8 flex items-center justify-center rounded-lg bg-white/10 text-white hover:bg-white/20 transition-colors mt-0.5"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          </div>
        </div>

        {/* ── Corps scrollable ────────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">

          {/* Grille infos rapides */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {sheet.sessions.length > 0 && (
              <div className="bg-gray-50 rounded-xl px-4 py-3 text-center">
                <p className="text-2xl font-bold text-gray-800">{sheet.sessions.length}</p>
                <p className="text-xs text-gray-500 mt-0.5">session{sheet.sessions.length > 1 ? 's' : ''}</p>
              </div>
            )}
            {sheet.sessions.some(s => s.epreuves.length > 0) && (
              <div className="bg-blue-50 rounded-xl px-4 py-3 text-center">
                <p className="text-2xl font-bold text-blue-700">
                  {sheet.sessions.reduce((n, s) => n + s.epreuves.filter(e => !e.toUpperCase().includes('PAUSE')).length, 0)}
                </p>
                <p className="text-xs text-blue-500 mt-0.5">épreuves</p>
              </div>
            )}
            {hasDroits && sheet.droits.individuel && (
              <div className="bg-emerald-50 rounded-xl px-4 py-3 text-center">
                <p className="text-2xl font-bold text-emerald-700">{sheet.droits.individuel}</p>
                <p className="text-xs text-emerald-500 mt-0.5">/ individuel</p>
              </div>
            )}
          </div>

          {/* Conditions */}
          {sheet.conditions && sheet.conditions.trim() && (
            <Section
              accent="blue"
              title="Conditions de participation"
              icon={
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
                </svg>
              }
            >
              <div className="bg-blue-50/60 border border-blue-100 rounded-xl px-4 py-3 text-sm text-blue-900 leading-relaxed">
                {sheet.conditions}
              </div>
            </Section>
          )}

          {/* Récompenses */}
          {sheet.recompense && sheet.recompense !== 'Aucune' && (
            <Section
              accent="amber"
              title="Récompenses"
              icon={
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"/>
                </svg>
              }
            >
              <div className="flex items-center gap-3 px-4 py-3 bg-amber-50 border border-amber-100 rounded-xl">
                <span className="text-2xl">🏆</span>
                <p className="text-sm font-medium text-amber-900">{sheet.recompense}</p>
              </div>
            </Section>
          )}

          {/* Programme */}
          {sheet.sessions.length > 0 && (
            <Section
              accent="blue"
              title="Programme"
              icon={
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                </svg>
              }
            >
              <div className="space-y-3">
                {sheet.sessions.map((session, i) => (
                  <SessionCard key={i} session={session} index={i} />
                ))}
              </div>

              {/* Légende couleurs */}
              <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-gray-100">
                {[
                  ['NL',  'bg-blue-50 text-blue-700 ring-blue-200',    'Nage libre'],
                  ['DOS', 'bg-violet-50 text-violet-700 ring-violet-200', 'Dos'],
                  ['BR',  'bg-emerald-50 text-emerald-700 ring-emerald-200', 'Brasse'],
                  ['PAP', 'bg-amber-50 text-amber-700 ring-amber-200', 'Papillon'],
                  ['4N',  'bg-rose-50 text-rose-700 ring-rose-200',    '4 nages'],
                ].map(([abbr, cls, label]) => (
                  <span key={abbr} className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium ring-1 ${cls}`}>
                    {abbr} <span className="opacity-60">— {label}</span>
                  </span>
                ))}
              </div>
            </Section>
          )}

          {/* Droits d'engagement */}
          {hasDroits && (
            <Section
              accent="emerald"
              title="Droits d'engagement"
              icon={
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
              }
            >
              <div className="flex gap-3">
                {sheet.droits.individuel && (
                  <div className="flex-1 bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-3 text-center">
                    <p className="text-xs text-emerald-600 font-medium uppercase tracking-wide">Individuel</p>
                    <p className="text-xl font-bold text-emerald-700 mt-1">{sheet.droits.individuel}</p>
                  </div>
                )}
                {sheet.droits.relais && (
                  <div className="flex-1 bg-teal-50 border border-teal-100 rounded-xl px-4 py-3 text-center">
                    <p className="text-xs text-teal-600 font-medium uppercase tracking-wide">Relais</p>
                    <p className="text-xl font-bold text-teal-700 mt-1">{sheet.droits.relais}</p>
                  </div>
                )}
              </div>
            </Section>
          )}
        </div>

        {/* ── Footer ─────────────────────────────────────────────────────── */}
        <div className="shrink-0 px-6 py-4 border-t border-gray-100 flex justify-end bg-gray-50/60 rounded-b-2xl">
          <button
            onClick={onClose}
            className="px-5 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  )
}
