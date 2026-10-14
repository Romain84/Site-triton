import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { requireAdmin } from '@/lib/api/guards'
import { calculerFactureCoach } from '@/lib/facture-calculations'
import { analyserControleMois } from '@/lib/services/facture-controle-service'

const adminLogger = logger.withContext('AdminFacturesEnCours')

export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/factures/en-cours?mois=9&annee=2026
 * Récupère en STRICTE LECTURE SEULE les heures et montants calculés
 * en temps réel pour l'ensemble des coachs actifs (avant ou après génération).
 * Aucune écriture ou modification n'est réalisée en BDD.
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await requireAdmin()
    if (!auth.ok) return auth.response

    const { searchParams } = new URL(request.url)
    const now = new Date()
    const mois = parseInt(searchParams.get('mois') || String(now.getMonth() + 1), 10)
    const annee = parseInt(searchParams.get('annee') || String(now.getFullYear()), 10)

    if (isNaN(mois) || mois < 1 || mois > 12 || isNaN(annee) || annee < 2020) {
      return NextResponse.json({ error: 'Mois ou année invalide' }, { status: 400 })
    }

    // 1. Récupérer tous les coachs actifs
    const coaches = await prisma.coach.findMany({
      where: { actif: true },
      select: {
        id: true,
        prenom: true,
        nom: true,
        email: true,
        telephone: true,
        photo: true,
        siret: true,
        heuresAdminHebdo: true,
      },
      orderBy: [
        { prenom: 'asc' },
        { nom: 'asc' },
      ],
    })

    // 2. Récupérer les factures déjà enregistrées pour ce mois/année
    const existingFactures = await prisma.factureCoach.findMany({
      where: {
        mois,
        annee,
      },
      select: {
        id: true,
        coachId: true,
        numero: true,
        statut: true,
        montantTotal: true,
        tauxHoraire: true,
        pdfPath: true,
        updatedAt: true,
      },
    })

    const facturesByCoachId = new Map(existingFactures.map((f) => [f.coachId, f]))

    // 3. Calculer les détails pour chaque coach en parallèle (lecture seule pure)
    const results = await Promise.all(
      coaches.map(async (coach) => {
        const existing = facturesByCoachId.get(coach.id)
        try {
          const details = await calculerFactureCoach(coach.id, mois, annee)

          const heuresFixes = (details.lignesPlanningFixe || []).reduce((acc, l) => acc + (l.heures || 0), 0)
          const heuresTournants = (details.lignesPlanningTournant || []).reduce((acc, l) => acc + (l.heures || 0), 0)
          const heuresRemplacements = (details.lignesRemplacements || []).reduce((acc, l) => acc + (l.heures || 0), 0)
          const heuresAbsences = (details.lignesAbsences || []).reduce((acc, l) => acc + (l.heures || 0), 0)
          const heuresManuelles = (details.lignesManuelles || [])
            .filter((l) => l.type === 'manuel')
            .reduce((acc, l) => acc + (l.heures || 0), 0)

          // Analyse automatique des anomalies et points de vigilance
          const anomalies = await analyserControleMois(coach.id, mois, annee, details)
          const nbErreurs = anomalies.filter((a) => a.severite === 'error').length
          const nbWarnings = anomalies.filter((a) => a.severite === 'warning').length

          return {
            coach,
            statut: existing?.statut || 'non_generee',
            numero: existing?.numero || null,
            factureId: existing?.id || null,
            pdfPath: existing?.pdfPath || null,
            totalHeures: details.totalHeures || 0,
            totalMontant: details.totalMontant || 0,
            tauxHoraire: details.tauxHoraire || 0,
            heuresFixes,
            heuresTournants,
            heuresRemplacements,
            heuresAbsences,
            heuresManuelles,
            anomalies,
            nbAnomalies: anomalies.length,
            nbErreurs,
            nbWarnings,
            details,
          }
        } catch (err) {
          adminLogger.warn(`Erreur calcul facture en cours pour coach ${coach.id}`, err)
          return {
            coach,
            statut: existing?.statut || 'non_generee',
            numero: existing?.numero || null,
            factureId: existing?.id || null,
            pdfPath: existing?.pdfPath || null,
            totalHeures: 0,
            totalMontant: existing?.montantTotal || 0,
            tauxHoraire: existing?.tauxHoraire || 0,
            heuresFixes: 0,
            heuresTournants: 0,
            heuresRemplacements: 0,
            heuresAbsences: 0,
            heuresManuelles: 0,
            anomalies: [
              {
                id: `calc-err-${coach.id}`,
                code: 'MONTANT_NEGATIF',
                severite: 'error',
                titre: 'Erreur de calcul',
                description: 'Impossible de calculer la facture pour cet entraîneur.',
              },
            ],
            nbAnomalies: 1,
            nbErreurs: 1,
            nbWarnings: 0,
            details: null,
            error: 'Erreur de calcul',
          }
        }
      })
    )

    // Totaux globaux
    const totalMoisMontant = results.reduce((acc, r) => acc + r.totalMontant, 0)
    const totalMoisHeures = results.reduce((acc, r) => acc + r.totalHeures, 0)
    const coachesAvecActivite = results.filter((r) => r.totalHeures > 0 || r.totalMontant > 0).length
    const totalAnomalies = results.reduce((acc, r) => acc + (r.nbAnomalies || 0), 0)
    const coachesAvecAnomalies = results.filter((r) => (r.nbAnomalies || 0) > 0).length

    return NextResponse.json({
      mois,
      annee,
      coaches: results,
      stats: {
        totalMontant: totalMoisMontant,
        totalHeures: totalMoisHeures,
        totalCoaches: results.length,
        coachesActifs: coachesAvecActivite,
        totalAnomalies,
        coachesAvecAnomalies,
      },
    })
  } catch (error) {
    adminLogger.error('Erreur globale récupération factures en cours', error)
    return NextResponse.json(
      { error: 'Erreur serveur lors de la récupération des factures en cours' },
      { status: 500 }
    )
  }
}
