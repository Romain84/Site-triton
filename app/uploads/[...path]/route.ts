import { NextRequest, NextResponse } from 'next/server'
import { readFile } from 'fs/promises'
import path from 'path'

function getMimeType(filename: string): string {
  const ext = path.extname(filename).toLowerCase()
  switch (ext) {
    case '.jpg':
    case '.jpeg':
      return 'image/jpeg'
    case '.png':
      return 'image/png'
    case '.gif':
      return 'image/gif'
    case '.webp':
      return 'image/webp'
    case '.mp4':
      return 'video/mp4'
    case '.webm':
      return 'video/webm'
    default:
      return 'application/octet-stream'
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const { path: pathSegments } = await params
    
    // Reconstruire le chemin absolu sur le disque
    const filePath = path.join(process.cwd(), 'public', 'uploads', ...pathSegments)
    const resolvedPath = path.resolve(filePath)
    const uploadDir = path.resolve(path.join(process.cwd(), 'public', 'uploads'))

    // Sécurité anti-traversée de répertoire
    if (!resolvedPath.startsWith(uploadDir)) {
      return new NextResponse('Accès interdit', { status: 403 })
    }

    const fileBuffer = await readFile(resolvedPath)
    const mimeType = getMimeType(resolvedPath)

    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': mimeType,
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    })
  } catch (error) {
    return new NextResponse('Fichier non trouvé', { status: 404 })
  }
}
