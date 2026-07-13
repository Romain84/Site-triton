'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { logger } from '@/lib/logger'

interface Categorie {
  id: string
  nom: string
  slug: string
  image?: string
  _count?: {
    produits: number
  }
}

interface Produit {
  id: string
  nom: string
  slug: string
  descriptionCourte?: string
  prix: number
  prixPromo?: number
  enPromo: boolean
  stock: number
  gererStock: boolean
  stockIllimite: boolean
  image?: string
  enVedette: boolean
  categorie?: {
    nom: string
    slug: string
  }
}

export default function BoutiquePage() {
  const [produits, setProduits] = useState<Produit[]>([])
  const [categories, setCategories] = useState<Categorie[]>([])
  const [selectedCategorie, setSelectedCategorie] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const loadProduits = useCallback(async () => {
    setLoading(true)
    try {
      const url = selectedCategorie
        ? `/api/boutique/produits?categorie=${selectedCategorie}`
        : '/api/boutique/produits'

      const res = await fetch(url)
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`)
      }
      const contentType = res.headers.get('content-type')
      if (!contentType || !contentType.includes('application/json')) {
        throw new TypeError("La réponse n'est pas au format JSON")
      }
      const data = await res.json()
      setProduits(data.produits || [])
    } catch (error) {
      logger.error('Erreur lors du chargement des produits', error)
      setProduits([])
    } finally {
      setLoading(false)
    }
  }, [selectedCategorie])

  const loadCategories = useCallback(async () => {
    try {
      const catRes = await fetch('/api/boutique/categories')
      if (!catRes.ok) {
        throw new Error(`HTTP error! status: ${catRes.status}`)
      }
      const contentType = catRes.headers.get('content-type')
      if (!contentType || !contentType.includes('application/json')) {
        throw new TypeError("La réponse n'est pas au format JSON")
      }
      const catData = await catRes.json()
      setCategories(catData.categories || [])
    } catch (error) {
      logger.error('Erreur lors du chargement des catégories', error)
      setCategories([])
    }
  }, [])

  useEffect(() => {
    loadCategories()
  }, [loadCategories])

  useEffect(() => {
    loadProduits()
  }, [loadProduits])

  const getPrix = (produit: Produit) => {
    if (produit.enPromo && produit.prixPromo) {
      return produit.prixPromo
    }
    return produit.prix
  }

  const estDisponible = (produit: Produit) => {
    if (produit.stockIllimite) return true
    if (!produit.gererStock) return true
    return produit.stock > 0
  }

  return (
    <div className="min-h-screen pt-40 pb-20 bg-gray-50">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold mb-4">Boutique</h1>
          <p className="text-gray-600 text-lg">
            Découvrez tous nos produits du club
          </p>
        </div>

        {/* Filtres par catégorie */}
        {categories.length > 0 && (
          <div className="mb-8">
            <div className="flex flex-wrap justify-center gap-4">
              <button
                onClick={() => setSelectedCategorie(null)}
                className={`px-6 py-2 rounded-full font-medium transition-all ${
                  selectedCategorie === null
                    ? 'bg-primary text-white shadow-lg'
                    : 'bg-white text-gray-700 hover:bg-gray-100'
                }`}
              >
                Tous les produits ({produits.length})
              </button>
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategorie(cat.slug)}
                  className={`px-6 py-2 rounded-full font-medium transition-all ${
                    selectedCategorie === cat.slug
                      ? 'bg-primary text-white shadow-lg'
                      : 'bg-white text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  {cat.nom} ({cat._count?.produits || 0})
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Liste des produits */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="bg-white border border-slate-200/60 rounded-2xl overflow-hidden p-0 shadow-xs">
                <div className="h-64 bg-slate-200/40 animate-pulse relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full animate-shimmer" style={{ animationDuration: '1.5s', backgroundImage: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.4) 50%, transparent 100%)' }} />
                </div>
                <div className="p-6 space-y-4">
                  <div className="h-3 w-1/4 bg-primary/10 rounded-full animate-pulse" />
                  <div className="h-5 w-3/4 bg-slate-200/80 rounded animate-pulse" />
                  <div className="space-y-2">
                    <div className="h-3 w-full bg-slate-200/50 rounded animate-pulse" />
                    <div className="h-3 w-5/6 bg-slate-200/50 rounded animate-pulse" />
                  </div>
                  <div className="h-6 w-1/3 bg-slate-200/80 rounded animate-pulse" />
                  <div className="h-10 w-full bg-slate-200/60 rounded-xl animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        ) : produits.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-gray-600 text-lg">
              Aucun produit disponible pour le moment.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
            {produits.map((produit) => (
              <div
                key={produit.id}
                className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-xs hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group"
              >
                {/* Image */}
                <div className="relative h-64 bg-gray-100 overflow-hidden">
                  {produit.image ? (
                    <Image
                      src={produit.image}
                      alt={produit.nom}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-300"
                      unoptimized={produit.image.includes('blob.vercel-storage.com') || produit.image.startsWith('/uploads/')}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400">
                      Pas d&apos;image
                    </div>
                  )}
 
                  {/* Badges */}
                  <div className="absolute top-4 left-4 flex flex-col gap-2">
                    {produit.enVedette && (
                      <span className="bg-primary text-white text-xs px-3 py-1 rounded-full font-semibold shadow-xs">
                        ⭐ Vedette
                      </span>
                    )}
                    {produit.enPromo && (
                      <span className="bg-red-600 text-white text-xs px-3 py-1 rounded-full font-semibold shadow-xs">
                        🔥 Promo
                      </span>
                    )}
                    {!estDisponible(produit) && (
                      <span className="bg-gray-800/95 backdrop-blur-xs text-white text-xs px-3 py-1 rounded-full font-semibold shadow-xs">
                        Rupture
                      </span>
                    )}
                  </div>
                </div>
 
                {/* Contenu */}
                <div className="p-6">
                  {/* Catégorie */}
                  {produit.categorie && (
                    <p className="text-xs text-primary font-bold uppercase tracking-wider mb-2">
                      {produit.categorie.nom}
                    </p>
                  )}
 
                  {/* Nom */}
                  <h3 className="text-lg font-bold text-slate-900 mb-2 line-clamp-2 leading-snug group-hover:text-primary transition-colors">
                    {produit.nom}
                  </h3>
 
                  {/* Description courte */}
                  {produit.descriptionCourte && (
                    <p className="text-gray-500 text-sm mb-4 line-clamp-2 font-light leading-relaxed">
                      {produit.descriptionCourte}
                    </p>
                  )}
 
                  {/* Prix */}
                  <div className="mb-4">
                    {produit.enPromo && produit.prixPromo ? (
                      <div className="flex items-center gap-2">
                        <span className="text-xl font-bold text-red-600">
                          {produit.prixPromo.toFixed(2)} €
                        </span>
                        <span className="text-sm line-through text-gray-400">
                          {produit.prix.toFixed(2)} €
                        </span>
                      </div>
                    ) : (
                      <span className="text-xl font-bold text-slate-900">
                        {produit.prix.toFixed(2)} €
                      </span>
                    )}
                  </div>
 
                  {/* Stock */}
                  {produit.gererStock && !produit.stockIllimite && (
                    <div className="text-xs text-gray-500 mb-5 font-medium">
                      {produit.stock > 10 ? (
                        <span className="text-emerald-600">En stock</span>
                      ) : produit.stock > 0 ? (
                        <span className="text-amber-600">
                          Plus que {produit.stock} en stock !
                        </span>
                      ) : (
                        <span className="text-red-600 font-semibold">Rupture de stock</span>
                      )}
                    </div>
                  )}
 
                  {/* Bouton */}
                  <Link
                    href={`/boutique/${produit.slug}`}
                    className="block w-full bg-slate-950 text-white text-center py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-primary transition-all duration-200 active:scale-[0.98] shadow-2xs hover:shadow-md hover:shadow-primary/10"
                  >
                    Voir le produit
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
