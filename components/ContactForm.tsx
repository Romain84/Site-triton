'use client'

import { useActionState, useRef, useState } from 'react'
import Link from 'next/link'
import { FormStatus } from '@/components/ui/FormStatus'
import TurnstileWidget from '@/components/TurnstileWidget'
import { 
  Sparkles, 
  MessageSquare, 
  ExternalLink, 
  Compass, 
  Calendar, 
  Euro, 
  Clock, 
  CheckCircle2, 
  HelpCircle,
  X
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

  const openChatWithQuestion = (question: string) => {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('open-triton-chat', { detail: { question } }))
    }
  }

  return (
    <>
      <form ref={formRef} action={formAction} className="space-y-5">
        {/* Notice bénévole vs réponse instantanée */}
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 text-xs text-amber-950 space-y-1.5">
          <div className="flex items-center gap-2 font-black text-amber-900">
            <Clock className="w-4 h-4 text-amber-600 shrink-0" />
            <span>Délai de traitement des emails : 48h à 72h</span>
          </div>
          <p className="text-amber-800/90 font-medium leading-relaxed">
            Le club est géré par des bénévoles. Pour obtenir une réponse <strong>immédiate 24/7</strong>, consultez les fiches directes ci-dessous ou interrogez notre assistant virtuel.
          </p>
        </div>

        {/* Honeypot Anti-Bot (invisible pour les humains, rempli par les spambots) */}
        <div className="sr-only" aria-hidden="true" style={{ display: 'none' }}>
          <label htmlFor="website">Ne pas remplir ce champ</label>
          <input type="text" id="website" name="website" tabIndex={-1} autoComplete="off" />
        </div>

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
            value={selectedSujet}
            onChange={(e) => setSelectedSujet(e.target.value)}
            className="w-full px-4 py-3 bg-slate-50 border border-slate-200/80 rounded-lg focus:border-slate-800 focus:bg-white transition-colors duration-150 outline-none text-sm font-semibold text-slate-900 cursor-pointer"
          >
            <option value="">Sélectionnez un sujet</option>
            <option value="inscription">📝 Inscription, tarifs & modalités</option>
            <option value="renseignement">🧭 Quel groupe choisir pour mon enfant / moi ?</option>
            <option value="planning">📅 Horaires & planning des entraînements</option>
            <option value="tarifs">💶 Tarifs, Pass&apos;Sport & moyens de paiement</option>
            <option value="competition">🏆 Compétition & filière fédérale FFN</option>
            <option value="autre">✉️ Autre demande</option>
          </select>
          {state?.fieldErrors?.sujet && <p className="text-red-500 text-xs font-medium mt-1.5">{state.fieldErrors.sujet}</p>}
        </div>

        {/* ─── SMART ANSWER CARD (INTERCEPTION INTELLIGENTE) ─── */}
        {selectedSujet === 'inscription' && (
          <div className="bg-cyan-50/70 border border-cyan-200/80 rounded-2xl p-4 space-y-3 animate-fade-in text-xs text-slate-800">
            <div className="flex items-center gap-1.5 text-cyan-900 font-black">
              <Sparkles className="w-4 h-4 text-cyan-600" />
              <span>Réponse instantanée : Inscription & Démarches</span>
            </div>
            <ul className="space-y-1.5 text-slate-700 font-medium">
              <li className="flex items-start gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-cyan-600 shrink-0 mt-0.5" />
                <span>Les inscriptions se font <strong>directement en ligne</strong> sur notre plateforme sécurisée.</span>
              </li>
              <li className="flex items-start gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-cyan-600 shrink-0 mt-0.5" />
                <span><strong>Documents :</strong> Questionnaire de santé en ligne (certificat médical uniquement en cas de réponse positive).</span>
              </li>
              <li className="flex items-start gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-cyan-600 shrink-0 mt-0.5" />
                <span><strong>Paiements acceptés :</strong> CB en 1x ou 3x, Chèques, Virement, Chèques Vacances ANCV, Pass&apos;Sport.</span>
              </li>
            </ul>
            <div className="flex flex-wrap gap-2 pt-1">
              <Link
                href="/inscription"
                className="inline-flex items-center gap-1 px-3 py-1.5 bg-slate-900 text-white rounded-lg font-bold text-[11px] hover:bg-slate-800 transition-colors"
              >
                📋 Accéder à la page d&apos;inscription
              </Link>
              <button
                type="button"
                onClick={() => openChatWithQuestion('Comment s\'inscrire et quels sont les documents nécessaires ?')}
                className="inline-flex items-center gap-1 px-3 py-1.5 bg-white text-cyan-800 border border-cyan-300 rounded-lg font-bold text-[11px] hover:bg-cyan-100/50 transition-colors cursor-pointer"
              >
                💬 Poser une question à l&apos;IA
              </button>
            </div>
          </div>
        )}

        {selectedSujet === 'renseignement' && (
          <div className="bg-indigo-50/70 border border-indigo-200/80 rounded-2xl p-4 space-y-3 animate-fade-in text-xs text-slate-800">
            <div className="flex items-center gap-1.5 text-indigo-950 font-black">
              <Compass className="w-4 h-4 text-indigo-600" />
              <span>Besoin d&apos;aide pour trouver le bon groupe ?</span>
            </div>
            <p className="text-slate-700 font-medium leading-relaxed">
              Pour les enfants de 4 à 10 ans, le club propose l&apos;École de Natation (ENF 1 & ENF 2), les groupes Avenirs (1, 2, 3) et Avenirs Loisirs. Pour les ados et adultes, des sections Loisirs et Compétition sont ouvertes.
            </p>
            <div className="flex flex-wrap gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowFinderModal(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-black text-xs shadow-sm transition-all cursor-pointer"
              >
                <Compass className="w-3.5 h-3.5" />
                🧭 Lancer le simulateur en 3 clics
              </button>
              <button
                type="button"
                onClick={() => openChatWithQuestion('Quel groupe choisir pour mon enfant ?')}
                className="inline-flex items-center gap-1 px-3 py-2 bg-white text-indigo-800 border border-indigo-200 rounded-xl font-bold text-xs hover:bg-indigo-50 transition-colors cursor-pointer"
              >
                💬 Demander conseil à l&apos;assistant IA
              </button>
            </div>
          </div>
        )}

        {selectedSujet === 'planning' && (
          <div className="bg-sky-50/70 border border-sky-200/80 rounded-2xl p-4 space-y-3 animate-fade-in text-xs text-slate-800">
            <div className="flex items-center gap-1.5 text-sky-950 font-black">
              <Calendar className="w-4 h-4 text-sky-600" />
              <span>Réponse instantanée : Horaires & Créneaux</span>
            </div>
            <p className="text-slate-700 font-medium leading-relaxed">
              Le planning interactif de la saison 2026-2027 est disponible avec filtres par jour et par catégorie (ENF, Avenirs, Compétition, Loisir, Autres).
            </p>
            <div className="flex flex-wrap gap-2 pt-1">
              <Link
                href="/planning"
                className="inline-flex items-center gap-1 px-3 py-1.5 bg-slate-900 text-white rounded-lg font-bold text-[11px] hover:bg-slate-800 transition-colors"
              >
                📅 Consulter le planning complet
              </Link>
              <button
                type="button"
                onClick={() => openChatWithQuestion('Quels sont les créneaux et horaires des entraînements ?')}
                className="inline-flex items-center gap-1 px-3 py-1.5 bg-white text-sky-800 border border-sky-300 rounded-lg font-bold text-[11px] hover:bg-sky-100/50 transition-colors cursor-pointer"
              >
                💬 Demander un horaire précis à l&apos;IA
              </button>
            </div>
          </div>
        )}

        {selectedSujet === 'tarifs' && (
          <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-2xl p-4 space-y-3 animate-fade-in text-xs text-slate-800">
            <div className="flex items-center gap-1.5 text-emerald-950 font-black">
              <Euro className="w-4 h-4 text-emerald-600" />
              <span>Réponse instantanée : Tarifs & Moyens de paiement</span>
            </div>
            <ul className="space-y-1 text-slate-700 font-medium">
              <li>• <strong>École de natation (ENF 1, ENF 2) :</strong> 220 € / an</li>
              <li>• <strong>Groupes Loisirs (Enfants, Ados, Adultes) & AquaFitness :</strong> 220 € à 240 € / an</li>
              <li>• <strong>Groupes Compétition (Avenirs, Benjamins, Juniors) :</strong> 240 € à 330 € / an</li>
              <li>• <em>Licence FFN et assurance incluses dans toutes les cotisations.</em></li>
            </ul>
            <div className="flex flex-wrap gap-2 pt-1">
              <Link
                href="/inscription"
                className="inline-flex items-center gap-1 px-3 py-1.5 bg-slate-900 text-white rounded-lg font-bold text-[11px] hover:bg-slate-800 transition-colors"
              >
                📋 Voir la grille des tarifs
              </Link>
              <button
                type="button"
                onClick={() => openChatWithQuestion('Quels sont les moyens de paiement acceptés (Pass Sport, ANCV, échelonnement) ?')}
                className="inline-flex items-center gap-1 px-3 py-1.5 bg-white text-emerald-800 border border-emerald-300 rounded-lg font-bold text-[11px] hover:bg-emerald-100/50 transition-colors cursor-pointer"
              >
                💬 Question sur les paiements (Pass&apos;Sport, ANCV)
              </button>
            </div>
          </div>
        )}

        {selectedSujet === 'competition' && (
          <div className="bg-blue-50/70 border border-blue-200/80 rounded-2xl p-4 space-y-3 animate-fade-in text-xs text-slate-800">
            <div className="flex items-center gap-1.5 text-blue-950 font-black">
              <Sparkles className="w-4 h-4 text-blue-600" />
              <span>Filière Compétition FFN</span>
            </div>
            <p className="text-slate-700 font-medium leading-relaxed">
              Les groupes compétitions s&apos;entraînent plusieurs fois par semaine avec séances de préparation physique (PPG). Les plannings et calendriers des compétitions sont en ligne.
            </p>
            <div className="flex flex-wrap gap-2 pt-1">
              <Link
                href="/calendrier"
                className="inline-flex items-center gap-1 px-3 py-1.5 bg-slate-900 text-white rounded-lg font-bold text-[11px] hover:bg-slate-800 transition-colors"
              >
                🏆 Voir le calendrier des compétitions
              </Link>
            </div>
          </div>
        )}

        <div>
          <label htmlFor="message" className="block text-xs font-semibold uppercase tracking-wider text-slate-450 mb-2">
            Message *
          </label>
          <textarea
            id="message"
            name="message"
            required
            rows={5}
            onChange={(e) => setMessageLength(e.target.value.length)}
            className="w-full px-4 py-3 bg-slate-50 border border-slate-200/80 rounded-lg focus:border-slate-800 focus:bg-white transition-colors duration-150 outline-none placeholder:text-slate-400 text-sm font-light"
            placeholder="Si les informations ci-dessus ne répondent pas à votre demande, détaillez votre message ici..."
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
          className="w-full bg-slate-900 hover:bg-slate-800 text-white px-6 py-3.5 rounded-lg font-bold text-sm tracking-wide transition-colors duration-200 disabled:bg-slate-350 disabled:cursor-not-allowed cursor-pointer"
        >
          {isPending ? 'Envoi en cours...' : 'Envoyer le message aux bénévoles'}
        </button>
      </form>

      {/* MODALE SIMULATEUR DE GROUPE */}
      {showFinderModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in overflow-y-auto">
          <div className="relative w-full max-w-3xl my-8">
            <GroupeFinder onClose={() => setShowFinderModal(false)} />
          </div>
        </div>
      )}
    </>
  )
}
