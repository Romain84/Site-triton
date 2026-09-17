import { NextRequest, NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/auth/session'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { clearChatbotKnowledgeCache } from '@/lib/chatbot-knowledge'
import { syncTournantBilling } from '@/lib/services/tournant-service'

const planningLogger = logger.withContext('PlanningTournant')

// GET: List all rotating events
export async function GET() {
  try {
    const session = await getAdminSession()
    if (!session) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const evenements = await prisma.evenementTournant.findMany({
      include: {
        coach: {
          select: {
            id: true,
            prenom: true,
            nom: true,
          },
        },
        groupe: {
          select: {
            id: true,
            nom: true,
          },
        },
        groupes: {
          select: {
            id: true,
            nom: true,
          },
        },
      },
      orderBy: { date: 'desc' },
    })

    // Also get groups and active coaches for dropdowns
    const [groupes, coaches] = await Promise.all([
      prisma.groupe.findMany({
        where: { actif: true },
        select: { id: true, nom: true },
        orderBy: { nom: 'asc' },
      }),
      prisma.coach.findMany({
        where: { actif: true },
        select: { id: true, prenom: true, nom: true },
        orderBy: [{ prenom: 'asc' }, { nom: 'asc' }],
      }),
    ])

    return NextResponse.json({ evenements, groupes, coaches })
  } catch (error) {
    planningLogger.error('Erreur lors de la récupération des événements tournants', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

// POST: Create a new rotating event
export async function POST(request: NextRequest) {
  try {
    const session = await getAdminSession()
    if (!session) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const body = await request.json()
    const { titre, date, heureDebut, heureFin, description, lieu, groupeId, groupeIds, coachId } = body

    if (!titre || !date || !heureDebut || !heureFin) {
      return NextResponse.json(
        { error: 'Titre, date, heure de début et heure de fin sont requis' },
        { status: 400 }
      )
    }

    // Resolve which group IDs to link
    const targetGroupIds = Array.isArray(groupeIds) && groupeIds.length > 0 
      ? groupeIds 
      : (groupeId ? [groupeId] : [])

    const evenement = await prisma.evenementTournant.create({
      data: {
        titre,
        date: new Date(date),
        heureDebut,
        heureFin,
        description,
        lieu,
        actif: true,
        coachId: coachId || null,
        // Set the primary groupeId for database compatibility
        groupeId: targetGroupIds[0] || null,
        // Connect many-to-many groups
        groupes: {
          connect: targetGroupIds.map(id => ({ id }))
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

    if (coachId) {
      await syncTournantBilling([coachId], date)
    }

    clearChatbotKnowledgeCache()

    return NextResponse.json({ evenement })
  } catch (error) {
    planningLogger.error('Erreur lors de la création de l\'événement tournant', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
