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
  website: z.string().optional(),
  turnstileToken: z.string().optional(),
})

async function verifyTurnstileToken(token: string, ip: string): Promise<boolean> {
  const secretKey = process.env.TURNSTILE_SECRET_KEY || '1x0000000000000000000000000000000AA'
  try {
    const formData = new URLSearchParams()
    formData.append('secret', secretKey)
    formData.append('response', token)
    if (ip && ip !== 'unknown') {
      formData.append('remoteip', ip)
    }

    const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      body: formData,
    })

    const data = await res.json()
    return data.success === true
  } catch (err) {
    contactLogger.error('Erreur lors de la validation Turnstile', err)
    return !process.env.TURNSTILE_SECRET_KEY
  }
}

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request)
    const userAgent = request.headers.get('user-agent') || 'Non renseigné'

    const rateLimitResult = formRateLimiter.checkLimit(ip, 'contact')
    if (!rateLimitResult.allowed) {
      return apiError(rateLimitResult.message || 'Trop de requêtes', 429, undefined, 'RATE_LIMITED')
    }

    const body = await request.json()

    // 1. Protection Honeypot : si le champ piège website est rempli, bloquer le spam silencieusement
    if (body.website && typeof body.website === 'string' && body.website.trim().length > 0) {
      contactLogger.warn('Spam bot détecté et bloqué via Honeypot', { ip, userAgent, email: body.email })
      return apiSuccess({ message: 'Message envoyé avec succès' })
    }

    // 2. Protection Cloudflare Turnstile : validation du token anti-robot
    const turnstileToken = body.turnstileToken || body['cf-turnstile-response'] || ''
    if (turnstileToken) {
      const isHuman = await verifyTurnstileToken(turnstileToken, ip)
      if (!isHuman) {
        contactLogger.warn('Vérification Turnstile échouée', { ip, userAgent, email: body.email })
        return apiError('La vérification anti-robot a échoué. Veuillez réessayer.', 400, undefined, 'TURNSTILE_FAILED')
      }
    } else if (process.env.TURNSTILE_SECRET_KEY) {
      return apiError('Veuillez valider le test de sécurité anti-robot (Turnstile).', 400, undefined, 'TURNSTILE_REQUIRED')
    }

    const validatedData = contactSchema.parse(body)

    const settings = await prisma.settings.findFirst()

    const { nom, email, telephone, sujet, message } = validatedData
    const sanitizedNom = sanitizeHtml(nom)
    const sanitizedSujet = sanitizeHtml(sujet)
    const sanitizedMessage = sanitizeHtml(message)
    const formattedDate = new Date().toLocaleString('fr-FR', { timeZone: 'Europe/Paris' })

    if (!settings) {
      return apiError('Paramètres email non configurés', 503, undefined, 'SMTP_NOT_CONFIGURED')
    }

    const emailTo = settings.emailClub || 'tritoncavaillon@gmail.com'
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
        <hr style="margin: 16px 0; border: 0; border-top: 1px solid #e2e8f0;">
        <p><strong>Message :</strong></p>
        <p style="white-space: pre-wrap;">${sanitizedMessage.replace(/\n/g, '<br>')}</p>
        <hr style="margin: 24px 0 12px 0; border: 0; border-top: 1px solid #e2e8f0;">
        <div style="font-size: 11px; color: #64748b; background-color: #f8fafc; padding: 12px; border-radius: 8px; border: 1px solid #e2e8f0;">
          <p style="margin: 0 0 6px 0; font-weight: bold; color: #334155; font-size: 12px;">🔍 Information de traçabilité & sécurité :</p>
          <p style="margin: 0 0 4px 0;">• <strong>Adresse IP expéditeur :</strong> <code style="background: #e2e8f0; padding: 2px 6px; border-radius: 4px; font-weight: bold;">${ip}</code></p>
          <p style="margin: 0 0 4px 0;">• <strong>Appareil / Navigateur :</strong> ${sanitizeHtml(userAgent)}</p>
          <p style="margin: 0;">• <strong>Date et heure d'envoi :</strong> ${formattedDate}</p>
        </div>
      `,
      text: `
Nouveau message de contact

De : ${nom}
Email : ${email}
${telephone ? `Téléphone : ${telephone}` : ''}
Sujet : ${sujet}

Message :
${message}

--- Traçabilité & Sécurité ---
Adresse IP expéditeur : ${ip}
User-Agent : ${userAgent}
Date et heure d'envoi : ${formattedDate}
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

    contactLogger.info('Message de contact reçu et transmis par email', { nom, email, sujet, ip, userAgent })

    return apiSuccess({ message: 'Message envoyé avec succès' })
  } catch (error) {
    contactLogger.error('Erreur lors du traitement du message de contact', error)

    if (error instanceof z.ZodError) {
      return apiError('Données invalides', 400, error.flatten(), 'VALIDATION_ERROR')
    }

    return apiError('Erreur lors de l\'envoi du message', 500, undefined, 'INTERNAL_SERVER_ERROR')
  }
}
