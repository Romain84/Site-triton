import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { logger } from '@/lib/logger'
import { requireAdmin, handleRouteError } from '@/lib/api/guards'
import { genererNumeroFactureSequentiel } from '@/lib/facture-utils'
import { calculerFactureCoach } from '@/lib/facture-calculations'
import { logAdminAudit } from '@/lib/admin-audit'

const adminLogger = logger.withContext('AdminPrestations')

export const dynamic = 'force-dynamic'

const createPrestationSchema = z.object({
  coachId: z.string().min(1, 'Veuillez sélectionner un coach'),
  date: z.string().min(1, 'La date est requise'),
  description: z.string().min(1, 'L\'intitulé de la prestation est requis').max(500),
  heures: z.coerce.number().min(0).default(0),
  montant: z.coerce.number().min(0).optional(),
  tauxHoraire: z.coerce.number().min(0).optional(),
  lieu: z.string().max(255).optional().nullable(),
  groupe: z.string().max(255).optional().nullable(),
})

/**
 * GET /api/admin/prestations?mois=9&annee=2026&coachId=...
 * Récupère la liste des prestations manuelles créées pour les coachs
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await requireAdmin()
    if (!auth.ok) return auth.response

    const { searchParams } = new URL(request.url)
    const mois = searchParams.get('mois') ? parseInt(searchParams.get('mois')!, 10) : undefined
    const annee = searchParams.get('annee') ? parseInt(searchParams.get('annee')!, 10) : undefined
    const coachId = searchParams.get('coachId') || undefined

    const whereLigne: any = {
      type: 'manuel',
    }

    if (coachId) {
      whereLigne.facture = {
        coachId,
      }
    }

    if (mois && annee) {
      whereLigne.facture = {
        ...(whereLigne.facture || {}),
        mois,
        annee,
      }
    } else if (annee) {
      whereLigne.facture = {
        ...(whereLigne.facture || {}),
        annee,
      }
    }

    const prestations = await prisma.ligneFactureCoach.findMany({
      where: whereLigne,
      include: {
        facture: {
          select: {
            id: true,
            numero: true,
            mois: true,
            annee: true,
            statut: true,
            tauxHoraire: true,
            coach: {
              select: {
                id: true,
                prenom: true,
                nom: true,
                photo: true,
                email: true,
              },
            },
          },
        },
      },
      orderBy: {
        date: 'desc',
      },
    })

    return NextResponse.json({ prestations })
  } catch (error) {
    adminLogger.error('Erreur lors de la récupération des prestations', error)
    return handleRouteError(error, 'Erreur lors du chargement des prestations')
  }
}

/**
 * POST /api/admin/prestations
 * Ajoute une prestation manuelle pour un coach sélectionné
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdmin()
    if (!auth.ok) return auth.response

    const body = await request.json()
    const validation = createPrestationSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Données invalides', details: validation.error.flatten() },
        { status: 400 }
      )
    }

    const { coachId, date, description, heures, montant: inputMontant, tauxHoraire: inputTaux, lieu, groupe } = validation.data

    // Vérifier l'existence du coach
    const coach = await prisma.coach.findUnique({
      where: { id: coachId },
      select: { id: true, prenom: true, nom: true, email: true },
    })

    if (!coach) {
      return NextResponse.json({ error: 'Coach introuvable' }, { status: 404 })
    }

    const parsedDate = new Date(date)
    if (isNaN(parsedDate.getTime())) {
      return NextResponse.json({ error: 'Date invalide' }, { status: 400 })
    }

    const mois = parsedDate.getMonth() + 1
    const annee = parsedDate.getFullYear()

    // Récupérer le taux horaire par défaut du club si nécessaire
    const settings = await prisma.settings.findFirst({ select: { tauxHoraire: true } })
    const baseTaux = inputTaux ?? settings?.tauxHoraire ?? 35

    // Calcul du montant si non renseigné directement
    const finalMontant = inputMontant !== undefined && inputMontant !== null
      ? inputMontant
      : Number(((heures || 0) * baseTaux).toFixed(2))

    // Trouver ou créer la facture du mois pour ce coach
    let facture = await prisma.factureCoach.findUnique({
      where: {
        coachId_mois_annee: {
          coachId,
          mois,
          annee,
        },
      },
    })

    if (facture && ['envoyee', 'payee'].includes(facture.statut)) {
      return NextResponse.json(
        {
          error: `La facture de ${coach.prenom} ${coach.nom || ''} pour ${mois}/${annee} a déjà été ${facture.statut === 'payee' ? 'payée' : 'envoyée au club'}. Passez-la d'abord en brouillon pour ajouter une prestation.`,
        },
        { status: 400 }
      )
    }

    if (!facture) {
      const numero = await genererNumeroFactureSequentiel(coachId, annee)
      facture = await prisma.factureCoach.create({
        data: {
          numero,
          coachId,
          mois,
          annee,
          montantTotal: 0,
          tauxHoraire: baseTaux,
          statut: 'brouillon',
        },
      })
    }

    // Créer la ligne de prestation
    const nouvelleLigne = await prisma.ligneFactureCoach.create({
      data: {
        factureId: facture.id,
        type: 'manuel',
        date: parsedDate,
        description: description.trim(),
        heures: heures > 0 ? heures : null,
        montant: finalMontant,
        lieu: lieu?.trim() || null,
        groupe: groupe?.trim() || null,
      },
      include: {
        facture: {
          select: {
            id: true,
            numero: true,
            mois: true,
            annee: true,
            statut: true,
            coach: {
              select: { id: true, prenom: true, nom: true, photo: true, email: true },
            },
          },
        },
      },
    })

    // Recalculer le montant total de la facture
    const details = await calculerFactureCoach(coachId, mois, annee)
    await prisma.factureCoach.update({
      where: { id: facture.id },
      data: { montantTotal: details.totalMontant },
    })

    // Journal d'audit
    logAdminAudit({
      action: 'CREATION_PRESTATION_COACH',
      actorId: auth.session.userId,
      actorRole: auth.session.role,
      targetType: 'LigneFactureCoach',
      targetId: nouvelleLigne.id,
      details: {
        coachId,
        coachNom: `${coach.prenom} ${coach.nom || ''}`,
        description,
        heures,
        montant: finalMontant,
        mois,
        annee,
      },
    })

    return NextResponse.json({
      success: true,
      prestation: nouvelleLigne,
      message: 'Prestation ajoutée avec succès et intégrée à la facture du coach',
    })
  } catch (error) {
    adminLogger.error('Erreur lors de l\'ajout de la prestation', error)
    return handleRouteError(error, 'Erreur lors de la création de la prestation')
  }
}
