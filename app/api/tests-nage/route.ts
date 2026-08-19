import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const sessionId = searchParams.get('sessionId')

    // 1. Récupérer les sessions actives
    const sessions = await prisma.sessionTestNage.findMany({
      where: { actif: true },
      orderBy: { date: 'asc' },
      include: {
        creneaux: {
          where: { actif: true },
          orderBy: { heureDebut: 'asc' },
          include: {
            inscriptions: {
              where: { statut: { not: 'annule' } },
              select: {
                id: true,
                nomEnfant: true,
                prenomEnfant: true,
                statut: true,
              },
            },
          },
        },
      },
    })

    // 2. Récupérer la liste des candidats à planifier (pour l'autocomplétion / recherche hybride)
    // On ne renvoie que les données essentielles et uniquement pour les candidats non encore planifiés
    const candidats = await prisma.candidatTestNage.findMany({
      where: {
        statut: 'a_planifier',
        ...(sessionId ? { OR: [{ sessionId }, { sessionId: null }] } : {}),
      },
      select: {
        id: true,
        nom: true,
        prenom: true,
        age: true,
        dateNaissance: true,
        nomParent: true,
        emailParent: true,
        telephoneParent: true,
      },
      orderBy: [{ nom: 'asc' }, { prenom: 'asc' }],
    })

    // 3. Formater les créneaux avec les places restantes
    const formattedSessions = sessions.map((session) => ({
      id: session.id,
      titre: session.titre,
      description: session.description,
      lieu: session.lieu,
      date: session.date,
      heureDebut: session.heureDebut,
      heureFin: session.heureFin,
      dureeMinutes: session.dureeMinutes,
      capaciteParCreneau: session.capaciteParCreneau,
      consignes: session.consignes,
      creneaux: session.creneaux.map((cr) => {
        const nbInscrits = cr.inscriptions.length
        const placesRestantes = Math.max(0, cr.capacite - nbInscrits)
        return {
          id: cr.id,
          heureDebut: cr.heureDebut,
          heureFin: cr.heureFin,
          capacite: cr.capacite,
          nbInscrits,
          placesRestantes,
          estComplet: placesRestantes <= 0,
        }
      }),
    }))

    return NextResponse.json({
      success: true,
      sessions: formattedSessions,
      candidats,
    })
  } catch (error) {
    console.error('Erreur API public tests-nage:', error)
    return NextResponse.json(
      { error: 'Impossible de charger les créneaux de tests de nage' },
      { status: 500 }
    )
  }
}
