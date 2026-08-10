import { Suspense } from 'react'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import PlanningInteractif from '@/components/PlanningInteractif'
import { generatePageMetadata } from '@/lib/metadata'
import { getCurrentSeasonLabel, isInterSaisonActive } from '@/lib/season-utils'

export const metadata = generatePageMetadata({
  title: 'Planning des Entraînements',
  description: 'Planning hebdomadaire interactif des entraînements de natation du Triton Club Cavaillon. Consultez les horaires par groupe et jour.',
  path: '/planning',
})

export const dynamic = 'force-dynamic'

async function getData() {
  try {
    const [plannings, groupes, settings] = await Promise.all([
      prisma.planning.findMany({
        where: { actif: true },
        include: {
          coachs: {
            include: {
              coach: {
                select: {
                  id: true,
                  prenom: true,
                  nom: true,
                  photo: true,
                },
              },
            },
          },
          groupe: {
            select: {
              id: true,
              nom: true,
              description: true,
              niveau: true,
              ageMin: true,
              ageMax: true,
              tarif: true,
              couleur: true,
              total: true,
              inscrits: true,
              ordre: true,
            },
          },
        },
        orderBy: [
          { jourSemaine: 'asc' },
          { heureDebut: 'asc' },
        ],
      }),
      prisma.groupe.findMany({
        where: { actif: true },
        select: {
          id: true,
          nom: true,
          description: true,
          niveau: true,
          ageMin: true,
          ageMax: true,
          tarif: true,
          couleur: true,
          total: true,
          inscrits: true,
          ordre: true,
        },
      }),
      prisma.settings.findFirst({
        select: {
          interSaisonActif: true,
          texteFiligrane: true,
        },
      }),
    ])

    const sortedGroupes = groupes.sort((a, b) => {
      const ageA = a.ageMin ?? 999
      const ageB = b.ageMin ?? 999
      if (ageA !== ageB) return ageA - ageB
      return (a.ordre || 0) - (b.ordre || 0)
    })

    return { plannings, groupes: sortedGroupes, settings }
  } catch (error) {
    logger.error('Erreur chargement données planning', error)
    return { plannings: [], groupes: [], settings: null }
  }
}

function getWatermarkSvgBase64(text: string) {
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='300' height='180' viewBox='0 0 300 180'><text x='150' y='90' fill='black' font-size='13' font-family='system-ui, -apple-system, sans-serif' font-weight='800' letter-spacing='0.1em' text-anchor='middle' transform='rotate(-25 150 90)'>${text}</text></svg>`
  return Buffer.from(svg).toString('base64')
}

export default async function PlanningPage({
  searchParams,
}: {
  searchParams?: Promise<{ groupe?: string; groupeId?: string }>
}) {
  const resolvedParams = searchParams ? await searchParams : {}
  const initialGroupeId = resolvedParams?.groupe || resolvedParams?.groupeId

  const { plannings, groupes, settings } = await getData()
  const interSaison = isInterSaisonActive(settings?.interSaisonActif)
  const texteFiligrane = settings?.texteFiligrane || getCurrentSeasonLabel()

  return (
    <div className={`min-h-screen pt-40 pb-20 relative overflow-hidden transition-colors print:pt-2 print:pb-2 print:bg-white ${interSaison ? 'bg-slate-50/80' : 'bg-gradient-to-br from-gray-50 to-gray-100'}`}>
      {/* Watermark overlaying all content */}
      {interSaison && (
        <div 
          className="absolute inset-0 pointer-events-none z-50 select-none opacity-[0.035] print:hidden"
          style={{
            backgroundImage: `url("data:image/svg+xml;base64,${getWatermarkSvgBase64(texteFiligrane)}")`,
            backgroundRepeat: 'repeat',
          }}
        />
      )}

      <div className="container mx-auto px-4 space-y-6 relative z-20">
        {/* Inter-season banner */}
        {interSaison && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3 shadow-xs print:hidden">
            <span className="text-xl">⚠️</span>
            <div>
              <h4 className="font-extrabold text-amber-900 text-sm">Mode Inter-Saison</h4>
              <p className="text-xs text-amber-700 mt-0.5 leading-relaxed">
                Les horaires et plannings présentés ci-dessous concernent la <strong>{texteFiligrane}</strong>. Ils sont affichés à titre indicatif et sont en cours de mise à jour pour la nouvelle saison.
              </p>
            </div>
          </div>
        )}

        <div className={interSaison ? "opacity-55 grayscale-[50%] blur-[0.6px] pointer-events-auto print:opacity-100 print:grayscale-0 print:blur-none" : ""}>
          {plannings.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-xl shadow-lg">
              <p className="text-gray-600 text-lg">Le planning n&apos;est pas encore disponible.</p>
            </div>
          ) : (
            <Suspense fallback={
              <div className="text-center py-20 bg-white rounded-xl shadow-lg">
                <p className="text-gray-600 text-lg">Chargement du planning...</p>
              </div>
            }>
              <PlanningInteractif plannings={plannings} groupes={groupes} initialGroupeId={initialGroupeId} />
            </Suspense>
          )}
        </div>
      </div>
    </div>
  )
}

