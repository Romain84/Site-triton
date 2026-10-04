import 'dotenv/config'
import { prisma } from '../lib/prisma'

function timeToMinutes(time: string): number {
  const [h, m] = (time || '00:00').split(':').map(Number)
  return (h || 0) * 60 + (m || 0)
}

async function main() {
  const plannings = await prisma.planning.findMany({
    where: {
      actif: true,
      OR: [
        { tempsFacture: null },
        { tempsFacture: { lte: 0 } },
      ],
    },
    include: {
      groupe: true,
      coachs: { include: { coach: true } },
    },
    orderBy: [{ jourSemaine: 'asc' }, { heureDebut: 'asc' }],
  })

  console.log(`Nombre de créneaux actifs sans tempsFacture à mettre à jour : ${plannings.length}`)

  let updatedCount = 0
  for (const p of plannings) {
    const debut = timeToMinutes(p.heureDebut)
    const fin = timeToMinutes(p.heureFin)
    const dureeReelle = fin - debut

    if (dureeReelle <= 0) {
      console.warn(`[ATTENTION] Créneau invalide ID ${p.id} (${p.heureDebut}-${p.heureFin}) - ignoré`)
      continue
    }

    await prisma.planning.update({
      where: { id: p.id },
      data: { tempsFacture: dureeReelle },
    })

    const coachs = p.coachs.map((c) => c.coach.prenom).join(', ') || 'Sans coach'
    console.log(
      `✓ ID ${p.id.padEnd(25)} | ${p.jourSemaine.padEnd(8)} ${p.heureDebut}-${p.heureFin} | ${p.groupe?.nom || 'Sans groupe'} (${coachs}) -> tempsFacture = ${dureeReelle} min`
    )
    updatedCount++
  }

  console.log(`\nSuccès : ${updatedCount} créneaux mis à jour avec leur durée réelle exacte.`)
}

main()
  .catch((err) => {
    console.error('Erreur lors du remplissage des créneaux :', err)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
