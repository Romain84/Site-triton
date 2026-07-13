'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { formatLongDateFr } from '@/lib/date'

type Actualite = {
  id: string
  titre: string
  slug: string
  contenu: string
  excerpt: string | null
  image: string | null
  auteur: string | null
  publie: boolean
  datePubli: Date | string
}

interface ActualitesClientProps {
  initialActualites: Actualite[]
}

const CATEGORIES = [
  { label: 'Tous', key: 'all', keywords: [] },
  { label: 'Inscriptions', key: 'inscriptions', keywords: ['inscription', 'dossier', 'fiche', 'cotisation', 'adhér', 'adhesion', 'monclub', 'rentrée'] },
  { label: 'Compétitions', key: 'competitions', keywords: ['compétition', 'chrono', 'championnat', 'bassin', 'meeting', 'performance', 'nageur', 'ffn', 'bnssa'] },
  { label: 'Vie du club', key: 'vie-du-club', keywords: ['bureau', 'fête', 'repas', 'réunion', 'assemblée', 'bénévole', 'club', 'gouvernance', 'président', 'ca', 'administrateur'] },
  { label: 'Infos pratiques', key: 'infos-pratiques', keywords: ['horaire', 'planning', 'tarif', 'séance', 'entraînement', 'cours', 'contact', 'piscine', 'fermeture', 'date', 'test'] }
]

