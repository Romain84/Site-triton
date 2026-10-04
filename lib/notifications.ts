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

export interface RemplacementNotificationData {
  coachRemplace: { prenom: string; nom?: string | null; email?: string | null }
  coachRemplacant?: { prenom: string; nom?: string | null; email?: string | null } | null
  dateStr: string
  heureDebut: string
  heureFin: string
  groupeNom?: string | null
  motif?: string | null
}

/**
 * Notifie l'administration lors d'une désignation directe de remplaçant (validation 1-clic).
 * Note : les coachs ne reçoivent pas d'e-mail (réservé exclusivement à la génération de facture).
 */
export async function notifyRemplacementDirect(data: RemplacementNotificationData) {
  const nomCompletRemplace = `${data.coachRemplace.prenom} ${data.coachRemplace.nom || ''}`.trim()
  const nomCompletRemplacant = data.coachRemplacant
    ? `${data.coachRemplacant.prenom} ${data.coachRemplacant.nom || ''}`.trim()
    : 'un remplaçant'

  // Notification à l'admin uniquement
  await notifyAdmin({
    sujet: `[Coachs] Remplacement direct : ${nomCompletRemplacant} remplace ${nomCompletRemplace} (${data.dateStr})`,
    messageTexte: `Remplacement direct validé :\n- Absent(e) : ${nomCompletRemplace}\n- Remplaçant(e) : ${nomCompletRemplacant}\n- Date : ${data.dateStr} (${data.heureDebut} - ${data.heureFin})\n- Groupe : ${data.groupeNom || 'Non spécifié'}`,
    messageHtml: `
      <p>Un remplacement direct a été validé :</p>
      <ul>
        <li><strong>Absent(e) :</strong> ${nomCompletRemplace}</li>
        <li><strong>Remplaçant(e) :</strong> ${nomCompletRemplacant}</li>
        <li><strong>Date :</strong> ${data.dateStr} (${data.heureDebut} - ${data.heureFin})</li>
        <li><strong>Groupe :</strong> ${data.groupeNom || 'Non spécifié'}</li>
      </ul>
    `,
  })
}

/**
 * Notifie l'administration lorsqu'un remplaçant accepte une demande ouverte.
 * Note : les coachs ne reçoivent pas d'e-mail (réservé exclusivement à la génération de facture).
 */
export async function notifyRemplacementAccepte(data: RemplacementNotificationData) {
  const nomCompletRemplace = `${data.coachRemplace.prenom} ${data.coachRemplace.nom || ''}`.trim()
  const nomCompletRemplacant = data.coachRemplacant
    ? `${data.coachRemplacant.prenom} ${data.coachRemplacant.nom || ''}`.trim()
    : 'Un entraîneur'

  await notifyAdmin({
    sujet: `[Coachs] Remplacement accepté : ${nomCompletRemplacant} pour ${nomCompletRemplace} (${data.dateStr})`,
    messageTexte: `${nomCompletRemplacant} a accepté le remplacement de ${nomCompletRemplace} le ${data.dateStr} (${data.heureDebut} - ${data.heureFin}).`,
    messageHtml: `<p><strong>${nomCompletRemplacant}</strong> a accepté de remplacer <strong>${nomCompletRemplace}</strong> le ${data.dateStr} (${data.heureDebut} - ${data.heureFin}).</p>`,
  })
}

/**
 * Notifie l'administration si l'absence est annulée par le coach régulier.
 * Note : les coachs ne reçoivent pas d'e-mail (réservé exclusivement à la génération de facture).
 */
export async function notifyAnnulationRemplacement(data: RemplacementNotificationData) {
  const nomCompletRemplace = `${data.coachRemplace.prenom} ${data.coachRemplace.nom || ''}`.trim()

  await notifyAdmin({
    sujet: `[Coachs] Absence annulée par ${nomCompletRemplace} (${data.dateStr})`,
    messageTexte: `${nomCompletRemplace} a annulé son absence du ${data.dateStr}.`,
    messageHtml: `<p><strong>${nomCompletRemplace}</strong> a annulé son absence du ${data.dateStr}. Le créneau est réintégré.</p>`,
  })
}
