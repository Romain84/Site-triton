import { z } from 'zod'

// === Validations de base ===

/**
 * Valide une date au format string (YYYY-MM-DD ou ISO)
 */
export const dateString = z
  .union([z.string(), z.date()])
  .refine((val) => !isNaN(Date.parse(val instanceof Date ? val.toISOString() : val)), {
    message: 'Date invalide',
  })

/**
 * Date optionnelle
 */
export const optionalDateString = z
  .union([z.string(), z.date()])
  .optional()
  .nullable()
  .refine((val) => !val || !isNaN(Date.parse(val instanceof Date ? val.toISOString() : val)), {
    message: 'Date invalide',
  })

/**
 * Email valide
 */
export const email = z.string().email('Email invalide')

/**
 * Numéro de téléphone français
 */
export const phoneNumber = z
  .string()
  .regex(/^(?:(?:\+|00)33|0)\s*[1-9](?:[\s.-]*\d{2}){4}$/, 'Numéro de téléphone invalide')
  .optional()

/**
 * Slug URL-friendly
 */
export const slug = z
  .string()
  .min(1, 'Le slug est requis')
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Le slug doit contenir uniquement des lettres minuscules, chiffres et tirets')

/**
 * Prix positif
 */
export const price = z.number().min(0, 'Le prix doit être positif')

/**
 * Quantité positive
 */
export const quantity = z.number().int().min(0, 'La quantité doit être positive')

// === Schémas pour les entités ===

/**
 * Schéma pour les paramètres de filtrage par date
 */
export const dateRangeParams = z.object({
  dateDebut: optionalDateString,
  dateFin: optionalDateString,
})

/**
 * Schéma pour les paramètres de pagination
 */
export const paginationParams = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
})

/**
 * Schéma pour un produit
 */
export const produitSchema = z.object({
  nom: z.string().min(1, 'Le nom est requis'),
  slug: slug,
  description: z.string().optional(),
  descriptionCourte: z.string().optional(),
  prix: price,
  prixPromo: price.optional(),
  enPromo: z.boolean().default(false),
  stock: quantity.default(0),
  image: z.string().url('URL d\'image invalide').optional().or(z.literal('')),
  categorieId: z.string().optional(),
  actif: z.boolean().default(true),
  enVedette: z.boolean().default(false),
  lienExterne: z.string().optional().nullable(),
  guideTailles: z.string().optional().nullable(),
})

/**
 * Schéma pour une catégorie
 */
export const categorieSchema = z.object({
  nom: z.string().min(1, 'Le nom est requis'),
  slug: slug,
  description: z.string().optional(),
  image: z.string().url('URL d\'image invalide').optional().or(z.literal('')),
  ordre: z.number().int().default(0),
  actif: z.boolean().default(true),
})

/**
 * Schéma pour une variante de produit
 */
export const varianteSchema = z.object({
  taille: z.string().optional(),
  couleur: z.string().optional(),
  sku: z.string().optional(),
  prix: price.optional(),
  prixCoutantHT: price.default(0),
  prixFlocageHT: price.default(0),
  tauxTVA: z.number().min(0).max(100).default(20),
  stock: quantity.default(0),
  image: z.string().url('URL d\'image invalide').optional().or(z.literal('')),
  actif: z.boolean().default(true),
})

/**
 * Schéma pour un événement
 */
export const evenementSchema = z.object({
  titre: z.string().min(1, 'Le titre est requis'),
  description: z.string().optional(),
  dateDebut: dateString,
  dateFin: dateString.optional(),
  lieu: z.string().optional(),
  type: z.enum(['competition', 'stage', 'evenement']).default('evenement'),
  image: z.string().url('URL d\'image invalide').optional().or(z.literal('')),
  pdfReglement: z.string().url('URL du PDF invalide').optional().or(z.literal('')),
  actif: z.boolean().default(true),
})

/**
 * Schéma pour un groupe
 */
export const groupeSchema = z.object({
  nom: z.string().min(1, 'Le nom est requis'),
  description: z.string().optional().nullable(),
  ageMin: z.coerce.number().int().min(0).max(99).optional().nullable(),
  ageMax: z.coerce.number().int().min(0).max(99).optional().nullable(),
  total: z.coerce.number().int().min(1, 'Le nombre de places est requis'),
  tarif: z.coerce.number().min(0).optional().nullable(),
  tarif1Cours: z.coerce.number().min(0).optional().nullable(),
  libelleOption1: z.string().optional().nullable(),
  libelleOption2: z.string().optional().nullable(),
  inscrits: z.coerce.number().int().min(0).default(0),
  inscrits1Cours: z.coerce.number().int().min(0).default(0),
  prixLicence: z.coerce.number().min(0).optional().nullable(),
  prixFormationPSE: z.coerce.number().min(0).optional().nullable(),
  caution: z.coerce.number().min(0).optional().nullable(),
  niveau: z.string().optional().nullable(),
  dateDebut: z.string().optional().nullable(),
  dateFin: z.string().optional().nullable(),
  isCompetition: z.boolean().default(false),
  nbCompetitions: z.coerce.number().int().min(0).optional().nullable(),
  nbCompetitionsCaution: z.coerce.number().int().min(0).optional().nullable(),
  couleur: z.string().optional().nullable(),
  membresBureau: z.coerce.number().int().min(0).default(0),
  enfantsBureau: z.coerce.number().int().min(0).default(0),
  ordre: z.coerce.number().int().default(0),
  actif: z.boolean().default(true),
  visiblePublic: z.boolean().default(true),
  annule: z.boolean().default(false),
  complet: z.boolean().default(false),
})

/**
 * Schéma pour un événement calendrier
 */
export const evenementCalendrierSchema = z.object({
  title: z.string().min(1, 'Le titre est requis'),
  date: dateString,
  dateFin: optionalDateString,
  heureDebut: z.string().optional().nullable(),
  heureFin: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  lieu: z.string().optional().nullable(),
  type: z.string().optional().nullable(),
  coachId: z.string().optional().nullable(),
  couleur: z.string().optional().nullable(),
  pdfReglement: z.string().optional().nullable(),
  actif: z.boolean().default(true),
})

// === Types inférés ===
export type ProduitInput = z.infer<typeof produitSchema>
export type CategorieInput = z.infer<typeof categorieSchema>
export type VarianteInput = z.infer<typeof varianteSchema>
export type EvenementInput = z.infer<typeof evenementSchema>
export type GroupeInput = z.infer<typeof groupeSchema>
export type EvenementCalendrierInput = z.infer<typeof evenementCalendrierSchema>
