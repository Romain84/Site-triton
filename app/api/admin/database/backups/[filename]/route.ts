import { NextRequest } from 'next/server'
import fs from 'fs'
import path from 'path'
import { apiError } from '@/lib/api/response'
import { handleRouteError, requireAdmin } from '@/lib/api/guards'

const POSSIBLE_BACKUP_DIRS = [
  '/app/backups',
  '/root/backups',
  path.join(process.cwd(), 'backups'),
]

function getBackupDir(): string {
  for (const d of POSSIBLE_BACKUP_DIRS) {
    try {
      if (fs.existsSync(d)) return d
    } catch {}
  }
  return path.join(process.cwd(), 'backups')
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
  try {
    const auth = await requireAdmin()
    if (!auth.ok) return auth.response

    const { filename } = await params

    // Sécurité: interdire traversal ../
    const safeFilename = path.basename(filename)
    if (safeFilename !== filename) {
      return apiError('Nom de fichier invalide', 400)
    }

    const backupDir = getBackupDir()
    const filePath = path.join(backupDir, safeFilename)

    if (!fs.existsSync(filePath)) {
      return apiError('Fichier introuvable', 404)
    }

    const fileBuffer = fs.readFileSync(filePath)
    const contentType = safeFilename.endsWith('.gz')
      ? 'application/gzip'
      : safeFilename.endsWith('.json')
      ? 'application/json'
      : 'application/octet-stream'

    return new Response(fileBuffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${safeFilename}"`,
      },
    })
  } catch (error) {
    return handleRouteError(error, 'Erreur lors du téléchargement de la sauvegarde')
  }
}
