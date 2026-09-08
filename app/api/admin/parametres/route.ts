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
  tauxHoraire: z.coerce.number().min(0).optional(),
  forfaitCompetition: z.coerce.number().min(0).optional(),
  nbCompetitionsAnnee: z.coerce.number().int().min(0).optional(),
  nbDemiJourneesParCompetition: z.coerce.number().int().min(0).optional(),
  forfaitRegionalActif: z.boolean().optional(),
  montantForfaitRegional: z.coerce.number().min(0).optional(),
  reductionEnfantBureau: z.coerce.number().min(0).max(100).optional(),
  boutiqueOuverte: z.boolean().optional(),
  dateLivraisonBoutique: z.string().max(255).nullable().optional(),
  facturationElectronique: z.boolean().optional(),
  emailClub: z.string().email().or(z.literal('')).optional(),
  logoUrl: z.string().or(z.literal('')).nullable().optional(),
  statutsUrl: z.string().or(z.literal('')).nullable().optional(),
  reglementPiscineUrl: z.string().or(z.literal('')).nullable().optional(),
  reglementClubUrl: z.string().or(z.literal('')).nullable().optional(),
  formulaireLicenceFfnUrl: z.string().or(z.literal('')).nullable().optional(),
  afficherBoutonTest: z.boolean().optional(),
  codeAccesTestsNage: z.string().max(100).nullable().optional(),
  signaturePresidentUrl: z.string().or(z.literal('')).nullable().optional(),
  nomSignataireRecu: z.string().max(255).optional(),
  titreSignataireRecu: z.string().max(255).optional(),
  signatureTresoriereUrl: z.string().or(z.literal('')).nullable().optional(),
  nomTresoriereRecu: z.string().max(255).optional(),
  titreTresoriereRecu: z.string().max(255).optional(),
  smtpHost: z.string().max(255).optional(),
  smtpPort: z.coerce.number().int().min(1).max(65535).optional(),
  smtpUser: z.string().max(255).optional(),
  smtpPassword: z.string().max(500).optional(),
  inscriptionUrl: z.string().max(500).nullable().optional(),
  nomClub: z.string().max(255).optional(),
  soldeDepartSaison: z.coerce.number().min(0).optional(),
  chatbotModel: z.string().optional(),
  debutCoursNormal: z.string().max(255).optional(),
  debutCoursBnssa: z.string().max(255).optional(),
  datesTests: z.array(z.string()).optional(),
  interSaisonActif: z.boolean().optional(),
  texteFiligrane: z.string().max(255).optional(),
  instagramAccountId: z.string().max(255).nullable().optional(),
  instagramAccessToken: z.string().max(2000).nullable().optional(),
  piscinesFrequentes: z.string().optional(),
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
  dateLivraisonBoutique: true,
  facturationElectronique: true,
  emailClub: true,
  emailNotification: true,
  logoUrl: true,
  statutsUrl: true,
  reglementPiscineUrl: true,
  reglementClubUrl: true,
  formulaireLicenceFfnUrl: true,
  afficherBoutonTest: true,
  codeAccesTestsNage: true,
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
  instagramAccountId: true,
  instagramAccessToken: true,
  piscinesFrequentes: true,
  createdAt: true,
  updatedAt: true,
} as const

