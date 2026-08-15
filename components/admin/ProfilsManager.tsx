'use client'

import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import CoachesManager from './CoachesManager'

interface User {
  id: string
  email: string
  nom: string | null
  prenom: string | null
  role: string
  actif: boolean
  lastLogin: string | null
  createdAt: string
}

interface ProfilsManagerProps {
  currentUser?: {
    id: string
    email: string
    role: string
  } | null
}

export default function ProfilsManager({ currentUser }: ProfilsManagerProps) {
  const [activeSubTab, setActiveSubTab] = useState<'comptes' | 'coaches'>('comptes')
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  
  // Modals state
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  
  // Form fields
  const [nom, setNom] = useState('')
  const [prenom, setPrenom] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<'admin' | 'superviseur' | 'coach' | 'tresorier' | 'president'>('superviseur')
  const [actif, setActif] = useState(true)
  
  // Delete confirm
  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; id: string | null }>({ isOpen: false, id: null })

  const fetchUsers = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/users')
      const data = await res.json()
      if (res.ok) {
        setUsers(data.users || [])
      } else {
        toast.error(data.error || 'Erreur lors du chargement des comptes')
      }
    } catch {
      toast.error('Erreur réseau lors de la récupération des comptes')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (activeSubTab === 'comptes') {
      fetchUsers()
    }
  }, [activeSubTab])

  const openAddModal = () => {
    setEditingUser(null)
    setNom('')
    setPrenom('')
    setEmail('')
    setPassword('')
    setRole('superviseur')
    setActif(true)
    setIsModalOpen(true)
  }

  const openEditModal = (user: User) => {
    setEditingUser(user)
    setNom(user.nom || '')
    setPrenom(user.prenom || '')
    setEmail(user.email)
    setPassword('') // empty to keep unchanged
    setRole(user.role as any)
    setActif(user.actif)
    setIsModalOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim() || !nom.trim() || !prenom.trim()) {
      return toast.error('Veuillez remplir tous les champs obligatoires')
    }
    if (!editingUser && !password) {
      return toast.error('Le mot de passe est obligatoire pour un nouveau compte')
    }

    const payload = {
      nom: nom.trim(),
      prenom: prenom.trim(),
      email: email.trim().toLowerCase(),
      role,
      actif,
      ...(password ? { password } : {})
    }

    try {
      const url = editingUser ? `/api/admin/users/${editingUser.id}` : '/api/admin/users'
      const method = editingUser ? 'PUT' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json()

      if (res.ok) {
        toast.success(editingUser ? 'Compte mis à jour avec succès' : 'Compte créé avec succès')
        setIsModalOpen(false)
        await fetchUsers()
      } else {
        toast.error(data.error || 'Une erreur est survenue')
      }
    } catch {
      toast.error('Erreur réseau lors de l\'enregistrement')
    }
  }

  const handleDeleteUser = async () => {
    if (!deleteConfirm.id) return
    try {
      const res = await fetch(`/api/admin/users/${deleteConfirm.id}`, { method: 'DELETE' })
      const data = await res.json()

      if (res.ok) {
        toast.success('Compte supprimé avec succès')
        setDeleteConfirm({ isOpen: false, id: null })
        await fetchUsers()
      } else {
        toast.error(data.error || 'Erreur lors de la suppression')
      }
    } catch {
      toast.error('Erreur réseau lors de la suppression')
    }
  }

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'admin': return 'Administrateur'
      case 'superviseur': return 'Superviseur'
      case 'coach': return 'Coach'
      case 'tresorier': return 'Trésorier'
      case 'president': return 'Président'
      default: return role
    }
  }

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'admin':
        return 'bg-purple-100 text-purple-700 font-bold border border-purple-200'
      case 'superviseur':
        return 'bg-blue-100 text-blue-700 font-bold border border-blue-200'
      case 'coach':
        return 'bg-amber-100 text-amber-700 font-bold border border-amber-200'
      case 'tresorier':
        return 'bg-teal-100 text-teal-700 font-bold border border-teal-200'
      case 'president':
        return 'bg-indigo-100 text-indigo-700 font-bold border border-indigo-200'
      default:
        return 'bg-slate-100 text-slate-700 border border-slate-200'
    }
  }

  return (
    <div className="space-y-6">
      {/* Tab bar header */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 border-b border-slate-100 pb-5">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            Gestion des Profils & Comptes
          </h2>
          <p className="text-slate-400 text-xs mt-1 font-medium">Administration des comptes utilisateurs et fiches techniques des coaches</p>
        </div>

        {/* Sub-tabs selectors */}
        <div className="inline-flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200/60 shadow-2xs shrink-0 max-w-fit">
          <button
            onClick={() => setActiveSubTab('comptes')}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
              activeSubTab === 'comptes'
                ? 'bg-white text-slate-900 shadow-xs border border-slate-250/20'
                : 'text-slate-500 hover:text-slate-800 hover:bg-slate-200/30'
            }`}
          >
            👥 Comptes Utilisateurs
          </button>
          <button
            onClick={() => setActiveSubTab('coaches')}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
              activeSubTab === 'coaches'
                ? 'bg-white text-slate-900 shadow-xs border border-slate-250/20'
                : 'text-slate-500 hover:text-slate-800 hover:bg-slate-200/30'
            }`}
          >
            👨‍🏫 Profils Entraîneurs
          </button>
        </div>
      </div>

      {/* Comptes Utilisateurs panel */}
      {activeSubTab === 'comptes' && (
        <div className="card p-6 bg-white border border-slate-200/80 rounded-2xl shadow-2xs space-y-6">
          <div className="flex justify-between items-center pb-2 border-b border-slate-50">
            <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-950">
              Liste des Comptes de Connexion ({users.length})
            </h3>
            <button
              onClick={openAddModal}
              className="px-4 py-2 bg-slate-950 hover:bg-slate-900 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              ➕ Ajouter un compte
            </button>
          </div>

          {loading && users.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : users.length === 0 ? (
            <p className="text-center text-slate-400 italic py-8 text-xs">
              Aucun compte utilisateur enregistré.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-650">
                    <th className="text-left py-3 px-4 font-bold text-xs uppercase tracking-wider">Identité</th>
                    <th className="text-left py-3 px-4 font-bold text-xs uppercase tracking-wider">Email</th>
                    <th className="text-left py-3 px-4 font-bold text-xs uppercase tracking-wider">Rôle / Accès</th>
                    <th className="text-center py-3 px-4 font-bold text-xs uppercase tracking-wider">Statut</th>
                    <th className="text-left py-3 px-4 font-bold text-xs uppercase tracking-wider">Dernière Connexion</th>
                    <th className="text-right py-3 px-4 font-bold text-xs uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user.id} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                      <td className="py-3 px-4 font-semibold text-slate-800">
                        {user.prenom} {user.nom}
                      </td>
                      <td className="py-3 px-4 text-slate-600 font-mono text-xs">
                        {user.email}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${getRoleBadge(user.role)}`}>
                          {getRoleLabel(user.role)}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                          user.actif ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                        }`}>
                          {user.actif ? 'Actif' : 'Inactif'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-500 text-xs">
                        {user.lastLogin
                          ? new Date(user.lastLogin).toLocaleDateString('fr-FR', {
                              day: '2-digit',
                              month: '2-digit',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })
                          : 'Jamais'}
                      </td>
                      <td className="py-3 px-4 text-right space-x-2">
                        {!(currentUser?.role === 'superviseur' && user.role === 'admin') ? (
                          <>
                            <button
                              onClick={() => openEditModal(user)}
                              className="px-2.5 py-1 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
                              aria-label={`Modifier l'utilisateur ${user.prenom || ''} ${user.nom || ''}`}
                            >
                              Modifier
                            </button>
                            <button
                              onClick={() => setDeleteConfirm({ isOpen: true, id: user.id })}
                              className="px-2.5 py-1 text-xs font-bold text-red-650 bg-red-50 hover:bg-red-100 rounded-lg transition-colors cursor-pointer"
                              aria-label={`Supprimer l'utilisateur ${user.prenom || ''} ${user.nom || ''}`}
                            >
                              Supprimer
                            </button>
                          </>
                        ) : (
                          <span className="text-xs text-slate-500 italic">Lecture seule</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Profils Entraîneurs panel */}
      {activeSubTab === 'coaches' && (
        <div className="card p-6 bg-white border border-slate-200/80 rounded-2xl shadow-2xs">
          <CoachesManager />
        </div>
      )}

      {/* Modal d'ajout / modification de compte */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 animate-fade-in" role="dialog" aria-modal="true" aria-labelledby="modal-user-title">
          <div className="bg-white rounded-3xl border border-slate-200/80 p-6 md:p-8 max-w-md w-full shadow-lg m-4 space-y-6">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 id="modal-user-title" className="text-sm font-extrabold uppercase tracking-wider text-slate-950">
                {editingUser ? 'Modifier le compte' : 'Créer un nouveau compte'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} aria-label="Fermer la fenêtre modale" className="text-slate-400 hover:text-slate-650 font-bold cursor-pointer">✕</button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 text-sm font-light text-slate-750">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="prenom" className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">Prénom *</label>
                  <input
                    type="text"
                    id="prenom"
                    required
                    value={prenom}
                    onChange={(e) => setPrenom(e.target.value)}
                    placeholder="Ex: Jean"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200/85 rounded-lg focus:border-slate-800 focus:bg-white outline-none font-normal text-slate-800"
                  />
                </div>
                <div>
                  <label htmlFor="nom" className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">Nom *</label>
                  <input
                    type="text"
                    id="nom"
                    required
                    value={nom}
                    onChange={(e) => setNom(e.target.value)}
                    placeholder="Ex: Dupont"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200/85 rounded-lg focus:border-slate-800 focus:bg-white outline-none font-normal text-slate-800"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="email" className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">Adresse email *</label>
                <input
                  type="email"
                  id="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="jean.dupont@triton-club.fr"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200/85 rounded-lg focus:border-slate-800 focus:bg-white outline-none font-normal text-slate-800"
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                  Mot de passe {editingUser && '(laisser vide pour ne pas modifier)'}
                </label>
                <input
                  type="password"
                  id="password"
                  required={!editingUser}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200/85 rounded-lg focus:border-slate-800 focus:bg-white outline-none font-normal text-slate-800"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="role" className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">Rôle d&apos;accès</label>
                  <select
                    id="role"
                    value={role}
                    onChange={(e) => setRole(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200/85 rounded-lg outline-none text-slate-700 font-normal cursor-pointer"
                  >
                    {currentUser?.role === 'admin' && (
                      <option value="admin">Administrateur</option>
                    )}
                    <option value="superviseur">Superviseur</option>
                    <option value="tresorier">Trésorier</option>
                    <option value="president">Président</option>
                  </select>
                  <p className="text-[10px] text-slate-500 mt-1">
                    Les comptes coachs sont gérés dans l&apos;onglet <strong>Profils Entraîneurs</strong>.
                  </p>
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">Statut du compte</label>
                  <div className="flex items-center gap-3 pt-2">
                    <label className="inline-flex items-center gap-1.5 cursor-pointer text-xs">
                      <input
                        type="checkbox"
                        checked={actif}
                        onChange={(e) => setActif(e.target.checked)}
                        className="rounded border-slate-350 text-slate-800 focus:ring-slate-800 w-4 h-4 cursor-pointer"
                      />
                      <span>Compte actif</span>
                    </label>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-4 border-t border-slate-100">
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-slate-950 hover:bg-slate-900 text-white font-bold text-xs rounded-xl shadow-sm transition-colors cursor-pointer"
                >
                  {editingUser ? 'Enregistrer les modifications' : 'Créer le compte'}
                </button>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="py-2.5 px-4 border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs rounded-xl transition-all cursor-pointer"
                >
                  Annuler
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirmation suppression modal */}
      {deleteConfirm.isOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-55 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-lg border border-slate-200">
            <div className="p-6 space-y-3">
              <div className="flex items-start gap-4">
                <div className="text-3xl">⚠️</div>
                <div className="flex-1">
                  <h3 className="text-base font-extrabold text-slate-900">Confirmer la suppression</h3>
                  <p className="text-slate-500 text-xs mt-1 leading-relaxed">
                    Voulez-vous vraiment supprimer définitivement ce compte de connexion ? Cette action est irréversible.
                  </p>
                </div>
              </div>
            </div>
            <div className="flex gap-3 p-4 bg-slate-50 rounded-b-2xl border-t border-slate-100">
              <button
                onClick={() => setDeleteConfirm({ isOpen: false, id: null })}
                className="flex-1 px-4 py-2 border border-slate-200 hover:bg-slate-100 font-bold text-xs rounded-xl transition-colors cursor-pointer text-slate-700"
              >
                Annuler
              </button>
              <button
                onClick={handleDeleteUser}
                className="flex-1 px-4 py-2 text-white bg-red-600 hover:bg-red-700 font-bold text-xs rounded-xl transition-colors cursor-pointer"
              >
                Supprimer le compte
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
