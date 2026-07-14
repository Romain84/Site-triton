'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import toast from 'react-hot-toast'
import AdminLayout from '@/components/admin/AdminLayout'
import { ConfirmDialogProvider, useConfirmDialog } from '@/components/ConfirmDialog'
import { ProduitForm, CategorieForm, FournisseurForm, VarianteForm, ProduitRow, CommandeRow } from './components'
import { generateCommandePDF, generateRecapFournisseurPDF } from '@/lib/pdf'
import type { Categorie, Produit, Fournisseur, Variante, Commande, RecapFournisseur } from './types'

function BoutiquePageContent() {
  const [activeTab, setActiveTab] = useState<'produits' | 'categories' | 'fournisseurs' | 'commandes' | 'recap-fournisseur'>('produits')
  const [produits, setProduits] = useState<Produit[]>([])
  const [categories, setCategories] = useState<Categorie[]>([])
  const [fournisseurs, setFournisseurs] = useState<Fournisseur[]>([])
  const [commandes, setCommandes] = useState<Commande[]>([])
  const [recapFournisseur, setRecapFournisseur] = useState<RecapFournisseur | null>(null)
  const [dateDebut, setDateDebut] = useState('')
  const [dateFin, setDateFin] = useState('')
  const [statutRecap, setStatutRecap] = useState('all')
  const [selectedFournisseur, setSelectedFournisseur] = useState('all')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const router = useRouter()
  const { confirm } = useConfirmDialog()

  // Filtres et recherche produits
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('all')
  const [selectedStockFilter, setSelectedStockFilter] = useState('all')

  // Formulaires
  const [showProduitForm, setShowProduitForm] = useState(false)
  const [showCategorieForm, setShowCategorieForm] = useState(false)
  const [showFournisseurForm, setShowFournisseurForm] = useState(false)
  const [editingProduit, setEditingProduit] = useState<Produit | null>(null)
  const [editingCategorie, setEditingCategorie] = useState<Categorie | null>(null)
  const [editingFournisseur, setEditingFournisseur] = useState<Fournisseur | null>(null)

  // Gestion des variantes
  const [showVariantesModal, setShowVariantesModal] = useState(false)
  const [selectedProduit, setSelectedProduit] = useState<Produit | null>(null)
  const [variantes, setVariantes] = useState<Variante[]>([])
  const [editingVariante, setEditingVariante] = useState<Variante | null>(null)
  const [showVarianteForm, setShowVarianteForm] = useState(false)
  const [bulkTailles, setBulkTailles] = useState('')
  const [bulkCouleurs, setBulkCouleurs] = useState('')
  const [generatingBulk, setGeneratingBulk] = useState(false)

  // Détail commande
  const [selectedCommande, setSelectedCommande] = useState<Commande | null>(null)

  const loadRecapFournisseur = useCallback(async () => {
    try {
      const params = new URLSearchParams()
      if (dateDebut) params.append('dateDebut', dateDebut)
      if (dateFin) params.append('dateFin', dateFin)
      if (statutRecap && statutRecap !== 'all') params.append('statut', statutRecap)
      if (selectedFournisseur && selectedFournisseur !== 'all') params.append('fournisseurId', selectedFournisseur)

      const res = await fetch(`/api/admin/boutique/recap-fournisseur?${params}`, { credentials: 'include' })
      const data = await res.json()
      if (res.ok) {
        setRecapFournisseur(data)
      } else {
        setError(data.error || 'Erreur lors du chargement du récapitulatif')
      }
    } catch (err) {
      setError('Erreur de connexion')
    }
  }, [dateDebut, dateFin, statutRecap, selectedFournisseur])

  const loadCategories = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/boutique/categories', { credentials: 'include' })
      const data = await res.json()
      if (res.ok) {
        setCategories(data.categories)
      }
    } catch (err) {
      setError('Erreur de chargement des catégories')
    }
  }, [])

  const loadFournisseurs = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/boutique/fournisseurs', { credentials: 'include' })
      const data = await res.json()
      if (res.ok) {
        setFournisseurs(data.fournisseurs)
      }
    } catch (err) {
      setError('Erreur de chargement des fournisseurs')
    }
  }, [])

  const loadData = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      if (activeTab === 'produits') {
        const res = await fetch('/api/admin/boutique/produits', { credentials: 'include' })
        const data = await res.json()
        if (res.ok) {
          setProduits(data.produits)
        } else if (res.status === 401) {
          router.push('/admin/login')
        } else {
          setError(data.error || 'Erreur lors du chargement des produits')
        }
      } else if (activeTab === 'categories') {
        await loadCategories()
      } else if (activeTab === 'fournisseurs') {
        await loadFournisseurs()
      } else if (activeTab === 'commandes') {
        const res = await fetch('/api/admin/boutique/commandes', { credentials: 'include' })
        const data = await res.json()
        if (res.ok) {
          setCommandes(data.commandes)
        } else if (res.status === 401) {
          router.push('/admin/login')
        } else {
          setError(data.error || 'Erreur lors du chargement des commandes')
        }
      } else if (activeTab === 'recap-fournisseur') {
        await loadRecapFournisseur()
      }
    } catch (err) {
      setError('Erreur de connexion')
    } finally {
      setLoading(false)
    }
  }, [activeTab, router, loadRecapFournisseur, loadCategories, loadFournisseurs])

  useEffect(() => {
    // Charger categories et fournisseurs une fois au montage pour que les formulaires soient pré-remplis
    loadCategories()
    loadFournisseurs()
  }, [loadCategories, loadFournisseurs])

  useEffect(() => {
    loadData()
  }, [loadData])

  const handleUpdateStatut = useCallback(async (id: string, statut: string) => {
    try {
      const res = await fetch(`/api/admin/boutique/commandes/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ statut }),
        credentials: 'include',
      })
      const data = await res.json()
      if (res.ok) {
        loadData()
        toast.success('Statut mis à jour')
      } else {
        toast.error(data.error || 'Erreur lors de la mise à jour')
      }
    } catch (err) {
      toast.error('Erreur de connexion')
    }
  }, [loadData])

  const handleDeleteCommande = useCallback(async (id: string, numero: string) => {
    const confirmed = await confirm({
      title: 'Supprimer la commande',
      message: `Êtes-vous sûr de vouloir supprimer définitivement la commande #${numero} ? Cela va également restaurer le stock si le paiement était en attente. Cette action est irréversible.`,
      confirmText: 'Supprimer',
      variant: 'danger',
    })
    if (!confirmed) return

    try {
      const res = await fetch(`/api/admin/boutique/commandes/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      })
      const data = await res.json()
      if (res.ok) {
        loadData()
        toast.success(`Commande #${numero} supprimée`)
      } else {
        toast.error(data.error || 'Erreur lors de la suppression')
      }
    } catch (err) {
      toast.error('Erreur de connexion')
    }
  }, [confirm, loadData])

  const handleDeleteProduit = useCallback(async (id: string) => {
    const confirmed = await confirm({
      title: 'Supprimer le produit',
      message: 'Êtes-vous sûr de vouloir supprimer ce produit ? Cette action est irréversible.',
      confirmText: 'Supprimer',
      variant: 'danger',
    })
    if (!confirmed) return

    try {
      const res = await fetch(`/api/admin/boutique/produits/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      })
      const data = await res.json()
      if (res.ok) {
        loadData()
        toast.success('Produit supprimé')
      } else {
        toast.error(data.error || 'Erreur lors de la suppression')
      }
    } catch (err) {
      toast.error('Erreur de connexion')
    }
  }, [confirm, loadData])

  const handleDeleteCategorie = useCallback(async (id: string) => {
    const confirmed = await confirm({
      title: 'Supprimer la catégorie',
      message: 'Êtes-vous sûr de vouloir supprimer cette catégorie ? Les produits associés seront détachés.',
      confirmText: 'Supprimer',
      variant: 'danger',
    })
    if (!confirmed) return

    try {
      const res = await fetch(`/api/admin/boutique/categories/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      })
      const data = await res.json()
      if (res.ok) {
        loadData()
        toast.success('Catégorie supprimée')
      } else {
        toast.error(data.error || 'Erreur lors de la suppression')
      }
    } catch (err) {
      toast.error('Erreur de connexion')
    }
  }, [confirm, loadData])

  const loadVariantes = useCallback(async (produitId: string) => {
    try {
      const res = await fetch(`/api/admin/boutique/produits/${produitId}/variantes`, { credentials: 'include' })
      const data = await res.json()
      if (res.ok) {
        setVariantes(data.variantes)
      } else {
        toast.error(data.error || 'Erreur lors du chargement des variantes')
      }
    } catch (err) {
      toast.error('Erreur de connexion')
    }
  }, [])

  const handleShowVariantes = useCallback(async (produit: Produit) => {
    setSelectedProduit(produit)
    setShowVariantesModal(true)
    await loadVariantes(produit.id)
  }, [loadVariantes])

  const handleBulkGenerate = async () => {
    if (!selectedProduit) return
    if (!bulkTailles.trim() && !bulkCouleurs.trim()) {
      toast.error('Veuillez saisir au moins une taille ou une couleur')
      return
    }

    setGeneratingBulk(true)
    try {
      const arrayTailles = bulkTailles.trim() ? bulkTailles.split(',').map((t) => t.trim()).filter(Boolean) : []
      const arrayCouleurs = bulkCouleurs.trim() ? bulkCouleurs.split(',').map((c) => c.trim()).filter(Boolean) : []

      const res = await fetch(`/api/admin/boutique/produits/${selectedProduit.id}/variantes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bulk: true,
          tailles: arrayTailles,
          couleurs: arrayCouleurs,
        }),
        credentials: 'include',
      })

      const data = await res.json()
      if (res.ok) {
        toast.success(data.message || 'Variantes générées')
        setBulkTailles('')
        setBulkCouleurs('')
        loadVariantes(selectedProduit.id)
      } else {
        toast.error(data.error || 'Erreur de génération')
      }
    } catch (err) {
      toast.error('Erreur réseau')
    } finally {
      setGeneratingBulk(false)
    }
  }

  const handleEditProduit = useCallback((produit: Produit) => {
    setEditingProduit(produit)
    setShowProduitForm(true)
  }, [])

  const handleGoToEditProduit = useCallback(async (produitId: string) => {
    setSelectedCommande(null)
    let target = produits.find((p) => p.id === produitId)
    
    if (!target) {
      try {
        const res = await fetch(`/api/admin/boutique/produits/${produitId}`, { credentials: 'include' })
        if (res.ok) {
          const data = await res.json()
          target = data.produit
        }
      } catch (err) {
        console.error("Erreur chargement produit", err)
      }
    }
    
    if (target) {
      setEditingProduit(target)
      setShowProduitForm(true)
      setActiveTab('produits')
    } else {
      toast.error("Impossible d'accéder à ce produit (il a peut-être été supprimé).")
    }
  }, [produits])

  const handleShowCommandeDetails = useCallback((commande: Commande) => {
    setSelectedCommande(commande)
  }, [])

  const handleExportCommandePDF = useCallback((commande: Commande) => {
    const doc = generateCommandePDF({
      numeroCommande: commande.numeroCommande,
      date: commande.createdAt,
      prenom: commande.prenom,
      nom: commande.nom,
      email: commande.email,
      prenomNageur: commande.prenomNageur,
      nomNageur: commande.nomNageur,
      telephone: commande.telephone,
      lignes: commande.lignes.map((l) => ({
        nom: l.produit.nom,
        quantite: l.quantite,
        prixUnitaire: l.prixUnitaire,
        taille: l.taille,
        couleur: l.couleur,
        textePersonnalise: l.textePersonnalise,
      })),
      total: commande.total,
      statut: commande.statut,
      statutPaiement: commande.statutPaiement,
    })
    doc.save(`commande-${commande.numeroCommande}.pdf`)
    toast.success('PDF téléchargé')
  }, [])

  const handleExportRecapPDF = useCallback(() => {
    if (!recapFournisseur) return
    const doc = generateRecapFournisseurPDF({
      dateDebut,
      dateFin,
      recap: recapFournisseur.recap,
      totaux: recapFournisseur.totaux,
      nbCommandes: recapFournisseur.nbCommandes,
    })
    doc.save(`recap-fournisseur-${new Date().toISOString().split('T')[0]}.pdf`)
    toast.success('PDF téléchargé')
  }, [recapFournisseur, dateDebut, dateFin])

  const handleDeleteVariante = useCallback(async (id: string) => {
    const confirmed = await confirm({
      title: 'Supprimer la variante',
      message: 'Êtes-vous sûr de vouloir supprimer cette variante ?',
      confirmText: 'Supprimer',
      variant: 'danger',
    })
    if (!confirmed) return

    try {
      const res = await fetch(`/api/admin/boutique/variantes/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      })
      if (res.ok) {
        if (selectedProduit) {
          await loadVariantes(selectedProduit.id)
        }
        toast.success('Variante supprimée')
      } else {
        const data = await res.json()
        toast.error(data.error || 'Erreur lors de la suppression')
      }
    } catch (err) {
      toast.error('Erreur de connexion')
    }
  }, [confirm, selectedProduit, loadVariantes])

  const handleDeleteFournisseur = useCallback(async (id: string) => {
    const confirmed = await confirm({
      title: 'Supprimer le fournisseur',
      message: 'Êtes-vous sûr de vouloir supprimer ce fournisseur ? Cette action est irréversible.',
      confirmText: 'Supprimer',
      variant: 'danger',
    })
    if (!confirmed) return

    try {
      const res = await fetch(`/api/admin/boutique/fournisseurs/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      })
      const data = await res.json()
      if (res.ok) {
        loadFournisseurs()
        toast.success('Fournisseur supprimé')
      } else {
        toast.error(data.error || 'Erreur lors de la suppression')
      }
    } catch (err) {
      toast.error('Erreur de connexion')
    }
  }, [confirm, loadFournisseurs])

  const filteredProduits = useMemo(() => {
    return produits.filter((p) => {
      // 1. Recherche textuelle
      if (searchQuery.trim() !== '') {
        const query = searchQuery.toLowerCase().trim()
        const matchName = p.nom.toLowerCase().includes(query)
        const matchSlug = p.slug.toLowerCase().includes(query)
        if (!matchName && !matchSlug) return false
      }

      // 2. Filtre catégorie
      if (selectedCategoryFilter !== 'all') {
        if (p.categorieId !== selectedCategoryFilter) return false
      }

      // 3. Filtre stock
      if (selectedStockFilter !== 'all') {
        if (!p.gererStock || p.stockIllimite) {
          if (selectedStockFilter === 'bas' || selectedStockFilter === 'rupture') return false
        } else {
          const hasVariants = p.variantes && p.variantes.length > 0
          if (selectedStockFilter === 'rupture') {
            if (hasVariants && p.variantes) {
              const allOut = p.variantes.every((v) => !v.actif || v.stock === 0)
              if (!allOut) return false
            } else {
              if (p.stock !== 0) return false
            }
          } else if (selectedStockFilter === 'bas') {
            if (hasVariants && p.variantes) {
              const hasLow = p.variantes.some((v) => v.actif && v.stock <= 5)
              if (!hasLow) return false
            } else {
              if (p.stock === 0 || p.stock > 5) return false
            }
          }
        }
      }

      return true
    })
  }, [produits, searchQuery, selectedCategoryFilter, selectedStockFilter])

  return (
    <AdminLayout>
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Boutique</h1>
          <p className="text-gray-600">Gérez les produits, catégories et fournisseurs de la boutique</p>
        </div>

        {/* Tabs */}
        <div className="flex space-x-4 mb-6 border-b">
          <button
            onClick={() => setActiveTab('produits')}
            className={`px-4 py-2 font-medium ${
              activeTab === 'produits'
                ? 'text-primary border-b-2 border-primary'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Produits ({produits.length})
          </button>
          <button
            onClick={() => setActiveTab('categories')}
            className={`px-4 py-2 font-medium ${
              activeTab === 'categories'
                ? 'text-primary border-b-2 border-primary'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Catégories ({categories.length})
          </button>
          <button
            onClick={() => setActiveTab('fournisseurs')}
            className={`px-4 py-2 font-medium ${
              activeTab === 'fournisseurs'
                ? 'text-primary border-b-2 border-primary'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Fournisseurs ({fournisseurs.length})
          </button>
          <button
            onClick={() => setActiveTab('commandes')}
            className={`px-4 py-2 font-medium ${
              activeTab === 'commandes'
                ? 'text-primary border-b-2 border-primary'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Commandes ({commandes.length})
          </button>
          <button
            onClick={() => setActiveTab('recap-fournisseur')}
            className={`px-4 py-2 font-medium ${
              activeTab === 'recap-fournisseur'
                ? 'text-primary border-b-2 border-primary'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            📊 Récap Fournisseur
          </button>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 p-4 rounded-lg mb-6">
            {error}
          </div>
        )}

        {/* Actions */}
        <div className="mb-6">
          {activeTab === 'produits' ? (
            <button
              onClick={() => {
                setEditingProduit(null)
                setShowProduitForm(true)
              }}
              className="bg-primary text-white px-6 py-2 rounded-lg hover:bg-primary-dark"
            >
              + Nouveau produit
            </button>
          ) : activeTab === 'categories' ? (
            <button
              onClick={() => {
                setEditingCategorie(null)
                setShowCategorieForm(true)
              }}
              className="bg-primary text-white px-6 py-2 rounded-lg hover:bg-primary-dark"
            >
              + Nouvelle catégorie
            </button>
          ) : activeTab === 'fournisseurs' ? (
            <button
              onClick={() => {
                setEditingFournisseur(null)
                setShowFournisseurForm(true)
              }}
              className="bg-primary text-white px-6 py-2 rounded-lg hover:bg-primary-dark"
            >
              + Nouveau fournisseur
            </button>
          ) : null}
        </div>

        {/* Liste des produits */}
        {activeTab === 'produits' && (
          <div className="space-y-4">
            {/* Barre de filtres et recherche */}
            <div className="card p-4 flex flex-col md:flex-row gap-4 items-center justify-between">
              <div className="flex-1 w-full relative">
                <input
                  type="text"
                  placeholder="Rechercher par nom ou slug..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary/20 text-sm"
                />
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">
                  🔍
                </span>
              </div>
              <div className="flex flex-wrap gap-4 w-full md:w-auto">
                <div className="flex items-center gap-2">
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Catégorie :</label>
                  <select
                    value={selectedCategoryFilter}
                    onChange={(e) => setSelectedCategoryFilter(e.target.value)}
                    className="px-3 py-1.5 border border-slate-200 rounded-lg bg-white text-sm"
                  >
                    <option value="all">Toutes</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nom}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Stock :</label>
                  <select
                    value={selectedStockFilter}
                    onChange={(e) => setSelectedStockFilter(e.target.value)}
                    className="px-3 py-1.5 border border-slate-200 rounded-lg bg-white text-sm"
                  >
                    <option value="all">Tous</option>
                    <option value="bas">⚠️ Stock bas (≤ 5)</option>
                    <option value="rupture">🛑 En rupture (0)</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="card overflow-hidden">
              {loading ? (
                <div className="p-8 text-center text-gray-600">Chargement...</div>
              ) : produits.length === 0 ? (
                <div className="p-8 text-center text-gray-600">
                  Aucun produit. Créez votre premier produit !
                </div>
              ) : filteredProduits.length === 0 ? (
                <div className="p-8 text-center text-gray-600">
                  Aucun produit ne correspond à vos filtres de recherche.
                </div>
              ) : (
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left p-4">Image</th>
                      <th className="text-left p-4">Nom</th>
                      <th className="text-left p-4">Catégorie</th>
                      <th className="text-right p-4">Prix Achat HT</th>
                      <th className="text-right p-4">Prix Vente TTC</th>
                      <th className="text-right p-4">Bénéfice (HT)</th>
                      <th className="text-left p-4">Stock</th>
                      <th className="text-left p-4">Statut</th>
                      <th className="text-left p-4">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredProduits.map((produit) => (
                      <ProduitRow
                        key={produit.id}
                        produit={produit}
                        onEdit={handleEditProduit}
                        onDelete={handleDeleteProduit}
                        onShowVariantes={handleShowVariantes}
                      />
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {/* Liste des catégories */}
        {activeTab === 'categories' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {loading ? (
              <div className="col-span-full p-8 text-center text-gray-600">
                Chargement...
              </div>
            ) : categories.length === 0 ? (
              <div className="col-span-full p-8 text-center text-gray-600">
                Aucune catégorie. Créez votre première catégorie !
              </div>
            ) : (
              categories.map((categorie) => (
                <div key={categorie.id} className="card">
                  {categorie.image && (
                    <div className="relative w-full h-48">
                      <Image
                        src={categorie.image}
                        alt={categorie.nom}
                        fill
                        className="object-cover rounded-t-lg"
                        unoptimized={categorie.image.includes('blob.vercel-storage.com') || categorie.image.startsWith('/uploads/')}
                      />
                    </div>
                  )}
                  <div className="p-6">
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="text-xl font-bold">{categorie.nom}</h3>
                      <span
                        className={`px-2 py-1 rounded text-xs ${
                          categorie.actif
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {categorie.actif ? 'Actif' : 'Inactif'}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mb-2">{categorie.slug}</p>
                    {categorie.description && (
                      <p className="text-gray-700 mb-4">{categorie.description}</p>
                    )}
                    <div className="text-sm text-gray-600 mb-4">
                      {categorie._count?.produits || 0} produit(s)
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setEditingCategorie(categorie)
                          setShowCategorieForm(true)
                        }}
                        className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                      >
                        Modifier
                      </button>
                      <button
                        onClick={() => handleDeleteCategorie(categorie.id)}
                        className="px-4 py-2 border border-red-600 text-red-600 rounded-lg hover:bg-red-50"
                      >
                        Supprimer
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Liste des fournisseurs */}
        {activeTab === 'fournisseurs' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {loading ? (
              <div className="col-span-full p-8 text-center text-gray-600">
                Chargement...
              </div>
            ) : fournisseurs.length === 0 ? (
              <div className="col-span-full p-8 text-center text-gray-600">
                Aucun fournisseur. Créez votre premier fournisseur !
              </div>
            ) : (
              fournisseurs.map((fourn) => (
                <div key={fourn.id} className="card p-6">
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="text-xl font-bold text-slate-800">{fourn.nom}</h3>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                        fourn.actif
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {fourn.actif ? 'Actif' : 'Inactif'}
                    </span>
                  </div>
                  <div className="space-y-1.5 text-sm text-gray-600 mb-6 font-light">
                    {fourn.contact && <p>👤 Contact : {fourn.contact}</p>}
                    {fourn.telephone && <p>📞 Tél : {fourn.telephone}</p>}
                    {fourn.email && <p>✉️ Email : {fourn.email}</p>}
                    <p className="pt-1 text-xs text-slate-400">
                      📦 {fourn._count?.produits || 0} produit(s) associé(s)
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setEditingFournisseur(fourn)
                        setShowFournisseurForm(true)
                      }}
                      className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 font-semibold text-xs uppercase tracking-wider"
                    >
                      Modifier
                    </button>
                    <button
                      onClick={() => handleDeleteFournisseur(fourn.id)}
                      className="px-4 py-2 border border-red-650 text-red-650 rounded-lg hover:bg-red-50 font-semibold text-xs uppercase tracking-wider"
                    >
                      Supprimer
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Liste des commandes */}
        {activeTab === 'commandes' && (
          <div className="card overflow-hidden">
            {loading ? (
              <div className="p-8 text-center text-gray-600">Chargement...</div>
            ) : commandes.length === 0 ? (
              <div className="p-8 text-center text-gray-600">
                Aucune commande pour le moment.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left p-4">N° Commande</th>
                      <th className="text-left p-4">Client</th>
                      <th className="text-left p-4">Date</th>
                      <th className="text-left p-4">Produits</th>
                      <th className="text-left p-4">Total</th>
                      <th className="text-left p-4">Paiement</th>
                      <th className="text-left p-4">Statut</th>
                      <th className="text-left p-4">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {commandes.map((commande) => (
                      <CommandeRow
                        key={commande.id}
                        commande={commande}
                        onUpdateStatut={handleUpdateStatut}
                        onShowDetails={handleShowCommandeDetails}
                        onExportPDF={handleExportCommandePDF}
                        onDelete={handleDeleteCommande}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Récapitulatif Fournisseur */}
        {activeTab === 'recap-fournisseur' && (
          <div>
            {/* Filtres */}
            <div className="card p-6 mb-6">
              <h3 className="text-lg font-bold mb-4">Filtres</h3>
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Fournisseur</label>
                  <select
                    value={selectedFournisseur}
                    onChange={(e) => setSelectedFournisseur(e.target.value)}
                    className="w-full px-4 py-2 border rounded-lg"
                  >
                    <option value="all">Tous les fournisseurs</option>
                    {fournisseurs.map((fourn) => (
                      <option key={fourn.id} value={fourn.id}>
                        {fourn.nom}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Date de début</label>
                  <input
                    type="date"
                    value={dateDebut}
                    onChange={(e) => setDateDebut(e.target.value)}
                    className="w-full px-4 py-2 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Date de fin</label>
                  <input
                    type="date"
                    value={dateFin}
                    onChange={(e) => setDateFin(e.target.value)}
                    className="w-full px-4 py-2 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Statut de commande</label>
                  <select
                    value={statutRecap}
                    onChange={(e) => setStatutRecap(e.target.value)}
                    className="w-full px-4 py-2 border rounded-lg"
                  >
                    <option value="all">Tous les statuts payés</option>
                    <option value="nouvelle">Nouvelle (À commander)</option>
                    <option value="en_preparation">En préparation</option>
                    <option value="expediee">Expédiée</option>
                    <option value="livree">Livrée</option>
                  </select>
                </div>
                <div className="flex items-end gap-2">
                  <button
                    onClick={() => loadRecapFournisseur()}
                    className="flex-1 bg-primary text-white px-6 py-2 rounded-lg hover:bg-primary-dark"
                  >
                    Actualiser
                  </button>
                  {recapFournisseur && (
                    <button
                      onClick={handleExportRecapPDF}
                      className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
                      title="Exporter en PDF"
                    >
                      PDF
                    </button>
                  )}
                </div>
              </div>
            </div>

            {loading ? (
              <div className="card p-8 text-center text-gray-600">Chargement...</div>
            ) : !recapFournisseur ? (
              <div className="card p-8 text-center text-gray-600">
                Aucune donnée disponible. Ajustez les filtres et cliquez sur Actualiser.
              </div>
            ) : (
              <>
                {/* Statistiques globales */}
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
                  <div className="card p-4">
                    <div className="text-sm text-gray-600 mb-1">Commandes</div>
                    <div className="text-2xl font-bold">{recapFournisseur.nbCommandes}</div>
                  </div>
                  <div className="card p-4">
                    <div className="text-sm text-gray-600 mb-1">Articles totaux</div>
                    <div className="text-2xl font-bold">{recapFournisseur.totaux.quantiteTotal}</div>
                  </div>
                  <div className="card p-4">
                    <div className="text-sm text-gray-600 mb-1">Coût achat TTC</div>
                    <div className="text-2xl font-bold text-red-600">
                      {recapFournisseur.totaux.totalAchatTTC.toFixed(2)} €
                    </div>
                  </div>
                  <div className="card p-4">
                    <div className="text-sm text-gray-600 mb-1">Ventes TTC</div>
                    <div className="text-2xl font-bold text-blue-600">
                      {recapFournisseur.totaux.totalVente.toFixed(2)} €
                    </div>
                  </div>
                  <div className="card p-4">
                    <div className="text-sm text-gray-600 mb-1">Bénéfice</div>
                    <div className="text-2xl font-bold text-green-600">
                      {recapFournisseur.totaux.beneficeTotal.toFixed(2)} €
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {recapFournisseur.totaux.totalVente > 0
                        ? `${((recapFournisseur.totaux.beneficeTotal / recapFournisseur.totaux.totalVente) * 100).toFixed(1)}%`
                        : '0%'}
                    </div>
                  </div>
                </div>

                {/* Tableau récapitulatif */}
                <div className="card overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="text-left p-3">Produit</th>
                          <th className="text-left p-3">Taille</th>
                          <th className="text-left p-3">Couleur</th>
                          <th className="text-center p-3">Quantité</th>
                          <th className="text-right p-3">Coût HT</th>
                          <th className="text-right p-3">Flocage HT</th>
                          <th className="text-right p-3">Total HT</th>
                          <th className="text-right p-3">TVA</th>
                          <th className="text-right p-3">Coût TTC</th>
                          <th className="text-right p-3">Prix vente</th>
                          <th className="text-right p-3">Bénéfice/u</th>
                          <th className="text-right p-3 font-bold">Total vente</th>
                          <th className="text-right p-3 font-bold">Bénéfice total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {recapFournisseur.recap.map((item, idx) => (
                          <tr key={idx} className="border-t hover:bg-gray-50">
                            <td className="p-3">{item.produitNom}</td>
                            <td className="p-3">{item.taille || '-'}</td>
                            <td className="p-3">{item.couleur || '-'}</td>
                            <td className="p-3 text-center font-medium">{item.quantiteTotal}</td>
                            <td className="p-3 text-right">{item.prixCoutantHT.toFixed(2)} €</td>
                            <td className="p-3 text-right">{item.prixFlocageHT.toFixed(2)} €</td>
                            <td className="p-3 text-right font-medium">{item.totalHT.toFixed(2)} €</td>
                            <td className="p-3 text-right text-gray-600">
                              {item.totalTVA.toFixed(2)} € ({item.tauxTVA}%)
                            </td>
                            <td className="p-3 text-right font-medium">{item.totalTTC.toFixed(2)} €</td>
                            <td className="p-3 text-right">{item.prixVenteUnitaire.toFixed(2)} €</td>
                            <td className="p-3 text-right">
                              <span
                                className={
                                  item.beneficeUnitaire > 0 ? 'text-green-600' : 'text-red-600'
                                }
                              >
                                {item.beneficeUnitaire.toFixed(2)} €
                              </span>
                            </td>
                            <td className="p-3 text-right font-bold text-blue-600">
                              {item.totalVente.toFixed(2)} €
                            </td>
                            <td className="p-3 text-right font-bold">
                              <span
                                className={
                                  item.beneficeTotal > 0 ? 'text-green-600' : 'text-red-600'
                                }
                              >
                                {item.beneficeTotal.toFixed(2)} €
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="bg-gray-100 font-bold">
                        <tr>
                          <td colSpan={3} className="p-3">
                            TOTAL
                          </td>
                          <td className="p-3 text-center">{recapFournisseur.totaux.quantiteTotal}</td>
                          <td colSpan={4} className="p-3"></td>
                          <td className="p-3 text-right text-red-600">
                            {recapFournisseur.totaux.totalAchatTTC.toFixed(2)} €
                          </td>
                          <td colSpan={2} className="p-3"></td>
                          <td className="p-3 text-right text-blue-600">
                            {recapFournisseur.totaux.totalVente.toFixed(2)} €
                          </td>
                          <td className="p-3 text-right text-green-600">
                            {recapFournisseur.totaux.beneficeTotal.toFixed(2)} €
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>

                {/* Actions d'export */}
                <div className="mt-6 flex gap-4">
                  <button
                    onClick={() => {
                      // Export CSV
                      const headers = [
                        'Produit',
                        'Taille',
                        'Couleur',
                        'SKU',
                        'Quantité',
                        'Coût HT',
                        'Flocage HT',
                        'Total HT',
                        'TVA',
                        'Coût TTC',
                        'Prix vente',
                        'Bénéfice unitaire',
                        'Total vente',
                        'Bénéfice total',
                      ]
                      const rows = recapFournisseur.recap.map((item) => [
                        item.produitNom,
                        item.taille || '',
                        item.couleur || '',
                        item.sku || '',
                        item.quantiteTotal,
                        item.prixCoutantHT.toFixed(2),
                        item.prixFlocageHT.toFixed(2),
                        item.totalHT.toFixed(2),
                        item.totalTVA.toFixed(2),
                        item.totalTTC.toFixed(2),
                        item.prixVenteUnitaire.toFixed(2),
                        item.beneficeUnitaire.toFixed(2),
                        item.totalVente.toFixed(2),
                        item.beneficeTotal.toFixed(2),
                      ])

                      const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')
                      const blob = new Blob([csv], { type: 'text/csv' })
                      const url = URL.createObjectURL(blob)
                      const a = document.createElement('a')
                      a.href = url
                      a.download = `recap-fournisseur-${new Date().toISOString().split('T')[0]}.csv`
                      a.click()
                    }}
                    className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700"
                  >
                    📥 Exporter CSV
                  </button>
                  <button
                    onClick={() => {
                      const text = recapFournisseur.recap
                        .map(
                          (item) =>
                            `${item.produitNom}${item.taille ? ` - Taille ${item.taille}` : ''}${item.couleur ? ` - ${item.couleur}` : ''}: ${item.quantiteTotal} unité(s)`
                        )
                        .join('\n')
                      navigator.clipboard.writeText(text)
                      toast.success('Récapitulatif copié dans le presse-papiers')
                    }}
                    className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700"
                  >
                    📋 Copier pour email
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {/* Formulaire Produit (Modal) */}
        {showProduitForm && (
          <ProduitForm
            produit={editingProduit}
            categories={categories}
            fournisseurs={fournisseurs}
            onClose={() => {
              setShowProduitForm(false)
              setEditingProduit(null)
            }}
            onSuccess={() => {
              setShowProduitForm(false)
              setEditingProduit(null)
              loadData()
            }}
          />
        )}

        {/* Formulaire Catégorie (Modal) */}
        {showCategorieForm && (
          <CategorieForm
            categorie={editingCategorie}
            onClose={() => {
              setShowCategorieForm(false)
              setEditingCategorie(null)
            }}
            onSuccess={() => {
              setShowCategorieForm(false)
              setEditingCategorie(null)
              loadData()
            }}
          />
        )}

        {/* Formulaire Fournisseur (Modal) */}
        {showFournisseurForm && (
          <FournisseurForm
            fournisseur={editingFournisseur}
            onClose={() => {
              setShowFournisseurForm(false)
              setEditingFournisseur(null)
            }}
            onSuccess={() => {
              setShowFournisseurForm(false)
              setEditingFournisseur(null)
              loadFournisseurs()
              loadData()
            }}
          />
        )}

        {/* Modal Variantes */}
        {showVariantesModal && selectedProduit && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-6xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b flex justify-between items-center">
                <div>
                  <h2 className="text-2xl font-bold">Variantes - {selectedProduit.nom}</h2>
                  <p className="text-sm text-gray-600 mt-1">Gérez les prix, coûts et stock par taille/couleur</p>
                </div>
                <button
                  onClick={() => {
                    setShowVariantesModal(false)
                    setSelectedProduit(null)
                    setVariantes([])
                  }}
                  className="text-gray-500 hover:text-gray-700 text-2xl"
                >
                  ×
                </button>
              </div>

              <div className="p-6">
                <div className="flex justify-between items-center mb-6">
                  <button
                    onClick={() => {
                      setEditingVariante(null)
                      setShowVarianteForm(true)
                    }}
                    className="bg-primary text-white px-5 py-2.5 rounded-xl hover:bg-primary-dark text-xs font-bold uppercase tracking-wider active:scale-[0.98] transition-all"
                  >
                    + Ajouter manuellement
                  </button>
                </div>

                <div className="mb-8 bg-slate-50 border border-slate-200/85 rounded-2xl p-5 shadow-xs">
                  <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-1.5">
                    <span>⚡ Générateur rapide de variantes (en masse)</span>
                    <span className="text-[10px] bg-primary/10 text-primary font-bold px-2 py-0.5 rounded-full">Automatique</span>
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                    <div>
                      <label className="block text-xs font-semibold text-slate-550 mb-1.5">Tailles (séparées par des virgules)</label>
                      <input
                        type="text"
                        value={bulkTailles}
                        onChange={(e) => setBulkTailles(e.target.value)}
                        placeholder="Ex: XS, S, M, L, XL"
                        className="w-full px-3 py-2 border border-slate-250 bg-white rounded-lg text-xs font-medium focus:ring-2 focus:ring-primary/20 focus:border-primary focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-550 mb-1.5">Couleurs (séparées par des virgules)</label>
                      <input
                        type="text"
                        value={bulkCouleurs}
                        onChange={(e) => setBulkCouleurs(e.target.value)}
                        placeholder="Ex: Bleu, Noir, Rouge"
                        className="w-full px-3 py-2 border border-slate-250 bg-white rounded-lg text-xs font-medium focus:ring-2 focus:ring-primary/20 focus:border-primary focus:outline-none"
                      />
                    </div>
                    <div>
                      <button
                        onClick={handleBulkGenerate}
                        disabled={generatingBulk}
                        className="w-full bg-slate-900 text-white px-4 py-2.5 rounded-lg hover:bg-primary transition-all text-xs font-bold uppercase tracking-wider disabled:opacity-50 active:scale-[0.98]"
                      >
                        {generatingBulk ? 'Génération...' : 'Générer les combinaisons'}
                      </button>
                    </div>
                  </div>
                  <p className="text-[10px] text-slate-450 mt-3.5 leading-relaxed font-light">
                    * Saisissez les options séparées par des virgules pour créer toutes les combinaisons possibles. Les nouvelles variantes héritent automatiquement du prix de vente, de la TVA et du prix d&apos;achat HT du produit.
                  </p>
                </div>

                {variantes.length === 0 ? (
                  <div className="text-center py-8 text-gray-600">
                    Aucune variante. Ajoutez-en une pour gérer les prix par taille/couleur.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="text-left p-3">Taille</th>
                          <th className="text-left p-3">Couleur</th>
                          <th className="text-left p-3">SKU</th>
                          <th className="text-right p-3">Prix vente</th>
                          <th className="text-right p-3">Coût HT</th>
                          <th className="text-right p-3">Flocage HT</th>
                          <th className="text-right p-3">Total HT</th>
                          <th className="text-right p-3">TVA</th>
                          <th className="text-right p-3">Coût TTC</th>
                          <th className="text-right p-3">Marge</th>
                          <th className="text-center p-3">Stock</th>
                          <th className="text-center p-3">Actif</th>
                          <th className="text-left p-3">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {variantes.map((variante) => {
                          const prixVente = variante.prix || selectedProduit.prix
                          const totalHT = variante.prixCoutantHT + variante.prixFlocageHT
                          const tva = totalHT * (variante.tauxTVA / 100)
                          const coutTTC = totalHT + tva
                          const fraisStripe = prixVente > 0 ? (prixVente * 0.015) + 0.25 : 0
                          const marge = prixVente - coutTTC - fraisStripe
                          const margePercent = prixVente > 0 ? (marge / prixVente) * 100 : 0

                          return (
                            <tr key={variante.id} className="border-t hover:bg-gray-50">
                              <td className="p-3">{variante.taille || '-'}</td>
                              <td className="p-3">{variante.couleur || '-'}</td>
                              <td className="p-3 text-xs text-gray-600">{variante.sku || '-'}</td>
                              <td className="p-3 text-right font-medium">
                                {prixVente.toFixed(2)} €
                              </td>
                              <td className="p-3 text-right">{variante.prixCoutantHT.toFixed(2)} €</td>
                              <td className="p-3 text-right">{variante.prixFlocageHT.toFixed(2)} €</td>
                              <td className="p-3 text-right font-medium">{totalHT.toFixed(2)} €</td>
                              <td className="p-3 text-right text-xs text-gray-600">
                                {tva.toFixed(2)} € ({variante.tauxTVA}%)
                              </td>
                              <td className="p-3 text-right font-medium">{coutTTC.toFixed(2)} €</td>
                              <td className="p-3 text-right">
                                <div
                                  className={`font-medium ${marge > 0 ? 'text-green-600' : 'text-red-600'}`}
                                >
                                  {marge.toFixed(2)} €
                                </div>
                                <div className="text-xs text-gray-600">
                                  {margePercent.toFixed(1)}%
                                </div>
                                <div className="text-[10px] text-gray-400 italic mt-0.5" title="Frais Stripe estimés (1.5% + 0.25€)">
                                  Stripe: -{fraisStripe.toFixed(2)} €
                                </div>
                              </td>
                              <td className="p-3 text-center">
                                <span className={`px-2 py-1 rounded text-xs ${variante.stock > 10 ? 'bg-green-100 text-green-800' : variante.stock > 0 ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'}`}>
                                  {variante.stock}
                                </span>
                              </td>
                              <td className="p-3 text-center">
                                <span className={`px-2 py-1 rounded text-xs ${variante.actif ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                                  {variante.actif ? 'Oui' : 'Non'}
                                </span>
                              </td>
                              <td className="p-3">
                                <div className="flex gap-2">
                                  <button
                                    onClick={() => {
                                      setEditingVariante(variante)
                                      setShowVarianteForm(true)
                                    }}
                                    className="text-blue-600 hover:text-blue-800 text-xs"
                                  >
                                    Modifier
                                  </button>
                                  <button
                                    onClick={() => handleDeleteVariante(variante.id)}
                                    className="text-red-600 hover:text-red-800 text-xs"
                                  >
                                    Suppr.
                                  </button>
                                </div>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Formulaire Variante */}
        {showVarianteForm && selectedProduit && (
          <VarianteForm
            variante={editingVariante}
            produit={selectedProduit}
            onClose={() => {
              setShowVarianteForm(false)
              setEditingVariante(null)
            }}
            onSuccess={() => {
              setShowVarianteForm(false)
              setEditingVariante(null)
              if (selectedProduit) {
                loadVariantes(selectedProduit.id)
              }
            }}
          />
        )}

        {/* Modal Détails Commande */}
        {selectedCommande && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-lg w-full shadow-xl">
              <div className="p-6 border-b flex justify-between items-center">
                <h2 className="text-xl font-bold">Commande #{selectedCommande.numeroCommande}</h2>
                <button
                  onClick={() => setSelectedCommande(null)}
                  className="text-gray-500 hover:text-gray-700 text-2xl"
                >
                  ×
                </button>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <h3 className="font-semibold text-gray-700 mb-1">Client payeur</h3>
                  <p>{selectedCommande.prenom} {selectedCommande.nom}</p>
                  <p className="text-sm text-gray-600">{selectedCommande.email}</p>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-700 mb-1">Nageur</h3>
                  <p className="text-blue-600">🏊 {selectedCommande.prenomNageur} {selectedCommande.nomNageur}</p>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-700 mb-2">Produits</h3>
                  <div className="bg-gray-50 rounded-lg p-3 space-y-2">
                    {selectedCommande.lignes.map((ligne) => (
                      <div key={ligne.id} className="flex flex-col text-sm border-b border-gray-150/40 pb-1.5 last:border-b-0 last:pb-0">
                        <div className="flex justify-between items-start">
                          <span>
                            <span className="font-medium text-slate-800">{ligne.quantite}x</span>{' '}
                            <button
                              type="button"
                              onClick={() => handleGoToEditProduit(ligne.produit.id)}
                              className="text-primary hover:text-primary-dark font-semibold hover:underline text-left inline-block"
                              title="Modifier ce produit"
                            >
                              {ligne.produit.nom}
                            </button>
                            {ligne.taille && <span className="text-gray-500 text-xs"> (Taille: {ligne.taille})</span>}
                            {ligne.couleur && <span className="text-gray-500 text-xs"> ({ligne.couleur})</span>}
                          </span>
                          <span className="font-medium text-slate-700">{(ligne.prixUnitaire * ligne.quantite).toFixed(2)} €</span>
                        </div>
                        {ligne.textePersonnalise && (
                          <span className="text-purple-600 font-semibold bg-purple-50 px-2 py-0.5 rounded text-[11px] mt-0.5 w-fit">
                            ✍️ Perso: {ligne.textePersonnalise}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
                <div className="flex justify-between items-center pt-4 border-t">
                  <span className="font-bold text-lg">Total</span>
                  <span className="font-bold text-lg text-primary">{selectedCommande.total.toFixed(2)} €</span>
                </div>
                <div className="bg-blue-50 text-blue-800 p-3 rounded-lg text-sm">
                  📦 Retrait en main propre au club
                </div>
              </div>
              <div className="p-4 bg-gray-50 rounded-b-lg">
                <button
                  onClick={() => setSelectedCommande(null)}
                  className="w-full bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary-dark"
                >
                  Fermer
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  )
}


export default function BoutiquePage() {
  return (
    <ConfirmDialogProvider>
      <BoutiquePageContent />
    </ConfirmDialogProvider>
  )
}
