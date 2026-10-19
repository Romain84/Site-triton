import { NextRequest, NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/auth/session'
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
        actorId: session.userId,
        actorRole: session.role,
        targetType: 'logos',
        details: { error: 'Aucun fichier fourni' },
      })
      return NextResponse.json({ error: 'Aucun fichier fourni' }, { status: 400 })
    }

    const fileExtLower = path.extname(file.name).toLowerCase()
    const validExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.bmp', '.heic', '.avif']
    const isImageMime = file.type ? file.type.startsWith('image/') && file.type !== 'image/svg+xml' : false
    const isImageExt = validExtensions.includes(fileExtLower)

    // Validation stricte du type (les SVGs sont exclus pour prévenir les attaques XSS stocké)
    if (!isImageMime || !isImageExt) {
      logAdminAudit({
        action: 'upload.logo.error',
        actorId: session.userId,
        actorRole: session.role,
        targetType: 'logos',
        details: { fileName: file.name, size: file.size, mimeType: file.type, error: `Format non supporté: ${file.type || fileExtLower}` },
      })
      return NextResponse.json(
        { error: `Format de logo non supporté (${file.type || fileExtLower}). Les formats autorisés sont JPG, PNG, WebP, GIF, AVIF.` },
        { status: 400 }
      )
    }

    // Validation de la taille (10MB max)
    if (file.size > 10 * 1024 * 1024) {
      logAdminAudit({
        action: 'upload.logo.error',
        actorId: session.userId,
        actorRole: session.role,
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
    const rawExt = path.extname(file.name).toLowerCase()
    const originalName = path.basename(file.name, rawExt).replace(/[^a-zA-Z0-9.-]/g, '_')
    const fileExt = '.webp'

    // Convertir en WebP (conserve la transparence pour les logos PNG)
    try {
      buffer = await sharp(buffer)
        .webp({ quality: 90, alphaQuality: 100 })
        .toBuffer()
    } catch (err) {
      uploadLogger.warn('Fichier logo invalide ou non décodable par sharp', err)
      return NextResponse.json(
        { error: 'Le fichier fourni n\'est pas une image valide ou est corrompu.' },
        { status: 400 }
      )
    }

    const fileName = `logo-${Date.now()}-${originalName}${fileExt}`

    // Sauvegarde locale persistante dans /public/uploads/logos
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'logos')
    await mkdir(uploadDir, { recursive: true })
    const filePath = path.join(uploadDir, fileName)

    await writeFile(filePath, buffer)
    const url = `/uploads/logos/${fileName}`
    uploadLogger.info(`Logo sauvegardé localement sous : ${url}`)

    logAdminAudit({
      action: 'upload.logo.success',
      actorId: session.userId,
      actorRole: session.role,
      targetType: 'logos',
      details: { url, fileName: file.name, size: file.size, convertedToWebp: fileExt === '.webp' },
    })

    return NextResponse.json({ url })
  } catch (error) {
    uploadLogger.error('Erreur upload', error)
    const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue'
    if (session?.userId) {
      logAdminAudit({
        action: 'upload.logo.error',
        actorId: session.userId,
        actorRole: session.role,
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
