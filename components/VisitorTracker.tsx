'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'

export default function VisitorTracker() {
  const pathname = usePathname()

  useEffect(() => {
    // Éviter le suivi sur les pages admin et login
    if (pathname?.startsWith('/admin')) return

    const sessionKey = `triton_visit_${pathname}`
    const lastTracked = sessionStorage.getItem(sessionKey)

    // Si la page a déjà été comptabilisée dans les 10 dernières minutes, sauter
    if (lastTracked && Date.now() - parseInt(lastTracked, 10) < 10 * 60 * 1000) {
      return
    }

    sessionStorage.setItem(sessionKey, Date.now().toString())

    fetch('/api/analytics/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ page: pathname }),
    }).catch(() => {
      // Ignorer silencieusement les erreurs client
    })
  }, [pathname])

  return null
}
