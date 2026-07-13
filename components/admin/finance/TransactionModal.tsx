'use client'

import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'

interface TransactionModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  categories: any[]
  defaultType?: 'recette' | 'depense'
  selectedMois: number
  selectedAnnee: number
}

const getCategoryEmoji = (code: string, type: string) => {
  if (code.includes('benevolat') || code === 'location_piscine') return '🧡 '
  if (code === 'cotisation') return '👥 '
  if (code === 'subvention') return '🏛️ '
  if (code === 'interets') return '📈 '
  if (code === 'pass_sport') return '🎟️ '
  if (code === 'excedent') return '💰 '
  if (code === 'boutique') return '🛍️ '
  
  if (code === 'licences_ffn') return '🏊 '
  if (code === 'engagement_compet') return '🏆 '
  if (code === 'reunions_manifestations') return '🤝 '
  if (code === 'salaires') return '👨‍🏫 '
  if (code === 'frais_swim_community') return '💻 '
  if (code === 'frais_bancaires') return '🏦 '
  if (code === 'frais_bureau') return '🏢 '
  if (code === 'recompenses') return '🏅 '
  if (code === 'assurances') return '🛡️ '
  if (code === 'bnssa') return '🛟 '
  if (code === 'amendes') return '⚠️ '
  if (code === 'equipement') return '👕 '
  if (code.startsWith('provision_')) return '📋 '
  
  return type === 'recette' ? '📈 ' : '📉 '
}

