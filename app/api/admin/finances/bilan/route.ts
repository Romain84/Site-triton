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

    // 1. Récupérer toutes les commandes payées de la boutique
    const allCommandes = await prisma.commande.findMany({
      where: {
        statutPaiement: { in: ['paye', 'payee'] },
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

    // 3. Récupérer toutes les transactions comptables manuelles
    const allManualTransactions = await prisma.transactionComptable.findMany({
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

    // Fonction robuste d'appartenance à la saison sportive (du 1er Septembre yStart au 31 Août yEnd)
    const isDateInSeason = (dateInput: Date | string, yStart: number, yEnd: number) => {
      const d = new Date(dateInput)
      // Heure locale
      const yL = d.getFullYear()
      const mL = d.getMonth() + 1
      if ((yL === yStart && mL >= 9) || (yL === yEnd && mL <= 8)) return true

      // Heure UTC (évite toute perte aux frontières minuit UTC / fuseau horaire)
      const yU = d.getUTCFullYear()
      const mU = d.getUTCMonth() + 1
      if ((yU === yStart && mU >= 9) || (yU === yEnd && mU <= 8)) return true

      return false
    }

    const commandes = allCommandes.filter((cmd) => isDateInSeason(cmd.createdAt, yearStart, yearEnd))
    const manualTransactions = allManualTransactions.filter((tx) => isDateInSeason(tx.date, yearStart, yearEnd))

    // 4. Initialiser les catégories (standards + base de données)
    const dbCategories = await prisma.categorieComptable.findMany()

    const standardRecettes: Record<string, string> = {
      cotisation: 'Cotisations adhésions',
      subvention: 'Subventions, dons',
      don: 'Don / Sponsoring',
      interets: 'Intérêts',
      pass_sport: 'Pass sport subvention',
      excedent: 'Excédent saison précédente',
      boutique: 'Boutique en ligne',
      benevolat_frais: 'Frais personnels bénévoles',
      benevolat_heures: 'Heures bénévolats',
      location_piscine: 'Location piscine',
      autre_recette: 'Autre recette',
    }

    const standardDepenses: Record<string, string> = {
      salaires: 'Salaires (factures coaches)',
      licences_ffn: 'Licences FFN',
      engagement_compet: 'Engagement compétition',
      reunions_manifestations: 'Réunions, manifestations',
      frais_swim_community: 'Frais swim community',
      frais_bancaires: 'Frais bancaires',
      frais_bureau: 'Frais bureau, gestion',
      facture_externe: 'Facture fournisseur',
      achat_materiel: 'Achat matériel (bonnets...)',
      frais_fonctionnement: 'Frais mensuel (téléphone, assurances...)',
      recompenses: 'Médailles, récompenses',
      assurances: 'Assurances',
      bnssa: 'Bnssa',
      amendes: 'Amendes',
      equipement: 'Équipement',
      provision_equipement: 'Provision équipement',
      provision_salaires: 'Provision salaires mai et juin',
      provision_compet: 'Provision engagement compet.',
      provision_qualif: 'Provision participation qualification',
      benevolat_frais: 'Frais personnels bénévoles',
      benevolat_heures: 'Heures bénévolats',
      location_piscine: 'Location piscine',
      autre_depense: 'Autre dépense',
    }

    const recettesCategories: { [key: string]: { label: string; total: number; transactions: any[]; isVolontaire?: boolean } } = {}
    const depensesCategories: { [key: string]: { label: string; total: number; transactions: any[]; isVolontaire?: boolean } } = {}

    // Pré-initialisation avec les catégories standard
    Object.entries(standardRecettes).forEach(([code, label]) => {
      const isVolontaire = ['benevolat_frais', 'benevolat_heures', 'location_piscine'].includes(code)
      recettesCategories[code] = { label, total: 0, transactions: [], isVolontaire }
    })

    Object.entries(standardDepenses).forEach(([code, label]) => {
      const isVolontaire = ['benevolat_frais', 'benevolat_heures', 'location_piscine'].includes(code)
      depensesCategories[code] = { label, total: 0, transactions: [], isVolontaire }
    })

    // Surcharge et complétion avec les catégories de la base de données
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
      if (!recettesCategories.boutique) {
        recettesCategories.boutique = { label: 'Boutique en ligne', total: 0, transactions: [] }
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
      if (!depensesCategories.salaires) {
        depensesCategories.salaires = { label: 'Salaires (factures coaches)', total: 0, transactions: [] }
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
      const foundCat = dbCategories.find((c) => c.code === cat)
      const isDouble = (foundCat && foundCat.type === 'double') || ['benevolat_frais', 'benevolat_heures', 'location_piscine'].includes(cat)
      if (isDouble) {
        if (!recettesCategories[cat]) {
          recettesCategories[cat] = { label: foundCat ? foundCat.nom : (standardRecettes[cat] || cat), total: 0, transactions: [], isVolontaire: true }
        }
        recettesCategories[cat].total += montant
        recettesCategories[cat].transactions.push({ ...transItem, type: 'recette' })

        if (!depensesCategories[cat]) {
          depensesCategories[cat] = { label: foundCat ? foundCat.nom : (standardDepenses[cat] || cat), total: 0, transactions: [], isVolontaire: true }
        }
        depensesCategories[cat].total += montant
        depensesCategories[cat].transactions.push({ ...transItem, type: 'depense' })
        return
      }

      // Mappage classique
      if (type === 'recette') {
        if (!recettesCategories[cat]) {
          const customName = foundCat ? foundCat.nom : (standardRecettes[cat] || cat)
          recettesCategories[cat] = { label: customName, total: 0, transactions: [] }
        }
        recettesCategories[cat].total += montant
        recettesCategories[cat].transactions.push(transItem)
      } else {
        if (!depensesCategories[cat]) {
          const customName = foundCat ? foundCat.nom : (standardDepenses[cat] || cat)
          depensesCategories[cat] = { label: customName, total: 0, transactions: [] }
        }
        depensesCategories[cat].total += montant
        depensesCategories[cat].transactions.push(transItem)
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
