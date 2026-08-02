import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAdminSession } from '@/lib/auth/session'
import { apiError, apiSuccess } from '@/lib/api/response'
import { logger } from '@/lib/logger'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  const session = await getAdminSession()
  if (!session) {
    return apiError('Non autorisé', 401)
  }

  try {
    const body = await request.json()
    const { rows } = body // Tableau d'adhérents à importer

    if (!Array.isArray(rows) || rows.length === 0) {
      return apiError('Aucune donnée d\'adhérent transmise pour l\'importation', 400)
    }

    const defaultGroupe = await prisma.groupe.findFirst()
    if (!defaultGroupe) {
      return apiError('Aucun groupe n\'existe en base de données. Créez un groupe d\'abord.', 400)
    }

    let count = 0
    for (const r of rows) {
      const nom = r.nom || r.Nom || 'SansNom'
      const prenom = r.prenom || r.Prenom || 'SansPrenom'
      const email = r.email || r.Email || `${prenom.toLowerCase()}.${nom.toLowerCase()}@adherents.triton`
      const telephone = r.telephone || r.Telephone || ''
      const montant = parseFloat(r.montantPaye || r.montantTotal || r.Montant || '330') || 330
      const statut = r.statutDossier === 'valid' || r.statut === 'valid' ? 'valide' : 'en_attente'

      await prisma.inscription.create({
        data: {
          prenomNageur: String(prenom).trim(),
          nomNageur: String(nom).trim(),
          prenomParent: String(prenom).trim(),
          nomParent: String(nom).trim(),
          email: String(email).trim().toLowerCase(),
          telephone: String(telephone).trim(),
          dateNaissance: new Date('2015-01-01'),
          groupeId: defaultGroupe.id,
          statut: statut,
          montant: montant,
          paye: statut === 'valide',
          modePaiement: r.modePaiement || 'CB MonClub',
          certificatMedical: true
        }
      })
      count++
    }

    logger.info(`[Import MonClub] ${count} adhérents importés avec succès.`)

    return apiSuccess({
      message: `${count} adhérents importés avec succès en base de données !`,
      count
    })
  } catch (error) {
    logger.error('Erreur lors de l\'importation des adhérents MonClub', { data: error })
    return apiError('Erreur lors de l\'importation', 500)
  }
}
