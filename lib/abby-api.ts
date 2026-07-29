import { logger } from '@/lib/logger'

const ABBY_BASE_URL = 'https://api.app-abby.com'

export interface AbbyInvoiceLine {
  description: string
  quantity: number
  unitPrice: number // en Euros (sera converti en centimes pour Abby)
  unitPriceHT?: number
  type?: number // 1: Vente de biens, 2: Prestation de service (default: 2)
  vatCode?: string // default: "FR_00HT" (Non assujetti TVA)
}

export interface AbbyExportParams {
  apiKey: string
  clubName?: string
  clubSiret?: string
  clubEmail?: string
  mois: number
  annee: number
  lines: AbbyInvoiceLine[]
}

export interface AbbyExportResult {
  success: boolean
  invoiceId?: string
  invoiceNumber?: string
  error?: string
  errorCode?: string
  details?: unknown
}

export class AbbyApiError extends Error {
  code: string
  status?: number

  constructor(message: string, code: string, status?: number) {
    super(message)
    this.name = 'AbbyApiError'
    this.code = code
    this.status = status
  }
}

/**
 * Exporte une facture coach vers la plateforme Abby
 */
export async function exportInvoiceToAbby(params: AbbyExportParams): Promise<AbbyExportResult> {
  const { apiKey, clubName = 'Triton Club Cavaillon', clubSiret, clubEmail, mois, annee, lines } = params

  if (!apiKey || apiKey.trim() === '') {
    throw new AbbyApiError(
      "La clé API Abby n'est pas renseignée. La facture ne sera pas exportée vers la plateforme Abby.",
      'MISSING_API_KEY',
      400
    )
  }

  const cleanApiKey = apiKey.trim()
  const headers = {
    'Authorization': `Bearer ${cleanApiKey}`,
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  }

  try {
    // 1. Rechercher ou créer l'organisation "Triton Club Cavaillon" sur Abby
    let customerId: string | null = null

    try {
      const searchRes = await fetch(`${ABBY_BASE_URL}/organizations?search=${encodeURIComponent(clubName)}&limit=5`, {
        headers,
      })

      if (searchRes.ok) {
        const searchData = await searchRes.json()
        if (searchData.docs && Array.isArray(searchData.docs) && searchData.docs.length > 0) {
          customerId = searchData.docs[0].id
        }
      }
    } catch (e) {
      logger.withContext('AbbyAPI').warn('Erreur lors de la recherche d\'organisation Abby', e)
    }

    // Si non trouvée, créer l'organisation
    if (!customerId) {
      const createOrgRes = await fetch(`${ABBY_BASE_URL}/organization`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          name: clubName,
          siret: clubSiret || undefined,
          emails: clubEmail ? [clubEmail] : ['admin@triton-club.fr'],
          billingAddress: {
            address: 'Piscine couverte Alphonse Roudière, Avenue Jean Moulin, quartier La Clède',
            city: 'Cavaillon',
            zipCode: '84300',
            country: 'FR',
          },
        }),
      })

      if (!createOrgRes.ok) {
        await handleHttpError(createOrgRes, 'Création de l\'organisation client')
      }

      const orgData = await createOrgRes.json()
      customerId = orgData.id
    }

    if (!customerId) {
      throw new AbbyApiError(
        'Impossible de déterminer l\'identifiant client sur Abby.',
        'ABBY_CUSTOMER_ERROR',
        500
      )
    }

    // 2. Créer le brouillon de facture
    const createInvoiceRes = await fetch(`${ABBY_BASE_URL}/v2/billing/invoice/${customerId}`, {
      method: 'POST',
      headers,
    })

    if (!createInvoiceRes.ok) {
      await handleHttpError(createInvoiceRes, 'Création de la facture')
    }

    const invoiceData = await createInvoiceRes.json()
    const billingId = invoiceData.id

    if (!billingId) {
      throw new AbbyApiError(
        'Identifiant de facture manquant dans la réponse d\'Abby.',
        'ABBY_INVOICE_ID_MISSING',
        500
      )
    }

    // 3. Ajouter les lignes de prestations
    const moisNoms = [
      'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
      'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
    ]
    const monthName = moisNoms[mois - 1] || `${mois}`

    const formattedLines = lines.map((l) => ({
      designation: l.description,
      description: `Intervention vacation natation ${monthName} ${annee}`,
      quantity: l.quantity,
      unitPrice: Math.round((l.unitPrice || 0) * 100), // conversion en centimes d'euros pour Abby
      quantityUnit: 1, // UNIT / HEURE
      type: l.type || 2, // Prestation de service
      vatCode: l.vatCode || 'FR_00HT', // Par défaut exonéré (micro-entreprise)
    }))

    const patchLinesRes = await fetch(`${ABBY_BASE_URL}/v2/billing/${billingId}/lines`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({
        lines: formattedLines,
      }),
    })

    if (!patchLinesRes.ok) {
      await handleHttpError(patchLinesRes, 'Mise à jour des lignes de facture')
    }

    const finalInvoice = await patchLinesRes.json()

    return {
      success: true,
      invoiceId: finalInvoice.id || billingId,
      invoiceNumber: finalInvoice.number || invoiceData.number,
    }
  } catch (error) {
    if (error instanceof AbbyApiError) {
      throw error
    }
    logger.withContext('AbbyAPI').error('Erreur réseau ou inattendue Abby', error)
    throw new AbbyApiError(
      'Impossible de contacter le serveur Abby. Vérifiez votre connexion réseau.',
      'NETWORK_ERROR',
      503
    )
  }
}

