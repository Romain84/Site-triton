'use client'

import { useState } from 'react'

export interface GroupeData {
  id: string
  nom: string
  description: string | null
  tarif: number | null
  tarif1Cours: number | null
  libelleOption1: string | null
  libelleOption2: string | null
  prixLicence: number | null
  caution: number | null
  isCompetition: boolean | null
  nbCompetitions: number | null
  nbCompetitionsCaution: number | null
  ageMin: number | null
  ageMax: number | null
  annule: boolean | null
  ordre: number | null
}

export interface PlanningSlot {
  id: string
  jourSemaine: string
  heureDebut: string
  heureFin: string
  lieu: string | null
  nomSession: string | null
  groupeId: string | null
  coachs?: Array<{
    coach: {
      prenom: string
      nom: string | null
    }
  }>
}

interface GroupesClientProps {
  groupes: GroupeData[]
  plannings?: PlanningSlot[]
  interSaison: boolean
  texteFiligrane: string
}

export type CategorieGroupeKey = 'all' | 'apprentissage' | 'loisir' | 'competition' | 'autres'

const JOURS_ORDRE_MAP: Record<string, number> = {
  Lundi: 1,
  Mardi: 2,
  Mercredi: 3,
  Jeudi: 4,
  Vendredi: 5,
  Samedi: 6,
  Dimanche: 7,
}

export function formatBirthYears(ageMin: number | null, ageMax: number | null): string | null {
  if (ageMin === null && ageMax === null) return null
  const currentYear = new Date().getFullYear()

  if (ageMin !== null && ageMax !== null) {
    const yearOldest = currentYear - ageMax
    const yearYoungest = currentYear - ageMin
    if (yearOldest === yearYoungest) {
      return `Année de naissance : ${yearOldest}`
    }
    return `Années de naissance : ${yearOldest} - ${yearYoungest}`
  }

  if (ageMin !== null) {
    const yearYoungest = currentYear - ageMin
    return `Années de naissance : ${yearYoungest} et avant`
  }

  if (ageMax !== null) {
    const yearOldest = currentYear - ageMax
    return `Années de naissance : ${yearOldest} et après`
  }

  return null
}

export interface CategorieConfig {
  key: Exclude<CategorieGroupeKey, 'all'>
  titre: string
  sousTitre: string
  icon: string
  badgeBg: string
  badgeText: string
  borderAccent: string
  headerBg: string
}

export const CATEGORIES_CONFIG: Record<Exclude<CategorieGroupeKey, 'all'>, CategorieConfig> = {
  apprentissage: {
    key: 'apprentissage',
    titre: 'Apprentissage & École de Natation',
    sousTitre: 'Acquisition des bases, découverte de l\'eau et préparation aux premiers brevets (ENF 1, ENF 2...)',
    icon: '',
    badgeBg: 'bg-emerald-100/80',
    badgeText: 'text-emerald-800 border-emerald-200',
    borderAccent: 'border-l-emerald-500',
    headerBg: 'bg-gradient-to-r from-emerald-50 to-teal-50/60 border-emerald-200/80'
  },
  loisir: {
    key: 'loisir',
    titre: 'Section Loisir & Perfectionnement',
    sousTitre: 'Pratique plaisir, santé et perfectionnement de l\'adolescence à l\'âge adulte (Avenirs, Jeunes, Juniors, Adultes)',
    icon: '',
    badgeBg: 'bg-sky-100/80',
    badgeText: 'text-sky-800 border-sky-200',
    borderAccent: 'border-l-sky-500',
    headerBg: 'bg-gradient-to-r from-sky-50 to-blue-50/60 border-sky-200/80'
  },
  competition: {
    key: 'competition',
    titre: 'Section Compétition',
    sousTitre: 'Entraînements intensifs et engagement sur les plannings fédéraux FFN (Avenirs, Benjamins, Juniors, Adultes)',
    icon: '',
    badgeBg: 'bg-indigo-100/80',
    badgeText: 'text-indigo-800 border-indigo-200',
    borderAccent: 'border-l-indigo-500',
    headerBg: 'bg-gradient-to-r from-indigo-50 to-purple-50/60 border-indigo-200/80'
  },
  autres: {
    key: 'autres',
    titre: 'Activités & Autres Pratiques',
    sousTitre: 'AquaGym, Natation Artistique et séances de remise en forme aquatique',
    icon: '',
    badgeBg: 'bg-fuchsia-100/80',
    badgeText: 'text-fuchsia-800 border-fuchsia-200',
    borderAccent: 'border-l-fuchsia-500',
    headerBg: 'bg-gradient-to-r from-fuchsia-50 to-pink-50/60 border-fuchsia-200/80'
  }
}

