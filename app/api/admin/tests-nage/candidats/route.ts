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
        telephoneParent: validated.telephoneParent ? validated.telephoneParent.trim() : null,
        statut: 'a_planifier',
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
