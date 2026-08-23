import Link from 'next/link'
import { formatLongDateFr } from '@/lib/date'

export const dynamic = 'force-dynamic'

// ─── Helper : lire la description __FICHE__: sans importer le module client ──
function getEventSummary(description: string | null, categories: string | null): string | null {
  if (!description) return categories ?? null
  const cleaned = description.split('__TARGET_GROUPS__:')[0].trim()
  if (!cleaned.startsWith('__FICHE__:')) return cleaned
  try {
    const fiche = JSON.parse(cleaned.slice('__FICHE__:'.length)) as {
      categories?: string
      genre?: string
      sessions?: Array<{ label?: string; heureDebut?: string; epreuves?: string[] }>
      conditions?: string
    }
    const parts: string[] = []
    if (fiche.categories) parts.push(fiche.categories)
    if (fiche.genre && fiche.genre !== fiche.categories) parts.push(fiche.genre)
    if (fiche.sessions && fiche.sessions.length > 0) {
      const sessionLabels = fiche.sessions
        .map(s => s.label ?? (s.heureDebut ? `${s.heureDebut}` : null))
        .filter(Boolean)
      if (sessionLabels.length > 0) parts.push(sessionLabels.join(' · '))
    }
    return parts.join(' — ') || categories || null
  } catch {
    return categories ?? null
  }
}

type HomeStats = {
  groupes: number
  plannings: number
  actualites: number
  unavailable?: boolean
}

type HomeArticle = {
  id: string
  titre: string
  slug: string
  excerpt: string | null
  datePubli: Date
}

type HomeEvent = {
  id: string
  title: string
  date: Date
  dateFin: Date | null
  lieu: string | null
  heureDebut: string | null
  description: string | null
  targetGroups: string[]
  type: string | null
}

type HomeData = {
  stats: HomeStats
  articles: HomeArticle[]
  evenements: HomeEvent[]
}

const accesRapides = [
  { href: '/planning', titre: 'Planning', description: 'Consulter les créneaux' },
  { href: '/groupes', titre: 'Groupes & Niveaux', description: 'Trouver son groupe en 3 clics' },
  { href: '/inscription', titre: 'Inscriptions', description: 'Tarifs & démarches en ligne' },
  { href: '/actualites', titre: 'Actualités', description: 'Suivre la vie du club' },
]

const TYPE_LABELS: Record<string, string> = {
  competition: 'Compétition', stage: 'Stage',
  entrainement: 'Entraînement', evenement: 'Événement',
}

function formatBadgeLabel(text: string): string {
  if (!text) return text
  const u = text.toUpperCase().trim()
  
  if (u.includes('U11') || u === 'U11 ET -' || u === 'U11 ET MOINS') return 'Avenirs'
  if (u.includes('U12') || u.includes('U13') || u === 'U12 ET U13' || u === 'U12-U13') return 'Benjamins'
  if (u.includes('U14') || u.includes('U15') || u.includes('U16') || u.includes('U17') || u.includes('U18') || u === 'U14 À U18' || u === 'U14-U18' || u.includes('JUNIORS')) return 'Juniors'
  if (u.includes('MAITRE') || u.includes('MAÎTRE')) return 'Maitres'
  
  return text
}

