'use client'

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'

type PublicSettings = {
  logoUrl: string | null
  inscriptionUrl: string | null
  boutiqueOuverte: boolean
  interSaisonActif: boolean
  texteFiligrane: string
}

type PublicSettingsContextValue = {
  settings: PublicSettings
  loading: boolean
}

const defaultSettings: PublicSettings = {
  logoUrl: null,
  inscriptionUrl: null,
  boutiqueOuverte: true,
  interSaisonActif: false,
  texteFiligrane: 'Saison 2025 - 2026',
}

const PublicSettingsContext = createContext<PublicSettingsContextValue>({
  settings: defaultSettings,
  loading: true,
})

export function PublicSettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<PublicSettings>(defaultSettings)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    const fetchSettings = async () => {
      try {
        const res = await fetch('/api/settings/public')
        if (!res.ok) return

        const data = await res.json()
        if (!cancelled) {
          setSettings({
            logoUrl: data.logoUrl ?? null,
            inscriptionUrl: data.inscriptionUrl ?? null,
            boutiqueOuverte: data.boutiqueOuverte ?? true,
            interSaisonActif: data.interSaisonActif ?? false,
            texteFiligrane: data.texteFiligrane || 'Saison 2025 - 2026',
          })
        }
      } catch {
        // Échec silencieux pour la vitrine
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    fetchSettings()

    return () => {
      cancelled = true
    }
  }, [])

  const value = useMemo(() => ({ settings, loading }), [settings, loading])

  return (
    <PublicSettingsContext.Provider value={value}>
      {children}
    </PublicSettingsContext.Provider>
  )
}

export function usePublicSettings() {
  return useContext(PublicSettingsContext)
}
