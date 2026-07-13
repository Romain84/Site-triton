'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { useToast } from '@/hooks/useToast'
import { useConfirmDialog } from '@/components/ConfirmDialog'

function compressImage(file: File, maxWidth = 1920, maxHeight = 1080, quality = 0.8): Promise<File> {
  return new Promise((resolve) => {
    // Skip if not a compressed image type (GIF stays unchanged to preserve animation)
    if (!file.type.startsWith('image/') || file.type === 'image/gif') {
      resolve(file)
      return
    }

    const img = new window.Image()
    img.src = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(img.src)
      
      let width = img.width
      let height = img.height

      if (width > maxWidth) {
        height = Math.round((height * maxWidth) / width)
        width = maxWidth
      }
      if (height > maxHeight) {
        width = Math.round((width * maxHeight) / height)
        height = maxHeight
      }

      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height

      const ctx = canvas.getContext('2d')
      if (!ctx) {
        resolve(file)
        return
      }

      ctx.drawImage(img, 0, 0, width, height)

      // Convert to WebP format for optimal compression ratio
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            resolve(file)
            return
          }
          const newName = file.name.replace(/\.[^/.]+$/, '') + '.webp'
          const compressedFile = new File([blob], newName, {
            type: 'image/webp',
            lastModified: Date.now(),
          })
          
          if (compressedFile.size < file.size) {
            resolve(compressedFile)
          } else {
            resolve(file)
          }
        },
        'image/webp',
        quality
      )
    }
    img.onerror = () => {
      resolve(file)
    }
  })
}

interface Media {
  id: string
  titre?: string | null
  description?: string | null
  url: string
  type: string
  ordre: number
  actif: boolean
}

interface Album {
  id: string
  nom: string
  slug: string
  description?: string | null
  categorie: string
  couverture?: string | null
  ordre: number
  actif: boolean
  medias?: Media[]
}

