import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { apiError, apiSuccess } from '@/lib/api/response'
import { requireAdmin } from '@/lib/api/guards'

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAdmin()
    if (!auth.ok) return auth.response
    const { searchParams } = new URL(request.url)
    const nageur = searchParams.get('nageur')
    const categorie = searchParams.get('categorie')
    const competition = searchParams.get('competition')

    const where: any = {}
    if (nageur) {
      where.nageurNom = { contains: nageur, mode: 'insensitive' }
    }
    if (categorie) {
      where.categorie = { equals: categorie, mode: 'insensitive' }
    }
    if (competition) {
      where.competition = { equals: competition, mode: 'insensitive' }
    }

    const podiums = await prisma.podiumSaison.findMany({
      where,
      orderBy: { date: 'desc' },
    })

    // Récapitulatif groupé par nageur (palmarès de la saison)
    const statsParNageur: Record<string, { total: number; or: number; argent: number; bronze: number; virtuels: number; podiums: typeof podiums }> = {}
    const competitionsSet = new Set<string>()

    for (const pod of podiums) {
      const nom = pod.nageurNom
      if (pod.competition) competitionsSet.add(pod.competition)

      if (!statsParNageur[nom]) {
        statsParNageur[nom] = { total: 0, or: 0, argent: 0, bronze: 0, virtuels: 0, podiums: [] }
      }
      statsParNageur[nom].total += 1
      if (pod.place === 1) statsParNageur[nom].or += 1
      if (pod.place === 2) statsParNageur[nom].argent += 1
      if (pod.place === 3) statsParNageur[nom].bronze += 1
      if (pod.estVirtuel) statsParNageur[nom].virtuels += 1
      statsParNageur[nom].podiums.push(pod)
    }

    const resultPayload = {
      podiums,
      statsParNageur,
      totalPodiums: podiums.length,
      competitions: Array.from(competitionsSet).sort(),
    }

    return apiSuccess({
      ...resultPayload,
      data: resultPayload,
    })
  } catch (error: any) {
    return apiError('Erreur lors de la récupération des podiums de la saison.', 500)
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const auth = await requireAdmin()
    if (!auth.ok) return auth.response

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    const competition = searchParams.get('competition')
    const nageurNom = searchParams.get('nageurNom')
    const purge = searchParams.get('purge')

    // 1. Purge complète du palmarès
    if (purge === 'true') {
      const res = await prisma.podiumSaison.deleteMany({})
      return apiSuccess({ deletedCount: res.count, message: 'Tout le palmarès a été réinitialisé.' })
    }

    // 2. Suppression de tous les podiums d'une compétition donnée
    if (competition) {
      const res = await prisma.podiumSaison.deleteMany({
        where: { competition },
      })
      return apiSuccess({ deletedCount: res.count, message: `Podiums de la compétition "${competition}" supprimés.` })
    }

    // 3. Suppression de tous les podiums d'un nageur donné
    if (nageurNom) {
      const res = await prisma.podiumSaison.deleteMany({
        where: { nageurNom },
      })
      return apiSuccess({ deletedCount: res.count, message: `Podiums de "${nageurNom}" supprimés.` })
    }

    // 4. Suppression unitaire par ID
    if (id) {
      await prisma.podiumSaison.delete({
        where: { id },
      })
      return apiSuccess({ deleted: true, id, message: 'Podium supprimé avec succès.' })
    }

    return apiError('Veuillez spécifier un identifiant, une compétition ou un nageur à supprimer.', 400)
  } catch (error: any) {
    return apiError('Erreur lors de la suppression du podium.', 500)
  }
}
