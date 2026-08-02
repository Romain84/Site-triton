'use client'

import { useState, useEffect } from 'react'
import { toast } from 'react-hot-toast'

interface BackupItem {
  filename: string
  sizeBytes: number
  createdAt: string
  source: 'auto' | 'manual'
  counts: {
    groupes: number
    plannings: number
    inscriptions: number
    presences: number
    users: number
  }
}

export default function BackupManager() {
  const [backups, setBackups] = useState<BackupItem[]>([])
  const [oneDrivePath, setOneDrivePath] = useState<string>('')
  const [loading, setLoading] = useState<boolean>(true)
  const [creating, setCreating] = useState<boolean>(false)

  const fetchBackups = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/admin/backups')
      const data = await res.json()
      if (res.ok && data.success) {
        setBackups(data.backups || [])
        setOneDrivePath(data.oneDrivePath || '')
      } else {
        toast.error(data.error || 'Erreur lors du chargement des sauvegardes')
      }
    } catch {
      toast.error('Erreur réseau lors de la récupération des sauvegardes')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchBackups()
  }, [])

  const handleCreateBackup = async () => {
    try {
      setCreating(true)
      const res = await fetch('/api/admin/backups', { method: 'POST' })
      const data = await res.json()
      if (res.ok && data.success) {
        toast.success('Sauvegarde créée et enregistrée sur OneDrive ! ☁️')
        setBackups(data.backups || [])
      } else {
        toast.error(data.error || 'Erreur lors de la sauvegarde')
      }
    } catch {
      toast.error('Erreur réseau lors de la création de la sauvegarde')
    } finally {
      setCreating(false)
    }
  }

  const handleDeleteBackup = async (filename: string) => {
    if (!confirm(`Voulez-vous vraiment supprimer la sauvegarde ${filename} de OneDrive ?`)) return

    try {
      const res = await fetch(`/api/admin/backups?filename=${encodeURIComponent(filename)}`, { method: 'DELETE' })
      const data = await res.json()
      if (res.ok && data.success) {
        toast.success('Sauvegarde supprimée de OneDrive')
        setBackups(data.backups || [])
      } else {
        toast.error(data.error || 'Erreur lors de la suppression')
      }
    } catch {
      toast.error('Erreur réseau lors de la suppression')
    }
  }

  const formatSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
  }

  const formatDate = (isoStr: string): string => {
    try {
      const d = new Date(isoStr)
      return d.toLocaleString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      })
    } catch {
      return isoStr
    }
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {/* En-tête Statut OneDrive */}
      <div className="bg-gradient-to-r from-blue-900 via-slate-900 to-indigo-950 text-white rounded-3xl p-6 md:p-8 shadow-md border border-blue-800/40 relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 bg-cyan-400/20 text-cyan-300 rounded-full text-xs font-black uppercase tracking-wider border border-cyan-400/30 flex items-center gap-1.5">
                ☁️ OneDrive Cloud Sync • Triton Club Cavaillon
              </span>
            </div>
            <h2 className="text-2xl md:text-3xl font-black tracking-tight text-white">
              Sauvegardes Automatiques Quotidiennes
            </h2>
            <p className="text-blue-200/80 text-xs md:text-sm font-medium leading-relaxed max-w-2xl">
              Chaque jour, une sauvegarde complète est générée et conservée dans l&apos;historique des <strong>10 sauvegardes glissantes</strong>. Les fichiers sont stockés directement dans votre dossier OneDrive.
            </p>
            {oneDrivePath && (
              <p className="text-[11px] font-mono text-cyan-200/90 bg-slate-950/60 px-3 py-1.5 rounded-xl inline-block border border-slate-800 break-all">
                📁 {oneDrivePath}
              </p>
            )}
          </div>

          <button
            onClick={handleCreateBackup}
            disabled={creating}
            className="px-6 py-3.5 bg-gradient-to-r from-cyan-400 to-blue-500 hover:from-cyan-300 hover:to-blue-400 text-slate-950 font-black text-xs uppercase tracking-wider rounded-2xl shadow-lg transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 shrink-0 cursor-pointer text-center"
          >
            {creating ? '⚡ Sauvegarde en cours...' : '⚡ Sauvegarder sur OneDrive maintenant'}
          </button>
        </div>
      </div>

      {/* Liste de l'historique des 10 sauvegardes */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-6 md:p-8 shadow-xs space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              <span>📚 Historique des Sauvegardes</span>
              <span className="text-xs bg-slate-100 text-slate-700 px-2.5 py-0.5 rounded-full font-black">
                {backups.length} / 10 max
              </span>
            </h3>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Les 10 plus récentes sauvegardes sont conservées automatiquement. Les plus anciennes sont nettoyées au fil du temps.
            </p>
          </div>

          <button
            onClick={fetchBackups}
            disabled={loading}
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors cursor-pointer"
          >
            🔄 Actualiser
          </button>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-400 font-bold text-sm">
            Chargement des sauvegardes OneDrive...
          </div>
        ) : backups.length === 0 ? (
          <div className="p-12 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200 space-y-3">
            <p className="text-3xl">☁️</p>
            <p className="text-slate-800 font-black text-sm">Aucune sauvegarde trouvée</p>
            <p className="text-slate-400 text-xs">Cliquez sur le bouton ci-dessus pour lancer votre première sauvegarde OneDrive.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {backups.map((item) => (
              <div
                key={item.filename}
                className="flex flex-col md:flex-row md:items-center justify-between p-4 md:p-5 rounded-2xl border border-slate-200/70 hover:border-slate-300 bg-slate-50/50 hover:bg-slate-50 transition-all gap-4"
              >
                <div className="space-y-1.5 min-w-0">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <span className="font-mono font-bold text-xs md:text-sm text-slate-900 truncate">
                      {item.filename}
                    </span>
                    <span className={`px-2 py-0.5 rounded-md text-[9.5px] font-black uppercase tracking-wider ${
                      item.source === 'auto'
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-indigo-100 text-indigo-800'
                    }`}>
                      {item.source === 'auto' ? '🤖 Automatique' : '👤 Manuelle'}
                    </span>
                    <span className="text-xs text-slate-400 font-mono">
                      {formatSize(item.sizeBytes)}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 text-[11px] text-slate-500 font-medium flex-wrap">
                    <span>📅 {formatDate(item.createdAt)}</span>
                    <span>•</span>
                    <span className="text-slate-700 font-semibold">
                      {item.counts.groupes} Groupes | {item.counts.plannings} Plannings | {item.counts.inscriptions} Inscriptions | {item.counts.presences} Présences
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <a
                    href={`/api/admin/backups/${encodeURIComponent(item.filename)}/download`}
                    className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer flex items-center gap-1"
                    title="Télécharger sur votre ordinateur"
                  >
                    <span>📥 Télécharger</span>
                  </a>
                  <button
                    onClick={() => handleDeleteBackup(item.filename)}
                    className="px-3 py-2 bg-red-50 hover:bg-red-100 text-red-700 font-bold text-xs rounded-xl transition-colors cursor-pointer"
                    title="Supprimer cette sauvegarde"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
