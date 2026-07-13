import { NextRequest, NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/auth/session'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'

const adminLogger = logger.withContext('Admin')

// GET - Liste des logs d'audit d'administration paginés et filtrés
export async function GET(request: NextRequest) {
  try {
    const session = await getAdminSession()

    if (!session) {
      return NextResponse.json(
        { error: 'Non authentifié' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const action = searchParams.get('action')
    const actorId = searchParams.get('actorId')
    const search = searchParams.get('search')

    const skip = (page - 1) * limit

    const where: any = {}

    if (action) {
      where.action = action
    }

    if (actorId) {
      where.actorId = actorId
    }

    if (search) {
      where.OR = [
        { action: { contains: search, mode: 'insensitive' } },
        { actorRole: { contains: search, mode: 'insensitive' } },
        { targetType: { contains: search, mode: 'insensitive' } },
        { details: { contains: search, mode: 'insensitive' } },
      ]
    }

    const [logs, total] = await Promise.all([
      prisma.adminAuditLog.findMany({
        where,
        orderBy: {
          timestamp: 'desc',
        },
        skip,
        take: limit,
      }),
      prisma.adminAuditLog.count({ where }),
    ])

    return NextResponse.json({
      logs,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    })
  } catch (error) {
    adminLogger.error('Erreur lors de la récupération des logs d\'audit', error)
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}
