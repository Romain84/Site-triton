'use client'

import { useState, useEffect } from 'react'
import { useToast } from '@/hooks/useToast'

interface GenerateAiArticleModalProps {
  isOpen: boolean
  onClose: () => void
  onArticleGenerated: (articleData: {
    titre: string
    slug: string
    contenu: string
    auteur: string
    datePubli: string
    instagramText?: string
  }) => void
}

interface CalendarEvent {
  id: string
  title: string
  date: string
  lieu?: string | null
}

export default function GenerateAiArticleModal({
  isOpen,
  onClose,
  onArticleGenerated,
}: GenerateAiArticleModalProps) {
  const toast = useToast()
  const [loading, setLoading] = useState(false)
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [selectedEventId, setSelectedEventId] = useState<string>('')
  const [competitionName, setCompetitionName] = useState<string>('')
  const [lieu, setLieu] = useState<string>('')
  const [liveffnUrl, setLiveffnUrl] = useState<string>('')
  const [rawNotes, setRawNotes] = useState<string>('')
  const [groupByBirthYear, setGroupByBirthYear] = useState<boolean>(true)
  const [generatedInstagramText, setGeneratedInstagramText] = useState<string>('')
  const [copiedInstagram, setCopiedInstagram] = useState(false)
  const [isGenerated, setIsGenerated] = useState(false)

  useEffect(() => {
    if (isOpen) {
      fetchEvents()
      setIsGenerated(false)
      setGeneratedInstagramText('')
    }
  }, [isOpen])

  const fetchEvents = async () => {
    try {
      const res = await fetch('/api/admin/evenements-calendrier')
      if (res.ok) {
        const data = await res.json()
        setEvents(data.evenements || data.events || [])
      }
    } catch {}
  }

  const handleSelectEvent = (eventId: string) => {
    setSelectedEventId(eventId)
    const ev = events.find((e) => e.id === eventId)
    if (ev) {
      setCompetitionName(ev.title)
      setLieu(ev.lieu || '')
    }
  }

  const handleGenerate = async () => {
    if (loading) return
    if (!rawNotes.trim() && !liveffnUrl.trim()) {
      toast.error('Veuillez coller une URL LiveFFN ou saisir les résultats de la compétition.')
      return
    }

    setLoading(true)
    setGeneratedInstagramText('')

    try {
      const response = await fetch('/api/admin/actualites/generate-competition-summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rawNotes,
          competitionName,
          lieu,
          liveffnUrl,
          groupByBirthYear,
        }),
      })

      const data = await response.json()
      const result = data.data || data

      if (response.ok && (data.success || result.titre)) {
        setIsGenerated(true)
        if (result.isFallbackDraft) {
          toast.success(result.notice || 'Article structuré généré avec succès en mode gabarit assisté !')
        } else {
          toast.success('Article de compétition généré avec succès par l\'IA !')
        }

        if (result.instagramText) {
          setGeneratedInstagramText(result.instagramText)
        }

        onArticleGenerated({
          titre: result.titre,
          slug: result.slug,
          contenu: result.contenu,
          auteur: 'Entraîneurs Triton Club',
          datePubli: new Date().toISOString().split('T')[0],
          instagramText: result.instagramText,
        })
      } else {
        toast.error(data.error || 'Erreur lors de la génération par l\'IA.')
      }
    } catch (error) {
      console.error('Erreur IA:', error)
      toast.error('Erreur réseau lors de la génération.')
    } finally {
      setLoading(false)
    }
  }

  const copyInstagramText = () => {
    if (!generatedInstagramText) return
    navigator.clipboard.writeText(generatedInstagramText)
    setCopiedInstagram(true)
    toast.success('Texte Instagram copié dans le presse-papier !')
    setTimeout(() => setCopiedInstagram(false), 3000)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col border border-slate-200">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl">✨</span>
            <h3 className="text-lg font-bold">Générateur d'Article IA (Résultats de Compétition)</h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors text-xl font-bold p-1"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-4 text-slate-800 text-sm">
          {events.length > 0 && (
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                📅 Sélectionner une compétition du calendrier (optionnel)
              </label>
              <select
                value={selectedEventId}
                onChange={(e) => handleSelectEvent(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-slate-50 focus:bg-white"
              >
                <option value="">-- Choisir une compétition enregistrée --</option>
                {events.map((ev) => (
                  <option key={ev.id} value={ev.id}>
                    {ev.title} ({ev.lieu || 'Sans lieu'})
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Nom de la compétition</label>
              <input
                type="text"
                value={competitionName}
                onChange={(e) => setCompetitionName(e.target.value)}
                placeholder="Ex: Meeting Régional Benjamins"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Lieu / Piscine</label>
              <input
                type="text"
                value={lieu}
                onChange={(e) => setLieu(e.target.value)}
                placeholder="Ex: Avignon - Stuart Mill"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">
              🔗 URL officielle LiveFFN (recommandé)
            </label>
            <input
              type="url"
              value={liveffnUrl}
              onChange={(e) => setLiveffnUrl(e.target.value)}
              placeholder="Ex: https://www.liveffn.com/cgi-bin/resultats.php?competition=94240&langue=fra"
              className="w-full px-3.5 py-2.5 border border-blue-300 bg-blue-50/50 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-blue-600 outline-none font-mono text-xs"
            />
            <p className="text-[11px] text-slate-500 mt-1">
              💡 Collez simplement le lien de la compétition LiveFFN : l'IA en tirera automatiquement les podiums et temps de nos nageurs !
            </p>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">
              📝 Résultats bruts / Notes du coach ou export FFN *
            </label>
            <textarea
              rows={5}
              value={rawNotes}
              onChange={(e) => setRawNotes(e.target.value)}
              placeholder="Collez ici les résultats ou vos notes du week-end (ex: Lucas 1er au 100 NL 54s2, Emma 2e 50 dos, 4x50 NL benjamins en or, 15 records personnels battus)..."
              className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm font-sans focus:ring-2 focus:ring-slate-900 outline-none"
            />
          </div>

          <div className="p-3 bg-amber-50/80 border border-amber-200 rounded-xl flex items-start gap-2.5">
            <input
              type="checkbox"
              id="groupByBirthYear"
              checked={groupByBirthYear}
              onChange={(e) => setGroupByBirthYear(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-amber-400 text-amber-600 focus:ring-amber-500 cursor-pointer"
            />
            <label htmlFor="groupByBirthYear" className="text-xs text-amber-950 font-medium cursor-pointer leading-tight">
              <strong>📊 Re-classer & valoriser par année de naissance / sous-catégories d'âge</strong> (ex: séparer J14, J15, J16, J17 afin de valoriser un J15 qui est bas dans le classement général Juniors).
            </label>
          </div>

          {generatedInstagramText && (
            <div className="p-4 bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs uppercase tracking-wider text-purple-900 flex items-center gap-1.5">
                  <span>📸</span> Version réseaux sociaux (Instagram / Facebook)
                </span>
                <button
                  type="button"
                  onClick={copyInstagramText}
                  className="px-3 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded-md text-xs font-bold transition-all shadow-xs"
                >
                  {copiedInstagram ? '✓ Copié !' : 'Copier le post'}
                </button>
              </div>
              <p className="text-xs text-slate-700 whitespace-pre-wrap font-sans bg-white/80 p-3 rounded-lg border border-purple-100">
                {generatedInstagramText}
              </p>
            </div>
          )}

          {isGenerated && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl space-y-1">
              <p className="text-xs font-bold text-emerald-900 flex items-center gap-1.5">
                <span>✅</span> L'article a été généré et pré-rempli dans l'éditeur ci-dessous !
              </p>
              <p className="text-[11px] text-emerald-700">
                Vous pouvez copier le post Instagram ci-dessus ou cliquer sur « Ouvrir l'éditeur » pour vérifier, ajouter une photo et publier l'article.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-200/60 rounded-lg transition-colors cursor-pointer"
          >
            Fermer
          </button>
          {isGenerated ? (
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-xl transition-all shadow-sm flex items-center gap-2 cursor-pointer"
            >
              <span>👉</span>
              <span>Ouvrir l'éditeur et finaliser l'article</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={handleGenerate}
              disabled={loading}
              className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm rounded-xl transition-all shadow-sm flex items-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              {loading ? (
                <>
                  <span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                  <span>Génération par l'IA en cours...</span>
                </>
              ) : (
                <>
                  <span>✨</span>
                  <span>Générer l'article</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
