import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/api/guards'
import { z } from 'zod'

const updateCreneauSchema = z.object({
  actif: z.boolean().optional(),
  capacite: z.number().int().min(1).max(20).optional(),
})

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const auth = await requireAdmin()
    if (!auth.ok) return auth.response

    const { id } = await params
    const body = await request.json()
    const validated = updateCreneauSchema.parse(body)

    const updated = await prisma.creneauTestNage.update({
      where: { id },
      data: validated,
    })

    return NextResponse.json({
      success: true,
      creneau: updated,
    })
  } catch (error) {
    console.error('Erreur PUT creneau test de nage:', error)
    return NextResponse.json({ error: 'Erreur lors de la mise à jour du créneau' }, { status: 500 })
  }
}
