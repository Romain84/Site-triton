'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { 
  Check, 
  ShieldCheck, 
  Upload, 
  CreditCard, 
  ArrowRight, 
  UserCheck, 
  AlertCircle, 
  FileText, 
  CheckCircle2, 
  Calendar,
  Clock,
  MapPin,
  Sparkles,
  Waves,
  Award,
  Users,
  Ticket
} from 'lucide-react'

interface GroupeOption {
  id: string
  nom: string
  niveau: string | null
  tarif: number | null
  tarif1Cours?: number | null
  libelleOption1?: string | null
  libelleOption2?: string | null
  prixLicence?: number | null
  caution?: number | null
  annule?: boolean
}

interface MonClubTunnelProps {
  groupes: GroupeOption[]
  inscriptionUrl?: string
}

export default function MonClubTunnel({ groupes, inscriptionUrl }: MonClubTunnelProps) {
  const [step, setStep] = useState<number>(1)
  const [isMinor, setIsMinor] = useState<boolean>(false)

  // Selected Options
  const [selectedGroupeId, setSelectedGroupeId] = useState<string>(groupes[0]?.id || '')
  const [selectedDay, setSelectedDay] = useState<string>('Mercredi')
  const [selectedTime, setSelectedTime] = useState<string>('14:00 - 15:30')
  const [selectedPoolLine, setSelectedPoolLine] = useState<string>('Grand Bassin - Ligne 2')

  // Personal Info
  const [firstName, setFirstName] = useState<string>('')
  const [lastName, setLastName] = useState<string>('')
  const [email, setEmail] = useState<string>('')
  const [phone, setPhone] = useState<string>('')
  const [dateOfBirth, setDateOfBirth] = useState<string>('')
  const [gender, setGender] = useState<'M' | 'F'>('M')
  const [address, setAddress] = useState<string>('')
  const [city, setCity] = useState<string>('Cavaillon')
  const [zipCode, setZipCode] = useState<string>('84300')
  const [ffnLicenseNumber, setFfnLicenseNumber] = useState<string>('')

  // Guardian 1 info (if minor)
  const [guardian1Name, setGuardian1Name] = useState<string>('')
  const [guardian1Phone, setGuardian1Phone] = useState<string>('')
  const [guardian1Email, setGuardian1Email] = useState<string>('')

  // Guardian 2 info (optional)
  const [hasGuardian2, setHasGuardian2] = useState<boolean>(false)
  const [guardian2Name, setGuardian2Name] = useState<string>('')
  const [guardian2Phone, setGuardian2Phone] = useState<string>('')
  const [guardian2Email, setGuardian2Email] = useState<string>('')
  const [parentsStatus, setParentsStatus] = useState<'COUPLE' | 'SEPARES'>('COUPLE')

  // Offline Payment Details
  const [chequeNumber, setChequeNumber] = useState<string>('')
  const [chequeBank, setChequeBank] = useState<string>('')
  const [desiredEncashmentDate, setDesiredEncashmentDate] = useState<string>('2026-10-10')

  // Disclaimers & Uploads
  const [hasMedicalCert, setHasMedicalCert] = useState<boolean>(true)
  const [hasFfnForm, setHasFfnForm] = useState<boolean>(true)
  const [hasMediaConsent, setHasMediaConsent] = useState<boolean>(true)
  const [acceptReglementInterieur, setAcceptReglementInterieur] = useState<boolean>(true)

  // Payment
  const [paymentMethod, setPaymentMethod] = useState<'CB_3X' | 'CB_1X' | 'CHEQUE_3X' | 'VIREMENT_SEPA' | 'ANCV' | 'CAF'>('VIREMENT_SEPA')
  const [isSubmitted, setIsSubmitted] = useState<boolean>(false)
  const [generatedMemberNumber, setGeneratedMemberNumber] = useState<string>('')

  const selectedGroupe = groupes.find((g) => g.id === selectedGroupeId) || groupes[0]
  const licenceFFNPrice = selectedGroupe?.prixLicence || 45
  const cotisationClubPrice = selectedGroupe?.tarif || 240
  const totalPrice = Math.max(0, cotisationClubPrice + licenceFFNPrice)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const num = `TCC-FFN-2026-${Math.floor(1000 + Math.random() * 9000)}`
    setGeneratedMemberNumber(num)
    setIsSubmitted(true)
  }

  if (isSubmitted) {
    return (
      <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-xl space-y-6 text-center animate-fade-in my-8">
        <div className="w-20 h-20 bg-blue-100 text-triton-blue rounded-full flex items-center justify-center mx-auto shadow-md">
          <Waves className="w-12 h-12" />
        </div>

        <div className="space-y-2">
          <span className="px-3 py-1 rounded-full bg-blue-50 text-triton-blue text-xs font-black uppercase tracking-wider">
            Association Triton Club Cavaillon · Affiliation FFN N° 084300
          </span>
          <h2 className="text-3xl font-black text-slate-900">Demande de Licence & Cotisation Enregistrée !</h2>
          <p className="text-sm text-slate-600">
            Félicitations <span className="font-bold text-slate-900">{firstName} {lastName}</span>, votre dossier pour la saison 2026-2027 a bien été transmis au secrétariat de l'association.
          </p>
        </div>

        <div className="bg-slate-50 rounded-2xl p-6 border border-slate-200 text-left space-y-3 max-w-lg mx-auto">
          <div className="flex justify-between items-center border-b border-slate-200 pb-2">
            <span className="text-xs font-bold text-slate-500 uppercase">N° Adhérent / Licence FFN</span>
            <span className="text-sm font-black text-triton-blue font-mono">{generatedMemberNumber}</span>
          </div>

          <div className="flex justify-between items-center border-b border-slate-200 pb-2">
            <span className="text-xs font-bold text-slate-500 uppercase">Groupe Natation</span>
            <span className="text-xs font-black text-slate-900">{selectedGroupe?.nom || 'Section Natation'}</span>
          </div>

          <div className="flex justify-between items-center border-b border-slate-200 pb-2">
            <span className="text-xs font-bold text-slate-500 uppercase">Bassin & Lignes d'Eau</span>
            <span className="text-xs font-bold text-slate-900">{selectedDay} ({selectedTime}) · {selectedPoolLine}</span>
          </div>

          <div className="flex justify-between items-center border-b border-slate-200 pb-2">
            <span className="text-xs font-bold text-slate-500 uppercase">Décomposition Tarif Net</span>
            <span className="text-xs font-bold text-slate-900">
              Cotisation {cotisationClubPrice}€ + FFN {licenceFFNPrice}€ = <strong className="text-base text-triton-blue font-black">{totalPrice} €</strong>
            </span>
          </div>

          <div className="flex justify-between items-center border-b border-slate-200 pb-2">
            <span className="text-xs font-bold text-slate-500 uppercase">Mode de Règlement</span>
            <span className="text-xs font-bold text-slate-900">{paymentMethod.replace('_', ' ')}</span>
          </div>

          <div className="flex justify-between items-center pt-1">
            <span className="text-xs font-bold text-slate-500 uppercase">Statut Dossier FFN</span>
            <span className="px-2.5 py-1 rounded-full text-xs font-black bg-emerald-100 text-emerald-800">
              En cours de validation FFN / Secrétariat
            </span>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
          <Link
            href="/membre"
            className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs shadow-md transition-all flex items-center justify-center gap-2"
          >
            <span>Accéder à l'Espace Licencié (Carte QR Code)</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
          <button
            onClick={() => setIsSubmitted(false)}
            className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs"
          >
            Inscrire un autre nageur de la famille
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 my-6">
      {/* Header Banner 100% Natation Association */}
      <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 text-white rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden border border-slate-800">
        <div className="relative z-10 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-triton-blue/20 text-triton-cyan text-xs font-bold uppercase tracking-wider border border-triton-blue/30">
              <Waves className="w-3.5 h-3.5" />
              Association sportive Loi 1901 · Club de Natation Cavaillon
            </span>
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-white/10 text-slate-200 text-xs font-bold uppercase tracking-wider border border-white/10">
              <Award className="w-3.5 h-3.5 text-amber-400" />
              Affilié Fédération Française de Natation (FFN N° 084300)
            </span>
          </div>
          <h2 className="text-2xl sm:text-4xl font-black tracking-tight">
            Adhésion & Licence FFN — Saison 2026-2027
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 font-light max-w-xl">
            Inscrivez-vous au club de natation de Cavaillon (Piscine Alphonse Roudière). Formulaires d'adhésion, choix du groupe de niveau et créneau d'entraînement.
          </p>
        </div>
      </div>

      {/* STEPPER BAR */}
      <div className="bg-white rounded-2xl p-3 sm:p-4 border border-slate-200 shadow-xs">
        <div className="flex items-center justify-between gap-1 overflow-x-auto text-xs font-bold">
          {[
            { num: 1, label: '1. Licencié' },
            { num: 2, label: '2. Groupe Natation' },
            { num: 3, label: '3. Créneau Bassin' },
            { num: 4, label: '4. Tuteurs & Médical' },
            { num: 5, label: '5. Règlement & Validation' }
          ].map((s) => (
            <button
              key={s.num}
              type="button"
              onClick={() => setStep(s.num)}
              aria-current={step === s.num ? 'step' : undefined}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl transition-all whitespace-nowrap cursor-pointer ${
                step === s.num
                  ? 'bg-slate-900 text-white shadow-md'
                  : step > s.num
                  ? 'bg-blue-50 text-triton-blue'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <span>{s.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* FORM CONTENT */}
      <form onSubmit={handleSubmit} className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-8">
        {/* STEP 1: PRATIQUANT / LICENCIÉ */}
        {step === 1 && (
          <div className="space-y-6 animate-fade-in">
            <div className="border-b border-slate-100 pb-3">
              <h3 className="text-lg font-black text-slate-900">Étape 1 : Qui s'inscrit au club de natation ?</h3>
              <p className="text-xs text-slate-500">Sélectionnez le type d'adhérent pour la saison sportive.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div
                onClick={() => setIsMinor(false)}
                className={`p-5 rounded-2xl border-2 cursor-pointer transition-all ${
                  !isMinor
                    ? 'border-slate-900 bg-slate-50 shadow-md'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-extrabold text-slate-900 text-sm">Adulte / Majeur (Nageur ou Aquagym)</h4>
                  {!isMinor && <CheckCircle2 className="w-5 h-5 text-slate-900" />}
                </div>
                <p className="text-xs text-slate-500 leading-relaxed font-light">
                  Inscription individuelle pour Adultes Loisir, Compétition Maîtres/Seniors, Aquagym ou formation BNSSA.
                </p>
              </div>

              <div
                onClick={() => setIsMinor(true)}
                className={`p-5 rounded-2xl border-2 cursor-pointer transition-all ${
                  isMinor
                    ? 'border-slate-900 bg-slate-50 shadow-md'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-extrabold text-slate-900 text-sm">Enfant Mineur (Représentant Légal / Parent)</h4>
                  {isMinor && <CheckCircle2 className="w-5 h-5 text-slate-900" />}
                </div>
                <p className="text-xs text-slate-500 leading-relaxed font-light">
                  Inscription pour un enfant.
                </p>
              </div>
            </div>

            <div className="pt-4 flex justify-end">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="px-6 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center gap-2"
              >
                <span>Étape suivante : Groupe Natation</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: GROUPE NATATION */}
        {step === 2 && (
          <div className="space-y-6 animate-fade-in">
            <div className="border-b border-slate-100 pb-3">
              <h3 className="text-lg font-black text-slate-900">Étape 2 : Groupe de Natation & Section FFN</h3>
              <p className="text-xs text-slate-500">Choisissez la section de natation correspondant au niveau.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {groupes.map((g) => {
                const isSelected = selectedGroupeId === g.id
                const licenceFFN = g.prixLicence || 45
                const cotisation = g.tarif || 240
                const total = cotisation + licenceFFN

                return (
                  <div
                    key={g.id}
                    onClick={() => setSelectedGroupeId(g.id)}
                    className={`p-5 rounded-2xl border-2 cursor-pointer transition-all flex flex-col justify-between ${
                      isSelected
                        ? 'border-slate-900 bg-slate-50 shadow-md ring-1 ring-slate-900/20'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-slate-900 text-white">
                          {g.niveau || 'Section Natation'}
                        </span>
                        <span className="text-base font-black text-slate-900">{total.toFixed(0)} € / an</span>
                      </div>
                      <h4 className="font-extrabold text-slate-900 text-sm">{g.nom}</h4>
                      <p className="text-[11px] text-slate-500 font-light leading-relaxed">
                        Cotisation club {cotisation}€ + Licence & Assurance FFN {licenceFFN}€ incluses.
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>

            <div className="pt-4 flex justify-between">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="px-6 py-3 rounded-xl bg-slate-100 text-slate-700 font-bold text-xs"
              >
                Retour
              </button>
              <button
                type="button"
                onClick={() => setStep(3)}
                className="px-6 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center gap-2"
              >
                <span>Choix du créneau bassin</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: CRÉNEAU BASSIN */}
        {step === 3 && (
          <div className="space-y-6 animate-fade-in">
            <div className="border-b border-slate-100 pb-3">
              <h3 className="text-lg font-black text-slate-900">Étape 3 : Créneaux d'Entraînement (Piscine Alphonse Roudière)</h3>
              <p className="text-xs text-slate-500">Sélectionnez votre créneau de présence au bassin.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                { day: 'Mercredi', time: '14:00 - 15:30', line: 'Petit Bassin & Ligne 1 Grand Bassin' },
                { day: 'Mardi', time: '17:30 - 19:00', line: 'Grand Bassin - Lignes 2 & 3' },
                { day: 'Lundi', time: '18:30 - 20:30', line: 'Grand Bassin - Lignes 4, 5 & 6 (Compétition)' },
                { day: 'Jeudi', time: '19:15 - 20:15', line: 'Bassin Apprentissage (Aquagym)' }
              ].map((s) => {
                const isSelected = selectedDay === s.day
                return (
                  <div
                    key={s.day}
                    onClick={() => {
                      setSelectedDay(s.day)
                      setSelectedTime(s.time)
                      setSelectedPoolLine(s.line)
                    }}
                    className={`p-4 rounded-2xl border-2 cursor-pointer transition-all ${
                      isSelected
                        ? 'border-slate-900 bg-slate-50 shadow-md'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-slate-900 text-white">
                      {s.day}
                    </span>
                    <h4 className="font-bold text-xs text-slate-900 mt-2">{s.time}</h4>
                    <p className="text-[11px] text-slate-500 mt-1">{s.line}</p>
                  </div>
                )
              })}
            </div>

            <div className="pt-4 flex justify-between">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="px-6 py-3 rounded-xl bg-slate-100 text-slate-700 font-bold text-xs"
              >
                Retour
              </button>
              <button
                type="button"
                onClick={() => setStep(4)}
                className="px-6 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center gap-2"
              >
                <span>Tuteurs & Médical FFN</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 4: TUTEURS & MÉDICAL */}
        {step === 4 && (
          <div className="space-y-6 animate-fade-in">
            <div className="border-b border-slate-100 pb-3">
              <h3 className="text-lg font-black text-slate-900">Étape 4 : Coordonnées du Licencié & Tuteurs Légaux</h3>
              <p className="text-xs text-slate-500">Coordonnées du nageur et des responsables légaux (parents).</p>
            </div>

            {/* Minor Guardians */}
            {isMinor && (
              <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black uppercase text-slate-900 tracking-wider flex items-center gap-2">
                    <Users className="w-4 h-4 text-triton-blue" />
                    <span>Responsables Légaux (Tuteurs Légaux)</span>
                  </h4>
                  <div className="flex items-center gap-2 text-xs">
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="radio"
                        name="parentsStatus"
                        checked={parentsStatus === 'COUPLE'}
                        onChange={() => setParentsStatus('COUPLE')}
                        className="text-slate-900"
                      />
                      <span>En couple</span>
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="radio"
                        name="parentsStatus"
                        checked={parentsStatus === 'SEPARES'}
                        onChange={() => setParentsStatus('SEPARES')}
                        className="text-slate-900"
                      />
                      <span>Séparés</span>
                    </label>
                  </div>
                </div>

                {/* Parent 1 */}
                <div className="space-y-2">
                  <span className="text-[11px] font-bold text-slate-700 uppercase">Tuteur Principal (Parent 1) *</span>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <input
                        type="text"
                        required
                        value={guardian1Name}
                        onChange={(e) => setGuardian1Name(e.target.value)}
                        placeholder="Nom & Prénom Parent 1"
                        className="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-slate-900 outline-none"
                      />
                    </div>
                    <div>
                      <input
                        type="tel"
                        required
                        value={guardian1Phone}
                        onChange={(e) => setGuardian1Phone(e.target.value)}
                        placeholder="Téléphone 06..."
                        className="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-slate-900 outline-none"
                      />
                    </div>
                    <div>
                      <input
                        type="email"
                        required
                        value={guardian1Email}
                        onChange={(e) => setGuardian1Email(e.target.value)}
                        placeholder="email@exemple.com"
                        className="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-slate-900 outline-none"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Practitioner Details */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">Prénom du Nageur *</label>
                <input
                  type="text"
                  required
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="Prénom"
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-slate-900 outline-none"
                />
              </div>
              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">Nom du Nageur *</label>
                <input
                  type="text"
                  required
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Nom"
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-slate-900 outline-none"
                />
              </div>
              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">Date de Naissance *</label>
                <input
                  type="date"
                  required
                  value={dateOfBirth}
                  onChange={(e) => setDateOfBirth(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-slate-900 outline-none"
                />
              </div>
              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">Ancien N° Licence FFN (si réinscription)</label>
                <input
                  type="text"
                  value={ffnLicenseNumber}
                  onChange={(e) => setFfnLicenseNumber(e.target.value)}
                  placeholder="e.g. 2012051401"
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-slate-900 outline-none font-mono"
                />
              </div>
            </div>

            <div className="pt-4 flex justify-between">
              <button
                type="button"
                onClick={() => setStep(3)}
                className="px-6 py-3 rounded-xl bg-slate-100 text-slate-700 font-bold text-xs"
              >
                Retour
              </button>
              <button
                type="button"
                onClick={() => setStep(5)}
                className="px-6 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center gap-2"
              >
                <span>Règlement & Validation</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 5: RÈGLEMENT */}
        {step === 5 && (
          <div className="space-y-6 animate-fade-in">
            <div className="border-b border-slate-100 pb-3">
              <h3 className="text-lg font-black text-slate-900">Étape 5 : Choix du Mode de Règlement</h3>
              <p className="text-xs text-slate-500">Sélectionnez votre modalité de paiement pour finaliser votre adhésion.</p>
            </div>

            {/* TOTAL PRICE SUMMARY */}
            <div className="bg-slate-900 text-white rounded-2xl p-5 flex items-center justify-between">
              <div>
                <span className="text-xs text-slate-400 font-bold uppercase">Total Net à Régler pour la Saison</span>
                <div className="flex items-baseline gap-2">
                  <p className="text-3xl font-black text-primary">{totalPrice} €</p>
                </div>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  Cotisation {cotisationClubPrice}€ + Licence FFN {licenceFFNPrice}€
                </p>
              </div>
              <div className="text-right text-xs text-slate-300">
                <p className="font-bold">{selectedGroupe?.nom}</p>
                <p>{selectedDay} ({selectedTime})</p>
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="text-xs font-black uppercase text-slate-900 tracking-wider">Modes de Règlement du Solde</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  { id: 'VIREMENT_SEPA', label: 'Virement SEPA Direct & QR Code (0 € de frais)', desc: 'IBAN Crédit Mutuel du club avec QR Code SEPA' },
                  { id: 'CHEQUE_3X', label: 'Chèques au club (1X ou 3X)', desc: 'À remettre lors des tests ou de la rentrée au bassin' },
                  { id: 'ANCV', label: 'Chèques Vacances ANCV / Connect', desc: 'Règlement papier ou ANCV Connect' },
                  { id: 'CB_3X', label: 'Carte Bancaire (3X SEPA)', desc: '1er tiers aujourd\'hui puis 2 mensualités' },
                  { id: 'CB_1X', label: 'Carte Bancaire (Comptant)', desc: 'Paiement immédiat par carte' }
                ].map((opt) => (
                  <div
                    key={opt.id}
                    onClick={() => setPaymentMethod(opt.id as any)}
                    className={`p-4 rounded-2xl border-2 cursor-pointer transition-all ${
                      paymentMethod === opt.id
                        ? 'border-slate-900 bg-slate-50 shadow-md'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <h5 className="font-bold text-xs text-slate-900">{opt.label}</h5>
                      {paymentMethod === opt.id && <Check className="w-4 h-4 text-slate-900" />}
                    </div>
                    <p className="text-[11px] text-slate-500 font-light">{opt.desc}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-4 flex justify-between items-center">
              <button
                type="button"
                onClick={() => setStep(4)}
                className="px-6 py-3 rounded-xl bg-slate-100 text-slate-700 font-bold text-xs"
              >
                Retour
              </button>
              <button
                type="submit"
                className="px-8 py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs shadow-lg flex items-center gap-2"
              >
                <span>Confirmer mon Adhésion & Licence FFN</span>
                <CheckCircle2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </form>
    </div>
  )
}
