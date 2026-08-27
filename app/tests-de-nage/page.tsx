import { Metadata } from 'next'
import { Suspense } from 'react'
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
    <div className="min-h-screen bg-slate-50/50 pt-32 md:pt-40 pb-16 md:pb-24 px-4 sm:px-6 lg:px-8">
      <Suspense fallback={
        <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
          <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-medium text-slate-500">Chargement...</p>
        </div>
      }>
        <TestNageBooking />
      </Suspense>
    </div>
  )
}
