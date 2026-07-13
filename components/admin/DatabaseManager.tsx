'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import toast from 'react-hot-toast'
import { useConfirmDialog } from '@/components/ConfirmDialog'

export default function DatabaseManager() {
  const [importing, setImporting] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { confirm } = useConfirmDialog()

  // États pour les backups automatisés OVH
  const [ovhLoading, setOvhLoading] = useState(true)
  const [ovhConfigured, setOvhConfigured] = useState(false)
  const [ovhError, setOvhError] = useState<string | null>(null)
  const [ovhStatus, setOvhStatus] = useState<any | null>(null)
  const [restorePoints, setRestorePoints] = useState<string[]>([])
  const [showOvhConfig, setShowOvhConfig] = useState(false)

  // Formulaire configuration OVH
  const [appKey, setAppKey] = useState('')
  const [appSecret, setAppSecret] = useState('')
  const [consumerKey, setConsumerKey] = useState('')
  const [serviceName, setServiceName] = useState('vps-248c64f5.vps.ovh.net')
  const [savingOvh, setSavingOvh] = useState(false)
  const [restoringOvh, setRestoringOvh] = useState<string | null>(null)

  const fetchOvhData = useCallback(async () => {
    setOvhLoading(true)
    setOvhError(null)
    try {
      const response = await fetch('/api/admin/database/ovh-backup')
      const data = await response.json()
      if (response.ok) {
        setOvhConfigured(data.configured)
        setOvhStatus(data.status)
        setRestorePoints(data.restorePoints || [])
        
        // Remplir les champs de configuration
        setAppKey(data.settings?.ovhApplicationKey || '')
        setAppSecret(data.settings?.ovhApplicationSecret || '')
        setConsumerKey(data.settings?.ovhConsumerKey || '')
        setServiceName(data.settings?.ovhServiceName || 'vps-248c64f5.vps.ovh.net')

        if (data.ovhError) {
          setOvhError(data.ovhError)
        }
      } else {
        setOvhError('Erreur lors du chargement des informations de sauvegarde VPS.')
      }
    } catch {
      setOvhError('Erreur réseau lors de la récupération des sauvegardes.')
    } finally {
      setOvhLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchOvhData()
  }, [fetchOvhData])

  const handleExport = async () => {
    try {
      toast.loading('Génération de la sauvegarde...', { id: 'backup' })
      const response = await fetch('/api/admin/database', {
        method: 'GET',
        credentials: 'include',
      })

      if (!response.ok) {
        throw new Error('Erreur lors du téléchargement')
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      const dateStr = new Date().toISOString().split('T')[0]
      a.download = `triton-backup-${dateStr}.json`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      toast.success('Sauvegarde téléchargée avec succès !', { id: 'backup' })
    } catch {
      toast.error('Échec de la génération de la sauvegarde.', { id: 'backup' })
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.type !== 'application/json' && !file.name.endsWith('.json')) {
        toast.error('Veuillez sélectionner un fichier JSON valide.')
        return
      }
      setSelectedFile(file)
    }
  }

  const handleRestore = async () => {
    if (!selectedFile) return

    const confirmed = await confirm({
      title: '⚠️ RESTAURATION CRITIQUE ⚠️',
      message: 'Attention ! Cette action va EFFACER TOUTES les données actuelles de la base de données (produits, commandes, utilisateurs, planning, actualités...) et les remplacer par le contenu du fichier sélectionné. Cette action est définitive et irréversible.',
      confirmText: 'Écraser et Restaurer',
      variant: 'danger',
    })
    if (!confirmed) return

    setImporting(true)
    const toastId = toast.loading('Restauration en cours... Ne fermez pas la page.', { duration: 0 })

    try {
      const reader = new FileReader()
      const fileData = await new Promise<string>((resolve, reject) => {
        reader.onload = (e) => resolve(e.target?.result as string)
        reader.onerror = () => reject(new Error('Erreur de lecture du fichier'))
        reader.readAsText(selectedFile)
      })

      const backupJson = JSON.parse(fileData)

      const response = await fetch('/api/admin/database', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(backupJson),
        credentials: 'include',
      })

      const result = await response.json()

      if (response.ok) {
        toast.success('Base de données restaurée avec succès !', { id: toastId })
        setSelectedFile(null)
        if (fileInputRef.current) fileInputRef.current.value = ''
      } else {
        toast.error(result.error || 'Erreur lors de la restauration.', { id: toastId })
      }
    } catch (error) {
      console.error('Erreur restauration:', error)
      toast.error('Format de fichier invalide ou erreur réseau.', { id: toastId })
    } finally {
      setImporting(false)
    }
  }

  const handleSaveOvhSettings = async (e: React.FormEvent) => {
    e.preventDefault()
    setSavingOvh(true)
    try {
      const response = await fetch('/api/admin/database/ovh-backup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'saveSettings',
          ovhApplicationKey: appKey,
          ovhApplicationSecret: appSecret,
          ovhConsumerKey: consumerKey,
          ovhServiceName: serviceName,
        })
      })
      const data = await response.json()
      if (response.ok) {
        toast.success(data.message || 'Identifiants OVH sauvegardés !')
        setShowOvhConfig(false)
        fetchOvhData()
      } else {
        toast.error(data.error || 'Erreur lors de la sauvegarde.')
      }
    } catch {
      toast.error('Erreur réseau.')
    } finally {
      setSavingOvh(false)
    }
  }

  const handleOvhRestore = async (restorePointDate: string) => {
    const formattedDate = new Date(restorePointDate).toLocaleString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })

    const confirmed = await confirm({
      title: '🚨 RESTAURATION DU SERVEUR VPS 🚨',
      message: `Attention ! Vous vous apprêtez à restaurer l'intégralité du serveur VPS (système, fichiers et base de données) à l'état du ${formattedDate}. Le serveur va être réinitialisé et redémarrer. Toutes les données créées ou modifiées après cette date seront définitivement perdues. Voulez-vous continuer ?`,
      confirmText: 'Démarrer la restauration',
      variant: 'danger',
    })
    if (!confirmed) return

    setRestoringOvh(restorePointDate)
    const toastId = toast.loading('Lancement de la restauration chez OVH...', { duration: 0 })
    try {
      const response = await fetch('/api/admin/database/ovh-backup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'triggerRestore',
          restorePointDate
        })
      })
      const data = await response.json()
      if (response.ok) {
        toast.success('Restauration initiée avec succès ! Le serveur va redémarrer sous peu.', { id: toastId })
      } else {
        toast.error(data.error || 'Erreur lors du lancement de la restauration.', { id: toastId })
      }
    } catch {
      toast.error('Erreur réseau lors de la communication avec l\'API.', { id: toastId })
    } finally {
      setRestoringOvh(null)
    }
  }

  return (
    <div className="space-y-8 max-w-6xl">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Sauvegarde & Restauration</h2>
        <p className="text-sm text-gray-550">Gérez la persistance locale de vos données ainsi que les sauvegardes automatiques de votre serveur VPS.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Colonne gauche : Export/Import Local */}
        <div className="lg:col-span-2 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Export Card */}
            <div className="card p-6 flex flex-col justify-between space-y-6">
              <div className="space-y-2">
                <div className="text-3xl">📥</div>
                <h3 className="text-lg font-extrabold text-slate-800">Exporter la base de données</h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Téléchargez un instantané complet de toutes les données du club (membres, plannings, commandes, catalogue boutique, configurations) dans un fichier unique sécurisé au format JSON.
                </p>
              </div>
              <button
                onClick={handleExport}
                className="w-full bg-slate-900 text-white font-bold py-3 px-4 rounded-xl hover:bg-slate-800 transition-colors cursor-pointer text-center text-sm"
              >
                Télécharger la sauvegarde (.json)
              </button>
            </div>

            {/* Import Card */}
            <div className="card p-6 flex flex-col justify-between space-y-6 border-amber-100 bg-amber-50/10">
              <div className="space-y-2">
                <div className="text-3xl">📤</div>
                <h3 className="text-lg font-extrabold text-slate-800">Restaurer la base de données</h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Sélectionnez un fichier de sauvegarde précédemment exporté pour écraser la base de données actuelle et réimporter l'historique complet.
                </p>
              </div>

              <div className="space-y-4">
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-slate-250 hover:border-primary rounded-xl p-4 text-center cursor-pointer transition-colors"
                >
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept=".json"
                    onChange={handleFileChange}
                    className="hidden"
                    disabled={importing}
                  />
                  {selectedFile ? (
                    <div className="space-y-1">
                      <p className="text-xs font-bold text-primary truncate">{selectedFile.name}</p>
                      <p className="text-[10px] text-slate-400">{(selectedFile.size / 1024).toFixed(1)} KB</p>
                    </div>
                  ) : (
                    <div className="space-y-1 text-slate-500">
                      <p className="text-xs font-bold">Sélectionner un fichier JSON</p>
                      <p className="text-[10px] text-slate-400">Cliquez pour parcourir vos fichiers</p>
                    </div>
                  )}
                </div>

                {selectedFile && (
                  <button
                    onClick={handleRestore}
                    disabled={importing}
                    className="w-full bg-red-650 text-white font-bold py-3 px-4 rounded-xl hover:bg-red-700 disabled:bg-slate-350 disabled:cursor-not-allowed transition-colors cursor-pointer text-sm"
                  >
                    {importing ? 'Restauration...' : 'Restaurer maintenant'}
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Warning Box */}
          <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-xl">
            <div className="flex gap-3">
              <span className="text-xl">⚠️</span>
              <div>
                <h4 className="font-extrabold text-red-900 text-sm">AVERTISSEMENT DE SÉCURITÉ</h4>
                <p className="text-xs text-red-700 mt-1 leading-relaxed">
                  La restauration de base de données est une opération destructrice qui écrase les informations d'inscriptions, de plannings et de commandes en cours. Veillez à ce qu'aucun utilisateur ne passe commande ou ne modifie le planning pendant que vous effectuez cette opération. Il est fortement conseillé de faire une sauvegarde de la base actuelle avant d'importer un ancien fichier.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Colonne droite : OVH VPS Automated Backups */}
        <div className="space-y-6">
          <div className="card p-6 space-y-5 border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <span className="text-2xl">🛡️</span>
                <h3 className="text-lg font-extrabold text-slate-800 mt-1">Sauvegardes Automatiques VPS</h3>
                <p className="text-[10px] text-slate-400 uppercase font-semibold">Option OVHcloud active</p>
              </div>
              <button 
                onClick={() => setShowOvhConfig(!showOvhConfig)}
                className="text-xs font-bold text-slate-500 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer"
              >
                ⚙️ Configurer
              </button>
            </div>

            {/* Mode configuration */}
            {showOvhConfig ? (
              <form onSubmit={handleSaveOvhSettings} className="space-y-4 text-xs">
                <h4 className="font-bold text-slate-700 uppercase tracking-wider text-[10px]">Identifiants API OVH</h4>
                
                <div className="space-y-1">
                  <label className="block font-semibold text-slate-600">Nom du Service (VPS)</label>
                  <input 
                    type="text" required value={serviceName} onChange={(e) => setServiceName(e.target.value)}
                    className="input w-full p-2.5 rounded-xl border border-slate-200" placeholder="vps-xxxx.vps.ovh.net" 
                  />
                </div>

                <div className="space-y-1">
                  <label className="block font-semibold text-slate-600">Application Key (AK)</label>
                  <input 
                    type="text" required value={appKey} onChange={(e) => setAppKey(e.target.value)}
                    className="input w-full p-2.5 rounded-xl border border-slate-200" placeholder="Ex: e61e967a58a74e2d" 
                  />
                </div>

                <div className="space-y-1">
                  <label className="block font-semibold text-slate-600">Application Secret (AS)</label>
                  <input 
                    type="password" required value={appSecret} onChange={(e) => setAppSecret(e.target.value)}
                    className="input w-full p-2.5 rounded-xl border border-slate-200" placeholder="Masqué" 
                  />
                </div>

                <div className="space-y-1">
                  <label className="block font-semibold text-slate-600">Consumer Key (CK)</label>
                  <input 
                    type="text" required value={consumerKey} onChange={(e) => setConsumerKey(e.target.value)}
                    className="input w-full p-2.5 rounded-xl border border-slate-200" placeholder="Ex: ac1398c257b85e3a" 
                  />
                </div>

                <div className="flex gap-2 pt-2">
                  <button 
                    type="submit" disabled={savingOvh}
                    className="flex-1 bg-slate-900 text-white font-bold py-2.5 rounded-xl hover:bg-slate-800 transition-colors cursor-pointer text-center"
                  >
                    {savingOvh ? 'Enregistrement...' : 'Sauvegarder'}
                  </button>
                  <button 
                    type="button" onClick={() => setShowOvhConfig(false)}
                    className="bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold px-4 py-2.5 rounded-xl transition-colors cursor-pointer"
                  >
                    Annuler
                  </button>
                </div>
              </form>
            ) : (
              <div className="space-y-4">
                {ovhLoading ? (
                  <div className="flex flex-col items-center justify-center py-6 text-slate-400 space-y-2">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-slate-350" />
                    <p className="text-[10px] font-semibold uppercase">Connexion aux API OVH...</p>
                  </div>
                ) : ovhError ? (
                  <div className="bg-red-50 border border-red-100 text-red-800 rounded-xl p-3.5 text-xs">
                    <p className="font-bold">⚠️ Erreur de synchronisation</p>
                    <p className="text-[10px] text-red-700 mt-1 leading-normal">{ovhError}</p>
                    <button 
                      onClick={() => setShowOvhConfig(true)}
                      className="mt-3 text-[10px] font-bold underline hover:text-red-950 cursor-pointer block"
                    >
                      Mettre à jour les identifiants API
                    </button>
                  </div>
                ) : !ovhConfigured ? (
                  <div className="bg-slate-50 border border-slate-100 text-slate-700 rounded-xl p-4 text-xs text-center space-y-3">
                    <p className="font-semibold">Les sauvegardes automatisées ne sont pas encore liées à ce tableau de bord.</p>
                    <button 
                      onClick={() => setShowOvhConfig(true)}
                      className="btn-primary py-2 px-4 rounded-xl text-[11px] font-bold cursor-pointer"
                    >
                      Configurer l'option backup
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Status badges */}
                    <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3 flex items-start gap-3">
                      <span className="text-emerald-500 text-lg">✓</span>
                      <div className="text-xs">
                        <p className="font-bold text-emerald-950">Option activée chez OVH</p>
                        <p className="text-[10px] text-emerald-800 mt-0.5">VPS cible : {serviceName}</p>
                      </div>
                    </div>

                    {/* Restore Points List */}
                    <div className="space-y-2">
                      <h4 className="font-bold text-slate-500 uppercase tracking-widest text-[9px]">Points de Restauration Disponibles :</h4>
                      {restorePoints.length > 0 ? (
                        <div className="overflow-x-auto border border-slate-150 rounded-xl">
                          <table className="min-w-full divide-y divide-slate-150 text-xs bg-white">
                            <thead className="bg-slate-50">
                              <tr>
                                <th className="px-3 py-2 text-left font-bold text-slate-400 uppercase tracking-wider text-[9px]">Date</th>
                                <th className="px-3 py-2 text-right font-bold text-slate-400 uppercase tracking-wider text-[9px]">Action</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {restorePoints.map((dateStr) => (
                                <tr key={dateStr} className="hover:bg-slate-50">
                                  <td className="px-3 py-2.5 font-medium text-slate-800 whitespace-nowrap">
                                    📅 {new Date(dateStr).toLocaleString('fr-FR', {
                                      day: '2-digit',
                                      month: '2-digit',
                                      year: 'numeric',
                                      hour: '2-digit',
                                      minute: '2-digit'
                                    })}
                                  </td>
                                  <td className="px-3 py-2.5 text-right">
                                    <button
                                      onClick={() => handleOvhRestore(dateStr)}
                                      disabled={restoringOvh !== null}
                                      className="bg-red-50 hover:bg-red-100 text-red-700 font-bold px-2.5 py-1 rounded-lg transition-colors cursor-pointer text-[10px]"
                                    >
                                      {restoringOvh === dateStr ? 'En cours...' : 'Restaurer'}
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <p className="text-xs text-slate-400 italic">Aucun point de restauration disponible.</p>
                      )}
                    </div>

                    <div className="text-[10px] text-slate-400 leading-normal">
                      ℹ️ Les sauvegardes automatiques sont conservées temporairement par OVH et permettent de restaurer le serveur complet en cas d'incident majeur.
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  )
}
