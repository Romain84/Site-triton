import { NextRequest, NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/auth/session'
import { put } from '@vercel/blob'
import { logger } from '@/lib/logger'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'
import sharp from 'sharp'

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
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml']
    if (!validTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Format non supporté (JPG, PNG, WEBP, SVG)' },
        { status: 400 }
      )
    }

    // Validation de la taille (10MB max)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'Fichier trop volumineux (Max 10MB)' },
        { status: 400 }
      )
    }

    const bytes = await file.arrayBuffer()
    let buffer = Buffer.from(bytes)
    let contentType = file.type
    let fileExt = path.extname(file.name).toLowerCase()
    let originalName = path.basename(file.name, fileExt).replace(/[^a-zA-Z0-9.-]/g, '_')

    // Convertir en WebP si ce n'est pas un SVG (conserve la transparence pour les PNGs)
    if (file.type !== 'image/svg+xml') {
      try {
        buffer = await sharp(buffer)
          .webp({ quality: 90, alphaQuality: 100 })
          .toBuffer()
        contentType = 'image/webp'
        fileExt = '.webp'
      } catch (err) {
        uploadLogger.warn('Erreur lors de la conversion sharp en WebP, utilisation du buffer d\'origine', err)
      }
    }

    let url = ''
    const fileName = `logo-${Date.now()}-${originalName}${fileExt}`

    // Upload vers Vercel Blob si configuré
    if (process.env.BLOB_READ_WRITE_TOKEN) {
      try {
        const blob = await put(fileName, buffer, {
          access: 'public',
          contentType,
        })
        url = blob.url
      } catch (err) {
        uploadLogger.error('Erreur stockage Blob, tentative de fallback local', err)
      }
    }

    // Fallback local si Blob non configuré ou ayant échoué
    if (!url) {
      const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'logos')
      await mkdir(uploadDir, { recursive: true })
      const filePath = path.join(uploadDir, fileName)

      await writeFile(filePath, buffer)
      url = `/uploads/logos/${fileName}`
      uploadLogger.info(`Logo sauvegardé localement sous : ${url}`)
    }

    return NextResponse.json({ url })
  } catch (error) {
    uploadLogger.error('Erreur upload', error)
    const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue'
    return NextResponse.json(
      { error: `Erreur lors de l'upload: ${errorMessage}` },
      { status: 500 }
    )
  }
}
