import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { markdownSanitized } from '@/lib/sanitize'
import { formatLongDateFr } from '@/lib/date'
import ShareButtons from './ShareButtons'
import type { Metadata } from 'next'

export const dynamic = 'force-dynamic'

type Props = {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const actualite = await prisma.actualite.findUnique({
    where: { slug, publie: true },
  })

  if (!actualite) {
    return { title: 'Actualité non trouvée' }
  }

  return {
    title: actualite.titre,
    description: actualite.excerpt || undefined,
    openGraph: {
      title: actualite.titre,
      description: actualite.excerpt || undefined,
      images: actualite.image ? [actualite.image] : [],
    },
  }
}

async function getActualite(slug: string) {
  return await prisma.actualite.findUnique({
    where: { slug, publie: true },
  })
}

async function getOtherActualites(currentId: string) {
  return await prisma.actualite.findMany({
    where: {
      publie: true,
      id: { not: currentId },
    },
    orderBy: { datePubli: 'desc' },
    take: 3,
    select: {
      id: true,
      titre: true,
      slug: true,
      datePubli: true,
    },
  })
}

export default async function ActualiteDetailPage({ params }: Props) {
  const { slug } = await params
  const actualite = await getActualite(slug)

  if (!actualite) {
    notFound()
  }

  const related = await getOtherActualites(actualite.id)

  return (
    <main className="min-h-screen pt-40 pb-20 bg-gray-50">
      <article className="container mx-auto px-4 max-w-5xl">
        <Link href="/actualites" className="inline-flex items-center text-primary hover:underline mb-8 font-semibold">
          ← Retour aux actualités
        </Link>

        <div className="card overflow-hidden mb-8 bg-white/90 shadow-lg">
          {actualite.image && (
            <div className="relative h-96 w-full">
              <Image
                src={actualite.image}
                alt={actualite.titre}
                fill
                className="object-cover"
                priority
                unoptimized={actualite.image.includes('blob.vercel-storage.com') || actualite.image.startsWith('/uploads/')}
              />
            </div>
          )}

          <div className="p-8 md:p-10">
            <p className="text-primary font-semibold mb-2">{formatLongDateFr(actualite.datePubli)}</p>
            <h1 className="text-4xl md:text-5xl font-bold mb-3 text-gray-800">{actualite.titre}</h1>
            {actualite.auteur && <p className="text-gray-500 mb-4">Par {actualite.auteur}</p>}

            {/* Boutons de partage */}
            <ShareButtons title={actualite.titre} />

            <div
              className="prose prose-lg max-w-none mt-6 text-gray-700 leading-relaxed"
              dangerouslySetInnerHTML={{ __html: markdownSanitized(actualite.contenu) }}
            />
          </div>
        </div>


        {related.length > 0 && (
          <section>
            <h2 className="text-2xl font-bold mb-4">À lire aussi</h2>
            <div className="grid md:grid-cols-3 gap-4">
              {related.map((item) => (
                <Link key={item.id} href={`/actualites/${item.slug}`} className="card p-5 hover:shadow-lg transition-shadow">
                  <p className="text-xs text-primary font-semibold mb-2">{formatLongDateFr(item.datePubli)}</p>
                  <p className="font-semibold text-gray-800">{item.titre}</p>
                </Link>
              ))}
            </div>
          </section>
        )}
      </article>
    </main>
  )
}
