import { NextRequest, NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/auth/session'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { genererNumeroDevisSequentiel } from '@/lib/devis-utils'
import { genererDevisPDF } from '@/lib/pdf/devis-pdf-generator'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'

const adminLogger = logger.withContext('AdminDevis')

export async function GET(request: NextRequest) {
  try {
    const session = await getAdminSession()
    if (!session) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const statut = searchParams.get('statut')
    const search = searchParams.get('search')

    const where: any = {}
    if (statut && statut !== 'tous') {
      where.statut = statut
    }

    if (search) {
      where.OR = [
        { clientNom: { contains: search, mode: 'insensitive' } },
        { numero: { contains: search, mode: 'insensitive' } },
        { titre: { contains: search, mode: 'insensitive' } },
      ]
    }

    const devisList = await prisma.devis.findMany({
      where,
      include: {
        lignes: {
          orderBy: { ordre: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ devis: devisList })
  } catch (error) {
    adminLogger.error('Erreur lors de la récupération des devis', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

interface CreateLigneInput {
  description: string
  quantite?: number
  prixUnitaire?: number
}

interface CreateDevisInput {
  titre: string
  clientNom: string
  clientEmail?: string
  clientTelephone?: string
  clientAdresse?: string
  dateEmission?: string
  dateValidite?: string
  notes?: string
  lignes: CreateLigneInput[]
}

export async function POST(request: NextRequest) {
  try {
    const session = await getAdminSession()
    if (!session) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const body: CreateDevisInput = await request.json()
    const {
      titre,
      clientNom,
      clientEmail,
      clientTelephone,
      clientAdresse,
      dateEmission,
      dateValidite,
      notes,
      lignes = [],
    } = body

    if (!clientNom?.trim()) {
      return NextResponse.json({ error: 'Le nom du client est requis' }, { status: 400 })
    }

    if (!titre?.trim()) {
      return NextResponse.json({ error: 'L\'objet ou titre du devis est requis' }, { status: 400 })
    }

    if (lignes.length === 0) {
      return NextResponse.json({ error: 'Au moins une prestation doit être renseignée' }, { status: 400 })
    }

    const dateEm = dateEmission ? new Date(dateEmission) : new Date()
    const annee = dateEm.getFullYear()
    const numero = await genererNumeroDevisSequentiel(annee)

    // Calcul de la date de validité (+30 jours par défaut)
    const dateVal = dateValidite
      ? new Date(dateValidite)
      : new Date(dateEm.getTime() + 30 * 24 * 60 * 60 * 1000)

    // Calcul des totaux
    let totalHT = 0
    const processedLignes = lignes.map((l, index) => {
      const qte = Number(l.quantite) || 1
      const pu = Number(l.prixUnitaire) || 0
      const totalLigne = Math.round(qte * pu * 100) / 100
      totalHT += totalLigne
      return {
        description: l.description.trim(),
        quantite: qte,
        prixUnitaire: pu,
        total: totalLigne,
        ordre: index,
      }
    })

    totalHT = Math.round(totalHT * 100) / 100
    const totalTVA = 0 // Exonéré
    const totalTTC = totalHT

    // Créer le devis en base avec ses lignes
    const devis = await prisma.devis.create({
      data: {
        numero,
        titre: titre.trim(),
        clientNom: clientNom.trim(),
        clientEmail: clientEmail?.trim() || null,
        clientTelephone: clientTelephone?.trim() || null,
        clientAdresse: clientAdresse?.trim() || null,
        dateEmission: dateEm,
        dateValidite: dateVal,
        notes: notes?.trim() || null,
        totalHT,
        totalTVA,
        totalTTC,
        statut: 'brouillon',
        lignes: {
          create: processedLignes,
        },
      },
      include: {
        lignes: {
          orderBy: { ordre: 'asc' },
        },
      },
    })

    // Générer et archiver le PDF
    try {
      const pdfBuffer = genererDevisPDF({
        numero: devis.numero,
        titre: devis.titre,
        clientNom: devis.clientNom,
        clientEmail: devis.clientEmail,
        clientTelephone: devis.clientTelephone,
        clientAdresse: devis.clientAdresse,
        dateEmission: devis.dateEmission,
        dateValidite: devis.dateValidite,
        totalHT: devis.totalHT,
        totalTVA: devis.totalTVA,
        totalTTC: devis.totalTTC,
        notes: devis.notes,
        lignes: devis.lignes.map(l => ({
          description: l.description,
          quantite: l.quantite,
          prixUnitaire: l.prixUnitaire,
          total: l.total,
        })),
      })

      const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'devis')
      await mkdir(uploadDir, { recursive: true })
      const fileName = `devis-${devis.id}.pdf`
      const filePath = path.join(uploadDir, fileName)
      await writeFile(filePath, pdfBuffer)

      await prisma.devis.update({
        where: { id: devis.id },
        data: { pdfPath: `/uploads/devis/${fileName}` },
      })
      devis.pdfPath = `/uploads/devis/${fileName}`
    } catch (pdfErr) {
      adminLogger.warn('Erreur lors de la génération du PDF devis initial', pdfErr)
    }

    return NextResponse.json({
      success: true,
      message: 'Devis créé avec succès',
      devis,
    })
  } catch (error) {
    adminLogger.error('Erreur lors de la création du devis', error)
    return NextResponse.json({ error: 'Erreur lors de la création du devis' }, { status: 500 })
  }
}
