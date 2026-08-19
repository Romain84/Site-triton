import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const token = searchParams.get('token')

    if (!token || token.length < 8) {
      return NextResponse.json({ error: 'Token de réservation manquant ou invalide' }, { status: 400 })
    }

    const inscription = await prisma.inscriptionTestNage.findUnique({
      where: { token },
      include: {
        creneau: {
          include: {
            session: {
              include: {
                creneaux: {
                  where: { actif: true },
                  orderBy: { heureDebut: 'asc' },
                  include: {
                    inscriptions: {
                      where: { statut: { not: 'annule' } },
                      select: { id: true },
                    },
                  },
                },
              },
            },
          },
        },
      },
    })

    if (!inscription) {
      return NextResponse.json({ error: 'Réservation introuvable ou lien expiré' }, { status: 404 })
    }

    const session = inscription.creneau.session

    const availableCreneaux = session.creneaux.map((cr) => {
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
        isCurrent: cr.id === inscription.creneauId,
      }
    })

    return NextResponse.json({
      success: true,
      data: {
        inscription: {
          id: inscription.id,
          nomEnfant: inscription.nomEnfant,
          prenomEnfant: inscription.prenomEnfant,
          nomParent: inscription.nomParent,
          emailParent: inscription.emailParent,
          telephoneParent: inscription.telephoneParent,
          statut: inscription.statut,
          token: inscription.token,
          remarques: inscription.remarques,
        },
        creneau: {
          id: inscription.creneau.id,
          heureDebut: inscription.creneau.heureDebut,
          heureFin: inscription.creneau.heureFin,
        },
        session: {
          id: session.id,
          titre: session.titre,
          date: session.date,
          lieu: session.lieu,
          dureeMinutes: session.dureeMinutes,
          consignes: session.consignes,
          creneaux: availableCreneaux,
        },
      },
    })
  } catch (error) {
    console.error('Erreur récupération réservation token:', error)
    return NextResponse.json({ error: 'Erreur lors de la récupération de la réservation' }, { status: 500 })
  }
}
