import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'

// GET: Check if boutique is open
export async function GET() {
  try {
    const settings = await prisma.settings.findFirst()
    const boutiqueOuverte = settings?.boutiqueOuverte ?? true

    return NextResponse.json({ boutiqueOuverte })
  } catch (error) {
    logger.error('Erreur lors de la récupération du statut de la boutique', error)
    // Default to open in case of error
    return NextResponse.json({ boutiqueOuverte: true })
  }
}
