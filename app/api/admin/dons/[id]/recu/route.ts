import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin, handleRouteError } from '@/lib/api/guards'
import { apiError, apiSuccess } from '@/lib/api/response'
import { generateDonationPDF } from '@/lib/pdf/recu-pdf-generator'
import { queueEmail } from '@/lib/email'
import { logAdminAudit } from '@/lib/admin-audit'
import { logger } from '@/lib/logger'
import { put } from '@vercel/blob'
import fs from 'fs/promises'
import path from 'path'

interface Params {
  params: Promise<{
    id: string
  }>
}

export async function POST(request: NextRequest, { params }: Params) {
  try {
    const auth = await requireAdmin()
    if (!auth.ok) return auth.response

    // Rôles autorisés
    if (auth.session.role !== 'admin') {
      return apiError('Accès interdit', 403)
    }

    const { id } = await params
    const body = await request.json().catch(() => ({}))
    const sendEmailOption = body.sendEmail ?? true

    // --- TRANSACTION ATOMIQUE AVEC RETRY POUR LA NUMÉROTATION SÉQUENTIELLE ---
    let updatedDon: any = null
    let attempts = 0
    const maxAttempts = 5

    while (attempts < maxAttempts) {
      try {
        updatedDon = await prisma.$transaction(async (tx) => {
          // 1. Récupérer le don et verrouiller
          const don = await tx.don.findUnique({ where: { id } })
          if (!don) {
            throw new Error('DON_NOT_FOUND')
          }
          if (don.statut !== 'brouillon') {
            throw new Error('DON_ALREADY_EMITTED')
          }

          // 2. Déterminer l'année d'émission
          const currentYear = new Date().getFullYear()
          const prefix = `TCC-${currentYear}-`

          // 3. Trouver le dernier don émis cette année pour le compteur séquentiel
          const lastEmitted = await tx.don.findFirst({
            where: {
              numeroRecu: {
                startsWith: prefix
              }
            },
            orderBy: {
              numeroRecu: 'desc'
            }
          })

          let sequence = 1
          if (lastEmitted) {
            const parts = lastEmitted.numeroRecu.split('-')
            const lastSeqStr = parts[2]
            if (lastSeqStr) {
              const lastSeq = parseInt(lastSeqStr, 10)
              if (!isNaN(lastSeq)) {
                sequence = lastSeq + 1
              }
            }
          }

          const nextSeqStr = String(sequence).padStart(5, '0')
          const finalNumeroRecu = `${prefix}${nextSeqStr}`

          // 4. Mettre à jour le don
          return await tx.don.update({
            where: { id },
            data: {
              numeroRecu: finalNumeroRecu,
              statut: 'emis',
              dateEmission: new Date(),
            }
          })
        })
        break // Sortir de la boucle si la transaction a réussi
      } catch (error: any) {
        // En cas de conflit d'unicité (P2002), on incrémente l'essai et on recommence
        if (error.code === 'P2002' || error.message?.includes('Unique constraint')) {
          attempts++
          await new Promise((resolve) => setTimeout(resolve, 50 + Math.random() * 100))
          continue
        }
        // Gestion des cas d'erreur de logique métier
        if (error.message === 'DON_NOT_FOUND') {
          return apiError('Don introuvable', 404)
        }
        if (error.message === 'DON_ALREADY_EMITTED') {
          return apiError('Ce reçu de don a déjà été émis ou annulé', 400)
        }
        throw error
      }
    }

    if (!updatedDon) {
      return apiError('Erreur de concurrence lors de la réservation du numéro de reçu fiscal. Veuillez réessayer.', 500)
    }

    // Récupérer le club/settings pour la signature
    const settings = await prisma.settings.findFirst()
    if (!settings) {
      return apiError('Les paramètres du club ne sont pas encore configurés.', 400)
    }

    // Déterminer le signataire choisi
    const isTresoriere = updatedDon.signataire === 'tresoriere'
    const targetSignatureUrl = isTresoriere ? settings.signatureTresoriereUrl : settings.signaturePresidentUrl
    const targetNom = isTresoriere ? (settings.nomTresoriereRecu || 'La Trésorière') : (settings.nomSignataireRecu || 'Le Président')
    const targetTitre = isTresoriere ? (settings.titreTresoriereRecu || 'Trésorière') : (settings.titreSignataireRecu || 'Président')

    // Charger l'image de la signature (Base64)
    let signatureBase64: string | null = null
    if (targetSignatureUrl) {
      try {
        if (targetSignatureUrl.startsWith('/')) {
          // Fichier local sur le serveur
          const localPath = path.join(process.cwd(), 'public', targetSignatureUrl)
          const fileBuffer = await fs.readFile(localPath)
          const ext = path.extname(targetSignatureUrl).replace('.', '')
          signatureBase64 = `data:image/${ext};base64,${fileBuffer.toString('base64')}`
        } else {
          // URL distante (ex: Vercel Blob)
          const response = await fetch(targetSignatureUrl)
          if (response.ok) {
            const arrayBuffer = await response.arrayBuffer()
            const buffer = Buffer.from(arrayBuffer)
            const contentType = response.headers.get('content-type') || 'image/png'
            signatureBase64 = `data:${contentType};base64,${buffer.toString('base64')}`
          }
        }
      } catch (err) {
        logger.error('Erreur chargement signature', err)
      }
    }

    // --- GÉNÉRATION DU PDF FISCAL ---
    const doc = generateDonationPDF({
      numeroRecu: updatedDon.numeroRecu,
      typeDonateur: updatedDon.typeDonateur as any,
      nomDonateur: updatedDon.nomDonateur,
      adresseDonateur: updatedDon.adresseDonateur,
      siren: updatedDon.siren,
      montant: updatedDon.montant,
      montantLettres: updatedDon.montantLettres,
      dateDon: updatedDon.dateDon,
      natureDon: updatedDon.natureDon as any,
      descriptionNature: updatedDon.descriptionNature,
      modePaiement: updatedDon.modePaiement,
      dateEmission: updatedDon.dateEmission,
      nomClub: settings.nomClub,
      signatureBase64: signatureBase64,
      nomSignataireRecu: targetNom,
      titreSignataireRecu: targetTitre,
    })

    const pdfArrayBuffer = doc.output('arraybuffer')
    const pdfBuffer = Buffer.from(pdfArrayBuffer)

    // --- STOCKAGE DU PDF (Vercel Blob avec fallback local) ---
    let pdfUrl = ''
    if (process.env.BLOB_READ_WRITE_TOKEN) {
      try {
        const blob = await put(`recus/${updatedDon.numeroRecu}.pdf`, pdfBuffer, {
          access: 'public',
          contentType: 'application/pdf',
        })
        pdfUrl = blob.url
      } catch (err) {
        logger.error('Erreur stockage Blob, tentative de fallback local', err)
      }
    }

    // Fallback local si Blob non configuré ou échoué
    if (!pdfUrl) {
      const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'recus')
      await fs.mkdir(uploadDir, { recursive: true })
      const fileName = `${Date.now()}-${updatedDon.numeroRecu}.pdf`
      const filePath = path.join(uploadDir, fileName)
      await fs.writeFile(filePath, pdfBuffer)
      pdfUrl = `/uploads/recus/${fileName}`
    }

    // Mettre à jour l'URL du PDF sur le don
    const donFinal = await prisma.don.update({
      where: { id },
      data: { pdfUrl },
    })

    // --- LIAISON COMPTABLE AUTOMATIQUE ---
    let transactionComptableId = null
    try {
      const transaction = await prisma.transactionComptable.create({
        data: {
          type: 'recette',
          categorie: 'don',
          libelle: `Don reçu n° ${donFinal.numeroRecu} - ${donFinal.nomDonateur}`,
          montant: donFinal.montant,
          date: donFinal.dateDon,
          justificatif: pdfUrl,
        }
      })
      transactionComptableId = transaction.id
    } catch (err) {
      logger.error('Erreur lors de la création de la transaction comptable automatique', err)
      // Ne bloque pas la génération du reçu, on continue
    }

    // --- ENVOI DE L'EMAIL PAR LA FILE D'ATTENTE (QUEUE) ---
    let emailQueued = false
    if (sendEmailOption && donFinal.emailDonateur) {
      try {
        const dateDonFr = new Date(donFinal.dateDon).toLocaleDateString('fr-FR')
        const emailHtml = `
          <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 8px;">
            <div style="background-color: #00bcd4; padding: 15px; text-align: center; border-radius: 6px 6px 0 0;">
              <h1 style="color: white; margin: 0; font-size: 20px;">Triton Club Cavaillon</h1>
            </div>
            <div style="padding: 20px;">
              <p>Bonjour <strong>${donFinal.nomDonateur}</strong>,</p>
              <p>Nous vous remercions chaleureusement pour votre don de <strong>${donFinal.montant.toFixed(2)} €</strong> versé le ${dateDonFr} au profit de notre association.</p>
              <p>Votre générosité contribue activement au fonctionnement du club et au développement de nos activités sportives.</p>
              <p>Vous trouverez en pièce jointe votre reçu fiscal officiel <strong>n° ${donFinal.numeroRecu}</strong> au format PDF. Ce document est à conserver pour faire valoir vos droits à réduction fiscale.</p>
              
              <div style="background-color: #f9f9f9; padding: 15px; border-left: 4px solid #00bcd4; margin: 20px 0; border-radius: 0 4px 4px 0;">
                <p style="margin: 0 0 5px 0;"><strong>Récapitulatif de votre don :</strong></p>
                <ul style="margin: 0; padding-left: 20px;">
                  <li>Reçu fiscal : n° ${donFinal.numeroRecu}</li>
                  <li>Montant : ${donFinal.montant.toFixed(2)} €</li>
                  <li>Date de versement : ${dateDonFr}</li>
                </ul>
              </div>

              <p>Sportivement,</p>
              <p><strong>L'équipe du Triton Club Cavaillon</strong></p>
            </div>
            <div style="text-align: center; font-size: 11px; color: #888; border-top: 1px solid #eee; padding-top: 15px;">
              Triton Club Cavaillon — Association sportive reconnue d'intérêt général
            </div>
          </div>
        `

        await queueEmail({
          to: donFinal.emailDonateur,
          subject: `Reçu fiscal don n° ${donFinal.numeroRecu} — Triton Club Cavaillon`,
          html: emailHtml,
          attachments: [
            {
              filename: `Recu_Fiscal_${donFinal.numeroRecu}.pdf`,
              content: pdfBuffer,
              contentType: 'application/pdf',
            }
          ]
        })
        emailQueued = true
      } catch (err) {
        logger.error('Erreur lors de la mise en file d\'attente de l\'email', err)
      }
    }

    // Log d'audit
    logAdminAudit({
      action: 'Émission du reçu fiscal de don',
      actorId: auth.session.userId,
      actorRole: auth.session.role,
      targetType: 'don',
      targetId: donFinal.id,
      details: {
        numeroRecu: donFinal.numeroRecu,
        nomDonateur: donFinal.nomDonateur,
        montant: donFinal.montant,
        emailEnvoye: emailQueued,
        transactionComptableId,
      }
    })

    return apiSuccess({ don: donFinal, emailEnvoye: emailQueued })
  } catch (error) {
    return handleRouteError(error, 'Erreur lors de l\'émission du reçu fiscal')
  }
}
