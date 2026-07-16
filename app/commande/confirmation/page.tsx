'use client'

import { Suspense, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useCart } from '@/context/CartContext'

export default function ConfirmationPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen pt-40 pb-20 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="max-w-2xl mx-auto text-center py-20">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4"></div>
            <p className="text-gray-600">Chargement...</p>
          </div>
        </div>
      </div>
    }>
      <ConfirmationContent />
    </Suspense>
  )
}

function ConfirmationContent() {
  const searchParams = useSearchParams()
  const { clearCart } = useCart()
  const sessionId = searchParams.get('session_id')
  useEffect(() => {
    if (!sessionId) {
      return
    }

    // Vider le panier après confirmation.
    clearCart()
  }, [sessionId, clearCart])

  if (!sessionId) {
    return (
      <div className="min-h-screen pt-40 pb-20 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="max-w-2xl mx-auto">
            <div className="card p-12 text-center">
              <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg
                  className="w-12 h-12 text-red-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </div>
              <h1 className="text-3xl font-bold text-gray-900 mb-4">Erreur</h1>
              <p className="text-gray-600 mb-8">Session invalide</p>
              <Link
                href="/boutique"
                className="inline-block bg-primary text-white px-8 py-3 rounded-lg font-bold hover:bg-primary-dark transition-colors"
              >
                Retour à la boutique
              </Link>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen pt-40 pb-20 bg-gray-50">
      <div className="container mx-auto px-4">
        <div className="max-w-2xl mx-auto">
          <div className="card p-12 text-center">
            {/* Icône de succès */}
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6 animate-bounce">
              <svg
                className="w-12 h-12 text-green-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>

            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              Commande confirmée !
            </h1>

            <p className="text-xl text-gray-600 mb-8">
              Merci pour votre commande ! Nous avons bien reçu votre paiement.
            </p>

            <div className="bg-primary/10 border border-primary/20 rounded-lg p-6 mb-8">
              <p className="text-gray-700 mb-2">
                <strong>Un email de confirmation</strong> a été envoyé à votre adresse email avec tous les détails de votre commande.
              </p>
              <p className="text-gray-600 text-sm">
                Vous recevrez un email de suivi dès que votre commande sera expédiée.
              </p>
            </div>

            <div className="space-y-4">
              <Link
                href="/boutique"
                className="block bg-primary text-white px-8 py-3 rounded-lg font-bold hover:bg-primary-dark transition-colors"
              >
                Continuer mes achats
              </Link>
              <Link
                href="/"
                className="block text-primary hover:underline font-medium"
              >
                Retour à l&apos;accueil
              </Link>
            </div>

            {/* Informations supplémentaires */}
            <div className="mt-12 pt-8 border-t text-left space-y-4">
              <h2 className="text-xl font-bold mb-4">Prochaines étapes</h2>

              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-8 h-8 bg-primary text-white rounded-full flex items-center justify-center font-bold">
                  1
                </div>
                <div>
                  <h3 className="font-bold mb-1">Confirmation</h3>
                  <p className="text-gray-600 text-sm">
                    Vous recevrez un email de confirmation avec le récapitulatif de votre commande.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-8 h-8 bg-primary text-white rounded-full flex items-center justify-center font-bold">
                  2
                </div>
                <div>
                  <h3 className="font-bold mb-1">Préparation</h3>
                  <p className="text-gray-600 text-sm">
                    Votre commande sera préparée avec soin dans les 24-48 heures.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-8 h-8 bg-primary text-white rounded-full flex items-center justify-center font-bold">
                  3
                </div>
                <div>
                  <h3 className="font-bold mb-1">Expédition</h3>
                  <p className="text-gray-600 text-sm">
                    Vous recevrez un email avec le numéro de suivi dès l&apos;expédition.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-8 h-8 bg-primary text-white rounded-full flex items-center justify-center font-bold">
                  4
                </div>
                <div>
                  <h3 className="font-bold mb-1">Livraison</h3>
                  <p className="text-gray-600 text-sm">
                    Réception de votre commande sous 2-5 jours ouvrés.
                  </p>
                </div>
              </div>
            </div>

            {/* Contact */}
            <div className="mt-8 pt-8 border-t">
              <p className="text-gray-600 text-sm">
                Des questions ? Contactez-nous à{' '}
                <a
                  href="mailto:tritoncavaillon@gmail.com"
                  className="text-primary hover:underline"
                >
                  tritoncavaillon@gmail.com
                </a>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
