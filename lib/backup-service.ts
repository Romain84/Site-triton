import fs from 'fs'
import path from 'path'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'

export interface BackupMetadata {
  filename: string
  sizeBytes: number
  createdAt: string
  source: 'auto' | 'manual'
  counts: {
    groupes: number
    plannings: number
    inscriptions: number
    reservations: number
    users: number
  }
}

export function getBackupDirectory(): string {
  const dir = path.join(process.cwd(), 'backups')
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
  return dir
}

export async function createBackup(source: 'auto' | 'manual' = 'manual'): Promise<BackupMetadata> {
  const backupDir = getBackupDirectory()

  // Récupération de toutes les données du Triton Club Cavaillon
  const [groupes, plannings, inscriptions, reservations, settings, users, coaches] = await Promise.all([
    prisma.groupe.findMany(),
    prisma.planning.findMany(),
    prisma.inscription.findMany(),
    prisma.reservationSeance.findMany(),
    prisma.settings.findMany(),
    prisma.user.findMany({ select: { id: true, email: true, name: true, role: true, createdAt: true } }),
    prisma.coach.findMany({ select: { id: true, prenom: true, nom: true, email: true, actif: true } })
  ])

  const timestamp = new Date()
  const dateStr = timestamp.toISOString().replace(/[:.]/g, '-').slice(0, 19)
  const filename = `backup_triton_${dateStr}.json`
  const filepath = path.join(backupDir, filename)

  const backupData = {
    version: '1.0',
    app: 'Triton Club Cavaillon',
    timestamp: timestamp.toISOString(),
    source,
    counts: {
      groupes: groupes.length,
      plannings: plannings.length,
      inscriptions: inscriptions.length,
      reservations: reservations.length,
      users: users.length
    },
    data: {
      groupes,
      plannings,
      inscriptions,
      reservations,
      settings,
      users,
      coaches
    }
  }

  const jsonContent = JSON.stringify(backupData, null, 2)
  fs.writeFileSync(filepath, jsonContent, 'utf-8')
  logger.info(`[Backup] Nouvelle sauvegarde créée : ${filename} (${(jsonContent.length / 1024).toFixed(1)} KB)`)

  // Rotation automatique : conserver uniquement les 10 plus récentes sauvegardes
  rotateBackups(10)

  const stats = fs.statSync(filepath)
  return {
    filename,
    sizeBytes: stats.size,
    createdAt: timestamp.toISOString(),
    source,
    counts: backupData.counts
  }
}

export function rotateBackups(maxHistory: number = 10): void {
  const backupDir = getBackupDirectory()
  const files = fs.readdirSync(backupDir)
    .filter(f => f.startsWith('backup_triton_') && f.endsWith('.json'))
    .map(f => {
      const fp = path.join(backupDir, f)
      return {
        filename: f,
        filepath: fp,
        mtime: fs.statSync(fp).mtimeMs
      }
    })
    .sort((a, b) => b.mtime - a.mtime) // Du plus récent au plus ancien

  if (files.length > maxHistory) {
    const toDelete = files.slice(maxHistory)
    toDelete.forEach(file => {
      try {
        fs.unlinkSync(file.filepath)
        logger.info(`[Backup] Rotation OneDrive : ancienne sauvegarde supprimée (${file.filename})`)
      } catch (err) {
        logger.error(`[Backup] Erreur lors de la suppression de ${file.filename}`, { data: err })
      }
    })
  }
}

export function listBackups(): BackupMetadata[] {
  const backupDir = getBackupDirectory()
  if (!fs.existsSync(backupDir)) return []

  const files = fs.readdirSync(backupDir)
    .filter(f => f.startsWith('backup_triton_') && f.endsWith('.json'))
    .map(f => {
      const fp = path.join(backupDir, f)
      const stats = fs.statSync(fp)
      let counts = { groupes: 0, plannings: 0, inscriptions: 0, reservations: 0, users: 0 }
      let source: 'auto' | 'manual' = 'manual'
      let createdAt = stats.mtime.toISOString()

      try {
        const content = fs.readFileSync(fp, 'utf-8')
        const parsed = JSON.parse(content)
        if (parsed.counts) counts = parsed.counts
        if (parsed.source) source = parsed.source
        if (parsed.timestamp) createdAt = parsed.timestamp
      } catch {
        // En cas d'erreur de lecture partielle
      }

      return {
        filename: f,
        sizeBytes: stats.size,
        createdAt,
        source,
        counts
      }
    })
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 10) // Garantie de 10 sauvegardes max dans l'historique

  return files
}

export async function ensureDailyBackup(): Promise<void> {
  const backups = listBackups()
  const todayStr = new Date().toISOString().slice(0, 10)

  const hasBackupToday = backups.some(b => b.createdAt.startsWith(todayStr))
  if (!hasBackupToday) {
    logger.info('[Backup] Aucune sauvegarde automatique aujourd\'hui. Exécution du backup quotidien OneDrive...')
    await createBackup('auto')
  }
}

export function deleteBackup(filename: string): boolean {
  const backupDir = getBackupDirectory()
  const filepath = path.join(backupDir, filename)
  if (fs.existsSync(filepath)) {
    fs.unlinkSync(filepath)
    return true
  }
  return false
}

export function getBackupFilePath(filename: string): string | null {
  const backupDir = getBackupDirectory()
  const filepath = path.join(backupDir, filename)
  if (fs.existsSync(filepath) && filename.startsWith('backup_triton_') && filename.endsWith('.json')) {
    return filepath
  }
  return null
}
