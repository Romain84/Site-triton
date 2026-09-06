'use client'

import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import { TransactionComptableItem } from './types'

interface TransactionModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  categories: any[]
  defaultType?: 'recette' | 'depense'
  selectedMois: number
  selectedAnnee: number
  transactionToEdit?: TransactionComptableItem | null
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

export default function TransactionModal({
  isOpen,
  onClose,
  onSuccess,
  categories,
  defaultType,
  selectedMois,
  selectedAnnee,
  transactionToEdit,
}: TransactionModalProps) {
  const isEditing = Boolean(transactionToEdit)
  const [txType, setTxType] = useState<'recette' | 'depense'>(defaultType || 'recette')
  const [txCategorie, setTxCategorie] = useState<string>('')
  const [txLibelle, setTxLibelle] = useState<string>('')
  const [txMontant, setTxMontant] = useState<string>('')
  const [txDate, setTxDate] = useState<string>('')
  const [txFile, setTxFile] = useState<File | null>(null)
  const [existingJustificatif, setExistingJustificatif] = useState<string | null>(null)
  const [uploadingFile, setUploadingFile] = useState<boolean>(false)

  // Calcul d'une date par défaut intelligente
  const getSmartDefaultDate = () => {
    const now = new Date()
    if (now.getFullYear() === selectedAnnee && now.getMonth() + 1 === selectedMois) {
      return now.toISOString().split('T')[0]
    }
    return `${selectedAnnee}-${selectedMois.toString().padStart(2, '0')}-01`
  }

  // Initialiser ou réinitialiser le modal
  useEffect(() => {
    if (isOpen) {
      if (transactionToEdit) {
        setTxType(transactionToEdit.type)
        setTxCategorie(transactionToEdit.categorie)
        setTxLibelle(transactionToEdit.libelle)
        setTxMontant(transactionToEdit.montant.toString())
        setTxDate(new Date(transactionToEdit.date).toISOString().split('T')[0])
        setExistingJustificatif(transactionToEdit.justificatif || null)
        setTxFile(null)
      } else {
        const initialType = defaultType || 'recette'
        setTxType(initialType)
        const filtered = categories.filter(c => c.type === initialType || c.type === 'double')
        const defaultCat = filtered.find(c => initialType === 'depense' ? c.code === 'frais_bureau' : c.code === 'cotisation') || filtered[0]
        setTxCategorie(defaultCat?.code || '')
        setTxLibelle('')
        setTxMontant('')
        setTxDate(getSmartDefaultDate())
        setExistingJustificatif(null)
        setTxFile(null)
      }
    }
  }, [isOpen, defaultType, selectedMois, selectedAnnee, categories, transactionToEdit])

  // Ajuster la catégorie quand le type change (uniquement en mode création)
  useEffect(() => {
    if (!isOpen || isEditing) return
    const filtered = categories.filter(c => c.type === txType || c.type === 'double')
    const defaultCat = filtered.find(c => txType === 'depense' ? c.code === 'frais_bureau' : c.code === 'cotisation') || filtered[0]
    setTxCategorie(defaultCat?.code || '')
  }, [txType, categories, isOpen, isEditing])

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
    if (!txCategorie) return toast.error('Veuillez sélectionner une catégorie')
    if (!txLibelle.trim()) return toast.error('Veuillez saisir un libellé')
    if (!txMontant || parseFloat(txMontant) <= 0) return toast.error('Le montant doit être positif')
    if (!txDate) return toast.error('Veuillez sélectionner une date')

    try {
      let justificatifPath: string | null = existingJustificatif
      if (txFile) {
        setUploadingFile(true)
        const uploadedUrl = await handleUploadJustificatif(txFile)
        if (!uploadedUrl) {
          setUploadingFile(false)
          return
        }
        justificatifPath = uploadedUrl
      }

      const url = isEditing && transactionToEdit ? `/api/admin/comptabilite/${transactionToEdit.id}` : '/api/admin/comptabilite'
      const method = isEditing ? 'PUT' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: txType,
          categorie: txCategorie,
          libelle: txLibelle.trim(),
          montant: parseFloat(txMontant),
          date: txDate,
          justificatif: justificatifPath,
        }),
      })

      if (res.ok) {
        toast.success(isEditing ? 'Opération modifiée avec succès' : 'Opération enregistrée avec succès')
        onSuccess()
        onClose()
      } else {
        const err = await res.json()
        toast.error(err.error || "Erreur lors de l'enregistrement de l'opération")
      }
    } catch {
      toast.error("Erreur de connexion lors de l'enregistrement")
    } finally {
      setUploadingFile(false)
    }
  }

  const filteredCategories = categories.filter(c => c.type === txType || c.type === 'double')

  // Catégorisation intelligente en groupes pour la lisibilité
  const standardRecettes = filteredCategories.filter(c => ['cotisation', 'pass_sport', 'boutique', 'interets', 'excedent'].includes(c.code))
  const subventionsRecettes = filteredCategories.filter(c => ['subvention', 'don'].includes(c.code))
  const sportDepenses = filteredCategories.filter(c => ['licences_ffn', 'engagement_compet', 'recompenses', 'equipement', 'bnssa'].includes(c.code))
  const encadrementDepenses = filteredCategories.filter(c => ['salaires'].includes(c.code))
  const gestionDepenses = filteredCategories.filter(c => ['frais_bureau', 'frais_bancaires', 'frais_swim_community', 'assurances', 'frais_fonctionnement', 'facture_externe', 'reunions_manifestations'].includes(c.code))
  const provisionsDepenses = filteredCategories.filter(c => c.code.startsWith('provision_'))
  const volontaires = filteredCategories.filter(c => c.type === 'double' || ['benevolat_frais', 'benevolat_heures', 'location_piscine'].includes(c.code))
  const otherCategories = filteredCategories.filter(c =>
    !standardRecettes.includes(c) &&
    !subventionsRecettes.includes(c) &&
    !sportDepenses.includes(c) &&
    !encadrementDepenses.includes(c) &&
    !gestionDepenses.includes(c) &&
    !provisionsDepenses.includes(c) &&
    !volontaires.includes(c)
  )

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in p-4">
      <div className="bg-white rounded-3xl border border-slate-200/80 p-6 md:p-8 max-w-md w-full shadow-lg space-y-6">
        <div className="flex justify-between items-center border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-950">
              {isEditing ? 'Modifier l\'opération' : 'Enregistrer une opération'}
            </h3>
            <p className="text-[11px] text-slate-500 font-medium">
              {isEditing ? 'Mise à jour des détails de l\'écriture comptable' : 'Ajoutez une recette ou une dépense au journal du club'}
            </p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-650 font-bold cursor-pointer">✕</button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-sm font-light text-slate-700">
          {/* Type de transaction */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Type d&apos;opération</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setTxType('recette')}
                className={`py-2 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
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
                className={`py-2 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
                  txType === 'depense'
                    ? 'border-rose-500 bg-rose-50 text-rose-800'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                }`}
              >
                Dépense (Sortie)
              </button>
            </div>
          </div>

          {/* Catégorie groupée */}
          <div>
            <label htmlFor="txCategorie" className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Catégorie</label>
            <select
              id="txCategorie"
              value={txCategorie}
              onChange={(e) => setTxCategorie(e.target.value)}
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200/80 rounded-lg outline-none text-slate-700 font-normal cursor-pointer"
            >
              {txType === 'recette' ? (
                <>
                  {standardRecettes.length > 0 && (
                    <optgroup label="Recettes régulières">
                      {standardRecettes.map(c => (
                        <option key={c.id || c.code} value={c.code}>{getCategoryEmoji(c.code, c.type)}{c.nom}</option>
                      ))}
                    </optgroup>
                  )}
                  {subventionsRecettes.length > 0 && (
                    <optgroup label="Subventions & Dons">
                      {subventionsRecettes.map(c => (
                        <option key={c.id || c.code} value={c.code}>{getCategoryEmoji(c.code, c.type)}{c.nom}</option>
                      ))}
                    </optgroup>
                  )}
                </>
              ) : (
                <>
                  {sportDepenses.length > 0 && (
                    <optgroup label="Activités sportives & Licences">
                      {sportDepenses.map(c => (
                        <option key={c.id || c.code} value={c.code}>{getCategoryEmoji(c.code, c.type)}{c.nom}</option>
                      ))}
                    </optgroup>
                  )}
                  {encadrementDepenses.length > 0 && (
                    <optgroup label="Encadrement & Pédagogie">
                      {encadrementDepenses.map(c => (
                        <option key={c.id || c.code} value={c.code}>{getCategoryEmoji(c.code, c.type)}{c.nom}</option>
                      ))}
                    </optgroup>
                  )}
                  {gestionDepenses.length > 0 && (
                    <optgroup label="Frais généraux & Fonctionnement">
                      {gestionDepenses.map(c => (
                        <option key={c.id || c.code} value={c.code}>{getCategoryEmoji(c.code, c.type)}{c.nom}</option>
                      ))}
                    </optgroup>
                  )}
                  {provisionsDepenses.length > 0 && (
                    <optgroup label="Provisions">
                      {provisionsDepenses.map(c => (
                        <option key={c.id || c.code} value={c.code}>{getCategoryEmoji(c.code, c.type)}{c.nom}</option>
                      ))}
                    </optgroup>
                  )}
                </>
              )}
              {volontaires.length > 0 && (
                <optgroup label="Contributions volontaires (Double)">
                  {volontaires.map(c => (
                    <option key={c.id || c.code} value={c.code}>{getCategoryEmoji(c.code, c.type)}{c.nom}</option>
                  ))}
                </optgroup>
              )}
              {otherCategories.length > 0 && (
                <optgroup label="Autres">
                  {otherCategories.map(c => (
                    <option key={c.id || c.code} value={c.code}>{getCategoryEmoji(c.code, c.type)}{c.nom}</option>
                  ))}
                </optgroup>
              )}
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
              placeholder="Ex : Subvention Mairie 2026, Achat bonnets..."
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
            <div className="flex justify-between items-center mb-2">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">Justificatif (facultatif)</label>
              {existingJustificatif && (
                <a
                  href={existingJustificatif}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-primary hover:underline font-bold"
                >
                  📎 Justificatif existant
                </a>
              )}
            </div>
            <div className="border-2 border-dashed border-slate-200/80 rounded-xl p-4 bg-slate-50 text-center hover:bg-slate-50/50 hover:border-slate-300 transition-all cursor-pointer relative">
              <input type="file" accept=".pdf,.png,.jpg,.jpeg" onChange={(e) => setTxFile(e.target.files?.[0] || null)} className="absolute inset-0 opacity-0 cursor-pointer w-full h-full" />
              <div className="space-y-1">
                <p className="text-xs font-bold text-slate-800">
                  {txFile ? txFile.name : existingJustificatif ? 'Remplacer le fichier justificatif' : 'Sélectionner ou glisser un fichier'}
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
              {uploadingFile ? 'Envoi en cours...' : isEditing ? 'Enregistrer les modifications' : 'Enregistrer l\'opération'}
            </button>
            <button type="button" onClick={onClose} className="py-3 px-4 border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs rounded-xl transition-all cursor-pointer">
              Annuler
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
