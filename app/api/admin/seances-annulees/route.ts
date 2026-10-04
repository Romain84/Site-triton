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

    // Récupérer les métadonnées pour enrichir l'affichage
    const [coaches, groupes, plannings] = await Promise.all([
      prisma.coach.findMany({ select: { id: true, prenom: true, nom: true } }),
      prisma.groupe.findMany({ select: { id: true, nom: true } }),
      prisma.planning.findMany({
        select: {
          id: true,
          jourSemaine: true,
          heureDebut: true,
          heureFin: true,
          tempsFacture: true,
          groupe: { select: { nom: true } },
          coachs: { select: { coach: { select: { prenom: true, nom: true } } } },
        },
      }),
    ])

    const coachesMap = new Map(coaches.map((c) => [c.id, `${c.prenom} ${c.nom || ''}`.trim()]))
    const groupesMap = new Map(groupes.map((g) => [g.id, g.nom]))
    const planningsMap = new Map(
      plannings.map((p) => [
        p.id,
        {
          jourSemaine: p.jourSemaine,
          heureDebut: p.heureDebut,
          heureFin: p.heureFin,
          groupeNom: p.groupe?.nom || 'Sans groupe',
          tempsFacture: p.tempsFacture,
          coachsNoms: p.coachs.map((cp) => `${cp.coach.prenom} ${cp.coach.nom || ''}`.trim()).join(', '),
        },
      ])
    )

    const seancesEnrichies = seances.map((s) => ({
      ...s,
      coachNom: s.coachId ? coachesMap.get(s.coachId) || null : null,
      groupeNom: s.groupeId ? groupesMap.get(s.groupeId) || null : null,
      planningInfo: s.planningId ? planningsMap.get(s.planningId) || null : null,
    }))

    return NextResponse.json(seancesEnrichies)
  } catch (error) {
    adminLogger.error('Erreur lors de la récupération des séances annulées', error)
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}

// POST - Enregistrer une ou plusieurs séances annulées
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
    const { date, motif, planningId, planningIds, groupeId, coachId, annulerTout } = body

    if (!date) {
      return NextResponse.json(
        { error: 'La date est requise' },
        { status: 400 }
      )
    }

    const targetDate = new Date(date)

    // Cas 1 : Multiples créneaux sélectionnés
    if (Array.isArray(planningIds) && planningIds.length > 0) {
      const createdSeances = []
      for (const pId of planningIds) {
        const seance = await prisma.seanceAnnulee.create({
          data: {
            date: targetDate,
            motif: motif || null,
            planningId: pId,
            groupeId: null,
            coachId: null,
          },
        })
        createdSeances.push(seance)

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
          },
        })
      }

      return NextResponse.json({
        success: true,
        count: createdSeances.length,
        seances: createdSeances,
      }, { status: 201 })
    }

    // Cas 2 : Annulation de toute la journée ou d'une cible unique
    const seance = await prisma.seanceAnnulee.create({
      data: {
        date: targetDate,
        motif: motif || null,
        planningId: annulerTout ? null : (planningId || null),
        groupeId: annulerTout ? null : (groupeId || null),
        coachId: annulerTout ? null : (coachId || null),
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
        annulerTout: !!annulerTout,
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
