/**
 * Garde de sécurité pour isoler hermétiquement le profil 'superviseur' de toutes les données financières.
 * Le superviseur a un rôle purement sportif/opérationnel (plannings, présences, tests, stages, communication).
 * Il ne doit JAMAIS avoir accès aux finances, factures, devis, dons/Cerfa, boutique, ou tarifs/taux horaires.
 */

export const SUPERVISEUR_BLOCKED_API_PREFIXES = [
  '/api/admin/finances',
  '/api/admin/comptabilite',
  '/api/admin/factures',
  '/api/admin/devis',
  '/api/admin/prestations',
  '/api/admin/dons',
  '/api/admin/boutique',
  '/api/admin/database',
] as const

export const SUPERVISEUR_BLOCKED_EXACT_ROUTES = [
  '/api/admin/groupes/cout-saison',
] as const

/**
 * Détermine si une URL API concerne la gestion financière ou comptable interdite aux superviseurs.
 */
export function isSuperviseurFinanceRoute(pathname: string): boolean {
  if (SUPERVISEUR_BLOCKED_EXACT_ROUTES.includes(pathname as any)) {
    return true
  }
  return SUPERVISEUR_BLOCKED_API_PREFIXES.some((prefix) => pathname.startsWith(prefix))
}

/**
 * Détermine si un chemin d'upload de fichier sensible (reçus fiscaux, factures, justificatifs, devis) est interdit au superviseur.
 */
export function isSuperviseurBlockedUpload(pathname: string): boolean {
  return (
    pathname.startsWith('/uploads/recus/') ||
    pathname.startsWith('/uploads/factures/') ||
    pathname.startsWith('/uploads/justificatifs/') ||
    pathname.startsWith('/uploads/devis/')
  )
}

/**
 * Clés des paramètres globaux qui sont d'ordre financier et ne doivent pas être divulguées ou modifiées par un superviseur.
 */
export const FINANCIAL_SETTINGS_KEYS = [
  'tauxHoraire',
  'forfaitCompetition',
  'nbCompetitionsAnnee',
  'nbDemiJourneesParCompetition',
  'forfaitRegionalActif',
  'montantForfaitRegional',
  'reductionEnfantBureau',
  'soldeDepartSaison',
] as const

/**
 * Masque les paramètres financiers à 0 / false pour la réponse renvoyée au superviseur.
 */
export function maskSettingsForSuperviseur<T extends Record<string, any>>(settings: T): T {
  return {
    ...settings,
    tauxHoraire: 0,
    forfaitCompetition: 0,
    nbCompetitionsAnnee: 0,
    nbDemiJourneesParCompetition: 0,
    forfaitRegionalActif: false,
    montantForfaitRegional: 0,
    reductionEnfantBureau: 0,
    soldeDepartSaison: 0,
  }
}
