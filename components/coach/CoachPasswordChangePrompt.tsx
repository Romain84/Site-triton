'use client'

import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import toast from 'react-hot-toast'
import { KeyRound, Eye, EyeOff, ShieldAlert, CheckCircle2, Loader2, X } from 'lucide-react'

export default function CoachPasswordChangePrompt() {
  const pathname = usePathname()
  const [mustChange, setMustChange] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    // Ne pas vérifier sur les pages publiques d'authentification
    if (!pathname || pathname.startsWith('/coach/login') || pathname.includes('mot-de-passe') || pathname.includes('reset-password')) {
      return
    }

    // Vérifier si le coach doit changer son mot de passe
    fetch('/api/auth/coach/me')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.coach?.mustChangePassword) {
          setMustChange(true)
          setShowModal(true)
        }
      })
      .catch(() => {})
  }, [pathname])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (newPassword.length < 6) {
      setError('Le nouveau mot de passe doit contenir au moins 6 caractères.')
      return
    }

    if (newPassword.trim() === '1234') {
      setError('Veuillez choisir un mot de passe différent du mot de passe provisoire 1234.')
      return
    }

    if (newPassword !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas.')
      return
    }

    setSaving(true)
    try {
      const response = await fetch('/api/auth/coach/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword: '1234',
          newPassword,
          confirmPassword,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        toast.success('Votre mot de passe personnel a été enregistré avec succès !')
        setMustChange(false)
        setShowModal(false)
        setNewPassword('')
        setConfirmPassword('')
      } else {
        setError(data.error || 'Erreur lors du changement de mot de passe')
      }
    } catch {
      setError('Erreur réseau lors de la mise à jour.')
    } finally {
      setSaving(false)
    }
  }

  if (!mustChange) {
    return null
  }

  return (
    <>
      {/* BANDEAU DE RAPPEL DISCRET (visible si la modale est fermée temporairement) */}
      {!showModal && (
        <div className="mb-6 p-4 rounded-2xl bg-amber-50 border border-amber-200/90 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-amber-950">
          <div className="flex items-start sm:items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-amber-100 border border-amber-300 flex items-center justify-center shrink-0">
              <ShieldAlert className="w-4 h-4 text-amber-800" />
            </div>
            <div>
              <p className="text-xs font-bold">
                Sécurité du compte · Mot de passe provisoire actif
              </p>
              <p className="text-[11px] text-amber-800 mt-0.5">
                Vous utilisez actuellement le mot de passe initial (1234). Nous vous recommandons de définir votre mot de passe personnel.
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="px-3.5 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shrink-0 transition-colors shadow-2xs self-end sm:self-auto"
          >
            Changer mon mot de passe
          </button>
        </div>
      )}

      {/* MODALE D'INVITATION DE PREMIÈRE CONNEXION */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl border border-slate-150 space-y-5">
            {/* EN-TÊTE */}
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-cyan-50 border border-cyan-200/80 flex items-center justify-center text-cyan-700 shrink-0">
                  <KeyRound className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-950 tracking-tight">
                    Sécurisez votre espace
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">
                    Définissez votre mot de passe personnel
                  </p>
                </div>
              </div>

              <button
                onClick={() => setShowModal(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-colors"
                title="Changer plus tard"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* EXPLICATION */}
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 text-xs text-slate-700 space-y-1">
              <p className="font-semibold text-slate-900">
                Bienvenue sur l&apos;espace coach du Triton Club ! 🏊‍♂️
              </p>
              <p className="text-slate-600 leading-relaxed">
                Vous vous êtes connecté avec le mot de passe initial provisoire (<strong>1234</strong>). Pour garantir la confidentialité de vos données et factures, veuillez choisir un mot de passe personnel.
              </p>
            </div>

            {/* ERREUR */}
            {error && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 font-medium">
                {error}
              </div>
            )}

            {/* FORMULAIRE */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">
                  Nouveau mot de passe <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Au moins 6 caractères"
                    className="w-full px-3.5 py-2.5 pr-10 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:bg-white focus:border-cyan-500 focus:outline-none transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                  >
                    {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">
                  Confirmer le nouveau mot de passe <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Retapez votre nouveau mot de passe"
                    className="w-full px-3.5 py-2.5 pr-10 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:bg-white focus:border-cyan-500 focus:outline-none transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* BOUTONS D'ACTION */}
              <div className="pt-2 space-y-2">
                <button
                  type="submit"
                  disabled={saving || !newPassword || !confirmPassword}
                  className="w-full py-3 px-4 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white text-xs font-extrabold shadow-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Enregistrement...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Enregistrer mon mot de passe</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="w-full py-2.5 px-4 rounded-xl text-slate-500 hover:text-slate-700 hover:bg-slate-100 text-xs font-semibold transition-colors cursor-pointer"
                >
                  Me le rappeler plus tard
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
