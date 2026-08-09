import { redirect } from 'next/navigation'
import { getCoachSession } from '@/lib/auth/session'
import { prisma } from '@/lib/prisma'
import CoachNav from '@/components/coach/CoachNav'
import Link from 'next/link'
import { calculerFactureCoach } from '@/lib/facture-calculations'
import CoachAgendaBassin from '@/components/coach/CoachAgendaBassin'

export const dynamic = 'force-dynamic'

async function getCoachData(coachId: string) {
  const now = new Date()
  const currentMonth = now.getMonth() + 1
  const currentYear = now.getFullYear()

  // Calculer la facturation estimée pour le mois en cours
  const currentMonthCalculations = await calculerFactureCoach(coachId, currentMonth, currentYear)

  const [coach, planningsCount, evenementsTournantsCount, facturesRecentes, availableShiftsCount] = await Promise.all([
    prisma.coach.findUnique({
      where: { id: coachId },
      select: {
        id: true,
        prenom: true,
        nom: true,
        email: true,
        siret: true,
        adresse: true,
        lastLogin: true,
      },
    }),
    prisma.planning.count({
      where: {
        coachs: {
          some: {
            coachId,
          },
        },
        actif: true
      },
    }),
    prisma.evenementTournant.count({
      where: { coachId, actif: true },
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
    prisma.evenementTournant.count({
      where: {
        coachId: null,
        actif: true,
        date: { gte: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0) },
      },
    }),
  ])

  // Charger les créneaux tournants des 7 prochains jours
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
      coach: {
        select: { id: true, prenom: true, nom: true },
      },
      groupe: {
        select: { id: true, nom: true, couleur: true },
      },
      groupes: {
        select: { id: true, nom: true, couleur: true },
      },
    },
    orderBy: { date: 'asc' },
  })

  // Charger les plannings fixes pour générer les instances hebdomadaires
  const planningsFixe = await prisma.planning.findMany({
    where: {
      actif: true,
    },
    include: {
      groupe: true,
      coachs: {
        include: {
          coach: {
            select: { id: true, prenom: true, nom: true },
          },
        },
      },
    },
  })

  return {
    coach,
    planningsCount,
    evenementsTournantsCount,
    facturesRecentes,
    availableShiftsCount,
    currentMonthCalculations,
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
    planningsCount,
    evenementsTournantsCount,
    facturesRecentes,
    availableShiftsCount,
    currentMonthCalculations,
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

  // Générer les séances hebdomadaires pour les 7 prochains jours
  const upcomingSessions: Array<{
    id: string
    type: 'fixe' | 'tournant'
    titre: string
    date: Date
    heureDebut: string
    heureFin: string
    lieu: string | null
    groupe: string
    isMySession: boolean
    coachName: string | null
    couleur: string | null
  }> = []

  // 1. Ajouter les tournants
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

  // 2. Ajouter les instances fixes
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
          lieu: p.lieu || 'Piscine',
          groupe: p.nomSession || p.groupe?.nom || 'Groupe',
          isMySession,
          coachName: coachesText || null,
          couleur: p.groupe?.couleur ?? null,
        })
      }
    })
  }

  // Trier par date puis par heure de début
  upcomingSessions.sort((a, b) => {
    const dateDiff = a.date.getTime() - b.date.getTime()
    if (dateDiff !== 0) return dateDiff
    return a.heureDebut.localeCompare(b.heureDebut)
  })

  const getStatutBadge = (statut: string) => {
    switch (statut) {
      case 'brouillon':
        return 'bg-slate-100 text-slate-700 border border-slate-200/80'
      case 'generee':
        return 'bg-blue-50 text-blue-700 border border-blue-100'
      case 'envoyee':
        return 'bg-green-50 text-green-700 border border-green-100'
      case 'payee':
        return 'bg-purple-50 text-purple-700 border border-purple-100'
      default:
        return 'bg-slate-100 text-slate-700 border border-slate-200/80'
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
    <div className="min-h-screen py-8 bg-slate-50/50 text-slate-800">
      <div className="container mx-auto px-4 max-w-6xl">
        <CoachNav />

        {/* Bannière d'alerte - Créneaux disponibles */}
        {availableShiftsCount > 0 && (
          <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl flex items-center justify-between shadow-2xs animate-pulse">
            <div className="flex items-center gap-3">
              <span className="text-xl">📢</span>
              <p className="text-sm font-semibold">
                {availableShiftsCount} créneau{availableShiftsCount > 1 ? 'x' : ''} disponible{availableShiftsCount > 1 ? 's' : ''} sur le planning tournant !
              </p>
            </div>
            <Link
              href="/coach/planning-tournant"
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors"
            >
              Voir le planning
            </Link>
          </div>
        )}

        {/* Profil de facturation incomplet */}
        {(!coach.siret || !coach.adresse) && (
          <div className="mb-6 bg-amber-50 border border-amber-200/80 p-5 rounded-xl flex items-start gap-4 shadow-2xs">
            <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center text-amber-700 shrink-0">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div>
              <h3 className="font-bold text-amber-900 text-sm tracking-tight">Profil de facturation incomplet</h3>
              <p className="text-amber-700 text-xs mt-1 leading-relaxed">
                Pour générer des factures valides, vous devez obligatoirement renseigner votre numéro de SIRET ainsi que votre adresse postale dans votre profil.
              </p>
              <div className="mt-3">
                <Link
                  href="/coach/profil"
                  className="inline-block bg-amber-600 text-white px-4 py-2 rounded-lg hover:bg-amber-700 text-xs font-bold uppercase tracking-wider transition-colors"
                >
                  Compléter mon profil
                </Link>
              </div>
            </div>
          </div>
        )}

        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Tableau de bord</h1>
            <p className="text-sm text-slate-500 font-medium mt-1">Bienvenue, {coach.prenom} {coach.nom}</p>
          </div>
        </div>

        {/* Statistiques rapides */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="card p-6 bg-white border border-slate-200/60 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">Cours fixes hebdomadaires</p>
              <p className="text-3xl font-extrabold text-slate-900 mt-2">{planningsCount}</p>
            </div>
            <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
          </div>

          <div className="card p-6 bg-white border border-slate-200/60 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-xs font-bold uppercase tracking-wider font-bold">Créneaux tournants pris</p>
              <p className="text-3xl font-extrabold text-slate-900 mt-2">{evenementsTournantsCount}</p>
            </div>
            <div className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.21 7.89M9 11l3-3 3 3m-3-3v12" />
              </svg>
            </div>
          </div>

          <div className="card p-6 bg-white border border-slate-200/60 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">Mois en cours ({currentMoisNom})</p>
              <p className="text-3xl font-extrabold text-slate-900 mt-2">
                {currentMonthCalculations.totalMontant.toFixed(2)} €
              </p>
            </div>
            <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>

        {/* Section double colonne */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
          
          {/* Planning de la semaine (2/3 largeur sur grand écran) */}
          <div className="lg:col-span-2 card p-6 bg-white border border-slate-200/60 shadow-xs">
            <h2 className="text-xl font-bold text-slate-900 mb-6 tracking-tight flex items-center gap-2">
              <span>📅</span> Agenda des 7 prochains jours
            </h2>

            <CoachAgendaBassin sessions={upcomingSessions} />
          </div>

          {/* Progression de facturation & Actions (1/3 largeur) */}
          <div className="space-y-6">
            
            {/* Widget progression mensuelle */}
            <div className="card p-6 bg-white border border-slate-200/60 shadow-xs">
              <h2 className="text-xl font-bold text-slate-900 mb-4 tracking-tight flex items-center gap-2">
                <span>📈</span> Activité de {currentMoisNom}
              </h2>
              
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-xs text-slate-400 font-bold uppercase tracking-wider">
                    <span>Heures validées</span>
                    <span className="text-slate-800">{currentMonthCalculations.totalHeures.toFixed(2)}h</span>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full mt-2 overflow-hidden">
                    <div
                      className="bg-primary h-full rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(100, (currentMonthCalculations.totalHeures / 40) * 100)}%` }}
                    />
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">Sur la base de 40h mensuelles indicatives</p>
                </div>

                <div className="pt-4 border-t border-slate-100">
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Gains accumulés estimés</p>
                  <p className="text-3xl font-black text-slate-900 mt-1">
                    {currentMonthCalculations.totalMontant.toFixed(2)} €
                  </p>
                  <p className="text-[10px] text-slate-400 mt-1 leading-normal">
                    Ce montant sera automatiquement transféré sur votre facture de {currentMoisNom.toLowerCase()}.
                  </p>
                </div>

                <Link
                  href="/coach/facturation"
                  className="block text-center bg-slate-900 hover:bg-slate-800 text-white py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors mt-2"
                >
                  Accéder à ma facturation
                </Link>
              </div>
            </div>

            {/* Actions rapides */}
            <div className="card p-6 bg-white border border-slate-200/60 shadow-xs">
              <h2 className="text-xl font-bold text-slate-900 mb-4 tracking-tight">Actions rapides</h2>
              <div className="space-y-3">
                <Link
                  href="/coach/planning-tournant"
                  className="block w-full border border-slate-200 hover:border-slate-350 hover:bg-slate-50 p-3 rounded-xl text-left transition-colors"
                >
                  <p className="text-xs font-bold text-slate-800 uppercase tracking-wider">Planning Tournant</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">Prendre/libérer des créneaux partagés</p>
                </Link>

                <Link
                  href="/coach/remplacements"
                  className="block w-full border border-slate-200 hover:border-slate-350 hover:bg-slate-50 p-3 rounded-xl text-left transition-colors"
                >
                  <p className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <span>🔄</span> Bourse des Remplacements
                  </p>
                  <p className="text-[11px] text-slate-400 mt-0.5">Proposer une absence ou prendre un remplacement</p>
                </Link>
              </div>
            </div>

          </div>
        </div>

        {/* Factures récentes */}
        <div className="card p-6 bg-white border border-slate-200/60 shadow-xs">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">Factures récentes</h2>
            <Link href="/coach/historique" className="text-xs font-bold uppercase tracking-wider text-primary hover:text-primary-dark transition-colors flex items-center gap-1">
              Voir tout l'historique
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>

          {facturesRecentes.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <p className="text-sm font-medium mb-4">Aucune facture pour le moment</p>
              <Link
                href="/coach/facturation"
                className="inline-flex items-center gap-2 bg-slate-900 text-white px-5 py-2.5 rounded-lg hover:bg-slate-800 text-xs font-bold uppercase tracking-wider transition-all duration-200 active:scale-[0.98]"
              >
                Créer ma première facture
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {facturesRecentes.map((facture) => (
                <div key={facture.id} className="flex items-center justify-between p-4 bg-slate-50 border border-slate-200/40 rounded-xl hover:border-slate-350/50 transition-colors">
                  <div className="flex-1">
                    <p className="font-bold text-slate-900 text-sm">{moisNoms[facture.mois - 1]} {facture.annee}</p>
                    <p className="text-xs text-slate-400 font-mono mt-0.5">N° {facture.numero}</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <p className="font-extrabold text-slate-900">{facture.montantTotal.toFixed(2)} €</p>
                    <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full ${getStatutBadge(facture.statut)}`}>
                      {getStatutLabel(facture.statut)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
