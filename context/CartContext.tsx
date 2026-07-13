'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'

export interface CartItem {
  produitId: string
  nom: string
  slug: string
  prix: number
  image?: string
  quantite: number
  taille?: string
  couleur?: string
  varianteId?: string
  stock?: number
  textePersonnalise?: string
}

interface CartContextType {
  items: CartItem[]
  itemCount: number
  totalPrice: number
  isCartOpen: boolean
  setCartOpen: (open: boolean) => void
  addItem: (item: Omit<CartItem, 'quantite'>, quantite?: number) => void
  removeItem: (produitId: string, varianteId?: string, textePersonnalise?: string) => void
  updateQuantity: (produitId: string, quantite: number, varianteId?: string, textePersonnalise?: string) => void
  clearCart: () => void
}

const CartContext = createContext<CartContextType | undefined>(undefined)

export function CartProvider({ children }: { children: ReactNode }) {
  const [isCartOpen, setCartOpen] = useState(false)
  const [items, setItems] = useState<CartItem[]>(() => {
    if (typeof window === 'undefined') {
      return []
    }

    const savedCart = localStorage.getItem('cart')
    if (!savedCart) {
      return []
    }

    try {
      return JSON.parse(savedCart)
    } catch (error) {
      console.error('Erreur lors du chargement du panier:', error)
      return []
    }
  })

  // Sauvegarder le panier dans localStorage à chaque changement
  useEffect(() => {
    localStorage.setItem('cart', JSON.stringify(items))
  }, [items])

  const itemCount = items.reduce((sum, item) => sum + item.quantite, 0)
  const totalPrice = items.reduce((sum, item) => sum + item.prix * item.quantite, 0)

  const addItem = (item: Omit<CartItem, 'quantite'>, quantite: number = 1) => {
    setItems((prevItems) => {
      // Vérifier si l'article existe déjà (même produit + même variante + même personnalisation)
      const existingItemIndex = prevItems.findIndex(
        (i) =>
          i.produitId === item.produitId &&
          i.varianteId === item.varianteId &&
          i.textePersonnalise === item.textePersonnalise
      )

      if (existingItemIndex > -1) {
        // Mettre à jour la quantité
        const newItems = [...prevItems]
        newItems[existingItemIndex].quantite += quantite
        return newItems
      } else {
        // Ajouter un nouvel article
        return [...prevItems, { ...item, quantite }]
      }
    })
  }

  const removeItem = (produitId: string, varianteId?: string, textePersonnalise?: string) => {
    setItems((prevItems) =>
      prevItems.filter(
        (item) =>
          !(
            item.produitId === produitId &&
            item.varianteId === varianteId &&
            item.textePersonnalise === textePersonnalise
          )
      )
    )
  }

  const updateQuantity = (
    produitId: string,
    quantite: number,
    varianteId?: string,
    textePersonnalise?: string
  ) => {
    if (quantite <= 0) {
      removeItem(produitId, varianteId, textePersonnalise)
      return
    }

    setItems((prevItems) =>
      prevItems.map((item) =>
        item.produitId === produitId &&
        item.varianteId === varianteId &&
        item.textePersonnalise === textePersonnalise
          ? { ...item, quantite }
          : item
      )
    )
  }

  const clearCart = () => {
    setItems([])
  }

  return (
    <CartContext.Provider
      value={{
        items,
        itemCount,
        totalPrice,
        isCartOpen,
        setCartOpen,
        addItem,
        removeItem,
        updateQuantity,
        clearCart,
      }}
    >
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  const context = useContext(CartContext)
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider')
  }
  return context
}
