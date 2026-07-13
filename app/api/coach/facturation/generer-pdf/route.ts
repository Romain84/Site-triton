import { NextRequest, NextResponse } from 'next/server'
import { getCoachSession } from '@/lib/auth/session'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { genererFacturePDF } from '@/lib/facture-pdf-generator'
import { readFile } from 'fs/promises'
import path from 'path'

const coachLogger = logger.withContext('CoachPDF')

interface GeneratePDFRequest {
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

    const body: GeneratePDFRequest = await request.json()
    const { mois, annee } = body

    if (!mois || !annee || mois < 1 || mois > 12) {
      return NextResponse.json(
        { error: 'Mois ou année invalide' },
        { status: 400 }
      )
    }

    // 1. Récupérer les informations de la facture existante en base
    const facture = await prisma.factureCoach.findUnique({
      where: {
        coachId_mois_annee: {
          coachId: session.coachId,
          mois,
          annee,
        },
      },
    })

    // 2. Si la facture est payée et possède un PDF archivé sur le disque, on sert l'archive
    if (facture && facture.pdfPath) {
      const filePath = path.join(process.cwd(), 'public', facture.pdfPath)
      try {
        const archivedBuffer = await readFile(filePath)
        coachLogger.info(`Facture archivée trouvée et servie depuis le disque : ${facture.pdfPath}`)
        return new NextResponse(new Uint8Array(archivedBuffer), {
          headers: {
            'Content-Type': 'application/pdf',
            'Content-Disposition': `inline; filename="facture-${facture.numero}.pdf"`,
          },
        })
      } catch (err) {
        coachLogger.warn(`Archive PDF introuvable sur le disque (${facture.pdfPath}), régénération dynamique...`)
      }
    }

    // 3. Sinon, générer le PDF de manière dynamique
    const { buffer, numero } = await genererFacturePDF(session.coachId, mois, annee)

    // 4. Mettre à jour ou créer l'enregistrement FactureCoach
    if (!facture) {
      await prisma.factureCoach.create({
        data: {
          numero,
          coachId: session.coachId,
          mois,
          annee,
          montantTotal: 0, // Sera recalculé par les lignes ou restera dynamique
          tauxHoraire: 35, // Taux par défaut
          statut: 'generee',
        },
      })
    } else if (facture.statut === 'brouillon') {
      await prisma.factureCoach.update({
        where: { id: facture.id },
        data: { statut: 'generee' },
      })
    }

    // 5. Retourner le PDF dynamique
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="facture-${numero}.pdf"`,
      },
    })
  } catch (error) {
    coachLogger.error('Erreur lors de la génération du PDF', error)
    return NextResponse.json(
      { error: 'Erreur serveur lors de la génération du PDF' },
      { status: 500 }
    )
  }
}