// Fonction utilitaire pour nettoyer les balises Markdown et HTML simples de l'extrait
function cleanTextTeaser(text: string, maxLength = 160): string {
  if (!text) return ''
  const clean = text
    .replace(/<[^>]*>/g, '') // Supprime HTML
    .replace(/[*_`#~[\]()]/g, '') // Supprime la syntaxe markdown simple
    .replace(/\s+/g, ' ') // Nettoie les espaces multiples
    .trim()
  return clean.length > maxLength ? clean.slice(0, maxLength) + '...' : clean
}

export default function ActualitesClient({ initialActualites }: ActualitesClientProps) {
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [visibleCount, setVisibleCount] = useState(6)

  // Filtrage des actualités par mots-clés de catégorie
  const filteredActualites = initialActualites.filter((actu) => {
    if (selectedCategory === 'all') return true
    
    const cat = CATEGORIES.find((c) => c.key === selectedCategory)
    if (!cat) return true

    const searchStr = `${actu.titre} ${actu.excerpt || ''} ${actu.contenu}`.toLowerCase()
    return cat.keywords.some((kw) => searchStr.includes(kw))
  })

  const handleCategoryChange = (key: string) => {
    setSelectedCategory(key)
    setVisibleCount(6) // Réinitialise la pagination
  }

  const handleLoadMore = () => {
    setVisibleCount((prev) => prev + 6)
  }

  // Définir la structure d'affichage
  // Si filtré sur "Tous", on sépare l'actualité à la une. Sinon, tout en grille standard pour la clarté.
  const hasFeatured = selectedCategory === 'all' && filteredActualites.length > 0
  const featured = hasFeatured ? filteredActualites[0] : null
  const gridItems = hasFeatured ? filteredActualites.slice(1) : filteredActualites
  const displayedGridItems = gridItems.slice(0, visibleCount)

  return (
    <div className="container mx-auto px-4">
      <header className="text-center mb-10">
        <h1 className="text-5xl font-bold mb-3 bg-gradient-to-r from-primary to-primary-dark bg-clip-text text-transparent">
          Actualités
        </h1>
        <p className="text-gray-600 text-lg">
          Les dernières informations du Triton Club Cavaillon
        </p>
        
        {/* Catégories de filtrage */}
        <div className="mt-6 flex flex-wrap justify-center gap-2 text-sm">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.key}
              onClick={() => handleCategoryChange(cat.key)}
              className={`px-4 py-2 rounded-full border transition-all duration-300 ${
                selectedCategory === cat.key
                  ? 'bg-primary border-primary text-white shadow-md scale-105'
                  : 'bg-white border-gray-200 text-gray-700 hover:border-primary/50 hover:text-primary'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </header>

      <section className="card p-5 md:p-6 mb-8 bg-white/80 backdrop-blur shadow-sm">
        <p className="text-gray-700 leading-relaxed">
          Retrouvez ici toutes les communications officielles du club : périodes d&apos;inscription,
          calendrier sportif, événements à la piscine municipale de Cavaillon et informations familles.
        </p>
      </section>

      {filteredActualites.length === 0 ? (
        <div className="card p-12 text-center bg-white/80 backdrop-blur shadow-sm">
          <p className="text-gray-500 text-lg">Aucune actualité ne correspond à cette catégorie pour le moment.</p>
        </div>
      ) : (
        <>
          {/* Article à la une (Uniquement si "Tous") */}
          {featured && (
            <Link
              href={`/actualites/${featured.slug}`}
              className="card overflow-hidden grid lg:grid-cols-2 mb-10 bg-white/80 hover:shadow-2xl transition-all duration-300 group"
            >
              <div className="relative min-h-[300px] overflow-hidden">
                {featured.image ? (
                  <Image
                    src={featured.image}
                    alt={featured.titre}
                    fill
                    className="object-cover group-hover:scale-102 transition-transform duration-500"
                    priority
                    unoptimized={featured.image.includes('blob.vercel-storage.com') || featured.image.startsWith('/uploads/')}
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-primary to-primary-dark flex items-center justify-center text-white text-6xl">
                    📰
                  </div>
                )}
              </div>
              <div className="p-8 flex flex-col justify-center">
                <span className="px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold w-max mb-3 uppercase tracking-wider">
                  À la une
                </span>
                <h2 className="text-3xl font-bold mb-3 text-gray-800 group-hover:text-primary transition-colors duration-200">
                  {featured.titre}
                </h2>
                <p className="text-gray-500 text-sm mb-3">
                  {formatLongDateFr(new Date(featured.datePubli))}
                </p>
                <p className="text-gray-600 line-clamp-4 leading-relaxed">
                  {cleanTextTeaser(featured.excerpt || featured.contenu, 220)}
                </p>
                <span className="mt-5 inline-flex items-center text-primary font-semibold group-hover:translate-x-1 transition-transform">
                  Lire l&apos;article <span className="ml-1">→</span>
                </span>
              </div>
            </Link>
          )}

          {/* Grille d'articles */}
          {gridItems.length > 0 && (
            <section className="space-y-6">
              {selectedCategory !== 'all' && (
                <h3 className="text-2xl font-bold mb-5 text-gray-800">Articles correspondants</h3>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {displayedGridItems.map((actu) => (
                  <Link
                    key={actu.id}
                    href={`/actualites/${actu.slug}`}
                    className="card overflow-hidden bg-white/80 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group flex flex-col h-full"
                  >
                    {actu.image ? (
                      <div className="relative h-52 overflow-hidden">
                        <Image
                          src={actu.image}
                          alt={actu.titre}
                          fill
                          className="object-cover group-hover:scale-105 transition-transform duration-300"
                          unoptimized={actu.image.includes('blob.vercel-storage.com') || actu.image.startsWith('/uploads/')}
                        />
                      </div>
                    ) : (
                      <div className="h-52 bg-gradient-to-br from-primary to-primary-dark flex items-center justify-center">
                        <span className="text-white text-5xl">📰</span>
                      </div>
                    )}
                    <div className="p-6 flex flex-col flex-grow">
                      <p className="text-xs text-primary font-semibold mb-2">
                        {formatLongDateFr(new Date(actu.datePubli))}
                      </p>
                      <h4 className="text-xl font-bold mb-3 text-gray-800 group-hover:text-primary transition-colors line-clamp-2">
                        {actu.titre}
                      </h4>
                      <p className="text-gray-600 text-sm line-clamp-3 leading-relaxed flex-grow">
                        {cleanTextTeaser(actu.excerpt || actu.contenu, 140)}
                      </p>
                      <div className="mt-4 pt-4 border-t border-gray-100 flex items-center text-primary text-sm font-semibold">
                        Lire la suite <span className="ml-1 group-hover:translate-x-1 transition-transform">→</span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* Bouton Charger plus */}
          {gridItems.length > visibleCount && (
            <div className="flex justify-center mt-12">
              <button
                onClick={handleLoadMore}
                className="px-6 py-3 bg-white hover:bg-gray-50 border border-gray-200 hover:border-primary/50 text-gray-700 hover:text-primary rounded-lg font-semibold shadow-sm transition-all duration-300"
              >
                Voir plus d&apos;actualités
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
