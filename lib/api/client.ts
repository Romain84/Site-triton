/**
 * Helpers pour consommer les réponses API homogènes côté client.
 */
export type ApiResponse<T = Record<string, unknown>> = {
  success: boolean
  error?: string
  code?: string
  requestId?: string
} & T

export function getApiErrorMessage(data: unknown, fallback = 'Une erreur est survenue'): string {
  if (data && typeof data === 'object' && 'error' in data && typeof (data as ApiResponse).error === 'string') {
    return (data as ApiResponse).error as string
  }
  return fallback
}

export function isApiSuccess(data: unknown): data is ApiResponse & { success: true } {
  return Boolean(data && typeof data === 'object' && (data as ApiResponse).success === true)
}
