import { NextRequest } from 'next/server'
import { stripe } from '@/lib/stripe/server'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import {
  cancelCommandePayment,
  createCommandeWithStockReservation,
} from '@/lib/checkout/fulfillment'
import { formRateLimiter } from '@/lib/rate-limiter'
import { apiError, apiSuccess } from '@/lib/api/response'
import { getClientIp } from '@/lib/api/request'
import { z } from 'zod'

const checkoutLogger = logger.withContext('Checkout')

// Schéma de validation des données d'entrée
const checkoutItemSchema = z.object({
  produitId: z.string().min(1),
  varianteId: z.string().optional().nullable(),
  quantite: z.number().int().positive(),
  taille: z.string().optional().nullable(),
  couleur: z.string().optional().nullable(),
  textePersonnalise: z.string().max(100).optional().nullable(),
})

const customerInfoSchema = z.object({
  email: z.string().email(),
  prenom: z.string().min(1).max(100),
  nom: z.string().min(1).max(100),
  telephone: z.string().max(20).optional().nullable(),
  prenomNageur: z.string().min(1).max(100),
  nomNageur: z.string().min(1).max(100),
  note: z.string().max(1000).optional().nullable(),
})

const checkoutSchema = z.object({
  items: z.array(checkoutItemSchema).min(1).max(50),
  customerInfo: customerInfoSchema,
})

// Structure pour stocker les prix calculés côté serveur
interface ProcessedItem {
  produitId: string
  varianteId: string | null
  nomProduit: string
  taille: string | null
  couleur: string | null
  image: string | null
  prixUnitaire: number
  quantite: number
  total: number
  textePersonnalise: string | null
}

function getCleanBaseUrl(request?: NextRequest): string {
  if (request) {
    const origin = request.headers.get('origin')
    if (origin && origin.startsWith('http')) {
      return origin.replace(/\/$/, '')
    }
    const referer = request.headers.get('referer')
    if (referer) {
      try {
        const u = new URL(referer)
        return `${u.protocol}//${u.host}`
      } catch {}
    }
    const host = request.headers.get('x-forwarded-host') || request.headers.get('host')
    const proto = request.headers.get('x-forwarded-proto') || 'https'
    if (host) {
      return `${proto}://${host}`.replace(/\/$/, '')
    }
  }

  let url = process.env.NEXT_PUBLIC_URL || process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_BASE_URL || process.env.NEXT_PUBLIC_APP_URL || ''
  if (url) {
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = `https://${url}`
    }
    return url.replace(/\/$/, '')
  }

  return 'http://localhost:3000'
}

