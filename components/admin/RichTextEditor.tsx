'use client'

import { useRef, useState } from 'react'
import { sanitizeHtml } from '@/lib/sanitize'

interface RichTextEditorProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  rows?: number
}

// Couleurs prédéfinies pour le texte
const TEXT_COLORS = [
  { name: 'Bleu Triton', color: '#0284c7', class: 'bg-sky-600' },
  { name: 'Bleu Marine', color: '#1e3a8a', class: 'bg-blue-900' },
  { name: 'Cyan Lagon', color: '#06b6d4', class: 'bg-cyan-500' },
  { name: 'Vert Succès', color: '#16a34a', class: 'bg-emerald-600' },
  { name: 'Orange Alerte', color: '#ea580c', class: 'bg-orange-600' },
  { name: 'Rouge Flash', color: '#dc2626', class: 'bg-red-600' },
  { name: 'Violet Événement', color: '#9333ea', class: 'bg-purple-600' },
  { name: 'Gris Ardoise', color: '#334155', class: 'bg-slate-700' },
  { name: 'Noir Ébène', color: '#0f172a', class: 'bg-slate-900' },
]

// Couleurs de surlignage
const HIGHLIGHT_COLORS = [
  { name: 'Jaune Fluo', color: '#fef08a', text: '#854d0e', class: 'bg-yellow-200' },
  { name: 'Bleu Doux', color: '#bae6fd', text: '#0369a1', class: 'bg-sky-200' },
  { name: 'Vert Menthe', color: '#bbf7d0', text: '#15803d', class: 'bg-emerald-200' },
  { name: 'Orange Pêche', color: '#fed7aa', text: '#9a3412', class: 'bg-orange-200' },
  { name: 'Rose Bonbon', color: '#fbcfe8', text: '#9d174d', class: 'bg-pink-200' },
]

