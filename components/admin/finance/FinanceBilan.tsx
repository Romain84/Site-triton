'use client'

import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { moisNoms } from './types'

interface Transaction {
  id: string
  date: string
  libelle: string
  montant: number
  type: string
  justificatif?: string | null
  source: string
}

interface BilanCategory {
  label: string
  total: number
  transactions: Transaction[]
  isVolontaire?: boolean
}

interface BilanData {
  success: boolean
  saison: string
  startDate: string
  endDate: string
  totals: {
    recettes: number
    depenses: number
    resultat: number
    gain: number
    perte: number
  }
  recettes: { [key: string]: BilanCategory }
  depenses: { [key: string]: BilanCategory }
}

const preferredDepOrder = [
  'licences_ffn', 'engagement_compet', 'reunions_manifestations', 'salaires',
  'frais_swim_community', 'frais_bancaires', 'frais_bureau', 'recompenses',
  'assurances', 'bnssa', 'amendes', 'equipement', 'provision_equipement',
  'provision_salaires', 'provision_compet', 'provision_qualif',
  'benevolat_frais', 'benevolat_heures', 'location_piscine', 'autre_depense'
]

const preferredRecOrder = [
  'cotisation', 'subvention', 'interets', 'pass_sport', 'excedent', 'boutique',
  'benevolat_frais', 'benevolat_heures', 'location_piscine', 'autre_recette'
]

const sortKeys = (keys: string[], orderList: string[], categoryMap: { [key: string]: BilanCategory }) => {
  return [...keys].sort((a, b) => {
    const indexA = orderList.indexOf(a)
    const indexB = orderList.indexOf(b)
    if (indexA !== -1 && indexB !== -1) {
      return indexA - indexB
    }
    if (indexA !== -1) return -1
    if (indexB !== -1) return 1
    const labelA = categoryMap[a]?.label || ''
    const labelB = categoryMap[b]?.label || ''
    return labelA.localeCompare(labelB)
  })
}

