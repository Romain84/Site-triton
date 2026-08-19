import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/api/guards'
import { z } from 'zod'

const updateSessionSchema = z.object({
  titre: z.string().min(2).optional(),
  description: z.string().nullable().optional(),
  lieu: z.string().optional(),
  consignes: z.string().nullable().optional(),
  actif: z.boolean().optional(),
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
    const validated = updateSessionSchema.parse(body)

    const updated = await prisma.sessionTestNage.update({
      where: { id },
      data: validated,
    })

    return NextResponse.json({
      success: true,
      session: updated,
    })
  } catch (error) {
    console.error('Erreur PUT session test de nage:', error)
    return NextResponse.json({ error: 'Erreur lors de la mise à jour' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const auth = await requireAdmin()
    if (!auth.ok) return auth.response

    const { id } = await params

    await prisma.sessionTestNage.delete({
      where: { id },
    })

    return NextResponse.json({
      success: true,
      message: 'Session et créneaux supprimés avec succès',
    })
  } catch (error) {
    console.error('Erreur DELETE session test de nage:', error)
    return NextResponse.json({ error: 'Erreur lors de la suppression' }, { status: 500 })
  }
}
