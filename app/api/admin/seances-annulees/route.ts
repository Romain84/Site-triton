import { NextRequest, NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/auth/session'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { logAdminAudit } from '@/lib/admin-audit'

const adminLogger = logger.withContext('Admin')

// GET - Liste toutes les séances annulées
export async function GET(request: NextRequest) {
  try {
    const session = await getAdminSession()

    if (!session) {
      return NextResponse.json(
        { error: 'Non authentifié' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const year = searchParams.get('year')
    const month = searchParams.get('month')

    const where: any = {}

    if (year && month) {
      const y = parseInt(year)
      const m = parseInt(month)
      const dateDebut = new Date(y, m - 1, 1)
      const dateFin = new Date(y, m, 0, 23, 59, 59)

      where.date = {
        gte: dateDebut,
        lte: dateFin,
      }
    }

    const seances = await prisma.seanceAnnulee.findMany({
      where,
      orderBy: {
        date: 'desc',
      },
    })

    return NextResponse.json(seances)
  } catch (error) {
    adminLogger.error('Erreur lors de la récupération des séances annulées', error)
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}

// POST - Enregistrer une nouvelle séance annulée
export async function POST(request: NextRequest) {
  try {
    const session = await getAdminSession()

    if (!session) {
      return NextResponse.json(
        { error: 'Non authentifié' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { date, motif, planningId, groupeId, coachId } = body

    if (!date) {
      return NextResponse.json(
        { error: 'La date est requise' },
        { status: 400 }
      )
    }

    const seance = await prisma.seanceAnnulee.create({
      data: {
        date: new Date(date),
        motif: motif || null,
        planningId: planningId || null,
        groupeId: groupeId || null,
        coachId: coachId || null,
      },
    })

    // Log the sensitive admin action
    logAdminAudit({
      action: 'seance_annulee.create',
      actorId: session.userId,
      actorRole: session.role,
      targetType: 'seance_annulee',
      targetId: seance.id,
      details: {
        date: seance.date,
        motif: seance.motif,
        planningId: seance.planningId,
        groupeId: seance.groupeId,
        coachId: seance.coachId,
      },
    })

    return NextResponse.json(seance, { status: 201 })
  } catch (error) {
    adminLogger.error('Erreur lors de la création de la séance annulée', error)
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}
