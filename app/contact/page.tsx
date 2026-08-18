import ContactClient from '@/components/ContactClient'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Contact & Assistance - Triton Club Cavaillon',
  description: 'Contactez le Triton Club Cavaillon. Obtenez une réponse immédiate grâce à notre assistant ou envoyez un message au bureau.',
}

export default function ContactPage() {
  return <ContactClient />
}
