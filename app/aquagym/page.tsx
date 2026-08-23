import type { Metadata } from 'next'
import Link from 'next/link'
import { Waves, Clock, MapPin, CheckCircle, HelpCircle, ArrowRight, CreditCard, Sparkles } from 'lucide-react'

export const metadata: Metadata = {
  title: "Cours d'AquaGym, AquaFitness & AquaBike à Cavaillon | Triton Club",
  description: "Pratiquez l'AquaGym, l'AquaFitness et l'AquaBike à la piscine couverte Alphonse Roudière de Cavaillon (84). Séances en musique, renforcement musculaire doux et cardio sans choc articulaire. Inscription en ligne.",
  keywords: [
    'aquagym Cavaillon',
    'aquafitness Cavaillon',
    'aquabike Cavaillon',
    'cours aquagym Cavaillon',
    'aqua gym autour de moi',
    'gymnastique aquatique Cavaillon',
    'aquagym Vaucluse',
    'aquagym Luberon',
    'aquabym',
    'cours aquagym senior Cavaillon',
    'remise en forme aquatique Cavaillon',
    'piscine Alphonse Roudière aquagym',
  ],
  alternates: {
    canonical: 'https://tritoncavaillon.fr/aquagym',
  },
  openGraph: {
    title: "Cours d'AquaGym & AquaBike à Cavaillon - Triton Club Cavaillon",
    description: "Séances dynamiques d'AquaFitness, AquaGym et AquaBike en musique le mardi et jeudi soir à la piscine Alphonse Roudière.",
    url: 'https://tritoncavaillon.fr/aquagym',
  },
}

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'SportsActivityLocation',
  name: "Cours d'AquaGym & AquaBike - Triton Club Cavaillon",
  description: "Cours de gymnastique aquatique, AquaFitness et AquaBike dispensés à la piscine couverte municipale Alphonse Roudière de Cavaillon.",
  url: 'https://tritoncavaillon.fr/aquagym',
  address: {
    '@type': 'PostalAddress',
    streetAddress: 'Piscine Alphonse Roudière, Avenue Jean Moulin',
    addressLocality: 'Cavaillon',
    postalCode: '84300',
    addressRegion: 'Vaucluse',
    addressCountry: 'FR',
  },
  geo: {
    '@type': 'GeoCoordinates',
    latitude: 43.8344,
    longitude: 5.0381,
  },
  priceRange: '220 € - 370 € / an',
  telephone: '+33 4 90 71 00 00',
}

const faqJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: "Où ont lieu les cours d'AquaGym et d'AquaBike à Cavaillon ?",
      acceptedAnswer: {
        '@type': 'Answer',
        text: "Les séances se déroulent à la piscine couverte municipale Alphonse Roudière (Avenue Jean Moulin, 84300 Cavaillon), encadrées par des maîtres-nageurs et éducateurs sportifs qualifiés.",
      },
    },
    {
      '@type': 'Question',
      name: "Quels sont les créneaux horaires de l'AquaFitness et AquaBike ?",
      acceptedAnswer: {
        '@type': 'Answer',
        text: "Les cours ont lieu chaque mardi soir de 19h15 à 20h00 (séance dynamique AquaBike / renforcement) et chaque jeudi soir de 19h15 à 20h00 (AquaGym en musique).",
      },
    },
    {
      '@type': 'Question',
      name: "Combien coûte l'adhésion à l'AquaGym à Cavaillon ?",
      acceptedAnswer: {
        '@type': 'Answer',
        text: "Le tarif est de 220 € / an pour 1 cours par semaine ou 370 € / an pour 2 cours par semaine (licence FFN incluse). Le club permet le règlement par carte bancaire ou prélèvement en 1 fois ou 3 fois sans frais.",
      },
    },
    {
      '@type': 'Question',
      name: "Faut-il savoir bien nager pour faire de l'AquaGym ?",
      acceptedAnswer: {
        '@type': 'Answer',
        text: "Non, les séances se déroulent en partie où vous avez pied ou avec du matériel de flottaison adapté. L'AquaGym convient à tous les adultes, y compris les débutants complets et les seniors.",
      },
    },
  ],
}

