'use client'

import { useEffect, useState, useCallback, lazy, Suspense } from 'react'
import { useRouter } from 'next/navigation'
import { logger } from '@/lib/logger'
import { formatCompactDateFr } from '@/lib/date'

const ProfilsManager = lazy(() => import('@/components/admin/ProfilsManager'))
const FacturesManager = lazy(() => import('@/components/admin/FacturesManager'))
const FinancesManager = lazy(() => import('@/components/admin/FinancesManager'))
const GroupesManager = lazy(() => import('@/components/admin/GroupesManager'))
const ParametresManager = lazy(() => import('@/components/admin/ParametresManager'))
const PlanningTournantManager = lazy(() => import('@/components/admin/PlanningTournantManager'))
const PlanningFixeManager = lazy(() => import('@/components/admin/PlanningFixeManager'))
import EvenementsManager from '@/components/admin/EvenementsManager'
const ActualitesManager = lazy(() => import('@/components/admin/ActualitesManager'))
const GalerieManager = lazy(() => import('@/components/admin/GalerieManager'))
const VacancesManager = lazy(() => import('@/components/admin/VacancesManager'))
const CoutGroupes = lazy(() => import('@/components/admin/CoutGroupes'))
const RemplacementsManager = lazy(() => import('@/components/admin/RemplacementsManager'))
const ChatbotKnowledgeManager = lazy(() => import('@/components/admin/ChatbotKnowledgeManager'))
const AuditLogsManager = lazy(() => import('@/components/admin/AuditLogsManager'))
const ChatbotSuggestionsManager = lazy(() => import('@/components/admin/ChatbotSuggestionsManager'))
const ChatbotStatsManager = lazy(() => import('@/components/admin/ChatbotStatsManager'))
const DatabaseManager = lazy(() => import('@/components/admin/DatabaseManager'))
const InscriptionPageBuilder = lazy(() => import('@/components/admin/InscriptionPageBuilder'))
const DonsManager = lazy(() => import('@/components/admin/DonsManager'))
const SystemVersionsManager = lazy(() => import('@/components/admin/SystemVersionsManager'))
const PodiumsManager = lazy(() => import('@/components/admin/PodiumsManager'))

// Loading component
const TabLoading = () => (
  <div className="flex items-center justify-center min-h-[400px]">
    <div className="text-center">
      <div className="inline-block animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
      <p className="mt-3 text-slate-500 font-medium text-xs">Chargement du module...</p>
    </div>
  </div>
)

type Tab = 'dashboard' | 'profils' | 'podiums' | 'factures' | 'finances' | 'dons' | 'groupes' | 'remplacements' | 'cout-groupes' | 'planning-tournant' | 'planning-fixe' | 'evenements' | 'actualites' | 'galerie' | 'vacances' | 'chatbot' | 'chatbot-suggestions' | 'chatbot-stats' | 'audit-logs' | 'parametres' | 'database' | 'inscription-page' | 'system-versions'

