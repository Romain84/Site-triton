// Retourne la clé de session en imposant une configuration explicite.
export function getSessionSecretKey(): Uint8Array {
  const secret = process.env.SESSION_SECRET

  if (!secret) {
    throw new Error('SESSION_SECRET environment variable must be set')
  }

  return new TextEncoder().encode(secret)
}
