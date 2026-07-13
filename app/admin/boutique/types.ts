// Types pour la gestion de la boutique admin

export interface Categorie {
  id: string
  nom: string
  slug: string
  description?: string
  image?: string
  ordre: number
  actif: boolean
  _count?: {
    produits: number
  }
}

export interface Fournisseur {
  id: string
  nom: string
  contact?: string
  telephone?: string
  email?: string
  actif: boolean
  _count?: {
    produits: number
  }
}

export interface Produit {
  id: string
  nom: string
  slug: string
  prix: number
  prixAchat: number
  tauxTVA: number
  prixPromo?: number
  enPromo: boolean
  stock: number
  gererStock: boolean
  stockIllimite: boolean
  prixFlocage: number
  description?: string
  descriptionCourte?: string
  categorieId?: string
  fournisseurId?: string
  image?: string
  images?: string
  actif: boolean
  enVedette: boolean
  personnalisable: boolean
  variantes?: Variante[]
  categorie?: {
    nom: string
  }
  fournisseur?: {
    nom: string
  }
  _count?: {
    lignesCommande: number
  }
}

export interface Variante {
  id: string
  produitId: string
  taille?: string
  couleur?: string
  sku?: string
  prix?: number
  prixCoutantHT: number
  prixFlocageHT: number
  tauxTVA: number
  stock: number
  image?: string
  actif: boolean
}

export interface LigneCommande {
  id: string
  quantite: number
  prixUnitaire: number
  taille?: string
  couleur?: string
  textePersonnalise?: string | null
  produit: {
    id: string
    nom: string
    slug: string
  }
}

export interface Commande {
  id: string
  numeroCommande: string
  email: string
  telephone?: string | null
  nom: string
  prenom: string
  nomNageur: string
  prenomNageur: string
  total: number
  statutPaiement: string
  statut: string
  createdAt: string
  lignes: LigneCommande[]
}

export interface RecapItem {
  produitId: string
  produitNom: string
  varianteId?: string
  taille?: string
  couleur?: string
  sku?: string
  quantiteTotal: number
  prixVenteUnitaire: number
  prixCoutantHT: number
  prixFlocageHT: number
  tauxTVA: number
  totalHT: number
  totalTVA: number
  totalTTC: number
  totalVente: number
  beneficeTotal: number
  beneficeUnitaire: number
}

export interface RecapFournisseur {
  recap: RecapItem[]
  totaux: {
    quantiteTotal: number
    totalAchatHT: number
    totalAchatTTC: number
    totalVente: number
    beneficeTotal: number
  }
  nbCommandes: number
}
