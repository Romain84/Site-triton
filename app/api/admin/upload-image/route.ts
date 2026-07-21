import { NextRequest, NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/auth/session'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'
import crypto from 'crypto'
import sharp from 'sharp'
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

    // Validation de la taille (15MB max)
    if (file.size > 15 * 1024 * 1024) {
      uploadLogger.warn(`Upload refusé : fichier trop volumineux (${(file.size / 1024 / 1024).toFixed(2)}MB > 15MB)`)
      return NextResponse.json(
        { error: 'Fichier trop volumineux (Max 15MB)' },
        { status: 400 }
      )
    }

    const bytes = await file.arrayBuffer()
    let buffer = Buffer.from(bytes)
    let fileExt = '.webp'

    try {
      buffer = await sharp(buffer)
        .webp({ quality: 88, alphaQuality: 100 })
        .toBuffer()
    } catch (err) {
      uploadLogger.warn('Erreur lors de la conversion sharp en WebP, conservation de l\'extension d\'origine', err)
      fileExt = path.extname(file.name).toLowerCase() || '.png'
    }

    const safeFileName = `${crypto.randomUUID()}${fileExt}`

    // Créer le dossier s'il n'existe pas
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'actualites')
    await mkdir(uploadDir, { recursive: true })

    const filePath = path.join(uploadDir, safeFileName)
    await writeFile(filePath, buffer)

    const publicPath = `/uploads/actualites/${safeFileName}`
    uploadLogger.info(`Image d'actualité enregistrée avec succès sous : ${publicPath}`)

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
