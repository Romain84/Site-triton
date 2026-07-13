'use client'

import { useActionState, useRef, useState } from 'react'
import { FormStatus } from '@/components/ui/FormStatus'

interface ActionState {
  success?: boolean
  message?: string
  fieldErrors?: {
    nom?: string
    email?: string
    telephone?: string
    sujet?: string
    message?: string
  }
}

const MAX_MESSAGE = 5000

async function submitContactAction(prevState: ActionState | null, formData: FormData): Promise<ActionState> {
  const nom = (formData.get('nom') as string) || ''
  const email = (formData.get('email') as string) || ''
  const telephone = (formData.get('telephone') as string) || ''
  const sujet = (formData.get('sujet') as string) || ''
  const message = (formData.get('message') as string) || ''

  // Validation
  const errors: NonNullable<ActionState['fieldErrors']> = {}
  if (nom.trim().length < 2) errors.nom = 'Le nom doit contenir au moins 2 caractères.'
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = 'Adresse email invalide.'
  if (!sujet.trim()) errors.sujet = 'Veuillez sélectionner un sujet.'
  if (message.trim().length < 10) errors.message = 'Le message doit contenir au moins 10 caractères.'
  if (message.length > MAX_MESSAGE) errors.message = `Le message ne doit pas dépasser ${MAX_MESSAGE} caractères.`

  if (Object.keys(errors).length > 0) {
    return { success: false, fieldErrors: errors }
  }

  try {
    const response = await fetch('/api/contact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nom, email, telephone, sujet, message }),
    })

    if (response.ok) {
      return {
        success: true,
        message: 'Votre message a été envoyé avec succès ! Nous vous répondrons dans les plus brefs délais.',
      }
    } else {
      let error: { error?: string; details?: { fieldErrors?: Record<string, string[]> } } = {}
      try {
        error = await response.json()
      } catch {}

      const fieldErrors: NonNullable<ActionState['fieldErrors']> = {}
      if (error?.details?.fieldErrors) {
        const zodErrors = error.details.fieldErrors
        fieldErrors.nom = zodErrors.nom?.[0]
        fieldErrors.email = zodErrors.email?.[0]
        fieldErrors.telephone = zodErrors.telephone?.[0]
        fieldErrors.sujet = zodErrors.sujet?.[0]
        fieldErrors.message = zodErrors.message?.[0]
      }

      return {
        success: false,
        message: error.error || "Une erreur est survenue lors de l'envoi du message.",
        fieldErrors,
      }
    }
  } catch {
    return {
      success: false,
      message: 'Une erreur est survenue. Veuillez réessayer plus tard.',
    }
  }
}

export default function ContactForm() {
  const formRef = useRef<HTMLFormElement>(null)
  const [messageLength, setMessageLength] = useState(0)

  const [state, formAction, isPending] = useActionState(async (prevState: ActionState | null, formData: FormData) => {
    const result = await submitContactAction(prevState, formData)
    if (result.success) {
      formRef.current?.reset()
      setMessageLength(0)
    }
    return result
  }, null)

  return (
    <form ref={formRef} action={formAction} className="space-y-5">
      {state?.message && (
        <FormStatus type={state.success ? 'success' : 'error'} message={state.message} />
      )}

      <div>
        <label htmlFor="nom" className="block text-xs font-semibold uppercase tracking-wider text-slate-450 mb-2">
          Nom complet *
        </label>
        <input
          type="text"
          id="nom"
          name="nom"
          required
          className="w-full px-4 py-3 bg-slate-50 border border-slate-200/80 rounded-lg focus:border-slate-800 focus:bg-white transition-colors duration-150 outline-none placeholder:text-slate-400 text-sm font-light"
          placeholder="Jean Dupont"
        />
        {state?.fieldErrors?.nom && <p className="text-red-500 text-xs font-medium mt-1.5">{state.fieldErrors.nom}</p>}
      </div>

      <div>
        <label htmlFor="email" className="block text-xs font-semibold uppercase tracking-wider text-slate-450 mb-2">
          Email *
        </label>
        <input
          type="email"
          id="email"
          name="email"
          required
          className="w-full px-4 py-3 bg-slate-50 border border-slate-200/80 rounded-lg focus:border-slate-800 focus:bg-white transition-colors duration-150 outline-none placeholder:text-slate-400 text-sm font-light"
          placeholder="jean.dupont@exemple.fr"
        />
        {state?.fieldErrors?.email && <p className="text-red-500 text-xs font-medium mt-1.5">{state.fieldErrors.email}</p>}
      </div>

      <div>
        <label htmlFor="telephone" className="block text-xs font-semibold uppercase tracking-wider text-slate-450 mb-2">
          Téléphone
        </label>
        <input
          type="tel"
          id="telephone"
          name="telephone"
          className="w-full px-4 py-3 bg-slate-50 border border-slate-200/80 rounded-lg focus:border-slate-800 focus:bg-white transition-colors duration-150 outline-none placeholder:text-slate-400 text-sm font-light"
          placeholder="Votre numéro (optionnel)"
        />
      </div>

      <div>
        <label htmlFor="sujet" className="block text-xs font-semibold uppercase tracking-wider text-slate-450 mb-2">
          Sujet *
        </label>
        <select
          id="sujet"
          name="sujet"
          required
          className="w-full px-4 py-3 bg-slate-50 border border-slate-200/80 rounded-lg focus:border-slate-800 focus:bg-white transition-colors duration-150 outline-none text-sm font-light text-slate-700"
        >
          <option value="">Sélectionnez un sujet</option>
          <option value="inscription">Inscription</option>
          <option value="renseignement">Renseignement général</option>
          <option value="planning">Planning et horaires</option>
          <option value="tarifs">Tarifs</option>
          <option value="competition">Compétitions</option>
          <option value="autre">Autre</option>
        </select>
        {state?.fieldErrors?.sujet && <p className="text-red-500 text-xs font-medium mt-1.5">{state.fieldErrors.sujet}</p>}
      </div>

      <div>
        <label htmlFor="message" className="block text-xs font-semibold uppercase tracking-wider text-slate-450 mb-2">
          Message *
        </label>
        <textarea
          id="message"
          name="message"
          required
          rows={6}
          onChange={(e) => setMessageLength(e.target.value.length)}
          className="w-full px-4 py-3 bg-slate-50 border border-slate-200/80 rounded-lg focus:border-slate-800 focus:bg-white transition-colors duration-150 outline-none placeholder:text-slate-400 text-sm font-light"
          placeholder="Votre message..."
        />
        <div className="flex justify-between mt-1.5">
          {state?.fieldErrors?.message ? <p className="text-red-500 text-xs font-medium">{state.fieldErrors.message}</p> : <span />}
          <p className={`text-[10px] font-bold ${messageLength > MAX_MESSAGE ? 'text-red-500' : 'text-slate-400'}`}>
            {messageLength}/{MAX_MESSAGE}
          </p>
        </div>
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="w-full bg-slate-900 hover:bg-slate-800 text-white px-6 py-3.5 rounded-lg font-bold text-sm tracking-wide transition-colors duration-200 disabled:bg-slate-350 disabled:cursor-not-allowed cursor-pointer"
      >
        {isPending ? 'Envoi en cours...' : 'Envoyer le message'}
      </button>
    </form>
  )
}

