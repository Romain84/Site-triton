import { NextRequest } from 'next/server'
import fs from 'fs'
import path from 'path'
import { getAdminSession } from '@/lib/auth/session'
import { isSameOriginRequest } from '@/lib/security/origin'
import { apiError, apiSuccess } from '@/lib/api/response'
import { parseCalendarEventsFromText, parseCompetitionSheets, parseGeneralRegulations } from '@/lib/calendar/import-parser'
import { parseCalendarEventsWithAI } from '@/lib/calendar/ai-parser'
import { logger } from '@/lib/logger'

const importLogger = logger.withContext('ImportCalendarPDF')

/**
 * Lit le texte d'un PDF de manière robuste en gérant le fait que la bibliothèque
 * pdf-parse installée exporte directement une fonction ou la classe moderne PDFParse (v2.4.5).
 */
async function parsePdfText(buffer: Buffer, options?: Record<string, unknown>): Promise<string> {
  const pdfparseModule = require('pdf-parse')
  const uint8Array = new Uint8Array(buffer)

  const finalOptions = {
    pageJoiner: '__PAGE_NUMBER__:page_number',
    ...options
  }

  if (typeof pdfparseModule === 'function') {
    const data = await pdfparseModule(uint8Array, finalOptions)
    return data.text
  } else if (pdfparseModule && typeof pdfparseModule.PDFParse === 'function') {
    const parser = new pdfparseModule.PDFParse(uint8Array, finalOptions)
    const data = await parser.getText(finalOptions)
    return data.text
  } else {
    throw new Error("Impossible de trouver la fonction de parsing dans le module 'pdf-parse'")
  }
}

/**
 * Retourne un pagerender qui repositionne uniquement la page calendrier
 * (tableau multi-colonnes) via les coordonnées x/y de pdfjs.
 * Toutes les autres pages sont extraites en texte simple, ce qui préserve
 * la structure ligne-par-ligne des fiches de compétition.
 */
function makeReglementPagerender() {
  let currentPage = 0
  return async function pagerender(pageData: any): Promise<string> {
    currentPage++
    const content = await pageData.getTextContent()
    let text = ""
    let lastY: number | undefined
    for (const item of content.items as any[]) {
      if (lastY === item.transform[5] || !lastY) {
        text += item.str
      } else {
        text += '\n' + item.str
      }
      lastY = item.transform[5]
    }
    return `${text}\n__PAGE_NUMBER__:${currentPage}\n`
  }
}

function makePagerender() {
  let currentPage = 0

  return async function pagerender(pageData: any): Promise<string> {
    currentPage++
    const content = await pageData.getTextContent()

    // Détecter si cette page contient le titre unique du calendrier
    const isCalendarPage = content.items.some((item: any) =>
      (item.str ?? '').includes('CALENDRIER COMPÉTITIONS')
    )

    if (isCalendarPage) {
      importLogger.info(`Page calendrier détectée dynamiquement à la page ${currentPage}`)
    }

    const buckets = new Map<number, Array<{ x: number; text: string }>>()
    for (const item of content.items as any[]) {
      const str: string = item.str ?? ''
      if (!str.trim()) continue
      const y = item.transform[5] as number
      const x = item.transform[4] as number
      let key = y
      for (const k of buckets.keys()) {
        if (Math.abs(k - y) <= 3) { key = k; break }
      }
      if (!buckets.has(key)) buckets.set(key, [])
      buckets.get(key)!.push({ x, text: str })
    }

    const pageText = [...buckets.entries()]
      .sort(([a], [b]) => b - a) // haut → bas (Y descendant)
      .map(([, items]) => {
        // Toujours trier gauche → droite (X ascendant) pour reconstruire les colonnes et lignes
        items.sort((a, b) => a.x - b.x)
        return items.map(i => i.text).join(' ')
      })
      .join('\n')

    return `${pageText}\n__PAGE_NUMBER__:${currentPage}\n`
  }
}

