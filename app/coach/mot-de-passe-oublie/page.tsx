'use client'

import { useState } from 'react'
import Link from 'next/link'
import { getErrorMessage } from '@/lib/utils'

export default function CoachForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const response = await fetch('/api/auth/coach/forgot-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Erreur lors de la demande')
      }

      setSuccess(true)
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen py-8 bg-gray-50">
        <div className="container mx-auto px-4 max-w-md">
          <div className="card p-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <h1 className="text-2xl font-bold mb-4">Email envoyé !</h1>
              <p className="text-gray-600 mb-6">
                Si un compte existe avec l&apos;adresse <strong>{email}</strong>, vous recevrez un email avec les instructions pour réinitialiser votre mot de passe.
              </p>
              <p className="text-sm text-gray-500 mb-6">
                Le lien expire dans 1 heure.
              </p>
              <Link
                href="/coach/login"
                className="text-primary hover:underline font-medium"
              >
                ← Retour à la connexion
              </Link>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen py-8 bg-gray-50">
      <div className="container mx-auto px-4 max-w-md">
        <div className="card p-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold mb-2">Mot de passe oublié ?</h1>
            <p className="text-gray-600">
              Entrez votre adresse email pour recevoir un lien de réinitialisation.
            </p>
          </div>

          {error && (
            <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6 rounded">
              <p className="text-red-700">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="email" className="block font-semibold mb-2">
                Adresse email
              </label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder="votre.email@triton-club.fr"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary text-white px-6 py-3 rounded-lg font-bold hover:bg-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Envoi en cours...' : 'Envoyer le lien'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <Link href="/coach/login" className="text-primary hover:underline">
              ← Retour à la connexion
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
