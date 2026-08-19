import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { queueEmail } from '@/lib/email'
import { formatLongDateFr } from '@/lib/date'

export const dynamic = 'force-dynamic'

const annulerSchema = z.object({
  token: z.string().min(8, 'Token invalide'),
  motif: z.string().max(300).optional().nullable(),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { token, motif } = annulerSchema.parse(body)

    const result = await prisma.$transaction(async (tx) => {
      const inscription = await tx.inscriptionTestNage.findUnique({
        where: { token },
        include: {
          creneau: {
            include: {
              session: true,
            },
          },
        },
      })

      if (!inscription) {
        throw new Error('Réservation introuvable.')
      }

      if (inscription.statut === 'annule') {
        throw new Error('Cette réservation a déjà été annulée.')
      }

      // 1. Mettre à jour le statut de l'inscription
      const updatedInscription = await tx.inscriptionTestNage.update({
        where: { id: inscription.id },
        data: {
          statut: 'annule',
          remarques: motif ? `${inscription.remarques ? inscription.remarques + ' | ' : ''}Annulé par le parent : ${motif}` : inscription.remarques,
        },
      })

      // 2. Si rattaché à un candidat du listing, le repasser en 'a_planifier'
      if (inscription.candidatId) {
        await tx.candidatTestNage.updateMany({
          where: { id: inscription.candidatId },
          data: { statut: 'a_planifier' },
        })
      }

      return {
        inscription: updatedInscription,
        creneau: inscription.creneau,
        session: inscription.creneau.session,
      }
    })

    // Envoi d'un email d'annulation de courtoisie
    try {
      const dateFormatted = formatLongDateFr(result.session.date)
      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL || 'https://triton-cavaillon.fr'
      const rebookUrl = `${siteUrl}/tests-de-nage`

      const emailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #1e293b; line-height: 1.6;">
          <div style="background-color: #dc2626; color: #ffffff; padding: 24px; text-align: center; border-radius: 12px 12px 0 0;">
            <h1 style="margin: 0; font-size: 20px; font-weight: bold;">Annulation de votre Test de Nage</h1>
            <p style="margin: 6px 0 0; font-size: 14px; opacity: 0.9;">Triton Club Cavaillon</p>
          </div>
          <div style="background-color: #ffffff; padding: 24px; border: 1px solid #e2e8f0; border-radius: 0 0 12px 12px;">
            <p>Bonjour${result.inscription.nomParent ? ' ' + result.inscription.nomParent : ''},</p>
            <p>Nous vous confirmons l'annulation du créneau de test de nage pour <strong>${result.inscription.prenomEnfant} ${result.inscription.nomEnfant}</strong> :</p>
            
            <div style="background-color: #fef2f2; border-left: 4px solid #dc2626; padding: 16px; margin: 20px 0; border-radius: 6px;">
              <p style="margin: 0 0 8px;">📅 <strong>Date :</strong> ${dateFormatted}</p>
              <p style="margin: 0 0 8px;">⏰ <strong>Créneau :</strong> ${result.creneau.heureDebut} à ${result.creneau.heureFin}</p>
              <p style="margin: 0;">📍 <strong>Lieu :</strong> ${result.session.lieu}</p>
            </div>

            <p style="font-size: 14px; color: #475569;">
              Votre place a bien été libérée. Si vous souhaitez réserver un autre créneau à un autre moment, vous pouvez le faire à tout moment en cliquant ci-dessous :
            </p>

            <div style="text-align: center; margin: 24px 0;">
              <a href="${rebookUrl}" style="display: inline-block; background-color: #15803d; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-size: 14px; font-weight: bold;">
                Réserver un nouveau créneau
              </a>
            </div>

            <p style="font-size: 13px; color: #64748b; margin-top: 24px;">
              Pour toute question, n'hésitez pas à nous contacter à <a href="mailto:tritoncavaillon@gmail.com" style="color: #15803d; font-weight: bold;">tritoncavaillon@gmail.com</a>.
            </p>
            <p style="font-size: 13px; color: #64748b; margin: 0;">Sportivement,<br><strong>L'équipe du Triton Club Cavaillon</strong></p>
          </div>
        </div>
      `

      await queueEmail({
        to: result.inscription.emailParent,
        subject: `Annulation Test de Nage : ${result.inscription.prenomEnfant} ${result.inscription.nomEnfant}`,
        html: emailHtml,
      })
    } catch (mailErr) {
      console.warn("Erreur envoi email annulation test nage:", mailErr)
    }

    return NextResponse.json({
      success: true,
      message: 'Votre réservation a bien été annulée.',
    })
  } catch (error: any) {
    console.error('Erreur annulation test de nage:', error)
    return NextResponse.json(
      { error: error?.message || "Une erreur est survenue lors de l'annulation." },
      { status: 400 }
    )
  }
}
