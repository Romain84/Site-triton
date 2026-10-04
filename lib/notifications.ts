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
 * Notifie les deux coachs et l'admin lors d'une désignation directe de remplaçant (validation 1-clic).
 */
export async function notifyRemplacementDirect(data: RemplacementNotificationData) {
  const nomCompletRemplace = `${data.coachRemplace.prenom} ${data.coachRemplace.nom || ''}`.trim()
  const nomCompletRemplacant = data.coachRemplacant
    ? `${data.coachRemplacant.prenom} ${data.coachRemplacant.nom || ''}`.trim()
    : 'un remplaçant'

  // 1. Notification au coach remplaçant
  if (data.coachRemplacant?.email) {
    await notifyCoach(data.coachRemplacant.email, {
      sujet: `[Triton Club] Remplacement validé : ${data.groupeNom || 'Séance'} le ${data.dateStr}`,
      messageTexte: `Bonjour ${data.coachRemplacant.prenom},\n\n${nomCompletRemplace} vous a désigné(e) comme remplaçant(e) pour le cours de ${data.groupeNom || 'natation'} le ${data.dateStr} (${data.heureDebut} - ${data.heureFin}).\n\nCe créneau est directement validé et ajouté à votre agenda et à votre facturation.\n\nSportivement,\nL'équipe Triton Club Cavaillon`,
      messageHtml: `
        <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;border:1px solid #e2e8f0;border-radius:16px;color:#0f172a;">
          <h2 style="color:#0284c7;margin-top:0;">Nouveau remplacement validé</h2>
          <p style="font-size:15px;line-height:1.5;">Bonjour <strong>${data.coachRemplacant.prenom}</strong>,</p>
          <p style="font-size:14px;line-height:1.5;color:#334155;">
            <strong>${nomCompletRemplace}</strong> vous a désigné(e) pour assurer son cours :
          </p>
          <div style="background-color:#f8fafc;border-left:4px solid #0284c7;padding:14px 18px;margin:18px 0;border-radius:8px;">
            <p style="margin:4px 0;font-weight:bold;color:#0f172a;">Groupe : ${data.groupeNom || 'Entraînement'}</p>
            <p style="margin:4px 0;color:#334155;">Date : <strong>${data.dateStr}</strong></p>
            <p style="margin:4px 0;color:#334155;">Horaires : <strong>${data.heureDebut} – ${data.heureFin}</strong></p>
            ${data.motif ? `<p style="margin:4px 0;color:#64748b;font-size:13px;">Motif : ${data.motif}</p>` : ''}
          </div>
          <p style="color:#059669;font-weight:bold;font-size:14px;background-color:#ecfdf5;padding:10px 14px;border-radius:8px;">
            ✓ Ce créneau est validé directement et pris en compte dans votre facturation.
          </p>
          <p style="color:#64748b;font-size:13px;margin-top:24px;">Sportivement,<br>L'équipe du Triton Club Cavaillon</p>
        </div>
      `,
    })
  }

  // 2. Notification au coach remplacé (confirmation de prise en compte)
  if (data.coachRemplace.email) {
    await notifyCoach(data.coachRemplace.email, {
      sujet: `[Triton Club] Confirmation de votre absence du ${data.dateStr}`,
      messageTexte: `Bonjour ${data.coachRemplace.prenom},\n\nVotre absence pour le cours de ${data.groupeNom || 'natation'} le ${data.dateStr} (${data.heureDebut} - ${data.heureFin}) a bien été enregistrée.\n\n${nomCompletRemplacant} assurera votre remplacement.\n\nSportivement,\nL'équipe Triton Club Cavaillon`,
      messageHtml: `
        <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;border:1px solid #e2e8f0;border-radius:16px;color:#0f172a;">
          <h2 style="color:#0284c7;margin-top:0;">Absence enregistrée avec remplaçant</h2>
          <p style="font-size:15px;line-height:1.5;">Bonjour <strong>${data.coachRemplace.prenom}</strong>,</p>
          <p style="font-size:14px;line-height:1.5;color:#334155;">
            Votre absence a bien été enregistrée :
          </p>
          <div style="background-color:#f8fafc;border-left:4px solid #10b981;padding:14px 18px;margin:18px 0;border-radius:8px;">
            <p style="margin:4px 0;font-weight:bold;color:#0f172a;">Groupe : ${data.groupeNom || 'Entraînement'}</p>
            <p style="margin:4px 0;color:#334155;">Date : <strong>${data.dateStr}</strong></p>
            <p style="margin:4px 0;color:#334155;">Horaires : <strong>${data.heureDebut} – ${data.heureFin}</strong></p>
            <p style="margin:4px 0;color:#047857;font-weight:bold;">Remplaçant(e) : ${nomCompletRemplacant}</p>
          </div>
          <p style="color:#64748b;font-size:13px;margin-top:24px;">Sportivement,<br>L'équipe du Triton Club Cavaillon</p>
        </div>
      `,
    })
  }

  // 3. Notification à l'admin
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
 * Notifie les deux coachs et l'admin lorsqu'un remplaçant accepte une demande ouverte.
 */
export async function notifyRemplacementAccepte(data: RemplacementNotificationData) {
  const nomCompletRemplace = `${data.coachRemplace.prenom} ${data.coachRemplace.nom || ''}`.trim()
  const nomCompletRemplacant = data.coachRemplacant
    ? `${data.coachRemplacant.prenom} ${data.coachRemplacant.nom || ''}`.trim()
    : 'Un entraîneur'

  if (data.coachRemplace.email) {
    await notifyCoach(data.coachRemplace.email, {
      sujet: `[Triton Club] Remplacement trouvé ! ${nomCompletRemplacant} assure votre cours le ${data.dateStr}`,
      messageTexte: `Bonjour ${data.coachRemplace.prenom},\n\nBonne nouvelle ! ${nomCompletRemplacant} a accepté votre demande de remplacement pour le cours du ${data.dateStr} (${data.heureDebut} - ${data.heureFin}).\n\nSportivement,\nL'équipe Triton Club Cavaillon`,
      messageHtml: `
        <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;border:1px solid #e2e8f0;border-radius:16px;color:#0f172a;">
          <h2 style="color:#10b981;margin-top:0;">Remplacement pourvu !</h2>
          <p style="font-size:15px;line-height:1.5;">Bonjour <strong>${data.coachRemplace.prenom}</strong>,</p>
          <p style="font-size:14px;line-height:1.5;color:#334155;">
            <strong>${nomCompletRemplacant}</strong> a accepté de vous remplacer sur ce créneau :
          </p>
          <div style="background-color:#f8fafc;border-left:4px solid #10b981;padding:14px 18px;margin:18px 0;border-radius:8px;">
            <p style="margin:4px 0;font-weight:bold;color:#0f172a;">Date : ${data.dateStr}</p>
            <p style="margin:4px 0;color:#334155;">Horaires : <strong>${data.heureDebut} – ${data.heureFin}</strong></p>
            <p style="margin:4px 0;color:#047857;font-weight:bold;">Remplaçant(e) : ${nomCompletRemplacant}</p>
          </div>
          <p style="color:#64748b;font-size:13px;margin-top:24px;">Sportivement,<br>L'équipe du Triton Club Cavaillon</p>
        </div>
      `,
    })
  }

  if (data.coachRemplacant?.email) {
    await notifyCoach(data.coachRemplacant.email, {
      sujet: `[Triton Club] Confirmation de remplacement : ${data.dateStr}`,
      messageTexte: `Bonjour ${data.coachRemplacant.prenom},\n\nMerci d'avoir pris ce créneau ! Votre remplacement pour ${nomCompletRemplace} le ${data.dateStr} (${data.heureDebut} - ${data.heureFin}) est confirmé et ajouté à votre facturation.\n\nSportivement,\nL'équipe Triton Club Cavaillon`,
      messageHtml: `
        <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;border:1px solid #e2e8f0;border-radius:16px;color:#0f172a;">
          <h2 style="color:#0284c7;margin-top:0;">Remplacement confirmé</h2>
          <p style="font-size:15px;line-height:1.5;">Bonjour <strong>${data.coachRemplacant.prenom}</strong>,</p>
          <p style="font-size:14px;line-height:1.5;color:#334155;">
            Votre remplacement pour <strong>${nomCompletRemplace}</strong> est validé :
          </p>
          <div style="background-color:#f8fafc;border-left:4px solid #0284c7;padding:14px 18px;margin:18px 0;border-radius:8px;">
            <p style="margin:4px 0;color:#334155;">Date : <strong>${data.dateStr}</strong></p>
            <p style="margin:4px 0;color:#334155;">Horaires : <strong>${data.heureDebut} – ${data.heureFin}</strong></p>
          </div>
          <p style="color:#64748b;font-size:13px;margin-top:24px;">Sportivement,<br>L'équipe du Triton Club Cavaillon</p>
        </div>
      `,
    })
  }

  await notifyAdmin({
    sujet: `[Coachs] Remplacement accepté : ${nomCompletRemplacant} pour ${nomCompletRemplace} (${data.dateStr})`,
    messageTexte: `${nomCompletRemplacant} a accepté le remplacement de ${nomCompletRemplace} le ${data.dateStr} (${data.heureDebut} - ${data.heureFin}).`,
    messageHtml: `<p><strong>${nomCompletRemplacant}</strong> a accepté de remplacer <strong>${nomCompletRemplace}</strong> le ${data.dateStr} (${data.heureDebut} - ${data.heureFin}).</p>`,
  })
}

/**
 * Notifie le remplaçant si l'absence est annulée par le coach régulier.
 */
export async function notifyAnnulationRemplacement(data: RemplacementNotificationData) {
  const nomCompletRemplace = `${data.coachRemplace.prenom} ${data.coachRemplace.nom || ''}`.trim()

  if (data.coachRemplacant?.email) {
    await notifyCoach(data.coachRemplacant.email, {
      sujet: `[Triton Club] Remplacement annulé par ${nomCompletRemplace} (${data.dateStr})`,
      messageTexte: `Bonjour ${data.coachRemplacant.prenom},\n\n${nomCompletRemplace} a annulé son absence pour le cours du ${data.dateStr} (${data.heureDebut} - ${data.heureFin}) et réintègre son créneau.\n\nVotre remplacement a été annulé.\n\nSportivement,\nL'équipe Triton Club Cavaillon`,
      messageHtml: `
        <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;border:1px solid #e2e8f0;border-radius:16px;color:#0f172a;">
          <h2 style="color:#e11d48;margin-top:0;">Remplacement annulé</h2>
          <p style="font-size:15px;line-height:1.5;">Bonjour <strong>${data.coachRemplacant.prenom}</strong>,</p>
          <p style="font-size:14px;line-height:1.5;color:#334155;">
            <strong>${nomCompletRemplace}</strong> a réintégré son cours le <strong>${data.dateStr}</strong> (${data.heureDebut} – ${data.heureFin}).
          </p>
          <p style="color:#64748b;font-size:13px;line-height:1.5;">
            Ce remplacement a donc été automatiquement retiré de votre planning et de votre facturation.
          </p>
          <p style="color:#64748b;font-size:13px;margin-top:24px;">Sportivement,<br>L'équipe du Triton Club Cavaillon</p>
        </div>
      `,
    })
  }

  await notifyAdmin({
    sujet: `[Coachs] Absence annulée par ${nomCompletRemplace} (${data.dateStr})`,
    messageTexte: `${nomCompletRemplace} a annulé son absence du ${data.dateStr}.`,
    messageHtml: `<p><strong>${nomCompletRemplace}</strong> a annulé son absence du ${data.dateStr}. Le créneau est réintégré.</p>`,
  })
}
