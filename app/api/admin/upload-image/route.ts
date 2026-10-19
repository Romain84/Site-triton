import { NextRequest, NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/auth/session'
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
      logAdminAudit({
        action: 'upload.image.error',
        actorId: 'anonymous',
        actorRole: 'unauthenticated',
        targetType: 'actualites',
        details: { error: 'Non authentifié' },
      })
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const formData = await request.formData()
    file = formData.get('file') as File

    if (!file) {
      logAdminAudit({
        action: 'upload.image.error',
        actorId: session.userId,
        actorRole: session.role,
        targetType: 'actualites',
        details: { error: 'Aucun fichier fourni' },
      })
      return NextResponse.json({ error: 'Aucun fichier fourni' }, { status: 400 })
    }

    const fileExtLower = path.extname(file.name).toLowerCase()
    // Sécurité: interdire le format SVG pour prévenir les attaques XSS stockées
    const validExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.heic', '.heif', '.bmp', '.tiff', '.avif']
    const isImageMime = file.type ? file.type.startsWith('image/') && file.type !== 'image/svg+xml' : false
    const isImageExt = validExtensions.includes(fileExtLower)

    // Validation stricte du type (MIME et extension requis)
    if (!isImageMime || !isImageExt) {
      logAdminAudit({
        action: 'upload.image.error',
        actorId: session.userId,
        actorRole: session.role,
        targetType: 'actualites',
        details: { fileName: file.name, size: file.size, mimeType: file.type, error: `Format non supporté: ${file.type || fileExtLower}` },
      })
      return NextResponse.json(
        { error: `Format d'image non supporté (${file.type || fileExtLower}). Les formats autorisés sont JPG, PNG, WEBP, GIF, AVIF.` },
        { status: 400 }
      )
    }

    // Validation de la taille (15MB max)
    if (file.size > 15 * 1024 * 1024) {
      uploadLogger.warn(`Upload refusé : fichier trop volumineux (${(file.size / 1024 / 1024).toFixed(2)}MB > 15MB)`)
      logAdminAudit({
        action: 'upload.image.error',
        actorId: session.userId,
        actorRole: session.role,
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
    const fileExt = '.webp'

    try {
      buffer = await sharp(buffer)
        .webp({ quality: 88, alphaQuality: 100 })
        .toBuffer()
    } catch (err) {
      uploadLogger.warn('Fichier image invalide ou non décodable par sharp', err)
      return NextResponse.json(
        { error: 'Le fichier fourni n\'est pas une image valide ou est corrompu.' },
        { status: 400 }
      )
    }

    const safeFileName = `${crypto.randomUUID()}${fileExt}`
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'actualites')
    await mkdir(uploadDir, { recursive: true })

    const filePath = path.join(uploadDir, safeFileName)
    await writeFile(filePath, buffer)
    const url = `/uploads/actualites/${safeFileName}`
    uploadLogger.info(`Image d'actualité enregistrée localement sous : ${url}`)

    logAdminAudit({
      action: 'upload.image.success',
      actorId: session.userId,
      actorRole: session.role,
      targetType: 'actualites',
      details: { url, fileName: file.name, size: file.size, convertedToWebp: fileExt === '.webp' },
    })

    return NextResponse.json({
      url,
    })
  } catch (error) {
    uploadLogger.error('Erreur upload image', error)
    const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue'
    if (session?.userId) {
      logAdminAudit({
        action: 'upload.image.error',
        actorId: session.userId,
        actorRole: session.role,
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
