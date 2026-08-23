import type { Metadata } from 'next'
import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { UserCheck, Clock, MapPin, CheckCircle, HelpCircle, ArrowRight, CreditCard, Sparkles } from 'lucide-react'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: "Cours de Natation Adultes & Perfectionnement à Cavaillon | Triton Club",
  description: "Cours de natation pour adultes à Cavaillon : perfectionnement des 4 nages (crawl, dos, brasse, papillon), endurance, reprise sportive et nage libre encadrée en soirée et le week-end.",
  keywords: [
    'cours de natation adulte Cavaillon',
    'cours de natation adulte autour de moi',
    'natation adulte Cavaillon',
    'cours natation adulte debutant',
    'perfectionnement natation adulte Cavaillon',
    'cours de piscine adulte',
    'natation master Cavaillon',
    'cours natation soir Cavaillon',
  ],
  alternates: {
    canonical: 'https://tritoncavaillon.fr/cours-natation-adulte',
  },
  openGraph: {
    title: "Cours de Natation Adultes à Cavaillon - Triton Club",
    description: "Créneaux en soirée (19h30 - 21h00) et le samedi pour adultes et masters à la piscine Alphonse Roudière.",
    url: 'https://tritoncavaillon.fr/cours-natation-adulte',
  },
}

const FAQS = [
  {
    q: "Quels sont les niveaux acceptés chez les adultes ?",
    a: "Tous les niveaux sont accueillis ! Nos entraîneurs répartissent les nageurs par lignes d'eau de niveau (reprise en douceur, perfectionnement technique des 4 nages, ou entraînement d'endurance soutenu).",
  },
  {
    q: "Quels sont les horaires des créneaux adultes ?",
    a: "Le club propose plusieurs créneaux encadrés en grand bassin : le lundi (19h30 - 21h00), le mercredi (19h30 - 21h00), le jeudi (19h30 - 21h00) et le samedi matin (11h00 - 12h30).",
  },
  {
    q: "Quel est le tarif pour les adultes ?",
    a: "La cotisation annuelle est de 250 € / an pour la section Loisirs & Perfectionnement (230 € adhésion + 20 € licence FFN). Paiement 100% en ligne en 1x ou 3x sans frais.",
  },
]

