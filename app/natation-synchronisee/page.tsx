import type { Metadata } from 'next'
import Link from 'next/link'
import { Sparkles, Clock, MapPin, CheckCircle, HelpCircle, ArrowRight, CreditCard, Music } from 'lucide-react'

export const metadata: Metadata = {
  title: "Natation Synchronisée & Artistique à Cavaillon | Triton Club",
  description: "Rejoignez la section de Natation Synchronisée (Artistique) à Cavaillon. Danse aquatique, chorégraphies en musique, souplesse et gala de fin d'année dès 7 ans.",
  keywords: [
    'natation synchronisée Cavaillon',
    'natation artistique Cavaillon',
    'club natation synchronisée Vaucluse',
    'danse dans l eau Cavaillon',
    'cours natation synchronisée autour de moi',
    'natation synchronisée enfant',
    'gala natation synchronisée Cavaillon',
  ],
  alternates: {
    canonical: 'https://tritoncavaillon.fr/natation-synchronisee',
  },
  openGraph: {
    title: "Natation Synchronisée & Artistique à Cavaillon - Triton Club",
    description: "Chorégraphies aquatiques en musique et ballets d'équipe à la piscine Alphonse Roudière.",
    url: 'https://tritoncavaillon.fr/natation-synchronisee',
  },
}

const FAQS = [
  {
    q: "À partir de quel âge peut-on s'inscrire à la natation synchronisée ?",
    a: "La section accueille les enfants et adolescents dès 7 ans (filles et garçons) ayant déjà acquis les bases de la natation.",
  },
  {
    q: "Quels sont les jours et horaires d'entraînement ?",
    a: "Les entraînements ont lieu le mercredi de 15h30 à 17h30 et le vendredi de 18h00 à 20h00 avec préparation physique générale (PPG) et répétition des chorégraphies.",
  },
  {
    q: "Y a-t-il un spectacle ou gala de fin d'année ?",
    a: "Oui, un grand gala annuel est organisé en fin de saison à la piscine de Cavaillon pour présenter les ballets d'équipe devant les familles et amis.",
  },
  {
    q: "Quel est le tarif annuel ?",
    a: "Le tarif est de 245 € / an (licence FFN incluse). Règlement en 1 fois ou 3 fois sans frais par carte bancaire.",
  },
]