export default function RichTextEditor({
  value,
  onChange,
  placeholder = 'Rédigez votre article ici...',
  rows = 14,
}: RichTextEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const [viewMode, setViewMode] = useState<'editor' | 'split' | 'preview'>('editor')
  const [showColorPicker, setShowColorPicker] = useState(false)
  const [showHighlightPicker, setShowHighlightPicker] = useState(false)
  const [showTemplates, setShowTemplates] = useState(false)
  const [customColor, setCustomColor] = useState('#0284c7')

  // Insère des balises HTML autour du texte sélectionné ou à la position du curseur
  const insertTag = (tagStart: string, tagEnd: string = '') => {
    const textarea = textareaRef.current
    if (!textarea) return

    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const selectedText = value.substring(start, end)

    const newValue =
      value.substring(0, start) +
      tagStart +
      selectedText +
      tagEnd +
      value.substring(end)

    onChange(newValue)

    setTimeout(() => {
      textarea.focus()
      const newCursorPos = start + tagStart.length + (selectedText ? selectedText.length : 0) + tagEnd.length
      textarea.setSelectionRange(newCursorPos, newCursorPos)
    }, 0)
  }

  // Insère un bloc HTML à la position du curseur
  const insertBlock = (block: string) => {
    const textarea = textareaRef.current
    if (!textarea) return

    const start = textarea.selectionStart
    const beforeCursor = value.substring(0, start)
    const afterCursor = value.substring(start)

    const prefix = beforeCursor.length > 0 && !beforeCursor.endsWith('\n') ? '\n\n' : ''

    const newValue = beforeCursor + prefix + block + afterCursor
    onChange(newValue)

    setTimeout(() => {
      textarea.focus()
      const newCursorPos = start + prefix.length + block.length
      textarea.setSelectionRange(newCursorPos, newCursorPos)
    }, 0)
  }

  // Appliquer une couleur de texte
  const applyTextColor = (color: string) => {
    insertTag(`<span style="color: ${color}; font-weight: 600;">`, '</span>')
    setShowColorPicker(false)
  }

  // Appliquer un surlignage
  const applyHighlight = (bg: string, text: string) => {
    insertTag(`<mark style="background-color: ${bg}; color: ${text}; padding: 2px 6px; border-radius: 4px; font-weight: 600;">`, '</mark>')
    setShowHighlightPicker(false)
  }

  // Insérer un lien normal ou bouton
  const handleInsertLink = (isButton: boolean = false) => {
    const url = prompt('Adresse URL du lien (ex: https://...):', 'https://')
    if (!url) return
    const text = prompt('Texte du lien :', 'Cliquez ici') || url

    if (isButton) {
      insertBlock(
        `<div class="my-6 text-center">\n  <a href="${url}" target="_blank" rel="noopener noreferrer" style="display: inline-block; background-color: #0284c7; color: #ffffff; padding: 12px 24px; border-radius: 12px; font-weight: 800; text-decoration: none; box-shadow: 0 4px 6px -1px rgba(2, 132, 199, 0.2);">\n    ${text} →\n  </a>\n</div>`
      )
    } else {
      insertTag(`<a href="${url}" target="_blank" rel="noopener noreferrer" style="color: #0284c7; text-decoration: underline; font-weight: 700;">${text}`, '</a>')
    }
  }

  // Modèles d'articles pré-remplis
  const applyTemplate = (templateType: 'competition' | 'stage' | 'annonce') => {
    if (value.trim().length > 0 && !confirm('Voulez-vous insérer ce modèle à la suite de votre texte ?')) {
      return
    }

    let templateHtml = ''
    if (templateType === 'competition') {
      templateHtml = `
<h2 style="color: #0284c7; font-size: 1.75rem; font-weight: 900; margin-bottom: 1rem;">🏆 Résultats de la Compétition</h2>

<p style="font-size: 1.1rem; line-height: 1.6;">
  Ce week-end s'est déroulée la compétition régionale. Nos nageurs cavaillonnais ont brillamment représenté les couleurs du <strong>Triton Club Cavaillon</strong> !
</p>

<div style="background-color: #f0fdf4; border-left: 5px solid #22c55e; padding: 16px 20px; border-radius: 12px; margin: 24px 0;">
  <h3 style="color: #166534; font-weight: 800; font-size: 1.15rem; margin-bottom: 8px;">🥇 Podiums & Performances remarquables :</h3>
  <ul style="color: #14532d; font-size: 0.95rem; line-height: 1.8; margin-left: 1.25rem;">
    <li><strong>Nageur 1 :</strong> 1ère place au 100m Nage Libre (record personnel)</li>
    <li><strong>Nageur 2 :</strong> Médaille d'argent au 50m Papillon</li>
    <li><strong>Relais 4x50m :</strong> Magnifique 3ème place sur le podium !</li>
  </ul>
</div>

<p style="margin: 16px 0;">
  Un grand bravo à l'ensemble du groupe, aux entraîneurs ainsi qu'aux officiels et parents accompagnateurs pour leur engagement sans faille !
</p>

<div style="text-align: center; margin: 32px 0;">
  <a href="/competitions" style="display: inline-block; background-color: #0284c7; color: #ffffff; padding: 12px 24px; border-radius: 12px; font-weight: 800; text-decoration: none;">
    Consulter tous les résultats →
  </a>
</div>
`.trim()
    } else if (templateType === 'stage') {
      templateHtml = `
<h2 style="color: #0284c7; font-size: 1.75rem; font-weight: 900; margin-bottom: 1rem;">🏊 Stages de Vacances : Perfectionnement & Plaisir</h2>

<p style="font-size: 1.05rem; line-height: 1.6;">
  Le Triton Club Cavaillon organise des <strong>stages de natation</strong> durant les vacances scolaires pour progresser, perfectionner ses nages et s'amuser.
</p>

<div style="background-color: #eff6ff; border-left: 5px solid #3b82f6; padding: 16px 20px; border-radius: 12px; margin: 20px 0;">
  <h3 style="color: #1e40af; font-weight: 800; margin-bottom: 8px;">📅 Modalités & Horaires du Stage :</h3>
  <p style="color: #1e3a8a; margin-bottom: 6px;"><strong>Dates :</strong> Du lundi au vendredi</p>
  <p style="color: #1e3a8a; margin-bottom: 6px;"><strong>Créneaux :</strong> De 10h00 à 11h30 (selon les groupes)</p>
  <p style="color: #1e3a8a; margin-bottom: 0;"><strong>Lieu :</strong> Piscine Municipale Plein Ciel de Cavaillon</p>
</div>

<div style="background-color: #fefce8; border: 1px solid #fde047; padding: 14px 18px; border-radius: 12px; margin: 20px 0;">
  <p style="color: #854d0e; font-weight: 700; margin: 0;">
    ⚠️ Places limitées à 12 nageurs par session pour garantir un encadrement personnalisé.
  </p>
</div>

<div style="text-align: center; margin: 28px 0;">
  <a href="/inscription" style="display: inline-block; background-color: #16a34a; color: #ffffff; padding: 12px 24px; border-radius: 12px; font-weight: 800; text-decoration: none;">
    Réserver une place en ligne →
  </a>
</div>
`.trim()
    } else {
      templateHtml = `
<h2 style="color: #0f172a; font-size: 1.75rem; font-weight: 900; margin-bottom: 1rem;">📢 Information Importante du Club</h2>

<p style="font-size: 1.05rem; line-height: 1.6;">
  Chers adhérents, veuillez prendre note des informations suivantes concernant la vie du club :
</p>

<div style="background-color: #f8fafc; border: 1px solid #e2e8f0; padding: 18px 20px; border-radius: 14px; margin: 20px 0;">
  <h3 style="color: #0284c7; font-weight: 800; margin-bottom: 10px;">📌 Points Clés à retenir :</h3>
  <ul style="color: #334155; line-height: 1.8; margin-left: 1.25rem;">
    <li><strong>Point 1 :</strong> Détail de la consigne ou de la modification...</li>
    <li><strong>Point 2 :</strong> Rappel des horaires ou des pièces à fournir...</li>
  </ul>
</div>

<p style="margin: 16px 0; color: #475569;">
  Pour toute question complémentaire, notre secrétariat reste à votre entière disposition.
</p>
`.trim()
    }

    insertBlock(templateHtml)
    setShowTemplates(false)
  }

  return (
    <div className="border border-slate-300 rounded-2xl overflow-hidden bg-white shadow-xs">
      {/* ─── Barre d'outils principale ───────────────────────── */}
      <div className="bg-slate-50 border-b border-slate-200 p-2.5 space-y-2">
        {/* Ligne 1 : Formatage & Couleurs & Sauts de ligne */}
        <div className="flex flex-wrap items-center gap-1.5">
          {/* Formatage de base */}
          <div className="flex items-center bg-white border border-slate-200 rounded-lg p-0.5 shadow-2xs">
            <button
              type="button"
              onClick={() => insertTag('<strong>', '</strong>')}
              title="Gras (Ctrl+B)"
              className="px-2.5 py-1 text-xs font-black text-slate-800 hover:bg-slate-100 rounded transition-colors"
            >
              B
            </button>
            <button
              type="button"
              onClick={() => insertTag('<em>', '</em>')}
              title="Italique"
              className="px-2.5 py-1 text-xs font-serif italic text-slate-800 hover:bg-slate-100 rounded transition-colors"
            >
              I
            </button>
            <button
              type="button"
              onClick={() => insertTag('<u>', '</u>')}
              title="Souligné"
              className="px-2.5 py-1 text-xs underline font-semibold text-slate-800 hover:bg-slate-100 rounded transition-colors"
            >
              U
            </button>
            <button
              type="button"
              onClick={() => insertTag('<s>', '</s>')}
              title="Barré"
              className="px-2.5 py-1 text-xs line-through text-slate-500 hover:bg-slate-100 rounded transition-colors"
            >
              S
            </button>
          </div>

          {/* Couleurs de texte & Surlignage */}
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setShowColorPicker(!showColorPicker)
                setShowHighlightPicker(false)
                setShowTemplates(false)
              }}
              title="Couleur du texte"
              className="px-2.5 py-1.5 text-xs font-bold bg-white border border-slate-200 hover:bg-slate-100 rounded-lg shadow-2xs flex items-center gap-1.5 text-slate-800"
            >
              <span className="w-3.5 h-3.5 rounded-full border border-slate-300" style={{ backgroundColor: customColor }} />
              <span>Couleur ▾</span>
            </button>

            {showColorPicker && (
              <div className="absolute top-full left-0 mt-1 z-50 bg-white border border-slate-200 rounded-xl p-3 shadow-xl w-60 space-y-2.5">
                <span className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider block">Couleur du texte</span>
                <div className="grid grid-cols-3 gap-1.5">
                  {TEXT_COLORS.map((c) => (
                    <button
                      key={c.color}
                      type="button"
                      onClick={() => applyTextColor(c.color)}
                      className="flex items-center gap-1.5 p-1.5 rounded-lg border border-slate-200 hover:border-slate-400 text-left text-[11px] font-semibold transition-all hover:scale-[1.02]"
                    >
                      <span className={`w-3.5 h-3.5 rounded-full shrink-0 ${c.class}`} />
                      <span className="truncate text-slate-800">{c.name.split(' ')[0]}</span>
                    </button>
                  ))}
                </div>
                <div className="pt-2 border-t border-slate-100 flex items-center gap-2">
                  <input
                    type="color"
                    value={customColor}
                    onChange={(e) => setCustomColor(e.target.value)}
                    className="w-7 h-7 rounded cursor-pointer border border-slate-300 p-0"
                  />
                  <button
                    type="button"
                    onClick={() => applyTextColor(customColor)}
                    className="flex-1 py-1 px-2 bg-slate-900 text-white rounded-lg text-xs font-bold hover:bg-slate-800"
                  >
                    Appliquer ({customColor})
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Surlignage */}
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setShowHighlightPicker(!showHighlightPicker)
                setShowColorPicker(false)
                setShowTemplates(false)
              }}
              title="Surligner le texte"
              className="px-2.5 py-1.5 text-xs font-bold bg-white border border-slate-200 hover:bg-slate-100 rounded-lg shadow-2xs flex items-center gap-1 text-slate-800"
            >
              <span>🖍️ Surligner ▾</span>
            </button>

            {showHighlightPicker && (
              <div className="absolute top-full left-0 mt-1 z-50 bg-white border border-slate-200 rounded-xl p-3 shadow-xl w-56 space-y-2">
                <span className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider block">Surlignage</span>
                <div className="space-y-1">
                  {HIGHLIGHT_COLORS.map((h) => (
                    <button
                      key={h.color}
                      type="button"
                      onClick={() => applyHighlight(h.color, h.text)}
                      className="w-full flex items-center gap-2 p-1.5 rounded-lg border border-slate-200 hover:border-slate-400 text-left text-xs font-bold transition-all"
                      style={{ backgroundColor: h.color, color: h.text }}
                    >
                      <span className="w-3 h-3 rounded-full border border-black/10" />
                      <span>{h.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Titres & Tailles */}
          <div className="flex items-center bg-white border border-slate-200 rounded-lg p-0.5 shadow-2xs">
            <button
              type="button"
              onClick={() => insertTag('<h2 style="color: #0284c7; font-size: 1.6rem; font-weight: 900; margin-top: 1.5rem; margin-bottom: 0.75rem;">', '</h2>')}
              title="Grand Titre H2"
              className="px-2 py-1 text-xs font-black text-sky-800 hover:bg-sky-50 rounded"
            >
              H2
            </button>
            <button
              type="button"
              onClick={() => insertTag('<h3 style="color: #0f172a; font-size: 1.25rem; font-weight: 800; margin-top: 1.25rem; margin-bottom: 0.5rem;">', '</h3>')}
              title="Sous-titre H3"
              className="px-2 py-1 text-xs font-bold text-slate-700 hover:bg-slate-100 rounded"
            >
              H3
            </button>
            <button
              type="button"
              onClick={() => insertTag('<span style="font-size: 1.15rem; line-height: 1.6;">', '</span>')}
              title="Texte plus grand"
              className="px-2 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded"
            >
              A+
            </button>
          </div>

          {/* Sauts de ligne & Espacements essentiels */}
          <div className="flex items-center bg-white border border-slate-200 rounded-lg p-0.5 shadow-2xs">
            <button
              type="button"
              onClick={() => insertTag('<br />')}
              title="Insérer un saut de ligne direct (<br />)"
              className="px-2.5 py-1 text-xs font-bold text-slate-800 hover:bg-slate-100 rounded flex items-center gap-1"
            >
              <span className="font-mono text-primary font-black">↵</span>
              <span>Saut de ligne</span>
            </button>
            <button
              type="button"
              onClick={() => insertBlock('<div style="margin: 1.5rem 0;"></div>')}
              title="Insérer un espacement vertical plus large"
              className="px-2 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded"
            >
              ↕ Espace
            </button>
            <button
              type="button"
              onClick={() => insertBlock('<hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 2rem 0;" />')}
              title="Ligne de séparation horizontale"
              className="px-2 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded"
            >
              — Ligne
            </button>
          </div>

          {/* Alignement */}
          <div className="flex items-center bg-white border border-slate-200 rounded-lg p-0.5 shadow-2xs">
            <button
              type="button"
              onClick={() => insertTag('<div style="text-align: left;">', '</div>')}
              title="Aligner à gauche"
              className="px-2 py-1 text-xs hover:bg-slate-100 rounded text-slate-700 font-bold"
            >
              ⫷
            </button>
            <button
              type="button"
              onClick={() => insertTag('<div style="text-align: center;">', '</div>')}
              title="Centrer le texte"
              className="px-2 py-1 text-xs hover:bg-slate-100 rounded text-slate-700 font-bold"
            >
              ≡
            </button>
            <button
              type="button"
              onClick={() => insertTag('<div style="text-align: right;">', '</div>')}
              title="Aligner à droite"
              className="px-2 py-1 text-xs hover:bg-slate-100 rounded text-slate-700 font-bold"
            >
              ⫸
            </button>
          </div>

          {/* Listes */}
          <div className="flex items-center bg-white border border-slate-200 rounded-lg p-0.5 shadow-2xs">
            <button
              type="button"
              onClick={() => insertBlock('<ul style="list-style-type: disc; margin-left: 1.5rem; margin-top: 0.75rem; margin-bottom: 0.75rem; line-height: 1.8;">\n  <li>Premier point</li>\n  <li>Deuxième point</li>\n</ul>')}
              title="Liste à puces"
              className="px-2.5 py-1 text-xs font-bold text-slate-800 hover:bg-slate-100 rounded"
            >
              • Liste
            </button>
            <button
              type="button"
              onClick={() => insertBlock('<ol style="list-style-type: decimal; margin-left: 1.5rem; margin-top: 0.75rem; margin-bottom: 0.75rem; line-height: 1.8;">\n  <li>Étape 1</li>\n  <li>Étape 2</li>\n</ol>')}
              title="Liste numérotée"
              className="px-2.5 py-1 text-xs font-bold text-slate-800 hover:bg-slate-100 rounded"
            >
              1. 2.
            </button>
          </div>

          {/* Liens & Boutons */}
          <div className="flex items-center bg-white border border-slate-200 rounded-lg p-0.5 shadow-2xs">
            <button
              type="button"
              onClick={() => handleInsertLink(false)}
              title="Insérer un lien cliquable"
              className="px-2.5 py-1 text-xs font-bold text-slate-800 hover:bg-slate-100 rounded"
            >
              🔗 Lien
            </button>
            <button
              type="button"
              onClick={() => handleInsertLink(true)}
              title="Insérer un bouton d'action attractif"
              className="px-2.5 py-1 text-xs font-bold text-sky-800 bg-sky-50 hover:bg-sky-100 rounded"
            >
              🔘 Bouton
            </button>
          </div>
        </div>

        {/* Ligne 2 : Encadrés Pro & Modèles & Modes de vue */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-200/60">
          {/* Encadrés pré-conçus */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider mr-1">Encadrés :</span>
            
            <button
              type="button"
              onClick={() => insertBlock('<div style="background-color: #eff6ff; border-left: 5px solid #0284c7; padding: 14px 18px; border-radius: 12px; margin: 1.25rem 0;">\n  <p style="color: #0369a1; font-weight: 800; margin-bottom: 4px;">ℹ️ Information :</p>\n  <p style="color: #0c4a6e; margin: 0;">Votre texte informatif ici...</p>\n</div>')}
              className="px-2 py-1 text-[11px] font-bold bg-sky-50 hover:bg-sky-100 text-sky-800 border border-sky-200 rounded-lg transition-colors"
            >
              Info (Bleu)
            </button>

            <button
              type="button"
              onClick={() => insertBlock('<div style="background-color: #fefce8; border-left: 5px solid #eab308; padding: 14px 18px; border-radius: 12px; margin: 1.25rem 0;">\n  <p style="color: #a16207; font-weight: 800; margin-bottom: 4px;">⚠️ Important :</p>\n  <p style="color: #713f12; margin: 0;">Votre rappel important ici...</p>\n</div>')}
              className="px-2 py-1 text-[11px] font-bold bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 rounded-lg transition-colors"
            >
              Attention (Jaune)
            </button>

            <button
              type="button"
              onClick={() => insertBlock('<div style="background-color: #f0fdf4; border-left: 5px solid #22c55e; padding: 14px 18px; border-radius: 12px; margin: 1.25rem 0;">\n  <p style="color: #15803d; font-weight: 800; margin-bottom: 4px;">✅ Succès / Félicitations :</p>\n  <p style="color: #14532d; margin: 0;">Bravo à tous les participants !</p>\n</div>')}
              className="px-2 py-1 text-[11px] font-bold bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-lg transition-colors"
            >
              Succès (Vert)
            </button>

            <button
              type="button"
              onClick={() => insertBlock('<div style="background-color: #faf5ff; border-left: 5px solid #a855f7; padding: 14px 18px; border-radius: 12px; margin: 1.25rem 0;">\n  <p style="color: #7e22ce; font-weight: 800; margin-bottom: 4px;">📅 Date à retenir :</p>\n  <p style="color: #581c87; margin: 0;">Rendez-vous le samedi à 14h00.</p>\n</div>')}
              className="px-2 py-1 text-[11px] font-bold bg-purple-50 hover:bg-purple-100 text-purple-800 border border-purple-200 rounded-lg transition-colors"
            >
              Date (Violet)
            </button>

            {/* Modèles d'actualités magiques */}
            <div className="relative inline-block ml-1">
              <button
                type="button"
                onClick={() => {
                  setShowTemplates(!showTemplates)
                  setShowColorPicker(false)
                  setShowHighlightPicker(false)
                }}
                className="px-2.5 py-1 text-[11px] font-extrabold bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-all flex items-center gap-1 shadow-2xs"
              >
                <span>✨ Modèles types ▾</span>
              </button>

              {showTemplates && (
                <div className="absolute top-full left-0 mt-1 z-50 bg-white border border-slate-200 rounded-xl p-2 shadow-xl w-64 space-y-1">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider px-2 py-1 block">Insérer une structure type</span>
                  <button
                    type="button"
                    onClick={() => applyTemplate('competition')}
                    className="w-full text-left p-2 rounded-lg hover:bg-slate-50 text-xs font-bold text-slate-800 flex items-center gap-2"
                  >
                    <span>🏆</span> Résultats de compétition
                  </button>
                  <button
                    type="button"
                    onClick={() => applyTemplate('stage')}
                    className="w-full text-left p-2 rounded-lg hover:bg-slate-50 text-xs font-bold text-slate-800 flex items-center gap-2"
                  >
                    <span>🏊</span> Stage vacances & Inscription
                  </button>
                  <button
                    type="button"
                    onClick={() => applyTemplate('annonce')}
                    className="w-full text-left p-2 rounded-lg hover:bg-slate-50 text-xs font-bold text-slate-800 flex items-center gap-2"
                  >
                    <span>📢</span> Annonce officielle du club
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Boutons de changement de vue (Éditeur / Côte à côte / Aperçu) */}
          <div className="flex items-center bg-white border border-slate-200 rounded-lg p-0.5 shadow-2xs">
            <button
              type="button"
              onClick={() => setViewMode('editor')}
              className={`px-2.5 py-1 text-xs font-bold rounded transition-colors ${
                viewMode === 'editor' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Éditer
            </button>
            <button
              type="button"
              onClick={() => setViewMode('split')}
              className={`px-2.5 py-1 text-xs font-bold rounded transition-colors hidden md:block ${
                viewMode === 'split' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Côte à côte
            </button>
            <button
              type="button"
              onClick={() => setViewMode('preview')}
              className={`px-2.5 py-1 text-xs font-bold rounded transition-colors ${
                viewMode === 'preview' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Aperçu en direct
            </button>
          </div>
        </div>
      </div>

      {/* ─── Zone d'édition et / ou Aperçu ─────────────────────── */}
      <div className={`${viewMode === 'split' ? 'grid grid-cols-2 divide-x divide-slate-200' : ''}`}>
        {/* Panneau Éditeur */}
        {(viewMode === 'editor' || viewMode === 'split') && (
          <div className="relative">
            <textarea
              ref={textareaRef}
              value={value}
              onChange={(e) => onChange(e.target.value)}
              placeholder={placeholder}
              rows={rows}
              className="w-full p-4 border-0 focus:ring-0 focus:outline-none resize-y font-mono text-sm text-slate-800 leading-relaxed bg-white"
            />
          </div>
        )}

        {/* Panneau Aperçu */}
        {(viewMode === 'preview' || viewMode === 'split') && (
          <div className="p-5 md:p-6 bg-slate-50/50 min-h-[320px] max-h-[600px] overflow-y-auto">
            <div className="bg-white rounded-xl p-5 border border-slate-200/80 shadow-xs">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-3 border-b border-slate-100 pb-1">
                Rendu de l&apos;actualité sur le site :
              </span>
              <div
                className="prose prose-sm md:prose max-w-none text-slate-800 leading-relaxed"
                dangerouslySetInnerHTML={{
                  __html: sanitizeHtml(value || '<p style="color: #94a3b8; font-style: italic;">Votre texte apparaîtra ici en direct...</p>')
                }}
              />
            </div>
          </div>
        )}
      </div>

      {/* ─── Barre d'astuce en pied ────────────────────────────── */}
      <div className="bg-slate-50 border-t border-slate-200 px-4 py-2 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-[11px] text-slate-500">
        <div>
          💡 <strong>Astuce :</strong> Sélectionnez votre texte puis cliquez sur <strong>Gras</strong>, <strong>Couleur</strong> ou <strong>Surligner</strong> pour formater instantanément. Utilisez <strong>↵ Saut de ligne</strong> pour un passage à la ligne forcé.
        </div>
        <div className="font-mono text-slate-400 text-[10px] shrink-0">
          {value.length} caractères
        </div>
      </div>
    </div>
  )
}
