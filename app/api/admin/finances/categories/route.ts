import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { apiError, apiSuccess } from '@/lib/api/response'
import { handleRouteError, requireAdmin } from '@/lib/api/guards'

const createCategorySchema = z.object({
  nom: z.string().min(1, 'Le nom est requis').max(100),
  code: z.string().max(100).optional().nullable(),
  type: z.enum(['recette', 'depense', 'double']),
})

export async function GET() {
  try {
    const auth = await requireAdmin()
    if (!auth.ok) return auth.response

    const categories = await prisma.categorieComptable.findMany({
      orderBy: [{ nom: 'asc' }],
    })
    return apiSuccess({ categories })
  } catch (error) {
    return handleRouteError(error, 'Erreur lors du chargement des catégories')
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdmin()
    if (!auth.ok) return auth.response
    if (auth.session.role !== 'admin') {
      return apiError('Accès interdit - Administrateur requis', 403)
    }

    const body = await request.json()
    const validation = createCategorySchema.safeParse(body)
    if (!validation.success) {
      return apiError('Données invalides', 400, validation.error.flatten())
    }

    const { nom, code, type } = validation.data

    // Générer le code s'il n'est pas fourni (slugify)
    const generatedCode = code && code.trim() !== ''
      ? code.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_')
      : nom.trim().toLowerCase()
          .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // enlever accents
          .replace(/[^a-z0-9_]/g, '_') // remplacer caractères spéciaux par _
          .replace(/__+/g, '_') // écraser les __ multiples
          .replace(/^_+|_+$/g, '') // enlever les _ en début et fin

    if (!generatedCode) {
      return apiError('Code de catégorie invalide', 400)
    }

    const existingCat = await prisma.categorieComptable.findUnique({
      where: { code: generatedCode }
    })
    if (existingCat) {
      return apiError('Le code ou le nom de cette catégorie existe déjà', 400, undefined, 'CATEGORY_EXISTS')
    }

    const category = await prisma.categorieComptable.create({
      data: {
        nom: nom.trim(),
        code: generatedCode,
        type,
        systeme: false,
      },
    })

    return apiSuccess({ category }, 201)
  } catch (error) {
    return handleRouteError(error, 'Erreur lors de la création de la catégorie')
  }
}
