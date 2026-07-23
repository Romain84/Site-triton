// ─────────────────────────────────────────────────────────────────────────────
// import-parser.ts
// Extraction locale du calendrier CD84 / Ligue PACA depuis un PDF natation.
//
// Deux sources dans le même PDF :
//   1. Page calendrier (tableau multi-colonnes) → événements de base
//   2. Fiches de compétition (pages suivantes) → enrichissement avec heures,
//      épreuves, conditions, récompenses, droits d'engagement
//
// Les fiches sont cross-référencées aux événements par date exacte.
// ─────────────────────────────────────────────────────────────────────────────

export interface CompetitionSession {
  label: string          // "Samedi matin", "Dimanche après-midi"…
  heureDebut: string | null  // "09:00"
  ouverturePortes?: string | null // "07:55"
  echauffement: string | null
  epreuves: string[]     // ["100 NL", "50 BR", …]
}

export interface CompetitionSheet {
  title: string
  date: string           // YYYY-MM-DD (premier jour)
  dateFin: string | null
  lieu: string | null
  categories: string | null
  genre: string | null
  conditions: string | null
  recompense: string | null
  droits: { individuel?: string; relais?: string }
  sessions: CompetitionSession[]
  pageNumber?: number
}

export interface ImportedCalendarEvent {
  title: string
  date: string
  dateFin?: string | null
  heureDebut?: string | null
  heureFin?: string | null
  lieu?: string | null
  categories?: string | null
  description?: string | null
  type: 'evenement' | 'competition' | 'entrainement' | 'stage'
  couleur: string
  sheet?: CompetitionSheet | null  // fiche détaillée si disponible
  pdfReglement?: string | null
}

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const TYPE_COLOR: Record<ImportedCalendarEvent['type'], string> = {
  evenement:    '#10b981',
  competition:  '#3b82f6',
  entrainement: '#8b5cf6',
  stage:        '#f59e0b',
}

const MONTH_MAP: Record<string, number> = {
  JANVIER: 1, FEVRIER: 2, MARS: 3, AVRIL: 4, MAI: 5, JUIN: 6,
  JUILLET: 7, AOUT: 8, AOÛT: 8, SEPTEMBRE: 9, OCTOBRE: 10,
  NOVEMBRE: 11, DECEMBRE: 12, DÉCEMBRE: 12,
}

const MONTH_HEADER_RE =
  /\b(J\s*A\s*N\s*V\s*I\s*E\s*R|F\s*[EÉ]\s*V\s*R\s*I\s*E\s*R|M\s*A\s*R\s*S|A\s*V\s*R\s*I\s*L|M\s*A\s*I|J\s*U\s*I\s*N|J\s*U\s*I\s*L\s*L\s*E\s*T|A\s*O\s*[ÛU]\s*T|S\s*E\s*P\s*T\s*E\s*M\s*B\s*R\s*E|O\s*C\s*T\s*O\s*B\s*R\s*E|N\s*O\s*V\s*E\s*M\s*B\s*R\s*E|D\s*[EÉ]\s*C\s*E\s*M\s*B\s*R\s*E)(?:\s*([\d\s]{4,7}))?\b/i

const EVENT_LINE_RE = /^(\d{1,2})(?:\s+(\d{1,2}(?:\/\d{2})?))?(?:\s+(.+))?$/

const CATEGORIES_SUFFIX_RE =
  /\s+((?:(?:U\d+(?:\s+(?:et|à)\s+(?:[-+]|U\d+))?|Ma[îi]tres|Elites)(?:\s*,\s*)?)+)$/i

const SKIP_LINE_RE =
  /^(intitul|légende|dates|vacances|calendrier|saison|\d{4}$)/i

// Words that appear in event titles but never in city names
const TITLE_ONLY_WORDS = new Set([
  'CHAMPIONNATS', 'CHAMPIONNAT', 'INTERCLUBS', 'MEETING', 'FINALE',
  'ELIMINATOIRES', 'ELIMINATOIRE', 'COUPE', 'TROPHEE', 'OPEN',
  'WEB', 'CONFRONTATION', 'FRANCE', 'HIVER', 'ETE', 'SAISON',
  'COMITE', 'LIGUE', 'REGIONAL', 'REGIONAUX', 'REGIONALE',
  'DEPARTEMENTAL', 'DEPARTEMENTALE', 'DEPARTEMENTAUX',
  'NATIONAL', 'NATIONAUX', 'NATIONALE',
  'INTERDEPARTEMENTAL', 'INTERDEPARTEMENTAUX', 'INTERDEPARTEMENTALE',
  'AG', 'PRE', 'RELAIS', 'ANIMATION', 'VAUCLUSE',
])

