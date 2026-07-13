import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { groupeSchema } from '@/lib/validations'
import { apiError, apiSuccess } from '@/lib/api/response'
import { handleRouteError, requireAdmin } from '@/lib/api/guards'
import { z } from 'zod'
import { clearChatbotKnowledgeCache } from '@/lib/chatbot-knowledge'

export async function GET() {
  try {
    const auth = await requireAdmin()
    if (!auth.ok) return auth.response

    const groupes = await prisma.groupe.findMany({
      orderBy: { nom: 'asc' },
    })

    return apiSuccess({ groupes })
  } catch (error) {
    return handleRouteError(error, 'Erreur lors de la récupération des groupes')
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdmin()
    if (!auth.ok) return auth.response

    const body = await request.json()
    const validatedData = groupeSchema.parse(body)

    const groupe = await prisma.groupe.create({
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
        inscrits1Cours: validatedData.inscrits1Cours,
        prixLicence: validatedData.prixLicence,
        caution: validatedData.caution,
        niveau: validatedData.niveau,
        dateDebut: validatedData.dateDebut ? new Date(validatedData.dateDebut) : null,
        dateFin: validatedData.dateFin ? new Date(validatedData.dateFin) : null,
        tempsFacture: validatedData.tempsFacture,
        isCompetition: validatedData.isCompetition,
        nbCompetitions: validatedData.nbCompetitions,
        membresBureau: validatedData.membresBureau,
        enfantsBureau: validatedData.enfantsBureau,
        ordre: validatedData.ordre,
        actif: validatedData.actif,
      },
    })

    clearChatbotKnowledgeCache()

    return apiSuccess({ groupe }, 201)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return apiError('Données invalides', 400, error.flatten(), 'VALIDATION_ERROR')
    }
    return handleRouteError(error, 'Erreur lors de la création du groupe')
  }
}
