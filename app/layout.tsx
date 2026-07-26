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
  '@type': 'SportsClub',
  name: 'Triton Club Cavaillon',
  url: 'https://tritoncavaillon.fr',
  logo: 'https://tritoncavaillon.fr/images/logo.png',
  image: 'https://tritoncavaillon.fr/images/logo.png',
  description: 'Club de natation à Cavaillon (84). Natation compétition FFN, loisir, artistique, aquagym.',
  address: {
    '@type': 'PostalAddress',
    addressLocality: 'Cavaillon',
    postalCode: '84300',
    addressCountry: 'FR',
  },
}

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
          <Header />
          {children}
          <Footer />
        </AppProviders>
      </body>
    </html>
  )
}
