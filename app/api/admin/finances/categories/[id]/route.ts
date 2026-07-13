import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { apiError, apiSuccess } from '@/lib/api/response'
import { handleRouteError, requireAdmin } from '@/lib/api/guards'

const updateCategorySchema = z.object({
  nom: z.string().min(1, 'Le nom est requis').max(100),
  type: z.enum(['recette', 'depense', 'double']),
})

interface Params {
  params: Promise<{
    id: string
  }>
}

export async function PUT(
  request: NextRequest,
  { params }: Params
) {
  try {
    const auth = await requireAdmin()
    if (!auth.ok) return auth.response
    if (auth.session.role !== 'admin') {
      return apiError('Accès interdit - Administrateur requis', 403)
    }

    const { id } = await params
    const body = await request.json()

    const validation = updateCategorySchema.safeParse(body)
    if (!validation.success) {
      return apiError('Données invalides', 400, validation.error.flatten())
    }

    const { nom, type } = validation.data

    const categoryToUpdate = await prisma.categorieComptable.findUnique({ where: { id } })
    if (!categoryToUpdate) {
      return apiError('Catégorie introuvable', 404)
    }

    // Préparer les données d'update
    const updateData: any = {
      nom: nom.trim(),
    }

    // Si c'est une catégorie système, on empêche de changer son type
    if (categoryToUpdate.systeme) {
      if (type !== categoryToUpdate.type) {
        return apiError('Impossible de modifier le type d\'une catégorie système', 400)
      }
    } else {
      updateData.type = type
    }

    const category = await prisma.categorieComptable.update({
      where: { id },
      data: updateData,
    })

    return apiSuccess({ category })
  } catch (error) {
    return handleRouteError(error, 'Erreur lors de la mise à jour de la catégorie')
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: Params
) {
  try {
    const auth = await requireAdmin()
    if (!auth.ok) return auth.response
    if (auth.session.role !== 'admin') {
      return apiError('Accès interdit - Administrateur requis', 403)
    }

    const { id } = await params

    const categoryToDelete = await prisma.categorieComptable.findUnique({ where: { id } })
    if (!categoryToDelete) {
      return apiError('Catégorie introuvable', 404)
    }

    // Sécurité : Impossible de supprimer une catégorie système
    if (categoryToDelete.systeme) {
      return apiError('Impossible de supprimer une catégorie système', 400)
    }

    // Sécurité : Vérifier si des transactions y sont rattachées
    const transactionsCount = await prisma.transactionComptable.count({
      where: { categorie: categoryToDelete.code },
    })

    if (transactionsCount > 0) {
      return apiError(
        `Cette catégorie est utilisée par ${transactionsCount} transaction(s) comptable(s) et ne peut pas être supprimée.`,
        400,
        undefined,
        'HAS_TRANSACTIONS'
      )
    }

    await prisma.categorieComptable.delete({ where: { id } })

    return apiSuccess({ message: 'Catégorie supprimée avec succès' })
  } catch (error) {
    return handleRouteError(error, 'Erreur lors de la suppression de la catégorie')
  }
}
