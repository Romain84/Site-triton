import { NextRequest, NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/auth/session'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'
import { logger } from '@/lib/logger'

const uploadLogger = logger.withContext('Upload')

export async function POST(request: NextRequest) {
  try {
    const session = await getAdminSession()
    if (!session) {
      return NextResponse.json(
        { error: 'Non authentifié' },
        { status: 401 }
      )
    }

    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json(
        { error: 'Aucun fichier fourni' },
        { status: 400 }
      )
    }

    // Vérifier que c'est un PDF
    if (file.type !== 'application/pdf') {
      return NextResponse.json(
        { error: 'Seulement les fichiers PDF sont autorisés' },
        { status: 400 }
      )
    }

    // Vérifier la taille (max 5MB)
    const maxSize = 5 * 1024 * 1024
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'Fichier trop volumineux. Maximum 5MB' },
        { status: 400 }
      )
    }

    // Générer un nom de fichier unique
    const timestamp = Date.now()
    const originalName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_')
    const fileName = `${timestamp}-${originalName}`

    // Créer le dossier s'il n'existe pas
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'reglements')
    await mkdir(uploadDir, { recursive: true })

    const filePath = path.join(uploadDir, fileName)

    // Convertir le fichier en buffer et l'enregistrer
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    await writeFile(filePath, buffer)

    // Retourner le chemin public du fichier
    const publicPath = `/uploads/reglements/${fileName}`

    return NextResponse.json({
      path: publicPath,
      fileName: originalName,
    })
  } catch (error) {
    uploadLogger.error('Erreur upload PDF', error)
    return NextResponse.json(
      { error: 'Erreur lors de l\'upload' },
      { status: 500 }
    )
  }
}
