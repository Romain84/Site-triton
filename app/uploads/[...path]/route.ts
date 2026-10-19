import { NextRequest, NextResponse } from 'next/server'
import { readFile } from 'fs/promises'
import path from 'path'
import { getAdminSession, getCoachSession } from '@/lib/auth/session'
import { prisma } from '@/lib/prisma'

const SENSITIVE_FOLDERS = new Set(['recus', 'factures', 'justificatifs', 'devis'])

function getMimeType(filename: string): string {
  const ext = path.extname(filename).toLowerCase()
  switch (ext) {
    case '.pdf':
      return 'application/pdf'
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
    if (!pathSegments || pathSegments.length === 0) {
      return new NextResponse('Fichier non trouvé', { status: 404 })
    }

    // Reconstruire le chemin absolu sur le disque
    const filePath = path.join(process.cwd(), 'public', 'uploads', ...pathSegments)
    const resolvedPath = path.resolve(filePath)
    const uploadDir = path.resolve(path.join(process.cwd(), 'public', 'uploads'))

    // Sécurité anti-traversée de répertoire stricte
    if (resolvedPath !== uploadDir && !resolvedPath.startsWith(uploadDir + path.sep)) {
      return new NextResponse('Accès interdit', { status: 403 })
    }

    const topFolder = pathSegments[0]?.toLowerCase() || ''
    const isSensitive = SENSITIVE_FOLDERS.has(topFolder)

    // Défense en profondeur : vérifier l'authentification et la propriété sur les dossiers sensibles
    if (isSensitive) {
      const adminSession = await getAdminSession()
      const isAuthorizedAdmin = Boolean(adminSession && adminSession.role !== 'superviseur')

      if (!isAuthorizedAdmin) {
        if (topFolder === 'factures') {
          const coachSession = await getCoachSession()
          if (!coachSession) {
            return new NextResponse('Accès interdit - Connexion requise', { status: 401 })
          }
          // Vérifier que la facture demandée (facture-${id}.pdf) appartient bien au coach connecté (Anti-IDOR)
          const fileName = path.basename(resolvedPath)
          const match = /^facture-([a-zA-Z0-9_-]+)\.pdf$/i.exec(fileName)
          if (!match) {
            return new NextResponse('Accès interdit', { status: 403 })
          }
          const facture = await prisma.factureCoach.findUnique({
            where: { id: match[1] },
            select: { coachId: true },
          })
          if (!facture || facture.coachId !== coachSession.coachId) {
            return new NextResponse('Accès interdit', { status: 403 })
          }
        } else {
          return new NextResponse('Accès interdit - Droits administrateur requis', { status: 403 })
        }
      }
    }

    const fileBuffer = await readFile(resolvedPath)
    const mimeType = getMimeType(resolvedPath)

    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': mimeType,
        'Cache-Control': isSensitive
          ? 'private, no-store, no-cache, must-revalidate'
          : 'public, max-age=31536000, immutable',
      },
    })
  } catch (error) {
    return new NextResponse('Fichier non trouvé', { status: 404 })
  }
}
