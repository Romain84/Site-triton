import 'dotenv/config'
import { prisma } from '../lib/prisma'

function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number)
  return h * 60 + m
}

async function main() {
  const plannings = await prisma.planning.findMany({
    where: { actif: true },
    include: {
      groupe: true,
      coachs: { include: { coach: true } },
    },
    orderBy: [{ jourSemaine: 'asc' }, { heureDebut: 'asc' }],
  })

  console.log(`Total slots actifs: ${plannings.length}`)
  const sansTemps = plannings.filter((p) => !p.tempsFacture || p.tempsFacture <= 0)
  const avecTemps = plannings.filter((p) => p.tempsFacture && p.tempsFacture > 0)
  console.log(`Avec tempsFacture: ${avecTemps.length}`)
  console.log(`Sans tempsFacture: ${sansTemps.length}\n`)

  console.log('--- CRÉNEAUX SANS TEMPS FACTURÉ (PROPOSITION DE REMPLISSAGE DURÉE RÉELLE) ---')
  for (const p of sansTemps) {
    const debut = timeToMinutes(p.heureDebut)
    const fin = timeToMinutes(p.heureFin)
    const dureeReelle = fin - debut
    const coachs = p.coachs.map((c) => c.coach.prenom).join(', ') || 'Sans coach'
    console.log(
      `${p.jourSemaine.padEnd(8)} | ${p.heureDebut}-${p.heureFin} (${dureeReelle} min) | ${p.groupe?.nom || 'Sans groupe'} | Coach: ${coachs} -> tempsFacture proposé: ${dureeReelle} min`
    )
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
