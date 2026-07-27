import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sanitizeEmailHeader, sendEmail } from '@/lib/email'
import { apiError, apiSuccess } from '@/lib/api/response'
import { logger } from '@/lib/logger'

const notifyLogger = logger.withContext('NotifyActualite')

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { actualiteId } = body

    if (!actualiteId) {
      return apiError('ID de l\'actualité manquant.', 400)
    }

    const actualite = await prisma.actualite.findUnique({
      where: { id: actualiteId },
    })

    if (!actualite || !actualite.publie) {
      return apiError('Actualité introuvable ou non publiée.', 404)
    }

    const settings = await prisma.settings.findFirst()
    const emailTo = settings?.emailClub || 'tritoncavaillon@gmail.com'

    // Récupérer les emails des profils/membres (ou du bureau)
    const profils = await prisma.profil.findMany({
      where: { email: { not: null } },
      select: { email: true },
      take: 100,
    })

    const recipientEmails = Array.from(
      new Set(profils.map((p) => p.email).filter(Boolean) as string[])
    )

    if (recipientEmails.length === 0) {
      // Si aucun profil, envoyer au mail du club pour validation
      recipientEmails.push(emailTo)
    }

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://tritoncavaillon.fr'
    const articleUrl = `${siteUrl}/actualites/${actualite.slug}`

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #1e293b; line-height: 1.6;">
        <div style="background-color: #0f172a; padding: 24px; text-align: center; border-radius: 12px 12px 0 0;">
          <h1 style="color: #ffffff; margin: 0; font-size: 20px; font-weight: bold;">🏊‍♂️ Triton Club Cavaillon</h1>
          <p style="color: #94a3b8; margin: 4px 0 0 0; font-size: 13px;">Flash Info & Actualités du Club</p>
        </div>
        <div style="padding: 24px; background-color: #ffffff; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 12px 12px;">
          <h2 style="color: #0f172a; margin-top: 0;">${actualite.titre}</h2>
          <p style="font-size: 14px; color: #64748b;">Publié le ${new Date(actualite.datePubli).toLocaleDateString('fr-FR')} par ${actualite.auteur}</p>
          <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 16px 0;">
          <div style="font-size: 15px; color: #334155;">
            ${actualite.contenu.substring(0, 400)}...
          </div>
          <div style="margin-top: 24px; text-align: center;">
            <a href="${articleUrl}" style="background-color: #0f172a; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 14px; display: inline-block;">
              Lire l'article complet sur le site →
            </a>
          </div>
        </div>
      </div>
    `

    // Envoi de la notification
    let sentCount = 0
    for (const email of recipientEmails) {
      const ok = await sendEmail({
        to: sanitizeEmailHeader(email),
        subject: sanitizeEmailHeader(`[Triton Club] ${actualite.titre}`),
        html: htmlContent,
      })
      if (ok) sentCount++
    }

    notifyLogger.info(`Notification d'actualité envoyée à ${sentCount} destinataires pour l'article ${actualite.id}`)
    return apiSuccess({ message: `Notification envoyée à ${sentCount} membre(s).` })
  } catch (error: any) {
    notifyLogger.error('Erreur lors de la notification par email des adhérents:', error)
    return apiError('Erreur lors de l\'envoi des notifications par email.', 500)
  }
}