function getGroupBadgeStyle(nom: string): string {
  const n = nom || ''
  const u = n.toUpperCase()

  // Competitions & Mapped categories
  if (nom === 'Avenirs' || n.includes('Avenirs 1') || n.includes('Avenirs 2') || n.includes('Avenirs 3') || n.includes('Avenirs')) {
    return 'bg-sky-50 text-sky-700 border-sky-200/50'
  }
  if (n.includes('Benjamins 1') || nom === 'Benjamins') {
    return 'bg-purple-50 text-purple-700 border-purple-200/50'
  }
  if (n.includes('Benjamins 2')) {
    return 'bg-indigo-50 text-indigo-700 border-indigo-200/50'
  }
  if (nom === 'Juniors' || n.includes('Juniors Compétition') || (n.includes('Juniors') && u.includes('COMP')) || n.includes('Juniors')) {
    return 'bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200/50'
  }
  if (n.includes('Adultes Compétition') || (n.includes('Adultes') && u.includes('COMP'))) {
    return 'bg-slate-900 text-slate-100 border-slate-800'
  }
  if (nom === 'Maitres' || n.includes('Maitres') || n.includes('Maitre') || n.includes('Maîtres') || n.includes('Maître')) {
    return 'bg-slate-850 text-slate-100 border-slate-750'
  }

  // Generic tags (styled nicely instead of plain gray)
  if (u.includes('QUALIFICATIVE')) {
    return 'bg-amber-50 text-amber-700 border-amber-250/50'
  }
  if (u === 'COMPÉTITION' || u === 'COMPETITION') {
    return 'bg-blue-50 text-blue-750 border-blue-200/50'
  }

  // Loisirs
  if (n.includes('Jeunes Loisirs')) return 'bg-emerald-50 text-emerald-700 border-emerald-200/50'
  if (n.includes('Juniors Loisirs')) return 'bg-teal-50 text-teal-700 border-teal-200/50'
  if (n.includes('Adultes Loisirs 1')) return 'bg-lime-50 text-lime-800 border-lime-200/50'
  if (n.includes('Adultes Loisirs 2')) return 'bg-green-800 text-green-50 border-green-700'

  // Rest
  if (n.includes('Natation Artistique') || u.includes('ARTISTIQUE')) return 'bg-pink-50 text-pink-700 border-pink-200/50'
  if (n.includes('AquaGym') || u.includes('AQUA')) return 'bg-cyan-50 text-cyan-700 border-cyan-200/50'
  if (n.includes('BNSSA')) return 'bg-red-50 text-red-700 border-red-200/50'
  if (n.includes('Ecole de natation française (ENF 1)') || n.includes('ENF 1')) return 'bg-yellow-50 text-yellow-800 border-yellow-250/50'
  if (n.includes('Ecole de natation française (ENF 2)') || n.includes('ENF 2')) return 'bg-orange-50 text-orange-700 border-orange-200/50'

  return 'bg-slate-50 text-slate-600 border-slate-200'
}

async function getHomeData(): Promise<HomeData> {
  try {
    const { prisma } = await import('@/lib/prisma')
    const now = new Date()

    const [groupes, plannings, actualitesCount, articles, rawEvenements, dbGroups] = await Promise.all([
      prisma.groupe.count({ where: { actif: true } }),
      prisma.planning.count({ where: { actif: true } }),
      prisma.actualite.count({ where: { publie: true } }),
      prisma.actualite.findMany({
        where: { publie: true },
        orderBy: { datePubli: 'desc' },
        take: 3,
        select: {
          id: true,
          titre: true,
          slug: true,
          excerpt: true,
          datePubli: true,
        },
      }),
      prisma.evenementCalendrier.findMany({
        where: {
          actif: true,
          date: { gte: now },
        },
        include: { groupe: true },
        orderBy: { date: 'asc' },
        take: 3,
      }),
      prisma.groupe.findMany({
        where: { actif: true },
        select: { id: true, nom: true }
      })
    ])

    const evenements = rawEvenements.map(event => {
      let targetGroupNames: string[] = []
      if (event.groupe) {
        targetGroupNames.push(event.groupe.nom)
      } else if (event.description && event.description.includes('__TARGET_GROUPS__:')) {
        try {
          const parts = event.description.split('__TARGET_GROUPS__:')
          const targetGroupIds = JSON.parse(parts[1].trim())
          targetGroupNames = targetGroupIds
            .map((id: string) => dbGroups.find(g => g.id === id)?.nom)
            .filter(Boolean)
        } catch {
          // Ignorer les erreurs de parsing du JSON des groupes cibles
        }
      }
      return {
        id: event.id,
        title: event.title,
        date: event.date,
        dateFin: event.dateFin,
        lieu: event.lieu,
        heureDebut: event.heureDebut,
        description: event.description ? event.description.split('__TARGET_GROUPS__:')[0].trim() : event.description,
        targetGroups: targetGroupNames,
        type: event.type
      }
    })

    return {
      stats: { groupes, plannings, actualites: actualitesCount },
      articles,
      evenements,
    }
  } catch {
    return {
      stats: { groupes: 0, plannings: 0, actualites: 0, unavailable: true },
      articles: [],
      evenements: [],
    }
  }
}

