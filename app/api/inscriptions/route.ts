import { NextRequest } from 'next/server'
import { apiError } from '@/lib/api/response'

/**
 * Les inscriptions passent par MonClub.fr — cette route est désactivée.
 */
export async function POST(_request: NextRequest) {
  return apiError(
    'Les inscriptions se font sur MonClub.fr. Rendez-vous sur la page Inscription du site.',
    410,
    { redirectUrl: 'https://monclub.fr' },
    'INSCRIPTIONS_DISABLED'
  )
}
