import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcrypt'
import { z } from 'zod'
import { apiError, apiSuccess } from '@/lib/api/response'
import { handleRouteError, requireAdmin } from '@/lib/api/guards'

const createUserSchema = z.object({
  prenom: z.string().min(1, 'Le prénom est requis').max(100),
  nom: z.string().min(1, 'Le nom est requis').max(100),
  email: z.string().email('Email invalide'),
  password: z.string().min(8, 'Le mot de passe doit faire au moins 8 caractères'),
  role: z.enum(['admin', 'superviseur', 'coach', 'tresorier', 'president']),
  actif: z.boolean().optional(),
})

export async function GET() {
  try {
    const auth = await requireAdmin()
    if (!auth.ok) return auth.response
    if (auth.session.role !== 'admin' && auth.session.role !== 'superviseur') {
      return apiError('Accès interdit', 403)
    }

    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        nom: true,
        prenom: true,
        role: true,
        actif: true,
        lastLogin: true,
        createdAt: true,
      },
      orderBy: [{ prenom: 'asc' }, { nom: 'asc' }],
    })
    return apiSuccess({ users })
  } catch (error) {
    return handleRouteError(error, 'Erreur lors du chargement des utilisateurs')
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdmin()
    if (!auth.ok) return auth.response
    if (auth.session.role !== 'admin' && auth.session.role !== 'superviseur') {
      return apiError('Accès interdit', 403)
    }

    const body = await request.json()
    const validation = createUserSchema.safeParse(body)
    if (!validation.success) {
      return apiError('Données invalides', 400, validation.error.flatten())
    }

    const { prenom, nom, email, password, role, actif } = validation.data

    if (auth.session.role === 'superviseur' && ['admin', 'tresorier', 'president'].includes(role)) {
      return apiError('Un superviseur ne peut pas créer de profil administrateur, trésorier ou président', 403)
    }

    const existingUser = await prisma.user.findUnique({ where: { email } })
    if (existingUser) {
      return apiError('Cet email est déjà utilisé', 400, undefined, 'EMAIL_EXISTS')
    }

    const hashedPassword = await bcrypt.hash(password, 12)

    const user = await prisma.user.create({
      data: {
        prenom,
        nom,
        email,
        password: hashedPassword,
        role,
        actif: actif ?? true,
      },
    })

    return apiSuccess({
      user: {
        id: user.id,
        email: user.email,
        nom: user.nom,
        prenom: user.prenom,
        role: user.role,
        actif: user.actif,
      }
    }, 201)
  } catch (error) {
    return handleRouteError(error, 'Erreur lors de la création de l\'utilisateur')
  }
}
