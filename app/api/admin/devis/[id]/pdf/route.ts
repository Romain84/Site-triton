import { NextRequest, NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/auth/session'
import { prisma } from '@/lib/prisma'
import { genererDevisPDF } from '@/lib/pdf/devis-pdf-generator'
import { readFile, writeFile, mkdir } from 'fs/promises'
import path from 'path'

interface Params {
  params: Promise<{ id: string }>
}

export async function GET(request: NextRequest, { params }: Params) {
  try {
    const session = await getAdminSession()
    if (!session) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const { id } = await params
    const devis = await prisma.devis.findUnique({
      where: { id },
      include: {
        lignes: {
          orderBy: { ordre: 'asc' },
        },
      },
    })

    if (!devis) {
      return NextResponse.json({ error: 'Devis introuvable' }, { status: 404 })
    }

    let pdfBuffer: Buffer | null = null

    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'devis')
    const fileName = `devis-${devis.id}.pdf`
    const filePath = path.join(uploadDir, fileName)

    if (devis.statut !== 'brouillon') {
      try {
        pdfBuffer = await readFile(filePath)
      } catch {
        pdfBuffer = null
      }
    }

    if (!pdfBuffer) {
      pdfBuffer = genererDevisPDF({
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
        lignes: devis.lignes.map((l: any) => ({
          description: l.description,
          quantite: l.quantite,
          prixUnitaire: l.prixUnitaire,
          total: l.total,
        })),
      })

      await mkdir(uploadDir, { recursive: true })
      await writeFile(filePath, pdfBuffer)
    }

    return new NextResponse(new Uint8Array(pdfBuffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="devis-${devis.numero}.pdf"`,
      },
    })
  } catch (error) {
    return NextResponse.json({ error: 'Erreur lors de la génération du PDF' }, { status: 500 })
  }
}
