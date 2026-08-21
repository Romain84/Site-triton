import DOMPurify from 'isomorphic-dompurify'

/**
 * Sanitize HTML content to prevent XSS attacks
 * @param dirty - Unsanitized HTML string
 * @returns Sanitized HTML string safe for rendering
 */
export function sanitizeHtml(dirty: string): string {
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: [
      'p', 'br', 'strong', 'b', 'em', 'i', 'u', 's', 'strike', 'sub', 'sup', 'mark',
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'ul', 'ol', 'li', 'a', 'blockquote', 'code', 'pre', 'hr', 'img', 'span', 'div',
      'table', 'thead', 'tbody', 'tr', 'th', 'td', 'iframe'
    ],
    ALLOWED_ATTR: ['href', 'target', 'rel', 'src', 'alt', 'title', 'class', 'style', 'width', 'height', 'frameborder', 'allow', 'allowfullscreen'],
    ALLOW_DATA_ATTR: false,
  })
}

/**
 * Convert newlines to <br> tags and sanitize
 * @param text - Plain text with newlines
 * @returns Sanitized HTML with br tags
 */
export function nl2brSanitized(text: string): string {
  const htmlWithBr = text.replace(/\n/g, '<br />')
  return sanitizeHtml(htmlWithBr)
}

/**
 * Convert Markdown and HTML to Sanitized HTML for rendering in actualités.
 * Supports HTML tags, headings, lists, bold, italics, links, and line breaks.
 * @param markdown - Markdown or HTML string
 * @returns Sanitized HTML string safe for rendering
 */
export function markdownSanitized(markdown: string): string {
  if (!markdown) return ''

  // 1. Helper for inline parsing (preserves HTML tags for DOMPurify sanitization)
  const parseInline = (text: string): string => {
    let html = text

    // Bold (**text** or __text__)
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    html = html.replace(/__(.*?)__/g, '<strong>$1</strong>')

    // Italics (*text* or _text_)
    html = html.replace(/\*(.*?)\*/g, '<em>$1</em>')
    html = html.replace(/_(.*?)_/g, '<em>$1</em>')

    // Links ([text](url))
    html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (match, linkText, url) => {
      const isExternal = url.startsWith('http')
      const target = isExternal ? ' target="_blank" rel="noopener noreferrer"' : ''
      return `<a href="${url}" class="text-primary hover:underline font-semibold"${target}>${linkText}</a>`
    })

    return html
  }

  // 2. Split by double newlines into blocks
  const blocks = markdown.split(/\n\s*\n/)
  const parsedBlocks = blocks.map((block) => {
    const trimmed = block.trim()
    if (!trimmed) return ''

    // Headings (H1 to H6)
    if (/^(#{1,6})\s+/.test(trimmed)) {
      const match = trimmed.match(/^(#{1,6})\s+(.*)$/)
      if (match) {
        const level = match[1].length
        const content = match[2]
        return `<h${level}>${parseInline(content)}</h${level}>`
      }
    }

    // Unordered List
    if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      const lines = trimmed.split('\n').filter(line => line.trim().length > 0)
      const items = lines
        .map((line) => {
          const content = line.replace(/^[-*]\s+/, '')
          return `<li>${parseInline(content)}</li>`
        })
        .join('')
      return `<ul class="list-disc list-inside space-y-1 my-3">${items}</ul>`
    }

    // Ordered List
    if (/^\d+\.\s+/.test(trimmed)) {
      const lines = trimmed.split('\n').filter(line => line.trim().length > 0)
      const items = lines
        .map((line) => {
          const content = line.replace(/^\d+\.\s+/, '')
          return `<li>${parseInline(content)}</li>`
        })
        .join('')
      return `<ol class="list-decimal list-inside space-y-1 my-3">${items}</ol>`
    }

    // If block is already an HTML block tag (like <p>, <div>, <h1>..<h6>, <ul>, <ol>, blockquote, table, section, etc.)
    if (/^<(p|div|h[1-6]|ul|ol|blockquote|table|section|article|header|footer|figure|hr)\b/i.test(trimmed)) {
      return parseInline(trimmed)
    }

    // Paragraph
    const paragraphHtml = parseInline(trimmed).replace(/\n/g, '<br />')
    return `<p>${paragraphHtml}</p>`
  })

  const html = parsedBlocks.filter(Boolean).join('\n')
  return sanitizeHtml(html)
}

