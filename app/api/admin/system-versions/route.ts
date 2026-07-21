import { NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/auth/session'
import packageJson from '@/package.json'

export async function GET() {
  try {
    const session = await getAdminSession()
    if (!session) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
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
      dependencies: packageJson.dependencies || {},
      devDependencies: packageJson.devDependencies || {},
    })
  } catch (error) {
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des versions' },
      { status: 500 }
    )
  }
}
