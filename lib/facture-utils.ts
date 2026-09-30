import { prisma } from '@/lib/prisma'

export const STATUTS_FACTURE_COACH = ['brouillon', 'generee', 'envoyee', 'payee'] as const

export type StatutFactureCoach = typeof STATUTS_FACTURE_COACH[number]

/**
 * Génère un numéro de facture unique, séquentiel et chronologique continu (conforme art. 242 nonies A du CGI)
 * Format : F-TCC-AAAA-0001, F-TCC-AAAA-0002, etc. (série officielle distincte du club)
 */
export async function genererNumeroFactureSequentiel(
  coachId: string,
  annee: number
): Promise<string> {
  const prefix = `F-TCC-${annee}-`

  // 1. Récupérer toutes les factures existantes de l'année pour trouver le numéro maximum utilisé
  const existingFactures = await prisma.factureCoach.findMany({
    where: {
      annee,
    },
    select: {
      numero: true,
    },
  })

  let maxIndex = 0
  for (const f of existingFactures) {
    if (f.numero && f.numero.startsWith(prefix)) {
      const suffix = f.numero.substring(prefix.length)
      const num = parseInt(suffix, 10)
      if (!isNaN(num) && num > maxIndex) {
        maxIndex = num
      }
    }
  }

  // 2. Déterminer le prochain candidat disponible et vérifier qu'aucune facture n'utilise ce numéro
  let candidateIndex = maxIndex + 1
  let candidateNumero = `${prefix}${String(candidateIndex).padStart(4, '0')}`

  while (await prisma.factureCoach.findUnique({ where: { numero: candidateNumero } })) {
    candidateIndex++
    candidateNumero = `${prefix}${String(candidateIndex).padStart(4, '0')}`
  }

  return candidateNumero
}

/**
 * Crée une FactureCoach avec garantie d'attribution d'un numéro séquentiel unique et gestion des accès concurrents
 */
export async function creerFactureCoachSecurisee(params: {
  coachId: string
  mois: number
  annee: number
  montantTotal: number
  tauxHoraire: number
  statut?: StatutFactureCoach
  dateGeneration?: Date | null
  dateEnvoi?: Date | null
}) {
  let attempts = 0
  const maxAttempts = 5

  while (attempts < maxAttempts) {
    attempts++
    const numero = await genererNumeroFactureSequentiel(params.coachId, params.annee)
    try {
      return await prisma.factureCoach.create({
        data: {
          numero,
          coachId: params.coachId,
          mois: params.mois,
          annee: params.annee,
          montantTotal: params.montantTotal,
          tauxHoraire: params.tauxHoraire,
          statut: params.statut || 'brouillon',
          dateGeneration: params.dateGeneration,
          dateEnvoi: params.dateEnvoi,
        },
      })
    } catch (err: any) {
      if (err?.code === 'P2002' && attempts < maxAttempts) {
        // En cas de collision concurrente sur le champ numero, on retente avec l'index suivant
        continue
      }
      throw err
    }
  }

  throw new Error("Impossible d'attribuer un numéro de facture unique après plusieurs tentatives.")
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

/**
 * Règle métier stricte :
 * Le secrétariat du club reçoit un e-mail UNIQUEMENT lorsque la facture est au statut "envoyee".
 * AUCUN e-mail n'est envoyé au club si la facture est en "brouillon" ou simplement "generee".
 */
export function doitEnvoyerEmailAuClub(statut: string | null | undefined): boolean {
  return statut === 'envoyee'
}
