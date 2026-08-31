import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/api/guards'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const importSchema = z.object({
  sessionId: z.string().optional().nullable(),
  texteBrut: z.string().min(2, 'Le contenu à importer est vide'),
})

// Formate un numéro à 10 chiffres en standard français : 06 12 34 56 78
function formatPhoneFr(phone: string): string {
  const digits = phone.replace(/\D/g, '')
  if (digits.length === 10) {
    return digits.replace(/(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})/, '$1 $2 $3 $4 $5')
  }
  return phone
}

// Nettoie et répare les numéros de téléphone (y compris exports corrompus Excel de 18-20 chiffres avec espaces)
export function cleanPhone(raw?: string): string | undefined {
  if (!raw) return undefined
  const trimmed = raw.trim()
  if (!trimmed) return undefined

  // Cas spécial : deux numéros séparés par virgule, point-virgule ou slash
  if (/[/,;]/.test(trimmed)) {
    const parts = trimmed.split(/[/,;]/).map((p) => cleanPhone(p)).filter(Boolean)
    if (parts.length > 0) return parts.join(' / ')
  }

  const digits = trimmed.replace(/\D/g, '')
  if (!digits) return undefined

  // International commençant par 33 (ex: 33641472950 -> 06 41 47 29 50)
  if (digits.startsWith('33') && digits.length >= 11) {
    const main = '0' + digits.slice(2, 11)
    return formatPhoneFr(main)
  }

  // Numéro standard à 10 chiffres commençant par 0 (ex: 0784024886)
  if (digits.length === 10 && digits.startsWith('0')) {
    return formatPhoneFr(digits)
  }

  // 9 chiffres commençant par 6, 7, 4, 1, 9 (ex: 784024886 -> 07 84 02 48 86)
  if (digits.length === 9 && /^[1-9]/.test(digits)) {
    return formatPhoneFr('0' + digits)
  }

  // Export Excel géant (ex: 7 840 248 860 672 440 000 -> 07 84 02 48 86 / 06 72 44 ...)
  if (digits.length >= 18 && /^[1-9]/.test(digits)) {
    const first9 = digits.slice(0, 9)
    const phone1 = formatPhoneFr('0' + first9)

    // Vérifier si la seconde moitié contient un 2ème numéro
    const rest = digits.slice(9)
    const restWithoutLeadingZeros = rest.replace(/^0+/, '')
    if (restWithoutLeadingZeros.length >= 8 && /^[1-9]/.test(restWithoutLeadingZeros)) {
      const second9 = restWithoutLeadingZeros.slice(0, 9)
      const phone2 = formatPhoneFr('0' + second9)
      return `${phone1} / ${phone2}`
    }
    return phone1
  }

  // Fallback si chaîne de chiffres longue (> 10) commençant par 6 ou 7
  if (digits.length > 10 && (digits.startsWith('6') || digits.startsWith('7'))) {
    return formatPhoneFr('0' + digits.slice(0, 9))
  }

  return formatPhoneFr(digits)
}

// Nettoie et formate les emails (supporte plusieurs emails séparés par virgule)
export function cleanEmail(raw?: string): string | undefined {
  if (!raw) return undefined
  const emails = raw
    .split(/[,;\s]+/)
    .map((e) => e.trim().toLowerCase())
    .filter((e) => e.includes('@') && e.includes('.'))

  if (emails.length === 0) return undefined
  return emails.join(', ')
}

// Normalise la formule en nom de groupe standardisé
export function normalizeGroupe(formule?: string): string | undefined {
  if (!formule) return undefined
  const cleaned = formule.replace(/\(En cours\)|\(Pré-validé\)/gi, '').trim()
  const upper = cleaned.toUpperCase()

  if (upper.includes('ENF2') || upper.includes('ENF 2')) {
    if (upper.includes('MERCREDI')) return 'ENF 2 (Mercredi)'
    return 'ENF 2'
  }
  if (upper.includes('ENF1') || upper.includes('ENF 1')) {
    if (upper.includes('MERCREDI')) return 'ENF 1 (Mercredi)'
    return 'ENF 1'
  }
  if (upper.includes('AVENIR 1') || upper.includes('AVENIRS 1')) return 'AVENIR 1'
  if (upper.includes('AVENIR 2') || upper.includes('AVENIRS 2')) return 'AVENIR 2'
  if (upper.includes('AVENIR 3') || upper.includes('AVENIRS 3')) return 'AVENIR 3'
  if (upper.includes('AVENIR LOISIR') || upper.includes('AVENIRS LOISIR')) return 'AVENIR LOISIR'
  if (upper.includes('JEUNE LOISIR') || upper.includes('JEUNES LOISIR')) return 'JEUNE LOISIR'
  if (upper.includes('JUNIOR')) return 'JUNIORS LOISIRS'
  if (upper.includes('ADULTE')) return 'ADULTES LOISIRS'

  return cleaned
}

