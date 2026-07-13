"use client"

import { useState, useEffect } from 'react'
import Link from 'next/link'

// 1. Les 9 membres du Conseil d'Administration avec descriptifs précis
const bureauExecutif = [
  { nom: 'M. Romain GAFFIERO', role: 'Président', description: 'Représentation légale et stratégie de développement de l\'association.' },
  { nom: 'Mme Sandra MACHADO', role: 'Trésorière', description: 'Gestion budgétaire rigoureuse, comptabilité, relations bancaires et suivi des subventions.' },
  { nom: 'Mme Angélique GAFFIERO', role: 'Secrétaire', description: 'Gestion administrative globale, convocations, procès-verbaux et relations avec les adhérents.' },
]

const coordinationSportive = [
  { nom: 'Mme Julie PETRELLA', role: 'Responsable Entraîneurs et Officiels', description: 'Coordination technique des sessions d\'entraînement, formation continue et organisation du corps arbitral.' },
]

const administrateursCA = [
  { nom: 'Mme Christine GRIGNAN', role: 'Administratrice' },
  { nom: 'M. Arnaud GRIGNAN', role: 'Administrateur' },
  { nom: 'Mme Virginie BAMMEZ-FABRE', role: 'Administratrice' },
  { nom: 'Mme Stéphanie GOMEZ', role: 'Administratrice' },
  { nom: 'Mme Raquel GARCIA BARRIOS', role: 'Administratrice' },
]

// 2. Frise chronologique historique (1966 - Aujourd'hui)
const histoireTimeline = [
  {
    annee: '1966',
    titre: 'Fondation du Club',
    description: 'Créé par M. Martignac, le Triton Club Cavaillon s\'installe comme une référence de la natation vauclusienne, s\'inscrivant d\'emblée dans le tissu sportif et éducatif local.',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
      </svg>
    )
  },
  {
    annee: 'L\'esprit "Paulet"',
    titre: 'L\'empreinte de Paul Fernandez',
    description: 'L\'histoire du club est marquée par l\'entraîneur légendaire Paul Fernandez, dit « Paulet ». Il insuffle la passion, la performance, l\'effort, et le respect mutuel : des valeurs fondamentales qui guident encore chaque séance.',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    )
  },
  {
    annee: 'Générations Tritons',
    titre: 'La Transmission Familiale',
    description: 'Marylène et Michel Fernandez succèdent à leur père au bord des bassins. Michel entraîne les Tritons jusqu\'en 2014, transmettant sa rigueur pédagogique et formant des centaines de jeunes nageurs à la compétition.',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
      </svg>
    )
  },
  {
    annee: '2015 - 2016',
    titre: 'Nouveau Cap & Affiliation FFN',
    description: 'Le Triton s\'affilie à la Fédération Française de Natation (FFN) pour propulser ses compétiteurs. Il reprend en parallèle l\'activité Performance Adulte de la communauté de communes LMV pour élargir son public.',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
      </svg>
    )
  },
  {
    annee: 'Aujourd\'hui',
    titre: 'Une Structure d\'Excellence',
    description: 'Une quarantaine de licenciés, un encadrement professionnel (maîtres-nageurs diplômés d\'État mis à disposition par LMV) et des bénévoles engagés assurent des résultats remarquables sur les circuits régionaux et nationaux.',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5a2 2 0 10-2 2h2zm0 8h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    )
  }
]

