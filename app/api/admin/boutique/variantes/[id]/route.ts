import { NextRequest } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { getAdminSession } from '@/lib/auth/session'
import { logger } from '@/lib/logger'
import { apiError, apiSuccess } from '@/lib/api/response'
import { isSameOriginRequest } from '@/lib/security/origin'

const boutiqueLogger = logger.withContext('Boutique')

const updateVarianteSchema = z.object({
  taille: z.string().trim().optional().nullable(),
  couleur: z.string().trim().optional().nullable(),
  sku: z.string().trim().optional().nullable(),
  prix: z.union([z.coerce.number(), z.null()]).optional(),
  prixCoutantHT: z.coerce.number().min(0).optional(),
  prixFlocageHT: z.coerce.number().min(0).optional(),
  tauxTVA: z.coerce.number().min(0).max(100).optional(),
  stock: z.coerce.number().int().min(0).optional(),
  image: z.string().trim().optional().nullable(),
  actif: z.boolean().optional(),
})

// PUT: Modifier une variante
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!isSameOriginRequest(request)) {
      return apiError('Origine non autorisée', 403, undefined, 'FORBIDDEN_ORIGIN')
    }

    const session = await getAdminSession()
    if (!session) {
      return apiError('Non authentifié', 401, undefined, 'UNAUTHENTICATED')
    }

    const { id } = await params
    const body = await request.json()

    const validation = updateVarianteSchema.safeParse(body)
    if (!validation.success) {
      return apiError('Données invalides', 400, validation.error.flatten(), 'VALIDATION_ERROR')
    }

    const data = validation.data

    const variante = await prisma.varianteProduit.update({
      where: { id },
      data: {
        ...(data.taille !== undefined ? { taille: data.taille } : {}),
        ...(data.couleur !== undefined ? { couleur: data.couleur } : {}),
        ...(data.sku !== undefined ? { sku: data.sku } : {}),
        ...(data.prix !== undefined ? { prix: data.prix } : {}),
        ...(data.prixCoutantHT !== undefined ? { prixCoutantHT: data.prixCoutantHT } : {}),
        ...(data.prixFlocageHT !== undefined ? { prixFlocageHT: data.prixFlocageHT } : {}),
        ...(data.tauxTVA !== undefined ? { tauxTVA: data.tauxTVA } : {}),
        ...(data.stock !== undefined ? { stock: data.stock } : {}),
        ...(data.image !== undefined ? { image: data.image } : {}),
        ...(data.actif !== undefined ? { actif: data.actif } : {}),
      },
    })

    return apiSuccess({ variante })
  } catch (error) {
    boutiqueLogger.error('Erreur lors de la mise à jour de la variante', error)
    return apiError('Erreur serveur', 500, undefined, 'INTERNAL_SERVER_ERROR')
  }
}

// DELETE: Supprimer une variante
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!isSameOriginRequest(request)) {
      return apiError('Origine non autorisée', 403, undefined, 'FORBIDDEN_ORIGIN')
    }

    const session = await getAdminSession()
    if (!session) {
      return apiError('Non authentifié', 401, undefined, 'UNAUTHENTICATED')
    }

    const { id } = await params

    await prisma.varianteProduit.delete({
      where: { id },
    })

    return apiSuccess({ message: 'Variante supprimée' })
  } catch (error) {
    boutiqueLogger.error('Erreur lors de la suppression de la variante', error)
    return apiError('Erreur serveur', 500, undefined, 'INTERNAL_SERVER_ERROR')
  }
}