export default function GalerieManager() {
  const toast = useToast()
  const { confirm } = useConfirmDialog()
  const [albums, setAlbums] = useState<Album[]>([])
  const [selectedAlbum, setSelectedAlbum] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [showAlbumForm, setShowAlbumForm] = useState(false)
  const [showMediaForm, setShowMediaForm] = useState(false)
  const [editingAlbumId, setEditingAlbumId] = useState<string | null>(null)
  const [editingMediaId, setEditingMediaId] = useState<string | null>(null)

  const [albumFormData, setAlbumFormData] = useState({
    nom: '',
    slug: '',
    description: '',
    categorie: 'competitions',
    couverture: '',
    ordre: 0,
    actif: true,
  })

  const [mediaFormData, setMediaFormData] = useState({
    titre: '',
    description: '',
    url: '',
    type: 'image',
    ordre: 0,
    actif: true,
  })

  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState('')
  const [uploadingMultiple, setUploadingMultiple] = useState(false)
  const [multipleUploadProgress, setMultipleUploadProgress] = useState({ current: 0, total: 0, errors: 0 })
  const [uploadingCover, setUploadingCover] = useState(false)
  const [uploadCoverProgress, setUploadCoverProgress] = useState('')

  useEffect(() => {
    fetchAlbums()
  }, [])

  const fetchAlbums = async () => {
    try {
      const response = await fetch('/api/admin/galerie/albums')
      if (response.ok) {
        const data = await response.json()
        setAlbums(data.albums)
      }
    } catch (error) {
      console.error('Erreur lors du chargement:', error)
    } finally {
      setLoading(false)
    }
  }

  const generateSlug = (nom: string) => {
    return nom
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')
  }

  const handleAlbumNomChange = (nom: string) => {
    setAlbumFormData({
      ...albumFormData,
      nom,
      slug: generateSlug(nom),
    })
  }

  const handleAlbumSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const url = editingAlbumId
      ? `/api/admin/galerie/albums/${editingAlbumId}`
      : '/api/admin/galerie/albums'
    const method = editingAlbumId ? 'PUT' : 'POST'

    try {
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...albumFormData,
          couverture: albumFormData.couverture || null,
          description: albumFormData.description || null,
        }),
      })

      if (response.ok) {
        await fetchAlbums()
        resetAlbumForm()
        toast.success(editingAlbumId ? 'Album mis à jour avec succès' : 'Album créé avec succès')
      } else {
        const error = await response.json()
        toast.error('Erreur: ' + error.error)
      }
    } catch (error) {
      console.error('Erreur:', error)
      toast.error('Erreur lors de la sauvegarde')
    }
  }

  const handleMediaSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!selectedAlbum) {
      toast.error('Veuillez sélectionner un album')
      return
    }

    const url = editingMediaId
      ? `/api/admin/galerie/medias/${editingMediaId}`
      : '/api/admin/galerie/medias'
    const method = editingMediaId ? 'PUT' : 'POST'

    try {
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...mediaFormData,
          albumId: selectedAlbum,
          titre: mediaFormData.titre || null,
          description: mediaFormData.description || null,
        }),
      })

      if (response.ok) {
        await fetchAlbums()
        resetMediaForm()
      } else {
        const error = await response.json()
        toast.error('Erreur: ' + error.error)
      }
    } catch (error) {
      console.error('Erreur:', error)
      toast.error('Erreur lors de la sauvegarde')
    }
  }

  const handleEditAlbum = (album: Album) => {
    setEditingAlbumId(album.id)
    setAlbumFormData({
      nom: album.nom,
      slug: album.slug,
      description: album.description || '',
      categorie: album.categorie,
      couverture: album.couverture || '',
      ordre: album.ordre,
      actif: album.actif,
    })
    setShowAlbumForm(true)
  }

  const handleEditMedia = (media: Media) => {
    setEditingMediaId(media.id)
    setMediaFormData({
      titre: media.titre || '',
      description: media.description || '',
      url: media.url,
      type: media.type,
      ordre: media.ordre,
      actif: media.actif,
    })
    setShowMediaForm(true)
  }

  const handleDeleteAlbum = async (id: string) => {
    const confirmed = await confirm({
      title: 'Supprimer l\'album',
      message: 'Êtes-vous sûr de vouloir supprimer cet album et tous ses médias ? Cette action est irréversible.',
      confirmText: 'Supprimer',
      cancelText: 'Annuler',
      variant: 'danger',
    })
    if (!confirmed) return

    try {
      const response = await fetch(`/api/admin/galerie/albums/${id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        await fetchAlbums()
        if (selectedAlbum === id) setSelectedAlbum(null)
      } else {
        toast.error('Erreur lors de la suppression')
      }
    } catch (error) {
      console.error('Erreur:', error)
      toast.error('Erreur lors de la suppression')
    }
  }

  const handleDeleteMedia = async (id: string) => {
    const confirmed = await confirm({
      title: 'Supprimer le média',
      message: 'Êtes-vous sûr de vouloir supprimer ce média ?',
      confirmText: 'Supprimer',
      cancelText: 'Annuler',
      variant: 'danger',
    })
    if (!confirmed) return

    try {
      const response = await fetch(`/api/admin/galerie/medias/${id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        await fetchAlbums()
      } else {
        toast.error('Erreur lors de la suppression')
      }
    } catch (error) {
      console.error('Erreur:', error)
      toast.error('Erreur lors de la suppression')
    }
  }

  const resetAlbumForm = () => {
    setAlbumFormData({
      nom: '',
      slug: '',
      description: '',
      categorie: 'competitions',
      couverture: '',
      ordre: 0,
      actif: true,
    })
    setEditingAlbumId(null)
    setShowAlbumForm(false)
  }

  const resetMediaForm = () => {
    setMediaFormData({
      titre: '',
      description: '',
      url: '',
      type: 'image',
      ordre: 0,
      actif: true,
    })
    setEditingMediaId(null)
    setShowMediaForm(false)
    setUploadProgress('')
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const originalFile = e.target.files?.[0]
    if (!originalFile) return

    setUploading(true)
    setUploadProgress('Optimisation de l\'image...')

    try {
      const file = await compressImage(originalFile)
      setUploadProgress('Upload en cours...')
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/admin/galerie/upload', {
        method: 'POST',
        body: formData,
      })

      if (response.ok) {
        const data = await response.json()
        setMediaFormData({
          ...mediaFormData,
          url: data.url,
          type: data.type,
        })
        setUploadProgress('Upload réussi ✓')
        setTimeout(() => setUploadProgress(''), 3000)
      } else {
        const error = await response.json()
        setUploadProgress('Erreur: ' + error.error)
      }
    } catch (error) {
      console.error('Erreur upload:', error)
      setUploadProgress('Erreur lors de l\'upload')
    } finally {
      setUploading(false)
    }
  }

  const handleMultipleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    if (!selectedAlbum) {
      toast.error('Veuillez sélectionner un album')
      return
    }

    setUploadingMultiple(true)
    setMultipleUploadProgress({ current: 0, total: files.length, errors: 0 })

    let successCount = 0
    let errorCount = 0

    for (let i = 0; i < files.length; i++) {
      const originalFile = files[i]
      setMultipleUploadProgress(prev => ({ ...prev, current: i + 1 }))

      try {
        // Optimiser l'image avant l'upload
        const file = await compressImage(originalFile)
        
        // Upload du fichier
        const formData = new FormData()
        formData.append('file', file)

        const uploadResponse = await fetch('/api/admin/galerie/upload', {
          method: 'POST',
          body: formData,
        })

        if (!uploadResponse.ok) {
          errorCount++
          continue
        }

        const uploadData = await uploadResponse.json()

        // Créer le média dans la base de données
        const mediaResponse = await fetch('/api/admin/galerie/medias', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            albumId: selectedAlbum,
            url: uploadData.url,
            type: uploadData.type,
            titre: file.name.replace(/\.[^/.]+$/, ''), // Nom sans extension
            description: null,
            ordre: (currentAlbum?.medias?.length || 0) + i,
            actif: true,
          }),
        })

        if (mediaResponse.ok) {
          successCount++
        } else {
          errorCount++
        }
      } catch (error) {
        console.error('Erreur upload:', error)
        errorCount++
      }

      setMultipleUploadProgress(prev => ({ ...prev, errors: errorCount }))
    }

    setUploadingMultiple(false)

    // Reset file input
    e.target.value = ''

    // Rafraîchir les albums
    await fetchAlbums()

    if (successCount > 0) {
      toast.success(`${successCount} média(s) ajouté(s) avec succès`)
    }
    if (errorCount > 0) {
      toast.error(`${errorCount} fichier(s) en erreur`)
    }

    // Reset progress after delay
    setTimeout(() => {
      setMultipleUploadProgress({ current: 0, total: 0, errors: 0 })
    }, 3000)
  }

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const originalFile = e.target.files?.[0]
    if (!originalFile) return

    setUploadingCover(true)
    setUploadCoverProgress('Optimisation de l\'image...')

    try {
      const file = await compressImage(originalFile)
      setUploadCoverProgress('Upload en cours...')
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/admin/galerie/upload', {
        method: 'POST',
        body: formData,
      })

      if (response.ok) {
        const data = await response.json()
        setAlbumFormData({
          ...albumFormData,
          couverture: data.url,
        })
        setUploadCoverProgress('Upload réussi ✓')
        setTimeout(() => setUploadCoverProgress(''), 3000)
      } else {
        const error = await response.json()
        setUploadCoverProgress('Erreur: ' + error.error)
      }
    } catch (error) {
      console.error('Erreur upload:', error)
      setUploadCoverProgress('Erreur lors de l\'upload')
    } finally {
      setUploadingCover(false)
    }
  }

  const currentAlbum = albums.find(a => a.id === selectedAlbum)

  if (loading) {
    return <p className="text-gray-600">Chargement...</p>
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">Gestion de la Galerie</h2>
        <button
          onClick={() => setShowAlbumForm(!showAlbumForm)}
          className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors"
        >
          {showAlbumForm ? 'Annuler' : '+ Nouvel album'}
        </button>
      </div>

      {/* Formulaire Album */}
      {showAlbumForm && (
        <div className="card p-6 mb-6">
          <h3 className="text-xl font-bold mb-4">
            {editingAlbumId ? 'Modifier l\'album' : 'Nouvel album'}
          </h3>
          <form onSubmit={handleAlbumSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-2">Nom *</label>
                <input
                  type="text"
                  required
                  value={albumFormData.nom}
                  onChange={(e) => handleAlbumNomChange(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-2">Slug</label>
                <input
                  type="text"
                  required
                  value={albumFormData.slug}
                  onChange={(e) =>
                    setAlbumFormData({ ...albumFormData, slug: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-gray-50"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Catégorie *</label>
                <select
                  required
                  value={albumFormData.categorie}
                  onChange={(e) =>
                    setAlbumFormData({ ...albumFormData, categorie: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                >
                  <option value="competitions">Compétitions</option>
                  <option value="entrainements">Entraînements</option>
                  <option value="evenements">Événements</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Ordre</label>
                <input
                  type="number"
                  value={albumFormData.ordre}
                  onChange={(e) =>
                    setAlbumFormData({ ...albumFormData, ordre: parseInt(e.target.value) })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-2">
                  Image de couverture
                </label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
                  <div className="flex items-center gap-4">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleCoverUpload}
                      disabled={uploadingCover}
                      className="hidden"
                      id="cover-upload"
                    />
                    <label
                      htmlFor="cover-upload"
                      className={`inline-flex items-center px-4 py-2 bg-gray-100 text-gray-700 rounded-lg cursor-pointer hover:bg-gray-200 transition-colors ${
                        uploadingCover ? 'opacity-50 cursor-not-allowed' : ''
                      }`}
                    >
                      📷 {uploadingCover ? 'Upload en cours...' : 'Choisir une image'}
                    </label>
                    {uploadCoverProgress && (
                      <p className="text-sm text-gray-600">{uploadCoverProgress}</p>
                    )}
                  </div>
                  <input
                    type="text"
                    value={albumFormData.couverture}
                    onChange={(e) =>
                      setAlbumFormData({ ...albumFormData, couverture: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent mt-3"
                    placeholder="Ou saisir une URL..."
                  />
                </div>
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-2">Description</label>
                <textarea
                  value={albumFormData.description}
                  onChange={(e) =>
                    setAlbumFormData({ ...albumFormData, description: e.target.value })
                  }
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>

              <div>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={albumFormData.actif}
                    onChange={(e) =>
                      setAlbumFormData({ ...albumFormData, actif: e.target.checked })
                    }
                    className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
                  />
                  <span className="text-sm font-medium">Album actif</span>
                </label>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                type="submit"
                className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors"
              >
                {editingAlbumId ? 'Mettre à jour' : 'Créer'}
              </button>
              <button
                type="button"
                onClick={resetAlbumForm}
                className="px-6 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
              >
                Annuler
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Liste des albums et médias */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Liste des albums */}
        <div className="lg:col-span-1">
          <h3 className="font-bold text-lg mb-4">Albums</h3>
          <div className="space-y-2">
            {albums.length === 0 ? (
              <p className="text-gray-500 text-sm">Aucun album</p>
            ) : (
              albums.map((album) => (
                <div
                  key={album.id}
                  className={`card p-4 cursor-pointer transition-colors ${
                    selectedAlbum === album.id ? 'bg-primary/10 border-primary' : ''
                  }`}
                  onClick={() => setSelectedAlbum(album.id)}
                >
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex-1">
                      <h4 className="font-bold">{album.nom}</h4>
                      <p className="text-xs text-gray-600">{album.categorie}</p>
                      <p className="text-xs text-gray-500">
                        {album.medias?.length || 0} média(s)
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleEditAlbum(album)
                        }}
                        className="text-blue-600 hover:text-blue-800 text-sm"
                      >
                        ✏️
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDeleteAlbum(album.id)
                        }}
                        className="text-red-600 hover:text-red-800 text-sm"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Médias de l&apos;album sélectionné */}
        <div className="lg:col-span-2">
          {selectedAlbum && currentAlbum ? (
            <>
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-lg">
                  Médias - {currentAlbum.nom}
                </h3>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowMediaForm(!showMediaForm)}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
                  >
                    {showMediaForm ? 'Annuler' : '+ Ajouter un média'}
                  </button>
                </div>
              </div>

              {/* Zone d&apos;upload multiple rapide */}
              <div className="card p-4 mb-6 bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-dashed border-blue-300">
                <div className="flex flex-col items-center text-center">
                  <input
                    type="file"
                    accept="image/*,video/mp4,video/webm"
                    onChange={handleMultipleFileUpload}
                    disabled={uploadingMultiple}
                    multiple
                    className="hidden"
                    id="multiple-file-upload"
                  />
                  <label
                    htmlFor="multiple-file-upload"
                    className={`inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg cursor-pointer hover:bg-blue-700 transition-colors font-medium ${
                      uploadingMultiple ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                  >
                    <span className="text-xl">📸</span>
                    {uploadingMultiple ? 'Upload en cours...' : 'Ajouter plusieurs médias'}
                  </label>
                  <p className="text-sm text-gray-600 mt-2">
                    Sélectionnez plusieurs fichiers à la fois (images ou vidéos)
                  </p>
                  {uploadingMultiple && (
                    <div className="mt-3 w-full max-w-xs">
                      <div className="flex justify-between text-sm text-gray-600 mb-1">
                        <span>Progression</span>
                        <span>{multipleUploadProgress.current} / {multipleUploadProgress.total}</span>
                      </div>
                      <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-600 transition-all duration-300"
                          style={{ width: `${(multipleUploadProgress.current / multipleUploadProgress.total) * 100}%` }}
                        />
                      </div>
                      {multipleUploadProgress.errors > 0 && (
                        <p className="text-xs text-red-600 mt-1">
                          {multipleUploadProgress.errors} erreur(s)
                        </p>
                      )}
                    </div>
                  )}
                  {!uploadingMultiple && multipleUploadProgress.total > 0 && (
                    <p className="text-sm text-green-600 mt-2 font-medium">
                      ✓ {multipleUploadProgress.total - multipleUploadProgress.errors} fichier(s) ajouté(s)
                    </p>
                  )}
                </div>
              </div>

              {/* Formulaire média */}
              {showMediaForm && (
                <div className="card p-6 mb-6">
                  <h4 className="font-bold mb-4">
                    {editingMediaId ? 'Modifier le média' : 'Nouveau média'}
                  </h4>
                  <form onSubmit={handleMediaSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium mb-2">
                          Uploader un fichier
                        </label>
                        <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
                          <input
                            type="file"
                            accept="image/*,video/mp4,video/webm"
                            onChange={handleFileUpload}
                            disabled={uploading}
                            className="hidden"
                            id="file-upload"
                          />
                          <label
                            htmlFor="file-upload"
                            className={`inline-flex items-center px-4 py-2 bg-gray-100 text-gray-700 rounded-lg cursor-pointer hover:bg-gray-200 transition-colors ${
                              uploading ? 'opacity-50 cursor-not-allowed' : ''
                            }`}
                          >
                            📁 {uploading ? 'Upload en cours...' : 'Choisir un fichier'}
                          </label>
                          {uploadProgress && (
                            <p className="text-sm mt-2 text-gray-600">{uploadProgress}</p>
                          )}
                          <p className="text-xs text-gray-500 mt-2">
                            Images: JPG, PNG, GIF, WebP • Vidéos: MP4, WebM • Max 10MB
                          </p>
                        </div>
                      </div>

                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium mb-2">
                          Ou saisir une URL *
                        </label>
                        <input
                          type="text"
                          required
                          value={mediaFormData.url}
                          onChange={(e) =>
                            setMediaFormData({ ...mediaFormData, url: e.target.value })
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                          placeholder="/images/galerie/photo.jpg ou https://youtube.com/..."
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          L&apos;URL sera automatiquement remplie après upload d&apos;un fichier
                        </p>
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-2">Type *</label>
                        <select
                          required
                          value={mediaFormData.type}
                          onChange={(e) =>
                            setMediaFormData({ ...mediaFormData, type: e.target.value })
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                        >
                          <option value="image">Image</option>
                          <option value="video">Vidéo</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-2">Ordre</label>
                        <input
                          type="number"
                          value={mediaFormData.ordre}
                          onChange={(e) =>
                            setMediaFormData({
                              ...mediaFormData,
                              ordre: parseInt(e.target.value),
                            })
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                        />
                      </div>

                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium mb-2">Titre</label>
                        <input
                          type="text"
                          value={mediaFormData.titre}
                          onChange={(e) =>
                            setMediaFormData({ ...mediaFormData, titre: e.target.value })
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                        />
                      </div>

                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium mb-2">Description</label>
                        <textarea
                          value={mediaFormData.description}
                          onChange={(e) =>
                            setMediaFormData({
                              ...mediaFormData,
                              description: e.target.value,
                            })
                          }
                          rows={2}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                        />
                      </div>

                      <div>
                        <label className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={mediaFormData.actif}
                            onChange={(e) =>
                              setMediaFormData({
                                ...mediaFormData,
                                actif: e.target.checked,
                              })
                            }
                            className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
                          />
                          <span className="text-sm font-medium">Média actif</span>
                        </label>
                      </div>
                    </div>

                    <div className="flex gap-3">
                      <button
                        type="submit"
                        className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors"
                      >
                        {editingMediaId ? 'Mettre à jour' : 'Ajouter'}
                      </button>
                      <button
                        type="button"
                        onClick={resetMediaForm}
                        className="px-6 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
                      >
                        Annuler
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* Liste des médias */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {currentAlbum.medias && currentAlbum.medias.length > 0 ? (
                  currentAlbum.medias.map((media) => (
                    <div key={media.id} className="card p-4">
                      <div className="relative aspect-video bg-gray-200 rounded mb-2 flex items-center justify-center overflow-hidden">
                        {media.type === 'image' ? (
                          media.url ? (
                            <Image
                              src={media.url}
                              alt={media.titre || 'Image'}
                              fill
                              className="object-cover"
                              unoptimized={media.url.includes('blob.vercel-storage.com')}
                            />
                          ) : (
                            <span className="text-4xl">🖼️</span>
                          )
                        ) : media.url ? (
                          <video
                            src={media.url}
                            className="w-full h-full object-cover"
                            controls
                          />
                        ) : (
                          <span className="text-4xl">🎬</span>
                        )}
                      </div>
                      <p className="font-medium text-sm mb-1">
                        {media.titre || 'Sans titre'}
                      </p>
                      <p className="text-xs text-gray-600 mb-2">
                        {media.description || 'Pas de description'}
                      </p>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEditMedia(media)}
                          className="text-blue-600 hover:text-blue-800 text-sm"
                        >
                          Modifier
                        </button>
                        <button
                          onClick={() => handleDeleteMedia(media.id)}
                          className="text-red-600 hover:text-red-800 text-sm"
                        >
                          Supprimer
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-gray-500 text-sm col-span-2">Aucun média dans cet album</p>
                )}
              </div>
            </>
          ) : (
            <div className="card p-8 text-center text-gray-500">
              Sélectionnez un album pour voir et gérer ses médias
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
