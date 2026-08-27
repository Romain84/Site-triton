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

function maskEmail(email: string | null | undefined): string | null {
  if (!email || !email.includes('@')) return null
  const parts = email.trim().split('@')
  if (parts.length !== 2) return null
  const [name, domain] = parts

  let maskedName = ''
  if (name.length <= 2) {
    maskedName = name[0] + '***'
  } else {
    maskedName = name.slice(0, 2) + '***' + name.slice(-1)
  }

  const domainParts = domain.split('.')
  const domainExt = domainParts.length > 1 ? '.' + domainParts.slice(1).join('.') : ''
  const domainName = domainParts[0] || ''

  let maskedDomain = ''
  if (domainName.length <= 2) {
    maskedDomain = domainName[0] + '***'
  } else {
    maskedDomain = domainName.slice(0, 2) + '***'
  }

  return `${maskedName}@${maskedDomain}${domainExt}`
}

    // 2. Récupérer la liste des candidats à planifier (pour l'autocomplétion)
    // Sécurité RGPD : Ne jamais exposer le téléphone en clair, masquer l'adresse email
    const rawCandidats = await prisma.candidatTestNage.findMany({
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
        emailParent: true,
        groupeRecommande: true,
      },
      orderBy: [{ nom: 'asc' }, { prenom: 'asc' }],
    })

    const candidats = rawCandidats.map((c) => ({
      id: c.id,
      nom: c.nom,
      prenom: c.prenom,
      age: c.age,
      dateNaissance: c.dateNaissance,
      groupeRecommande: c.groupeRecommande,
      emailParentMasque: maskEmail(c.emailParent),
    }))

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
