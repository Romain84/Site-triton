'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import toast from 'react-hot-toast'
import { useConfirmDialog } from '@/components/ConfirmDialog'
import { Download, RefreshCw, HardDrive, ShieldCheck, Database, AlertTriangle, FileArchive, CheckCircle2 } from 'lucide-react'

interface BackupItem {
  filename: string
  size: number
  sizeFormatted: string
  createdAt: string
  timestamp: number
}

export default function DatabaseManager() {
  const [importing, setImporting] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { confirm } = useConfirmDialog()

  // Backups .sql.gz
  const [backups, setBackups] = useState<BackupItem[]>([])
  const [loadingBackups, setLoadingBackups] = useState(true)
  const [creatingBackup, setCreatingBackup] = useState(false)

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

  const fetchBackups = useCallback(async () => {
    setLoadingBackups(true)
    try {
      const res = await fetch('/api/admin/database/backups')
      if (res.ok) {
        const data = await res.json()
        setBackups(data.backups || [])
      }
    } catch {
      console.error('Erreur chargement backups')
    } finally {
      setLoadingBackups(false)
    }
  }, [])

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
    fetchBackups()
    fetchOvhData()
  }, [fetchBackups, fetchOvhData])

  const handleCreateInstantBackup = async () => {
    setCreatingBackup(true)
    const toastId = toast.loading('Création du snapshot .sql.gz en cours...')
    try {
      const res = await fetch('/api/admin/database/backups', { method: 'POST' })
      const data = await res.json()
      if (res.ok) {
        toast.success(data.message || 'Sauvegarde créée avec succès !', { id: toastId })
        fetchBackups()
      } else {
        toast.error(data.error || 'Erreur lors de la création', { id: toastId })
      }
    } catch {
      toast.error('Erreur réseau', { id: toastId })
    } finally {
      setCreatingBackup(false)
    }
  }

  const handleDownloadBackup = (filename: string) => {
    window.open(`/api/admin/database/backups/${filename}`, '_blank')
  }

  const handleExport = async () => {
    try {
      toast.loading('Génération de la sauvegarde JSON...', { id: 'backup' })
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
      title: '🚨 ATTENTION : RESTAURATION DE LA BASE DE DONNÉES 🚨',
      message: 'Cette action va ÉCRASER l\'ensemble de la base de données actuelle pour y injecter les données du fichier sélectionné. Toutes les modifications effectuées depuis cette sauvegarde seront définitivement perdues. Êtes-vous ABSOLUMENT sûr de vouloir continuer ?',
      confirmText: 'Oui, écraser et restaurer',
      variant: 'danger',
    })

    if (!confirmed) return

    setImporting(true)
    const toastId = toast.loading('Restauration en cours... Veuillez patienter.', { duration: 0 })

    try {
      const fileContent = await selectedFile.text()
      const parsedData = JSON.parse(fileContent)

      const response = await fetch('/api/admin/database', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parsedData),
      })

      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Erreur lors de la restauration')

      toast.success(result.message || 'Base de données restaurée avec succès !', { id: toastId })
      setSelectedFile(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
    } catch (err: any) {
      toast.error(err.message || 'Échec de la restauration.', { id: toastId })
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
        <h2 className="text-2xl font-black text-slate-900">Sauvegarde & Restauration</h2>
        <p className="text-sm text-slate-500 font-medium">
          Gérez l&apos;historique sur 10 jours de vos sauvegardes PostgreSQL (.sql.gz), vos exports JSON et la protection VPS.
        </p>
      </div>

      {/* SECTION 1: HISTORIQUE DES SAUVEGARDES .SQL.GZ SUR 10 JOURS */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-7 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-cyan-50 rounded-2xl text-cyan-700">
              <FileArchive className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-black text-slate-900">Sauvegardes Automatiques Quotidiennes</h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-cyan-100 text-cyan-800">
                  Rétention 10 jours
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Fichiers compressés .sql.gz stockés sur le serveur et téléchargeables en 1 clic.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchBackups}
              disabled={loadingBackups}
              className="p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
              title="Rafraîchir la liste"
            >
              <RefreshCw className={`w-4 h-4 ${loadingBackups ? 'animate-spin' : ''}`} />
            </button>

            <button
              onClick={handleCreateInstantBackup}
              disabled={creatingBackup}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-950 hover:bg-slate-800 text-white text-xs font-black shadow-xs transition-all disabled:opacity-50"
            >
              <Database className="w-4 h-4 text-cyan-400" />
              <span>{creatingBackup ? 'Création...' : 'Créer une sauvegarde .sql.gz'}</span>
            </button>
          </div>
        </div>

        {/* LISTE DES SAUVEGARDES */}
        {loadingBackups ? (
          <div className="py-8 text-center text-slate-400 space-y-2">
            <RefreshCw className="w-5 h-5 animate-spin mx-auto text-cyan-600" />
            <p className="text-xs font-bold">Chargement des sauvegardes...</p>
          </div>
        ) : backups.length === 0 ? (
          <div className="py-8 text-center text-slate-500 bg-slate-50 rounded-2xl border border-slate-200/60 space-y-2">
            <p className="text-xs font-bold">Aucun fichier de sauvegarde dans l&apos;historique.</p>
            <p className="text-[11px] text-slate-400">Cliquez sur &quot;Créer une sauvegarde .sql.gz&quot; pour générer le premier snapshot.</p>
          </div>
        ) : (
          <div className="overflow-x-auto border border-slate-200 rounded-2xl">
            <table className="min-w-full divide-y divide-slate-100 text-xs">
              <thead className="bg-slate-50 font-black text-slate-400 uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="px-4 py-3 text-left">Date & Heure</th>
                  <th className="px-4 py-3 text-left">Nom du fichier</th>
                  <th className="px-4 py-3 text-left">Taille</th>
                  <th className="px-4 py-3 text-right">Téléchargement</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {backups.map((b) => (
                  <tr key={b.filename} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-4 py-3 text-slate-900 font-extrabold whitespace-nowrap">
                      📅 {new Date(b.createdAt).toLocaleString('fr-FR', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </td>
                    <td className="px-4 py-3 text-slate-600 font-mono text-[11px]">
                      {b.filename}
                    </td>
                    <td className="px-4 py-3 text-slate-700 font-bold whitespace-nowrap">
                      <span className="px-2 py-0.5 bg-slate-100 rounded-md text-[10px]">
                        {b.sizeFormatted}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <button
                        onClick={() => handleDownloadBackup(b.filename)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-950 hover:bg-slate-800 text-white font-bold text-[11px] transition-all shadow-2xs"
                      >
                        <Download className="w-3.5 h-3.5 text-cyan-400" />
                        <span>Télécharger</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Colonne gauche : Export/Import Local JSON */}
        <div className="lg:col-span-2 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Export Card */}
            <div className="card p-6 flex flex-col justify-between space-y-6 bg-white border border-slate-200 rounded-3xl">
              <div className="space-y-2">
                <div className="text-3xl">📥</div>
                <h3 className="text-lg font-extrabold text-slate-800">Exporter la base en JSON</h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Téléchargez un instantané complet de toutes les données du club (membres, plannings, commandes, configurations) au format JSON direct.
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
            <div className="card p-6 flex flex-col justify-between space-y-6 border-amber-100 bg-amber-50/10 rounded-3xl">
              <div className="space-y-2">
                <div className="text-3xl">📤</div>
                <h3 className="text-lg font-extrabold text-slate-800">Restaurer la base de données</h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Sélectionnez un fichier JSON précédemment exporté pour écraser la base de données actuelle et réimporter l&apos;historique complet.
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
                  La restauration est une opération destructrice qui écrase les données actuelles. Effectuez toujours une sauvegarde préalable avant de restaurer un ancien snapshot.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Colonne droite : OVH VPS Automated Backups */}
        <div className="space-y-6">
          <div className="card p-6 space-y-5 border border-slate-200 rounded-3xl bg-white">
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
                      Configurer l&apos;option backup
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3 flex items-start gap-3">
                      <span className="text-emerald-500 text-lg">✓</span>
                      <div className="text-xs">
                        <p className="font-bold text-emerald-950">Option activée chez OVH</p>
                        <p className="text-[10px] text-emerald-800 mt-0.5">VPS cible : {serviceName}</p>
                      </div>
                    </div>

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
