import { NextRequest, NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/auth/session'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { genererDevisPDF } from '@/lib/pdf/devis-pdf-generator'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'

const adminLogger = logger.withContext('AdminDevis')

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

    return NextResponse.json({ devis })
  } catch (error) {
    adminLogger.error('Erreur lors de la récupération du devis', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const session = await getAdminSession()
    if (!session) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()

    const existingDevis = await prisma.devis.findUnique({
      where: { id },
      include: { lignes: true },
    })

    if (!existingDevis) {
      return NextResponse.json({ error: 'Devis introuvable' }, { status: 404 })
    }

    const {
      statut,
      titre,
      clientNom,
      clientEmail,
      clientTelephone,
      clientAdresse,
      dateEmission,
      dateValidite,
      notes,
      lignes,
    } = body

    // 1. Si on met juste à jour le statut (ex: 'envoye', 'accepte', 'refuse', 'brouillon')
    if (statut && !lignes && !titre && !clientNom) {
      const updated = await prisma.devis.update({
        where: { id },
        data: { statut },
        include: { lignes: { orderBy: { ordre: 'asc' } } },
      })
      return NextResponse.json({ success: true, devis: updated })
    }

    // 2. Mise à jour complète
    let totalHT = existingDevis.totalHT
    let lignesToCreate: Array<{
      description: string
      quantite: number
      prixUnitaire: number
      total: number
      ordre: number
    }> | null = null

    if (Array.isArray(lignes)) {
      totalHT = 0
      // Supprimer les anciennes lignes et recréer
      await prisma.ligneDevis.deleteMany({ where: { devisId: id } })

      lignesToCreate = lignes.map((l: any, index: number) => {
        const qte = Number(l.quantite) || 1
        const pu = Number(l.prixUnitaire) || 0
        const totalLigne = Math.round(qte * pu * 100) / 100
        totalHT += totalLigne
        return {
          description: (l.description || '').trim(),
          quantite: qte,
          prixUnitaire: pu,
          total: totalLigne,
          ordre: index,
        }
      })

      totalHT = Math.round(totalHT * 100) / 100
    }

    const totalTTC = totalHT

    const updatedDevis = await prisma.devis.update({
      where: { id },
      data: {
        titre: titre !== undefined ? titre.trim() : existingDevis.titre,
        clientNom: clientNom !== undefined ? clientNom.trim() : existingDevis.clientNom,
        clientEmail: clientEmail !== undefined ? clientEmail?.trim() || null : existingDevis.clientEmail,
        clientTelephone: clientTelephone !== undefined ? clientTelephone?.trim() || null : existingDevis.clientTelephone,
        clientAdresse: clientAdresse !== undefined ? clientAdresse?.trim() || null : existingDevis.clientAdresse,
        dateEmission: dateEmission ? new Date(dateEmission) : existingDevis.dateEmission,
        dateValidite: dateValidite ? new Date(dateValidite) : existingDevis.dateValidite,
        notes: notes !== undefined ? notes?.trim() || null : existingDevis.notes,
        statut: statut || existingDevis.statut,
        totalHT,
        totalTTC,
        ...(lignesToCreate
          ? {
              lignes: {
                create: lignesToCreate,
              },
            }
          : {}),
      },
      include: {
        lignes: {
          orderBy: { ordre: 'asc' },
        },
      },
    })

    // Régénérer le PDF
    try {
      const pdfBuffer = genererDevisPDF({
        numero: updatedDevis.numero,
        titre: updatedDevis.titre,
        clientNom: updatedDevis.clientNom,
        clientEmail: updatedDevis.clientEmail,
        clientTelephone: updatedDevis.clientTelephone,
        clientAdresse: updatedDevis.clientAdresse,
        dateEmission: updatedDevis.dateEmission,
        dateValidite: updatedDevis.dateValidite,
        totalHT: updatedDevis.totalHT,
        totalTVA: updatedDevis.totalTVA,
        totalTTC: updatedDevis.totalTTC,
        notes: updatedDevis.notes,
        lignes: updatedDevis.lignes.map(l => ({
          description: l.description,
          quantite: l.quantite,
          prixUnitaire: l.prixUnitaire,
          total: l.total,
        })),
      })

      const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'devis')
      await mkdir(uploadDir, { recursive: true })
      const fileName = `devis-${updatedDevis.id}.pdf`
      const filePath = path.join(uploadDir, fileName)
      await writeFile(filePath, pdfBuffer)

      await prisma.devis.update({
        where: { id: updatedDevis.id },
        data: { pdfPath: `/uploads/devis/${fileName}` },
      })
      updatedDevis.pdfPath = `/uploads/devis/${fileName}`
    } catch (pdfErr) {
      adminLogger.warn('Erreur lors de la mise à jour du PDF devis', pdfErr)
    }

    return NextResponse.json({
      success: true,
      message: 'Devis mis à jour avec succès',
      devis: updatedDevis,
    })
  } catch (error) {
    adminLogger.error('Erreur lors de la mise à jour du devis', error)
    return NextResponse.json({ error: 'Erreur lors de la mise à jour' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: Params) {
  try {
    const session = await getAdminSession()
    if (!session) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const { id } = await params
    await prisma.devis.delete({ where: { id } })

    return NextResponse.json({ success: true, message: 'Devis supprimé avec succès' })
  } catch (error) {
    adminLogger.error('Erreur lors de la suppression du devis', error)
    return NextResponse.json({ error: 'Erreur lors de la suppression' }, { status: 500 })
  }
}
