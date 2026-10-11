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

    const where: any = {}
    if (nageur) {
      where.nageurNom = { contains: nageur, mode: 'insensitive' }
    }
    if (categorie) {
      where.categorie = { equals: categorie, mode: 'insensitive' }
    }

    const podiums = await prisma.podiumSaison.findMany({
      where,
      orderBy: { date: 'desc' },
    })

    // Récapitulatif groupé par nageur (palmarès de la saison)
    const statsParNageur: Record<string, { total: number; or: number; argent: number; bronze: number; virtuels: number; podiums: typeof podiums }> = {}

    for (const pod of podiums) {
      const nom = pod.nageurNom
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

    if (!id) {
      return apiError('Identifiant du podium manquant.', 400)
    }

    await prisma.podiumSaison.delete({
      where: { id },
    })

    return apiSuccess({ deleted: true, id })
  } catch (error: any) {
    return apiError('Erreur lors de la suppression du podium.', 500)
  }
}
