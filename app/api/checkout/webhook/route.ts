import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { stripe } from '@/lib/stripe/server'
import { logger } from '@/lib/logger'
import { notifyAdmin } from '@/lib/notifications'
import {
  cancelCommandePayment,
  cancelSeanceReservationPayment,
  fulfillCommandePayment,
  fulfillSeanceReservationPayment,
} from '@/lib/checkout/fulfillment'
import { prisma } from '@/lib/prisma'
import {
  queueEmail,
  getCommandeConfirmationEmail,
  getAdminNewCommandeEmail,
} from '@/lib/email'

const webhookLogger = logger.withContext('CheckoutWebhook')

// Désactive le parsing implicite pour valider la signature Stripe sur le payload brut.
export async function POST(request: NextRequest) {
  const signature = request.headers.get('stripe-signature')
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET

  if (!signature || !endpointSecret) {
    return NextResponse.json({ error: 'Webhook non configuré' }, { status: 400 })
  }

  const payload = await request.text()
  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(payload, signature, endpointSecret)
  } catch (error) {
    webhookLogger.error('Signature webhook invalide', error)
    return NextResponse.json({ error: 'Signature invalide' }, { status: 400 })
  }

  try {
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session
      const sessionId = session.id
      const stripePaymentId =
        typeof session.payment_intent === 'string' ? session.payment_intent : null

      if (session.metadata?.commandeId) {
        const commande = await fulfillCommandePayment(
          session.metadata.commandeId,
          sessionId,
          stripePaymentId
        )

        // Envoi des e-mails automatiques de confirmation
        try {
          const dbCommande = await prisma.commande.findUnique({
            where: { id: commande.id },
            include: { lignes: true },
          })

          if (dbCommande) {
            const lignesData = dbCommande.lignes.map((l) => ({
              nom: l.nomProduit,
              quantite: l.quantite,
              prix: l.prixUnitaire,
              taille: l.taille,
              couleur: l.couleur,
            }))

            // 1. E-mail de confirmation au client
            const clientEmail = getCommandeConfirmationEmail({
              numeroCommande: dbCommande.numeroCommande,
              prenom: dbCommande.prenom,
              nom: dbCommande.nom,
              prenomNageur: dbCommande.prenomNageur,
              nomNageur: dbCommande.nomNageur,
              lignes: lignesData,
              total: dbCommande.total,
            })

            await queueEmail({
              to: dbCommande.email,
              subject: clientEmail.subject,
              html: clientEmail.html,
              text: clientEmail.text,
            })

            // 2. E-mail de notification de commande payée à l'administrateur
            const adminEmail = getAdminNewCommandeEmail({
              numeroCommande: dbCommande.numeroCommande,
              prenom: dbCommande.prenom,
              nom: dbCommande.nom,
              email: dbCommande.email,
              prenomNageur: dbCommande.prenomNageur,
              nomNageur: dbCommande.nomNageur,
              lignes: lignesData,
              total: dbCommande.total,
            })

            // Récupérer l'e-mail de notification de l'admin
            const settings = await prisma.settings.findFirst({
              select: { emailNotification: true, smtpUser: true },
            })
            const adminDestEmail = settings?.emailNotification || settings?.smtpUser

            if (adminDestEmail) {
              await queueEmail({
                to: adminDestEmail,
                subject: adminEmail.subject,
                html: adminEmail.html,
                text: adminEmail.text,
              })
            } else {
              webhookLogger.warn("Pas d'email admin configuré pour les notifications de commande")
            }
          }
        } catch (emailError) {
          webhookLogger.error("Erreur lors de l'envoi des e-mails de confirmation de commande", emailError)
        }

        await notifyAdmin({
          sujet: `Commande ${commande.numeroCommande} payée`,
          messageHtml: `<p>La commande <strong>${commande.numeroCommande}</strong> a été payée avec succès.</p>`,
          messageTexte: `La commande ${commande.numeroCommande} a été payée avec succès.`,
        })
      }

      if (session.metadata?.reservationId) {
        await fulfillSeanceReservationPayment(
          session.metadata.reservationId,
          sessionId,
          stripePaymentId
        )
      }
    }

    if (event.type === 'checkout.session.expired') {
      const session = event.data.object as Stripe.Checkout.Session

      if (session.metadata?.commandeId) {
        await cancelCommandePayment(session.metadata.commandeId)
      }

      if (session.metadata?.reservationId) {
        await cancelSeanceReservationPayment(session.metadata.reservationId)
      }
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    webhookLogger.error('Erreur traitement webhook', error)
    return NextResponse.json({ error: 'Erreur serveur webhook' }, { status: 500 })
  }
}
