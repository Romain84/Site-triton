import { NextRequest, NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/auth/session'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { clearChatbotKnowledgeCache } from '@/lib/chatbot-knowledge'
import { sanitizeOccupations, calculerAmplitude } from '@/lib/planning-occupations'

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
    const { jourSemaine, groupeId, coachIds = [], couleur, actif, nomSession, semaineImpaire, tempsFacture } = body
    let { heureDebut, heureFin, lieu } = body

    const parsedTempsFacture = tempsFacture !== undefined 
      ? (tempsFacture !== null && tempsFacture !== '' ? parseInt(String(tempsFacture), 10) : null)
      : undefined

    const existant = await prisma.planning.findUnique({
      where: { id },
      include: { occupations: { orderBy: { ordre: 'asc' } } },
    })
    if (!existant) {
      return NextResponse.json({ error: 'Séance introuvable' }, { status: 404 })
    }

    // Espaces occupés :
    // - fournis par le formulaire -> ils remplacent les anciens et définissent les horaires globaux
    // - non fournis et séance mono-espace -> l'espace unique suit le lieu et les horaires (glisser-déposer, édition rapide)
    // - non fournis et séance multi-espaces -> espaces et horaires globaux conservés
    let nouvellesOccupations: { espace: string; heureDebut: string; heureFin: string }[] | null = null
    if (Array.isArray(body.occupations)) {
      nouvellesOccupations = sanitizeOccupations(body.occupations)
      const amplitude = calculerAmplitude(nouvellesOccupations)
      if (amplitude) {
        heureDebut = amplitude.heureDebut
        heureFin = amplitude.heureFin
        lieu = nouvellesOccupations[0].espace
      }
    } else if (existant.occupations.length > 1) {
      heureDebut = existant.heureDebut
      heureFin = existant.heureFin
      lieu = existant.lieu
    }
    const debutFinal = heureDebut || existant.heureDebut
    const finFinal = heureFin || existant.heureFin
    const lieuFinal = lieu ?? existant.lieu
    if (!nouvellesOccupations || nouvellesOccupations.length === 0) {
      if (existant.occupations.length <= 1) {
        nouvellesOccupations = [{ espace: lieuFinal || 'Piscine de Cavaillon', heureDebut: debutFinal, heureFin: finFinal }]
      } else {
        nouvellesOccupations = null
      }
    }

    // Update planning and replace coach assignments
    const planning = await prisma.planning.update({
      where: { id },
      data: {
        jourSemaine,
        heureDebut: debutFinal,
        heureFin: finFinal,
        groupeId,
        lieu: lieuFinal,
        couleur,
        nomSession: nomSession || null,
        semaineImpaire: semaineImpaire !== undefined ? Boolean(semaineImpaire) : false,
        ...(parsedTempsFacture !== undefined && {
          tempsFacture: Number.isFinite(parsedTempsFacture) ? parsedTempsFacture : null
        }),
        actif,
        coachs: {
          deleteMany: {}, // Remove all existing coach assignments
          create: coachIds.map((coachId: string) => ({ coachId })), // Create new assignments
        },
        ...(nouvellesOccupations && {
          occupations: {
            deleteMany: {},
            create: nouvellesOccupations.map((o, ordre) => ({ ...o, ordre })),
          },
        }),
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
