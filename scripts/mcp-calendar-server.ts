#!/usr/bin/env node
import 'dotenv/config'
import fs from 'fs'
import path from 'path'
import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js'
import { prisma } from '../lib/prisma'
import { parseCalendarEventsFromText, parseCompetitionSheets } from '../lib/calendar/import-parser'
import { parseCalendarEventsWithAI } from '../lib/calendar/ai-parser'

// ── Extraction de texte PDF ──────────────────────────────────────────────────
async function readPdfText(buffer: Buffer): Promise<string> {
  const pdfparseModule = require('pdf-parse')
  const uint8Array = new Uint8Array(buffer)
  const finalOptions = { pageJoiner: '__PAGE_NUMBER__:page_number' }

  if (typeof pdfparseModule === 'function') {
    const data = await pdfparseModule(uint8Array, finalOptions)
    return data.text
  } else if (pdfparseModule && typeof pdfparseModule.PDFParse === 'function') {
    const parser = new pdfparseModule.PDFParse(uint8Array, finalOptions)
    const data = await parser.getText(finalOptions)
    return data.text
  }
  throw new Error("Module pdf-parse indisponible")
}

// ── Mapping des groupes du club ──────────────────────────────────────────────
function getGroupIdsForCategories(categories: string, dbGroups: Array<{ id: string; nom: string }>): string[] {
  const matchedIds: string[] = []
  const cats = (categories || '').toLowerCase().trim()
  if (!cats) return []

  const isAvenirs = (g: any) => g.nom.includes('Avenirs')
  const isBenjamins = (g: any) => g.nom.includes('Benjamins')
  const isJuniors = (g: any) => g.nom.includes('Juniors')
  const isAdultes = (g: any) => g.nom.includes('Adultes')

  if (cats.includes('u12 et +') || cats.includes('u12 et plus')) {
    matchedIds.push(...dbGroups.filter(g => isBenjamins(g) || isJuniors(g) || isAdultes(g)).map(g => g.id))
  } else if (cats.includes('u14 et +') || cats.includes('u14 et plus')) {
    matchedIds.push(...dbGroups.filter(g => isJuniors(g) || isAdultes(g)).map(g => g.id))
  } else if (cats.includes('u18 et +') || cats.includes('u18 et plus')) {
    matchedIds.push(...dbGroups.filter(isAdultes).map(g => g.id))
  } else {
    if (cats.includes('u11') || cats.includes('avenirs')) {
      matchedIds.push(...dbGroups.filter(isAvenirs).map(g => g.id))
    }
    if (cats.includes('u12') || cats.includes('u13') || cats.includes('benjamins')) {
      matchedIds.push(...dbGroups.filter(isBenjamins).map(g => g.id))
    }
    if (cats.includes('u14') || cats.includes('u15') || cats.includes('u16') || cats.includes('u17') || cats.includes('u18') || cats.includes('juniors')) {
      matchedIds.push(...dbGroups.filter(isJuniors).map(g => g.id))
    }
    if (cats.includes('u20') || cats.includes('u25') || cats.includes('seniors') || cats.includes('elites') || cats.includes('maîtres') || cats.includes('maitres') || cats.includes('adultes')) {
      matchedIds.push(...dbGroups.filter(isAdultes).map(g => g.id))
    }
  }

  return Array.from(new Set(matchedIds))
}

