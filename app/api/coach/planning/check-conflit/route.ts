import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireCoach } from '@/lib/api/guards'

function getIsoWeekNumber(d: Date): number {
  const date = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()))
  const dayNum = date.getUTCDay() || 7
  date.setUTCDate(date.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1))
  return Math.ceil((((date.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)
}

export async function GET(request: NextRequest) {
  try {
    const auth = await requireCoach()
    if (!auth.ok) {
      return auth.response
    }

    const coachId = auth.session.coachId
    const { searchParams } = new URL(request.url)
    const dateStr = searchParams.get('date')
    const heureDebut = searchParams.get('heureDebut')
    const heureFin = searchParams.get('heureFin')

    if (!dateStr || !heureDebut || !heureFin) {
      return NextResponse.json(
        { error: 'Paramètres manquants (date, heureDebut, heureFin sont requis)' },
        { status: 400 }
      )
    }

    // Parsing sécurisé sans décalage de fuseau horaire
    const parts = dateStr.split('-').map(Number)
    if (parts.length !== 3 || parts.some(isNaN)) {
      return NextResponse.json(
        { error: 'Format de date invalide (attendu: YYYY-MM-DD)' },
        { status: 400 }
      )
    }
    const [year, month, day] = parts
    if (month < 1 || month > 12 || day < 1 || day > 31) {
      return NextResponse.json(
        { error: 'Format de date invalide (attendu: YYYY-MM-DD)' },
        { status: 400 }
      )
    }

    const targetDate = new Date(Date.UTC(year, month - 1, day, 12, 0, 0))
    const startOfDay = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0))
    const endOfDay = new Date(Date.UTC(year, month - 1, day, 23, 59, 59, 999))

    // 1. Cours réguliers (Planning fixe via CoachPlanning)
    const daysOfWeek = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi']
    const jourCible = daysOfWeek[targetDate.getUTCDay()]
    const weekNumber = getIsoWeekNumber(targetDate)
    const isEvenWeek = weekNumber % 2 === 0

    // Vérifier si cette date tombe pendant les vacances scolaires impactant la facturation/planning
    const estEnVacances = await prisma.periodeVacances.findFirst({
      where: {
        actif: true,
        impacteFacturation: true,
        dateDebut: { lte: endOfDay },
        dateFin: { gte: startOfDay },
      },
    })

    if (!estEnVacances) {
      // Récupérer les séances annulées du jour
      const seancesAnnulees = await prisma.seanceAnnulee.findMany({
        where: {
          date: { gte: startOfDay, lte: endOfDay },
        },
      })

      const planningsFixes = await prisma.planning.findMany({
        where: {
          jourSemaine: jourCible,
          actif: true,
          coachs: {
            some: {
              coachId,
            },
          },
        },
        include: {
          groupe: true,
        },
      })

      for (const p of planningsFixes) {
        // Si le cours est sur semaine impaire et que nous sommes en semaine paire, aucun cours n'a lieu
        if (p.semaineImpaire && isEvenWeek) {
          continue
        }

        // Vérifier si ce créneau spécifique est annulé ce jour
        const estAnnule = seancesAnnulees.some((sa) => {
          if (!sa.planningId && !sa.groupeId && !sa.coachId) return true
          if (sa.coachId && sa.coachId === coachId) return true
          if (sa.planningId && sa.planningId === p.id) return true
          if (sa.groupeId && p.groupeId && sa.groupeId === p.groupeId) return true
          return false
        })

        if (estAnnule) {
          continue
        }

        if (heureDebut < p.heureFin && p.heureDebut < heureFin) {
          return NextResponse.json({
            conflict: true,
            type: 'planning_fixe',
            description: `Cours régulier "${p.groupe?.nom || 'Groupe'}" planifié le ${jourCible} de ${p.heureDebut} à ${p.heureFin}`,
          })
        }
      }
    }

    // 2. Événements tournants (EvenementTournant)
    const evenementsTournants = await prisma.evenementTournant.findMany({
      where: {
        coachId,
        actif: true,
        date: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
    })

    const overlapTournant = evenementsTournants.find(
      (evt) => heureDebut < evt.heureFin && evt.heureDebut < heureFin
    )

    if (overlapTournant) {
      return NextResponse.json({
        conflict: true,
        type: 'planning_tournant',
        description: `Événement tournant "${overlapTournant.titre}" planifié de ${overlapTournant.heureDebut} à ${overlapTournant.heureFin}`,
      })
    }

    // 3. Remplacements déjà acceptés (Remplacement)
    const remplacements = await prisma.remplacement.findMany({
      where: {
        coachRemplacantId: coachId,
        actif: true,
        date: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
    })

    const overlapRemp = remplacements.find(
      (r) => heureDebut < r.heureFin && r.heureDebut < heureFin
    )

    if (overlapRemp) {
      return NextResponse.json({
        conflict: true,
        type: 'remplacement',
        description: `Remplacement déjà accepté de ${overlapRemp.heureDebut} à ${overlapRemp.heureFin}`,
      })
    }

    return NextResponse.json({ conflict: false })
  } catch (error) {
    return NextResponse.json(
      { error: 'Erreur lors de la vérification des conflits' },
      { status: 500 }
    )
  }
}
