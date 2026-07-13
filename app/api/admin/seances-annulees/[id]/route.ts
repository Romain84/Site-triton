import { NextRequest, NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/auth/session'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { logAdminAudit } from '@/lib/admin-audit'

const adminLogger = logger.withContext('Admin')

// DELETE - Supprimer une séance annulée
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

    const seanceExistante = await prisma.seanceAnnulee.findUnique({
      where: { id },
    })

    if (!seanceExistante) {
      return NextResponse.json(
        { error: 'Séance annulée non trouvée' },
        { status: 404 }
      )
    }

    await prisma.seanceAnnulee.delete({
      where: { id },
    })

    // Log the sensitive admin action
    logAdminAudit({
      action: 'seance_annulee.delete',
      actorId: session.userId,
      actorRole: session.role,
      targetType: 'seance_annulee',
      targetId: id,
      details: {
        date: seanceExistante.date,
        motif: seanceExistante.motif,
        planningId: seanceExistante.planningId,
        groupeId: seanceExistante.groupeId,
        coachId: seanceExistante.coachId,
      },
    })

    return NextResponse.json({ message: 'Séance annulée supprimée avec succès' })
  } catch (error) {
    adminLogger.error('Erreur lors de la suppression de la séance annulée', error)
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}
