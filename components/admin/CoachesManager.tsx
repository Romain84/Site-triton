'use client'

import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { useConfirmDialog } from '@/components/ConfirmDialog'
import { HelpTooltip } from '@/components/ui/Tooltip'

interface Coach {
  id: string
  prenom: string
  nom: string | null
  email: string | null
  telephone: string | null
  photo: string | null
  bio: string | null
  specialites: string | null
  siret: string | null
  adresse: string | null
  actif: boolean
  heuresAdminHebdo?: number
  lastLogin: Date | null
  createdAt: Date
  updatedAt: Date
}

export default function CoachesManager() {
  const [coaches, setCoaches] = useState<Coach[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingCoach, setEditingCoach] = useState<Coach | null>(null)
  const { confirm } = useConfirmDialog()

  // États pour la réinitialisation du mot de passe
  const [showResetModal, setShowResetModal] = useState(false)
  const [resetCoach, setResetCoach] = useState<Coach | null>(null)
  const [resetLoading, setResetLoading] = useState(false)
  const [generatedPassword, setGeneratedPassword] = useState<string | null>(null)

  // Form states
  const [prenom, setPrenom] = useState('')
  const [nom, setNom] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [telephone, setTelephone] = useState('')
  const [photo, setPhoto] = useState('')
  const [bio, setBio] = useState('')
  const [specialites, setSpecialites] = useState('')
  const [siret, setSiret] = useState('')
  const [adresse, setAdresse] = useState('')
  const [actif, setActif] = useState(true)
  const [heuresAdminHebdo, setHeuresAdminHebdo] = useState<number>(0)

  useEffect(() => {
    fetchCoaches()
  }, [])

  const fetchCoaches = async () => {
    try {
      const response = await fetch('/api/admin/coaches')
      const data = await response.json()
      if (response.ok) {
        setCoaches(data.coaches ?? [])
      } else {
        toast.error(data.error || 'Erreur lors du chargement')
      }
    } catch (error) {
      toast.error('Erreur lors du chargement des coaches')
    } finally {
      setLoading(false)
    }
  }

  const handleOpenModal = (coach?: Coach) => {
    if (coach) {
      setEditingCoach(coach)
      setPrenom(coach.prenom)
      setNom(coach.nom || '')
      setEmail(coach.email || '')
      setPassword('')
      setTelephone(coach.telephone || '')
      setPhoto(coach.photo || '')
      setBio(coach.bio || '')
      setSpecialites(coach.specialites || '')
      setSiret(coach.siret || '')
      setAdresse(coach.adresse || '')
      setActif(coach.actif)
      setHeuresAdminHebdo(coach.heuresAdminHebdo || 0)
    } else {
      setEditingCoach(null)
      setPrenom('')
      setNom('')
      setEmail('')
      setPassword('')
      setTelephone('')
      setPhoto('')
      setBio('')
      setSpecialites('')
      setSiret('')
      setAdresse('')
      setActif(true)
      setHeuresAdminHebdo(0)
    }
    setShowModal(true)
  }

  const handleCloseModal = () => {
    setShowModal(false)
    setEditingCoach(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!prenom.trim()) {
      toast.error('Le prénom est requis')
      return
    }

    const coachData = {
      prenom,
      nom: nom || null,
      email: email || null,
      password: password || undefined,
      telephone: telephone || null,
      photo: photo || null,
      bio: bio || null,
      specialites: specialites || null,
      siret: siret || null,
      adresse: adresse || null,
      actif,
      heuresAdminHebdo,
    }

    try {
      const url = editingCoach
        ? `/api/admin/coaches/${editingCoach.id}`
        : '/api/admin/coaches'
      const method = editingCoach ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(coachData),
      })

      const data = await response.json()

      if (response.ok) {
        toast.success(editingCoach ? 'Coach modifié' : 'Coach créé')
        fetchCoaches()
        handleCloseModal()
      } else {
        toast.error(data.error || 'Erreur')
      }
    } catch (error) {
      toast.error('Erreur lors de la sauvegarde')
    }
  }

  const handleDelete = async (id: string) => {
    const confirmed = await confirm({
      title: 'Supprimer le coach',
      message: 'Voulez-vous vraiment supprimer ce coach ?',
      confirmText: 'Supprimer',
      variant: 'danger',
    })
    if (!confirmed) return

    try {
      const response = await fetch(`/api/admin/coaches/${id}`, {
        method: 'DELETE',
      })

      const data = await response.json()

      if (response.ok) {
        toast.success('Coach supprimé')
        fetchCoaches()
      } else {
        toast.error(data.error || 'Erreur lors de la suppression')
      }
    } catch (error) {
      toast.error('Erreur lors de la suppression')
    }
  }

  const handleOpenResetModal = (coach: Coach) => {
    setResetCoach(coach)
    setGeneratedPassword(null)
    setShowResetModal(true)
  }

  const handleCloseResetModal = () => {
    setShowResetModal(false)
    setResetCoach(null)
    setGeneratedPassword(null)
  }

  const handleResetPassword = async (method: 'email' | 'generate' | 'first_login') => {
    if (!resetCoach) return

    setResetLoading(true)
    try {
      const response = await fetch(`/api/admin/coaches/${resetCoach.id}/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ method }),
      })

      const data = await response.json()

      if (response.ok) {
        if ((method === 'generate' || method === 'first_login') && data.tempPassword) {
          setGeneratedPassword(data.tempPassword)
          toast.success(data.message || 'Mot de passe réinitialisé avec succès')
          await fetchCoaches()
        } else {
          toast.success(data.message || 'Email de réinitialisation envoyé')
          handleCloseResetModal()
        }
      } else {
        toast.error(data.error || 'Erreur lors de la réinitialisation')
      }
    } catch (error) {
      toast.error('Erreur lors de la réinitialisation')
    } finally {
      setResetLoading(false)
    }
  }

  const handleDirectResetFirstLogin = async (coach: Coach) => {
    const coachNomComplet = `${coach.prenom} ${coach.nom || ''}`.trim()
    if (!window.confirm(`Réinitialiser le compte de ${coachNomComplet} comme lors de sa 1ère connexion ?\n\n• Mot de passe réinitialisé à : 1234\n• Invitation à changer de mot de passe activée\n• Date de connexion remise à zéro`)) {
      return
    }

    try {
      const response = await fetch(`/api/admin/coaches/${coach.id}/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ method: 'first_login' }),
      })

      const data = await response.json()

      if (response.ok) {
        toast.success(`Compte de ${coach.prenom} réinitialisé en 1ère connexion (mot de passe : 1234)`)
        await fetchCoaches()
      } else {
        toast.error(data.error || 'Erreur lors de la réinitialisation')
      }
    } catch (error) {
      toast.error('Erreur réseau lors de la réinitialisation')
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast.success('Mot de passe copié dans le presse-papier')
  }

  if (loading) {
    return <div className="text-center py-8">Chargement...</div>
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          Gestion des Coaches
          <HelpTooltip title="Coaches">
            <p>Gérez les comptes des coaches du club.</p>
            <p className="mt-1">Chaque coach dispose d&apos;un espace personnel pour :</p>
            <p className="text-gray-300">• Voir/prendre les créneaux tournants</p>
            <p className="text-gray-300">• Consulter sa facturation mensuelle</p>
            <p className="text-gray-300">• Déclarer ses absences/remplacements</p>
          </HelpTooltip>
        </h2>
        <button
          onClick={() => handleOpenModal()}
          className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors"
        >
          + Nouveau Coach
        </button>
      </div>

      {/* Liste des coaches */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Nom</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Email</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Téléphone</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Spécialités</th>
                <th className="text-center py-3 px-4 font-semibold text-gray-700">Statut</th>
                <th className="text-center py-3 px-4 font-semibold text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {coaches.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-gray-500">
                    Aucun coach
                  </td>
                </tr>
              ) : (
                coaches.map((coach) => (
                  <tr key={coach.id} className="hover:bg-gray-50">
                    <td className="py-3 px-4">
                      <div>
                        <p className="font-medium flex items-center gap-2">
                          {coach.prenom} {coach.nom}
                          {!!coach.heuresAdminHebdo && coach.heuresAdminHebdo > 0 && (
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200/80">
                              ⏱️ 1h Admin/sem
                            </span>
                          )}
                        </p>
                        {coach.lastLogin && (
                          <p className="text-xs text-gray-500">
                            Dernière connexion:{' '}
                            {new Date(coach.lastLogin).toLocaleDateString('fr-FR')}
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-sm">{coach.email || '-'}</td>
                    <td className="py-3 px-4 text-sm">{coach.telephone || '-'}</td>
                    <td className="py-3 px-4 text-sm">{coach.specialites || '-'}</td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${
                          coach.actif
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {coach.actif ? 'Actif' : 'Inactif'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-2 flex-wrap">
                        <button
                          onClick={() => handleDirectResetFirstLogin(coach)}
                          className="px-2.5 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-800 text-xs font-bold transition-colors cursor-pointer flex items-center gap-1"
                          title="Réinitialiser le mot de passe à 1234 comme pour une 1ère connexion"
                          aria-label={`Réinitialiser en 1ère connexion pour ${coach.prenom} ${coach.nom || ''}`}
                        >
                          <span>🔄</span> 1ère connexion (1234)
                        </button>
                        <span className="text-gray-300">|</span>
                        <button
                          onClick={() => handleOpenModal(coach)}
                          className="text-blue-600 hover:text-blue-800 text-sm font-medium cursor-pointer"
                          aria-label={`Modifier le profil de ${coach.prenom} ${coach.nom || ''}`}
                        >
                          Modifier
                        </button>
                        <span className="text-gray-300">|</span>
                        <button
                          onClick={() => handleOpenResetModal(coach)}
                          className="text-orange-600 hover:text-orange-800 text-sm font-medium cursor-pointer"
                          title="Réinitialiser le mot de passe"
                          aria-label={`Réinitialiser le mot de passe de ${coach.prenom} ${coach.nom || ''}`}
                        >
                          Mot de passe
                        </button>
                        <span className="text-gray-300">|</span>
                        <button
                          onClick={() => handleDelete(coach.id)}
                          className="text-red-600 hover:text-red-800 text-sm font-medium cursor-pointer"
                          aria-label={`Supprimer le profil de ${coach.prenom} ${coach.nom || ''}`}
                        >
                          Supprimer
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Créer/Modifier */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto" role="dialog" aria-modal="true" aria-labelledby="modal-coach-title">
          <div className="bg-white rounded-lg p-6 md:p-8 max-w-2xl w-full my-8 max-h-[90vh] overflow-y-auto">
            <h3 id="modal-coach-title" className="text-2xl font-bold mb-6">
              {editingCoach ? 'Modifier le coach' : 'Nouveau coach'}
            </h3>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Prénom <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={prenom}
                    onChange={(e) => setPrenom(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nom
                  </label>
                  <input
                    type="text"
                    value={nom}
                    onChange={(e) => setNom(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Téléphone
                  </label>
                  <input
                    type="tel"
                    value={telephone}
                    onChange={(e) => setTelephone(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Mot de passe {!editingCoach && <span className="text-red-500">*</span>}
                  {editingCoach && <span className="text-gray-500 text-xs">(laisser vide pour ne pas modifier)</span>}
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  required={!editingCoach}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Spécialités
                </label>
                <input
                  type="text"
                  value={specialites}
                  onChange={(e) => setSpecialites(e.target.value)}
                  placeholder="Ex: Natation synchronisée, Water-polo"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Bio
                </label>
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    SIRET
                  </label>
                  <input
                    type="text"
                    value={siret}
                    onChange={(e) => setSiret(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Adresse
                  </label>
                  <input
                    type="text"
                    value={adresse}
                    onChange={(e) => setAdresse(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                </div>
              </div>

              <div className="space-y-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={actif}
                    onChange={(e) => setActif(e.target.checked)}
                    className="w-4 h-4 text-primary focus:ring-primary border-gray-300 rounded cursor-pointer"
                  />
                  <span className="text-sm font-medium text-gray-700">Coach actif</span>
                </label>

                <div className="bg-blue-50/60 border border-blue-100 p-3.5 rounded-xl">
                  <label className="flex items-center gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={heuresAdminHebdo > 0}
                      onChange={(e) => setHeuresAdminHebdo(e.target.checked ? 1 : 0)}
                      className="w-4 h-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded cursor-pointer"
                    />
                    <span className="text-sm font-bold text-slate-800">
                      ⏱️ Ajouter 1h &quot;Administratif&quot; par semaine (hors vacances)
                    </span>
                  </label>
                  <p className="text-xs text-slate-500 ml-6 mt-1 font-medium">
                    Ajoute automatiquement 1 heure administrative pour chaque semaine d&apos;activité hors vacances scolaires sur la facture mensuelle du coach.
                  </p>
                </div>
              </div>

              <div className="flex gap-4 mt-6">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="flex-1 px-6 py-2 bg-gray-300 text-gray-800 rounded-lg hover:bg-gray-400 transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="flex-1 px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors"
                >
                  {editingCoach ? 'Modifier' : 'Créer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Réinitialisation mot de passe */}
      {showResetModal && resetCoach && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 md:p-8 max-w-md w-full">
            <h3 className="text-xl font-bold mb-4">
              Réinitialiser le mot de passe
            </h3>
            <p className="text-gray-600 mb-6">
              Coach : <strong>{resetCoach.prenom} {resetCoach.nom}</strong>
              {resetCoach.email && (
                <span className="block text-sm text-gray-500">{resetCoach.email}</span>
              )}
            </p>

            {generatedPassword ? (
              // Affichage du mot de passe généré
              <div className="space-y-4">
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <p className="text-sm text-green-800 mb-2 font-medium">
                    Nouveau mot de passe temporaire :
                  </p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 bg-white px-3 py-2 rounded border font-mono text-lg">
                      {generatedPassword}
                    </code>
                    <button
                      onClick={() => copyToClipboard(generatedPassword)}
                      className="px-3 py-2 bg-primary text-white rounded hover:bg-primary-dark transition-colors"
                      title="Copier"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                    </button>
                  </div>
                  <p className="text-xs text-green-600 mt-2">
                    Communiquez ce mot de passe au coach de manière sécurisée.
                    Il pourra le modifier depuis son espace.
                  </p>
                </div>
                <button
                  onClick={handleCloseResetModal}
                  className="w-full px-6 py-2 bg-gray-300 text-gray-800 rounded-lg hover:bg-gray-400 transition-colors"
                >
                  Fermer
                </button>
              </div>
            ) : (
              // Choix de la méthode
              <div className="space-y-4">
                <p className="text-sm text-gray-500 mb-4">
                  Choisissez une méthode de réinitialisation pour <strong>{resetCoach.prenom} {resetCoach.nom || ''}</strong> :
                </p>

                {/* Option Prioritaire: 1ère connexion (1234) */}
                <button
                  onClick={() => handleResetPassword('first_login')}
                  disabled={resetLoading}
                  className="w-full p-4 border-2 border-emerald-500 bg-emerald-50/60 hover:bg-emerald-100/70 rounded-xl text-left transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-emerald-200 text-emerald-800 rounded-full flex items-center justify-center flex-shrink-0 text-lg font-bold">
                      🔄
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-bold text-emerald-950">Réinitialiser en 1ère connexion (mot de passe 1234)</p>
                        <span className="px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide bg-emerald-600 text-white rounded-full">Recommandé</span>
                      </div>
                      <p className="text-xs text-emerald-800 mt-1">
                        Remet le mot de passe à <strong>1234</strong>, réinitialise la date de connexion et invite le coach à définir son mot de passe dès sa prochaine connexion.
                      </p>
                    </div>
                  </div>
                </button>

                {/* Option 1: Email */}
                <button
                  onClick={() => handleResetPassword('email')}
                  disabled={resetLoading || !resetCoach.email}
                  className={`w-full p-4 border rounded-lg text-left transition-colors ${
                    resetCoach.email
                      ? 'border-gray-300 hover:border-primary hover:bg-primary-light'
                      : 'border-gray-200 bg-gray-50 cursor-not-allowed opacity-60'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <div>
                      <p className="font-medium">Envoyer un email</p>
                      <p className="text-sm text-gray-500">
                        {resetCoach.email
                          ? `Un lien de réinitialisation sera envoyé à ${resetCoach.email}`
                          : 'Ce coach n\'a pas d\'email configuré'}
                      </p>
                    </div>
                  </div>
                </button>

                {/* Option 2: Générer */}
                <button
                  onClick={() => handleResetPassword('generate')}
                  disabled={resetLoading}
                  className="w-full p-4 border border-gray-300 rounded-lg text-left hover:border-primary hover:bg-primary-light transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                      </svg>
                    </div>
                    <div>
                      <p className="font-medium">Générer un mot de passe</p>
                      <p className="text-sm text-gray-500">
                        Un mot de passe temporaire sera généré. Vous devrez le communiquer au coach.
                      </p>
                    </div>
                  </div>
                </button>

                {resetLoading && (
                  <div className="text-center py-2">
                    <span className="text-gray-500">Chargement...</span>
                  </div>
                )}

                <button
                  onClick={handleCloseResetModal}
                  disabled={resetLoading}
                  className="w-full px-6 py-2 bg-gray-300 text-gray-800 rounded-lg hover:bg-gray-400 transition-colors mt-4"
                >
                  Annuler
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
