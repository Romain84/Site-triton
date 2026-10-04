import { NextRequest, NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/auth/session'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { clearChatbotKnowledgeCache } from '@/lib/chatbot-knowledge'
import { sanitizeOccupations, calculerAmplitude } from '@/lib/planning-occupations'

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
            couleur: true,
          },
        },
        occupations: { orderBy: { ordre: 'asc' } },
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
        select: { id: true, nom: true, couleur: true },
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
    const { jourSemaine, groupeId, coachIds = [], lieu, couleur, nomSession, semaineImpaire, tempsFacture } = body
    let { heureDebut, heureFin } = body

    // Espaces occupés : si fournis, ils définissent les horaires globaux de la séance
    let occupations = sanitizeOccupations(body.occupations)
    const amplitude = calculerAmplitude(occupations)
    if (amplitude) {
      heureDebut = amplitude.heureDebut
      heureFin = amplitude.heureFin
    }

    if (!jourSemaine || !heureDebut || !heureFin || !groupeId) {
      return NextResponse.json(
        { error: 'Jour, heures et groupe sont requis' },
        { status: 400 }
      )
    }

    const lieuFinal = occupations[0]?.espace || lieu || 'Piscine de Cavaillon'
    if (occupations.length === 0) {
      occupations = [{ espace: lieuFinal, heureDebut, heureFin }]
    }

    const parsedTempsFacture = tempsFacture !== undefined && tempsFacture !== null && tempsFacture !== '' 
      ? parseInt(String(tempsFacture), 10) 
      : null

    const planning = await prisma.planning.create({
      data: {
        jourSemaine,
        heureDebut,
        heureFin,
        groupeId,
        lieu: lieuFinal,
        couleur: couleur || '#00bcd4',
        nomSession: nomSession || null,
        semaineImpaire: Boolean(semaineImpaire),
        tempsFacture: Number.isFinite(parsedTempsFacture) ? parsedTempsFacture : null,
        actif: true,
        coachs: {
          create: coachIds.map((coachId: string) => ({ coachId })),
        },
        occupations: {
          create: occupations.map((o, ordre) => ({ ...o, ordre })),
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
          select: { id: true, nom: true, couleur: true },
        },
        occupations: { orderBy: { ordre: 'asc' } },
      },
    })

    clearChatbotKnowledgeCache()

    return NextResponse.json({ planning })
  } catch (error) {
    planningLogger.error('Erreur lors de la création du planning fixe', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
