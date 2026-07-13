'use client'

import { useEffect, useState, useMemo, useCallback } from 'react'
import Image from 'next/image'

type MediaItem = {
  id: string
  titre: string | null
  description: string | null
  url: string
  type: string
  ordre: number
  updatedAt: string
}

type AlbumItem = {
  id: string
  nom: string
  slug: string
  description: string | null
  categorie: string
  couverture: string | null
  medias: MediaItem[]
}

type LibraryResponse = {
  albums: AlbumItem[]
}

const CATEGORIES = [
  { label: 'Tous', key: 'all' },
  { label: 'Compétitions', key: 'competitions' },
  { label: 'Entraînements', key: 'entrainements' },
  { label: 'Événements', key: 'evenements' }
]

const CATEGORY_LABELS: Record<string, string> = {
  competitions: 'Compétition',
  entrainements: 'Entraînement',
  evenements: 'Événement'
}

export default function GaleriePage() {
  const [albums, setAlbums] = useState<AlbumItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Navigation
  const [selectedAlbumId, setSelectedAlbumId] = useState<string | null>(null)
  const [selectedCategory, setSelectedCategory] = useState('all')

  // Lightbox
  const [selectedMediaIndex, setSelectedMediaIndex] = useState<number | null>(null)

  const loadLibrary = async () => {
    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/media/library')
      if (!res.ok) {
        throw new Error('Impossible de charger la médiathèque')
      }
      const data = (await res.json()) as LibraryResponse
      setAlbums(data.albums || [])
    } catch {
      setAlbums([])
      setError('La galerie est momentanément indisponible.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadLibrary()
  }, [])

  // Trouver l'album sélectionné
  const currentAlbum = useMemo(() => {
    return albums.find((a) => a.id === selectedAlbumId) || null
  }, [albums, selectedAlbumId])

  // Filtrer les albums par catégorie si on n'est pas dans un album
  const filteredAlbums = useMemo(() => {
    if (selectedCategory === 'all') return albums
    return albums.filter((a) => a.categorie === selectedCategory)
  }, [albums, selectedCategory])

  // Medias de l'album en cours pour la lightbox
  const currentMedias = useMemo(() => {
    return currentAlbum?.medias || []
  }, [currentAlbum])

  // Media actuellement affiché dans la lightbox
  const currentLightboxMedia = useMemo(() => {
    if (selectedMediaIndex === null) return null
    return currentMedias[selectedMediaIndex] || null
  }, [currentMedias, selectedMediaIndex])

  // Navigation de la lightbox
  const handlePrevMedia = useCallback((e?: React.MouseEvent) => {
    if (e) e.stopPropagation()
    if (selectedMediaIndex === null || currentMedias.length === 0) return
    setSelectedMediaIndex((prev) => (prev === null || prev === 0 ? currentMedias.length - 1 : prev - 1))
  }, [selectedMediaIndex, currentMedias.length])

  const handleNextMedia = useCallback((e?: React.MouseEvent) => {
    if (e) e.stopPropagation()
    if (selectedMediaIndex === null || currentMedias.length === 0) return
    setSelectedMediaIndex((prev) => (prev === null || prev === currentMedias.length - 1 ? 0 : prev + 1))
  }, [selectedMediaIndex, currentMedias.length])

  // Raccourcis clavier pour la lightbox
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (selectedMediaIndex === null) return
      
      if (event.key === 'Escape') {
        setSelectedMediaIndex(null)
      } else if (event.key === 'ArrowLeft') {
        handlePrevMedia()
      } else if (event.key === 'ArrowRight') {
        handleNextMedia()
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [selectedMediaIndex, handlePrevMedia, handleNextMedia])

  return (
    <main className="min-h-screen pt-40 pb-20 bg-gradient-to-br from-gray-50 to-slate-100">
      <div className="container mx-auto px-4 max-w-6xl">
        
        {/* En-tête de la page */}
        <header className="mb-8">
          {selectedAlbumId && currentAlbum ? (
            <div className="space-y-4">
              <button
                onClick={() => setSelectedAlbumId(null)}
                className="inline-flex items-center text-primary hover:underline font-semibold"
              >
                ← Retour aux albums
              </button>
              <nav className="text-sm text-gray-500">
                <span>Galerie</span> / <span className="capitalize">{CATEGORY_LABELS[currentAlbum.categorie] || currentAlbum.categorie}</span> / <span className="text-gray-700 font-medium">{currentAlbum.nom}</span>
              </nav>
              <h1 className="text-4xl font-bold text-gray-800">{currentAlbum.nom}</h1>
              {currentAlbum.description && (
                <p className="text-gray-600 max-w-3xl leading-relaxed">{currentAlbum.description}</p>
              )}
            </div>
          ) : (
            <div className="text-center md:text-left flex flex-col md:flex-row md:items-end justify-between gap-6">
              <div>
                <h1 className="text-5xl font-bold bg-gradient-to-r from-primary to-primary-dark bg-clip-text text-transparent mb-3">
                  Galerie
                </h1>
                <p className="text-gray-600 text-lg">
                  Découvrez les albums photos et vidéos du Triton Club Cavaillon.
                </p>
              </div>
              
              {/* Filtres de catégorie */}
              <div className="flex flex-wrap justify-center md:justify-end gap-2 text-sm">
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat.key}
                    onClick={() => setSelectedCategory(cat.key)}
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
            </div>
          )}
        </header>

        {loading ? (
          /* Squelette de chargement */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="card overflow-hidden animate-pulse bg-white border border-gray-100">
                <div className="h-56 bg-gray-200" />
                <div className="p-5 space-y-3">
                  <div className="h-4 bg-gray-200 rounded w-1/4" />
                  <div className="h-5 bg-gray-200 rounded w-3/4" />
                  <div className="h-3 bg-gray-100 rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="card p-10 text-center bg-white shadow-sm space-y-4">
            <p className="text-gray-700">{error}</p>
            <button
              onClick={loadLibrary}
              className="px-6 py-2.5 rounded-lg bg-primary text-white hover:bg-primary-dark transition-colors shadow-sm"
            >
              Réessayer
            </button>
          </div>
        ) : !selectedAlbumId ? (
          /* Liste des Albums */
          filteredAlbums.length === 0 ? (
            <div className="card p-12 text-center bg-white/80 backdrop-blur shadow-sm">
              <p className="text-gray-500 text-lg">Aucun album disponible dans cette catégorie.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredAlbums.map((album) => {
                const mediaCount = album.medias?.length || 0
                const categoryLabel = CATEGORY_LABELS[album.categorie] || album.categorie
                
                // Image de couverture : soit le champ couverture, soit la première image de l'album
                const coverImage = album.couverture || album.medias?.[0]?.url

                return (
                  <article
                    key={album.id}
                    className="card overflow-hidden bg-white hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group cursor-pointer flex flex-col h-full border border-gray-100"
                    onClick={() => setSelectedAlbumId(album.id)}
                  >
                    <div className="relative h-56 w-full overflow-hidden bg-gray-100">
                      {coverImage ? (
                        <Image
                          src={coverImage}
                          alt={album.nom}
                          fill
                          className="object-cover group-hover:scale-105 transition-transform duration-500"
                          unoptimized={coverImage.includes('blob.vercel-storage.com') || coverImage.startsWith('/uploads/')}
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-primary/20 to-primary/40 flex items-center justify-center text-primary text-5xl">
                          📂
                        </div>
                      )}
                      <span className="absolute top-3 right-3 px-2.5 py-1 rounded-full bg-black/60 backdrop-blur text-white text-xs font-semibold">
                        {mediaCount} {mediaCount > 1 ? 'médias' : 'média'}
                      </span>
                    </div>
                    <div className="p-5 flex flex-col flex-grow">
                      <span className="text-xs text-primary font-bold uppercase tracking-wider mb-2">
                        {categoryLabel}
                      </span>
                      <h3 className="text-xl font-bold text-gray-800 group-hover:text-primary transition-colors line-clamp-2 mb-2">
                        {album.nom}
                      </h3>
                      {album.description && (
                        <p className="text-gray-500 text-sm line-clamp-3 leading-relaxed flex-grow">
                          {album.description}
                        </p>
                      )}
                    </div>
                  </article>
                )
              })}
            </div>
          )
        ) : (
          /* Liste des Médias d'un Album */
          currentMedias.length === 0 ? (
            <div className="card p-12 text-center bg-white/80 backdrop-blur shadow-sm">
              <p className="text-gray-500 text-lg">Cet album ne contient aucun média pour le moment.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {currentMedias.map((media, index) => (
                <button
                  key={media.id}
                  className="relative aspect-square w-full rounded-xl overflow-hidden group bg-gray-100 shadow-sm hover:shadow-lg transition-all duration-300"
                  onClick={() => setSelectedMediaIndex(index)}
                >
                  {media.type === 'image' ? (
                    <Image
                      src={media.url}
                      alt={media.titre || 'Photo'}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-500"
                      unoptimized={media.url.includes('blob.vercel-storage.com') || media.url.startsWith('/uploads/')}
                    />
                  ) : (
                    <div className="relative w-full h-full">
                      {/* Thumbnail fallback pour les vidéos */}
                      <video
                        src={media.url}
                        className="w-full h-full object-cover"
                        muted
                        playsInline
                      />
                      <div className="absolute inset-0 bg-black/30 group-hover:bg-black/45 transition-colors flex items-center justify-center">
                        <div className="w-12 h-12 rounded-full bg-white/90 group-hover:scale-110 transition-transform flex items-center justify-center shadow-md">
                          <span className="text-primary text-xl ml-1">▶</span>
                        </div>
                      </div>
                    </div>
                  )}
                  {media.titre && (
                    <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 to-transparent p-3 text-left opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      <p className="text-white text-xs font-semibold line-clamp-1">{media.titre}</p>
                    </div>
                  )}
                </button>
              ))}
            </div>
          )
        )}
      </div>

      {/* Lightbox Modal */}
      {selectedMediaIndex !== null && currentLightboxMedia && (
        <div
          className="fixed inset-0 z-[60] bg-black/95 flex flex-col"
          onClick={() => setSelectedMediaIndex(null)}
          role="dialog"
          aria-modal="true"
          aria-label="Visionneuse de média"
        >
          {/* Barre supérieure */}
          <div className="w-full h-16 flex items-center justify-between px-6 bg-gradient-to-b from-black/60 to-transparent text-white z-10">
            <span className="text-sm font-medium tracking-wide">
              {currentAlbum?.nom} — {selectedMediaIndex + 1} / {currentMedias.length}
            </span>
            <button
              onClick={() => setSelectedMediaIndex(null)}
              className="text-white hover:text-gray-300 text-3xl font-light w-10 h-10 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors"
              aria-label="Fermer la prévisualisation"
            >
              ✕
            </button>
          </div>

          {/* Corps central (Media + Flèches de navigation) */}
          <div className="flex-grow flex items-center justify-between relative px-4 md:px-16">
            
            {/* Flèche gauche */}
            <button
              onClick={handlePrevMedia}
              className="absolute left-4 md:left-6 z-10 w-12 h-12 md:w-14 md:h-14 rounded-full bg-black/50 hover:bg-black/75 text-white flex items-center justify-center transition-colors border border-white/10 hover:scale-105 transform active:scale-95"
              aria-label="Média précédent"
            >
              <span className="text-2xl">←</span>
            </button>

            {/* Zone du Média */}
            <div 
              className="w-full h-[70vh] flex items-center justify-center relative select-none"
              onClick={(e) => e.stopPropagation()}
            >
              {currentLightboxMedia.type === 'image' ? (
                <Image
                  src={currentLightboxMedia.url}
                  alt={currentLightboxMedia.titre || 'Photo'}
                  fill
                  className="object-contain"
                  unoptimized={currentLightboxMedia.url.includes('blob.vercel-storage.com') || currentLightboxMedia.url.startsWith('/uploads/')}
                />
              ) : (
                <video
                  src={currentLightboxMedia.url}
                  className="max-h-full max-w-full rounded-lg shadow-2xl bg-black"
                  controls
                  autoPlay
                  playsInline
                />
              )}
            </div>

            {/* Flèche droite */}
            <button
              onClick={handleNextMedia}
              className="absolute right-4 md:right-6 z-10 w-12 h-12 md:w-14 md:h-14 rounded-full bg-black/50 hover:bg-black/75 text-white flex items-center justify-center transition-colors border border-white/10 hover:scale-105 transform active:scale-95"
              aria-label="Média suivant"
            >
              <span className="text-2xl">→</span>
            </button>
          </div>

          {/* Barre inférieure (Légendes) */}
          <div 
            className="w-full bg-black/80 px-6 py-5 text-white border-t border-white/5 select-text"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="max-w-4xl mx-auto space-y-1">
              <h4 className="font-bold text-lg text-white">
                {currentLightboxMedia.titre || 'Média sans titre'}
              </h4>
              {currentLightboxMedia.description && (
                <p className="text-gray-400 text-sm">{currentLightboxMedia.description}</p>
              )}
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