export function categoriserGroupe(nom: string, isCompetition?: boolean | null): Exclude<CategorieGroupeKey, 'all'> {
  const u = (nom || '').toUpperCase()

  // 1. APPRENTISSAGE (ENF)
  if (u.includes('ENF') || u.includes('APPRENTISSAGE') || u.includes('ÉCOLE') || u.includes('ECOLE') || u.includes('SAUV\'NAGE') || u.includes('PASS\'')) {
    return 'apprentissage'
  }

  // 2. LOISIR
  if (u.includes('LOISIR') || u.includes('LOISIRS')) {
    return 'loisir'
  }

  // 3. COMPÉTITION
  if (
    isCompetition ||
    u.includes('COMPÉTITION') ||
    u.includes('COMPETITION') ||
    u.includes('AVENIRS 1') ||
    u.includes('AVENIRS 2') ||
    u.includes('AVENIRS 3') ||
    u.includes('BENJAMINS') ||
    (u.includes('AVENIRS') && !u.includes('LOISIR'))
  ) {
    return 'competition'
  }

  // 4. AUTRES
  if (u.includes('AQUA') || u.includes('ARTISTIQUE') || u.includes('SYNCHRO') || u.includes('REMISE EN FORME')) {
    return 'autres'
  }

  return 'autres'
}

