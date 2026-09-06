'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useCart } from '@/context/CartContext'
import { logger } from '@/lib/logger'
import Link from 'next/link'

export default function CheckoutPage() {
  const router = useRouter()
  const { items, totalPrice, clearCart } = useCart()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [boutiqueOuverte, setBoutiqueOuverte] = useState(true)
  const [checkingBoutique, setCheckingBoutique] = useState(true)

  const [formData, setFormData] = useState({
    email: '',
    prenom: '',
    nom: '',
    telephone: '',
    prenomNageur: '',
    nomNageur: '',
    note: '',
  })
  const [memeNageur, setMemeNageur] = useState(false)

  const total = totalPrice

  useEffect(() => {
    const checkBoutique = async () => {
      try {
        const res = await fetch('/api/settings/public')
        const data = await res.json()
        setBoutiqueOuverte(data.boutiqueOuverte ?? true)
      } catch (err) {
        logger.error('Erreur lors du controle de la boutique', err)
      } finally {
        setCheckingBoutique(false)
      }
    }
    checkBoutique()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!boutiqueOuverte) {
      setError('La boutique est actuellement fermée pour les commandes.')
      return
    }
    setLoading(true)
    setError('')

    try {
      // Créer la session Stripe
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: items.map((item) => ({
            produitId: item.produitId,
            varianteId: item.varianteId,
            nom: item.nom,
            slug: item.slug,
            prix: item.prix,
            image: item.image,
            quantite: item.quantite,
            taille: item.taille,
            couleur: item.couleur,
            textePersonnalise: item.textePersonnalise,
          })),
          customerInfo: formData,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Erreur lors de la création de la session de paiement')
        setLoading(false)
        return
      }

      // Rediriger vers Stripe Checkout
      if (data.url) {
        window.location.href = data.url
      } else {
        setError('URL de paiement manquante')
        setLoading(false)
      }
    } catch (err) {
      logger.error('Erreur lors du checkout', err)
      setError('Erreur de connexion')
      setLoading(false)
    }
  }

  if (items.length === 0) {
    return (
      <div className="min-h-screen pt-40 pb-20 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="max-w-2xl mx-auto text-center">
            <h1 className="text-4xl font-bold mb-8">Panier vide</h1>
            <p className="text-gray-600 mb-8">
              Votre panier est vide. Ajoutez des produits avant de passer commande.
            </p>
            <Link
              href="/boutique"
              className="inline-block bg-primary text-white px-8 py-3 rounded-lg font-bold hover:bg-primary-dark transition-colors"
            >
              Voir la boutique
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen pt-40 pb-20 bg-gray-50">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl font-bold mb-8">Finaliser la commande</h1>
          <div className="bg-primary/10 border border-primary/20 text-slate-800 p-4 rounded-lg mb-8">
            <p className="font-bold text-primary-dark">📦 Retrait en main propre</p>
            <p className="text-sm mt-1">Votre commande sera à récupérer au club.</p>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Formulaire */}
              <div className="lg:col-span-2">
                <div className="card p-8">
                  {error && (
                    <div className="bg-red-50 text-red-600 p-4 rounded-lg mb-6">
                      {error}
                    </div>
                  )}

                  {!boutiqueOuverte && !checkingBoutique && (
                    <div className="bg-orange-50 border-l-4 border-orange-500 text-orange-700 p-4 rounded-lg mb-6 font-medium">
                      🔒 La boutique est actuellement fermée pour les commandes. Vous ne pouvez pas finaliser votre achat.
                    </div>
                  )}

                  <h2 className="text-2xl font-bold mb-6">Informations de contact</h2>

                  <div className="space-y-6">
                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Email *
                      </label>
                      <input
                        type="email"
                        value={formData.email}
                        onChange={(e) =>
                          setFormData({ ...formData, email: e.target.value })
                        }
                        className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                        required
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-2">
                          Prénom *
                        </label>
                        <input
                          type="text"
                          value={formData.prenom}
                          onChange={(e) => {
                            const val = e.target.value
                            setFormData((prev) => ({
                              ...prev,
                              prenom: val,
                              ...(memeNageur ? { prenomNageur: val } : {}),
                            }))
                          }}
                          className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2">
                          Nom *
                        </label>
                        <input
                          type="text"
                          value={formData.nom}
                          onChange={(e) => {
                            const val = e.target.value
                            setFormData((prev) => ({
                              ...prev,
                              nom: val,
                              ...(memeNageur ? { nomNageur: val } : {}),
                            }))
                          }}
                          className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Téléphone
                      </label>
                      <input
                        type="tel"
                        value={formData.telephone}
                        onChange={(e) =>
                          setFormData({ ...formData, telephone: e.target.value })
                        }
                        className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                      />
                    </div>
                  </div>

                  <h2 className="text-2xl font-bold mt-8 mb-4">Informations du nageur</h2>
                  <p className="text-sm text-gray-600 mb-4">
                    Indiquez l&apos;identité du nageur qui recevra l&apos;équipement au club.
                  </p>

                  <div className="flex items-center gap-2.5 mb-5 p-3 bg-slate-50 border border-slate-200 rounded-xl">
                    <input
                      type="checkbox"
                      id="memeNageur"
                      checked={memeNageur}
                      onChange={(e) => {
                        const checked = e.target.checked
                        setMemeNageur(checked)
                        if (checked) {
                          setFormData((prev) => ({
                            ...prev,
                            prenomNageur: prev.prenom,
                            nomNageur: prev.nom,
                          }))
                        }
                      }}
                      className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded cursor-pointer"
                    />
                    <label htmlFor="memeNageur" className="text-xs md:text-sm font-semibold text-slate-750 cursor-pointer select-none">
                      Je commande pour moi-même (recopier mon prénom et mon nom)
                    </label>
                  </div>

                  <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-2">
                          Prénom du nageur *
                        </label>
                        <input
                          type="text"
                          value={formData.prenomNageur}
                          onChange={(e) =>
                            setFormData({ ...formData, prenomNageur: e.target.value })
                          }
                          className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2">
                          Nom du nageur *
                        </label>
                        <input
                          type="text"
                          value={formData.nomNageur}
                          onChange={(e) =>
                            setFormData({ ...formData, nomNageur: e.target.value })
                          }
                          className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Note de commande (optionnel)
                      </label>
                      <textarea
                        value={formData.note}
                        onChange={(e) =>
                          setFormData({ ...formData, note: e.target.value })
                        }
                        rows={3}
                        className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                        placeholder="Informations complémentaires..."
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Résumé */}
              <div className="lg:col-span-1">
                <div className="card p-6 sticky top-24">
                  <h2 className="text-2xl font-bold mb-6">Résumé</h2>

                  <div className="space-y-4 mb-6">
                    <div className="border-t pt-4">
                      <div className="flex justify-between text-xl font-bold">
                        <span>Total</span>
                        <span>{total.toFixed(2)} €</span>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">TVA incluse</p>
                      <p className="text-sm text-green-600 mt-1">Retrait gratuit au club</p>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading || !boutiqueOuverte || checkingBoutique}
                    className="w-full bg-primary text-white py-4 rounded-lg font-bold hover:bg-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed mb-4"
                  >
                    {!boutiqueOuverte && !checkingBoutique ? 'Boutique fermée' : loading ? 'Redirection...' : 'Payer avec Stripe'}
                  </button>

                  <Link
                    href="/panier"
                    className="block text-center text-primary hover:underline font-medium"
                  >
                    ← Retour au panier
                  </Link>

                  {/* Sécurité */}
                  <div className="mt-6 pt-6 border-t space-y-3 text-sm text-gray-600">
                    <div className="flex items-start gap-2">
                      <svg
                        className="w-5 h-5 text-green-600 flex-shrink-0"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                        />
                      </svg>
                      <span>Paiement 100% sécurisé par Stripe</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <svg
                        className="w-5 h-5 text-green-600 flex-shrink-0"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                      <span>Vos données sont protégées</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
