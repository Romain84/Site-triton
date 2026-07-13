import { Metadata } from 'next'
import LeClubInteractive from '@/components/le-club/LeClubInteractive'

export const metadata: Metadata = {
  title: 'Le Club - Triton Club Cavaillon',
  description: 'Découvrez l\'organisation, le conseil d\'administration, les statuts officiels et les coordonnées de contact du Triton Club Cavaillon, association de natation affiliée à la FFN.',
}

export default function LeClubPage() {
  return (
    <main className="min-h-screen pt-32 md:pt-40 pb-24 bg-slate-50/50">
      <div className="container mx-auto px-4 max-w-6xl">
        <LeClubInteractive />
      </div>
    </main>
  )
}
