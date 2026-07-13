'use client'

import { useState } from 'react'
import { Variante, Produit } from '../types'

interface VarianteFormProps {
  variante: Variante | null
  produit: Produit
  onClose: () => void
  onSuccess: () => void
}

export default function VarianteForm({
  variante,
  produit,
  onClose,
  onSuccess,
}: VarianteFormProps) {
  const [formData, setFormData] = useState({
    taille: variante?.taille || '',
    couleur: variante?.couleur || '',
    sku: variante?.sku || '',
    prix: variante?.prix ?? produit.prix,
    prixCoutantHT: variante?.prixCoutantHT ?? produit.prixAchat ?? 0,
    prixFlocageHT: variante?.prixFlocageHT || 0,
    tauxTVA: variante?.tauxTVA ?? produit.tauxTVA ?? 20,
    stock: variante?.stock || 0,
    image: variante?.image || '',
    actif: variante?.actif ?? true,
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Calculs automatiques
  const totalHT = formData.prixCoutantHT + formData.prixFlocageHT
  const tva = totalHT * (formData.tauxTVA / 100)
  const coutTTC = totalHT + tva
  const marge = formData.prix - coutTTC
  const margePercent = formData.prix > 0 ? (marge / formData.prix) * 100 : 0

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const url = variante
        ? `/api/admin/boutique/variantes/${variante.id}`
        : `/api/admin/boutique/produits/${produit.id}/variantes`
      const method = variante ? 'PUT' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
        credentials: 'include',
      })

      const data = await res.json()
      if (res.ok) {
        onSuccess()
      } else {
        setError(data.error || 'Erreur lors de la sauvegarde')
      }
    } catch (err) {
      setError('Erreur de connexion')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b">
          <h2 className="text-2xl font-bold">
            {variante ? 'Modifier la variante' : 'Nouvelle variante'}
          </h2>
          <p className="text-sm text-gray-600 mt-1">Prix de base du produit : {produit.prix.toFixed(2)} €</p>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          {error && (
            <div className="bg-red-50 text-red-600 p-4 rounded-lg mb-6">{error}</div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            {/* Identification */}
            <div className="md:col-span-2">
              <h3 className="text-lg font-bold mb-4 text-gray-700">Identification</h3>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Taille</label>
              <input
                type="text"
                value={formData.taille}
                onChange={(e) => setFormData({ ...formData, taille: e.target.value })}
                className="w-full px-4 py-2 border rounded-lg"
                placeholder="S, M, L, 36-38..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Couleur</label>
              <input
                type="text"
                value={formData.couleur}
                onChange={(e) => setFormData({ ...formData, couleur: e.target.value })}
                className="w-full px-4 py-2 border rounded-lg"
                placeholder="Bleu, Rouge..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">SKU (référence)</label>
              <input
                type="text"
                value={formData.sku}
                onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                className="w-full px-4 py-2 border rounded-lg"
                placeholder="PROD-M-BLEU"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Stock</label>
              <input
                type="number"
                value={formData.stock || ''}
                onChange={(e) => setFormData({ ...formData, stock: e.target.value === '' ? 0 : parseInt(e.target.value) })}
                className="w-full px-4 py-2 border rounded-lg"
              />
            </div>

            {/* Prix de vente */}
            <div className="md:col-span-2">
              <h3 className="text-lg font-bold mb-4 mt-4 text-gray-700">Prix de vente</h3>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-2">Prix de vente TTC (€) *</label>
              <input
                type="number"
                step="0.01"
                value={formData.prix || ''}
                onChange={(e) => setFormData({ ...formData, prix: e.target.value === '' ? 0 : parseFloat(e.target.value) })}
                className="w-full px-4 py-2 border rounded-lg"
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                Prix affiché au client (Laisser à {produit.prix.toFixed(2)} € pour utiliser le prix de base du produit)
              </p>
            </div>

            {/* Coûts */}
            <div className="md:col-span-2">
              <h3 className="text-lg font-bold mb-4 mt-4 text-gray-700">Coûts (pour calcul de marge)</h3>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Prix coûtant HT (€)</label>
              <input
                type="number"
                step="0.01"
                value={formData.prixCoutantHT || ''}
                onChange={(e) => setFormData({ ...formData, prixCoutantHT: e.target.value === '' ? 0 : parseFloat(e.target.value) })}
                className="w-full px-4 py-2 border rounded-lg"
              />
              <p className="text-xs text-gray-500 mt-1">Prix d&apos;achat fournisseur HT</p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Prix flocage HT (€)</label>
              <input
                type="number"
                step="0.01"
                value={formData.prixFlocageHT || ''}
                onChange={(e) => setFormData({ ...formData, prixFlocageHT: e.target.value === '' ? 0 : parseFloat(e.target.value) })}
                className="w-full px-4 py-2 border rounded-lg"
              />
              <p className="text-xs text-gray-500 mt-1">Coût du flocage/personnalisation HT</p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Taux TVA (%)</label>
              <input
                type="number"
                step="0.01"
                value={formData.tauxTVA || ''}
                onChange={(e) => setFormData({ ...formData, tauxTVA: e.target.value === '' ? 20 : parseFloat(e.target.value) })}
                className="w-full px-4 py-2 border rounded-lg"
              />
            </div>

            {/* Calcul de marge en temps réel */}
            <div className="md:col-span-2 bg-gray-50 p-4 rounded-lg">
              <h4 className="font-bold mb-3">Calcul automatique</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <div className="text-gray-600">Total HT</div>
                  <div className="font-bold">{totalHT.toFixed(2)} €</div>
                </div>
                <div>
                  <div className="text-gray-600">TVA ({formData.tauxTVA}%)</div>
                  <div className="font-bold">{tva.toFixed(2)} €</div>
                </div>
                <div>
                  <div className="text-gray-600">Coût TTC</div>
                  <div className="font-bold text-red-600">{coutTTC.toFixed(2)} €</div>
                </div>
                <div>
                  <div className="text-gray-600">Marge</div>
                  <div className={`font-bold ${marge > 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {marge.toFixed(2)} € ({margePercent.toFixed(1)}%)
                  </div>
                </div>
              </div>
            </div>

            {/* Autres */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-2">URL image (optionnel)</label>
              <input
                type="url"
                value={formData.image}
                onChange={(e) => setFormData({ ...formData, image: e.target.value })}
                className="w-full px-4 py-2 border rounded-lg"
                placeholder="https://..."
              />
            </div>

            <div>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.actif}
                  onChange={(e) => setFormData({ ...formData, actif: e.target.checked })}
                  className="rounded"
                />
                <span className="text-sm font-medium">Variante active</span>
              </label>
            </div>
          </div>

          <div className="flex gap-4 mt-8">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-2 border rounded-lg hover:bg-gray-50"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-primary text-white px-6 py-2 rounded-lg hover:bg-primary-dark disabled:opacity-50"
            >
              {loading ? 'Enregistrement...' : 'Enregistrer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
