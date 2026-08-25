'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import CoachNav from '@/components/coach/CoachNav'
import { getErrorMessage } from '@/lib/utils'
import toast from 'react-hot-toast'
import { User, ShieldCheck, KeyRound, Save, Loader2, CheckCircle2, AlertCircle } from 'lucide-react'

interface CoachProfil {
  id: string
  prenom: string
  nom: string | null
  email: string | null
  siret: string | null
  adresse: string | null
}

export default function ProfilPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [coach, setCoach] = useState<CoachProfil | null>(null)

  const [siret, setSiret] = useState('')
  const [adresse, setAdresse] = useState('')
  const [email, setEmail] = useState('')

  // Password state
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordSaving, setPasswordSaving] = useState(false)

  const fetchProfil = useCallback(async () => {
    try {
      const response = await fetch('/api/auth/coach/me')
      if (response.status === 401) {
        router.push('/coach/login')
        return
      }
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Erreur chargement')

      setCoach(data.coach)
      setSiret(data.coach.siret || '')
      setAdresse(data.coach.adresse || '')
      setEmail(data.coach.email || '')
    } catch (err) {
      toast.error(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }, [router])

  useEffect(() => {
    fetchProfil()
  }, [fetchProfil])

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const response = await fetch('/api/auth/coach/me', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ siret, adresse, email }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Erreur mise à jour')
      toast.success('Profil mis à jour avec succès !')
    } catch (err) {
      toast.error(getErrorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (newPassword !== confirmPassword) {
      toast.error('Les nouveaux mots de passe ne correspondent pas')
      return
    }
    if (newPassword.length < 6) {
      toast.error('Le mot de passe doit contenir au moins 6 caractères')
      return
    }

    setPasswordSaving(true)
    try {
      const response = await fetch('/api/auth/coach/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Erreur modification mot de passe')

      toast.success('Mot de passe modifié avec succès !')
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (err) {
      toast.error(getErrorMessage(err))
    } finally {
      setPasswordSaving(false)
    }
  }

  return (
    <div className="min-h-screen pt-2 pb-24 sm:pb-12 bg-slate-50/50 text-slate-900">
      <div className="container mx-auto px-4 max-w-4xl space-y-6">
        <CoachNav />

        {/* HEADER */}
        <header className="bg-white border border-slate-200/80 rounded-3xl p-5 sm:p-7 shadow-xs space-y-2">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-800 text-[11px] font-extrabold uppercase tracking-wider">
            <User className="w-3 h-3 text-slate-600" />
            <span>Paramètres du compte</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-950 tracking-tight">
            Mon Profil Coach
          </h1>
          <p className="text-xs text-slate-500 font-medium">
            Renseignez vos coordonnées de facturation légales (SIRET, adresse) et gérez vos identifiants.
          </p>
        </header>

        {loading ? (
          <div className="bg-white border border-slate-200/80 rounded-3xl p-12 text-center space-y-2">
            <Loader2 className="w-6 h-6 animate-spin mx-auto text-cyan-600" />
            <p className="text-xs text-slate-500 font-bold">Chargement...</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-6">
            {/* COORDONNÉES DE FACTURATION */}
            <form onSubmit={handleProfileSubmit} className="bg-white border border-slate-200/80 rounded-3xl p-5 sm:p-7 shadow-xs space-y-4">
              <div className="flex items-center gap-2 font-black text-sm text-slate-900 border-b border-slate-100 pb-3">
                <ShieldCheck className="w-4 h-4 text-cyan-600" />
                <h2>Coordonnées & Facturation</h2>
              </div>

              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Prénom & Nom</label>
                  <input
                    type="text"
                    disabled
                    value={`${coach?.prenom || ''} ${coach?.nom || ''}`}
                    className="w-full px-3 py-2 rounded-xl bg-slate-100 border border-slate-200 text-xs font-bold text-slate-500 cursor-not-allowed"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Email de contact *</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:bg-white focus:border-cyan-500 focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Numéro de SIRET *</label>
                  <input
                    type="text"
                    placeholder="14 chiffres (ex: 123 456 789 00012)"
                    value={siret}
                    onChange={(e) => setSiret(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-mono text-slate-900 focus:bg-white focus:border-cyan-500 focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Adresse postale complète *</label>
                  <textarea
                    rows={3}
                    placeholder="Numéro, rue, code postal, ville"
                    value={adresse}
                    onChange={(e) => setAdresse(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:bg-white focus:border-cyan-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="w-full inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-slate-950 hover:bg-slate-800 text-white text-xs font-extrabold shadow-xs transition-all disabled:opacity-50"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  <span>Enregistrer mes coordonnées</span>
                </button>
              </div>
            </form>

            {/* SÉCURITÉ / MOT DE PASSE */}
            <form onSubmit={handlePasswordSubmit} className="bg-white border border-slate-200/80 rounded-3xl p-5 sm:p-7 shadow-xs space-y-4">
              <div className="flex items-center gap-2 font-black text-sm text-slate-900 border-b border-slate-100 pb-3">
                <KeyRound className="w-4 h-4 text-cyan-600" />
                <h2>Changer de mot de passe</h2>
              </div>

              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Mot de passe actuel</label>
                  <input
                    type="password"
                    required
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:bg-white focus:border-cyan-500 focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Nouveau mot de passe</label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:bg-white focus:border-cyan-500 focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Confirmer le nouveau mot de passe</label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:bg-white focus:border-cyan-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={passwordSaving}
                  className="w-full inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-900 text-xs font-bold transition-all disabled:opacity-50"
                >
                  {passwordSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <KeyRound className="w-4 h-4" />}
                  <span>Mettre à jour le mot de passe</span>
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  )
}
