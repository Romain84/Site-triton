import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireCoach } from '@/lib/api/guards'

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

    const targetDate = new Date(dateStr)
    if (isNaN(targetDate.getTime())) {
      return NextResponse.json(
        { error: 'Format de date invalide (attendu: YYYY-MM-DD)' },
        { status: 400 }
      )
    }

    const startOfDay = new Date(targetDate)
    startOfDay.setHours(0, 0, 0, 0)
    const endOfDay = new Date(targetDate)
    endOfDay.setHours(23, 59, 59, 999)

    // 1. Cours réguliers (Planning via CoachPlanning)
    const daysOfWeek = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi']
    const jourCible = daysOfWeek[targetDate.getDay()]

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
    })

    const overlapFixe = planningsFixes.find(
      (p) => heureDebut < p.heureFin && p.heureDebut < heureFin
    )

    if (overlapFixe) {
      return NextResponse.json({
        conflict: true,
        type: 'planning_fixe',
        description: `Cours régulier planifié le ${jourCible} de ${overlapFixe.heureDebut} à ${overlapFixe.heureFin}`,
      })
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

    // 4. Remplacements déjà acceptés (Remplacement)
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
