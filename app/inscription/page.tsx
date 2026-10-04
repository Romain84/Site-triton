import { prisma } from '@/lib/prisma'
import { getCurrentSeasonLabel, isInterSaisonActive } from '@/lib/season-utils'
import InscriptionClient from '@/components/InscriptionClient'

export const dynamic = 'force-dynamic'

function getWatermarkSvgBase64(text: string) {
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='300' height='180' viewBox='0 0 300 180'><text x='150' y='90' fill='black' font-size='13' font-family='system-ui, -apple-system, sans-serif' font-weight='800' letter-spacing='0.1em' text-anchor='middle' transform='rotate(-25 150 90)'>${text}</text></svg>`
  return Buffer.from(svg).toString('base64')
}

// ─── Types ──────────────────────────────────────────────
interface BlockData {
  id: string
  type: string
  titre: string | null
  contenu: Record<string, any>
  ordre: number
}

interface Groupe {
  id: string
  nom: string
  niveau: string | null
  tarif: number | null
  tarif1Cours: number | null
  libelleOption1: string | null
  libelleOption2: string | null
  prixLicence: number | null
  caution: number | null
  nbCompetitions?: number | null
  nbCompetitionsCaution?: number | null
  annule: boolean
  ageMin?: number | null
  ordre?: number
}

// ─── Data Fetching ──────────────────────────────────────
async function getBlocks(): Promise<BlockData[]> {
  try {
    return (await prisma.inscriptionBlock.findMany({
      where: { actif: true },
      orderBy: { ordre: 'asc' },
    })) as unknown as BlockData[]
  } catch {
    return []
  }
}

async function getGroupes(): Promise<Groupe[]> {
  try {
    return await prisma.groupe.findMany({
      where: {
        actif: true,
        visiblePublic: true,
        OR: [
          { tarif: { not: null } },
          { tarif1Cours: { not: null } },
        ],
      },
      orderBy: { ordre: 'asc' },
      select: {
        id: true,
        nom: true,
        niveau: true,
        tarif: true,
        tarif1Cours: true,
        libelleOption1: true,
        libelleOption2: true,
        prixLicence: true,
        caution: true,
        nbCompetitions: true,
        nbCompetitionsCaution: true,
        annule: true,
        ageMin: true,
        ordre: true,
      },
    })
  } catch {
    return []
  }
}

async function getSettings() {
  try {
    return await prisma.settings.findFirst()
  } catch {
    return null
  }
}

// ─── Main Server Component ──────────────────────────────
export default async function InscriptionPage() {
  const [blocks, dbGroupes, settings] = await Promise.all([
    getBlocks(),
    getGroupes(),
    getSettings(),
  ])

  if (blocks.length === 0) {
    return (
      <main className="min-h-screen pt-36 pb-20 bg-slate-50/50">
        <div className="container mx-auto px-4 max-w-5xl text-center space-y-4">
          <h1 className="text-4xl font-black text-slate-900">Inscriptions</h1>
          <p className="text-slate-600">La page d&apos;inscription est en cours de configuration.</p>
        </div>
      </main>
    )
  }

  const interSaison = isInterSaisonActive(settings?.interSaisonActif)
  const texteFiligrane = settings?.texteFiligrane || getCurrentSeasonLabel()
  const watermarkSvgBase64 = getWatermarkSvgBase64(texteFiligrane)

  return (
    <InscriptionClient
      blocks={blocks}
      dbGroupes={dbGroupes}
      settings={settings}
      interSaison={interSaison}
      texteFiligrane={texteFiligrane}
      watermarkSvgBase64={watermarkSvgBase64}
    />
  )
}
