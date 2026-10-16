import { NextRequest, NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/auth/session'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { notifyAdmin } from '@/lib/notifications'
import { logAdminAudit } from '@/lib/admin-audit'
import { isValidFactureCoachStatus, canTransitionFactureCoachStatus, doitEnvoyerEmailAuClub, type StatutFactureCoach } from '@/lib/facture-utils'
import { genererFacturePDF } from '@/lib/facture-pdf-generator'
import { calculerFactureCoach } from '@/lib/facture-calculations'
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

    const details = await calculerFactureCoach(facture.coachId, facture.mois, facture.annee)

    // Synchroniser le montant en base s'il était partiel ou inexact (UNIQUEMENT pour les brouillons)
    // Règle absolue : ne JAMAIS modifier une facture déjà générée, envoyée ou payée
    let finalMontantTotal = facture.montantTotal
    const isBrouillon = facture.statut === 'brouillon'
    if (isBrouillon && Math.abs(facture.montantTotal - details.totalMontant) > 0.01) {
      await prisma.factureCoach.update({
        where: { id: facture.id },
        data: { montantTotal: details.totalMontant },
      })
      finalMontantTotal = details.totalMontant
    }

    // Regrouper toutes les lignes calculées (planning fixe, remplacements, absences, compétitions, manuelles)
    const validManuelles = (details.lignesManuelles || []).filter(
      (l) => !['remplacement', 'absence'].includes(l.type)
    )
    const allCalculatedLignes = [
      ...details.lignesPlanningFixe.map((l, i) => ({ id: `fixe_${i}`, ...l })),
      ...details.lignesPlanningTournant.map((l, i) => ({ id: `tournant_${i}`, ...l })),
      ...details.lignesRemplacements.map((l, i) => ({ id: `remp_${i}`, ...l })),
      ...details.lignesAbsences.map((l, i) => ({ id: `abs_${i}`, ...l })),
      ...validManuelles,
    ]

    return NextResponse.json({
      facture: {
        ...facture,
        montantTotal: finalMontantTotal,
        totalHeures: details.totalHeures,
        lignes: allCalculatedLignes,
        sections: details.sections,
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

    // Mettre à jour avec le vrai montant calculé
    const details = await calculerFactureCoach(factureExistante.coachId, factureExistante.mois, factureExistante.annee)

    if (statut === 'payee' || statut === 'generee' || statut === 'envoyee') {
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
        logger.info(`Facture PDF générée et enregistrée à : ${pdfPath}`)
      } catch (err) {
        logger.error(`Échec de la génération de l'archive PDF :`, err)
      }
    }

    const facture = await prisma.factureCoach.update({
      where: { id },
      data: {
        statut,
        montantTotal: details.totalMontant,
        dateGeneration: statut === 'generee' && !factureExistante.dateGeneration ? dateNow : undefined,
        dateEnvoi: statut === 'envoyee' && !factureExistante.dateEnvoi ? dateNow : undefined,
        datePaiement: statut === 'payee' && !factureExistante.datePaiement ? dateNow : undefined,
        pdfPath: statut === 'brouillon' ? null : (pdfPath || undefined),
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

    // RÈGLE MÉTIER STRICTE : Le club ne reçoit d'email que lorsque la facture est "envoyée", JAMAIS en brouillon
    if (doitEnvoyerEmailAuClub(statut)) {
      await notifyAdmin({
        sujet: `[Facturation] Facture coach ${facture.numero} transmise au club`,
        messageHtml: `<p>La facture <strong>${facture.numero}</strong> de <strong>${facture.coach.prenom} ${facture.coach.nom || ''}</strong> a été transmise au secrétariat du club pour traitement.</p>`,
        messageTexte: `La facture ${facture.numero} de ${facture.coach.prenom} ${facture.coach.nom || ''} a été transmise au club pour traitement.`,
      })
    }

    // Note : Aucun e-mail n'est envoyé au coach lors des changements de statut (réservé exclusivement à la génération de facture).

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
