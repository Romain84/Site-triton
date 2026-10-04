export interface AbsenceAssociee {
  id?: string
  date: string
  dateComplete?: string
  motif?: string | null
  coachRemplacantNom?: string | null
  heures: number
  montant: number
  minutes?: number
  texteDeduction?: string
  description: string
  type?: 'absence' | 'annulation'
}

export interface LigneFacture {
  id?: string
  type: string
  description: string
  heures: number
  montant: number
  date?: string
  groupe?: string | null
  lieu?: string | null
  demiJournees?: number | null
  remplacementId?: string | null
  titre?: string
  sousTitre?: string
  datesBadges?: string[]
  nbSeances?: number
  dureeUnitaireMinutes?: number
  detailCalculDuree?: string
  espaces?: string[]
  absencesAssociees?: AbsenceAssociee[]
  estAbsenceOrpheline?: boolean
  coachRemplaceNom?: string | null
  noteInfo?: string | null
}

export interface SectionFacture {
  id: string
  titre: string
  type: string
  lignes: LigneFacture[]
  sousTotalHeures: number
  sousTotalMontant: number
  sousTotalDureeHM?: string
}

export interface FacturationData {
  mois: number
  annee: number
  tauxHoraire: number
  forfaitDemiJournee: number
  forfaitRegionalActif: boolean
  montantForfaitRegional: number
  lignesPlanningFixe: LigneFacture[]
  lignesPlanningTournant: LigneFacture[]
  lignesRemplacements: LigneFacture[]
  lignesAbsences: LigneFacture[]
  lignesManuelles: LigneFacture[]
  totalHeures: number
  totalMontant: number
  factureId?: string
  statut?: string
  isBlocked?: boolean
  sections?: SectionFacture[]
}

export interface PastInvoice {
  id: string
  numero: string
  mois: number
  annee: number
  montantTotal: number
  statut: string
  datePaiement?: string | null
  createdAt?: string
}

export interface CalendarEventItem {
  id: string
  title: string
  date: string
  lieu?: string | null
  type?: string | null
}

export interface AdminPiscineItem {
  id: string
  nom: string
  distanceKm: number
}
