import { Metadata } from 'next'
import TestNageBooking from '@/components/tests-nage/TestNageBooking'

export const metadata: Metadata = {
  title: 'Tests de Nage & Niveau - Réservation | Triton Club Cavaillon',
  description: 'Réservation de créneau de test de niveau pour la rentrée sportive au Triton Club Cavaillon.',
  robots: {
    index: false,
    follow: false,
  },
}

export default function TestsDeNagePage() {
  return (
    <div className="min-h-screen bg-slate-50/50 py-10 md:py-16 px-4 sm:px-6 lg:px-8">
      <TestNageBooking />
    </div>
  )
}
