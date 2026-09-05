import type { NextRequest } from 'next/server'

// Validation stricte du format IPv4 ou IPv6
const IPV4_REGEX = /^(?:(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)\.){3}(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)$/
const IPV6_REGEX = /^(?:[0-9a-fA-F]{1,4}:){1,7}[0-9a-fA-F]{1,4}$|^::1$|^::$|^[0-9a-fA-F]{1,4}(?:::[0-9a-fA-F]{1,4})*$/

export function isValidIp(ip: string): boolean {
  if (!ip || typeof ip !== 'string') return false
  const clean = ip.replace(/^::ffff:/i, '').trim()
  return IPV4_REGEX.test(clean) || IPV6_REGEX.test(clean)
}

/**
 * Extrait l'IP client depuis les en-têtes proxy (Vercel, Nginx, etc.).
 * Valide strictement le format d'adresse IP pour empêcher l'injection de valeurs malveillantes.
 */
export function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) {
    const candidate = forwarded.split(',')[0]?.trim() || ''
    if (isValidIp(candidate)) {
      return candidate
    }
  }

  const realIp = request.headers.get('x-real-ip')?.trim()
  if (realIp && isValidIp(realIp)) {
    return realIp
  }

  return 'unknown'
}

/**
 * Anonymise l'adresse IP conformément aux recommandations RGPD / CNIL
 * - IPv4 : masque le dernier octet (ex: 198.51.100.42 -> 198.51.100.0)
 * - IPv6 : masque les 80 derniers bits (ex: 2001:db8:85a3:1:: -> 2001:db8:85a3::)
 */
export function anonymizeIp(ip: string): string {
  if (!ip || ip === 'unknown') return 'unknown'
  const clean = ip.replace(/^::ffff:/i, '').trim()

  if (clean.includes('.')) {
    const parts = clean.split('.')
    if (parts.length === 4) {
      return `${parts[0]}.${parts[1]}.${parts[2]}.0`
    }
  }

  if (clean.includes(':')) {
    const parts = clean.split(':').filter(Boolean)
    if (parts.length >= 3) {
      return `${parts[0]}:${parts[1]}:${parts[2]}::`
    }
    return '::'
  }

  return 'unknown'
}

