import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/api/guards'
import { logger } from '@/lib/logger'

const bilanLogger = logger.withContext('FinancesBilanAPI')

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAdmin()
    if (!auth.ok) {
      return auth.response
    }

    const { searchParams } = new URL(request.url)
    const saisonParam = searchParams.get('saison')

    // Déterminer la saison par défaut (saison en cours)
    // Saison sportive : 1er septembre au 31 août
    const now = new Date()
    const currentMonth = now.getMonth() + 1
    const currentYear = now.getFullYear()
    let defaultSaison = ''
    if (currentMonth >= 9) {
      defaultSaison = `${currentYear}-${currentYear + 1}`
    } else {
      defaultSaison = `${currentYear - 1}-${currentYear}`
    }

    const saison = saisonParam || defaultSaison
    const parts = saison.split('-')
    if (parts.length !== 2 || isNaN(Number(parts[0])) || isNaN(Number(parts[1]))) {
      return NextResponse.json({ error: 'Format de saison invalide. Format attendu: AAAA-AAAA' }, { status: 400 })
    }

    const yearStart = parseInt(parts[0])
    const yearEnd = parseInt(parts[1])

    const startDate = new Date(yearStart, 8, 1, 0, 0, 0, 0) // 1er Septembre
    const endDate = new Date(yearEnd, 7, 31, 23, 59, 59, 999) // 31 Août

    bilanLogger.info(`Génération du bilan financier pour la saison ${saison} (du ${startDate.toISOString()} au ${endDate.toISOString()})`)

    // 1. Récupérer toutes les commandes payées de la boutique sur la période
    const commandes = await prisma.commande.findMany({
      where: {
        statutPaiement: { in: ['paye', 'payee'] },
        createdAt: { gte: startDate, lte: endDate },
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

    // 2. Récupérer toutes les factures coaches validées ou payées sur la période
    // Une facture coach appartient à la saison si son mois/annee est compris entre Septembre A et Août B
    const factures = await prisma.factureCoach.findMany({
      where: {
        statut: { in: ['generee', 'envoyee', 'payee'] },
        OR: [
          { annee: yearStart, mois: { gte: 9 } },
          { annee: yearEnd, mois: { lte: 8 } },
        ],
      },
      include: {
        coach: {
          select: {
            prenom: true,
            nom: true,
          },
        },
      },
    })

    // 3. Récupérer toutes les transactions comptables manuelles de la période
    const manualTransactions = await prisma.transactionComptable.findMany({
      where: {
        date: { gte: startDate, lte: endDate },
      },
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

    // 4. Initialiser les catégories depuis la base de données
    const dbCategories = await prisma.categorieComptable.findMany()

    const recettesCategories: { [key: string]: { label: string; total: number; transactions: any[]; isVolontaire?: boolean } } = {}
    const depensesCategories: { [key: string]: { label: string; total: number; transactions: any[]; isVolontaire?: boolean } } = {}

    dbCategories.forEach((cat) => {
      const isVolontaire = cat.type === 'double' || ['benevolat_frais', 'benevolat_heures', 'location_piscine'].includes(cat.code)
      if (cat.type === 'recette' || cat.type === 'double') {
        recettesCategories[cat.code] = {
          label: cat.nom,
          total: 0,
          transactions: [],
          isVolontaire,
        }
      }
      if (cat.type === 'depense' || cat.type === 'double') {
        depensesCategories[cat.code] = {
          label: cat.nom,
          total: 0,
          transactions: [],
          isVolontaire,
        }
      }
    })

    // Assurer la présence des catégories système critiques au cas où
    if (!recettesCategories.boutique) recettesCategories.boutique = { label: 'Boutique en ligne', total: 0, transactions: [] }
    if (!depensesCategories.salaires) depensesCategories.salaires = { label: 'Salaires (factures coaches)', total: 0, transactions: [] }
    if (!recettesCategories.autre_recette) recettesCategories.autre_recette = { label: 'Autre recette', total: 0, transactions: [] }
    if (!depensesCategories.autre_depense) depensesCategories.autre_depense = { label: 'Autre dépense', total: 0, transactions: [] }

    // 5. Ventiler les Commandes Boutique (automatiquement Recette -> Boutique)
    commandes.forEach((cmd) => {
      const item = {
        id: cmd.id,
        date: cmd.createdAt,
        libelle: `Commande boutique N° ${cmd.numeroCommande} - ${cmd.prenom} ${cmd.nom}`,
        montant: cmd.total,
        type: 'recette',
        source: 'boutique',
      }
      recettesCategories.boutique.total += cmd.total
      recettesCategories.boutique.transactions.push(item)
    })

    // 6. Ventiler les Factures Coachs (automatiquement Dépense -> Salaires)
    factures.forEach((fac) => {
      const item = {
        id: fac.id,
        date: fac.dateGeneration || fac.createdAt,
        libelle: `Facture Coach N° ${fac.numero} - ${fac.coach.prenom} ${fac.coach.nom} (Mois ${fac.mois}/${fac.annee})`,
        montant: fac.montantTotal,
        type: 'depense',
        source: 'factures_coach',
      }
      depensesCategories.salaires.total += fac.montantTotal
      depensesCategories.salaires.transactions.push(item)
    })

    // 7. Ventiler les Transactions Comptables Manuelles
    manualTransactions.forEach((tx) => {
      const cat = tx.categorie
      const type = tx.type
      const montant = tx.montant

      const transItem = {
        id: tx.id,
        date: tx.date,
        libelle: tx.libelle,
        montant: tx.montant,
        type: tx.type,
        justificatif: tx.justificatif,
        source: 'comptabilite',
      }

      // Cas particulier : Contributions volontaires (type 'double')
      // Elles s'équilibrent des deux côtés
      const foundCat = dbCategories.find(c => c.code === cat)
      if (foundCat && foundCat.type === 'double') {
        if (recettesCategories[cat]) {
          recettesCategories[cat].total += montant
          recettesCategories[cat].transactions.push({ ...transItem, type: 'recette' })
        }
        if (depensesCategories[cat]) {
          depensesCategories[cat].total += montant
          depensesCategories[cat].transactions.push({ ...transItem, type: 'depense' })
        }
        return
      }

      // Mappage classique
      if (type === 'recette') {
        if (recettesCategories[cat]) {
          recettesCategories[cat].total += montant
          recettesCategories[cat].transactions.push(transItem)
        } else {
          recettesCategories.autre_recette.total += montant
          recettesCategories.autre_recette.transactions.push(transItem)
        }
      } else { // depense
        if (depensesCategories[cat]) {
          depensesCategories[cat].total += montant
          depensesCategories[cat].transactions.push(transItem)
        } else {
          depensesCategories.autre_depense.total += montant
          depensesCategories.autre_depense.transactions.push(transItem)
        }
      }
    })


    // 8. Calculer les totaux généraux
    const totalRecettes = Object.values(recettesCategories).reduce((sum, c) => sum + c.total, 0)
    const totalDepenses = Object.values(depensesCategories).reduce((sum, c) => sum + c.total, 0)
    const netResult = totalRecettes - totalDepenses

    // Trier les transactions par date (la plus récente d'abord)
    Object.keys(recettesCategories).forEach((key) => {
      recettesCategories[key].transactions.sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      )
    })
    Object.keys(depensesCategories).forEach((key) => {
      depensesCategories[key].transactions.sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      )
    })

    return NextResponse.json({
      success: true,
      saison,
      startDate: startDate.toLocaleDateString('fr-FR'),
      endDate: endDate.toLocaleDateString('fr-FR'),
      totals: {
        recettes: totalRecettes,
        depenses: totalDepenses,
        resultat: netResult,
        gain: netResult >= 0 ? netResult : 0,
        perte: netResult < 0 ? Math.abs(netResult) : 0,
      },
      recettes: recettesCategories,
      depenses: depensesCategories,
    })
  } catch (error) {
    bilanLogger.error('Erreur lors du calcul du bilan saisonnier', error)
    return NextResponse.json(
      { error: 'Erreur lors du calcul du bilan financier de fin de saison' },
      { status: 500 }
    )
  }
}
