import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/api/guards'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const importSchema = z.object({
  sessionId: z.string().optional().nullable(),
  texteBrut: z.string().min(2, 'Le contenu à importer est vide'),
})

// Helper pour parser une ligne de texte (séparateurs: tab, point-virgule, virgule)
function parseLine(line: string): {
  nom: string
  prenom: string
  age?: number
  dateNaissance?: Date
  nomParent?: string
  emailParent?: string
  telephoneParent?: string
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
    parts = trimmed.split(',').map((p) => p.trim())
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

  // Parcourir les colonnes restantes pour détecter automatiquement l'âge, l'email, le téléphone
  for (let i = 2; i < parts.length; i++) {
    const val = parts[i]

    // Détection email
    if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) {
      emailParent = val.toLowerCase()
      continue
    }

    // Détection téléphone (au moins 6 chiffres avec espaces/points éventuels)
    if (/^(?:(?:\+|00)33|0)\s*[1-9](?:[\s.-]*\d{2}){4}$/.test(val) || /^0[1-9]\d{8}$/.test(val.replace(/\s+/g, ''))) {
      telephoneParent = val
      continue
    }

    // Détection date de naissance (ex: 15/04/2018 ou 2018-04-15)
    if (/^\d{2}[/-]\d{2}[/-]\d{4}$/.test(val)) {
      const [d, m, y] = val.split(/[/-]/).map(Number)
      const parsed = new Date(y, m - 1, d)
      if (!isNaN(parsed.getTime())) {
        dateNaissance = parsed
        age = new Date().getFullYear() - y
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

    // Détection âge direct (un nombre entre 3 et 25)
    if (/^\d{1,2}$/.test(val)) {
      const num = parseInt(val, 10)
      if (num >= 3 && num <= 30 && age === undefined) {
        age = num
        continue
      }
    }

    // Sinon, nom du parent si non encore assigné
    if (!nomParent && val.length >= 2) {
      nomParent = val
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
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdmin()
    if (!auth.ok) return auth.response

    const body = await request.json()
    const validated = importSchema.parse(body)

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
      statut: string
    }> = []

    for (const line of lines) {
      const parsed = parseLine(line)
      if (parsed) {
        parsedList.push({
          sessionId: validated.sessionId || null,
          nom: parsed.nom,
          prenom: parsed.prenom,
          dateNaissance: parsed.dateNaissance || null,
          age: parsed.age || null,
          nomParent: parsed.nomParent || null,
          emailParent: parsed.emailParent || null,
          telephoneParent: parsed.telephoneParent || null,
          statut: 'a_planifier',
        })
      }
    }

    if (parsedList.length === 0) {
      return NextResponse.json(
        { error: 'Aucun candidat valide détecté dans le texte. Vérifiez le format (au moins Nom et Prénom).' },
        { status: 400 }
      )
    }

    // Insertion en masse
    const createdCount = await prisma.candidatTestNage.createMany({
      data: parsedList,
    })

    return NextResponse.json({
      success: true,
      count: createdCount.count,
      message: `${createdCount.count} candidat(s) importé(s) avec succès !`,
    })
  } catch (error) {
    console.error('Erreur import candidats:', error)
    return NextResponse.json({ error: "Erreur lors de l'import des candidats" }, { status: 500 })
  }
}
