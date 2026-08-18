'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { 
  Sparkles, 
  ChevronRight, 
  ArrowLeft, 
  RotateCcw, 
  Calendar, 
  CheckCircle2, 
  Waves, 
  X,
  MessageCircleQuestion
} from 'lucide-react'

interface GroupeRecommendation {
  nom: string
  categorie: string
  badgeColor: string
  age: string
  creneaux: string[]
  bassin: string
  tarif: string
  description: string
  pointsForts: string[]
  planningUrl: string
  inscriptionUrl: string
}

const RECOMMENDATIONS: Record<string, GroupeRecommendation> = {
  enf1: {
    nom: 'École de Natation (ENF 1)',
    categorie: 'ENF - Débutant',
    badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    age: '4 à 6 ans (nés en 2020-2022)',
    bassin: 'Petit Bassin (Piscine Alphonse Roudière)',
    creneaux: ['Mercredi 13h30 - 14h15', 'Samedi 09h15 - 10h00'],
    tarif: '220 € / an (Licence FFN incluse)',
    description: 'Idéal pour une première découverte aquatique en toute sérénité. L\'enfant apprend à mettre la tête sous l\'eau, souffler, flotter et se déplacer en confiance avec un coach dédié.',
    pointsForts: ['Coach 100% dédié dans le petit bassin', 'Pédagogie ludique et bienveillante', 'Validation du Sauv\'Nage FFN'],
    planningUrl: '/planning',
    inscriptionUrl: '/inscription'
  },
  enf2: {
    nom: 'École de Natation (ENF 2)',
    categorie: 'ENF - Apprentissage',
    badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    age: '6 à 8 ans (nés en 2018-2020)',
    bassin: 'Petit & Grand Bassin',
    creneaux: ['Mercredi 14h15 - 15h00', 'Samedi 10h00 - 10h45'],
    tarif: '220 € / an (Licence FFN incluse)',
    description: 'Pour les enfants déjà à l\'aise dans l\'eau qui souhaitent apprendre les bases du crawl, du dos et le plongeon, avec passage progressif dans le grand bassin.',
    pointsForts: ['Passage sécurisé vers le grand bassin', 'Acquisition des 3 premières nages', 'Diplôme Pass\'Sport de l\'eau'],
    planningUrl: '/planning',
    inscriptionUrl: '/inscription'
  },
  avenirs_loisir: {
    nom: 'Avenirs Loisirs',
    categorie: 'Loisir Enfant',
    badgeColor: 'bg-teal-100 text-teal-800 border-teal-200',
    age: '7 à 10 ans (nés en 2016-2019)',
    bassin: 'Grand Bassin (Lignes dédiées)',
    creneaux: ['Mardi 17h30 - 18h30', 'Jeudi 17h30 - 18h30'],
    tarif: '240 € / an (Licence FFN incluse)',
    description: 'Nager avec plaisir sans la contrainte des compétitions du week-end. Perfectionnement technique des 4 nages et développement de l\'endurance.',
    pointsForts: ['1 à 2 séances par semaine au choix', 'Pas de compétition obligatoire', 'Ambiance conviviale et sportive'],
    planningUrl: '/planning',
    inscriptionUrl: '/inscription'
  },
  avenirs_comp: {
    nom: 'Avenirs 1 / 2 / 3 (Compétition)',
    categorie: 'Compétition U11',
    badgeColor: 'bg-sky-100 text-sky-800 border-sky-200',
    age: '7 à 10 ans (nés en 2016-2019)',
    bassin: 'Grand Bassin',
    creneaux: ['Lundi, Mardi, Jeudi 17h30 - 18h45', 'Mercredi 15h00 - 16h30'],
    tarif: '240 € à 285 € / an selon niveau',
    description: 'Pour les jeunes motivés par le dépassement de soi et les rencontres interclubs FFN. Perfectionnement poussé des 4 nages, départs, virages et esprit d\'équipe.',
    pointsForts: ['Entraîneurs spécialisés compétition', 'Participation aux trophées FFN du Vaucluse', 'Stage pendant les vacances scolaires'],
    planningUrl: '/planning',
    inscriptionUrl: '/inscription'
  },
  jeunes_loisir: {
    nom: 'Jeunes Loisirs',
    categorie: 'Loisir Ados (11-14 ans)',
    badgeColor: 'bg-teal-100 text-teal-800 border-teal-200',
    age: '11 à 14 ans (Collège)',
    bassin: 'Grand Bassin',
    creneaux: ['Mercredi 16h30 - 17h30', 'Vendredi 18h00 - 19h00'],
    tarif: '240 € / an (Licence FFN incluse)',
    description: 'Un groupe dynamique pour les collégiens souhaitant garder la forme, nager entre amis et perfectionner leur technique de nage sans pression.',
    pointsForts: ['Entraînements variés (palmes, plaquettes)', 'Séances adaptées au rythme scolaire', 'Bien-être et esprit d\'équipe'],
    planningUrl: '/planning',
    inscriptionUrl: '/inscription'
  },
  juniors_loisir: {
    nom: 'Juniors Loisirs',
    categorie: 'Loisir Lycéens (15-18 ans)',
    badgeColor: 'bg-teal-100 text-teal-800 border-teal-200',
    age: '15 à 18 ans (Lycée)',
    bassin: 'Grand Bassin',
    creneaux: ['Lundi 19h15 - 20h30', 'Jeudi 19h15 - 20h30'],
    tarif: '240 € / an (Licence FFN incluse)',
    description: 'Le groupe idéal pour évacuer le stress des cours, travailler son cardio et maintenir une excellente condition physique avec un programme adapté.',
    pointsForts: ['Horaires adaptés aux lycéens', 'Travail cardio et renforcement', 'Ambiance détendue'],
    planningUrl: '/planning',
    inscriptionUrl: '/inscription'
  },
  benjamins_comp: {
    nom: 'Benjamins 1 & 2 (Compétition)',
    categorie: 'Compétition U13',
    badgeColor: 'bg-blue-100 text-blue-800 border-blue-200',
    age: '11 à 13 ans (nés en 2013-2015)',
    bassin: 'Grand Bassin + Salle PPG',
    creneaux: ['Lundi, Mardi, Jeudi, Vendredi 18h30 - 20h00', '+ PPG Mercredi 17h30'],
    tarif: '285 € / an (Licence FFN incluse)',
    description: 'Filière compétition fédérale : volume de nage structuré, préparation physique générale (PPG) et participation aux championnats régionaux PACA.',
    pointsForts: ['Séances quotidiennes + PPG', 'Suivi personnalisé des chronos', 'Stages intensifs inclus'],
    planningUrl: '/planning',
    inscriptionUrl: '/inscription'
  },
  juniors_comp: {
    nom: 'Juniors & Adultes Compétition',
    categorie: 'Compétition Haut Niveau',
    badgeColor: 'bg-indigo-100 text-indigo-800 border-indigo-200',
    age: '14 ans et plus (Cadets, Juniors, Seniors)',
    bassin: 'Grand Bassin + Musculation',
    creneaux: ['Tous les soirs 18h45 - 20h30', '+ PPG / Musculation 2x/semaine'],
    tarif: '330 € / an (Licence FFN incluse)',
    description: 'Groupe élite du club : recherche de qualifications régionales, interrégionales et nationales. Programme complet eau + PPG + planification annuelle.',
    pointsForts: ['Accompagnement compétitif complet', 'Entraîneur diplômé d\'État', 'Stages de perfectionnement'],
    planningUrl: '/planning',
    inscriptionUrl: '/inscription'
  },
  adultes_loisir: {
    nom: 'Adultes Loisirs (Section Maîtres)',
    categorie: 'Loisir Adulte',
    badgeColor: 'bg-teal-100 text-teal-800 border-teal-200',
    age: '18 ans et plus (tous âges)',
    bassin: 'Grand Bassin (Lignes de niveau)',
    creneaux: ['Lundi & Jeudi 20h00 - 21h15', 'Mardi & Vendredi 12h15 - 13h30 (au choix)'],
    tarif: '240 € / an (Licence FFN incluse)',
    description: 'Pour les adultes souhaitant entretenir leur condition physique, nager régulièrement sur des créneaux encadrés et perfectionner leur technique.',
    pointsForts: ['Lignes réparties par niveau de nage', 'Horaires pratiques entre midi et deux ou le soir', 'Ambiance très chaleureuse'],
    planningUrl: '/planning',
    inscriptionUrl: '/inscription'
  },
  adultes_comp: {
    nom: 'Adultes Compétition (Maîtres FFN)',
    categorie: 'Compétition Adulte',
    badgeColor: 'bg-blue-100 text-blue-800 border-blue-200',
    age: '25 ans et plus (Catégorie C1 à C14)',
    bassin: 'Grand Bassin',
    creneaux: ['Lundi, Mardi, Jeudi 19h30 - 21h00', 'Samedi matin'],
    tarif: '285 € / an (Licence FFN incluse)',
    description: 'Pour les nageurs chevronnés désirant participer aux championnats des Maîtres (départementaux, régionaux et France Maîtres).',
    pointsForts: ['Entraînements rythmés et structurés', 'Émulation d\'équipe et relais Maîtres', 'Objectifs de chronos officiels'],
    planningUrl: '/planning',
    inscriptionUrl: '/inscription'
  },
  artistique: {
    nom: 'Natation Artistique (Synchronisée)',
    categorie: 'Artistique & Danse',
    badgeColor: 'bg-pink-100 text-pink-850 border-pink-200',
    age: 'À partir de 7 ans (Enfants, Ados & Adultes)',
    bassin: 'Grand Bassin + Salle PPG / Danse',
    creneaux: ['Mercredi 15h30 - 17h30', 'Vendredi 18h00 - 20h00 (+ PPG)'],
    tarif: '240 € / an (Licence FFN incluse)',
    description: 'Mélange unique de natation, de danse, de souplesse et de musique. Préparation de ballets d\'équipe et grand gala de fin d\'année !',
    pointsForts: ['Coachs spécialisées natation synchronisée', 'Séances de préparation physique et chorégraphie', 'Gala annuel du club'],
    planningUrl: '/planning',
    inscriptionUrl: '/inscription'
  },
  aquafitness: {
    nom: 'AquaFitness / AquaGym',
    categorie: 'Forme & Santé',
    badgeColor: 'bg-cyan-100 text-cyan-850 border-cyan-200',
    age: 'Adultes & Seniors (sans limite d\'âge)',
    bassin: 'Grand Bassin',
    creneaux: ['Mardi 19h15 - 20h00', 'Jeudi 19h15 - 20h00'],
    tarif: '220 € / an (Licence FFN incluse)',
    description: 'Gymnastique dynamique dans l\'eau rythmée par la musique. Idéal pour le renforcement musculaire, le cardio et les articulations sans impact.',
    pointsForts: ['Zéro impact articulaire', 'Ambiance musicale entraînante', 'Idéal pour se remettre au sport'],
    planningUrl: '/planning',
    inscriptionUrl: '/inscription'
  },
  bnssa: {
    nom: 'BNSSA / Sauvetage Aquatique',
    categorie: 'Formation Diplômante',
    badgeColor: 'bg-amber-100 text-amber-850 border-amber-200',
    age: '16 ans et plus (Pré-requis : bon nageur)',
    bassin: 'Grand Bassin',
    creneaux: ['Vendredi soir & Samedi matin'],
    tarif: '220 € / an (+ frais d\'examen)',
    description: 'Préparation complète aux épreuves du Brevet National de Sécurité et Sauvetage Aquatique (remorquage mannequin, apnée, réglementation).',
    pointsForts: ['Formateurs diplômés d\'État', 'Débouchés professionnels (surveillant de baignade l\'été)', 'Entraînement physique exigeant'],
    planningUrl: '/planning',
    inscriptionUrl: '/inscription'
  }
}

