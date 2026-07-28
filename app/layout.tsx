import type { Metadata } from 'next'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import AppProviders from '@/components/AppProviders'
import { Plus_Jakarta_Sans, Outfit } from 'next/font/google'
import { defaultMetadata } from '@/lib/metadata'
import './globals.css'

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
})

const outfit = Outfit({
  subsets: ['latin'],
  variable: '--font-display',
  display: 'swap',
})

export const metadata: Metadata = defaultMetadata

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': ['SportsClub', 'SportsActivityLocation'],
  name: 'Triton Club Cavaillon',
  alternateName: ['TRITON CLUB CAVAILLON', 'Triton Club Natation'],
  url: 'https://tritoncavaillon.fr',
  logo: 'https://tritoncavaillon.fr/images/logo.png',
  image: [
    'https://tritoncavaillon.fr/images/logo.png',
    'https://tritoncavaillon.fr/images/hero-background.JPG',
  ],
  description: 'Club de natation affilié FFN à Cavaillon (84). Natation compétition, école de natation, loisirs, natation artistique, aquagym et BNSSA pour tous les âges.',
  address: {
    '@type': 'PostalAddress',
    streetAddress: 'Piscine Alphonse Maureau, Avenue Raoul Follereau',
    addressLocality: 'Cavaillon',
    postalCode: '84300',
    addressRegion: 'Vaucluse',
    addressCountry: 'FR',
  },
  geo: {
    '@type': 'GeoCoordinates',
    latitude: 43.8344,
    longitude: 5.0381,
  },
  telephone: '+33 4 90 71 00 00',
  priceRange: '€€',
  sameAs: [
    'https://www.ffnatation.fr',
    'https://tritonapp.fr',
  ],
  offerCatalog: {
    '@type': 'OfferCatalog',
    name: 'Activités et Cours de Natation',
    itemListElement: [
      {
        '@type': 'Offer',
        itemOffered: {
          '@type': 'Service',
          name: 'École de Natation & Avenirs (Enfants)',
        },
      },
      {
        '@type': 'Offer',
        itemOffered: {
          '@type': 'Service',
          name: 'Natation Compétition FFN (Benjamins, Juniors, Seniors)',
        },
      },
      {
        '@type': 'Offer',
        itemOffered: {
          '@type': 'Service',
          name: 'Natation Maîtres & Adultes',
        },
      },
      {
        '@type': 'Offer',
        itemOffered: {
          '@type': 'Service',
          name: 'Aquagym & Forme',
        },
      },
      {
        '@type': 'Offer',
        itemOffered: {
          '@type': 'Service',
          name: 'Natation Artistique',
        },
      },
    ],
  },
}

import VisitorTracker from '@/components/VisitorTracker'

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="fr" className={`${plusJakarta.variable} ${outfit.variable}`}>
      <head>
        <link rel="icon" href="/images/logo.png" type="image/png" />
        <link rel="shortcut icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" href="/images/logo.png" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className="font-sans antialiased">
        <AppProviders>
          <VisitorTracker />
          <Header />
          {children}
          <Footer />
        </AppProviders>
      </body>
    </html>
  )
}