const FAQS = [
  {
    q: "Où ont lieu les cours d'AquaGym et d'AquaBike à Cavaillon ?",
    a: "Toutes les séances ont lieu dans le grand bassin de la piscine couverte municipale Alphonse Roudière (Avenue Jean Moulin à Cavaillon), dans un cadre sécurisé et chauffé.",
  },
  {
    q: "Quels sont les jours et horaires des cours ?",
    a: "Deux créneaux hebdomadaires sont proposés en soirée : le mardi de 19h15 à 20h00 (spécialité AquaBike) et le jeudi de 19h15 à 20h00 (AquaGym / AquaFitness rythmée en musique).",
  },
  {
    q: "Faut-il être bon nageur pour participer ?",
    a: "Absolument pas ! L'activité est accessible à tous, que vous soyez débutant ou confirmé. Les exercices sont réalisés avec du matériel aquatique (frites, haltères en mousse, vélos aquatiques) facilitant le mouvement.",
  },
  {
    q: "Quels sont les bienfaits physiques de l'AquaGym ?",
    a: "La portance de l'eau soulage les articulations et la colonne vertébrale tout en multipliant la résistance musculaire. Idéal pour tonifier les cuisses, les abdos, le dos, stimuler la circulation sanguine et brûler des calories sans aucune courbature.",
  },
  {
    q: "Quels sont les tarifs et modalités de règlement ?",
    a: "La cotisation est de 220 € / an pour 1 séance par semaine (AquaBike le mardi OU AquaGym le jeudi) ou 370 € / an pour les 2 séances par semaine. Licence FFN incluse. Paiement 100% en ligne sécurisé en 1 fois ou 3 fois sans frais.",
  },
]