export default function GroupesClient({ groupes, plannings = [], interSaison, texteFiligrane }: GroupesClientProps) {
  const [selectedCategory, setSelectedCategory] = useState<CategorieGroupeKey>('all')
  const [planningModalGroupe, setPlanningModalGroupe] = useState<GroupeData | null>(null)

  // Regrouper les groupes par catégorie
  const groupesParCategorie: Record<Exclude<CategorieGroupeKey, 'all'>, GroupeData[]> = {
    apprentissage: [],
    loisir: [],
    competition: [],
    autres: []
  }

  groupes.forEach((g) => {
    const cat = categoriserGroupe(g.nom, g.isCompetition)
    groupesParCategorie[cat].push(g)
  })

  const categoriesKeys: Array<Exclude<CategorieGroupeKey, 'all'>> = ['apprentissage', 'loisir', 'competition', 'autres']

  // Récupérer les créneaux du groupe sélectionné pour la modale
  const modalSlots = planningModalGroupe
    ? plannings
        .filter((p) => p.groupeId === planningModalGroupe.id)
        .sort((a, b) => {
          const dayA = JOURS_ORDRE_MAP[a.jourSemaine] || 99
          const dayB = JOURS_ORDRE_MAP[b.jourSemaine] || 99
          if (dayA !== dayB) return dayA - dayB
          return a.heureDebut.localeCompare(b.heureDebut)
        })
    : []

  return (
    <div className="space-y-12">
      {/* Filtres par catégorie sous forme de pilules tactiles */}
      <div className="flex flex-wrap justify-center gap-2 max-w-4xl mx-auto print:hidden">
        <button
          onClick={() => setSelectedCategory('all')}
          className={`px-5 py-2.5 rounded-full font-bold text-xs tracking-wider uppercase transition-all cursor-pointer shadow-xs ${
            selectedCategory === 'all'
              ? 'bg-slate-900 text-white shadow-md border border-slate-900 scale-[1.02]'
              : 'bg-white text-slate-650 border border-slate-200/90 hover:border-slate-400 hover:text-slate-900'
          }`}
        >
          Tous les groupes
        </button>

        {categoriesKeys.map((catKey) => {
          const config = CATEGORIES_CONFIG[catKey]
          const count = groupesParCategorie[catKey].length
          const isActive = selectedCategory === catKey

          if (count === 0 && selectedCategory !== 'all') return null

          return (
            <button
              key={catKey}
              onClick={() => setSelectedCategory(catKey)}
              className={`px-4 py-2.5 rounded-full font-bold text-xs tracking-wider uppercase transition-all cursor-pointer shadow-xs ${
                isActive
                  ? 'bg-slate-900 text-white shadow-md border border-slate-900 scale-[1.02]'
                  : 'bg-white text-slate-650 border border-slate-200/90 hover:border-slate-400 hover:text-slate-900'
              }`}
            >
              <span>{config.titre.split('&')[0].trim()}</span>
            </button>
          )
        })}
      </div>

      {/* Affichage des groupes par section de catégorie */}
      <div className="space-y-16">
        {categoriesKeys.map((catKey) => {
          const config = CATEGORIES_CONFIG[catKey]
          const liste = groupesParCategorie[catKey]

          if (selectedCategory !== 'all' && selectedCategory !== catKey) {
            return null
          }

          if (liste.length === 0) return null

          return (
            <section key={catKey} className="space-y-6 animate-fade-in">
              {/* En-tête de catégorie stylisé */}
              <div className={`p-6 md:p-8 rounded-3xl border ${config.headerBg} shadow-xs space-y-2 relative overflow-hidden`}>
                <div>
                  <h2 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">
                    {config.titre}
                  </h2>
                  <p className="text-slate-600 text-xs md:text-sm font-medium mt-1 leading-relaxed">
                    {config.sousTitre}
                  </p>
                </div>
              </div>

              {/* Grille de cartes de groupes */}
              <div className="grid gap-6 md:grid-cols-2">
                {liste.map((groupe) => {
                  const hasAgeRange = groupe.ageMin !== null || groupe.ageMax !== null
                  const slotsCount = plannings.filter((p) => p.groupeId === groupe.id).length

                  return (
                    <article
                      key={groupe.id}
                      className={`border p-6 md:p-8 flex flex-col justify-between space-y-6 rounded-3xl bg-white hover:shadow-md transition-all duration-200 border-l-4 ${config.borderAccent} ${
                        groupe.annule ? 'border-red-200 bg-red-50/10' : 'border-slate-200/80'
                      }`}
                    >
                      <div className="space-y-4">
                        {/* En-tête Carte : Titre + Badge Âge */}
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider mb-1.5 border ${config.badgeText} ${config.badgeBg}`}>
                              {config.titre.split('&')[0].trim()}
                            </span>
                            <h3 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight leading-tight">
                              {groupe.nom}
                            </h3>
                          </div>

                          {hasAgeRange && (
                            <span className="border border-slate-200 bg-slate-50 text-slate-700 px-3 py-1 rounded-full text-xs font-bold tracking-wide shrink-0 shadow-2xs">
                              {formatBirthYears(groupe.ageMin, groupe.ageMax)}
                            </span>
                          )}
                        </div>

                        {groupe.annule && (
                          <div className="bg-red-50 border border-red-200/60 rounded-2xl p-3.5 flex items-center gap-2.5 text-red-800 text-xs font-bold shadow-xs">
                            <span>Créneau temporairement suspendu (en attente d&apos;un coach). Réouverture possible à tout moment !</span>
                          </div>
                        )}

                        <p className="text-slate-600 text-xs md:text-sm leading-relaxed font-medium whitespace-pre-line">
                          {groupe.description || 'Description à venir pour ce groupe de natation.'}
                        </p>
                      </div>

                      {/* Tarifs, Cautions & Actions */}
                      <div className="border-t border-slate-100 pt-4 space-y-4 mt-auto">
                        {(typeof groupe.tarif === 'number' || typeof groupe.tarif1Cours === 'number' || typeof groupe.prixLicence === 'number' || typeof groupe.caution === 'number') && (
                          <div className={`space-y-3 ${groupe.annule ? 'opacity-35 grayscale select-none pointer-events-none' : ''}`}>
                            {typeof groupe.tarif1Cours === 'number' ? (
                              <div className="space-y-2 bg-slate-50/70 p-3 rounded-2xl border border-slate-100">
                                <div className="flex items-center justify-between gap-3 text-sm">
                                  <span className="text-slate-600 font-bold">{groupe.libelleOption1 || '1 cours/semaine'}</span>
                                  <span className="font-black text-slate-950 text-base">
                                    {((groupe.tarif1Cours || 0) + (groupe.prixLicence || 0)).toFixed(2)} €
                                  </span>
                                </div>
                                <div className="flex items-center justify-between gap-3 text-sm border-t border-slate-200/60 pt-2">
                                  <span className="text-slate-600 font-bold">{groupe.libelleOption2 || '2 cours/semaine'}</span>
                                  <span className="font-black text-slate-950 text-base">
                                    {((groupe.tarif || 0) + (groupe.prixLicence || 0)).toFixed(2)} €
                                  </span>
                                </div>
                              </div>
                            ) : (
                              <div className="flex items-center justify-between gap-3 bg-slate-50/70 p-3 rounded-2xl border border-slate-100">
                                <span className="text-xs font-black text-slate-500 uppercase tracking-wider">Tarif annuel global</span>
                                <span className="text-2xl font-black text-slate-950">
                                  {((groupe.tarif || 0) + (groupe.prixLicence || 0)).toFixed(2)} €
                                </span>
                              </div>
                            )}

                            {typeof groupe.prixLicence === 'number' && groupe.prixLicence > 0 && (
                              <p className="text-[11px] text-slate-500 flex justify-between items-center px-1 font-medium">
                                <span>Dont licence fédérale FFN obligatoire :</span>
                                <span className="font-bold text-slate-800">
                                  {groupe.prixLicence.toFixed(2)} €
                                </span>
                              </p>
                            )}

                            {typeof groupe.caution === 'number' && groupe.caution > 0 && (
                              <div className="mt-2.5 border border-amber-200/90 bg-amber-50/70 rounded-2xl p-3.5 text-xs space-y-1.5 shadow-2xs">
                                <div className="flex items-center justify-between font-extrabold text-amber-950">
                                  <span>Caution demandée :</span>
                                  <span className="font-mono text-sm bg-amber-100 px-2 py-0.5 rounded-lg border border-amber-300 text-amber-950 font-black">{groupe.caution.toFixed(2)} €</span>
                                </div>
                                {groupe.nbCompetitionsCaution && groupe.nbCompetitionsCaution > 0 ? (
                                  <p className="text-[11px] text-amber-900 font-medium leading-relaxed">
                                    <strong>Condition de remboursement :</strong> Restituée en fin de saison si le nageur participe à au moins <strong>{groupe.nbCompetitionsCaution} compétition{groupe.nbCompetitionsCaution > 1 ? 's' : ''}</strong>.
                                  </p>
                                ) : (
                                  <p className="text-[11px] text-amber-900 font-medium leading-relaxed">
                                    <strong>Condition de remboursement :</strong> Restituée en fin de saison selon les règles du club.
                                  </p>
                                )}
                              </div>
                            )}
                          </div>
                        )}

                        <div className="flex flex-col sm:flex-row gap-2.5 pt-1">
                          <button
                            type="button"
                            onClick={() => setPlanningModalGroupe(groupe)}
                            className="flex-1 bg-sky-50 hover:bg-sky-100 text-sky-900 border border-sky-200/90 font-extrabold text-xs uppercase tracking-wider py-3 px-3 rounded-xl transition-all shadow-2xs active:scale-[0.99] flex items-center justify-center gap-1.5 cursor-pointer"
                          >
                            <span>📅</span>
                            <span>Planning {slotsCount > 0 ? `(${slotsCount})` : ''}</span>
                          </button>
                          <a
                            href={`/inscription?groupe=${encodeURIComponent(groupe.nom)}`}
                            className="flex-1 text-center bg-slate-950 hover:bg-slate-900 text-white font-bold text-xs uppercase tracking-wider py-3 px-3 rounded-xl transition-all shadow-xs active:scale-[0.99] flex items-center justify-center gap-1.5"
                          >
                            <span>S&apos;inscrire à ce groupe</span>
                          </a>
                        </div>
                      </div>
                    </article>
                  )
                })}
              </div>
            </section>
          )
        })}
      </div>

      {/* MODALE DE PLANNING DU GROUPE */}
      {planningModalGroupe && (
        <div 
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4 animate-fade-in"
          onClick={() => setPlanningModalGroupe(null)}
        >
          <div
            className="bg-white rounded-3xl max-w-xl w-full p-6 md:p-8 shadow-2xl space-y-6 relative border border-slate-100 animate-scale-up overflow-hidden max-h-[90vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header Modale */}
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-4">
              <div>
                <span className="text-[10px] font-black text-sky-700 bg-sky-50 border border-sky-200 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                  Créneaux d&apos;entraînement
                </span>
                <h3 className="text-2xl font-black text-slate-900 tracking-tight mt-1">
                  {planningModalGroupe.nom}
                </h3>
              </div>
              <button
                onClick={() => setPlanningModalGroupe(null)}
                className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center font-bold text-lg transition-colors cursor-pointer"
                aria-label="Fermer"
              >
                ✕
              </button>
            </div>

            {/* Liste des créneaux */}
            <div className="overflow-y-auto space-y-3 flex-1 pr-1">
              {modalSlots.length === 0 ? (
                <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-6 text-center space-y-3">
                  <span className="text-3xl block">🏊‍♂️</span>
                  <p className="text-sm font-semibold text-slate-700">
                    Les créneaux exacts pour ce groupe sont en cours d&apos;actualisation.
                  </p>
                  <p className="text-xs text-slate-500">
                    Vous pouvez consulter le planning interactif global du club ou nous contacter pour plus de renseignements.
                  </p>
                </div>
              ) : (
                modalSlots.map((slot) => (
                  <div
                    key={slot.id}
                    className="bg-slate-50 border border-slate-200/80 rounded-xl px-4 py-3 flex items-center justify-between shadow-2xs"
                  >
                    <span className="bg-sky-600 text-white text-xs font-black px-3 py-1 rounded-lg uppercase tracking-wider">
                      {slot.jourSemaine}
                    </span>
                    <span className="text-slate-950 font-black text-sm md:text-base">
                      {slot.heureDebut} – {slot.heureFin}
                    </span>
                  </div>
                ))
              )}
            </div>

            {/* Footer Modale */}
            <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row gap-3">
              <a
                href={`/planning?groupe=${encodeURIComponent(planningModalGroupe.id)}`}
                className="flex-1 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs uppercase tracking-wider py-3.5 px-4 rounded-xl text-center transition-all shadow-md active:scale-[0.99] flex items-center justify-center gap-2"
              >
                <span>🔍 Voir sur le planning général</span>
              </a>
              <button
                onClick={() => setPlanningModalGroupe(null)}
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs uppercase tracking-wider py-3.5 px-4 rounded-xl transition-all cursor-pointer"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
