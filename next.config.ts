import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  poweredByHeader: false,
  serverExternalPackages: ['pdf-parse'],
  images: {
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.public.blob.vercel-storage.com',
      },
      {
        protocol: 'https',
        hostname: '**.blob.vercel-storage.com',
      },
    ],
  },
  experimental: {
    optimizePackageImports: [
      '@/components',
      'lucide-react',
      'recharts',
      'framer-motion',
      'react-hot-toast',
      '@tanstack/react-query',
    ],
  },
  redirects: async () => [
    // Redirections 301 des anciennes URLs WordPress indexées par Google
    {
      source: '/index.php/inscriptions-:slug',
      destination: '/inscription',
      permanent: true,
    },
    {
      source: '/index.php/ses-entraineurs',
      destination: '/le-club',
      permanent: true,
    },
    {
      source: '/index.php/ses-entraineurs/',
      destination: '/le-club',
      permanent: true,
    },
    {
      source: '/index.php/sa-boutique',
      destination: '/boutique',
      permanent: true,
    },
    {
      source: '/index.php/sa-boutique/',
      destination: '/boutique',
      permanent: true,
    },
    {
      source: '/index.php/le-club',
      destination: '/le-club',
      permanent: true,
    },
    {
      source: '/index.php/le-club/',
      destination: '/le-club',
      permanent: true,
    },
    {
      source: '/index.php/accueil',
      destination: '/',
      permanent: true,
    },
    {
      source: '/index.php/accueil/',
      destination: '/',
      permanent: true,
    },
    {
      source: '/index.php/partenaires',
      destination: '/le-club',
      permanent: true,
    },
    {
      source: '/index.php/partenaires/',
      destination: '/le-club',
      permanent: true,
    },
    {
      source: '/index.php/tutoriel-pour-sinscrire-:slug',
      destination: '/inscription',
      permanent: true,
    },
    {
      source: '/index.php/planning-:slug',
      destination: '/planning',
      permanent: true,
    },
    {
      source: '/index.php/category/:slug*',
      destination: '/actualites',
      permanent: true,
    },
    {
      source: '/index.php/:path*',
      destination: '/',
      permanent: true,
    },
  ],
  headers: async () => [
    {
      source: '/:path*',
      headers: [
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'X-Frame-Options', value: 'DENY' },
        { key: 'X-XSS-Protection', value: '1; mode=block' },
        { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      ],
    },
    // Mise en cache navigateur optimisée pour les médias publics (30 jours)
    {
      source: '/uploads/:folder(actualites|coaches|logos|galerie|documents)/:path*',
      headers: [
        {
          key: 'Cache-Control',
          value: 'public, max-age=2592000, stale-while-revalidate=86400',
        },
      ],
    },
    // Interdiction stricte de mise en cache pour les documents sensibles téléversés
    {
      source: '/uploads/:folder(recus|factures)/:path*',
      headers: [
        {
          key: 'Cache-Control',
          value: 'private, no-cache, no-store, must-revalidate',
        },
        {
          key: 'Pragma',
          value: 'no-cache',
        },
      ],
    },
  ],
}

export default nextConfig
