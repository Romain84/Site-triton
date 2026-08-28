import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/api/guards'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const associerSchema = z.object({
  inscriptionId: z.string().min(1, "L'identifiant de l'inscription est requis"),
  targetCandidatId: z.string().min(1, 'Le candidat cible est requis'),
})

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdmin()
    if (!auth.ok) return auth.response

    const body = await request.json()
    const validated = associerSchema.parse(body)

    const result = await prisma.$transaction(async (tx) => {
      // 1. Récupérer l'inscription existante
      const inscription = await tx.inscriptionTestNage.findUnique({
        where: { id: validated.inscriptionId },
        include: { creneau: true, candidat: true },
      })

      if (!inscription) {
        throw new Error('Inscription introuvable.')
      }

      // 2. Récupérer le vrai candidat issu du listing
      const targetCandidat = await tx.candidatTestNage.findUnique({
        where: { id: validated.targetCandidatId },
      })

      if (!targetCandidat) {
        throw new Error('Candidat cible introuvable dans le listing.')
      }

      // 3. Déterminer si le nom initialement renseigné était le nom du parent
      const parentName = inscription.nomParent || 
        (inscription.nomEnfant.toUpperCase() !== targetCandidat.nom.toUpperCase() || 
         inscription.prenomEnfant.toLowerCase() !== targetCandidat.prenom.toLowerCase()
          ? `${inscription.prenomEnfant} ${inscription.nomEnfant}`
          : targetCandidat.nomParent)

      // 4. Si l'inscription était liée à un faux candidat "hors_listing" auto-généré, on le nettoie
      if (inscription.candidatId && inscription.candidatId !== targetCandidat.id) {
        const oldCandidat = await tx.candidatTestNage.findUnique({
          where: { id: inscription.candidatId },
        })
        if (oldCandidat && oldCandidat.statut === 'hors_listing') {
          await tx.candidatTestNage.delete({
            where: { id: inscription.candidatId },
          })
        }
      }

      // 5. Mettre à jour l'inscription avec les coordonnées du vrai enfant
      const updatedInscription = await tx.inscriptionTestNage.update({
        where: { id: validated.inscriptionId },
        data: {
          candidatId: targetCandidat.id,
          nomEnfant: targetCandidat.nom,
          prenomEnfant: targetCandidat.prenom,
          age: targetCandidat.age ?? inscription.age,
          dateNaissance: targetCandidat.dateNaissance ?? inscription.dateNaissance,
          statut: 'inscrit', // Retrait du statut 'hors_listing'
          nomParent: parentName || null,
        },
      })

      // 6. Mettre à jour le vrai candidat pour le passer à 'planifie'
      const updatedCandidat = await tx.candidatTestNage.update({
        where: { id: targetCandidat.id },
        data: {
          statut: 'planifie',
          emailParent: inscription.emailParent || targetCandidat.emailParent,
          telephoneParent: inscription.telephoneParent || targetCandidat.telephoneParent,
          nomParent: parentName || targetCandidat.nomParent,
        },
      })

      return {
        inscription: updatedInscription,
        candidat: updatedCandidat,
      }
    })

    return NextResponse.json({
      success: true,
      message: `L'inscription a été associée avec succès à ${result.candidat.prenom} ${result.candidat.nom} !`,
      data: result,
    })
  } catch (error: any) {
    console.error('Erreur association candidat test de nage:', error)
    return NextResponse.json(
      { error: error?.message || "Erreur lors de l'association du candidat" },
      { status: 400 }
    )
  }
}
