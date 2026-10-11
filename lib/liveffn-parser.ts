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
    const parsed = new URL(liveffnUrl)
    const validHostnames = ['liveffn.com', 'www.liveffn.com']
    if (!validHostnames.includes(parsed.hostname.toLowerCase()) || (parsed.protocol !== 'https:' && parsed.protocol !== 'http:')) {
      liveffnLogger.warn(`URL LiveFFN invalide ou domaine non autorisé: ${liveffnUrl}`)
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
      .map(line => line.replace(/\s+/g, ' ').trim())
      .filter(line => line.length > 1)

    // Éliminer le bruit technique LiveFFN et les en-têtes web superflus
    const NOISY_PATTERNS = [
      /^liveffn\b/i,
      /^fédération française de natation/i,
      /^tous droits réservés/i,
      /^menu principal/i,
      /^rechercher une compétition/i,
      /^mentions légales/i,
      /^javascript est nécessaire/i,
      /^retour aux résultats/i,
      /^connexion\b/i,
      /^mot de passe/i,
      /^engagements\b/i,
      /^programme\b/i,
      /^records\b/i,
    ]

    const filteredLines = textLines.filter(line => !NOISY_PATTERNS.some(p => p.test(line)))

    // Déduplication des lignes consécutives
    const deduplicatedLines: string[] = []
    for (const line of filteredLines) {
      if (deduplicatedLines[deduplicatedLines.length - 1] !== line) {
        deduplicatedLines.push(line)
      }
    }

    // 4. Filtrer les lignes concernant spécifiquement Cavaillon / Triton
    const tritonResults = deduplicatedLines.filter(line => {
      const lower = line.toLowerCase()
      return lower.includes('cavaillon') || lower.includes('triton') || lower.includes(' tcc ')
    })

    // Sélectionner un extrait compact pertinent (lignes avec chiffres/temps de nage)
    const rawTextContent = deduplicatedLines
      .filter(l => /\d/.test(l))
      .slice(0, 80)
      .join('\n')

    return {
      title,
      location: deduplicatedLines.find(l => l.toLowerCase().includes('bassin') || l.toLowerCase().includes('piscine')) || '',
      bassin: deduplicatedLines.find(l => l.toLowerCase().includes('bassin de')) || '',
      tritonResults: tritonResults.length > 0 ? tritonResults.slice(0, 120) : deduplicatedLines.slice(0, 60),
      rawTextContent,
    }
  } catch (error) {
    liveffnLogger.error('Erreur lors du scraping LiveFFN:', error)
    return null
  }
}
