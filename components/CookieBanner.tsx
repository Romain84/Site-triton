'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

export default function CookieBanner() {
  const pathname = usePathname()
  const [showBanner, setShowBanner] = useState(() => {
    if (typeof window === 'undefined') {
      return false
    }

    return !localStorage.getItem('cookieConsent')
  })

  const acceptCookies = () => {
    localStorage.setItem('cookieConsent', 'accepted')
    setShowBanner(false)
  }

  const refuseCookies = () => {
    localStorage.setItem('cookieConsent', 'refused')
    setShowBanner(false)
  }

  // Cacher le cookie banner sur les espaces admin et coach.
  if (pathname.startsWith('/admin') || pathname.startsWith('/coach')) {
    return null
  }

  if (!showBanner) return null

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-gray-900 text-white shadow-2xl animate-slide-up">
      <div className="container mx-auto px-4 py-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex-1">
            <h3 className="font-bold text-lg mb-2">🍪 Gestion des cookies</h3>
            <p className="text-sm text-gray-300">
              Nous utilisons des cookies techniques strictement nécessaires au bon fonctionnement de ce site.
              En continuant votre navigation, vous acceptez leur utilisation.{` `}
              <Link href="/politique-confidentialite" className="text-primary hover:underline">
                En savoir plus
              </Link>
            </p>
          </div>
          <div className="flex gap-3 flex-shrink-0">
            <button
              onClick={refuseCookies}
              className="px-6 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors font-medium"
            >
              Refuser
            </button>
            <button
              onClick={acceptCookies}
              className="px-6 py-2 bg-primary hover:bg-primary-dark rounded-lg transition-colors font-medium"
            >
              Accepter
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