export default function FinanceBilan() {
  const [saison, setSaison] = useState<string>('')
  const [data, setData] = useState<BilanData | null>(null)
  const [loading, setLoading] = useState<boolean>(true)

  // Drawer d'audit
  const [auditOpen, setAuditOpen] = useState<boolean>(false)
  const [auditCategoryLabel, setAuditCategoryLabel] = useState<string>('')
  const [auditTransactions, setAuditTransactions] = useState<Transaction[]>([])

  // Déterminer la saison en cours (Septembre à Août)
  useEffect(() => {
    const now = new Date()
    const currentMonth = now.getMonth() + 1
    const currentYear = now.getFullYear()
    let initialSaison = ''
    if (currentMonth >= 9) {
      initialSaison = `${currentYear}-${currentYear + 1}`
    } else {
      initialSaison = `${currentYear - 1}-${currentYear}`
    }
    setSaison(initialSaison)
  }, [])

  // Liste des saisons sélectionnables
  const now = new Date()
  const yearNow = now.getFullYear()
  const saisonsList = Array.from({ length: 6 }, (_, i) => {
    const y = yearNow - 3 + i
    return `${y}-${y + 1}`
  })

  const fetchBilan = async () => {
    if (!saison) return
    setLoading(true)
    try {
      const response = await fetch(`/api/admin/finances/bilan?saison=${saison}`)
      const resData = await response.json()
      if (response.ok) {
        setData(resData)
      } else {
        toast.error(resData.error || 'Erreur lors du chargement du bilan')
      }
    } catch {
      toast.error('Erreur réseau lors de la récupération du bilan')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchBilan()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [saison])

  const formatEuro = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(amount)
  }

  // Impression native optimisée
  const handlePrint = () => {
    window.print()
  }

  // Export CSV combiné (Résumé + Détails)
  const handleExportCSV = () => {
    if (!data) return

    // 1. En-tête de saison
    let csvContent = `BILAN FINANCIER SAISONNIER : ${data.saison} (du ${data.startDate} au ${data.endDate})\n\n`

    // 2. Tableau résumé côte à côte
    csvContent += 'DEPENSES;;;RECETTES\n'
    csvContent += 'Designation;Montant;;Designation;Montant\n'

    const depKeys = sortKeys(Object.keys(data.depenses), preferredDepOrder, data.depenses)
    const recKeys = sortKeys(Object.keys(data.recettes), preferredRecOrder, data.recettes)

    const maxRows = Math.max(depKeys.length, recKeys.length)

    for (let i = 0; i < maxRows; i++) {
      const depKey = depKeys[i]
      const recKey = recKeys[i]

      const depCat = depKey ? data.depenses[depKey] : null
      const recCat = recKey ? data.recettes[recKey] : null

      const depLabel = depCat ? depCat.label : ''
      const depVal = depCat ? depCat.total.toFixed(2) : ''

      const recLabel = recCat ? recCat.label : ''
      const recVal = recCat ? recCat.total.toFixed(2) : ''

      csvContent += `"${depLabel}";${depVal};;"${recLabel}";${recVal}\n`
    }

    csvContent += `\nTotal dépenses;${data.totals.depenses.toFixed(2)};;Total recettes;${data.totals.recettes.toFixed(2)}\n\n`
    csvContent += `Gain;${data.totals.gain > 0 ? data.totals.gain.toFixed(2) : ''}\n`
    csvContent += `Perte;${data.totals.perte > 0 ? data.totals.perte.toFixed(2) : ''}\n\n\n`

    // 3. Détails de toutes les écritures
    csvContent += 'DETAIL DES TRANSACTIONS DE LA SAISON\n'
    csvContent += 'Date;Type;Source;Catégorie;Libellé;Montant\n'

    // Fusionner toutes les transactions pour l'export plat
    const allTxs: { date: string; type: string; catLabel: string; libelle: string; montant: number; source: string }[] = []

    Object.entries(data.recettes).forEach(([key, cat]) => {
      cat.transactions.forEach(t => {
        allTxs.push({
          date: t.date,
          type: 'Recette',
          catLabel: cat.label,
          libelle: t.libelle,
          montant: t.montant,
          source: t.source
        })
      })
    })

    Object.entries(data.depenses).forEach(([key, cat]) => {
      if (cat.isVolontaire) return // Déjà exporté dans les recettes

      cat.transactions.forEach(t => {
        allTxs.push({
          date: t.date,
          type: 'Dépense',
          catLabel: cat.label,
          libelle: t.libelle,
          montant: t.montant,
          source: t.source
        })
      })
    })

    // Trier chronologiquement
    allTxs.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

    allTxs.forEach(t => {
      const dateStr = new Date(t.date).toLocaleDateString('fr-FR')
      csvContent += `${dateStr};${t.type};${t.source};"${t.catLabel}";"${t.libelle.replace(/"/g, '""')}";${t.montant.toFixed(2)}\n`
    })

    // Lancer le téléchargement
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `bilan_financier_${data.saison}.csv`
    a.click()
    URL.revokeObjectURL(url)
    toast.success('Bilan exporté avec succès !')
  }

  // Ouvrir l'audit pour une catégorie
  const openAudit = (label: string, categoryData: BilanCategory) => {
    setAuditCategoryLabel(label)
    setAuditTransactions(categoryData.transactions || [])
    setAuditOpen(true)
  }

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <p className="mt-3 text-slate-500 font-medium text-xs">Calcul du bilan de saison...</p>
        </div>
      </div>
    )
  }

  const depKeys = data ? sortKeys(Object.keys(data.depenses), preferredDepOrder, data.depenses) : []
  const recKeys = data ? sortKeys(Object.keys(data.recettes), preferredRecOrder, data.recettes) : []

  const maxRows = Math.max(depKeys.length, recKeys.length)

  return (
    <div className="space-y-6 print-container">
      {/* Sélecteur de saison & Actions (Masqué à l'impression) */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 bg-slate-50 border border-slate-200/80 p-5 rounded-3xl no-print">
        <div>
          <h4 className="text-sm font-extrabold uppercase tracking-wider text-slate-950 flex items-center gap-1.5">
            Rapport Financier de Saison
          </h4>
          <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">Période du 1er Septembre au 31 Août</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-600">Saison sportive :</span>
            <select
              value={saison}
              onChange={(e) => setSaison(e.target.value)}
              className="px-3 py-1.5 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 bg-white focus:outline-none focus:border-slate-800 shadow-2xs cursor-pointer"
            >
              {saisonsList.map((s) => (
                <option key={s} value={s}>
                  {s} (01/09 - 31/08)
                </option>
              ))}
            </select>
          </div>
          {data && (
            <div className="flex items-center gap-2">
              <button
                onClick={handlePrint}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
              >
                Imprimer / PDF
              </button>
              <button
                onClick={handleExportCSV}
                className="px-3 py-1.5 bg-slate-950 hover:bg-slate-900 text-white font-bold text-xs rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
              >
                Export Excel
              </button>
            </div>
          )}
        </div>
      </div>

      {data && (
        <div className="space-y-6">
          {/* Titre pour l'impression */}
          <div className="hidden print:block text-center mb-6">
            <h1 className="text-2xl font-black text-slate-950 uppercase tracking-wide">Triton Club Cavaillon</h1>
            <h2 className="text-base font-bold text-slate-650 mt-1">
              Bilan Financier Saison {data.saison} (du {data.startDate} au {data.endDate})
            </h2>
            <div className="w-16 h-0.5 bg-slate-950 mx-auto mt-4" />
          </div>

          {/* Tableau Côte-à-Côte Moderne */}
          <div className="bg-white border border-slate-200/90 rounded-2xl overflow-hidden shadow-2xs print:border-2 print:border-black print-grid">
            <div className="flex flex-col md:flex-row divide-y md:divide-y-0 md:divide-x divide-slate-200 print:divide-x-2 print:divide-black">
              
              {/* SECTION DÉPENSES */}
              <div className="flex-1 flex flex-col">
                <div className="bg-slate-900 text-white text-center py-3 font-extrabold text-xs uppercase tracking-widest flex items-center justify-center gap-2">
                  <span>📉</span>
                  <span>Dépenses engagées</span>
                </div>
                <div className="grid grid-cols-12 bg-slate-50 border-b border-slate-200 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  <div className="col-span-8 py-2.5 px-3 text-left">Désignation du poste</div>
                  <div className="col-span-4 py-2.5 px-3 text-right border-l border-slate-200">Montant</div>
                </div>
                <div className="flex-1 divide-y divide-slate-100">
                  {depKeys.map((key) => {
                    const cat = data.depenses[key]
                    if (!cat) return null
                    return (
                      <div
                        key={key}
                        onClick={() => openAudit(cat.label, cat)}
                        className="grid grid-cols-12 text-xs py-2.5 px-3 hover:bg-slate-50/80 transition-colors cursor-pointer select-none no-print-cursor text-slate-800 font-medium"
                      >
                        <div className="col-span-8 truncate pr-2 flex items-center gap-1.5">
                          <span className="hover:text-primary transition-colors">{cat.label}</span>
                        </div>
                        <div className="col-span-4 text-right font-mono font-bold border-l border-slate-100 pl-2 text-slate-900">
                          {cat.total > 0 ? formatEuro(cat.total) : '— €'}
                        </div>
                      </div>
                    )
                  })}
                </div>
                {/* Total Dépenses */}
                <div className="grid grid-cols-12 bg-slate-100/90 border-t-2 border-slate-200 text-xs font-black text-slate-900 py-3 px-3">
                  <div className="col-span-8 uppercase tracking-wider">Total dépenses</div>
                  <div className="col-span-4 text-right font-mono text-sm text-rose-700 font-black">
                    {formatEuro(data.totals.depenses)}
                  </div>
                </div>
              </div>

              {/* SECTION RECETTES */}
              <div className="flex-1 flex flex-col">
                <div className="bg-slate-900 text-white text-center py-3 font-extrabold text-xs uppercase tracking-widest flex items-center justify-center gap-2">
                  <span>📈</span>
                  <span>Recettes perçues</span>
                </div>
                <div className="grid grid-cols-12 bg-slate-50 border-b border-slate-200 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  <div className="col-span-8 py-2.5 px-3 text-left">Désignation du poste</div>
                  <div className="col-span-4 py-2.5 px-3 text-right border-l border-slate-200">Montant</div>
                </div>
                <div className="flex-1 divide-y divide-slate-100">
                  {Array.from({ length: maxRows }).map((_, i) => {
                    const key = recKeys[i]
                    const cat = key ? data.recettes[key] : null

                    if (!cat) {
                      // Ligne vide pour s'aligner avec le nombre de lignes de dépenses
                      return (
                        <div key={`empty-${i}`} className="grid grid-cols-12 text-xs py-2.5 px-3 text-slate-300">
                          <div className="col-span-8">&nbsp;</div>
                          <div className="col-span-4 border-l border-slate-100">&nbsp;</div>
                        </div>
                      )
                    }

                    return (
                      <div
                        key={key}
                        onClick={() => openAudit(cat.label, cat)}
                        className="grid grid-cols-12 text-xs py-2.5 px-3 hover:bg-slate-50/80 transition-colors cursor-pointer select-none no-print-cursor text-slate-800 font-medium"
                      >
                        <div className="col-span-8 truncate pr-2 flex items-center gap-1.5">
                          <span className="hover:text-primary transition-colors">{cat.label}</span>
                        </div>
                        <div className="col-span-4 text-right font-mono font-bold border-l border-slate-100 pl-2 text-slate-900">
                          {cat.total > 0 ? formatEuro(cat.total) : '— €'}
                        </div>
                      </div>
                    )
                  })}
                </div>
                {/* Total Recettes */}
                <div className="grid grid-cols-12 bg-slate-100/90 border-t-2 border-slate-200 text-xs font-black text-slate-900 py-3 px-3">
                  <div className="col-span-8 uppercase tracking-wider">Total recettes</div>
                  <div className="col-span-4 text-right font-mono text-sm text-emerald-700 font-black">
                    {formatEuro(data.totals.recettes)}
                  </div>
                </div>
              </div>

            </div>
          </div>

          {/* TABLEAU DE GAIN / PERTE NET (Aligné en bas) */}
          <div className="flex justify-center pt-2">
            <div className="w-full max-w-sm bg-white border border-slate-200/90 rounded-2xl overflow-hidden shadow-2xs print:border-2 print:border-black">
              <div className="grid grid-cols-2 divide-x divide-slate-200 print:divide-black">
                
                {/* Ligne Gain */}
                <div className="flex flex-col justify-between divide-y divide-slate-200">
                  <div className={`py-3 px-4 text-xs font-black uppercase text-center ${data.totals.gain > 0 ? 'bg-emerald-600 text-white' : 'text-slate-400 bg-slate-50'}`}>
                    Gain net
                  </div>
                  <div className={`py-3 px-4 text-center font-mono font-black text-base ${data.totals.gain > 0 ? 'text-emerald-600' : 'text-slate-300'}`}>
                    {data.totals.gain > 0 ? formatEuro(data.totals.gain) : '—'}
                  </div>
                </div>

                {/* Ligne Perte */}
                <div className="flex flex-col justify-between divide-y divide-slate-200">
                  <div className={`py-3 px-4 text-xs font-black uppercase text-center ${data.totals.perte > 0 ? 'bg-rose-600 text-white' : 'text-slate-400 bg-slate-50'}`}>
                    Perte nette
                  </div>
                  <div className={`py-3 px-4 text-center font-mono font-black text-base ${data.totals.perte > 0 ? 'text-rose-600' : 'text-slate-300'}`}>
                    {data.totals.perte > 0 ? formatEuro(data.totals.perte) : '—'}
                  </div>
                </div>

              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── DRAWER D'AUDIT COMPTABLE (Glassmorphic) ── */}
      {auditOpen && (
        <div className="fixed inset-0 z-[100] flex justify-end no-print">
          {/* Backdrop blur */}
          <div
            className="absolute inset-0 bg-slate-900/30 backdrop-blur-xs transition-opacity duration-300"
            onClick={() => setAuditOpen(false)}
          />

          {/* Drawer Panel */}
          <div className="relative w-full max-w-[650px] h-full bg-white shadow-2xl flex flex-col z-50 animate-slide-in overflow-hidden border-l border-slate-200">
            {/* Header */}
            <div className="px-6 py-5 bg-gradient-to-r from-slate-50 to-white border-b border-slate-200 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  Consultation des écritures (Audit)
                </span>
                <h3 className="text-base font-extrabold text-slate-900 mt-1 uppercase tracking-wide">
                  {auditCategoryLabel}
                </h3>
              </div>
              <button
                onClick={() => setAuditOpen(false)}
                className="w-9 h-9 rounded-full hover:bg-slate-100 border border-slate-200 text-slate-400 hover:text-slate-650 flex items-center justify-center transition-all font-bold"
              >
                ✕
              </button>
            </div>

            {/* Content list of transactions */}
            <div className="flex-grow overflow-y-auto p-6 space-y-4">
              {auditTransactions.length === 0 ? (
                <p className="text-center text-slate-400 italic py-12 text-sm">
                  Aucune transaction réelle n&apos;est liée à ce montant (lignes de provisions ou écritures neutralisées).
                </p>
              ) : (
                <div className="space-y-3">
                  <p className="text-[11px] text-slate-400 font-semibold uppercase">
                    Nombre d&apos;écritures : {auditTransactions.length}
                  </p>
                  <div className="divide-y divide-slate-100 border border-slate-100 rounded-xl overflow-hidden shadow-2xs bg-white">
                    {auditTransactions.map((tx) => (
                      <div key={tx.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white hover:bg-slate-50/50 transition-colors">
                        <div className="space-y-1">
                          <p className="text-xs font-bold text-slate-950 leading-relaxed">
                            {tx.libelle}
                          </p>
                          <div className="flex items-center gap-2 text-[10px] text-slate-400 font-semibold uppercase">
                            <span>{new Date(tx.date).toLocaleDateString('fr-FR')}</span>
                            <span>•</span>
                            <span className="px-1.5 py-0.5 rounded-sm bg-slate-100 text-slate-600 text-[8px] font-bold">
                              {tx.source === 'boutique' ? 'Vente' : tx.source === 'factures_coach' ? 'Coach' : 'Saisie manuelle'}
                            </span>
                          </div>
                        </div>
                        <div className="text-right shrink-0 flex items-center sm:flex-col gap-2 sm:gap-1">
                          <span className={`text-sm font-black font-mono ${tx.type === 'recette' ? 'text-emerald-600' : 'text-rose-600'}`}>
                            {tx.type === 'recette' ? '+' : '-'}{formatEuro(tx.montant)}
                          </span>
                          {tx.justificatif && (
                            <a
                              href={tx.justificatif}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[9px] text-slate-500 font-bold bg-slate-100 hover:bg-slate-200 px-2 py-0.5 rounded-md transition-all inline-block text-center"
                            >
                              Justificatif
                            </a>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-5 bg-slate-50 border-t border-slate-150 flex justify-between items-center text-xs">
              <span className="text-slate-500 font-semibold">Total cumulé :</span>
              <span className="text-sm font-black text-slate-950 font-mono">
                {formatEuro(
                  auditTransactions.reduce((sum, t) => sum + t.montant, 0)
                )}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Styles d'animation et d'impression */}
      <style>{`
        @keyframes slide-in {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
        .animate-slide-in {
          animation: slide-in 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .no-print-cursor {
          cursor: pointer;
        }
        .no-print-cursor:hover {
          background-color: rgb(248 250 252) !important;
        }

        @media print {
          /* Masquer les éléments non imprimables */
          .no-print, header, aside, button, select, nav, .alert, footer, .toasted-container {
            display: none !important;
          }
          
          /* Forcer les styles de page */
          @page {
            size: A4 portrait;
            margin: 1.5cm;
          }

          body {
            background: white !important;
            color: black !important;
            font-size: 11px !important;
          }

          .print-container {
            width: 100% !important;
            max-width: 100% !important;
            padding: 0 !important;
            margin: 0 !important;
            border: none !important;
            box-shadow: none !important;
          }

          .print-grid {
            display: block !important;
            border: 2px solid #000000 !important;
            border-radius: 0px !important;
          }

          .print-grid > div {
            display: flex !important;
            flex-direction: row !important;
            align-items: stretch !important;
          }

          .no-print-cursor {
            cursor: default !important;
          }

          /* Forcer la couleur orange à l'impression */
          .text-amber-600 {
            color: #d97706 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          /* Conserver les fonds colorés légers */
          .bg-slate-100 {
            background-color: #f1f5f9 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .bg-slate-900 {
            background-color: #0f172a !important;
            color: #ffffff !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        }
      `}</style>
    </div>
  )
}
