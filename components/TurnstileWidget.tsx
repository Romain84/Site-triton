'use client'

import { useEffect, useRef } from 'react'

interface TurnstileWidgetProps {
  onVerify: (token: string) => void
  onExpire?: () => void
  onError?: () => void
}

declare global {
  interface Window {
    turnstile?: {
      render: (
        container: string | HTMLElement,
        options: {
          sitekey: string
          callback: (token: string) => void
          'expired-callback'?: () => void
          'error-callback'?: () => void
          theme?: 'light' | 'dark' | 'auto'
        }
      ) => string
      reset: (widgetId?: string) => void
      remove: (widgetId?: string) => void
    }
    onloadTurnstileCallback?: () => void
  }
}

export default function TurnstileWidget({ onVerify, onExpire, onError }: TurnstileWidgetProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const widgetIdRef = useRef<string | null>(null)

  // Clé publique Turnstile : utilise la variable d'env ou la clé de test officielle Cloudflare
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || '1x00000000000000000000AA'

  useEffect(() => {
    let isMounted = true

    const renderWidget = () => {
      if (!containerRef.current || !window.turnstile || widgetIdRef.current) return

      try {
        widgetIdRef.current = window.turnstile.render(containerRef.current, {
          sitekey: siteKey,
          callback: (token: string) => {
            if (isMounted) onVerify(token)
          },
          'expired-callback': () => {
            if (isMounted && onExpire) onExpire()
          },
          'error-callback': () => {
            if (isMounted && onError) onError()
          },
          theme: 'light',
        })
      } catch (err) {
        console.error('Erreur lors de l\'initialisation de Turnstile:', err)
      }
    }

    // Charger le script Turnstile de Cloudflare s'il n'est pas encore présent
    if (window.turnstile) {
      renderWidget()
    } else {
      const existingScript = document.getElementById('cloudflare-turnstile-script')
      if (!existingScript) {
        const script = document.createElement('script')
        script.id = 'cloudflare-turnstile-script'
        script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'
        script.async = true
        script.defer = true
        script.onload = () => {
          if (isMounted) renderWidget()
        }
        document.head.appendChild(script)
      } else {
        existingScript.addEventListener('load', renderWidget)
      }
    }

    return () => {
      isMounted = false
      if (widgetIdRef.current && window.turnstile) {
        try {
          window.turnstile.remove(widgetIdRef.current)
        } catch {}
        widgetIdRef.current = null
      }
    }
  }, [siteKey, onVerify, onExpire, onError])

  return (
    <div className="flex justify-center my-3 min-h-[65px]">
      <div ref={containerRef} />
    </div>
  )
}
