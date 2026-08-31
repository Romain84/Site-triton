import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/api/guards'
import { z } from 'zod'

const updateCandidatSchema = z.object({
  nom: z.string().min(1).optional(),
  prenom: z.string().min(1).optional(),
  dateNaissance: z.string().optional().nullable(),
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

    let parsedDateNaissance: Date | null | undefined = undefined
    if (validated.dateNaissance !== undefined) {
      parsedDateNaissance = validated.dateNaissance ? new Date(validated.dateNaissance) : null
    }

    const updated = await prisma.candidatTestNage.update({
      where: { id },
      data: {
        ...(validated.nom ? { nom: validated.nom.trim().toUpperCase() } : {}),
        ...(validated.prenom ? { prenom: validated.prenom.trim() } : {}),
        ...(parsedDateNaissance !== undefined ? { dateNaissance: parsedDateNaissance } : {}),
        ...(validated.age !== undefined ? { age: validated.age } : {}),
        ...(validated.nomParent !== undefined ? { nomParent: validated.nomParent ? validated.nomParent.trim() : null } : {}),
        ...(validated.emailParent !== undefined ? { emailParent: validated.emailParent ? validated.emailParent.trim().toLowerCase() : null } : {}),
        ...(validated.telephoneParent !== undefined ? { telephoneParent: validated.telephoneParent ? validated.telephoneParent.trim() : null } : {}),
        ...(validated.statut ? { statut: validated.statut } : {}),
        ...(validated.groupeRecommande !== undefined ? { groupeRecommande: validated.groupeRecommande } : {}),
        ...(validated.commentaireCoach !== undefined ? { commentaireCoach: validated.commentaireCoach } : {}),
      },
    })

    // Synchronisation en cascade sur toutes les inscriptions liées à ce candidat
    try {
      await prisma.inscriptionTestNage.updateMany({
        where: { candidatId: id },
        data: {
          ...(validated.nom ? { nomEnfant: validated.nom.trim().toUpperCase() } : {}),
          ...(validated.prenom ? { prenomEnfant: validated.prenom.trim() } : {}),
          ...(parsedDateNaissance !== undefined ? { dateNaissance: parsedDateNaissance } : {}),
          ...(validated.age !== undefined ? { age: validated.age } : {}),
          ...(validated.nomParent !== undefined ? { nomParent: validated.nomParent ? validated.nomParent.trim() : null } : {}),
          ...(validated.emailParent !== undefined && validated.emailParent ? { emailParent: validated.emailParent.trim().toLowerCase() } : {}),
          ...(validated.telephoneParent !== undefined && validated.telephoneParent ? { telephoneParent: validated.telephoneParent.trim() } : {}),
          ...(validated.groupeRecommande !== undefined ? { groupeRecommande: validated.groupeRecommande } : {}),
          ...(validated.commentaireCoach !== undefined ? { commentaireCoach: validated.commentaireCoach } : {}),
        },
      })
    } catch (syncErr) {
      console.warn('Erreur synchronisation inscriptions candidat:', syncErr)
    }

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
