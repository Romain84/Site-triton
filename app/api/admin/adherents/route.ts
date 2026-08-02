import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAdminSession } from '@/lib/auth/session'
import { apiError, apiSuccess } from '@/lib/api/response'
import { logger } from '@/lib/logger'

export const dynamic = 'force-dynamic'

export async function GET() {
  const session = await getAdminSession()
  if (!session) {
    return apiError('Non autorisé', 401)
  }

  try {
    const inscriptions = await prisma.inscription.findMany({
      include: {
        groupe: {
          select: { id: true, nom: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    // Formater pour le composant AdherentsManager
    const adherents = inscriptions.map((item, index) => ({
      id: item.id,
      memberNumber: `TRITON-2026-${String(index + 1).padStart(3, '0')}`,
      nom: item.nomNageur,
      prenom: item.prenomNageur,
      email: item.email,
      telephone: item.telephone,
      groupe: item.groupe?.nom || 'Sans groupe',
      groupeId: item.groupeId,
      statutDossier: item.statut === 'valide' ? 'valid' : item.paye ? 'valid' : item.certificatMedical ? 'pending_payment' : 'missing_docs',
      certificatMedical: item.certificatMedical,
      droitImage: true,
      montantPaye: item.paye ? (item.montant || 0) : 0,
      montantTotal: item.montant || 330,
      modePaiement: item.modePaiement || 'CB MonClub'
    }))

    return apiSuccess({
      total: adherents.length,
      adherents
    })
  } catch (error) {
    logger.error('Erreur lors du chargement des adhérents', { data: error })
    return apiError('Erreur lors du chargement des adhérents', 500)
  }
}

export async function PATCH(request: Request) {
  const session = await getAdminSession()
  if (!session) {
    return apiError('Non autorisé', 401)
  }

  try {
    const body = await request.json()
    const { id, statutDossier, certificatMedical, paye } = body

    if (!id) {
      return apiError('ID manquant', 400)
    }

    const updated = await prisma.inscription.update({
      where: { id },
      data: {
        statut: statutDossier === 'valid' ? 'valide' : 'en_attente',
        certificatMedical: certificatMedical !== undefined ? certificatMedical : (statutDossier === 'valid'),
        paye: paye !== undefined ? paye : (statutDossier === 'valid')
      },
      include: {
        groupe: true
      }
    })

    return apiSuccess({ updated })
  } catch (error) {
    logger.error('Erreur lors de la mise à jour de l\'adhérent', { data: error })
    return apiError('Erreur lors de la mise à jour', 500)
  }
}

export async function POST(request: Request) {
  const session = await getAdminSession()
  if (!session) {
    return apiError('Non autorisé', 401)
  }

  try {
    const body = await request.json()
    const { prenom, nom, email, telephone, groupeId, montant, modePaiement } = body

    if (!prenom || !nom || !email) {
      return apiError('Le nom, prénom et email sont requis', 400)
    }

    // Trouver le premier groupe si non fourni
    let targetGroupeId = groupeId
    if (!targetGroupeId) {
      const defaultGroupe = await prisma.groupe.findFirst()
      if (defaultGroupe) targetGroupeId = defaultGroupe.id
    }

    const created = await prisma.inscription.create({
      data: {
        prenomNageur: prenom,
        nomNageur: nom,
        prenomParent: prenom,
        nomParent: nom,
        email,
        telephone: telephone || '',
        dateNaissance: new Date('2015-01-01'),
        groupeId: targetGroupeId,
        statut: 'valide',
        montant: montant ? parseFloat(montant) : 330,
        paye: true,
        modePaiement: modePaiement || 'CB MonClub',
        certificatMedical: true
      }
    })

    return apiSuccess({ created })
  } catch (error) {
    logger.error('Erreur lors de la création de l\'adhérent', { data: error })
    return apiError('Erreur lors de la création de l\'adhérent', 500)
  }
}
