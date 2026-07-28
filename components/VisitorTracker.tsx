'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'

export default function VisitorTracker() {
  const pathname = usePathname()

  useEffect(() => {
    // Ne pas enregistrer les pages d'administration internes
    if (!pathname || pathname.startsWith('/admin') || pathname.startsWith('/api')) return

    // Envoyer la visite au serveur
    fetch('/api/analytics/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ page: pathname }),
    }).catch((err) => {
      console.warn('Analytics track notice:', err)
    })
  }, [pathname])

  return null
}
