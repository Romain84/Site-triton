import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/api/guards'
import { z } from 'zod'
import { queueEmail } from '@/lib/email'
import { formatLongDateFr } from '@/lib/date'
import crypto from 'crypto'

export const dynamic = 'force-dynamic'

const notifierAnnulationSchema = z.object({
  customSubject: z.string().optional(),
  customMessage: z.string().optional(),
  bloquerSession: z.boolean().default(true),
})

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const auth = await requireAdmin()
    if (!auth.ok) return auth.response

    const { id } = await params
    const body = await request.json().catch(() => ({}))
    const validated = notifierAnnulationSchema.parse(body)

    // 1. Récupérer la session et ses créneaux avec inscriptions actives
    const session = await prisma.sessionTestNage.findUnique({
      where: { id },
      include: {
        creneaux: {
          include: {
            inscriptions: {
              where: {
                statut: { not: 'annule' },
              },
            },
          },
        },
      },
    })

    if (!session) {
      return NextResponse.json({ error: 'Session introuvable' }, { status: 404 })
    }

    // Récupérer toutes les inscriptions valides
    const inscriptions = session.creneaux.flatMap((c) =>
      c.inscriptions.map((ins) => ({
        ...ins,
        creneauHoraire: `${c.heureDebut} à ${c.heureFin}`,
      }))
    )

    if (inscriptions.length === 0) {
      return NextResponse.json(
        { error: 'Aucun nageur inscrit sur cette séance.' },
        { status: 400 }
      )
    }

    const baseUrl =
      process.env.NEXT_PUBLIC_SITE_URL ||
      process.env.NEXT_PUBLIC_APP_URL ||
      'https://www.tritoncavaillon.fr'

    const dateFormatted = formatLongDateFr(session.date)

    const subject =
      validated.customSubject?.trim() ||
      `Important : Report de votre test de natation du ${dateFormatted} (Triton Club Cavaillon)`

    const recipients: string[] = []

    // 2. Traitement et envoi d'email pour chaque inscription
    for (const ins of inscriptions) {
      if (!ins.emailParent || !ins.emailParent.includes('@')) continue

      // S'assurer qu'un token existe
      let token = ins.token
      if (!token) {
        token = crypto.randomBytes(16).toString('hex')
        await prisma.inscriptionTestNage.update({
          where: { id: ins.id },
          data: { token },
        })
      }

      const rescheduleUrl = `${baseUrl}/tests-de-nage?token=${token}`

      const emailHtml = `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <title>${subject}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px 12px; color: #1e293b; line-height: 1.6;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
    
    <!-- En-tête officiel Triton Club -->
    <div style="background: linear-gradient(135deg, #10955d 0%, #065f46 100%); color: #ffffff; padding: 28px 24px; text-align: center;">
      <h1 style="margin: 0; font-size: 22px; font-weight: 800; letter-spacing: -0.5px;">TRITON CLUB CAVAILLON</h1>
      <p style="margin: 6px 0 0; font-size: 13px; font-weight: 600; opacity: 0.9; text-transform: uppercase; letter-spacing: 1px;">Tests de Niveau · Saison 2026-2027</p>
    </div>

    <!-- Contenu du message -->
    <div style="padding: 28px 24px;">
      <div style="background-color: #fef2f2; border-left: 4px solid #ef4444; padding: 14px 16px; border-radius: 8px; margin-bottom: 22px;">
        <p style="margin: 0; font-size: 14px; font-weight: 700; color: #991b1b;">
          ⚠️ Information importante : Séance du ${dateFormatted} reportée
        </p>
      </div>

      <p style="margin-top: 0; font-size: 15px;">
        Bonjour${ins.nomParent ? ' ' + ins.nomParent : ''},
      </p>

      <p style="font-size: 14px; color: #334155;">
        En raison d'un <strong>problème technique imprévu survenu à la piscine couverte Alphonse Roudière</strong> ayant contraint la fermeture du bassin, la séance de test de niveau de votre enfant <strong>${ins.prenomEnfant} ${ins.nomEnfant}</strong> (initialement prévue à <strong>${ins.creneauHoraire}</strong>) n'a malheureusement pas pu avoir lieu.
      </p>

      <p style="font-size: 14px; color: #334155;">
        Nous vous prions d'accepter toutes nos excuses pour ce contretemps tout à fait indépendant de notre volonté.
      </p>

      ${
        validated.customMessage?.trim()
          ? `
      <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; padding: 14px 16px; border-radius: 8px; margin: 18px 0; font-size: 14px; color: #166534;">
        <strong>Message du club :</strong><br/>
        ${validated.customMessage.trim().replace(/\n/g, '<br/>')}
      </div>
      `
          : ''
      }

      <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 18px; margin: 24px 0; text-align: center;">
        <p style="margin: 0 0 14px; font-size: 14px; font-weight: 700; color: #0f172a;">
          Comment reprogrammer votre créneau ?
        </p>
        <p style="margin: 0 0 18px; font-size: 13px; color: #64748b;">
          Rien de plus simple : toutes vos informations sont déjà enregistrées. Cliquez sur le bouton ci-dessous pour choisir directement votre nouvelle date et votre horaire en 1 clic :
        </p>

        <a href="${rescheduleUrl}" style="display: inline-block; background-color: #10955d; color: #ffffff; text-decoration: none; font-weight: 700; font-size: 14px; padding: 13px 28px; border-radius: 10px; box-shadow: 0 2px 4px rgba(16, 149, 93, 0.3);">
          👉 Reprogrammer mon créneau de test
        </a>

        <p style="margin: 16px 0 0; font-size: 11px; color: #94a3b8;">
          Lien direct sécurisé : <a href="${rescheduleUrl}" style="color: #10955d;">${rescheduleUrl}</a>
        </p>
      </div>

      <p style="font-size: 13px; color: #64748b; margin-bottom: 0;">
        Si vous rencontrez la moindre difficulté ou si aucun créneau ne vous convient, n'hésitez pas à nous contacter directement par email à <a href="mailto:tritoncavaillon@gmail.com" style="color: #10955d; font-weight: 600;">tritoncavaillon@gmail.com</a>.
      </p>
    </div>

    <!-- Pied de page -->
    <div style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 16px 24px; text-align: center; font-size: 11px; color: #94a3b8;">
      <p style="margin: 0;">Triton Club Cavaillon · Piscine Alphonse Roudière, 84300 Cavaillon</p>
      <p style="margin: 4px 0 0;">Ceci est un message officiel automatique concernant votre inscription.</p>
    </div>
  </div>
</body>
</html>
      `

      await queueEmail({
        to: ins.emailParent.trim(),
        subject,
        html: emailHtml,
      })

      recipients.push(ins.emailParent.trim())
    }

    // 3. Optionnel : Bloquer la session annulée pour éviter de nouvelles inscriptions
    let sessionBlocked = false
    if (validated.bloquerSession && !session.bloquee) {
      await prisma.sessionTestNage.update({
        where: { id: session.id },
        data: { bloquee: true },
      })
      sessionBlocked = true
    }

    return NextResponse.json({
      success: true,
      count: recipients.length,
      recipients,
      sessionBlocked,
      message: `${recipients.length} email(s) de reprogrammation ajoutés à la file d'envoi.`,
    })
  } catch (error) {
    console.error('Erreur lors de la notification d’annulation de session:', error)
    return NextResponse.json(
      { error: 'Erreur lors de l’envoi des notifications d’annulation.' },
      { status: 500 }
    )
  }
}
