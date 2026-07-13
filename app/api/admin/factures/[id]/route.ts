import { NextRequest, NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/auth/session'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { notifyAdmin, notifyCoach } from '@/lib/notifications'
import { logAdminAudit } from '@/lib/admin-audit'
import { isValidFactureCoachStatus, canTransitionFactureCoachStatus, type StatutFactureCoach } from '@/lib/facture-utils'
import { genererFacturePDF } from '@/lib/facture-pdf-generator'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'

interface Params {
  params: Promise<{
    id: string
  }>
}

export async function GET(
  request: NextRequest,
  { params }: Params
) {
  try {
    const session = await getAdminSession()

    if (!session) {
      return NextResponse.json(
        { error: 'Non authentifié' },
        { status: 401 }
      )
    }

    const { id } = await params

    const facture = await prisma.factureCoach.findUnique({
      where: { id },
      include: {
        coach: {
          select: {
            id: true,
            prenom: true,
            nom: true,
            email: true,
            telephone: true,
            photo: true,
            bio: true,
            specialites: true,
            siret: true,
            adresse: true,
          },
        },
        lignes: {
          orderBy: { ordre: 'asc' },
        },
      },
    })

    if (!facture) {
      return NextResponse.json(
        { error: 'Facture introuvable' },
        { status: 404 }
      )
    }

    return NextResponse.json({ facture })
  } catch (error) {
    logger.withContext('Admin').error('Erreur lors de la récupération des détails de la facture', error)
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des détails de la facture' },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: Params
) {
  try {
    const session = await getAdminSession()

    if (!session) {
      return NextResponse.json(
        { error: 'Non authentifié' },
        { status: 401 }
      )
    }

    const { id } = await params
    const body = await request.json()
    const { statut } = body

    // Valider le statut
    if (!statut || !isValidFactureCoachStatus(statut)) {
      return NextResponse.json(
        { error: 'Statut invalide' },
        { status: 400 }
      )
    }

    const factureExistante = await prisma.factureCoach.findUnique({
      where: { id },
      include: {
        coach: {
          select: {
            id: true,
            prenom: true,
            nom: true,
            email: true,
          },
        },
      },
    })

    if (!factureExistante) {
      return NextResponse.json(
        { error: 'Facture introuvable' },
        { status: 404 }
      )
    }

    const statutActuel = factureExistante.statut as StatutFactureCoach
    const statutCible = statut as StatutFactureCoach

    if (statutActuel !== statutCible && !canTransitionFactureCoachStatus(statutActuel, statutCible)) {
      return NextResponse.json(
        {
          error: `Transition de statut non autorisée: ${statutActuel} → ${statutCible}`,
        },
        { status: 400 }
      )
    }

    if (statutActuel === statutCible) {
      return NextResponse.json(factureExistante)
    }

    const dateNow = new Date()
    let pdfPath: string | undefined = undefined

    if (statut === 'payee') {
      try {
        const { buffer } = await genererFacturePDF(
          factureExistante.coachId,
          factureExistante.mois,
          factureExistante.annee
        )
        const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'factures')
        await mkdir(uploadDir, { recursive: true })
        const fileName = `facture-${factureExistante.id}.pdf`
        const filePath = path.join(uploadDir, fileName)
        await writeFile(filePath, buffer)
        pdfPath = `/uploads/factures/${fileName}`
        logger.info(`Facture PDF archivée générée et enregistrée à : ${pdfPath}`)
      } catch (err) {
        logger.error(`Échec de la génération de l'archive PDF lors du paiement :`, err)
      }
    }

    const facture = await prisma.factureCoach.update({
      where: { id },
      data: {
        statut,
        dateGeneration: statut === 'generee' && !factureExistante.dateGeneration ? dateNow : undefined,
        dateEnvoi: statut === 'envoyee' && !factureExistante.dateEnvoi ? dateNow : undefined,
        datePaiement: statut === 'payee' && !factureExistante.datePaiement ? dateNow : undefined,
        pdfPath: pdfPath || undefined,
      },
      include: {
        coach: {
          select: {
            id: true,
            prenom: true,
            nom: true,
            email: true,
          },
        },
      },
    })

    await notifyAdmin({
      sujet: `Facture coach ${facture.numero} mise à jour`,
      messageHtml: `<p>La facture <strong>${facture.numero}</strong> est passée au statut <strong>${statut}</strong>.</p>`,
      messageTexte: `La facture ${facture.numero} est passée au statut ${statut}.`,
    })

    if (facture.coach.email) {
      await notifyCoach(facture.coach.email, {
        sujet: `Mise à jour de votre facture ${facture.numero}`,
        messageHtml: `<p>Bonjour ${facture.coach.prenom}, votre facture <strong>${facture.numero}</strong> est maintenant au statut <strong>${statut}</strong>.</p>`,
        messageTexte: `Bonjour ${facture.coach.prenom}, votre facture ${facture.numero} est maintenant au statut ${statut}.`,
      })
    }

    logAdminAudit({
      action: 'facture.workflow.update',
      actorId: session.userId,
      actorRole: session.role,
      targetType: 'FactureCoach',
      targetId: facture.id,
      details: { statut },
    })

    return NextResponse.json(facture)
  } catch (error) {
    logger.withContext('Admin').error('Erreur lors de la mise à jour de la facture', error)
    return NextResponse.json(
      { error: 'Erreur lors de la mise à jour de la facture' },
      { status: 500 }
    )
  }
}