function getAbsoluteImageUrls(imagePath: string | null | undefined, baseUrl: string): string[] {
  if (!imagePath) return []
  if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
    return [imagePath]
  }
  if (imagePath.startsWith('/')) {
    return [`${baseUrl}${imagePath}`]
  }
  return []
}

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request)
    const rateLimitResult = formRateLimiter.checkLimit(ip, 'checkout')
    if (!rateLimitResult.allowed) {
      return apiError(rateLimitResult.message || 'Trop de requêtes', 429, undefined, 'RATE_LIMITED')
    }

    const body = await request.json()

    const validationResult = checkoutSchema.safeParse(body)
    if (!validationResult.success) {
      return apiError('Données invalides', 400, validationResult.error.flatten(), 'VALIDATION_ERROR')
    }

    // SÉCURITÉ: Vérifier si la boutique est ouverte
    const settings = await prisma.settings.findFirst()
    if (!settings || !settings.boutiqueOuverte) {
      return apiError('La boutique est actuellement fermée aux commandes.', 400, undefined, 'SHOP_CLOSED')
    }

    const { items, customerInfo } = validationResult.data
    const baseUrl = getCleanBaseUrl(request)

    // Générer un numéro de commande unique
    const numeroCommande = `CMD-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`

    // Calculer le total et vérifier les stocks - UTILISER UNIQUEMENT LES PRIX SERVEUR
    let sousTotal = 0
    const lineItems: any[] = []
    const processedItems: ProcessedItem[] = []

    for (const item of items) {
      // Récupérer le produit pour vérifier le stock et le prix (source de vérité)
      const produit = await prisma.produit.findUnique({
        where: { id: item.produitId },
        include: { variantes: true },
      })

      if (!produit || !produit.actif) {
        return apiError('Le produit n\'est plus disponible', 400, undefined, 'PRODUCT_UNAVAILABLE')
      }

      // Vérifier la variante si spécifiée
      let variante = null
      if (item.varianteId) {
        variante = produit.variantes.find((v) => v.id === item.varianteId)
        if (!variante || !variante.actif) {
          return apiError('La variante sélectionnée n\'est plus disponible', 400, undefined, 'VARIANT_UNAVAILABLE')
        }
      }

      // Vérifier le stock
      if (produit.gererStock && !produit.stockIllimite) {
        const stock = variante ? variante.stock : produit.stock

        if (stock < item.quantite) {
          return apiError(`Stock insuffisant pour ${produit.nom}`, 400, undefined, 'INSUFFICIENT_STOCK')
        }
      }

      // Vérifier si le produit est personnalisable et requiert un texte
      if (produit.personnalisable && (!item.textePersonnalise || !item.textePersonnalise.trim())) {
        return apiError(`Le produit ${produit.nom} requiert un texte de personnalisation.`, 400, undefined, 'PERSONALIZATION_REQUIRED')
      }

      // SÉCURITÉ: Calculer le prix UNIQUEMENT depuis la base de données (pas depuis le client)
      let prixUnitaire: number
      if (variante && variante.prix !== null) {
        prixUnitaire = variante.prix
      } else if (produit.enPromo && produit.prixPromo !== null) {
        prixUnitaire = produit.prixPromo
      } else {
        prixUnitaire = produit.prix
      }

      // SÉCURITÉ: Ajouter le surcoût de personnalisation si applicable
      if (produit.personnalisable && item.textePersonnalise && item.textePersonnalise.trim() !== '') {
        prixUnitaire += (produit as any).prixFlocage || 0
      }

      sousTotal += prixUnitaire * item.quantite

      // Construire la description de la variante et de la personnalisation
      const descriptionParts = []
      if (item.taille) descriptionParts.push(`Taille: ${item.taille}`)
      if (item.couleur) descriptionParts.push(`Couleur: ${item.couleur}`)
      if (produit.personnalisable && item.textePersonnalise) {
        descriptionParts.push(`Personnalisation: ${item.textePersonnalise}`)
      }
      const description = descriptionParts.length > 0 ? descriptionParts.join(', ') : undefined

      // Ajouter l'article à Stripe avec le prix serveur et une URL d'image valide
      lineItems.push({
        price_data: {
          currency: 'eur',
          product_data: {
            name: produit.nom,
            description,
            images: getAbsoluteImageUrls(produit.image, baseUrl),
          },
          unit_amount: Math.round(prixUnitaire * 100), // Stripe utilise des centimes
        },
        quantity: item.quantite,
      })

      // Préparer les données pour la commande (prix serveur uniquement)
      processedItems.push({
        produitId: item.produitId,
        varianteId: item.varianteId || null,
        nomProduit: produit.nom,
        taille: item.taille || null,
        couleur: item.couleur || null,
        image: produit.image,
        prixUnitaire,
        quantite: item.quantite,
        total: prixUnitaire * item.quantite,
        textePersonnalise: produit.personnalisable ? (item.textePersonnalise || null) : null,
      })
    }

    // Pas de frais de livraison (retrait en main propre)
    const fraisLivraison = 0

    // Créer la commande et réserver le stock atomiquement
    let commande
    try {
      commande = await createCommandeWithStockReservation({
        numeroCommande,
        email: customerInfo.email,
        prenom: customerInfo.prenom,
        nom: customerInfo.nom,
        telephone: customerInfo.telephone || null,
        prenomNageur: customerInfo.prenomNageur,
        nomNageur: customerInfo.nomNageur,
        sousTotal,
        fraisLivraison,
        total: sousTotal + fraisLivraison,
        noteClient: customerInfo.note || null,
        lignes: processedItems,
      })
    } catch (error) {
      if (error instanceof Error && error.message === 'STOCK_INSUFFICIENT') {
        return apiError('Stock insuffisant pour un ou plusieurs articles', 400, undefined, 'INSUFFICIENT_STOCK')
      }
      throw error
    }

    // Créer une session Stripe Checkout
    let session
    try {
      session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: lineItems,
        mode: 'payment',
        customer_email: customerInfo.email,
        metadata: {
          commandeId: commande.id,
          numeroCommande: commande.numeroCommande,
          prenomNageur: customerInfo.prenomNageur,
          nomNageur: customerInfo.nomNageur,
        },
        success_url: `${baseUrl}/commande/confirmation?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${baseUrl}/panier`,
        locale: 'fr',
      })
    } catch (stripeError: any) {
      await cancelCommandePayment(commande.id)
      checkoutLogger.error('Erreur Stripe Checkout:', stripeError)
      throw stripeError
    }

    // Mettre à jour la commande avec l'ID de session Stripe
    await prisma.commande.update({
      where: { id: commande.id },
      data: { stripeSessionId: session.id },
    })

    return apiSuccess({
      sessionId: session.id,
      url: session.url,
    })
  } catch (error: any) {
    const errorMsg = error?.message || 'Erreur lors de la création de la session de paiement'
    checkoutLogger.error('Erreur lors de la création de la session Stripe', error)
    return apiError(errorMsg, 500, undefined, 'CHECKOUT_FAILED')
  }
}
