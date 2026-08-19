import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/api/guards'
import { z } from 'zod'

const updateInscriptionSchema = z.object({
  creneauId: z.string().optional(),
  statut: z.enum(['inscrit', 'present', 'absent', 'annule']).optional(),
  groupeRecommande: z.string().nullable().optional(),
  commentaireCoach: z.string().nullable().optional(),
  nomEnfant: z.string().optional(),
  prenomEnfant: z.string().optional(),
  age: z.number().int().nullable().optional(),
  nomParent: z.string().nullable().optional(),
  emailParent: z.string().optional(),
  telephoneParent: z.string().optional(),
})

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const auth = await requireAdmin()
    if (!auth.ok) return auth.response

    const { id } = await params
    const body = await request.json()
    const validated = updateInscriptionSchema.parse(body)

    const updated = await prisma.inscriptionTestNage.update({
      where: { id },
      data: {
        ...(validated.creneauId ? { creneauId: validated.creneauId } : {}),
        ...(validated.statut ? { statut: validated.statut } : {}),
        groupeRecommande: validated.groupeRecommande,
        commentaireCoach: validated.commentaireCoach,
        ...(validated.nomEnfant ? { nomEnfant: validated.nomEnfant.toUpperCase() } : {}),
        ...(validated.prenomEnfant ? { prenomEnfant: validated.prenomEnfant } : {}),
        age: validated.age,
        nomParent: validated.nomParent,
        ...(validated.emailParent ? { emailParent: validated.emailParent.toLowerCase() } : {}),
        ...(validated.telephoneParent ? { telephoneParent: validated.telephoneParent } : {}),
      },
    })

    // Mettre à jour également le candidat associé s'il existe
    if (updated.candidatId) {
      await prisma.candidatTestNage.update({
        where: { id: updated.candidatId },
        data: {
          statut: updated.statut === 'annule' ? 'a_planifier' : updated.statut,
          groupeRecommande: updated.groupeRecommande,
          commentaireCoach: updated.commentaireCoach,
        },
      })
    }

    return NextResponse.json({
      success: true,
      inscription: updated,
    })
  } catch (error) {
    console.error('Erreur PUT inscription test de nage:', error)
    return NextResponse.json({ error: 'Erreur lors de la mise à jour' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const auth = await requireAdmin()
    if (!auth.ok) return auth.response

    const { id } = await params

    const inscription = await prisma.inscriptionTestNage.findUnique({
      where: { id },
    })

    if (inscription?.candidatId) {
      await prisma.candidatTestNage.update({
        where: { id: inscription.candidatId },
        data: { statut: 'a_planifier' },
      })
    }

    await prisma.inscriptionTestNage.delete({
      where: { id },
    })

    return NextResponse.json({
      success: true,
      message: 'Inscription supprimée avec succès',
    })
  } catch (error) {
    console.error('Erreur DELETE inscription test de nage:', error)
    return NextResponse.json({ error: 'Erreur lors de la suppression' }, { status: 500 })
  }
}
