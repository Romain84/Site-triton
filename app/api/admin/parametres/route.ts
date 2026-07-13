import { NextRequest, NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/auth/session'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { z } from 'zod'
import { isSameOriginRequest } from '@/lib/security/origin'
import { apiError, apiSuccess } from '@/lib/api/response'
import { encryptSmtpPassword } from '@/lib/email'

const adminLogger = logger.withContext('Admin')

const updateSettingsSchema = z.object({
  tauxHoraire: z.coerce.number().min(0),
  forfaitCompetition: z.coerce.number().min(0),
  nbCompetitionsAnnee: z.coerce.number().int().min(0).default(20),
  nbDemiJourneesParCompetition: z.coerce.number().int().min(0).default(2),
  forfaitRegionalActif: z.boolean().optional().default(false),
  montantForfaitRegional: z.coerce.number().min(0).optional().default(50),
  reductionEnfantBureau: z.coerce.number().min(0).max(100).optional().default(50),
  boutiqueOuverte: z.boolean().optional().default(true),
  emailClub: z.string().email().or(z.literal('')).optional().default(''),
  logoUrl: z.string().url().or(z.literal('')).nullable().optional(),
  statutsUrl: z.string().or(z.literal('')).nullable().optional(),
  reglementPiscineUrl: z.string().or(z.literal('')).nullable().optional(),
  reglementClubUrl: z.string().or(z.literal('')).nullable().optional(),
  signaturePresidentUrl: z.string().url().or(z.literal('')).nullable().optional(),
  nomSignataireRecu: z.string().max(255).optional().default('Le Président'),
  titreSignataireRecu: z.string().max(255).optional().default('Président'),
  signatureTresoriereUrl: z.string().url().or(z.literal('')).nullable().optional(),
  nomTresoriereRecu: z.string().max(255).optional().default('La Trésorière'),
  titreTresoriereRecu: z.string().max(255).optional().default('Trésorière'),
  smtpHost: z.string().max(255).optional().default(''),
  smtpPort: z.coerce.number().int().min(1).max(65535).optional().default(587),
  smtpUser: z.string().max(255).optional().default(''),
  smtpPassword: z.string().max(500).optional(),
  inscriptionUrl: z.string().max(500).nullable().optional(),
  nomClub: z.string().max(255).optional().default(''),
  soldeDepartSaison: z.coerce.number().min(0).optional().default(0),
  chatbotModel: z.string().optional().default('mistral-small'),
  debutCoursNormal: z.string().max(255).optional().default('Lundi 21 Septembre 2026'),
  debutCoursBnssa: z.string().max(255).optional().default('Jeudi 1er Octobre 2026'),
  datesTests: z.array(z.string()).optional().default([]),
  interSaisonActif: z.boolean().optional().default(false),
  texteFiligrane: z.string().max(255).optional().default('Saison 2025 - 2026'),
})

const settingsSelect = {
  id: true,
  tauxHoraire: true,
  forfaitCompetition: true,
  nbCompetitionsAnnee: true,
  nbDemiJourneesParCompetition: true,
  forfaitRegionalActif: true,
  montantForfaitRegional: true,
  reductionEnfantBureau: true,
  boutiqueOuverte: true,
  emailClub: true,
  emailNotification: true,
  logoUrl: true,
  statutsUrl: true,
  reglementPiscineUrl: true,
  reglementClubUrl: true,
  signaturePresidentUrl: true,
  nomSignataireRecu: true,
  titreSignataireRecu: true,
  signatureTresoriereUrl: true,
  nomTresoriereRecu: true,
  titreTresoriereRecu: true,
  smtpHost: true,
  smtpPort: true,
  smtpUser: true,
  smtpPassword: true,
  inscriptionUrl: true,
  nomClub: true,
  soldeDepartSaison: true,
  chatbotModel: true,
  debutCoursNormal: true,
  debutCoursBnssa: true,
  datesTests: true,
  interSaisonActif: true,
  texteFiligrane: true,
  createdAt: true,
  updatedAt: true,
} as const

function toSafeSettings(
  settings: any
) {
  if (!settings) {
    return null
  }

  const { smtpPassword, ...rest } = settings

  return {
    ...rest,
    smtpPasswordConfigured: Boolean(smtpPassword),
  }
}

// GET: Fetch settings
export async function GET() {
  try {
    const session = await getAdminSession()
    if (!session) {
      return apiError('Non authentifié', 401)
    }

    let settings = await prisma.settings.findFirst({ select: settingsSelect })

    // Create default settings if none exist
    if (!settings) {
      settings = await prisma.settings.create({
        data: {
          tauxHoraire: 35,
          forfaitCompetition: 150,
          nbCompetitionsAnnee: 20,
          nbDemiJourneesParCompetition: 2,
          boutiqueOuverte: true,
          emailClub: '',
          logoUrl: null,
          statutsUrl: null,
          reglementPiscineUrl: null,
          reglementClubUrl: null,
          signaturePresidentUrl: null,
          nomSignataireRecu: 'Le Président',
          titreSignataireRecu: 'Président',
          signatureTresoriereUrl: null,
          nomTresoriereRecu: 'La Trésorière',
          titreTresoriereRecu: 'Trésorière',
          smtpHost: '',
          smtpPort: 587,
          smtpUser: '',
          smtpPassword: '',
          nomClub: '',
          chatbotModel: 'mistral-small',
          debutCoursNormal: 'Lundi 21 Septembre 2026',
          debutCoursBnssa: 'Jeudi 1er Octobre 2026',
          datesTests: ['Mercredi 16 Septembre 2026', 'Vendredi 18 Septembre 2026'],
          interSaisonActif: false,
          texteFiligrane: 'Saison 2025 - 2026',
        },
        select: settingsSelect,
      })
    }

    return apiSuccess({ settings: toSafeSettings(settings) })
  } catch (error) {
    adminLogger.error('Erreur lors de la récupération des paramètres', error)
    return apiError('Erreur serveur', 500)
  }
}

// PUT: Update settings
export async function PUT(request: NextRequest) {
  try {
    if (!isSameOriginRequest(request)) {
      return apiError('Origine non autorisée', 403)
    }

    const session = await getAdminSession()
    if (!session) {
      return apiError('Non authentifié', 401)
    }

    const body = await request.json()
    const validation = updateSettingsSchema.safeParse(body)
    if (!validation.success) {
      return apiError('Données invalides', 400, validation.error.flatten())
    }

    const {
      tauxHoraire,
      forfaitCompetition,
      nbCompetitionsAnnee,
      nbDemiJourneesParCompetition,
      forfaitRegionalActif,
      montantForfaitRegional,
      reductionEnfantBureau,
      boutiqueOuverte,
      emailClub,
      logoUrl,
      statutsUrl,
      reglementPiscineUrl,
      reglementClubUrl,
      signaturePresidentUrl,
      nomSignataireRecu,
      titreSignataireRecu,
      signatureTresoriereUrl,
      nomTresoriereRecu,
      titreTresoriereRecu,
      smtpHost,
      smtpPort,
      smtpUser,
      smtpPassword,
      inscriptionUrl,
      nomClub,
      soldeDepartSaison,
      chatbotModel,
      debutCoursNormal,
      debutCoursBnssa,
      datesTests,
      interSaisonActif,
      texteFiligrane,
    } = validation.data

    // Get existing settings id or create new
    const existingSettings = await prisma.settings.findFirst({
      select: { id: true },
    })

    let settings
    const encryptedSmtpPassword = smtpPassword ? encryptSmtpPassword(smtpPassword) : undefined

    if (existingSettings) {
      // Update existing
      settings = await prisma.settings.update({
        where: { id: existingSettings.id },
        data: {
          tauxHoraire,
          forfaitCompetition,
          nbCompetitionsAnnee,
          nbDemiJourneesParCompetition,
          forfaitRegionalActif: forfaitRegionalActif ?? false,
          montantForfaitRegional,
          reductionEnfantBureau,
          boutiqueOuverte: boutiqueOuverte ?? true,
          emailClub,
          logoUrl: logoUrl || null,
          statutsUrl: statutsUrl || null,
          reglementPiscineUrl: reglementPiscineUrl || null,
          reglementClubUrl: reglementClubUrl || null,
          signaturePresidentUrl: signaturePresidentUrl || null,
          nomSignataireRecu,
          titreSignataireRecu,
          signatureTresoriereUrl: signatureTresoriereUrl || null,
          nomTresoriereRecu,
          titreTresoriereRecu,
          inscriptionUrl,
          smtpHost,
          smtpPort,
          smtpUser,
          nomClub,
          soldeDepartSaison,
          chatbotModel,
          debutCoursNormal,
          debutCoursBnssa,
          datesTests,
          interSaisonActif,
          texteFiligrane,
          // Only update password if provided
          ...(encryptedSmtpPassword && { smtpPassword: encryptedSmtpPassword }),
        },
        select: settingsSelect,
      })
    } else {
      // Create new
      settings = await prisma.settings.create({
        data: {
          tauxHoraire,
          forfaitCompetition,
          nbCompetitionsAnnee,
          nbDemiJourneesParCompetition,
          forfaitRegionalActif: forfaitRegionalActif ?? false,
          montantForfaitRegional,
          reductionEnfantBureau,
          boutiqueOuverte: boutiqueOuverte ?? true,
          emailClub,
          logoUrl: logoUrl || null,
          statutsUrl: statutsUrl || null,
          reglementPiscineUrl: reglementPiscineUrl || null,
          reglementClubUrl: reglementClubUrl || null,
          signaturePresidentUrl: signaturePresidentUrl || null,
          nomSignataireRecu,
          titreSignataireRecu,
          signatureTresoriereUrl: signatureTresoriereUrl || null,
          nomTresoriereRecu,
          titreTresoriereRecu,
          inscriptionUrl,
          smtpHost,
          smtpPort,
          smtpUser,
          smtpPassword: encryptedSmtpPassword || '',
          nomClub: nomClub ?? '',
          soldeDepartSaison,
          chatbotModel,
          debutCoursNormal,
          debutCoursBnssa,
          datesTests,
          interSaisonActif,
          texteFiligrane,
        },
        select: settingsSelect,
      })
    }

    return apiSuccess({ settings: toSafeSettings(settings) })
  } catch (error) {
    adminLogger.error('Erreur lors de la mise à jour des paramètres', error)
    return apiError('Erreur serveur', 500)
  }
}
