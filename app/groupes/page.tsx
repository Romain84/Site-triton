import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

async function getGroupes() {
  try {
    const list = await prisma.groupe.findMany({
      where: {
        actif: true,
        OR: [
          { tarif: { not: null } },
          { tarif1Cours: { not: null } },
        ],
      },
      orderBy: { ordre: 'asc' },
      select: {
        id: true,
        nom: true,
        description: true,
        tarif: true,
        tarif1Cours: true,
        libelleOption1: true,
        libelleOption2: true,
        prixLicence: true,
        caution: true,
        isCompetition: true,
        nbCompetitions: true,
        nbCompetitionsCaution: true,
        ageMin: true,
        ageMax: true,
        annule: true,
        ordre: true,
      },
    })
    return list.sort((a, b) => {
      const ageA = a.ageMin ?? 999
      const ageB = b.ageMin ?? 999
      if (ageA !== ageB) return ageA - ageB
      return (a.ordre || 0) - (b.ordre || 0)
    })
  } catch {
    return []
  }
}

async function getPlannings() {
  try {
    return await prisma.planning.findMany({
      where: { actif: true },
      select: {
        id: true,
        jourSemaine: true,
        heureDebut: true,
        heureFin: true,
        lieu: true,
        nomSession: true,
        groupeId: true,
        coachs: {
          select: {
            coach: {
              select: {
                prenom: true,
                nom: true,
              },
            },
          },
        },
      },
      orderBy: [
        { jourSemaine: 'asc' },
        { heureDebut: 'asc' },
      ],
    })
  } catch {
    return []
  }
}

import { getCurrentSeasonLabel, isInterSaisonActive } from '@/lib/season-utils'

function getWatermarkSvgBase64(text: string) {
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='300' height='180' viewBox='0 0 300 180'><text x='150' y='90' fill='black' font-size='13' font-family='system-ui, -apple-system, sans-serif' font-weight='800' letter-spacing='0.1em' text-anchor='middle' transform='rotate(-25 150 90)'>${text}</text></svg>`
  return Buffer.from(svg).toString('base64')
}

import GroupesClient from '@/components/GroupesClient'

export default async function GroupesPage() {
  const [groupes, plannings, settings] = await Promise.all([
    getGroupes(),
    getPlannings(),
    prisma.settings.findFirst({
      select: {
        interSaisonActif: true,
        texteFiligrane: true,
      },
    }),
  ])

  const interSaison = isInterSaisonActive(settings?.interSaisonActif)
  const texteFiligrane = settings?.texteFiligrane || getCurrentSeasonLabel()

  return (
    <main className={`min-h-screen pt-32 md:pt-40 pb-20 relative overflow-hidden transition-colors ${interSaison ? 'bg-slate-50/80' : 'bg-white'}`}>
      {/* Watermark overlaying all content */}
      {interSaison && (
        <div 
          className="absolute inset-0 pointer-events-none z-50 select-none opacity-[0.035]"
          style={{
            backgroundImage: `url("data:image/svg+xml;base64,${getWatermarkSvgBase64(texteFiligrane)}")`,
            backgroundRepeat: 'repeat',
          }}
        />
      )}

      <div className="container mx-auto px-4 max-w-6xl space-y-12 relative z-20 animate-fade-in-up">
        
        {/* Inter-season banner */}
        {interSaison && (
          <div className="bg-amber-50/80 border border-amber-200 rounded-xl p-5 shadow-xs">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-widest bg-amber-200/80 text-amber-900 px-2 py-0.5 rounded">
                Information
              </span>
              <h4 className="font-bold text-amber-950 text-sm">Mode Inter-Saison</h4>
            </div>
            <p className="text-xs text-amber-800 mt-1.5 leading-relaxed">
              Les groupes d&apos;entraînement et tarifs présentés ci-dessous concernent la <strong>{texteFiligrane}</strong>. Ils sont affichés à titre indicatif et sont en cours de mise à jour pour la nouvelle saison.
            </p>
          </div>
        )}

        <div className={interSaison ? "opacity-55 grayscale-[50%] blur-[0.6px] pointer-events-auto" : ""}>
          {/* HEADER */}
          <div className="text-center space-y-3 mb-12">
            <h1 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight">
              Nos Groupes d&apos;Entraînement
            </h1>
            <p className="text-slate-600 font-medium text-base md:text-lg max-w-3xl mx-auto leading-relaxed">
              Apprentissage (ENF), section Loisir, Compétition FFN ou activités physiques : découvrez nos catégories et choisissez le groupe adapté à votre profil.
            </p>
          </div>

          {groupes.length === 0 ? (
            <div className="border border-slate-200/80 p-10 text-center text-slate-400 font-medium rounded-2xl">
              Aucun groupe disponible pour le moment.
            </div>
          ) : (
            <GroupesClient groupes={groupes} plannings={plannings} interSaison={interSaison} texteFiligrane={texteFiligrane} />
          )}
        </div>
      </div>
    </main>
  )
}

