import { NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/auth/session'
import { apiError } from '@/lib/api/response'
import { listBackups, createBackup, ensureDailyBackup, deleteBackup } from '@/lib/backup-service'
import { logger } from '@/lib/logger'

export const dynamic = 'force-dynamic'

export async function GET() {
  const session = await getAdminSession()
  if (!session) {
    return apiError('Non autorisé', 401)
  }

  try {
    // S'assurer qu'une sauvegarde quotidienne automatique existe pour aujourd'hui
    await ensureDailyBackup()

    const backups = listBackups()
    return NextResponse.json({
      success: true,
      oneDrivePath: 'C:\\Triton\\OneDrive - Triton Club Cavaillon\\Documents\\Site_New_TRITON-\\backups',
      maxHistory: 10,
      backups
    })
  } catch (error) {
    logger.error('Erreur lors de la récupération des sauvegardes OneDrive', { data: error })
    return apiError('Erreur lors de la récupération des sauvegardes', 500)
  }
}

export async function POST() {
  const session = await getAdminSession()
  if (!session) {
    return apiError('Non autorisé', 401)
  }

  try {
    const backup = await createBackup('manual')
    const backups = listBackups()

    return NextResponse.json({
      success: true,
      message: 'Sauvegarde créée et synchronisée sur OneDrive avec succès !',
      created: backup,
      backups
    })
  } catch (error) {
    logger.error('Erreur lors de la création de la sauvegarde OneDrive', { data: error })
    return apiError('Erreur lors de la création de la sauvegarde', 500)
  }
}

export async function DELETE(request: Request) {
  const session = await getAdminSession()
  if (!session) {
    return apiError('Non autorisé', 401)
  }

  try {
    const { searchParams } = new URL(request.url)
    const filename = searchParams.get('filename')

    if (!filename) {
      return apiError('Nom de fichier manquant', 400)
    }

    const deleted = deleteBackup(filename)
    if (!deleted) {
      return apiError('Fichier de sauvegarde non trouvé', 404)
    }

    const backups = listBackups()
    return NextResponse.json({
      success: true,
      message: `Sauvegarde ${filename} supprimée de OneDrive.`,
      backups
    })
  } catch (error) {
    logger.error('Erreur lors de la suppression de la sauvegarde', { data: error })
    return apiError('Erreur lors de la suppression', 500)
  }
}