export default function NatationSynchroniseePage() {
  return (
    <main className="min-h-screen pt-32 md:pt-40 pb-20 bg-slate-50/50">
      <div className="container mx-auto px-4 max-w-5xl space-y-12">
        <nav className="flex items-center gap-2 text-xs font-semibold text-slate-500">
          <Link href="/" className="hover:text-primary transition-colors">Accueil</Link>
          <span>/</span>
          <Link href="/groupes" className="hover:text-primary transition-colors">Groupes</Link>
          <span>/</span>
          <span className="text-slate-900 font-bold">Natation Synchronisée Cavaillon</span>
        </nav>

        <header className="bg-white border border-slate-200/80 rounded-3xl p-6 md:p-10 shadow-xs relative overflow-hidden space-y-6">
          <div className="absolute -top-24 -right-24 w-72 h-72 bg-purple-100/40 rounded-full blur-3xl pointer-events-none" />
          <div className="relative z-10 space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-50 text-purple-800 border border-purple-200 text-xs font-extrabold uppercase tracking-wider">
              <Music className="w-3.5 h-3.5 text-purple-600" />
              <span>Artistique, Danse & Musique · Dès 7 ans</span>
            </div>
            
            <h1 className="text-3xl md:text-5xl font-black text-slate-950 tracking-tight leading-tight">
              Natation Synchronisée & Artistique à Cavaillon
            </h1>
            
            <p className="text-base md:text-lg text-slate-600 leading-relaxed max-w-3xl">
              Découvrez la grâce et l&apos;énergie de l&apos;eau ! Une discipline complète combinant natation, chorégraphie musicale, souplesse et travail d&apos;équipe à la piscine couverte Alphonse Roudière.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-slate-100">
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-150 space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Âge</span>
              <p className="text-xs sm:text-sm font-extrabold text-slate-900 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-purple-600 shrink-0" />
                <span>Dès 7 ans</span>
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-150 space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Lieu</span>
              <p className="text-xs sm:text-sm font-extrabold text-slate-900 flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-purple-600 shrink-0" />
                <span>Piscine Roudière</span>
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-150 space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Séances</span>
              <p className="text-xs sm:text-sm font-extrabold text-slate-900 flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-purple-600 shrink-0" />
                <span>Mercredi & Vendredi</span>
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-150 space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Tarif annuel</span>
              <p className="text-xs sm:text-sm font-extrabold text-slate-900 flex items-center gap-1.5">
                <CreditCard className="w-4 h-4 text-purple-600 shrink-0" />
                <span>245 € / an</span>
              </p>
            </div>
          </div>
        </header>

        <section className="p-6 md:p-8 rounded-3xl bg-white border border-slate-200/80 shadow-xs space-y-4">
          <h2 className="text-xl font-black text-slate-900">Le programme et les points forts de la section</h2>
          <div className="grid sm:grid-cols-3 gap-4 pt-2">
            <div className="p-4 rounded-2xl bg-purple-50/50 border border-purple-100 space-y-2">
              <h3 className="font-extrabold text-sm text-purple-950">1. Souplesse & Apnée</h3>
              <p className="text-xs text-purple-800 leading-relaxed">Travail au sol et dans l&apos;eau pour développer l&apos;aisance respiratoire et la flexibilité.</p>
            </div>
            <div className="p-4 rounded-2xl bg-purple-50/50 border border-purple-100 space-y-2">
              <h3 className="font-extrabold text-sm text-purple-950">2. Ballets en Musique</h3>
              <p className="text-xs text-purple-800 leading-relaxed">Apprentissage de figures techniques, portés acrobatiques et synchronisation en équipe.</p>
            </div>
            <div className="p-4 rounded-2xl bg-purple-50/50 border border-purple-100 space-y-2">
              <h3 className="font-extrabold text-sm text-purple-950">3. Grand Gala Annuel</h3>
              <p className="text-xs text-purple-800 leading-relaxed">Mise en scène costumée et spectacle de fin de saison devant le public.</p>
            </div>
          </div>
        </section>

        <section className="bg-gradient-to-r from-purple-600 to-indigo-700 rounded-3xl p-8 text-white text-center space-y-4 shadow-md">
          <h2 className="text-2xl md:text-3xl font-black tracking-tight">
            Rejoindre la section Natation Synchronisée
          </h2>
          <p className="text-sm text-purple-100 max-w-xl mx-auto leading-relaxed">
            Inscriptions ouvertes pour la nouvelle saison. Paiement en ligne en 1x ou 3x sans frais.
          </p>
          <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/inscription"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-white text-purple-900 font-extrabold text-sm hover:bg-purple-50 transition-all shadow-xs"
            >
              <span>S&apos;inscrire en ligne</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/contact"
              className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-purple-700/60 hover:bg-purple-700 text-white font-bold text-sm border border-purple-400/40 transition-colors"
            >
              <span>Nous contacter</span>
            </Link>
          </div>
        </section>

        <section className="bg-white border border-slate-200/80 rounded-3xl p-6 md:p-8 space-y-6">
          <div className="flex items-center gap-2 text-slate-950 font-black text-xl">
            <HelpCircle className="w-6 h-6 text-purple-600" />
            <h2>Questions Fréquentes · Natation Synchronisée Cavaillon</h2>
          </div>

          <div className="space-y-4 divide-y divide-slate-100">
            {FAQS.map((faq, idx) => (
              <div key={idx} className="pt-4 first:pt-0 space-y-1.5">
                <h3 className="text-sm font-bold text-slate-900">{faq.q}</h3>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">{faq.a}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  )
}
