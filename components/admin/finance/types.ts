// ─── Types et constantes partagés du module Finances ───────────────────────

export interface CommandeItem {
  id: string
  numeroCommande: string
  prenom: string
  nom: string
  total: number
  createdAt: string
}

export interface FactureCoachItem {
  id: string
  numero: string
  montantTotal: number
  mois: number
  annee: number
  statut: string
  pdfPath: string | null
  createdAt?: string
  datePaiement?: string | null
  coach: {
    prenom: string
    nom: string | null
  }
}

export interface TransactionComptableItem {
  id: string
  type: 'recette' | 'depense'
  categorie: string
  libelle: string
  montant: number
  date: string
  justificatif: string | null
}

export interface MonthlyOverviewItem {
  year: number
  month: number
  income: number
  expense: number
  net: number
}

export interface CumulativeOverviewItem extends MonthlyOverviewItem {
  cumulative: number
}

export interface FinancesData {
  overview: MonthlyOverviewItem[]
  soldeDepartSaison: number
  selectedPeriod: {
    mois: number
    annee: number
    factures: FactureCoachItem[]
    commandes: CommandeItem[]
    transactions: TransactionComptableItem[]
    totalIncome: number
    totalExpense: number
  }
}

// ─── Constantes de libellés (FR) ────────────────────────────────────────────

export const moisNoms = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
]

export const statutsLabels: { [key: string]: { label: string; color: string } } = {
  brouillon: { label: 'Brouillon', color: 'bg-gray-100 text-gray-800' },
  generee: { label: 'Générée', color: 'bg-blue-100 text-blue-800' },
  envoyee: { label: 'Envoyée', color: 'bg-yellow-100 text-yellow-800' },
  payee: { label: 'Payée', color: 'bg-green-100 text-green-800' },
}

export const categoriesLabels: { [key: string]: string } = {
  // Recettes
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
  // Dépenses
  licences_ffn: 'Licences FFN',
  engagement_compet: 'Engagement compétition',
  reunions_manifestations: 'Réunions, manifestations',
  salaires: 'Salaires (factures coaches)',
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
  autre_depense: 'Autre dépense',
  autre: 'Autre chose',
}
