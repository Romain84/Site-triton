'use client'

import React, { useState, useEffect } from 'react'

export interface NavItem {
  id: string
  label: string
  emoji?: string
}

interface InscriptionStickyNavProps {
  items: NavItem[]
  inscriptionUrl?: string
}

export default function InscriptionStickyNav({ items, inscriptionUrl = 'https://monclub.fr' }: InscriptionStickyNavProps) {
  const [activeId, setActiveId] = useState<string>(items[0]?.id || '')

  useEffect(() => {
    if (typeof window === 'undefined') return

    const handleScroll = () => {
      const scrollPosition = window.scrollY + 200

      for (let i = items.length - 1; i >= 0; i--) {
        const item = items[i]
        const element = document.getElementById(item.id)
        if (element) {
          const top = element.offsetTop
          if (scrollPosition >= top) {
            setActiveId(item.id)
            break
          }
        }
      }
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    handleScroll()
    return () => window.removeEventListener('scroll', handleScroll)
  }, [items])

  const scrollToSection = (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    e.preventDefault()
    const element = document.getElementById(id)
    if (element) {
      const offset = 140
      const bodyRect = document.body.getBoundingClientRect().top
      const elementRect = element.getBoundingClientRect().top
      const elementPosition = elementRect - bodyRect
      const offsetPosition = elementPosition - offset

      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      })
      setActiveId(id)
    }
  }

  if (items.length === 0) return null

  return (
    <div className="sticky top-20 md:top-24 z-30 -mx-4 px-4 sm:mx-0 sm:px-0 mb-8 transition-all">
      <div className="bg-white/95 backdrop-blur-md border border-slate-200/90 shadow-sm rounded-2xl p-2 md:p-2.5 max-w-5xl mx-auto flex items-center justify-between gap-3">
        {/* Navigation scrollable horizontalement sur mobile */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar scroll-smooth py-0.5 px-1 flex-1">
          {items.map((item) => {
            const isActive = activeId === item.id
            return (
              <a
                key={item.id}
                href={`#${item.id}`}
                onClick={(e) => scrollToSection(e, item.id)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 shrink-0 select-none cursor-pointer ${
                  isActive
                    ? 'bg-slate-900 text-white shadow-xs scale-[1.02]'
                    : 'text-slate-600 hover:text-slate-950 hover:bg-slate-100/80 bg-slate-50/70 border border-slate-200/60'
                }`}
              >
                {item.emoji && <span className="text-xs">{item.emoji}</span>}
                <span>{item.label}</span>
              </a>
            )
          })}
        </div>

        {/* Bouton d'action direct vers l'inscription */}
        <div className="shrink-0 pl-2 border-l border-slate-200/80 hidden sm:block">
          <a
            href={inscriptionUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-1.5 bg-primary hover:bg-primary-dark text-slate-950 font-black text-xs rounded-xl shadow-xs transition-all flex items-center gap-1.5 whitespace-nowrap"
          >
            <span>S&apos;inscrire</span>
            <span className="text-[10px]">↗</span>
          </a>
        </div>
      </div>
    </div>
  )
}
