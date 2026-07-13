import { NextRequest, NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/auth/session'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { clearChatbotKnowledgeCache } from '@/lib/chatbot-knowledge'

// PUT: Update a group
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getAdminSession()
    if (!session) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    const {
      nom, description, ageMin, ageMax, total, inscrits, tarif, tarif1Cours, libelleOption1, libelleOption2, inscrits1Cours, prixLicence, caution, niveau,
      dateDebut, dateFin, tempsFacture, isCompetition, nbCompetitions, membresBureau, enfantsBureau, ordre, actif
    } = body

    const groupe = await prisma.groupe.update({
      where: { id },
      data: {
        nom,
        description,
        ageMin: ageMin !== undefined ? (ageMin ? parseInt(ageMin, 10) : null) : undefined,
        ageMax: ageMax !== undefined ? (ageMax ? parseInt(ageMax, 10) : null) : undefined,
        ...(total !== undefined && { total: parseInt(total, 10) }),
        ...(inscrits !== undefined && { inscrits: parseInt(inscrits, 10) }),
        tarif: tarif !== undefined ? (tarif ? parseFloat(tarif) : null) : undefined,
        tarif1Cours: tarif1Cours !== undefined ? (tarif1Cours ? parseFloat(tarif1Cours) : null) : undefined,
        libelleOption1: libelleOption1 !== undefined ? (libelleOption1 || null) : undefined,
        libelleOption2: libelleOption2 !== undefined ? (libelleOption2 || null) : undefined,
        inscrits1Cours: inscrits1Cours !== undefined ? parseInt(inscrits1Cours, 10) : undefined,
        prixLicence: prixLicence !== undefined ? (prixLicence ? parseFloat(prixLicence) : null) : undefined,
        caution: caution !== undefined ? (caution ? parseFloat(caution) : null) : undefined,
        niveau: niveau !== undefined ? (niveau || null) : undefined,
        dateDebut: dateDebut !== undefined ? (dateDebut ? new Date(dateDebut) : null) : undefined,
        dateFin: dateFin !== undefined ? (dateFin ? new Date(dateFin) : null) : undefined,
        tempsFacture: tempsFacture !== undefined ? (tempsFacture ? parseInt(tempsFacture, 10) : null) : undefined,
        isCompetition: isCompetition !== undefined ? isCompetition : undefined,
        nbCompetitions: nbCompetitions !== undefined ? (nbCompetitions ? parseInt(nbCompetitions, 10) : null) : undefined,
        membresBureau: membresBureau !== undefined ? parseInt(membresBureau, 10) : undefined,
        enfantsBureau: enfantsBureau !== undefined ? parseInt(enfantsBureau, 10) : undefined,
        ordre: ordre !== undefined ? parseInt(ordre, 10) : undefined,
        actif,
      },
    })

    clearChatbotKnowledgeCache()

    return NextResponse.json({ groupe })
  } catch (error) {
    logger.withContext('Admin').error('Erreur lors de la mise à jour du groupe', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

// DELETE: Delete a group
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getAdminSession()
    if (!session) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const { id } = await params

    await prisma.groupe.delete({
      where: { id },
    })

    clearChatbotKnowledgeCache()

    return NextResponse.json({ success: true })
  } catch (error) {
    logger.withContext('Admin').error('Erreur lors de la suppression du groupe', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
