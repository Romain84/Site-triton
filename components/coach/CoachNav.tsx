'use client'

import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import { useState, useEffect } from 'react'
import {
  CalendarDays,
  Repeat,
  Receipt,
  User,
  LogOut,
  FileText,
} from 'lucide-react'

export default function CoachNav() {
  const pathname = usePathname()
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [availableShiftsCount, setAvailableShiftsCount] = useState(0)

  useEffect(() => {
    fetch('/api/coach/planning-tournant')
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data?.evenements) {
          const count = data.evenements.filter((e: { coachId: string | null }) => !e.coachId).length
          setAvailableShiftsCount(count)
        }
      })
      .catch(() => {})
  }, [])

  const navItems = [
    {
      href: '/coach/dashboard',
      label: 'Planning & Agenda',
      shortLabel: 'Planning',
      icon: CalendarDays,
      active: pathname === '/coach/dashboard' || pathname === '/coach',
    },
    {
      href: '/coach/planning-tournant',
      label: 'Créneaux & Remplacements',
      shortLabel: 'Créneaux',
      icon: Repeat,
      active: pathname.startsWith('/coach/planning-tournant'),
      badge: availableShiftsCount > 0 ? availableShiftsCount : undefined,
    },
    {
      href: '/coach/facturation',
      label: 'Facturation & PDF',
      shortLabel: 'Facturation',
      icon: Receipt,
      active: pathname.startsWith('/coach/facturation'),
    },
    {
      href: '/coach/profil',
      label: 'Mon Profil',
      shortLabel: 'Profil',
      icon: User,
      active: pathname.startsWith('/coach/profil'),
    },
  ]

  const handleLogout = async () => {
    setLoading(true)
    try {
      await fetch('/api/auth/coach/logout', { method: 'POST' })
      router.push('/')
      router.refresh()
    } catch (error) {
      console.error('Erreur lors de la déconnexion:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <nav className="mb-6" aria-label="Navigation Espace Coach">
      {/* DESKTOP & TABLET TOP BAR */}
      <div className="hidden sm:flex items-center justify-between gap-3 bg-white/95 backdrop-blur-md border border-slate-200/80 p-2 rounded-2xl shadow-xs">
        <div className="flex items-center gap-1.5 overflow-x-auto py-0.5">
          {navItems.map((item) => {
            const Icon = item.icon
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`relative flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-extrabold transition-all duration-200 ${
                  item.active
                    ? 'bg-slate-950 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-950 hover:bg-slate-100/80'
                }`}
              >
                <Icon className={`w-4 h-4 shrink-0 ${item.active ? 'text-cyan-400' : 'text-slate-400'}`} />
                <span>{item.label}</span>
                {item.badge !== undefined && item.badge > 0 && (
                  <span className="ml-1 px-1.5 py-0.5 text-[10px] font-black bg-emerald-500 text-white rounded-full leading-none animate-pulse">
                    {item.badge}
                  </span>
                )}
              </Link>
            )
          })}
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <a
            href="/api/guide-coach"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200/80 rounded-xl transition-all shadow-2xs"
            title="Consulter le Guide d'utilisation Espace Coach (PDF)"
          >
            <FileText className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="hidden md:inline">Guide Coach (PDF)</span>
          </a>

          <button
            onClick={handleLogout}
            disabled={loading}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all disabled:opacity-50"
            title="Se déconnecter"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden md:inline">{loading ? 'Sortie...' : 'Déconnexion'}</span>
          </button>
        </div>
      </div>

      {/* MOBILE TOP BAR */}
      <div className="sm:hidden flex items-center justify-between bg-white border border-slate-200/80 p-3 rounded-2xl shadow-xs mb-2">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-slate-950 text-cyan-400 flex items-center justify-center font-black text-xs shadow-xs">
            TC
          </div>
          <div>
            <p className="text-xs font-black text-slate-900 leading-tight">Espace Coach</p>
            <p className="text-[10px] font-semibold text-slate-400">Triton Club Cavaillon</p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <a
            href="/api/guide-coach"
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 text-emerald-700 hover:bg-emerald-50 rounded-xl transition-colors"
            title="Guide Coach (PDF)"
          >
            <FileText className="w-4 h-4" />
          </a>
          <button
            onClick={handleLogout}
            disabled={loading}
            className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors"
            aria-label="Déconnexion"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* MOBILE BOTTOM NAVIGATION */}
      <div className="sm:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-t border-slate-200 px-3 py-2 shadow-lg safe-area-bottom">
        <div className="grid grid-cols-4 gap-1 max-w-md mx-auto">
          {navItems.map((item) => {
            const Icon = item.icon
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`relative flex flex-col items-center justify-center py-1.5 px-1 rounded-xl text-[10px] font-bold transition-colors ${
                  item.active
                    ? 'text-slate-950 font-black'
                    : 'text-slate-400 hover:text-slate-700'
                }`}
              >
                <div className={`relative p-1.5 rounded-lg mb-0.5 ${item.active ? 'bg-slate-950 text-cyan-400' : 'text-slate-500'}`}>
                  <Icon className="w-4 h-4" />
                  {item.badge !== undefined && item.badge > 0 && (
                    <span className="absolute -top-1 -right-1 w-3.5 h-3.5 text-[9px] font-black bg-emerald-500 text-white rounded-full flex items-center justify-center">
                      {item.badge}
                    </span>
                  )}
                </div>
                <span className="truncate max-w-[70px]">{item.shortLabel}</span>
              </Link>
            )
          })}
        </div>
      </div>
    </nav>
  )
}
