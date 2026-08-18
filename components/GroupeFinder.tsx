'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { 
  Users, 
  User, 
  Waves, 
  Activity, 
  ChevronRight, 
  ArrowLeft, 
  RotateCcw, 
  Calendar, 
  Check, 
  X,
  Compass
} from 'lucide-react'

interface GroupeRecommendation {
  nom: string
  categorie: string
  badgeBg: string
  badgeText: string
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
    categorie: 'École de Natation',
    badgeBg: 'bg-emerald-50 border-emerald-200',
    badgeText: 'text-emerald-800',
    age: '4 à 6 ans (nés en 2020-2022)',
    bassin: 'Petit Bassin · Piscine Alphonse Roudière',
    creneaux: ['Mercredi 13h30 - 14h15', 'Samedi 09h15 - 10h00'],
    tarif: '220 € / an (licence FFN comprise)',
    description: 'Première découverte aquatique en petit groupe. L\'enfant apprend à être en confiance, mettre la tête sous l\'eau, souffler, flotter et se déplacer.',
    pointsForts: ['Encadrement dédié dans le petit bassin', 'Apprentissage progressif et ludique', 'Validation du Sauv\'Nage'],
    planningUrl: '/planning',
    inscriptionUrl: '/inscription'
  },
  enf2: {
    nom: 'École de Natation (ENF 2)',
    categorie: 'École de Natation',
    badgeBg: 'bg-emerald-50 border-emerald-200',
    badgeText: 'text-emerald-800',
    age: '6 à 8 ans (nés en 2018-2020)',
    bassin: 'Petit & Grand Bassin',
    creneaux: ['Mercredi 14h15 - 15h00', 'Samedi 10h00 - 10h45'],
    tarif: '220 € / an (licence FFN comprise)',
    description: 'Pour les enfants déjà à l\'aise dans l\'eau qui apprennent les bases du crawl, du dos et le plongeon avec une transition vers le grand bassin.',
    pointsForts: ['Passage progressif en grand bassin', 'Apprentissage des techniques de nage', 'Pass\'Sport de l\'eau'],
    planningUrl: '/planning',
    inscriptionUrl: '/inscription'
  },
  avenirs_loisir: {
    nom: 'Avenirs Loisirs',
    categorie: 'Loisir Enfant',
    badgeBg: 'bg-sky-50 border-sky-200',
    badgeText: 'text-sky-800',
    age: '7 à 10 ans (nés en 2016-2019)',
    bassin: 'Grand Bassin',
    creneaux: ['Mardi 17h30 - 18h30', 'Jeudi 17h30 - 18h30'],
    tarif: '240 € / an (licence FFN comprise)',
    description: 'Nager pour le plaisir et perfectionner ses nages sur 1 ou 2 créneaux par semaine, sans obligation de compétition.',
    pointsForts: ['1 ou 2 séances par semaine au choix', 'Pratique sportive conviviale', 'Perfectionnement 4 nages'],
    planningUrl: '/planning',
    inscriptionUrl: '/inscription'
  },
  avenirs_comp: {
    nom: 'Avenirs 1 / 2 / 3 (Compétition)',
    categorie: 'Compétition Jeunes',
    badgeBg: 'bg-indigo-50 border-indigo-200',
    badgeText: 'text-indigo-800',
    age: '7 à 10 ans (nés en 2016-2019)',
    bassin: 'Grand Bassin',
    creneaux: ['Lundi, Mardi, Jeudi 17h30 - 18h45', 'Mercredi 15h00 - 16h30'],
    tarif: '240 € à 285 € / an selon le niveau',
    description: 'Pour les jeunes nageurs souhaitant s\'entraîner régulièrement et participer aux rencontres interclubs et compétitions FFN du département.',
    pointsForts: ['Entraîneurs spécialisés compétition', 'Stages de perfectionnement', 'Rencontres et championnats FFN'],
    planningUrl: '/planning',
    inscriptionUrl: '/inscription'
  },
  jeunes_loisir: {
    nom: 'Jeunes Loisirs',
    categorie: 'Loisir Collège',
    badgeBg: 'bg-sky-50 border-sky-200',
    badgeText: 'text-sky-800',
    age: '11 à 14 ans (Collégiens)',
    bassin: 'Grand Bassin',
    creneaux: ['Mercredi 16h30 - 17h30', 'Vendredi 18h00 - 19h00'],
    tarif: '240 € / an (licence FFN comprise)',
    description: 'Activité sportive pour collégiens : travail de l\'endurance, amélioration technique et bonne ambiance entre nageurs du même âge.',
    pointsForts: ['Horaires adaptés aux collégiens', 'Séances complètes avec matériel', 'Esprit d\'équipe et bien-être'],
    planningUrl: '/planning',
    inscriptionUrl: '/inscription'
  },
  juniors_loisir: {
    nom: 'Juniors Loisirs',
    categorie: 'Loisir Lycée',
    badgeBg: 'bg-sky-50 border-sky-200',
    badgeText: 'text-sky-800',
    age: '15 à 18 ans (Lycéens)',
    bassin: 'Grand Bassin',
    creneaux: ['Lundi 19h15 - 20h30', 'Jeudi 19h15 - 20h30'],
    tarif: '240 € / an (licence FFN comprise)',
    description: 'Séances en soirée pour les lycéens désirant maintenir une activité physique régulière et nager dans un cadre structuré.',
    pointsForts: ['Créneaux adaptés aux lycéens', 'Entretien de la condition physique', 'Ambiance conviviale'],
    planningUrl: '/planning',
    inscriptionUrl: '/inscription'
  },
  benjamins_comp: {
    nom: 'Benjamins 1 & 2 (Compétition)',
    categorie: 'Compétition FFN',
    badgeBg: 'bg-indigo-50 border-indigo-200',
    badgeText: 'text-indigo-800',
    age: '11 à 13 ans (nés en 2013-2015)',
    bassin: 'Grand Bassin + PPG',
    creneaux: ['Lundi, Mardi, Jeudi, Vendredi 18h30 - 20h00', 'PPG Mercredi 17h30'],
    tarif: '285 € / an (licence FFN comprise)',
    description: 'Filière compétition départementale et régionale. Volume de nage structuré, préparation physique générale (PPG) et suivi chronométrique.',
    pointsForts: ['Séances quotidiennes + préparation physique', 'Participation aux compétitions régionales PACA', 'Stages de perfectionnement'],
    planningUrl: '/planning',
    inscriptionUrl: '/inscription'
  },
  juniors_comp: {
    nom: 'Juniors & Adultes Compétition',
    categorie: 'Compétition Haut Niveau',
    badgeBg: 'bg-indigo-50 border-indigo-200',
    badgeText: 'text-indigo-800',
    age: '14 ans et plus (Cadets, Juniors, Seniors)',
    bassin: 'Grand Bassin + Musculation',
    creneaux: ['Tous les soirs 18h45 - 20h30', 'PPG / Renforcement 2x/semaine'],
    tarif: '330 € / an (licence FFN comprise)',
    description: 'Groupe compétition avancé : objectifs de qualifications régionales et nationales, programme d\'entraînement quotidien et stages intensifs.',
    pointsForts: ['Encadrement par entraîneur diplômé d\'État', 'Planification annuelle de la performance', 'Stages sportifs dédiés'],
    planningUrl: '/planning',
    inscriptionUrl: '/inscription'
  },
  adultes_loisir: {
    nom: 'Adultes Loisirs',
    categorie: 'Section Adultes',
    badgeBg: 'bg-slate-100 border-slate-200',
    badgeText: 'text-slate-800',
    age: '18 ans et plus',
    bassin: 'Grand Bassin (lignes par niveau)',
    creneaux: ['Lundi & Jeudi 20h00 - 21h15', 'Mardi & Vendredi 12h15 - 13h30'],
    tarif: '240 € / an (licence FFN comprise)',
    description: 'Créneaux encadrés entre midi et deux ou le soir pour pratiquer la natation à son rythme avec des lignes d\'eau réparties par niveau.',
    pointsForts: ['Lignes de niveau adaptées', 'Choix des créneaux (midi ou soir)', 'Conseils techniques individualisés'],
    planningUrl: '/planning',
    inscriptionUrl: '/inscription'
  },
  adultes_comp: {
    nom: 'Adultes Compétition (Maîtres)',
    categorie: 'Maîtres FFN',
    badgeBg: 'bg-indigo-50 border-indigo-200',
    badgeText: 'text-indigo-800',
    age: '25 ans et plus (catégories C1 à C14)',
    bassin: 'Grand Bassin',
    creneaux: ['Lundi, Mardi, Jeudi 19h30 - 21h00', 'Samedi matin'],
    tarif: '285 € / an (licence FFN comprise)',
    description: 'Pour les nageurs expérimentés souhaitant s\'entraîner avec intensité et participer aux championnats régionaux et nationaux des Maîtres.',
    pointsForts: ['Entraînements structurés et exigeants', 'Relais et dynamique d\'équipe', 'Compétitions officielles FFN'],
    planningUrl: '/planning',
    inscriptionUrl: '/inscription'
  },
  artistique: {
    nom: 'Natation Artistique',
    categorie: 'Artistique & Danse',
    badgeBg: 'bg-purple-50 border-purple-200',
    badgeText: 'text-purple-800',
    age: 'Dès 7 ans (Enfants, Ados & Adultes)',
    bassin: 'Grand Bassin + Salle PPG',
    creneaux: ['Mercredi 15h30 - 17h30', 'Vendredi 18h00 - 20h00 (+ PPG)'],
    tarif: '240 € / an (licence FFN comprise)',
    description: 'Discipline mêlant natation, chorégraphie, souplesse et musique. Ballets d\'équipe, travail technique et grand gala annuel.',
    pointsForts: ['Entraîneurs spécialisées', 'Préparation physique et chorégraphique', 'Gala de fin de saison'],
    planningUrl: '/planning',
    inscriptionUrl: '/inscription'
  },
  aquafitness: {
    nom: 'AquaFitness',
    categorie: 'Forme & Santé',
    badgeBg: 'bg-emerald-50 border-emerald-200',
    badgeText: 'text-emerald-800',
    age: 'Adultes & Seniors',
    bassin: 'Grand Bassin',
    creneaux: ['Mardi 19h15 - 20h00', 'Jeudi 19h15 - 20h00'],
    tarif: '220 € / an (licence FFN comprise)',
    description: 'Gymnastique aquatique en musique. Renforcement musculaire complet et travail cardio sans impact sur les articulations.',
    pointsForts: ['Sans choc articulaire', 'Ambiance dynamique en musique', 'Idéal pour la remise en forme'],
    planningUrl: '/planning',
    inscriptionUrl: '/inscription'
  },
  bnssa: {
    nom: 'Formation BNSSA',
    categorie: 'Sauvetage & Surveillance',
    badgeBg: 'bg-amber-50 border-amber-200',
    badgeText: 'text-amber-800',
    age: 'Dès 16 ans (bon nageur requis)',
    bassin: 'Grand Bassin',
    creneaux: ['Vendredi soir & Samedi matin'],
    tarif: '220 € / an (+ frais d\'examen)',
    description: 'Préparation complète au Brevet National de Sécurité et de Sauvetage Aquatique pour exercer la surveillance de baignade.',
    pointsForts: ['Formateurs diplômés d\'État', 'Préparation physique et technique', 'Diplôme professionnel'],
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

  const rec = recommendationKey ? RECOMMENDATIONS[recommendationKey] : null

  return (
    <div className={`w-full ${embedded ? '' : 'bg-white rounded-3xl p-6 md:p-8 border border-slate-200 shadow-xl'}`}>
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-6 border-b border-slate-100 pb-5">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-bold uppercase tracking-wider mb-2 border border-slate-200">
            <Compass className="w-3.5 h-3.5 text-primary" />
            <span>Orientation Club</span>
          </div>
          <h3 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">
            Trouver mon groupe
          </h3>
          <p className="text-xs md:text-sm text-slate-600 font-medium mt-1">
            Sélectionnez votre profil pour afficher directement le groupe, les horaires et le tarif adapté.
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

      {/* Étapes */}
      <div className="flex items-center justify-between gap-2 mb-6">
        {[1, 2, 3].map((s) => (
          <div key={s} className="flex-1">
            <div className="flex items-center gap-2 mb-1.5">
              <span className={`w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center ${
                step >= s ? 'bg-primary text-white' : 'bg-slate-100 text-slate-400'
              }`}>
                {s}
              </span>
              <span className={`text-[11px] font-bold hidden sm:inline ${
                step >= s ? 'text-slate-900' : 'text-slate-400'
              }`}>
                {s === 1 ? 'Pour qui ?' : s === 2 ? 'Niveau / Objectif' : 'Recommandation'}
              </span>
            </div>
            <div className={`h-1 rounded-full transition-all duration-200 ${
              step >= s ? 'bg-primary' : 'bg-slate-100'
            }`} />
          </div>
        ))}
      </div>

      {/* ÉTAPE 1 : PROFIL */}
      {step === 1 && (
        <div className="space-y-4 animate-fade-in">
          <p className="text-sm font-bold text-slate-900">
            1. Pour qui recherchez-vous une activité ?
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              onClick={() => handleSelectProfil('enfant')}
              className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50 hover:bg-white hover:border-primary hover:shadow-xs transition-all text-left group cursor-pointer flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-white rounded-xl border border-slate-200 text-slate-700 group-hover:text-primary group-hover:border-primary/40 transition-colors">
                  <User className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900 group-hover:text-primary transition-colors">Enfant (4 à 10 ans)</h4>
                  <p className="text-xs text-slate-500 font-medium">École de natation, Sauv&apos;Nage, Avenirs</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-primary transition-transform group-hover:translate-x-0.5" />
            </button>

            <button
              onClick={() => handleSelectProfil('ado')}
              className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50 hover:bg-white hover:border-primary hover:shadow-xs transition-all text-left group cursor-pointer flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-white rounded-xl border border-slate-200 text-slate-700 group-hover:text-primary group-hover:border-primary/40 transition-colors">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900 group-hover:text-primary transition-colors">Adolescent (11 à 17 ans)</h4>
                  <p className="text-xs text-slate-500 font-medium">Collège, Lycée, Loisirs, Compétition</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-primary transition-transform group-hover:translate-x-0.5" />
            </button>

            <button
              onClick={() => handleSelectProfil('adulte')}
              className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50 hover:bg-white hover:border-primary hover:shadow-xs transition-all text-left group cursor-pointer flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-white rounded-xl border border-slate-200 text-slate-700 group-hover:text-primary group-hover:border-primary/40 transition-colors">
                  <Waves className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900 group-hover:text-primary transition-colors">Adulte (18 ans et +)</h4>
                  <p className="text-xs text-slate-500 font-medium">Nage libre encadrée, Maîtres, Perfectionnement</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-primary transition-transform group-hover:translate-x-0.5" />
            </button>

            <button
              onClick={() => handleSelectProfil('specifique')}
              className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50 hover:bg-white hover:border-primary hover:shadow-xs transition-all text-left group cursor-pointer flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-white rounded-xl border border-slate-200 text-slate-700 group-hover:text-primary group-hover:border-primary/40 transition-colors">
                  <Activity className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900 group-hover:text-primary transition-colors">Disciplines Spécifiques</h4>
                  <p className="text-xs text-slate-500 font-medium">Natation Artistique, AquaFitness, BNSSA</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-primary transition-transform group-hover:translate-x-0.5" />
            </button>
          </div>
        </div>
      )}

      {/* ÉTAPE 2 : NIVEAU & OBJECTIF */}
      {step === 2 && profil && (
        <div className="space-y-4 animate-fade-in">
          <div className="flex items-center justify-between">
            <p className="text-sm font-bold text-slate-900">
              2. Quel est le niveau ou l&apos;objectif recherché ?
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
                  className="p-4 rounded-2xl border border-slate-200 bg-white hover:border-primary hover:bg-emerald-50/20 transition-all text-left group cursor-pointer"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 group-hover:text-primary">
                        Débutant complet (4 à 6 ans) · Découverte et aisance dans l&apos;eau
                      </h4>
                      <p className="text-xs text-slate-500 font-medium mt-1">
                        Ne sait pas nager ou appréhende l&apos;eau. Séances en petit bassin sécurisé.
                      </p>
                    </div>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 shrink-0">
                      ENF 1
                    </span>
                  </div>
                </button>

                <button
                  onClick={() => handleSelectNiveau('enf2')}
                  className="p-4 rounded-2xl border border-slate-200 bg-white hover:border-primary hover:bg-emerald-50/20 transition-all text-left group cursor-pointer"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 group-hover:text-primary">
                        À l&apos;aise dans l&apos;eau (6 à 8 ans) · Apprentissage des nages
                      </h4>
                      <p className="text-xs text-slate-500 font-medium mt-1">
                        Met la tête sous l&apos;eau sans crainte, sait flotter et se déplacer. Apprentissage crawl/dos et passage en grand bassin.
                      </p>
                    </div>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 shrink-0">
                      ENF 2
                    </span>
                  </div>
                </button>

                <button
                  onClick={() => handleSelectNiveau('avenirs_loisir')}
                  className="p-4 rounded-2xl border border-slate-200 bg-white hover:border-primary hover:bg-sky-50/20 transition-all text-left group cursor-pointer"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 group-hover:text-primary">
                        Sait nager (7 à 10 ans) · Pratique Loisir (sans compétition)
                      </h4>
                      <p className="text-xs text-slate-500 font-medium mt-1">
                        Nage 25m en grand bassin. Perfectionnement technique sans contrainte de compétition le week-end.
                      </p>
                    </div>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-sky-50 text-sky-800 border border-sky-200 shrink-0">
                      Avenirs Loisirs
                    </span>
                  </div>
                </button>

                <button
                  onClick={() => handleSelectNiveau('avenirs_comp')}
                  className="p-4 rounded-2xl border border-slate-200 bg-white hover:border-primary hover:bg-indigo-50/20 transition-all text-left group cursor-pointer"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 group-hover:text-primary">
                        Bon nageur (7 à 10 ans) · Compétition FFN & Progression
                      </h4>
                      <p className="text-xs text-slate-500 font-medium mt-1">
                        Maîtrise au moins 2 nages. Souhaite s&apos;entraîner régulièrement et participer aux rencontres interclubs.
                      </p>
                    </div>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-800 border border-indigo-200 shrink-0">
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
                  className="p-4 rounded-2xl border border-slate-200 bg-white hover:border-primary hover:bg-sky-50/20 transition-all text-left group cursor-pointer"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 group-hover:text-primary">
                        Collégien (11 à 14 ans) · Nage loisir & Entretien physique
                      </h4>
                      <p className="text-xs text-slate-500 font-medium mt-1">
                        1 à 2 séances par semaine pour garder la forme et perfectionner sa technique sans compétition.
                      </p>
                    </div>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-sky-50 text-sky-800 border border-sky-200 shrink-0">
                      Jeunes Loisirs
                    </span>
                  </div>
                </button>

                <button
                  onClick={() => handleSelectNiveau('juniors_loisir')}
                  className="p-4 rounded-2xl border border-slate-200 bg-white hover:border-primary hover:bg-sky-50/20 transition-all text-left group cursor-pointer"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 group-hover:text-primary">
                        Lycéen (15 à 18 ans) · Nage loisir en soirée
                      </h4>
                      <p className="text-xs text-slate-500 font-medium mt-1">
                        Séances adaptées au rythme des études pour maintenir une excellente condition physique.
                      </p>
                    </div>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-sky-50 text-sky-800 border border-sky-200 shrink-0">
                      Juniors Loisirs
                    </span>
                  </div>
                </button>

                <button
                  onClick={() => handleSelectNiveau('benjamins_comp')}
                  className="p-4 rounded-2xl border border-slate-200 bg-white hover:border-primary hover:bg-indigo-50/20 transition-all text-left group cursor-pointer"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 group-hover:text-primary">
                        11 à 13 ans · Compétition FFN & Entraînements réguliers
                      </h4>
                      <p className="text-xs text-slate-500 font-medium mt-1">
                        3 à 4 entraînements par semaine + préparation physique générale (PPG).
                      </p>
                    </div>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-800 border border-indigo-200 shrink-0">
                      Benjamins 1 / 2
                    </span>
                  </div>
                </button>

                <button
                  onClick={() => handleSelectNiveau('juniors_comp')}
                  className="p-4 rounded-2xl border border-slate-200 bg-white hover:border-primary hover:bg-indigo-50/20 transition-all text-left group cursor-pointer"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 group-hover:text-primary">
                        14 à 18 ans · Compétition niveau Régional / National
                      </h4>
                      <p className="text-xs text-slate-500 font-medium mt-1">
                        Programme quotidien intensif, préparation physique, stages et suivi des performances.
                      </p>
                    </div>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-800 border border-indigo-200 shrink-0">
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
                  className="p-4 rounded-2xl border border-slate-200 bg-white hover:border-primary hover:bg-slate-50 transition-all text-left group cursor-pointer"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 group-hover:text-primary">
                        Nage libre encadrée & Perfectionnement (midi ou soir)
                      </h4>
                      <p className="text-xs text-slate-500 font-medium mt-1">
                        Créneaux encadrés avec lignes réparties selon le niveau de chaque nageur.
                      </p>
                    </div>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-800 border border-slate-200 shrink-0">
                      Adultes Loisirs
                    </span>
                  </div>
                </button>

                <button
                  onClick={() => handleSelectNiveau('adultes_comp')}
                  className="p-4 rounded-2xl border border-slate-200 bg-white hover:border-primary hover:bg-indigo-50/20 transition-all text-left group cursor-pointer"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 group-hover:text-primary">
                        Compétition Maîtres FFN (25 ans et +)
                      </h4>
                      <p className="text-xs text-slate-500 font-medium mt-1">
                        Entraînements structurés et participation aux championnats des Maîtres.
                      </p>
                    </div>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-800 border border-indigo-200 shrink-0">
                      Adultes Compétition
                    </span>
                  </div>
                </button>

                <button
                  onClick={() => handleSelectNiveau('aquafitness')}
                  className="p-4 rounded-2xl border border-slate-200 bg-white hover:border-primary hover:bg-emerald-50/20 transition-all text-left group cursor-pointer"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 group-hover:text-primary">
                        AquaFitness / Renforcement musculaire dans l&apos;eau
                      </h4>
                      <p className="text-xs text-slate-500 font-medium mt-1">
                        Gymnastique aquatique rythmée en musique, sans choc articulaire.
                      </p>
                    </div>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 shrink-0">
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
                  className="p-4 rounded-2xl border border-slate-200 bg-white hover:border-primary hover:bg-purple-50/20 transition-all text-left group cursor-pointer"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 group-hover:text-primary">
                        Natation Artistique (Synchronisée)
                      </h4>
                      <p className="text-xs text-slate-500 font-medium mt-1">
                        Chorégraphies aquatiques en musique, souplesse, PPG et gala de fin d&apos;année.
                      </p>
                    </div>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 text-purple-800 border border-purple-200 shrink-0">
                      Artistique
                    </span>
                  </div>
                </button>

                <button
                  onClick={() => handleSelectNiveau('aquafitness')}
                  className="p-4 rounded-2xl border border-slate-200 bg-white hover:border-primary hover:bg-emerald-50/20 transition-all text-left group cursor-pointer"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 group-hover:text-primary">
                        AquaFitness / AquaGym
                      </h4>
                      <p className="text-xs text-slate-500 font-medium mt-1">
                        Séances dynamiques de remise en forme le mardi et jeudi soir.
                      </p>
                    </div>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 shrink-0">
                      AquaFitness
                    </span>
                  </div>
                </button>

                <button
                  onClick={() => handleSelectNiveau('bnssa')}
                  className="p-4 rounded-2xl border border-slate-200 bg-white hover:border-primary hover:bg-amber-50/20 transition-all text-left group cursor-pointer"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 group-hover:text-primary">
                        Formation BNSSA / Surveillance Aquatique
                      </h4>
                      <p className="text-xs text-slate-500 font-medium mt-1">
                        Préparation diplômante aux épreuves de sauveteur aquatique (dès 16 ans).
                      </p>
                    </div>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200 shrink-0">
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
          <div className="bg-white rounded-2xl p-6 md:p-8 border border-slate-200/90 shadow-sm space-y-6">
            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 pb-5">
              <div className="space-y-1.5">
                <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border ${rec.badgeBg} ${rec.badgeText}`}>
                  {rec.categorie}
                </span>
                <h4 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">
                  {rec.nom}
                </h4>
              </div>
              <div className="text-right">
                <p className="text-[11px] uppercase font-bold text-slate-400">Tarif Annuel</p>
                <p className="text-xl md:text-2xl font-black text-primary">{rec.tarif}</p>
              </div>
            </div>

            <p className="text-xs md:text-sm text-slate-600 font-normal leading-relaxed">
              {rec.description}
            </p>

            {/* Infos clés */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 rounded-xl p-4 border border-slate-200/70 text-xs">
              <div className="space-y-1.5">
                <p className="font-bold text-slate-900 flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-primary" /> Âge & Créneaux :
                </p>
                <p className="text-slate-700 font-medium">{rec.age}</p>
                <ul className="space-y-1 text-slate-600 mt-1 font-mono text-[11px]">
                  {rec.creneaux.map((cr, idx) => (
                    <li key={idx}>• {cr}</li>
                  ))}
                </ul>
              </div>

              <div className="space-y-1.5">
                <p className="font-bold text-slate-900 flex items-center gap-1.5">
                  <Waves className="w-4 h-4 text-primary" /> Bassin & Encadrement :
                </p>
                <p className="text-slate-700 font-medium">{rec.bassin}</p>
                <ul className="space-y-1 text-slate-600 mt-1 text-[11px]">
                  {rec.pointsForts.map((pf, idx) => (
                    <li key={idx} className="flex items-center gap-1.5">
                      <Check className="w-3.5 h-3.5 text-primary shrink-0" />
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
                className="flex-1 text-center py-3 px-6 rounded-xl bg-primary hover:bg-primary-dark text-white font-bold text-xs sm:text-sm shadow-xs transition-colors uppercase tracking-wider"
              >
                Accéder aux inscriptions
              </Link>
              <Link
                href={rec.planningUrl}
                className="flex-1 text-center py-3 px-6 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs sm:text-sm transition-colors uppercase tracking-wider"
              >
                Consulter le planning
              </Link>
            </div>
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs text-slate-500 font-medium">
            <button
              onClick={handleReset}
              className="inline-flex items-center gap-1.5 text-slate-700 hover:text-slate-900 font-bold transition-colors cursor-pointer py-1.5 px-3 rounded-lg hover:bg-slate-100"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Recommencer la recherche
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
