'use client'

import { useState, useEffect, useCallback } from 'react'
import toast from 'react-hot-toast'
import { useConfirmDialog } from '@/components/ConfirmDialog'

interface TokenLog {
  id: string
  modelName: string
  promptTokens: number
  completionTokens: number
  totalTokens: number
  createdAt: string
  cost: number
}

interface StatsGroup {
  count: number
  promptTokens: number
  completionTokens: number
  totalTokens: number
  cost: number
}

interface StatsResponse {
  global: StatsGroup
  month: StatsGroup
  recentLogs: TokenLog[]
  activeModel?: string
  monthlyLimit?: number
}

const MONTHLY_LIMIT = 500000 // 500k tokens par défaut

export default function ChatbotStatsManager() {
  const [data, setData] = useState<StatsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const { confirm } = useConfirmDialog()

  const fetchStats = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/admin/chatbot-stats', { credentials: 'include' })
      if (res.ok) {
        const json = await res.json()
        setData(json)
      } else {
        const errData = await res.json()
        setError(errData.error || 'Erreur lors du chargement des statistiques')
      }
    } catch {
      setError('Erreur réseau lors du chargement des statistiques')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchStats()
  }, [fetchStats])

  const handleResetLogs = async () => {
    const confirmed = await confirm({
      title: 'Réinitialiser l\'historique',
      message: 'Êtes-vous sûr de vouloir vider le journal de consommation des tokens ? Cette action est irréversible.',
      confirmText: 'Réinitialiser',
      variant: 'danger',
    })
    if (!confirmed) return

    try {
      const res = await fetch('/api/admin/chatbot-stats', {
        method: 'DELETE',
        credentials: 'include',
      })
      if (res.ok) {
        toast.success('Historique réinitialisé')
        fetchStats()
      } else {
        const errData = await res.json()
        toast.error(errData.error || 'Erreur lors de la réinitialisation')
      }
    } catch {
      toast.error('Erreur de connexion')
    }
  }

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
          <p className="mt-3 text-slate-500 font-medium text-xs">Chargement des statistiques...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 text-red-650 p-6 rounded-xl border border-red-100 text-center">
        <p className="font-semibold">{error}</p>
        <button
          onClick={fetchStats}
          className="mt-3 px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-bold hover:bg-red-700 transition-colors"
        >
          Réessayer
        </button>
      </div>
    )
  }

  const monthlyLimit = data?.monthlyLimit || 500000
  const monthUsage = data?.month.totalTokens || 0
  const monthPercentage = Math.min(100, (monthUsage / monthlyLimit) * 100)
  const averageTokens = data?.global.count ? Math.round(data.global.totalTokens / data.global.count) : 0

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Usage & Quotas Chatbot</h2>
          <p className="text-sm text-gray-550">Suivez la consommation de tokens et estimez les coûts de l'assistant IA.</p>
        </div>
        <button
          onClick={handleResetLogs}
          disabled={!data || data.global.count === 0}
          className="px-4 py-2 text-xs font-bold text-red-600 border border-red-200 bg-red-50 rounded-lg hover:bg-red-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          🗑️ Vider l'historique
        </button>
      </div>

      {/* Quota Monthly Gauge */}
      <div className="card p-6 flex flex-col md:flex-row items-center gap-6">
        <div className="relative flex items-center justify-center w-36 h-36">
          <svg className="w-full h-full transform -rotate-90">
            <circle
              cx="72"
              cy="72"
              r="60"
              className="stroke-slate-100"
              strokeWidth="12"
              fill="transparent"
            />
            <circle
              cx="72"
              cy="72"
              r="60"
              className={`transition-all duration-1000 ease-out ${
                monthPercentage >= 90
                  ? 'stroke-red-500'
                  : monthPercentage >= 75
                  ? 'stroke-amber-500'
                  : 'stroke-primary'
              }`}
              strokeWidth="12"
              fill="transparent"
              strokeDasharray={String(2 * Math.PI * 60)}
              strokeDashoffset={String(2 * Math.PI * 60 * (1 - monthPercentage / 100))}
              strokeLinecap="round"
            />
          </svg>
          <div className="absolute flex flex-col items-center justify-center text-center">
            <span className="text-2xl font-black text-slate-800">{monthPercentage.toFixed(0)}%</span>
            <span className="text-[10px] uppercase font-bold text-slate-400">Quota</span>
          </div>
        </div>

        <div className="flex-1 space-y-3 w-full">
          <div className="flex justify-between items-end">
            <div>
              <h3 className="font-extrabold text-slate-800 text-lg">Consommation du mois</h3>
              <p className="text-xs text-slate-500">Mise à jour à chaque appel.</p>
            </div>
             <div className="text-right">
              <span className="font-bold text-slate-900 font-mono">{monthUsage.toLocaleString('fr-FR')}</span>
              <span className="text-slate-400 text-xs"> / {monthlyLimit.toLocaleString('fr-FR')} tokens ({data?.activeModel || 'mistral-small'})</span>
            </div>
          </div>
          <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-1000 ${
                monthPercentage >= 90
                  ? 'bg-red-500'
                  : monthPercentage >= 75
                  ? 'bg-amber-500'
                  : 'bg-primary'
              }`}
              style={{ width: `${monthPercentage}%` }}
            />
          </div>
          <div className="text-xs text-slate-500">
            {monthPercentage >= 90 ? (
              <span className="text-red-650 font-bold">⚠️ Attention, vous approchez de la limite d'utilisation recommandée pour ce mois.</span>
            ) : (
               <span>Le quota de votre modèle ({data?.activeModel || 'mistral-small'}) est réinitialisé le 1er de chaque mois. En cas de dépassement, le chat est bloqué automatiquement.</span>
            )}
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
        <div className="card p-4 flex flex-col justify-between">
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Requêtes Totales</div>
          <div>
            <div className="text-2xl font-black text-slate-800 font-mono">{data?.global.count}</div>
            <div className="text-xs text-slate-500 mt-1">{data?.month.count} ce mois-ci</div>
          </div>
        </div>

        <div className="card p-4 flex flex-col justify-between">
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Coût Estimé (TTC)</div>
          <div>
            <div className="text-2xl font-black text-emerald-600 font-mono">
              {data?.global.cost.toFixed(3)} €
            </div>
            <div className="text-xs text-slate-500 mt-1">{data?.month.cost.toFixed(3)} € ce mois-ci</div>
          </div>
        </div>

        <div className="card p-4 flex flex-col justify-between">
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Tokens Historiques</div>
          <div>
            <div className="text-2xl font-black text-slate-800 font-mono">
              {data?.global.totalTokens.toLocaleString('fr-FR')}
            </div>
            <div className="text-xs text-slate-500 mt-1">
              {Math.round((data?.global.promptTokens || 0) / 1000)}k In / {Math.round((data?.global.completionTokens || 0) / 1000)}k Out
            </div>
          </div>
        </div>

        <div className="card p-4 flex flex-col justify-between">
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Moyenne par Requête</div>
          <div>
            <div className="text-2xl font-black text-slate-800 font-mono">
              {averageTokens.toLocaleString('fr-FR')}
            </div>
            <div className="text-xs text-slate-500 mt-1">tokens / appel</div>
          </div>
        </div>
      </div>

      {/* History table */}
      <div className="card overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex justify-between items-center">
          <h3 className="font-extrabold text-slate-800">Historique des Appels Récents</h3>
          <span className="text-xs bg-slate-100 text-slate-600 px-2.5 py-1 rounded-full font-bold font-mono">
            100 derniers logs
          </span>
        </div>

        {data?.recentLogs.length === 0 ? (
          <div className="p-8 text-center text-slate-550">Aucun appel enregistré pour le moment.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50/50">
                <tr className="text-slate-500 font-bold border-b">
                  <th className="text-left p-4">Date / Heure</th>
                  <th className="text-left p-4">Modèle</th>
                  <th className="text-right p-4">Prompt (In)</th>
                  <th className="text-right p-4">Completion (Out)</th>
                  <th className="text-right p-4">Total Tokens</th>
                  <th className="text-right p-4">Coût Estimé</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono text-xs">
                {data?.recentLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/30">
                    <td className="p-4 text-slate-700">
                      {new Date(log.createdAt).toLocaleString('fr-FR')}
                    </td>
                    <td className="p-4">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 uppercase border border-slate-200">
                        {log.modelName}
                      </span>
                    </td>
                    <td className="p-4 text-right text-slate-500">
                      {log.promptTokens.toLocaleString('fr-FR')}
                    </td>
                    <td className="p-4 text-right text-slate-500">
                      {log.completionTokens.toLocaleString('fr-FR')}
                    </td>
                    <td className="p-4 text-right font-bold text-slate-800">
                      {log.totalTokens.toLocaleString('fr-FR')}
                    </td>
                    <td className="p-4 text-right text-emerald-600 font-bold">
                      {log.cost.toFixed(5)} €
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
