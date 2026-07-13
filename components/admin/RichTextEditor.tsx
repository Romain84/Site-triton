'use client'

import { useRef, useState } from 'react'

interface RichTextEditorProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  rows?: number
}

type ToolbarButton = {
  icon?: string
  title?: string
  className?: string
  command?:
    | 'bold'
    | 'italic'
    | 'underline'
    | 'h1'
    | 'h2'
    | 'h3'
    | 'ul'
    | 'ol'
    | 'link'
    | 'email'
    | 'paragraph'
    | 'separator'
    | 'hr'
    | 'info'
    | 'warning'
}

const toolbarButtons: ToolbarButton[] = [
  { icon: 'B', command: 'bold', title: 'Gras', className: 'font-bold' },
  { icon: 'I', command: 'italic', title: 'Italique', className: 'italic' },
  { icon: 'U', command: 'underline', title: 'Souligné', className: 'underline' },
  { command: 'separator' },
  { icon: 'H1', command: 'h1', title: 'Titre principal' },
  { icon: 'H2', command: 'h2', title: 'Sous-titre' },
  { icon: 'H3', command: 'h3', title: 'Petit titre' },
  { command: 'separator' },
  { icon: '•', command: 'ul', title: 'Liste à puces' },
  { icon: '1.', command: 'ol', title: 'Liste numérotée' },
  { command: 'separator' },
  { icon: '🔗', command: 'link', title: 'Lien' },
  { icon: '📧', command: 'email', title: 'Email' },
  { command: 'separator' },
  { icon: '¶', command: 'paragraph', title: 'Paragraphe' },
  { icon: '—', command: 'hr', title: 'Séparateur' },
  { icon: '📦', command: 'info', title: 'Encadré info' },
  { icon: '⚠️', command: 'warning', title: 'Encadré attention' },
]

export default function RichTextEditor({
  value,
  onChange,
  placeholder = 'Contenu...',
  rows = 12,
}: RichTextEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const [showPreview, setShowPreview] = useState(false)

  // Insère des balises HTML autour du texte sélectionné ou à la position du curseur.
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

    // Restaure le focus et la position du curseur après la mise à jour.
    setTimeout(() => {
      textarea.focus()
      const newCursorPos = start + tagStart.length + (selectedText ? selectedText.length : 0) + tagEnd.length
      textarea.setSelectionRange(newCursorPos, newCursorPos)
    }, 0)
  }

  // Insère un bloc HTML à la position du curseur.
  const insertBlock = (block: string) => {
    const textarea = textareaRef.current
    if (!textarea) return

    const start = textarea.selectionStart
    const beforeCursor = value.substring(0, start)
    const afterCursor = value.substring(start)

    // Ajoute des retours à la ligne si nécessaire.
    const prefix = beforeCursor.length > 0 && !beforeCursor.endsWith('\n') ? '\n\n' : ''

    const newValue = beforeCursor + prefix + block + afterCursor
    onChange(newValue)

    setTimeout(() => {
      textarea.focus()
      const newCursorPos = start + prefix.length + block.length
      textarea.setSelectionRange(newCursorPos, newCursorPos)
    }, 0)
  }

  const handleToolbarAction = (command?: ToolbarButton['command']) => {
    switch (command) {
      case 'bold':
        insertTag('<strong>', '</strong>')
        return
      case 'italic':
        insertTag('<em>', '</em>')
        return
      case 'underline':
        insertTag('<u>', '</u>')
        return
      case 'h1':
        insertTag('<h2 class="text-2xl font-bold mt-6 mb-4">', '</h2>')
        return
      case 'h2':
        insertTag('<h3 class="text-xl font-bold mt-4 mb-2">', '</h3>')
        return
      case 'h3':
        insertTag('<h4 class="text-lg font-semibold mt-3 mb-2">', '</h4>')
        return
      case 'ul':
        insertBlock('<ul class="list-disc ml-6 my-4">\n  <li></li>\n</ul>')
        return
      case 'ol':
        insertBlock('<ol class="list-decimal ml-6 my-4">\n  <li></li>\n</ol>')
        return
      case 'link': {
        const url = prompt('URL du lien:', 'https://')
        if (url) {
          insertTag(`<a href="${url}" class="text-primary hover:underline" target="_blank">`, '</a>')
        }
        return
      }
      case 'email': {
        const email = prompt('Adresse email:', '')
        if (email) {
          insertTag(`<a href="mailto:${email}" class="text-primary hover:underline">`, '</a>')
        }
        return
      }
      case 'paragraph':
        insertBlock('<p class="my-4"></p>')
        return
      case 'hr':
        insertBlock('<hr class="my-6 border-gray-300" />')
        return
      case 'info':
        insertBlock('<div class="bg-blue-50 border-l-4 border-blue-500 p-4 my-4">\n  <p class="text-blue-800"></p>\n</div>')
        return
      case 'warning':
        insertBlock('<div class="bg-amber-50 border-l-4 border-amber-500 p-4 my-4">\n  <p class="text-amber-800 font-semibold">Important:</p>\n  <p class="text-amber-700"></p>\n</div>')
        return
      default:
        return
    }
  }

  return (
    <div className="border border-gray-300 rounded-lg overflow-hidden">
      {/* Toolbar */}
      <div className="bg-gray-50 border-b border-gray-300 p-2 flex flex-wrap gap-1">
        {toolbarButtons.map((btn, index) =>
          btn.command === 'separator' ? (
            <div key={index} className="w-px h-6 bg-gray-300 mx-1 self-center" />
          ) : (
            <button
              key={index}
              type="button"
              onClick={() => handleToolbarAction(btn.command)}
              title={btn.title}
              className={`px-2 py-1 text-sm rounded hover:bg-gray-200 transition-colors ${btn.className || ''}`}
            >
              {btn.icon}
            </button>
          )
        )}
        <div className="flex-1" />
        <button
          type="button"
          onClick={() => setShowPreview(!showPreview)}
          className={`px-3 py-1 text-sm rounded transition-colors ${
            showPreview ? 'bg-primary text-white' : 'hover:bg-gray-200'
          }`}
        >
          {showPreview ? 'Éditer' : 'Aperçu'}
        </button>
      </div>

      {/* Editor / Preview */}
      {showPreview ? (
        <div
          className="p-4 min-h-[300px] bg-white prose prose-sm max-w-none"
          dangerouslySetInnerHTML={{ __html: value || '<p class="text-gray-400">Aucun contenu</p>' }}
        />
      ) : (
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={rows}
          className="w-full p-4 border-0 focus:ring-0 focus:outline-none resize-y font-mono text-sm"
        />
      )}

      {/* Help text */}
      <div className="bg-gray-50 border-t border-gray-300 px-4 py-2">
        <p className="text-xs text-gray-500">
          <strong>Astuce:</strong> Sélectionnez du texte puis cliquez sur un bouton pour appliquer le formatage.
          Vous pouvez utiliser du HTML directement.
        </p>
      </div>
    </div>
  )
}
