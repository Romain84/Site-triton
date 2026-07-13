import { NextResponse } from 'next/server'

// Expose les paramètres publics nécessaires au frontend.
export async function GET() {
  try {
    const { prisma } = await import('@/lib/prisma')

    const settings = await prisma.settings.findFirst({
      select: {
        logoUrl: true,
        inscriptionUrl: true,
        boutiqueOuverte: true,
        statutsUrl: true,
      },
    })

    return NextResponse.json({
      logoUrl: settings?.logoUrl || null,
      inscriptionUrl: settings?.inscriptionUrl || null,
      boutiqueOuverte: settings?.boutiqueOuverte ?? true,
      statutsUrl: settings?.statutsUrl || null,
    })
  } catch {
    return NextResponse.json({
      logoUrl: null,
      inscriptionUrl: null,
      boutiqueOuverte: true,
      statutsUrl: null,
    })
  }
}
