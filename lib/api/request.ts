import type { NextRequest } from 'next/server'

/**
 * Extrait l'IP client depuis les en-têtes proxy (Vercel, Nginx, etc.).
 */
export function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) {
    return forwarded.split(',')[0]?.trim() || 'unknown'
  }
  return request.headers.get('x-real-ip') || 'unknown'
}
