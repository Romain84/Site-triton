import { NextRequest, NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/auth/session'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { sendEmail, getPasswordResetEmail } from '@/lib/email'
import bcrypt from 'bcrypt'
import crypto from 'crypto'

const log = logger.withContext('Admin')

interface ResetPasswordRequest {
  method: 'email' | 'generate'
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getAdminSession()
    if (!session) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const { id } = await context.params
    const body: ResetPasswordRequest = await request.json()

    // Trouver le coach
    const coach = await prisma.coach.findUnique({
      where: { id },
    })

    if (!coach) {
      return NextResponse.json({ error: 'Coach non trouvé' }, { status: 404 })
    }

    if (body.method === 'email') {
      // Méthode 1: Envoyer un email de réinitialisation
      if (!coach.email) {
        return NextResponse.json(
          { error: 'Ce coach n\'a pas d\'adresse email configurée' },
          { status: 400 }
        )
      }

      // Invalider les anciens tokens
      await prisma.passwordResetToken.updateMany({
        where: {
          email: coach.email,
          userType: 'coach',
          usedAt: null,
        },
        data: {
          usedAt: new Date(),
        },
      })

      // Créer un nouveau token
      const token = crypto.randomBytes(32).toString('hex')
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000) // 1 heure

      await prisma.passwordResetToken.create({
        data: {
          token,
          email: coach.email,
          userType: 'coach',
          expiresAt,
        },
      })

      // Construire l'URL de réinitialisation
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'
      const resetUrl = `${baseUrl}/coach/reset-password?token=${token}`

      // Envoyer l'email
      const emailData = getPasswordResetEmail({
        prenom: coach.prenom,
        resetUrl,
        userType: 'coach',
      })

      const emailSent = await sendEmail({
        to: coach.email,
        ...emailData,
      })

      if (emailSent) {
        log.info(`Email de réinitialisation envoyé à ${coach.email} par admin`)
        return NextResponse.json({
          success: true,
          message: `Un email de réinitialisation a été envoyé à ${coach.email}`,
        })
      } else {
        return NextResponse.json(
          { error: 'Échec de l\'envoi de l\'email. Vérifiez la configuration SMTP.' },
          { status: 500 }
        )
      }
    } else if (body.method === 'generate') {
      // Méthode 2: Générer un mot de passe temporaire
      const tempPassword = generateSecurePassword()
      const hashedPassword = await bcrypt.hash(tempPassword, 10)

      await prisma.coach.update({
        where: { id },
        data: { password: hashedPassword },
      })

      log.info(`Mot de passe réinitialisé pour ${coach.prenom} ${coach.nom || ''} par admin`)

      return NextResponse.json({
        success: true,
        tempPassword,
        message: 'Mot de passe temporaire généré. Communiquez-le au coach de manière sécurisée.',
      })
    }

    return NextResponse.json({ error: 'Méthode invalide' }, { status: 400 })
  } catch (error) {
    log.error('Erreur lors de la réinitialisation du mot de passe', error)
    return NextResponse.json(
      { error: 'Erreur lors de la réinitialisation' },
      { status: 500 }
    )
  }
}

function generateSecurePassword(): string {
  const length = 12
  const lowercase = 'abcdefghijkmnpqrstuvwxyz'
  const uppercase = 'ABCDEFGHJKLMNPQRSTUVWXYZ'
  const numbers = '23456789'
  const special = '!@#$%&*'

  const allChars = lowercase + uppercase + numbers + special

  let password = ''
  // S'assurer d'avoir au moins un caractère de chaque type
  password += lowercase[Math.floor(Math.random() * lowercase.length)]
  password += uppercase[Math.floor(Math.random() * uppercase.length)]
  password += numbers[Math.floor(Math.random() * numbers.length)]
  password += special[Math.floor(Math.random() * special.length)]

  // Compléter le reste du mot de passe
  for (let i = password.length; i < length; i++) {
    password += allChars[Math.floor(Math.random() * allChars.length)]
  }

  // Mélanger les caractères
  return password.split('').sort(() => Math.random() - 0.5).join('')
}
