import { NextRequest } from 'next/server'
import { requireAdmin, handleRouteError } from '@/lib/api/guards'
import { apiError, apiSuccess } from '@/lib/api/response'

// Cache simple en mémoire (TTL: 5 minutes)
const searchCache = new Map<string, { data: any; timestamp: number }>()
const CACHE_TTL = 5 * 60 * 1000

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAdmin()
    if (!auth.ok) return auth.response
    
    // Sécurité : réservé aux administrateurs, présidents et trésoriers
    const allowedRoles = ['admin', 'president', 'tresorier']
    if (!allowedRoles.includes(auth.session.role)) {
      return apiError('Accès interdit', 403)
    }

    const { searchParams } = new URL(request.url)
    const q = searchParams.get('q')

    if (!q || q.trim().length < 2) {
      return apiSuccess({ results: [], total_results: 0 })
    }

    const queryKey = q.trim().toLowerCase()
    const cachedResult = searchCache.get(queryKey)
    
    // Retourner le résultat du cache s'il est encore valide
    if (cachedResult && (Date.now() - cachedResult.timestamp) < CACHE_TTL) {
      return apiSuccess(cachedResult.data)
    }

    // Appeler l'API officielle Recherche d'Entreprises (limite : 7 req/sec)
    const apiUrl = `https://recherche-entreprises.api.gouv.fr/search?q=${encodeURIComponent(q.trim())}&per_page=12`
    
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    })

    if (!response.ok) {
      throw new Error(`Erreur API externe (${response.status})`)
    }

    const data = await response.json()
    
    // Mettre en cache
    searchCache.set(queryKey, {
      data,
      timestamp: Date.now()
    })

    return apiSuccess(data)
  } catch (error) {
    return handleRouteError(error, 'Erreur lors de la recherche entreprise Sirene')
  }
}
