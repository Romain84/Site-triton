import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/api/guards'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const adminInscriptionSchema = z.object({
  creneauId: z.string().min(1, 'Le créneau est requis'),
  candidatId: z.string().optional().nullable(),
  nomEnfant: z.string().min(2, "Le nom de l'enfant est requis"),
  prenomEnfant: z.string().min(2, "Le prénom de l'enfant est requis"),
  age: z.number().int().optional().nullable(),
  dateNaissance: z.string().optional().nullable(),
  nomParent: z.string().optional().nullable(),
  emailParent: z.string().email('Email invalide').optional().or(z.literal('')).nullable(),
  telephoneParent: z.string().optional().nullable(),
  niveauEstime: z.string().optional().nullable(),
  remarques: z.string().optional().nullable(),
})

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdmin()
    if (!auth.ok) return auth.response

    const body = await request.json()
    const validated = adminInscriptionSchema.parse(body)

    const result = await prisma.$transaction(async (tx) => {
      const creneau = await tx.creneauTestNage.findUnique({
        where: { id: validated.creneauId },
        include: {
          inscriptions: {
            where: { statut: { not: 'annule' } },
          },
        },
      })

      if (!creneau) {
        throw new Error('Créneau introuvable.')
      }

      const inscription = await tx.inscriptionTestNage.create({
        data: {
          creneauId: validated.creneauId,
          candidatId: validated.candidatId || null,
          nomEnfant: validated.nomEnfant.trim().toUpperCase(),
          prenomEnfant: validated.prenomEnfant.trim(),
          age: validated.age || null,
          dateNaissance: validated.dateNaissance ? new Date(validated.dateNaissance) : null,
          nomParent: validated.nomParent ? validated.nomParent.trim() : null,
          emailParent: validated.emailParent ? validated.emailParent.trim().toLowerCase() : '',
          telephoneParent: validated.telephoneParent ? validated.telephoneParent.trim() : '',
          niveauEstime: validated.niveauEstime || null,
          remarques: validated.remarques || null,
          statut: 'inscrit',
        },
      })

      if (validated.candidatId) {
        await tx.candidatTestNage.update({
          where: { id: validated.candidatId },
          data: { statut: 'planifie' },
        })
      }

      return inscription
    })

    return NextResponse.json({
      success: true,
      inscription: result,
    })
  } catch (error: any) {
    console.error('Erreur POST admin inscription test de nage:', error)
    return NextResponse.json(
      { error: error?.message || "Erreur lors de l'enregistrement manuel" },
      { status: 400 }
    )
  }
}
