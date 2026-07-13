'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'

interface Groupe {
  id: string
  nom: string
  niveau: string | null
}

interface CalendrierFilterProps {
  groupes: Groupe[]
  initialGroupeId?: string
}

function getLabelWithAge(nom: string): string {
  const u = nom.toUpperCase()
  if (u.includes('ENF')) return `${nom} (École de Natation)`
  if (u.includes('AVENIRS')) return `${nom} (U11 et moins)`
  if (u.includes('BENJAMINS')) return `${nom} (U12 - U13)`
  if (u.includes('JUNIORS')) return `${nom} (U14 - U18)`
  if (u.includes('ADULTES') || u.includes('MAÎTRES') || u.includes('MAITRES')) return `${nom} (25 ans et + / Maîtres)`
  return nom
}

export default function CalendrierFilter({ groupes, initialGroupeId = 'all' }: CalendrierFilterProps) {
  const router = useRouter()
  const [selected, setSelected] = useState(initialGroupeId)
  const [showSyncModal, setShowSyncModal] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const handleGroupChange = (groupeId: string) => {
    setSelected(groupeId)
    if (groupeId === 'all') {
      router.push('/calendrier')
    } else {
      router.push(`/calendrier?groupeId=${groupeId}`)
    }
  }

  const getSyncUrl = (protocol: 'webcal' | 'http' = 'webcal') => {
    if (typeof window === 'undefined') return ''
    const host = window.location.host
    const path = `/api/calendrier/ical${selected !== 'all' ? `?groupeId=${selected}` : ''}`
    return `${protocol}://${host}${path}`
  };

  const handleCopyLink = () => {
    const url = getSyncUrl('http')
    navigator.clipboard.writeText(url)
    toast.success('Lien copié dans le presse-papiers !')
  }

  const handleSubscribe = () => {
    const url = getSyncUrl('webcal')
    window.open(url, '_blank')
    toast.success('Ouverture de votre application d\'agenda…')
  }

  const selectedGroupName = selected === 'all' 
    ? 'Tous les groupes' 
    : groupes.find(g => g.id === selected)?.nom || 'Mon Groupe'

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* Barre de filtres et d'action */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-50 border border-slate-200/80 p-4 rounded-2xl">
        {/* Sélecteur de groupe */}
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <label htmlFor="groupe-select" className="text-sm font-bold text-slate-700 whitespace-nowrap">
            👥 Filtrer par groupe :
          </label>
          <select
            id="groupe-select"
            value={selected}
            onChange={(e) => handleGroupChange(e.target.value)}
            className="flex-1 sm:w-64 px-3.5 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all cursor-pointer font-medium text-slate-800"
          >
            <option value="all">Tous les groupes (Général)</option>
            {groupes.map((g) => (
              <option key={g.id} value={g.id}>
                {getLabelWithAge(g.nom)}
              </option>
            ))}
          </select>
        </div>

        {/* Action s'abonner */}
        <button
          onClick={() => setShowSyncModal(true)}
          className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 bg-primary hover:bg-primary-dark text-slate-950 font-black text-xs rounded-xl shadow-sm transition-all hover:scale-[1.01] active:scale-[0.99] cursor-pointer"
        >
          <span>📅</span> S&apos;abonner à l&apos;agenda
        </button>
      </div>

      {/* ── Modal d'abonnement / Synchronisation ────────────────── */}
      {showSyncModal && mounted && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/45 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md flex flex-col overflow-hidden animate-fade-in-up border border-slate-200">
            {/* En-tête */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
              <div className="flex items-center gap-2.5">
                <span className="text-xl">⚡</span>
                <div>
                  <h3 className="font-bold text-slate-900">Synchroniser mon agenda</h3>
                  <p className="text-[10px] text-slate-400 font-semibold tracking-wide uppercase mt-0.5">{selectedGroupName}</p>
                </div>
              </div>
              <button
                onClick={() => setShowSyncModal(false)}
                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 transition-colors cursor-pointer"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
                </svg>
              </button>
            </div>

            {/* Corps */}
            <div className="p-6 space-y-5">
              <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-xl text-xs text-emerald-800 leading-relaxed font-medium space-y-1">
                <p className="font-bold text-emerald-900 text-xs uppercase tracking-wide">💡 Synchronisation automatique en temps réel</p>
                <p>En vous abonnant, toutes les compétitions CD84 et les entraînements spécifiques de ce groupe s&apos;ajouteront directement dans l&apos;agenda de votre téléphone. Toute mise à jour ultérieure sera synchronisée automatiquement !</p>
              </div>

              {/* Note d'information rouge pour le Triton */}
              <div className="bg-red-50 border border-red-200/60 p-4 rounded-xl text-xs text-red-700 leading-relaxed font-semibold space-y-1">
                <p className="font-black text-red-900 text-xs uppercase tracking-wide flex items-center gap-1">
                  <span>⚠️</span> Note importante
                </p>
                <p>Le club TRITON n&apos;est pas obligé de participer à toutes les compétitions. L&apos;événement est validé et confirmé par l&apos;entraîneur 1 semaine avant.</p>
              </div>

              {/* Bouton direct de souscription */}
              <button
                onClick={handleSubscribe}
                className="w-full py-3 bg-slate-950 hover:bg-slate-900 text-white font-bold text-xs rounded-xl shadow transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>📲</span> Ajouter à mon iPhone / smartphone
              </button>

              {/* Séparateur */}
              <div className="relative flex py-1 items-center">
                <div className="flex-grow border-t border-slate-200"></div>
                <span className="flex-shrink mx-3 text-[10px] text-slate-400 font-bold uppercase tracking-wider">Ou via lien d&apos;abonnement</span>
                <div className="flex-grow border-t border-slate-200"></div>
              </div>

              {/* Lien à copier */}
              <div className="space-y-1.5">
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider leading-none">Adresse du flux iCal / Google Calendar :</p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    readOnly
                    value={getSyncUrl('http')}
                    className="flex-1 px-3 py-2 text-xs border border-slate-200 rounded-lg bg-slate-50 text-slate-600 outline-none font-mono truncate"
                  />
                  <button
                    onClick={handleCopyLink}
                    className="px-3.5 py-2 border border-slate-200 hover:bg-slate-100 text-slate-700 font-bold text-xs rounded-lg transition-colors cursor-pointer whitespace-nowrap"
                  >
                    Copier
                  </button>
                </div>
              </div>
            </div>

            {/* Pied */}
            <div className="px-6 py-4 border-t border-slate-100 flex justify-end bg-slate-50/50">
              <button
                onClick={() => setShowSyncModal(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-500 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}
