import { NextRequest, NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/auth/session'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { clearChatbotKnowledgeCache } from '@/lib/chatbot-knowledge'

const adminLogger = logger.withContext('Admin')

// GET - Liste toutes les périodes de vacances
export async function GET(request: NextRequest) {
  try {
    const session = await getAdminSession()

    if (!session) {
      return NextResponse.json(
        { error: 'Non authentifié' },
        { status: 401 }
      )
    }

    // Récupérer les paramètres de requête
    const { searchParams } = new URL(request.url)
    const annee = searchParams.get('annee')

    // Construire le filtre
    const where: any = {}

    if (annee) {
      const anneeNum = parseInt(annee)
      const dateDebutAnnee = new Date(anneeNum, 0, 1)
      const dateFinAnnee = new Date(anneeNum, 11, 31, 23, 59, 59)

      where.OR = [
        {
          dateDebut: {
            gte: dateDebutAnnee,
            lte: dateFinAnnee,
          },
        },
        {
          dateFin: {
            gte: dateDebutAnnee,
            lte: dateFinAnnee,
          },
        },
        {
          AND: [
            { dateDebut: { lte: dateDebutAnnee } },
            { dateFin: { gte: dateFinAnnee } },
          ],
        },
      ]
    }

    const periodes = await prisma.periodeVacances.findMany({
      where,
      orderBy: {
        dateDebut: 'asc',
      },
    })

    return NextResponse.json(periodes)
  } catch (error) {
    adminLogger.error('Erreur lors de la récupération des périodes', error)
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}

// POST - Créer une nouvelle période de vacances
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
    const {
      nom,
      description,
      dateDebut,
      dateFin,
      type,
      impacteFacturation,
      couleur,
      actif,
    } = body

    // Validation
    if (!nom || !dateDebut || !dateFin) {
      return NextResponse.json(
        { error: 'Nom, date de début et date de fin sont requis' },
        { status: 400 }
      )
    }

    // Vérifier que dateDebut < dateFin
    const debut = new Date(dateDebut)
    const fin = new Date(dateFin)

    if (debut >= fin) {
      return NextResponse.json(
        { error: 'La date de début doit être avant la date de fin' },
        { status: 400 }
      )
    }

    // Créer la période
    const periode = await prisma.periodeVacances.create({
      data: {
        nom,
        description: description || null,
        dateDebut: debut,
        dateFin: fin,
        type: type || 'vacances',
        impacteFacturation: impacteFacturation !== false,
        couleur: couleur || null,
        actif: actif !== false,
      },
    })

    clearChatbotKnowledgeCache()

    return NextResponse.json(periode, { status: 201 })
  } catch (error) {
    adminLogger.error('Erreur lors de la création de la période', error)
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}
