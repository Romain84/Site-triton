import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/api/guards'
import { z } from 'zod'
import { queueEmail } from '@/lib/email'

export const dynamic = 'force-dynamic'

const relanceSchema = z.object({
  candidateIds: z.array(z.string()).optional(),
  all: z.boolean().optional(),
  sessionId: z.string().optional().nullable(),
  customSubject: z.string().optional(),
  customMessage: z.string().optional(),
})

export async function POST(request: NextRequest) {
  const auth = await requireAdmin()
  if (!auth.ok) return auth.response

  try {
    const body = await request.json()
    const validated = relanceSchema.parse(body)

    const whereClause: any = {
      statut: 'a_planifier',
      emailParent: { not: null },
    }

    if (validated.candidateIds && validated.candidateIds.length > 0) {
      whereClause.id = { in: validated.candidateIds }
    } else if (validated.sessionId) {
      whereClause.OR = [{ sessionId: validated.sessionId }, { sessionId: null }]
    }

    const candidats = await prisma.candidatTestNage.findMany({
      where: whereClause,
      include: {
        session: true,
      },
    })

    if (candidats.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Aucun candidat non planifié avec adresse email valide trouvé.',
      }, { status: 404 })
    }

    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL || 'https://triton-cavaillon.fr'
    const bookingUrl = `${baseUrl}/tests-de-nage`
    const defaultSubject = 'Rappel : Réservez votre créneau pour le Test de Nage (Triton Club Cavaillon)'

    let sentCount = 0
    const recipients: string[] = []

    for (const c of candidats) {
      if (!c.emailParent || !c.emailParent.includes('@')) continue

      const emailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #1e293b; line-height: 1.6;">
          <div style="background-color: #15803d; color: #ffffff; padding: 24px; text-align: center; border-radius: 12px 12px 0 0;">
            <h1 style="margin: 0; font-size: 20px; font-weight: bold;">Tests de Nage · Rentrée Sportive</h1>
            <p style="margin: 6px 0 0; font-size: 14px; opacity: 0.9;">Triton Club Cavaillon</p>
          </div>
          <div style="background-color: #ffffff; padding: 24px; border: 1px solid #e2e8f0; border-radius: 0 0 12px 12px;">
            <p>Bonjour${c.nomParent ? ' ' + c.nomParent : ''},</p>
            <p>
              Nous vous rappelons que votre enfant <strong>${c.prenom} ${c.nom}</strong> est pré-inscrit pour passer son test de niveau de début de saison au Triton Club Cavaillon.
            </p>
            
            ${validated.customMessage ? `
              <div style="background-color: #f8fafc; border-left: 4px solid #15803d; padding: 14px; margin: 16px 0; border-radius: 4px; font-size: 14px;">
                ${validated.customMessage.replace(/\n/g, '<br>')}
              </div>
            ` : `
              <p>
                Afin de garantir son créneau de test avec nos éducateurs diplômés et de déterminer son groupe d'entraînement pour la saison, <strong>merci de réserver son horaire de passage en ligne dès maintenant</strong> :
              </p>
            `}

            <div style="text-align: center; margin: 26px 0;">
              <a href="${baseUrl}/tests-de-nage?c=${c.id}" style="display: inline-block; background-color: #15803d; color: #ffffff; text-decoration: none; padding: 14px 28px; border-radius: 10px; font-size: 15px; font-weight: bold; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                👉 Réserver mon créneau de test
              </a>
            </div>

            <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; padding: 14px; border-radius: 8px; font-size: 13px; color: #166534;">
              ✨ <em>En cliquant sur le lien ci-dessus, les informations de votre enfant (${c.prenom} ${c.nom}) sont déjà reconnues : il ne vous reste plus qu'à cliquer sur l'horaire de votre choix !</em>
            </div>

            <p style="font-size: 13px; color: #64748b; margin-top: 24px;">
              En cas de question ou d'indisponibilité, contactez-nous par email à <a href="mailto:tritoncavaillon@gmail.com" style="color: #15803d; font-weight: bold;">tritoncavaillon@gmail.com</a>.
            </p>
            <p style="font-size: 13px; color: #64748b; margin: 0;">À très bientôt au bord des bassins !<br><strong>L'équipe du Triton Club Cavaillon</strong></p>
          </div>
        </div>
      `

      await queueEmail({
        to: c.emailParent,
        subject: validated.customSubject || defaultSubject,
        html: emailHtml,
      })

      sentCount++
      recipients.push(`${c.prenom} ${c.nom} (${c.emailParent})`)
    }

    // Mettre à jour la date de dernière relance
    if (sentCount > 0) {
      const sentIds = candidats
        .filter((c) => c.emailParent && c.emailParent.includes('@'))
        .map((c) => c.id)

      await prisma.candidatTestNage.updateMany({
        where: { id: { in: sentIds } },
        data: { derniereRelance: new Date() },
      })
    }

    return NextResponse.json({
      success: true,
      message: `${sentCount} email(s) de relance envoyé(s) avec succès.`,
      count: sentCount,
      recipients,
    })
  } catch (error: any) {
    console.error('Erreur relance candidats test:', error)
    return NextResponse.json(
      { error: error?.message || 'Erreur lors de l\'envoi des relances' },
      { status: 500 }
    )
  }
}