interface GroupeFinderProps {
  embedded?: boolean
  onClose?: () => void
}

export default function GroupeFinder({ embedded = false, onClose }: GroupeFinderProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [profil, setProfil] = useState<'enfant' | 'ado' | 'adulte' | 'specifique' | null>(null)
  const [recommendationKey, setRecommendationKey] = useState<string | null>(null)

  const handleSelectProfil = (selected: 'enfant' | 'ado' | 'adulte' | 'specifique') => {
    setProfil(selected)
    setStep(2)
  }

  const handleSelectNiveau = (recKey: string) => {
    setRecommendationKey(recKey)
    setStep(3)
  }

  const handleReset = () => {
    setStep(1)
    setProfil(null)
    setRecommendationKey(null)
  }

  const openChatWithQuestion = (question: string) => {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('open-triton-chat', { detail: { question } }))
    }
  }

  const rec = recommendationKey ? RECOMMENDATIONS[recommendationKey] : null

  return (
    <div className={`w-full ${embedded ? '' : 'bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xl'}`}>
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-6 border-b border-slate-100 pb-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-50 text-cyan-700 text-xs font-black uppercase tracking-wider mb-2 border border-cyan-200/60">
            <Sparkles className="w-3.5 h-3.5 text-cyan-500" />
            <span>Guide Interactif</span>
          </div>
          <h3 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Trouvez votre groupe en 3 clics
          </h3>
          <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1">
            Répondez à 2 questions simples pour découvrir immédiatement le groupe, les horaires et le tarif adapté.
          </p>
        </div>

        {onClose && (
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            aria-label="Fermer"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Progress Bar */}
      <div className="flex items-center justify-between gap-2 mb-8">
        {[1, 2, 3].map((s) => (
          <div key={s} className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className={`w-5 h-5 rounded-full text-[10px] font-black flex items-center justify-center ${
                step >= s ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-400'
              }`}>
                {s}
              </span>
              <span className={`text-[11px] font-bold hidden sm:inline ${
                step >= s ? 'text-slate-900' : 'text-slate-400'
              }`}>
                {s === 1 ? 'Pour qui ?' : s === 2 ? 'Niveau / Objectif' : 'Votre Groupe'}
              </span>
            </div>
            <div className={`h-1.5 rounded-full transition-all duration-300 ${
              step >= s ? 'bg-cyan-500' : 'bg-slate-100'
            }`} />
          </div>
        ))}
      </div>

      {/* ÉTAPE 1 : PROFIL */}
      {step === 1 && (
        <div className="space-y-4 animate-fade-in">
          <p className="text-sm font-extrabold text-slate-800">
            1. Pour qui recherchez-vous une activité ?
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              onClick={() => handleSelectProfil('enfant')}
              className="p-4 rounded-2xl border border-slate-200/80 bg-slate-50/60 hover:bg-cyan-50/50 hover:border-cyan-300 transition-all text-left group cursor-pointer flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <span className="text-3xl p-2 bg-white rounded-xl shadow-xs border border-slate-100">🧒</span>
                <div>
                  <h4 className="text-sm font-black text-slate-900 group-hover:text-cyan-800">Enfant (4 à 10 ans)</h4>
                  <p className="text-xs text-slate-500">Apprentissage, Sauv&apos;Nage, Avenirs</p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-cyan-600 transition-transform group-hover:translate-x-0.5" />
            </button>

            <button
              onClick={() => handleSelectProfil('ado')}
              className="p-4 rounded-2xl border border-slate-200/80 bg-slate-50/60 hover:bg-cyan-50/50 hover:border-cyan-300 transition-all text-left group cursor-pointer flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <span className="text-3xl p-2 bg-white rounded-xl shadow-xs border border-slate-100">🧑</span>
                <div>
                  <h4 className="text-sm font-black text-slate-900 group-hover:text-cyan-800">Adolescent (11 à 17 ans)</h4>
                  <p className="text-xs text-slate-500">Collège, Lycée, Loisirs, Compétition</p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-cyan-600 transition-transform group-hover:translate-x-0.5" />
            </button>

            <button
              onClick={() => handleSelectProfil('adulte')}
              className="p-4 rounded-2xl border border-slate-200/80 bg-slate-50/60 hover:bg-cyan-50/50 hover:border-cyan-300 transition-all text-left group cursor-pointer flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <span className="text-3xl p-2 bg-white rounded-xl shadow-xs border border-slate-100">🏊</span>
                <div>
                  <h4 className="text-sm font-black text-slate-900 group-hover:text-cyan-800">Adulte (18 ans et +)</h4>
                  <p className="text-xs text-slate-500">Nage libre encadrée, Maîtres, Cardio</p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-cyan-600 transition-transform group-hover:translate-x-0.5" />
            </button>

            <button
              onClick={() => handleSelectProfil('specifique')}
              className="p-4 rounded-2xl border border-slate-200/80 bg-slate-50/60 hover:bg-cyan-50/50 hover:border-cyan-300 transition-all text-left group cursor-pointer flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <span className="text-3xl p-2 bg-white rounded-xl shadow-xs border border-slate-100">✨</span>
                <div>
                  <h4 className="text-sm font-black text-slate-900 group-hover:text-cyan-800">Activités Spécifiques</h4>
                  <p className="text-xs text-slate-500">Natation Artistique, AquaFitness, BNSSA</p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-cyan-600 transition-transform group-hover:translate-x-0.5" />
            </button>
          </div>
        </div>
      )}

      {/* ÉTAPE 2 : NIVEAU & OBJECTIF */}
      {step === 2 && profil && (
        <div className="space-y-4 animate-fade-in">
          <div className="flex items-center justify-between">
            <p className="text-sm font-extrabold text-slate-800">
              2. Quel est son niveau ou objectif principal ?
            </p>
            <button
              onClick={() => setStep(1)}
              className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-800 font-bold transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Retour
            </button>
          </div>

          <div className="grid grid-cols-1 gap-2.5">
            {/* Options Enfant */}
            {profil === 'enfant' && (
              <>
                <button
                  onClick={() => handleSelectNiveau('enf1')}
                  className="p-4 rounded-2xl border border-slate-200 bg-white hover:border-cyan-500 hover:bg-cyan-50/30 transition-all text-left group cursor-pointer"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="text-sm font-black text-slate-900 group-hover:text-cyan-800">
                        👶 Débutant complet (4 à 6 ans) · Découverte de l&apos;eau
                      </h4>
                      <p className="text-xs text-slate-500 mt-1">
                        Ne sait pas nager, appréhende ou découvre l&apos;eau. Cours en petit bassin sécurisé.
                      </p>
                    </div>
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
                      ENF 1
                    </span>
                  </div>
                </button>

                <button
                  onClick={() => handleSelectNiveau('enf2')}
                  className="p-4 rounded-2xl border border-slate-200 bg-white hover:border-cyan-500 hover:bg-cyan-50/30 transition-all text-left group cursor-pointer"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="text-sm font-black text-slate-900 group-hover:text-cyan-800">
                        🌊 Déjà à l&apos;aise dans l&apos;eau (6 à 8 ans) · Apprentissage des nages
                      </h4>
                      <p className="text-xs text-slate-500 mt-1">
                        Met la tête sous l&apos;eau sans peur, sait flotter et se déplacer. Apprentissage crawl/dos et passage en grand bassin.
                      </p>
                    </div>
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
                      ENF 2
                    </span>
                  </div>
                </button>

                <button
                  onClick={() => handleSelectNiveau('avenirs_loisir')}
                  className="p-4 rounded-2xl border border-slate-200 bg-white hover:border-cyan-500 hover:bg-cyan-50/30 transition-all text-left group cursor-pointer"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="text-sm font-black text-slate-900 group-hover:text-cyan-800">
                        🏊 Sait nager (7 à 10 ans) · Loisir & Plaisir (sans compétition)
                      </h4>
                      <p className="text-xs text-slate-500 mt-1">
                        Nage 25m en grand bassin. Veut progresser et s&apos;amuser sans faire de compétitions obligatoires le week-end.
                      </p>
                    </div>
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-teal-50 text-teal-700 border border-teal-200 shrink-0">
                      Avenirs Loisirs
                    </span>
                  </div>
                </button>

                <button
                  onClick={() => handleSelectNiveau('avenirs_comp')}
                  className="p-4 rounded-2xl border border-slate-200 bg-white hover:border-cyan-500 hover:bg-cyan-50/30 transition-all text-left group cursor-pointer"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="text-sm font-black text-slate-900 group-hover:text-cyan-800">
                        🏅 Bon nageur (7 à 10 ans) · Compétition FFN & Dépassement
                      </h4>
                      <p className="text-xs text-slate-500 mt-1">
                        Maîtrise au moins 2 nages. Motivé pour participer aux trophées et rencontres du club.
                      </p>
                    </div>
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-sky-50 text-sky-700 border border-sky-200 shrink-0">
                      Avenirs 1 / 2 / 3
                    </span>
                  </div>
                </button>
              </>
            )}

            {/* Options Adolescent */}
            {profil === 'ado' && (
              <>
                <button
                  onClick={() => handleSelectNiveau('jeunes_loisir')}
                  className="p-4 rounded-2xl border border-slate-200 bg-white hover:border-cyan-500 hover:bg-cyan-50/30 transition-all text-left group cursor-pointer"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="text-sm font-black text-slate-900 group-hover:text-cyan-800">
                        🏊 Collégien (11 à 14 ans) · Nage loisir & Forme
                      </h4>
                      <p className="text-xs text-slate-500 mt-1">
                        1 à 2 séances par semaine pour nager entre amis, garder la forme sans compétition.
                      </p>
                    </div>
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-teal-50 text-teal-700 border border-teal-200 shrink-0">
                      Jeunes Loisirs
                    </span>
                  </div>
                </button>

                <button
                  onClick={() => handleSelectNiveau('juniors_loisir')}
                  className="p-4 rounded-2xl border border-slate-200 bg-white hover:border-cyan-500 hover:bg-cyan-50/30 transition-all text-left group cursor-pointer"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="text-sm font-black text-slate-900 group-hover:text-cyan-800">
                        🏊 Lycéen (15 à 18 ans) · Nage loisir & Décompression
                      </h4>
                      <p className="text-xs text-slate-500 mt-1">
                        Séances en soirée pour maintenir une excellente condition physique et décompresser des études.
                      </p>
                    </div>
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-teal-50 text-teal-700 border border-teal-200 shrink-0">
                      Juniors Loisirs
                    </span>
                  </div>
                </button>

                <button
                  onClick={() => handleSelectNiveau('benjamins_comp')}
                  className="p-4 rounded-2xl border border-slate-200 bg-white hover:border-cyan-500 hover:bg-cyan-50/30 transition-all text-left group cursor-pointer"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="text-sm font-black text-slate-900 group-hover:text-cyan-800">
                        🏅 11 à 13 ans · Compétition FFN & Entraînement régulier
                      </h4>
                      <p className="text-xs text-slate-500 mt-1">
                        Filière compétition fédérale : 3 à 4 entraînements par semaine + préparation physique.
                      </p>
                    </div>
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-blue-50 text-blue-700 border border-blue-200 shrink-0">
                      Benjamins 1 / 2
                    </span>
                  </div>
                </button>

                <button
                  onClick={() => handleSelectNiveau('juniors_comp')}
                  className="p-4 rounded-2xl border border-slate-200 bg-white hover:border-cyan-500 hover:bg-cyan-50/30 transition-all text-left group cursor-pointer"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="text-sm font-black text-slate-900 group-hover:text-cyan-800">
                        🔥 14 à 18 ans · Compétition Haut Niveau & Chronos
                      </h4>
                      <p className="text-xs text-slate-500 mt-1">
                        Entraînement quotidien intensif, PPG, musculation, stages et championnats régionaux / nationaux.
                      </p>
                    </div>
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-indigo-50 text-indigo-700 border border-indigo-200 shrink-0">
                      Juniors Compétition
                    </span>
                  </div>
                </button>
              </>
            )}

            {/* Options Adulte */}
            {profil === 'adulte' && (
              <>
                <button
                  onClick={() => handleSelectNiveau('adultes_loisir')}
                  className="p-4 rounded-2xl border border-slate-200 bg-white hover:border-cyan-500 hover:bg-cyan-50/30 transition-all text-left group cursor-pointer"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="text-sm font-black text-slate-900 group-hover:text-cyan-800">
                        🏊 Nage libre & Perfectionnement (1 ou 2 fois / semaine)
                      </h4>
                      <p className="text-xs text-slate-500 mt-1">
                        Créneaux encadrés entre midi et deux ou le soir. Lignes d&apos;eau par niveau, du débutant au confirmé.
                      </p>
                    </div>
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-teal-50 text-teal-700 border border-teal-200 shrink-0">
                      Adultes Loisirs
                    </span>
                  </div>
                </button>

                <button
                  onClick={() => handleSelectNiveau('adultes_comp')}
                  className="p-4 rounded-2xl border border-slate-200 bg-white hover:border-cyan-500 hover:bg-cyan-50/30 transition-all text-left group cursor-pointer"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="text-sm font-black text-slate-900 group-hover:text-cyan-800">
                        🏅 Compétition Maîtres FFN (25 ans et +)
                      </h4>
                      <p className="text-xs text-slate-500 mt-1">
                        Entraînements soutenus et participation aux championnats des Maîtres régionaux et France.
                      </p>
                    </div>
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-blue-50 text-blue-700 border border-blue-200 shrink-0">
                      Adultes Compétition
                    </span>
                  </div>
                </button>

                <button
                  onClick={() => handleSelectNiveau('aquafitness')}
                  className="p-4 rounded-2xl border border-slate-200 bg-white hover:border-cyan-500 hover:bg-cyan-50/30 transition-all text-left group cursor-pointer"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="text-sm font-black text-slate-900 group-hover:text-cyan-800">
                        💧 AquaGym / AquaFitness (Cardio & Tonification en musique)
                      </h4>
                      <p className="text-xs text-slate-500 mt-1">
                        Séances dynamiques en musique sans impact articulaire. Idéal pour sculpter et se dépenser.
                      </p>
                    </div>
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-cyan-50 text-cyan-700 border border-cyan-200 shrink-0">
                      AquaFitness
                    </span>
                  </div>
                </button>
              </>
            )}

            {/* Options Spécifiques */}
            {profil === 'specifique' && (
              <>
                <button
                  onClick={() => handleSelectNiveau('artistique')}
                  className="p-4 rounded-2xl border border-slate-200 bg-white hover:border-cyan-500 hover:bg-cyan-50/30 transition-all text-left group cursor-pointer"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="text-sm font-black text-slate-900 group-hover:text-cyan-800">
                        🎭 Natation Artistique (Synchronisée) · Enfants & Ados
                      </h4>
                      <p className="text-xs text-slate-500 mt-1">
                        Chorégraphies aquatiques en musique, figures, souplesse, PPG et grand gala annuel !
                      </p>
                    </div>
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-pink-50 text-pink-700 border border-pink-200 shrink-0">
                      Artistique
                    </span>
                  </div>
                </button>

                <button
                  onClick={() => handleSelectNiveau('aquafitness')}
                  className="p-4 rounded-2xl border border-slate-200 bg-white hover:border-cyan-500 hover:bg-cyan-50/30 transition-all text-left group cursor-pointer"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="text-sm font-black text-slate-900 group-hover:text-cyan-800">
                        💧 AquaFitness / AquaGym · Adultes
                      </h4>
                      <p className="text-xs text-slate-500 mt-1">
                        Gymnastique aquatique en musique le mardi et jeudi soir (zéro impact articulaire).
                      </p>
                    </div>
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-cyan-50 text-cyan-700 border border-cyan-200 shrink-0">
                      AquaFitness
                    </span>
                  </div>
                </button>

                <button
                  onClick={() => handleSelectNiveau('bnssa')}
                  className="p-4 rounded-2xl border border-slate-200 bg-white hover:border-cyan-500 hover:bg-cyan-50/30 transition-all text-left group cursor-pointer"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="text-sm font-black text-slate-900 group-hover:text-cyan-800">
                        🛟 Formation BNSSA / Sauvetage & Surveillance Aquatique
                      </h4>
                      <p className="text-xs text-slate-500 mt-1">
                        Préparation intensive au diplôme de surveillant de baignade pour exercer l&apos;été (dès 16 ans).
                      </p>
                    </div>
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-amber-50 text-amber-700 border border-amber-200 shrink-0">
                      BNSSA
                    </span>
                  </div>
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* ÉTAPE 3 : RÉSULTAT PERSONNALISÉ */}
      {step === 3 && rec && (
        <div className="space-y-6 animate-fade-in">
          <div className="bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white rounded-3xl p-6 sm:p-8 shadow-xl border border-slate-800 space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-4">
              <div className="space-y-1">
                <span className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider ${rec.badgeColor} border`}>
                  {rec.categorie}
                </span>
                <h4 className="text-2xl sm:text-3xl font-black text-white mt-2">
                  {rec.nom}
                </h4>
              </div>
              <div className="text-right">
                <p className="text-[11px] uppercase font-bold text-slate-400">Tarif Saison</p>
                <p className="text-xl sm:text-2xl font-black text-cyan-400">{rec.tarif}</p>
              </div>
            </div>

            <p className="text-xs sm:text-sm text-slate-300 font-light leading-relaxed">
              {rec.description}
            </p>

            {/* Infos clés */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-white/5 rounded-2xl p-4 border border-white/10 text-xs">
              <div className="space-y-1.5">
                <p className="font-extrabold text-cyan-300 flex items-center gap-1.5">
                  <Calendar className="w-4 h-4" /> Âge & Créneaux :
                </p>
                <p className="text-slate-300 font-medium">{rec.age}</p>
                <ul className="space-y-1 text-slate-400 mt-1">
                  {rec.creneaux.map((cr, idx) => (
                    <li key={idx} className="flex items-center gap-1.5 font-mono text-[11px] text-slate-200">
                      • {cr}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="space-y-1.5">
                <p className="font-extrabold text-cyan-300 flex items-center gap-1.5">
                  <Waves className="w-4 h-4" /> Bassin & Atouts :
                </p>
                <p className="text-slate-300 font-medium">{rec.bassin}</p>
                <ul className="space-y-1 text-slate-400 mt-1">
                  {rec.pointsForts.map((pf, idx) => (
                    <li key={idx} className="flex items-center gap-1 text-[11px] text-slate-300">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span>{pf}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <Link
                href={rec.inscriptionUrl}
                className="flex-1 text-center py-3.5 px-6 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-black text-xs sm:text-sm shadow-md transition-all uppercase tracking-wider"
              >
                📋 S&apos;inscrire dans ce groupe
              </Link>
              <Link
                href={rec.planningUrl}
                className="flex-1 text-center py-3.5 px-6 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs sm:text-sm border border-white/20 transition-all uppercase tracking-wider"
              >
                📅 Voir le planning complet
              </Link>
            </div>
          </div>

          {/* Footer Navigation */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100 text-xs text-slate-500 font-medium">
            <button
              onClick={handleReset}
              className="inline-flex items-center gap-1.5 text-slate-700 hover:text-slate-950 font-bold transition-colors cursor-pointer py-1.5 px-3 rounded-lg hover:bg-slate-100"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Tester un autre profil
            </button>

            <button
              onClick={() => openChatWithQuestion(`Je souhaite plus d'informations sur le groupe ${rec.nom}`)}
              className="inline-flex items-center gap-1.5 text-cyan-700 hover:text-cyan-900 font-bold transition-colors cursor-pointer"
            >
              <MessageCircleQuestion className="w-4 h-4" />
              Une question sur ce groupe ? Demander à l&apos;assistant IA
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
