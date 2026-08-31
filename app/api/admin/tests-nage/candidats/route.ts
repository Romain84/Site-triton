import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/api/guards'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const candidatSchema = z.object({
  sessionId: z.string().optional().nullable(),
  nom: z.string().min(1, 'Le nom est requis'),
  prenom: z.string().min(1, 'Le prénom est requis'),
  dateNaissance: z.string().optional().nullable(),
  age: z.number().int().optional().nullable(),
  nomParent: z.string().optional().nullable(),
  emailParent: z.string().optional().nullable(),
  telephoneParent: z.string().optional().nullable(),
  statut: z.string().optional().nullable(),
  groupeRecommande: z.string().optional().nullable(),
  commentaireCoach: z.string().optional().nullable(),
})

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAdmin()
    if (!auth.ok) return auth.response

    const { searchParams } = new URL(request.url)
    const sessionId = searchParams.get('sessionId')
    const statut = searchParams.get('statut')

    // Réconciliation automatique : si des inscriptions existent sans fiche candidat liée, on leur crée leur fiche "hors_listing"
    const unlinkedInscriptions = await prisma.inscriptionTestNage.findMany({
      where: {
        candidatId: null,
        statut: { not: 'annule' },
      },
      include: {
        creneau: true,
      },
    })

    if (unlinkedInscriptions.length > 0) {
      for (const insc of unlinkedInscriptions) {
        try {
          const created = await prisma.candidatTestNage.create({
            data: {
              sessionId: insc.creneau.sessionId,
              nom: insc.nomEnfant,
              prenom: insc.prenomEnfant,
              age: insc.age,
              dateNaissance: insc.dateNaissance,
              nomParent: insc.nomParent,
              emailParent: insc.emailParent,
              telephoneParent: insc.telephoneParent,
              statut: 'hors_listing',
              commentaireCoach: '⚠️ HORS LISTING (Inscrit sans être dans le listing initial)',
            },
          })
          await prisma.inscriptionTestNage.update({
            where: { id: insc.id },
            data: { candidatId: created.id },
          })
        } catch (linkErr) {
          console.warn('Erreur réconciliation inscription hors listing:', linkErr)
        }
      }
    }

    // Synchronisation et prise en compte de la dernière relance (y compris celle d'hier)
    try {
      const relanceEmails = await prisma.emailQueue.findMany({
        where: {
          OR: [
            { subject: { contains: 'Test', mode: 'insensitive' } },
            { subject: { contains: 'Rappel', mode: 'insensitive' } },
            { html: { contains: 'tests-de-nage', mode: 'insensitive' } },
          ],
        },
        select: {
          to: true,
          html: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
        take: 200,
      })

      if (relanceEmails.length > 0) {
        for (const email of relanceEmails) {
          await prisma.candidatTestNage.updateMany({
            where: {
              emailParent: { equals: email.to, mode: 'insensitive' },
              OR: [
                { derniereRelance: null },
                { derniereRelance: { lt: email.createdAt } },
              ],
            },
            data: {
              derniereRelance: email.createdAt,
            },
          })
        }
      }

      // Prise en compte de la relance d'hier (samedi 29 août 2026) pour tous les candidats ayant un email
      const dateHierRelance = new Date('2026-08-29T14:30:00.000Z')
      await prisma.candidatTestNage.updateMany({
        where: {
          derniereRelance: null,
          emailParent: { not: null },
          createdAt: { lte: new Date('2026-08-30T00:00:00.000Z') },
        },
        data: {
          derniereRelance: dateHierRelance,
        },
      })
    } catch (relanceSyncErr) {
      console.warn('Note sync derniereRelance:', relanceSyncErr)
    }

    const candidats = await prisma.candidatTestNage.findMany({
      where: {
        ...(sessionId ? { sessionId } : {}),
        ...(statut ? { statut } : {}),
      },
      include: {
        session: {
          select: { id: true, titre: true, date: true },
        },
        inscriptions: {
          where: { statut: { not: 'annule' } },
          include: {
            creneau: {
              select: { heureDebut: true, heureFin: true, sessionId: true },
            },
          },
        },
      },
      orderBy: [{ nom: 'asc' }, { prenom: 'asc' }],
    })

    return NextResponse.json({
      success: true,
      candidats,
    })
  } catch (error) {
    console.error('Erreur GET candidats:', error)
    return NextResponse.json({ error: 'Erreur lors du chargement des candidats' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdmin()
    if (!auth.ok) return auth.response

    const body = await request.json()
    const validated = candidatSchema.parse(body)

    const candidat = await prisma.candidatTestNage.create({
      data: {
        sessionId: validated.sessionId || null,
        nom: validated.nom.trim().toUpperCase(),
        prenom: validated.prenom.trim(),
        dateNaissance: validated.dateNaissance ? new Date(validated.dateNaissance) : null,
        age: validated.age || null,
        nomParent: validated.nomParent ? validated.nomParent.trim() : null,
        emailParent: validated.emailParent ? validated.emailParent.trim().toLowerCase() : null,
        statut: validated.statut || 'a_planifier',
        groupeRecommande: validated.groupeRecommande || null,
        commentaireCoach: validated.commentaireCoach ? validated.commentaireCoach.trim() : null,
      },
    })

    return NextResponse.json({
      success: true,
      candidat,
    })
  } catch (error) {
    console.error('Erreur POST candidat:', error)
    return NextResponse.json({ error: "Erreur lors de l'ajout du candidat" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const auth = await requireAdmin()
    if (!auth.ok) return auth.response

    const { searchParams } = new URL(request.url)
    const sessionId = searchParams.get('sessionId')
    const statut = searchParams.get('statut')

    // Suppression en masse de tous les candidats (ou filtrés par session / statut)
    const result = await prisma.candidatTestNage.deleteMany({
      where: {
        ...(sessionId ? { sessionId } : {}),
        ...(statut ? { statut } : {}),
      },
    })

    return NextResponse.json({
      success: true,
      count: result.count,
      message: `${result.count} candidat(s) supprimé(s) avec succès.`,
    })
  } catch (error) {
    console.error('Erreur DELETE all candidats:', error)
    return NextResponse.json({ error: 'Erreur lors de la suppression de la liste des candidats' }, { status: 500 })
  }
}
