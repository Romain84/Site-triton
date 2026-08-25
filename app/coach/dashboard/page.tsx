import { redirect } from 'next/navigation'
import { getCoachSession } from '@/lib/auth/session'
import { prisma } from '@/lib/prisma'
import CoachNav from '@/components/coach/CoachNav'
import Link from 'next/link'
import { calculerFactureCoach } from '@/lib/facture-calculations'
import CoachAgendaBassin, { AgendaSession } from '@/components/coach/CoachAgendaBassin'
import {
  CalendarDays,
  Repeat,
  Receipt,
  Sparkles,
  ArrowRight,
  Clock,
  Euro,
  AlertCircle,
  ChevronRight,
  CheckCircle2
} from 'lucide-react'

export const dynamic = 'force-dynamic'

async function getCoachData(coachId: string) {
  const now = new Date()
  const currentMonth = now.getMonth() + 1
  const currentYear = now.getFullYear()

  const [coach, currentMonthCalculations, availableShiftsCount, facturesRecentes] = await Promise.all([
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
    prisma.evenementTournant.count({
      where: {
        coachId: null,
        actif: true,
        date: { gte: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0) },
      },
    }),
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
  ])

  // Load upcoming rotating events for the next 7 days
  const dateFin7Jours = new Date()
  dateFin7Jours.setDate(now.getDate() + 7)

  const upcomingTournants = await prisma.evenementTournant.findMany({
    where: {
      actif: true,
      date: {
        gte: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0),
        lte: new Date(dateFin7Jours.getFullYear(), dateFin7Jours.getMonth(), dateFin7Jours.getDate(), 23, 59, 59),
      },
    },
    include: {
      coach: { select: { id: true, prenom: true, nom: true } },
      groupe: { select: { id: true, nom: true, couleur: true } },
      groupes: { select: { id: true, nom: true, couleur: true } },
    },
    orderBy: { date: 'asc' },
  })

  // Load fixed schedules to generate 7-day instances
  const planningsFixe = await prisma.planning.findMany({
    where: { actif: true },
    include: {
      groupe: true,
      coachs: {
        include: {
          coach: { select: { id: true, prenom: true, nom: true } },
        },
      },
    },
  })

  return {
    coach,
    currentMonthCalculations,
    availableShiftsCount,
    facturesRecentes,
    upcomingTournants,
    planningsFixe,
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
    availableShiftsCount,
    facturesRecentes,
    upcomingTournants,
    planningsFixe,
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

  // Build upcoming sessions list for 7 days
  const upcomingSessions: AgendaSession[] = []

  // 1. Tournants
  upcomingTournants.forEach((evt) => {
    const groupName = (evt.groupes && evt.groupes.length > 0)
      ? evt.groupes.map(g => g.nom).join(', ')
      : (evt.groupe?.nom || evt.titre)

    upcomingSessions.push({
      id: evt.id,
      type: 'tournant',
      titre: groupName,
      date: new Date(evt.date),
      heureDebut: evt.heureDebut,
      heureFin: evt.heureFin,
      lieu: evt.lieu,
      groupe: groupName,
      isMySession: evt.coachId === session.coachId,
      coachName: evt.coach ? `${evt.coach.prenom} ${evt.coach.nom || ''}`.trim() : null,
      couleur: evt.groupe?.couleur || (evt.groupes && evt.groupes.length > 0 ? evt.groupes[0].couleur : null),
    })
  })

  // 2. Fixed slots
  const joursMapRef: { [key: string]: number } = {
    'Dimanche': 0, 'Lundi': 1, 'Mardi': 2, 'Mercredi': 3,
    'Jeudi': 4, 'Vendredi': 5, 'Samedi': 6
  }

  for (let i = 0; i < 7; i++) {
    const dayDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i)
    const dayOfWeekNum = dayDate.getDay()

    planningsFixe.forEach((p) => {
      const dayNum = joursMapRef[p.jourSemaine]
      if (dayNum === dayOfWeekNum) {
        const isMySession = p.coachs.some((c) => c.coachId === session.coachId)
        const coachesText = p.coachs.map((c) => `${c.coach.prenom} ${c.coach.nom || ''}`.trim()).join(', ')

        upcomingSessions.push({
          id: `${p.id}-${dayDate.toISOString().split('T')[0]}`,
          type: 'fixe',
          titre: p.nomSession || p.groupe?.nom || 'Entraînement',
          date: dayDate,
          heureDebut: p.heureDebut,
          heureFin: p.heureFin,
          lieu: p.lieu || 'Piscine Alphonse Roudière',
          groupe: p.nomSession || p.groupe?.nom || 'Groupe',
          isMySession,
          coachName: coachesText || null,
          couleur: p.groupe?.couleur ?? null,
        })
      }
    })
  }

  upcomingSessions.sort((a, b) => {
    const dateDiff = new Date(a.date).getTime() - new Date(b.date).getTime()
    if (dateDiff !== 0) return dateDiff
    return a.heureDebut.localeCompare(b.heureDebut)
  })

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
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-cyan-50 text-cyan-800 text-[11px] font-extrabold uppercase tracking-wider mb-1.5">
                <Sparkles className="w-3 h-3 text-cyan-600" />
                <span>Coach Triton Club</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-slate-950 tracking-tight">
                Bonjour, {coach.prenom} 👋
              </h1>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Bienvenue sur votre espace d&apos;entraînement et de gestion.
              </p>
            </div>

            {(!coach.siret || !coach.adresse) && (
              <Link
                href="/coach/profil"
                className="inline-flex items-center gap-2 p-2.5 sm:px-3.5 sm:py-2 bg-amber-50 hover:bg-amber-100/80 border border-amber-200 text-amber-900 rounded-xl text-xs font-bold transition-colors"
              >
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Compléter SIRET & Profil</span>
                <ChevronRight className="w-3.5 h-3.5 text-amber-600" />
              </Link>
            )}
          </div>

          {/* 2 MAIN STAT METRICS */}
          <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-100">
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-150 space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                <span>Heures {currentMoisNom}</span>
              </span>
              <p className="text-xl sm:text-2xl font-black text-slate-950">
                {currentMonthCalculations.totalHeures.toFixed(2)} h
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

        {/* QUICK ACTIONS ROW */}
        <section className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <Link
            href="/coach/planning-tournant"
            className={`p-4 rounded-2xl border transition-all flex flex-col justify-between ${
              availableShiftsCount > 0
                ? 'bg-emerald-50/70 border-emerald-200 hover:bg-emerald-100/60'
                : 'bg-white border-slate-200/80 hover:border-slate-300'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xl">⚡</span>
              {availableShiftsCount > 0 ? (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-600 text-white animate-pulse">
                  {availableShiftsCount} libre{availableShiftsCount > 1 ? 's' : ''}
                </span>
              ) : (
                <ChevronRight className="w-4 h-4 text-slate-400" />
              )}
            </div>
            <div>
              <p className="text-xs font-black text-slate-900">Créneaux tournants</p>
              <p className="text-[11px] text-slate-500 font-medium">Prendre ou libérer</p>
            </div>
          </Link>

          <Link
            href="/coach/remplacements"
            className="p-4 rounded-2xl bg-white border border-slate-200/80 hover:border-slate-300 transition-all flex flex-col justify-between"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xl">🔄</span>
              <ChevronRight className="w-4 h-4 text-slate-400" />
            </div>
            <div>
              <p className="text-xs font-black text-slate-900">Remplacements</p>
              <p className="text-[11px] text-slate-500 font-medium">Déclarer ou accepter</p>
            </div>
          </Link>

          <Link
            href="/coach/facturation"
            className="col-span-2 sm:col-span-1 p-4 rounded-2xl bg-white border border-slate-200/80 hover:border-slate-300 transition-all flex flex-col justify-between"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xl">💶</span>
              <ChevronRight className="w-4 h-4 text-slate-400" />
            </div>
            <div>
              <p className="text-xs font-black text-slate-900">Facturation & PDF</p>
              <p className="text-[11px] text-slate-500 font-medium">Télécharger ma facture</p>
            </div>
          </Link>
        </section>

        {/* AGENDA SECTION */}
        <section className="bg-white border border-slate-200/80 rounded-3xl p-5 sm:p-7 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-black text-slate-950 flex items-center gap-2">
              <CalendarDays className="w-5 h-5 text-cyan-600" />
              <span>Agenda des 7 prochains jours</span>
            </h2>
          </div>

          <CoachAgendaBassin sessions={upcomingSessions} currentCoachId={session.coachId} />
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
