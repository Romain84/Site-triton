'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { usePublicSettings } from '@/context/PublicSettingsContext'

export default function Footer() {
  const pathname = usePathname()
  const currentYear = new Date().getFullYear()
  const { settings } = usePublicSettings()
  const logoUrl = settings.logoUrl

  // Cacher le footer sur les espaces admin et coach
  if (pathname.startsWith('/admin') || pathname.startsWith('/coach')) {
    return null
  }

  return (
    <footer className="bg-slate-950 text-slate-300 border-t border-slate-900/60 py-5">
      <div className="container mx-auto px-6 max-w-6xl flex flex-col md:flex-row items-center justify-between gap-4 text-[11px] font-bold uppercase tracking-wider">
        
        {/* Left: Brand, Copyright & Legal Links */}
        <div className="flex flex-wrap items-center justify-center md:justify-start gap-x-3 gap-y-1.5">
          <div className="flex items-center gap-2 mr-2">
            {logoUrl && (
              <div className="relative w-5 h-5 rounded-md overflow-hidden bg-white/5 border border-white/10">
                <Image 
                  src={logoUrl} 
                  alt="Logo Triton Club Cavaillon" 
                  fill 
                  className="object-cover" 
                  unoptimized={logoUrl.includes('blob.vercel-storage.com')} 
                />
              </div>
            )}
            <span className="text-white font-black tracking-tight">Triton Club</span>
          </div>
          <span className="text-slate-700 hidden md:inline">•</span>
          <span className="text-slate-400 normal-case">© {currentYear} Cavaillon.</span>
          <span className="text-slate-700">•</span>
          <Link href="/mentions-legales" className="text-slate-300 hover:text-white transition-colors">Mentions</Link>
          <span className="text-slate-700">•</span>
          <Link href="/politique-confidentialite" className="text-slate-300 hover:text-white transition-colors">Confidentialité</Link>
        </div>

        {/* Right: Contact Email & Socials */}
        <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1.5 text-slate-400">
          <a 
            href="mailto:tritoncavaillon@gmail.com" 
            aria-label="Envoyer un email au club"
            className="hover:text-white transition-colors lowercase tracking-normal text-slate-300"
          >
            tritoncavaillon@gmail.com
          </a>
          <span className="text-slate-700">•</span>
          <a 
            href="https://www.facebook.com/Triton.C.Cavaillon" 
            target="_blank" 
            rel="noopener noreferrer" 
            aria-label="Page Facebook officielle du Triton Club Cavaillon"
            className="text-slate-300 hover:text-white transition-colors" 
          >
            Facebook
          </a>
          <span className="text-slate-700">/</span>
          <a 
            href="https://www.instagram.com/tritoncavaillon" 
            target="_blank" 
            rel="noopener noreferrer" 
            aria-label="Profil Instagram officiel du Triton Club Cavaillon"
            className="text-slate-300 hover:text-white transition-colors" 
          >
            Instagram
          </a>
        </div>

      </div>
    </footer>
  )
}
