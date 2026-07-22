import { NextRequest, NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/auth/session'
import packageJson from '@/package.json'
import os from 'node:os'
import { statfs } from 'node:fs/promises'

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

function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / (3600 * 24))
  const hours = Math.floor((seconds % (3600 * 24)) / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  return `${days > 0 ? `${days}j ` : ''}${hours}h ${minutes}m`
}

async function getSystemHealth() {
  try {
    const totalMem = os.totalmem()
    const freeMem = os.freemem()
    const usedMem = totalMem - freeMem
    const memUsagePercent = Math.round((usedMem / totalMem) * 100)

    const cpus = os.cpus()
    const loadAvg = os.loadavg()
    const uptimeSeconds = os.uptime()

    let diskInfo = null
    try {
      const stats = await statfs('/')
      const totalDisk = Number(stats.blocks) * Number(stats.bsize)
      const freeDisk = Number(stats.bavail) * Number(stats.bsize)
      const usedDisk = totalDisk - freeDisk
      const diskUsagePercent = Math.round((usedDisk / totalDisk) * 100)

      diskInfo = {
        totalGb: (totalDisk / (1024 * 1024 * 1024)).toFixed(1),
        usedGb: (usedDisk / (1024 * 1024 * 1024)).toFixed(1),
        freeGb: (freeDisk / (1024 * 1024 * 1024)).toFixed(1),
        usagePercent: diskUsagePercent,
        warning: diskUsagePercent >= 85,
      }
    } catch {
      diskInfo = null
    }

    return {
      memory: {
        totalMb: Math.round(totalMem / (1024 * 1024)),
        usedMb: Math.round(usedMem / (1024 * 1024)),
        freeMb: Math.round(freeMem / (1024 * 1024)),
        usagePercent: memUsagePercent,
      },
      cpu: {
        cores: cpus.length,
        model: cpus[0]?.model || 'CPU Virtual Server',
        loadAvg: loadAvg.map((l) => Number(l.toFixed(2))),
      },
      uptime: {
        seconds: uptimeSeconds,
        formatted: formatUptime(uptimeSeconds),
      },
      disk: diskInfo,
    }
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

    const [health, ...npmResults] = await Promise.all([
      getSystemHealth(),
      ...(checkUpdates
        ? allPkgNames.map(async (name) => {
            const ver = await getLatestNpmVersion(name)
            return { name, ver }
          })
        : []),
    ])

    const latestVersions: Record<string, string> = {}
    if (checkUpdates && Array.isArray(npmResults)) {
      npmResults.forEach((item: any) => {
        if (item?.name && item?.ver) latestVersions[item.name] = item.ver
      })
    }

    return NextResponse.json({
      name: packageJson.name,
      version: packageJson.version,
      health,
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
