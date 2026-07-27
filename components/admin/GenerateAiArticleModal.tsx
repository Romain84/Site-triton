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
  const [rawNotes, setRawNotes] = useState<string>('')
  const [generatedInstagramText, setGeneratedInstagramText] = useState<string>('')
  const [copiedInstagram, setCopiedInstagram] = useState(false)

  useEffect(() => {
    if (isOpen) {
      fetchEvents()
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
    if (!rawNotes.trim()) {
      toast.error('Veuillez saisir ou coller les résultats de la compétition.')
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
        }),
      })

      const data = await response.json()

      if (response.ok && data.success && data.data) {
        toast.success('Article de compétition généré avec succès par l\'IA !')
        const result = data.data

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
              📝 Résultats bruts / Notes du coach ou export FFN *
            </label>
            <textarea
              rows={6}
              value={rawNotes}
              onChange={(e) => setRawNotes(e.target.value)}
              placeholder="Collez ici les résultats ou vos notes du week-end (ex: Lucas 1er au 100 NL 54s2, Emma 2e 50 dos, 4x50 NL benjamins en or, 15 records personnels battus)..."
              className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm font-sans focus:ring-2 focus:ring-slate-900 outline-none"
            />
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
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-200/60 rounded-lg transition-colors"
          >
            Fermer
          </button>
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
        </div>
      </div>
    </div>
  )
}
