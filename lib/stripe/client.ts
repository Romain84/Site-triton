import { loadStripe, Stripe } from '@stripe/stripe-js'
import { logger } from '@/lib/logger'

let stripePromise: Promise<Stripe | null>

export const getStripe = () => {
  if (!stripePromise) {
    if (!process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY) {
      logger.error('NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY is not defined')
      return null
    }
    stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY)
  }
  return stripePromise
}
