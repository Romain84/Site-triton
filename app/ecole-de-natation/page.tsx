import type { Metadata } from 'next'
import Link from 'next/link'
import { Sparkles, Clock, MapPin, CheckCircle, HelpCircle, ArrowRight, CreditCard, ShieldCheck } from 'lucide-react'

export const metadata: Metadata = {
  title: "École de Natation Enfants (dès 6 ans) à Cavaillon | Triton Club",
  description: "Apprenez à nager en toute sécurité à Cavaillon avec l'École de Natation du Triton Club (dès 6 ans). Petit bassin, encadrement qualifié, apprentissage ludique et progressif.",
  keywords: [
    'école de natation Cavaillon',
    'cours de natation enfant Cavaillon',
    'apprendre a nager Cavaillon',
    'natation enfant 6 ans Cavaillon',
    'piscine Cavaillon cours natation',
    'cours natation enfant autour de moi',
    'club natation enfant Cavaillon',
    'ENF Cavaillon',
  ],
  alternates: {
    canonical: 'https://tritoncavaillon.fr/ecole-de-natation',
  },
  openGraph: {
    title: "École de Natation Enfants à Cavaillon - Triton Club",
    description: "Apprentissage de la natation dès 6 ans à la piscine Alphonse Roudière. Petit bassin, progression en douceur.",
    url: 'https://tritoncavaillon.fr/ecole-de-natation',
  },
}

const FAQS = [
  {
    q: "À partir de quel âge mon enfant peut-il débuter l'école de natation ?",
    a: "Le club accueille les enfants dès 6 ans révolus (nés en 2018, 2019 ou 2020 pour la saison en cours).",
  },
  {
    q: "Un test de niveau est-il obligatoire pour les nouveaux adhérents ?",
    a: "Oui, un rapide test de 5 minutes dans l'eau est organisé lors de la rentrée afin de déterminer le groupe pédagogique idéal (ENF 1 ou ENF 2). L'adhésion préalable sur MonClub est requise. En cas de test non concluant, le club rembourse intégralement l'inscription.",
  },
  {
    q: "Quels sont les jours et horaires des cours pour enfants ?",
    a: "Les cours se déroulent le mercredi après-midi (13h30 - 14h15 ou 14h15 - 15h00) et le samedi matin (09h15 - 10h00 ou 10h00 - 10h45).",
  },
  {
    q: "Quels sont les tarifs de l'école de natation ?",
    a: "Le tarif annuel est de 200 € pour 1 cours par semaine ou 270 € pour 2 cours par semaine (licence FFN comprise). Règlement par carte bancaire ou prélèvement en 1x ou 3x sans frais.",
  },
]

