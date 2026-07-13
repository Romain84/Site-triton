import { NextRequest, NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/auth/session'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'
import crypto from 'crypto'
import { logger } from '@/lib/logger'

const uploadLogger = logger.withContext('Upload')

export async function POST(request: NextRequest) {
  try {
    const session = await getAdminSession()
    if (!session) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json({ error: 'Aucun fichier fourni' }, { status: 400 })
    }

    // Validation du type
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
    if (!validTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Format non supporté (JPG, PNG, WEBP, GIF)' },
        { status: 400 }
      )
    }

    // Validation de la taille (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'Fichier trop volumineux (Max 5MB)' },
        { status: 400 }
      )
    }

    const fileExt = path.extname(file.name).toLowerCase()
    const safeFileName = `${crypto.randomUUID()}${fileExt}`

    // Créer le dossier s'il n'existe pas
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'actualites')
    await mkdir(uploadDir, { recursive: true })

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    const filePath = path.join(uploadDir, safeFileName)
    await writeFile(filePath, buffer)

    const publicPath = `/uploads/actualites/${safeFileName}`

    return NextResponse.json({
      url: publicPath,
    })
  } catch (error) {
    uploadLogger.error('Erreur upload image', error)
    const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue'
    return NextResponse.json(
      { error: `Erreur lors de l'upload local: ${errorMessage}` },
      { status: 500 }
    )
  }
}
