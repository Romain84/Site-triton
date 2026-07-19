import { NextRequest, NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/auth/session'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { clearChatbotKnowledgeCache } from '@/lib/chatbot-knowledge'

const planningLogger = logger.withContext('PlanningFixe')

// PUT: Update a fixed planning
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
    const { jourSemaine, heureDebut, heureFin, groupeId, coachIds = [], lieu, couleur, actif, nomSession } = body

    // Update planning and replace coach assignments
    const planning = await prisma.planning.update({
      where: { id },
      data: {
        jourSemaine,
        heureDebut,
        heureFin,
        groupeId,
        lieu,
        couleur,
        nomSession: nomSession || null,
        actif,
        coachs: {
          deleteMany: {}, // Remove all existing coach assignments
          create: coachIds.map((coachId: string) => ({ coachId })), // Create new assignments
        },
      },
      include: {
        coachs: {
          include: {
            coach: {
              select: { id: true, prenom: true, nom: true },
            },
          },
        },
        groupe: {
          select: { id: true, nom: true },
        },
      },
    })

    clearChatbotKnowledgeCache()

    return NextResponse.json({ planning })
  } catch (error) {
    planningLogger.error('Erreur lors de la mise à jour du planning fixe', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

// DELETE: Delete a fixed planning
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

    await prisma.planning.delete({
      where: { id },
    })

    clearChatbotKnowledgeCache()

    return NextResponse.json({ success: true })
  } catch (error) {
    planningLogger.error('Erreur lors de la suppression du planning fixe', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
