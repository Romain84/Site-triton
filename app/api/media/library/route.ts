import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'

const apiLogger = logger.withContext('MediaLibrary')

// Retourne les albums actifs et leurs médias (images & vidéos) ainsi que la liste plate de secours.
export async function GET() {
  try {
    const albums = await prisma.galerieAlbum.findMany({
      where: { actif: true },
      include: {
        medias: {
          where: { actif: true },
          orderBy: { ordre: 'asc' },
        },
      },
      orderBy: { ordre: 'asc' },
    })

    // Liste plate de toutes les images pour compatibilité ascendante
    const flatMedias = albums.flatMap((album) =>
      album.medias
        .filter((media) => media.type === 'image')
        .map((media) => ({
          id: media.id,
          titre: media.titre,
          image: media.url,
          updatedAt: media.updatedAt,
          source: 'galerie' as const,
        }))
    )

    return NextResponse.json({
      actualites: [],
      evenements: [],
      galerie: flatMedias,
      albums: albums.map((album) => ({
        id: album.id,
        nom: album.nom,
        slug: album.slug,
        description: album.description,
        categorie: album.categorie,
        couverture: album.couverture,
        medias: album.medias.map((media) => ({
          id: media.id,
          titre: media.titre,
          description: media.description,
          url: media.url,
          type: media.type,
          ordre: media.ordre,
          updatedAt: media.updatedAt,
        })),
      })),
    })
  } catch (error) {
    apiLogger.error('Erreur lors du chargement de la médiathèque publique', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}


