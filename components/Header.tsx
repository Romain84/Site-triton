'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import CartIcon from '@/components/cart/CartIcon'
import { usePublicSettings } from '@/context/PublicSettingsContext'

function WaveIcon({ flip = false }: { flip?: boolean }) {
  return (
    <svg width="48" height="32" viewBox="0 0 48 32" fill="none" className={`text-primary ${flip ? 'scale-x-[-1]' : ''}`}>
      <path d="M2 20C6 12 12 8 18 12C24 16 30 20 36 16C42 12 46 16 46 16" stroke="currentColor" strokeWidth="3" strokeLinecap="round" fill="none" />
      <path d="M2 26C6 18 12 14 18 18C24 22 30 26 36 22C42 18 46 22 46 22" stroke="currentColor" strokeWidth="3" strokeLinecap="round" fill="none" />
    </svg>
  )
}

export default function Header() {
  const [isScrolled, setIsScrolled] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [logoError, setLogoError] = useState(false)
  const pathname = usePathname()
  const { settings } = usePublicSettings()
  const logoUrl = settings.logoUrl

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 50)
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  if (pathname.startsWith('/admin') || pathname.startsWith('/coach')) {
    return null
  }

  const navLinks = [
    { href: '/', label: 'Accueil' },
    { href: '/le-club', label: 'Le Club' },
    { href: '/actualites', label: 'Actualités' },
    { href: '/planning', label: 'Planning' },
    { href: '/calendrier', label: 'Événements' },
    { href: '/groupes', label: 'Groupes' },
    { href: '/galerie', label: 'Galerie' },
    { href: '/contact', label: 'Contact' },
  ]

  const showCart = pathname.startsWith('/boutique') || pathname.startsWith('/panier') || pathname.startsWith('/checkout') || pathname.startsWith('/commande')

  return (
    <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-200 ${isScrolled ? 'bg-white border-b border-slate-200/60 shadow-xs' : 'bg-white border-b border-transparent'}`}>
      <div className="border-b border-slate-100/80">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between py-2 min-h-[64px] md:min-h-0 relative">
            <div className="md:static absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 md:translate-x-0 md:translate-y-0 transform">
              <Link href="/" className="flex items-center gap-3 transition-transform duration-200 active:scale-[0.99]">
                {logoUrl && !logoError ? (
                  <div className="relative h-14 w-auto">
                    <Image src={logoUrl} alt="Triton Club Cavaillon" width={180} height={56} className="h-14 w-auto object-contain" onError={() => setLogoError(true)} unoptimized={logoUrl.includes('blob.vercel-storage.com')} />
                  </div>
                ) : (
                  <>
                    <WaveIcon />
                    <div className="text-center">
                      <h1 className="text-2xl font-black text-slate-900 tracking-tight">TRITON CLUB</h1>
                      <p className="text-[10px] text-slate-400 font-bold tracking-[0.25em] uppercase">Cavaillon</p>
                    </div>
                    <WaveIcon flip />
                  </>
                )}
              </Link>
            </div>

            <div className="hidden md:flex items-center gap-2 ml-auto">
              <Link href="/boutique" className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg transition-all">Boutique</Link>
              <Link href="/inscription" className="px-4 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-xs transition-all">Inscriptions 2026-2027</Link>
              <a href="https://tritonapp.fr" target="_blank" rel="noopener noreferrer" className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg transition-all">Performance</a>
              <span className="w-px h-4 bg-slate-200 mx-1" />
              <Link href="/coach/login" className="px-3 py-2 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors">Coach</Link>
              <Link href="/admin/login" className="px-3 py-2 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors">Admin</Link>
              {showCart && <CartIcon />}
            </div>

            <div className="md:hidden absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
              {showCart && <CartIcon />}
              <button className="p-2 text-slate-700 hover:bg-slate-50 rounded-lg transition-colors" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} aria-label="Toggle menu" aria-expanded={isMobileMenuOpen} aria-controls="mobile-nav">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  {isMobileMenuOpen ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /> : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />}
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>

      <nav className="hidden md:block bg-transparent">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-center gap-6 py-2">
            {navLinks.map((link) => {
              const isActive = pathname === link.href
              return (
                <Link key={link.href} href={link.href} className={`relative py-1 text-xs font-bold uppercase tracking-wider transition-colors group ${isActive ? 'text-primary' : 'text-slate-400 hover:text-slate-800'}`}>
                  {link.label}
                  <span className={`absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full transition-transform duration-300 origin-left ${isActive ? 'scale-x-100' : 'scale-x-0 group-hover:scale-x-100'}`} />
                </Link>
              )
            })}
          </div>
        </div>
      </nav>

      <div
        id="mobile-nav"
        className={`md:hidden bg-white border-t border-slate-100 shadow-lg rounded-b-xl transition-all duration-300 ease-in-out ${
          isMobileMenuOpen
            ? 'max-h-[calc(100vh-80px)] opacity-100 border-b border-slate-100 overflow-y-auto'
            : 'max-h-0 opacity-0 pointer-events-none overflow-hidden'
        }`}
      >
        <div className="container mx-auto px-4 py-4 space-y-1">
          {navLinks.map((link) => (
            <Link key={link.href} href={link.href} className={`block py-2.5 px-3 rounded-lg text-sm font-semibold transition-colors ${pathname === link.href ? 'bg-slate-50 text-primary' : 'text-slate-700 hover:bg-slate-50'}`} onClick={() => setIsMobileMenuOpen(false)}>
              {link.label}
            </Link>
          ))}
          <hr className="my-2 border-slate-100" />
          <div className="grid grid-cols-1 gap-1.5 pt-1">
            <Link href="/inscription" className="block py-2.5 px-3 text-center rounded-lg bg-slate-900 text-white font-bold text-xs" onClick={() => setIsMobileMenuOpen(false)}>Accéder à MonClub.fr</Link>
            <div className="grid grid-cols-2 gap-2">
              <Link href="/boutique" className="block py-2.5 px-3 text-center rounded-lg bg-white border border-slate-200 text-slate-700 font-bold text-xs" onClick={() => setIsMobileMenuOpen(false)}>Boutique</Link>
              <a href="https://tritonapp.fr" target="_blank" rel="noopener noreferrer" className="block py-2.5 px-3 text-center rounded-lg bg-white border border-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-50 transition-all" onClick={() => setIsMobileMenuOpen(false)}>Performance</a>
            </div>
            <hr className="my-1.5 border-slate-100" />
            <div className="grid grid-cols-2 gap-2">
              <Link href="/coach/login" className="block py-2 px-3 text-center rounded-lg bg-slate-50 border border-slate-150 text-slate-500 font-semibold text-xs hover:bg-slate-100" onClick={() => setIsMobileMenuOpen(false)}>Coach</Link>
              <Link href="/admin/login" className="block py-2 px-3 text-center rounded-lg bg-slate-50 border border-slate-150 text-slate-500 font-semibold text-xs hover:bg-slate-100" onClick={() => setIsMobileMenuOpen(false)}>Admin</Link>
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}
