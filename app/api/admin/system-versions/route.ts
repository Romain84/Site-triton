import { NextRequest, NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/auth/session'
import packageJson from '@/package.json'

async function getLatestNpmVersion(packageName: string): Promise<string | null> {
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 2000)
    const res = await fetch(`https://registry.npmjs.org/${packageName}/latest`, {
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    })
    clearTimeout(timeout)
    if (!res.ok) return null
    const data = await res.json()
    return data.version || null
  } catch {
    return null
  }
}

export async function GET(req: NextRequest) {
  try {
    const session = await getAdminSession()
    if (!session) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const searchParams = req.nextUrl.searchParams
    const checkUpdates = searchParams.get('checkUpdates') === 'true'

    const deps = packageJson.dependencies || {}
    const devDeps = packageJson.devDependencies || {}
    const allPkgNames = Array.from(new Set([...Object.keys(deps), ...Object.keys(devDeps)]))

    const latestVersions: Record<string, string> = {}

    if (checkUpdates) {
      const results = await Promise.all(
        allPkgNames.map(async (name) => {
          const ver = await getLatestNpmVersion(name)
          return { name, ver }
        })
      )
      results.forEach(({ name, ver }) => {
        if (ver) latestVersions[name] = ver
      })
    }

    return NextResponse.json({
      name: packageJson.name,
      version: packageJson.version,
      runtime: {
        node: process.version,
        platform: process.platform,
        arch: process.arch,
        env: process.env.NODE_ENV || 'production',
      },
      dependencies: deps,
      devDependencies: devDeps,
      latestVersions,
    })
  } catch (error) {
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des versions' },
      { status: 500 }
    )
  }
}
