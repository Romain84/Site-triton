'use client'

import Link from 'next/link'
import { useCart } from '@/context/CartContext'

export default function PanierPage() {
  const { items, totalPrice, removeItem, updateQuantity } = useCart()

  return (
    <main className="min-h-screen pt-40 pb-20 bg-gray-50">
      <div className="container mx-auto px-4 max-w-5xl">
        <h1 className="text-4xl font-bold mb-6">Panier</h1>

        {items.length === 0 ? (
          <div className="card p-8 text-gray-600">
            Votre panier est vide. <Link href="/boutique" className="text-primary hover:underline">Retour à la boutique</Link>
          </div>
        ) : (
          <div className="space-y-4">
            {items.map((item) => (
              <div key={`${item.produitId}-${item.varianteId || 'default'}-${item.textePersonnalise || 'default'}`} className="card p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white shadow-xs">
                <div className="flex-grow">
                  <p className="font-semibold text-gray-800">{item.nom}</p>
                  <p className="text-sm text-gray-500">{item.prix.toFixed(2)} €</p>
                  {(item.taille || item.couleur || item.textePersonnalise) && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {item.taille && (
                        <span className="text-[10px] bg-slate-100 border border-slate-200 text-slate-600 font-bold px-1.5 py-0.5 rounded uppercase">
                          Taille : {item.taille}
                        </span>
                      )}
                      {item.couleur && (
                        <span className="text-[10px] bg-slate-100 border border-slate-200 text-slate-600 font-bold px-1.5 py-0.5 rounded uppercase">
                          Couleur : {item.couleur}
                        </span>
                      )}
                      {item.textePersonnalise && (
                        <span className="text-[10px] bg-purple-50 border border-purple-200 text-purple-600 font-bold px-1.5 py-0.5 rounded uppercase block w-full mt-0.5">
                          Personnalisation : {item.textePersonnalise}
                        </span>
                      )}
                    </div>
                  )}
                </div>
                <div className="flex items-center justify-between sm:justify-end gap-6 border-t sm:border-t-0 pt-3 sm:pt-0">
                  <div className="flex items-center gap-2">
                    <button onClick={() => updateQuantity(item.produitId, item.quantite - 1, item.varianteId, item.textePersonnalise)} className="px-3 py-1 border rounded hover:bg-slate-50">-</button>
                    <span className="font-semibold min-w-[20px] text-center">{item.quantite}</span>
                    <button onClick={() => updateQuantity(item.produitId, item.quantite + 1, item.varianteId, item.textePersonnalise)} className="px-3 py-1 border rounded hover:bg-slate-50">+</button>
                  </div>
                  <button onClick={() => removeItem(item.produitId, item.varianteId, item.textePersonnalise)} className="text-red-650 hover:text-red-700 hover:underline font-medium text-sm">Supprimer</button>
                </div>
              </div>
            ))}
            <div className="card p-4 flex items-center justify-between">
              <p className="font-semibold">Total</p>
              <p className="text-xl font-bold">{totalPrice.toFixed(2)} €</p>
            </div>
            <div className="flex justify-end">
              <Link href="/checkout" className="px-5 py-3 rounded bg-primary text-white font-semibold hover:bg-primary-dark">
                Commander
              </Link>
            </div>
          </div>
        )}
      </div>
    </main>
  )
}
