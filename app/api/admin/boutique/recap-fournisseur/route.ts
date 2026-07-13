import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getAdminSession } from '@/lib/auth/session'
import { prisma } from '@/lib/prisma'
import { optionalDateString } from '@/lib/validations'
import { logger } from '@/lib/logger'

// Schéma de validation pour les paramètres de requête
const queryParamsSchema = z.object({
  dateDebut: optionalDateString,
  dateFin: optionalDateString,
  statut: z.enum(['all', 'en_attente', 'en_preparation', 'expediee', 'livree', 'annulee']).optional(),
  fournisseurId: z.string().optional().nullable(),
})

// GET: Récapitulatif des commandes pour le fournisseur
export async function GET(request: NextRequest) {
  try {
    // Vérifier l'authentification
    const session = await getAdminSession()
    if (!session) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    // Récupérer et valider les paramètres de filtre
    const { searchParams } = new URL(request.url)
    const rawParams = {
      dateDebut: searchParams.get('dateDebut') || undefined,
      dateFin: searchParams.get('dateFin') || undefined,
      statut: searchParams.get('statut') || undefined,
      fournisseurId: searchParams.get('fournisseurId') || undefined,
    }

    const validation = queryParamsSchema.safeParse(rawParams)
    if (!validation.success) {
      const errors = validation.error.issues.map((e) => e.message).join(', ')
      return NextResponse.json({ error: errors }, { status: 400 })
    }

    const { dateDebut, dateFin, statut, fournisseurId } = validation.data
    const statutCommande = statut || 'all'

    // Construire le filtre
    const whereClause: any = {
      statutPaiement: 'paye', // Uniquement les commandes payées
    }

    // Filtre par statut de commande
    if (statutCommande !== 'all') {
      whereClause.statut = statutCommande
    }

    // Filtre par fournisseur
    if (fournisseurId && fournisseurId !== 'all') {
      whereClause.lignes = {
        some: {
          produit: {
            fournisseurId: fournisseurId
          }
        }
      }
    }

    // Filtre par date (les dates sont validées par Zod)
    if (dateDebut || dateFin) {
      whereClause.createdAt = {}
      if (dateDebut) {
        whereClause.createdAt.gte = new Date(dateDebut)
      }
      if (dateFin) {
        const endDate = new Date(dateFin)
        endDate.setHours(23, 59, 59, 999)
        whereClause.createdAt.lte = endDate
      }
    }

    // Récupérer toutes les lignes de commandes avec les produits et variantes
    const commandes = await prisma.commande.findMany({
      where: whereClause,
      include: {
        lignes: {
          where: fournisseurId && fournisseurId !== 'all' ? {
            produit: {
              fournisseurId: fournisseurId
            }
          } : undefined,
          include: {
            produit: true,
            variante: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    // Agréger les données par produit/taille
    interface RecapItem {
      produitId: string
      produitNom: string
      varianteId?: string
      taille?: string
      couleur?: string
      sku?: string
      quantiteTotal: number
      prixVenteUnitaire: number
      prixCoutantHT: number
      prixFlocageHT: number
      tauxTVA: number
      // Calculs
      totalHT: number
      totalTVA: number
      totalTTC: number
      totalVente: number
      beneficeTotal: number
      beneficeUnitaire: number
    }

    const recapMap = new Map<string, RecapItem>()

    commandes.forEach((commande) => {
      commande.lignes.forEach((ligne) => {
        // Clé unique par produit/variante
        const key = ligne.varianteId || `${ligne.produitId}-base`

        if (!recapMap.has(key)) {
          // Calculer les prix
          const prixCoutantHT = ligne.variante?.prixCoutantHT || (ligne.produit as any).prixAchat || 0
          const prixFlocageHT = ligne.variante?.prixFlocageHT || 0
          const tauxTVA = ligne.variante?.tauxTVA || (ligne.produit as any).tauxTVA || 20
          const prixVente = ligne.prixUnitaire

          const totalHT = prixCoutantHT + prixFlocageHT
          const totalTVA = totalHT * (tauxTVA / 100)
          const totalTTC = totalHT + totalTVA
          const beneficeUnitaire = prixVente - totalTTC

          recapMap.set(key, {
            produitId: ligne.produitId,
            produitNom: ligne.produit.nom,
            varianteId: ligne.varianteId || undefined,
            taille: ligne.taille || undefined,
            couleur: ligne.couleur || undefined,
            sku: ligne.variante?.sku || undefined,
            quantiteTotal: 0,
            prixVenteUnitaire: prixVente,
            prixCoutantHT,
            prixFlocageHT,
            tauxTVA,
            totalHT,
            totalTVA,
            totalTTC,
            totalVente: 0,
            beneficeTotal: 0,
            beneficeUnitaire,
          })
        }

        // Ajouter la quantité
        const item = recapMap.get(key)!
        item.quantiteTotal += ligne.quantite
        item.totalVente = item.quantiteTotal * item.prixVenteUnitaire
        item.beneficeTotal = item.quantiteTotal * item.beneficeUnitaire
      })
    })

    // Convertir en array et trier par produit puis taille
    const recap = Array.from(recapMap.values()).sort((a, b) => {
      if (a.produitNom !== b.produitNom) {
        return a.produitNom.localeCompare(b.produitNom)
      }
      if (a.taille && b.taille) {
        return a.taille.localeCompare(b.taille)
      }
      return 0
    })

    // Calculer les totaux globaux
    const totauxGlobaux = {
      quantiteTotal: recap.reduce((sum, item) => sum + item.quantiteTotal, 0),
      totalAchatHT: recap.reduce((sum, item) => sum + item.totalHT * item.quantiteTotal, 0),
      totalAchatTTC: recap.reduce((sum, item) => sum + item.totalTTC * item.quantiteTotal, 0),
      totalVente: recap.reduce((sum, item) => sum + item.totalVente, 0),
      beneficeTotal: recap.reduce((sum, item) => sum + item.beneficeTotal, 0),
    }

    return NextResponse.json({
      recap,
      totaux: totauxGlobaux,
      nbCommandes: commandes.length,
      filtres: {
        dateDebut: dateDebut || null,
        dateFin: dateFin || null,
        statut: statutCommande,
        fournisseurId: fournisseurId || 'all',
      },
    })
  } catch (error) {
    logger.error('Erreur lors du récapitulatif', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
