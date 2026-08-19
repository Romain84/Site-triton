import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/api/guards'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const createSessionSchema = z.object({
  titre: z.string().min(2, 'Le titre est requis'),
  description: z.string().optional().nullable(),
  lieu: z.string().default('Piscine couverte Alphonse Roudière'),
  date: z.string().transform((str) => new Date(str)),
  heureDebut: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Format HH:MM requis'),
  heureFin: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Format HH:MM requis'),
  dureeMinutes: z.number().int().min(1).max(60).default(5),
  capaciteParCreneau: z.number().int().min(1).max(20).default(2),
  consignes: z.string().optional().nullable(),
  actif: z.boolean().default(true),
})

// Helper pour convertir "HH:MM" en minutes depuis minuit
function timeToMinutes(timeStr: string): number {
  const [hours, minutes] = timeStr.split(':').map(Number)
  return hours * 60 + minutes
}

// Helper pour convertir les minutes depuis minuit en "HH:MM"
function minutesToTime(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`
}

export async function GET() {
  try {
    const auth = await requireAdmin()
    if (!auth.ok) return auth.response

    const sessions = await prisma.sessionTestNage.findMany({
      orderBy: { date: 'desc' },
      include: {
        creneaux: {
          orderBy: { heureDebut: 'asc' },
          include: {
            inscriptions: {
              where: { statut: { not: 'annule' } },
              select: {
                id: true,
                nomEnfant: true,
                prenomEnfant: true,
                age: true,
                dateNaissance: true,
                nomParent: true,
                emailParent: true,
                telephoneParent: true,
                niveauEstime: true,
                remarques: true,
                statut: true,
                groupeRecommande: true,
                commentaireCoach: true,
                createdAt: true,
              },
            },
          },
        },
        _count: {
          select: { candidats: true },
        },
      },
    })

    // Calculer les statistiques globales par session
    const sessionsWithStats = sessions.map((s) => {
      let totalPlaces = 0
      let totalInscrits = 0
      let totalPresents = 0
      let totalAbsents = 0

      s.creneaux.forEach((cr) => {
        if (cr.actif) totalPlaces += cr.capacite
        totalInscrits += cr.inscriptions.length
        cr.inscriptions.forEach((insc) => {
          if (insc.statut === 'present') totalPresents++
          if (insc.statut === 'absent') totalAbsents++
        })
      })

      return {
        ...s,
        stats: {
          nbCreneaux: s.creneaux.length,
          totalPlaces,
          totalInscrits,
          placesRestantes: Math.max(0, totalPlaces - totalInscrits),
          totalPresents,
          totalAbsents,
          totalCandidatsListing: s._count.candidats,
        },
      }
    })

    return NextResponse.json({
      success: true,
      sessions: sessionsWithStats,
    })
  } catch (error) {
    console.error('Erreur GET admin sessions tests-nage:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdmin()
    if (!auth.ok) return auth.response

    const body = await request.json()
    const validated = createSessionSchema.parse(body)

    const startMinutes = timeToMinutes(validated.heureDebut)
    const endMinutes = timeToMinutes(validated.heureFin)

    if (endMinutes <= startMinutes) {
      return NextResponse.json(
        { error: "L'heure de fin doit être postérieure à l'heure de début." },
        { status: 400 }
      )
    }

    // 1. Calculer tous les créneaux de 5 min (ou dureeMinutes)
    const creneauxData: Array<{ heureDebut: string; heureFin: string; capacite: number }> = []
    let currentMin = startMinutes
    const step = validated.dureeMinutes

    while (currentMin + step <= endMinutes) {
      const hDebut = minutesToTime(currentMin)
      const hFin = minutesToTime(currentMin + step)
      creneauxData.push({
        heureDebut: hDebut,
        heureFin: hFin,
        capacite: validated.capaciteParCreneau,
      })
      currentMin += step
    }

    if (creneauxData.length === 0) {
      return NextResponse.json(
        { error: 'La plage horaire définie est trop courte pour générer au moins un créneau.' },
        { status: 400 }
      )
    }

    // 2. Créer la session et ses créneaux en base
    const session = await prisma.sessionTestNage.create({
      data: {
        titre: validated.titre,
        description: validated.description || null,
        lieu: validated.lieu,
        date: validated.date,
        heureDebut: validated.heureDebut,
        heureFin: validated.heureFin,
        dureeMinutes: validated.dureeMinutes,
        capaciteParCreneau: validated.capaciteParCreneau,
        consignes: validated.consignes || undefined,
        actif: validated.actif,
        creneaux: {
          create: creneauxData,
        },
      },
      include: {
        creneaux: true,
      },
    })

    return NextResponse.json({
      success: true,
      message: `Session créée avec succès (${session.creneaux.length} créneaux générés automatiquement)`,
      session,
    })
  } catch (error) {
    console.error('Erreur POST admin sessions tests-nage:', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Données invalides', details: error.flatten() },
        { status: 400 }
      )
    }
    return NextResponse.json({ error: 'Erreur lors de la création de la session' }, { status: 500 })
  }
}
