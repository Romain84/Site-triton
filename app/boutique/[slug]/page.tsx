'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { useCart } from '@/context/CartContext'
import { logger } from '@/lib/logger'
import { sanitizeHtml } from '@/lib/sanitize'
import toast from 'react-hot-toast'

interface Variante {
  id: string
  taille?: string
  couleur?: string
  stock: number
  prix?: number
  image?: string
}

interface Produit {
  id: string
  nom: string
  slug: string
  description?: string
  descriptionCourte?: string
  prix: number
  prixPromo?: number
  enPromo: boolean
  stock: number
  gererStock: boolean
  stockIllimite: boolean
  image?: string
  images?: string
  tailles?: string
  couleurs?: string
  categorie?: {
    nom: string
    slug: string
  }
  variantes: Variante[]
  personnalisable: boolean
  prixFlocage: number
}

export default function ProduitDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { addItem, setCartOpen } = useCart()
  const [produit, setProduit] = useState<Produit | null>(null)
  const [loading, setLoading] = useState(true)
  const [boutiqueOuverte, setBoutiqueOuverte] = useState(true)
  const [selectedTaille, setSelectedTaille] = useState<string>('')
  const [selectedCouleur, setSelectedCouleur] = useState<string>('')
  const [textePersonnalise, setTextePersonnalise] = useState('')
  const [textePersonnaliseError, setTextePersonnaliseError] = useState('')
  const [quantite, setQuantite] = useState(1)
  const [addingToCart, setAddingToCart] = useState(false)
  const [activeImageIndex, setActiveImageIndex] = useState(0)

  // Définition des variables dérivées en haut du composant
  const countTailles = useMemo(() => {
    let t = []
    try {
      if (produit?.tailles) t = JSON.parse(produit.tailles)
    } catch {
      // ignore
    }
    if (!Array.isArray(t) || t.length === 0) {
      if (produit?.variantes) {
        t = Array.from(new Set(produit.variantes.map((v) => v.taille).filter(Boolean))) as string[]
      }
    }
    return t
  }, [produit])

  const countCouleurs = useMemo(() => {
    let c = []
    try {
      if (produit?.couleurs) c = JSON.parse(produit.couleurs)
    } catch {
      // ignore
    }
    if (!Array.isArray(c) || c.length === 0) {
      if (produit?.variantes) {
        c = Array.from(new Set(produit.variantes.map((v) => v.couleur).filter(Boolean))) as string[]
      }
    }
    return c
  }, [produit])

  const imagesSupplementaires = produit?.images ? JSON.parse(produit.images) : []
  const allImages = [produit?.image, ...imagesSupplementaires].filter(Boolean) as string[]

  const loadBoutiqueStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/boutique/status')
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`)
      }
      const contentType = res.headers.get('content-type')
      if (!contentType || !contentType.includes('application/json')) {
        throw new TypeError("La réponse n'est pas au format JSON")
      }
      const data = await res.json()
      setBoutiqueOuverte(data.boutiqueOuverte ?? true)
    } catch (error) {
      logger.error('Erreur lors du chargement du statut de la boutique', error)
      setBoutiqueOuverte(true) // Default to open in case of error
    }
  }, [])

  const loadProduit = useCallback(async () => {
    try {
      const res = await fetch(`/api/boutique/produits/${params.slug}`)
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`)
      }
      const contentType = res.headers.get('content-type')
      if (!contentType || !contentType.includes('application/json')) {
        throw new TypeError("La réponse n'est pas au format JSON")
      }
      const data = await res.json()
      setProduit(data.produit)

      let productTailles: string[] = []
      try {
        if (data.produit.tailles) productTailles = JSON.parse(data.produit.tailles)
      } catch {
        // ignore
      }
      if (!Array.isArray(productTailles) || productTailles.length === 0) {
        if (data.produit.variantes) {
          productTailles = Array.from(new Set(data.produit.variantes.map((v: any) => v.taille).filter(Boolean))) as string[]
        }
      }

      let productCouleurs: string[] = []
      try {
        if (data.produit.couleurs) productCouleurs = JSON.parse(data.produit.couleurs)
      } catch {
        // ignore
      }
      if (!Array.isArray(productCouleurs) || productCouleurs.length === 0) {
        if (data.produit.variantes) {
          productCouleurs = Array.from(new Set(data.produit.variantes.map((v: any) => v.couleur).filter(Boolean))) as string[]
        }
      }

      // Sélection intelligente de la première variante disponible en stock
      let defaultTaille = productTailles[0] || ''
      let defaultCouleur = productCouleurs[0] || ''

      if (data.produit.variantes && data.produit.variantes.length > 0) {
        const firstAvailableVariante = data.produit.variantes.find(
          (v: any) => data.produit.stockIllimite || !data.produit.gererStock || v.stock > 0
        )
        if (firstAvailableVariante) {
          defaultTaille = firstAvailableVariante.taille || ''
          defaultCouleur = firstAvailableVariante.couleur || ''
        } else {
          defaultTaille = data.produit.variantes[0].taille || ''
          defaultCouleur = data.produit.variantes[0].couleur || ''
        }
      }

      if (productTailles.length > 0) setSelectedTaille(defaultTaille)
      if (productCouleurs.length > 0) setSelectedCouleur(defaultCouleur)
    } catch (error) {
      logger.error('Erreur lors du chargement', error)
      router.push('/boutique')
    } finally {
      setLoading(false)
    }
  }, [params.slug, router])

  useEffect(() => {
    if (params.slug) {
      loadProduit()
      loadBoutiqueStatus()
    }
  }, [params.slug, loadProduit, loadBoutiqueStatus])

  useEffect(() => {
    setActiveImageIndex(0)
  }, [produit?.id])

  // Alias locaux pour compatibilité avec le reste du code
  const tailles: string[] = countTailles
  const couleurs: string[] = countCouleurs

  const getPrix = () => {
    if (!produit) return 0

    const variante = getVariante()
    let basePrix = produit.prix
    if (variante && variante.prix !== null && variante.prix !== undefined) {
      basePrix = variante.prix
    } else if (produit.enPromo && produit.prixPromo) {
      basePrix = produit.prixPromo
    }

    if (produit.personnalisable && textePersonnalise.trim() !== '') {
      basePrix += produit.prixFlocage || 0
    }

    return basePrix
  }

  const getVariante = (): Variante | undefined => {
    if (!produit) return undefined
    return produit.variantes.find(
      (v) => (v.taille || '') === selectedTaille && (v.couleur || '') === selectedCouleur
    )
  }

  const getStock = () => {
    if (!produit) return 0
    if (produit.stockIllimite) return 999
    if (!produit.gererStock) return 999

    if (produit.variantes && produit.variantes.length > 0) {
      const variante = getVariante()
      return variante ? variante.stock : 0
    }

    return produit.stock
  }

  const estDisponible = () => {
    return getStock() > 0
  }

  const combinaisonExiste = () => {
    if (!produit) return false
    if (!produit.variantes || produit.variantes.length === 0) return true
    return getVariante() !== undefined
  }

  const getVarianteStock = (taille: string, couleur: string) => {
    if (!produit) return 0
    const v = produit.variantes.find(
      (item) => (item.taille || '') === taille && (item.couleur || '') === couleur
    )
    return v ? v.stock : 0
  }

  const isSizeAvailable = (tailleItem: string) => {
    if (!produit) return false
    if (produit.stockIllimite || !produit.gererStock) return true
    if (couleurs.length === 0) {
      const v = produit.variantes.find((item) => (item.taille || '') === tailleItem)
      return v ? v.stock > 0 : false
    }
    if (selectedCouleur) {
      return getVarianteStock(tailleItem, selectedCouleur) > 0
    }
    return produit.variantes.some((item) => (item.taille || '') === tailleItem && item.stock > 0)
  }

  const isColorAvailable = (couleurItem: string) => {
    if (!produit) return false
    if (produit.stockIllimite || !produit.gererStock) return true
    if (tailles.length === 0) {
      const v = produit.variantes.find((item) => (item.couleur || '') === couleurItem)
      return v ? v.stock > 0 : false
    }
    if (selectedTaille) {
      return getVarianteStock(selectedTaille, couleurItem) > 0
    }
    return produit.variantes.some((item) => (item.couleur || '') === couleurItem && item.stock > 0)
  }

  const handleAddToCart = () => {
    if (!produit) return

    if (produit.personnalisable && textePersonnalise.trim() === '') {
      setTextePersonnaliseError('Veuillez renseigner le texte de personnalisation.')
      return
    }

    setAddingToCart(true)

    const variante = getVariante()
    const imageToDisplay = variante?.image || produit.image
    const finalPrice = getPrix()

    addItem(
      {
        produitId: produit.id,
        nom: produit.nom,
        slug: produit.slug,
        prix: finalPrice,
        image: imageToDisplay,
        taille: selectedTaille || undefined,
        couleur: selectedCouleur || undefined,
        varianteId: variante?.id,
        stock: getStock(),
        textePersonnalise: produit.personnalisable ? textePersonnalise.trim() : undefined,
      },
      quantite
    )

    // Déclencher le toast premium
    toast.custom(
      (t) => (
        <div
          className={`${
            t.visible ? 'animate-enter' : 'animate-leave'
          } max-w-md w-full bg-white shadow-xl rounded-2xl pointer-events-auto flex ring-1 ring-black/5 p-4 border border-slate-100 transition-all duration-300`}
        >
          <div className="flex-1 w-0">
            <div className="flex items-start">
              <div className="flex-shrink-0 h-16 w-16 relative rounded-lg overflow-hidden bg-slate-100 border border-slate-100">
                {imageToDisplay ? (
                  <Image
                    src={imageToDisplay}
                    alt={produit.nom}
                    fill
                    className="object-cover"
                    unoptimized={imageToDisplay.includes('blob.vercel-storage.com') || imageToDisplay.startsWith('/uploads/')}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-xs text-gray-400 bg-slate-100">
                    Pas d'image
                  </div>
                )}
              </div>
              <div className="ml-3 flex-1">
                <p className="text-sm font-semibold text-slate-900 leading-snug">
                  Article ajouté au panier !
                </p>
                <p className="mt-0.5 text-xs font-bold text-primary">
                  {produit.nom}
                </p>
                {(selectedTaille || selectedCouleur || textePersonnalise.trim()) && (
                  <p className="mt-1 text-[11px] text-slate-500 leading-tight">
                    {selectedTaille && <span>Taille : {selectedTaille} </span>}
                    {selectedCouleur && <span>Couleur : {selectedCouleur} </span>}
                    {textePersonnalise.trim() && (
                      <span className="block text-purple-600 font-medium truncate max-w-[200px]">
                        ✍️ {textePersonnalise.trim()}
                      </span>
                    )}
                  </p>
                )}
                <p className="mt-1 text-xs text-slate-600 font-bold">
                  {quantite} x {finalPrice.toFixed(2)} €
                </p>
              </div>
            </div>
          </div>
          <div className="ml-4 flex flex-col justify-center gap-2 border-l border-slate-100 pl-4">
            <button
              onClick={() => {
                toast.dismiss(t.id)
                setCartOpen(true)
              }}
              className="px-3 py-1.5 bg-primary text-white text-xs font-bold rounded-lg hover:bg-primary-dark transition-colors active:scale-95 text-center min-w-[90px]"
            >
              Voir le panier
            </button>
            <Link
              href="/checkout"
              onClick={() => toast.dismiss(t.id)}
              className="px-3 py-1.5 bg-slate-900 text-white text-xs font-bold rounded-lg hover:bg-slate-800 transition-colors active:scale-95 text-center min-w-[90px]"
            >
              Commander
            </Link>
          </div>
        </div>
      ),
      { duration: 4000 }
    )

    setTimeout(() => {
      setAddingToCart(false)
      setTextePersonnalise('')
    }, 500)
  }

  if (loading) {
    return (
      <div className="min-h-screen pt-40 pb-20 bg-gray-50">
        <div className="container mx-auto px-4">
          {/* Breadcrumb skeleton */}
          <div className="h-4 w-48 bg-slate-200/60 rounded animate-pulse mb-8" />
 
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            {/* Left: Images skeleton */}
            <div>
              <div className="bg-slate-200/40 border border-slate-200/40 rounded-2xl h-96 mb-4 relative overflow-hidden animate-pulse">
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full animate-shimmer" style={{ animationDuration: '1.5s', backgroundImage: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.4) 50%, transparent 100%)' }} />
              </div>
              <div className="grid grid-cols-4 gap-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="bg-slate-200/30 border border-slate-200/40 rounded-xl h-24 animate-pulse" />
                ))}
              </div>
            </div>
 
            {/* Right: Info skeleton */}
            <div className="space-y-6">
              <div className="h-4 w-24 bg-primary/10 rounded-full animate-pulse" />
              <div className="h-10 w-3/4 bg-slate-200/80 rounded animate-pulse" />
              <div className="h-5 w-5/6 bg-slate-200/50 rounded animate-pulse" />
              <div className="h-8 w-1/3 bg-slate-200/80 rounded animate-pulse" />
              <div className="space-y-3">
                <div className="h-3 w-16 bg-slate-200/60 rounded animate-pulse" />
                <div className="flex gap-2">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="h-10 w-16 bg-slate-200/50 rounded-lg animate-pulse" />
                  ))}
                </div>
              </div>
              <div className="h-12 w-full bg-slate-250 rounded-xl animate-pulse" />
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!produit) {
    return null
  }

  return (
    <div className="min-h-screen pt-40 pb-20 bg-gray-50">
      <div className="container mx-auto px-4">
        {/* Breadcrumb */}
        <div className="mb-8 text-sm text-gray-600">
          <Link href="/boutique" className="hover:text-primary">
            Boutique
          </Link>
          {produit.categorie && (
            <>
              <span className="mx-2">/</span>
              <Link
                href={`/boutique?categorie=${produit.categorie.slug}`}
                className="hover:text-primary"
              >
                {produit.categorie.nom}
              </Link>
            </>
          )}
          <span className="mx-2">/</span>
          <span>{produit.nom}</span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Images */}
          <div>
            <div className="card overflow-hidden mb-4 border border-slate-100 shadow-xs rounded-2xl group">
              <div className="relative h-96 bg-gray-100 overflow-hidden">
                {allImages.length > 0 ? (
                  <Image
                    src={allImages[activeImageIndex]}
                    alt={produit.nom}
                    fill
                    className="object-cover transition-transform duration-500 ease-out group-hover:scale-105"
                    unoptimized={allImages[activeImageIndex].includes('blob.vercel-storage.com') || allImages[activeImageIndex].startsWith('/uploads/')}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400">
                    Pas d&apos;image
                  </div>
                )}
              </div>
            </div>

            {/* Galerie d'images supplémentaires */}
            {allImages.length > 1 && (
              <div className="grid grid-cols-4 gap-4">
                {allImages.map((img: string, index: number) => (
                  <button
                    key={index}
                    onClick={() => setActiveImageIndex(index)}
                    className={`card overflow-hidden cursor-pointer relative h-24 bg-gray-150 border-2 rounded-xl transition-all duration-200 ${
                      activeImageIndex === index
                        ? 'border-primary ring-2 ring-primary/20 scale-[0.98]'
                        : 'border-transparent hover:border-slate-350'
                    }`}
                  >
                    <Image
                      src={img}
                      alt={`${produit.nom} ${index + 1}`}
                      fill
                      className="object-cover"
                      unoptimized={img.includes('blob.vercel-storage.com') || img.startsWith('/uploads/')}
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Informations */}
          <div>
            {produit.categorie && (
              <p className="text-sm text-primary font-medium mb-2">
                {produit.categorie.nom}
              </p>
            )}

            <h1 className="text-4xl font-bold mb-4">{produit.nom}</h1>

            {produit.descriptionCourte && (
              <p className="text-gray-700 text-lg mb-6">{produit.descriptionCourte}</p>
            )}

            {/* Prix */}
            <div className="mb-6">
              {produit.enPromo && produit.prixPromo ? (
                <div className="flex items-center gap-4">
                  <span className="text-4xl font-bold text-red-600">
                    {getPrix().toFixed(2)} €
                  </span>
                  <span className="text-2xl line-through text-gray-500">
                    {produit.prix.toFixed(2)} €
                  </span>
                  <span className="bg-red-600 text-white px-3 py-1 rounded-full text-sm font-medium">
                    -
                    {Math.round(((produit.prix - produit.prixPromo) / produit.prix) * 100)}
                    %
                  </span>
                </div>
              ) : (
                <span className="text-4xl font-bold text-gray-900">
                  {getPrix().toFixed(2)} €
                </span>
              )}
            </div>

            {/* Sélection taille */}
            {tailles.length > 0 && (
              <div className="mb-6">
                <label className="block text-sm font-medium mb-2">
                  Taille : <span className="text-primary">{selectedTaille}</span>
                </label>
                <div className="flex flex-wrap gap-2">
                  {tailles.map((taille: string) => {
                    const available = isSizeAvailable(taille)
                    return (
                      <button
                        key={taille}
                        onClick={() => setSelectedTaille(taille)}
                        className={`px-4 py-2 border-2 rounded-lg font-medium transition-all ${
                          selectedTaille === taille
                            ? 'border-primary bg-primary text-white'
                            : available
                            ? 'border-gray-300 hover:border-primary text-gray-800'
                            : 'border-gray-250 bg-gray-100/50 text-gray-400 line-through cursor-not-allowed opacity-60'
                        }`}
                      >
                        {taille}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Sélection couleur */}
            {couleurs.length > 0 && (
              <div className="mb-6">
                <label className="block text-sm font-medium mb-2">
                  Couleur : <span className="text-primary">{selectedCouleur}</span>
                </label>
                <div className="flex flex-wrap gap-2">
                  {couleurs.map((couleur: string) => {
                    const available = isColorAvailable(couleur)
                    return (
                      <button
                        key={couleur}
                        onClick={() => setSelectedCouleur(couleur)}
                        className={`px-4 py-2 border-2 rounded-lg font-medium transition-all ${
                          selectedCouleur === couleur
                            ? 'border-primary bg-primary text-white'
                            : available
                            ? 'border-gray-300 hover:border-primary text-gray-800'
                            : 'border-gray-250 bg-gray-100/50 text-gray-400 line-through cursor-not-allowed opacity-60'
                        }`}
                      >
                        {couleur}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Stock */}
            <div className="mb-6">
              {!combinaisonExiste() ? (
                <div className="text-red-500 font-semibold flex items-center gap-1.5 text-sm bg-red-50 px-3 py-2 rounded-lg border border-red-100 w-fit animate-pulse">
                  ⚠️ Option non proposée
                </div>
              ) : estDisponible() ? (
                <div className="text-green-600 font-medium">
                  ✓ En stock
                  {!produit.stockIllimite &&
                    produit.gererStock &&
                    getStock() <= 10 &&
                    ` (${getStock()} disponible${getStock() > 1 ? 's' : ''})`}
                </div>
              ) : (
                <div className="text-red-600 font-medium">✗ Rupture de stock</div>
              )}
            </div>

            {/* Personnalisation */}
            {produit.personnalisable && combinaisonExiste() && estDisponible() && (
              <div className="mb-6">
                <label className="block text-sm font-medium mb-2 text-slate-850 flex flex-wrap items-center gap-1.5">
                  <span className="font-semibold text-purple-700">✨ Personnalisation du produit *</span>
                  {produit.prixFlocage > 0 && (
                    <span className="bg-purple-100 text-purple-800 text-[10px] font-extrabold px-2 py-0.5 rounded-full">
                      +{(produit.prixFlocage).toFixed(2)} €
                    </span>
                  )}
                  <span className="text-[11px] font-normal text-slate-400 font-light lowercase">(prénom à floquer, numéro de gilet...)</span>
                </label>
                <input
                  type="text"
                  maxLength={100}
                  value={textePersonnalise}
                  onChange={(e) => {
                    setTextePersonnalise(e.target.value)
                    if (e.target.value.trim() !== '') {
                      setTextePersonnaliseError('')
                    }
                  }}
                  placeholder="Saisissez le texte personnalisé..."
                  className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-primary focus:border-primary transition-all text-sm ${textePersonnaliseError ? 'border-red-500 focus:ring-red-200' : 'border-gray-300'}`}
                />
                {textePersonnaliseError && (
                  <p className="text-red-500 text-xs mt-1.5 font-medium">{textePersonnaliseError}</p>
                )}
              </div>
            )}

            {/* Quantité */}
            {combinaisonExiste() && estDisponible() && (
              <div className="mb-6">
                <label className="block text-sm font-medium mb-2">Quantité</label>
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => setQuantite(Math.max(1, quantite - 1))}
                    className="w-10 h-10 border-2 border-gray-300 rounded-lg hover:border-primary transition-colors flex items-center justify-center font-bold"
                  >
                    −
                  </button>
                  <span className="text-xl font-medium w-12 text-center">{quantite}</span>
                  <button
                    onClick={() =>
                      setQuantite(Math.min(getStock(), quantite + 1))
                    }
                    className="w-10 h-10 border-2 border-gray-300 rounded-lg hover:border-primary transition-colors flex items-center justify-center font-bold"
                  >
                    +
                  </button>
                </div>
              </div>
            )}

            {/* Message boutique fermée */}
            {!boutiqueOuverte && (
              <div className="mb-6 p-4 bg-orange-50 border-l-4 border-orange-500 rounded">
                <p className="text-orange-700 font-medium">
                  🔒 La boutique est actuellement fermée
                </p>
                <p className="text-orange-600 text-sm mt-1">
                  Les commandes ne sont pas acceptées pour le moment. Revenez bientôt !
                </p>
              </div>
            )}

            {/* Boutons d'action */}
            <div className="flex gap-4 mb-8">
              <button
                onClick={handleAddToCart}
                disabled={!combinaisonExiste() || !estDisponible() || addingToCart || !boutiqueOuverte}
                className="flex-1 bg-primary text-white py-4 rounded-lg font-bold hover:bg-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {!boutiqueOuverte
                  ? 'Boutique fermée'
                  : addingToCart
                  ? 'Ajout...'
                  : !combinaisonExiste()
                  ? 'Combinaison indisponible'
                  : !estDisponible()
                  ? 'Rupture de stock'
                  : 'Ajouter au panier'}
              </button>
            </div>

            {/* Description complète */}
            {produit.description && (
              <div className="border-t pt-8">
                <h2 className="text-2xl font-bold mb-4">Description</h2>
                <div
                  className="prose prose-gray max-w-none"
                  dangerouslySetInnerHTML={{ __html: sanitizeHtml(produit.description) }}
                />
              </div>
            )}
          </div>
        </div>

        {/* Retour à la boutique */}
        <div className="mt-12">
          <Link
            href="/boutique"
            className="inline-flex items-center gap-2 text-primary hover:underline"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
            Retour à la boutique
          </Link>
        </div>
      </div>
    </div>
  )
}
