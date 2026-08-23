import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const sessionId = searchParams.get('sessionId')
    const token = searchParams.get('token')
    const queryCode = searchParams.get('code')
    const headerCode = request.headers.get('x-tests-code')
    const providedCode = (queryCode || headerCode || '').trim()

    // 0. Récupérer les paramètres de configuration
    const settings = await prisma.settings.findFirst({
      select: {
        afficherBoutonTest: true,
        codeAccesTestsNage: true,
      },
    })

    const isGlobalOpen = settings?.afficherBoutonTest !== false
    const requiredCode = settings?.codeAccesTestsNage?.trim() || null
    const hasCodeProtection = Boolean(requiredCode)

    // Vérifier si le code fourni est valide
    const isCodeValid = hasCodeProtection ? providedCode === requiredCode : true

    // Si les inscriptions sont fermées globalement :
    // - On autorise quand même si l'utilisateur possède un token de gestion de réservation existante
    // - Ou si l'utilisateur a fourni le code d'accès secret (accès privilégié / VIP)
    if (!isGlobalOpen && !token) {
      if (!hasCodeProtection || !isCodeValid) {
        return NextResponse.json({
          success: true,
          ouvert: false,
          codeRequis: hasCodeProtection,
          codeValide: false,
          message: 'Les réservations de tests de niveau sont actuellement fermées.',
          sessions: [],
          candidats: [],
        })
      }
    }

    // Si un code est requis mais n'est pas valide (et aucun token de gestion)
    if (hasCodeProtection && !isCodeValid && !token) {
      return NextResponse.json({
        success: true,
        ouvert: isGlobalOpen,
        codeRequis: true,
        codeValide: false,
        message: 'Un code d’accès est requis pour consulter les créneaux et réserver un test.',
        sessions: [],
        candidats: [],
      })
    }

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
      ouvert: true,
      codeRequis: hasCodeProtection,
      codeValide: true,
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
