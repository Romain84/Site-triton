import 'dotenv/config'
import { prisma } from '../lib/prisma'

async function main() {
  console.log('=== DÉBUT MIGRATION LOT 6 : SLOTS & GROUPES VISIBILITÉ ===\n')

  // 1. Groupes PPG multi-groupes -> visiblePublic: false
  const ppgMultiGroupes = await prisma.groupe.findMany({
    where: {
      nom: { contains: 'PPG' },
      NOT: { nom: { contains: 'Artistique' } },
    },
  })
  for (const g of ppgMultiGroupes) {
    await prisma.groupe.update({
      where: { id: g.id },
      data: { visiblePublic: false },
    })
    console.log(`[OK] Groupe PPG multi-groupes masqué du public : ${g.nom} (${g.id})`)
  }

  // 2. Groupe PPG Nat. Artistique -> actif: false, visiblePublic: false
  const ppgArtGroupe = await prisma.groupe.findFirst({
    where: { nom: { contains: 'PPG Nat. Artistique' } },
  })
  if (ppgArtGroupe) {
    await prisma.groupe.update({
      where: { id: ppgArtGroupe.id },
      data: { actif: false, visiblePublic: false },
    })
    console.log(`[OK] Groupe PPG Nat. Artistique désactivé : ${ppgArtGroupe.nom} (${ppgArtGroupe.id})`)
  }

  // Groupe principal Natation Artistique
  const groupeArt = await prisma.groupe.findFirst({
    where: {
      nom: { contains: 'Artistique' },
      NOT: { nom: { contains: 'PPG' } },
    },
  })
  if (!groupeArt) {
    console.warn('[WARN] Groupe Natation Artistique introuvable !')
  }

  // Coach Claire
  const coachClaire = await prisma.coach.findFirst({
    where: { prenom: { contains: 'Claire', mode: 'insensitive' } },
  })

  // 3. Fusion des créneaux Vendredi Natation Artistique
  const vendrediArtSlots = await prisma.planning.findMany({
    where: {
      jourSemaine: 'Vendredi',
      OR: [
        { groupe: { nom: { contains: 'Artistique' } } },
        { nomSession: { contains: 'Artistique' } },
      ],
    },
    include: { coachs: true },
    orderBy: { heureDebut: 'asc' },
  })

  console.log(`\nCréneaux Natation Artistique du Vendredi trouvés : ${vendrediArtSlots.length}`)
  if (vendrediArtSlots.length > 0 && groupeArt) {
    // On conserve le premier créneau comme créneau maître
    const [maitre, ...doublons] = vendrediArtSlots
    const coachIds = maitre.coachs.map((c) => c.coachId)
    if (coachClaire && !coachIds.includes(coachClaire.id)) {
      coachIds.push(coachClaire.id)
    }

    const occupationsArt = [
      { espace: 'PPG', heureDebut: '18:15', heureFin: '19:00', ordre: 0 },
      { espace: 'Petit Bassin', heureDebut: '19:00', heureFin: '20:00', ordre: 1 },
      { espace: 'Grand Bassin - Ligne 1', heureDebut: '19:15', heureFin: '20:00', ordre: 2 },
      { espace: 'Grand Bassin - Ligne 2', heureDebut: '19:15', heureFin: '20:00', ordre: 3 },
      { espace: 'Grand Bassin - Ligne 3', heureDebut: '19:15', heureFin: '20:00', ordre: 4 },
      { espace: 'Grand Bassin - Ligne 4', heureDebut: '19:15', heureFin: '20:00', ordre: 5 },
    ]

    await prisma.planning.update({
      where: { id: maitre.id },
      data: {
        groupeId: groupeArt.id,
        nomSession: 'Natation Artistique',
        heureDebut: '18:15',
        heureFin: '20:00',
        tempsFacture: 105, // 1h45
        lieu: 'PPG',
        actif: true,
        coachs: {
          deleteMany: {},
          create: coachIds.map((coachId) => ({ coachId })),
        },
        occupations: {
          deleteMany: {},
          create: occupationsArt,
        },
      },
    })
    console.log(`[OK] Séance maître Natation Artistique mise à jour : ${maitre.id} (18:15-20:00, 1h45) avec 6 occupations`)

    // Suppression des créneaux doublons
    for (const d of doublons) {
      await prisma.coachPlanning.deleteMany({ where: { planningId: d.id } })
      await prisma.occupationPlanning.deleteMany({ where: { planningId: d.id } })
      await prisma.planning.delete({ where: { id: d.id } })
      console.log(`[OK] Créneau doublon supprimé : ${d.id} (${d.heureDebut}-${d.heureFin}, ${d.lieu})`)
    }
  }

  // 4. Fusion des créneaux Vendredi Juniors Compétition (18:00 - 19:15 Ligne 2 & 3)
  const juniorsVendredi = await prisma.planning.findMany({
    where: {
      jourSemaine: 'Vendredi',
      heureDebut: '18:00',
      heureFin: '19:15',
      groupe: { nom: { contains: 'Juniors' } },
    },
    include: { coachs: true },
  })

  console.log(`\nCréneaux Juniors Compétition Vendredi 18:00-19:15 trouvés : ${juniorsVendredi.length}`)
  if (juniorsVendredi.length > 1) {
    const [maitreJ, ...doublonsJ] = juniorsVendredi
    const occupationsJuniors = [
      { espace: 'Grand Bassin - Ligne 2', heureDebut: '18:00', heureFin: '19:15', ordre: 0 },
      { espace: 'Grand Bassin - Ligne 3', heureDebut: '18:00', heureFin: '19:15', ordre: 1 },
    ]

    await prisma.planning.update({
      where: { id: maitreJ.id },
      data: {
        tempsFacture: 75, // 1h15
        lieu: 'Grand Bassin - Ligne 2',
        occupations: {
          deleteMany: {},
          create: occupationsJuniors,
        },
      },
    })
    console.log(`[OK] Séance maître Juniors Compétition mise à jour : ${maitreJ.id} (18:00-19:15, 1h15) avec 2 occupations (Lignes 2-3)`)

    for (const d of doublonsJ) {
      await prisma.coachPlanning.deleteMany({ where: { planningId: d.id } })
      await prisma.occupationPlanning.deleteMany({ where: { planningId: d.id } })
      await prisma.planning.delete({ where: { id: d.id } })
      console.log(`[OK] Créneau doublon Juniors supprimé : ${d.id} (${d.heureDebut}-${d.heureFin}, ${d.lieu})`)
    }
  }

  console.log('\n=== MIGRATION TERMINÉE AVEC SUCCÈS ===')
}

main()
  .catch((e) => {
    console.error('Erreur migration:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
