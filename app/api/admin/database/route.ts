import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { apiError, apiSuccess } from '@/lib/api/response'
import { handleRouteError, requireAdmin } from '@/lib/api/guards'

// Liste ordonnée de tous les modèles Prisma du projet pour l'import / export
const PRISMA_MODELS = [
  'coach',
  'remplacement',
  'planning',
  'coachPlanning',
  'evenementCalendrier',
  'actualite',
  'evenement',
  'groupe',
  'inscription',
  'facture',
  'seanceExceptionnelle',
  'reservationSeance',
  'galerieAlbum',
  'galerieMedia',
  'settings',
  'user',
  'don',
  'evenementTournant',
  'factureCoach',
  'ligneFactureCoach',
  'periodeVacances',
  'categorieProduit',
  'fournisseur',
  'produit',
  'varianteProduit',
  'commande',
  'passwordResetToken',
  'ligneCommande',
  'chatbotKnowledge',
  'seanceAnnulee',
  'adminAuditLog',
  'chatbotSuggestion',
  'emailQueue',
  'transactionComptable',
  'chatbotTokenLog',
  'categorieComptable',
  'inscriptionBlock'
]

// GET: Exporter toute la base de données au format JSON
export async function GET() {
  try {
    const auth = await requireAdmin()
    if (!auth.ok) return auth.response

    const backupData: Record<string, any[]> = {}
    for (const modelName of PRISMA_MODELS) {
      const model = (prisma as any)[modelName]
      if (model) {
        backupData[modelName] = await model.findMany()
      }
    }

    // Renvoyer le fichier JSON téléchargeable
    const jsonString = JSON.stringify(backupData, null, 2)
    const dateStr = new Date().toISOString().split('T')[0]
    
    return new Response(jsonString, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="triton-backup-${dateStr}.json"`,
      },
    })
  } catch (error) {
    return handleRouteError(error, 'Erreur lors de la génération de la sauvegarde')
  }
}

// POST: Restaurer la base de données à partir d'un fichier JSON
export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdmin()
    if (!auth.ok) return auth.response

    const body = await request.json()
    
    // Validation minimale que c'est un format de sauvegarde valide
    if (!body || typeof body !== 'object') {
      return apiError('Données de sauvegarde invalides', 400)
    }

    // Exécuter l'importation de manière transactionnelle
    await prisma.$transaction(async (tx) => {
      // 1. Désactiver les contraintes de clés étrangères (PostgreSQL spécifique)
      await tx.$executeRawUnsafe("SET session_replication_role = 'replica';")

      try {
        // 2. Vider toutes les tables existantes dans l'ordre inverse pour éviter tout souci de contrainte
        for (let i = PRISMA_MODELS.length - 1; i >= 0; i--) {
          const modelName = PRISMA_MODELS[i]
          const model = (tx as any)[modelName]
          if (model) {
            try {
              await model.deleteMany()
            } catch (err: any) {
              throw new Error(`Erreur lors du vidage de la table "${modelName}" : ${err.message || err}`)
            }
          }
        }

        // 3. Réimporter les lignes de chaque table
        for (const modelName of PRISMA_MODELS) {
          const records = body[modelName]
          const model = (tx as any)[modelName]
          if (model && Array.isArray(records) && records.length > 0) {
            try {
              await model.createMany({
                data: records,
              })
            } catch (err: any) {
              throw new Error(`Erreur d'importation dans la table "${modelName}" : ${err.message || err}`)
            }
          }
        }
      } finally {
        // 4. Toujours réactiver les contraintes de clés étrangères, même en cas d'échec
        await tx.$executeRawUnsafe("SET session_replication_role = 'origin';")
      }
    }, {
      timeout: 30000 // 30 secondes de délai max pour les restaurations volumineuses
    })

    return apiSuccess({ message: 'Base de données restaurée avec succès !' })
  } catch (error: any) {
    console.error('Erreur lors de la restauration de la base de données:', error)
    return apiError(
      error instanceof Error ? error.message : 'Erreur lors de la restauration de la base de données',
      500
    )
  }
}
