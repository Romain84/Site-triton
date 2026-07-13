import type { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'

const fulfillmentLogger = logger.withContext('CheckoutFulfillment')

type TransactionClient = Prisma.TransactionClient

type CommandeLineWithProduct = Prisma.LigneCommandeGetPayload<{
  include: { produit: true }
}>

/**
 * Décrémente le stock (strict : échoue si stock insuffisant).
 */
export async function decrementStockForCommandeLines(
  tx: TransactionClient,
  lignes: CommandeLineWithProduct[]
): Promise<boolean> {
  for (const ligne of lignes) {
    const produit = ligne.produit

    if (!produit.gererStock || produit.stockIllimite) {
      continue
    }

    if (ligne.varianteId) {
      const updated = await tx.varianteProduit.updateMany({
        where: {
          id: ligne.varianteId,
          stock: { gte: ligne.quantite },
        },
        data: { stock: { decrement: ligne.quantite } },
      })

      if (updated.count === 0) {
        fulfillmentLogger.warn('Stock variante insuffisant', {
          varianteId: ligne.varianteId,
          quantite: ligne.quantite,
        })
        return false
      }
      continue
    }

    const updated = await tx.produit.updateMany({
      where: {
        id: ligne.produitId,
        stock: { gte: ligne.quantite },
      },
      data: { stock: { decrement: ligne.quantite } },
    })

    if (updated.count === 0) {
      fulfillmentLogger.warn('Stock produit insuffisant', {
        produitId: ligne.produitId,
        quantite: ligne.quantite,
      })
      return false
    }
  }

  return true
}

/**
 * Restaure le stock après annulation d'une commande en attente.
 */
export async function incrementStockForCommandeLines(
  tx: TransactionClient,
  lignes: CommandeLineWithProduct[]
): Promise<void> {
  for (const ligne of lignes) {
    const produit = ligne.produit

    if (!produit.gererStock || produit.stockIllimite) {
      continue
    }

    if (ligne.varianteId) {
      await tx.varianteProduit.update({
        where: { id: ligne.varianteId },
        data: { stock: { increment: ligne.quantite } },
      })
      continue
    }

    await tx.produit.update({
      where: { id: ligne.produitId },
      data: { stock: { increment: ligne.quantite } },
    })
  }
}

export type CreateCommandeInput = {
  numeroCommande: string
  email: string
  prenom: string
  nom: string
  telephone: string | null
  prenomNageur: string
  nomNageur: string
  sousTotal: number
  fraisLivraison: number
  total: number
  noteClient: string | null
  lignes: Array<{
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
  }>
}

/**
 * Crée la commande et réserve le stock atomiquement (avant redirection Stripe).
 */
export async function createCommandeWithStockReservation(data: CreateCommandeInput) {
  return prisma.$transaction(async (tx) => {
    const commande = await tx.commande.create({
      data: {
        numeroCommande: data.numeroCommande,
        email: data.email,
        prenom: data.prenom,
        nom: data.nom,
        telephone: data.telephone,
        prenomNageur: data.prenomNageur,
        nomNageur: data.nomNageur,
        adresse: null,
        adresseComp: null,
        codePostal: null,
        ville: null,
        pays: 'France',
        sousTotal: data.sousTotal,
        fraisLivraison: data.fraisLivraison,
        reduction: 0,
        total: data.total,
        modePaiement: 'stripe',
        statutPaiement: 'en_attente',
        statut: 'nouvelle',
        noteClient: data.noteClient,
        lignes: {
          create: data.lignes,
        },
      },
    })

    const commandeWithLines = await tx.commande.findUnique({
      where: { id: commande.id },
      include: {
        lignes: { include: { produit: true } },
      },
    })

    if (!commandeWithLines) {
      throw new Error('Commande introuvable après création')
    }

    const stockOk = await decrementStockForCommandeLines(tx, commandeWithLines.lignes)
    if (!stockOk) {
      throw new Error('STOCK_INSUFFICIENT')
    }

    return commande
  })
}

/**
 * Confirme le paiement (stock déjà réservé à la création de commande).
 */
export async function fulfillCommandePayment(
  commandeId: string,
  stripeSessionId: string,
  stripePaymentId: string | null
) {
  return prisma.$transaction(async (tx) => {
    const commande = await tx.commande.findUnique({
      where: { id: commandeId },
    })

    if (!commande) {
      throw new Error(`Commande introuvable: ${commandeId}`)
    }

    if (commande.statutPaiement === 'paye') {
      return commande
    }

    return tx.commande.update({
      where: { id: commandeId },
      data: {
        statutPaiement: 'paye',
        statut: 'confirmee',
        stripePaymentId,
        stripeSessionId,
      },
    })
  })
}

/**
 * Annule une commande en attente et restaure le stock réservé.
 */
export async function cancelCommandePayment(commandeId: string) {
  return prisma.$transaction(async (tx) => {
    const commande = await tx.commande.findUnique({
      where: { id: commandeId },
      include: {
        lignes: { include: { produit: true } },
      },
    })

    if (!commande || commande.statutPaiement === 'paye') {
      return commande
    }

    if (commande.statutPaiement === 'en_attente') {
      await incrementStockForCommandeLines(tx, commande.lignes)
    }

    return tx.commande.update({
      where: { id: commandeId },
      data: { statutPaiement: 'echoue' },
    })
  })
}

/**
 * Réserve une place pour une séance (décrément atomique avant paiement Stripe).
 */
export async function reserveSeancePlace(seanceId: string) {
  const updated = await prisma.seanceExceptionnelle.updateMany({
    where: {
      id: seanceId,
      actif: true,
      placesRestantes: { gt: 0 },
    },
    data: { placesRestantes: { decrement: 1 } },
  })

  return updated.count > 0
}

/**
 * Libère une place réservée (session Stripe expirée, paiement abandonné).
 */
export async function releaseSeancePlace(seanceId: string) {
  await prisma.seanceExceptionnelle.update({
    where: { id: seanceId },
    data: { placesRestantes: { increment: 1 } },
  })
}

/**
 * Confirme le paiement d'une réservation de séance (idempotent ; place déjà réservée).
 */
export async function fulfillSeanceReservationPayment(
  reservationId: string,
  stripeSessionId: string,
  stripePaymentId: string | null
) {
  return prisma.$transaction(async (tx) => {
    const reservation = await tx.reservationSeance.findUnique({
      where: { id: reservationId },
    })

    if (!reservation) {
      throw new Error(`Réservation introuvable: ${reservationId}`)
    }

    if (reservation.statutPaiement === 'paye') {
      return reservation
    }

    return tx.reservationSeance.update({
      where: { id: reservationId },
      data: {
        statutPaiement: 'paye',
        stripePaymentId,
        stripeSessionId,
      },
    })
  })
}

/**
 * Annule une réservation en attente et rend la place.
 */
export async function cancelSeanceReservationPayment(reservationId: string) {
  return prisma.$transaction(async (tx) => {
    const reservation = await tx.reservationSeance.findUnique({
      where: { id: reservationId },
    })

    if (!reservation || reservation.statutPaiement === 'paye') {
      return reservation
    }

    if (reservation.statutPaiement === 'en_attente') {
      await tx.seanceExceptionnelle.update({
        where: { id: reservation.seanceId },
        data: { placesRestantes: { increment: 1 } },
      })
    }

    return tx.reservationSeance.update({
      where: { id: reservationId },
      data: { statutPaiement: 'echoue' },
    })
  })
}
