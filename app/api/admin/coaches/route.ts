import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcrypt'
import { z } from 'zod'
import { apiError, apiSuccess } from '@/lib/api/response'
import { handleRouteError, requireAdmin } from '@/lib/api/guards'

const createCoachSchema = z.object({
  prenom: z.string().min(1, 'Le prénom est requis').max(100),
  nom: z.string().max(100).optional().nullable(),
  email: z.string().email('Email invalide').optional().nullable(),
  password: z.string().min(8, 'Le mot de passe doit contenir au moins 8 caractères').optional().nullable(),
  telephone: z.string().max(20).optional().nullable(),
  photo: z.string().url('URL de photo invalide').optional().nullable(),
  bio: z.string().max(2000).optional().nullable(),
  specialites: z.string().max(500).optional().nullable(),
  siret: z.string().regex(/^[0-9]{14}$/, 'Le SIRET doit contenir 14 chiffres').optional().nullable().or(z.literal('')),
  adresse: z.string().max(500).optional().nullable(),
  actif: z.boolean().optional(),
  heuresAdminHebdo: z.number().min(0).optional(),
})

export async function GET() {
  try {
    const auth = await requireAdmin()
    if (!auth.ok) return auth.response

    const coaches = await prisma.coach.findMany({
      select: {
        id: true,
        prenom: true,
        nom: true,
        email: true,
        telephone: true,
        photo: true,
        bio: true,
        specialites: true,
        siret: true,
        adresse: true,
        actif: true,
        heuresAdminHebdo: true,
        lastLogin: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: [{ prenom: 'asc' }, { nom: 'asc' }],
    })

    return apiSuccess({ coaches })
  } catch (error) {
    return handleRouteError(error, 'Erreur lors du chargement des coaches')
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdmin()
    if (!auth.ok) return auth.response

    const body = await request.json()
    const validationResult = createCoachSchema.safeParse(body)
    if (!validationResult.success) {
      return apiError('Données invalides', 400, validationResult.error.flatten(), 'VALIDATION_ERROR')
    }

    const {
      prenom,
      nom,
      email,
      password,
      telephone,
      photo,
      bio,
      specialites,
      siret,
      adresse,
      actif,
      heuresAdminHebdo,
    } = validationResult.data

    if (email) {
      const existingCoach = await prisma.coach.findUnique({ where: { email } })
      if (existingCoach) {
        return apiError('Cet email est déjà utilisé', 400, undefined, 'EMAIL_EXISTS')
      }
    }

    let hashedPassword = null
    if (password) {
      hashedPassword = await bcrypt.hash(password, 12)
    }

    const coach = await prisma.coach.create({
      data: {
        prenom,
        nom: nom || null,
        email: email || null,
        password: hashedPassword,
        telephone: telephone || null,
        photo: photo || null,
        bio: bio || null,
        specialites: specialites || null,
        siret: siret === '' ? null : siret || null,
        adresse: adresse || null,
        actif: actif !== undefined ? actif : true,
        heuresAdminHebdo: heuresAdminHebdo ?? 0,
      },
    })

    const { password: _, ...coachWithoutPassword } = coach

    return apiSuccess({ coach: coachWithoutPassword }, 201)
  } catch (error) {
    return handleRouteError(error, 'Erreur lors de la création du coach')
  }
}