// 3. Valeurs
const valeurs = [
  {
    titre: 'Respect & Esprit d’Équipe',
    desc: 'Cultiver la bienveillance, la cohésion, et le respect mutuel des athlètes, des officiels et des équipes adverses.',
    icon: (
      <svg className="w-6 h-6 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
    )
  },
  {
    titre: 'Progression & Rigueur',
    desc: 'Offrir un enseignement de qualité, rigoureux et progressif mené par des entraîneurs qualifiés diplômés d\'État.',
    icon: (
      <svg className="w-6 h-6 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    )
  },
  {
    titre: 'Plaisir & Partage',
    desc: 'Garantir un cadre d\'apprentissage chaleureux et convivial, favorisant le partage et la passion commune pour l\'eau.',
    icon: (
      <svg className="w-6 h-6 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    )
  }
]

// Helper pour générer des initiales stylisées
function getInitials(name: string) {
  const parts = name.replace(/^(M\.|Mme)\s+/i, '').split(' ')
  return parts.map(p => p[0]).join('').slice(0, 2).toUpperCase()
}

export default function LeClubInteractive() {
  const [statutsUrl, setStatutsUrl] = useState('https://www.tritoncavaillon.fr/wp-content/uploads/2017/07/20150616statut.pdf')
  const [reglementPiscineUrl, setReglementPiscineUrl] = useState<string | null>(null)
  const [reglementClubUrl, setReglementClubUrl] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/settings/public')
      .then(res => res.json())
      .then(data => {
        if (data.statutsUrl) {
          setStatutsUrl(data.statutsUrl)
        }
        if (data.reglementPiscineUrl) {
          setReglementPiscineUrl(data.reglementPiscineUrl)
        }
        if (data.reglementClubUrl) {
          setReglementClubUrl(data.reglementClubUrl)
        }
      })
      .catch(err => console.error('Error fetching settings:', err))
  }, [])

  return (
    <div className="space-y-24">
      {/* 1. HERO SECTION DYNAMIQUE */}
      <section className="relative overflow-hidden rounded-3xl border border-slate-200/80 bg-white p-8 md:p-14 shadow-sm animate-fade-in-up">
        {/* Decorative Grid & Blurs */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#f1f5f9_1px,transparent_1px),linear-gradient(to_bottom,#f1f5f9_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-40 pointer-events-none" />
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary/4 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 -left-20 w-80 h-80 bg-emerald-500/4 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10 space-y-6 max-w-4xl">
          <span className="inline-flex items-center gap-2 border border-slate-200 bg-slate-50 text-slate-750 px-4 py-2 rounded-full text-sm font-bold uppercase tracking-wider shadow-2xs">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Association Loi 1901
          </span>
          
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-black text-slate-950 tracking-tight leading-[1.1]">
            Le Club & <span className="text-primary font-extrabold relative inline-block">ses Valeurs</span>
          </h1>
          
          <p className="text-lg md:text-xl text-slate-650 leading-relaxed font-normal max-w-3xl">
            Depuis sa création in 1966, le Triton Club Cavaillon forme et accompagne tous les publics, de l&apos;apprentissage de la natation jusqu&apos;à la compétition fédérale FFN, dans un esprit de dépassement de soi et de solidarité humaine.
          </p>
          
          <div className="flex flex-wrap gap-4 pt-4">
            <Link 
              href="/inscription" 
              className="px-7 py-4 bg-slate-950 hover:bg-slate-900 text-white font-bold text-sm rounded-xl transition-all shadow-sm active:scale-[0.98]"
            >
              Rejoindre le club
            </Link>
            <Link 
              href="/groupes" 
              className="px-7 py-4 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-800 font-bold text-sm transition-all shadow-2xs active:scale-[0.98]"
            >
              Découvrir nos groupes
            </Link>
          </div>
        </div>
      </section>

      {/* 2. STATS CHIC */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { label: 'Créé en', val: '1966' },
          { label: 'Affilié FFN sous le n°', val: '443' },
          { label: 'Bénévoles engagés', val: '9 Membres' },
        ].map((stat, idx) => (
          <div key={idx} className="p-6 rounded-2xl border border-slate-200/50 bg-white/60 text-center shadow-3xs hover:border-slate-350 transition-all duration-300">
            <span className="block text-xs uppercase font-extrabold text-slate-550 tracking-wider mb-2">{stat.label}</span>
            <span className="block text-2xl font-black text-slate-950 tracking-tight">{stat.val}</span>
          </div>
        ))}
      </section>

      {/* 3. [PREMIER] NOTRE MISSION & VALEURS */}
      <section className="space-y-12">
        <div className="text-center space-y-3 max-w-2xl mx-auto">
          <span className="text-xs uppercase font-extrabold tracking-widest text-primary">Projet Associatif</span>
          <h2 className="text-3xl md:text-4xl font-black text-slate-950 tracking-tight">Notre Vocation & Philosophie</h2>
          <p className="text-base text-slate-550 font-semibold">Pourquoi nous nous engageons au quotidien pour le sport de Cavaillon</p>
        </div>

        <div className="grid lg:grid-cols-12 gap-8 items-stretch">
          {/* Bloc Vocation */}
          <article className="lg:col-span-7 border border-slate-200/60 bg-white rounded-3xl p-8 md:p-10 space-y-6 flex flex-col justify-between shadow-3xs">
            <div className="space-y-4">
              <span className="inline-block text-xs uppercase font-extrabold tracking-widest text-primary">Notre Mission</span>
              <h3 className="text-2xl font-black text-slate-950 tracking-tight leading-snug">
                Éduquer, Entraîner & Inspirer
              </h3>
              <p className="text-base text-slate-600 leading-relaxed font-normal">
                Le Triton Club Cavaillon a pour vocation d&apos;offrir à chacun un apprentissage rigoureux et sécuritaire de la natation. Notre objectif principal est l&apos;acquisition d&apos;une autonomie aquatique solide pour les plus jeunes, suivie d&apos;une émulation saine pour nos nageurs engagés en loisir ou en compétition, favorisant le surpassement de soi, l&apos;esprit d&apos;équipe et le bien-être physique.
              </p>
            </div>
            
            <div className="border-t border-slate-100 pt-6 mt-6 flex items-start gap-4">
              <svg className="w-8 h-8 text-primary/30 shrink-0" fill="currentColor" viewBox="0 0 24 24">
                <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.85h4.999v10h-10zm-12 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.85h5v10h-10z" />
              </svg>
              <p className="text-sm italic text-slate-500 font-semibold leading-relaxed">
                « Accompagner chaque adhérent, des premiers mouvements de bras jusqu&apos;aux podiums régionaux et nationaux, dans le respect absolu des valeurs sportives. »
              </p>
            </div>
          </article>

          {/* Bloc Valeurs */}
          <article className="lg:col-span-5 border border-slate-200/60 bg-white rounded-3xl p-8 md:p-10 space-y-6 flex flex-col justify-center shadow-3xs">
            <span className="inline-block text-xs uppercase font-extrabold tracking-widest text-primary">Valeurs Clés</span>
            <h3 className="text-2xl font-black text-slate-950 tracking-tight">
              L&apos;Esprit Triton
            </h3>
            
            <div className="space-y-6 pt-2">
              {valeurs.map((valeur, idx) => (
                <div key={idx} className="flex gap-4 group">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center shrink-0 mt-0.5 group-hover:scale-105 transition-transform duration-200">
                    {valeur.icon}
                  </div>
                  <div className="space-y-1">
                    <h4 className="font-bold text-sm text-slate-900 tracking-tight">{valeur.titre}</h4>
                    <p className="text-sm text-slate-550 font-normal leading-relaxed">{valeur.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </article>
        </div>
      </section>

      {/* 4. NOTRE HISTOIRE TIMELINE */}
      <section className="space-y-12">
        <div className="text-center space-y-3 max-w-2xl mx-auto">
          <span className="text-xs uppercase font-extrabold tracking-widest text-primary">Patrimoine</span>
          <h2 className="text-3xl md:text-4xl font-black text-slate-950 tracking-tight">Plus de 50 ans d&apos;Histoire</h2>
          <p className="text-base text-slate-550 font-semibold">De sa création en 1966 aux bassins modernes d&apos;aujourd&apos;hui</p>
        </div>

        <div className="relative max-w-3xl mx-auto pl-6 sm:pl-8 border-l border-slate-200/80 space-y-12">
          {histoireTimeline.map((item, idx) => (
            <div key={idx} className="relative group animate-fade-in-up">
              {/* Timeline Bullet */}
              <div className="absolute -left-[37px] sm:-left-[45px] top-1.5 w-6 h-6 sm:w-8 sm:h-8 rounded-full border-2 border-slate-200 bg-white flex items-center justify-center text-primary group-hover:border-primary group-hover:bg-primary/5 transition-all duration-300">
                {item.icon}
              </div>

              {/* Box Content */}
              <div className="p-6 rounded-2xl border border-slate-200/50 bg-white shadow-3xs group-hover:border-slate-350 transition-all duration-300">
                <span className="inline-block bg-primary/10 text-primary-dark text-xs font-black px-2.5 py-1 rounded-md border border-primary/20 mb-2">
                  {item.annee}
                </span>
                <h4 className="text-lg font-black text-slate-950 tracking-tight mb-2">
                  {item.titre}
                </h4>
                <p className="text-sm text-slate-600 font-normal leading-relaxed">
                  {item.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 5. INFOS PRATIQUES, FAQ & CADRE JURIDIQUE */}
      <section className="grid lg:grid-cols-12 gap-8 items-stretch">
        
        {/* Contacts & Adresse */}
        <article className="border border-slate-200/60 bg-white rounded-3xl p-8 lg:col-span-7 flex flex-col justify-between space-y-8 shadow-3xs">
          <div className="space-y-2">
            <span className="text-xs uppercase font-extrabold tracking-widest text-primary">Repères Officiels</span>
            <h3 className="text-2xl font-black text-slate-950 tracking-tight">Siège & Informations Pratiques</h3>
          </div>
          
          <div className="grid sm:grid-cols-2 gap-8">
            {/* Adresse */}
            <div className="space-y-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-slate-950 flex items-center justify-center text-primary shrink-0">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <h4 className="font-extrabold text-slate-900 text-sm tracking-tight">Adresse postale</h4>
              </div>
              <div className="text-slate-655 font-normal text-sm space-y-1.5 pl-0.5">
                <p className="font-extrabold text-slate-950">TRITON CLUB CAVAILLON</p>
                <p>Piscine couverte Alphonse Roudière</p>
                <p>Avenue Jean Moulin, quartier La Clède</p>
                <p>84300 Cavaillon</p>
              </div>
              <a 
                href="https://maps.google.com/?q=Piscine+couverte+Alphonse+Roudiere+Cavaillon" 
                target="_blank" 
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-sm text-primary hover:text-primary-dark font-semibold transition-colors mt-2"
              >
                Ouvrir dans Google Maps ↗
              </a>
            </div>

            {/* Communication */}
            <div className="space-y-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-slate-950 flex items-center justify-center text-primary shrink-0">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <h4 className="font-extrabold text-slate-900 text-sm tracking-tight">Email & Secrétariat</h4>
              </div>
              <div className="text-slate-650 font-normal text-sm space-y-2.5 pl-0.5">
                <p>
                  Des questions ? Écrivez-nous à : <br />
                  <a href="mailto:contact@tritoncavaillon.fr" className="text-primary hover:underline font-bold mt-1 inline-block">
                    contact@tritoncavaillon.fr
                  </a>
                </p>
              </div>
            </div>
          </div>
        </article>

        {/* Documents Officiels & Règlements */}
        <article className="border border-slate-200/60 bg-white rounded-3xl p-8 lg:col-span-5 flex flex-col justify-between space-y-6 shadow-3xs">
          <div className="space-y-3">
            <span className="text-xs uppercase font-extrabold tracking-widest text-primary">Cadre Juridique & Règlements</span>
            <h3 className="text-2xl font-black text-slate-950 tracking-tight leading-none">Documents Officiels</h3>
            <p className="text-sm text-slate-550 leading-relaxed font-normal">
              Retrouvez en libre accès les statuts de l&apos;association ainsi que les règlements intérieurs du club et de la piscine.
            </p>
          </div>

          <div className="space-y-3">
            {/* Statuts */}
            {statutsUrl && (
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/60 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center shrink-0 border border-red-100">
                    <svg className="w-5 h-5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-xs font-bold text-slate-900 tracking-tight leading-tight truncate">Statuts du Club</h4>
                    <p className="text-[10px] text-slate-550 mt-0.5">Document PDF</p>
                  </div>
                </div>
                <a 
                  href={statutsUrl} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="p-2 rounded-lg bg-slate-950 hover:bg-slate-900 text-white font-bold text-xs transition-colors shrink-0"
                  title="Télécharger"
                >
                  <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                </a>
              </div>
            )}

            {/* Règlement Club */}
            {reglementClubUrl && (
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/60 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center shrink-0 border border-red-100">
                    <svg className="w-5 h-5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-xs font-bold text-slate-900 tracking-tight leading-tight truncate">Règlement du Club</h4>
                    <p className="text-[10px] text-slate-550 mt-0.5">Document PDF</p>
                  </div>
                </div>
                <a 
                  href={reglementClubUrl} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="p-2 rounded-lg bg-slate-950 hover:bg-slate-900 text-white font-bold text-xs transition-colors shrink-0"
                  title="Télécharger"
                >
                  <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                </a>
              </div>
            )}

            {/* Règlement Piscine */}
            {reglementPiscineUrl && (
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/60 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center shrink-0 border border-red-100">
                    <svg className="w-5 h-5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-xs font-bold text-slate-900 tracking-tight leading-tight truncate">Règlement de la Piscine</h4>
                    <p className="text-[10px] text-slate-550 mt-0.5">Document PDF</p>
                  </div>
                </div>
                <a 
                  href={reglementPiscineUrl} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="p-2 rounded-lg bg-slate-950 hover:bg-slate-900 text-white font-bold text-xs transition-colors shrink-0"
                  title="Télécharger"
                >
                  <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                </a>
              </div>
            )}
          </div>
        </article>
      </section>

      {/* 6. [EN BAS] GOUVERNANCE & ORGANIGRAMME */}
      <section className="space-y-12">
        <div className="text-center space-y-3 max-w-2xl mx-auto">
          <span className="text-xs uppercase font-extrabold tracking-widest text-primary">Organisation</span>
          <h2 className="text-3xl md:text-4xl font-black text-slate-950 tracking-tight">Gouvernance</h2>
          <p className="text-base text-slate-550 font-semibold">L&apos;équipe de 9 bénévoles engagés au service du club et de la réussite de ses nageurs</p>
        </div>

        <div className="space-y-10">
          
          {/* NIVEAU 1 : LE BUREAU EXECUTIF (PRESIDENT, TRESORIERE, SECRETAIRE SUR LA MEME LIGNE) */}
          <div className="space-y-6 max-w-6xl mx-auto">
            <div className="flex items-center gap-2 justify-center">
              <span className="h-[1px] w-8 bg-slate-200" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Le Bureau Exécutif</span>
              <span className="h-[1px] w-8 bg-slate-200" />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {bureauExecutif.map((membre, idx) => {
                return (
                  <div 
                    key={idx}
                    className="p-6 rounded-2xl border border-slate-200/60 bg-white hover:border-slate-350 shadow-2xs hover:shadow-xs transition-all duration-350 flex flex-col justify-between"
                  >
                    <div className="space-y-4">
                      <div className="flex items-center gap-3.5">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center font-extrabold text-xs shrink-0 bg-slate-900 text-primary">
                          {getInitials(membre.nom)}
                        </div>
                        <div>
                          <h4 className="font-black text-slate-900 text-sm tracking-tight">{membre.nom}</h4>
                          <span className="inline-block text-[9px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded border mt-0.5 bg-primary/5 text-primary-dark border-primary/10">
                            {membre.role}
                          </span>
                        </div>
                      </div>
                      <p className="text-sm text-slate-650 font-normal leading-relaxed pt-2">
                        {membre.description}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* NIVEAU 2 : RESPONSABLE TECHNIQUE & OFFICIELS */}
          <div className="space-y-4 max-w-xl mx-auto">
            <div className="flex items-center gap-2 justify-center">
              <span className="h-[1px] w-8 bg-slate-200" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Responsables d&apos;Encadrement</span>
              <span className="h-[1px] w-8 bg-slate-200" />
            </div>
            
            {coordinationSportive.map((membre, idx) => (
              <div 
                key={idx}
                className="p-6 rounded-2xl border border-emerald-500/10 bg-white hover:border-emerald-500/30 shadow-2xs hover:shadow-xs transition-all duration-350"
              >
                <div className="space-y-4">
                  <div className="flex items-center gap-3.5">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-800 font-extrabold text-xs shrink-0">
                      {getInitials(membre.nom)}
                    </div>
                    <div>
                      <h4 className="font-black text-slate-900 text-sm tracking-tight">{membre.nom}</h4>
                      <span className="inline-block bg-emerald-50 text-emerald-800 text-[9px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded border border-emerald-100 mt-0.5">
                        {membre.role}
                      </span>
                    </div>
                  </div>
                  <p className="text-sm text-slate-600 font-normal leading-relaxed">
                    {membre.description}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* NIVEAU 3 : LES ADMINISTRATEURS */}
          <div className="space-y-6 max-w-6xl mx-auto">
            <div className="flex items-center gap-2 justify-center">
              <span className="h-[1px] w-8 bg-slate-200" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Les Administrateurs du CA</span>
              <span className="h-[1px] w-8 bg-slate-200" />
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {administrateursCA.map((membre, idx) => (
                <div 
                  key={idx}
                  className="p-5 rounded-2xl border border-slate-200/40 bg-white hover:border-slate-350 shadow-3xs hover:shadow-2xs transition-all duration-300 flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-700 font-extrabold text-xs shrink-0">
                        {getInitials(membre.nom)}
                      </div>
                      <div>
                        <h4 className="font-extrabold text-slate-900 text-xs tracking-tight">{membre.nom}</h4>
                        <span className="inline-block bg-slate-100 text-slate-500 text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded border border-slate-200 mt-0.5">
                          {membre.role}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </section>

    </div>
  )
}