export default function AquagymPage() {
  return (
    <main className="min-h-screen pt-32 md:pt-40 pb-20 bg-slate-50/50">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />

      <div className="container mx-auto px-4 max-w-5xl space-y-12">
        <nav className="flex items-center gap-2 text-xs font-semibold text-slate-500">
          <Link href="/" className="hover:text-primary transition-colors">Accueil</Link>
          <span>/</span>
          <Link href="/groupes" className="hover:text-primary transition-colors">Groupes</Link>
          <span>/</span>
          <span className="text-slate-900 font-bold">AquaGym & AquaBike Cavaillon</span>
        </nav>

        <header className="bg-white border border-slate-200/80 rounded-3xl p-6 md:p-10 shadow-xs relative overflow-hidden space-y-6">
          <div className="absolute -top-24 -right-24 w-72 h-72 bg-emerald-100/40 rounded-full blur-3xl pointer-events-none" />
          <div className="relative z-10 space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-extrabold uppercase tracking-wider">
              <Waves className="w-3.5 h-3.5 text-emerald-600" />
              <span>Remise en forme aquatique · Cavaillon</span>
            </div>
            
            <h1 className="text-3xl md:text-5xl font-black text-slate-950 tracking-tight leading-tight">
              Cours d&apos;AquaGym, AquaFitness & AquaBike à Cavaillon
            </h1>
            
            <p className="text-base md:text-lg text-slate-600 leading-relaxed max-w-3xl">
              Alliez sport, dynamisme et bien-être en musique avec le <strong>Triton Club Cavaillon</strong> à la piscine couverte Alphonse Roudière. Un renforcement musculaire complet et un travail cardio en douceur, sans aucun choc articulaire.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-slate-100">
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-150 space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Lieu</span>
              <p className="text-xs sm:text-sm font-extrabold text-slate-900 flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Piscine Roudière</span>
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-150 space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Créneaux</span>
              <p className="text-xs sm:text-sm font-extrabold text-slate-900 flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Mar. & Jeu. 19h15</span>
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-150 space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Tarif annuel</span>
              <p className="text-xs sm:text-sm font-extrabold text-slate-900 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>220 € / 370 €</span>
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-150 space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Paiement</span>
              <p className="text-xs sm:text-sm font-extrabold text-slate-900 flex items-center gap-1.5">
                <CreditCard className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>CB en 1x ou 3x</span>
              </p>
            </div>
          </div>
        </header>

        <section className="grid md:grid-cols-2 gap-6">
          <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-xs space-y-4">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[10px] font-extrabold uppercase tracking-wider bg-sky-50 text-sky-800 border border-sky-200">
              Mardi 19h15 - 20h00
            </div>
            <h2 className="text-xl font-black text-slate-900">AquaBike (Vélo aquatique)</h2>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              Pédalez immergé dans l&apos;eau pour sculpter les jambes, affiner la silhouette et stimuler la circulation veineuse. Une séance cardio intense mais douce pour les genoux et le dos.
            </p>
            <ul className="space-y-2 text-xs font-semibold text-slate-700">
              <li className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Drainage lymphatique et élimination de la cellulite</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Renforcement intense des cuisses et des fessiers</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Vélos ergonomiques adaptés à toutes les corpulences</span>
              </li>
            </ul>
          </div>

          <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-xs space-y-4">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[10px] font-extrabold uppercase tracking-wider bg-emerald-50 text-emerald-800 border border-emerald-200">
              Jeudi 19h15 - 20h00
            </div>
            <h2 className="text-xl font-black text-slate-900">AquaGym & AquaFitness</h2>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              Gymnastique aquatique en musique avec matériel (haltères, frites, élastiques). Travail complet de la sangle abdominale, du haut du corps, gainage et étirements.
            </p>
            <ul className="space-y-2 text-xs font-semibold text-slate-700">
              <li className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Tonification musculaire globale (bras, abdos, dos, buste)</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Amélioration de la capacité respiratoire et de l&apos;endurance</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Ambiance conviviale et motivante en musique</span>
              </li>
            </ul>
          </div>
        </section>

        <section className="bg-gradient-to-r from-emerald-600 to-teal-700 rounded-3xl p-8 text-white text-center space-y-4 shadow-md">
          <h2 className="text-2xl md:text-3xl font-black tracking-tight">
            Prêt(e) à rejoindre les cours d&apos;AquaGym à Cavaillon ?
          </h2>
          <p className="text-sm text-emerald-100 max-w-xl mx-auto leading-relaxed">
            Les inscriptions pour la saison sont ouvertes 100% en ligne. Choisissez 1 séance par semaine (220 €) ou les 2 séances (370 €).
          </p>
          <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/inscription"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-white text-emerald-800 font-extrabold text-sm hover:bg-emerald-50 transition-all shadow-xs"
            >
              <span>S&apos;inscrire en ligne (CB 1x ou 3x)</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/contact"
              className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-emerald-700/60 hover:bg-emerald-700 text-white font-bold text-sm border border-emerald-500/40 transition-colors"
            >
              <span>Poser une question</span>
            </Link>
          </div>
        </section>

        <section className="bg-white border border-slate-200/80 rounded-3xl p-6 md:p-8 space-y-6">
          <div className="flex items-center gap-2 text-slate-950 font-black text-xl">
            <HelpCircle className="w-6 h-6 text-emerald-600" />
            <h2>Foire Aux Questions · AquaGym à Cavaillon</h2>
          </div>

          <div className="space-y-4 divide-y divide-slate-100">
            {FAQS.map((faq, idx) => (
              <div key={idx} className="pt-4 first:pt-0 space-y-1.5">
                <h3 className="text-sm font-bold text-slate-900">
                  {faq.q}
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  {faq.a}
                </p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  )
}
