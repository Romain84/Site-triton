import { NextResponse } from 'next/server'
import { getCoachSession } from '@/lib/auth/session'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'

const coachLogger = logger.withContext('CoachOverview')

// Retourne un aperçu facturation coach (montants, tendance et actions).
export async function GET() {
  try {
    const session = await getCoachSession()

    if (!session) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const now = new Date()
    const currentMonth = now.getMonth() + 1
    const currentYear = now.getFullYear()

    const currentYearFactures = await prisma.factureCoach.findMany({
      where: {
        coachId: session.coachId,
        annee: currentYear,
      },
      orderBy: [
        { mois: 'asc' },
      ],
      select: {
        id: true,
        numero: true,
        mois: true,
        annee: true,
        montantTotal: true,
        statut: true,
        dateEnvoi: true,
        datePaiement: true,
      },
    })

    const last12Months = await prisma.factureCoach.findMany({
      where: {
        coachId: session.coachId,
        OR: [
          { annee: currentYear },
          { annee: currentYear - 1 },
        ],
      },
      orderBy: [
        { annee: 'desc' },
        { mois: 'desc' },
      ],
      take: 12,
      select: {
        mois: true,
        annee: true,
        montantTotal: true,
        statut: true,
      },
    })

    const totalYear = currentYearFactures.reduce((sum, item) => sum + item.montantTotal, 0)
    const totalYearPaid = currentYearFactures
      .filter((item) => item.statut === 'payee')
      .reduce((sum, item) => sum + item.montantTotal, 0)

    const currentMonthInvoice = currentYearFactures.find((item) => item.mois === currentMonth)

    const pendingInvoices = currentYearFactures
      .filter((item) => item.statut !== 'payee')
      .sort((a, b) => (a.annee - b.annee) || (a.mois - b.mois))
      .slice(0, 3)

    return NextResponse.json({
      year: currentYear,
      totals: {
        totalYear,
        totalYearPaid,
        totalYearPending: totalYear - totalYearPaid,
      },
      currentMonth: {
        month: currentMonth,
        invoice: currentMonthInvoice || null,
      },
      pendingInvoices,
      trend: last12Months.reverse(),
    })
  } catch (error) {
    coachLogger.error('Erreur lors de la récupération de l\'aperçu facturation', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
