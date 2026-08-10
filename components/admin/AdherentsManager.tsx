'use client'

import React, { useState } from 'react'
import { Search, Filter, Download, CheckCircle, AlertTriangle, UserCheck, Shield, Sparkles, Plus, Waves, Award, Tag, Mail, CreditCard, Ticket } from 'lucide-react'

interface LicencieFFN {
  id: string
  licenseNumberFFN: string
  memberNumber: string
  nom: string
  prenom: string
  email: string
  telephone: string
  dateNaissance: string
  categorieFFN: 'ENF Sauv\'Nage' | 'Avenirs' | 'Benjamins' | 'Juniors' | 'Seniors' | 'Maîtres' | 'Aquagym' | 'Natation Artistique' | 'BNSSA'
  groupe: string
  statutDossier: 'valid' | 'missing_docs' | 'pending_payment'
  certificatMedicalFFN: boolean
  droitImage: boolean
  acceptReglement: boolean
  montantCotisation: number
  prixLicenceFFN: number
  montantPaye: number
  modePaiement: string
  passSportCode?: string
  passSportValidated?: boolean
  chequeNumber?: string
  chequeBank?: string
  desiredEncashmentDate?: string
  tags: string[]
  guardian2Name?: string
}

export default function AdherentsManager() {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedTag, setSelectedTag] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<'all' | 'valid' | 'missing_docs' | 'pending_payment'>('all')

  const [licencies, setLicencies] = useState<LicencieFFN[]>([
    {
      id: 'm-1',
      licenseNumberFFN: '2012051401',
      memberNumber: 'TCC-FFN-2026-001',
      nom: 'Dubois',
      prenom: 'Lucas',
      email: 'lucas.dubois@gmail.com',
      telephone: '06 12 34 56 78',
      dateNaissance: '2012-05-14',
      categorieFFN: 'Benjamins',
      groupe: 'Natation Compétition Benjamins',
      statutDossier: 'valid',
      certificatMedicalFFN: true,
      droitImage: true,
      acceptReglement: true,
      montantCotisation: 285,
      prixLicenceFFN: 45,
      montantPaye: 330,
      modePaiement: 'CB (3X SEPA)',
      tags: ['Compétiteur', 'Officiel FFN'],
      guardian2Name: 'Marie Dubois'
    },
    {
      id: 'm-2',
      licenseNumberFFN: '2015092202',
      memberNumber: 'TCC-FFN-2026-002',
      nom: 'Rousseau',
      prenom: 'Camille',
      email: 'camille.rousseau@hotmail.fr',
      telephone: '06 99 88 77 11',
      dateNaissance: '2015-09-22',
      categorieFFN: 'Avenirs',
      groupe: 'Groupe Avenirs 2',
      statutDossier: 'pending_payment',
      certificatMedicalFFN: true,
      droitImage: true,
      acceptReglement: true,
      montantCotisation: 235,
      prixLicenceFFN: 45,
      montantPaye: 230,
      modePaiement: 'Pass\'Sport (50€) + Chèque',
      passSportCode: '25-AB12-34CD',
      passSportValidated: true,
      chequeNumber: '8492041',
      chequeBank: 'Crédit Mutuel',
      desiredEncashmentDate: '2026-10-10',
      tags: ['Pass\'Sport 50€', 'Chèque 3X']
    },
    {
      id: 'm-3',
      licenseNumberFFN: '1988110303',
      memberNumber: 'TCC-FFN-2026-003',
      nom: 'Moreau',
      prenom: 'Élodie',
      email: 'elodie.moreau@orange.fr',
      telephone: '07 44 55 66 77',
      dateNaissance: '1988-11-03',
      categorieFFN: 'Aquagym',
      groupe: 'AquaGym Tonic',
      statutDossier: 'valid',
      certificatMedicalFFN: true,
      droitImage: true,
      acceptReglement: true,
      montantCotisation: 245,
      prixLicenceFFN: 45,
      montantPaye: 290,
      modePaiement: 'Virement SEPA',
      tags: ['Aquagym', 'Donateur Association']
    },
    {
      id: 'm-4',
      licenseNumberFFN: '2017021804',
      memberNumber: 'TCC-FFN-2026-004',
      nom: 'Vidal',
      prenom: 'Mathieu',
      email: 'mathieu.vidal@gmail.com',
      telephone: '06 33 22 11 00',
      dateNaissance: '2017-02-18',
      categorieFFN: 'ENF Sauv\'Nage',
      groupe: 'ENF 1 - Sauv\'Nage',
      statutDossier: 'missing_docs',
      certificatMedicalFFN: false,
      droitImage: true,
      acceptReglement: true,
      montantCotisation: 195,
      prixLicenceFFN: 45,
      montantPaye: 0,
      modePaiement: 'Chèque',
      tags: ['Sauv\'Nage', 'Liste d\'attente']
    }
  ])

  const toggleValidation = (id: string) => {
    setLicencies((prev) =>
      prev.map((l) => {
        if (l.id === id) {
          const nextStatus = l.statutDossier === 'valid' ? 'missing_docs' : 'valid'
          return {
            ...l,
            statutDossier: nextStatus,
            certificatMedicalFFN: true,
            montantPaye: l.montantCotisation + l.prixLicenceFFN
          }
        }
        return l
      })
    )
  }

  const exportPassSportLCA = () => {
    const passSportMembers = licencies.filter((l) => l.passSportCode && l.passSportValidated)
    const headers = ['Code Pass\'Sport', 'Nom Beneficiaire', 'Prenom Beneficiaire', 'Date de Naissance', 'Montant Duit', 'N Licence FFN', 'Email Parent']
    const rows = passSportMembers.map((l) => [
      l.passSportCode,
      l.nom,
      l.prenom,
      l.dateNaissance,
      '50.00',
      l.licenseNumberFFN,
      l.email
    ])

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n')
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `pass_sport_remboursement_lca_triton_${new Date().toISOString().split('T')[0]}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const exportExtraNatCSV = () => {
    const headers = ['N Licence FFN', 'N Club FFN', 'Nom', 'Prenom', 'Categorie FFN', 'Email', 'Telephone', 'Statut Licence', 'PassSport Code', 'Cheque N', 'Banque', 'Date Encaissement', 'Tags']
    const rows = licencies.map((l) => [
      l.licenseNumberFFN,
      '084300',
      l.nom,
      l.prenom,
      l.categorieFFN,
      l.email,
      l.telephone,
      l.statutDossier === 'valid' ? 'VALIDE' : 'EN_ATTENTE',
      l.passSportCode || '',
      l.chequeNumber || '',
      l.chequeBank || '',
      l.desiredEncashmentDate || '',
      l.tags.join(';')
    ])

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n')
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `extranat_licencies_ffn_triton_cavaillon_${new Date().toISOString().split('T')[0]}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const filteredLicencies = licencies.filter((l) => {
    const matchesSearch =
      `${l.prenom} ${l.nom}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
      l.licenseNumberFFN.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (l.passSportCode && l.passSportCode.toLowerCase().includes(searchTerm.toLowerCase())) ||
      l.memberNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      l.groupe.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesStatus = statusFilter === 'all' || l.statutDossier === statusFilter
    const matchesTag = selectedTag === 'all' || l.tags.includes(selectedTag)

    return matchesSearch && matchesStatus && matchesTag
  })

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-900 text-white p-6 rounded-2xl border border-slate-800 shadow-md">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Waves className="w-5 h-5 text-triton-cyan" />
            <h2 className="text-xl font-black">Gestion des Licenciés FFN (~300 Adhérents)</h2>
          </div>
          <p className="text-xs text-slate-300">
            Association Triton Club Cavaillon (FFN N° 084300) · Suivi des dossiers d'inscription et validation des licences FFN.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            onClick={exportPassSportLCA}
            className="px-3.5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs shadow-sm transition-all flex items-center gap-1.5"
          >
            <Ticket className="w-4 h-4" />
            <span>Export Pass'Sport LCA (50€)</span>
          </button>
          <button
            onClick={exportExtraNatCSV}
            className="px-3.5 py-2.5 rounded-xl bg-primary text-slate-950 font-extrabold text-xs shadow-sm hover:bg-primary-dark transition-all flex items-center gap-1.5"
          >
            <Download className="w-4 h-4" />
            <span>Export FFN ExtraNat (CSV)</span>
          </button>
        </div>
      </div>

      {/* Filters & Tags Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Rechercher par N° Licence FFN, code Pass'Sport (ex: 25-AB12), nom..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-slate-900 outline-none"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto text-xs font-bold">
            {['all', 'valid', 'pending_payment', 'missing_docs'].map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st as any)}
                className={`px-3 py-1.5 rounded-xl transition-all whitespace-nowrap ${
                  statusFilter === st
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {st === 'all' ? 'Tous' : st === 'valid' ? 'Licences Validées' : st === 'pending_payment' ? 'Paiement partiel' : 'Pièces manquantes'}
              </button>
            ))}
          </div>
        </div>

        {/* Tags Selector */}
        <div className="flex items-center gap-2 pt-1 overflow-x-auto text-xs">
          <span className="text-[11px] font-extrabold text-slate-400 uppercase flex items-center gap-1">
            <Tag className="w-3 h-3" /> Tags:
          </span>
          {['all', 'Pass\'Sport 50€', 'Chèque 3X', 'Compétiteur', 'Officiel FFN', 'Donateur Association'].map((tg) => (
            <button
              key={tg}
              onClick={() => setSelectedTag(tg)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                selectedTag === tg
                  ? 'bg-triton-blue text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {tg === 'all' ? 'Tous les tags' : tg}
            </button>
          ))}
        </div>
      </div>

      {/* Table of FFN Swimmers */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px]">
                <th className="py-3 px-4">N° Licence FFN</th>
                <th className="py-3 px-4">Nageur & Tuteurs</th>
                <th className="py-3 px-4">Catégorie & Tags</th>
                <th className="py-3 px-4">Pass'Sport & Règlements</th>
                <th className="py-3 px-4 text-center">Statut FFN</th>
                <th className="py-3 px-4 text-right">Actions Admin</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredLicencies.map((l) => (
                <tr key={l.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3 px-4 font-mono font-bold text-primary">{l.licenseNumberFFN}</td>
                  <td className="py-3 px-4 font-extrabold text-slate-900">
                    {l.prenom} {l.nom}
                    <div className="text-[10px] text-slate-400 font-normal">{l.email}</div>
                  </td>
                  <td className="py-3 px-4 font-bold text-slate-800">
                    <span className="px-2 py-0.5 rounded text-[10px] bg-slate-100 text-slate-700">
                      {l.categorieFFN}
                    </span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {l.tags.map((t) => (
                        <span key={t} className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-blue-50 text-triton-blue">
                          {t}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="py-3 px-4 font-bold text-slate-800">
                    <div>{l.montantPaye} € / {l.montantCotisation + l.prixLicenceFFN} €</div>
                    <div className="text-[10px] text-slate-500 font-normal">{l.modePaiement}</div>
                    {l.passSportCode && (
                      <div className="text-[10px] text-emerald-700 font-mono mt-0.5 flex items-center gap-1">
                        <Ticket className="w-3 h-3" /> Pass'Sport {l.passSportCode} (-50€)
                      </div>
                    )}
                    {l.chequeNumber && (
                      <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                        Chèque N°{l.chequeNumber} ({l.chequeBank})
                      </div>
                    )}
                  </td>
                  <td className="py-3 px-4 text-center">
                    {l.statutDossier === 'valid' ? (
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800">
                        Licence Validée FFN
                      </span>
                    ) : (
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-amber-100 text-amber-800">
                        En attente
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-right space-y-1">
                    <button
                      onClick={() => toggleValidation(l.id)}
                      className="w-full px-3 py-1 rounded-lg bg-slate-100 hover:bg-slate-900 hover:text-white font-bold text-[11px] transition-all block"
                    >
                      {l.statutDossier === 'valid' ? 'Invalider' : 'Valider FFN'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