export default async function HomePage() {
  const { stats, articles, evenements } = await getHomeData()

  return (
    <main className="min-h-screen pt-32 md:pt-40 pb-24 bg-white">
      <div className="container mx-auto px-4 max-w-6xl space-y-20">
        
        {/* HERO SECTION IMMERSIVE (Stripe & Linear style) */}
        <section className="relative overflow-hidden p-8 md:p-14 border border-slate-200/80 bg-slate-50/40 rounded-2xl animate-fade-in-up">
          {/* Decorative grid background & subtle glowing blurs (Linear/Stripe style) */}
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#f1f5f9_1px,transparent_1px),linear-gradient(to_bottom,#f1f5f9_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-60 pointer-events-none" />
          <div className="absolute -top-40 -left-40 w-96 h-96 bg-primary/10 rounded-full filter blur-3xl pointer-events-none" />
          <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-slate-100/20 rounded-full filter blur-3xl pointer-events-none" />
          
          <div className="relative z-10 space-y-6 max-w-3xl">
            <span className="inline-flex items-center gap-2 border border-slate-200 bg-white text-slate-600 px-3.5 py-1 rounded-full text-xs font-medium tracking-wide shadow-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Club affilié FFN · Cavaillon
            </span>
            
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-slate-950 tracking-tight leading-tight">
              Natation, progression & <span className="text-primary font-extrabold relative inline-block">esprit club</span>
            </h1>
            
            <p className="text-base md:text-lg text-slate-500 leading-relaxed max-w-2xl font-light">
              Bienvenue au club de natation de Cavaillon. Formations tous âges, entraînements loisirs, natation artistique, aquagym et compétitions FFN de haut niveau.
            </p>

            {/* Quick Access Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
              <Link
                href="/groupes"
                className="group p-4 bg-white hover:bg-slate-50/80 rounded-2xl border border-slate-200 shadow-xs hover:border-primary/40 transition-all flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-emerald-50 text-primary border border-emerald-100 rounded-xl group-hover:scale-105 transition-transform">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <circle cx="12" cy="12" r="10" strokeWidth="2"/>
                      <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" fill="currentColor"/>
                    </svg>
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 group-hover:text-primary transition-colors uppercase tracking-wider">Groupes & Niveaux</h4>
                    <p className="text-xs text-slate-500 font-medium">Trouver votre groupe</p>
                  </div>
                </div>
                <span className="text-xs font-bold text-slate-400 group-hover:text-primary transition-transform group-hover:translate-x-0.5">→</span>
              </Link>

              <Link
                href="/planning"
                className="group p-4 bg-white hover:bg-slate-50/80 rounded-2xl border border-slate-200 shadow-xs hover:border-primary/40 transition-all flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-sky-50 text-sky-700 border border-sky-100 rounded-xl group-hover:scale-105 transition-transform">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" strokeWidth="2"/>
                      <line x1="16" y1="2" x2="16" y2="6" strokeWidth="2"/>
                      <line x1="8" y1="2" x2="8" y2="6" strokeWidth="2"/>
                      <line x1="3" y1="10" x2="21" y2="10" strokeWidth="2"/>
                    </svg>
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 group-hover:text-primary transition-colors uppercase tracking-wider">Planning</h4>
                    <p className="text-xs text-slate-500 font-medium">Consulter les créneaux</p>
                  </div>
                </div>
                <span className="text-xs font-bold text-slate-400 group-hover:text-primary transition-transform group-hover:translate-x-0.5">→</span>
              </Link>

              <Link
                href="/inscription"
                className="group p-4 bg-primary hover:bg-primary-dark rounded-2xl border border-primary text-white shadow-xs hover:shadow-md transition-all flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white/15 text-white rounded-xl group-hover:scale-105 transition-transform">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                    </svg>
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white uppercase tracking-wider">Inscriptions</h4>
                    <p className="text-xs text-emerald-100 font-medium">Tarifs & démarches</p>
                  </div>
                </div>
                <span className="text-xs font-bold text-emerald-200 transition-transform group-hover:translate-x-0.5">→</span>
              </Link>
            </div>

            {stats.unavailable && (
              <p className="mt-4 text-xs font-medium text-amber-700 bg-amber-50/50 border border-amber-200/60 rounded-lg px-4 py-3">
                Certaines données dynamiques ne sont pas disponibles pour le moment.
              </p>
            )}
          </div>
        </section>

        {/* ─── SECTION DÉDIÉE : NOS DISCIPLINES & ACTIVITÉS PHARE (BOOST SEO AQUAGYM / NATATION) ─── */}
        <section className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 border-b border-slate-200 pb-4">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 text-xs font-bold uppercase tracking-wider border border-emerald-200 mb-2">
                <span>Nos Activités à Cavaillon</span>
              </div>
              <h2 className="text-2xl md:text-3xl font-black text-slate-950 tracking-tight">
                Pour tous les âges, du loisir à la haute performance
              </h2>
            </div>
            <Link
              href="/groupes"
              className="text-xs font-bold text-primary hover:text-primary-dark transition-colors inline-flex items-center gap-1 shrink-0"
            >
              <span>Découvrir tous les groupes</span>
              <span>→</span>
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* CARTE 1 : AQUAFITNESS & AQUAGYM */}
            <div className="p-6 rounded-2xl border border-emerald-200/80 bg-gradient-to-b from-emerald-50/40 to-white shadow-xs hover:shadow-md hover:border-emerald-300 transition-all flex flex-col justify-between space-y-4">
              <div className="space-y-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-black">
                  🌊
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] font-black uppercase tracking-wider text-emerald-700 bg-emerald-100/60 px-2 py-0.5 rounded-md">
                    Remise en forme · Adultes & Seniors
                  </span>
                  <h3 className="text-lg font-black text-slate-900">
                    AquaGym & AquaFitness
                  </h3>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Cours de gymnastique aquatique en musique à la piscine Alphonse Roudière. Renforcement musculaire complet et cardio sans choc articulaire.
                </p>
              </div>
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500">Mardi & Jeudi 19h15</span>
                <Link
                  href="/groupes"
                  className="text-xs font-black text-emerald-700 hover:text-emerald-800 transition-colors"
                >
                  Détails & Tarifs →
                </Link>
              </div>
            </div>

            {/* CARTE 2 : ECOLE DE NATATION */}
            <div className="p-6 rounded-2xl border border-cyan-200/80 bg-gradient-to-b from-cyan-50/40 to-white shadow-xs hover:shadow-md hover:border-cyan-300 transition-all flex flex-col justify-between space-y-4">
              <div className="space-y-3">
                <div className="w-10 h-10 rounded-xl bg-cyan-100 text-cyan-700 flex items-center justify-center font-black">
                  🏊‍♂️
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] font-black uppercase tracking-wider text-cyan-700 bg-cyan-100/60 px-2 py-0.5 rounded-md">
                    Dès 6 ans · Apprentissage
                  </span>
                  <h3 className="text-lg font-black text-slate-900">
                    École de Natation
                  </h3>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Progression ludique et sécurisée en petit bassin pour acquérir l&apos;aisance aquatique et apprendre les techniques de nage fondamentales.
                </p>
              </div>
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500">Mercredi & Samedi</span>
                <Link
                  href="/groupes"
                  className="text-xs font-black text-cyan-700 hover:text-cyan-800 transition-colors"
                >
                  Détails & Tarifs →
                </Link>
              </div>
            </div>

            {/* CARTE 3 : COMPETITION FFN */}
            <div className="p-6 rounded-2xl border border-indigo-200/80 bg-gradient-to-b from-indigo-50/40 to-white shadow-xs hover:shadow-md hover:border-indigo-300 transition-all flex flex-col justify-between space-y-4">
              <div className="space-y-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-black">
                  🏆
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] font-black uppercase tracking-wider text-indigo-700 bg-indigo-100/60 px-2 py-0.5 rounded-md">
                    Filière Fédérale FFN
                  </span>
                  <h3 className="text-lg font-black text-slate-900">
                    Natation Compétition
                  </h3>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Entraînements intensifs, préparation physique (PPG) et participation aux championnats départementaux, régionaux et nationaux.
                </p>
              </div>
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500">Tous les soirs</span>
                <Link
                  href="/groupes"
                  className="text-xs font-black text-indigo-700 hover:text-indigo-800 transition-colors"
                >
                  Détails & Tarifs →
                </Link>
              </div>
            </div>

            {/* CARTE 4 : ARTISTIQUE & SAUVETAGE SSA */}
            <div className="p-6 rounded-2xl border border-purple-200/80 bg-gradient-to-b from-purple-50/40 to-white shadow-xs hover:shadow-md hover:border-purple-300 transition-all flex flex-col justify-between space-y-4">
              <div className="space-y-3">
                <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center font-black">
                  🛟
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] font-black uppercase tracking-wider text-purple-700 bg-purple-100/60 px-2 py-0.5 rounded-md">
                    Artistique & Diplôme d&apos;État
                  </span>
                  <h3 className="text-lg font-black text-slate-900">
                    Artistique & SSA
                  </h3>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Natation synchronisée en musique et préparation diplômante au métier de Surveillant Sauveteur Aquatique (SSA + PSE1/PSE2).
                </p>
              </div>
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500">Vendredi & Samedi</span>
                <Link
                  href="/groupes"
                  className="text-xs font-black text-purple-700 hover:text-purple-800 transition-colors"
                >
                  Détails & Tarifs →
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* LATEST ARTICLES & COMING EVENTS */}
        <section className="grid lg:grid-cols-2 gap-12">
          
          {/* LATEST ARTICLES */}
          <article className="space-y-6">
            <div className="flex items-center justify-between border-b border-slate-200 pb-4">
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                <h2 className="text-sm font-black uppercase tracking-widest text-slate-900">
                  Actualités
                </h2>
              </div>
              <Link href="/actualites" className="text-xs font-bold text-slate-500 hover:text-primary transition-colors flex items-center gap-1">
                Voir tout <span>→</span>
              </Link>
            </div>

            {articles.length === 0 ? (
              <p className="text-slate-400 font-medium text-sm italic">Aucun article publié pour le moment.</p>
            ) : (
              <div className="space-y-4">
                {articles.map((article) => (
                  <Link
                    key={article.id}
                    href={`/actualites/${article.slug}`}
                    className="group block relative rounded-2xl border border-slate-200/80 p-5 bg-white shadow-xs transition-all duration-300 hover:border-slate-350 hover:shadow-md hover:shadow-slate-100/50 hover:-translate-y-1 hover:border-l-primary hover:border-l-4"
                  >
                    <div className="flex items-center justify-between gap-4 mb-2">
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[8px] font-extrabold uppercase tracking-wider bg-slate-50 text-slate-500 border border-slate-100">
                        Article
                      </span>
                      <span className="text-[10px] font-semibold text-slate-400">
                        {formatLongDateFr(article.datePubli)}
                      </span>
                    </div>
                    <h3 className="font-extrabold text-slate-950 group-hover:text-primary transition-colors text-base mb-1.5 leading-snug">
                      {article.titre}
                    </h3>
                    <p className="text-sm text-slate-500 line-clamp-2 leading-relaxed font-light mb-3">
                      {article.excerpt || 'Lire l’article complet pour découvrir les informations détaillées.'}
                    </p>
                    <div className="flex items-center gap-1 text-xs font-bold text-primary opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-x-[-4px] group-hover:translate-x-0">
                      <span>Lire l&apos;article</span>
                      <svg className="w-3.5 h-3.5 transition-transform duration-300 group-hover:translate-x-0.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </article>

          {/* COMING EVENTS */}
          <article className="space-y-6">
            <div className="flex items-center justify-between border-b border-slate-200 pb-4">
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                <h2 className="text-sm font-black uppercase tracking-widest text-slate-900">
                  Événements à venir
                </h2>
              </div>
              <Link href="/calendrier" className="text-xs font-bold text-slate-500 hover:text-primary transition-colors flex items-center gap-1">
                Voir le calendrier <span>→</span>
              </Link>
            </div>

            {evenements.length === 0 ? (
              <p className="text-slate-400 font-medium text-sm italic">Aucun événement à venir publié pour le moment.</p>
            ) : (
              <div className="space-y-4">
                {evenements.map((event) => {
                  const summary = getEventSummary(event.description, null)
                  const isMultiDay = event.dateFin &&
                    new Date(event.dateFin).toDateString() !== new Date(event.date).toDateString()
                  
                  const eventDate = new Date(event.date)
                  const dayNum = eventDate.getDate()
                  const monthStr = eventDate.toLocaleDateString('fr-FR', { month: 'short' }).replace('.', '').toUpperCase()

                  return (
                    <Link
                      key={event.id}
                      href="/calendrier"
                      className="group block rounded-2xl border border-slate-200/80 p-5 bg-white shadow-xs transition-all duration-300 hover:border-slate-350 hover:shadow-md hover:shadow-slate-100/50 hover:-translate-y-1 flex gap-5"
                    >
                      {/* Date Block Calendar Widget */}
                      <div className="flex flex-col items-center justify-center shrink-0 w-14 h-14 rounded-xl border border-slate-200 bg-slate-50/50 overflow-hidden shadow-xs">
                        <div className="w-full bg-primary text-white font-extrabold text-[8px] uppercase tracking-wider py-1 text-center select-none leading-none">
                          {monthStr}
                        </div>
                        <div className="w-full grow flex items-center justify-center bg-white font-black text-slate-900 text-base leading-none select-none">
                          {dayNum}
                        </div>
                      </div>

                      {/* Event details */}
                      <div className="grow space-y-1.5">
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex flex-wrap gap-1">
                            {(() => {
                              const badges: { label: string; style: string }[] = []
                              const isCompetition = event.type === 'competition'
                              if (event.type) {
                                const label = TYPE_LABELS[event.type] ?? event.type
                                badges.push({ label, style: getGroupBadgeStyle(label) })
                              }
                              if (event.targetGroups) {
                                for (const g of event.targetGroups) {
                                  const label = formatBadgeLabel(g)
                                  if (isCompetition && label.toLowerCase().includes('loisir')) {
                                    continue
                                  }
                                  if (!badges.some(b => b.label.toLowerCase() === label.toLowerCase())) {
                                    badges.push({ label, style: getGroupBadgeStyle(label) })
                                  }
                                }
                              }
                              if (badges.length === 0) {
                                return (
                                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[8px] font-extrabold uppercase tracking-wider bg-slate-50 text-slate-500 border border-slate-200/50">
                                    Tout public
                                  </span>
                                )
                              }
                              return badges.map((badge, idx) => (
                                <span
                                  key={idx}
                                  className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[8px] font-extrabold uppercase tracking-wider border ${badge.style}`}
                                >
                                  {badge.label}
                                </span>
                              ))
                            })()}
                          </div>
                          {isMultiDay && event.dateFin && (
                            <span className="text-[9px] font-bold text-slate-400">
                              Jusqu&apos;au {new Date(event.dateFin).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                            </span>
                          )}
                        </div>

                        <h3 className="font-extrabold text-slate-950 group-hover:text-primary transition-colors text-base leading-snug">
                          {event.title}
                        </h3>

                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                          {event.lieu && (
                            <span className="flex items-center gap-1.5 text-xs font-semibold text-slate-450">
                              <svg className="w-3.5 h-3.5 shrink-0 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
                              </svg>
                              {event.lieu}
                            </span>
                          )}
                          {event.heureDebut && (
                            <span className="flex items-center gap-1.5 text-xs font-semibold text-slate-450">
                              <svg className="w-3.5 h-3.5 shrink-0 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
                              </svg>
                              {event.heureDebut}
                            </span>
                          )}
                        </div>

                        {summary && (
                          <div className="pt-0.5">
                            <span className="text-[10px] font-bold text-slate-550 bg-slate-50 border border-slate-200/50 rounded-lg px-2 py-0.5 inline-block max-w-full truncate">
                              {summary}
                            </span>
                          </div>
                        )}
                      </div>
                    </Link>
                  )
                })}
              </div>
            )}
          </article>

        </section>

      </div>
    </main>
  )
}

