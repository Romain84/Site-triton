import { NextRequest, NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/auth/session'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { clearChatbotKnowledgeCache } from '@/lib/chatbot-knowledge'

const planningLogger = logger.withContext('PlanningFixe')

// GET: List all fixed plannings
export async function GET() {
  try {
    const session = await getAdminSession()
    if (!session) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const plannings = await prisma.planning.findMany({
      include: {
        coachs: {
          include: {
            coach: {
              select: {
                id: true,
                prenom: true,
                nom: true,
              },
            },
          },
        },
        groupe: {
          select: {
            id: true,
            nom: true,
          },
        },
      },
      orderBy: [
        { jourSemaine: 'asc' },
        { heureDebut: 'asc' },
      ],
    })

    // Also get coaches and groups for dropdowns
    const [coaches, groupes] = await Promise.all([
      prisma.coach.findMany({
        where: { actif: true },
        select: { id: true, prenom: true, nom: true },
        orderBy: { prenom: 'asc' },
      }),
      prisma.groupe.findMany({
        where: { actif: true },
        select: { id: true, nom: true },
        orderBy: { nom: 'asc' },
      }),
    ])

    return NextResponse.json({ plannings, coaches, groupes })
  } catch (error) {
    planningLogger.error('Erreur lors de la récupération des plannings fixes', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

// POST: Create a new fixed planning
export async function POST(request: NextRequest) {
  try {
    const session = await getAdminSession()
    if (!session) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const body = await request.json()
    const { jourSemaine, heureDebut, heureFin, groupeId, coachIds = [], lieu, couleur } = body

    if (!jourSemaine || !heureDebut || !heureFin || !groupeId) {
      return NextResponse.json(
        { error: 'Jour, heures et groupe sont requis' },
        { status: 400 }
      )
    }

    const planning = await prisma.planning.create({
      data: {
        jourSemaine,
        heureDebut,
        heureFin,
        groupeId,
        lieu: lieu || 'Piscine de Cavaillon',
        couleur: couleur || '#00bcd4',
        actif: true,
        coachs: {
          create: coachIds.map((coachId: string) => ({ coachId })),
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
    planningLogger.error('Erreur lors de la création du planning fixe', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
