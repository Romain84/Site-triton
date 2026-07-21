/**
 * Règle de calcul de la saison sportive :
 * De Juillet de l'année N à Juin de l'année N+1 ==> Saison N - N+1
 * Exemple :
 * - De Juillet 2026 à Juin 2027 ==> Saison 2026 - 2027
 * - De Juillet 2027 à Juin 2028 ==> Saison 2027 - 2028
 */
export function getCurrentSeasonLabel(date: Date = new Date()): string {
  const year = date.getFullYear()
  const month = date.getMonth() // 0 = Janvier, 5 = Juin, 6 = Juillet
  const startYear = month >= 6 ? year : year - 1
  return `Saison ${startYear} - ${startYear + 1}`
}

/**
 * Activation automatique du Mode Inter-saison :
 * - S'active automatiquement le 30 juin de chaque année (month 5, day 30)
 *   jusqu me mi-septembre (reprise des cours),
 * - Ou reste actif si coché manuellement dans les paramètres d'administration.
 */
export function isInterSaisonActive(manualSetting?: boolean | null, date: Date = new Date()): boolean {
  if (manualSetting === true) return true

  const month = date.getMonth() // 0-indexed: 5 = Juin, 6 = Juillet, 7 = Août, 8 = Septembre
  const day = date.getDate()

  // Du 30 juin au 15 septembre
  if ((month === 5 && day >= 30) || month === 6 || month === 7 || (month === 8 && day <= 15)) {
    return true
  }

  return false
}
