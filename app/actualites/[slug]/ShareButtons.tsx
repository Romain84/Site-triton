'use client'

import { useState, useEffect } from 'react'
import InstagramShareModal from '@/components/InstagramShareModal'

interface ShareButtonsProps {
  title: string
  slug?: string
  image?: string | null
}

export default function ShareButtons({ title, slug = '', image }: ShareButtonsProps) {
  const [url, setUrl] = useState('')
  const [copied, setCopied] = useState(false)
  const [showInstagramModal, setShowInstagramModal] = useState(false)

  useEffect(() => {
    setUrl(window.location.href)
  }, [])

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy', err)
    }
  }

  const fbShareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`
  const waShareUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(title + ' : ' + url)}`
  const mailShareUrl = `mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent("Découvrez cet article du Triton Club Cavaillon : " + url)}`

  return (
    <>
      <div className="flex flex-wrap items-center gap-3 py-4 border-y border-gray-100 my-6">
        <span className="text-sm text-gray-500 font-medium mr-2">Partager cet article :</span>

        {/* Instagram */}
        <button
          onClick={() => setShowInstagramModal(true)}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-gradient-to-r from-amber-500 via-rose-500 to-purple-600 hover:opacity-95 text-white text-xs font-semibold shadow-sm transition-all duration-200 hover:scale-[1.02] cursor-pointer"
          title="Partager sur Instagram"
        >
          <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
            <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
          </svg>
          <span>Instagram</span>
        </button>

        {/* Facebook */}
        <a
          href={fbShareUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#1877F2] hover:bg-[#166fe5] text-white text-xs font-semibold shadow-sm transition-all duration-200 hover:scale-[1.02]"
          title="Partager sur Facebook"
        >
          <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
            <path d="M22 12c0-5.52-4.48-10-10-10S2 6.48 2 12c0 4.84 3.44 8.87 8 9.8V15H8v-3h2V9.5C10 7.57 11.57 6 13.5 6H16v3h-2c-.55 0-1 .45-1 1v2h3v3h-3v6.95c4.56-.93 8-4.96 8-9.75z"/>
          </svg>
          <span>Facebook</span>
        </a>

        {/* WhatsApp */}
        <a
          href={waShareUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#25D366] hover:bg-[#20ba5a] text-white text-xs font-semibold shadow-sm transition-all duration-200 hover:scale-[1.02]"
          title="Partager via WhatsApp"
        >
          <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
            <path d="M12.004 2C6.48 2 2 6.48 2 12.004c0 1.907.533 3.69 1.46 5.22L2.05 21.95a.5.5 0 00.612.611l4.747-1.42c1.474.88 3.197 1.38 5.016 1.38 5.522 0 10.003-4.477 10.003-10.004S17.526 2 12.004 2zm5.025 13.917c-.206.582-1.033 1.077-1.63 1.149-.575.07-1.326.114-2.12-.142-.51-.166-1.155-.472-1.928-.806-3.293-1.425-5.424-4.78-5.588-5.003-.165-.224-1.32-1.758-1.32-3.355 0-1.597.825-2.383 1.114-2.693.289-.31.63-.388.841-.388.206 0 .413.003.593.012.186.008.436-.072.68.52.248.602.846 2.062.92 2.208.074.145.123.315.025.511-.098.196-.149.317-.297.49-.149.172-.314.385-.447.516-.149.144-.306.302-.132.602.174.3.774 1.282 1.66 2.071.939.835 1.731 1.092 2.06 1.258.33.165.521.137.712-.08.19-.217.825-.96.1046-1.29.223-.1.442-.047.665.035.223.083 1.41.664 1.65.783.24.12.399.18.457.28.058.1.058.582-.148 1.164z"/>
          </svg>
          <span>WhatsApp</span>
        </a>

        {/* Email */}
        <a
          href={mailShareUrl}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-gray-600 hover:bg-gray-700 text-white text-xs font-semibold shadow-sm transition-all duration-200 hover:scale-[1.02]"
          title="Partager par Email"
        >
          <svg className="w-4 h-4 fill-none stroke-current stroke-2" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
            <polyline points="22,6 12,13 2,6"/>
          </svg>
          <span>Email</span>
        </a>

        {/* Copier le lien */}
        <button
          onClick={handleCopy}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg border text-xs font-semibold shadow-sm transition-all duration-200 hover:scale-[1.02] ${
            copied
              ? 'bg-green-50 border-green-500 text-green-700 font-bold'
              : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50 hover:border-gray-300'
          }`}
        >
          <svg className="w-4 h-4 fill-none stroke-current stroke-2" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
          </svg>
          <span>{copied ? 'Lien copié !' : 'Copier le lien'}</span>
        </button>
      </div>

      {showInstagramModal && (
        <InstagramShareModal
          isOpen={showInstagramModal}
          onClose={() => setShowInstagramModal(false)}
          article={{ titre: title, slug, image }}
        />
      )}
    </>
  )
}
