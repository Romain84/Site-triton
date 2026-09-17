import { NextRequest, NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/auth/session'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { logger } from '@/lib/logger'
import { syncRemplacementBillingLines } from '@/lib/services/remplacement-service'

const planningLogger = logger.withContext('Remplacements')

const updateRemplacementSchema = z.object({
  coachRemplaceId: z.string().min(1).optional(),
  coachRemplacantId: z.string().nullable().optional(),
  date: z.string().min(1).optional(),
  heureDebut: z.string().min(1).optional(),
  heureFin: z.string().min(1).optional(),
  planningId: z.string().nullable().optional(),
  motif: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  actif: z.boolean().optional(),
  statut: z.string().optional(),
})

// GET: Obtenir un remplacement
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getAdminSession()
    if (!session) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const { id } = await params

    const remplacement = await prisma.remplacement.findUnique({
      where: { id },
      include: {
        coachRemplace: {
          select: { id: true, prenom: true, nom: true },
        },
        coachRemplacant: {
          select: { id: true, prenom: true, nom: true },
        },
      },
    })

    if (!remplacement) {
      return NextResponse.json(
        { error: 'Remplacement non trouvé' },
        { status: 404 }
      )
    }

    return NextResponse.json({ remplacement })
  } catch (error) {
    planningLogger.error('Erreur lors de la récupération du remplacement', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

// PUT: Mettre à jour un remplacement
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getAdminSession()
    if (!session) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    const validation = updateRemplacementSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Données invalides', details: validation.error.flatten() },
        { status: 400 }
      )
    }

    const data = validation.data

    // Vérifier que le remplacement existe
    const existing = await prisma.remplacement.findUnique({
      where: { id },
    })

    if (!existing) {
      return NextResponse.json(
        { error: 'Remplacement non trouvé' },
        { status: 404 }
      )
    }

    // Vérifier que les deux coachs sont différents si on les modifie
    const newCoachRemplaceId = data.coachRemplaceId || existing.coachRemplaceId
    const hasNewRemplacantId = data.coachRemplacantId !== undefined
    const newCoachRemplacantId = hasNewRemplacantId
      ? (data.coachRemplacantId && data.coachRemplacantId.trim() !== '' ? data.coachRemplacantId : null)
      : existing.coachRemplacantId

    if (newCoachRemplacantId && newCoachRemplaceId === newCoachRemplacantId) {
      return NextResponse.json(
        { error: 'Le coach remplaçant doit être différent du coach remplacé' },
        { status: 400 }
      )
    }

    const updateData: {
      coachRemplaceId?: string
      coachRemplacantId?: string | null
      date?: Date
      heureDebut?: string
      heureFin?: string
      planningId?: string | null
      motif?: string | null
      description?: string | null
      actif?: boolean
      statut?: string
    } = {}

    if (data.coachRemplaceId) updateData.coachRemplaceId = data.coachRemplaceId
    if (hasNewRemplacantId) {
      updateData.coachRemplacantId = newCoachRemplacantId
      updateData.statut = data.statut || (newCoachRemplacantId ? 'accepte' : 'sans_remplacant')
    } else if (data.statut) {
      updateData.statut = data.statut
    }
    if (data.date) updateData.date = new Date(data.date)
    if (data.heureDebut) updateData.heureDebut = data.heureDebut
    if (data.heureFin) updateData.heureFin = data.heureFin
    if (data.planningId !== undefined) updateData.planningId = data.planningId
    if (data.motif !== undefined) updateData.motif = data.motif
    if (data.description !== undefined) updateData.description = data.description
    if (data.actif !== undefined) updateData.actif = data.actif

    const remplacement = await prisma.remplacement.update({
      where: { id },
      data: updateData,
      include: {
        coachRemplace: {
          select: { id: true, prenom: true, nom: true },
        },
        coachRemplacant: {
          select: { id: true, prenom: true, nom: true },
        },
      },
    })

    await syncRemplacementBillingLines(remplacement.id)

    return NextResponse.json({ remplacement })
  } catch (error) {
    planningLogger.error('Erreur lors de la mise à jour du remplacement', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

// DELETE: Supprimer un remplacement
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getAdminSession()
    if (!session) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const { id } = await params

    const existing = await prisma.remplacement.findUnique({
      where: { id },
    })

    if (!existing) {
      return NextResponse.json(
        { error: 'Remplacement non trouvé' },
        { status: 404 }
      )
    }

    const dateObj = new Date(existing.date)
    const mois = dateObj.getMonth() + 1
    const annee = dateObj.getFullYear()
    const coachesToRecalc = [existing.coachRemplaceId, existing.coachRemplacantId].filter(Boolean) as string[]

    await prisma.ligneFactureCoach.deleteMany({
      where: { remplacementId: id },
    })

    await prisma.remplacement.delete({
      where: { id },
    })

    for (const cId of coachesToRecalc) {
      try {
        const f = await prisma.factureCoach.findUnique({
          where: { coachId_mois_annee: { coachId: cId, mois, annee } }
        })
        if (f && ['brouillon', 'generee'].includes(f.statut)) {
          const { calculerFactureCoach } = await import('@/lib/facture-calculations')
          const details = await calculerFactureCoach(cId, mois, annee)
          await prisma.factureCoach.update({
            where: { id: f.id },
            data: { montantTotal: details.totalMontant }
          })
        }
      } catch (err) {
        planningLogger.warn(`Erreur recalcul facture après suppression remplacement pour coach ${cId}`, err)
      }
    }

    return NextResponse.json({ message: 'Remplacement supprimé avec succès' })
  } catch (error) {
    planningLogger.error('Erreur lors de la suppression du remplacement', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
