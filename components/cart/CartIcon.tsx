'use client'

import { useCart } from '@/context/CartContext'

export default function CartIcon() {
  const { itemCount, setCartOpen } = useCart()

  return (
    <button
      onClick={() => setCartOpen(true)}
      className="relative p-2 hover:bg-gray-105 rounded-lg transition-colors cursor-pointer"
      aria-label="Ouvrir le panier"
    >
      <svg
        className="w-6 h-6 text-gray-700"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
        />
      </svg>
      {itemCount > 0 && (
        <span className="absolute -top-1 -right-1 bg-primary text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
          {itemCount > 9 ? '9+' : itemCount}
        </span>
      )}
    </button>
  )
}
