'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import ContactForm from '@/components/ContactForm'
import GroupeFinder from '@/components/GroupeFinder'
import { 
  Sparkles, 
  MapPin, 
  Compass, 
  Calendar, 
  Euro, 
  Waves, 
  ArrowRight, 
  CheckCircle2, 
  MessageSquare,
  HelpCircle,
  Clock,
  Mail
} from 'lucide-react'

export default function ContactClient() {
  const [showFinderModal, setShowFinderModal] = useState(false)

  return (
    <div className="min-h-screen pt-36 sm:pt-40 pb-28 bg-slate-50">
      <div className="container mx-auto px-4 max-w-6xl space-y-12">
        
        {/* Header Title */}
        <div className="text-center max-w-3xl mx-auto space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-50 text-cyan-700 text-xs font-black uppercase tracking-wider border border-cyan-200/60">
            <Sparkles className="w-3.5 h-3.5 text-cyan-500" />
            <span>Assistance Club & Contact</span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-black text-slate-900 tracking-tight">
            Comment pouvons-nous vous aider ?
          </h1>
          <p className="text-sm sm:text-base text-slate-600 font-normal max-w-2xl mx-auto">
            Gagnez du temps : <strong className="text-slate-900">90% des réponses à vos questions</strong> sont accessibles immédiatement en 1 clic ci-dessous.
          </p>
        </div>

        {/* ─── ENTONNOIR D'AIGUILLAGE : 4 RÉPONSES RAPIDES ─── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
          
          {/* CARTE 1 : GROUPE & NIVEAU */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs hover:border-cyan-300 hover:shadow-md transition-all flex flex-col justify-between space-y-4">
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-2xl bg-cyan-50 text-cyan-700 flex items-center justify-center">
                  <Compass className="w-5 h-5" />
                </div>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-cyan-50 text-cyan-800 border border-cyan-200">
                  Dès 4 ans & adultes
                </span>
              </div>
              <h2 className="text-lg font-black text-slate-900">
                Quel groupe pour mon enfant ou pour moi ?
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                École de natation (ENF 1, 2, 3), Sauv&apos;nage, Compétition, Loisirs Ados ou AquaFitness : identifiez instantanément le groupe adapté selon l&apos;âge et le niveau aquatique.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowFinderModal(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-primary hover:bg-primary-dark text-white text-xs font-bold transition-colors cursor-pointer shadow-xs"
              >
                <Compass className="w-3.5 h-3.5" />
                <span>Simulateur de groupe (3 clics)</span>
              </button>
              <Link
                href="/groupes"
                className="inline-flex items-center gap-1 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors"
              >
                <span>Toutes les sections</span>
                <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          </div>

          {/* CARTE 2 : HORAIRES & PLANNING */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs hover:border-emerald-300 hover:shadow-md transition-all flex flex-col justify-between space-y-4">
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
                  <Calendar className="w-5 h-5" />
                </div>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-emerald-50 text-emerald-800 border border-emerald-200">
                  Planning 2025-2026
                </span>
              </div>
              <h2 className="text-lg font-black text-slate-900">
                Horaires et jours des entraînements
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                Tous les créneaux par catégorie et par groupe à la Piscine couverte Alphonse Roudière (mercredi, samedi matin, soirs de semaine).
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100">
              <Link
                href="/planning"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors shadow-xs"
              >
                <Calendar className="w-3.5 h-3.5" />
                <span>Consulter le planning des séances</span>
              </Link>
            </div>
          </div>

          {/* CARTE 3 : TARIFS, PASS'SPORT & PAIEMENT */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs hover:border-amber-300 hover:shadow-md transition-all flex flex-col justify-between space-y-4">
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-700 flex items-center justify-center">
                  <Euro className="w-5 h-5" />
                </div>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-amber-50 text-amber-800 border border-amber-200">
                  Pass&apos;Sport & ANCV
                </span>
              </div>
              <h2 className="text-lg font-black text-slate-900">
                Tarifs, Pass&apos;Sport (-50€) & Facilités
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                Cotisations forfaitaires annuelles avec licence FFN incluse. Nous acceptons la déduction Pass&apos;Sport (50 €), les chèques vacances ANCV et le paiement en 3 fois.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100">
              <Link
                href="/inscription#tarifs"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition-colors shadow-xs"
              >
                <Euro className="w-3.5 h-3.5" />
                <span>Consulter la grille des tarifs</span>
              </Link>
            </div>
          </div>

          {/* CARTE 4 : TESTS DE NAGE & ADHÉSION */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs hover:border-blue-300 hover:shadow-md transition-all flex flex-col justify-between space-y-4">
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-700 flex items-center justify-center">
                  <Waves className="w-5 h-5" />
                </div>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-blue-50 text-blue-800 border border-blue-200">
                  Rentrée sportive
                </span>
              </div>
              <h2 className="text-lg font-black text-slate-900">
                Tests de nage & Inscriptions en ligne
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                Réservez un créneau de test de niveau de 5 min (obligatoire pour les nouveaux) ou complétez directement votre dossier d&apos;adhésion en ligne.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100">
              <Link
                href="/tests-de-nage"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-colors shadow-xs"
              >
                <Waves className="w-3.5 h-3.5" />
                <span>Réserver un test de niveau</span>
              </Link>
              <Link
                href="/inscription"
                className="inline-flex items-center gap-1 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors"
              >
                <span>M&apos;inscrire en ligne</span>
                <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          </div>

        </div>

        {/* ─── SÉPARATEUR CONTACT AVEC EXPLICATION ─── */}
        <div className="pt-6 border-t border-slate-200">
          <div className="bg-slate-900 text-white rounded-3xl p-6 sm:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-md">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-slate-800 text-cyan-400 text-xs font-bold">
                <HelpCircle className="w-3.5 h-3.5" />
                <span>Demande spécifique</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-white">
                Votre demande n&apos;est pas listée ci-dessus ?
              </h2>
              <p className="text-xs sm:text-sm text-slate-300 max-w-xl">
                Remplissez le formulaire ci-dessous. Le bureau bénévole vous répondra sous 48h à 72h ouvrées.
              </p>
            </div>
            <a
              href="#contact-form"
              className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-white text-slate-900 font-extrabold text-xs sm:text-sm hover:bg-slate-100 transition-colors shrink-0 cursor-pointer"
            >
              <MessageSquare className="w-4 h-4 text-primary" />
              <span>Accéder au formulaire de contact</span>
            </a>
          </div>
        </div>

        {/* ─── FORMULAIRE & COORDONNÉES ─── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Formulaire Intelligent avec Interception */}
          <div id="contact-form" className="lg:col-span-7 bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-sm space-y-6 scroll-mt-28">
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                <MessageSquare className="w-6 h-6 text-primary" />
                <span>Envoyez un message au bureau</span>
              </h2>
              <p className="text-xs text-slate-500 font-medium mt-1">
                Merci de préciser au maximum votre demande afin de nous permettre de la traiter rapidement.
              </p>
            </div>
            <ContactForm />
          </div>

          {/* Coordonnées & Accès */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-sm space-y-5">
              <h3 className="text-lg font-black text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
                <MapPin className="w-5 h-5 text-cyan-600" />
                <span>Coordonnées & Piscine</span>
              </h3>

              <div className="space-y-4 text-xs sm:text-sm text-slate-700">
                <div>
                  <p className="font-extrabold text-slate-900">Triton Club Cavaillon</p>
                  <p className="text-slate-600">Piscine couverte Alphonse Roudière</p>
                  <p className="text-slate-600">Avenue Jean Moulin, quartier La Clède</p>
                  <p className="font-mono text-slate-800 font-bold">84300 Cavaillon</p>
                </div>

                <div className="pt-2 border-t border-slate-100">
                  <p className="font-bold text-slate-900 flex items-center gap-1.5 mb-1">
                    <Mail className="w-4 h-4 text-cyan-600" /> Secrétariat du club
                  </p>
                  <p className="text-slate-600 text-xs">
                    Gestion associative bénévole · Réponse sous 48h à 72h via le formulaire de contact.
                  </p>
                </div>
              </div>

              {/* Réseaux sociaux */}
              <div className="pt-2 border-t border-slate-100">
                <p className="font-bold text-slate-900 text-xs mb-3">Réseaux sociaux & Actualités</p>
                <div className="flex gap-3">
                  <a
                    href="https://www.facebook.com/Triton.C.Cavaillon"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-10 h-10 bg-blue-600 text-white rounded-xl flex items-center justify-center hover:bg-blue-700 transition-colors shadow-xs"
                    aria-label="Facebook"
                  >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M9 8h-3v4h3v12h5v-12h3.642l.358-4h-4v-1.667c0-.955.192-1.333 1.115-1.333h2.885v-5h-3.808c-3.596 0-5.192 1.583-5.192 4.615v3.385z"/></svg>
                  </a>
                  <a
                    href="https://www.instagram.com/tritoncavaillon"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-10 h-10 bg-pink-600 text-white rounded-xl flex items-center justify-center hover:bg-pink-700 transition-colors shadow-xs"
                    aria-label="Instagram"
                  >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
                  </a>
                </div>
              </div>
            </div>

            {/* Plan d'accès */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-3">
              <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                <span>🗺️ Localisation de la piscine</span>
              </h3>
              <div className="aspect-video bg-slate-100 rounded-2xl overflow-hidden border border-slate-200">
                <iframe
                  src="https://www.google.com/maps?q=Piscine+couverte+Alphonse+Roudiere+Cavaillon&output=embed"
                  width="100%"
                  height="100%"
                  style={{ border: 0 }}
                  allowFullScreen
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  title="Localisation Triton Club Cavaillon"
                />
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* Mobile Quick Bar */}
      <div className="fixed bottom-4 left-4 right-4 z-40 md:hidden pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <div className="grid grid-cols-2 gap-2 rounded-2xl bg-white/95 backdrop-blur border border-slate-200 shadow-lg p-2">
          <a
            href="#contact-form"
            className="text-center py-2.5 rounded-xl bg-slate-100 text-slate-800 text-xs font-bold"
          >
            ✉️ Écrire au club
          </a>
          <a
            href="https://www.google.com/maps/dir/?api=1&destination=Piscine+couverte+Alphonse+Roudiere+Cavaillon"
            target="_blank"
            rel="noopener noreferrer"
            className="text-center py-2.5 rounded-xl bg-slate-900 text-white text-xs font-bold"
          >
            📍 Itinéraire
          </a>
        </div>
      </div>

      {/* MODALE SIMULATEUR DE GROUPE */}
      {showFinderModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in overflow-y-auto">
          <div className="relative w-full max-w-3xl my-8">
            <GroupeFinder onClose={() => setShowFinderModal(false)} />
          </div>
        </div>
      )}
    </div>
  )
}