// ── Initialisation du Serveur MCP ───────────────────────────────────────────
const server = new Server(
  {
    name: 'triton-calendar-mcp',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
)

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'parse_calendar_pdf',
        description: 'Lit et extrait toutes les compétitions d\'un livret ou calendrier PDF de natation (CD84 / PACA) via l\'IA multimodale et le parseur structuré.',
        inputSchema: {
          type: 'object',
          properties: {
            pdfPath: {
              type: 'string',
              description: 'Chemin absolu ou relatif vers le fichier PDF du calendrier ou règlement',
            },
          },
          required: ['pdfPath'],
        },
      },
      {
        name: 'import_calendar_events_to_db',
        description: 'Insère une liste d\'événements de natation dans la base de données PostgreSQL de Triton Cavaillon avec distribution automatique sur les groupes (Avenirs, Benjamins, Juniors, Adultes).',
        inputSchema: {
          type: 'object',
          properties: {
            events: {
              type: 'array',
              description: 'Tableau des événements à insérer',
              items: {
                type: 'object',
                properties: {
                  title: { type: 'string' },
                  date: { type: 'string', description: 'YYYY-MM-DD' },
                  dateFin: { type: 'string' },
                  heureDebut: { type: 'string' },
                  heureFin: { type: 'string' },
                  lieu: { type: 'string' },
                  categories: { type: 'string' },
                  description: { type: 'string' },
                  pdfReglement: { type: 'string' },
                  type: { type: 'string', enum: ['competition', 'evenement', 'stage', 'entrainement'] },
                },
                required: ['title', 'date'],
              },
            },
            clearExistingYear: {
              type: 'number',
              description: 'Année à purger avant insertion pour éviter les doublons (ex: 2026 ou 2027)',
            },
          },
          required: ['events'],
        },
      },
      {
        name: 'list_season_events',
        description: 'Liste les événements et compétitions actuellement enregistrés en base de données pour une année donnée.',
        inputSchema: {
          type: 'object',
          properties: {
            year: { type: 'number', description: 'Année ciblée (ex: 2026 ou 2027)' },
          },
          required: ['year'],
        },
      },
      {
        name: 'delete_season_events',
        description: 'Supprime toutes les compétitions enregistrées pour une année spécifique (action irréversible).',
        inputSchema: {
          type: 'object',
          properties: {
            year: { type: 'number', description: 'Année à purger (ex: 2026 ou 2027)' },
          },
          required: ['year'],
        },
      },
    ],
  }
})

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params

  try {
    if (name === 'parse_calendar_pdf') {
      const pdfPath = String(args?.pdfPath)
      const resolvedPath = path.isAbsolute(pdfPath) ? pdfPath : path.resolve(process.cwd(), pdfPath)

      if (!fs.existsSync(resolvedPath)) {
        return {
          content: [{ type: 'text', text: `Erreur : Fichier introuvable à l'emplacement ${resolvedPath}` }],
          isError: true,
        }
      }

      const buffer = fs.readFileSync(resolvedPath)
      const fullText = await readPdfText(buffer)
      const sheets = parseCompetitionSheets(fullText)

      let events = await parseCalendarEventsWithAI(fullText, sheets)
      let source = 'ai-mistral'
      if (!events || events.length === 0) {
        events = parseCalendarEventsFromText(fullText, sheets)
        source = 'regex-heuristics'
      }

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                success: true,
                source,
                totalEvents: events.length,
                fichesFound: sheets.length,
                events,
              },
              null,
              2
            ),
          },
        ],
      }
    }

    if (name === 'import_calendar_events_to_db') {
      const events = (args?.events as any[]) || []
      const clearExistingYear = args?.clearExistingYear ? Number(args.clearExistingYear) : null

      let deletedCount = 0
      if (clearExistingYear) {
        const delRes = await prisma.evenementCalendrier.deleteMany({
          where: {
            date: {
              gte: new Date(clearExistingYear, 0, 1),
              lte: new Date(clearExistingYear, 11, 31, 23, 59, 59, 999),
            },
            type: 'competition',
          },
        })
        deletedCount = delRes.count
      }

      const dbGroups = await prisma.groupe.findMany({ select: { id: true, nom: true, niveau: true } })
      let insertedCount = 0

      for (const ev of events) {
        const categoriesStr = ev.categories || ''
        const matchingGroupIds = getGroupIdsForCategories(categoriesStr, dbGroups)
        const baseDescription = ev.description || `Compétition CD84 - Catégories : ${categoriesStr || 'Toutes'}`

        const dataPayload = {
          title: ev.title,
          date: new Date(ev.date),
          dateFin: ev.dateFin ? new Date(ev.dateFin) : null,
          heureDebut: ev.heureDebut || '08:00',
          heureFin: ev.heureFin || '18:00',
          lieu: ev.lieu || null,
          type: (ev.type || 'competition') as any,
          pdfReglement: ev.pdfReglement || null,
          actif: true,
        }

        if (matchingGroupIds.length === 0) {
          await prisma.evenementCalendrier.create({
            data: { ...dataPayload, description: baseDescription, couleur: '#15803d' },
          })
        } else if (matchingGroupIds.length === 1) {
          const gId = matchingGroupIds[0]
          const group = dbGroups.find(g => g.id === gId)
          await prisma.evenementCalendrier.create({
            data: {
              ...dataPayload,
              description: ev.description ? baseDescription : `${baseDescription} (${group?.nom})`,
              groupeId: gId,
              couleur: group?.niveau === 'competition' ? '#1d4ed8' : '#15803d',
            },
          })
        } else {
          const hasComp = dbGroups.filter(g => matchingGroupIds.includes(g.id)).some(g => g.niveau === 'competition')
          await prisma.evenementCalendrier.create({
            data: {
              ...dataPayload,
              description: `${baseDescription}\n__TARGET_GROUPS__:${JSON.stringify(matchingGroupIds)}`,
              groupeId: null,
              couleur: hasComp ? '#1d4ed8' : '#15803d',
            },
          })
        }
        insertedCount++
      }

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: true,
              deletedPreviousCount: deletedCount,
              insertedCount,
            }, null, 2),
          },
        ],
      }
    }

    if (name === 'list_season_events') {
      const year = Number(args?.year)
      const list = await prisma.evenementCalendrier.findMany({
        where: {
          date: {
            gte: new Date(year, 0, 1),
            lte: new Date(year, 11, 31, 23, 59, 59, 999),
          },
        },
        orderBy: { date: 'asc' },
        select: {
          id: true,
          title: true,
          date: true,
          dateFin: true,
          lieu: true,
          type: true,
          groupeId: true,
          description: true,
        },
      })

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              year,
              totalEvents: list.length,
              events: list.map(e => ({
                id: e.id,
                title: e.title,
                date: e.date.toISOString().split('T')[0],
                dateFin: e.dateFin ? e.dateFin.toISOString().split('T')[0] : null,
                lieu: e.lieu,
                type: e.type,
              })),
            }, null, 2),
          },
        ],
      }
    }

    if (name === 'delete_season_events') {
      const year = Number(args?.year)
      const res = await prisma.evenementCalendrier.deleteMany({
        where: {
          date: {
            gte: new Date(year, 0, 1),
            lte: new Date(year, 11, 31, 23, 59, 59, 999),
          },
          type: 'competition',
        },
      })

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({ success: true, deletedCount: res.count, year }, null, 2),
          },
        ],
      }
    }

    return {
      content: [{ type: 'text', text: `Outil inconnu : ${name}` }],
      isError: true,
    }
  } catch (err: any) {
    return {
      content: [{ type: 'text', text: `Erreur lors de l'exécution : ${err?.message || err}` }],
      isError: true,
    }
  }
})

async function main() {
  const transport = new StdioServerTransport()
  await server.connect(transport)
  console.error('[TritonCalendarMCP] Serveur MCP démarré et connecté via Stdio.')
}

main().catch((err) => {
  console.error('[TritonCalendarMCP] Erreur fatale au démarrage:', err)
  process.exit(1)
})
