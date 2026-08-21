import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { getCurrentSeasonLabel, isInterSaisonActive } from '@/lib/season-utils'
import { sanitizeHtml } from '@/lib/sanitize'

export const dynamic = 'force-dynamic'

function getWatermarkSvgBase64(text: string) {
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='300' height='180' viewBox='0 0 300 180'><text x='150' y='90' fill='black' font-size='13' font-family='system-ui, -apple-system, sans-serif' font-weight='800' letter-spacing='0.1em' text-anchor='middle' transform='rotate(-25 150 90)'>${text}</text></svg>`
  return Buffer.from(svg).toString('base64')
}

// ─── Types ──────────────────────────────────────────────
interface BlockData {
  id: string
  type: string
  titre: string | null
  contenu: Record<string, any>
  ordre: number
}

interface Groupe {
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

// ─── Data Fetching ──────────────────────────────────────
async function getBlocks(): Promise<BlockData[]> {
  try {
    return await prisma.inscriptionBlock.findMany({
      where: { actif: true },
      orderBy: { ordre: 'asc' },
    }) as unknown as BlockData[]
  } catch {
    return []
  }
}

async function getGroupes(): Promise<Groupe[]> {
  try {
    const list = await prisma.groupe.findMany({
      where: {
        actif: true,
        OR: [
          { tarif: { not: null } },
          { tarif1Cours: { not: null } },
        ],
      },
      orderBy: { ordre: 'asc' },
    }) as unknown as Groupe[]
    return list.sort((a, b) => {
      const ageA = a.ageMin ?? 999
      const ageB = b.ageMin ?? 999
      if (ageA !== ageB) return ageA - ageB
      return (a.ordre || 0) - (b.ordre || 0)
    })
  } catch {
    return []
  }
}

// ─── Sanitize HTML ──────────────────────────────────────
function sanitize(html: string): string {
  return sanitizeHtml(html)
}

// ─── Main Page ──────────────────────────────────────────
export default async function InscriptionPage() {
  const [blocks, settings, dbGroupes] = await Promise.all([
    getBlocks(),
    prisma.settings.findFirst(),
    getGroupes(),
  ])

  const inscriptionUrl = settings?.inscriptionUrl || 'https://monclub.fr'

  // If no blocks configured, show fallback
  if (blocks.length === 0) {
    return (
      <main className="min-h-screen pt-36 pb-20 bg-slate-50/50">
        <div className="container mx-auto px-4 max-w-5xl text-center space-y-4">
          <h1 className="text-4xl font-black text-slate-900">Inscriptions</h1>
          <p className="text-slate-600">La page d&apos;inscription est en cours de configuration.</p>
        </div>
      </main>
    )
  }

  const interSaison = isInterSaisonActive(settings?.interSaisonActif)
  const texteFiligrane = settings?.texteFiligrane || getCurrentSeasonLabel()

  return (
    <main className={`min-h-screen pt-36 pb-20 relative overflow-hidden transition-colors ${interSaison ? 'bg-slate-50/80' : 'bg-slate-50/50'}`}>
      {/* Watermark overlaying all content */}
      {interSaison && (
        <div 
          className="absolute inset-0 pointer-events-none z-50 select-none opacity-[0.035]"
          style={{
            backgroundImage: `url("data:image/svg+xml;base64,${getWatermarkSvgBase64(texteFiligrane)}")`,
            backgroundRepeat: 'repeat',
          }}
        />
      )}

      <div className="container mx-auto px-4 max-w-5xl space-y-12 animate-fade-in-up relative z-20">
        {/* Inter-season banner */}
        {interSaison && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3 shadow-xs">
            <span className="text-xl">⚠️</span>
            <div>
              <h4 className="font-extrabold text-amber-900 text-sm">Mode Inter-Saison</h4>
              <p className="text-xs text-amber-700 mt-0.5 leading-relaxed">
                Les tarifs et modalités d&apos;inscription présentés ci-dessous concernent la <strong>{texteFiligrane}</strong>. Ils sont affichés à titre indicatif et sont en cours de mise à jour pour la nouvelle saison.
              </p>
            </div>
          </div>
        )}

        <div className={`${interSaison ? "opacity-55 grayscale-[50%] blur-[0.6px] pointer-events-auto" : ""} space-y-12`}>
          {blocks.map(block => (
            <BlockRenderer key={block.id} block={block} dbGroupes={dbGroupes} settings={settings} />
          ))}
        </div>
      </div>
    </main>
  )
}

// ─── Block Renderer ─────────────────────────────────────
interface BlockRendererProps {
  block: BlockData
  dbGroupes: Groupe[]
  settings: any
}

function BlockRenderer({ block, dbGroupes, settings }: BlockRendererProps) {
  switch (block.type) {
    case 'hero': return <HeroBlock block={block} />
    case 'banner': return <BannerBlock block={block} />
    case 'cta': return <CtaBlock block={block} inscriptionUrl={settings?.inscriptionUrl || 'https://monclub.fr'} />
    case 'groups-table': return <GroupsTableBlock block={block} settings={settings} />
    case 'pricing': return <PricingBlock block={block} dbGroupes={dbGroupes} />
    case 'financial-aid': return <FinancialAidBlock block={block} />
    case 'richtext': return <RichtextBlock block={block} />
    case 'rules': return <RulesBlock block={block} settings={settings} />
    case 'tests': return <TestsBlock block={block} settings={settings} />
    case 'access': return <AccessBlock block={block} />
    case 'bnssa': return <BnssaBlock block={block} />
    case 'contact': return <ContactBlock block={block} />
    default: return null
  }
}

// ─── Hero Block ─────────────────────────────────────────
function HeroBlock({ block }: { block: BlockData }) {
  const c = block.contenu
  return (
    <div className="text-center space-y-4 max-w-3xl mx-auto">
      <span className="text-primary font-bold text-sm uppercase tracking-widest bg-primary/10 px-4 py-1.5 rounded-full border border-primary/20">
        {(c.saison as string) || 'Saison'}
      </span>
      {block.titre && (
        <h1 className="text-4xl md:text-5xl font-black font-display text-slate-900 tracking-tight"
            dangerouslySetInnerHTML={{ __html: sanitize(block.titre) }} />
      )}
      {c.description && (
        <div className="text-base md:text-lg text-slate-700 leading-relaxed font-normal"
             dangerouslySetInnerHTML={{ __html: sanitize(c.description as string) }} />
      )}
    </div>
  )
}

// ─── Banner Block ───────────────────────────────────────
function BannerBlock({ block }: { block: BlockData }) {
  const c = block.contenu
  const couleur = (c.couleur as string) || 'sky'
  const colorClasses: Record<string, string> = {
    sky: 'bg-sky-50 border-sky-500 text-sky-900',
    amber: 'bg-amber-50 border-amber-500 text-amber-900',
    rose: 'bg-rose-50 border-rose-500 text-rose-900',
    emerald: 'bg-emerald-50 border-emerald-500 text-emerald-900',
  }

  return (
    <div className={`border-l-4 p-6 rounded-r-2xl shadow-xs ${colorClasses[couleur] || colorClasses.sky}`}>
      <div className="flex items-start gap-4">
        <span className="text-3xl">{(c.emoji as string) || '📢'}</span>
        <div className="space-y-1.5 flex-1">
          {block.titre && (
            <h4 className="font-extrabold text-base uppercase tracking-wide"
                dangerouslySetInnerHTML={{ __html: sanitize(block.titre) }} />
          )}
          {c.texte && (
            <div className="text-sm md:text-base font-normal leading-relaxed"
                 dangerouslySetInnerHTML={{ __html: sanitize(c.texte as string) }} />
          )}
        </div>
      </div>
    </div>
  )
}

// ─── CTA Block ──────────────────────────────────────────
function CtaBlock({ block, inscriptionUrl }: { block: BlockData; inscriptionUrl: string }) {
  const c = block.contenu
  const url = c.urlSource === 'custom' ? (c.customUrl as string) || '#' : inscriptionUrl

  return (
    <div className="p-8 bg-gradient-to-br from-slate-900 to-slate-950 text-white flex flex-col md:flex-row items-center justify-between gap-6 shadow-2xl rounded-2xl relative overflow-hidden border border-slate-800/40">
      <div className="absolute top-0 right-0 w-96 h-96 bg-primary/15 rounded-full blur-3xl pointer-events-none"></div>
      <div className="space-y-2 text-center md:text-left relative z-10">
        {c.label && (
          <span className="text-xs font-bold tracking-widest text-primary uppercase bg-primary/10 px-3 py-1 rounded-md border border-primary/20">
            {c.label as string}
          </span>
        )}
        {block.titre && (
          <h3 className="font-extrabold text-xl md:text-2xl text-white"
              dangerouslySetInnerHTML={{ __html: sanitize(block.titre) }} />
        )}
        {c.description && (
          <div className="text-sm text-slate-200 font-light max-w-lg"
               dangerouslySetInnerHTML={{ __html: sanitize(c.description as string) }} />
        )}
      </div>
      <div className="flex flex-wrap justify-center gap-3 w-full md:w-auto relative z-10">
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="px-7 py-3.5 bg-primary hover:bg-primary-dark text-slate-950 font-black text-sm rounded-xl shadow-lg transition-all flex items-center gap-2 cursor-pointer hover:scale-[1.02] active:scale-98"
        >
          {(c.boutonTexte as string) || 'Inscription'}
        </a>
      </div>
    </div>
  )
}

// ─── Groups Table Block ─────────────────────────────────
function GroupsTableBlock({ block, settings }: { block: BlockData; settings: any }) {
  const c = block.contenu
  const lignes = (c.lignes as Array<{ section: string; annees: string }>) || []

  return (
    <section className="card p-6 md:p-8 space-y-6">
      <h2 className="text-xl font-black uppercase tracking-wider text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
        <span>{(c.emoji as string) || '🏊'}</span> {block.titre}
      </h2>

      {c.introTexte && (
        <div className="bg-primary/5 border border-primary/10 p-5 rounded-xl text-sm text-slate-800 leading-relaxed font-medium"
             dangerouslySetInnerHTML={{ __html: sanitize(c.introTexte as string) }} />
      )}

      {lignes.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full text-sm">
            <thead className="bg-slate-50">
              <tr className="border-b border-slate-200 font-bold text-slate-800 text-left">
                <th className="py-3.5 px-4">Section / Groupe de niveau</th>
                <th className="py-3.5 px-4 text-center">Année de naissance</th>
              </tr>
            </thead>
            <tbody>
              {lignes.map((ligne, i) => (
                <tr key={i} className={`${i < lignes.length - 1 ? 'border-b border-slate-100' : ''} hover:bg-slate-50/50 transition-all`}>
                  <td className="py-3.5 px-4 font-semibold text-slate-800">{ligne.section}</td>
                  <td className="py-3.5 px-4 text-center text-slate-800 font-mono font-semibold">{ligne.annees}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="bg-rose-50 border border-rose-100 text-rose-800 p-5 rounded-xl text-center text-sm font-bold space-y-1.5">
        <p className="text-base">📅 Début des cours : {settings?.debutCoursNormal || 'Date à confirmer'}</p>
        <p className="text-xs font-semibold text-rose-800 uppercase">Section SSA (ex-BNSSA) uniquement à partir du {settings?.debutCoursBnssa || 'Jeudi 1er Octobre 2026'}</p>
      </div>
    </section>
  )
}

// ─── Pricing Block ──────────────────────────────────────
function PricingBlock({ block, dbGroupes }: { block: BlockData; dbGroupes: Groupe[] }) {
  const c = block.contenu
  const badges = (c.badges as string[]) || []
  const precisions = (c.precisionsPaiement as Array<{ texte: string; type: string }>) || []

  const categories = [
    { title: 'École de Natation', description: 'Apprentissage des techniques de nage de base pour les débutants.', groupes: dbGroupes.filter(g => ['enf', 'debutant'].includes(g.niveau || '')) },
    { title: 'Loisir / compétition', description: 'Groupes Avenirs sachant déjà nager, formant la transition entre l\'apprentissage, le loisir et la compétition.', groupes: dbGroupes.filter(g => g.niveau === 'avenirs') },
    { title: 'Pratique Loisir', description: 'Pratique de la natation pour le plaisir, le maintien de la condition physique sans objectif de compétition.', groupes: dbGroupes.filter(g => g.niveau === 'loisir') },
    { title: 'Compétition', description: 'Entraînements intensifs avec participation obligatoire aux compétitions départementales, régionales ou nationales.', groupes: dbGroupes.filter(g => g.niveau === 'competition') },
    { title: 'Natation Artistique', description: 'Discipline mêlant grâce, gymnastique et natation sur des rythmes musicaux.', groupes: dbGroupes.filter(g => g.niveau === 'artistique') },
    { title: 'Bien-être & AquaGym', description: 'Activités douces ou toniques dans l\'eau pour rester en forme physique.', groupes: dbGroupes.filter(g => g.niveau === 'aquagym') },
    { title: 'Sauvetage & SSA (ex-BNSSA)', description: 'Formation professionnelle de Surveillant Sauveteur Aquatique (SSA) et secourisme PSE1/PSE2.', groupes: dbGroupes.filter(g => ['bnssa', 'ssa'].includes(g.niveau || '') || (g.nom || '').toUpperCase().includes('BNSSA') || (g.nom || '').toUpperCase().includes('SSA')) },
  ]

  return (
    <section className="card p-6 md:p-8 space-y-6">
      <div className="border-b border-slate-100 pb-3 flex flex-col sm:flex-row justify-between sm:items-center gap-2">
        <h2 className="text-xl font-black uppercase tracking-wider text-slate-900 flex items-center gap-2">
          <span>{(c.emoji as string) || '💰'}</span> {block.titre}
        </h2>
        <div className="flex flex-wrap gap-2">
          {badges.map((badge, i) => (
            <span key={i} className="text-xs bg-slate-100 text-slate-700 font-extrabold uppercase px-2.5 py-1 rounded">
              {badge}
            </span>
          ))}
        </div>
      </div>

      {dbGroupes.length === 0 ? (
        <div className="border border-slate-200/80 p-6 text-center text-slate-500 font-medium rounded-xl text-sm">
          Chargement des tarifs en cours...
        </div>
      ) : (
        <div className="space-y-6">
          {categories.map((category) => {
            if (category.groupes.length === 0) return null
            return (
              <div key={category.title} className="space-y-3">
                <div className="flex flex-col">
                  <h3 className="font-extrabold text-base text-slate-900 uppercase tracking-wider border-b border-slate-300 pb-1">
                    {category.title}
                  </h3>
                  <p className="text-xs text-slate-600 font-normal mt-0.5">{category.description}</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {category.groupes.map((groupe) => {
                    const totalTarif = (groupe.tarif || 0) + (groupe.prixLicence || 0)
                    return (
                      <div key={groupe.id} className={`p-4 border border-slate-200 rounded-xl space-y-1 bg-white hover:border-slate-400 hover:shadow-xs transition-all ${groupe.annule ? 'border-red-200 bg-red-50/5' : ''}`}>
                        <div className="flex justify-between items-start">
                          <div className="space-y-0.5">
                            <span className={`font-extrabold text-sm text-slate-900 block ${groupe.annule ? 'line-through text-slate-400' : ''}`}>{groupe.nom}</span>
                            {groupe.annule ? (
                              <span className="text-[9px] sm:text-[10px] bg-red-100 text-red-800 px-1.5 py-0.5 rounded-md font-bold inline-block uppercase tracking-wider mt-1 leading-relaxed max-w-xs">
                                Créneau temporairement suspendu (en attente d&apos;un coach). Réouverture possible à tout moment !
                              </span>
                            ) : (
                              typeof groupe.prixLicence === 'number' && (
                                <span className="text-xs text-slate-500 block italic">Licence FFN incluse ({groupe.prixLicence.toFixed(0)}€)</span>
                              )
                            )}
                          </div>
                          <div className={`text-right flex flex-col items-end ${groupe.annule ? 'opacity-35 line-through select-none pointer-events-none' : ''}`}>
                            {groupe.tarif1Cours ? (
                              <div className="space-y-0.5 text-xs text-slate-650 font-medium">
                                <div>{groupe.libelleOption1 || '1 cours/sem'} : <span className="font-black text-slate-950 font-mono text-sm">{(groupe.tarif1Cours + (groupe.prixLicence || 0)).toFixed(0)} €</span></div>
                                <div>{groupe.libelleOption2 || '2 cours/sem'} : <span className="font-black text-slate-950 font-mono text-sm">{totalTarif.toFixed(0)} €</span></div>
                              </div>
                            ) : (
                              <span className="font-black text-slate-950 font-mono text-base">{totalTarif.toFixed(0)} €</span>
                            )}
                            {groupe.caution && (
                              <span className="block text-xs text-amber-800 font-bold mt-1 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200" title={groupe.nbCompetitionsCaution ? `Caution remboursable dès ${groupe.nbCompetitionsCaution} compétition(s)` : 'Caution remboursable en fin de saison'}>
                                +{groupe.caution.toFixed(0)}€ caution (en supplément au tarif global)* {groupe.nbCompetitionsCaution ? `(${groupe.nbCompetitionsCaution} compét. min.)` : ''}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
          {c.noteCaution && (
            <p className="text-xs text-slate-500 font-normal italic leading-relaxed">{c.noteCaution as string}</p>
          )}
        </div>
      )}

      {precisions.length > 0 && (
        <div className="space-y-3 text-sm font-normal text-slate-800 bg-slate-100/50 p-4 rounded-xl border border-slate-200 leading-relaxed">
          <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider">Précisions de paiement :</h4>
          {precisions.map((p, i) => (
            <p key={i} className={`flex items-start gap-2 ${p.type === 'warning' ? 'text-rose-800 font-semibold' : ''}`}>
              <span className={p.type === 'warning' ? 'text-rose-600' : 'text-slate-500'}>{p.type === 'warning' ? '⚠️' : '•'}</span>
              <span dangerouslySetInnerHTML={{ __html: sanitize(p.texte) }} />
            </p>
          ))}
        </div>
      )}
    </section>
  )
}

// ─── Financial Aid Block ────────────────────────────────
function FinancialAidBlock({ block }: { block: BlockData }) {
  const c = block.contenu
  const sections = (c.sections as Array<{ titre: string; emoji: string; paragraphes: string[] }>) || []

  return (
    <section className="card p-6 md:p-8 space-y-6">
      <h2 className="text-xl font-black uppercase tracking-wider text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
        <span>{(c.emoji as string) || '💸'}</span> {block.titre}
      </h2>
      <div className="space-y-6 text-sm text-slate-800 font-normal leading-relaxed">
        {sections.map((section, i) => (
          <div key={i} className={`space-y-3 ${i > 0 ? 'border-t border-slate-200 pt-4' : ''}`}>
            <h4 className="font-extrabold text-slate-900 uppercase tracking-wide text-xs flex items-center gap-1.5">
              <span className="text-base">{section.emoji}</span> {section.titre}
            </h4>
            {section.paragraphes.map((p, pi) => (
              <p key={pi} dangerouslySetInnerHTML={{ __html: sanitize(p) }} />
            ))}
          </div>
        ))}
      </div>
    </section>
  )
}

// ─── Richtext Block ─────────────────────────────────────
function RichtextBlock({ block }: { block: BlockData }) {
  const c = block.contenu
  return (
    <section className="card p-6 md:p-8 space-y-4">
      {block.titre && (
        <h2 className="text-xl font-black uppercase tracking-wider text-slate-900 border-b border-slate-100 pb-3">
          {block.titre}
        </h2>
      )}
      {c.texte && (
        <div className="prose prose-sm prose-slate max-w-none"
             dangerouslySetInnerHTML={{ __html: sanitize(c.texte as string) }} />
      )}
    </section>
  )
}

// ─── Rules Block ────────────────────────────────────────
function RulesBlock({ block, settings, isSidebar }: { block: BlockData; settings: any; isSidebar?: boolean }) {
  const c = block.contenu
  const items = (c.items as Array<{ titre: string; texte: string; lienReglement?: string }>) || []
  const questionnaireSante = (c.questionnaireSante as Record<string, string>) || {}
  const honorabilite = (c.honorabilite as Record<string, string>) || {}
  const formulaireLicenceFfnUrl = settings?.formulaireLicenceFfnUrl

  return (
    <section className={`card p-6 space-y-6 ${isSidebar ? 'bg-slate-50/50 border-slate-200' : ''}`}>
      <h3 className="font-extrabold text-slate-900 border-b border-slate-200 pb-3 uppercase tracking-wider text-xs">
        {(c.emoji as string) || '📝'} {block.titre}
      </h3>
      <div className="space-y-4 text-sm font-normal text-slate-700 leading-relaxed">
        {formulaireLicenceFfnUrl && (
          <div className="p-4 rounded-xl bg-cyan-50 border border-cyan-200 text-cyan-950 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span className="font-black text-xs uppercase tracking-wide flex items-center gap-1.5">
                <span>🏊</span> Formulaire Officiel FFN
              </span>
              <span className="text-[9px] font-black uppercase tracking-wider bg-cyan-200/70 text-cyan-900 px-2 py-0.5 rounded-full">Obligatoire</span>
            </div>
            <p className="text-xs text-cyan-800 leading-relaxed">
              Téléchargez et joignez le formulaire de licence officiel de la Fédération Française de Natation à votre dossier.
            </p>
            <div className="pt-1">
              <a
                href={formulaireLicenceFfnUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-700 hover:bg-cyan-800 text-white text-xs font-bold transition-colors"
              >
                <span>📥 Télécharger le Formulaire FFN (PDF)</span>
              </a>
            </div>
          </div>
        )}

        {items.map((item, i) => (
          <div key={i} className="space-y-1">
            <span className="font-bold text-slate-800">{item.titre}</span>
            <p dangerouslySetInnerHTML={{ __html: sanitize(item.texte) }} />
          </div>
        ))}

        {questionnaireSante.titre && (
          <div className="space-y-2 bg-white p-3.5 rounded-lg border border-slate-200 shadow-sm">
            <span className="font-bold text-slate-900 block text-xs uppercase tracking-wide">{questionnaireSante.titre}</span>
            {questionnaireSante.texte && (
              <p className="mb-2 leading-relaxed" dangerouslySetInnerHTML={{ __html: sanitize(questionnaireSante.texte) }} />
            )}
            {questionnaireSante.detail && (
              <p className="text-slate-700 leading-relaxed font-medium" dangerouslySetInnerHTML={{ __html: sanitize(questionnaireSante.detail) }} />
            )}
          </div>
        )}

        {honorabilite.titre && (
          <div className="space-y-1 bg-slate-100 p-3.5 rounded-lg border border-slate-200 text-slate-600 leading-relaxed">
            <span className="font-bold text-slate-800 block text-xs uppercase tracking-wide">{honorabilite.titre}</span>
            {honorabilite.texte && (
              <p dangerouslySetInnerHTML={{ __html: sanitize(honorabilite.texte) }} />
            )}
          </div>
        )}
      </div>
    </section>
  )
}

// ─── Tests Block ────────────────────────────────────────
function TestsBlock({ block, settings, isSidebar }: { block: BlockData; settings: any; isSidebar?: boolean }) {
  const c = block.contenu
  const afficherBoutonTest = settings?.afficherBoutonTest !== false

  return (
    <section className={`card p-6 space-y-6 ${isSidebar ? 'bg-slate-50/50 border-slate-200' : ''}`}>
      <h3 className="font-extrabold text-slate-900 border-b border-slate-200 pb-3 uppercase tracking-wider text-xs">
        {(c.emoji as string) || '⏱️'} {block.titre}
      </h3>
      <div className="space-y-3 text-sm font-normal text-slate-700 leading-relaxed">
        {c.intro && (
          <p dangerouslySetInnerHTML={{ __html: sanitize(c.intro as string) }} />
        )}
        <div className="bg-white p-3.5 rounded-lg border border-slate-200 space-y-2.5 font-normal text-slate-800 shadow-sm">
          <div className="flex items-center gap-1.5 text-primary text-xs font-extrabold uppercase">
            <span>📅</span> Dates des tests :
          </div>
          {settings?.datesTests && settings.datesTests.length > 0 ? (
            <ul className="list-disc list-inside space-y-1 font-bold text-slate-900 text-sm">
              {settings.datesTests.map((date: string, idx: number) => (
                <li key={idx}>{date}</li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-gray-500 italic">Aucune date de test configurée.</p>
          )}
          {c.lieu && (
            <p className="text-xs text-slate-600 italic mt-1 font-light leading-snug">
              {c.lieu as string}
            </p>
          )}
        </div>
        {afficherBoutonTest && (
          <div className="pt-2">
            <Link
              href="/tests-de-nage"
              className="inline-flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition-colors shadow-3xs text-center"
            >
              <span>🏊 Réserver un test de niveau</span>
            </Link>
          </div>
        )}
      </div>
    </section>
  )
}

// ─── Access Block ───────────────────────────────────────
function AccessBlock({ block, isSidebar }: { block: BlockData; isSidebar?: boolean }) {
  const c = block.contenu

  return (
    <section className={`card p-6 space-y-4 ${isSidebar ? 'bg-slate-50/50 border-slate-200' : ''}`}>
      <h3 className="font-extrabold text-slate-900 border-b border-slate-200 pb-3 uppercase tracking-wider text-xs flex items-center gap-1.5">
        <span>{(c.emoji as string) || '🔑'}</span> {block.titre}
      </h3>
      {c.texte && (
        <p className="text-sm text-slate-700 font-light leading-relaxed"
           dangerouslySetInnerHTML={{ __html: sanitize(c.texte as string) }} />
      )}
    </section>
  )
}

// ─── BNSSA / SSA Block ──────────────────────────────────
function BnssaBlock({ block }: { block: BlockData }) {
  const c = block.contenu
  const formation = (c.formation as string[]) || []
  const examen = (c.examen as string[]) || []
  const conditions = (c.conditions as string[]) || [
    'Avoir 17 ans révolus (au moment de l\'examen)',
    'Prérequis natatoire validé au préalable par un Maître-Nageur (test d\'entrée au club)',
    'PSE1 + PSE2 compris dans la formation / requis',
    'Ouverture de la session sous réserve de 6 candidats minimum'
  ]

  const candidats = (c.candidats as { titulaireBnssa?: string; nouveauCandidat?: string }) || {}
  const tarifs = (c.tarifs as Record<string, string>) || {}

  return (
    <section className="p-6 md:p-8 space-y-8 bg-indigo-950 text-slate-100 shadow-md rounded-2xl relative overflow-hidden border border-indigo-900/60">
      <div className="absolute right-0 top-0 text-8xl opacity-5 pointer-events-none select-none translate-x-4 -translate-y-4">
        {(c.emoji as string) || '🛟'}
      </div>

      {/* Header */}
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-amber-300 font-extrabold text-[11px] uppercase tracking-widest bg-amber-950/80 px-3 py-1 rounded-full border border-amber-500/40">
            {(c.label as string) || 'RÉFORME OFFICIELLE 2026 • ARRÊTÉ DU 29 JUILLET 2026 (JO DU 01/08/2026)'}
          </span>
          <span className="text-indigo-200 font-bold text-[11px] bg-indigo-900/80 px-3 py-1 rounded-full border border-indigo-700/60">
            Entrée en vigueur : 1ᵉʳ octobre 2026
          </span>
        </div>
        <h2 className="text-2xl md:text-3xl font-black font-display tracking-tight text-white flex items-center gap-2.5">
          <span>{(c.emoji as string) || '🛟'}</span> {block.titre || 'Formation SSA (Surveillant Sauveteur Aquatique) & Secourisme'}
        </h2>
        <p className="text-sm text-indigo-200 font-medium">
          Le <strong>BNSSA</strong> évolue et devient le <strong>SSA (Surveillant Sauveteur Aquatique)</strong> pour toutes les nouvelles sessions.
        </p>
      </div>

      {/* Description */}
      {c.description && (
        <div className="text-sm text-slate-200 leading-relaxed font-light space-y-2 bg-indigo-900/20 p-4 rounded-xl border border-indigo-900/40"
             dangerouslySetInnerHTML={{ __html: sanitize(c.description as string) }} />
      )}

      {/* ─── BANDEAU SITUATION DES CANDIDATS (Arrêté 29 juillet 2026) ─── */}
      <div className="space-y-3">
        <h3 className="font-extrabold text-xs text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
          <span>⚖️</span> Ce qui change pour les candidats :
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs leading-relaxed">
          <div className="bg-indigo-900/40 border border-indigo-800/80 rounded-xl p-4 space-y-1.5">
            <span className="font-extrabold text-amber-200 text-xs block uppercase">🎓 BNSSA déjà obtenu</span>
            <p className="text-slate-200 font-normal">
              {candidats.titulaireBnssa || "Votre diplôme reste valable ! Équivalence SSA reconnue si votre PSE2 est à jour + réalisation d'une formation continue d'adaptation dans les 3 ans."}
            </p>
          </div>
          <div className="bg-indigo-900/40 border border-indigo-800/80 rounded-xl p-4 space-y-1.5">
            <span className="font-extrabold text-cyan-200 text-xs block uppercase">🆕 Nouveau candidat</span>
            <p className="text-slate-200 font-normal">
              {candidats.nouveauCandidat || "Vous passerez directement le diplôme SSA. Le PSE2 est requis en prérequis obligatoire pour l'obtention."}
            </p>
          </div>
        </div>
      </div>

      {/* ─── GRILLE DES TARIFS DU CLUB ─── */}
      <div className="space-y-3">
        <h3 className="font-extrabold text-xs text-emerald-300 uppercase tracking-wider flex items-center gap-1.5">
          <span>💰</span> Tarifs et Formules prévus par le club :
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
          {/* Formule Surveillance */}
          <div className="bg-emerald-950/40 border-2 border-emerald-500/50 rounded-2xl p-4 space-y-2 relative">
            <span className="absolute top-3 right-3 text-[9px] font-black uppercase tracking-wider bg-emerald-500 text-slate-950 px-2 py-0.5 rounded-full">
              Avantage Partenaire
            </span>
            <div className="font-extrabold text-sm text-emerald-200">Session SSA avec Surveillance</div>
            <div className="text-2xl font-black text-white font-mono">500 €</div>
            <p className="text-emerald-100 font-light leading-relaxed text-[11px]">
              Tarif réduit pour le candidat effectuant <strong>4 journées de surveillance avec la Croix-Blanche</strong> pendant la saison (PSE1 requis pour y participer).
            </p>
            <div className="text-[10px] text-emerald-300 font-semibold bg-emerald-900/40 p-2 rounded-lg border border-emerald-800/60">
              * Paiement obligatoire de 750 € à l&apos;inscription, la réduction de 250 € est <strong>remboursée a posteriori</strong> par le club.
            </div>
          </div>

          {/* Formule Plein Tarif */}
          <div className="bg-indigo-900/30 border border-indigo-800/80 rounded-2xl p-4 space-y-2">
            <div className="font-extrabold text-sm text-slate-200">Session SSA Tarif Plein</div>
            <div className="text-2xl font-black text-white font-mono">750 €</div>
            <p className="text-slate-300 font-light leading-relaxed text-[11px]">
              Session complète de formation SSA (40h en présentiel prévues au club). Sans engagement de surveillance partenaire.
            </p>
            <div className="text-[10px] text-slate-400 font-medium pt-2">
              Paiement en 3 fois sans frais disponible lors de l&apos;adhésion en ligne.
            </div>
          </div>

          {/* Pack PSE1 + PSE2 */}
          <div className="bg-indigo-900/30 border border-indigo-800/80 rounded-2xl p-4 space-y-2 md:col-span-2 lg:col-span-1">
            <div className="font-extrabold text-sm text-cyan-200">Pack PSE1 + PSE2 seul</div>
            <div className="text-2xl font-black text-white font-mono">590 €</div>
            <p className="text-slate-300 font-light leading-relaxed text-[11px]">
              Formation de secourisme complète organisée en partenariat avec la <strong>Croix-Blanche</strong>.
            </p>
            <div className="text-[10px] text-cyan-300/80 font-medium pt-2">
              Indispensable pour valider le diplôme SSA.
            </div>
          </div>
        </div>
      </div>

      {/* ─── DÉROULEMENT DE LA FORMATION ─── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm font-light">
        <div className="space-y-3 bg-indigo-900/30 p-5 rounded-xl border border-indigo-900/60">
          <h4 className="font-extrabold text-indigo-200 text-xs uppercase tracking-wide flex items-center gap-1.5">
            <span>📚</span> Organisation de la Formation (40h)
          </h4>
          <p className="text-xs text-slate-300 leading-relaxed italic">
            Formation SSA : 35 h minimum en présentiel réglementaire (40 h prévues au club). Le détail officiel complet de l&apos;apprentissage sera diffusé dès parution de la circulaire.
          </p>
          <ul className="list-disc list-inside space-y-1.5 text-slate-100 text-xs pt-1">
            {formation.map((item, i) => (
              <li key={i} dangerouslySetInnerHTML={{ __html: sanitize(item) }} />
            ))}
          </ul>
        </div>

        {examen.length > 0 && (
          <div className="space-y-3 bg-indigo-900/30 p-5 rounded-xl border border-indigo-900/60">
            <h4 className="font-extrabold text-indigo-200 text-xs uppercase tracking-wide flex items-center gap-1.5">
              <span>⏱️</span> Épreuves & Examen
            </h4>
            <ol className="list-decimal list-inside space-y-1.5 text-slate-100 text-xs">
              {examen.map((item, i) => (
                <li key={i} dangerouslySetInnerHTML={{ __html: sanitize(item) }} />
              ))}
            </ol>
          </div>
        )}
      </div>

      {/* ─── PRÉREQUIS & CONDITIONS OBLIGATOIRES ─── */}
      <div className="bg-indigo-900/60 p-4 md:p-5 rounded-xl border border-indigo-800 space-y-3">
        <h4 className="font-extrabold text-xs text-amber-300 uppercase tracking-wide flex items-center gap-1.5">
          <span>📋</span> Conditions d&apos;inscription et prérequis indispensables :
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          <div className="bg-indigo-950/70 p-3 rounded-lg border border-indigo-800/80 flex items-start gap-2.5">
            <span className="text-base">🔞</span>
            <div>
              <span className="font-bold text-white block">Âge requis</span>
              <span className="text-slate-300 text-[11px]">Avoir 17 ans minimum (au moment de l&apos;examen)</span>
            </div>
          </div>

          <div className="bg-indigo-950/70 p-3 rounded-lg border border-indigo-800/80 flex items-start gap-2.5">
            <span className="text-base">🏊</span>
            <div>
              <span className="font-bold text-white block">Test Natatoire</span>
              <span className="text-slate-300 text-[11px]">Prérequis validé par un Maître-Nageur (MNS)</span>
            </div>
          </div>

          <div className="bg-indigo-950/70 p-3 rounded-lg border border-indigo-800/80 flex items-start gap-2.5">
            <span className="text-base">🩹</span>
            <div>
              <span className="font-bold text-white block">Secourisme</span>
              <span className="text-slate-300 text-[11px]">PSE1 + PSE2 compris dans la formation / requis</span>
            </div>
          </div>

          <div className="bg-indigo-950/70 p-3 rounded-lg border border-indigo-800/80 flex items-start gap-2.5">
            <span className="text-base">👥</span>
            <div>
              <span className="font-bold text-white block">Effectif Session</span>
              <span className="text-slate-300 text-[11px]">6 candidats minimum pour l&apos;ouverture</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

// ─── Contact Block ──────────────────────────────────────
function ContactBlock({ block }: { block: BlockData }) {
  const c = block.contenu
  return (
    <div className="text-center text-sm text-slate-600 font-light border-t border-slate-200/60 pt-8">
      {c.texte ? (
        <span>
          {(c.texte as string).includes('contacter') ? (
            <>
              {(c.texte as string).split('Nous contacter')[0]}
              <Link href="/contact" className="underline font-semibold hover:text-slate-800 transition-colors">Nous contacter</Link>
              {(c.texte as string).split('Nous contacter')[1] || '.'}
            </>
          ) : (
            <span dangerouslySetInnerHTML={{ __html: sanitize(c.texte as string) }} />
          )}
        </span>
      ) : (
        <span>
          En cas de blocage, vous pouvez joindre notre secrétariat via l&apos;onglet{' '}
          <Link href="/contact" className="underline font-semibold hover:text-slate-800 transition-colors">Nous contacter</Link>.
        </span>
      )}
    </div>
  )
}
