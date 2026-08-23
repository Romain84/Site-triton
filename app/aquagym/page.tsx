import type { Metadata } from 'next'
import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { Waves, Clock, MapPin, CheckCircle, HelpCircle, ArrowRight, CreditCard, Sparkles } from 'lucide-react'

export const dynamic = 'force-dynamic'

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

const FAQS = [
  {
    q: "Où ont lieu les cours d'AquaGym et d'AquaBike à Cavaillon ?",
    a: "Toutes les séances ont lieu à la piscine couverte municipale Alphonse Roudière (Avenue Jean Moulin à Cavaillon), dans un bassin chauffé et sécurisé.",
  },
  {
    q: "Quels sont les jours et horaires des cours ?",
    a: "Les cours sont dispensés le mardi soir (19h30 - 20h15, spécialité AquaBike) et le jeudi soir (19h30 - 20h15, AquaGym en musique).",
  },
  {
    q: "Faut-il être bon nageur pour participer ?",
    a: "Absolument pas ! L'AquaGym est accessible à tous, que vous soyez débutant ou confirmé. Les séances se déroulent en petit bassin où vous avez pied.",
  },
  {
    q: "Quels sont les bienfaits physiques de l'AquaGym ?",
    a: "La portance de l'eau soulage les articulations et la colonne vertébrale tout en offrant une résistance musculaire naturelle. Idéal pour tonifier les cuisses, les abdos, le dos, stimuler la circulation et brûler des calories sans aucune courbature.",
  },
  {
    q: "Quels sont les tarifs et modalités de règlement ?",
    a: "L'adhésion est de 220 € / an pour 1 séance par semaine ou 370 € / an pour 2 séances par semaine (licence FFN comprise). Le règlement se fait 100% en ligne par carte bancaire en 1x ou 3x sans frais.",
  },
]

export default async function AquagymPage() {
  const groupe = await prisma.groupe.findFirst({
    where: { OR: [{ niveau: 'aquagym' }, { nom: { contains: 'Aqua', mode: 'insensitive' } }] },
    include: {
      plannings: {
        where: { actif: true },
        orderBy: [{ jourSemaine: 'asc' }, { heureDebut: 'asc' }],
      },
    },
  })

  const tarif1 = (groupe?.tarif1Cours || 200) + (groupe?.prixLicence || 20)
  const tarif2 = (groupe?.tarif || 350) + (groupe?.prixLicence || 20)

  return (
    <main className="min-h-screen pt-32 md:pt-40 pb-20 bg-slate-50/50">
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
              {groupe?.description || "Alliez sport, dynamisme et bien-être en musique avec le Triton Club Cavaillon à la piscine couverte Alphonse Roudière. Un renforcement musculaire complet et un travail cardio en douceur, sans aucun choc articulaire."}
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-slate-100">
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-150 space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Lieu</span>
              <p className="text-xs sm:text-sm font-extrabold text-slate-900 flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Piscine Roudière (Petit Bassin)</span>
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-150 space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Créneaux</span>
              <p className="text-xs sm:text-sm font-extrabold text-slate-900 flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Mardi & Jeudi 19h30 - 20h15</span>
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-150 space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Tarif annuel</span>
              <p className="text-xs sm:text-sm font-extrabold text-slate-900 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{tarif1} € (1 cours) / {tarif2} € (2 cours)</span>
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-150 space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Paiement</span>
              <p className="text-xs sm:text-sm font-extrabold text-slate-900 flex items-center gap-1.5">
                <CreditCard className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>CB en 1x ou 3x sans frais</span>
              </p>
            </div>
          </div>
        </header>

        {/* CRENEAUX & DETAILS */}
        <section className="grid md:grid-cols-2 gap-6">
          <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-xs space-y-4">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[10px] font-extrabold uppercase tracking-wider bg-sky-50 text-sky-800 border border-sky-200">
              Mardi 19h30 - 20h15
            </div>
            <h2 className="text-xl font-black text-slate-900">AquaBike (Vélo dans l&apos;eau)</h2>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              Séance dynamique d&apos;AquaBike pour sculpter les cuisses et les fessiers, stimuler la circulation veineuse et brûler un maximum de calories en musique tout en préservant le dos et les genoux.
            </p>
            <ul className="space-y-2 text-xs font-semibold text-slate-700">
              <li className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Drainage lymphatique actif et affinement silhouette</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Renforcement musculaire intense du bas du corps</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Zéro choc articulaire grâce à la portance aquatique</span>
              </li>
            </ul>
          </div>

          <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-xs space-y-4">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[10px] font-extrabold uppercase tracking-wider bg-emerald-50 text-emerald-800 border border-emerald-200">
              Jeudi 19h30 - 20h15
            </div>
            <h2 className="text-xl font-black text-slate-900">AquaGym & AquaFitness</h2>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              Gymnastique aquatique complète en musique avec matériel (haltères en mousse, frites, gants palmés). Tonification de la sangle abdominale, du buste, des bras et travail cardio.
            </p>
            <ul className="space-y-2 text-xs font-semibold text-slate-700">
              <li className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Tonification complète (abdos, dos, bras, fessiers)</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Amélioration de l&apos;endurance cardio-respiratoire</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Ambiance festive et dynamique en musique</span>
              </li>
            </ul>
          </div>
        </section>

        {/* CTA BANNER */}
        <section className="bg-gradient-to-r from-emerald-600 to-teal-700 rounded-3xl p-8 text-white text-center space-y-4 shadow-md">
          <h2 className="text-2xl md:text-3xl font-black tracking-tight">
            Rejoignez les cours d&apos;AquaGym à Cavaillon
          </h2>
          <p className="text-sm text-emerald-100 max-w-xl mx-auto leading-relaxed">
            Inscriptions 100% en ligne sur notre plateforme. Formule 1 cours ({tarif1} €) ou 2 cours ({tarif2} €) par semaine.
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

        {/* FAQ ACCORDION */}
        <section className="bg-white border border-slate-200/80 rounded-3xl p-6 md:p-8 space-y-6">
          <div className="flex items-center gap-2 text-slate-950 font-black text-xl">
            <HelpCircle className="w-6 h-6 text-emerald-600" />
            <h2>Foire Aux Questions · AquaGym à Cavaillon</h2>
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
