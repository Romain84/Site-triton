import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcrypt'
import { z } from 'zod'
import { apiError, apiSuccess } from '@/lib/api/response'
import { handleRouteError, requireAdmin } from '@/lib/api/guards'

const updateUserSchema = z.object({
  prenom: z.string().min(1, 'Le prénom est requis').max(100),
  nom: z.string().min(1, 'Le nom est requis').max(100),
  email: z.string().email('Email invalide'),
  password: z.string().min(8, 'Le mot de passe doit faire au moins 8 caractères').optional().nullable().or(z.literal('')),
  role: z.enum(['admin', 'superviseur', 'coach', 'tresorier', 'president']),
  actif: z.boolean(),
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
    if (auth.session.role !== 'admin' && auth.session.role !== 'superviseur') {
      return apiError('Accès interdit', 403)
    }

    const { id } = await params
    const body = await request.json()
    
    const validation = updateUserSchema.safeParse(body)
    if (!validation.success) {
      return apiError('Données invalides', 400, validation.error.flatten())
    }

    const { prenom, nom, email, password, role, actif } = validation.data

    // Récupérer l'utilisateur à modifier
    const userToUpdate = await prisma.user.findUnique({ where: { id } })
    if (!userToUpdate) {
      return apiError('Utilisateur introuvable', 404)
    }

    // Sécurité Superviseur :
    // - Un superviseur ne peut pas attribuer le rôle admin
    // - Un superviseur ne peut pas modifier un compte admin existant
    if (auth.session.role === 'superviseur') {
      if (userToUpdate.role === 'admin' || role === 'admin') {
        return apiError('Un superviseur ne peut pas modifier un administrateur ni attribuer ce rôle', 403)
      }
    }

    // Vérifier l'email unique
    if (email !== userToUpdate.email) {
      const existingUser = await prisma.user.findUnique({ where: { email } })
      if (existingUser) {
        return apiError('Cet email est déjà utilisé', 400, undefined, 'EMAIL_EXISTS')
      }
    }

    // Sécurité : Ne pas désactiver ou changer le rôle du dernier admin actif
    if (userToUpdate.role === 'admin' && (role !== 'admin' || !actif)) {
      const activeAdminsCount = await prisma.user.count({
        where: {
          role: 'admin',
          actif: true,
        },
      })
      if (activeAdminsCount <= 1) {
        return apiError('Impossible de désactiver ou de rétrograder le dernier administrateur actif', 400, undefined, 'LAST_ADMIN')
      }
    }

    // Préparer les données d'update
    const updateData: any = {
      prenom,
      nom,
      email,
      role,
      actif,
    }

    // Hasher le mot de passe s'il est fourni
    if (password && password.trim() !== '') {
      updateData.password = await bcrypt.hash(password, 12)
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: updateData,
    })

    return apiSuccess({
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        nom: updatedUser.nom,
        prenom: updatedUser.prenom,
        role: updatedUser.role,
        actif: updatedUser.actif,
      }
    })
  } catch (error) {
    return handleRouteError(error, 'Erreur lors de la modification de l\'utilisateur')
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: Params
) {
  try {
    const auth = await requireAdmin()
    if (!auth.ok) return auth.response
    if (auth.session.role !== 'admin' && auth.session.role !== 'superviseur') {
      return apiError('Accès interdit', 403)
    }

    const { id } = await params

    // Ne pas se supprimer soi-même
    if (id === auth.session.userId) {
      return apiError('Vous ne pouvez pas supprimer votre propre compte', 400, undefined, 'SELF_DELETE')
    }

    const userToDelete = await prisma.user.findUnique({ where: { id } })
    if (!userToDelete) {
      return apiError('Utilisateur introuvable', 404)
    }

    // Sécurité Superviseur :
    // - Un superviseur ne peut pas supprimer un administrateur
    if (auth.session.role === 'superviseur') {
      if (userToDelete.role === 'admin') {
        return apiError('Un superviseur ne peut pas supprimer un administrateur', 403)
      }
    }

    // Sécurité : Ne pas supprimer le dernier admin
    if (userToDelete.role === 'admin') {
      const adminsCount = await prisma.user.count({
        where: { role: 'admin' },
      })
      if (adminsCount <= 1) {
        return apiError('Impossible de supprimer le dernier administrateur', 400, undefined, 'LAST_ADMIN')
      }
    }

    await prisma.user.delete({ where: { id } })

    return apiSuccess({ message: 'Utilisateur supprimé avec succès' })
  } catch (error) {
    return handleRouteError(error, 'Erreur lors de la suppression de l\'utilisateur')
  }
}
