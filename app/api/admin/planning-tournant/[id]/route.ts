import { NextRequest, NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/auth/session'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { clearChatbotKnowledgeCache } from '@/lib/chatbot-knowledge'
import { syncTournantBilling } from '@/lib/services/tournant-service'

const planningLogger = logger.withContext('PlanningTournant')

// PUT: Update a rotating event
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
    const { titre, date, heureDebut, heureFin, description, lieu, actif, coachId, groupeId, groupeIds } = body

    const existingEvent = await prisma.evenementTournant.findUnique({
      where: { id },
      select: { coachId: true, date: true },
    })

    const targetGroupIds = Array.isArray(groupeIds) 
      ? groupeIds 
      : (groupeId ? [groupeId] : [])

    const evenement = await prisma.evenementTournant.update({
      where: { id },
      data: {
        titre,
        date: new Date(date),
        heureDebut,
        heureFin,
        description,
        lieu,
        actif,
        coachId: coachId || null,
        groupeId: targetGroupIds[0] || null,
        groupes: {
          set: targetGroupIds.map(id => ({ id }))
        }
      },
      include: {
        coach: {
          select: { id: true, prenom: true, nom: true },
        },
        groupe: {
          select: { id: true, nom: true },
        },
        groupes: {
          select: { id: true, nom: true },
        },
      },
    })

    const coachesToSync = [existingEvent?.coachId, coachId].filter(Boolean)
    if (coachesToSync.length > 0) {
      await syncTournantBilling(coachesToSync, date || existingEvent?.date)
    }

    clearChatbotKnowledgeCache()

    return NextResponse.json({ evenement })
  } catch (error) {
    planningLogger.error('Erreur lors de la mise à jour de l\'événement tournant', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

// DELETE: Delete a rotating event
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

    const existingEvent = await prisma.evenementTournant.findUnique({
      where: { id },
      select: { coachId: true, date: true },
    })

    await prisma.evenementTournant.delete({
      where: { id },
    })

    if (existingEvent?.coachId) {
      await syncTournantBilling([existingEvent.coachId], existingEvent.date)
    }

    clearChatbotKnowledgeCache()

    return NextResponse.json({ success: true })
  } catch (error) {
    planningLogger.error('Erreur lors de la suppression de l\'événement tournant', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
