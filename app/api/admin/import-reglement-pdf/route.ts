// app/api/admin/import-reglement-pdf/route.ts
//
// POST — Lit le PDF du règlement sportif CD84, en extrait les fiches de compétition
//        (programmes, heures, épreuves, droits d'engagement, conditions) et enrichit
//        les événements DÉJÀ existants en base en faisant correspondre les dates.
//
// Réponse :
//   { enriched: number, notMatched: number, sheets: number, details: Array<{date, title, matched}> }

import { NextRequest } from 'next/server'
import fs from 'fs'
import path from 'path'
import { getAdminSession } from '@/lib/auth/session'
import { isSameOriginRequest } from '@/lib/security/origin'
import { apiError, apiSuccess } from '@/lib/api/response'
import { parseCompetitionSheets, parseGeneralRegulations } from '@/lib/calendar/import-parser'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'

const importLogger = logger.withContext('ImportReglementPDF')

// ─── PDF parsing helper ───────────────────────────────────────────────────────

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

// ─── Helpers de normalisation / matching ─────────────────────────────────────

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '')
}

/**
 * Score de similarité entre deux chaînes de caractères normalisées.
 * Compte le nombre de sous-chaînes communes de longueur >= 4.
 */
function similarityScore(a: string, b: string): number {
  const na = normalize(a)
  const nb = normalize(b)
  let score = 0
  const minLen = Math.min(na.length, nb.length)
  for (let len = 4; len <= minLen; len++) {
    for (let i = 0; i <= na.length - len; i++) {
      if (nb.includes(na.slice(i, i + len))) score++
    }
  }
  return score
}

function buildDescription(sheet: object): string {
  return `__FICHE__:${JSON.stringify(sheet)}`
}

