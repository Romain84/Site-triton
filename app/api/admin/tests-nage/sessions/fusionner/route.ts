import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/api/guards'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const fusionnerSchema = z.object({
  sourceSessionId: z.string().min(1, 'La session source est requise'),
  targetSessionId: z.string().min(1, 'La session cible est requise'),
})

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdmin()
    if (!auth.ok) return auth.response

    const body = await request.json()
    const { sourceSessionId, targetSessionId } = fusionnerSchema.parse(body)

    if (sourceSessionId === targetSessionId) {
      return NextResponse.json(
        { error: 'Veuillez sélectionner deux sessions distinctes pour la fusion.' },
        { status: 400 }
      )
    }

    const result = await prisma.$transaction(async (tx) => {
      // 1. Récupérer les deux sessions
      const source = await tx.sessionTestNage.findUnique({
        where: { id: sourceSessionId },
        include: { creneaux: { include: { inscriptions: true } } },
      })
      const target = await tx.sessionTestNage.findUnique({
        where: { id: targetSessionId },
        include: { creneaux: { include: { inscriptions: true } } },
      })

      if (!source || !target) {
        throw new Error('Une des sessions est introuvable.')
      }

      // 2. Fusion intelligente des créneaux :
      // Si un créneau existe déjà sur la session cible aux mêmes horaires (ex: 14:00-14:10),
      // on transfère les inscriptions et on additionne les capacités (ex: 3 + 1 = 4 places).
      // Sinon, on déplace simplement le créneau vers la session cible.
      for (const sourceCr of source.creneaux) {
        const matchingTargetCr = target.creneaux.find(
          (t) => t.heureDebut === sourceCr.heureDebut && t.heureFin === sourceCr.heureFin
        )

        if (matchingTargetCr) {
          // Déplacer les inscriptions vers le créneau cible existant
          if (sourceCr.inscriptions.length > 0) {
            await tx.inscriptionTestNage.updateMany({
              where: { creneauId: sourceCr.id },
              data: { creneauId: matchingTargetCr.id },
            })
          }

          // Cumuler la capacité (ex: 3 places + 1 place = 4 places)
          await tx.creneauTestNage.update({
            where: { id: matchingTargetCr.id },
            data: {
              capacite: matchingTargetCr.capacite + sourceCr.capacite,
            },
          })

          // Supprimer le créneau source devenu redondant
          await tx.creneauTestNage.delete({
            where: { id: sourceCr.id },
          })
        } else {
          // Pas de doublon horaire : rattacher directement le créneau à la session cible
          await tx.creneauTestNage.update({
            where: { id: sourceCr.id },
            data: { sessionId: targetSessionId },
          })
        }
      }

      // 3. Déplacer les fiches candidats rattachées
      await tx.candidatTestNage.updateMany({
        where: { sessionId: sourceSessionId },
        data: { sessionId: targetSessionId },
      })

      // 4. Calculer la nouvelle amplitude horaire min(heureDebut) et max(heureFin)
      const allHeuresDebut = [source.heureDebut, target.heureDebut].filter(Boolean).sort()
      const allHeuresFin = [source.heureFin, target.heureFin].filter(Boolean).sort()
      const newHeureDebut = allHeuresDebut[0] || target.heureDebut
      const newHeureFin = allHeuresFin[allHeuresFin.length - 1] || target.heureFin

      // 5. Mettre à jour l'amplitude horaire de la session cible
      const updatedTarget = await tx.sessionTestNage.update({
        where: { id: targetSessionId },
        data: {
          heureDebut: newHeureDebut,
          heureFin: newHeureFin,
        },
      })

      // 6. Supprimer la session source devenue vide
      await tx.sessionTestNage.delete({
        where: { id: sourceSessionId },
      })

      return updatedTarget
    })

    return NextResponse.json({
      success: true,
      message: `Sessions fusionnées avec succès sous "${result.titre}". Toutes les inscriptions et fiches ont été conservées.`,
      session: result,
    })
  } catch (error: any) {
    console.error('Erreur fusion sessions:', error)
    return NextResponse.json(
      { error: error?.message || 'Erreur lors de la fusion des sessions' },
      { status: 500 }
    )
  }
}
