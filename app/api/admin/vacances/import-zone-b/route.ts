// app/api/admin/vacances/import-zone-b/route.ts
//
// POST — Importe automatiquement les vacances scolaires Zone B / Académie Aix-Marseille
//         depuis l'API officielle data.education.gouv.fr.
//         • Filtre l'académie Aix-Marseille (couvre le Vaucluse)
//         • Ajuste le début au dimanche suivant (le premier jour de vacances est un samedi)
//         • Évite les doublons (même nom + même année)
//
// Params query : annee (ex: 2025 → saison 2025-2026)

import { NextRequest } from 'next/server'
import { getAdminSession } from '@/lib/auth/session'
import { isSameOriginRequest } from '@/lib/security/origin'
import { apiError, apiSuccess } from '@/lib/api/response'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'

const vacLogger = logger.withContext('ImportVacancesZoneB')

// ─── Couleur par type de vacances ────────────────────────────────────────────
const COULEUR_MAP: Record<string, string> = {
  'Vacances de Noël':       '#dc2626',
  'Vacances de la Toussaint': '#ea580c',
  'Vacances d\'hiver':      '#7c3aed',
  'Vacances de printemps':  '#16a34a',
  'Grandes vacances':       '#2563eb',
  'Vacances de Pâques':     '#16a34a',
}

function getCouleur(description: string): string {
  for (const [key, color] of Object.entries(COULEUR_MAP)) {
    if (description.toLowerCase().includes(key.toLowerCase())) return color
  }
  return '#dc2626'
}

/**
 * Avance une date au dimanche suivant si elle tombe un samedi.
 * Les vacances françaises commencent officiellement le samedi soir,
 * mais le club ne ferme que dès le dimanche.
 */
function adjustToSunday(date: Date): Date {
  const day = date.getDay() // 0=dim, 6=sam
  if (day === 6) {
    const next = new Date(date)
    next.setDate(next.getDate() + 1)
    return next
  }
  return date
}

export async function POST(request: NextRequest) {
  if (!isSameOriginRequest(request)) {
    return apiError('Origine non autorisée', 403, undefined, 'FORBIDDEN_ORIGIN')
  }
  const session = await getAdminSession()
  if (!session) {
    return apiError('Non authentifié', 401, undefined, 'UNAUTHENTICATED')
  }

  const { searchParams } = new URL(request.url)
  const annee = parseInt(searchParams.get('annee') ?? new Date().getFullYear().toString(), 10)

  // La saison scolaire couvre deux années civiles (ex: 2025 → sept 2025 – août 2026)
  const dateMin = `${annee}-09-01`
  const dateMax = `${annee + 1}-08-31`

  // ── 1. Appel API data.education.gouv.fr ───────────────────────────────────
  const apiUrl =
    `https://data.education.gouv.fr/api/explore/v2.1/catalog/datasets/fr-en-calendrier-scolaire/records` +
    `?where=zones%20like%20%22Zone%20B%22` +
    `%20and%20location%20%3D%20%22Aix-Marseille%22` +
    `%20and%20start_date%20%3E%3D%20%22${dateMin}T00%3A00%3A00%22` +
    `%20and%20start_date%20%3C%3D%20%22${dateMax}T23%3A59%3A59%22` +
    `&limit=50&order_by=start_date` +
    `&select=description%2Cstart_date%2Cend_date`

  let records: Array<{ description: string; start_date: string; end_date: string }>
  try {
    const res = await fetch(apiUrl, { next: { revalidate: 0 } })
    if (!res.ok) throw new Error(`API gouvernement HTTP ${res.status}`)
    const json = await res.json() as { results: typeof records }
    records = json.results ?? []
  } catch (err) {
    vacLogger.error('Erreur appel API data.education.gouv.fr', err)
    return apiError(
      'Impossible de contacter l\'API data.education.gouv.fr. Vérifiez la connexion internet du serveur.',
      502,
      undefined,
      'EXTERNAL_API_ERROR'
    )
  }

  if (records.length === 0) {
    return apiError(
      `Aucune période trouvée pour la Zone B / Aix-Marseille pour la saison ${annee}-${annee + 1}.`,
      404,
      undefined,
      'NO_RECORDS'
    )
  }

  vacLogger.info(`${records.length} période(s) trouvée(s) pour la saison ${annee}-${annee + 1}`)

  // ── 2. Récupérer les périodes existantes pour éviter les doublons ─────────
  const existing = await prisma.periodeVacances.findMany({
    where: {
      dateDebut: {
        gte: new Date(`${annee}-09-01`),
        lte: new Date(`${annee + 1}-08-31`),
      },
    },
    select: { nom: true, dateDebut: true },
  })
  const existingKeys = new Set(
    existing.map(p => `${p.nom}|${new Date(p.dateDebut).toISOString().slice(0, 10)}`)
  )

  // ── 3. Insérer les nouvelles périodes ─────────────────────────────────────
  let created = 0
  let skipped = 0
  const details: Array<{ nom: string; dateDebut: string; dateFin: string; status: 'created' | 'skipped' }> = []

  for (const record of records) {
    const rawStart = new Date(record.start_date)
    const rawEnd   = new Date(record.end_date)

    // Ajuster le début au dimanche si le record commence un samedi
    const startDate = adjustToSunday(rawStart)
    // Forcer minuit UTC local
    startDate.setHours(0, 0, 0, 0)
    rawEnd.setHours(23, 59, 59, 0)

    const nom = record.description
    const key = `${nom}|${startDate.toISOString().slice(0, 10)}`

    if (existingKeys.has(key)) {
      skipped++
      details.push({ nom, dateDebut: startDate.toISOString().slice(0, 10), dateFin: rawEnd.toISOString().slice(0, 10), status: 'skipped' })
      continue
    }

    await prisma.periodeVacances.create({
      data: {
        nom,
        description: `Zone B – Aix-Marseille (saison ${annee}-${annee + 1})`,
        dateDebut: startDate,
        dateFin: rawEnd,
        type: 'vacances',
        impacteFacturation: true,
        actif: true,
        couleur: getCouleur(nom),
      },
    })

    existingKeys.add(key)
    created++
    details.push({ nom, dateDebut: startDate.toISOString().slice(0, 10), dateFin: rawEnd.toISOString().slice(0, 10), status: 'created' })
  }

  vacLogger.info(`Import terminé : ${created} créé(s), ${skipped} doublon(s)`)

  return apiSuccess({ created, skipped, annee, details })
}