const CATEGORIES = [
  {
    title: 'Général',
    items: [
      { id: 'dashboard', label: 'Dashboard', icon: '📊' },
      { id: 'factures', label: 'Factures', icon: '💰' },
      { id: 'finances', label: 'Finances', icon: '📈' },
      { id: 'dons', label: 'Dons & Reçus', icon: '🎗️' },
      { id: 'database', label: 'Sauvegardes & Base de données', icon: '💾' },
      { id: 'system-versions', label: 'Versions & Composants', icon: '📦' },
      { id: 'parametres', label: 'Paramètres', icon: '⚙️' },
      { id: 'audit-logs', label: 'Journal d\'Audit', icon: '🕵️‍♂️' }
    ]
  },
  {
    title: 'Sportif',
    items: [
      { id: 'profils', label: 'Profils', icon: '👥' },
      { id: 'podiums', label: 'Podiums & Bilan Saison', icon: '🏅' },
      { id: 'groupes', label: 'Groupes / Jauges', icon: '👥' },
      { id: 'remplacements', label: 'Remplacements', icon: '🔄' },
      { id: 'cout-groupes', label: 'Coût Groupes', icon: '💶' }
    ]
  },
  {
    title: 'Planning',
    items: [
      { id: 'planning-fixe', label: 'Planning Fixe', icon: '📅' },
      { id: 'planning-tournant', label: 'Planning Tournant', icon: '🔄' },
      { id: 'vacances', label: 'Vacances', icon: '🏖️' }
    ]
  },
  {
    title: 'Contenu',
    items: [
      { id: 'actualites', label: 'Actualités', icon: '📰' },
      { id: 'galerie', label: 'Galerie', icon: '🖼️' },
      { id: 'evenements', label: 'Événements', icon: '📆' },
      { id: 'inscription-page', label: 'Page Inscription', icon: '📋' }
    ]
  },
  {
    title: 'Intelligence',
    items: [
      { id: 'chatbot', label: 'Chatbot', icon: '🤖' },
      { id: 'chatbot-suggestions', label: 'Suggestions Chatbot', icon: '💡' },
      { id: 'chatbot-stats', label: 'Usage & Quotas', icon: '📊' }
    ]
  }
]

  export default function AdminPage() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<Tab>('dashboard')
  const [loading, setLoading] = useState(true)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [currentUser, setCurrentUser] = useState<{ id: string; email: string; role: string } | null>(null)

  // Persist active tab on reload / query params
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search)
      const tabParam = urlParams.get('tab') as Tab

      // Sécurité client : si superviseur, rediriger si tab finances manuellement ciblé
      if (currentUser?.role === 'superviseur' && ['finances', 'factures', 'cout-groupes'].includes(tabParam)) {
        setActiveTab('dashboard')
        localStorage.setItem('admin.activeTab', 'dashboard')
        return
      }

      if (tabParam) {
        setActiveTab(tabParam)
        localStorage.setItem('admin.activeTab', tabParam)
        return
      }

      const savedTab = localStorage.getItem('admin.activeTab') as Tab
      if (savedTab && !(currentUser?.role === 'superviseur' && ['finances', 'factures', 'cout-groupes'].includes(savedTab))) {
        setActiveTab(savedTab)
      }
    }
  }, [currentUser])

  const checkAuth = useCallback(async () => {
    try {
      const response = await fetch('/api/auth/admin/me')
      if (response.status === 401) {
        router.push('/admin/login')
        return
      }

      const data = response.ok ? await response.json() : null
      if (data?.user) {
        // Redirection si rôle coach vers l'espace coach
        if (data.user.role === 'coach') {
          router.push('/coach')
          return
        }
        setCurrentUser(data.user)
      } else {
        router.push('/admin/login')
        return
      }
      setLoading(false)
    } catch {
      router.push('/admin/login')
    }
  }, [router])

  useEffect(() => {
    const timer = setTimeout(() => {
      void checkAuth()
    }, 0)

    return () => clearTimeout(timer)
  }, [checkAuth])

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/admin/logout', { method: 'POST' })
      if (typeof window !== 'undefined') {
        localStorage.removeItem('admin.activeTab')
      }
      router.push('/')
      router.refresh()
    } catch (error) {
      logger.error('Erreur lors de la déconnexion', error)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50/50">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <p className="mt-3 text-slate-500 font-medium text-xs">Authentification...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50/50 flex flex-col md:flex-row text-slate-800">
        
        {/* MOBILE HEADER */}
        <header className="md:hidden sticky top-0 z-40 bg-white border-b border-slate-200/80 px-4 py-3 flex items-center justify-between shadow-2xs">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
            <h1 className="font-extrabold text-slate-950 text-sm tracking-tight">TRITON · ADMIN</h1>
          </div>
          <button 
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-2 text-slate-700 hover:bg-slate-50 rounded-lg transition-colors"
            aria-label="Menu"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {isMobileMenuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </header>

        {/* SIDEBAR - DESKTOP & MOBILE MOBILE DRAWER */}
        <aside className={`
          fixed md:sticky top-0 left-0 z-50 h-screen w-64 bg-white border-r border-slate-200/80 flex flex-col justify-between p-5 transition-transform duration-300 ease-in-out md:translate-x-0
          ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        `}>
          <div className="space-y-6 overflow-y-auto max-h-[calc(100vh-140px)] pr-1">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-2">
              <div className="flex items-center gap-2.5">
                <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                <div>
                  <h2 className="text-sm font-extrabold text-slate-950 tracking-tight">Triton Club</h2>
                  <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Espace Admin</p>
                </div>
              </div>
              <a 
                href="/" 
                target="_blank" 
                className="text-[10px] bg-slate-50 border border-slate-200 hover:bg-slate-100 px-2 py-1 rounded text-slate-500 font-medium transition-all"
              >
                Public ↗
              </a>
            </div>

            {/* Sidebar navigation list */}
            <nav className="space-y-5">
              {CATEGORIES.map((cat) => {
                const filteredItems = cat.items.filter(item => {
                  if (item.id === 'dons') {
                    return currentUser?.role === 'admin'
                  }
                  if (currentUser?.role === 'superviseur') {
                    return !['factures', 'finances', 'cout-groupes', 'dons'].includes(item.id)
                  }
                  return true
                })

                if (filteredItems.length === 0) return null

                return (
                  <div key={cat.title} className="space-y-1.5">
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest pl-2">
                      {cat.title}
                    </p>
                    <div className="space-y-0.5">
                      {filteredItems.map((item) => {
                        const isActive = activeTab === item.id
                        return (
                          <button
                            key={item.id}
                            onClick={() => {
                              setActiveTab(item.id as Tab)
                              localStorage.setItem('admin.activeTab', item.id)
                              // Update URL query parameters without reloading
                              if (typeof window !== 'undefined') {
                                const url = new URL(window.location.href)
                                url.searchParams.set('tab', item.id)
                                window.history.replaceState({}, '', url.toString())
                              }
                              setIsMobileMenuOpen(false)
                            }}
                            className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold tracking-wide transition-all ${
                              isActive
                                ? 'bg-slate-950 text-white shadow-sm'
                                : 'text-slate-650 hover:text-slate-900 hover:bg-slate-50'
                            }`}
                          >
                            <span className="flex items-center gap-2">
                              <span>{item.icon}</span>
                              <span>{item.label}</span>
                            </span>
                            {isActive && (
                              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                            )}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </nav>
          </div>

          {/* Footer Action buttons in Sidebar */}
          <div className="border-t border-slate-100 pt-4 mt-4 space-y-2">
            <a
              href="/admin/boutique"
              className="flex items-center justify-center gap-2 w-full py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg transition-all shadow-2xs"
            >
              <span>🛍️</span>
              <span>Boutique Admin</span>
            </a>
            <button
              onClick={handleLogout}
              className="w-full py-2.5 bg-red-50 hover:bg-red-100 border border-red-100 text-red-600 text-xs font-semibold rounded-lg transition-all"
            >
              Déconnexion
            </button>
          </div>
        </aside>

        {/* Overlay backdrop for mobile menu */}
        {isMobileMenuOpen && (
          <div 
            onClick={() => setIsMobileMenuOpen(false)}
            className="fixed inset-0 bg-slate-900/20 backdrop-blur-xs z-40 md:hidden"
          />
        )}

        {/* MAIN PANEL CONTENT */}
        <main className="flex-1 min-h-screen p-6 md:p-10 max-w-6xl mx-auto w-full">
          <Suspense fallback={<TabLoading />}>
            {activeTab === 'dashboard' && <DashboardTab currentUser={currentUser} />}
            {activeTab === 'profils' && <ProfilsTab currentUser={currentUser} />}
            {activeTab === 'podiums' && <PodiumsTab />}
            {activeTab === 'factures' && <FacturesTab />}
            {activeTab === 'finances' && <FinancesTab />}
            {activeTab === 'dons' && <DonsTab currentUser={currentUser} />}
            {activeTab === 'groupes' && <GroupesTab />}
            {activeTab === 'remplacements' && <RemplacementsTab />}
            {activeTab === 'cout-groupes' && <CoutGroupesTab />}
            {activeTab === 'planning-tournant' && <PlanningTournantTab />}
            {activeTab === 'planning-fixe' && <PlanningFixeTab />}
            {activeTab === 'evenements' && <EvenementsTab />}
            {activeTab === 'actualites' && <ActualitesTab />}
            {activeTab === 'galerie' && <GalerieTab />}
            {activeTab === 'vacances' && <VacancesTab />}
            {activeTab === 'chatbot' && <ChatbotTab />}
            {activeTab === 'chatbot-suggestions' && <ChatbotSuggestionsTab />}
            {activeTab === 'chatbot-stats' && <ChatbotStatsTab />}
            {activeTab === 'audit-logs' && <AuditLogsTab />}
            {activeTab === 'parametres' && <ParametresTab />}
            {activeTab === 'database' && <DatabaseTab />}
            {activeTab === 'inscription-page' && <InscriptionPageTab />}
            {activeTab === 'system-versions' && <SystemVersionsTab />}
          </Suspense>
        </main>
      </div>
  )
}

// Dashboard Tab
function DashboardTab({ currentUser }: { currentUser: { id: string; email: string; role: string } | null }) {
  const [stats, setStats] = useState({
    totalCoaches: 0,
    totalGroupes: 0,
    totalActualites: 0,
    totalCommandes: 0,
    commandesPayees: 0,
    commandesEnAttente: 0,
    chiffreAffairesBoutique: 0,
    facturesCoachsPayees: 0,
    facturesCoachsEnAttente: 0,
    recentCommandes: [] as any[],
    recentRemplacements: [] as any[],
    recentFactures: [] as any[],
    recentLogs: [] as any[],
  })

  const [loading, setLoading] = useState(true)

  const fetchStats = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/stats')
      if (response.ok) {
        const data = await response.json()
        setStats({
          ...data,
          recentCommandes: data.recentCommandes || [],
          recentRemplacements: data.recentRemplacements || [],
          recentFactures: data.recentFactures || [],
          recentLogs: data.recentLogs || [],
        })
      }
    } catch (error) {
      logger.error('Erreur lors du chargement des statistiques', error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => {
      void fetchStats()
    }, 0)

    return () => clearTimeout(timer)
  }, [fetchStats])

  const formatEuro = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(amount)
  }

  const formatTimeAgo = (dateStr: string | Date) => {
    const diffMs = new Date().getTime() - new Date(dateStr).getTime()
    const diffMin = Math.floor(diffMs / (1000 * 60))
    const diffHr = Math.floor(diffMs / (1000 * 60 * 60))
    const diffDay = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    if (diffMin < 65) return `Il y a ${diffMin} min`
    if (diffHr < 24) return `Il y a ${diffHr} h`
    return `Il y a ${diffDay} j`
  }

  const getStatutFactureBadge = (statut: string) => {
    switch (statut) {
      case 'brouillon':
        return 'bg-gray-100 text-gray-700'
      case 'generee':
        return 'bg-blue-50 text-blue-700'
      case 'envoyee':
        return 'bg-amber-50 text-amber-700 font-bold'
      case 'payee':
        return 'bg-emerald-50 text-emerald-700 font-bold'
      default:
        return 'bg-slate-100 text-slate-700'
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <p className="mt-3 text-slate-500 font-medium text-xs">Chargement du tableau de bord...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8 animate-fade-in-up">
      {/* HEADER COCKPIT */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <span className="inline-flex items-center gap-1.5 border border-primary/20 bg-primary/5 text-primary-dark px-3 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase shadow-2xs">
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
            Console RH & Boutique
          </span>
          <h2 className="text-3xl font-extrabold text-slate-950 tracking-tight mt-3">Tableau de bord</h2>
          <p className="text-slate-400 text-xs mt-1 font-medium">Pilotage de la boutique club & suivi d&apos;activité des coaches</p>
        </div>
        <button 
          onClick={fetchStats}
          className="px-3.5 py-2 border border-slate-200 hover:bg-slate-55/10 text-slate-700 font-semibold text-xs rounded-lg transition-colors flex items-center gap-1.5 bg-white shadow-2xs"
        >
          🔄 Actualiser les données
        </button>
      </div>

      {/* METRICS ROW (4 Columns Stripe-like) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {currentUser?.role !== 'superviseur' && (
          <div className="card p-5 bg-white relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full -mr-8 -mt-8 filter blur-xl transition-all" />
            <div className="flex justify-between items-start">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Revenus Boutique</p>
              <span className="text-sm">💰</span>
            </div>
            <p className="text-2xl md:text-3xl font-extrabold text-slate-950 mt-3">
              {formatEuro(stats.chiffreAffairesBoutique)}
            </p>
            <p className="text-[10px] text-emerald-600 font-bold mt-2 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              Ventes encaissées
            </p>
          </div>
        )}

        <div className="card p-5 bg-white relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-full -mr-8 -mt-8 filter blur-xl transition-all" />
          <div className="flex justify-between items-start">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Coaches actifs</p>
            <span className="text-sm">👨‍🏫</span>
          </div>
          <p className="text-2xl md:text-3xl font-extrabold text-slate-950 mt-3">
            {stats.totalCoaches}
          </p>
          <p className="text-[10px] text-primary-dark font-bold mt-2 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-primary" />
            Ressources Humaines
          </p>
        </div>

        <div className="card p-5 bg-white relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-full -mr-8 -mt-8 filter blur-xl transition-all" />
          <div className="flex justify-between items-start">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Commandes boutique</p>
            <span className="text-sm">📦</span>
          </div>
          <p className="text-2xl md:text-3xl font-extrabold text-slate-950 mt-3">
            {stats.commandesEnAttente} <span className="text-xs text-slate-400 font-medium">neuves</span>
          </p>
          <p className="text-[10px] text-slate-500 font-medium mt-2">
            Sur un total de <span className="font-bold text-slate-700">{stats.totalCommandes}</span> commandes
          </p>
        </div>

        {currentUser?.role !== 'superviseur' && (
          <div className="card p-5 bg-white relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-24 h-24 bg-rose-500/5 rounded-full -mr-8 -mt-8 filter blur-xl transition-all" />
            <div className="flex justify-between items-start">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Factures Coaches</p>
              <span className="text-sm">🧾</span>
            </div>
            <p className="text-2xl md:text-3xl font-extrabold text-slate-950 mt-3">
              {stats.facturesCoachsEnAttente} <span className="text-xs text-slate-400 font-medium">à payer</span>
            </p>
            <p className="text-[10px] text-slate-500 font-medium mt-2">
              Et <span className="font-bold text-emerald-600">{stats.facturesCoachsPayees}</span> factures réglées
            </p>
          </div>
        )}
      </div>

      {/* DOUBLE PANELS GRID */}
      <div className="grid lg:grid-cols-2 gap-8">
        
        {/* LEFT COLUMN: SHOP ORDERS & HR REPLACEMENTS */}
        <div className="space-y-8">
          
          {/* HR REPLACEMENTS */}
          <div className="card p-6 bg-white border border-slate-200/80 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-950">Remplacements récents (RH)</h3>
              <span className="text-[10px] font-bold text-slate-400 uppercase">Shifts substitutes</span>
            </div>

            {stats.recentRemplacements.length === 0 ? (
              <p className="text-slate-400 text-xs italic py-4">Aucun remplacement récent enregistré.</p>
            ) : (
              <div className="divide-y divide-slate-100">
                {stats.recentRemplacements.map((remp) => (
                  <div key={remp.id} className="py-3 flex justify-between items-center first:pt-0 last:pb-0">
                    <div>
                      <p className="text-sm font-bold text-slate-900">
                        {remp.coachRemplacant?.prenom || 'N/A'} remplace {remp.coachRemplace?.prenom || 'N/A'}
                      </p>
                      <p className="text-[11px] text-slate-400 font-medium mt-0.5">
                        Motif : {remp.motif || 'Non renseigné'} · {remp.heureDebut} - {remp.heureFin}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] bg-slate-50 border border-slate-200 text-slate-650 px-2 py-0.5 rounded-full font-bold">
                        {formatCompactDateFr(remp.date)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* PENDING COMMANDES */}
          {currentUser?.role !== 'superviseur' && (
            <div className="card p-6 bg-white border border-slate-200/80 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-950">Dernières commandes boutique</h3>
                <span className="text-[10px] font-bold text-slate-400 uppercase">Shop Orders</span>
              </div>

              {stats.recentCommandes.length === 0 ? (
                <p className="text-slate-400 text-xs italic py-4">Aucune commande en attente.</p>
              ) : (
                <div className="divide-y divide-slate-100">
                  {stats.recentCommandes.map((cmd) => (
                    <div key={cmd.id} className="py-3.5 flex justify-between items-center first:pt-0 last:pb-0">
                      <div className="space-y-1">
                        <p className="text-sm font-bold text-slate-900">{cmd.prenom} {cmd.nom}</p>
                        <p className="text-[11px] text-slate-400 font-medium leading-relaxed">
                          N° {cmd.numeroCommande} · {cmd.lignes?.map((l: any) => `${l.quantite}x ${l.nomProduit}`).join(', ')}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-extrabold text-slate-950">{formatEuro(cmd.total)}</p>
                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider mt-1.5 inline-block ${
                          cmd.statutPaiement === 'paye'
                            ? 'bg-emerald-50 text-emerald-700'
                            : 'bg-amber-50 text-amber-700'
                        }`}>
                          {cmd.statutPaiement === 'paye' ? 'Payé' : 'Non payé'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

        </div>

        {/* RIGHT COLUMN: COACH INVOICES & AUDIT TRAIL */}
        <div className="space-y-8">
          
          {/* RECENT COACHES INVOICES */}
          {currentUser?.role !== 'superviseur' && (
            <div className="card p-6 bg-white border border-slate-200/80 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-950">Dernières factures générées (RH)</h3>
                <span className="text-[10px] font-bold text-slate-400 uppercase">Coach Payroll</span>
              </div>

              {stats.recentFactures.length === 0 ? (
                <p className="text-slate-400 text-xs italic py-4">Aucune facture émise récemment.</p>
              ) : (
                <div className="divide-y divide-slate-100">
                  {stats.recentFactures.map((fac) => (
                    <div key={fac.id} className="py-3 flex justify-between items-center first:pt-0 last:pb-0">
                      <div>
                        <p className="text-sm font-bold text-slate-900">
                          {fac.coach?.prenom} {fac.coach?.nom || ''}
                        </p>
                        <p className="text-[11px] text-slate-400 font-medium mt-0.5">
                          Mois {fac.mois} / {fac.annee} · N° {fac.numero}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-extrabold text-slate-950">{formatEuro(fac.montantTotal)}</p>
                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full mt-1 inline-block uppercase tracking-wider ${getStatutFactureBadge(fac.statut)}`}>
                          {fac.statut}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* AUDIT LOGS */}
          <div className="card p-6 bg-white border border-slate-200/80 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-950">Journal d&apos;activité système</h3>
              <span className="text-[10px] font-bold text-slate-400 uppercase">Audit Trail</span>
            </div>

            {stats.recentLogs.length === 0 ? (
              <p className="text-slate-400 text-xs italic py-4">Aucune activité enregistrée.</p>
            ) : (
              <div className="space-y-4">
                {stats.recentLogs.map((log) => (
                  <div key={log.id} className="flex items-start gap-3.5 text-xs">
                    <span className="text-slate-400 mt-0.5">⚙️</span>
                    <div className="flex-1 space-y-0.5">
                      <p className="text-slate-900 font-bold leading-tight">{log.action}</p>
                      <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-semibold uppercase mt-0.5">
                        <span>{log.actorRole || 'System'}</span>
                        <span>•</span>
                        <span>{formatTimeAgo(log.timestamp)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

      </div>
    </div>
  )
}

// Profils Tab
function ProfilsTab({ currentUser }: { currentUser: { id: string; email: string; role: string } | null }) {
  return <ProfilsManager currentUser={currentUser} />
}

// Factures Tab
function FacturesTab() {
  return <FacturesManager />
}

// Finances Tab
function FinancesTab() {
  return <FinancesManager />
}

// Groupes Tab
function GroupesTab() {
  return <GroupesManager />
}



// Remplacements Tab
function RemplacementsTab() {
  return <RemplacementsManager />
}

// Cout Groupes Tab
function CoutGroupesTab() {
  return <CoutGroupes />
}

// Planning Tournant Tab
function PlanningTournantTab() {
  return <PlanningTournantManager />
}

// Planning Fixe Tab
function PlanningFixeTab() {
  return <PlanningFixeManager />
}


// Evenements Tab
function EvenementsTab() {
  return <EvenementsManager />
}

// Actualites Tab
function ActualitesTab() {
  return <ActualitesManager />
}

// Galerie Tab
function GalerieTab() {
  return <GalerieManager />
}

// Vacances Tab
function VacancesTab() {
  return <VacancesManager />
}

// Chatbot Tab
function ChatbotTab() {
  return <ChatbotKnowledgeManager />
}



// Chatbot Suggestions Tab
function ChatbotSuggestionsTab() {
  return <ChatbotSuggestionsManager />
}

// Chatbot Stats Tab
function ChatbotStatsTab() {
  return <ChatbotStatsManager />
}

// Audit Logs Tab
function AuditLogsTab() {
  return <AuditLogsManager />
}

// Parametres Tab
function ParametresTab() {
  return <ParametresManager />
}

// Database Tab
function DatabaseTab() {
  return <DatabaseManager />
}

// Inscription Page Tab
function InscriptionPageTab() {
  return <InscriptionPageBuilder />
}

// Dons Tab
function DonsTab({ currentUser }: { currentUser: { id: string; email: string; role: string } | null }) {
  return <DonsManager currentUser={currentUser} />
}

// System Versions Tab
function SystemVersionsTab() {
  return <SystemVersionsManager />
}

// Podiums Tab
function PodiumsTab() {
  return <PodiumsManager />
}
