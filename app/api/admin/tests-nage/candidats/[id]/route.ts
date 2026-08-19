import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/api/guards'
import { z } from 'zod'

const updateCandidatSchema = z.object({
  nom: z.string().min(1).optional(),
  prenom: z.string().min(1).optional(),
  age: z.number().int().optional().nullable(),
  nomParent: z.string().optional().nullable(),
  emailParent: z.string().optional().nullable(),
  telephoneParent: z.string().optional().nullable(),
  statut: z.string().optional(),
  groupeRecommande: z.string().optional().nullable(),
  commentaireCoach: z.string().optional().nullable(),
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
    const validated = updateCandidatSchema.parse(body)

    const updated = await prisma.candidatTestNage.update({
      where: { id },
      data: {
        ...(validated.nom ? { nom: validated.nom.toUpperCase() } : {}),
        ...(validated.prenom ? { prenom: validated.prenom } : {}),
        age: validated.age,
        nomParent: validated.nomParent,
        emailParent: validated.emailParent,
        telephoneParent: validated.telephoneParent,
        statut: validated.statut,
        groupeRecommande: validated.groupeRecommande,
        commentaireCoach: validated.commentaireCoach,
      },
    })

    return NextResponse.json({
      success: true,
      candidat: updated,
    })
  } catch (error) {
    console.error('Erreur PUT candidat:', error)
    return NextResponse.json({ error: 'Erreur lors de la mise à jour' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const auth = await requireAdmin()
    if (!auth.ok) return auth.response

    const { id } = await params

    await prisma.candidatTestNage.delete({
      where: { id },
    })

    return NextResponse.json({
      success: true,
      message: 'Candidat supprimé avec succès',
    })
  } catch (error) {
    console.error('Erreur DELETE candidat:', error)
    return NextResponse.json({ error: 'Erreur lors de la suppression' }, { status: 500 })
  }
}