export default function EcoleDeNatationPage() {
  return (
    <main className="min-h-screen pt-32 md:pt-40 pb-20 bg-slate-50/50">
      <div className="container mx-auto px-4 max-w-5xl space-y-12">
        <nav className="flex items-center gap-2 text-xs font-semibold text-slate-500">
          <Link href="/" className="hover:text-primary transition-colors">Accueil</Link>
          <span>/</span>
          <Link href="/groupes" className="hover:text-primary transition-colors">Groupes</Link>
          <span>/</span>
          <span className="text-slate-900 font-bold">École de Natation Cavaillon</span>
        </nav>

        <header className="bg-white border border-slate-200/80 rounded-3xl p-6 md:p-10 shadow-xs relative overflow-hidden space-y-6">
          <div className="absolute -top-24 -right-24 w-72 h-72 bg-cyan-100/40 rounded-full blur-3xl pointer-events-none" />
          <div className="relative z-10 space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-50 text-cyan-800 border border-cyan-200 text-xs font-extrabold uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5 text-cyan-600" />
              <span>Dès 6 ans · Apprentissage sécurisé</span>
            </div>
            
            <h1 className="text-3xl md:text-5xl font-black text-slate-950 tracking-tight leading-tight">
              École de Natation Enfants à Cavaillon
            </h1>
            
            <p className="text-base md:text-lg text-slate-600 leading-relaxed max-w-3xl">
              Donnez à votre enfant les clés de l&apos;aisance et de la sécurité aquatique. Encadrés par nos entraîneurs diplômés dans le petit bassin chauffé de la piscine Alphonse Roudière, les enfants apprennent à nager en toute confiance avec une pédagogie ludique et progressive.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-slate-100">
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-150 space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Âge</span>
              <p className="text-xs sm:text-sm font-extrabold text-slate-900 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-cyan-600 shrink-0" />
                <span>Dès 6 ans</span>
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-150 space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Bassin</span>
              <p className="text-xs sm:text-sm font-extrabold text-slate-900 flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-cyan-600 shrink-0" />
                <span>Petit bassin dédié</span>
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-150 space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Créneaux</span>
              <p className="text-xs sm:text-sm font-extrabold text-slate-900 flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-cyan-600 shrink-0" />
                <span>Mercredi & Samedi</span>
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-150 space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Tarif</span>
              <p className="text-xs sm:text-sm font-extrabold text-slate-900 flex items-center gap-1.5">
                <CreditCard className="w-4 h-4 text-cyan-600 shrink-0" />
                <span>200 € / 270 €</span>
              </p>
            </div>
          </div>
        </header>

        <section className="grid md:grid-cols-2 gap-6">
          <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-xs space-y-4">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[10px] font-extrabold uppercase tracking-wider bg-emerald-50 text-emerald-800 border border-emerald-200">
              ENF 1 · Découverte & Confiance
            </div>
            <h2 className="text-xl font-black text-slate-900">ENF 1 : Première découverte aquatique</h2>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              Pour les enfants qui ne savent pas nager. En petit groupe dans le petit bassin, l&apos;enfant apprend à être à l&apos;aise, mettre la tête sous l&apos;eau, souffler, flotter et se déplacer en autonomie.
            </p>
            <ul className="space-y-2 text-xs font-semibold text-slate-700">
              <li className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-cyan-600 shrink-0" />
                <span>Immersion progressive et gestion de la respiration</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-cyan-600 shrink-0" />
                <span>Flottaison ventrale et dorsale en sécurité</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-cyan-600 shrink-0" />
                <span>Autonomie et premiers déplacements sans matériel</span>
              </li>
            </ul>
          </div>

          <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-xs space-y-4">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[10px] font-extrabold uppercase tracking-wider bg-indigo-50 text-indigo-800 border border-indigo-200">
              ENF 2 · Perfectionnement & Nages
            </div>
            <h2 className="text-xl font-black text-slate-900">ENF 2 : Bases du crawl, dos & plongeon</h2>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              Pour les enfants déjà à l&apos;aise dans l&apos;eau. Apprentissage des mouvements techniques du crawl, du dos crawlé, des sauts et plongeons avec transition progressive vers le grand bassin.
            </p>
            <ul className="space-y-2 text-xs font-semibold text-slate-700">
              <li className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-cyan-600 shrink-0" />
                <span>Coordination bras/jambes et respiration latérale</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-cyan-600 shrink-0" />
                <span>Passage en grand bassin avec assurance</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-cyan-600 shrink-0" />
                <span>Validation des étapes de l&apos;École de Natation Française</span>
              </li>
            </ul>
          </div>
        </section>

        <section className="bg-gradient-to-r from-cyan-600 to-blue-700 rounded-3xl p-8 text-white text-center space-y-4 shadow-md">
          <h2 className="text-2xl md:text-3xl font-black tracking-tight">
            Inscrire votre enfant à l&apos;École de Natation
          </h2>
          <p className="text-sm text-cyan-100 max-w-xl mx-auto leading-relaxed">
            Inscriptions en ligne ouvertes. Paiement sécurisé par carte bancaire en 1x ou 3x sans frais.
          </p>
          <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/inscription"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-white text-cyan-800 font-extrabold text-sm hover:bg-cyan-50 transition-all shadow-xs"
            >
              <span>Accéder aux inscriptions</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/contact"
              className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-cyan-700/60 hover:bg-cyan-700 text-white font-bold text-sm border border-cyan-400/40 transition-colors"
            >
              <span>Nous contacter</span>
            </Link>
          </div>
        </section>

        <section className="bg-white border border-slate-200/80 rounded-3xl p-6 md:p-8 space-y-6">
          <div className="flex items-center gap-2 text-slate-950 font-black text-xl">
            <HelpCircle className="w-6 h-6 text-cyan-600" />
            <h2>Questions Fréquentes · École de Natation Cavaillon</h2>
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
