import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { jwtVerify } from 'jose'
import { getSessionSecretKey } from './lib/auth/session-secret'
import { isSameOriginRequest } from './lib/security/origin'
import { requiresSameOriginCheck } from './lib/security/protected-api'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Anti-CSRF sur les mutations API admin/coach
  if (requiresSameOriginCheck(pathname, request.method) && !isSameOriginRequest(request)) {
    return NextResponse.json(
      {
        success: false,
        code: 'FORBIDDEN_ORIGIN',
        error: 'Origine non autorisée',
      },
      { status: 403 }
    )
  }

  // Ajout d'en-têtes de sécurité sur toutes les réponses.
  const response = NextResponse.next()
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  response.headers.set('X-XSS-Protection', '1; mode=block')
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')

  // En développement, React nécessite 'unsafe-eval' pour le HMR et le débogage.
  const isDev = process.env.NODE_ENV === 'development'
  const scriptSrc = isDev
    ? "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com"
    : "script-src 'self' 'unsafe-inline' https://js.stripe.com"

  // Politique CSP commune pour limiter les ressources autorisées.
  const csp = [
    "default-src 'self'",
    scriptSrc + " https://unpkg.com",
    "style-src 'self' 'unsafe-inline' https://unpkg.com",
    "img-src 'self' data: blob: https://*.public.blob.vercel-storage.com https://*.stripe.com https://*.basemaps.cartocdn.com https://*.tile.openstreetmap.org https://tile.openstreetmap.org https://server.arcgisonline.com https://unpkg.com",
    "font-src 'self'",
    "frame-src 'self' https://js.stripe.com https://hooks.stripe.com https://www.google.com https://maps.google.com https://www.google.fr",
    "connect-src 'self' https://api.stripe.com http://ip-api.com https://ipwho.is https://ipapi.co",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join('; ')
  response.headers.set('Content-Security-Policy', csp)

  // Protection des routes administrateur (HTML et API).
  const isPublicAdminRoute = ['/admin/login', '/admin/mot-de-passe-oublie', '/admin/reset-password'].includes(pathname)
  const isApiAdminRoute = pathname.startsWith('/api/admin')
  const isAdminPage = pathname.startsWith('/admin') && !isPublicAdminRoute

  if (isAdminPage || isApiAdminRoute) {
    const token = request.cookies.get('admin_session')?.value

    if (!token) {
      if (pathname.startsWith('/api/')) {
        return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
      }
      return NextResponse.redirect(new URL('/admin/login', request.url))
    }

    try {
      const { payload } = await jwtVerify(token, getSessionSecretKey())

      // Sécurité 1 : Rôle Coach -> redirection ou bloqué
      if (payload.role === 'coach') {
        if (pathname.startsWith('/api/')) {
          return NextResponse.json({ error: 'Accès interdit - Espace Coach requis' }, { status: 403 })
        }
        return NextResponse.redirect(new URL('/coach', request.url))
      }

      // Sécurité 2 : Rôle Superviseur -> interdiction des routes finances
      if (payload.role === 'superviseur') {
        const isFinanceRoute =
          pathname.startsWith('/api/admin/finances') ||
          pathname.startsWith('/api/admin/comptabilite') ||
          pathname.startsWith('/api/admin/factures') ||
          pathname === '/api/admin/groupes/cout-saison'

        if (isFinanceRoute) {
          return NextResponse.json({ error: 'Accès interdit aux superviseurs (Droits insuffisants)' }, { status: 403 })
        }
      }

      return response
    } catch {
      if (pathname.startsWith('/api/')) {
        return NextResponse.json({ error: 'Session expirée ou invalide' }, { status: 401 })
      }
      return NextResponse.redirect(new URL('/admin/login', request.url))
    }
  }


  // Protection des routes coach.
  const isPublicCoachRoute = ['/coach/login', '/coach/mot-de-passe-oublie', '/coach/reset-password'].includes(pathname)
  if (pathname.startsWith('/coach') && !isPublicCoachRoute) {
    const token = request.cookies.get('coach_session')?.value

    if (!token) {
      return NextResponse.redirect(new URL('/coach/login', request.url))
    }

    try {
      await jwtVerify(token, getSessionSecretKey())
      return response
    } catch {
      return NextResponse.redirect(new URL('/coach/login', request.url))
    }
  }

  return response
}

export const config = {
  matcher: [
    '/api/admin/:path*',
    '/api/coach/:path*',
    '/api/auth/admin/:path*',
    '/api/auth/coach/:path*',
    '/admin/:path*',
    '/coach/:path*',
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
}
