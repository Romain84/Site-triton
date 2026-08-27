import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/api/guards'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const importSchema = z.object({
  sessionId: z.string().optional().nullable(),
  texteBrut: z.string().min(2, 'Le contenu à importer est vide'),
})

// Helper pour nettoyer et réparer un numéro de téléphone (notamment export géant Excel)
function cleanPhone(raw?: string): string | undefined {
  if (!raw) return undefined
  const digits = raw.replace(/\D/g, '')
  if (!digits) return undefined

  if (digits.startsWith('33') && digits.length === 11) {
    return '0' + digits.slice(2)
  }
  if (digits.length === 10 && digits.startsWith('0')) {
    return digits
  }
  if (digits.length === 9 && (digits.startsWith('6') || digits.startsWith('7'))) {
    return '0' + digits
  }
  if (digits.length > 10 && (digits.startsWith('6') || digits.startsWith('7'))) {
    return '0' + digits.slice(0, 9)
  }
  return digits
}

// Helper pour parser une ligne de texte (séparateurs: tab, point-virgule, virgule)
function parseLine(line: string): {
  nom: string
  prenom: string
  age?: number
  dateNaissance?: Date
  nomParent?: string
  emailParent?: string
  telephoneParent?: string
  groupeRecommande?: string
  commentaireCoach?: string
} | null {
  const trimmed = line.trim()
  if (!trimmed || trimmed.startsWith('#')) return null

  // Détection du délimiteur (tabulation, point-virgule ou virgule)
  let parts: string[] = []
  if (trimmed.includes('\t')) {
    parts = trimmed.split('\t').map((p) => p.trim())
  } else if (trimmed.includes(';')) {
    parts = trimmed.split(';').map((p) => p.trim())
  } else if (trimmed.includes(',')) {
    // Ne pas couper sur les virgules si c'est deux emails : afsouk@hotmail.com,jlcarliez@gmail.com
    // On vérifie si la virgule est un séparateur CSV ou une liste d'emails
    if (!trimmed.includes('@') || trimmed.split(',').length > 3) {
      parts = trimmed.split(',').map((p) => p.trim())
    } else {
      parts = trimmed.split(/\s+/).map((p) => p.trim())
    }
  } else {
    // Espace simple : "DUPONT Jean 7 0600000000 email"
    parts = trimmed.split(/\s+/).map((p) => p.trim())
  }

  // Filtrer les chaînes vides
  parts = parts.filter(Boolean)
  if (parts.length < 2) return null

  // On ignore la ligne d'en-tête courante (Nom, Prénom, etc.)
  const first = parts[0].toLowerCase()
  const second = parts[1].toLowerCase()
  if (
    (first.includes('nom') && second.includes('prénom')) ||
    (first.includes('nom') && second.includes('prenom')) ||
    (first.includes('enfant') && second.includes('parent'))
  ) {
    return null
  }

  const nom = parts[0]
  const prenom = parts[1]
  let age: number | undefined = undefined
  let dateNaissance: Date | undefined = undefined
  let emailParent: string | undefined = undefined
  let telephoneParent: string | undefined = undefined
  let nomParent: string | undefined = undefined
  let groupeRecommande: string | undefined = undefined
  const extraInfos: string[] = []

  // Parcourir les colonnes restantes pour détecter automatiquement l'âge, l'email, le téléphone
  for (let i = 2; i < parts.length; i++) {
    const val = parts[i]

    // Détection email (simple ou multiple avec virgule)
    if (val.includes('@') && val.includes('.')) {
      emailParent = val
      continue
    }

    // Détection téléphone (y compris notation géante Excel)
    const digitsOnly = val.replace(/\s+/g, '')
    if (
      /^(?:(?:\+|00)33|0)\s*[1-9](?:[\s.-]*\d{2}){4}$/.test(val) ||
      /^0[1-9]\d{8}$/.test(digitsOnly) ||
      (/^\d{9,25}$/.test(digitsOnly) && (digitsOnly.startsWith('6') || digitsOnly.startsWith('7')))
    ) {
      telephoneParent = cleanPhone(val)
      continue
    }

    // Détection date de naissance (ex: 15/04/2018 ou 2018-04-15)
    if (/^\d{2}[/-]\d{2}[/-]\d{4}$/.test(val)) {
      const [d, m, y] = val.split(/[/-]/).map(Number)
      const parsed = new Date(y, m - 1, d)
      if (!isNaN(parsed.getTime())) {
        dateNaissance = parsed
        const today = new Date()
        let calculatedAge = today.getFullYear() - y
        const monthDiff = today.getMonth() - (m - 1)
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < d)) {
          calculatedAge--
        }
        age = calculatedAge
        continue
      }
    } else if (/^\d{4}-\d{2}-\d{2}$/.test(val)) {
      const parsed = new Date(val)
      if (!isNaN(parsed.getTime())) {
        dateNaissance = parsed
        age = new Date().getFullYear() - parsed.getFullYear()
        continue
      }
    }

    // Détection âge direct (un nombre entre 3 et 30)
    if (/^\d{1,2}$/.test(val)) {
      const num = parseInt(val, 10)
      if (num >= 3 && num <= 30 && age === undefined) {
        age = num
        continue
      }
    }

    // Détection formule de groupe (ex: "ENF 2", "Avenir 3", "Juniors Loisirs")
    if (
      /enf|avenir|jeune|junior|adulte|benjamin/i.test(val) &&
      !groupeRecommande
    ) {
      groupeRecommande = val.replace(/\(En cours\)|\(Pré-validé\)/gi, '').trim()
      extraInfos.push(`Formule : ${val}`)
      continue
    }

    // Détection genre
    if (/^(féminin|masculin|fille|garçon|feminin|f|m)$/i.test(val)) {
      extraInfos.push(`Genre : ${val}`)
      continue
    }

    // Sinon, autre note ou nom du parent
    if (!nomParent && val.length >= 2 && !val.toUpperCase().startsWith('TEST')) {
      nomParent = val
    } else {
      extraInfos.push(val)
    }
  }

  return {
    nom: nom.toUpperCase(),
    prenom,
    age,
    dateNaissance,
    nomParent,
    emailParent,
    telephoneParent,
    groupeRecommande,
    commentaireCoach: extraInfos.length > 0 ? extraInfos.join(' | ') : undefined,
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdmin()
    if (!auth.ok) return auth.response

    const body = await request.json()
    const validated = importSchema.parse(body)

    // 1. Récupérer les candidats déjà existants dans la base pour éviter les doublons
    const existingCandidats = await prisma.candidatTestNage.findMany({
      select: {
        nom: true,
        prenom: true,
      },
    })

    const normalizeKey = (nom: string, prenom: string) => {
      return `${nom.trim().toUpperCase()}|${prenom.trim().toLowerCase()}`
    }

    const existingKeys = new Set(
      existingCandidats.map((c) => normalizeKey(c.nom, c.prenom))
    )

    // Suivi des doublons dans le fichier d'import lui-même
    const seenInImport = new Set<string>()
    let ignoredCount = 0

    const lines = validated.texteBrut.split(/\r?\n/)
    const parsedList: Array<{
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

    for (const line of lines) {
      const parsed = parseLine(line)
      if (parsed) {
        const key = normalizeKey(parsed.nom, parsed.prenom)
        // Si le candidat existe déjà en base ou a déjà été traité dans ce fichier, on l'ignore
        if (existingKeys.has(key) || seenInImport.has(key)) {
          ignoredCount++
          continue
        }
        seenInImport.add(key)

        parsedList.push({
          sessionId: validated.sessionId || null,
          nom: parsed.nom,
          prenom: parsed.prenom,
          dateNaissance: parsed.dateNaissance || null,
          age: parsed.age || null,
          nomParent: parsed.nomParent || null,
          emailParent: parsed.emailParent || null,
          telephoneParent: parsed.telephoneParent || null,
          groupeRecommande: parsed.groupeRecommande || null,
          commentaireCoach: parsed.commentaireCoach || null,
          statut: 'a_planifier',
        })
      }
    }

    if (parsedList.length === 0) {
      if (ignoredCount > 0) {
        return NextResponse.json({
          success: true,
          count: 0,
          ignored: ignoredCount,
          message: `Aucun nouveau candidat à importer : les ${ignoredCount} candidat(s) du fichier existent déjà dans votre base.`,
        })
      }
      return NextResponse.json(
        { error: 'Aucun candidat valide détecté dans le texte. Vérifiez le format (au moins Nom et Prénom).' },
        { status: 400 }
      )
    }

    // Insertion en masse des nouveaux candidats uniquement
    const createdCount = await prisma.candidatTestNage.createMany({
      data: parsedList,
    })

    const successMessage = ignoredCount > 0
      ? `${createdCount.count} nouveau(x) candidat(s) importé(s) avec succès ! (${ignoredCount} déjà existant(s) ignoré(s))`
      : `${createdCount.count} candidat(s) importé(s) avec succès !`

    return NextResponse.json({
      success: true,
      count: createdCount.count,
      ignored: ignoredCount,
      message: successMessage,
    })
  } catch (error) {
    console.error('Erreur import candidats:', error)
    return NextResponse.json({ error: "Erreur lors de l'import des candidats" }, { status: 500 })
  }
}
