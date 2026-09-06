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
        id: true,
        numeroCommande: true,
        prenom: true,
        nom: true,
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

    // Fonctions d'agrégation et de correspondance de dates
    const getMonthKey = (dInput: Date | string) => {
      const d = new Date(dInput)
      return `${d.getFullYear()}-${d.getMonth() + 1}`
    }

    const isMatchPeriod = (dInput: Date | string, annee: number, mois: number) => {
      const d = new Date(dInput)
      // Correspondance en heure locale
      if (d.getFullYear() === annee && (d.getMonth() + 1) === mois) return true
      // Correspondance en UTC (évite tout décalage aux bornes de mois entre fuseaux)
      if (d.getUTCFullYear() === annee && (d.getUTCMonth() + 1) === mois) return true
      return false
    }

    // 3. Agréger les données par année/mois pour le tableau de bord global
    const monthlyRevenue: { [key: string]: number } = {}
    commandes.forEach((cmd) => {
      const key = getMonthKey(cmd.createdAt)
      monthlyRevenue[key] = (monthlyRevenue[key] || 0) + cmd.total
    })

    const monthlyExpense: { [key: string]: number } = {}
    factures.forEach((fac) => {
      const key = `${fac.annee}-${fac.mois}`
      monthlyExpense[key] = (monthlyExpense[key] || 0) + fac.montantTotal
    })

    // Fusionner les transactions manuelles dans l'agrégation mensuelle
    manualTransactions.forEach((t) => {
      const key = getMonthKey(t.date)
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

    // 4. Détails pour la période sélectionnée (100% alignés avec le graphe overview)
    const detailedFactures = factures.filter(
      (f) => f.mois === selectMois && f.annee === selectAnnee
    )

    const detailedCommandes = commandes.filter((cmd) =>
      isMatchPeriod(cmd.createdAt, selectAnnee, selectMois)
    )

    const detailedTransactions = manualTransactions.filter((t) =>
      isMatchPeriod(t.date, selectAnnee, selectMois)
    )

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
