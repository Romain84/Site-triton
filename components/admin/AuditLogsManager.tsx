'use client'

import { useState, useEffect, useCallback } from 'react'

interface AuditLog {
  id: string
  action: string
  actorId: string | null
  actorRole: string | null
  targetType: string | null
  targetId: string | null
  details: string | null
  timestamp: string
}

export default function AuditLogsManager() {
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [actionFilter, setActionFilter] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null)

  const limit = 20

  const fetchLogs = useCallback(async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      })
      if (search) params.append('search', search)
      if (actionFilter) params.append('action', actionFilter)

      const response = await fetch(`/api/admin/audit-logs?${params.toString()}`)
      if (response.ok) {
        const data = await response.json()
        setLogs(data.logs)
        setTotalPages(data.totalPages)
        setTotal(data.total)
      } else {
        setError('Impossible de récupérer le journal d\'audit')
      }
    } catch {
      setError('Erreur lors du chargement du journal d\'audit')
    } finally {
      setLoading(false)
    }
  }, [page, search, actionFilter])

  useEffect(() => {
    fetchLogs()
  }, [fetchLogs])

  // Reset page when search or filters change
  const handleSearchChange = (val: string) => {
    setSearch(val)
    setPage(1)
  }

  const handleActionFilterChange = (val: string) => {
    setActionFilter(val)
    setPage(1)
  }

  const formatDetails = (detailsStr: string | null) => {
    if (!detailsStr) return 'Aucun détail'
    try {
      const parsed = JSON.parse(detailsStr)
      return JSON.stringify(parsed, null, 2)
    } catch {
      return detailsStr
    }
  }

  return (
    <div>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-bold">Journal d'Audit de Sécurité</h2>
          <p className="text-gray-600 text-sm mt-1">
            Visualisez et filtrez l'ensemble des actions d'administration sensibles réalisées sur la plateforme
          </p>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6 rounded">
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {/* Filters & Search */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="relative">
          <input
            type="text"
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Rechercher (action, rôle, cible...)"
            className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent text-sm"
          />
          <span className="absolute left-3.5 top-3 text-slate-400">🔍</span>
        </div>

        <div>
          <select
            value={actionFilter}
            onChange={(e) => handleActionFilterChange(e.target.value)}
            className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent text-sm"
          >
            <option value="">Tous les types d'actions</option>
            <option value="system.error">🔴 Erreurs Système (system.error)</option>
            <option value="system.warn">🟡 Avertissements Système (system.warn)</option>
            <option value="system.info">🔵 Infos Système (system.info)</option>
            <option value="upload.image.success">🟢 Upload Image (Réussi)</option>
            <option value="upload.image.error">🔴 Upload Image (Échec / Erreur)</option>
            <option value="upload.logo.success">🟢 Upload Logo (Réussi)</option>
            <option value="upload.logo.error">🔴 Upload Logo (Échec / Erreur)</option>
            <option value="seance_annulee.create">Création Séance Annulée</option>
            <option value="seance_annulee.delete">Suppression Séance Annulée</option>
            <option value="facture.auto_generate_all">Génération Factures Coachs (Masse)</option>
            <option value="facture.workflow.update">Mise à jour Statut Facture Coach</option>
            <option value="don.create">Création Don</option>
            <option value="don.cancel">Annulation Don</option>
          </select>
        </div>

        <div className="flex items-center justify-end text-sm text-slate-500 font-medium">
          {total} enregistrement(s) trouvé(s)
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <span className="ml-3 text-gray-600">Chargement des logs...</span>
        </div>
      ) : (
        <div className="card overflow-hidden bg-white rounded-xl border border-slate-200 shadow-md">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left py-3 px-4 font-semibold text-slate-700 text-sm">Date & Heure</th>
                  <th className="text-left py-3 px-4 font-semibold text-slate-700 text-sm">Action</th>
                  <th className="text-left py-3 px-4 font-semibold text-slate-700 text-sm">Acteur / Rôle</th>
                  <th className="text-left py-3 px-4 font-semibold text-slate-700 text-sm">Cible / Type</th>
                  <th className="text-center py-3 px-4 font-semibold text-slate-700 text-sm">Détails</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => {
                  let badgeStyle = "bg-slate-100 border-slate-200 text-slate-800"
                  if (log.action.includes('error')) {
                    badgeStyle = "bg-red-50 border-red-200 text-red-700 font-bold"
                  } else if (log.action.includes('warn')) {
                    badgeStyle = "bg-amber-50 border-amber-200 text-amber-800 font-bold"
                  } else if (log.action.includes('success') || log.action.includes('create')) {
                    badgeStyle = "bg-emerald-50 border-emerald-200 text-emerald-800 font-semibold"
                  } else if (log.action.startsWith('system.')) {
                    badgeStyle = "bg-sky-50 border-sky-200 text-sky-800 font-semibold"
                  }

                  return (
                    <tr key={log.id} className="border-t border-slate-100 hover:bg-slate-50/50 transition-colors">
                      <td className="py-3.5 px-4 text-slate-600 text-sm font-medium">
                        {new Date(log.timestamp).toLocaleString('fr-FR')}
                      </td>
                      <td className="py-3.5 px-4 text-sm">
                        <span className={`border px-2 py-0.5 rounded font-mono text-xs ${badgeStyle}`}>
                          {log.action}
                        </span>
                      </td>
                    <td className="py-3.5 px-4 text-sm">
                      <div className="font-semibold text-slate-800">
                        {log.actorId ? `ID: ${log.actorId.slice(-6).toUpperCase()}` : 'Système'}
                      </div>
                      {log.actorRole && (
                        <div className="text-slate-400 text-xs font-semibold uppercase tracking-wider">
                          {log.actorRole}
                        </div>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-sm">
                      {log.targetType ? (
                        <>
                          <div className="font-semibold text-slate-800">{log.targetType}</div>
                          {log.targetId && (
                            <div className="text-slate-400 font-mono text-xs">{log.targetId.slice(-8)}</div>
                          )}
                        </>
                      ) : (
                        <span className="text-slate-400 italic">Aucune</span>
                      )}
                    </td>
                      <td className="py-3.5 px-4 text-center">
                        <button
                          onClick={() => setSelectedLog(log)}
                          className="text-primary hover:text-primary-dark hover:bg-primary-50 border border-primary/20 bg-primary/5 px-3 py-1 rounded-lg text-xs font-bold transition-colors"
                        >
                          Inspecter
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {logs.length === 0 && (
            <div className="text-center py-16 text-slate-400 bg-slate-50/50">
              <p className="text-4xl mb-3">🔍</p>
              <p className="font-semibold">Aucun log enregistré</p>
              <p className="text-xs mt-1 max-w-xs mx-auto">
                Aucune action correspondante n'a pu être trouvée avec vos critères de recherche.
              </p>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="bg-slate-50 border-t border-slate-200 px-4 py-3.5 flex items-center justify-between">
              <button
                onClick={() => setPage((p) => Math.max(p - 1, 1))}
                disabled={page === 1}
                className="px-3.5 py-1.5 bg-white border border-slate-300 rounded-lg text-sm font-semibold hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
              >
                Précédent
              </button>
              <span className="text-sm font-semibold text-slate-600">
                Page {page} sur {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
                disabled={page === totalPages}
                className="px-3.5 py-1.5 bg-white border border-slate-300 rounded-lg text-sm font-semibold hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
              >
                Suivant
              </button>
            </div>
          )}
        </div>
      )}

      {/* Inspect Modal */}
      {selectedLog && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden border border-slate-100 flex flex-col max-h-[85vh]">
            <div className="p-5 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
              <div>
                <h3 className="font-bold text-slate-800 text-lg">Détails de l'Action</h3>
                <p className="text-xs font-mono text-slate-400 mt-0.5">ID Log: {selectedLog.id}</p>
              </div>
              <button
                onClick={() => setSelectedLog(null)}
                className="text-slate-400 hover:text-slate-600 bg-slate-200/50 hover:bg-slate-200 w-8 h-8 rounded-full flex items-center justify-center transition-colors font-bold text-sm"
              >
                ✕
              </button>
            </div>
            <div className="p-6 overflow-y-auto space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="block text-xs text-slate-400 uppercase tracking-wider font-semibold">Date & Heure</span>
                  <span className="font-semibold text-slate-700">{new Date(selectedLog.timestamp).toLocaleString('fr-FR')}</span>
                </div>
                <div>
                  <span className="block text-xs text-slate-400 uppercase tracking-wider font-semibold">Action</span>
                  <span className="font-mono text-xs bg-slate-100 px-1.5 py-0.5 rounded text-slate-800 font-semibold">{selectedLog.action}</span>
                </div>
                <div>
                  <span className="block text-xs text-slate-400 uppercase tracking-wider font-semibold">Acteur</span>
                  <span className="font-semibold text-slate-700">{selectedLog.actorId ? `ID: ${selectedLog.actorId}` : 'Système'}</span>
                </div>
                <div>
                  <span className="block text-xs text-slate-400 uppercase tracking-wider font-semibold font-semibold">Rôle Acteur</span>
                  <span className="font-semibold text-slate-700 capitalize">{selectedLog.actorRole || 'N/A'}</span>
                </div>
              </div>

              <div>
                <span className="block text-xs text-slate-400 uppercase tracking-wider font-semibold mb-1">Cible</span>
                <p className="text-slate-700 font-medium">
                  {selectedLog.targetType ? `${selectedLog.targetType} (ID: ${selectedLog.targetId})` : 'Aucune cible'}
                </p>
              </div>

              <div>
                <span className="block text-xs text-slate-400 uppercase tracking-wider font-semibold mb-2">Variables / Payload d'Action</span>
                <pre className="bg-slate-900 text-emerald-400 p-4 rounded-xl font-mono text-xs overflow-x-auto max-h-[300px] shadow-inner">
                  {formatDetails(selectedLog.details)}
                </pre>
              </div>
            </div>
            <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex justify-end">
              <button
                onClick={() => setSelectedLog(null)}
                className="px-5 py-2 bg-slate-800 text-white rounded-xl hover:bg-slate-900 font-semibold transition-colors"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
