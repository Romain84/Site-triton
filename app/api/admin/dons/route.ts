import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin, handleRouteError } from '@/lib/api/guards'
import { apiError, apiSuccess } from '@/lib/api/response'
import { z } from 'zod'
import { numberToFrenchWords } from '@/lib/utils/number-to-letters'
import { logAdminAudit } from '@/lib/admin-audit'

const createDonSchema = z.object({
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

// GET : Liste des dons avec filtres
export async function GET(request: NextRequest) {
  try {
    const auth = await requireAdmin()
    if (!auth.ok) return auth.response
    
    if (auth.session.role !== 'admin') {
      return apiError('Accès interdit', 403)
    }

    const { searchParams } = new URL(request.url)
    const typeDonateur = searchParams.get('typeDonateur')
    const statut = searchParams.get('statut')
    const search = searchParams.get('search')
    const dateDebut = searchParams.get('dateDebut')
    const dateFin = searchParams.get('dateFin')

    // Construire le filtre Prisma
    const where: any = {}

    if (typeDonateur) {
      where.typeDonateur = typeDonateur
    }
    if (statut) {
      where.statut = statut
    }
    if (search) {
      where.OR = [
        { nomDonateur: { contains: search, mode: 'insensitive' } },
        { numeroRecu: { contains: search, mode: 'insensitive' } },
        { siren: { contains: search, mode: 'insensitive' } },
      ]
    }
    if (dateDebut || dateFin) {
      where.dateDon = {}
      if (dateDebut) {
        where.dateDon.gte = new Date(dateDebut)
      }
      if (dateFin) {
        where.dateDon.lte = new Date(dateFin)
      }
    }

    const dons = await prisma.don.findMany({
      where,
      orderBy: { createdAt: 'desc' },
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

    return apiSuccess({ dons })
  } catch (error) {
    return handleRouteError(error, 'Erreur lors du chargement des dons')
  }
}

// POST : Créer un nouveau don en brouillon
export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdmin()
    if (!auth.ok) return auth.response
    
    if (auth.session.role !== 'admin') {
      return apiError('Accès interdit', 403)
    }

    const body = await request.json()
    const validation = createDonSchema.safeParse(body)
    if (!validation.success) {
      return apiError('Données invalides', 400, validation.error.flatten())
    }

    const data = validation.data

    // Traduction automatique du montant en toutes lettres
    const montantLettres = numberToFrenchWords(data.montant)

    // Générer un ID unique temporaire pour le numeroRecu du brouillon (le numéro officiel sera séquentiel à l'émission)
    const tempId = Math.random().toString(36).substring(2, 10).toUpperCase()
    const tempNumeroRecu = `BROUILLON-${tempId}`

    const don = await prisma.don.create({
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
        statut: 'brouillon',
        numeroRecu: tempNumeroRecu,
        creeParId: auth.session.userId,
      },
    })

    // Log d'audit
    logAdminAudit({
      action: 'Création d\'un don en brouillon',
      actorId: auth.session.userId,
      actorRole: auth.session.role,
      targetType: 'don',
      targetId: don.id,
      details: {
        typeDonateur: don.typeDonateur,
        nomDonateur: don.nomDonateur,
        montant: don.montant,
      }
    })

    return apiSuccess({ don }, 201)
  } catch (error) {
    return handleRouteError(error, 'Erreur lors de la création du don')
  }
}
