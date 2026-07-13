import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/api/guards'
import fs from 'fs/promises'
import path from 'path'
import crypto from 'crypto'
import { logger } from '@/lib/logger'

const uploadLogger = logger.withContext('ComptabiliteUpload')

export async function POST(request: NextRequest) {
  try {
    // 1. Protection de la route (Admin requis)
    const auth = await requireAdmin()
    if (!auth.ok) {
      return auth.response
    }

    // 2. Extraire le fichier du FormData
    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json(
        { error: 'Aucun fichier fourni' },
        { status: 400 }
      )
    }

    // 3. Valider l'extension du fichier
    const originalName = file.name
    const ext = path.extname(originalName).toLowerCase()
    const allowedExtensions = ['.pdf', '.png', '.jpg', '.jpeg']

    if (!allowedExtensions.includes(ext)) {
      return NextResponse.json(
        { error: 'Format de fichier non autorisé. Formats acceptés : PDF, PNG, JPG, JPEG.' },
        { status: 400 }
      )
    }

    // 4. Lire le buffer du fichier
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    // 5. Créer le répertoire de stockage s'il n'existe pas
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'justificatifs')
    await fs.mkdir(uploadDir, { recursive: true })

    // 6. Générer un nom de fichier unique et sécurisé
    const uniqueFilename = `${crypto.randomUUID()}${ext}`
    const finalPath = path.join(uploadDir, uniqueFilename)

    // 7. Écrire le fichier sur le disque
    await fs.writeFile(finalPath, buffer)

    // 8. Retourner le chemin relatif
    const relativeUrl = `/uploads/justificatifs/${uniqueFilename}`
    uploadLogger.info(`Fichier téléversé avec succès : ${relativeUrl}`)

    return NextResponse.json({
      success: true,
      url: relativeUrl,
      filename: originalName
    })
  } catch (error) {
    uploadLogger.error('Erreur lors du téléversement du justificatif', error)
    return NextResponse.json(
      { error: 'Erreur lors du téléversement du fichier' },
      { status: 500 }
    )
  }
}
