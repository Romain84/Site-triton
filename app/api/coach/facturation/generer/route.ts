import { NextRequest, NextResponse } from 'next/server'
import { getCoachSession } from '@/lib/auth/session'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { genererNumeroFactureSequentiel, creerFactureCoachSecurisee } from '@/lib/facture-utils'
import { calculerFactureCoach } from '@/lib/facture-calculations'
import { genererFacturePDF } from '@/lib/facture-pdf-generator'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'

const coachLogger = logger.withContext('CoachFacturationGenerer')

interface GenererRequest {
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

    const body: GenererRequest = await request.json()
    const { mois, annee } = body

    if (!mois || !annee || mois < 1 || mois > 12) {
      return NextResponse.json(
        { error: 'Mois ou année invalide' },
        { status: 400 }
      )
    }

    // 1. Vérifier si une facture existe déjà et son statut
    let facture = await prisma.factureCoach.findUnique({
      where: {
        coachId_mois_annee: {
          coachId: session.coachId,
          mois,
          annee,
        },
      },
    })

    if (facture && ['generee', 'envoyee', 'payee'].includes(facture.statut)) {
      return NextResponse.json(
        { error: 'Cette facture a déjà été générée et ne peut plus être recalculée ou modifiée.' },
        { status: 403 }
      )
    }

    // 2. Calculer le montant et les détails avec la prise en compte de la rentrée
    const details = await calculerFactureCoach(session.coachId, mois, annee)

    const dateNow = new Date()

    // 3. Créer ou mettre à jour la facture
    if (!facture) {
      facture = await creerFactureCoachSecurisee({
        coachId: session.coachId,
        mois,
        annee,
        montantTotal: details.totalMontant,
        tauxHoraire: details.tauxHoraire,
        statut: 'generee',
        dateGeneration: dateNow,
      })
    } else {
      let numero = facture.numero
      const isAlreadyFinalized = facture.statut === 'generee' || facture.statut === 'envoyee' || facture.statut === 'payee'

      // Si la facture est encore un brouillon, lui attribuer le numéro officiel avec initiales
      // Si la facture a déjà été générée/envoyée/payée, préserver STRICTEMENT son numéro historique
      if (!isAlreadyFinalized) {
        numero = await genererNumeroFactureSequentiel(session.coachId, annee)
      } else if (!numero || !numero.startsWith(`F-TCC-${annee}-`)) {
        numero = await genererNumeroFactureSequentiel(session.coachId, annee)
      }

      facture = await prisma.factureCoach.update({
        where: { id: facture.id },
        data: {
          numero,
          montantTotal: details.totalMontant,
          tauxHoraire: details.tauxHoraire,
          statut: 'generee',
          dateGeneration: dateNow,
        },
      })
    }

    // 4. Génération et archivage du PDF officiel sur le disque
    try {
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
    } catch (pdfErr) {
      coachLogger.error('Erreur lors de la génération physique du PDF', pdfErr)
    }

    return NextResponse.json({
      success: true,
      message: 'Facture générée avec succès ! Vous pouvez maintenant l\'envoyer au club ou la télécharger.',
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
