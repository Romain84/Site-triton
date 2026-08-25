import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { groupeSchema } from '@/lib/validations'
import { apiSuccess } from '@/lib/api/response'
import { handleRouteError, requireAdmin } from '@/lib/api/guards'
import { clearChatbotKnowledgeCache } from '@/lib/chatbot-knowledge'

// PUT: Update a group
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAdmin()
    if (!auth.ok) return auth.response

    const { id } = await params
    const body = await request.json()
    const validatedData = groupeSchema.parse(body)

    const groupe = await prisma.groupe.update({
      where: { id },
      data: {
        nom: validatedData.nom,
        description: validatedData.description,
        ageMin: validatedData.ageMin,
        ageMax: validatedData.ageMax,
        total: validatedData.total,
        tarif: validatedData.tarif,
        tarif1Cours: validatedData.tarif1Cours,
        libelleOption1: validatedData.libelleOption1,
        libelleOption2: validatedData.libelleOption2,
        inscrits: validatedData.inscrits,
        inscrits1Cours: validatedData.inscrits1Cours,
        prixLicence: validatedData.prixLicence,
        prixFormationPSE: validatedData.prixFormationPSE,
        caution: validatedData.caution,
        niveau: validatedData.niveau,
        dateDebut: validatedData.dateDebut ? new Date(validatedData.dateDebut) : null,
        dateFin: validatedData.dateFin ? new Date(validatedData.dateFin) : null,
        tempsFacture: validatedData.tempsFacture,
        isCompetition: validatedData.isCompetition,
        nbCompetitions: validatedData.nbCompetitions,
        nbCompetitionsCaution: validatedData.nbCompetitionsCaution,
        couleur: validatedData.couleur,
        membresBureau: validatedData.membresBureau,
        enfantsBureau: validatedData.enfantsBureau,
        ordre: validatedData.ordre,
        actif: validatedData.actif,
        annule: validatedData.annule,
        complet: validatedData.complet,
      },
    })

    clearChatbotKnowledgeCache()

    return apiSuccess({ groupe })
  } catch (error) {
    return handleRouteError(error, 'Erreur lors de la mise à jour du groupe')
  }
}

// DELETE: Delete a group
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAdmin()
    if (!auth.ok) return auth.response

    const { id } = await params

    await prisma.groupe.delete({
      where: { id },
    })

    clearChatbotKnowledgeCache()

    return apiSuccess({ success: true })
  } catch (error) {
    return handleRouteError(error, 'Erreur lors de la suppression du groupe')
  }
}
