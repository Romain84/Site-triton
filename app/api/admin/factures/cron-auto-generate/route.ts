import { NextRequest, NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/auth/session'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { calculerFactureCoach } from '@/lib/facture-calculations'
import { genererNumeroFacture } from '@/lib/facture-utils'
import { notifyCoach } from '@/lib/notifications'
import { logAdminAudit } from '@/lib/admin-audit'

const adminLogger = logger.withContext('Admin')

// POST - Génération automatique de masse des factures coachs pour le mois précédent
export async function POST(request: NextRequest) {
  try {
    const session = await getAdminSession()

    if (!session) {
      return NextResponse.json(
        { error: 'Non authentifié' },
        { status: 401 }
      )
    }

    // Récupérer optionnellement mois/année depuis le body
    const body = await request.json().catch(() => ({}))
    let { mois, annee } = body

    if (!mois || !annee) {
      const now = new Date()
      let prevMonth = now.getMonth() // 0-indexed, donc correspond exactement au mois précédent (1-indexed) si 1-11
      let prevYear = now.getFullYear()
      if (prevMonth === 0) {
        prevMonth = 12
        prevYear = prevYear - 1
      }
      mois = mois || prevMonth
      annee = annee || prevYear
    }

    // Récupérer les coachs actifs
    const activeCoaches = await prisma.coach.findMany({
      where: {
        actif: true,
      },
    })

    const results = []

    const moisNoms = [
      'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
      'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
    ]

    for (const coach of activeCoaches) {
      // Vérifier si une facture existe déjà pour ce mois et cette année
      const factureExistante = await prisma.factureCoach.findUnique({
        where: {
          coachId_mois_annee: {
            coachId: coach.id,
            mois,
            annee,
          },
        },
      })

      if (factureExistante) {
        results.push({
          coachId: coach.id,
          coachNom: `${coach.prenom} ${coach.nom || ''}`.trim(),
          statut: 'ignore',
          motif: 'Une facture existe déjà pour cette période',
        })
        continue
      }

      // Calculer les montants
      const details = await calculerFactureCoach(coach.id, mois, annee)

      // Si le montant total est 0 et qu'il n'y a aucune heure, on peut décider de ne pas générer de facture
      if (details.totalMontant === 0 && details.totalHeures === 0) {
        results.push({
          coachId: coach.id,
          coachNom: `${coach.prenom} ${coach.nom || ''}`.trim(),
          statut: 'ignore',
          motif: 'Aucune heure ni montant à facturer',
        })
        continue
      }

      // Générer le numéro de facture unique
      const numero = genererNumeroFacture(coach.prenom, coach.nom, mois, annee, coach.id)

      // Créer la facture en brouillon
      const facture = await prisma.factureCoach.create({
        data: {
          numero,
          coachId: coach.id,
          mois,
          annee,
          montantTotal: details.totalMontant,
          tauxHoraire: details.tauxHoraire,
          statut: 'brouillon',
        },
      })

      // Fusionner toutes les lignes à enregistrer en BDD
      const lignesAEnregistrer = [
        ...details.lignesPlanningFixe,
        ...details.lignesPlanningTournant,
        ...details.lignesRemplacements,
        ...details.lignesAbsences,
      ]

      // Enregistrer les lignes calculées
      let ordre = 0
      for (const line of lignesAEnregistrer) {
        await prisma.ligneFactureCoach.create({
          data: {
            factureId: facture.id,
            type: line.type,
            description: line.description,
            date: line.date ? new Date(line.date) : new Date(annee, mois - 1, 1),
            heures: line.heures,
            montant: line.montant,
            ordre: ordre++,
          },
        })
      }

      // Envoyer un email de notification au coach
      let emailEnvoye = false
      if (coach.email) {
        const sujet = `Facture Brouillon générée automatiquement - ${moisNoms[mois - 1]} ${annee}`
        const messageHtml = `
          <div style="font-family: sans-serif; padding: 20px; color: #333;">
            <h2 style="color: #0d9488;">Bonjour ${coach.prenom},</h2>
            <p>Votre facture pour la période de <strong>${moisNoms[mois - 1]} ${annee}</strong> a été calculée et générée automatiquement à l'état de <strong>brouillon</strong>.</p>
            <p><strong>Détails :</strong></p>
            <ul>
              <li><strong>Numéro :</strong> ${facture.numero}</li>
              <li><strong>Heures travaillées :</strong> ${details.totalHeures.toFixed(2)}h</li>
              <li><strong>Montant estimé :</strong> ${details.totalMontant.toFixed(2)}€</li>
            </ul>
            <p>Nous vous invitons à vous connecter sur votre espace personnel pour vérifier l'exactitude des informations et valider cette facture en 1 clic.</p>
            <div style="margin-top: 30px;">
              <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/coach/facturation" style="background-color: #0d9488; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; font-weight: bold;">Accéder à mon espace</a>
            </div>
            <p style="margin-top: 30px; font-size: 12px; color: #666;">Ceci est un message automatisé du Triton Club Cavaillon.</p>
          </div>
        `
        const messageTexte = `Bonjour ${coach.prenom},\n\nVotre facture pour la période de ${moisNoms[mois - 1]} ${annee} a été générée automatiquement en brouillon.\n\nDétails :\n- Numéro : ${facture.numero}\n- Heures : ${details.totalHeures.toFixed(2)}h\n- Montant : ${details.totalMontant.toFixed(2)}€\n\nMerci de vous connecter sur votre espace pour la valider en 1 clic.\n\nCordialement,\nTriton Club Cavaillon`

        emailEnvoye = await notifyCoach(coach.email, {
          sujet,
          messageHtml,
          messageTexte,
        })
      }

      results.push({
        coachId: coach.id,
        coachNom: `${coach.prenom} ${coach.nom || ''}`.trim(),
        statut: 'generee',
        factureId: facture.id,
        numero: facture.numero,
        montantTotal: facture.montantTotal,
        emailNotifie: emailEnvoye,
      })
    }

    // Log the sensitive admin action
    logAdminAudit({
      action: 'facture.auto_generate_all',
      actorId: session.userId,
      actorRole: session.role,
      targetType: 'factures_coach',
      details: {
        mois,
        annee,
        coachesImpacted: results.filter(r => r.statut === 'generee').map(r => r.coachNom),
      },
    })

    return NextResponse.json({
      success: true,
      mois,
      annee,
      results,
    })
  } catch (error) {
    adminLogger.error('Erreur lors de la génération automatique des factures', error)
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}