// ─── Handler ──────────────────────────────────────────────────────────────────

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

  let publicPath: string | null = null
  try {
    const timestamp = Date.now()
    const originalName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_')
    const fileName = `${timestamp}-${originalName}`
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'reglements')
    fs.mkdirSync(uploadDir, { recursive: true })
    fs.writeFileSync(path.join(uploadDir, fileName), buffer)
    publicPath = `/uploads/reglements/${fileName}`
    importLogger.info(`Fichier règlement sauvegardé sous : ${publicPath}`)
  } catch (err) {
    importLogger.error('Impossible de sauvegarder physiquement le règlement PDF', err)
  }

  // ── 1. Parser le PDF règlement ────────────────────────────────────────────
  let fullText: string
  try {
    fullText = await parsePdfText(buffer, { pagerender: makeReglementPagerender() })
  } catch (err) {
    importLogger.error('[PDF_PARSE_ERROR]', err)
    return apiError(
      'Impossible de lire le PDF. Vérifiez que le fichier contient du texte sélectionnable.',
      422,
      undefined,
      'PDF_PARSE_ERROR'
    )
  }

  // ── 2. Extraire les fiches de compétition ────────────────────────────────
  const sheets = parseCompetitionSheets(fullText)
  importLogger.info(`${sheets.length} fiche(s) de compétition extraite(s) du règlement`)

  if (sheets.length === 0) {
    return apiError(
      'Aucune fiche de compétition détectée dans ce PDF. Vérifiez qu\'il s\'agit bien du règlement sportif.',
      422,
      undefined,
      'NO_SHEETS_FOUND'
    )
  }

  // ── 3. Extraire la synthèse du règlement général ─────────────────────────
  const synthesis = parseGeneralRegulations(fullText)

  // ── 4. Récupérer tous les événements existants en base ───────────────────
  const existingEvents = await prisma.evenementCalendrier.findMany({
    select: { id: true, title: true, date: true, lieu: true, description: true },
    orderBy: { date: 'asc' },
  })

  importLogger.info(`${existingEvents.length} événement(s) existant(s) en base`)

  // ── 5. Faire correspondre chaque fiche à un événement en base ────────────
  type EnrichDetail = {
    sheetTitle:  string
    sheetDate:   string
    eventTitle:  string | null
    eventId:     string | null
    matched:     boolean
    score:       number
  }

  const details: EnrichDetail[] = []
  let enriched = 0
  let notMatched = 0

  for (const sheet of sheets) {
    if (!sheet.date) { notMatched++; continue }

    // Trouver les événements en base ayant la même date (±0 jour)
    const sheetDateObj = new Date(sheet.date)
    const candidates = existingEvents.filter(ev => {
      const evDate = new Date(ev.date)
      return evDate.toISOString().slice(0, 10) === sheetDateObj.toISOString().slice(0, 10)
    })

    if (candidates.length === 0) {
      // Essai avec date de fin si la fiche couvre plusieurs jours
      const altDate = sheet.dateFin ? new Date(sheet.dateFin) : null
      const altCandidates = altDate
        ? existingEvents.filter(ev => {
            const evDate = new Date(ev.date)
            return evDate.toISOString().slice(0, 10) === altDate.toISOString().slice(0, 10)
          })
        : []

      if (altCandidates.length === 0) {
        details.push({ sheetTitle: sheet.title, sheetDate: sheet.date, eventTitle: null, eventId: null, matched: false, score: 0 })
        notMatched++
        continue
      }

      candidates.push(...altCandidates)
    }

    // Choisir le meilleur candidat par similarité de titre
    let bestEvent = candidates[0]
    let bestScore = similarityScore(sheet.title, candidates[0].title)
    for (const ev of candidates.slice(1)) {
      const score = similarityScore(sheet.title, ev.title)
      if (score > bestScore) { bestScore = score; bestEvent = ev }
    }

    // ── Enrichir l'événement en base ──────────────────────────────────────
    const updateData: Record<string, unknown> = {
      description: buildDescription(sheet),
    }

    if (publicPath) {
      updateData.pdfReglement = publicPath
    }

    // Mettre à jour le lieu si non défini ou si la fiche en a un
    if (sheet.lieu && (!bestEvent.lieu || bestEvent.lieu.trim() === '')) {
      updateData.lieu = sheet.lieu
    }

    // Extraire heureDebut depuis la première session
    const firstSession = sheet.sessions[0]
    if (firstSession?.heureDebut) {
      const [h, m] = firstSession.heureDebut.replace('H', ':').split(':')
      updateData.heureDebut = `${h.padStart(2, '0')}:${(m ?? '00').padStart(2, '0')}`
    }

    // Extraire heureFin depuis la dernière session
    const lastSession = sheet.sessions[sheet.sessions.length - 1]
    if (lastSession?.heureDebut) {
      const [h, m] = lastSession.heureDebut.replace('H', ':').split(':')
      updateData.heureFin = `${h.padStart(2, '0')}:${(m ?? '00').padStart(2, '0')}`
    }

    // Mettre à jour la dateFin si la fiche en précise une
    if (sheet.dateFin) {
      updateData.dateFin = new Date(sheet.dateFin)
    }

    try {
      await prisma.evenementCalendrier.update({
        where: { id: bestEvent.id },
        data: updateData,
      })
      enriched++
      details.push({
        sheetTitle: sheet.title,
        sheetDate: sheet.date,
        eventTitle: bestEvent.title,
        eventId: bestEvent.id,
        matched: true,
        score: bestScore,
      })
      importLogger.info(`✅ Enrichi : "${bestEvent.title}" (${sheet.date}) avec fiche "${sheet.title}"`)
    } catch (err) {
      importLogger.error(`Erreur mise à jour événement ${bestEvent.id}`, err)
      details.push({ sheetTitle: sheet.title, sheetDate: sheet.date, eventTitle: bestEvent.title, eventId: bestEvent.id, matched: false, score: bestScore })
      notMatched++
    }
  }

  importLogger.info(`Enrichissement terminé : ${enriched} enrichi(s), ${notMatched} non associé(s)`)

  return apiSuccess({
    sheets: sheets.length,
    enriched,
    notMatched,
    synthesis,
    details,
  })
}
