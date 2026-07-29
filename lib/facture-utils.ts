import { prisma } from '@/lib/prisma'

export const STATUTS_FACTURE_COACH = ['brouillon', 'generee', 'envoyee', 'payee'] as const

export type StatutFactureCoach = typeof STATUTS_FACTURE_COACH[number]

/**
 * Génère un numéro de facture unique, séquentiel et chronologique continu (conforme art. 242 nonies A du CGI)
 * Format : F-AAAA-0001, F-AAAA-0002, etc. pour chaque coach et année
 */
export async function genererNumeroFactureSequentiel(
  coachId: string,
  annee: number
): Promise<string> {
  // Compter le nombre de factures existantes pour ce coach cette année-là
  const count = await prisma.factureCoach.count({
    where: {
      coachId,
      annee,
    },
  })

  const index = String(count + 1).padStart(4, '0')
  return `F-TCC-${annee}-${index}`
}

/**
 * Générateur synchrone de secours pour numéro de facture au format séquentiel
 */
export function genererNumeroFacture(
  prenom: string,
  nom: string | null,
  mois: number,
  annee: number,
  coachId?: string
): string {
  const mm = String(mois).padStart(2, '0')
  return `F-${annee}${mm}-0001`
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
