import { NextRequest, NextResponse } from 'next/server'
import { getCoachSession } from '@/lib/auth/session'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { genererNumeroFactureSequentiel } from '@/lib/facture-utils'
import { sanitizeEmailHeader, queueEmail } from '@/lib/email'
import { calculerFactureCoach } from '@/lib/facture-calculations'
import { genererFacturePDF } from '@/lib/facture-pdf-generator'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'

const coachLogger = logger.withContext('Coach')

interface SendEmailRequest {
  mois: number
  annee: number
}

export async function POST(request: NextRequest) {
  try {
    const session = await getCoachSession()

    if (!session) {
      return NextResponse.json(
        { error: 'Non authentifié' },
        { status: 401 }
      )
    }

    const body: SendEmailRequest = await request.json()
    const { mois, annee } = body

    // Récupérer les paramètres SMTP et email du club
    const settings = await prisma.settings.findFirst()

    if (!settings || !settings.emailClub) {
      return NextResponse.json(
        { error: 'Adresse email du club non configurée' },
        { status: 400 }
      )
    }

    if (!settings.smtpHost || !settings.smtpPort || !settings.smtpUser || !settings.smtpPassword) {
      return NextResponse.json(
        { error: 'Paramètres SMTP non configurés' },
        { status: 400 }
      )
    }

    // Récupérer le coach
    const coach = await prisma.coach.findUnique({
      where: { id: session.coachId },
    })

    if (!coach) {
      return NextResponse.json(
        { error: 'Coach non trouvé' },
        { status: 404 }
      )
    }

    // Calculer les détails unifiés via le helper partagé
    const details = await calculerFactureCoach(session.coachId, mois, annee)

    // Récupérer ou créer la facture
    let facture = await prisma.factureCoach.findUnique({
      where: {
        coachId_mois_annee: {
          coachId: session.coachId,
          mois,
          annee,
        },
      },
    })

    if (!facture) {
      // Générer un numéro unique séquentiel continu
      const numero = await genererNumeroFactureSequentiel(session.coachId, annee)

      facture = await prisma.factureCoach.create({
        data: {
          numero,
          coachId: session.coachId,
          mois,
          annee,
          montantTotal: details.totalMontant,
          tauxHoraire: details.tauxHoraire,
          statut: 'brouillon',
        },
      })
    } else {
      // Mettre à jour le montant avant envoi
      await prisma.factureCoach.update({
        where: { id: facture.id },
        data: { montantTotal: details.totalMontant },
      })
    }

    // Générer le PDF unifié de manière professionnelle
    const { buffer: pdfBuffer } = await genererFacturePDF(session.coachId, mois, annee)

    // Sauvegarder le PDF sur le serveur pour téléchargement ultérieur
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'factures')
    await mkdir(uploadDir, { recursive: true })
    const fileName = `facture-${facture.id}.pdf`
    const filePath = path.join(uploadDir, fileName)
    await writeFile(filePath, pdfBuffer)
    const pdfPath = `/uploads/factures/${fileName}`

    const moisNoms = [
      'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
      'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
    ]

    // Envoyer l'email de manière asynchrone via la file d'attente
    await queueEmail({
      to: sanitizeEmailHeader(settings.emailClub),
      subject: sanitizeEmailHeader(`[Facturation] Facture de ${coach.prenom} ${coach.nom || ''} - ${moisNoms[mois - 1]} ${annee}`),
      text: `Bonjour,\n\nVeuillez trouver ci-joint la facture de ${coach.prenom} ${coach.nom || ''} pour le mois de ${moisNoms[mois - 1]} ${annee}.\n\nCordialement,\n${coach.prenom} ${coach.nom || ''}`,
      html: `
        <p>Bonjour,</p>
        <p>Veuillez trouver ci-joint la facture de <strong>${coach.prenom} ${coach.nom || ''}</strong> pour le mois de <strong>${moisNoms[mois - 1]} ${annee}</strong>.</p>
        <p>Cordialement,<br>${coach.prenom} ${coach.nom || ''}</p>
      `,
      attachments: [
        {
          filename: `facture-${facture.numero}.pdf`,
          content: pdfBuffer,
          contentType: 'application/pdf',
        },
      ],
    })

    const dateNow = new Date()

    // Mettre à jour le statut et la date d'envoi
    facture = await prisma.factureCoach.update({
      where: { id: facture.id },
      data: {
        statut: 'envoyee',
        dateEnvoi: dateNow,
        pdfPath,
      },
    })

    return NextResponse.json({
      success: true,
      message: 'Facture envoyée au secrétariat du club avec succès !',
      facture,
    })
  } catch (error) {
    coachLogger.error('Erreur lors de l\'envoi de l\'email', error)
    return NextResponse.json(
      { error: 'Erreur lors de l\'envoi de l\'email' },
      { status: 500 }
    )
  }
}