/**
 * Intercepte et interprète les erreurs HTTP renvoyées par l'API Abby
 */
async function handleHttpError(response: Response, context: string): Promise<never> {
  let errorMsg = ''
  try {
    const data = await response.json()
    errorMsg = data.message || data.error || JSON.stringify(data)
  } catch {
    errorMsg = response.statusText
  }

  const status = response.status

  logger.withContext('AbbyAPI').error(`Erreur HTTP Abby ${status} (${context}): ${errorMsg}`)

  switch (status) {
    case 401:
      throw new AbbyApiError(
        'Clé API Abby invalide ou expirée (Code 401). Veuillez vérifier votre clé API dans votre profil.',
        'ABBY_UNAUTHORIZED',
        401
      )
    case 400:
      throw new AbbyApiError(
        `Données transmises invalides à l'API Abby (Code 400) : ${errorMsg}`,
        'ABBY_BAD_REQUEST',
        400
      )
    case 403:
      throw new AbbyApiError(
        'Accès refusé par l\'API Abby (Code 403). Droits insuffisants pour cette clé API.',
        'ABBY_FORBIDDEN',
        403
      )
    case 404:
      throw new AbbyApiError(
        `Ressource non trouvée sur Abby (Code 404) : ${errorMsg}`,
        'ABBY_NOT_FOUND',
        404
      )
    case 422:
      throw new AbbyApiError(
        `Erreur de validation des données Abby (Code 422) : ${errorMsg}`,
        'ABBY_VALIDATION_ERROR',
        422
      )
    case 429:
      throw new AbbyApiError(
        'Limite de requêtes atteinte sur l\'API Abby (Code 429). Veuillez réessayer dans un instant.',
        'ABBY_RATE_LIMIT',
        429
      )
    case 500:
    case 502:
    case 503:
    case 504:
      throw new AbbyApiError(
        `Le serveur Abby rencontre un problème temporaire (Code ${status}). Réessayez ultérieurement.`,
        'ABBY_SERVER_ERROR',
        status
      )
    default:
      throw new AbbyApiError(
        `Erreur API Abby (${status}) lors de l'opération "${context}" : ${errorMsg}`,
        'ABBY_API_ERROR',
        status
      )
  }
}
