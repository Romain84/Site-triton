'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'

export default function VisitorTracker() {
  const pathname = usePathname()

  useEffect(() => {
    if (!pathname) return
    if (pathname.startsWith('/admin') || pathname.startsWith('/api')) return

    try {
      const endpoint = '/api/analytics/track'
      const payload = JSON.stringify({ page: pathname })

      // Tentative POST avec fetch keepalive
      fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: payload,
        keepalive: true,
      }).catch(() => {
        // Fallback Beacon pour navigateurs mobiles restreints (Safari / Chrome Mobile)
        if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
          navigator.sendBeacon(endpoint, payload)
        }
      })
    } catch {
      // Erreur silencieuse
    }
  }, [pathname])

  return null
}
