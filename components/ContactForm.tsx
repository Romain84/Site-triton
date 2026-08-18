'use client'

import { useActionState, useRef, useState } from 'react'
import Link from 'next/link'
import { FormStatus } from '@/components/ui/FormStatus'
import TurnstileWidget from '@/components/TurnstileWidget'
import { 
  Compass, 
  Calendar, 
  Euro, 
  Check, 
  Info,
  ArrowRight
} from 'lucide-react'
import GroupeFinder from '@/components/GroupeFinder'

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

  const website = (formData.get('website') as string) || ''
  const turnstileToken = (formData.get('turnstileToken') as string) || ''

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
      body: JSON.stringify({ nom, email, telephone, sujet, message, website, turnstileToken }),
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
  const [turnstileToken, setTurnstileToken] = useState<string>('')
  const [selectedSujet, setSelectedSujet] = useState<string>('')
  const [showFinderModal, setShowFinderModal] = useState<boolean>(false)

  const [state, formAction, isPending] = useActionState(async (prevState: ActionState | null, formData: FormData) => {
    if (turnstileToken) {
      formData.set('turnstileToken', turnstileToken)
    }
    const result = await submitContactAction(prevState, formData)
    if (result.success) {
      formRef.current?.reset()
      setMessageLength(0)
      setTurnstileToken('')
      setSelectedSujet('')
    }
    return result
  }, null)

  return (
    <>
      <form ref={formRef} action={formAction} className="space-y-5">
        {/* Honeypot Anti-Bot (invisible pour les humains, rempli par les spambots) */}
        <div className="sr-only" aria-hidden="true" style={{ display: 'none' }}>
          <label htmlFor="website">Ne pas remplir ce champ</label>
          <input type="text" id="website" name="website" tabIndex={-1} autoComplete="off" />
        </div>

        {state?.message && (
          <FormStatus type={state.success ? 'success' : 'error'} message={state.message} />
        )}

        <div>
          <label htmlFor="nom" className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
            Nom complet *
          </label>
          <input
            type="text"
            id="nom"
            name="nom"
            required
            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-primary focus:bg-white transition-colors duration-150 outline-none placeholder:text-slate-400 text-sm font-medium"
            placeholder="Jean Dupont"
          />
          {state?.fieldErrors?.nom && <p className="text-red-500 text-xs font-medium mt-1.5">{state.fieldErrors.nom}</p>}
        </div>

        <div>
          <label htmlFor="email" className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
            Adresse email *
          </label>
          <input
            type="email"
            id="email"
            name="email"
            required
            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-primary focus:bg-white transition-colors duration-150 outline-none placeholder:text-slate-400 text-sm font-medium"
            placeholder="jean.dupont@exemple.fr"
          />
          {state?.fieldErrors?.email && <p className="text-red-500 text-xs font-medium mt-1.5">{state.fieldErrors.email}</p>}
        </div>

        <div>
          <label htmlFor="telephone" className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
            Numéro de téléphone
          </label>
          <input
            type="tel"
            id="telephone"
            name="telephone"
            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-primary focus:bg-white transition-colors duration-150 outline-none placeholder:text-slate-400 text-sm font-medium"
            placeholder="06 00 00 00 00 (optionnel)"
          />
        </div>

        <div>
          <label htmlFor="sujet" className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
            Objet du message *
          </label>
          <select
            id="sujet"
            name="sujet"
            required
            value={selectedSujet}
            onChange={(e) => setSelectedSujet(e.target.value)}
            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-primary focus:bg-white transition-colors duration-150 outline-none text-sm font-medium text-slate-800 cursor-pointer"
          >
            <option value="">Sélectionnez un sujet</option>
            <option value="inscription">Inscription et adhésion</option>
            <option value="renseignement">Choix du groupe et niveau</option>
            <option value="planning">Horaires et planning des créneaux</option>
            <option value="tarifs">Tarifs et modalités de paiement</option>
            <option value="competition">Compétitions FFN</option>
            <option value="autre">Autre demande</option>
          </select>
          {state?.fieldErrors?.sujet && <p className="text-red-500 text-xs font-medium mt-1.5">{state.fieldErrors.sujet}</p>}
        </div>

        {/* ─── INFORMATION CONTEXTUELLE HARMONISÉE ─── */}
        {selectedSujet === 'inscription' && (
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3 animate-fade-in text-xs text-slate-700">
            <div className="flex items-center gap-1.5 text-slate-900 font-bold">
              <Info className="w-4 h-4 text-primary" />
              <span>Modalités d&apos;inscription</span>
            </div>
            <ul className="space-y-1.5 text-slate-600 font-medium">
              <li className="flex items-start gap-2">
                <Check className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
                <span>Les inscriptions s&apos;effectuent en ligne via notre plateforme sécurisée.</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
                <span>Règlement possible par CB (1x ou 3x), chèques, virement, ANCV et Pass&apos;Sport.</span>
              </li>
            </ul>
            <div className="pt-1">
              <Link
                href="/inscription"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary hover:bg-primary-dark text-white rounded-lg font-bold text-xs transition-colors"
              >
                <span>Accéder à la page inscription</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        )}

        {selectedSujet === 'renseignement' && (
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3 animate-fade-in text-xs text-slate-700">
            <div className="flex items-center gap-1.5 text-slate-900 font-bold">
              <Compass className="w-4 h-4 text-primary" />
              <span>Aide au choix du groupe</span>
            </div>
            <p className="text-slate-600 font-medium leading-relaxed">
              Le club accueille les nageurs de 4 ans aux adultes en sections École de Natation, Loisirs, Compétition et Disciplines Spécifiques.
            </p>
            <div className="pt-1">
              <button
                type="button"
                onClick={() => setShowFinderModal(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary hover:bg-primary-dark text-white rounded-lg font-bold text-xs transition-colors cursor-pointer"
              >
                <span>Identifier le groupe adapté</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {selectedSujet === 'planning' && (
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3 animate-fade-in text-xs text-slate-700">
            <div className="flex items-center gap-1.5 text-slate-900 font-bold">
              <Calendar className="w-4 h-4 text-primary" />
              <span>Planning et créneaux</span>
            </div>
            <p className="text-slate-600 font-medium leading-relaxed">
              Le planning des entraînements par groupe, jour et bassin est consultable en ligne.
            </p>
            <div className="pt-1">
              <Link
                href="/planning"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary hover:bg-primary-dark text-white rounded-lg font-bold text-xs transition-colors"
              >
                <span>Consulter le planning</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        )}

        {selectedSujet === 'tarifs' && (
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3 animate-fade-in text-xs text-slate-700">
            <div className="flex items-center gap-1.5 text-slate-900 font-bold">
              <Euro className="w-4 h-4 text-primary" />
              <span>Tarifs de la saison</span>
            </div>
            <ul className="space-y-1 text-slate-600 font-medium">
              <li>• École de natation : 220 € / an</li>
              <li>• Groupes loisirs & AquaFitness : 220 € à 240 € / an</li>
              <li>• Groupes compétition : 240 € à 330 € / an</li>
              <li className="text-slate-500 italic">Licence fédérale FFN incluse dans la cotisation.</li>
            </ul>
            <div className="pt-1">
              <Link
                href="/groupes"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary hover:bg-primary-dark text-white rounded-lg font-bold text-xs transition-colors"
              >
                <span>Voir les détails des groupes</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        )}

        {selectedSujet === 'competition' && (
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3 animate-fade-in text-xs text-slate-700">
            <div className="flex items-center gap-1.5 text-slate-900 font-bold">
              <Info className="w-4 h-4 text-primary" />
              <span>Section Compétition</span>
            </div>
            <p className="text-slate-600 font-medium leading-relaxed">
              Retrouvez les plannings d&apos;entraînements (eau + PPG) et le calendrier des compétitions officielles de la saison.
            </p>
            <div className="pt-1">
              <Link
                href="/calendrier"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary hover:bg-primary-dark text-white rounded-lg font-bold text-xs transition-colors"
              >
                <span>Voir le calendrier des compétitions</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        )}

        <div>
          <label htmlFor="message" className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
            Message *
          </label>
          <textarea
            id="message"
            name="message"
            required
            rows={5}
            onChange={(e) => setMessageLength(e.target.value.length)}
            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-primary focus:bg-white transition-colors duration-150 outline-none placeholder:text-slate-400 text-sm font-medium"
            placeholder="Votre message..."
          />
          <div className="flex justify-between mt-1.5">
            {state?.fieldErrors?.message ? <p className="text-red-500 text-xs font-medium">{state.fieldErrors.message}</p> : <span />}
            <p className={`text-[10px] font-bold ${messageLength > MAX_MESSAGE ? 'text-red-500' : 'text-slate-400'}`}>
              {messageLength}/{MAX_MESSAGE}
            </p>
          </div>
        </div>

        {/* Widget Anti-Bot Cloudflare Turnstile */}
        <TurnstileWidget
          onVerify={(token) => setTurnstileToken(token)}
          onExpire={() => setTurnstileToken('')}
          onError={() => setTurnstileToken('')}
        />

        <button
          type="submit"
          disabled={isPending}
          className="w-full bg-primary hover:bg-primary-dark text-white px-6 py-3.5 rounded-xl font-bold text-sm tracking-wide transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shadow-xs"
        >
          {isPending ? 'Envoi en cours...' : 'Envoyer le message'}
        </button>
      </form>

      {/* MODALE SIMULATEUR DE GROUPE */}
      {showFinderModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in overflow-y-auto">
          <div className="relative w-full max-w-3xl my-8">
            <GroupeFinder onClose={() => setShowFinderModal(false)} />
          </div>
        </div>
      )}
    </>
  )
}
