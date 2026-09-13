import { NextResponse } from 'next/server'
import { genererGuideCoachPDF } from '@/lib/pdf/guide-coach-pdf-generator'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const pdfBuffer = genererGuideCoachPDF()

    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'inline; filename="guide-espace-coach.pdf"',
        'Cache-Control': 'public, max-age=3600',
      },
    })
  } catch (error) {
    console.error('Erreur lors de la génération du guide coach PDF:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la génération du guide PDF' },
      { status: 500 }
    )
  }
}
