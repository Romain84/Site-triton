import { redirect } from 'next/navigation'
import { getCoachSession } from '@/lib/auth/session'
import { prisma } from '@/lib/prisma'
import CoachNav from '@/components/coach/CoachNav'
import Link from 'next/link'
import { calculerFactureCoach } from '@/lib/facture-calculations'
import CoachAgendaBassin from '@/components/coach/CoachAgendaBassin'
import { getCoachAgenda } from '@/lib/services/coach-agenda-service'
import { formatHeuresEnHM } from '@/lib/facture-format'
import {
  CalendarDays,
  Receipt,
  Clock,
  Euro,
  AlertCircle,
  ChevronRight,
  FileText,
} from 'lucide-react'

export const dynamic = 'force-dynamic'

async function getCoachData(coachId: string) {
  const now = new Date()
  const currentMonth = now.getMonth() + 1
  const currentYear = now.getFullYear()

  const [coach, currentMonthCalculations, facturesRecentes, agendaData] = await Promise.all([
    prisma.coach.findUnique({
      where: { id: coachId },
      select: {
        id: true,
        prenom: true,
        nom: true,
        email: true,
        siret: true,
        adresse: true,
      },
    }),
    calculerFactureCoach(coachId, currentMonth, currentYear),
    prisma.factureCoach.findMany({
      where: { coachId },
      orderBy: [{ annee: 'desc' }, { mois: 'desc' }],
      take: 3,
      select: {
        id: true,
        numero: true,
        mois: true,
        annee: true,
        montantTotal: true,
        statut: true,
      },
    }),
    getCoachAgenda(coachId, 14),
  ])

  return {
    coach,
    currentMonthCalculations,
    facturesRecentes,
    agendaData,
  }
}

export default async function CoachDashboard() {
  const session = await getCoachSession()

  if (!session) {
    redirect('/coach/login')
  }

  const {
    coach,
    currentMonthCalculations,
    facturesRecentes,
    agendaData,
  } = await getCoachData(session.coachId)

  if (!coach) {
    redirect('/coach/login')
  }

  const now = new Date()
  const moisNoms = [
    'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
    'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
  ]
  const currentMoisNom = moisNoms[now.getMonth()]

  const getStatutBadge = (statut: string) => {
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

        {/* TOP GREETING & SUMMARY HEADER */}
        <header className="bg-white border border-slate-200/80 rounded-3xl p-5 sm:p-7 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-slate-950 tracking-tight">
                Bonjour {coach.prenom}
              </h1>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Bienvenue sur votre espace d&apos;entraînement et de gestion.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <a
                href="/api/guide-coach"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 p-2.5 sm:px-3.5 sm:py-2 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-900 rounded-xl text-xs font-bold transition-all shadow-2xs"
                title="Consulter le guide pratique officiel en PDF"
              >
                <FileText className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Guide Coach (PDF)</span>
              </a>

              {(!coach.siret || !coach.adresse) && (
                <Link
                  href="/coach/profil"
                  className="inline-flex items-center gap-2 p-2.5 sm:px-3.5 sm:py-2 bg-amber-50 hover:bg-amber-100/80 border border-amber-200 text-amber-900 rounded-xl text-xs font-bold transition-colors"
                >
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>Compléter profil</span>
                  <ChevronRight className="w-3.5 h-3.5 text-amber-600" />
                </Link>
              )}
            </div>
          </div>

          {/* 2 MAIN STAT METRICS - FORMAT H/MIN */}
          <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-100">
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-150 space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                <span>Heures {currentMoisNom}</span>
              </span>
              <p className="text-xl sm:text-2xl font-black text-slate-950">
                {formatHeuresEnHM(currentMonthCalculations.totalHeures)}
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-150 space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1">
                <Euro className="w-3.5 h-3.5 text-slate-400" />
                <span>Gains estimés</span>
              </span>
              <p className="text-xl sm:text-2xl font-black text-slate-950">
                {currentMonthCalculations.totalMontant.toFixed(2)} €
              </p>
            </div>
          </div>
        </header>

        {/* AGENDA RÉEL 14 JOURS */}
        <section className="bg-white border border-slate-200/80 rounded-3xl p-5 sm:p-7 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-black text-slate-950 flex items-center gap-2">
              <CalendarDays className="w-5 h-5 text-cyan-600" />
              <span>Mon Agenda &amp; Entraînements (14 jours)</span>
            </h2>
          </div>

          <CoachAgendaBassin
            initialJours={agendaData.jours}
            initialCoaches={agendaData.coaches}
            currentCoachId={session.coachId}
          />
        </section>

        {/* RECENT INVOICES MINI-CARD */}
        {facturesRecentes.length > 0 && (
          <section className="bg-white border border-slate-200/80 rounded-3xl p-5 sm:p-7 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-black text-slate-950 flex items-center gap-2">
                <Receipt className="w-4 h-4 text-slate-400" />
                <span>Dernières factures</span>
              </h2>
              <Link
                href="/coach/facturation"
                className="text-xs font-bold text-cyan-600 hover:text-cyan-700 transition-colors flex items-center gap-1"
              >
                <span>Voir tout</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="grid sm:grid-cols-3 gap-3">
              {facturesRecentes.map((f) => (
                <div key={f.id} className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/60 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-extrabold text-slate-900">
                      {moisNoms[f.mois - 1]} {f.annee}
                    </p>
                    <p className="text-[10px] text-slate-400 font-mono">N° {f.numero}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-black text-slate-950">{f.montantTotal.toFixed(2)} €</p>
                    <span className={`inline-block mt-0.5 px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider ${getStatutBadge(f.statut)}`}>
                      {f.statut}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  )
}
