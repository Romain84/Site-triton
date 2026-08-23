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

const jsonLd = [
  {
    '@context': 'https://schema.org',
    '@type': ['SportsClub', 'SportsActivityLocation'],
    name: 'Triton Club Cavaillon',
    alternateName: ['TRITON CLUB CAVAILLON', 'Triton Club Natation', 'AquaGym Cavaillon - Triton Club'],
    url: 'https://tritoncavaillon.fr',
    logo: 'https://tritoncavaillon.fr/images/logo.png',
    image: [
      'https://tritoncavaillon.fr/images/logo.png',
      'https://tritoncavaillon.fr/images/hero-background.JPG',
    ],
    description: 'Club de natation affilié FFN à Cavaillon (84). Cours d\'AquaGym, AquaFitness, école de natation dès 6 ans, natation compétition FFN, loisirs adultes et sauvetage SSA à la piscine Alphonse Roudière.',
    address: {
      '@type': 'PostalAddress',
      streetAddress: 'Piscine Alphonse Roudière, Avenue Jean Moulin, Quartier La Clède',
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
      name: 'Activités, Cours de Natation et AquaGym',
      itemListElement: [
        {
          '@type': 'Offer',
          itemOffered: {
            '@type': 'Service',
            name: 'AquaGym & AquaFitness Cavaillon',
            description: 'Cours de gymnastique aquatique et aquafitness en musique. Renforcement musculaire complet et cardio sans impact articulaire à la piscine de Cavaillon.',
          },
        },
        {
          '@type': 'Offer',
          itemOffered: {
            '@type': 'Service',
            name: 'École de Natation & Avenirs (dès 6 ans)',
            description: 'Apprentissage de la natation et perfectionnement pour enfants.',
          },
        },
        {
          '@type': 'Offer',
          itemOffered: {
            '@type': 'Service',
            name: 'Natation Compétition FFN (Benjamins, Juniors, Adultes)',
            description: 'Filière compétition fédérale FFN et préparation sportive.',
          },
        },
        {
          '@type': 'Offer',
          itemOffered: {
            '@type': 'Service',
            name: 'Natation Adultes Loisirs & Maîtres',
            description: 'Perfectionnement technique, endurance et nage libre encadrée.',
          },
        },
        {
          '@type': 'Offer',
          itemOffered: {
            '@type': 'Service',
            name: 'Formation SSA – Surveillant Sauveteur Aquatique (ex-BNSSA)',
            description: 'Formation diplômante d\'État au sauvetage aquatique et secourisme PSE1/PSE2.',
          },
        },
      ],
    },
  },
  {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: 'Où pratiquer l\'AquaGym et l\'AquaFitness à Cavaillon (84) ?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Les séances d\'AquaGym et AquaFitness sont dispensées par le Triton Club Cavaillon à la piscine municipale couverte Alphonse Roudière (Avenue Jean Moulin, 84300 Cavaillon) avec des éducateurs sportifs qualifiés.',
        },
      },
      {
        '@type': 'Question',
        name: 'Quels sont les horaires des cours d\'AquaFitness à Cavaillon ?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Les cours d\'AquaFitness ont lieu les mardis soirs de 19h15 à 20h00 et les jeudis soirs de 19h15 à 20h00.',
        },
      },
      {
        '@type': 'Question',
        name: 'Quels sont les tarifs de l\'AquaGym / AquaFitness au Triton Club Cavaillon ?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'L\'adhésion annuelle est de 220 € pour 1 cours par semaine ou 370 € pour 2 cours par semaine (licence FFN incluse). Le club propose le paiement en ligne en 1 fois ou 3 fois sans frais.',
        },
      },
      {
        '@type': 'Question',
        name: 'Quels sont les bienfaits des cours d\'AquaFitness / gymnastique aquatique ?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'L\'AquaFitness permet un renforcement musculaire harmonieux de tout le corps et un travail cardio-vasculaire dynamique en musique, sans aucun choc sur les articulations ni courbatures grâce à la résistance naturelle de l\'eau.',
        },
      },
    ],
  },
]

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
        <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
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
