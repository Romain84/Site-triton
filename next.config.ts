import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
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
      source: '/index.php/inscriptions-:slug*',
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
      source: '/index.php/tutoriel-pour-sinscrire-:slug*',
      destination: '/inscription',
      permanent: true,
    },
    {
      source: '/index.php/planning-:slug*',
      destination: '/planning',
      permanent: true,
    },
    {
      source: '/index.php/category/:slug*',
      destination: '/actualites',
      permanent: true,
    },
    {
      source: '/index.php/:year(\\d{4})/:month(\\d{2})/:day(\\d{2})/:slug*',
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
  ],
}

export default nextConfig
