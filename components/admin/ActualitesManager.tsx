'use client'

import { useState, useEffect, Fragment } from 'react'
import Image from 'next/image'
import { useToast } from '@/hooks/useToast'
import { useConfirmDialog } from '@/components/ConfirmDialog'
import RichTextEditor from './RichTextEditor'
import { formatLongDateFr } from '@/lib/date'

interface Actualite {
  id: string
  titre: string
  slug: string
  contenu: string
  datePubli: Date
  auteur: string
  image?: string | null
  publie: boolean
  createdAt: Date
  updatedAt: Date
}

export default function ActualitesManager() {
  const toast = useToast()
  const { confirm } = useConfirmDialog()
  const [actualites, setActualites] = useState<Actualite[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    titre: '',
    slug: '',
    contenu: '',
    datePubli: new Date().toISOString().split('T')[0],
    auteur: '',
    image: '',
    publie: true,
  })
  const [uploading, setUploading] = useState(false)

  useEffect(() => {
    fetchActualites()
  }, [])

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    const formData = new FormData()
    formData.append('file', file)

    try {
      const response = await fetch('/api/admin/upload-image', {
        method: 'POST',
        body: formData,
      })

      if (response.ok) {
        const data = await response.json()
        setFormData((prev) => ({ ...prev, image: data.url }))
        toast.success('Image uploadée avec succès')
      } else {
        const error = await response.json()
        toast.error('Erreur: ' + error.error)
      }
    } catch (error) {
      console.error('Erreur upload:', error)
      toast.error('Erreur lors de l\'upload')
    } finally {
      setUploading(false)
    }
  }

  const fetchActualites = async () => {
    try {
      const response = await fetch('/api/admin/actualites')
      if (response.ok) {
        const data = await response.json()
        setActualites(data.actualites)
      }
    } catch (error) {
      console.error('Erreur lors du chargement:', error)
    } finally {
      setLoading(false)
    }
  }

  const generateSlug = (titre: string) => {
    return titre
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')
  }

  const handleTitreChange = (titre: string) => {
    setFormData({
      ...formData,
      titre,
      slug: generateSlug(titre),
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const url = editingId
      ? `/api/admin/actualites/${editingId}`
      : '/api/admin/actualites'

    const method = editingId ? 'PUT' : 'POST'

    try {
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          image: formData.image || null,
        }),
      })

      if (response.ok) {
        await fetchActualites()
        resetForm()
        toast.success(editingId ? 'Actualité mise à jour avec succès' : 'Actualité créée avec succès')
      } else {
        const error = await response.json()
        toast.error('Erreur: ' + error.error)
      }
    } catch (error) {
      console.error('Erreur:', error)
      toast.error('Erreur lors de la sauvegarde')
    }
  }

  const handleEdit = (actualite: Actualite) => {
    setEditingId(actualite.id)
    setFormData({
      titre: actualite.titre,
      slug: actualite.slug,
      contenu: actualite.contenu,
      datePubli: new Date(actualite.datePubli).toISOString().split('T')[0],
      auteur: actualite.auteur,
      image: actualite.image || '',
      publie: actualite.publie,
    })
    setShowForm(false)
  }

  const handleDelete = async (id: string) => {
    const confirmed = await confirm({
      title: 'Supprimer l\'actualité',
      message: 'Êtes-vous sûr de vouloir supprimer cette actualité ?',
      confirmText: 'Supprimer',
      variant: 'danger',
    })
    if (!confirmed) return

    try {
      const response = await fetch(`/api/admin/actualites/${id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        await fetchActualites()
        toast.success('Actualité supprimée avec succès')
      } else {
        toast.error('Erreur lors de la suppression')
      }
    } catch (error) {
      console.error('Erreur:', error)
      toast.error('Erreur lors de la suppression')
    }
  }

  const resetForm = () => {
    setFormData({
      titre: '',
      slug: '',
      contenu: '',
      datePubli: new Date().toISOString().split('T')[0],
      auteur: '',
      image: '',
      publie: true,
    })
    setEditingId(null)
    setShowForm(false)
  }

  const renderForm = () => (
    <div>
      <h3 className="text-xl font-bold mb-4">
        {editingId ? 'Modifier l\'actualité' : 'Nouvelle actualité'}
      </h3>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium mb-2">
              Titre *
            </label>
            <input
              type="text"
              required
              value={formData.titre}
              onChange={(e) => handleTitreChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium mb-2">
              Slug (généré automatiquement)
            </label>
            <input
              type="text"
              required
              value={formData.slug}
              onChange={(e) =>
                setFormData({ ...formData, slug: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-gray-50"
            />
            <p className="text-sm text-gray-500 mt-1">
              URL: /actualites/{formData.slug}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Date de publication *
            </label>
            <input
              type="date"
              required
              value={formData.datePubli}
              onChange={(e) =>
                setFormData({ ...formData, datePubli: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Auteur *
            </label>
            <input
              type="text"
              required
              value={formData.auteur}
              onChange={(e) =>
                setFormData({ ...formData, auteur: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              placeholder="Triton Club Cavaillon"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium mb-2">
              Image de couverture (optionnel)
            </label>
            <div className="flex gap-3">
              <input
                type="text"
                value={formData.image}
                onChange={(e) =>
                  setFormData({ ...formData, image: e.target.value })
                }
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder="URL de l'image ou uploadez un fichier"
              />
              <label className={`px-4 py-2 rounded-lg cursor-pointer transition-colors ${uploading ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-500 hover:bg-blue-600 text-white'}`}>
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
              <div className="mt-3 relative inline-block">
                <div className="relative h-24 w-36">
                  <Image
                    src={formData.image}
                    alt="Aperçu"
                    fill
                    className="rounded-lg object-cover"
                    unoptimized={formData.image.includes('blob.vercel-storage.com') || formData.image.startsWith('/uploads/')}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, image: '' })}
                  className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full text-sm hover:bg-red-600"
                >
                  ×
                </button>
              </div>
            )}
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium mb-2">
              Contenu *
            </label>
            <RichTextEditor
              value={formData.contenu}
              onChange={(contenu) => setFormData({ ...formData, contenu })}
              placeholder="Contenu de l'actualité..."
              rows={12}
            />
          </div>

          <div>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.publie}
                onChange={(e) =>
                  setFormData({ ...formData, publie: e.target.checked })
                }
                className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
              />
              <span className="text-sm font-medium">Publier l&apos;actualité</span>
            </label>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            type="submit"
            className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors"
          >
            {editingId ? 'Mettre à jour' : 'Créer'}
          </button>
          <button
            type="button"
            onClick={resetForm}
            className="px-6 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
          >
            Annuler
          </button>
        </div>
      </form>
    </div>
  )

  if (loading) {
    return <p className="text-gray-600">Chargement...</p>
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">Gestion des actualités</h2>
        <button
          onClick={() => {
            setEditingId(null)
            setShowForm(!showForm)
          }}
          className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors"
        >
          {showForm && !editingId ? 'Annuler' : '+ Nouvelle actualité'}
        </button>
      </div>

      {/* Formulaire */}
      {showForm && !editingId && (
        <div className="card p-6 mb-6">
          {renderForm()}
        </div>
      )}

      {/* Liste des actualités */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left py-3 px-4 font-semibold text-sm">
                  Date
                </th>
                <th className="text-left py-3 px-4 font-semibold text-sm">
                  Titre
                </th>
                <th className="text-left py-3 px-4 font-semibold text-sm">
                  Auteur
                </th>
                <th className="text-left py-3 px-4 font-semibold text-sm">
                  Statut
                </th>
                <th className="text-right py-3 px-4 font-semibold text-sm">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {actualites.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-8 text-gray-500">
                    Aucune actualité
                  </td>
                </tr>
              ) : (
                actualites.map((actualite) => (
                  <Fragment key={actualite.id}>
                    <tr className="hover:bg-gray-50">
                      <td className="py-3 px-4 text-sm">
                        {formatLongDateFr(actualite.datePubli)}
                      </td>
                      <td className="py-3 px-4 font-medium">
                        {actualite.titre}
                        {actualite.image && (
                          <span className="ml-2 text-xs text-gray-500">🖼️</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-600">
                        {actualite.auteur}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`text-xs px-2 py-1 rounded-full ${
                            actualite.publie
                              ? 'bg-green-100 text-green-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {actualite.publie ? 'Publié' : 'Brouillon'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => handleEdit(actualite)}
                          className="text-blue-600 hover:text-blue-800 mr-3"
                        >
                          Modifier
                        </button>
                        <button
                          onClick={() => handleDelete(actualite.id)}
                          className="text-red-600 hover:text-red-800"
                        >
                          Supprimer
                        </button>
                      </td>
                    </tr>
                    {editingId === actualite.id && (
                      <tr className="bg-gray-50">
                        <td colSpan={5} className="p-6">
                          <div className="card p-6 bg-white border border-gray-200 rounded-lg shadow-sm">
                            {renderForm()}
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
