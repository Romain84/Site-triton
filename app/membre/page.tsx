'use client'

import React from 'react'
import Link from 'next/link'
import { QrCode, CheckCircle2, AlertTriangle, FileText, Download, ShieldCheck, Calendar, User, Waves, Award } from 'lucide-react'

export const metadata = {
  title: 'Espace Licencié - Triton Club Cavaillon Natation',
  description: 'Portail adhérent dématérialisé pour la consultation des cartes FFN, des justificatifs et des plannings.'
}

export default function MembrePage() {
  const member = {
    licenseNumberFFN: '2012051401',
    memberNumber: 'TCC-FFN-2026-042',
    firstName: 'Lucas',
    lastName: 'Dubois',
    categoryFFN: 'Benjamins',
    groupName: 'Natation Compétition (Benjamins)',
    email: 'lucas.dubois@gmail.com',
    phone: '06 12 34 56 78',
    status: 'valid',
    cotisationClub: 285,
    licenceFFN: 45,
    amountPaid: 330,
    totalAmount: 330,
    slotDay: 'Lundi',
    slotTime: '18:30 - 20:30',
    poolLocation: 'Piscine Alphonse Roudière - Lignes 4 & 5',
    qrToken: 'QR-TCC-FFN-042-LUCAS'
  }

  return (
    <main className="min-h-screen pt-36 pb-20 bg-slate-50/50">
      <div className="container mx-auto px-4 max-w-5xl space-y-8 animate-fade-in-up">
        {/* Banner */}
        <div className="bg-slate-950 text-white rounded-3xl p-6 sm:p-8 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6 border border-slate-900">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-3 py-1 rounded-full bg-primary/20 text-primary text-xs font-bold uppercase tracking-wider border border-primary/30">
                Espace Licencié Association
              </span>
              <span className="px-3 py-1 rounded-full bg-white/10 text-slate-300 text-xs font-bold uppercase tracking-wider">
                Affiliation FFN N° 084300
              </span>
            </div>
            <h1 className="text-3xl font-black">Bienvenue, {member.firstName} {member.lastName} !</h1>
            <p className="text-xs sm:text-sm text-slate-300 font-light">
              Licence FFN N° : <span className="font-bold text-primary">{member.licenseNumberFFN}</span> · Catégorie : {member.categoryFFN} · Groupe : {member.groupName}
            </p>
          </div>

          <Link
            href="/inscription"
            className="px-5 py-2.5 rounded-xl bg-primary text-slate-950 font-extrabold text-xs shadow-md hover:bg-primary-dark transition-all shrink-0"
          >
            + Inscrire un autre nageur de la famille
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* DIGITAL FFN CARD */}
          <div className="space-y-6">
            <div className="bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white rounded-3xl p-6 border border-slate-800 shadow-2xl space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Waves className="w-5 h-5 text-primary" />
                  <span className="text-xs font-black tracking-widest text-primary uppercase">TRITON CLUB CAVAILLON</span>
                </div>
                <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Licence FFN 2026-2027
                </span>
              </div>

              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center text-2xl font-black text-primary shrink-0">
                  {member.firstName[0]}{member.lastName[0]}
                </div>
                <div>
                  <h3 className="text-lg font-black text-white">{member.firstName} {member.lastName}</h3>
                  <p className="text-xs text-slate-400">{member.groupName}</p>
                  <p className="text-[11px] text-primary font-mono mt-0.5">FFN: {member.licenseNumberFFN}</p>
                </div>
              </div>

              {/* QR Code Container */}
              <div className="bg-white p-4 rounded-2xl text-center text-slate-900 space-y-2">
                <div className="w-32 h-32 mx-auto bg-slate-100 rounded-xl flex items-center justify-center border border-slate-200 shadow-inner">
                  <QrCode className="w-24 h-24 text-slate-800" />
                </div>
                <p className="text-[10px] font-mono text-slate-500">{member.qrToken}</p>
                <p className="text-[10px] font-bold text-slate-700 uppercase tracking-wider">
                  Présentez ce QR Code pour le pointage bassin
                </p>
              </div>
            </div>
          </div>

          {/* DOSSIER & PLANNING STATUS */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-primary" />
                  <span>Statut de la Licence & Dossier Associatif</span>
                </h2>
                <span className="px-3 py-1 rounded-full text-xs font-black bg-emerald-100 text-emerald-800 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Licence Validée FFN
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
                  <span className="text-xs font-bold text-slate-700 block">Pièces Médicales & Légales</span>
                  <ul className="space-y-1.5 text-xs text-slate-600">
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      <span>Questionnaire de Santé FFN OK</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      <span>Photo de Profil Téléversée</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      <span>Droit à l'Image (Podiums & Galerie)</span>
                    </li>
                  </ul>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
                  <span className="text-xs font-bold text-slate-700 block">Cotisation Associative & Licence FFN</span>
                  <div className="space-y-1 text-xs text-slate-600">
                    <p>Cotisation Club : <strong>{member.cotisationClub} €</strong></p>
                    <p>Licence FFN (Assurance incluse) : <strong>{member.licenceFFN} €</strong></p>
                    <p className="text-emerald-700 font-bold">Total payé : {member.amountPaid} € (À jour)</p>
                  </div>
                </div>
              </div>

              <div className="pt-2 flex flex-wrap items-center gap-3">
                <button
                  onClick={() => alert("Génération du reçu de cotisation associative Loi 1901...")}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1.5"
                >
                  <Download className="w-4 h-4" />
                  <span>Télécharger le Reçu Associatif</span>
                </button>
                <button
                  onClick={() => alert("Génération de l'attestation de licence FFN pour Comité d'Entreprise...")}
                  className="px-4 py-2 rounded-xl bg-sky-50 text-sky-800 hover:bg-sky-100 text-xs font-bold flex items-center gap-1.5"
                >
                  <FileText className="w-4 h-4" />
                  <span>Attestation FFN pour Comité d'Entreprise</span>
                </button>
              </div>
            </div>

            {/* Slot Box */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4">
              <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-primary" />
                <span>Créneau d'Entraînement au Bassin</span>
              </h2>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <span className="px-2.5 py-0.5 rounded text-[10px] font-black uppercase bg-slate-900 text-white">
                    {member.slotDay}
                  </span>
                  <h3 className="text-base font-black text-slate-900 mt-1">{member.groupName}</h3>
                  <p className="text-xs text-slate-600">{member.poolLocation}</p>
                </div>

                <div className="text-left sm:text-right text-xs text-slate-700">
                  <p className="font-extrabold text-slate-900 text-sm">{member.slotTime}</p>
                  <p>Entraîneur FFN : Marc Antoine</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
