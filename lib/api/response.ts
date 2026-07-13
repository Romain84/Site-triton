import { NextResponse } from 'next/server'

/**
 * Construit un identifiant de requête pour faciliter la corrélation côté logs/client.
 */
function buildRequestId() {
  return crypto.randomUUID()
}

/**
 * Réponse de succès API avec format homogène.
 */
export function apiSuccess<T extends Record<string, unknown>>(payload: T, status = 200) {
  return NextResponse.json(
    {
      success: true,
      requestId: buildRequestId(),
      ...payload,
    },
    { status }
  )
}

/**
 * Réponse d'erreur API avec format homogène.
 */
export function apiError(error: string, status = 400, details?: unknown, code = 'API_ERROR') {
  return NextResponse.json(
    {
      success: false,
      code,
      error,
      requestId: buildRequestId(),
      ...(details !== undefined ? { details } : {}),
    },
    { status }
  )
}
