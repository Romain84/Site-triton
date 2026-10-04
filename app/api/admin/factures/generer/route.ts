import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { requireAdmin } from '@/lib/api/guards'
import { genererNumeroFactureSequentiel, creerFactureCoachSecurisee, doitEnvoyerEmailAuClub } from '@/lib/facture-utils'
import { sanitizeEmailHeader, queueEmail } from '@/lib/email'
import { calculerFactureCoach } from '@/lib/facture-calculations'
import { genererFacturePDF } from '@/lib/facture-pdf-generator'
import { logAdminAudit } from '@/lib/admin-audit'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'

const adminLogger = logger.withContext('AdminFacturation')

interface GenererFactureRequest {
  factureId?: string
  coachId?: string
  mois?: number
  annee?: number
  envoyerClub?: boolean
}

const moisNoms = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
]

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAdmin()
    if (!auth.ok) return auth.response

    const { searchParams } = new URL(request.url)
    const coachId = searchParams.get('coachId')
    const mois = parseInt(searchParams.get('mois') || '0', 10)
    const annee = parseInt(searchParams.get('annee') || '0', 10)

    if (!coachId || !mois || !annee) {
      return NextResponse.json({ error: 'Paramètres manquants (coachId, mois, annee)' }, { status: 400 })
    }

    const details = await calculerFactureCoach(coachId, mois, annee)
    return NextResponse.json({ details })
  } catch (error) {
    adminLogger.error('Erreur lors de la prévisualisation de facture', error)
    return NextResponse.json({ error: 'Erreur lors du calcul de la facture' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdmin()
    if (!auth.ok) return auth.response

    const body: GenererFactureRequest = await request.json()
    let { factureId, coachId, mois, annee, envoyerClub } = body

    if (factureId) {
      const existing = await prisma.factureCoach.findUnique({
        where: { id: factureId },
      })
      if (!existing) {
        return NextResponse.json({ error: 'Facture introuvable' }, { status: 404 })
      }
      coachId = existing.coachId
      mois = existing.mois
      annee = existing.annee
    }

    if (!coachId || !mois || !annee) {
      return NextResponse.json(
        { error: 'Paramètres manquants (coachId, mois, annee)' },
        { status: 400 }
      )
    }

    const coach = await prisma.coach.findUnique({
      where: { id: coachId },
    })

    if (!coach) {
      return NextResponse.json({ error: 'Coach non trouvé' }, { status: 404 })
    }

    // 1. Calcul des détails complets
    const details = await calculerFactureCoach(coachId, mois, annee)

    // 2. Trouver ou créer la facture
    let facture = await prisma.factureCoach.findUnique({
      where: {
        coachId_mois_annee: {
          coachId,
          mois,
          annee,
        },
      },
    })

    const dateNow = new Date()
    const statutCible = envoyerClub ? 'envoyee' : 'generee'

    if (!facture) {
      facture = await creerFactureCoachSecurisee({
        coachId,
        mois,
        annee,
        montantTotal: details.totalMontant,
        tauxHoraire: details.tauxHoraire,
        statut: statutCible,
        dateGeneration: dateNow,
        dateEnvoi: envoyerClub ? dateNow : undefined,
      })
    } else {
      let numero = facture.numero
      const isAlreadyFinalized = facture.statut === 'generee' || facture.statut === 'envoyee' || facture.statut === 'payee'
      
      // Si la facture est encore un brouillon, lui attribuer le numéro officiel avec initiales
      // Si la facture a déjà été générée/envoyée/payée, préserver STRICTEMENT son numéro historique
      if (!isAlreadyFinalized) {
        numero = await genererNumeroFactureSequentiel(coachId, annee)
      } else if (!numero || !numero.startsWith(`F-TCC-${annee}-`)) {
        numero = await genererNumeroFactureSequentiel(coachId, annee)
      }
      facture = await prisma.factureCoach.update({
        where: { id: facture.id },
        data: {
          numero,
          montantTotal: details.totalMontant,
          tauxHoraire: details.tauxHoraire,
          statut: statutCible,
          dateGeneration: facture.dateGeneration || dateNow,
          dateEnvoi: envoyerClub ? dateNow : facture.dateEnvoi,
        },
      })
    }

    // 3. Génération et sauvegarde du PDF officiel
    const { buffer: pdfBuffer } = await genererFacturePDF(coachId, mois, annee)
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

    const moisNom = moisNoms[mois - 1] || `${mois}`

    // 4. Si demande d'envoi par e-mail au club (strictement quand statut === 'envoyee', JAMAIS en brouillon)
    if (envoyerClub && doitEnvoyerEmailAuClub(facture.statut)) {
      const settings = await prisma.settings.findFirst()
      const emailClub = settings?.emailClub || 'tritoncavaillon@gmail.com'

      await queueEmail({
        to: sanitizeEmailHeader(emailClub),
        subject: sanitizeEmailHeader(
          `[Facturation] Facture de ${coach.prenom} ${coach.nom || ''} - ${moisNom} ${annee} (${details.totalMontant.toFixed(2)} €)`
        ),
        text: `Bonjour,\n\nVeuillez trouver ci-joint la facture officielle de ${coach.prenom} ${coach.nom || ''} pour le mois de ${moisNom} ${annee}.\nMontant total : ${details.totalMontant.toFixed(2)} €.\n\nTriton Club Cavaillon`,
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px;">
            <h2 style="color: #0f172a; margin-top: 0;">Facture Coach — Triton Club Cavaillon</h2>
            <p style="color: #334155; font-size: 15px; line-height: 1.5;">
              La facture de <strong>${coach.prenom} ${coach.nom || ''}</strong> pour la période de <strong>${moisNom} ${annee}</strong> a été validée et transmise au club.
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
              Triton Club Cavaillon — Système de Gestion Sportive & Facturation
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

      // Envoyer également l'exemplaire officiel avec le PDF au coach pour ses archives
      if (coach.email) {
        await queueEmail({
          to: sanitizeEmailHeader(coach.email),
          subject: sanitizeEmailHeader(`[Triton Club] Votre facture ${facture.numero} - ${moisNom} ${annee}`),
          text: `Bonjour ${coach.prenom},\n\nVotre facture N° ${facture.numero} pour le mois de ${moisNom} ${annee} d'un montant de ${details.totalMontant.toFixed(2)} € a été générée et transmise au club pour règlement.\n\nVous trouverez votre facture au format PDF en pièce jointe pour vos archives.\n\nTriton Club Cavaillon`,
          html: `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px;">
              <h2 style="color: #0f172a; margin-top: 0;">Bonjour ${coach.prenom},</h2>
              <p style="color: #334155; font-size: 15px; line-height: 1.5;">
                Votre facture <strong>N° ${facture.numero}</strong> pour la période de <strong>${moisNom} ${annee}</strong> d'un montant de <strong>${details.totalMontant.toFixed(2)} €</strong> a été générée et transmise au club pour règlement.
              </p>
              <div style="background-color: #f8fafc; border-left: 4px solid #10b981; padding: 15px; margin: 20px 0; border-radius: 6px;">
                <p style="margin: 0; color: #0f172a; font-weight: bold;">Détails :</p>
                <p style="margin: 5px 0 0 0; color: #475569; font-size: 14px;">
                  • Référence : <strong>${facture.numero}</strong><br/>
                  • Période : <strong>${moisNom} ${annee}</strong><br/>
                  • Total à régler : <strong style="color: #047857; font-size: 16px;">${details.totalMontant.toFixed(2)} €</strong>
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
    }

    logAdminAudit({
      action: envoyerClub ? 'facture.generer_et_envoyer' : 'facture.generer',
      actorId: auth.session.userId,
      actorRole: auth.session.role,
      targetType: 'FactureCoach',
      targetId: facture.id,
      details: {
        coach: `${coach.prenom} ${coach.nom || ''}`,
        mois,
        annee,
        montantTotal: details.totalMontant,
        envoyerClub: !!envoyerClub,
      },
    })

    return NextResponse.json({
      success: true,
      message: envoyerClub
        ? `Facture ${facture.numero} générée et envoyée au club par e-mail avec succès.`
        : `Facture ${facture.numero} générée avec succès.`,
      facture,
      pdfUrl: pdfPath,
    })
  } catch (error) {
    adminLogger.error('Erreur lors de la génération de la facture admin', error)
    return NextResponse.json(
      { error: 'Erreur lors de la génération de la facture' },
      { status: 500 }
    )
  }
}
