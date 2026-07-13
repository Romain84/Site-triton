import { NextRequest } from 'next/server'
import { getAdminSession } from '@/lib/auth/session'
import { logger } from '@/lib/logger'
import { isSameOriginRequest } from '@/lib/security/origin'
import { apiError, apiSuccess } from '@/lib/api/response'
import { createSmtpTransport, getSmtpSettings, sanitizeEmailHeader, type SmtpSettings } from '@/lib/email'

interface TestSmtpPayload {
  sendTest?: boolean
  testEmail?: string
  smtpHost?: string
  smtpPort?: number | string
  smtpUser?: string
  smtpPassword?: string
}

export async function POST(request: NextRequest) {
  try {
    if (!isSameOriginRequest(request)) {
      return apiError('Origine non autorisée', 403)
    }

    const session = await getAdminSession()
    if (!session) {
      return apiError('Non autorisé', 401)
    }

    const body = (await request.json().catch(() => ({}))) as TestSmtpPayload
    const storedSmtp = await getSmtpSettings()

    const payloadHost = body.smtpHost?.trim()
    const payloadUser = body.smtpUser?.trim()
    const payloadPassword = body.smtpPassword?.trim()
    const payloadPortNumber =
      typeof body.smtpPort === 'string' ? Number.parseInt(body.smtpPort, 10) : body.smtpPort

    const smtp: SmtpSettings | null = {
      smtpHost: payloadHost || storedSmtp?.smtpHost || '',
      smtpPort: Number.isFinite(payloadPortNumber) ? Number(payloadPortNumber) : (storedSmtp?.smtpPort || 587),
      smtpUser: payloadUser || storedSmtp?.smtpUser || '',
      smtpPassword: payloadPassword || storedSmtp?.smtpPassword || '',
    }

    // Vérifier la configuration SMTP
    if (!smtp.smtpHost || !smtp.smtpUser || !smtp.smtpPassword) {
      return apiError('Configuration SMTP incomplète', 400, 'Vérifiez host, utilisateur et mot de passe SMTP')
    }

    // Tester la connexion SMTP
    const transporter = createSmtpTransport(smtp)

    // Vérifier la connexion
    await transporter.verify()

    // Optionnel : envoyer un email de test
    const sendTest = body.sendTest === true
    const testEmail = body.testEmail || smtp.smtpUser

    if (sendTest && testEmail) {
      await transporter.sendMail({
        from: smtp.smtpUser,
        to: sanitizeEmailHeader(testEmail),
        subject: '✅ Test SMTP - Triton Club Cavaillon',
        html: `
          <div style="font-family: Arial, sans-serif; padding: 20px;">
            <h2 style="color: #00bcd4;">Test de configuration SMTP</h2>
            <p>Si vous recevez cet email, la configuration SMTP fonctionne correctement.</p>
            <hr style="margin: 20px 0; border: none; border-top: 1px solid #eee;">
            <p style="color: #666; font-size: 12px;">
              Triton Club Cavaillon - Email de test automatique
            </p>
          </div>
        `,
        text: 'Test SMTP - Si vous recevez cet email, la configuration fonctionne correctement.',
      })

      logger.info(`Email de test SMTP envoyé à ${testEmail}`)

      return apiSuccess({
        message: `Connexion SMTP réussie et email de test envoyé à ${testEmail}`,
      })
    }

    return apiSuccess({
      message: 'Connexion au serveur SMTP réussie',
      config: {
        host: smtp.smtpHost,
        port: smtp.smtpPort,
        user: smtp.smtpUser,
        secure: smtp.smtpPort === 465,
      },
    })
  } catch (error) {
    logger.error('Erreur test SMTP:', error)

    // Messages d'erreur plus explicites
    const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue'
    let details = errorMessage

    if (errorMessage.includes('ENOTFOUND')) {
      details = 'Le serveur SMTP est introuvable. Vérifiez le nom d\'hôte.'
    } else if (errorMessage.includes('ECONNREFUSED')) {
      details = 'Connexion refusée. Vérifiez le port SMTP.'
    } else if (errorMessage.includes('ETIMEDOUT')) {
      details = 'Délai d\'attente dépassé. Le serveur ne répond pas.'
    } else if (errorMessage.includes('auth') || errorMessage.includes('AUTH') || errorMessage.includes('535')) {
      details = 'Authentification échouée. Avec Gmail, utilisez un mot de passe d\'application (16 caractères), pas le mot de passe du compte.'
    } else if (errorMessage.includes('certificate') || errorMessage.includes('SSL') || errorMessage.includes('TLS')) {
      details = 'Erreur de certificat SSL/TLS. Essayez le port 587 avec STARTTLS.'
    }

    return apiError('Échec de connexion SMTP', 400, details)
  }
}
