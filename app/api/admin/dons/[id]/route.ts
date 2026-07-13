import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin, handleRouteError } from '@/lib/api/guards'
import { apiError, apiSuccess } from '@/lib/api/response'
import { z } from 'zod'
import { numberToFrenchWords } from '@/lib/utils/number-to-letters'
import { logAdminAudit } from '@/lib/admin-audit'

const updateDonSchema = z.object({
  typeDonateur: z.enum(['particulier', 'entreprise']),
  nomDonateur: z.string().min(1, 'Le nom du donateur est requis').max(255),
  emailDonateur: z.string().email('Format email invalide').or(z.literal('')).nullable().optional(),
  adresseDonateur: z.string().min(1, 'L\'adresse est requise').max(500),
  siren: z.string().max(50).nullable().optional(),
  montant: z.coerce.number().positive('Le montant doit être supérieur à zéro'),
  dateDon: z.string().transform((str) => new Date(str)),
  natureDon: z.enum(['numeraire', 'cheque', 'virement', 'nature', 'abandon_frais']),
  descriptionNature: z.string().max(500).nullable().optional(),
  modePaiement: z.string().max(100).nullable().optional(),
  commentaire: z.string().max(1000).nullable().optional(),
  signataire: z.enum(['president', 'tresoriere']).optional().default('president'),
})

interface Params {
  params: Promise<{
    id: string
  }>
}

// GET : Détails d'un don
export async function GET(request: NextRequest, { params }: Params) {
  try {
    const auth = await requireAdmin()
    if (!auth.ok) return auth.response

    if (auth.session.role !== 'admin') {
      return apiError('Accès interdit', 403)
    }

    const { id } = await params
    const don = await prisma.don.findUnique({
      where: { id },
      include: {
        creePar: {
          select: {
            prenom: true,
            nom: true,
            email: true,
          }
        }
      }
    })

    if (!don) {
      return apiError('Don introuvable', 404)
    }

    return apiSuccess({ don })
  } catch (error) {
    return handleRouteError(error, 'Erreur lors de la récupération du don')
  }
}

// PUT : Modifier un don (uniquement s'il est au statut "brouillon")
export async function PUT(request: NextRequest, { params }: Params) {
  try {
    const auth = await requireAdmin()
    if (!auth.ok) return auth.response

    if (auth.session.role !== 'admin') {
      return apiError('Accès interdit', 403)
    }

    const { id } = await params
    
    // Récupérer le don existant
    const donToUpdate = await prisma.don.findUnique({ where: { id } })
    if (!donToUpdate) {
      return apiError('Don introuvable', 404)
    }

    // Sécurité comptable : bloquer si le don n'est plus un brouillon
    if (donToUpdate.statut !== 'brouillon') {
      return apiError('Les reçus émis ou annulés ne peuvent plus être modifiés', 400)
    }

    const body = await request.json()
    const validation = updateDonSchema.safeParse(body)
    if (!validation.success) {
      return apiError('Données invalides', 400, validation.error.flatten())
    }

    const data = validation.data

    // Recalculer le montant en toutes lettres
    const montantLettres = numberToFrenchWords(data.montant)

    const updatedDon = await prisma.don.update({
      where: { id },
      data: {
        typeDonateur: data.typeDonateur,
        nomDonateur: data.nomDonateur,
        emailDonateur: data.emailDonateur || null,
        adresseDonateur: data.adresseDonateur,
        siren: data.siren || null,
        montant: data.montant,
        montantLettres,
        dateDon: data.dateDon,
        natureDon: data.natureDon,
        descriptionNature: data.descriptionNature || null,
        modePaiement: data.modePaiement || null,
        commentaire: data.commentaire || null,
        signataire: data.signataire,
      },
    })

    // Log d'audit
    logAdminAudit({
      action: 'Modification d\'un don (brouillon)',
      actorId: auth.session.userId,
      actorRole: auth.session.role,
      targetType: 'don',
      targetId: updatedDon.id,
      details: {
        avant: { nom: donToUpdate.nomDonateur, montant: donToUpdate.montant },
        apres: { nom: updatedDon.nomDonateur, montant: updatedDon.montant },
      }
    })

    return apiSuccess({ don: updatedDon })
  } catch (error) {
    return handleRouteError(error, 'Erreur lors de la mise à jour du don')
  }
}

// DELETE : Supprimer un don (uniquement s'il est au statut "brouillon")
export async function DELETE(request: NextRequest, { params }: Params) {
  try {
    const auth = await requireAdmin()
    if (!auth.ok) return auth.response

    if (auth.session.role !== 'admin') {
      return apiError('Accès interdit', 403)
    }

    const { id } = await params
    
    const donToDelete = await prisma.don.findUnique({ where: { id } })
    if (!donToDelete) {
      return apiError('Don introuvable', 404)
    }

    // Supprimer la transaction comptable associée si le reçu a été émis
    if (donToDelete.statut === 'emis' && donToDelete.pdfUrl) {
      try {
        await prisma.transactionComptable.deleteMany({
          where: { justificatif: donToDelete.pdfUrl }
        })
      } catch (err) {
        // En cas d'échec de suppression comptable, on continue quand même la suppression du don
      }
    }

    await prisma.don.delete({ where: { id } })

    // Log d'audit
    logAdminAudit({
      action: 'Suppression d\'un don (brouillon)',
      actorId: auth.session.userId,
      actorRole: auth.session.role,
      targetType: 'don',
      targetId: id,
      details: {
        nomDonateur: donToDelete.nomDonateur,
        montant: donToDelete.montant,
      }
    })

    return apiSuccess({ message: 'Don supprimé avec succès' })
  } catch (error) {
    return handleRouteError(error, 'Erreur lors de la suppression du don')
  }
}
