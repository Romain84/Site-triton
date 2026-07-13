import { NextResponse } from 'next/server'

// Endpoint public simplifié pour éviter les erreurs côté vitrine.
export async function GET() {
  try {
    const { prisma } = await import('@/lib/prisma')

    const settings = await prisma.settings.findFirst({
      select: {
        logoUrl: true,
        inscriptionUrl: true,
        boutiqueOuverte: true,
        interSaisonActif: true,
        texteFiligrane: true,
        statutsUrl: true,
        reglementPiscineUrl: true,
        reglementClubUrl: true,
      },
    })

    return NextResponse.json({
      logoUrl: settings?.logoUrl || null,
      inscriptionUrl: settings?.inscriptionUrl || null,
      boutiqueOuverte: settings?.boutiqueOuverte ?? true,
      interSaisonActif: settings?.interSaisonActif ?? false,
      texteFiligrane: settings?.texteFiligrane || 'Saison 2025 - 2026',
      statutsUrl: settings?.statutsUrl || null,
      reglementPiscineUrl: settings?.reglementPiscineUrl || null,
      reglementClubUrl: settings?.reglementClubUrl || null,
    })
  } catch {
    return NextResponse.json({
      logoUrl: null,
      inscriptionUrl: null,
      boutiqueOuverte: true,
      interSaisonActif: false,
      texteFiligrane: 'Saison 2025 - 2026',
      statutsUrl: null,
      reglementPiscineUrl: null,
      reglementClubUrl: null,
    })
  }
}
