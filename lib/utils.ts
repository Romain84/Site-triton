/**
 * Utility functions for the application
 */

/**
 * Safely extracts error message from unknown error type
 * Use this in catch blocks instead of `catch (err: any)`
 *
 * @example
 * try {
 *   // ... code that might throw
 * } catch (err) {
 *   setError(getErrorMessage(err))
 * }
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message
  }
  if (typeof error === 'string') {
    return error
  }
  if (error && typeof error === 'object' && 'message' in error) {
    return String((error as { message: unknown }).message)
  }
  return 'Une erreur est survenue'
}

/**
 * Type guard to check if an error has a message property
 */
export function isErrorWithMessage(error: unknown): error is { message: string } {
  return (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    typeof (error as Record<string, unknown>).message === 'string'
  )
}