export async function POST(request: NextRequest) {
  if (!isSameOriginRequest(request)) {
    return apiError('Origine non autorisée', 403, undefined, 'FORBIDDEN_ORIGIN')
  }

  const session = await getAdminSession()
  if (!session) {
    return apiError('Non authentifié', 401, undefined, 'UNAUTHENTICATED')
  }

  const formData = await request.formData()
  const file = formData.get('file')

  if (!(file instanceof File)) {
    return apiError('Fichier PDF manquant', 400, undefined, 'MISSING_FILE')
  }

  if (!file.type.includes('pdf')) {
    return apiError('Format invalide : PDF requis', 400, undefined, 'INVALID_FILE_TYPE')
  }

  const buffer = Buffer.from(await file.arrayBuffer())

  // ── Lecture du PDF calendrier ────────────────────────────────────────────
  let fullText: string
  try {
    fullText = await parsePdfText(buffer, { pagerender: makePagerender() })
  } catch (err) {
    importLogger.error('[PDF_PARSE_ERROR]', err)
    return apiError(
      'Impossible de lire le PDF. Vérifiez que le fichier contient du texte sélectionnable.',
      422,
      undefined,
      'PDF_PARSE_ERROR'
    )
  }

  // ── Isolation du texte calendrier ────────────────────────────────────────
  // Normalement, les événements se trouvent entre "CALENDRIER COMPÉTITIONS"
  // et "FEDERATION FRANCAISE DE NATATION".
  // Cependant, selon la version du PDF et l'ordre d'extraction pdfjs, le titre
  // "CALENDRIER COMPÉTITIONS" peut apparaître APRÈS les lignes d'événements
  // (les éléments du tableau multi-colonnes sont extraits dans l'ordre de leurs
  // coordonnées y, et le titre de la page peut avoir un y inférieur aux lignes).
  // Dans ce cas, calStart > 80% du texte total → le slice ne contient que des
  // en-têtes de mois sans événements. On utilise alors le texte complet pour
  // laisser le parseur de secours chronologique prendre le relais.
  const CAL_MARKER   = 'CALENDRIER COMPÉTITIONS'
  const FICHE_MARKER = 'FEDERATION FRANCAISE DE NATATION'
  const calStart = fullText.indexOf(CAL_MARKER)
  const ficheStart = fullText.indexOf(FICHE_MARKER)

  const markerIsAtBottom = calStart !== -1 && calStart > fullText.length * 0.6

  const calendarText = markerIsAtBottom
    ? fullText                                                          // titre en bas → texte complet
    : calStart !== -1
      ? fullText.slice(calStart, ficheStart !== -1 ? ficheStart : undefined)
      : fullText

  // ── Extraction des fiches de compétition ─────────────────────────────────
  let publicPath: string | null = null

  // Étape 1 : Extraire les fiches présentes dans le fichier téléversé lui-même
  let sheets: ReturnType<typeof parseCompetitionSheets> = []
  let regTextForSynthesis: string | null = null

  try {
    sheets = parseCompetitionSheets(fullText)
    if (sheets.length > 0) {
      regTextForSynthesis = fullText
      try {
        const timestamp = Date.now()
        const originalName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_')
        const fileName = `${timestamp}-${originalName}`
        const uploadDir = path.join(/*turbopackIgnore: true*/ process.cwd(), 'public', 'uploads', 'reglements')
        fs.mkdirSync(uploadDir, { recursive: true })
        fs.writeFileSync(path.join(uploadDir, fileName), buffer)
        publicPath = `/uploads/reglements/${fileName}`
        importLogger.info(`Fichier calendrier + fiches sauvegardé sous : ${publicPath}`)
      } catch (err) {
        importLogger.error('Impossible de sauvegarder le PDF calendrier', err)
      }
    }
    importLogger.info(`${sheets.length} fiche(s) de compétition extraite(s) du fichier téléversé`)
  } catch (err) {
    importLogger.warn('Extraction des fiches du fichier téléversé échouée', err)
  }

  // Étape 2 : Si peu ou pas de fiches trouvées, scanner automatiquement le workspace
  // pour trouver le fichier "reglement-sportif" et en extraire toutes les fiches !
  if (sheets.length === 0) {
    try {
      const workspaceFiles = fs.readdirSync(/*turbopackIgnore: true*/ process.cwd())
      const reglementFile = workspaceFiles.find(f =>
        f.toLowerCase().includes('reglement') && f.toLowerCase().endsWith('.pdf')
      )

      if (reglementFile) {
        const reglementPath = path.join(/*turbopackIgnore: true*/ process.cwd(), reglementFile)
        importLogger.info(`Fichier règlement sportif local trouvé : ${reglementFile}`)
        const regBuffer = fs.readFileSync(reglementPath)
        const regText = await parsePdfText(regBuffer, { pagerender: makeReglementPagerender() })
        const regSheets = parseCompetitionSheets(regText)
        if (regSheets.length > 0) {
          sheets = regSheets
          regTextForSynthesis = regText
          importLogger.info(`${sheets.length} fiches de compétition extraites depuis le règlement local`)

          try {
            const uploadDir = path.join(/*turbopackIgnore: true*/ process.cwd(), 'public', 'uploads', 'reglements')
            fs.mkdirSync(uploadDir, { recursive: true })
            const destPath = path.join(uploadDir, reglementFile)
            fs.writeFileSync(destPath, regBuffer)
            publicPath = `/uploads/reglements/${reglementFile}`
            importLogger.info(`Fichier règlement local copié vers : ${publicPath}`)
          } catch (err) {
            importLogger.error('Impossible de copier le règlement local', err)
          }
        }
      }
    } catch (err) {
      importLogger.warn('Impossible de charger le règlement du workspace automatiquement', err)
    }
  }

  // Tag normal sheets
  if (publicPath) {
    sheets.forEach(s => (s as any).pdfPath = publicPath);
  }

  // Charger et extraire également les fiches du règlement régional PACA s'il existe
  let regionalSheets: any[] = [];
  const regionalFileName = 'PACA_Spécial_réglement_sportif_2025-2026_V2_NV09 (1).pdf';
  const regionalPath = path.join(/*turbopackIgnore: true*/ process.cwd(), regionalFileName);
  if (fs.existsSync(regionalPath)) {
    try {
      const regionalBuffer = fs.readFileSync(regionalPath);
      const timestamp = Date.now();
      const cleanRegionalName = regionalFileName.replace(/[^a-zA-Z0-9.-]/g, '_');
      const uniqueRegionalName = `${timestamp}-${cleanRegionalName}`;
      const uploadDir = path.join(/*turbopackIgnore: true*/ process.cwd(), 'public', 'uploads', 'reglements');
      fs.mkdirSync(uploadDir, { recursive: true });
      fs.writeFileSync(path.join(uploadDir, uniqueRegionalName), regionalBuffer);
      const regionalPdfPath = `/uploads/reglements/${uniqueRegionalName}`;

      const regionalText = await parsePdfText(regionalBuffer, { pagerender: makeReglementPagerender() });
      regionalSheets = parseCompetitionSheets(regionalText);
      regionalSheets.forEach(s => (s as any).pdfPath = regionalPdfPath);
      importLogger.info(`${regionalSheets.length} fiches de compétition extraites du règlement régional PACA.`);
    } catch (err) {
      importLogger.error('Erreur lors du traitement du règlement régional PACA', err);
    }
  }

  const allSheets = [...sheets, ...regionalSheets];

  // ── Parsing + cross-référencement ────────────────────────────────────────
  let events = await parseCalendarEventsWithAI(calendarText, allSheets);
  let extractionSource = 'ai-parser'

  if (!events || events.length === 0) {
    events = parseCalendarEventsFromText(calendarText, allSheets);
    extractionSource = 'regex-heuristics'
  }

  for (const event of events) {
    if (event.sheet) {
      event.pdfReglement = (event.sheet as any).pdfPath || publicPath;
    }
  }
  const enrichedCount = events.filter(e => e.sheet != null).length;

  // Générer la synthèse du règlement général
  const synthesis = regTextForSynthesis ? parseGeneralRegulations(regTextForSynthesis) : null

  return apiSuccess({
    events,
    source: extractionSource,
    sheetsFound: sheets.length,
    enrichedEvents: enrichedCount,
    synthesis,
    warning: events.length === 0 ? 'Aucun événement détecté.' : undefined,
  })
}
