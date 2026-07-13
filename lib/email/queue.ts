import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { sendEmail } from './service'

const queueLogger = logger.withContext('EmailQueue')

interface QueuedAttachment {
  filename: string
  content: string | { type: 'Buffer'; data: string }
  contentType?: string
}

/**
 * Enregistre un e-mail dans la file d'attente pour envoi asynchrone en tâche de fond.
 */
export async function queueEmail(options: {
  to: string
  subject: string
  html: string
  text?: string
  replyTo?: string
  attachments?: Array<{
    filename: string
    content: Buffer | string
    contentType?: string
  }>
}): Promise<string> {
  try {
    // Sérialiser les attachements (conversion des Buffers en base64 pour stockage JSON)
    const serializedAttachments = options.attachments
      ? JSON.stringify(
          options.attachments.map((att) => ({
            filename: att.filename,
            content: Buffer.isBuffer(att.content)
              ? { type: 'Buffer', data: att.content.toString('base64') }
              : att.content,
            contentType: att.contentType,
          }))
        )
      : null

    const queued = await prisma.emailQueue.create({
      data: {
        to: options.to,
        subject: options.subject,
        html: options.html,
        attachments: serializedAttachments,
        status: 'pending',
        attempts: 0,
      },
    })

    queueLogger.info(`E-mail #${queued.id} ajouté à la file d'attente pour ${options.to}.`)

    // Déclencher le traitement de la file d'attente en arrière-plan sans bloquer la requête HTTP courante
    triggerQueueProcessing()

    return queued.id
  } catch (error) {
    queueLogger.error("Erreur lors de l'ajout de l'e-mail à la file d'attente", error)
    throw error
  }
}

/**
 * Déclenche le traitement de la file d'attente d'e-mails de façon non bloquante.
 */
export function triggerQueueProcessing() {
  processEmailQueue().catch((err) => {
    queueLogger.error('Erreur lors du traitement asynchrone de la file d\'attente', err)
  })
}

/**
 * Parcourt les e-mails en attente et tente de les envoyer un par un via le service SMTP.
 */
export async function processEmailQueue(): Promise<void> {
  const maxAttempts = 3
  
  // Récupérer les e-mails "pending" ou "failed" avec moins de 3 tentatives
  const pendingEmails = await prisma.emailQueue.findMany({
    where: {
      OR: [
        { status: 'pending' },
        {
          AND: [
            { status: 'failed' },
            { attempts: { lt: maxAttempts } },
          ],
        },
      ],
    },
    orderBy: { createdAt: 'asc' },
    take: 10, // Traiter par lots de 10 max à la fois
  })

  if (pendingEmails.length === 0) {
    return
  }

  queueLogger.info(`Traitement de la file d'attente : ${pendingEmails.length} e-mail(s) en attente.`)

  for (const email of pendingEmails) {
    // 1. Incrémenter immédiatement le nombre de tentatives et passer en "sending" pour éviter les doubles envois simultanés.
    // L'utilisation de updateMany avec la condition de statut original garantit l'atomicité au niveau SQL.
    const updatedAttempts = email.attempts + 1
    const updateResult = await prisma.emailQueue.updateMany({
      where: {
        id: email.id,
        status: email.status,
        attempts: email.attempts,
      },
      data: {
        attempts: updatedAttempts,
        status: 'sending',
      },
    })

    // Si count === 0, cela signifie qu'un processus concurrent a déjà récupéré cet e-mail.
    if (updateResult.count === 0) {
      queueLogger.info(`E-mail #${email.id} déjà en cours d'envoi par une autre tâche.`)
      continue
    }

    try {
      // 2. Désérialiser les attachements si présents
      let attachments: any[] | undefined = undefined
      if (email.attachments) {
        const parsed: QueuedAttachment[] = JSON.parse(email.attachments)
        attachments = parsed.map((att) => ({
          filename: att.filename,
          content:
            typeof att.content === 'object' && att.content.type === 'Buffer'
              ? Buffer.from(att.content.data, 'base64')
              : att.content,
          contentType: att.contentType,
        }))
      }

      // 3. Tenter l'envoi via sendEmail standard
      const success = await sendEmail({
        to: email.to,
        subject: email.subject,
        html: email.html,
        attachments,
      })

      if (success) {
        // 4a. Succès
        await prisma.emailQueue.update({
          where: { id: email.id },
          data: {
            status: 'sent',
            lastError: null,
          },
        })
        queueLogger.info(`E-mail #${email.id} envoyé avec succès à ${email.to}.`)
      } else {
        // 4b. Échec logique de sendEmail (ex: SMTP non configuré)
        const status = updatedAttempts >= maxAttempts ? 'failed' : 'pending'
        await prisma.emailQueue.update({
          where: { id: email.id },
          data: {
            status,
            lastError: 'SMTP non configuré ou échec de transport standard.',
          },
        })
        queueLogger.warn(`Échec de l'envoi de l'e-mail #${email.id} (Essai ${updatedAttempts}/${maxAttempts}).`)
      }
    } catch (error: any) {
      // 4c. Exception lors de l'envoi
      const status = updatedAttempts >= maxAttempts ? 'failed' : 'pending'
      await prisma.emailQueue.update({
        where: { id: email.id },
        data: {
          status,
          lastError: error?.message || String(error),
        },
      })
      queueLogger.error(`Erreur critique lors de l'envoi de l'e-mail #${email.id} (Essai ${updatedAttempts}/${maxAttempts}) :`, error)
    }
  }
}
