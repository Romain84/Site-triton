import { NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/auth/session'
import { apiError } from '@/lib/api/response'
import { getBackupFilePath } from '@/lib/backup-service'
import fs from 'fs'

export const dynamic = 'force-dynamic'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ filename: string }> }
) {
  const session = await getAdminSession()
  if (!session) {
    return apiError('Non autorisé', 401)
  }

  try {
    const { filename } = await params
    const filepath = getBackupFilePath(filename)

    if (!filepath || !fs.existsSync(filepath)) {
      return apiError('Fichier introuvable', 404)
    }

    const fileBuffer = fs.readFileSync(filepath)

    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="${filename}"`
      }
    })
  } catch (error) {
    return apiError('Erreur lors du téléchargement du fichier', 500)
  }
}
