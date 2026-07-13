import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin, handleRouteError } from '@/lib/api/guards'
import { apiError } from '@/lib/api/response'

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAdmin()
    if (!auth.ok) return auth.response

    if (auth.session.role !== 'admin') {
      return apiError('Accès interdit', 403)
    }

    const { searchParams } = new URL(request.url)
    const statut = searchParams.get('statut')
    const typeDonateur = searchParams.get('typeDonateur')

    const where: any = {}
    if (statut) where.statut = statut
    if (typeDonateur) where.typeDonateur = typeDonateur

    const dons = await prisma.don.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    })

    // En-têtes CSV (séparateur point-virgule pour Excel français)
    const headers = [
      'Numero Recu',
      'Statut',
      'Type Donateur',
      'Nom Donateur',
      'Email Donateur',
      'Adresse Donateur',
      'SIRET/SIREN',
      'Montant (€)',
      'Date Don',
      'Nature Don',
      'Mode Paiement',
      'Date Emission',
      'Commentaire'
    ]

    const csvRows = [headers.join(';')]

    for (const d of dons) {
      const dateDonFr = new Date(d.dateDon).toLocaleDateString('fr-FR')
      const dateEmisFr = d.dateEmission ? new Date(d.dateEmission).toLocaleDateString('fr-FR') : '-'
      
      // Sécuriser les valeurs contenant des guillemets ou des retours à la ligne
      const escape = (val: string | null) => {
        if (!val) return ''
        return `"${val.replace(/"/g, '""').replace(/\r?\n/g, ' ')}"`
      }

      const row = [
        d.numeroRecu,
        d.statut,
        d.typeDonateur,
        escape(d.nomDonateur),
        escape(d.emailDonateur),
        escape(d.adresseDonateur),
        d.siren || '-',
        d.montant.toFixed(2),
        dateDonFr,
        d.natureDon,
        escape(d.modePaiement),
        dateEmisFr,
        escape(d.commentaire)
      ]
      csvRows.push(row.join(';'))
    }

    // Ajouter l'indicateur d'encodage BOM UTF-8 pour Excel
    const csvContent = '\uFEFF' + csvRows.join('\n')

    return new Response(csvContent, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': 'attachment; filename="registre_dons_triton.csv"',
      }
    })
  } catch (error) {
    return handleRouteError(error, 'Erreur lors de l\'export du registre des dons')
  }
}
