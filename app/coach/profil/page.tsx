'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import CoachNav from '@/components/coach/CoachNav'
import { getErrorMessage } from '@/lib/utils'

interface CoachProfil {
  id: string
  prenom: string
  nom: string | null
  email: string | null
  siret: string | null
  adresse: string | null
  abbyApiKey: string | null
}

export default function ProfilPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [coach, setCoach] = useState<CoachProfil | null>(null)

  const [siret, setSiret] = useState('')
  const [adresse, setAdresse] = useState('')
  const [email, setEmail] = useState('')
  const [abbyApiKey, setAbbyApiKey] = useState('')

  // États pour le changement de mot de passe
  const [showPasswordForm, setShowPasswordForm] = useState(false)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordSaving, setPasswordSaving] = useState(false)
  const [passwordError, setPasswordError] = useState('')
  const [passwordSuccess, setPasswordSuccess] = useState('')

  const fetchProfil = useCallback(async () => {
    try {
      const response = await fetch('/api/auth/coach/me')

      if (response.status === 401) {
        router.push('/coach/login')
        return
      }

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Erreur lors du chargement')
      }

      setCoach(data.coach)
      setSiret(data.coach.siret || '')
      setAdresse(data.coach.adresse || '')
      setEmail(data.coach.email || '')
      setAbbyApiKey(data.coach.abbyApiKey || '')
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }, [router])

  useEffect(() => {
    fetchProfil()
  }, [fetchProfil])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    setSuccess('')

    try {
      const response = await fetch('/api/auth/coach/me', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          siret,
          adresse,
          email,
          abbyApiKey,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Erreur lors de la mise à jour')
      }

      setSuccess('Profil mis à jour avec succès')
      setCoach(data.coach)
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setPasswordSaving(true)
    setPasswordError('')
    setPasswordSuccess('')

    if (newPassword.length < 6) {
      setPasswordError('Le nouveau mot de passe doit contenir au moins 6 caractères')
      setPasswordSaving(false)
      return
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('Les mots de passe ne correspondent pas')
      setPasswordSaving(false)
      return
    }

    try {
      const response = await fetch('/api/auth/coach/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword,
          newPassword,
          confirmPassword,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Erreur lors du changement de mot de passe')
      }

      setPasswordSuccess('Mot de passe modifié avec succès')
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      setShowPasswordForm(false)
    } catch (err) {
      setPasswordError(getErrorMessage(err))
    } finally {
      setPasswordSaving(false)
    }
  }

  const resetPasswordForm = () => {
    setCurrentPassword('')
    setNewPassword('')
    setConfirmPassword('')
    setPasswordError('')
    setPasswordSuccess('')
  }

  if (loading) {
    return (
      <div className="min-h-screen py-8 bg-gray-50">
        <div className="container mx-auto px-4">
          <CoachNav />
          <div className="text-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-gray-600 font-medium">Chargement du profil...</p>
          </div>
        </div>
      </div>
    )
  }

  if (!coach) {
    return (
      <div className="min-h-screen py-8 bg-gray-50">
        <div className="container mx-auto px-4">
          <CoachNav />
          <div className="text-center py-20">
            <p className="text-red-650 font-bold">Erreur lors du chargement du profil</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen py-8 bg-gray-50 animate-fade-in-up">
      <div className="container mx-auto px-4">
        <CoachNav />

        <div className="mb-8">
          <h1 className="text-4xl font-extrabold tracking-tight text-slate-900">Mon Profil</h1>
          <p className="text-slate-500 text-sm mt-1">Gérez vos informations de facturation et de sécurité.</p>
        </div>

        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6 rounded-2xl shadow-xs">
            <p className="text-red-700 font-medium">{error}</p>
          </div>
        )}

        {success && (
          <div className="bg-green-55/15 border-l-4 border-green-500 p-4 mb-6 rounded-2xl shadow-xs">
            <p className="text-green-800 font-bold">{success}</p>
          </div>
        )}

        <div className="card p-8 max-w-2xl bg-white/95 backdrop-blur-xs">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Informations non modifiables */}
            <div>
              <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Informations de base</h2>
              <div className="grid grid-cols-2 gap-4 bg-slate-50/70 border border-slate-100 p-4 rounded-xl">
                <div>
                  <label className="block text-[10px] font-bold text-slate-450 uppercase tracking-wider mb-1">
                    Prénom
                  </label>
                  <p className="text-slate-900 font-extrabold text-base leading-tight">{coach.prenom}</p>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-450 uppercase tracking-wider mb-1">
                    Nom
                  </label>
                  <p className="text-slate-900 font-extrabold text-base leading-tight">{coach.nom || '-'}</p>
                </div>
              </div>
            </div>

            {/* Informations modifiables */}
            <div>
              <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Informations de facturation</h2>
              <div className="space-y-4">
                <div>
                  <label htmlFor="email" className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                    Email
                  </label>
                  <input
                    type="email"
                    id="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl bg-slate-50/50 hover:bg-slate-50/80 focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm font-semibold text-slate-800 outline-none"
                    placeholder="votre.email@example.com"
                  />
                </div>

                <div>
                  <label htmlFor="siret" className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                    SIRET
                  </label>
                  <input
                    type="text"
                    id="siret"
                    value={siret}
                    onChange={(e) => setSiret(e.target.value)}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl bg-slate-50/50 hover:bg-slate-50/80 focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm font-semibold text-slate-800 outline-none"
                    placeholder="123 456 789 00012"
                  />
                  <p className="text-[10px] text-slate-400 font-medium mt-1.5 flex items-center gap-1 select-none">
                    <span>ℹ️</span> Requis pour la génération automatique de factures.
                  </p>
                </div>

                <div>
                  <label htmlFor="adresse" className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                    Adresse
                  </label>
                  <textarea
                    id="adresse"
                    value={adresse}
                    onChange={(e) => setAdresse(e.target.value)}
                    rows={3}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl bg-slate-50/50 hover:bg-slate-50/80 focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm font-semibold text-slate-800 outline-none leading-relaxed"
                    placeholder="Votre adresse complète"
                  />
                  <p className="text-[10px] text-slate-400 font-medium mt-1.5 flex items-center gap-1 select-none">
                    <span>ℹ️</span> Requis pour la génération automatique de factures.
                  </p>
                </div>

                <div>
                  <label htmlFor="abbyApiKey" className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                    Clé API Abby (Facturation Électronique)
                  </label>
                  <input
                    type="password"
                    id="abbyApiKey"
                    value={abbyApiKey}
                    onChange={(e) => setAbbyApiKey(e.target.value)}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl bg-slate-50/50 hover:bg-slate-50/80 focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm font-semibold text-slate-800 outline-none"
                    placeholder="suk-********************************"
                  />
                  <p className="text-[10px] text-slate-400 font-medium mt-1.5 flex items-center gap-1 select-none">
                    <span>ℹ️</span> Requis pour l&apos;exportation automatique des factures vers Abby (my.app-abby.com).
                  </p>
                </div>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={saving}
                className="w-full px-6 py-3.5 bg-primary text-white rounded-xl hover:bg-primary-dark transition-all duration-200 disabled:opacity-50 active:scale-[0.98] font-bold text-xs uppercase tracking-wider shadow-sm flex items-center justify-center"
              >
                {saving ? 'Enregistrement...' : 'Enregistrer les modifications'}
              </button>
            </div>
          </form>

          {(!siret || !adresse) && (
            <div className="mt-6 bg-amber-50 border-l-4 border-amber-500 p-4 rounded-xl flex items-start gap-3 shadow-xs">
              <span className="text-xl select-none">⚠️</span>
              <div>
                <p className="text-amber-950 font-bold text-sm">Profil incomplet</p>
                <p className="text-amber-700 text-xs mt-0.5 font-medium leading-relaxed">
                  Veuillez renseigner votre SIRET et votre adresse pour pouvoir générer et valider vos factures mensuelles.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Section Changement de mot de passe */}
        <div className="card p-8 max-w-2xl mt-8 bg-white/95 backdrop-blur-xs">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Sécurité du compte</h2>
          </div>

          {passwordSuccess && (
            <div className="bg-green-55/15 border-l-4 border-green-500 p-4 mb-6 rounded-2xl shadow-xs">
              <p className="text-green-800 font-bold">{passwordSuccess}</p>
            </div>
          )}

          {!showPasswordForm ? (
            <div>
              <p className="text-slate-500 text-sm mb-4 leading-relaxed">
                Modifiez votre mot de passe pour sécuriser votre compte.
              </p>
              <button
                type="button"
                onClick={() => {
                  resetPasswordForm()
                  setShowPasswordForm(true)
                }}
                className="px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-all duration-200 border border-slate-200/60 text-xs font-bold uppercase tracking-wider active:scale-[0.98]"
              >
                Changer mon mot de passe
              </button>
            </div>
          ) : (
            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              {passwordError && (
                <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-2xl shadow-xs">
                  <p className="text-red-700 font-medium">{passwordError}</p>
                </div>
              )}

              <div>
                <label htmlFor="currentPassword" className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                  Mot de passe actuel <span className="text-red-500">*</span>
                </label>
                <input
                  type="password"
                  id="currentPassword"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl bg-slate-50/50 hover:bg-slate-50/80 focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm font-semibold text-slate-800 outline-none"
                  required
                />
              </div>

              <div>
                <label htmlFor="newPassword" className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                  Nouveau mot de passe <span className="text-red-500">*</span>
                </label>
                <input
                  type="password"
                  id="newPassword"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl bg-slate-50/50 hover:bg-slate-50/80 focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm font-semibold text-slate-800 outline-none"
                  required
                  minLength={6}
                />
                <p className="text-[10px] text-slate-400 font-medium mt-1.5 flex items-center gap-1 select-none">
                  <span>ℹ️</span> Minimum 6 caractères.
                </p>
              </div>

              <div>
                <label htmlFor="confirmPassword" className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                  Confirmer le nouveau mot de passe <span className="text-red-500">*</span>
                </label>
                <input
                  type="password"
                  id="confirmPassword"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl bg-slate-50/50 hover:bg-slate-50/80 focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm font-semibold text-slate-800 outline-none"
                  required
                />
              </div>

              <div className="flex gap-4 pt-3">
                <button
                  type="button"
                  onClick={() => {
                    resetPasswordForm()
                    setShowPasswordForm(false)
                  }}
                  className="flex-1 px-5 py-3 border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 transition-colors font-bold text-xs uppercase tracking-wider"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={passwordSaving}
                  className="flex-1 px-5 py-3 bg-primary text-white rounded-xl hover:bg-primary-dark transition-colors disabled:opacity-50 font-bold text-xs uppercase tracking-wider shadow-sm flex items-center justify-center"
                >
                  {passwordSaving ? 'Modification...' : 'Modifier le mot de passe'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
