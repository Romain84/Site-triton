import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/api/guards'
import { logger } from '@/lib/logger'

const projectionLogger = logger.withContext('FinancesProjectionAPI')

// Helper pour calculer la durée entre deux heures au format HH:MM
function calculerDuree(heureDebut: string, heureFin: string): number {
  const [hD, mD] = heureDebut.split(':').map(Number)
  const [hF, mF] = heureFin.split(':').map(Number)
  return (hF * 60 + mF - (hD * 60 + mD)) / 60
}

// Algorithme de Meeus pour calculer les jours fériés français (fixes et mobiles)
function getJoursFeries(annee: number): { date: Date; nom: string }[] {
  const JourDeLAn = new Date(annee, 0, 1)
  const FeteDuTravail = new Date(annee, 4, 1)
  const Victoire1945 = new Date(annee, 4, 8)
  const FeteNationale = new Date(annee, 6, 14)
  const Assomption = new Date(annee, 7, 15)
  const Toussaint = new Date(annee, 10, 1)
  const Armistice1918 = new Date(annee, 10, 11)
  const Noel = new Date(annee, 11, 25)

  // Calcul astronomique de Pâques (algorithme de Meeus)
  const a = annee % 19
  const b = Math.floor(annee / 100)
  const c = annee % 100
  const d = Math.floor(b / 4)
  const e = b % 4
  const f = Math.floor((b + 8) / 25)
  const g = Math.floor((b - f + 1) / 3)
  const h = (19 * a + b - d - g + 15) % 30
  const i = Math.floor(c / 4)
  const k = c % 4
  const l = (32 + 2 * e + 2 * i - h - k) % 7
  const m = Math.floor((a + 11 * h + 22 * l) / 451)
  const n = h + l - 7 * m + 114
  const moisPaques = Math.floor(n / 31) // 3 = Mars, 4 = Avril
  const jourPaques = (n % 31) + 1

  const Paques = new Date(annee, moisPaques - 1, jourPaques)

  // Lundi de Pâques (+1 jour)
  const LundiPaques = new Date(Paques)
  LundiPaques.setDate(Paques.getDate() + 1)

  // Ascension (+39 jours)
  const Ascension = new Date(Paques)
  Ascension.setDate(Paques.getDate() + 39)

  // Lundi de Pentecôte (+50 jours)
  const LundiPentecote = new Date(Paques)
  LundiPentecote.setDate(Paques.getDate() + 50)

  return [
    { date: JourDeLAn, nom: "Jour de l'An" },
    { date: LundiPaques, nom: 'Lundi de Pâques' },
    { date: FeteDuTravail, nom: 'Fête du Travail' },
    { date: Victoire1945, nom: 'Victoire 1945' },
    { date: Ascension, nom: 'Ascension' },
    { date: LundiPentecote, nom: 'Lundi de Pentecôte' },
    { date: FeteNationale, nom: 'Fête Nationale' },
    { date: Assomption, nom: 'Assomption' },
    { date: Toussaint, nom: 'Toussaint' },
    { date: Armistice1918, nom: 'Armistice 1918' },
    { date: Noel, nom: 'Noël' },
  ]
}

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAdmin()
    if (!auth.ok) {
      return auth.response
    }

    const { searchParams } = new URL(request.url)
    const mois = searchParams.get('mois') ? parseInt(searchParams.get('mois')!) : new Date().getMonth() + 2
    const annee = searchParams.get('annee') ? parseInt(searchParams.get('annee')!) : new Date().getFullYear()
    const historiqueMois = searchParams.get('historiqueMois') ? parseInt(searchParams.get('historiqueMois')!) : 3

    const startOfMonth = new Date(annee, mois - 1, 1)
    const endOfMonth = new Date(annee, mois, 0, 23, 59, 59, 999)

    // 1. Récupérer les périodes de vacances qui impactent la facturation
    const periodesVacances = await prisma.periodeVacances.findMany({
      where: {
        actif: true,
        impacteFacturation: true,
        OR: [
          {
            dateDebut: {
              gte: startOfMonth,
              lte: endOfMonth,
            },
          },
          {
            dateFin: {
              gte: startOfMonth,
              lte: endOfMonth,
            },
          },
          {
            AND: [
              { dateDebut: { lte: startOfMonth } },
              { dateFin: { gte: endOfMonth } },
            ],
          },
        ],
      },
    })

    // 2. Déterminer les jours fériés français
    const joursFeries = getJoursFeries(annee)
    const joursFeriesDuMois = joursFeries.filter((jf) => {
      const m = jf.date.getMonth() + 1
      return m === mois
    })

    // 3. Calculer les statistiques du calendrier du mois
    let totalVacancesDays = 0
    const listFeriesDetectes: { date: string; nom: string }[] = []
    const current = new Date(startOfMonth)

    while (current <= endOfMonth) {
      const isEnVacances = periodesVacances.some((periode) => {
        const debut = new Date(periode.dateDebut)
        const fin = new Date(periode.dateFin)
        const dOnly = new Date(current.getFullYear(), current.getMonth(), current.getDate())
        const debutOnly = new Date(debut.getFullYear(), debut.getMonth(), debut.getDate())
        const finOnly = new Date(fin.getFullYear(), fin.getMonth(), fin.getDate())
        return dOnly >= debutOnly && dOnly <= finOnly
      })

      const isFerie = joursFeriesDuMois.find(
        (jf) => jf.date.getDate() === current.getDate()
      )

      if (isEnVacances) {
        totalVacancesDays++
      }
      if (isFerie) {
        listFeriesDetectes.push({
          date: current.toLocaleDateString('fr-FR'),
          nom: isFerie.nom,
        })
      }

      current.setDate(current.getDate() + 1)
    }

    // 4. Calculer la projection pour chaque coach
    const coaches = await prisma.coach.findMany({
      where: { actif: true },
      include: {
        plannings: {
          where: {
            planning: { actif: true },
          },
          include: {
            planning: {
              include: {
                groupe: true,
              },
            },
          },
        },
      },
    })

    const joursMap: { [key: string]: number } = {
      Dimanche: 0, Lundi: 1, Mardi: 2, Mercredi: 3, Jeudi: 4, Vendredi: 5, Samedi: 6
    }

    const settings = await prisma.settings.findFirst()
    const tauxHoraireGenerique = settings?.tauxHoraire || 35

    const coachesProjection = []
    let totalCoachesProjectedExpense = 0

    for (const coach of coaches) {
      const coachPlannings = coach.plannings.map((cp) => cp.planning)
      let coachSessionsCount = 0
      let coachHoursCount = 0
      let coachProjectedCost = 0
      const planningsDetails = []

      for (const planning of coachPlannings) {
        const dayOfWeek = joursMap[planning.jourSemaine]
        if (dayOfWeek === undefined) continue

        let planningSessionsCount = 0
        const occurrenceDates: Date[] = []

        const currentDay = new Date(startOfMonth)
        while (currentDay <= endOfMonth) {
          if (currentDay.getDay() === dayOfWeek) {
            // Vérifier les vacances scolaires
            const estEnVacances = periodesVacances.some((periode) => {
              const debut = new Date(periode.dateDebut)
              const fin = new Date(periode.dateFin)
              const dOnly = new Date(currentDay.getFullYear(), currentDay.getMonth(), currentDay.getDate())
              const debutOnly = new Date(debut.getFullYear(), debut.getMonth(), debut.getDate())
              const finOnly = new Date(fin.getFullYear(), fin.getMonth(), fin.getDate())
              return dOnly >= debutOnly && dOnly <= finOnly
            })

            // Vérifier les jours fériés
            const estFerie = joursFeriesDuMois.some(
              (jf) => jf.date.getDate() === currentDay.getDate()
            )

            if (!estEnVacances && !estFerie) {
              planningSessionsCount++
              occurrenceDates.push(new Date(currentDay))
            }
          }
          currentDay.setDate(currentDay.getDate() + 1)
        }

        const duration = calculerDuree(planning.heureDebut, planning.heureFin)
        const totalHoursForPlanning = duration * planningSessionsCount
        const costForPlanning = totalHoursForPlanning * tauxHoraireGenerique

        coachSessionsCount += planningSessionsCount
        coachHoursCount += totalHoursForPlanning
        coachProjectedCost += costForPlanning

        planningsDetails.push({
          planningId: planning.id,
          jourSemaine: planning.jourSemaine,
          heureDebut: planning.heureDebut,
          heureFin: planning.heureFin,
          groupe: planning.groupe?.nom || 'Sans groupe',
          duration,
          sessionsCount: planningSessionsCount,
          hoursCount: totalHoursForPlanning,
          projectedCost: costForPlanning,
          dates: occurrenceDates.map((d) =>
            d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })
          ),
        })
      }

      totalCoachesProjectedExpense += coachProjectedCost

      coachesProjection.push({
        coachId: coach.id,
        prenom: coach.prenom,
        nom: coach.nom || '',
        sessionsCount: coachSessionsCount,
        hoursCount: coachHoursCount,
        projectedCost: coachProjectedCost,
        plannings: planningsDetails,
      })
    }

    // 5. Calculer la moyenne historique des dépenses de fonctionnement
    const historyBreakdown: { month: number; year: number; total: number }[] = []
    let totalHistoricalExpenses = 0

    for (let i = 1; i <= historiqueMois; i++) {
      // Déterminer le i-ème mois précédent
      const pastDate = new Date(annee, mois - 1 - i, 1)
      const pastYear = pastDate.getFullYear()
      const pastMonth = pastDate.getMonth() + 1

      const startOfPastMonth = new Date(pastYear, pastMonth - 1, 1)
      const endOfPastMonth = new Date(pastYear, pastMonth, 0, 23, 59, 59, 999)

      const monthExpenses = await prisma.transactionComptable.findMany({
        where: {
          type: 'depense',
          date: {
            gte: startOfPastMonth,
            lte: endOfPastMonth,
          },
        },
      })

      const monthTotal = monthExpenses.reduce((sum, t) => sum + t.montant, 0)
      totalHistoricalExpenses += monthTotal

      historyBreakdown.push({
        month: pastMonth,
        year: pastYear,
        total: monthTotal,
      })
    }

    const baseProjectedGeneral = historiqueMois > 0 ? totalHistoricalExpenses / historiqueMois : 0

    // Récupérer les frais de fonctionnement (frais mensuels) déjà enregistrés pour le mois cible
    const targetMonthFrais = await prisma.transactionComptable.findMany({
      where: {
        type: 'depense',
        categorie: 'frais_fonctionnement',
        date: {
          gte: startOfMonth,
          lte: endOfMonth,
        },
      },
    })
    const targetMonthFraisTotal = targetMonthFrais.reduce((sum, t) => sum + t.montant, 0)

    // On garantit que les frais mensuels enregistrés pour ce mois cible sont toujours pris en compte au minimum
    const projectedGeneralExpense = Math.max(baseProjectedGeneral, targetMonthFraisTotal)

    projectionLogger.info(
      `Projection financière générée pour ${mois}/${annee} (Moyenne historique: ${baseProjectedGeneral.toFixed(2)} €, Frais mensuels cibles: ${targetMonthFraisTotal.toFixed(2)} €, Retenu: ${projectedGeneralExpense.toFixed(2)} €)`
    )

    return NextResponse.json({
      success: true,
      projection: {
        mois,
        annee,
        historiqueMois,
        calendarInfo: {
          totalDays: new Date(annee, mois, 0).getDate(),
          vacancesDaysCount: totalVacancesDays,
          feries: listFeriesDetectes,
        },
        coachesProjection,
        generalProjection: {
          history: historyBreakdown,
          totalExpenses: totalHistoricalExpenses,
          average: baseProjectedGeneral,
          targetMonthFraisTotal,
        },
        totals: {
          coachesCost: totalCoachesProjectedExpense,
          generalCost: projectedGeneralExpense,
          totalExpenses: totalCoachesProjectedExpense + projectedGeneralExpense,
        },
      },
    })
  } catch (error) {
    projectionLogger.error('Erreur lors du calcul de la projection financière', error)
    return NextResponse.json(
      { error: 'Erreur lors du calcul de la projection financière' },
      { status: 500 }
    )
  }
}
