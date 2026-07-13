'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [loading, setLoading] = useState(true)

  const checkAuth = useCallback(async () => {
    try {
      const response = await fetch('/api/auth/admin/me')
      if (response.status === 401) {
        router.push('/admin/login')
        return
      }
      setLoading(false)
    } catch {
      router.push('/admin/login')
    }
  }, [router])

  useEffect(() => {
    const timer = setTimeout(() => {
      void checkAuth()
    }, 0)

    return () => clearTimeout(timer)
  }, [checkAuth])

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/admin/logout', { method: 'POST' })
      router.push('/')
      router.refresh()
    } catch (error) {
      console.error('Erreur lors de la déconnexion:', error)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-600">Chargement...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h1 className="text-2xl font-bold text-gray-900">
                Administration - Triton Club Cavaillon
              </h1>
              <nav className="flex gap-4">
                <Link
                  href="/admin"
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                    pathname === '/admin'
                      ? 'bg-primary text-white'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <span>📊</span>
                  <span>Général</span>
                </Link>
                <Link
                  href="/admin/boutique"
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                    pathname === '/admin/boutique'
                      ? 'bg-primary text-white'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <span>🛍️</span>
                  <span>Boutique</span>
                </Link>
              </nav>
            </div>
            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
            >
              Déconnexion
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 py-8">{children}</div>
    </div>
  )
}
