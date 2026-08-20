'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { sanitizeHtml } from '@/lib/sanitize'
import { 
  Sparkles, 
  Calendar, 
  Euro, 
  FileText, 
  Waves, 
  CheckCircle2, 
  Clock, 
  ArrowRight, 
  Download, 
  ChevronDown, 
  Search, 
  ShieldCheck, 
  HelpCircle, 
  AlertTriangle,
  LifeBuoy,
  Key,
  FileCheck,
  Award,
  ExternalLink,
  MessageSquare
} from 'lucide-react'

// ─── Types ──────────────────────────────────────────────
export interface BlockData {
  id: string
  type: string
  titre: string | null
  contenu: Record<string, any>
  ordre: number
}

export interface Groupe {
  id: string
  nom: string
  niveau: string | null
  tarif: number | null
  tarif1Cours: number | null
  libelleOption1: string | null
  libelleOption2: string | null
  prixLicence: number | null
  caution: number | null
  nbCompetitions?: number | null
  nbCompetitionsCaution?: number | null
  annule: boolean
  ageMin?: number | null
  ordre?: number
}

export interface SettingsData {
  inscriptionUrl?: string | null
  debutCoursNormal?: string | null
  debutCoursBnssa?: string | null
  datesTests?: string[] | null
  afficherBoutonTest?: boolean
  formulaireLicenceFfnUrl?: string | null
  statutsUrl?: string | null
  reglementPiscineUrl?: string | null
  reglementClubUrl?: string | null
  interSaisonActif?: boolean
  texteFiligrane?: string | null
}

interface InscriptionClientProps {
  blocks: BlockData[]
  groupes: Groupe[]
  settings: SettingsData | null
  interSaison: boolean
  texteFiligrane: string
}

function sanitize(html: string): string {
  return sanitizeHtml(html)
}

