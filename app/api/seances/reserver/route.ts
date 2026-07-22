import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { stripe } from '@/lib/stripe/server'
import { logger } from '@/lib/logger'
import {
  cancelSeanceReservationPayment,
  releaseSeancePlace,
  reserveSeancePlace,
} from '@/lib/checkout/fulfillment'
import { formRateLimiter } from '@/lib/rate-limiter'
import { apiError, apiSuccess } from '@/lib/api/response'
import { getClientIp } from '@/lib/api/request'
import { z } from 'zod'

const reservationSchema = z.object({
  seanceId: z.string().min(1, 'ID séance requis'),
  prenom: z.string().min(1, 'Prénom requis'),
  nom: z.string().min(1, 'Nom requis'),
  email: z.string().email('Email invalide'),
  telephone: z.string().min(10, 'Téléphone requis'),
})

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request)
    const rateLimitResult = formRateLimiter.checkLimit(ip, 'seance-reservation')
    if (!rateLimitResult.allowed) {
      return apiError(rateLimitResult.message || 'Trop de requêtes', 429, undefined, 'RATE_LIMITED')
    }

    const body = await request.json()
    const validation = reservationSchema.safeParse(body)

    if (!validation.success) {
      const errors = validation.error.issues.map((e) => e.message).join(', ')
      return apiError(errors, 400, validation.error.flatten(), 'VALIDATION_ERROR')
    }

    const data = validation.data

    const seance = await prisma.seanceExceptionnelle.findUnique({
      where: { id: data.seanceId },
    })

    if (!seance) {
      return apiError('Séance non trouvée', 404, undefined, 'NOT_FOUND')
    }

    if (!seance.actif) {
      return apiError('Cette séance n\'est plus disponible', 400, undefined, 'SEANCE_INACTIVE')
    }

    if (new Date(seance.dateSeance) < new Date(new Date().setHours(0, 0, 0, 0))) {
      return apiError('Cette séance est passée', 400, undefined, 'SEANCE_PAST')
    }

    const placeReserved = await reserveSeancePlace(data.seanceId)
    if (!placeReserved) {
      return apiError('Plus de places disponibles', 400, undefined, 'NO_PLACES')
    }

    let reservation
    try {
      reservation = await prisma.reservationSeance.create({
        data: {
          seanceId: data.seanceId,
          prenom: data.prenom,
          nom: data.nom,
          email: data.email,
          telephone: data.telephone,
          montant: seance.prix,
          statutPaiement: 'en_attente',
        },
      })
    } catch (createError) {
      await releaseSeancePlace(data.seanceId)
      throw createError
    }

    const origin = request.headers.get('origin')
    const host = request.headers.get('x-forwarded-host') || request.headers.get('host')
    const proto = request.headers.get('x-forwarded-proto') || 'https'
    const baseUrl = (origin && origin.startsWith('http'))
      ? origin.replace(/\/$/, '')
      : host
      ? `${proto}://${host}`.replace(/\/$/, '')
      : (process.env.NEXT_PUBLIC_URL || process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000').replace(/\/$/, '')

    const dateStr = new Date(seance.dateSeance).toLocaleDateString('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    })

    let session
    try {
      session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [
          {
            price_data: {
              currency: 'eur',
              product_data: {
                name: seance.titre,
                description: `${dateStr} - ${seance.heureDebut} à ${seance.heureFin}`,
              },
              unit_amount: Math.round(seance.prix * 100),
            },
            quantity: 1,
          },
        ],
        mode: 'payment',
        success_url: `${baseUrl}/seances/confirmation?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${baseUrl}/seances?cancelled=true`,
        customer_email: data.email,
        metadata: {
          type: 'seance',
          reservationId: reservation.id,
          seanceId: seance.id,
        },
      })
    } catch (stripeError) {
      await cancelSeanceReservationPayment(reservation.id)
      throw stripeError
    }

    await prisma.reservationSeance.update({
      where: { id: reservation.id },
      data: { stripeSessionId: session.id },
    })

    logger.info(`Réservation créée: ${reservation.id} pour séance ${seance.titre}`)

    return apiSuccess({
      checkoutUrl: session.url,
      reservationId: reservation.id,
    })
  } catch (error) {
    logger.error('Erreur lors de la réservation', error)
    return apiError('Erreur serveur', 500, undefined, 'INTERNAL_SERVER_ERROR')
  }
}
