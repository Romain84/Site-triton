import { logger } from '@/lib/logger'
import { CompetitionSheet, ImportedCalendarEvent, parseCalendarEventsFromText } from './import-parser'

const aiLogger = logger.withContext('CalendarAIParser')

const MISTRAL_CANDIDATE_MODELS = [
  'mistral-small-latest',
  'codestral-latest',
  'open-mistral-7b',
]

const TYPE_COLOR: Record<ImportedCalendarEvent['type'], string> = {
  evenement:    '#10b981',
  competition:  '#3b82f6',
  entrainement: '#8b5cf6',
  stage:        '#f59e0b',
}

interface ParsedRawEvent {
  title: string
  date: string
  dateFin?: string | null
  lieu?: string | null
  categories?: string | null
  type?: 'evenement' | 'competition' | 'entrainement' | 'stage'
}

/**
 * Analyse le texte brut d'un calendrier PDF avec un modèle d'IA (Mistral / OpenAI)
 * pour garantir 100% de fidélité sur les colonnes, dates complexes et catégories.
 */
export async function parseCalendarEventsWithAI(
  calendarText: string,
  sheets: CompetitionSheet[] = []
): Promise<ImportedCalendarEvent[] | null> {
  const mistralApiKey = process.env.MISTRAL_API_KEY
  const openaiApiKey = process.env.OPENAI_API_KEY

  if (!mistralApiKey && !openaiApiKey) {
    aiLogger.info('Aucune clé API IA configurée pour le calendrier, utilisation du parseur regex.')
    return null
  }

  const systemPrompt = `Tu es un expert officiel de la Fédération Française de Natation (FFN).
Analyse le texte brut de ce calendrier officiel de natation (tableau avec colonnes Dates, Intitulés, Lieux, Catégories) et extrait TOUTES les compétitions et événements sans en oublier un seul.

RÈGLES D'EXTRACTION STRICTES :
1. Respecte l'ordre chronologique des mois (Janvier à Décembre) et détecte l'année de la saison (ex: 2026 ou 2027) indiquée dans l'en-tête du document.
2. Formate toujours les dates en ISO : YYYY-MM-DD.
3. Pour les dates sur plusieurs jours :
   - Ex: "07 08 FEVRIER" -> date: "2026-02-07", dateFin: "2026-02-08"
   - Ex: "23 24 JANVIER" -> date: "2027-01-23", dateFin: "2027-01-24"
4. Pour les dates à cheval sur deux mois :
   - Ex: "31 01/02 JANVIER" -> date: "2026-01-31", dateFin: "2026-02-01"
   - Ex: "27 02/05 AVRIL" -> date: "2027-04-27", dateFin: "2027-05-02"
   - Ex: "29 03/06 MAI" -> date: "2027-05-29", dateFin: "2027-06-03"
5. Pour les dates entre parenthèses comme "(26) 27 JUIN" -> date: "2027-06-26", dateFin: "2027-06-27".
6. Pour les lieux avec point d'interrogation comme "Cavaillon ?" ou "Toulon ?" -> retire le point d'interrogation ("Cavaillon", "Toulon").
7. Pour les catégories : conserve fidèlement l'intitulé (ex: "U11 et -", "U12 et U13", "U14 et +", "Maîtres", "Elites", "Toutes catégories").
8. "type" : toujours "competition" sauf pour les assemblées générales ("evenement") ou les regroupements ("stage" / "entrainement").

FORMAT DE SORTIE JSON STRICT :
{
  "events": [
    {
      "title": "Nom officiel de la compétition",
      "date": "YYYY-MM-DD",
      "dateFin": "YYYY-MM-DD ou null",
      "lieu": "Ville ou Piscine ou null",
      "categories": "Catégories ou null",
      "type": "competition"
    }
  ]
}`

  let rawEvents: ParsedRawEvent[] | null = null

  // 1. Essai avec Mistral
  if (mistralApiKey) {
    for (const model of MISTRAL_CANDIDATE_MODELS) {
      try {
        aiLogger.info(`Tentative d'analyse IA du calendrier avec Mistral (${model})...`)
        const controller = new AbortController()
        const timeout = setTimeout(() => controller.abort(), 40000)

        const res = await fetch('https://api.mistral.ai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${mistralApiKey}`,
          },
          body: JSON.stringify({
            model,
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: `Voici le texte du calendrier à analyser :\n\n${calendarText}` },
            ],
            temperature: 0.1,
            max_tokens: 4000,
            response_format: { type: 'json_object' },
          }),
          signal: controller.signal,
        })
        clearTimeout(timeout)

        if (res.ok) {
          const data = await res.json()
          const content = data.choices?.[0]?.message?.content?.trim() || ''
          const cleanJson = content.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/, '').trim()
          const parsed = JSON.parse(cleanJson)
          if (Array.isArray(parsed.events) && parsed.events.length > 0) {
            rawEvents = parsed.events
            aiLogger.info(`Extraction IA réussie avec ${model} : ${rawEvents!.length} événements détectés.`)
            break
          }
        }
      } catch (err: any) {
        aiLogger.warn(`Échec de l'appel Mistral ${model}:`, err?.message || err)
      }
    }
  }

  if (!rawEvents || rawEvents.length === 0) {
    return null
  }

  // Cross-référencer les fiches techniques avec les événements extraits par l'IA
  const finalEvents: ImportedCalendarEvent[] = []
  for (const raw of rawEvents) {
    const type = raw.type || 'competition'
    const ev: ImportedCalendarEvent = {
      title: raw.title.trim(),
      date: raw.date.trim(),
      dateFin: raw.dateFin ? raw.dateFin.trim() : null,
      lieu: raw.lieu ? raw.lieu.trim() : null,
      categories: raw.categories ? raw.categories.trim() : null,
      type,
      couleur: TYPE_COLOR[type] || '#3b82f6',
    }

    // Recherche de la fiche correspondante
    if (sheets.length > 0) {
      const sheet = sheets.find(s => s.date === ev.date)
      if (sheet) {
        ev.sheet = sheet
        if (sheet.lieu && !ev.lieu) ev.lieu = sheet.lieu
        if (sheet.categories && !ev.categories) ev.categories = sheet.categories
        if (sheet.dateFin && !ev.dateFin) ev.dateFin = sheet.dateFin

        const firstSession = sheet.sessions[0]
        if (firstSession?.heureDebut) {
          const [h, m] = firstSession.heureDebut.replace('H', ':').split(':')
          ev.heureDebut = `${h.padStart(2, '0')}:${(m ?? '00').padStart(2, '0')}`
        }
        const lastSession = sheet.sessions[sheet.sessions.length - 1]
        if (lastSession?.heureDebut) {
          const [h, m] = lastSession.heureDebut.replace('H', ':').split(':')
          ev.heureFin = `${h.padStart(2, '0')}:${(m ?? '00').padStart(2, '0')}`
        }
        ev.description = `__FICHE__:${JSON.stringify(sheet)}`
      }
    }

    finalEvents.push(ev)
  }

  return finalEvents
}
