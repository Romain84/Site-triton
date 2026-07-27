import { logger } from './logger'

const liveffnLogger = logger.withContext('LiveFFN')

export interface LiveFFNData {
  title: string
  location: string
  bassin: string
  tritonResults: string[]
  rawTextContent: string
}

/**
 * Extrait les données et résultats pertinents d'une compétition LiveFFN à partir de son URL
 * @param liveffnUrl URL de la compétition (ex: https://www.liveffn.com/cgi-bin/resultats.php?competition=94240&langue=fra)
 */
export async function fetchLiveFFNData(liveffnUrl: string): Promise<LiveFFNData | null> {
  try {
    if (!liveffnUrl.includes('liveffn.com')) {
      return null
    }

    const response = await fetch(liveffnUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'fr-FR,fr;q=0.9,en;q=0.8',
      },
    })

    if (!response.ok) {
      liveffnLogger.warn(`Erreur HTTP LiveFFN ${response.status} pour URL: ${liveffnUrl}`)
      return null
    }

    const html = await response.text()

    // 1. Nettoyer les balises de script et style
    const cleanHtml = html
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')

    // 2. Extraire le titre de la compétition
    const titleMatch = html.match(/<h[12][^>]*>(.*?)<\/h[12]>/i) || html.match(/<title>(.*?)<\/title>/i)
    const title = titleMatch ? titleMatch[1].replace(/<[^>]+>/g, '').trim() : ''

    // 3. Extraire le texte brut propre
    const textLines = cleanHtml
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p>/gi, '\n')
      .replace(/<\/tr>/gi, '\n')
      .replace(/<\/td>/gi, ' ')
      .replace(/<[^>]+>/g, '')
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0)

    // 4. Filtrer les lignes concernant spécifiquement Cavaillon / Triton
    const tritonResults = textLines.filter(line => {
      const lower = line.toLowerCase()
      return lower.includes('cavaillon') || lower.includes('triton')
    })

    // Sélectionner jusqu'à 200 lignes significatives si le filtrage spécifique est court
    const rawTextContent = textLines.slice(0, 300).join('\n')

    return {
      title,
      location: textLines.find(l => l.toLowerCase().includes('bassin') || l.toLowerCase().includes('piscine')) || '',
      bassin: textLines.find(l => l.toLowerCase().includes('bassin de')) || '',
      tritonResults: tritonResults.length > 0 ? tritonResults : textLines.slice(0, 100),
      rawTextContent,
    }
  } catch (error) {
    liveffnLogger.error('Erreur lors du scraping LiveFFN:', error)
    return null
  }
}
