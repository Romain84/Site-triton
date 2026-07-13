import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sanitizeHtml } from '@/lib/sanitize'
import { formRateLimiter } from '@/lib/rate-limiter'
import { logger } from '@/lib/logger'
import { z } from 'zod'
import { sanitizeEmailHeader, sendEmail } from '@/lib/email'
import { apiError, apiSuccess } from '@/lib/api/response'
import { getClientIp } from '@/lib/api/request'

const contactLogger = logger.withContext('Contact')

const contactSchema = z.object({
  nom: z.string().min(2, 'Le nom doit contenir au moins 2 caractères').max(100),
  email: z.string().email('Email invalide'),
  telephone: z.string().max(20).optional(),
  sujet: z.string().min(3, 'Le sujet doit contenir au moins 3 caractères').max(200),
  message: z.string().min(10, 'Le message doit contenir au moins 10 caractères').max(5000),
})

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request)
    const rateLimitResult = formRateLimiter.checkLimit(ip, 'contact')
    if (!rateLimitResult.allowed) {
      return apiError(rateLimitResult.message || 'Trop de requêtes', 429, undefined, 'RATE_LIMITED')
    }

    const body = await request.json()
    const validatedData = contactSchema.parse(body)

    const settings = await prisma.settings.findFirst()

    const { nom, email, telephone, sujet, message } = validatedData
    const sanitizedNom = sanitizeHtml(nom)
    const sanitizedSujet = sanitizeHtml(sujet)
    const sanitizedMessage = sanitizeHtml(message)

    if (!settings) {
      return apiError('Paramètres email non configurés', 503, undefined, 'SMTP_NOT_CONFIGURED')
    }

    const emailTo = settings.emailClub || 'contact@tritoncavaillon.fr'
    const emailSent = await sendEmail({
      to: sanitizeEmailHeader(emailTo),
      replyTo: sanitizeEmailHeader(email),
      subject: sanitizeEmailHeader(`[Contact] ${sanitizedNom} - ${sanitizedSujet}`),
      html: `
        <h2>Nouveau message de contact</h2>
        <p><strong>De :</strong> ${sanitizedNom}</p>
        <p><strong>Email :</strong> ${email}</p>
        ${telephone ? `<p><strong>Téléphone :</strong> ${sanitizeHtml(telephone)}</p>` : ''}
        <p><strong>Sujet :</strong> ${sanitizedSujet}</p>
        <hr>
        <p><strong>Message :</strong></p>
        <p>${sanitizedMessage.replace(/\n/g, '<br>')}</p>
      `,
      text: `
Nouveau message de contact

De : ${nom}
Email : ${email}
${telephone ? `Téléphone : ${telephone}` : ''}
Sujet : ${sujet}

Message :
${message}
      `,
    })

    if (!emailSent) {
      contactLogger.error('Échec envoi email contact: vérifiez la configuration SMTP')
      return apiError(
        'Échec de l’envoi du message. Vérifiez la configuration email.',
        502,
        undefined,
        'EMAIL_SEND_FAILED'
      )
    }

    contactLogger.info('Message de contact reçu', { nom, email, sujet })

    return apiSuccess({ message: 'Message envoyé avec succès' })
  } catch (error) {
    contactLogger.error('Erreur lors du traitement du message de contact', error)

    if (error instanceof z.ZodError) {
      return apiError('Données invalides', 400, error.flatten(), 'VALIDATION_ERROR')
    }

    return apiError('Erreur lors de l\'envoi du message', 500, undefined, 'INTERNAL_SERVER_ERROR')
  }
}
