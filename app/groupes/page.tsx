import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

async function getGroupes() {
  try {
    return await prisma.groupe.findMany({
      where: { actif: true },
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
        ageMin: true,
        ageMax: true,
      },
    })
  } catch {
    return []
  }
}

function getWatermarkSvgBase64(text: string) {
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='300' height='180' viewBox='0 0 300 180'><text x='150' y='90' fill='black' font-size='13' font-family='system-ui, -apple-system, sans-serif' font-weight='800' letter-spacing='0.1em' text-anchor='middle' transform='rotate(-25 150 90)'>${text}</text></svg>`
  return Buffer.from(svg).toString('base64')
}

export default async function GroupesPage() {
  const [groupes, settings] = await Promise.all([
    getGroupes(),
    prisma.settings.findFirst({
      select: {
        interSaisonActif: true,
        texteFiligrane: true,
      },
    }),
  ])

  const interSaison = settings?.interSaisonActif ?? false
  const texteFiligrane = settings?.texteFiligrane || 'Saison 2025 - 2026'

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
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3 shadow-xs">
            <span className="text-xl">⚠️</span>
            <div>
              <h4 className="font-extrabold text-amber-900 text-sm">Mode Inter-Saison</h4>
              <p className="text-xs text-amber-700 mt-0.5 leading-relaxed">
                Les groupes d&apos;entraînement et tarifs présentés ci-dessous concernent la <strong>{texteFiligrane}</strong>. Ils sont affichés à titre indicatif et sont en cours de mise à jour pour la nouvelle saison.
              </p>
            </div>
          </div>
        )}

        <div className={interSaison ? "opacity-55 grayscale-[50%] blur-[0.6px] pointer-events-auto" : ""}>
          {/* HEADER */}
          <div className="text-center space-y-3 mb-12">
            <h1 className="text-4xl md:text-5xl font-extrabold text-slate-900 tracking-tight">
              Nos Groupes d&apos;Entraînement
            </h1>
            <p className="text-slate-500 font-light text-base md:text-lg max-w-2xl mx-auto leading-relaxed">
              Du niveau éveil (sauv&apos;nage) au perfectionnement et à la compétition nationale, trouvez la catégorie qui correspond à vos objectifs sportifs.
            </p>
          </div>

          {groupes.length === 0 ? (
            <div className="border border-slate-200/80 p-10 text-center text-slate-400 font-medium rounded-xl">
              Aucun groupe disponible pour le moment.
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2">
              {groupes.map((groupe) => {
                // Custom age badge logic
                const hasAgeRange = groupe.ageMin !== null || groupe.ageMax !== null
                const isAdult = groupe.ageMin !== null && groupe.ageMin >= 18
                
                return (
                  <article key={groupe.id} className="border border-slate-200/80 p-6 md:p-8 flex flex-col justify-between space-y-6 rounded-xl bg-white hover:border-slate-350 transition-colors duration-200">
                    <div className="space-y-4">
                      {/* Header: Title + Age Badge */}
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <h2 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight leading-tight">
                          {groupe.nom}
                        </h2>
                        
                        {hasAgeRange && (
                          <span className="border border-slate-200 text-slate-500 px-3 py-1 rounded-full text-xs font-semibold tracking-wide shrink-0">
                            {isAdult 
                              ? 'Adultes' 
                              : (groupe.ageMin && groupe.ageMax 
                                ? `${groupe.ageMin} à ${groupe.ageMax} ans` 
                                : (groupe.ageMin ? `Dès ${groupe.ageMin} ans` : `Jusqu'à ${groupe.ageMax} ans`)
                              )
                            }
                          </span>
                        )}
                      </div>

                      <p className="text-slate-500 text-sm md:text-base leading-relaxed font-light">
                        {groupe.description || 'Description à venir pour ce groupe de natation.'}
                      </p>
                    </div>

                    {/* Pricing Box */}
                    {(typeof groupe.tarif === 'number' || typeof groupe.tarif1Cours === 'number' || typeof groupe.prixLicence === 'number') && (
                      <div className="border-t border-slate-100 pt-4 space-y-2 mt-auto">
                        {typeof groupe.tarif1Cours === 'number' ? (
                          <>
                            <div className="flex items-center justify-between gap-3 text-sm">
                              <span className="text-slate-500 font-medium">{groupe.libelleOption1 || '1 cours/semaine'}</span>
                              <span className="font-bold text-slate-950">
                                {((groupe.tarif1Cours || 0) + (groupe.prixLicence || 0)).toFixed(2)} €
                              </span>
                            </div>
                            <div className="flex items-center justify-between gap-3 text-sm border-t border-slate-50/50 pt-2">
                              <span className="text-slate-500 font-medium">{groupe.libelleOption2 || '2 cours/semaine'}</span>
                              <span className="font-bold text-slate-950">
                                {((groupe.tarif || 0) + (groupe.prixLicence || 0)).toFixed(2)} €
                              </span>
                            </div>
                          </>
                        ) : (
                          <div className="flex items-center justify-between gap-3">
                            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Tarif annuel</span>
                            <span className="text-xl font-bold text-slate-950">
                              {((groupe.tarif || 0) + (groupe.prixLicence || 0)).toFixed(2)} €
                            </span>
                          </div>
                        )}

                        {typeof groupe.prixLicence === 'number' && (
                          <p className="text-[11px] text-slate-450 flex justify-between items-center">
                            <span>Dont licence fédérale FFN</span>
                            <span className="font-medium text-slate-500">
                              {groupe.prixLicence.toFixed(2)} €
                            </span>
                          </p>
                        )}
                      </div>
                    )}
                  </article>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </main>
  )
}

