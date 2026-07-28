'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'

export default function VisitorTracker() {
  const pathname = usePathname()

  useEffect(() => {
    if (!pathname) return
    // Ignorer uniquement les appels API internes
    if (pathname.startsWith('/api')) return

    try {
      fetch('/api/analytics/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ page: pathname }),
        keepalive: true,
      }).catch((e) => {
        console.warn('Track notice:', e)
      })
    } catch {
      // Ignorer silencieusement
    }
  }, [pathname])

  return null
}
