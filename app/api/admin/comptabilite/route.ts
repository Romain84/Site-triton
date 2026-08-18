import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/api/guards'
import { logger } from '@/lib/logger'
import { z } from 'zod'

const comptabiliteLogger = logger.withContext('ComptabiliteAPI')

const transactionSchema = z.object({
  type: z.enum(['recette', 'depense']),
  categorie: z.string().min(1, 'La catégorie est requise').max(100),
  libelle: z.string().min(2, 'Le libellé doit faire au moins 2 caractères').max(250),
  montant: z.number().positive('Le montant doit être positif'),
  date: z.string().transform((str) => new Date(str)),
  justificatif: z.string().nullable().optional()
})

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAdmin()
    if (!auth.ok) {
      return auth.response
    }

    const { searchParams } = new URL(request.url)
    const selectMois = searchParams.get('mois') ? parseInt(searchParams.get('mois')!) : new Date().getMonth() + 1
    const selectAnnee = searchParams.get('annee') ? parseInt(searchParams.get('annee')!) : new Date().getFullYear()

    const startOfMonth = new Date(selectAnnee, selectMois - 1, 1)
    const endOfMonth = new Date(selectAnnee, selectMois, 0, 23, 59, 59, 999)

    // Récupérer toutes les transactions du mois sélectionné
    const transactions = await prisma.transactionComptable.findMany({
      where: {
        date: {
          gte: startOfMonth,
          lte: endOfMonth
        }
      },
      orderBy: {
        date: 'desc'
      }
    })

    // Agréger les totaux du mois
    const totalRecettes = transactions
      .filter((t) => t.type === 'recette')
      .reduce((sum, t) => sum + t.montant, 0)

    const totalDepenses = transactions
      .filter((t) => t.type === 'depense')
      .reduce((sum, t) => sum + t.montant, 0)

    return NextResponse.json({
      success: true,
      transactions,
      summary: {
        mois: selectMois,
        annee: selectAnnee,
        totalRecettes,
        totalDepenses,
        soldeNet: totalRecettes - totalDepenses
      }
    })
  } catch (error) {
    comptabiliteLogger.error('Erreur lors du chargement du registre comptable', error)
    return NextResponse.json(
      { error: 'Erreur lors du chargement du registre comptable' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdmin()
    if (!auth.ok) {
      return auth.response
    }

    const body = await request.json()
    const validatedData = transactionSchema.parse(body)

    const transaction = await prisma.transactionComptable.create({
      data: {
        type: validatedData.type,
        categorie: validatedData.categorie,
        libelle: validatedData.libelle,
        montant: validatedData.montant,
        date: validatedData.date,
        justificatif: validatedData.justificatif || null
      }
    })

    comptabiliteLogger.info(`Écriture comptable ajoutée : ${transaction.libelle} (${transaction.montant} €)`)

    return NextResponse.json({
      success: true,
      transaction
    })
  } catch (error) {
    comptabiliteLogger.error("Erreur lors de la création de l'écriture comptable", error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Données invalides', details: error.flatten() },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: "Erreur lors de la création de l'écriture comptable" },
      { status: 500 }
    )
  }
}
