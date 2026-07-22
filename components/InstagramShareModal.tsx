'use client'

import { useState } from 'react'

interface InstagramShareModalProps {
  isOpen: boolean
  onClose: () => void
  article: {
    titre: string
    slug: string
    contenu?: string
    image?: string | null
  }
}

function stripHtml(html: string): string {
  if (typeof window === 'undefined') return html
  const tmp = document.createElement('DIV')
  tmp.innerHTML = html
  return tmp.textContent || tmp.innerText || ''
}

export default function InstagramShareModal({ isOpen, onClose, article }: InstagramShareModalProps) {
  const [copiedText, setCopiedText] = useState(false)

  if (!isOpen) return null

  const domain = process.env.NEXT_PUBLIC_URL || 'https://www.tritoncavaillon.fr'
  const articleUrl = `${domain.replace(/\/$/, '')}/actualites/${article.slug}`
  const rawText = stripHtml(article.contenu || '').slice(0, 300)

  const caption = `🏊‍♂️ ACTUALITÉ TRITON CLUB CAVAILLON

📌 ${article.titre}

${rawText}${rawText.length >= 300 ? '...' : ''}

👉 Lire la suite sur notre site web :
${articleUrl}

#TritonClubCavaillon #Natation #Cavaillon #SportVauclusien #FFN #PiscineCavaillon #ClubDeNatation`

  const handleCopyCaption = async () => {
    try {
      await navigator.clipboard.writeText(caption)
      setCopiedText(true)
      setTimeout(() => setCopiedText(false), 3000)
    } catch {
      // Fallback
    }
  }

  const handleDownloadImage = () => {
    if (!article.image) return
    const link = document.createElement('a')
    link.href = article.image
    link.download = `triton-actu-${article.slug}.jpg`
    link.target = '_blank'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-fade-in">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 md:p-8 space-y-6 shadow-2xl border border-slate-100 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 font-bold text-xl w-8 h-8 rounded-full flex items-center justify-center bg-slate-100 transition-colors"
        >
          ×
        </button>

        <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600 flex items-center justify-center text-white text-2xl shadow-md">
            📸
          </div>
          <div>
            <h3 className="text-xl font-black text-slate-900">Publication Instagram</h3>
            <p className="text-xs text-slate-500 font-medium">Assistant de partage optimisé pour Instagram</p>
          </div>
        </div>

        {/* Etape 1 : Image */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center justify-between">
            <span>Étape 1 : Image de l&apos;article</span>
            {article.image && (
              <button
                onClick={handleDownloadImage}
                className="text-xs text-primary hover:underline font-extrabold flex items-center gap-1 cursor-pointer"
              >
                <span>💾 Télécharger l&apos;image</span>
              </button>
            )}
          </label>

          {article.image ? (
            <div className="relative h-44 w-full rounded-2xl overflow-hidden bg-slate-900 border border-slate-200">
              <img
                src={article.image}
                alt={article.titre}
                className="w-full h-full object-contain"
              />
            </div>
          ) : (
            <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs font-medium">
              ⚠️ Aucun visuel associé à cet article. Vous pouvez choisir une photo sur Instagram lors de la publication.
            </div>
          )}
        </div>

        {/* Etape 2 : Légende */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Étape 2 : Légende + Hashtags pré-formatés
            </label>
            <button
              onClick={handleCopyCaption}
              className={`px-3 py-1 text-xs font-bold rounded-lg transition-colors flex items-center gap-1 cursor-pointer ${
                copiedText
                  ? 'bg-emerald-500 text-white'
                  : 'bg-slate-900 hover:bg-slate-800 text-white'
              }`}
            >
              {copiedText ? '✓ Copié dans le presse-papier !' : '📋 Copier la légende'}
            </button>
          </div>

          <textarea
            readOnly
            value={caption}
            rows={6}
            className="w-full text-xs font-mono p-3 bg-slate-50 border border-slate-200 rounded-2xl text-slate-800 focus:outline-hidden"
          />
        </div>

        {/* Etape 3 : Ouvrir Instagram */}
        <div className="pt-2 flex flex-col sm:flex-row gap-3">
          <a
            href="https://www.instagram.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 text-center py-3 bg-gradient-to-r from-amber-500 via-rose-500 to-purple-600 hover:opacity-95 text-white font-black text-sm rounded-2xl shadow-lg transition-all flex items-center justify-center gap-2"
          >
            <span>📱 Ouvrir Instagram</span>
          </a>
          <button
            onClick={onClose}
            className="px-5 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm rounded-2xl transition-colors cursor-pointer"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  )
}