export default function TransactionModal({ isOpen, onClose, onSuccess, categories, defaultType, selectedMois, selectedAnnee }: TransactionModalProps) {
  const [txType, setTxType] = useState<'recette' | 'depense'>(defaultType || 'recette')
  const [txCategorie, setTxCategorie] = useState<string>('')
  const [txLibelle, setTxLibelle] = useState<string>('')
  const [txMontant, setTxMontant] = useState<string>('')
  const [txDate, setTxDate] = useState<string>(`${selectedAnnee}-${selectedMois.toString().padStart(2, '0')}-01`)
  const [txFile, setTxFile] = useState<File | null>(null)
  const [uploadingFile, setUploadingFile] = useState<boolean>(false)

  // Réinitialiser quand le modal s'ouvre
  useEffect(() => {
    if (isOpen) {
      const initialType = defaultType || 'recette'
      setTxType(initialType)
      
      const filtered = categories.filter(c => c.type === initialType || c.type === 'double')
      const defaultCat = filtered.find(c => initialType === 'depense' ? c.code === 'frais_bureau' : c.code === 'cotisation')
        || filtered[0]
        
      setTxCategorie(defaultCat?.code || '')
      setTxLibelle('')
      setTxMontant('')
      setTxDate(`${selectedAnnee}-${selectedMois.toString().padStart(2, '0')}-01`)
      setTxFile(null)
    }
  }, [isOpen, defaultType, selectedMois, selectedAnnee, categories])

  // Ajuster la catégorie quand le type change
  useEffect(() => {
    if (!isOpen) return
    const filtered = categories.filter(c => c.type === txType || c.type === 'double')
    const defaultCat = filtered.find(c => txType === 'depense' ? c.code === 'frais_bureau' : c.code === 'cotisation')
      || filtered[0]
    setTxCategorie(defaultCat?.code || '')
  }, [txType, categories, isOpen])

  if (!isOpen) return null

  const handleUploadJustificatif = async (file: File): Promise<string | null> => {
    const formData = new FormData()
    formData.append('file', file)
    try {
      const res = await fetch('/api/admin/comptabilite/upload', { method: 'POST', body: formData })
      const resData = await res.json()
      if (res.ok) {
        return resData.url
      } else {
        toast.error(resData.error || 'Erreur lors du téléversement du fichier')
        return null
      }
    } catch {
      toast.error('Erreur réseau lors du téléversement')
      return null
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!txLibelle.trim()) return toast.error('Veuillez saisir un libellé')
    if (!txMontant || parseFloat(txMontant) <= 0) return toast.error('Le montant doit être positif')
    if (!txDate) return toast.error('Veuillez sélectionner une date')

    try {
      let justificatifPath: string | null = null
      if (txFile) {
        setUploadingFile(true)
        const uploadedUrl = await handleUploadJustificatif(txFile)
        if (!uploadedUrl) {
          setUploadingFile(false)
          return
        }
        justificatifPath = uploadedUrl
      }

      const res = await fetch('/api/admin/comptabilite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: txType,
          categorie: txCategorie,
          libelle: txLibelle,
          montant: parseFloat(txMontant),
          date: txDate,
          justificatif: justificatifPath,
        }),
      })

      if (res.ok) {
        toast.success('Transaction enregistrée avec succès')
        onSuccess()
        onClose()
      } else {
        const err = await res.json()
        toast.error(err.error || "Erreur lors de l'enregistrement de la transaction")
      }
    } catch {
      toast.error("Erreur de connexion lors de l'enregistrement")
    } finally {
      setUploadingFile(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in">
      <div className="bg-white rounded-3xl border border-slate-200/80 p-6 md:p-8 max-w-md w-full shadow-lg m-4 space-y-6">
        <div className="flex justify-between items-center border-b border-slate-100 pb-3">
          <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-950">
            Enregistrer une opération
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-650 font-bold">✕</button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-sm font-light text-slate-700">
          {/* Type de transaction */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Type d&apos;opération</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setTxType('recette')}
                className={`py-2 text-xs font-bold rounded-lg border transition-all ${
                  txType === 'recette'
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-800'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                }`}
              >
                Recette (Entrée)
              </button>
              <button
                type="button"
                onClick={() => setTxType('depense')}
                className={`py-2 text-xs font-bold rounded-lg border transition-all ${
                  txType === 'depense'
                    ? 'border-rose-500 bg-rose-50 text-rose-800'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                }`}
              >
                Dépense (Sortie)
              </button>
            </div>
          </div>

          {/* Catégorie */}
          <div>
            <label htmlFor="txCategorie" className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Catégorie</label>
            <select
              id="txCategorie"
              value={txCategorie}
              onChange={(e) => setTxCategorie(e.target.value)}
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200/80 rounded-lg outline-none text-slate-700 font-normal"
            >
              {categories
                .filter(c => c.type === txType || c.type === 'double')
                .map(c => (
                  <option key={c.id || c.code} value={c.code}>
                    {getCategoryEmoji(c.code, c.type)}{c.nom}
                  </option>
                ))}
            </select>
          </div>

          {/* Libellé */}
          <div>
            <label htmlFor="txLibelle" className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Libellé</label>
            <input
              type="text"
              id="txLibelle"
              required
              value={txLibelle}
              onChange={(e) => setTxLibelle(e.target.value)}
              placeholder="Ex : Subvention Mairie 2026..."
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200/80 rounded-lg focus:border-slate-800 focus:bg-white outline-none placeholder:text-slate-400 font-normal text-slate-800"
            />
          </div>

          {/* Montant et Date */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="txMontant" className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Montant (€)</label>
              <input type="number" step="0.01" id="txMontant" required value={txMontant} onChange={(e) => setTxMontant(e.target.value)} placeholder="120.00" className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200/80 rounded-lg focus:border-slate-800 focus:bg-white outline-none font-normal text-slate-800" />
            </div>
            <div>
              <label htmlFor="txDate" className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Date</label>
              <input type="date" id="txDate" required value={txDate} onChange={(e) => setTxDate(e.target.value)} className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200/80 rounded-lg focus:border-slate-800 focus:bg-white outline-none font-normal text-slate-700" />
            </div>
          </div>

          {/* Justificatif */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Justificatif (facultatif)</label>
            <div className="border-2 border-dashed border-slate-200/80 rounded-xl p-4 bg-slate-50 text-center hover:bg-slate-50/50 hover:border-slate-300 transition-all cursor-pointer relative">
              <input type="file" accept=".pdf,.png,.jpg,.jpeg" onChange={(e) => setTxFile(e.target.files?.[0] || null)} className="absolute inset-0 opacity-0 cursor-pointer w-full h-full" />
              <div className="space-y-1">
                <p className="text-xs font-bold text-slate-800">
                  {txFile ? txFile.name : 'Sélectionner ou glisser un fichier'}
                </p>
                <p className="text-[9px] text-slate-400 font-medium">PDF, PNG, JPG — Max 5 Mo</p>
              </div>
            </div>
          </div>

          {/* Boutons d'action */}
          <div className="flex gap-3 pt-4 border-t border-slate-100">
            <button
              type="submit"
              disabled={uploadingFile}
              className="flex-1 py-3 bg-slate-950 hover:bg-slate-900 text-white font-bold text-xs rounded-xl shadow-sm transition-colors disabled:bg-slate-200 cursor-pointer"
            >
              {uploadingFile ? 'Envoi en cours...' : 'Enregistrer l\'opération'}
            </button>
            <button type="button" onClick={onClose} className="py-3 px-4 border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs rounded-xl transition-all">
              Annuler
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
