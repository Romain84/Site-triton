import { NextRequest, NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/auth/session'
import { put } from '@vercel/blob'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'
import crypto from 'crypto'
import sharp from 'sharp'
import { logger } from '@/lib/logger'
import { logAdminAudit } from '@/lib/admin-audit'

const uploadLogger = logger.withContext('Upload')

export async function POST(request: NextRequest) {
  let session: any = null
  let file: File | null = null
  try {
    session = await getAdminSession()
    if (!session) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const formData = await request.formData()
    file = formData.get('file') as File

    if (!file) {
      logAdminAudit({
        action: 'upload.image.error',
        actorId: session.user.id,
        actorRole: session.user.role,
        targetType: 'actualites',
        details: { error: 'Aucun fichier fourni' },
      })
      return NextResponse.json({ error: 'Aucun fichier fourni' }, { status: 400 })
    }

    // Validation du type
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
    if (!validTypes.includes(file.type)) {
      logAdminAudit({
        action: 'upload.image.error',
        actorId: session.user.id,
        actorRole: session.user.role,
        targetType: 'actualites',
        details: { fileName: file.name, size: file.size, error: `Format non supporté: ${file.type}` },
      })
      return NextResponse.json(
        { error: 'Format non supporté (JPG, PNG, WEBP, GIF)' },
        { status: 400 }
      )
    }

    // Validation de la taille (15MB max)
    if (file.size > 15 * 1024 * 1024) {
      uploadLogger.warn(`Upload refusé : fichier trop volumineux (${(file.size / 1024 / 1024).toFixed(2)}MB > 15MB)`)
      logAdminAudit({
        action: 'upload.image.error',
        actorId: session.user.id,
        actorRole: session.user.role,
        targetType: 'actualites',
        details: { fileName: file.name, size: file.size, error: 'Fichier trop volumineux (Max 15MB)' },
      })
      return NextResponse.json(
        { error: 'Fichier trop volumineux (Max 15MB)' },
        { status: 400 }
      )
    }

    const bytes = await file.arrayBuffer()
    let buffer = Buffer.from(bytes)
    let fileExt = '.webp'
    let contentType = 'image/webp'

    try {
      buffer = await sharp(buffer)
        .webp({ quality: 88, alphaQuality: 100 })
        .toBuffer()
    } catch (err) {
      uploadLogger.warn('Erreur lors de la conversion sharp en WebP, conservation de l\'extension d\'origine', err)
      fileExt = path.extname(file.name).toLowerCase() || '.png'
      contentType = file.type
    }

    const safeFileName = `${crypto.randomUUID()}${fileExt}`
    let url = ''

    // Upload vers Vercel Blob si configuré
    if (process.env.BLOB_READ_WRITE_TOKEN) {
      try {
        const blob = await put(`actualites/${safeFileName}`, buffer, {
          access: 'public',
          contentType,
        })
        url = blob.url
        uploadLogger.info(`Image d'actualité sauvegardée sur Vercel Blob : ${url}`)
      } catch (err) {
        uploadLogger.error('Erreur stockage Blob, tentative de fallback local', err)
      }
    }

    // Fallback local si Blob non configuré ou ayant échoué
    if (!url) {
      const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'actualites')
      await mkdir(uploadDir, { recursive: true })

      const filePath = path.join(uploadDir, safeFileName)
      await writeFile(filePath, buffer)
      url = `/uploads/actualites/${safeFileName}`
      uploadLogger.info(`Image d'actualité enregistrée localement sous : ${url}`)
    }

    logAdminAudit({
      action: 'upload.image.success',
      actorId: session.user.id,
      actorRole: session.user.role,
      targetType: 'actualites',
      details: { url, fileName: file.name, size: file.size, convertedToWebp: fileExt === '.webp' },
    })

    return NextResponse.json({
      url,
    })
  } catch (error) {
    uploadLogger.error('Erreur upload image', error)
    const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue'
    if (session?.user) {
      logAdminAudit({
        action: 'upload.image.error',
        actorId: session.user.id,
        actorRole: session.user.role,
        targetType: 'actualites',
        details: { error: errorMessage },
      })
    }
    return NextResponse.json(
      { error: `Erreur lors de l'upload: ${errorMessage}` },
      { status: 500 }
    )
  }
}
