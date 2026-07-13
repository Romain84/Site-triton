export const STATUTS_FACTURE_COACH = ['brouillon', 'generee', 'envoyee', 'payee'] as const

export type StatutFactureCoach = typeof STATUTS_FACTURE_COACH[number]

/**
 * Génère un numéro de facture au format FACT-PNJJ-MM-AAAA
 * @param prenom Prénom du coach
 * @param nom Nom du coach
 * @param mois Mois de la facture (1-12)
 * @param annee Année de la facture
 * @returns Numéro de facture formaté
 */
export function genererNumeroFacture(
  prenom: string,
  nom: string | null,
  mois: number,
  annee: number,
  coachId?: string
): string {
  // Première lettre du nom (ou X si pas de nom)
  const N = nom ? nom.charAt(0).toUpperCase() : 'X'

  // Première lettre du prénom
  const P = prenom.charAt(0).toUpperCase()

  const NP = `${N}${P}`

  // Date et heure actuelles de génération
  const now = new Date()
  const JJ = String(now.getDate()).padStart(2, '0')
  const MM = String(now.getMonth() + 1).padStart(2, '0')
  const AAAA = String(now.getFullYear())
  const HH = String(now.getHours()).padStart(2, '0')
  const MinMin = String(now.getMinutes()).padStart(2, '0')

  return `FACT_${NP}_${JJ}_${MM}_${AAAA}_${HH}_${MinMin}`
}

// Vérifie qu'un statut de facture coach est valide.
export function isValidFactureCoachStatus(value: string): value is StatutFactureCoach {
  return (STATUTS_FACTURE_COACH as readonly string[]).includes(value)
}

// Définit les transitions autorisées du workflow de facture coach.
const TRANSITIONS_STATUT_FACTURE: Record<StatutFactureCoach, StatutFactureCoach[]> = {
  brouillon: ['generee', 'envoyee', 'payee'],
  generee: ['envoyee', 'brouillon', 'payee'],
  envoyee: ['payee', 'generee', 'brouillon'],
  payee: ['envoyee', 'generee', 'brouillon'],
}

// Vérifie qu'une transition de statut est autorisée.
export function canTransitionFactureCoachStatus(
  from: StatutFactureCoach,
  to: StatutFactureCoach
): boolean {
  return TRANSITIONS_STATUT_FACTURE[from].includes(to)
}
