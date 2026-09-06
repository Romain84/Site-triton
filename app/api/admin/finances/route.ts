import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/api/guards'

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAdmin()
    if (!auth.ok) {
      return auth.response
    }

    const { searchParams } = new URL(request.url)
    const selectMois = searchParams.get('mois')
      ? parseInt(searchParams.get('mois')!)
      : new Date().getMonth() + 1
    const selectAnnee = searchParams.get('annee')
      ? parseInt(searchParams.get('annee')!)
      : new Date().getFullYear()

    // 1. Récupérer toutes les commandes payées de la boutique
    const commandes = await prisma.commande.findMany({
      where: {
        statutPaiement: {
          in: ['paye', 'payee'],
        },
      },
      select: {
        total: true,
        createdAt: true,
      },
    })

    // 2. Récupérer toutes les factures coaches validées ou payées
    const factures = await prisma.factureCoach.findMany({
      where: {
        statut: {
          in: ['generee', 'envoyee', 'payee'],
        },
      },
      select: {
        id: true,
        numero: true,
        montantTotal: true,
        mois: true,
        annee: true,
        statut: true,
        pdfPath: true,
        createdAt: true,
        datePaiement: true,
        coach: {
          select: {
            prenom: true,
            nom: true,
          },
        },
      },
    })

    // 2b. Récupérer toutes les transactions comptables manuelles
    const manualTransactions = await prisma.transactionComptable.findMany({
      select: {
        id: true,
        type: true,
        categorie: true,
        libelle: true,
        montant: true,
        date: true,
        justificatif: true,
      },
    })

    // 3. Agréger les données par année/mois pour le tableau de bord global
    const monthlyRevenue: { [key: string]: number } = {}
    commandes.forEach((cmd) => {
      const date = new Date(cmd.createdAt)
      const key = `${date.getFullYear()}-${date.getMonth() + 1}`
      monthlyRevenue[key] = (monthlyRevenue[key] || 0) + cmd.total
    })

    const monthlyExpense: { [key: string]: number } = {}
    factures.forEach((fac) => {
      const key = `${fac.annee}-${fac.mois}`
      monthlyExpense[key] = (monthlyExpense[key] || 0) + fac.montantTotal
    })

    // Fusionner les transactions manuelles dans l'agrégation mensuelle
    manualTransactions.forEach((t) => {
      const date = new Date(t.date)
      const key = `${date.getFullYear()}-${date.getMonth() + 1}`
      if (t.type === 'recette') {
        monthlyRevenue[key] = (monthlyRevenue[key] || 0) + t.montant
      } else {
        monthlyExpense[key] = (monthlyExpense[key] || 0) + t.montant
      }
    })

    const allKeys = new Set([...Object.keys(monthlyRevenue), ...Object.keys(monthlyExpense)])
    const overview = Array.from(allKeys).map((key) => {
      const [year, month] = key.split('-').map(Number)
      const income = monthlyRevenue[key] || 0
      const expense = monthlyExpense[key] || 0
      const net = income - expense
      return { year, month, income, expense, net }
    }).sort((a, b) => b.year - a.year || b.month - a.month)

    // 4. Détails pour la période sélectionnée
    const detailedFactures = factures.filter(
      (f) => f.mois === selectMois && f.annee === selectAnnee
    )

    const startOfMonth = new Date(selectAnnee, selectMois - 1, 1)
    const endOfMonth = new Date(selectAnnee, selectMois, 0, 23, 59, 59, 999)
    const detailedCommandes = await prisma.commande.findMany({
      where: {
        statutPaiement: {
          in: ['paye', 'payee'],
        },
        createdAt: {
          gte: startOfMonth,
          lte: endOfMonth,
        },
      },
      select: {
        id: true,
        numeroCommande: true,
        prenom: true,
        nom: true,
        total: true,
        createdAt: true,
      },
    })

    const detailedTransactions = manualTransactions.filter((t) => {
      const d = new Date(t.date)
      return d >= startOfMonth && d <= endOfMonth
    })

    const totalIncome = detailedCommandes.reduce((sum, c) => sum + c.total, 0) +
      detailedTransactions.filter((t) => t.type === 'recette').reduce((sum, t) => sum + t.montant, 0)

    const totalExpense = detailedFactures.reduce((sum, f) => sum + f.montantTotal, 0) +
      detailedTransactions.filter((t) => t.type === 'depense').reduce((sum, t) => sum + t.montant, 0)

    const settings = await prisma.settings.findFirst({
      select: {
        soldeDepartSaison: true,
      },
    })
    const soldeDepartSaison = settings?.soldeDepartSaison || 0

    return NextResponse.json({
      overview,
      soldeDepartSaison,
      selectedPeriod: {
        mois: selectMois,
        annee: selectAnnee,
        factures: detailedFactures,
        commandes: detailedCommandes,
        transactions: detailedTransactions,
        totalIncome,
        totalExpense,
      },
    })
  } catch (error) {
    return NextResponse.json(
      { error: 'Erreur lors du chargement des données financières' },
      { status: 500 }
    )
  }
}
