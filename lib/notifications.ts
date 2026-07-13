import { queueEmail } from '@/lib/email'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'

interface NotificationInput {
  sujet: string
  messageHtml: string
  messageTexte: string
}

// Envoie une notification email à l'administration via la file d'attente.
export async function notifyAdmin(input: NotificationInput) {
  try {
    const settings = await prisma.settings.findFirst({
      select: { emailNotification: true, smtpUser: true },
    })
    const adminEmail = settings?.emailNotification || settings?.smtpUser

    if (!adminEmail) {
      logger.withContext('Notification').warn("Pas d'email admin configuré pour les notifications")
      return false
    }

    await queueEmail({
      to: adminEmail,
      subject: input.sujet,
      html: input.messageHtml,
      text: input.messageTexte,
    })
    return true
  } catch (error) {
    logger.withContext('Notification').error('Erreur notification admin', error)
    return false
  }
}

// Envoie une notification email à un coach via la file d'attente.
export async function notifyCoach(email: string, input: NotificationInput) {
  try {
    await queueEmail({
      to: email,
      subject: input.sujet,
      html: input.messageHtml,
      text: input.messageTexte,
    })
    return true
  } catch (error) {
    logger.withContext('Notification').error('Erreur notification coach', error)
    return false
  }
}
