// app/api/admin/evenements/bulk/route.ts
//
// POST  — importe un tableau d'événements en une seule requête Prisma.
//         Détecte les doublons (même date + titre similaire) avant insertion
//         et les ignore avec skipDuplicates au niveau base.
//
// Réponse :
//   { created: number, skipped: number, duplicates: string[] }

import { NextRequest } from 'next/server'
import { z } from 'zod'
import { getAdminSession } from '@/lib/auth/session'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { apiError, apiSuccess } from '@/lib/api/response'
import { isSameOriginRequest } from '@/lib/security/origin'

const bulkLogger = logger.withContext('BulkImport')

// ─── Validation ───────────────────────────────────────────────────────────────

const bulkEventSchema = z.object({
  title:        z.string().min(1).max(300),
  date:         z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  dateFin:      z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  heureDebut:   z.string().nullable().optional(),
  heureFin:     z.string().nullable().optional(),
  description:  z.string().max(10000).nullable().optional(),
  lieu:         z.string().nullable().optional(),
  type:         z.enum(['evenement', 'competition', 'entrainement', 'stage']),
  couleur:      z.string().regex(/^#[0-9a-fA-F]{6}$/),
  coachId:      z.string().nullable().optional(),
  pdfReglement: z.string().nullable().optional(),
  actif:        z.boolean().optional().default(true),
})

const bulkSchema = z.object({
  events: z.array(bulkEventSchema).min(1).max(200),
})

// ─── Helper déduplication ─────────────────────────────────────────────────────

/**
 * Clé de déduplication : date ISO + 30 premiers caractères du titre normalisé.
 * Assez strict pour éviter les faux positifs entre "Championnat U11" et
 * "Championnat U14", assez souple pour ignorer les différences de casse/accents.
 */
function dedupeKey(date: string, title: string): string {
  const normTitle = title
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 30)
  return `${date}|${normTitle}`
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

  // ── Parse + validation ────────────────────────────────────────────────────
  let body: z.infer<typeof bulkSchema>
  try {
    body = bulkSchema.parse(await request.json())
  } catch (err) {
    if (err instanceof z.ZodError) {
      return apiError('Données invalides', 400, err.flatten(), 'VALIDATION_ERROR')
    }
    return apiError('Corps de requête invalide', 400, undefined, 'BAD_REQUEST')
  }

  const { events } = body

  // ── Déduplication : charger les événements existants sur la même plage ───
  const dates = events.map(e => new Date(e.date))
  const minDate = new Date(Math.min(...dates.map(d => d.getTime())))
  const maxDate = new Date(Math.max(...dates.map(d => d.getTime())))

  const existing = await prisma.evenementCalendrier.findMany({
    where: { date: { gte: minDate, lte: maxDate } },
    select: { date: true, title: true },
  })

  // Construire un Set des clés existantes
  const existingKeys = new Set(
    existing.map(e => dedupeKey(e.date.toISOString().slice(0, 10), e.title))
  )

  // Séparer les nouveaux des doublons
  const toCreate: typeof events = []
  const duplicateTitles: string[] = []

  for (const ev of events) {
    const key = dedupeKey(ev.date, ev.title)
    if (existingKeys.has(key)) {
      duplicateTitles.push(`${ev.date} — ${ev.title}`)
    } else {
      toCreate.push(ev)
      // Ajouter immédiatement au Set pour éviter les doublons dans le même batch
      existingKeys.add(key)
    }
  }

  if (toCreate.length === 0) {
    return apiSuccess({
      created:    0,
      skipped:    duplicateTitles.length,
      duplicates: duplicateTitles,
    })
  }

  // ── Insertion en masse ────────────────────────────────────────────────────
  try {
    const result = await prisma.evenementCalendrier.createMany({
      data: toCreate.map(ev => ({
        title:        ev.title,
        date:         new Date(ev.date),
        dateFin:      ev.dateFin ? new Date(ev.dateFin) : null,
        heureDebut:   ev.heureDebut ?? null,
        heureFin:     ev.heureFin ?? null,
        description:  ev.description ?? null,
        lieu:         ev.lieu ?? null,
        type:         ev.type,
        couleur:      ev.couleur,
        coachId:      ev.coachId ?? null,
        pdfReglement: ev.pdfReglement ?? null,
        actif:        ev.actif ?? true,
      })),
    })

    bulkLogger.info('Import en masse', {
      created:  result.count,
      skipped:  duplicateTitles.length,
      total:    events.length,
    })

    return apiSuccess({
      created:    result.count,
      skipped:    duplicateTitles.length,
      duplicates: duplicateTitles,
    })
  } catch (error) {
    bulkLogger.error('Erreur createMany', error)
    return apiError('Erreur lors de l\'import', 500, undefined, 'INTERNAL_SERVER_ERROR')
  }
}
