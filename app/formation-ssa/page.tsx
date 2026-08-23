import type { Metadata } from 'next'
import Link from 'next/link'
import { LifeBuoy, Clock, MapPin, CheckCircle, HelpCircle, ArrowRight, ShieldCheck, Award } from 'lucide-react'

export const metadata: Metadata = {
  title: "Formation SSA – Surveillant Sauveteur Aquatique (ex-BNSSA) à Cavaillon | Triton Club",
  description: "Devenez Sauveteur Aquatique diplômé d'État (SSA - nouveau BNSSA) à Cavaillon. Préparation aux épreuves de sauvetage aquatique et secourisme opérationnel PSE1/PSE2 avec la Croix-Blanche.",
  keywords: [
    'formation SSA Cavaillon',
    'formation BNSSA Cavaillon',
    'sauveteur aquatique Cavaillon',
    'diplome surveillance baignade 84',
    'devenir maitre nageur sauveteur Cavaillon',
    'secourisme PSE1 PSE2 Cavaillon',
    'formation sauvetage aquatique Vaucluse',
  ],
  alternates: {
    canonical: 'https://tritoncavaillon.fr/formation-ssa',
  },
  openGraph: {
    title: "Formation SSA (ex-BNSSA) à Cavaillon - Triton Club",
    description: "Diplôme officiel de Surveillant Sauveteur Aquatique et secourisme PSE1/PSE2 à Cavaillon.",
    url: 'https://tritoncavaillon.fr/formation-ssa',
  },
}

const FAQS = [
  {
    q: "Qu'est-ce que le diplôme SSA par rapport au BNSSA ?",
    a: "Suite au décret officiel, le SSA (Surveillant Sauveteur Aquatique) succède au BNSSA. Il confère les prérogatives officielles pour surveiller les baignades ouvertes au public et d'accès payant (piscines, plages, plans d'eau).",
  },
  {
    q: "Quelles sont les conditions d'accès à la formation ?",
    a: "Avoir 17 ans révolus au moment de l'examen (années de naissance 2010 et avant), réussir le test préalable de natation validé par un MNS, et présenter un certificat médical d'aptitude.",
  },
  {
    q: "Où et quand se déroule la formation ?",
    a: "Les entraînements aquatiques ont lieu à la piscine Alphonse Roudière de Cavaillon (vendredi soir et samedi matin), complétés par les sessions de secourisme PSE1/PSE2 avec notre partenaire la Croix-Blanche.",
  },
]

export default function FormationSSAPage() {
  return (
    <main className="min-h-screen pt-32 md:pt-40 pb-20 bg-slate-50/50">
      <div className="container mx-auto px-4 max-w-5xl space-y-12">
        <nav className="flex items-center gap-2 text-xs font-semibold text-slate-500">
          <Link href="/" className="hover:text-primary transition-colors">Accueil</Link>
          <span>/</span>
          <Link href="/groupes" className="hover:text-primary transition-colors">Groupes</Link>
          <span>/</span>
          <span className="text-slate-900 font-bold">Formation SSA / BNSSA Cavaillon</span>
        </nav>

        <header className="bg-white border border-slate-200/80 rounded-3xl p-6 md:p-10 shadow-xs relative overflow-hidden space-y-6">
          <div className="absolute -top-24 -right-24 w-72 h-72 bg-amber-100/40 rounded-full blur-3xl pointer-events-none" />
          <div className="relative z-10 space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200 text-xs font-extrabold uppercase tracking-wider">
              <Award className="w-3.5 h-3.5 text-amber-600" />
              <span>Diplôme d&apos;État · Sauvetage & Surveillance</span>
            </div>
            
            <h1 className="text-3xl md:text-5xl font-black text-slate-950 tracking-tight leading-tight">
              Formation SSA – Surveillant Sauveteur Aquatique à Cavaillon
            </h1>
            
            <p className="text-base md:text-lg text-slate-600 leading-relaxed max-w-3xl">
              Formez-vous au métier de sauveteur aquatique avec le <strong>Triton Club Cavaillon</strong> et notre partenaire secourisme <strong>Croix-Blanche</strong>. Une formation diplômante complète associant techniques de sauvetage aquatique et secourisme opérationnel PSE1/PSE2.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-slate-100">
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-150 space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Âge requis</span>
              <p className="text-xs sm:text-sm font-extrabold text-slate-900 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Dès 17 ans (2010 et avant)</span>
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-150 space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Lieu</span>
              <p className="text-xs sm:text-sm font-extrabold text-slate-900 flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Piscine Roudière</span>
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-150 space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Entraînements</span>
              <p className="text-xs sm:text-sm font-extrabold text-slate-900 flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Ven. soir & Sam. matin</span>
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-150 space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Secourisme</span>
              <p className="text-xs sm:text-sm font-extrabold text-slate-900 flex items-center gap-1.5">
                <LifeBuoy className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Pack PSE1 + PSE2</span>
              </p>
            </div>
          </div>
        </header>

        <section className="grid md:grid-cols-2 gap-6">
          <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-xs space-y-4">
            <h2 className="text-xl font-black text-slate-900">Missions & Compétences du SSA</h2>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              Le Surveillant Sauveteur Aquatique assure la sécurité et la surveillance des baignades, prévient les comportements à risque, intervient en sauvetage et prodigue les premiers soins en équipe.
            </p>
            <ul className="space-y-2 text-xs font-semibold text-slate-700">
              <li className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Remorquage de mannequin et nages de sauvetage</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Maniement du matériel de secours et apnée</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Cadre juridique et réglementation des baignades</span>
              </li>
            </ul>
          </div>

          <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-xs space-y-4">
            <h2 className="text-xl font-black text-slate-900">Partenariat Secourisme Croix-Blanche</h2>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              La formation inclut les modules de Premiers Secours en Équipe (PSE1 et PSE2) dispensés par les formateurs agréés de la Croix-Blanche.
            </p>
            <ul className="space-y-2 text-xs font-semibold text-slate-700">
              <li className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Bilan vital, réanimation cardio-pulmonaire et défibrillation</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Immobilisation, oxygénothérapie et relevage de victime</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Équivalences possibles pour les titulaires du BNSSA</span>
              </li>
            </ul>
          </div>
        </section>

        <section className="bg-gradient-to-r from-amber-600 to-orange-700 rounded-3xl p-8 text-white text-center space-y-4 shadow-md">
          <h2 className="text-2xl md:text-3xl font-black tracking-tight">
            Rejoindre la formation SSA au Triton Club
          </h2>
          <p className="text-sm text-amber-100 max-w-xl mx-auto leading-relaxed">
            Contactez notre secrétariat pour connaître les dates de sélection et valider votre test natatoire préalable.
          </p>
          <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/inscription"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-white text-amber-900 font-extrabold text-sm hover:bg-amber-50 transition-all shadow-xs"
            >
              <span>Accéder aux inscriptions</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/contact"
              className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-amber-700/60 hover:bg-amber-700 text-white font-bold text-sm border border-amber-400/40 transition-colors"
            >
              <span>Contacter le secrétariat</span>
            </Link>
          </div>
        </section>

        <section className="bg-white border border-slate-200/80 rounded-3xl p-6 md:p-8 space-y-6">
          <div className="flex items-center gap-2 text-slate-950 font-black text-xl">
            <HelpCircle className="w-6 h-6 text-amber-600" />
            <h2>Questions Fréquentes · Formation SSA Cavaillon</h2>
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