// Parse une date française (JJ/MM/AAAA ou AAAA-MM-JJ) et calcule l'âge
export function parseDateNaissance(raw?: string): { date?: Date; age?: number } {
  if (!raw) return {}
  const trimmed = raw.trim()

  if (/^\d{2}[/-]\d{2}[/-]\d{4}$/.test(trimmed)) {
    const [d, m, y] = trimmed.split(/[/-]/).map(Number)
    const parsed = new Date(y, m - 1, d)
    if (!isNaN(parsed.getTime())) {
      const today = new Date()
      let age = today.getFullYear() - y
      const monthDiff = today.getMonth() - (m - 1)
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < d)) {
        age--
      }
      return { date: parsed, age: Math.max(0, age) }
    }
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    const parsed = new Date(trimmed)
    if (!isNaN(parsed.getTime())) {
      const today = new Date()
      let age = today.getFullYear() - parsed.getFullYear()
      const monthDiff = today.getMonth() - parsed.getMonth()
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < parsed.getDate())) {
        age--
      }
      return { date: parsed, age: Math.max(0, age) }
    }
  }

  return {}
}

interface ColumnMap {
  nom: number
  prenom: number
  dateNaissance?: number
  email?: number
  telephone?: number
  genre?: number
  formule?: number
  notes?: number
  parent?: number
}

// Détecte si la première ligne est un en-tête et construit la carte des colonnes
function detectHeader(cells: string[]): ColumnMap | null {
  if (cells.length < 2) return null

  let nom = -1
  let prenom = -1
  let dateNaissance: number | undefined
  let email: number | undefined
  let telephone: number | undefined
  let genre: number | undefined
  let formule: number | undefined
  let notes: number | undefined
  let parent: number | undefined

  cells.forEach((rawCell, idx) => {
    const c = rawCell.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')

    if (nom === -1 && (c === 'nom' || c.includes('nom de famille') || c.includes('nom enfant') || c === 'last name')) {
      nom = idx
    } else if (prenom === -1 && (c === 'prenom' || c.includes('prenom enfant') || c === 'first name')) {
      prenom = idx
    } else if (c.includes('naissance') || c.includes('ddn') || c.includes('birth') || (c.includes('date') && !c.includes('test'))) {
      dateNaissance = idx
    } else if (c.includes('email') || c.includes('mail') || c.includes('courriel')) {
      email = idx
    } else if (c.includes('tel') || c.includes('phone') || c.includes('mobile')) {
      telephone = idx
    } else if (c.includes('genre') || c.includes('sexe') || c.includes('civilite')) {
      genre = idx
    } else if (c.includes('formule') || c.includes('groupe') || c.includes('activite') || c.includes('cours') || c.includes('section')) {
      formule = idx
    } else if (c.includes('note') || c.includes('remarque') || c.includes('obs') || c.includes('commentaire') || c.includes('niveau')) {
      notes = idx
    } else if (c.includes('parent') || c.includes('responsable') || c.includes('tuteur')) {
      parent = idx
    }
  })

  if (nom !== -1 && prenom !== -1) {
    return { nom, prenom, dateNaissance, email, telephone, genre, formule, notes, parent }
  }

  return null
}

// Découpe une ligne selon le bon séparateur (tabulation, point-virgule, virgule)
function splitRow(row: string): string[] {
  const trimmed = row.trim()
  if (!trimmed) return []

  if (trimmed.includes('\t')) {
    return trimmed.split('\t').map((p) => p.trim())
  }
  if (trimmed.includes(';')) {
    return trimmed.split(';').map((p) => p.trim())
  }
  // Découpage par virgule en respectant les emails séparés par des virgules
  if (trimmed.includes(',')) {
    // Si la ligne contient plusieurs virgules hors email
    const parts = trimmed.split(',').map((p) => p.trim())
    if (parts.length >= 3) {
      return parts
    }
  }

  return trimmed.split(/\s{2,}|\t/).map((p) => p.trim())
}

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
