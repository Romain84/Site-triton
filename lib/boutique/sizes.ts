/**
 * Utilitaire de tri logique des tailles et variantes de la boutique.
 * Permet de classer automatiquement les tailles dans un ordre naturel :
 * 1. Enfants / Juniors par âge croissant (ex: 6 Ans, 6/9 Ans, 8 Ans, 10 Ans, 10/13 Ans, 12 Ans...)
 * 2. Tailles standards adultes (XXS, XS, S, M, L, XL, 2XL, 3XL, 4XL...)
 * 3. Tailles descriptives (Petite, Moyenne, Grande...)
 * 4. Tailles uniques / Adultes (Adulte, Taille unique, TU...)
 * 5. Pointures / Tailles numériques (ex: 34-36, 37-39...)
 */

export function getTailleRank(tailleRaw: string | null | undefined): number {
  if (!tailleRaw) return 9999

  const taille = tailleRaw.trim().toLowerCase()

  // 1. Enfants / Juniors par âge (ex: "6 Ans", "6 / 9 Ans", "10 Ans", "10/13 Ans")
  const ageRangeMatch = taille.match(/^(\d+)\s*(?:\/|-|\s+à\s+)\s*(\d+)\s*(?:ans?|a)?$/i)
  if (ageRangeMatch) {
    const minAge = parseInt(ageRangeMatch[1], 10)
    const maxAge = parseInt(ageRangeMatch[2], 10)
    return 100 + minAge + (maxAge * 0.01)
  }

  const singleAgeMatch = taille.match(/^(\d+)\s*(?:ans?|a)$/i)
  if (singleAgeMatch) {
    const age = parseInt(singleAgeMatch[1], 10)
    return 100 + age
  }

  // Moins de 4 ans (mois)
  const moisMatch = taille.match(/^(\d+)\s*(?:mois|m)$/i)
  if (moisMatch) {
    return parseInt(moisMatch[1], 10) / 10
  }

  // Juniors / Enfants génériques
  if (taille === 'enfant' || taille === 'enfants' || taille === 'kids' || taille === 'junior' || taille === 'juniors') {
    return 150
  }

  // 2. Tailles textiles adultes standards
  const standardLetterSizes: Record<string, number> = {
    '4xs': 190,
    '3xs': 195,
    'xxs': 200,
    '2xs': 200,
    'xs': 210,
    'xs/s': 215,
    's': 220,
    's/m': 225,
    'm': 230,
    'm/l': 235,
    'l': 240,
    'l/xl': 245,
    'xl': 250,
    'xl/2xl': 255,
    'xxl': 260,
    '2xl': 260,
    'xxxl': 270,
    '3xl': 270,
    'xxxxl': 280,
    '4xl': 280,
    '5xl': 290,
    '6xl': 300,
  }

  if (standardLetterSizes[taille] !== undefined) {
    return standardLetterSizes[taille]
  }

  // Tailles avec parenthèses comme "XS (34)", "S (36-38)"
  for (const [prefix, score] of Object.entries(standardLetterSizes)) {
    if (taille.startsWith(prefix + ' ') || taille.startsWith(prefix + '(')) {
      return score
    }
  }

  // 3. Tailles descriptives / Serviettes (Petite, Moyenne, Grande...)
  if (taille.includes('petit') || taille.includes('small')) return 310
  if (taille.includes('moyen') || taille.includes('medium')) return 320
  if (taille.includes('grand') || taille.includes('large')) return 330
  if (taille.includes('très grand') || taille.includes('tres grand') || taille.includes('xlarge')) return 340

  // 4. Tailles uniques et adultes
  if (
    taille.includes('taille unique') ||
    taille.includes('unique') ||
    taille === 'tu' ||
    taille.includes('adulte') ||
    taille === 'senior'
  ) {
    return 400
  }

  // 5. Pointures / Chaussant / Tailles numériques pures (ex: "36-38", "38", "42")
  const numericRangeMatch = taille.match(/^(\d+)(?:[-/](\d+))?$/)
  if (numericRangeMatch) {
    const val = parseInt(numericRangeMatch[1], 10)
    return 500 + val
  }

  // Dimensions (ex: "100x50", "100cm X 50cm")
  const dimMatch = taille.match(/(\d+)\s*(?:cm)?\s*[x*]\s*(\d+)/)
  if (dimMatch) {
    const d1 = parseInt(dimMatch[1], 10)
    const d2 = parseInt(dimMatch[2], 10)
    return 600 + (d1 * d2) / 100
  }

  // Fallback : ordre alphabétique secondaire
  return 1000
}

/**
 * Compare deux tailles pour un tri croissant logique
 */
export function compareTailles(a: string | null | undefined, b: string | null | undefined): number {
  const rankA = getTailleRank(a)
  const rankB = getTailleRank(b)

  if (rankA !== rankB) {
    return rankA - rankB
  }

  return (a || '').localeCompare(b || '', 'fr', { numeric: true, sensitivity: 'base' })
}

/**
 * Trie une liste de libellés de tailles dans l'ordre logique
 */
export function sortTailles(tailles: string[]): string[] {
  return [...tailles].sort(compareTailles)
}

/**
 * Trie un tableau d'objets variantes par taille puis couleur
 */
export function sortVariantes<T extends { taille?: string | null; couleur?: string | null }>(variantes: T[]): T[] {
  return [...variantes].sort((a, b) => {
    const compTaille = compareTailles(a.taille, b.taille)
    if (compTaille !== 0) return compTaille
    return (a.couleur || '').localeCompare(b.couleur || '', 'fr', { sensitivity: 'base' })
  })
}
