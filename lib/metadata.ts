import { Metadata } from 'next'

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://tritoncavaillon.fr'

export const defaultMetadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: 'Triton Club Cavaillon - Club de natation',
    template: '%s | Triton Club Cavaillon',
  },
  description:
    'Club de natation à Cavaillon (84). Natation compétition FFN, loisir, artistique et aquagym pour tous les âges. Inscriptions ouvertes.',
  alternates: {
    canonical: siteUrl,
  },
  keywords: [
    'Triton Club Cavaillon',
    'natation Cavaillon',
    'club de natation Cavaillon',
    'piscine Cavaillon',
    'cours de natation Cavaillon',
    'école de natation Cavaillon',
    'compétition natation FFN',
    'natation artistique Cavaillon',
    'aquagym Cavaillon',
    'BNSSA Cavaillon',
    'FFN Vaucluse',
    'club natation 84300',
    'natation enfants Cavaillon',
    'natation adultes Cavaillon',
    'piscine Alphonse Maureau',
    'Luberon natation',
  ],
  authors: [{ name: 'Triton Club Cavaillon' }],
  creator: 'Triton Club Cavaillon',
  publisher: 'Triton Club Cavaillon',
  category: 'Sports & Health',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  openGraph: {
    type: 'website',
    locale: 'fr_FR',
    url: siteUrl,
    siteName: 'Triton Club Cavaillon',
    title: 'Triton Club Cavaillon - Club de natation',
    description:
      'Club de natation à Cavaillon (84). Natation compétition FFN, loisir, artistique et aquagym pour tous les âges.',
    images: [
      {
        url: '/images/hero-background.JPG',
        width: 1200,
        height: 630,
        alt: 'Triton Club Cavaillon',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Triton Club Cavaillon - Club de natation',
    description:
      'Club de natation à Cavaillon (84). Natation compétition FFN, loisir, artistique et aquagym.',
    images: ['/images/hero-background.JPG'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  icons: {
    icon: [
      { url: '/images/logo.png', type: 'image/png' },
      { url: '/favicon.ico' },
    ],
    shortcut: '/images/logo.png',
    apple: [
      { url: '/apple-touch-icon.png' },
      { url: '/images/logo.png' },
    ],
  },
  manifest: '/manifest.json',
  other: {
    'geo.region': 'FR-84',
    'geo.placename': 'Cavaillon',
    'geo.position': '43.8344;5.0381',
    'ICBM': '43.8344, 5.0381',
  },
  verification: {
    google: 'your-google-verification-code', // À remplacer par le vrai code
  },
}

export function generatePageMetadata({
  title,
  description,
  path = '',
  image,
}: {
  title: string
  description: string
  path?: string
  image?: string
}): Metadata {
  const url = `https://tritoncavaillon.fr${path}`
  const imageUrl = image || '/images/hero-background.JPG'

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url,
      images: [
        {
          url: imageUrl,
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [imageUrl],
    },
    alternates: {
      canonical: url,
    },
  }
}