function toSafeSettings(
  settings: any
) {
  if (!settings) {
    return null
  }

  const { smtpPassword, instagramAccessToken, ...rest } = settings

  return {
    ...rest,
    smtpPasswordConfigured: Boolean(smtpPassword),
    instagramConfigured: Boolean(instagramAccessToken),
    instagramAccessToken: instagramAccessToken ? '••••••••' : null,
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
          dateLivraisonBoutique: 'Mi-Octobre 2026',
          emailClub: '',
          logoUrl: null,
          statutsUrl: null,
          reglementPiscineUrl: null,
          reglementClubUrl: null,
          formulaireLicenceFfnUrl: null,
          afficherBoutonTest: true,
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

    const val = validation.data
    const encryptedSmtpPassword = val.smtpPassword ? encryptSmtpPassword(val.smtpPassword) : undefined

    // Build update object only with provided fields
    const updateData: Record<string, any> = {}
    if (val.tauxHoraire !== undefined) updateData.tauxHoraire = val.tauxHoraire
    if (val.forfaitCompetition !== undefined) updateData.forfaitCompetition = val.forfaitCompetition
    if (val.nbCompetitionsAnnee !== undefined) updateData.nbCompetitionsAnnee = val.nbCompetitionsAnnee
    if (val.nbDemiJourneesParCompetition !== undefined) updateData.nbDemiJourneesParCompetition = val.nbDemiJourneesParCompetition
    if (val.forfaitRegionalActif !== undefined) updateData.forfaitRegionalActif = val.forfaitRegionalActif
    if (val.montantForfaitRegional !== undefined) updateData.montantForfaitRegional = val.montantForfaitRegional
    if (val.reductionEnfantBureau !== undefined) updateData.reductionEnfantBureau = val.reductionEnfantBureau
    if (val.boutiqueOuverte !== undefined) updateData.boutiqueOuverte = val.boutiqueOuverte
    if (val.dateLivraisonBoutique !== undefined) updateData.dateLivraisonBoutique = val.dateLivraisonBoutique || null
    if (val.facturationElectronique !== undefined) updateData.facturationElectronique = val.facturationElectronique
    if (val.emailClub !== undefined) updateData.emailClub = val.emailClub
    if (val.logoUrl !== undefined) updateData.logoUrl = val.logoUrl || null
    if (val.statutsUrl !== undefined) updateData.statutsUrl = val.statutsUrl || null
    if (val.reglementPiscineUrl !== undefined) updateData.reglementPiscineUrl = val.reglementPiscineUrl || null
    if (val.reglementClubUrl !== undefined) updateData.reglementClubUrl = val.reglementClubUrl || null
    if (val.formulaireLicenceFfnUrl !== undefined) updateData.formulaireLicenceFfnUrl = val.formulaireLicenceFfnUrl || null
    if (val.afficherBoutonTest !== undefined) updateData.afficherBoutonTest = val.afficherBoutonTest
    if (val.codeAccesTestsNage !== undefined) updateData.codeAccesTestsNage = val.codeAccesTestsNage || null
    if (val.signaturePresidentUrl !== undefined) updateData.signaturePresidentUrl = val.signaturePresidentUrl || null
    if (val.nomSignataireRecu !== undefined) updateData.nomSignataireRecu = val.nomSignataireRecu
    if (val.titreSignataireRecu !== undefined) updateData.titreSignataireRecu = val.titreSignataireRecu
    if (val.signatureTresoriereUrl !== undefined) updateData.signatureTresoriereUrl = val.signatureTresoriereUrl || null
    if (val.nomTresoriereRecu !== undefined) updateData.nomTresoriereRecu = val.nomTresoriereRecu
    if (val.titreTresoriereRecu !== undefined) updateData.titreTresoriereRecu = val.titreTresoriereRecu
    if (val.inscriptionUrl !== undefined) updateData.inscriptionUrl = val.inscriptionUrl || null
    if (val.smtpHost !== undefined) updateData.smtpHost = val.smtpHost
    if (val.smtpPort !== undefined) updateData.smtpPort = val.smtpPort
    if (val.smtpUser !== undefined) updateData.smtpUser = val.smtpUser
    if (val.nomClub !== undefined) updateData.nomClub = val.nomClub
    if (val.soldeDepartSaison !== undefined) updateData.soldeDepartSaison = val.soldeDepartSaison
    if (val.chatbotModel !== undefined) updateData.chatbotModel = val.chatbotModel
    if (val.debutCoursNormal !== undefined) updateData.debutCoursNormal = val.debutCoursNormal
    if (val.debutCoursBnssa !== undefined) updateData.debutCoursBnssa = val.debutCoursBnssa
    if (val.datesTests !== undefined) updateData.datesTests = val.datesTests
    if (val.interSaisonActif !== undefined) updateData.interSaisonActif = val.interSaisonActif
    if (val.texteFiligrane !== undefined) updateData.texteFiligrane = val.texteFiligrane
    if (val.instagramAccountId !== undefined) updateData.instagramAccountId = val.instagramAccountId || null
    if (val.instagramAccessToken !== undefined) updateData.instagramAccessToken = val.instagramAccessToken || null
    if (val.piscinesFrequentes !== undefined) updateData.piscinesFrequentes = val.piscinesFrequentes
    if (encryptedSmtpPassword !== undefined) updateData.smtpPassword = encryptedSmtpPassword

    // Get existing settings id or create new
    const existingSettings = await prisma.settings.findFirst({
      select: { id: true },
    })

    let settings

    if (existingSettings) {
      // Update existing
      settings = await prisma.settings.update({
        where: { id: existingSettings.id },
        data: updateData,
        select: settingsSelect,
      })
    } else {
      // Create new
      settings = await prisma.settings.create({
        data: {
          tauxHoraire: val.tauxHoraire ?? 35,
          forfaitCompetition: val.forfaitCompetition ?? 150,
          nbCompetitionsAnnee: val.nbCompetitionsAnnee ?? 20,
          nbDemiJourneesParCompetition: val.nbDemiJourneesParCompetition ?? 2,
          forfaitRegionalActif: val.forfaitRegionalActif ?? false,
          montantForfaitRegional: val.montantForfaitRegional ?? 50,
          reductionEnfantBureau: val.reductionEnfantBureau ?? 50,
          boutiqueOuverte: val.boutiqueOuverte ?? true,
          dateLivraisonBoutique: val.dateLivraisonBoutique || 'Mi-Octobre 2026',
          emailClub: val.emailClub ?? '',
          logoUrl: val.logoUrl || null,
          statutsUrl: val.statutsUrl || null,
          reglementPiscineUrl: val.reglementPiscineUrl || null,
          reglementClubUrl: val.reglementClubUrl || null,
          formulaireLicenceFfnUrl: val.formulaireLicenceFfnUrl || null,
          afficherBoutonTest: val.afficherBoutonTest ?? true,
          signaturePresidentUrl: val.signaturePresidentUrl || null,
          nomSignataireRecu: val.nomSignataireRecu ?? 'Le Président',
          titreSignataireRecu: val.titreSignataireRecu ?? 'Président',
          signatureTresoriereUrl: val.signatureTresoriereUrl || null,
          nomTresoriereRecu: val.nomTresoriereRecu ?? 'La Trésorière',
          titreTresoriereRecu: val.titreTresoriereRecu ?? 'Trésorière',
          inscriptionUrl: val.inscriptionUrl || null,
          smtpHost: val.smtpHost ?? '',
          smtpPort: val.smtpPort ?? 587,
          smtpUser: val.smtpUser ?? '',
          smtpPassword: encryptedSmtpPassword || '',
          nomClub: val.nomClub ?? '',
          soldeDepartSaison: val.soldeDepartSaison ?? 0,
          chatbotModel: val.chatbotModel ?? 'mistral-small',
          debutCoursNormal: val.debutCoursNormal ?? 'Lundi 21 Septembre 2026',
          debutCoursBnssa: val.debutCoursBnssa ?? 'Jeudi 1er Octobre 2026',
          datesTests: val.datesTests ?? ['Mercredi 16 Septembre 2026', 'Vendredi 18 Septembre 2026'],
          interSaisonActif: val.interSaisonActif ?? false,
          texteFiligrane: val.texteFiligrane ?? 'Saison 2025 - 2026',
          instagramAccountId: val.instagramAccountId || null,
          instagramAccessToken: val.instagramAccessToken || null,
          piscinesFrequentes: val.piscinesFrequentes || '[]',
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
