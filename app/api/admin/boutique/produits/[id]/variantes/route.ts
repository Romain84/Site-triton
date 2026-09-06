import { NextRequest } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { getAdminSession } from '@/lib/auth/session'
import { logger } from '@/lib/logger'
import { apiError, apiSuccess } from '@/lib/api/response'
import { isSameOriginRequest } from '@/lib/security/origin'

import { sortVariantes } from '@/lib/boutique/sizes'

const boutiqueLogger = logger.withContext('Boutique')

const createVarianteSchema = z.object({
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

// GET: Récupérer toutes les variantes d'un produit
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getAdminSession()
    if (!session) {
      return apiError('Non authentifié', 401, undefined, 'UNAUTHENTICATED')
    }

    const { id } = await params

    const rawVariantes = await prisma.varianteProduit.findMany({
      where: { produitId: id },
    })

    const variantes = sortVariantes(rawVariantes)

    return apiSuccess({ variantes })
  } catch (error) {
    boutiqueLogger.error('Erreur lors de la récupération des variantes', error)
    return apiError('Erreur serveur', 500, undefined, 'INTERNAL_SERVER_ERROR')
  }
}

// POST: Créer une ou plusieurs variantes (mode unitaire ou en masse)
export async function POST(
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

    // Gestion du mode en masse (bulk)
    if (body.bulk) {
      const { tailles, couleurs } = body
      if (!Array.isArray(tailles) || !Array.isArray(couleurs)) {
        return apiError('Les tailles et couleurs doivent être des tableaux', 400, undefined, 'VALIDATION_ERROR')
      }

      const produit = await prisma.produit.findUnique({
        where: { id },
      })

      if (!produit) {
        return apiError('Produit non trouvé', 404, undefined, 'NOT_FOUND')
      }

      const createdVariantes = []
      const listTailles = tailles.length > 0 ? tailles : ['']
      const listCouleurs = couleurs.length > 0 ? couleurs : ['']

      for (const t of listTailles) {
        for (const c of listCouleurs) {
          const cleanTaille = t.trim()
          const cleanCouleur = c.trim()
          if (!cleanTaille && !cleanCouleur) continue

          // Vérifier si la variante existe déjà
          const existing = await prisma.varianteProduit.findFirst({
            where: {
              produitId: id,
              taille: cleanTaille || null,
              couleur: cleanCouleur || null,
            },
          })

          if (existing) continue

          const varCode = cleanTaille && cleanCouleur 
            ? `${cleanTaille}-${cleanCouleur}` 
            : cleanTaille || cleanCouleur
          const cleanSku = `${produit.slug.toUpperCase()}-${varCode.toUpperCase().replace(/[^A-Z0-9-]+/g, '-')}`

          const v = await prisma.varianteProduit.create({
            data: {
              produitId: id,
              taille: cleanTaille || null,
              couleur: cleanCouleur || null,
              sku: cleanSku,
              prix: null, // utilise le prix du produit par défaut
              prixCoutantHT: produit.prixAchat || 0,
              tauxTVA: produit.tauxTVA || 20,
              stock: 0,
              actif: true,
            },
          })
          createdVariantes.push(v)
        }
      }

      return apiSuccess({
        message: `${createdVariantes.length} variante(s) générée(s) avec succès.`,
        count: createdVariantes.length,
        variantes: createdVariantes,
      }, 201)
    }

    // Mode unitaire classique
    const validation = createVarianteSchema.safeParse(body)
    if (!validation.success) {
      return apiError('Données invalides', 400, validation.error.flatten(), 'VALIDATION_ERROR')
    }

    const data = validation.data

    const variante = await prisma.varianteProduit.create({
      data: {
        produitId: id,
        taille: data.taille ?? null,
        couleur: data.couleur ?? null,
        sku: data.sku ?? null,
        prix: data.prix ?? null,
        prixCoutantHT: data.prixCoutantHT ?? 0,
        prixFlocageHT: data.prixFlocageHT ?? 0,
        tauxTVA: data.tauxTVA ?? 20,
        stock: data.stock ?? 0,
        image: data.image ?? null,
        actif: data.actif ?? true,
      },
    })

    return apiSuccess({ variante }, 201)
  } catch (error) {
    boutiqueLogger.error('Erreur lors de la création de la variante', error)
    return apiError('Erreur serveur', 500, undefined, 'INTERNAL_SERVER_ERROR')
  }
}