export default function InscriptionClient({
  blocks,
  groupes,
  settings,
  interSaison,
  texteFiligrane
}: InscriptionClientProps) {
  const [activeTab, setActiveTab] = useState<'demarches' | 'tarifs' | 'documents' | 'bnssa'>('demarches')
  const [selectedTarifCategory, setSelectedTarifCategory] = useState<string>('tous')
  const [searchTarif, setSearchTarif] = useState('')
  
  // Accordions state
  const [showMedicalDetail, setShowMedicalDetail] = useState(false)
  const [showHonorabilite, setShowHonorabilite] = useState(false)
  const [showAccessDetail, setShowAccessDetail] = useState(false)
  const [showPaymentPrecisions, setShowPaymentPrecisions] = useState(false)
  const [showRulesDetail, setShowRulesDetail] = useState(false)

  // URL hash sync
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.toLowerCase()
      if (hash.includes('tarif')) {
        setActiveTab('tarifs')
      } else if (hash.includes('document') || hash.includes('sante') || hash.includes('medical')) {
        setActiveTab('documents')
      } else if (hash.includes('bnssa')) {
        setActiveTab('bnssa')
      } else if (hash.includes('demarche') || hash.includes('guide')) {
        setActiveTab('demarches')
      }
    }

    handleHashChange()
    window.addEventListener('hashchange', handleHashChange)
    return () => window.removeEventListener('hashchange', handleHashChange)
  }, [])

  const inscriptionUrl = settings?.inscriptionUrl || 'https://monclub.fr'
  const afficherBoutonTest = settings?.afficherBoutonTest !== false
  const formulaireLicenceFfnUrl = settings?.formulaireLicenceFfnUrl

  // Categorize blocks
  const heroBlocks = blocks.filter(b => b.type === 'hero')
  const bannerBlocks = blocks.filter(b => b.type === 'banner')
  const ctaBlocks = blocks.filter(b => b.type === 'cta')
  const groupsTableBlocks = blocks.filter(b => b.type === 'groups-table')
  const pricingBlocks = blocks.filter(b => b.type === 'pricing')
  const financialAidBlocks = blocks.filter(b => b.type === 'financial-aid')
  const rulesBlocks = blocks.filter(b => b.type === 'rules')
  const testsBlocks = blocks.filter(b => b.type === 'tests')
  const accessBlocks = blocks.filter(b => b.type === 'access')
  const bnssaBlocks = blocks.filter(b => b.type === 'bnssa')
  const richtextBlocks = blocks.filter(b => b.type === 'richtext')
  const contactBlocks = blocks.filter(b => b.type === 'contact')

  // Categories of groups
  const categoriesTarifs = [
    { id: 'tous', label: 'Tout afficher', emoji: '✨' },
    { id: 'enf', label: 'École de Natation', emoji: '👶', description: 'Apprentissage des techniques de nage de base pour les débutants.', match: (g: Groupe) => ['enf', 'debutant'].includes(g.niveau || '') },
    { id: 'avenirs', label: 'Avenirs & Transition', emoji: '🐬', description: 'Nageurs sachant déjà nager, transition vers le perfectionnement ou la compétition.', match: (g: Groupe) => g.niveau === 'avenirs' },
    { id: 'competition', label: 'Compétition', emoji: '🏆', description: 'Entraînements intensifs avec participation aux compétitions officielles.', match: (g: Groupe) => g.niveau === 'competition' },
    { id: 'loisir', label: 'Loisirs & Ados', emoji: '🏊', description: 'Pratique de la natation pour le plaisir et le maintien en forme sans compétition.', match: (g: Groupe) => g.niveau === 'loisir' },
    { id: 'artistique', label: 'Natation Artistique', emoji: '🎭', description: 'Discipline mêlant grâce, gymnastique et natation sur des rythmes musicaux.', match: (g: Groupe) => g.niveau === 'artistique' },
    { id: 'aquagym', label: 'Bien-être & AquaGym', emoji: '🧘', description: 'Activités douces ou toniques dans l\'eau pour rester en forme physique.', match: (g: Groupe) => g.niveau === 'aquagym' },
    { id: 'bnssa', label: 'Sauvetage & BNSSA', emoji: '🛟', description: 'Formation professionnelle aux épreuves du brevet de sauvetage aquatique.', match: (g: Groupe) => g.niveau === 'bnssa' },
  ]

  // Filtered categories for pricing tab
  const activePricingCategories = categoriesTarifs.filter(cat => {
    if (cat.id === 'tous') return false
    return groupes.some(g => cat.match ? cat.match(g) : true)
  })

  return (
    <div className="space-y-8">
      
      {/* ─── HERO & SAISON ─── */}
      {heroBlocks.length > 0 ? (
        heroBlocks.map(block => {
          const c = block.contenu
          return (
            <div key={block.id} className="text-center space-y-3 max-w-3xl mx-auto">
              <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-cyan-50 text-cyan-700 text-xs font-black uppercase tracking-wider border border-cyan-200/60 shadow-3xs">
                <Sparkles className="w-3.5 h-3.5 text-cyan-500" />
                <span>{(c.saison as string) || 'Saison 2026 - 2027'}</span>
              </div>
              {block.titre && (
                <h1 
                  className="text-4xl sm:text-5xl font-black text-slate-900 tracking-tight"
                  dangerouslySetInnerHTML={{ __html: sanitize(block.titre) }}
                />
              )}
              {c.description && (
                <div 
                  className="text-sm sm:text-base text-slate-600 max-w-2xl mx-auto leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: sanitize(c.description as string) }}
                />
              )}
            </div>
          )
        })
      ) : (
        <div className="text-center space-y-3 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-cyan-50 text-cyan-700 text-xs font-black uppercase tracking-wider border border-cyan-200/60 shadow-3xs">
            <Sparkles className="w-3.5 h-3.5 text-cyan-500" />
            <span>Inscriptions & Adhésions</span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-black text-slate-900 tracking-tight">
            Rejoignez le Triton Club Cavaillon
          </h1>
          <p className="text-sm sm:text-base text-slate-600 max-w-2xl mx-auto leading-relaxed">
            Consultez les démarches, les tarifs officiels et téléchargez vos documents pour la nouvelle saison.
          </p>
        </div>
      )}

      {/* ─── BANNIÈRES D'ALERTES / INFOS ─── */}
      {bannerBlocks.map(block => {
        const c = block.contenu
        const couleur = (c.couleur as string) || 'sky'
        const colorClasses: Record<string, string> = {
          sky: 'bg-sky-50 border-sky-400 text-sky-950',
          amber: 'bg-amber-50 border-amber-400 text-amber-950',
          rose: 'bg-rose-50 border-rose-400 text-rose-950',
          emerald: 'bg-emerald-50 border-emerald-400 text-emerald-950',
        }

        return (
          <div key={block.id} className={`border-l-4 p-5 rounded-2xl shadow-xs ${colorClasses[couleur] || colorClasses.sky} flex items-start gap-3.5`}>
            <span className="text-2xl shrink-0">{(c.emoji as string) || '📢'}</span>
            <div className="space-y-1 text-xs sm:text-sm leading-relaxed">
              {block.titre && (
                <h4 className="font-extrabold uppercase tracking-wide text-xs" dangerouslySetInnerHTML={{ __html: sanitize(block.titre) }} />
              )}
              {c.texte && (
                <div dangerouslySetInnerHTML={{ __html: sanitize(c.texte as string) }} />
              )}
            </div>
          </div>
        )
      })}

      {/* ─── MINI PARCOURS EN 4 ÉTAPES VISUELLES ─── */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div>
            <h2 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              <span>🚀 Votre inscription en 4 étapes simples</span>
            </h2>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Suivez le guide pour préparer sereinement votre dossier d&apos;adhésion.
            </p>
          </div>
          <span className="px-2.5 py-1 rounded-full text-[11px] font-black uppercase tracking-wider bg-slate-100 text-slate-700 w-fit">
            Guide Express
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          
          {/* Étape 1 */}
          <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 flex flex-col justify-between space-y-3">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="w-7 h-7 rounded-xl bg-primary text-white text-xs font-black flex items-center justify-center shadow-3xs">
                  1
                </span>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 bg-white px-2 py-0.5 rounded-md border border-slate-200">
                  Nouveaux
                </span>
              </div>
              <h3 className="font-extrabold text-sm text-slate-900">Test de niveau</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Test aquatique rapide (5 min) pour évaluer le niveau et orienter vers le bon groupe.
              </p>
            </div>
            {afficherBoutonTest ? (
              <Link
                href="/tests-de-nage"
                className="inline-flex items-center justify-center gap-1.5 w-full py-2 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-colors shadow-3xs text-center"
              >
                <Waves className="w-3.5 h-3.5" />
                <span>Réserver un test</span>
              </Link>
            ) : (
              <span className="text-[11px] text-slate-500 italic block text-center bg-white py-1.5 rounded-lg border border-slate-200">
                Directement au bassin
              </span>
            )}
          </div>

          {/* Étape 2 */}
          <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 flex flex-col justify-between space-y-3">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="w-7 h-7 rounded-xl bg-primary text-white text-xs font-black flex items-center justify-center shadow-3xs">
                  2
                </span>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 bg-white px-2 py-0.5 rounded-md border border-slate-200">
                  Cotisations
                </span>
              </div>
              <h3 className="font-extrabold text-sm text-slate-900">Groupe & Tarifs</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Consultez la grille tarifaire (licence FFN incluse, Pass&apos;Sport et facilités de paiement).
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setActiveTab('tarifs')
                document.getElementById('tabs-navigation')?.scrollIntoView({ behavior: 'smooth' })
              }}
              className="inline-flex items-center justify-center gap-1.5 w-full py-2 px-3 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition-colors shadow-3xs text-center cursor-pointer"
            >
              <Euro className="w-3.5 h-3.5" />
              <span>Voir les tarifs</span>
            </button>
          </div>

          {/* Étape 3 */}
          <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 flex flex-col justify-between space-y-3">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="w-7 h-7 rounded-xl bg-primary text-white text-xs font-black flex items-center justify-center shadow-3xs">
                  3
                </span>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 bg-white px-2 py-0.5 rounded-md border border-slate-200">
                  Médical
                </span>
              </div>
              <h3 className="font-extrabold text-sm text-slate-900">Documents & Santé</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Formulaire officiel FFN et questionnaire de santé (pas de certificat si mineur et réponses négatives).
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setActiveTab('documents')
                document.getElementById('tabs-navigation')?.scrollIntoView({ behavior: 'smooth' })
              }}
              className="inline-flex items-center justify-center gap-1.5 w-full py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors shadow-3xs text-center cursor-pointer"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Voir les documents</span>
            </button>
          </div>

          {/* Étape 4 */}
          <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 flex flex-col justify-between space-y-3">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="w-7 h-7 rounded-xl bg-primary text-white text-xs font-black flex items-center justify-center shadow-3xs">
                  4
                </span>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 bg-white px-2 py-0.5 rounded-md border border-slate-200">
                  En ligne
                </span>
              </div>
              <h3 className="font-extrabold text-sm text-slate-900">Adhésion en ligne</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Complétez le formulaire officiel et validez votre place pour la saison.
              </p>
            </div>
            <a
              href={inscriptionUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-1.5 w-full py-2 px-3 rounded-xl bg-primary hover:bg-primary-dark text-white text-xs font-bold transition-colors shadow-3xs text-center"
            >
              <span>S&apos;inscrire</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </a>
          </div>

        </div>
      </div>

      {/* ─── BARRE D'ONGLETS THÉMATIQUES ─── */}
      <div id="tabs-navigation" className="scroll-mt-28 space-y-6">
        
        {/* Navigation Tabs Header */}
        <div className="flex items-center gap-2 p-1.5 bg-slate-200/70 rounded-2xl overflow-x-auto no-scrollbar shadow-inner">
          
          <button
            type="button"
            onClick={() => setActiveTab('demarches')}
            className={`flex items-center gap-2 px-5 py-3 rounded-xl text-xs sm:text-sm font-black transition-all duration-200 whitespace-nowrap cursor-pointer flex-1 justify-center ${
              activeTab === 'demarches'
                ? 'bg-white text-slate-950 shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
            }`}
          >
            <Sparkles className={`w-4 h-4 ${activeTab === 'demarches' ? 'text-primary' : 'text-slate-400'}`} />
            <span>1. Démarches & Inscription</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('tarifs')}
            className={`flex items-center gap-2 px-5 py-3 rounded-xl text-xs sm:text-sm font-black transition-all duration-200 whitespace-nowrap cursor-pointer flex-1 justify-center ${
              activeTab === 'tarifs'
                ? 'bg-white text-slate-950 shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
            }`}
          >
            <Euro className={`w-4 h-4 ${activeTab === 'tarifs' ? 'text-amber-500' : 'text-slate-400'}`} />
            <span>2. Tarifs & Aides</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('documents')}
            className={`flex items-center gap-2 px-5 py-3 rounded-xl text-xs sm:text-sm font-black transition-all duration-200 whitespace-nowrap cursor-pointer flex-1 justify-center ${
              activeTab === 'documents'
                ? 'bg-white text-slate-950 shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
            }`}
          >
            <FileText className={`w-4 h-4 ${activeTab === 'documents' ? 'text-emerald-500' : 'text-slate-400'}`} />
            <span>3. Santé & Documents</span>
          </button>

          {bnssaBlocks.length > 0 && (
            <button
              type="button"
              onClick={() => setActiveTab('bnssa')}
              className={`flex items-center gap-2 px-5 py-3 rounded-xl text-xs sm:text-sm font-black transition-all duration-200 whitespace-nowrap cursor-pointer flex-1 justify-center ${
                activeTab === 'bnssa'
                  ? 'bg-white text-slate-950 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
              }`}
            >
              <LifeBuoy className={`w-4 h-4 ${activeTab === 'bnssa' ? 'text-indigo-500' : 'text-slate-400'}`} />
              <span>4. Section BNSSA</span>
            </button>
          )}

        </div>

        {/* ─── ONGLET 1 : DÉMARCHES & INSCRIPTIONS ─── */}
        {activeTab === 'demarches' && (
          <div className="space-y-8 animate-fade-in">
            
            {/* CTA d'adhésion principale */}
            {ctaBlocks.length > 0 ? (
              ctaBlocks.map(block => {
                const c = block.contenu
                const url = c.urlSource === 'custom' ? (c.customUrl as string) || '#' : inscriptionUrl
                return (
                  <div key={block.id} className="p-6 sm:p-8 bg-gradient-to-br from-slate-900 to-slate-950 text-white flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl rounded-3xl relative overflow-hidden border border-slate-800">
                    <div className="space-y-2 text-center md:text-left relative z-10">
                      {c.label && (
                        <span className="text-xs font-bold tracking-widest text-primary uppercase bg-primary/10 px-3 py-1 rounded-md border border-primary/20">
                          {c.label as string}
                        </span>
                      )}
                      {block.titre && (
                        <h3 className="font-extrabold text-xl sm:text-2xl text-white" dangerouslySetInnerHTML={{ __html: sanitize(block.titre) }} />
                      )}
                      {c.description && (
                        <div className="text-xs sm:text-sm text-slate-300 font-normal max-w-lg leading-relaxed" dangerouslySetInnerHTML={{ __html: sanitize(c.description as string) }} />
                      )}
                    </div>
                    <div className="flex flex-wrap justify-center gap-3 w-full md:w-auto relative z-10 shrink-0">
                      <a
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-6 py-3.5 bg-primary hover:bg-primary-dark text-white font-extrabold text-sm rounded-2xl shadow-lg transition-all flex items-center gap-2 cursor-pointer"
                      >
                        <span>{(c.boutonTexte as string) || 'Accéder aux inscriptions en ligne'}</span>
                        <ArrowRight className="w-4 h-4" />
                      </a>
                    </div>
                  </div>
                )
              })
            ) : (
              <div className="p-6 sm:p-8 bg-gradient-to-br from-slate-900 to-slate-950 text-white flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl rounded-3xl relative overflow-hidden border border-slate-800">
                <div className="space-y-2 text-center md:text-left relative z-10">
                  <span className="text-xs font-bold tracking-widest text-primary uppercase bg-primary/10 px-3 py-1 rounded-md border border-primary/20">
                    Portail Officiel
                  </span>
                  <h3 className="font-extrabold text-xl sm:text-2xl text-white">
                    Prêt(e) à nager avec nous ?
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-300 font-normal max-w-lg leading-relaxed">
                    Les inscriptions se font 100% en ligne. Validez dès aujourd&apos;hui votre inscription pour la saison.
                  </p>
                </div>
                <div className="flex flex-wrap justify-center gap-3 w-full md:w-auto relative z-10 shrink-0">
                  <a
                    href={inscriptionUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-6 py-3.5 bg-primary hover:bg-primary-dark text-white font-extrabold text-sm rounded-2xl shadow-lg transition-all flex items-center gap-2 cursor-pointer"
                  >
                    <span>Accéder aux inscriptions en ligne</span>
                    <ArrowRight className="w-4 h-4" />
                  </a>
                </div>
              </div>
            )}

            {/* Dates Clés de Rentrée */}
            <div className="bg-rose-50 border border-rose-200 text-rose-900 p-5 sm:p-6 rounded-3xl space-y-2 text-center">
              <div className="flex items-center justify-center gap-2 text-sm font-black text-rose-950">
                <Calendar className="w-4 h-4 text-rose-600" />
                <span>Début officiel des cours : {settings?.debutCoursNormal || 'Lundi 21 Septembre 2026'}</span>
              </div>
              {settings?.debutCoursBnssa && (
                <p className="text-xs font-semibold text-rose-800">
                  Section BNSSA : rentrée spécifique le {settings.debutCoursBnssa}
                </p>
              )}
            </div>

            {/* Tableau de Répartition des Groupes par Année de Naissance */}
            {groupsTableBlocks.map(block => {
              const c = block.contenu
              const lignes = (c.lignes as Array<{ section: string; annees: string }>) || []
              return (
                <div key={block.id} className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-5">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <h3 className="text-lg sm:text-xl font-black text-slate-900 flex items-center gap-2">
                      <span>{(c.emoji as string) || '🏊'}</span>
                      <span>{block.titre || 'Répartition par groupe & année de naissance'}</span>
                    </h3>
                  </div>

                  {c.introTexte && (
                    <div 
                      className="bg-cyan-50/60 border border-cyan-100 p-4 rounded-2xl text-xs sm:text-sm text-cyan-950 leading-relaxed font-medium"
                      dangerouslySetInnerHTML={{ __html: sanitize(c.introTexte as string) }}
                    />
                  )}

                  {lignes.length > 0 && (
                    <div className="overflow-x-auto rounded-2xl border border-slate-200">
                      <table className="w-full text-xs sm:text-sm">
                        <thead className="bg-slate-50 text-slate-800 font-black text-left">
                          <tr className="border-b border-slate-200">
                            <th className="py-3.5 px-4">Section / Groupe</th>
                            <th className="py-3.5 px-4 text-center">Année(s) de naissance</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {lignes.map((ligne, i) => (
                            <tr key={i} className="hover:bg-slate-50/60 transition-colors">
                              <td className="py-3 px-4 font-bold text-slate-900">{ligne.section}</td>
                              <td className="py-3 px-4 text-center font-mono font-bold text-slate-700">{ligne.annees}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )
            })}

            {/* Tests de niveau pour les nouveaux si configuré */}
            {testsBlocks.map(block => {
              const c = block.contenu
              return (
                <div key={block.id} className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                      <Clock className="w-5 h-5 text-blue-600" />
                      <span>{block.titre || 'Tests pour Nouveaux Adhérents'}</span>
                    </h3>
                  </div>
                  {c.intro && <div className="text-xs sm:text-sm text-slate-700 leading-relaxed" dangerouslySetInnerHTML={{ __html: sanitize(c.intro as string) }} />}
                  <div className="bg-blue-50/60 border border-blue-100 p-4 rounded-2xl space-y-2">
                    <span className="text-xs font-black text-blue-950 uppercase tracking-wide flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-blue-600" /> Dates prévues des tests :
                    </span>
                    {settings?.datesTests && settings.datesTests.length > 0 ? (
                      <ul className="list-disc list-inside space-y-1 text-xs font-bold text-slate-900">
                        {settings.datesTests.map((d: string, idx: number) => (
                          <li key={idx}>{d}</li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-xs text-slate-500 italic">Aucune date configurée pour le moment.</p>
                    )}
                    {c.lieu && <p className="text-xs text-slate-600 italic pt-1">{c.lieu as string}</p>}
                  </div>
                  {afficherBoutonTest && (
                    <div className="pt-2">
                      <Link
                        href="/tests-de-nage"
                        className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl transition-colors shadow-3xs"
                      >
                        <Waves className="w-3.5 h-3.5" />
                        <span>Réserver un créneau de test</span>
                      </Link>
                    </div>
                  )}
                </div>
              )
            })}

            {/* Richtext blocks s'il y en a */}
            {richtextBlocks.map(block => {
              const c = block.contenu
              return (
                <div key={block.id} className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-4">
                  {block.titre && (
                    <h3 className="text-lg sm:text-xl font-black text-slate-900 border-b border-slate-100 pb-3">
                      {block.titre}
                    </h3>
                  )}
                  {c.texte && (
                    <div className="text-xs sm:text-sm text-slate-700 leading-relaxed space-y-2" dangerouslySetInnerHTML={{ __html: sanitize(c.texte as string) }} />
                  )}
                </div>
              )
            })}

          </div>
        )}

        {/* ─── ONGLET 2 : TARIFS & AIDES ─── */}
        {activeTab === 'tarifs' && (
          <div className="space-y-8 animate-fade-in">
            
            {/* Grille Tarifaire Interactive */}
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
              
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                <div>
                  <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                    <Euro className="w-6 h-6 text-amber-500" />
                    <span>Grille Tarifaire Saisonnière</span>
                  </h2>
                  <p className="text-xs text-slate-500 font-medium mt-0.5">
                    Cotisations forfaitaires annuelles · Licence officielle FFN incluse dans tous les tarifs.
                  </p>
                </div>

                {/* Recherche rapide */}
                <div className="relative w-full md:w-64">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchTarif}
                    onChange={(e) => setSearchTarif(e.target.value)}
                    placeholder="Filtrer un groupe..."
                    className="w-full pl-9 pr-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium text-slate-800 outline-none focus:bg-white focus:border-primary transition-all"
                  />
                </div>
              </div>

              {/* Filtres de catégorie rapides */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-bold text-slate-400 mr-1">Catégorie :</span>
                {categoriesTarifs.map(cat => {
                  const isSelected = selectedTarifCategory === cat.id
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setSelectedTarifCategory(cat.id)}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-slate-900 text-white shadow-xs'
                          : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                      }`}
                    >
                      <span>{cat.emoji}</span>
                      <span>{cat.label}</span>
                    </button>
                  )
                })}
              </div>

              {/* Liste des Catégories et Cartes de Groupes */}
              <div className="space-y-6">
                {activePricingCategories
                  .filter(cat => selectedTarifCategory === 'tous' || selectedTarifCategory === cat.id)
                  .map(category => {
                    const filteredGroupes = groupes
                      .filter(g => category.match ? category.match(g) : true)
                      .filter(g => !searchTarif || g.nom.toLowerCase().includes(searchTarif.toLowerCase()))

                    if (filteredGroupes.length === 0) return null

                    return (
                      <div key={category.id} className="space-y-3 pt-2">
                        <div className="border-b border-slate-200 pb-2">
                          <h3 className="font-black text-sm sm:text-base text-slate-900 flex items-center gap-2">
                            <span>{category.emoji}</span>
                            <span>{category.label}</span>
                          </h3>
                          {category.description && (
                            <p className="text-xs text-slate-500 font-normal mt-0.5">{category.description}</p>
                          )}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {filteredGroupes.map(groupe => {
                            const totalTarif = (groupe.tarif || 0) + (groupe.prixLicence || 0)
                            return (
                              <div
                                key={groupe.id}
                                className={`p-4 border rounded-2xl space-y-2 bg-white transition-all ${
                                  groupe.annule
                                    ? 'border-red-200 bg-red-50/20'
                                    : 'border-slate-200 hover:border-slate-400 hover:shadow-xs'
                                }`}
                              >
                                <div className="flex justify-between items-start gap-4">
                                  <div className="space-y-1">
                                    <span className={`font-extrabold text-sm sm:text-base text-slate-900 block ${groupe.annule ? 'line-through text-slate-400' : ''}`}>
                                      {groupe.nom}
                                    </span>
                                    {groupe.annule ? (
                                      <span className="text-[10px] bg-red-100 text-red-800 px-2 py-0.5 rounded-md font-bold inline-block uppercase tracking-wider">
                                        Créneau temporairement suspendu
                                      </span>
                                    ) : (
                                      typeof groupe.prixLicence === 'number' && (
                                        <span className="text-xs text-slate-500 block italic">
                                          Licence FFN incluse ({groupe.prixLicence.toFixed(0)}€)
                                        </span>
                                      )
                                    )}
                                  </div>

                                  <div className={`text-right shrink-0 ${groupe.annule ? 'opacity-40 line-through' : ''}`}>
                                    {groupe.tarif1Cours ? (
                                      <div className="space-y-0.5 text-xs text-slate-700 font-medium">
                                        <div>{groupe.libelleOption1 || '1 cours/sem'} : <span className="font-black text-slate-950 font-mono text-sm">{(groupe.tarif1Cours + (groupe.prixLicence || 0)).toFixed(0)} €</span></div>
                                        <div>{groupe.libelleOption2 || '2 cours/sem'} : <span className="font-black text-slate-950 font-mono text-sm">{totalTarif.toFixed(0)} €</span></div>
                                      </div>
                                    ) : (
                                      <span className="font-black text-slate-950 font-mono text-lg">
                                        {totalTarif.toFixed(0)} €
                                      </span>
                                    )}
                                  </div>
                                </div>

                                {groupe.caution && !groupe.annule && (
                                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-amber-900 bg-amber-50/60 px-3 py-1.5 rounded-xl border border-amber-200/60">
                                    <span className="font-bold">Caution remboursable :</span>
                                    <span className="font-black font-mono">+{groupe.caution.toFixed(0)} € {groupe.nbCompetitionsCaution ? `(${groupe.nbCompetitionsCaution} compét. min.)` : ''}</span>
                                  </div>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )
                  })}
              </div>

            </div>

            {/* Accordéon : Aides Financières & Pass'Sport */}
            {financialAidBlocks.map(block => {
              const c = block.contenu
              const sections = (c.sections as Array<{ titre: string; emoji: string; paragraphes: string[] }>) || []
              return (
                <div key={block.id} className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-4">
                  <h3 className="text-lg font-black text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
                    <span>{(c.emoji as string) || '💳'}</span>
                    <span>{block.titre || 'Aides financières & Moyens de paiement'}</span>
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                    {sections.map((section, idx) => (
                      <div key={idx} className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 space-y-2">
                        <h4 className="font-extrabold text-xs text-slate-900 uppercase tracking-wide flex items-center gap-1.5">
                          <span>{section.emoji}</span>
                          <span>{section.titre}</span>
                        </h4>
                        <div className="text-xs text-slate-700 leading-relaxed space-y-1">
                          {section.paragraphes.map((p, pi) => (
                            <p key={pi} dangerouslySetInnerHTML={{ __html: sanitize(p) }} />
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}

            {/* Accordéon : Précisions de Paiement & Cautions */}
            {pricingBlocks.some(b => b.contenu?.precisionsPaiement?.length > 0 || b.contenu?.noteCaution) && (
              <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-3">
                <button
                  type="button"
                  onClick={() => setShowPaymentPrecisions(!showPaymentPrecisions)}
                  className="w-full flex items-center justify-between text-left font-black text-sm text-slate-900 cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-primary" />
                    <span>Précisions sur les règlements, facilités et cautions</span>
                  </span>
                  <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${showPaymentPrecisions ? 'rotate-180' : ''}`} />
                </button>

                {showPaymentPrecisions && (
                  <div className="pt-3 border-t border-slate-100 text-xs text-slate-700 leading-relaxed space-y-3 animate-fade-in">
                    {pricingBlocks.map(b => (
                      <div key={b.id} className="space-y-2">
                        {b.contenu?.noteCaution && (
                          <p className="italic text-slate-600 bg-amber-50/50 p-3 rounded-xl border border-amber-200/60">
                            {b.contenu.noteCaution as string}
                          </p>
                        )}
                        {(b.contenu?.precisionsPaiement as Array<{ texte: string; type: string }>)?.map((p, pi) => (
                          <p key={pi} className={`flex items-start gap-2 ${p.type === 'warning' ? 'text-rose-900 font-semibold' : ''}`}>
                            <span className={p.type === 'warning' ? 'text-rose-600' : 'text-slate-400'}>{p.type === 'warning' ? '⚠️' : '•'}</span>
                            <span dangerouslySetInnerHTML={{ __html: sanitize(p.texte) }} />
                          </p>
                        ))}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

          </div>
        )}

        {/* ─── ONGLET 3 : SANTÉ & DOCUMENTS ─── */}
        {activeTab === 'documents' && (
          <div className="space-y-8 animate-fade-in">
            
            {/* CARTE HERO OFFICIELLE : FORMULAIRE DE LICENCE FFN */}
            <div className="bg-gradient-to-br from-cyan-900 to-sky-950 text-white rounded-3xl p-6 sm:p-8 shadow-md border border-cyan-800 space-y-4 relative overflow-hidden">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
                <div className="space-y-2 max-w-xl">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-800 text-cyan-300 text-xs font-black uppercase tracking-wider border border-cyan-700">
                    <FileCheck className="w-3.5 h-3.5" />
                    <span>Document Officiel Obligatoire</span>
                  </div>
                  <h3 className="text-xl sm:text-2xl font-black text-white">
                    Formulaire de Licence Officiel FFN
                  </h3>
                  <p className="text-xs sm:text-sm text-cyan-100 leading-relaxed font-normal">
                    Indispensable pour finaliser votre dossier d&apos;adhésion auprès de la Fédération Française de Natation. Téléchargez-le, complétez-le et joignez-le à votre inscription.
                  </p>
                </div>

                <div className="shrink-0">
                  {formulaireLicenceFfnUrl ? (
                    <a
                      href={formulaireLicenceFfnUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl bg-white text-slate-900 font-black text-xs sm:text-sm hover:bg-cyan-50 transition-colors shadow-lg cursor-pointer"
                    >
                      <Download className="w-4 h-4 text-cyan-700" />
                      <span>Télécharger le Formulaire FFN (PDF)</span>
                    </a>
                  ) : (
                    <div className="bg-cyan-800/80 px-4 py-3 rounded-2xl text-xs font-semibold text-cyan-200 border border-cyan-700 text-center">
                      📄 Fourni directement en ligne lors de l&apos;adhésion
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* RÈGLES SANTÉ & QUESTIONNAIRE MÉDICAL */}
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
              <div className="border-b border-slate-100 pb-3">
                <h3 className="text-lg sm:text-xl font-black text-slate-900 flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-emerald-600" />
                  <span>Certificat Médical & Questionnaire de Santé</span>
                </h3>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  Règles officielles applicables pour la saison en cours.
                </p>
              </div>

              {/* Résumé clair en 2 colonnes */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* Mineurs */}
                <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-2xl p-5 space-y-2.5">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-emerald-600 text-white text-xs font-black flex items-center justify-center">👶</span>
                    <h4 className="font-extrabold text-sm text-emerald-950 uppercase tracking-wide">Pour les Mineurs (Moins de 18 ans)</h4>
                  </div>
                  <p className="text-xs text-emerald-900 leading-relaxed font-medium">
                    <strong className="text-emerald-950">Aucun certificat médical n&apos;est exigé</strong> si vous répondez <strong className="underline">NON</strong> à toutes les questions du questionnaire de santé officiel mineur.
                  </p>
                  <p className="text-[11px] text-emerald-800 italic">
                    Un certificat de moins de 6 mois n&apos;est nécessaire que si au moins une réponse est OUI.
                  </p>
                </div>

                {/* Majeurs */}
                <div className="bg-blue-50/70 border border-blue-200/80 rounded-2xl p-5 space-y-2.5">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-black flex items-center justify-center">🧑</span>
                    <h4 className="font-extrabold text-sm text-blue-950 uppercase tracking-wide">Pour les Majeurs (Adultes)</h4>
                  </div>
                  <p className="text-xs text-blue-900 leading-relaxed font-medium">
                    Un certificat médical initial est valable <strong className="text-blue-950">3 saisons consécutives</strong> sous réserve de remplir chaque année le questionnaire de santé majeur avec uniquement des réponses <strong className="underline">NON</strong>.
                  </p>
                  <p className="text-[11px] text-blue-800 italic">
                    Nouveau certificat obligatoire tous les 3 ans ou si réponse OUI.
                  </p>
                </div>

              </div>

              {/* Accordéon avec détails des textes officiels */}
              {rulesBlocks.map(block => {
                const c = block.contenu
                const items = (c.items as Array<{ titre: string; texte: string }>) || []
                const qs = (c.questionnaireSante as Record<string, string>) || {}
                const honorabilite = (c.honorabilite as Record<string, string>) || {}

                return (
                  <div key={block.id} className="space-y-4 pt-2">
                    
                    {/* Détail questionnaire */}
                    {qs.titre && (
                      <div className="border border-slate-200 rounded-2xl p-4 bg-slate-50 space-y-2 text-xs">
                        <span className="font-black text-slate-900 block uppercase tracking-wide">{qs.titre}</span>
                        {qs.texte && <p className="text-slate-700 leading-relaxed" dangerouslySetInnerHTML={{ __html: sanitize(qs.texte) }} />}
                        {qs.detail && <p className="text-slate-600 leading-relaxed font-medium bg-white p-3 rounded-xl border border-slate-200/60" dangerouslySetInnerHTML={{ __html: sanitize(qs.detail) }} />}
                      </div>
                    )}

                    {/* Honorabilité */}
                    {honorabilite.titre && (
                      <div className="border border-slate-200 rounded-2xl p-4 bg-slate-50 space-y-2 text-xs">
                        <span className="font-black text-slate-900 block uppercase tracking-wide">{honorabilite.titre}</span>
                        {honorabilite.texte && <p className="text-slate-600 leading-relaxed" dangerouslySetInnerHTML={{ __html: sanitize(honorabilite.texte) }} />}
                      </div>
                    )}

                    {/* Items généraux */}
                    {items.map((item, i) => (
                      <div key={i} className="border-t border-slate-100 pt-3 text-xs space-y-1">
                        <span className="font-bold text-slate-900">{item.titre}</span>
                        <p className="text-slate-600 leading-relaxed" dangerouslySetInnerHTML={{ __html: sanitize(item.texte) }} />
                      </div>
                    ))}
                  </div>
                )
              })}

            </div>

            {/* DOCUMENTS OFFICIELS TÉLÉCHARGEABLES (STATUTS & RÈGLEMENTS) */}
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-4">
              <h3 className="text-lg font-black text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
                <Download className="w-5 h-5 text-primary" />
                <span>Règlements & Documents du Club</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
                
                {/* Statuts */}
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col justify-between space-y-3">
                  <div className="space-y-1">
                    <span className="text-xl">📜</span>
                    <h4 className="font-extrabold text-xs text-slate-900">Statuts du Club</h4>
                    <p className="text-[11px] text-slate-500">Statuts officiels de l&apos;association Triton Club Cavaillon.</p>
                  </div>
                  {settings?.statutsUrl ? (
                    <a
                      href={settings.statutsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-colors"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Télécharger (PDF)</span>
                    </a>
                  ) : (
                    <span className="text-[11px] text-slate-400 italic">Non disponible</span>
                  )}
                </div>

                {/* Règlement Intérieur */}
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col justify-between space-y-3">
                  <div className="space-y-1">
                    <span className="text-xl">📋</span>
                    <h4 className="font-extrabold text-xs text-slate-900">Règlement Intérieur</h4>
                    <p className="text-[11px] text-slate-500">Règles de vie et fonctionnement associatif.</p>
                  </div>
                  {settings?.reglementClubUrl ? (
                    <a
                      href={settings.reglementClubUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-colors"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Télécharger (PDF)</span>
                    </a>
                  ) : (
                    <span className="text-[11px] text-slate-400 italic">Non disponible</span>
                  )}
                </div>

                {/* Règlement Piscine & Accès */}
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col justify-between space-y-3">
                  <div className="space-y-1">
                    <span className="text-xl">🏊‍♂️</span>
                    <h4 className="font-extrabold text-xs text-slate-900">Règlement Piscine</h4>
                    <p className="text-[11px] text-slate-500">Consignes d&apos;hygiène et accès aux bassins.</p>
                  </div>
                  {settings?.reglementPiscineUrl ? (
                    <a
                      href={settings.reglementPiscineUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-colors"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Télécharger (PDF)</span>
                    </a>
                  ) : (
                    <span className="text-[11px] text-slate-400 italic">Non disponible</span>
                  )}
                </div>

              </div>
            </div>

            {/* ACCÈS PISCINE & BADGE */}
            {accessBlocks.map(block => {
              const c = block.contenu
              return (
                <div key={block.id} className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-2 text-xs">
                  <h4 className="font-black text-sm text-slate-900 flex items-center gap-2">
                    <Key className="w-4 h-4 text-cyan-600" />
                    <span>{block.titre || 'Modalités d\'accès à la piscine'}</span>
                  </h4>
                  {c.texte && (
                    <div className="text-slate-600 leading-relaxed font-medium" dangerouslySetInnerHTML={{ __html: sanitize(c.texte as string) }} />
                  )}
                </div>
              )
            })}

          </div>
        )}

        {/* ─── ONGLET 4 : FORMATION BNSSA ─── */}
        {activeTab === 'bnssa' && bnssaBlocks.length > 0 && (
          <div className="space-y-8 animate-fade-in">
            {bnssaBlocks.map(block => {
              const c = block.contenu
              const formation = (c.formation as string[]) || []
              const examen = (c.examen as string[]) || []

              return (
                <div key={block.id} className="p-6 sm:p-8 space-y-6 bg-slate-900 text-white shadow-xl rounded-3xl relative overflow-hidden border border-slate-800">
                  <div className="space-y-2">
                    <span className="text-xs font-black uppercase tracking-widest bg-indigo-900/80 text-indigo-300 px-3 py-1 rounded-full border border-indigo-700/80">
                      {(c.label as string) || 'Formation Professionnelle'}
                    </span>
                    <h2 className="text-2xl sm:text-3xl font-black text-white flex items-center gap-2">
                      <span>{(c.emoji as string) || '🛟'}</span>
                      <span>{block.titre || 'Formation & Diplôme BNSSA'}</span>
                    </h2>
                  </div>

                  <div className="text-xs sm:text-sm text-slate-200 leading-relaxed space-y-3 font-normal">
                    {c.description && <div dangerouslySetInnerHTML={{ __html: sanitize(c.description as string) }} />}
                    {c.avertissement && (
                      <div className="bg-amber-500/10 border border-amber-500/30 p-3.5 rounded-2xl text-amber-200 text-xs font-medium" dangerouslySetInnerHTML={{ __html: sanitize(c.avertissement as string) }} />
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs sm:text-sm">
                    {formation.length > 0 && (
                      <div className="space-y-3 bg-slate-800/80 p-5 rounded-2xl border border-slate-700/80">
                        <h4 className="font-black text-cyan-300 text-xs uppercase tracking-wide flex items-center gap-1.5">
                          <span>📚</span> Contenu de la Formation
                        </h4>
                        <ol className="list-decimal list-inside space-y-1.5 text-slate-200">
                          {formation.map((item, i) => (
                            <li key={i} dangerouslySetInnerHTML={{ __html: sanitize(item) }} />
                          ))}
                        </ol>
                      </div>
                    )}

                    {examen.length > 0 && (
                      <div className="space-y-3 bg-slate-800/80 p-5 rounded-2xl border border-slate-700/80">
                        <h4 className="font-black text-cyan-300 text-xs uppercase tracking-wide flex items-center gap-1.5">
                          <span>⏱️</span> Épreuves de l&apos;Examen
                        </h4>
                        <ol className="list-decimal list-inside space-y-1.5 text-slate-200">
                          {examen.map((item, i) => (
                            <li key={i} dangerouslySetInnerHTML={{ __html: sanitize(item) }} />
                          ))}
                        </ol>
                      </div>
                    )}
                  </div>

                  {(c.ageRequis || c.prerequis) && (
                    <div className="bg-slate-800 p-4 rounded-2xl text-center text-xs border border-slate-700 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 font-medium text-slate-200">
                      {c.ageRequis && (
                        <span>🔞 <strong className="text-white">Âge requis :</strong> {c.ageRequis as string}</span>
                      )}
                      {c.ageRequis && c.prerequis && <span className="text-slate-600">|</span>}
                      {c.prerequis && (
                        <span>💪 <strong className="text-white">Prérequis :</strong> {c.prerequis as string}</span>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

      </div>

      {/* ─── CONTACT & ASSISTANCE ─── */}
      <div className="pt-6 border-t border-slate-200 text-center">
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm max-w-2xl mx-auto space-y-3">
          <div className="w-10 h-10 rounded-2xl bg-cyan-50 text-cyan-700 flex items-center justify-center mx-auto">
            <MessageSquare className="w-5 h-5" />
          </div>
          <h3 className="font-extrabold text-sm sm:text-base text-slate-900">
            Une question sur votre inscription ?
          </h3>
          <p className="text-xs text-slate-600 max-w-md mx-auto leading-relaxed">
            Consultez notre guide d&apos;assistance ou écrivez à notre équipe bénévole via notre page de contact dédiée.
          </p>
          <Link
            href="/contact"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition-colors"
          >
            <span>Assistance & Contact</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

    </div>
  )
}
