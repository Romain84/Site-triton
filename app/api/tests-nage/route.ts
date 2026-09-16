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
        codeAccesTestsNage: true,
      },
    })

    const requiredCode = settings?.codeAccesTestsNage?.trim() || null
    const hasCodeProtection = Boolean(requiredCode)

    // Vérifier si le code fourni est valide
    // Si aucune protection par mot de passe n'est configurée, l'accès est totalement libre
    const isCodeValid = hasCodeProtection ? (providedCode !== '' && providedCode === requiredCode) : true

    // Si un mot de passe est configuré et que le code n'est pas fourni ou incorrect (hors token de réservation direct)
    if (hasCodeProtection && !isCodeValid && !token) {
      return NextResponse.json({
        success: true,
        ouvert: true,
        codeRequis: true,
        codeValide: false,
        message: 'Un mot de passe d’accès est requis pour consulter les créneaux et réserver un test.',
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

    // 2. Sécurité RGPD : Ne JAMAIS exposer publiquement la liste exhaustive des mineurs.
    // Si un candidat spécifique est demandé par son identifiant unique (lien direct reçu par les parents),
    // on renvoie uniquement son dossier. Sinon, la liste publique reste vide.
    const candidatId = searchParams.get('c') || searchParams.get('candidatId')
    let candidats: Array<{
      id: string
      nom: string
      prenom: string
      age: number | null
      dateNaissance: Date | null
      groupeRecommande: string | null
      emailParentMasque: string | null
    }> = []

    if (candidatId) {
      const singleCandidat = await prisma.candidatTestNage.findUnique({
        where: { id: candidatId },
        select: {
          id: true,
          nom: true,
          prenom: true,
          age: true,
          dateNaissance: true,
          emailParent: true,
          groupeRecommande: true,
        },
      })

      if (singleCandidat) {
        candidats = [
          {
            id: singleCandidat.id,
            nom: singleCandidat.nom,
            prenom: singleCandidat.prenom,
            age: singleCandidat.age,
            dateNaissance: singleCandidat.dateNaissance,
            groupeRecommande: singleCandidat.groupeRecommande,
            emailParentMasque: maskEmail(singleCandidat.emailParent),
          },
        ]
      }
    }

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
      actif: Boolean(session.actif),
      bloquee: Boolean(session.bloquee),
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
