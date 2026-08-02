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
  Sparkles
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

  // Guardian info (if minor)
  const [guardianName, setGuardianName] = useState<string>('')
  const [guardianPhone, setGuardianPhone] = useState<string>('')
  const [guardianEmail, setGuardianEmail] = useState<string>('')

  // Disclaimers & Uploads
  const [hasMedicalCert, setHasMedicalCert] = useState<boolean>(true)
  const [hasPhoto, setHasPhoto] = useState<boolean>(true)
  const [hasMediaConsent, setHasMediaConsent] = useState<boolean>(true)
  const [hasIndependentLeaveConsent, setHasIndependentLeaveConsent] = useState<boolean>(false)

  // Payment
  const [paymentMethod, setPaymentMethod] = useState<'CB_3X' | 'CB_1X' | 'CHEQUE_3X' | 'ANCV' | 'PASS_SPORT' | 'CAF'>('CB_3X')
  const [isSubmitted, setIsSubmitted] = useState<boolean>(false)
  const [generatedMemberNumber, setGeneratedMemberNumber] = useState<string>('')

  const selectedGroupe = groupes.find((g) => g.id === selectedGroupeId) || groupes[0]
  const totalPrice = (selectedGroupe?.tarif || 240) + (selectedGroupe?.prixLicence || 0)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const num = `TRITON-2026-${Math.floor(100 + Math.random() * 900)}`
    setGeneratedMemberNumber(num)
    setIsSubmitted(true)
  }

  if (isSubmitted) {
    return (
      <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-xl space-y-6 text-center animate-fade-in my-8">
        <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-md">
          <CheckCircle2 className="w-12 h-12" />
        </div>

        <div className="space-y-2">
          <h2 className="text-3xl font-black text-slate-900">Demande d'Inscription Enregistrée !</h2>
          <p className="text-sm text-slate-600">
            Félicitations <span className="font-bold text-slate-900">{firstName} {lastName}</span>, votre dossier pour la saison a bien été transmis au Triton Club Cavaillon.
          </p>
        </div>

        <div className="bg-slate-50 rounded-2xl p-6 border border-slate-200 text-left space-y-3 max-w-lg mx-auto">
          <div className="flex justify-between items-center border-b border-slate-200 pb-2">
            <span className="text-xs font-bold text-slate-500 uppercase">N° Adhérent Dématérialisé</span>
            <span className="text-sm font-black text-triton-blue font-mono">{generatedMemberNumber}</span>
          </div>

          <div className="flex justify-between items-center border-b border-slate-200 pb-2">
            <span className="text-xs font-bold text-slate-500 uppercase">Groupe / Section</span>
            <span className="text-xs font-black text-slate-900">{selectedGroupe?.nom || 'Section Triton'}</span>
          </div>

          <div className="flex justify-between items-center border-b border-slate-200 pb-2">
            <span className="text-xs font-bold text-slate-500 uppercase">Créneau Préféré</span>
            <span className="text-xs font-bold text-slate-900">{selectedDay} ({selectedTime})</span>
          </div>

          <div className="flex justify-between items-center border-b border-slate-200 pb-2">
            <span className="text-xs font-bold text-slate-500 uppercase">Mode de Règlement</span>
            <span className="text-xs font-bold text-slate-900">{paymentMethod.replace('_', ' ')}</span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-xs font-bold text-slate-500 uppercase">Statut Dossier</span>
            <span className="px-2.5 py-1 rounded-full text-xs font-black bg-emerald-100 text-emerald-800">
              Dossier Transmis & En cours de validation
            </span>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
          <Link
            href="/membre"
            className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs shadow-md transition-all"
          >
            Accéder à mon Espace Adhérent (Carte QR Code) →
          </Link>
          <button
            onClick={() => setIsSubmitted(false)}
            className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs"
          >
            Inscrire un autre membre de la famille
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 my-6">
      {/* Header Badge */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden">
        <div className="relative z-10 space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-primary text-xs font-bold uppercase tracking-wider border border-white/10">
            <Sparkles className="w-3.5 h-3.5" />
            Module d'Inscription en Ligne MonClub Triton
          </div>
          <h2 className="text-2xl sm:text-4xl font-black tracking-tight">Formulaire d'Adhésion 2026-2027</h2>
          <p className="text-xs sm:text-sm text-slate-300 font-light max-w-xl">
            Inscrivez-vous en 5 étapes fluides avec choix du groupe, créneau, certificats et paiement sécurisé.
          </p>
        </div>
      </div>

      {/* STEPPER BAR */}
      <div className="bg-white rounded-2xl p-3 sm:p-4 border border-slate-200 shadow-xs">
        <div className="flex items-center justify-between gap-1 overflow-x-auto text-xs font-bold">
          {[
            { num: 1, label: '1. Pratiquant' },
            { num: 2, label: '2. Formule' },
            { num: 3, label: '3. Créneau' },
            { num: 4, label: '4. Justificatifs' },
            { num: 5, label: '5. Règlement' }
          ].map((s) => (
            <button
              key={s.num}
              type="button"
              onClick={() => setStep(s.num)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl transition-all whitespace-nowrap ${
                step === s.num
                  ? 'bg-slate-900 text-white shadow-md'
                  : step > s.num
                  ? 'bg-emerald-50 text-emerald-700'
                  : 'text-slate-400 hover:text-slate-700'
              }`}
            >
              <span>{s.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* FORM CONTENT */}
      <form onSubmit={handleSubmit} className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-8">
        {/* STEP 1: PRATIQUANT */}
        {step === 1 && (
          <div className="space-y-6 animate-fade-in">
            <div className="border-b border-slate-100 pb-3">
              <h3 className="text-lg font-black text-slate-900">Étape 1 : Pour qui est cette inscription ?</h3>
              <p className="text-xs text-slate-500">Sélectionnez le type d'adhérent.</p>
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
                  <h4 className="font-extrabold text-slate-900 text-sm">Pour moi-même (Adulte / Majeur)</h4>
                  {!isMinor && <CheckCircle2 className="w-5 h-5 text-slate-900" />}
                </div>
                <p className="text-xs text-slate-500 leading-relaxed font-light">
                  Inscription pour un groupe Adultes Loisir, Compétition Senior, Aquagym ou BNSSA.
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
                  <h4 className="font-extrabold text-slate-900 text-sm">Pour un enfant mineur (Tuteur)</h4>
                  {isMinor && <CheckCircle2 className="w-5 h-5 text-slate-900" />}
                </div>
                <p className="text-xs text-slate-500 leading-relaxed font-light">
                  Inscription pour un enfant (École de Natation ENF, Avenirs, Jeunes, Natation Artistique).
                </p>
              </div>
            </div>

            <div className="pt-4 flex justify-end">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="px-6 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center gap-2"
              >
                <span>Étape suivante : Choix du groupe</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: FORMULE / GROUPE */}
        {step === 2 && (
          <div className="space-y-6 animate-fade-in">
            <div className="border-b border-slate-100 pb-3">
              <h3 className="text-lg font-black text-slate-900">Étape 2 : Choix du Groupe & de la Formule</h3>
              <p className="text-xs text-slate-500">Sélectionnez la section souhaitée.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {groupes.map((g) => {
                const isSelected = selectedGroupeId === g.id
                const tarifFinal = (g.tarif || 0) + (g.prixLicence || 0)
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
                          {g.niveau || 'Section'}
                        </span>
                        <span className="text-base font-black text-slate-900">{tarifFinal.toFixed(0)} € / an</span>
                      </div>
                      <h4 className="font-extrabold text-slate-900 text-sm">{g.nom}</h4>
                      {g.prixLicence && (
                        <p className="text-[11px] text-slate-400 font-light">Licence FFN incluse ({g.prixLicence}€)</p>
                      )}
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
                <span>Choix du créneau</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: CRÉNEAU */}
        {step === 3 && (
          <div className="space-y-6 animate-fade-in">
            <div className="border-b border-slate-100 pb-3">
              <h3 className="text-lg font-black text-slate-900">Étape 3 : Créneau Horaire (Piscine Alphonse Maureau)</h3>
              <p className="text-xs text-slate-500">Sélectionnez votre jour d'entraînement préféré.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                { day: 'Mercredi', time: '14:00 - 15:30', pool: 'Petit & Grand Bassin' },
                { day: 'Mardi', time: '17:30 - 19:00', pool: 'Grand Bassin Lignes 2 & 3' },
                { day: 'Lundi', time: '18:30 - 20:30', pool: 'Grand Bassin Lignes 4 & 5' },
                { day: 'Jeudi', time: '19:15 - 20:15', pool: 'Bassin d\'apprentissage' }
              ].map((s) => {
                const isSelected = selectedDay === s.day
                return (
                  <div
                    key={s.day}
                    onClick={() => {
                      setSelectedDay(s.day)
                      setSelectedTime(s.time)
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
                    <p className="text-[11px] text-slate-500 mt-1">{s.pool}</p>
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
                <span>Justificatifs & Formulaire</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 4: FORMULAIRE & JUSTIFICATIFS */}
        {step === 4 && (
          <div className="space-y-6 animate-fade-in">
            <div className="border-b border-slate-100 pb-3">
              <h3 className="text-lg font-black text-slate-900">Étape 4 : Coordonnées & Pièces Légales</h3>
              <p className="text-xs text-slate-500">Saisissez les informations obligatoires de l'adhérent.</p>
            </div>

            {/* Minor Guardian */}
            {isMinor && (
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
                <h4 className="text-xs font-black uppercase text-slate-900 tracking-wider">
                  Responsable Légal (Tuteur / Parent)
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">Nom & Prénom Tuteur *</label>
                    <input
                      type="text"
                      required
                      value={guardianName}
                      onChange={(e) => setGuardianName(e.target.value)}
                      placeholder="e.g. Pierre Dubois"
                      className="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-slate-900 outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">Téléphone Tuteur *</label>
                    <input
                      type="tel"
                      required
                      value={guardianPhone}
                      onChange={(e) => setGuardianPhone(e.target.value)}
                      placeholder="06 12 34 56 78"
                      className="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-slate-900 outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">Email Tuteur *</label>
                    <input
                      type="email"
                      required
                      value={guardianEmail}
                      onChange={(e) => setGuardianEmail(e.target.value)}
                      placeholder="tuteur@email.com"
                      className="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-slate-900 outline-none"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Practitioner Details */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">Prénom de l'Adhérent *</label>
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
                <label className="text-[11px] font-bold text-slate-700 block mb-1">Nom de l'Adhérent *</label>
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
                <label className="text-[11px] font-bold text-slate-700 block mb-1">Email de Contact *</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="email@exemple.com"
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-slate-900 outline-none"
                />
              </div>
            </div>

            {/* Justificatifs */}
            <div className="space-y-3 pt-2">
              <h4 className="text-xs font-black uppercase text-slate-900 tracking-wider">
                Justificatifs & Disclaimers MonClub
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 bg-slate-50 cursor-pointer hover:bg-slate-100">
                  <input
                    type="checkbox"
                    checked={hasMedicalCert}
                    onChange={(e) => setHasMedicalCert(e.target.checked)}
                    className="w-4 h-4 text-slate-900 rounded"
                  />
                  <span className="text-xs text-slate-700 font-medium">
                    Certificat Médical ou Questionnaire QS-Santé prêt
                  </span>
                </label>

                <label className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 bg-slate-50 cursor-pointer hover:bg-slate-100">
                  <input
                    type="checkbox"
                    checked={hasMediaConsent}
                    onChange={(e) => setHasMediaConsent(e.target.checked)}
                    className="w-4 h-4 text-slate-900 rounded"
                  />
                  <span className="text-xs text-slate-700 font-medium">
                    Autorisation Droit à l'Image (Photos du club)
                  </span>
                </label>
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
                <span>Mode de règlement</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 5: PAIEMENT */}
        {step === 5 && (
          <div className="space-y-6 animate-fade-in">
            <div className="border-b border-slate-100 pb-3">
              <h3 className="text-lg font-black text-slate-900">Étape 5 : Règlements & Mode de Paiement</h3>
              <p className="text-xs text-slate-500">Choisissez votre mode de cotisation pour valider le dossier.</p>
            </div>

            <div className="bg-slate-900 text-white rounded-2xl p-5 flex items-center justify-between">
              <div>
                <span className="text-xs text-slate-400 font-bold uppercase">Montant Global Cotisation</span>
                <p className="text-2xl font-black text-primary">{totalPrice} €</p>
              </div>
              <div className="text-right text-xs text-slate-300">
                <p className="font-bold">{selectedGroupe?.nom}</p>
                <p>{selectedDay} ({selectedTime})</p>
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="text-xs font-black uppercase text-slate-900 tracking-wider">Modes de Règlement Acceptés</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  { id: 'CB_3X', label: 'Carte Bancaire (3X SEPA en ligne)', desc: '1er paiement aujourd\'hui, puis 2 mensualités' },
                  { id: 'CB_1X', label: 'Carte Bancaire (Comptant)', desc: 'Paiement immédiat' },
                  { id: 'CHEQUE_3X', label: 'Chèques au club (1X ou 3X)', desc: 'À remettre au secrétariat lors des tests' },
                  { id: 'ANCV', label: 'Chèques Vacances ANCV / Connect', desc: 'Accepté au club' },
                  { id: 'PASS_SPORT', label: 'Pass\'Sport / CAF / Aide Régionale', desc: 'Déduction de 50€ à remettre au club' }
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
                <span>Confirmer mon Inscription</span>
                <CheckCircle2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </form>
    </div>
  )
}
