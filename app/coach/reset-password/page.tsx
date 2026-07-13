'use client'

import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { getErrorMessage } from '@/lib/utils'

function ResetPasswordForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get('token')

  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)

  if (!token) {
    return (
      <div className="min-h-screen py-8 bg-gray-50">
        <div className="container mx-auto px-4 max-w-md">
          <div className="card p-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h1 className="text-2xl font-bold mb-4">Lien invalide</h1>
              <p className="text-gray-600 mb-6">
                Le lien de réinitialisation est invalide ou a expiré.
              </p>
              <Link
                href="/coach/mot-de-passe-oublie"
                className="btn-primary inline-block"
              >
                Faire une nouvelle demande
              </Link>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (password !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas')
      return
    }

    if (password.length < 8) {
      setError('Le mot de passe doit contenir au moins 8 caractères')
      return
    }

    setLoading(true)

    try {
      const response = await fetch('/api/auth/coach/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token, password }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Erreur lors de la réinitialisation')
      }

      setSuccess(true)
      // Rediriger vers la connexion après 3 secondes
      setTimeout(() => {
        router.push('/coach/login')
      }, 3000)
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
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h1 className="text-2xl font-bold mb-4">Mot de passe modifié !</h1>
              <p className="text-gray-600 mb-6">
                Votre mot de passe a été réinitialisé avec succès.
              </p>
              <p className="text-sm text-gray-500 mb-4">
                Redirection vers la page de connexion...
              </p>
              <Link
                href="/coach/login"
                className="text-primary hover:underline font-medium"
              >
                Se connecter maintenant
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
            <h1 className="text-3xl font-bold mb-2">Nouveau mot de passe</h1>
            <p className="text-gray-600">
              Choisissez un nouveau mot de passe sécurisé.
            </p>
          </div>

          {error && (
            <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6 rounded">
              <p className="text-red-700">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="password" className="block font-semibold mb-2">
                Nouveau mot de passe
              </label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder="••••••••"
              />
              <p className="text-sm text-gray-500 mt-1">
                Minimum 8 caractères
              </p>
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block font-semibold mb-2">
                Confirmer le mot de passe
              </label>
              <input
                type="password"
                id="confirmPassword"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={8}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary text-white px-6 py-3 rounded-lg font-bold hover:bg-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Modification...' : 'Modifier le mot de passe'}
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

export default function CoachResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen py-8 bg-gray-50">
        <div className="container mx-auto px-4 max-w-md">
          <div className="card p-8 text-center">
            Chargement...
          </div>
        </div>
      </div>
    }>
      <ResetPasswordForm />
    </Suspense>
  )
}
