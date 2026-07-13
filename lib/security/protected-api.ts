const MUTATIVE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE'])

/** Préfixes d'API nécessitant une vérification d'origine (anti-CSRF). */
const PROTECTED_PREFIXES = [
  '/api/admin/',
  '/api/coach/',
  '/api/auth/admin/',
  '/api/auth/coach/',
]

/** Routes exclues (webhooks, callbacks externes). */
const EXCLUDED_PATHS = ['/api/checkout/webhook']

/**
 * Indique si la requête doit être rejetée sans en-tête Origin valide.
 */
export function requiresSameOriginCheck(pathname: string, method: string): boolean {
  if (!MUTATIVE_METHODS.has(method.toUpperCase())) {
    return false
  }

  if (EXCLUDED_PATHS.some((path) => pathname.startsWith(path))) {
    return false
  }

  return PROTECTED_PREFIXES.some((prefix) => pathname.startsWith(prefix))
}
