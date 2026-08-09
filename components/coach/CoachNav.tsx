'use client'

import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import { useState } from 'react'
import {
  LayoutDashboard,
  CalendarSync,
  Repeat,
  Receipt,
  History,
  User,
  LogOut,
  Menu,
  X,
} from 'lucide-react'

function renderIcon(name: string) {
  switch (name) {
    case 'dashboard':
      return <LayoutDashboard className="w-4 h-4 shrink-0" />
    case 'planning-tournant':
      return <CalendarSync className="w-4 h-4 shrink-0" />
    case 'remplacements':
      return <Repeat className="w-4 h-4 shrink-0" />
    case 'facturation':
      return <Receipt className="w-4 h-4 shrink-0" />
    case 'historique':
      return <History className="w-4 h-4 shrink-0" />
    case 'profil':
      return <User className="w-4 h-4 shrink-0" />
    default:
      return null
  }
}

export default function CoachNav() {
  const pathname = usePathname()
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const navItems = [
    { href: '/coach/dashboard', label: 'Tableau de bord', icon: 'dashboard' },
    { href: '/coach/planning-tournant', label: 'Planning tournant', icon: 'planning-tournant' },
    { href: '/coach/remplacements', label: 'Remplacements', icon: 'remplacements' },
    { href: '/coach/facturation', label: 'Facturation', icon: 'facturation' },
    { href: '/coach/historique', label: 'Historique', icon: 'historique' },
    { href: '/coach/profil', label: 'Profil', icon: 'profil' },
  ]

  const handleLogout = async () => {
    setLoading(true)
    try {
      await fetch('/api/auth/coach/logout', {
        method: 'POST',
      })
      router.push('/')
      router.refresh()
    } catch (error) {
      console.error('Erreur lors de la déconnexion:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mb-8">
      {/* Desktop Navigation */}
      <div className="hidden lg:flex items-center justify-between flex-wrap gap-4 bg-white/80 backdrop-blur-md border border-slate-200/60 p-3 rounded-xl shadow-xs">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 lg:pb-0">
          {navItems.map((item) => {
            const isActive = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all duration-200 active:scale-[0.98] ${
                  isActive
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                {renderIcon(item.icon)}
                <span>{item.label}</span>
              </Link>
            )
          })}
        </div>

        <button
          onClick={handleLogout}
          disabled={loading}
          className="flex items-center gap-2 px-5 py-2.5 bg-red-50 hover:bg-red-100 border border-red-100/80 text-red-600 rounded-lg text-xs font-bold uppercase tracking-wider transition-all duration-200 disabled:opacity-50 active:scale-[0.98]"
        >
          <LogOut className="w-4 h-4" />
          {loading ? 'Déconnexion...' : 'Déconnexion'}
        </button>
      </div>

      {/* Mobile Navigation */}
      <div className="lg:hidden">
        <div className="flex items-center justify-between bg-white border border-slate-200/60 p-4 rounded-xl shadow-xs">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Espace Coach</span>
          </div>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 text-slate-700 hover:bg-slate-50 rounded-lg transition-colors border border-slate-200/40"
            aria-label="Menu"
          >
            {mobileMenuOpen ? (
              <X className="w-5 h-5" />
            ) : (
              <Menu className="w-5 h-5" />
            )}
          </button>
        </div>

        {/* Mobile Menu Dropdown with slide-down style */}
        <div className={`overflow-hidden transition-all duration-300 ease-in-out ${mobileMenuOpen ? 'max-h-[350px] opacity-100 mt-2 border border-slate-200/60 rounded-xl shadow-md' : 'max-h-0 opacity-0'}`}>
          <div className="bg-white p-2 space-y-0.5">
            {navItems.map((item) => {
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors ${
                    isActive
                      ? 'bg-slate-900 text-white'
                      : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {renderIcon(item.icon)}
                  <span>{item.label}</span>
                </Link>
              )
            })}
            <button
              onClick={() => {
                setMobileMenuOpen(false)
                handleLogout()
              }}
              disabled={loading}
              className="w-full flex items-center gap-3 px-4 py-3 text-xs font-bold uppercase tracking-wider text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
            >
              <LogOut className="w-4 h-4" />
              <span>{loading ? 'Déconnexion...' : 'Déconnexion'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
