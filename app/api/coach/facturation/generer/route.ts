import { NextRequest, NextResponse } from 'next/server'
import { getCoachSession } from '@/lib/auth/session'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { genererNumeroFactureSequentiel, creerFactureCoachSecurisee } from '@/lib/facture-utils'
import { sanitizeEmailHeader, queueEmail } from '@/lib/email'
import { calculerFactureCoach } from '@/lib/facture-calculations'
import { genererFacturePDF } from '@/lib/facture-pdf-generator'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'

const coachLogger = logger.withContext('CoachFacturationGenerer')

interface GenererRequest {
  mois: number
  annee: number
}

const MOIS_NOMS = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
]

export async function POST(request: NextRequest) {
  try {
    const session = await getCoachSession()

    if (!session) {
      return NextResponse.json(
        { error: 'Non authentifié' },
        { status: 401 }
      )
    }

    const body: GenererRequest = await request.json()
    const { mois, annee } = body

    if (!mois || !annee || mois < 1 || mois > 12) {
      return NextResponse.json(
        { error: 'Mois ou année invalide' },
        { status: 400 }
      )
    }

    // 1. Récupérer le coach
    const coach = await prisma.coach.findUnique({
      where: { id: session.coachId },
    })

    if (!coach) {
      return NextResponse.json(
        { error: 'Coach non trouvé' },
        { status: 404 }
      )
    }

    // 2. Vérifier si une facture existe déjà et son statut
    let facture = await prisma.factureCoach.findUnique({
      where: {
        coachId_mois_annee: {
          coachId: session.coachId,
          mois,
          annee,
        },
      },
    })

    if (facture && ['envoyee', 'payee'].includes(facture.statut)) {
      return NextResponse.json(
        { error: 'Cette facture a déjà été transmise au club et ne peut plus être modifiée.' },
        { status: 403 }
      )
    }

    // 3. Calculer le montant et les détails
    const details = await calculerFactureCoach(session.coachId, mois, annee)

    const dateNow = new Date()

    // 4. Déterminer le numéro officiel séquentiel
    let numero: string
    if (facture?.numero && facture.numero.startsWith(`F-TCC-${annee}-`)) {
      numero = facture.numero
    } else {
      numero = await genererNumeroFactureSequentiel(session.coachId, annee)
    }

    // 5. Créer ou mettre à jour la facture directement au statut 'envoyee'
    if (!facture) {
      facture = await creerFactureCoachSecurisee({
        coachId: session.coachId,
        mois,
        annee,
        montantTotal: details.totalMontant,
        tauxHoraire: details.tauxHoraire,
        statut: 'envoyee',
        dateGeneration: dateNow,
        dateEnvoi: dateNow,
      })
    } else {
      facture = await prisma.factureCoach.update({
        where: { id: facture.id },
        data: {
          numero,
          montantTotal: details.totalMontant,
          tauxHoraire: details.tauxHoraire,
          statut: 'envoyee',
          dateGeneration: dateNow,
          dateEnvoi: dateNow,
        },
      })
    }

    // 6. Génération et archivage du PDF officiel sur le disque
    const { buffer: pdfBuffer } = await genererFacturePDF(session.coachId, mois, annee)
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'factures')
    await mkdir(uploadDir, { recursive: true })
    const fileName = `facture-${facture.id}.pdf`
    const filePath = path.join(uploadDir, fileName)
    await writeFile(filePath, pdfBuffer)
    const pdfPath = `/uploads/factures/${fileName}`

    facture = await prisma.factureCoach.update({
      where: { id: facture.id },
      data: { pdfPath },
    })

    const moisNom = MOIS_NOMS[mois - 1] || `${mois}`

    // 7. Envoi de l'e-mail officiel au secrétariat du club avec le PDF joint
    const settings = await prisma.settings.findFirst()
    const emailClub = settings?.emailClub || 'tritoncavaillon@gmail.com'

    await queueEmail({
      to: sanitizeEmailHeader(emailClub),
      replyTo: coach.email ? sanitizeEmailHeader(coach.email) : undefined,
      subject: sanitizeEmailHeader(
        `[Facturation] Facture de ${coach.prenom} ${coach.nom || ''} - ${moisNom} ${annee} (${details.totalMontant.toFixed(2)} €)`
      ),
      text: `Bonjour,\n\nVeuillez trouver ci-joint la facture officielle de ${coach.prenom} ${coach.nom || ''} pour le mois de ${moisNom} ${annee}.\nMontant total : ${details.totalMontant.toFixed(2)} €.\n\nTriton Club Cavaillon`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px;">
          <h2 style="color: #0f172a; margin-top: 0;">Facture Coach — Triton Club Cavaillon</h2>
          <p style="color: #334155; font-size: 15px; line-height: 1.5;">
            La facture de <strong>${coach.prenom} ${coach.nom || ''}</strong> pour la période de <strong>${moisNom} ${annee}</strong> a été générée et transmise au club.
          </p>
          <div style="background-color: #f8fafc; border-left: 4px solid #10b981; padding: 15px; margin: 20px 0; border-radius: 6px;">
            <p style="margin: 0; color: #0f172a; font-weight: bold;">Récapitulatif de la facture :</p>
            <p style="margin: 5px 0 0 0; color: #475569; font-size: 14px;">
              • Référence : <strong>${facture.numero}</strong><br/>
              • Période : <strong>${moisNom} ${annee}</strong><br/>
              • Heures travaillées : <strong>${details.totalHeures.toFixed(2)} h</strong><br/>
              • Montant à régler : <strong style="color: #047857; font-size: 16px;">${details.totalMontant.toFixed(2)} €</strong>
            </p>
          </div>
          <p style="color: #64748b; font-size: 13px;">
            Le document officiel au format PDF est joint à cet e-mail.
          </p>
          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
          <p style="color: #94a3b8; font-size: 12px; margin: 0;">
            Triton Club Cavaillon — Facturation & Gestion sportive
          </p>
        </div>
      `,
      attachments: [
        {
          filename: `facture-${facture.numero}.pdf`,
          content: pdfBuffer,
          contentType: 'application/pdf',
        },
      ],
    })

    // 8. Envoi de l'exemplaire officiel par e-mail au coach pour ses archives
    if (coach.email) {
      await queueEmail({
        to: sanitizeEmailHeader(coach.email),
        subject: sanitizeEmailHeader(`[Triton Club] Confirmation de votre facture ${facture.numero} - ${moisNom} ${annee}`),
        text: `Bonjour ${coach.prenom},\n\nVotre facture N° ${facture.numero} pour le mois de ${moisNom} ${annee} d'un montant de ${details.totalMontant.toFixed(2)} € a bien été générée et transmise au secrétariat du club pour règlement.\n\nVous trouverez votre facture au format PDF en pièce jointe pour vos archives.\n\nCordialement,\nTriton Club Cavaillon`,
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px;">
            <h2 style="color: #0f172a; margin-top: 0;">Bonjour ${coach.prenom},</h2>
            <p style="color: #334155; font-size: 15px; line-height: 1.5;">
              Votre facture <strong>N° ${facture.numero}</strong> pour la période de <strong>${moisNom} ${annee}</strong> d'un montant de <strong>${details.totalMontant.toFixed(2)} €</strong> a été générée et transmise avec succès au secrétariat du club pour règlement.
            </p>
            <div style="background-color: #f8fafc; border-left: 4px solid #10b981; padding: 15px; margin: 20px 0; border-radius: 6px;">
              <p style="margin: 0; color: #0f172a; font-weight: bold;">Récapitulatif de votre facture :</p>
              <p style="margin: 5px 0 0 0; color: #475569; font-size: 14px;">
                • Référence : <strong>${facture.numero}</strong><br/>
                • Période : <strong>${moisNom} ${annee}</strong><br/>
                • Total à percevoir : <strong style="color: #047857; font-size: 16px;">${details.totalMontant.toFixed(2)} €</strong><br/>
                • Statut : <strong style="color: #047857;">Transmise au club</strong>
              </p>
            </div>
            <p style="color: #64748b; font-size: 13px;">
              Votre document officiel au format PDF est joint à cet e-mail pour vos archives personnelles.
            </p>
            <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
            <p style="color: #94a3b8; font-size: 12px; margin: 0;">
              Triton Club Cavaillon
            </p>
          </div>
        `,
        attachments: [
          {
            filename: `facture-${facture.numero}.pdf`,
            content: pdfBuffer,
            contentType: 'application/pdf',
          },
        ],
      })
    }

    return NextResponse.json({
      success: true,
      message: 'Facture générée et transmise au club avec succès ! Votre exemplaire PDF vous a été envoyé par e-mail.',
      facture,
      details,
    })
  } catch (error) {
    coachLogger.error('Erreur lors de la génération de la facture', error)
    return NextResponse.json(
      { error: 'Erreur serveur lors de la génération de la facture' },
      { status: 500 }
    )
  }
}
