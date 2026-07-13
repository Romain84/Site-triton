import { NextRequest, NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/auth/session'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { clearChatbotKnowledgeCache } from '@/lib/chatbot-knowledge'

const adminLogger = logger.withContext('Admin')

// PUT - Modifier une période de vacances
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getAdminSession()

    if (!session) {
      return NextResponse.json(
        { error: 'Non authentifié' },
        { status: 401 }
      )
    }

    const { id } = await params
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

    // Vérifier que la période existe
    const periodeExistante = await prisma.periodeVacances.findUnique({
      where: { id },
    })

    if (!periodeExistante) {
      return NextResponse.json(
        { error: 'Période non trouvée' },
        { status: 404 }
      )
    }

    // Validation si les dates sont fournies
    if (dateDebut && dateFin) {
      const debut = new Date(dateDebut)
      const fin = new Date(dateFin)

      if (debut >= fin) {
        return NextResponse.json(
          { error: 'La date de début doit être avant la date de fin' },
          { status: 400 }
        )
      }
    }

    // Mettre à jour la période
    const data: any = {}
    if (nom !== undefined) data.nom = nom
    if (description !== undefined) data.description = description || null
    if (dateDebut !== undefined) data.dateDebut = new Date(dateDebut)
    if (dateFin !== undefined) data.dateFin = new Date(dateFin)
    if (type !== undefined) data.type = type
    if (impacteFacturation !== undefined) data.impacteFacturation = impacteFacturation
    if (couleur !== undefined) data.couleur = couleur || null
    if (actif !== undefined) data.actif = actif

    const periode = await prisma.periodeVacances.update({
      where: { id },
      data,
    })

    clearChatbotKnowledgeCache()

    return NextResponse.json(periode)
  } catch (error) {
    adminLogger.error('Erreur lors de la modification de la période', error)
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}

// DELETE - Supprimer une période de vacances
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getAdminSession()

    if (!session) {
      return NextResponse.json(
        { error: 'Non authentifié' },
        { status: 401 }
      )
    }

    const { id } = await params

    // Vérifier que la période existe
    const periodeExistante = await prisma.periodeVacances.findUnique({
      where: { id },
    })

    if (!periodeExistante) {
      return NextResponse.json(
        { error: 'Période non trouvée' },
        { status: 404 }
      )
    }

    // Supprimer la période
    await prisma.periodeVacances.delete({
      where: { id },
    })

    clearChatbotKnowledgeCache()

    return NextResponse.json({ message: 'Période supprimée avec succès' })
  } catch (error) {
    adminLogger.error('Erreur lors de la suppression de la période', error)
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}
