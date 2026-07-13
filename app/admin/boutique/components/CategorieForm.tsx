'use client'

import { useState } from 'react'
import { Categorie } from '../types'

interface CategorieFormProps {
  categorie: Categorie | null
  onClose: () => void
  onSuccess: () => void
}

export default function CategorieForm({
  categorie,
  onClose,
  onSuccess,
}: CategorieFormProps) {
  const [formData, setFormData] = useState({
    nom: categorie?.nom || '',
    slug: categorie?.slug || '',
    description: categorie?.description || '',
    image: categorie?.image || '',
    ordre: categorie?.ordre || 0,
    actif: categorie?.actif ?? true,
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const url = categorie
        ? `/api/admin/boutique/categories/${categorie.id}`
        : '/api/admin/boutique/categories'
      const method = categorie ? 'PUT' : 'POST'

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
      <div className="bg-white rounded-lg max-w-2xl w-full">
        <div className="p-6 border-b">
          <h2 className="text-2xl font-bold">
            {categorie ? 'Modifier la catégorie' : 'Nouvelle catégorie'}
          </h2>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          {error && (
            <div className="bg-red-50 text-red-600 p-4 rounded-lg mb-6">{error}</div>
          )}

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium mb-2">
                Nom de la catégorie *
              </label>
              <input
                type="text"
                value={formData.nom}
                onChange={(e) => {
                  setFormData({ ...formData, nom: e.target.value })
                  if (!categorie) {
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

            <div>
              <label className="block text-sm font-medium mb-2">Slug *</label>
              <input
                type="text"
                value={formData.slug}
                onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                className="w-full px-4 py-2 border rounded-lg"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Description</label>
              <textarea
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                rows={3}
                className="w-full px-4 py-2 border rounded-lg"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                URL de l&apos;image
              </label>
              <input
                type="url"
                value={formData.image}
                onChange={(e) => setFormData({ ...formData, image: e.target.value })}
                className="w-full px-4 py-2 border rounded-lg"
                placeholder="https://..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Ordre d&apos;affichage
              </label>
              <input
                type="number"
                value={formData.ordre || ''}
                onChange={(e) =>
                  setFormData({ ...formData, ordre: e.target.value === '' ? 0 : parseInt(e.target.value) })
                }
                className="w-full px-4 py-2 border rounded-lg"
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
                <span className="text-sm font-medium">Catégorie active</span>
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
