'use client'

import { useState } from 'react'
import Image from 'next/image'
import toast from 'react-hot-toast'
import { Produit, Categorie, Fournisseur } from '../types'

interface ProduitFormProps {
  produit: Produit | null
  categories: Categorie[]
  fournisseurs: Fournisseur[]
  onClose: () => void
  onSuccess: () => void
}

export default function ProduitForm({
  produit,
  categories,
  fournisseurs,
  onClose,
  onSuccess,
}: ProduitFormProps) {
  const [formData, setFormData] = useState({
    nom: produit?.nom || '',
    slug: produit?.slug || '',
    description: produit?.description || '',
    descriptionCourte: produit?.descriptionCourte || '',
    prix: produit?.prix || 0,
    prixAchat: produit?.prixAchat || 0,
    tauxTVA: produit?.tauxTVA ?? 20,
    prixPromo: produit?.prixPromo || 0,
    enPromo: produit?.enPromo || false,
    stock: produit?.stock || 0,
    image: produit?.image || '',
    images: produit?.images ? (JSON.parse(produit.images) as string[]) : [] as string[],
    categorieId: produit?.categorieId || '',
    fournisseurId: produit?.fournisseurId || '',
    actif: produit?.actif ?? true,
    enVedette: produit?.enVedette || false,
    personnalisable: produit?.personnalisable || false,
    gererStock: produit?.gererStock ?? true,
    stockIllimite: produit?.stockIllimite ?? false,
    prixFlocage: produit?.prixFlocage || 0,
    lienExterne: (produit as any)?.lienExterne || '',
    guideTailles: (produit as any)?.guideTailles || '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [uploading, setUploading] = useState(false)
  const [uploadingAdditional, setUploadingAdditional] = useState(false)

  const handleAdditionalImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    setUploadingAdditional(true)
    let successCount = 0

    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      const uploadFormData = new FormData()
      uploadFormData.append('file', file)

      try {
        const response = await fetch('/api/admin/upload-image', {
          method: 'POST',
          body: uploadFormData,
        })

        const data = await response.json()
        if (response.ok && data.url) {
          setFormData((prev) => ({
            ...prev,
            images: [...prev.images, data.url],
          }))
          successCount++
        } else {
          toast.error(data.error || `Erreur d'upload pour ${file.name}`)
        }
      } catch (error) {
        console.error('Erreur upload supplémentaire:', error)
        toast.error(`Erreur d'upload pour ${file.name}`)
      }
    }

    if (successCount > 0) {
      toast.success(`${successCount} photo(s) ajoutée(s) avec succès`)
    }
    setUploadingAdditional(false)
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    const uploadFormData = new FormData()
    uploadFormData.append('file', file)

    try {
      const response = await fetch('/api/admin/upload-image', {
        method: 'POST',
        body: uploadFormData,
      })

      const data = await response.json()
      if (response.ok && data.url) {
        setFormData((prev) => ({ ...prev, image: data.url }))
        toast.success('Image uploadée avec succès')
      } else {
        toast.error(data.error || 'Erreur lors de l\'upload')
      }
    } catch (error) {
      console.error('Erreur upload:', error)
      toast.error('Erreur lors de l\'upload')
    } finally {
      setUploading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const url = produit
        ? `/api/admin/boutique/produits/${produit.id}`
        : '/api/admin/boutique/produits'
      const method = produit ? 'PUT' : 'POST'

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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b">
          <h2 className="text-2xl font-bold">
            {produit ? 'Modifier le produit' : 'Nouveau produit'}
          </h2>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          {error && (
            <div className="bg-red-50 text-red-600 p-4 rounded-lg mb-6">{error}</div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-2">
                Nom du produit *
              </label>
              <input
                type="text"
                value={formData.nom}
                onChange={(e) => {
                  setFormData({ ...formData, nom: e.target.value })
                  if (!produit) {
                    // Auto-generate slug
                    const slug = e.target.value
                      .toLowerCase()
                      .replace(/[^a-z0-9]+/g, '-')
                      .replace(/(^-|-$)/g, '')
                    setFormData((prev) => ({ ...prev, slug }))
                  }
                }}
                className="w-full px-4 py-2 border rounded-lg"
                required
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-2">Slug *</label>
              <input
                type="text"
                value={formData.slug}
                onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                className="w-full px-4 py-2 border rounded-lg"
                required
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-2">
                Lien officiel (site fournisseur / fiche officielle)
              </label>
              <input
                type="url"
                value={(formData as any).lienExterne || ''}
                onChange={(e) => setFormData({ ...formData, lienExterne: e.target.value })}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary/20"
                placeholder="https://www.joma-sport.com/... (ex: Joma, Arena, etc.)"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-2">
                Guide des tailles spécifique (optionnel - URL d&apos;image ou PDF)
              </label>
              <input
                type="text"
                value={(formData as any).guideTailles || ''}
                onChange={(e) => setFormData({ ...formData, guideTailles: e.target.value })}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary/20"
                placeholder="https://example.com/guide.jpg (Surchargera le guide du fournisseur)"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Prix d&apos;achat HT (€)
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.prixAchat || ''}
                onChange={(e) =>
                  setFormData({ ...formData, prixAchat: e.target.value === '' ? 0 : parseFloat(e.target.value) })
                }
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary/20"
                placeholder="0.00"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Taux TVA (%) *
              </label>
              <select
                value={formData.tauxTVA}
                onChange={(e) =>
                  setFormData({ ...formData, tauxTVA: parseFloat(e.target.value) })
                }
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary/20"
                required
              >
                <option value="20">20% (Normal)</option>
                <option value="10">10% (Intermédiaire)</option>
                <option value="5.5">5.5% (Réduit)</option>
                <option value="2.1">2.1% (Super réduit)</option>
                <option value="0">0% (Exonéré)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Prix de vente TTC (€) *</label>
              <input
                type="number"
                step="0.01"
                value={formData.prix || ''}
                onChange={(e) =>
                  setFormData({ ...formData, prix: e.target.value === '' ? 0 : parseFloat(e.target.value) })
                }
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary/20"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Stock</label>
              <input
                type="number"
                value={formData.stock || ''}
                onChange={(e) =>
                  setFormData({ ...formData, stock: e.target.value === '' ? 0 : parseInt(e.target.value) })
                }
                disabled={!formData.gererStock || formData.stockIllimite}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary/20 disabled:bg-gray-100 disabled:text-gray-400"
              />
            </div>

            <div className="flex flex-col justify-center gap-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.gererStock}
                  onChange={(e) =>
                    setFormData({ ...formData, gererStock: e.target.checked })
                  }
                  className="rounded text-primary focus:ring-primary"
                />
                <span className="text-sm font-medium text-slate-700">Gérer les stocks de ce produit</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.stockIllimite}
                  onChange={(e) =>
                    setFormData({ ...formData, stockIllimite: e.target.checked })
                  }
                  className="rounded text-primary focus:ring-primary"
                />
                <span className="text-sm font-medium text-slate-700">Stock illimité (hors stock physique)</span>
              </label>
            </div>

            <div className="md:col-span-2 bg-slate-50 border border-slate-200 p-4.5 rounded-xl space-y-2 text-sm">
              <div className="flex justify-between items-center text-xs font-semibold text-slate-550 border-b border-slate-200 pb-2 mb-1.5 uppercase tracking-wider">
                <span>Indicateurs Financiers (Association)</span>
                <span>Vision Rentabilité</span>
              </div>
              {(() => {
                const prixVenteNet = formData.prix || 0; // Pas de TVA collectée sur la revente
                const prixAchatHT = formData.prixAchat || 0;
                const tauxTVAAchat = formData.tauxTVA || 20;
                const prixAchatTTC = prixAchatHT * (1 + tauxTVAAchat / 100); // L'association paie la TVA mais ne la récupère pas
                const fraisStripe = prixVenteNet > 0 ? (prixVenteNet * 0.015) + 0.25 : 0; // Estimation frais Stripe (1.5% + 0.25€)
                const beneficeReel = prixVenteNet - prixAchatTTC - fraisStripe;
                const margePercent = prixVenteNet > 0 ? (beneficeReel / prixVenteNet) * 100 : 0;

                return (
                  <div className="space-y-1.5 font-medium text-slate-700">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Prix de vente public (Net) :</span>
                      <span className="font-mono text-slate-900">{prixVenteNet.toFixed(2)} €</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Coût d&apos;achat fournisseur TTC :</span>
                      <span className="font-mono text-slate-800">{prixAchatTTC.toFixed(2)} €</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-550 italic">Frais Stripe (est. 1.5% + 0.25€) :</span>
                      <span className="font-mono text-slate-500 italic">{fraisStripe.toFixed(2)} €</span>
                    </div>
                    <div className="flex justify-between border-t border-slate-150 pt-2 font-bold">
                      <span>Bénéfice net unitaire (Réel) :</span>
                      <div className="flex items-center gap-2">
                        <span className={beneficeReel >= 0 ? 'text-green-600' : 'text-red-600'}>
                          {beneficeReel >= 0 ? '+' : ''}{beneficeReel.toFixed(2)} €
                        </span>
                        <span className={`text-xs px-2.5 py-0.5 rounded-full ${beneficeReel >= 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                          Marge: {margePercent.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Catégorie</label>
              <select
                value={formData.categorieId}
                onChange={(e) =>
                  setFormData({ ...formData, categorieId: e.target.value })
                }
                className="w-full px-4 py-2 border rounded-lg"
              >
                <option value="">Sans catégorie</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.nom}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Fournisseur</label>
              <select
                value={formData.fournisseurId}
                onChange={(e) =>
                  setFormData({ ...formData, fournisseurId: e.target.value })
                }
                className="w-full px-4 py-2 border rounded-lg"
              >
                <option value="">Sans fournisseur</option>
                {fournisseurs.map((fourn) => (
                  <option key={fourn.id} value={fourn.id}>
                    {fourn.nom}
                  </option>
                ))}
              </select>
            </div>

            <div className="md:col-span-2 space-y-2">
              <label className="block text-sm font-medium">
                Image du produit
              </label>
              <div className="flex gap-3">
                <input
                  type="text"
                  value={formData.image}
                  onChange={(e) => setFormData({ ...formData, image: e.target.value })}
                  className="flex-1 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary/20"
                  placeholder="URL de l'image ou uploadez un fichier"
                />
                <label className={`px-4 py-2 rounded-lg cursor-pointer transition-colors flex items-center justify-center font-semibold text-sm select-none ${uploading ? 'bg-slate-300 text-slate-500 cursor-not-allowed' : 'bg-slate-900 hover:bg-slate-800 text-white shadow-xs'}`}>
                  {uploading ? 'Upload...' : 'Uploader'}
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    onChange={handleImageUpload}
                    disabled={uploading}
                    className="hidden"
                  />
                </label>
              </div>
              {formData.image && (
                <div className="relative inline-block mt-2">
                  <div className="relative h-24 w-36 border border-slate-200 rounded-lg overflow-hidden bg-slate-50">
                    <Image
                      src={formData.image}
                      alt="Aperçu du produit"
                      fill
                      className="object-cover"
                      unoptimized={formData.image.includes('blob.vercel-storage.com') || formData.image.startsWith('/uploads/')}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, image: '' })}
                    className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center text-sm font-bold shadow-md hover:bg-red-600 transition-colors"
                  >
                    ×
                  </button>
                </div>
              )}
            </div>

            {/* Photos supplémentaires */}
            <div className="md:col-span-2 space-y-2 border-t pt-4 border-slate-200">
              <label className="block text-sm font-medium">
                Photos supplémentaires (galerie)
              </label>
              <div className="flex flex-wrap gap-3 items-center">
                <label className={`px-4 py-2 rounded-lg cursor-pointer transition-colors flex items-center justify-center font-semibold text-sm select-none ${uploadingAdditional ? 'bg-slate-300 text-slate-500 cursor-not-allowed' : 'bg-slate-900 hover:bg-slate-800 text-white shadow-xs'}`}>
                  {uploadingAdditional ? 'Upload...' : 'Ajouter des photos'}
                  <input
                    type="file"
                    multiple
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    onChange={handleAdditionalImageUpload}
                    disabled={uploadingAdditional}
                    className="hidden"
                  />
                </label>
                <span className="text-xs text-gray-500">
                  Ces photos s'afficheront dans la galerie sous la photo principale. Vous pouvez en sélectionner plusieurs.
                </span>
              </div>

              {formData.images.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3 mt-3">
                  {formData.images.map((img, idx) => (
                    <div key={idx} className="relative group border border-slate-200 rounded-lg overflow-hidden bg-slate-50 h-20">
                      <Image
                        src={img}
                        alt={`Photo supplémentaire ${idx + 1}`}
                        fill
                        className="object-cover"
                        unoptimized={img.includes('blob.vercel-storage.com') || img.startsWith('/uploads/')}
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setFormData((prev) => ({
                            ...prev,
                            images: prev.images.filter((_, i) => i !== idx),
                          }))
                        }}
                        className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center text-xs font-bold shadow-md hover:bg-red-600 transition-colors opacity-0 group-hover:opacity-100 duration-200"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.enPromo}
                  onChange={(e) =>
                    setFormData({ ...formData, enPromo: e.target.checked })
                  }
                  className="rounded"
                />
                <span className="text-sm font-medium">En promotion</span>
              </label>
            </div>

            {formData.enPromo && (
              <div>
                <label className="block text-sm font-medium mb-2">
                  Prix promo (€)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.prixPromo}
                  onChange={(e) =>
                    setFormData({ ...formData, prixPromo: parseFloat(e.target.value) })
                  }
                  className="w-full px-4 py-2 border rounded-lg"
                />
              </div>
            )}

            <div>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.actif}
                  onChange={(e) => setFormData({ ...formData, actif: e.target.checked })}
                  className="rounded"
                />
                <span className="text-sm font-medium">Produit actif</span>
              </label>
            </div>

            <div>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.enVedette}
                  onChange={(e) =>
                    setFormData({ ...formData, enVedette: e.target.checked })
                  }
                  className="rounded"
                />
                <span className="text-sm font-medium">Produit en vedette</span>
              </label>
            </div>

            <div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.personnalisable}
                  onChange={(e) =>
                    setFormData({ ...formData, personnalisable: e.target.checked })
                  }
                  className="rounded"
                />
                <span className="text-sm font-medium text-purple-700 font-semibold">✨ Produit personnalisable</span>
              </label>
            </div>

            {formData.personnalisable && (
              <div>
                <label className="block text-sm font-medium mb-2 text-purple-700 font-semibold">
                  Montant du flocage (€ TTC)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.prixFlocage || ''}
                  onChange={(e) =>
                    setFormData({ ...formData, prixFlocage: e.target.value === '' ? 0 : parseFloat(e.target.value) })
                  }
                  placeholder="0.00"
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-200 font-mono"
                />
              </div>
            )}
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
