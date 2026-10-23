import 'dotenv/config'
import * as fs from 'fs'
import { prisma } from '../lib/prisma'

function escapeSql(val: any): string {
  if (val === null || val === undefined) return 'NULL'
  if (typeof val === 'boolean') return val ? 'TRUE' : 'FALSE'
  if (val instanceof Date) return `'${val.toISOString()}'`
  if (typeof val === 'string') {
    return `$q$${val}$q$`
  }
  return `$q$${String(val)}$q$`
}

async function main() {
  const events = await prisma.evenementCalendrier.findMany({
    where: {
      date: {
        gte: new Date('2026-01-01'),
        lte: new Date('2027-12-31T23:59:59.999Z')
      }
    },
    orderBy: { date: 'asc' }
  })

  console.log(`Found ${events.length} events in local database.`)

  let sql = `-- Migration / Import des événements 2026 & 2027 CD84 et PACA
BEGIN;

-- Purge des événements 2026 et 2027 provenant des calendriers CD84 / PACA
DELETE FROM evenements_calendrier
WHERE "date" >= '2026-01-01 00:00:00'
  AND "date" <= '2027-12-31 23:59:59.999'
  AND ("type" IN ('competition', 'stage', 'evenement') OR "description" LIKE '%CD84%' OR "description" LIKE '%__FICHE__%');

`

  for (const ev of events) {
    const fields = [
      `"id"`,
      `"title"`,
      `"date"`,
      `"dateFin"`,
      `"heureDebut"`,
      `"heureFin"`,
      `"lieu"`,
      `"type"`,
      `"couleur"`,
      `"description"`,
      `"groupeId"`,
      `"actif"`,
      `"createdAt"`,
      `"updatedAt"`
    ].join(', ')

    const values = [
      escapeSql(ev.id),
      escapeSql(ev.title),
      escapeSql(ev.date),
      escapeSql(ev.dateFin),
      escapeSql(ev.heureDebut),
      escapeSql(ev.heureFin),
      escapeSql(ev.lieu),
      escapeSql(ev.type),
      escapeSql(ev.couleur),
      escapeSql(ev.description),
      escapeSql(ev.groupeId),
      escapeSql(ev.actif),
      escapeSql(ev.createdAt),
      escapeSql(ev.updatedAt)
    ].join(', ')

    sql += `INSERT INTO evenements_calendrier (${fields}) VALUES (${values});\n`
  }

  sql += `\nCOMMIT;\n`

  fs.writeFileSync('scripts/seed-events-vps.sql', sql, 'utf8')
  console.log(`Wrote scripts/seed-events-vps.sql successfully (${events.length} records).`)
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
