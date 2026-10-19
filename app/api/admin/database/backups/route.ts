import { NextRequest } from 'next/server'
import fs from 'fs'
import path from 'path'
import zlib from 'zlib'
import { prisma } from '@/lib/prisma'
import { apiError, apiSuccess } from '@/lib/api/response'
import { handleRouteError, requireAdmin } from '@/lib/api/guards'

const POSSIBLE_BACKUP_DIRS = [
  '/app/backups',
  '/root/backups',
  path.join(process.cwd(), 'backups'),
]

function getBackupDir(): string {
  for (const d of POSSIBLE_BACKUP_DIRS) {
    try {
      if (fs.existsSync(d)) {
        return d
      }
    } catch {}
  }
  const defaultDir = path.join(process.cwd(), 'backups')
  if (!fs.existsSync(defaultDir)) {
    fs.mkdirSync(defaultDir, { recursive: true })
  }
  return defaultDir
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 o'
  const k = 1024
  const sizes = ['o', 'Ko', 'Mo', 'Go']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

// GET: Lister les fichiers de sauvegarde avec rétention 10 jours
export async function GET() {
  try {
    const auth = await requireAdmin()
    if (!auth.ok) return auth.response
    if (auth.session.role !== 'admin') {
      return apiError('Accès réservé aux administrateurs principaux', 403)
    }

    const backupDir = getBackupDir()
    const files = fs.readdirSync(backupDir)

    const now = Date.now()
    const TEN_DAYS_MS = 10 * 24 * 60 * 60 * 1000

    const backupList: Array<{
      filename: string
      size: number
      sizeFormatted: string
      createdAt: string
      timestamp: number
    }> = []

    for (const file of files) {
      if (file.endsWith('.sql.gz') || file.endsWith('.sql') || file.endsWith('.json')) {
        const filePath = path.join(backupDir, file)
        try {
          const stats = fs.statSync(filePath)
          const fileAge = now - stats.mtimeMs

          // Nettoyage automatique des fichiers de plus de 10 jours
          if (fileAge > TEN_DAYS_MS) {
            try {
              fs.unlinkSync(filePath)
              continue
            } catch {}
          }

          backupList.push({
            filename: file,
            size: stats.size,
            sizeFormatted: formatBytes(stats.size),
            createdAt: stats.mtime.toISOString(),
            timestamp: stats.mtimeMs,
          })
        } catch {}
      }
    }

    // Trier du plus récent au plus ancien
    backupList.sort((a, b) => b.timestamp - a.timestamp)

    return apiSuccess({ backups: backupList, retentionDays: 10, backupDir })
  } catch (error) {
    return handleRouteError(error, 'Erreur lors de la récupération des sauvegardes')
  }
}

// POST: Déclencher une sauvegarde immédiate
export async function POST() {
  try {
    const auth = await requireAdmin()
    if (!auth.ok) return auth.response
    if (auth.session.role !== 'admin') {
      return apiError('Accès réservé aux administrateurs principaux', 403)
    }

    const backupDir = getBackupDir()
    const dateStr = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 16)
    const filename = `triton_db_${dateStr}.sql.gz`
    const filePath = path.join(backupDir, filename)

    // Export complet via Prisma vers JSON compressé en gzip (ou SQL)
    const PRISMA_MODELS = [
      'coach', 'remplacement', 'planning', 'coachPlanning', 'evenementCalendrier',
      'actualite', 'evenement', 'groupe', 'inscription', 'facture',
      'seanceExceptionnelle', 'reservationSeance', 'galerieAlbum', 'galerieMedia',
      'settings', 'user', 'don', 'evenementTournant', 'factureCoach',
      'ligneFactureCoach', 'periodeVacances', 'categorieProduit', 'fournisseur',
      'produit', 'varianteProduit', 'commande', 'passwordResetToken',
      'ligneCommande', 'chatbotKnowledge', 'seanceAnnulee', 'adminAuditLog',
      'chatbotSuggestion', 'emailQueue', 'transactionComptable', 'chatbotTokenLog',
      'categorieComptable', 'inscriptionBlock', 'podiumSaison', 'visite'
    ]

    const backupData: Record<string, any[]> = {}
    for (const modelName of PRISMA_MODELS) {
      const model = (prisma as any)[modelName]
      if (model) {
        backupData[modelName] = await model.findMany()
      }
    }

    const jsonContent = JSON.stringify(backupData, null, 2)
    const compressed = zlib.gzipSync(Buffer.from(jsonContent, 'utf-8'))
    fs.writeFileSync(filePath, compressed)

    const stats = fs.statSync(filePath)

    return apiSuccess({
      message: 'Sauvegarde créée avec succès',
      file: {
        filename,
        size: stats.size,
        sizeFormatted: formatBytes(stats.size),
        createdAt: stats.mtime.toISOString(),
      },
    })
  } catch (error) {
    return handleRouteError(error, 'Erreur lors de la création de la sauvegarde')
  }
}
