import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/api/guards'
import { z } from 'zod'
import {
  cleanPhone,
  cleanEmail,
  normalizeGroupe,
  parseDateNaissance,
  detectHeader,
  splitRow,
} from '@/lib/test-nage-candidat-import'

export const dynamic = 'force-dynamic'

const importSchema = z.object({
  sessionId: z.string().optional().nullable(),
  texteBrut: z.string().min(2, 'Le contenu à importer est vide'),
})

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdmin()
    if (!auth.ok) return auth.response

    const body = await request.json()
    const validated = importSchema.parse(body)

    // 1. Récupérer les candidats déjà existants dans la base avec leurs données actuelles
    const existingCandidats = await prisma.candidatTestNage.findMany({
      select: {
        id: true,
        nom: true,
        prenom: true,
        dateNaissance: true,
        age: true,
        nomParent: true,
        emailParent: true,
        telephoneParent: true,
        groupeRecommande: true,
        commentaireCoach: true,
      },
    })

    const normalizeKey = (nom: string, prenom: string) => {
      return `${nom.trim().toUpperCase()}|${prenom.trim().toLowerCase()}`
    }

    const existingMap = new Map<string, (typeof existingCandidats)[0]>()
    existingCandidats.forEach((c) => {
      existingMap.set(normalizeKey(c.nom, c.prenom), c)
    })

    const seenInImport = new Set<string>()
    let updatedCount = 0
    let unchangedCount = 0

    // 2. Traitement ligne par ligne
    const rawLines = validated.texteBrut.split(/\r?\n/).filter((l) => l.trim().length > 0)
    if (rawLines.length === 0) {
      return NextResponse.json({ error: 'Le contenu à importer est vide' }, { status: 400 })
    }

    // Détection éventuelle de l'en-tête sur la première ligne
    const firstRowCells = splitRow(rawLines[0])
    const headerMap = detectHeader(firstRowCells)
    const startIndex = headerMap ? 1 : 0

    const toCreateList: Array<{
      sessionId: string | null
      nom: string
      prenom: string
      dateNaissance: Date | null
      age: number | null
      nomParent: string | null
      emailParent: string | null
      telephoneParent: string | null
      groupeRecommande?: string | null
      commentaireCoach?: string | null
      statut: string
    }> = []

    for (let i = startIndex; i < rawLines.length; i++) {
      const line = rawLines[i].trim()
      if (!line || line.startsWith('#')) continue

      const cells = splitRow(line)
      if (cells.length < 2) continue

      let nom = ''
      let prenom = ''
      let dateNaissance: Date | undefined
      let age: number | undefined
      let emailParent: string | undefined
      let telephoneParent: string | undefined
      let nomParent: string | undefined
      let groupeRecommande: string | undefined
      const metadataItems: string[] = []

      if (headerMap) {
        // Extraction basée sur la correspondance exacte des colonnes
        nom = cells[headerMap.nom] || ''
        prenom = cells[headerMap.prenom] || ''

        if (headerMap.dateNaissance !== undefined && cells[headerMap.dateNaissance]) {
          const parsed = parseDateNaissance(cells[headerMap.dateNaissance])
          dateNaissance = parsed.date
          age = parsed.age
        }

        if (headerMap.email !== undefined && cells[headerMap.email]) {
          emailParent = cleanEmail(cells[headerMap.email])
        }

        if (headerMap.telephone !== undefined && cells[headerMap.telephone]) {
          telephoneParent = cleanPhone(cells[headerMap.telephone])
        }

        if (headerMap.genre !== undefined && cells[headerMap.genre]) {
          const g = cells[headerMap.genre].trim()
          const gNorm = /fem|fille/i.test(g) ? 'Féminin' : /masc|garcon/i.test(g) ? 'Masculin' : g
          metadataItems.push(`Genre : ${gNorm}`)
        }

        if (headerMap.formule !== undefined && cells[headerMap.formule]) {
          const f = cells[headerMap.formule].trim()
          groupeRecommande = normalizeGroupe(f)
          metadataItems.push(`Formule : ${f}`)
        }

        if (headerMap.notes !== undefined && cells[headerMap.notes]) {
          const n = cells[headerMap.notes].trim()
          metadataItems.push(`Notes : ${n}`)
        }

        if (headerMap.parent !== undefined && cells[headerMap.parent]) {
          nomParent = cells[headerMap.parent].trim()
        }
      } else {
        // Mode détection heuristique automatique par motif
        nom = cells[0]
        prenom = cells[1]

        for (let c = 2; c < cells.length; c++) {
          const val = cells[c]

          // Détection Email
          if (val.includes('@') && val.includes('.')) {
            emailParent = cleanEmail(val)
            continue
          }

          // Détection Date de naissance
          const parsedDate = parseDateNaissance(val)
          if (parsedDate.date) {
            dateNaissance = parsedDate.date
            age = parsedDate.age
            continue
          }

          // Détection Téléphone (chiffres, 33, ou grand format Excel)
          const digitsOnly = val.replace(/\s+/g, '')
          if (
            /^(?:(?:\+|00)33|0)\s*[1-9](?:[\s.-]*\d{2}){4}$/.test(val) ||
            /^0[1-9]\d{8}$/.test(digitsOnly) ||
            (/^\d{9,25}$/.test(digitsOnly) && (digitsOnly.startsWith('6') || digitsOnly.startsWith('7') || digitsOnly.startsWith('33')))
          ) {
            telephoneParent = cleanPhone(val)
            continue
          }

          // Détection Genre
          if (/^(féminin|masculin|fille|garçon|feminin|f|m)$/i.test(val)) {
            const gNorm = /fem|f|fille/i.test(val) ? 'Féminin' : 'Masculin'
            metadataItems.push(`Genre : ${gNorm}`)
            continue
          }

          // Détection Formule / Groupe
          if (/enf|avenir|jeune|junior|adulte|benjamin/i.test(val) && !groupeRecommande) {
            groupeRecommande = normalizeGroupe(val)
            metadataItems.push(`Formule : ${val}`)
            continue
          }

          // Détection Notes ou Parent
          if (val.toUpperCase().startsWith('TEST') || val.length > 15) {
            metadataItems.push(`Notes : ${val}`)
          } else if (!nomParent && val.length >= 2) {
            nomParent = val
          } else {
            metadataItems.push(val)
          }
        }
      }

      if (!nom || !prenom) continue

      const key = normalizeKey(nom, prenom)
      if (seenInImport.has(key)) continue
      seenInImport.add(key)

      const existing = existingMap.get(key)

      if (existing) {
        // Candidat déjà existant : vérifier s'il manque des informations à compléter
        const updateData: {
          dateNaissance?: Date
          age?: number
          nomParent?: string
          emailParent?: string
          telephoneParent?: string
          groupeRecommande?: string
          commentaireCoach?: string
        } = {}

        if (!existing.dateNaissance && dateNaissance) {
          updateData.dateNaissance = dateNaissance
          if (age !== undefined) updateData.age = age
        } else if (existing.age === null && age !== undefined) {
          updateData.age = age
        }

        if (!existing.emailParent && emailParent) {
          updateData.emailParent = emailParent
        }

        if (!existing.telephoneParent && telephoneParent) {
          updateData.telephoneParent = telephoneParent
        }

        if (!existing.nomParent && nomParent) {
          updateData.nomParent = nomParent
        }

        if (!existing.groupeRecommande && groupeRecommande) {
          updateData.groupeRecommande = groupeRecommande
        }

        const newComment = metadataItems.length > 0 ? metadataItems.join(' | ') : undefined
        if (!existing.commentaireCoach && newComment) {
          updateData.commentaireCoach = newComment
        }

        if (Object.keys(updateData).length > 0) {
          // Mise à jour du candidat
          await prisma.candidatTestNage.update({
            where: { id: existing.id },
            data: updateData,
          })

          // Répercussion sur les inscriptions liées
          await prisma.inscriptionTestNage.updateMany({
            where: { candidatId: existing.id },
            data: {
              ...(updateData.dateNaissance ? { dateNaissance: updateData.dateNaissance } : {}),
              ...(updateData.age !== undefined ? { age: updateData.age } : {}),
              ...(updateData.emailParent ? { emailParent: updateData.emailParent } : {}),
              ...(updateData.telephoneParent ? { telephoneParent: updateData.telephoneParent } : {}),
              ...(updateData.groupeRecommande ? { groupeRecommande: updateData.groupeRecommande } : {}),
            },
          })

          updatedCount++
        } else {
          unchangedCount++
        }
      } else {
        // Nouveau candidat à créer
        toCreateList.push({
          sessionId: validated.sessionId || null,
          nom: nom.trim().toUpperCase(),
          prenom: prenom.trim(),
          dateNaissance: dateNaissance || null,
          age: age ?? null,
          nomParent: nomParent || null,
          emailParent: emailParent || null,
          telephoneParent: telephoneParent || null,
          groupeRecommande: groupeRecommande || null,
          commentaireCoach: metadataItems.length > 0 ? metadataItems.join(' | ') : null,
          statut: 'a_planifier',
        })
      }
    }

    // Insertion des nouveaux candidats
    let createdCount = 0
    if (toCreateList.length > 0) {
      const res = await prisma.candidatTestNage.createMany({
        data: toCreateList,
      })
      createdCount = res.count
    }

    if (createdCount === 0 && updatedCount === 0) {
      if (unchangedCount > 0) {
        return NextResponse.json({
          success: true,
          count: 0,
          updated: 0,
          ignored: unchangedCount,
          message: `Les ${unchangedCount} candidat(s) du fichier sont déjà présents et complets dans votre base.`,
        })
      }
      return NextResponse.json(
        { error: 'Aucun candidat valide détecté dans le texte. Vérifiez le format (au moins Nom et Prénom).' },
        { status: 400 }
      )
    }

    // Message de synthèse détaillé
    const messageParts: string[] = []
    if (createdCount > 0) {
      messageParts.push(`${createdCount} nouveau(x) candidat(s) importé(s)`)
    }
    if (updatedCount > 0) {
      messageParts.push(`${updatedCount} fiche(s) complétée(s) avec succès`)
    }
    if (unchangedCount > 0) {
      messageParts.push(`(${unchangedCount} déjà complet(s))`)
    }

    const successMessage = messageParts.join(', ') + ' !'

    return NextResponse.json({
      success: true,
      count: createdCount,
      updated: updatedCount,
      ignored: unchangedCount,
      message: successMessage,
    })
  } catch (error) {
    console.error('Erreur import candidats:', error)
    return NextResponse.json({ error: "Erreur lors de l'import des candidats" }, { status: 500 })
  }
}