// ─────────────────────────────────────────────────────────────────────────────
// Text helpers
// ─────────────────────────────────────────────────────────────────────────────

function normalizeAccents(s: string): string {
  return s
    .replace(/[àâä]/gi, 'a').replace(/[éèêë]/gi, 'e').replace(/[îï]/gi, 'i')
    .replace(/[ôö]/gi, 'o').replace(/[ùûü]/gi, 'u').replace(/ç/gi, 'c')
}

function startsUppercase(w: string): boolean {
  return /^[A-ZÀÂÉÈÊÎÔÙÛÇŒÆ]/.test(w)
}

function isCategoryWord(w: string): boolean {
  return /^(Ma[îi]tres?|Elites?|U\d+)/i.test(w)
}

function isTitleOnlyWord(w: string): boolean {
  const n = normalizeAccents(w).toUpperCase().replace(/[^A-Z]/g, '')
  if (/^N[1-9]$/.test(normalizeAccents(w.toUpperCase()))) return true
  return TITLE_ONLY_WORDS.has(n)
}

function buildDate(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

function cleanupText(text: string): string {
  return text
    .replace(/\r\n/g, '\n').replace(/\r/g, '\n')
    .replace(/[\t\f\v]+/g, ' ').split('\0').join(' ')
    .replace(/[^\S\n]{2,}/g, ' ')
}

// ─────────────────────────────────────────────────────────────────────────────
// Lieu / titre / catégories extraction
// ─────────────────────────────────────────────────────────────────────────────

function splitEventContent(raw: string): {
  title: string; lieu: string | null; categories: string | null
} {
  const catMatch = raw.match(CATEGORIES_SUFFIX_RE)
  let rest = catMatch ? raw.slice(0, raw.length - catMatch[0].length).trim() : raw.trim()
  const categories = catMatch ? catMatch[1].trim() : null

  rest = rest.replace(/\s*[?!]+\s*$/, '').trim()

  const words = rest.split(/\s+/)
  const lieuWords: string[] = []
  let i = words.length - 1

  while (i >= 0) {
    const w = words[i]
    if (isCategoryWord(w)) { if (lieuWords.length > 0) break; i--; continue }
    if (w === '-') {
      if (
        lieuWords.length > 0 && i > 0 &&
        startsUppercase(words[i - 1]) && !isTitleOnlyWord(words[i - 1]) && !isCategoryWord(words[i - 1])
      ) { lieuWords.unshift(w); i--; continue }
      break
    }
    if (startsUppercase(w) && !isTitleOnlyWord(w)) { lieuWords.unshift(w); i-- }
    else if (/^(en|de|sur|d'|du|les|le|la|l'|aux)$/.test(w) && lieuWords.length > 0) { lieuWords.unshift(w); i-- }
    else break
  }

  const lieu = lieuWords.length > 0 ? lieuWords.join(' ') : null
  const title = lieuWords.length > 0
    ? words.slice(0, words.length - lieuWords.length).join(' ').trim()
    : rest

  return { title: (title || rest).trim(), lieu, categories }
}

// ─────────────────────────────────────────────────────────────────────────────
// Event type detection
// ─────────────────────────────────────────────────────────────────────────────

function detectType(title: string): ImportedCalendarEvent['type'] {
  const lower = normalizeAccents(title.toLowerCase())
  if (/(competition|championnat|interclubs|meeting|finale|qualificatif|eliminatoire|trophee|open|web confrontation|coupe)/.test(lower)) return 'competition'
  if (/(stage|camp|perfectionnement|pre.?saison)/.test(lower)) return 'stage'
  if (/(entrainement|seance|test chrono|preparation)/.test(lower)) return 'entrainement'
  return 'evenement'
}

// ─────────────────────────────────────────────────────────────────────────────
// Competition sheet parser (pages 19+)
// ─────────────────────────────────────────────────────────────────────────────

const FRENCH_MONTHS: Record<string, number> = {
  janvier: 1, fevrier: 2, février: 2, mars: 3, avril: 4, mai: 5, juin: 6,
  juillet: 7, aout: 8, août: 8, septembre: 9, octobre: 10, novembre: 11, decembre: 12, décembre: 12,
}

function parseDateFr(raw: string): { date: string | null; dateFin: string | null } {
  raw = raw.trim()
  // "07&08/02/2026"
  const m2 = raw.match(/^(\d{1,2})&(\d{1,2})\/(\d{2})\/(\d{4})/)
  if (m2) {
    const [, d1, d2, mo, yr] = m2
    return { date: `${yr}-${mo}-${d1.padStart(2, '0')}`, dateFin: `${yr}-${mo}-${d2.padStart(2, '0')}` }
  }
  // "25/01/2026"
  const m1 = raw.match(/^(\d{1,2})\/(\d{2})\/(\d{4})/)
  if (m1) {
    const [, d, mo, yr] = m1
    return { date: `${yr}-${mo}-${d.padStart(2, '0')}`, dateFin: null }
  }

  // Handle "15/11" (no year)
  const m3 = raw.match(/(\d{1,2})\/(\d{2})/)
  if (m3) {
    const [, d, mo] = m3
    const monthNum = parseInt(mo, 10)
    const yr = monthNum >= 9 ? 2025 : 2026
    return { date: `${yr}-${mo.padStart(2, '0')}-${d.padStart(2, '0')}`, dateFin: null }
  }

  // 2. Parse French word-based dates
  const lower = raw.toLowerCase()
  let foundMonth: number | null = null
  for (const [name, num] of Object.entries(FRENCH_MONTHS)) {
    if (lower.includes(name)) {
      foundMonth = num
      break
    }
  }

  if (foundMonth !== null) {
    // Extract year (4-digit number starting with 202)
    const yearMatch = raw.match(/\b(202\d)\b/)
    const year = yearMatch ? parseInt(yearMatch[1], 10) : (foundMonth >= 9 ? 2025 : 2026)

    // Extract all other numbers as potential days (1 to 31)
    const numbers = [...raw.matchAll(/\b\d{1,2}\b/g)].map(m => parseInt(m[0], 10))
    const days = numbers.filter(n => n >= 1 && n <= 31)

    if (days.length > 0) {
      days.sort((a, b) => a - b)
      const startDay = days[0]
      const endDay = days.length > 1 ? days[days.length - 1] : null

      const pad = (n: number) => String(n).padStart(2, '0')
      const startMonthStr = pad(foundMonth)
      const startDayStr = pad(startDay)

      const date = `${year}-${startMonthStr}-${startDayStr}`
      let dateFin: string | null = null

      if (endDay !== null && endDay !== startDay) {
        dateFin = `${year}-${startMonthStr}-${pad(endDay)}`
      }

      return { date, dateFin }
    }
  }

  return { date: null, dateFin: null }
}

function parseSessions(lines: string[]): CompetitionSession[] {
  const sessions: CompetitionSession[] = []
  let current: CompetitionSession | null = null
  const SESSION_RE = /^(Samedi|Dimanche)\s+(matin|après-midi)/i

  for (const line of lines) {
    const sm = SESSION_RE.exec(line)
    if (sm) {
      if (current) sessions.push(current)
      const hOpen = line.match(/Ouverture\s+(?:des\s+portes)?\s*:?\s*(\d{2}\s*H\s*\d{2})/i)
      const hWarm = line.match(/Echauffement\s*:?\s*(\d{2}\s*H\s*\d{2})/i)
      current = {
        label: sm[0],
        heureDebut: null,
        ouverturePortes: hOpen ? formatHeure(hOpen[1].replace(/\s/g, '')) : null,
        echauffement: hWarm ? formatHeure(hWarm[1].replace(/\s/g, '')) : null,
        epreuves: [],
      }
      continue
    }
    if (current && /Début des épreuves/i.test(line)) {
      const h = line.match(/(\d{2}\s*H\s*\d{2})/i)
      if (h) current.heureDebut = formatHeure(h[1].replace(/\s/g, ''))
      continue
    }
    if (current && /^[\dxX4]/.test(line) && /(NL|BR|DOS|PAP|4N|Mixte)/.test(line)) {
      const epreuves = line.split(' - ').map(e => e.trim()).filter(Boolean)
      current.epreuves.push(...epreuves)
    }
  }
  if (current) sessions.push(current)
  return sessions
}

export function parseCompetitionSheets(fullText: string): CompetitionSheet[] {
  // pdf-parse injecte __PAGE_NUMBER__:X à la fin de chaque page (grâce à finalOptions.pageJoiner).
  // On split par ce jeton pour isoler proprement chaque page du PDF.
  const chunks = fullText.split(/__PAGE_NUMBER__:\d+/)
  const sheets: CompetitionSheet[] = []

  for (let i = 0; i < chunks.length; i++) {
    const page = chunks[i]
    const pageNumber = i + 1

    // Ignorer les pages qui ne sont pas des fiches de compétition
    // We check for "date :" and "lieu :" anywhere on the page, ignoring the Table of Contents
    const hasDate = /date\s*:/i.test(page)
    const hasLieu = /lieu\s*:/i.test(page)
    const isTableOfContents = /table des matières/i.test(page)

    if (!hasDate || !hasLieu || isTableOfContents) continue

    const lines = page.split('\n').map(l => l.trim()).filter(Boolean)
    const sheet: Partial<CompetitionSheet> & { droits: CompetitionSheet['droits'] } = { 
      droits: {}, 
      sessions: [],
      pageNumber 
    }

    for (let j = 0; j < lines.length; j++) {
      const line = lines[j]

      // CD84 style title
      if (/comit[eé]\s+(?:d[eé]partemental\s+)?de\s+vaucluse/i.test(line) && j + 1 < lines.length) {
        sheet.title = lines[j + 1]
      } else if (/^date\s*:/i.test(line)) {
        let dateStr = line.replace(/^date\s*:\s*/i, '').trim()
        // Fallback for multi-line date where the year is printed on the next line
        if (j + 1 < lines.length && /^\d{4}$/.test(lines[j + 1])) {
          dateStr += ' ' + lines[j + 1]
        }

        // Truncate anything after Nb/Lieu/Bassin/Cat/Tarif to avoid extracting unrelated numbers (e.g. Nb Poule: 1)
        const dateParts = dateStr.split(/\b(nb|lieu|bassin|cat|tarif)\b/i)
        const datePart = dateParts[0].trim()

        const { date, dateFin } = parseDateFr(datePart)
        sheet.date = date ?? undefined
        sheet.dateFin = dateFin

        // PACA style title: use the line immediately preceding Date if not set
        if (!sheet.title && j > 0) {
          sheet.title = lines[j - 1]
        }
      } else if (/cat(?:[eé]gorie)?\s*:/i.test(line)) {
        const match = line.match(/cat(?:[eé]gorie)?\s*:\s*([^|]*)/i)
        if (match) {
          sheet.categories = match[1].trim()
        }
      } else if (/lieu\s*:/i.test(line)) {
        const match = line.match(/lieu\s*:\s*(.*)/i)
        if (match) {
          const l = match[1].trim()
          sheet.lieu = l === '------' || l === '---' || l === '' ? null : l
        }
      } else if (/genre\s*:/i.test(line)) {
        const match = line.match(/genre\s*:\s*(.*)/i)
        if (match) {
          sheet.genre = match[1].trim()
        }
      } else if (/r[eé]compense\s*:/i.test(line)) {
        const match = line.match(/r[eé]compense\s*:\s*(.*)/i)
        if (match) {
          sheet.recompense = match[1].trim()
        }
      } else if (/conditions\s+(?:de\s+participation)?\s*:/i.test(line)) {
        let cond = line.replace(/.*conditions\s+(?:de\s+participation)?\s*:\s*/i, '').trim()
        let k = j + 1
        while (k < lines.length && !/^(r[eé]compense|samedi|dimanche|droits|genre)\s*[:\s]/i.test(lines[k])) {
          cond += ' ' + lines[k]
          k++
        }
        sheet.conditions = cond.trim()
      } else if (/droits/i.test(line)) {
        const indiv = line.match(/individuel\s*:\s*([\d,.]+\s*€)/i)
        const relais = line.match(/relais\s*:\s*([\d,.]+\s*€)/i)
        if (indiv) sheet.droits.individuel = indiv[1]
        if (relais) sheet.droits.relais = relais[1]
      }
    }

    sheet.sessions = parseSessions(lines)

    if (sheet.title && sheet.date) {
      sheets.push(sheet as CompetitionSheet)
    }
  }

  return sheets;
}

// ─────────────────────────────────────────────────────────────────────────────
// Synthèse du Règlement Général (tarifs, pénalités, catégories, règles)
// ─────────────────────────────────────────────────────────────────────────────

export interface GeneralRegulationsSynthesis {
  tarifs: string[]
  penalites: string[]
  categories: string[]
  reglesEngagements: string[]
}

function findRealSectionIndex(fullText: string, title: string): number {
  let idx = -1
  let startFrom = 0
  while (true) {
    idx = fullText.indexOf(title, startFrom)
    if (idx === -1) break
    const context = fullText.substring(idx, idx + 150)
    if (!context.includes('......')) {
      return idx
    }
    startFrom = idx + title.length
  }
  return -1
}

export function parseGeneralRegulations(fullText: string): GeneralRegulationsSynthesis {
  const synthesis: GeneralRegulationsSynthesis = {
    tarifs: [],
    penalites: [],
    categories: [],
    reglesEngagements: []
  }

  // 1. Extract Tarifs & Penalties
  const tarifStart = findRealSectionIndex(fullText, "4. TARIF FINANCIER DEPARTEMENTAL")
  const calendrierStart = findRealSectionIndex(fullText, "5. CALENDRIER DES COMPETITIONS")
  
  if (tarifStart !== -1 && calendrierStart !== -1 && calendrierStart > tarifStart) {
    const tarifSection = fullText.substring(tarifStart, calendrierStart)
    const lines = tarifSection.split('\n').map(l => l.trim()).filter(Boolean)
    
    let currentBlock = ""
    for (const line of lines) {
      if (line.includes("4.1 – ENGAGEMENT") || line.includes("4.1 - ENGAGEMENT")) {
        currentBlock = "engagement"
        continue
      }
      if (line.includes("4.2 – PENALITES") || line.includes("4.2 - PENALITES")) {
        currentBlock = "penalites"
        continue
      }
      
      if (currentBlock === "engagement") {
        if (/(Individuel|Relais|Équipe|Equipe)/i.test(line) && /\d/.test(line)) {
          synthesis.tarifs.push(line)
        }
      } else if (currentBlock === "penalites") {
        if (line.startsWith("•") || /^\d+\s*euros/i.test(line) || /euros/i.test(line) || line.includes("Absences des officiels")) {
          synthesis.penalites.push(line)
        }
      }
    }
  }

  // 2. Extract Age Categories
  const catStart = findRealSectionIndex(fullText, "5.1 CATEGORIES D’AGES")
  const calListStart = findRealSectionIndex(fullText, "5.2 CALENDRIER DES COMPETITIONS")
  
  if (catStart !== -1 && calListStart !== -1 && calListStart > catStart) {
    const catSection = fullText.substring(catStart, calListStart)
    const lines = catSection.split('\n').map(l => l.trim()).filter(Boolean)
    for (const line of lines) {
      if (/(ans|et moins|et plus|2015|2013|2012|2007|2001)/.test(line) && !line.includes("5.1")) {
        synthesis.categories.push(line)
      }
    }
  }

  // 3. Extract General Rules
  const lines = fullText.split('\n').map(l => l.trim()).filter(Boolean)
  for (const line of lines) {
    if (line.includes("LUNDI minuit")) {
      synthesis.reglesEngagements.push("Date limite d'engagement : Lundi minuit précédant la compétition (via EXTRANAT).")
    }
    if (line.includes("30 minutes avant l’évacuation du bassin")) {
      if (!synthesis.reglesEngagements.some(r => r.includes("30 minutes"))) {
        synthesis.reglesEngagements.push("Forfaits & modifications d'équipe : Déclaration informatique au moins 30 minutes avant l'évacuation du bassin.")
      }
    }
    if (line.includes("certificat médical dans les 48 heures")) {
      if (!synthesis.reglesEngagements.some(r => r.includes("48 heures"))) {
        synthesis.reglesEngagements.push("Justification médicale : Production d'un certificat médical dans les 48 heures suivant la compétition pour éviter l'amende de forfait.")
      }
    }
    if (line.includes("licence homologuée par la F.F.N. à la date limite")) {
      synthesis.reglesEngagements.push("Licence obligatoire : Tout nageur doit posséder une licence FFN homologuée au moment de l'engagement.")
    }
  }

  // Fallbacks in case PDF format changes or pages are shifted
  if (synthesis.tarifs.length === 0) {
    synthesis.tarifs = [
      "Extranat Individuel : 3,50 €",
      "Relais : 6,50 €",
      "Interclubs (Avenirs / Jeunes / Toutes Catégories) - Équipe : 43,00 €"
    ]
  }
  if (synthesis.penalites.length === 0) {
    synthesis.penalites = [
      "Engagement saisi par le comité : 10 € / nage, 20 € / relais, 60 € / équipe",
      "Forfait Non Déclaré : 15 € / nageur, 20 € / relais, 20 € / équipe",
      "Absence d'officiels : Amende forfaitaire par réunion (de 20 € à 60 € selon le barème)"
    ]
  }
  if (synthesis.categories.length === 0) {
    synthesis.categories = [
      "U11 & - : 11 ans et moins (2015 et après)",
      "U12 & U13 : 12 - 13 ans (2013 et 2014)",
      "U14 à U18 : 14 - 18 ans (2012 à 2008)",
      "U19 & + : 19 ans et plus (2007 et avant)",
      "MAITRES : 25 ans et plus (2001 et avant)"
    ]
  }

  synthesis.reglesEngagements = [...new Set(synthesis.reglesEngagements)]

  return synthesis
}

// ─────────────────────────────────────────────────────────────────────────────
// Cross-reference: match sheets → calendar events
// ─────────────────────────────────────────────────────────────────────────────

function normalize(s: string): string {
  return normalizeAccents(s).toLowerCase().replace(/[^a-z0-9]/g, '')
}

/**
 * Find the best matching sheet for a calendar event.
 * Primary key: exact date match. Secondary: title similarity.
 */
function findMatchingSheet(
  event: { title: string; date: string },
  sheets: CompetitionSheet[]
): CompetitionSheet | null {
  const candidates = sheets.filter(s => s.date === event.date)
  if (candidates.length === 0) return null
  if (candidates.length === 1) return candidates[0]

  const evNorm = normalize(event.title)
  let best: CompetitionSheet | null = null
  let bestScore = -1

  for (const sheet of candidates) {
    const shNorm = normalize(sheet.title)
    // Count common substrings of length >= 4
    let score = 0
    for (let len = 4; len <= Math.min(evNorm.length, shNorm.length); len++) {
      for (let i = 0; i <= evNorm.length - len; i++) {
        if (shNorm.includes(evNorm.slice(i, i + len))) score++
      }
    }
    if (score > bestScore) { bestScore = score; best = sheet }
  }

  return best
}

// ─────────────────────────────────────────────────────────────────────────────
// Compte rendu structuré depuis une fiche de compétition
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Formate l'heure "09H00" → "09:00"
 */
function formatHeure(h: string): string {
  return h.replace('H', ':')
}

/**
 * Sérialise la fiche de compétition en JSON préfixé par __FICHE__ pour
 * stockage dans le champ description de l'événement.
 *
 * Format : "__FICHE__:{...json...}"
 *
 * Le composant <FicheCompetition> détecte ce préfixe et rend la fiche
 * visuellement. Les autres affichages (résumé carte) lisent le résumé
 * généré par ficheResume().
 */
function buildDescription(sheet: CompetitionSheet): string {
  return `__FICHE__:${JSON.stringify(sheet)}`
}

/**
 * Génère une ligne de résumé lisible pour l'aperçu dans les cartes.
 * Ex : "Qualificative · Médailles par catégorie d'âge"
 */
export function ficheResume(description: string | null | undefined): string | null {
  if (!description) return null
  const cleaned = description.split('__TARGET_GROUPS__:')[0].trim()
  const sheet = parseFicheDescription(cleaned)
  if (!sheet) return cleaned.split('\n')[0] ?? null
  const parts: string[] = []
  if (sheet.genre) parts.push(sheet.genre)
  if (sheet.recompense && sheet.recompense !== 'Aucune') parts.push(sheet.recompense)
  if (sheet.sessions.length > 0) parts.push(`${sheet.sessions.length} session${sheet.sessions.length > 1 ? 's' : ''}`)
  return parts.join(' · ') || null
}

/**
 * Parse une description stockée sous forme __FICHE__:{json} et retourne
 * l'objet CompetitionSheet, ou null si ce n'est pas une fiche structurée.
 */
export function parseFicheDescription(description: string | null | undefined): CompetitionSheet | null {
  if (!description) return null
  const cleaned = description.split('__TARGET_GROUPS__:')[0].trim()
  if (!cleaned.startsWith('__FICHE__:')) return null
  try {
    return JSON.parse(cleaned.slice('__FICHE__:'.length)) as CompetitionSheet
  } catch {
    return null
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Main calendar parser (page with month + event rows)
// ─────────────────────────────────────────────────────────────────────────────

export function parseCalendarEventsFromText(
  input: string,
  sheets: CompetitionSheet[] = []
): ImportedCalendarEvent[] {
  const text = cleanupText(input)
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean)

  let events: ImportedCalendarEvent[] = []
  const seen = new Set<string>()
  let currentMonth = 0
  let currentYear = new Date().getFullYear()

  for (const line of lines) {
    const monthMatch = line.match(MONTH_HEADER_RE)
    if (monthMatch) {
      const monthClean = monthMatch[1].replace(/\s+/g, '')
      const monthKey = normalizeAccents(monthClean.toUpperCase())
      if (MONTH_MAP[monthKey]) {
        currentMonth = MONTH_MAP[monthKey]
        if (monthMatch[2]) {
          const yrClean = monthMatch[2].replace(/\s+/g, '')
          if (/^\d{4}$/.test(yrClean)) {
            currentYear = parseInt(yrClean, 10)
          }
        }
      }
    }

    if (SKIP_LINE_RE.test(line)) continue
    if (currentMonth === 0) continue

    const evMatch = line.match(EVENT_LINE_RE)
    if (!evMatch) continue

    const day1 = parseInt(evMatch[1], 10)
    if (day1 < 1 || day1 > 31) continue

    const rawRest = evMatch[3]
    if (!rawRest || rawRest.trim().length < 3) continue

    const dateDebut = buildDate(currentYear, currentMonth, day1)

    let dateFin: string | null = null
    if (evMatch[2]) {
      const part2 = evMatch[2]
      if (part2.includes('/')) {
        const [d, m] = part2.split('/').map(Number)
        const finYear = m < currentMonth ? currentYear + 1 : currentYear
        dateFin = buildDate(finYear, m, d)
      } else {
        const day2 = parseInt(part2, 10)
        if (day2 >= day1 && day2 <= 31) dateFin = buildDate(currentYear, currentMonth, day2)
      }
    }

    const { title, lieu, categories } = splitEventContent(rawRest)
    if (!title || title.length < 2) continue

    const key = `${dateDebut}|${title.toLowerCase().slice(0, 40)}`
    if (seen.has(key)) continue
    seen.add(key)

    const type = detectType(title)

    // Enrich with matching sheet
    const sheet = sheets.length > 0 ? findMatchingSheet({ title, date: dateDebut }, sheets) : null

    const event: ImportedCalendarEvent = {
      title,
      date:       dateDebut,
      dateFin:    sheet?.dateFin ?? dateFin,
      lieu:       sheet?.lieu ?? lieu,
      categories: sheet?.categories ?? categories,
      type,
      couleur: TYPE_COLOR[type],
    }

    if (sheet) {
      // heureDebut = first session's start time
      const firstSession = sheet.sessions[0]
      if (firstSession?.heureDebut) {
        const [h, m] = firstSession.heureDebut.replace('H', ':').split(':')
        event.heureDebut = `${h.padStart(2, '0')}:${(m ?? '00').padStart(2, '0')}`
      }
      // heureFin = last session's start time (approximate)
      const lastSession = sheet.sessions[sheet.sessions.length - 1]
      if (lastSession?.heureDebut) {
        const [h, m] = lastSession.heureDebut.replace('H', ':').split(':')
        event.heureFin = `${h.padStart(2, '0')}:${(m ?? '00').padStart(2, '0')}`
      }
      event.description = buildDescription(sheet)
      event.sheet = sheet
    }

    events.push(event)
  }

  // Fallback if no events were parsed sequentially (e.g. because month headers are grouped at the bottom)
  if (events.length === 0) {
    // Dynamic fallback: detect months from text + day-decrease grouping
    // instead of a fragile static index→month mapping

    // 1. Collect month headers from the text
    const detectedMonths: number[] = []
    for (const line of lines) {
      const mm = line.match(MONTH_HEADER_RE)
      if (mm) {
        const monthClean = mm[1].replace(/\s+/g, '')
        const monthKey = normalizeAccents(monthClean.toUpperCase())
        const m = MONTH_MAP[monthKey]
        if (m && !detectedMonths.includes(m)) detectedMonths.push(m)
      }
    }
    detectedMonths.sort((a, b) => a - b)

    // 2. Collect event lines (excluding headers, skip lines, etc.)
    const eventLines: string[] = []
    for (const line of lines) {
      if (SKIP_LINE_RE.test(line)) continue
      if (line.match(MONTH_HEADER_RE)) continue
      const evMatch = line.match(EVENT_LINE_RE)
      if (!evMatch) continue
      const day1 = parseInt(evMatch[1], 10)
      if (day1 < 1 || day1 > 31) continue
      const rawRest = evMatch[3]
      if (!rawRest || rawRest.trim().length < 3) continue
      eventLines.push(line)
    }

    // 3. Group events by day-number decrease (= month boundary)
    const groups: string[][] = []
    let curGroup: string[] = []
    let prevD = 0
    for (const evLine of eventLines) {
      const d = parseInt(evLine.match(EVENT_LINE_RE)![1], 10)
      if (d < prevD && curGroup.length > 0) {
        groups.push(curGroup)
        curGroup = []
      }
      curGroup.push(evLine)
      prevD = d
    }
    if (curGroup.length > 0) groups.push(curGroup)

    // 4. Build complete month sequence (fill gaps between detected months)
    const monthSequence: number[] = []
    if (detectedMonths.length >= 2) {
      for (let m = detectedMonths[0]; m <= detectedMonths[detectedMonths.length - 1]; m++) {
        monthSequence.push(m)
      }
    } else {
      for (let m = 1; m <= 12; m++) monthSequence.push(m)
    }

    // 5. Map groups to months and emit events
    const year = currentYear || new Date().getFullYear()
    let mIdx = 0

    function emitEvent(line: string, evYear: number, month: number) {
      const evMatch = line.match(EVENT_LINE_RE)!
      const day1 = parseInt(evMatch[1], 10)
      const rawRest = evMatch[3]

      const dateDebut = buildDate(evYear, month, day1)

      let dateFin: string | null = null
      if (evMatch[2]) {
        const part2 = evMatch[2]
        if (part2.includes('/')) {
          const [d, m] = part2.split('/').map(Number)
          const finYear = m < month ? evYear + 1 : evYear
          dateFin = buildDate(finYear, m, d)
        } else {
          const day2 = parseInt(part2, 10)
          if (day2 >= day1 && day2 <= 31) dateFin = buildDate(evYear, month, day2)
        }
      }

      const { title, lieu, categories } = splitEventContent(rawRest)
      if (!title || title.length < 2) return

      const key = `${dateDebut}|${title.toLowerCase().slice(0, 40)}`
      if (seen.has(key)) return
      seen.add(key)

      const type = detectType(title)
      const sheet = sheets.length > 0 ? findMatchingSheet({ title, date: dateDebut }, sheets) : null

      const event: ImportedCalendarEvent = {
        title,
        date:       dateDebut,
        dateFin:    sheet?.dateFin ?? dateFin,
        lieu:       sheet?.lieu ?? lieu,
        categories: sheet?.categories ?? categories,
        type,
        couleur:    TYPE_COLOR[type],
      }

      if (sheet) {
        const firstSession = sheet.sessions[0]
        if (firstSession?.heureDebut) {
          const [h, m] = firstSession.heureDebut.replace('H', ':').split(':')
          event.heureDebut = `${h.padStart(2, '0')}:${(m ?? '00').padStart(2, '0')}`
        }
        const lastSession = sheet.sessions[sheet.sessions.length - 1]
        if (lastSession?.heureDebut) {
          const [h, m] = lastSession.heureDebut.replace('H', ':').split(':')
          event.heureFin = `${h.padStart(2, '0')}:${(m ?? '00').padStart(2, '0')}`
        }
        event.description = buildDescription(sheet)
        event.sheet = sheet
      }

      events.push(event)
    }

    for (let gi = 0; gi < groups.length; gi++) {
      if (mIdx >= monthSequence.length) break
      const group = groups[gi]
      const isLastGroup = gi === groups.length - 1
      const remainingMonths = monthSequence.length - mIdx

      // For the last group with few events and many remaining months,
      // each event likely belongs to its own month (e.g. Aug, Sep, Oct events)
      if (isLastGroup && group.length > 1 && group.length <= remainingMonths && group.length <= 4) {
        for (const line of group) {
          if (mIdx >= monthSequence.length) break
          emitEvent(line, year, monthSequence[mIdx])
          mIdx++
        }
      } else {
        const month = monthSequence[mIdx]
        for (const line of group) {
          emitEvent(line, year, month)
        }
        mIdx++
      }
    }
  }

  return events.slice(0, 200)
}
