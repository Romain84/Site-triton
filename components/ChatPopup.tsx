'use client'

import { useState, useRef, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import toast from 'react-hot-toast'
import Link from 'next/link'

interface MessageAction {
  label: string
  url: string
  icon?: 'swimmer' | 'calendar' | 'document' | 'mail' | 'cart' | 'info'
}

interface Message {
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  actions?: MessageAction[]
  suggestions?: string[]
  feedbackSent?: 'up' | 'down'
}

const STORAGE_KEY = 'tcc_chat_messages_v2'
const STORAGE_OPEN_KEY = 'tcc_chat_open_state'

function formatMessageContent(content: string, role: 'user' | 'assistant') {
  if (role === 'user') {
    return <p className="whitespace-pre-wrap">{content}</p>
  }

  const lines = content.split('\n')

  return (
    <div className="space-y-1">
      {lines.map((line, lineIndex) => {
        let cleanLine = line

        // Détecter les puces de liste (• ou -)
        const isBullet = cleanLine.trim().startsWith('•') || cleanLine.trim().startsWith('-')
        if (isBullet) {
          cleanLine = cleanLine.replace(/^\s*[•-]\s*/, '')
        }

        const parts: React.ReactNode[] = []
        let key = 0

        // Regex pour identifier le gras **texte** ou les liens [texte](url)
        const regex = /(\*\*.*?\*\*|\[.*?\]\(.*?\))/g
        const segments = cleanLine.split(regex)

        segments.forEach((segment) => {
          if (segment.startsWith('**') && segment.endsWith('**')) {
            parts.push(
              <strong key={key++} className="font-extrabold text-slate-950 font-display">
                {segment.slice(2, -2)}
              </strong>
            )
          } else if (segment.startsWith('[') && segment.includes('](') && segment.endsWith(')')) {
            const closeBracket = segment.indexOf(']')
            const text = segment.slice(1, closeBracket)
            const href = segment.slice(closeBracket + 2, -1)
            const isExternal = href.startsWith('http') || href.startsWith('mailto') || href.startsWith('tel')
            if (isExternal) {
              parts.push(
                <a
                  key={key++}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline font-bold"
                >
                  {text}
                </a>
              )
            } else {
              parts.push(
                <Link
                  key={key++}
                  href={href}
                  className="text-primary hover:underline font-bold"
                >
                  {text}
                </Link>
              )
            }
          } else {
            parts.push(segment)
          }
        })

        if (isBullet) {
          return (
            <div key={lineIndex} className="flex items-start gap-2 pl-1 py-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0 mt-1.5 animate-pulse" />
              <span className="text-slate-800 text-sm leading-relaxed">{parts}</span>
            </div>
          )
        }

        if (cleanLine.trim() === '') {
          return <div key={lineIndex} className="h-1.5" />
        }

        return (
          <p key={lineIndex} className="text-slate-800 text-sm leading-relaxed mb-0.5">
            {parts}
          </p>
        )
      })}
    </div>
  )
}

function formatCountdown(seconds: number) {
  if (seconds < 60) return `${seconds}s`
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  if (mins < 60) return `${mins}m ${secs}s`
  const hours = Math.floor(mins / 60)
  const remMins = mins % 60
  return `${hours}h ${remMins}m`
}

export default function ChatPopup() {
  const pathname = usePathname()
  const isContactPage = pathname === '/contact'
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: 'Bonjour ! Je suis l\'assistant virtuel du Triton Club Cavaillon. Comment puis-je vous aider ?',
      timestamp: new Date(),
    },
  ])
  const [inputMessage, setInputMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [remaining, setRemaining] = useState<number | null>(null)
  const [resetTime, setResetTime] = useState<number | null>(null)
  const [countdown, setCountdown] = useState<number | null>(null)
  const [monthlyQuotaExceeded, setMonthlyQuotaExceeded] = useState(false)
  const [showBadge, setShowBadge] = useState(true)
  const [lastUserMessage, setLastUserMessage] = useState<string | null>(null)
  const [isExpanded, setIsExpanded] = useState(false)
  const [dynamicSuggestions, setDynamicSuggestions] = useState<string[] | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Récupérer le statut du quota
  const fetchQuotaStatus = async () => {
    try {
      const response = await fetch('/api/chat')
      if (response.ok) {
        const data = await response.json()
        if (data.remaining !== undefined) {
          setRemaining(data.remaining)
        }
        if (data.resetTime !== undefined) {
          setResetTime(data.resetTime)
        }
        setMonthlyQuotaExceeded(!!data.monthlyQuotaExceeded)
      }
    } catch (err) {
      console.error('Erreur récupération quota:', err)
    }
  }

  // 1. Restauration de session (persistance de navigation)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const savedMessages = sessionStorage.getItem(STORAGE_KEY)
        if (savedMessages) {
          const parsed = JSON.parse(savedMessages)
          if (Array.isArray(parsed) && parsed.length > 0) {
            setMessages(
              parsed.map((m: any) => ({
                ...m,
                timestamp: new Date(m.timestamp),
              }))
            )
          }
        }
        const savedOpen = sessionStorage.getItem(STORAGE_OPEN_KEY)
        if (savedOpen === 'true') {
          setIsOpen(true)
        }
      } catch (err) {
        console.error('Erreur chargement session chatbot:', err)
      }
    }
  }, [])

  // 2. Sauvegarde de session lors des échanges
  useEffect(() => {
    if (typeof window !== 'undefined' && messages.length > 1) {
      try {
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(messages))
      } catch {
        // En cas de quota sessionStorage plein, ignorer sans bloquer
      }
    }
  }, [messages])

  // 3. Mémoriser l'état ouvert/fermé
  useEffect(() => {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem(STORAGE_OPEN_KEY, isOpen ? 'true' : 'false')
    }
  }, [isOpen])

  // Récupérer le statut dès l'ouverture du chat
  useEffect(() => {
    if (isOpen) {
      fetchQuotaStatus()
    }
  }, [isOpen])

  // Gérer le compte à rebours pour la réinitialisation de la limite de requêtes
  useEffect(() => {
    if (resetTime === null || remaining === null || remaining > 0) {
      setCountdown(null)
      return
    }

    const updateCountdown = () => {
      const now = Date.now()
      const diff = Math.ceil((resetTime - now) / 1000)

      if (diff <= 0) {
        setCountdown(null)
        setResetTime(null)
        setError(null)
        fetchQuotaStatus() // Rafraîchir automatiquement les quotas
      } else {
        setCountdown(diff)
      }
    }

    updateCountdown()
    const timer = setInterval(updateCountdown, 1000)

    return () => clearInterval(timer)
  }, [resetTime, remaining])

  // Badge de bienvenue basé sur sessionStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const opened = sessionStorage.getItem('triton-chat-opened')
      if (opened) setShowBadge(false)
    }
  }, [])

  // Écouter l'événement global pour ouvrir le chat depuis n'importe quel bouton
  useEffect(() => {
    const handleOpenChat = (e: Event) => {
      const customEvent = e as CustomEvent<{ question?: string }>
      setIsOpen(true)
      setShowBadge(false)
      if (customEvent.detail?.question) {
        setTimeout(() => {
          sendMessage(customEvent.detail.question!)
        }, 100)
      }
    }

    window.addEventListener('open-triton-chat', handleOpenChat)
    return () => window.removeEventListener('open-triton-chat', handleOpenChat)
  }, [])

  // Masquer le badge après première ouverture
  useEffect(() => {
    if (isOpen && typeof window !== 'undefined') {
      sessionStorage.setItem('triton-chat-opened', 'true')
      setShowBadge(false)
    }
  }, [isOpen])

  // Suggestions contextuelles en fonction de la page visitée
  const getContextSuggestions = () => {
    if (pathname?.startsWith('/boutique') || pathname?.startsWith('/panier')) {
      return [
        'Où retirer ma commande ?',
        'Quels sont les délais de livraison ?',
        'Puis-je échanger un article ?'
      ]
    }
    if (pathname?.startsWith('/planning') || pathname?.startsWith('/calendrier')) {
      return [
        'Y a-t-il cours pendant les vacances ?',
        'Quels sont les horaires de ce soir ?',
        'Où se déroulent les cours ?'
      ]
    }
    if (pathname?.startsWith('/inscription')) {
      return [
        'Quels documents dois-je fournir ?',
        'Le certificat médical est-il obligatoire ?',
        'Puis-je payer en plusieurs fois ?'
      ]
    }
    return [
      'Quel groupe pour mon enfant ?',
      'Quels sont les tarifs du club ?',
      'Comment réserver un test de niveau ?'
    ]
  }

  // Suggestions de suivi après début de conversation
  const getFollowUpSuggestions = () => [
    'Quels sont les tarifs ?',
    'Consulter les horaires des cours',
    'Comment contacter le secrétariat ?'
  ]

  const shouldShowSuggestions = !isLoading && !error && messages.length > 0 && messages[messages.length - 1].role === 'assistant' && (countdown === null || countdown <= 0)
  const currentSuggestions = dynamicSuggestions && dynamicSuggestions.length > 0
    ? dynamicSuggestions
    : messages.length <= 1
    ? getContextSuggestions()
    : getFollowUpSuggestions()

  // Scroll to bottom when messages change
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, isOpen, isLoading])

  const sendMessage = async (text: string) => {
    const trimmedMessage = text.trim()
    if (!trimmedMessage || isLoading) return

    // Add user message
    const userMessage: Message = {
      role: 'user',
      content: trimmedMessage,
      timestamp: new Date(),
    }
    setMessages((prev) => [...prev, userMessage])
    setInputMessage('')
    setIsLoading(true)
    setError(null)
    setLastUserMessage(trimmedMessage)

    try {
      // Construire l'historique des 6 derniers messages pour le contexte
      const historyToSend = [...messages, userMessage]
        .slice(-6)
        .map(m => ({ role: m.role, content: m.content }))

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: trimmedMessage, history: historyToSend }),
      })

      const contentType = response.headers.get('content-type')
      if (!contentType || !contentType.includes('application/json')) {
        throw new TypeError("La réponse n'est pas au format JSON")
      }

      const data = await response.json()

      // Mettre à jour le compteur de messages restants et resetTime
      if (data.remaining !== undefined) {
        setRemaining(data.remaining)
      }
      if (data.resetTime !== undefined) {
        setResetTime(data.resetTime)
      }

      if (!response.ok) {
        if (response.status === 429) {
          setError(data.error || 'Trop de requêtes. Veuillez patienter.')
        } else if (response.status === 503) {
          setError(data.error || 'Le chatbot est temporairement indisponible.')
        } else {
          setError(data.error || 'Une erreur est survenue.')
        }
        return
      }

      // Add assistant response avec actions et suggestions structurées
      const assistantMessage: Message = {
        role: 'assistant',
        content: data.response,
        timestamp: new Date(),
        actions: data.actions || [],
        suggestions: data.suggestions || [],
      }
      setMessages((prev) => [...prev, assistantMessage])

      if (data.suggestions && data.suggestions.length > 0) {
        setDynamicSuggestions(data.suggestions)
      }

    } catch (err) {
      console.error('Erreur lors de l\'envoi du message:', err)
      setError('Le chatbot est temporairement indisponible. Veuillez réessayer.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSendMessage = () => sendMessage(inputMessage)

  // Réessayer le dernier message après une erreur
  const handleRetry = () => {
    if (lastUserMessage) {
      setError(null)
      setMessages((prev) => {
        const lastIdx = prev.length - 1
        if (prev[lastIdx]?.role === 'user') {
          return prev.slice(0, lastIdx)
        }
        return prev
      })
      sendMessage(lastUserMessage)
    }
  }

  // Nouvelle conversation & réinitialisation du cache local
  const handleNewConversation = () => {
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem(STORAGE_KEY)
    }
    setMessages([
      {
        role: 'assistant',
        content: 'Bonjour ! Je suis l\'assistant virtuel du Triton Club Cavaillon. Comment puis-je vous aider ?',
        timestamp: new Date(),
      },
    ])
    setInputMessage('')
    setError(null)
    setLastUserMessage(null)
    setDynamicSuggestions(null)
    fetchQuotaStatus()
    toast.success('Nouvelle conversation démarrée', { icon: '🔄', duration: 2000 })
  }

  const handleFeedback = async (messageIndex: number, type: 'up' | 'down') => {
    setMessages((prev) =>
      prev.map((msg, idx) =>
        idx === messageIndex ? { ...msg, feedbackSent: type } : msg
      )
    )

    if (type === 'down') {
      try {
        const assistantMsg = messages[messageIndex]
        const userMsg = messages[messageIndex - 1]

        if (userMsg && userMsg.role === 'user') {
          await fetch('/api/chat/feedback', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              question: userMsg.content,
              reponse: assistantMsg.content,
            }),
          })
          toast.success('Merci ! Notre équipe va étudier cette question pour m\'entraîner.', {
            icon: '🤖',
            duration: 4000,
          })
        }
      } catch (err) {
        console.error('Erreur lors de l\'envoi du feedback:', err)
      }
    } else {
      toast.success('Merci pour votre retour positif !', {
        icon: '💖',
      })
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  // Ne pas afficher le chatbot dans l'espace coach
  if (pathname?.startsWith('/coach')) {
    return null
  }

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`fixed ${isContactPage ? 'bottom-24 md:bottom-6' : 'bottom-6'} right-6 w-16 h-16 rounded-full shadow-xl flex items-center justify-center transition-all duration-300 z-50 hover:scale-105 active:scale-95 ${
          isOpen 
            ? 'bg-red-500 hover:bg-red-600 shadow-red-500/20' 
            : 'bg-primary hover:bg-primary-dark shadow-primary/20'
        }`}
        aria-label={isOpen ? 'Fermer le chat' : 'Ouvrir le chat'}
      >
        {isOpen ? (
          <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
          </svg>
        )}
        {!isOpen && showBadge && (
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full shadow-md">
            <span className="absolute inset-0 bg-red-500 rounded-full animate-ping opacity-75" />
          </span>
        )}
      </button>

      {/* Chat popup */}
      {isOpen && (
        <div className={`fixed glass-panel shadow-2xl overflow-hidden z-50 animate-slide-up transition-all duration-300 ${
          isExpanded
            ? 'bottom-2 right-2 left-2 top-2 sm:bottom-6 sm:right-6 sm:left-auto sm:top-auto sm:w-[680px] sm:h-[620px] sm:max-w-[calc(100vw-3rem)] rounded-2xl flex flex-col'
            : 'bottom-0 right-0 w-full h-[100dvh] sm:bottom-24 sm:right-6 sm:w-[420px] sm:h-auto sm:max-w-[calc(100vw-3rem)] sm:rounded-2xl flex flex-col'
        }`}>
          {/* Header */}
          <div className="bg-gradient-to-r from-primary to-primary-dark text-white p-4 shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center flex-shrink-0 shadow-md">
                  <span className="text-lg">🏊</span>
                </div>
                <div>
                  <h3 className="font-bold text-sm tracking-wide flex items-center gap-1.5">
                    Assistant Triton
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  </h3>
                  <p className="text-[10px] text-white/80 font-medium">Assistant virtuel • Réponses instantanées</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                {/* Bouton agrandir / réduire */}
                <button
                  onClick={() => setIsExpanded(!isExpanded)}
                  className="hidden sm:flex w-8 h-8 rounded-full hover:bg-white/10 items-center justify-center text-white/80 hover:text-white transition-all cursor-pointer"
                  aria-label={isExpanded ? "Réduire la fenêtre" : "Agrandir la fenêtre"}
                  title={isExpanded ? "Réduire" : "Agrandir"}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    {isExpanded ? (
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 9L4 4m0 0l5 0m-5 0l0 5m11 5l5 5m0 0l-5 0m5 0l0-5" />
                    ) : (
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5v-4m0 4h-4m4 0l-5-5" />
                    )}
                  </svg>
                </button>
                {/* Bouton nouvelle conversation */}
                {messages.length > 1 && (
                  <button
                    onClick={handleNewConversation}
                    className="w-8 h-8 rounded-full hover:bg-white/10 flex items-center justify-center text-white/80 hover:text-white transition-all cursor-pointer"
                    aria-label="Nouvelle conversation"
                    title="Nouvelle conversation"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  </button>
                )}
                {/* Bouton fermer */}
                <button
                  onClick={() => setIsOpen(false)}
                  className="w-8 h-8 rounded-full hover:bg-white/10 flex items-center justify-center text-white/80 hover:text-white transition-all cursor-pointer"
                  aria-label="Fermer le chat"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          </div>

          {/* Messages */}
          <div className={`overflow-y-auto p-4 space-y-4 bg-slate-50/70 flex-1 ${
            isExpanded ? 'h-[calc(100vh-210px)] sm:h-[430px]' : 'h-[calc(100dvh-180px)] sm:h-[350px]'
          }`}>
            {messages.map((message, index) => (
              <div
                key={index}
                className={`flex flex-col ${message.role === 'user' ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`max-w-[88%] p-3.5 rounded-2xl text-sm leading-relaxed ${
                    message.role === 'user'
                      ? 'bg-gradient-to-br from-primary to-primary-dark text-white rounded-tr-none shadow-md shadow-primary/10'
                      : 'bg-white border border-slate-200/80 text-slate-800 rounded-tl-none shadow-xs'
                  }`}
                >
                  {formatMessageContent(message.content, message.role)}

                  {/* Boutons d'Action Rapide cliquables (pour l'assistant) */}
                  {message.role === 'assistant' && message.actions && message.actions.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2.5 pt-2 border-t border-slate-100">
                      {message.actions.map((act, actIdx) => {
                        const iconEmoji =
                          act.icon === 'swimmer'
                            ? '🏊'
                            : act.icon === 'calendar'
                            ? '📅'
                            : act.icon === 'document'
                            ? '📝'
                            : act.icon === 'cart'
                            ? '🛒'
                            : act.icon === 'mail'
                            ? '✉️'
                            : '👉'

                        return (
                          <Link
                            key={actIdx}
                            href={act.url}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 hover:bg-primary text-primary hover:text-white rounded-lg text-xs font-semibold border border-primary/20 hover:border-transparent transition-all shadow-2xs hover:shadow-xs group cursor-pointer"
                          >
                            <span className="text-xs group-hover:scale-110 transition-transform">{iconEmoji}</span>
                            <span>{act.label}</span>
                          </Link>
                        )
                      })}
                    </div>
                  )}

                  {/* Diagnostic d'orientation interactif (au premier message de bienvenue) */}
                  {index === 0 && message.role === 'assistant' && messages.length <= 1 && (
                    <div className="mt-3 p-3 bg-gradient-to-br from-primary/5 via-sky-50 to-blue-50/50 rounded-xl border border-primary/15 space-y-2">
                      <p className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                        <span>🎯</span> <span>Orientation rapide en 1 clic :</span>
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-1">
                        <button
                          onClick={() => sendMessage("Quel groupe pour mon enfant de 4 à 10 ans ?")}
                          className="text-left px-2.5 py-2 rounded-lg bg-white/95 hover:bg-white text-xs text-slate-700 hover:text-primary font-medium border border-slate-200/70 hover:border-primary/40 shadow-2xs hover:shadow-xs transition-all flex items-center gap-2 group cursor-pointer"
                        >
                          <span className="text-base group-hover:scale-110 transition-transform">👶</span>
                          <div>
                            <div className="font-semibold text-slate-800">Enfants (4 - 10 ans)</div>
                            <div className="text-[10px] text-slate-500">Sauv&apos;Nage &amp; Écoles</div>
                          </div>
                        </button>
                        <button
                          onClick={() => sendMessage("Quels sont les groupes ados et compétition ?")}
                          className="text-left px-2.5 py-2 rounded-lg bg-white/95 hover:bg-white text-xs text-slate-700 hover:text-primary font-medium border border-slate-200/70 hover:border-primary/40 shadow-2xs hover:shadow-xs transition-all flex items-center gap-2 group cursor-pointer"
                        >
                          <span className="text-base group-hover:scale-110 transition-transform">🏊</span>
                          <div>
                            <div className="font-semibold text-slate-800">Ados &amp; Compétition</div>
                            <div className="text-[10px] text-slate-500">Pass&apos;Sports &amp; Jeunes</div>
                          </div>
                        </button>
                        <button
                          onClick={() => sendMessage("Quelles sont les activités pour adultes et maîtres ?")}
                          className="text-left px-2.5 py-2 rounded-lg bg-white/95 hover:bg-white text-xs text-slate-700 hover:text-primary font-medium border border-slate-200/70 hover:border-primary/40 shadow-2xs hover:shadow-xs transition-all flex items-center gap-2 group cursor-pointer"
                        >
                          <span className="text-base group-hover:scale-110 transition-transform">🌊</span>
                          <div>
                            <div className="font-semibold text-slate-800">Adultes &amp; Maîtres</div>
                            <div className="text-[10px] text-slate-500">Loisirs, NFS &amp; Aquagym</div>
                          </div>
                        </button>
                        <button
                          onClick={() => sendMessage("Comment se passe la formation surveillant sauveteur SSA ?")}
                          className="text-left px-2.5 py-2 rounded-lg bg-white/95 hover:bg-white text-xs text-slate-700 hover:text-primary font-medium border border-slate-200/70 hover:border-primary/40 shadow-2xs hover:shadow-xs transition-all flex items-center gap-2 group cursor-pointer"
                        >
                          <span className="text-base group-hover:scale-110 transition-transform">🛟</span>
                          <div>
                            <div className="font-semibold text-slate-800">Formation SSA (BNSSA)</div>
                            <div className="text-[10px] text-slate-500">Dès 16 ans • Croix-Blanche</div>
                          </div>
                        </button>
                      </div>
                    </div>
                  )}

                  <p className={`text-[11px] mt-1.5 font-medium ${message.role === 'user' ? 'text-white/90' : 'text-slate-500'}`}>
                    {message.timestamp.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>

                {/* Thumbs Feedback */}
                {message.role === 'assistant' && index > 0 && (
                  <div className="flex items-center gap-2.5 mt-1.5 ml-2.5 text-xs text-slate-600 bg-white/80 backdrop-blur px-2.5 py-1 rounded-full border border-slate-200/60 shadow-2xs">
                    <span className="font-semibold text-slate-600">Pertinent ?</span>
                    <button
                      onClick={() => handleFeedback(index, 'up')}
                      disabled={message.feedbackSent !== undefined}
                      className={`transition-all duration-200 hover:scale-125 hover:text-green-600 cursor-pointer ${message.feedbackSent === 'up' ? 'text-green-600 scale-125 animate-bounce' : ''}`}
                      title="Oui, très utile"
                      aria-label="Oui, cette réponse est très utile"
                    >
                      👍
                    </button>
                    <button
                      onClick={() => handleFeedback(index, 'down')}
                      disabled={message.feedbackSent !== undefined}
                      className={`transition-all duration-200 hover:scale-125 hover:text-rose-600 cursor-pointer ${message.feedbackSent === 'down' ? 'text-rose-600 scale-125 animate-bounce' : ''}`}
                      title="Non, pas pertinent"
                      aria-label="Non, cette réponse n'est pas pertinente"
                    >
                      👎
                    </button>
                  </div>
                )}
              </div>
            ))}

            {/* Loading indicator */}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-white p-3 rounded-2xl shadow-sm border border-slate-200/60 rounded-bl-md">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-500 font-medium">Recherche dans les données du club...</span>
                    <div className="flex gap-1">
                      <div className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                      <div className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                      <div className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Error message avec bouton réessayer */}
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-lg text-sm space-y-2">
                <p>{error}</p>
                {!(countdown !== null && countdown > 0) && (
                  <button
                    onClick={handleRetry}
                    className="text-xs font-bold text-red-600 hover:text-red-800 underline transition-colors cursor-pointer"
                  >
                    🔄 Réessayer
                  </button>
                )}
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Suggestions persistantes */}
          {shouldShowSuggestions && (
            <div className="px-4 py-2.5 border-t border-slate-100 bg-white shrink-0">
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
                {dynamicSuggestions && dynamicSuggestions.length > 0 ? 'Questions suggérées' : messages.length <= 1 ? 'Suggestions rapides' : 'Questions suivantes'}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {currentSuggestions.map((suggestion) => (
                  <button
                    key={suggestion}
                    onClick={() => sendMessage(suggestion)}
                    className="text-xs bg-slate-50 hover:bg-primary/10 border border-slate-200/70 hover:border-primary/30 text-slate-700 hover:text-primary px-3 py-1.5 rounded-full transition-all hover:scale-[1.02] active:scale-[0.98] outline-none cursor-pointer"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Input */}
          <div className="p-3 bg-white border-t border-slate-100 shrink-0">
            {monthlyQuotaExceeded ? (
              <div className="flex items-center gap-1.5 px-3 py-1.5 mb-2 bg-red-50 border border-red-200 text-red-700 rounded-xl text-[11px] font-medium">
                <span className="shrink-0 text-xs">⚠️</span>
                <span>Quota mensuel atteint. Veuillez utiliser le formulaire de contact.</span>
              </div>
            ) : countdown !== null && countdown > 0 ? (
              <div className="flex items-center gap-1.5 px-3 py-1.5 mb-2 bg-amber-50 border border-amber-200 text-amber-700 rounded-xl text-[11px] font-medium animate-pulse">
                <span className="shrink-0 text-xs">⏳</span>
                <span>Limite atteinte. Recharge dans <strong>{formatCountdown(countdown)}</strong></span>
              </div>
            ) : remaining !== null ? (
              <div className="flex justify-between items-center px-2 mb-1.5 text-[10px] text-slate-400 font-medium">
                <div className="flex items-center gap-1">
                  <span>⚡</span>
                  <span>{remaining} / 15 messages disponibles</span>
                </div>
                {remaining <= 5 && (
                  <span className="text-amber-500 font-semibold animate-pulse">
                    Quota presque épuisé
                  </span>
                )}
              </div>
            ) : null}

            <div className="flex gap-2">
              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={monthlyQuotaExceeded ? "Quota mensuel épuisé..." : countdown !== null && countdown > 0 ? "Quota temporairement épuisé..." : "Posez votre question sur les cours, tarifs, tests..."}
                disabled={isLoading || (countdown !== null && countdown > 0) || monthlyQuotaExceeded}
                maxLength={500}
                className="flex-1 px-4 py-2.5 border border-slate-200 rounded-full focus:ring-2 focus:ring-primary/20 focus:border-primary focus:bg-white bg-slate-50 transition-all outline-none text-sm disabled:opacity-60 disabled:cursor-not-allowed"
              />
              <button
                onClick={handleSendMessage}
                disabled={isLoading || !inputMessage.trim() || (countdown !== null && countdown > 0) || monthlyQuotaExceeded}
                className="w-10 h-10 bg-gradient-to-br from-primary to-primary-dark text-white rounded-full hover:from-primary-dark hover:to-emerald-600 shadow-md shadow-primary/15 transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center flex-shrink-0 cursor-pointer"
                aria-label="Envoyer"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Animation style */}
      <style jsx global>{`
        @keyframes slide-up {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-slide-up {
          animation: slide-up 0.3s ease-out;
        }
      `}</style>
    </>
  )
}
