import type { NextRequest } from 'next/server'

/**
 * Vérifie qu'une requête mutative provient bien de la même origine.
 * Retourne false si l'origine est absente ou ne correspond pas à l'hôte courant.
 */
export function isSameOriginRequest(request: Request | NextRequest): boolean {
  const origin = request.headers.get('origin')
  const host = request.headers.get('host')

  if (!origin || !host) {
    return false
  }

  const protoFromForward = request.headers.get('x-forwarded-proto')
  const protocol = protoFromForward || (process.env.NODE_ENV === 'production' ? 'https' : 'http')
  const expectedOrigin = `${protocol}://${host}`

  return origin === expectedOrigin
}
