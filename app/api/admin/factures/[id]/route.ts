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

    const totalHeures = facture.lignes
      .filter((l) => ['planning_fixe', 'planning_tournant', 'remplacement', 'absence', 'manuel'].includes(l.type))
      .reduce((sum, l) => {
        if (l.type === 'absence') return sum - Math.abs(l.heures || 0)
        return sum + (l.heures || 0)
      }, 0)

    return NextResponse.json({
      facture: {
        ...facture,
        totalHeures,
      },
    })
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

    const moisNoms = [
      'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
      'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
    ]
    const moisNom = moisNoms[facture.mois - 1] || `${facture.mois}`

    if (facture.coach.email) {
      if (statut === 'payee') {
        await notifyCoach(facture.coach.email, {
          sujet: `✅ Règlement effectué - Facture ${facture.numero} (${moisNom} ${facture.annee})`,
          messageHtml: `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; rounded: 12px;">
              <h2 style="color: #0f172a; margin-top: 0;">Bonjour ${facture.coach.prenom},</h2>
              <p style="color: #334155; font-size: 15px; line-height: 1.5;">
                Le règlement de votre facture <strong>N° ${facture.numero}</strong> a été validé et effectué par le club.
              </p>
              <div style="background-color: #f8fafc; border-left: 4px solid #10b981; padding: 15px; margin: 20px 0; border-radius: 6px;">
                <p style="margin: 0; color: #0f172a; font-weight: bold;">Détails du paiement :</p>
                <p style="margin: 5px 0 0 0; color: #475569; font-size: 14px;">
                  • Période : <strong>${moisNom} ${facture.annee}</strong><br/>
                  • Montant réglé : <strong style="color: #047857; font-size: 16px;">${facture.montantTotal.toFixed(2)} €</strong><br/>
                  • Statut : <strong style="color: #047857;">Payée</strong>
                </p>
              </div>
              <p style="color: #64748b; font-size: 13px;">
                Vous pouvez consulter l'historique et télécharger votre facture à tout moment sur votre <a href="${process.env.NEXT_PUBLIC_URL || 'https://www.tritoncavaillon.fr'}/coach/facturation" style="color: #0284c7; text-decoration: underline;">Espace Coach</a>.
              </p>
              <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
              <p style="color: #94a3b8; font-size: 12px; margin: 0;">
                Triton Club Cavaillon — Secrétariat & Comptabilité
              </p>
            </div>
          `,
          messageTexte: `Bonjour ${facture.coach.prenom},\n\nLe règlement de votre facture N° ${facture.numero} d'un montant de ${facture.montantTotal.toFixed(2)} € (${moisNom} ${facture.annee}) a été validé et effectué par le club.\n\nRetrouvez le détail sur votre Espace Coach : ${process.env.NEXT_PUBLIC_URL || 'https://www.tritoncavaillon.fr'}/coach/facturation\n\nTriton Club Cavaillon`,
        })
      } else {
        await notifyCoach(facture.coach.email, {
          sujet: `Mise à jour de votre facture ${facture.numero}`,
          messageHtml: `<p>Bonjour ${facture.coach.prenom}, votre facture <strong>${facture.numero}</strong> (${moisNom} ${facture.annee}) est maintenant au statut <strong>${statut}</strong>.</p>`,
          messageTexte: `Bonjour ${facture.coach.prenom}, votre facture ${facture.numero} (${moisNom} ${facture.annee}) est maintenant au statut ${statut}.`,
        })
      }
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

export async function DELETE(
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

    const factureExistante = await prisma.factureCoach.findUnique({
      where: { id },
    })

    if (!factureExistante) {
      return NextResponse.json(
        { error: 'Facture introuvable' },
        { status: 404 }
      )
    }

    // Supprimer la facture (les lignes sont onDelete: Cascade)
    await prisma.factureCoach.delete({
      where: { id },
    })

    logAdminAudit({
      action: 'facture.delete',
      actorId: session.userId,
      actorRole: session.role,
      targetType: 'FactureCoach',
      targetId: id,
      details: { numero: factureExistante.numero },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    logger.withContext('Admin').error('Erreur lors de la suppression de la facture', error)
    return NextResponse.json(
      { error: 'Erreur lors de la suppression de la facture' },
      { status: 500 }
    )
  }
}