export default async function CoursNatationAdultePage() {
  const groupe = await prisma.groupe.findFirst({
    where: { OR: [{ nom: { contains: 'Adultes Loisirs', mode: 'insensitive' } }] },
    include: {
      plannings: {
        where: { actif: true },
        orderBy: [{ jourSemaine: 'asc' }, { heureDebut: 'asc' }],
      },
    },
  })

  const tarifTotal = (groupe?.tarif || 230) + (groupe?.prixLicence || 20)

  return (
    <main className="min-h-screen pt-32 md:pt-40 pb-20 bg-slate-50/50">
      <div className="container mx-auto px-4 max-w-5xl space-y-12">
        <nav className="flex items-center gap-2 text-xs font-semibold text-slate-500">
          <Link href="/" className="hover:text-primary transition-colors">Accueil</Link>
          <span>/</span>
          <Link href="/groupes" className="hover:text-primary transition-colors">Groupes</Link>
          <span>/</span>
          <span className="text-slate-900 font-bold">Cours de Natation Adultes Cavaillon</span>
        </nav>

        <header className="bg-white border border-slate-200/80 rounded-3xl p-6 md:p-10 shadow-xs relative overflow-hidden space-y-6">
          <div className="absolute -top-24 -right-24 w-72 h-72 bg-blue-100/40 rounded-full blur-3xl pointer-events-none" />
          <div className="relative z-10 space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-blue-800 border border-blue-200 text-xs font-extrabold uppercase tracking-wider">
              <UserCheck className="w-3.5 h-3.5 text-blue-600" />
              <span>Section Adultes · Soir & Samedi</span>
            </div>
            
            <h1 className="text-3xl md:text-5xl font-black text-slate-950 tracking-tight leading-tight">
              Cours de Natation Adultes & Perfectionnement à Cavaillon
            </h1>
            
            <p className="text-base md:text-lg text-slate-600 leading-relaxed max-w-3xl">
              {groupe?.description || "Entretenez votre condition physique, améliorez votre technique de nage et profitez d'un encadrement bienveillant par nos éducateurs sportifs dans une ambiance conviviale à la piscine couverte Alphonse Roudière."}
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-slate-100">
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-150 space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Créneaux Soir</span>
              <p className="text-xs sm:text-sm font-extrabold text-slate-900 flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-blue-600 shrink-0" />
                <span>Lun./Mer./Jeu. 19h30 - 21h</span>
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-150 space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Créneau Samedi</span>
              <p className="text-xs sm:text-sm font-extrabold text-slate-900 flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-blue-600 shrink-0" />
                <span>Samedi 11h00 - 12h30</span>
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-150 space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Organisation</span>
              <p className="text-xs sm:text-sm font-extrabold text-slate-900 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-blue-600 shrink-0" />
                <span>Lignes par niveau</span>
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-150 space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Tarif annuel</span>
              <p className="text-xs sm:text-sm font-extrabold text-slate-900 flex items-center gap-1.5">
                <CreditCard className="w-4 h-4 text-blue-600 shrink-0" />
                <span>{tarifTotal} € / an</span>
              </p>
            </div>
          </div>
        </header>

        <section className="p-6 md:p-8 rounded-3xl bg-white border border-slate-200/80 shadow-xs space-y-4">
          <h2 className="text-xl font-black text-slate-900">Pourquoi choisir la section Adultes du Triton Club ?</h2>
          <div className="grid sm:grid-cols-3 gap-4 pt-2">
            <div className="p-4 rounded-2xl bg-blue-50/50 border border-blue-100 space-y-2">
              <h3 className="font-extrabold text-sm text-blue-950">Conseils Personnalisés</h3>
              <p className="text-xs text-blue-800 leading-relaxed">Correction technique en direct par l&apos;entraîneur pour nager plus efficacement, sans effort inutile ni fatigue.</p>
            </div>
            <div className="p-4 rounded-2xl bg-blue-50/50 border border-blue-100 space-y-2">
              <h3 className="font-extrabold text-sm text-blue-950">Endurance & Cardio</h3>
              <p className="text-xs text-blue-800 leading-relaxed">Séances structurées avec matériel (palmes, plaquettes, pull-buoy) adaptées à vos objectifs.</p>
            </div>
            <div className="p-4 rounded-2xl bg-blue-50/50 border border-blue-100 space-y-2">
              <h3 className="font-extrabold text-sm text-blue-950">Ambiance Conviviale</h3>
              <p className="text-xs text-blue-800 leading-relaxed">Pratique sportive détendue, sans pression, pour évacuer le stress de la journée.</p>
            </div>
          </div>
        </section>

        <section className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-3xl p-8 text-white text-center space-y-4 shadow-md">
          <h2 className="text-2xl md:text-3xl font-black tracking-tight">
            Rejoignez nos entraînements Adultes à Cavaillon
          </h2>
          <p className="text-sm text-blue-100 max-w-xl mx-auto leading-relaxed">
            Inscriptions en ligne ouvertes ({tarifTotal} € / an). Règlement par carte bancaire en 1x ou 3x sans frais.
          </p>
          <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/inscription"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-white text-blue-900 font-extrabold text-sm hover:bg-blue-50 transition-all shadow-xs"
            >
              <span>S&apos;inscrire en ligne</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/contact"
              className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-blue-700/60 hover:bg-blue-700 text-white font-bold text-sm border border-blue-400/40 transition-colors"
            >
              <span>Nous contacter</span>
            </Link>
          </div>
        </section>

        <section className="bg-white border border-slate-200/80 rounded-3xl p-6 md:p-8 space-y-6">
          <div className="flex items-center gap-2 text-slate-950 font-black text-xl">
            <HelpCircle className="w-6 h-6 text-blue-600" />
            <h2>Questions Fréquentes · Natation Adultes Cavaillon</h2>
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
