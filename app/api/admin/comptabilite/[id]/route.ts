import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/api/guards'
import { logger } from '@/lib/logger'
import fs from 'fs/promises'
import path from 'path'
import { z } from 'zod'

const comptabiliteIdLogger = logger.withContext('ComptabiliteIdAPI')

const updateSchema = z.object({
  type: z.enum(['recette', 'depense']),
  categorie: z.enum(['subvention', 'cotisation', 'don', 'achat_materiel', 'frais_fonctionnement', 'facture_externe', 'autre']),
  libelle: z.string().min(2).max(250),
  montant: z.number().positive(),
  date: z.string().transform((str) => new Date(str)),
  justificatif: z.string().nullable().optional()
})

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const auth = await requireAdmin()
    if (!auth.ok) {
      return auth.response
    }

    const { id } = await params
    const body = await request.json()
    const validatedData = updateSchema.parse(body)

    // Vérifier si la transaction existe
    const existing = await prisma.transactionComptable.findUnique({
      where: { id }
    })

    if (!existing) {
      return NextResponse.json(
        { error: 'Transaction non trouvée' },
        { status: 404 }
      )
    }

    // Si un ancien justificatif est remplacé par un nouveau, supprimer l'ancien fichier
    if (
      existing.justificatif &&
      validatedData.justificatif !== undefined &&
      existing.justificatif !== validatedData.justificatif
    ) {
      try {
        const filePath = path.join(process.cwd(), 'public', existing.justificatif)
        await fs.unlink(filePath)
        comptabiliteIdLogger.info(`Ancien justificatif supprimé physiquement : ${existing.justificatif}`)
      } catch (err) {
        comptabiliteIdLogger.warn(`Impossible de supprimer l'ancien justificatif : ${existing.justificatif}`, err)
      }
    }

    const updated = await prisma.transactionComptable.update({
      where: { id },
      data: {
        type: validatedData.type,
        categorie: validatedData.categorie,
        libelle: validatedData.libelle,
        montant: validatedData.montant,
        date: validatedData.date,
        justificatif: validatedData.justificatif !== undefined ? validatedData.justificatif : existing.justificatif
      }
    })

    comptabiliteIdLogger.info(`Transaction comptable modifiée : ${updated.libelle}`)

    return NextResponse.json({
      success: true,
      transaction: updated
    })
  } catch (error) {
    comptabiliteIdLogger.error("Erreur lors de la modification de la transaction comptable", error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Données invalides', details: error.flatten() },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Erreur lors de la modification' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const auth = await requireAdmin()
    if (!auth.ok) {
      return auth.response
    }

    const { id } = await params

    const existing = await prisma.transactionComptable.findUnique({
      where: { id }
    })

    if (!existing) {
      return NextResponse.json(
        { error: 'Transaction non trouvée' },
        { status: 404 }
      )
    }

    // Supprimer physiquement le fichier justificatif s'il existe
    if (existing.justificatif) {
      try {
        const filePath = path.join(process.cwd(), 'public', existing.justificatif)
        await fs.unlink(filePath)
        comptabiliteIdLogger.info(`Justificatif supprimé du disque : ${existing.justificatif}`)
      } catch (err) {
        comptabiliteIdLogger.warn(`Impossible de supprimer physiquement le justificatif : ${existing.justificatif}`, err)
      }
    }

    // Supprimer la transaction de la base de données
    await prisma.transactionComptable.delete({
      where: { id }
    })

    comptabiliteIdLogger.info(`Transaction comptable supprimée de la DB : ${existing.libelle}`)

    return NextResponse.json({
      success: true,
      message: 'Transaction supprimée avec succès'
    })
  } catch (error) {
    comptabiliteIdLogger.error("Erreur lors de la suppression de la transaction", error)
    return NextResponse.json(
      { error: 'Erreur lors de la suppression de la transaction' },
      { status: 500 }
    )
  }
}
