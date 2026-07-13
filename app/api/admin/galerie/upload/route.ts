import { NextRequest, NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/auth/session'
import { writeFile, mkdir } from 'fs/promises'
import crypto from 'crypto'
import path from 'path'
import { logger } from '@/lib/logger'

const uploadLogger = logger.withContext('Upload')

// Magic bytes for file type validation
const FILE_SIGNATURES: Record<string, number[][]> = {
  'image/jpeg': [[0xFF, 0xD8, 0xFF]],
  'image/png': [[0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]],
  'image/gif': [[0x47, 0x49, 0x46, 0x38, 0x37, 0x61], [0x47, 0x49, 0x46, 0x38, 0x39, 0x61]],
  'image/webp': [[0x52, 0x49, 0x46, 0x46]], // RIFF header, followed by WEBP
  'video/mp4': [[0x00, 0x00, 0x00], [0x66, 0x74, 0x79, 0x70]], // ftyp
  'video/webm': [[0x1A, 0x45, 0xDF, 0xA3]],
}

const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.mp4', '.webm']

function validateFileSignature(buffer: Buffer, mimeType: string): boolean {
  const signatures = FILE_SIGNATURES[mimeType]
  if (!signatures) return false

  for (const signature of signatures) {
    let matches = true
    for (let i = 0; i < signature.length; i++) {
      if (buffer[i] !== signature[i]) {
        matches = false
        break
      }
    }
    if (matches) return true
  }
  return false
}

export async function POST(request: NextRequest) {
  try {
    // Vérifier l'authentification
    const session = await getAdminSession()
    if (!session) {
      return NextResponse.json(
        { error: 'Non authentifié' },
        { status: 401 }
      )
    }

    // Récupérer le fichier
    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json(
        { error: 'Aucun fichier fourni' },
        { status: 400 }
      )
    }

    // Vérifier le type MIME
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'video/mp4', 'video/webm']
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Type de fichier non autorisé. Utilisez JPG, PNG, GIF, WebP, MP4 ou WebM' },
        { status: 400 }
      )
    }

    // Vérifier l'extension du fichier
    const fileExt = path.extname(file.name).toLowerCase()
    if (!ALLOWED_EXTENSIONS.includes(fileExt)) {
      return NextResponse.json(
        { error: 'Extension de fichier non autorisée' },
        { status: 400 }
      )
    }

    // Vérifier la taille (max 10MB)
    const maxSize = 10 * 1024 * 1024 // 10MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'Fichier trop volumineux. Maximum 10MB' },
        { status: 400 }
      )
    }

    // Convertir le fichier en buffer
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    // Valider les magic bytes du fichier (sécurité contre MIME type spoofing)
    if (!validateFileSignature(buffer, file.type)) {
      return NextResponse.json(
        { error: 'Le contenu du fichier ne correspond pas au type déclaré' },
        { status: 400 }
      )
    }

    // Générer un nom de fichier sécurisé
    const safeFileName = `${crypto.randomUUID()}${fileExt}`

    // Créer le dossier s'il n'existe pas
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'galerie')
    await mkdir(uploadDir, { recursive: true })

    // Enregistrer le fichier sur le disque local
    const filePath = path.join(uploadDir, safeFileName)
    await writeFile(filePath, buffer)

    // Retourner le chemin public du fichier local
    const publicPath = `/uploads/galerie/${safeFileName}`

    return NextResponse.json({
      url: publicPath,
      type: file.type.startsWith('image/') ? 'image' : 'video',
    })
  } catch (error) {
    uploadLogger.error('Erreur upload', error)
    return NextResponse.json(
      { error: 'Erreur lors de l\'upload local' },
      { status: 500 }
    )
  }
}
