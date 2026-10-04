import { NextRequest, NextResponse } from 'next/server'
import { getCoachSession } from '@/lib/auth/session'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { logger } from '@/lib/logger'
import { syncRemplacementBillingLines } from '@/lib/services/remplacement-service'
import { notifyRemplacementDirect, notifyAdmin } from '@/lib/notifications'

const coachLogger = logger.withContext('CoachRemplacementsAPI')

const coachRemplacementSchema = z.object({
  date: z.string().min(1, 'Date requise'),
  heureDebut: z.string().min(1, 'Heure de début requise'),
  heureFin: z.string().min(1, 'Heure de fin requise'),
  planningId: z.string().optional().nullable(),
  coachRemplacantId: z.string().optional().nullable(),
  motif: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  sansRemplacant: z.boolean().optional(),
  statut: z.enum(['en_attente', 'accepte', 'sans_remplacant']).optional(),
})

// GET: Récupérer les demandes de remplacements (ouvertes, mes absences, mes remplacements acceptés)
export async function GET() {
  try {
    const session = await getCoachSession()
    if (!session) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const currentCoachId = session.coachId

    // A) Demandes ouvertes (toutes les demandes 'en_attente' où le coach n'est pas le demandeur)
    const demandesOuvertes = await prisma.remplacement.findMany({
      where: {
        actif: true,
        statut: 'en_attente',
        coachRemplaceId: { not: currentCoachId },
        date: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
      },
      include: {
        coachRemplace: {
          select: { id: true, prenom: true, nom: true },
        },
      },
      orderBy: { date: 'asc' },
    })

    // B) Mes absences déclarées (où je suis le coach remplacé)
    const mesAbsences = await prisma.remplacement.findMany({
      where: {
        actif: true,
        coachRemplaceId: currentCoachId,
      },
      include: {
        coachRemplacant: {
          select: { id: true, prenom: true, nom: true },
        },
      },
      orderBy: { date: 'desc' },
    })

    // C) Mes remplacements effectués/acceptés (où je suis le coach remplaçant)
    const mesRemplacements = await prisma.remplacement.findMany({
      where: {
        actif: true,
        coachRemplacantId: currentCoachId,
      },
      include: {
        coachRemplace: {
          select: { id: true, prenom: true, nom: true },
        },
      },
      orderBy: { date: 'desc' },
    })

    return NextResponse.json({
      demandesOuvertes,
      mesAbsences,
      mesRemplacements,
    })
  } catch (error) {
    coachLogger.error('Erreur lors de la récupération des remplacements coach', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

// POST: Déclarer une absence / Proposer un remplacement
export async function POST(request: NextRequest) {
  try {
    const session = await getCoachSession()
    if (!session) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const currentCoachId = session.coachId
    const body = await request.json()
    const validation = coachRemplacementSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Données invalides', details: validation.error.flatten() },
        { status: 400 }
      )
    }

    const data = validation.data

    if (data.coachRemplacantId && data.coachRemplacantId === currentCoachId) {
      return NextResponse.json(
        { error: 'Vous ne pouvez pas vous désigner comme votre propre remplaçant' },
        { status: 400 }
      )
    }

    let statutFinal = 'en_attente'
    if (data.coachRemplacantId) {
      statutFinal = 'accepte'
    } else if (data.sansRemplacant || data.statut === 'sans_remplacant') {
      statutFinal = 'sans_remplacant'
    }

    // Récupérer les informations de groupe ou planning pour la notification
    let groupeNom: string | null = null
    if (data.planningId) {
      const p = await prisma.planning.findUnique({
        where: { id: data.planningId },
        include: { groupe: { select: { nom: true } } },
      })
      groupeNom = p?.nomSession || p?.groupe?.nom || null
    }

    const remplacement = await prisma.remplacement.create({
      data: {
        coachRemplaceId: currentCoachId,
        coachRemplacantId: data.coachRemplacantId || null,
        date: new Date(data.date),
        heureDebut: data.heureDebut,
        heureFin: data.heureFin,
        planningId: data.planningId || null,
        motif: data.motif || null,
        description: data.description || null,
        statut: statutFinal,
      },
      include: {
        coachRemplace: {
          select: { id: true, prenom: true, nom: true, email: true },
        },
        coachRemplacant: {
          select: { id: true, prenom: true, nom: true, email: true },
        },
      },
    })

    // Synchronisation de facturation immédiate
    if (statutFinal === 'accepte' || statutFinal === 'sans_remplacant') {
      await syncRemplacementBillingLines(remplacement.id)
    }

    const dateFormatted = new Date(data.date).toLocaleDateString('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    })

    // Envoi des notifications selon le statut
    if (statutFinal === 'accepte' && remplacement.coachRemplacant) {
      await notifyRemplacementDirect({
        coachRemplace: remplacement.coachRemplace,
        coachRemplacant: remplacement.coachRemplacant,
        dateStr: dateFormatted,
        heureDebut: data.heureDebut,
        heureFin: data.heureFin,
        groupeNom,
        motif: data.motif || null,
      })
    } else if (statutFinal === 'sans_remplacant') {
      await notifyAdmin({
        sujet: `[Coachs] Absence sans remplaçant : ${remplacement.coachRemplace.prenom} (${dateFormatted})`,
        messageTexte: `${remplacement.coachRemplace.prenom} a déclaré une absence sans remplaçant le ${dateFormatted} de ${data.heureDebut} à ${data.heureFin} (${groupeNom || 'Séance'}). Motif : ${data.motif || 'Non précisé'}.`,
        messageHtml: `<p><strong>${remplacement.coachRemplace.prenom}</strong> a déclaré une absence sans remplaçant le <strong>${dateFormatted}</strong> de ${data.heureDebut} à ${data.heureFin} (${groupeNom || 'Séance'}).</p><p>Motif : ${data.motif || 'Non précisé'}</p>`,
      })
    } else {
      // en_attente : avertir l'admin qu'un créneau est à pourvoir
      await notifyAdmin({
        sujet: `[Coachs] Demande de remplacement ouverte : ${remplacement.coachRemplace.prenom} (${dateFormatted})`,
        messageTexte: `${remplacement.coachRemplace.prenom} recherche un remplaçant le ${dateFormatted} (${data.heureDebut} - ${data.heureFin}) pour ${groupeNom || 'Séance'}.`,
        messageHtml: `<p><strong>${remplacement.coachRemplace.prenom}</strong> recherche un remplaçant le <strong>${dateFormatted}</strong> (${data.heureDebut} - ${data.heureFin}) pour <strong>${groupeNom || 'Séance'}</strong>.</p>`,
      })
    }

    return NextResponse.json({
      message: data.coachRemplacantId
        ? `Remplacement validé directement avec ${remplacement.coachRemplacant?.prenom} !`
        : statutFinal === 'sans_remplacant'
        ? 'Absence enregistrée sans remplaçant'
        : 'Absence/Remplacement proposé aux autres coachs avec succès',
      remplacement,
    })
  } catch (error) {
    coachLogger.error('Erreur lors de la déclaration du remplacement coach', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
