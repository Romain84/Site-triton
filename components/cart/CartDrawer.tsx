'use client'

import { useEffect, useRef } from 'react'
import { useCart } from '@/context/CartContext'
import Link from 'next/link'
import Image from 'next/image'

export default function CartDrawer() {
  const { isCartOpen, setCartOpen, items, totalPrice, removeItem, updateQuantity } = useCart()
  const drawerRef = useRef<HTMLDivElement>(null)

  // Verrouiller le scroll du body quand le panier est ouvert
  useEffect(() => {
    if (isCartOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isCartOpen])

  // Fermer sur appui de la touche Échap
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isCartOpen) {
        setCartOpen(false)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isCartOpen, setCartOpen])

  if (!isCartOpen) return null

  return (
    <div className="fixed inset-0 z-[100] flex justify-end">
      {/* Backdrop sombre avec fondu progressif */}
      <div
        className="fixed inset-0 bg-slate-950/45 backdrop-blur-xs transition-opacity duration-300 animate-fade-in"
        onClick={() => setCartOpen(false)}
      />

      {/* Panneau coulissant */}
      <div
        ref={drawerRef}
        className="relative w-full max-w-md h-full bg-white shadow-2xl flex flex-col z-10 transition-transform duration-300 ease-out translate-x-0 animate-slide-in-right border-l border-slate-100"
      >
        {/* En-tête */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-white">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-slate-900">Mon Panier</h2>
            <span className="bg-primary/10 text-primary-dark text-xs font-bold px-2 py-0.5 rounded-full">
              {items.reduce((sum, item) => sum + item.quantite, 0)}
            </span>
          </div>
          <button
            onClick={() => setCartOpen(false)}
            className="w-8 h-8 rounded-full hover:bg-slate-50 flex items-center justify-center text-slate-400 hover:text-slate-700 transition-colors"
            aria-label="Fermer le panier"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Contenu principal */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4 min-h-0 bg-slate-50/30">
          {items.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-4">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center text-3xl">
                🛍️
              </div>
              <div>
                <p className="font-bold text-slate-800">Votre panier est vide</p>
                <p className="text-xs text-slate-450 mt-1 font-light max-w-[240px] leading-relaxed">
                  Découvrez nos produits officiels (maillots de bain, t-shirts, bonnets) dans notre boutique.
                </p>
              </div>
              <button
                onClick={() => setCartOpen(false)}
                className="px-5 py-2.5 bg-slate-900 text-white rounded-lg text-xs font-bold hover:bg-slate-800 shadow-xs transition-colors"
              >
                Continuer mes achats
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {items.map((item) => (
                <div
                  key={`${item.produitId}-${item.varianteId || 'default'}-${item.textePersonnalise || 'default'}`}
                  className="flex items-center gap-4 bg-white border border-slate-200/60 p-3 rounded-xl shadow-2xs group relative hover:border-slate-350 transition-all duration-200"
                >
                  {/* Image du produit */}
                  <div className="relative w-16 h-16 bg-slate-50 rounded-lg overflow-hidden shrink-0 border border-slate-100">
                    {item.image ? (
                      <Image
                        src={item.image}
                        alt={item.nom}
                        fill
                        className="object-cover"
                        unoptimized={item.image.includes('blob.vercel-storage.com') || item.image.startsWith('/uploads/')}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-350 text-xs font-bold bg-slate-100">
                        🏊
                      </div>
                    )}
                  </div>

                  {/* Infos produit */}
                  <div className="flex-1 min-w-0 space-y-1 pr-4">
                    <p className="font-bold text-slate-900 text-sm truncate leading-snug">
                      {item.nom}
                    </p>

                    {/* Attributs de variante (Taille, Couleur, Personnalisation) */}
                    {(item.taille || item.couleur || item.textePersonnalise) && (
                      <div className="flex flex-wrap gap-1.5 pt-0.5">
                        {item.taille && (
                          <span className="text-[10px] bg-slate-50 border border-slate-200/50 text-slate-500 font-bold px-1.5 py-0.5 rounded uppercase">
                            Taille : {item.taille}
                          </span>
                        )}
                        {item.couleur && (
                          <span className="text-[10px] bg-slate-50 border border-slate-200/50 text-slate-500 font-bold px-1.5 py-0.5 rounded uppercase">
                            Couleur : {item.couleur}
                          </span>
                        )}
                        {item.textePersonnalise && (
                          <span className="text-[10px] bg-purple-50 border border-purple-200/50 text-purple-600 font-bold px-1.5 py-0.5 rounded uppercase block w-full mt-0.5">
                            Personnalisation : {item.textePersonnalise}
                          </span>
                        )}
                      </div>
                    )}

                    {/* Prix unitaire */}
                    <p className="text-xs font-semibold text-slate-600">
                      {item.prix.toFixed(2)} €
                    </p>
                  </div>

                  {/* Contrôles de quantité & suppression */}
                  <div className="flex flex-col items-end justify-between self-stretch shrink-0">
                    {/* Bouton de suppression */}
                    <button
                      onClick={() => removeItem(item.produitId, item.varianteId, item.textePersonnalise)}
                      className="text-slate-400 hover:text-red-500 transition-colors p-1 rounded-md cursor-pointer"
                      title="Supprimer l'article"
                      aria-label={`Supprimer ${item.nom} du panier`}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>

                    {/* Sélecteur de quantité */}
                    <div className="flex items-center gap-1 border border-slate-200/80 rounded-lg p-0.5 bg-slate-50/50 shadow-2xs">
                      <button
                        onClick={() => updateQuantity(item.produitId, item.quantite - 1, item.varianteId, item.textePersonnalise)}
                        className="w-5 h-5 rounded hover:bg-white border border-transparent hover:border-slate-200/40 text-slate-600 hover:text-slate-900 text-xs font-bold flex items-center justify-center transition-all active:scale-95 cursor-pointer"
                        aria-label={`Diminuer la quantité de ${item.nom}`}
                      >
                        -
                      </button>
                      <span className="w-5 text-center text-xs font-bold text-slate-800" aria-label={`Quantité: ${item.quantite}`}>
                        {item.quantite}
                      </span>
                      <button
                        onClick={() => updateQuantity(item.produitId, item.quantite + 1, item.varianteId, item.textePersonnalise)}
                        className="w-5 h-5 rounded hover:bg-white border border-transparent hover:border-slate-200/40 text-slate-600 hover:text-slate-900 text-xs font-bold flex items-center justify-center transition-all active:scale-95 cursor-pointer"
                        aria-label={`Augmenter la quantité de ${item.nom}`}
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Pied de page (Résumé & Action) */}
        {items.length > 0 && (
          <div className="p-5 border-t border-slate-100 bg-white space-y-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-600 font-semibold">Total intermédiaire</span>
              <span className="text-xl font-black text-slate-900">{totalPrice.toFixed(2)} €</span>
            </div>

            <p className="text-xs text-slate-500 leading-normal font-light">
              TVA incluse. Les frais de retrait ou de livraison seront calculés lors de l&apos;étape suivante.
            </p>

            <div className="grid grid-cols-1 gap-2 pt-1">
              <Link
                href="/checkout"
                onClick={() => setCartOpen(false)}
                className="w-full bg-slate-950 text-white hover:bg-slate-800 py-3.5 rounded-xl font-bold text-xs uppercase tracking-wider text-center shadow-xs hover:shadow-md transition-all active:scale-[0.99]"
              >
                Valider la commande
              </Link>
              <button
                onClick={() => setCartOpen(false)}
                className="w-full bg-white border border-slate-200 hover:bg-slate-50 py-3.5 rounded-xl font-semibold text-xs uppercase tracking-wider text-center text-slate-650 transition-colors"
              >
                Continuer mes achats
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Styles locaux pour les animations */}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideInRight {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
        .animate-fade-in {
          animation: fadeIn 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .animate-slide-in-right {
          animation: slideInRight 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}</style>
    </div>
  )
}
