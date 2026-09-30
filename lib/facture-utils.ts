import { prisma } from '@/lib/prisma'

export const STATUTS_FACTURE_COACH = ['brouillon', 'generee', 'envoyee', 'payee'] as const

export type StatutFactureCoach = typeof STATUTS_FACTURE_COACH[number]

/**
 * Extrait les 2 initiales majuscules d'un coach (ex: Julie Petrella -> "JP", Florian Di-Giusto -> "FD", Gaël Bernard -> "GB")
 * Nettoie les accents, espaces, tirets et caractères non alphabétiques.
 */
export function extraireInitialesCoach(prenom?: string | null, nom?: string | null): string {
  const cleanPrenom = (prenom || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .replace(/[^a-zA-Z]/g, '')

  const cleanNom = (nom || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .replace(/[^a-zA-Z]/g, '')

  const pInitial = cleanPrenom.charAt(0).toUpperCase()
  const nInitial = cleanNom.charAt(0).toUpperCase()

  if (pInitial && nInitial) {
    return `${pInitial}${nInitial}`
  }

  if (pInitial) {
    return cleanPrenom.length >= 2 ? cleanPrenom.substring(0, 2).toUpperCase() : `${pInitial}X`
  }

  return 'XX'
}

/**
 * Génère un numéro de facture unique, séquentiel et propre à chaque coach pour l'année donnée
 * Format : F-TCC-AAAA-{INITIALES}-0001, F-TCC-AAAA-{INITIALES}-0002, etc.
 * Exemple : F-TCC-2026-JP-0001, F-TCC-2026-JP-0002
 * Règle séquentielle :
 * - Si le coach possède déjà au moins une facture pour l'année (ex: 0001 existante), sa prochaine démarre à 0002 (ou index suivant).
 * - Si le coach n'a encore aucune facture pour cette année, elle démarre à 0001.
 */
export async function genererNumeroFactureSequentiel(
  coachId: string,
  annee: number
): Promise<string> {
  // 1. Récupérer le coach pour déduire ses initiales
  const coach = await prisma.coach.findUnique({
    where: { id: coachId },
    select: { prenom: true, nom: true },
  })

  const initiales = extraireInitialesCoach(coach?.prenom, coach?.nom)
  const coachPrefix = `F-TCC-${annee}-${initiales}-`
  const legacyPrefix = `F-TCC-${annee}-`

  // 2. Récupérer toutes les factures déjà existantes en base pour ce coach et cette année
  const existingFactures = await prisma.factureCoach.findMany({
    where: {
      coachId,
      annee,
    },
    select: {
      numero: true,
    },
  })

  let maxIndex = 0
  for (const f of existingFactures) {
    if (!f.numero) continue

    // Format avec initiales : F-TCC-2026-JP-0001
    if (f.numero.startsWith(coachPrefix)) {
      const suffix = f.numero.substring(coachPrefix.length)
      const num = parseInt(suffix, 10)
      if (!isNaN(num) && num > maxIndex) {
        maxIndex = num
      }
    }
    // Format historique sans initiales : F-TCC-2026-0001 ou F-TCC-2026-0002
    else if (f.numero.startsWith(legacyPrefix)) {
      const match = f.numero.match(/(\d+)$/)
      if (match) {
        const num = parseInt(match[1], 10)
        if (!isNaN(num) && num > maxIndex) {
          maxIndex = num
        }
      }
    }
  }

  // 3. Proposer maxIndex + 1 :
  // Si le coach a déjà une facture 0001 (ancienne ou nouvelle), maxIndex >= 1 -> candidate = 0002
  // Si le coach n'a aucune facture pour cette année -> maxIndex = 0 -> candidate = 0001
  let candidateIndex = maxIndex + 1
  let candidateNumero = `${coachPrefix}${String(candidateIndex).padStart(4, '0')}`

  // 4. Sécurité anti-collision globale absolue dans toute la base
  while (await prisma.factureCoach.findUnique({ where: { numero: candidateNumero } })) {
    candidateIndex++
    candidateNumero = `${coachPrefix}${String(candidateIndex).padStart(4, '0')}`
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
  const initiales = extraireInitialesCoach(prenom, nom)
  return `F-TCC-${annee}-${initiales}-0001`
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
