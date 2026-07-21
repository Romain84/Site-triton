import { NextRequest, NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/auth/session'
import { put } from '@vercel/blob'
import { logger } from '@/lib/logger'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'
import sharp from 'sharp'
import { logAdminAudit } from '@/lib/admin-audit'

const uploadLogger = logger.withContext('Upload')

export async function POST(request: NextRequest) {
  let session: any = null
  let file: File | null = null
  try {
    session = await getAdminSession()
    if (!session) {
      logAdminAudit({
        action: 'upload.logo.error',
        actorId: 'anonymous',
        actorRole: 'unauthenticated',
        targetType: 'logos',
        details: { error: 'Non authentifié' },
      })
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const formData = await request.formData()
    file = formData.get('file') as File

    if (!file) {
      logAdminAudit({
        action: 'upload.logo.error',
        actorId: session.user.id,
        actorRole: session.user.role,
        targetType: 'logos',
        details: { error: 'Aucun fichier fourni' },
      })
      return NextResponse.json({ error: 'Aucun fichier fourni' }, { status: 400 })
    }

    const fileExtLower = path.extname(file.name).toLowerCase()
    const validExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.svg', '.bmp', '.heic', '.avif']
    const isImageMime = file.type ? file.type.startsWith('image/') : false
    const isImageExt = validExtensions.includes(fileExtLower)

    // Validation du type flexible
    if (!isImageMime && !isImageExt) {
      logAdminAudit({
        action: 'upload.logo.error',
        actorId: session.user.id,
        actorRole: session.user.role,
        targetType: 'logos',
        details: { fileName: file.name, size: file.size, mimeType: file.type, error: `Format non supporté: ${file.type || fileExtLower}` },
      })
      return NextResponse.json(
        { error: `Format de logo non supporté (${file.type || fileExtLower})` },
        { status: 400 }
      )
    }

    // Validation de la taille (10MB max)
    if (file.size > 10 * 1024 * 1024) {
      logAdminAudit({
        action: 'upload.logo.error',
        actorId: session.user.id,
        actorRole: session.user.role,
        targetType: 'logos',
        details: { fileName: file.name, size: file.size, error: 'Fichier trop volumineux (Max 10MB)' },
      })
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

    logAdminAudit({
      action: 'upload.logo.success',
      actorId: session.user.id,
      actorRole: session.user.role,
      targetType: 'logos',
      details: { url, fileName: file.name, size: file.size, convertedToWebp: fileExt === '.webp' },
    })

    return NextResponse.json({ url })
  } catch (error) {
    uploadLogger.error('Erreur upload', error)
    const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue'
    if (session?.user) {
      logAdminAudit({
        action: 'upload.logo.error',
        actorId: session.user.id,
        actorRole: session.user.role,
        targetType: 'logos',
        details: { error: errorMessage },
      })
    }
    return NextResponse.json(
      { error: `Erreur lors de l'upload: ${errorMessage}` },
      { status: 500 }
    )
  }
}
