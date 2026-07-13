const LONG_DATE_FORMATTER = new Intl.DateTimeFormat('fr-FR', {
  day: '2-digit',
  month: 'long',
  year: 'numeric',
})

const MONTH_SHORT_FORMATTER = new Intl.DateTimeFormat('fr-FR', {
  month: 'short',
})

/**
 * Formate une date au format long français (ex: 20 avril 2026).
 */
export function formatLongDateFr(date: Date | string): string {
  return LONG_DATE_FORMATTER.format(new Date(date))
}

/**
 * Retourne le jour + mois court (capitalisé) pour les badges d'événements.
 */
export function formatDayMonthBadgeFr(date: Date | string): { day: number; month: string } {
  const parsedDate = new Date(date)
  const day = parsedDate.getDate()
  const month = MONTH_SHORT_FORMATTER.format(parsedDate).replace('.', '')

  return {
    day,
    month: month.charAt(0).toUpperCase() + month.slice(1),
  }
}

const COMPACT_DATE_FORMATTER = new Intl.DateTimeFormat('fr-FR', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
})

/**
 * Formate une date au format compact français (ex: 20/04/2026).
 */
export function formatCompactDateFr(date: Date | string): string {
  return COMPACT_DATE_FORMATTER.format(new Date(date))
}

const WEEKDAY_LONG_DATE_FORMATTER = new Intl.DateTimeFormat('fr-FR', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
})

/**
 * Formate une date avec le jour de la semaine en français (ex: mercredi 20 mai 2026).
 */
export function formatWeekdayLongDateFr(date: Date | string): string {
  return WEEKDAY_LONG_DATE_FORMATTER.format(new Date(date))
}

const SHORT_DATE_FORMATTER = new Intl.DateTimeFormat('fr-FR', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
})

/**
 * Formate une date au format court français (ex: 20 avr. 2026).
 */
export function formatShortDateFr(date: Date | string): string {
  return SHORT_DATE_FORMATTER.format(new Date(date))
}

/**
 * Formate une plage de dates en français (ex: 20 avril – 22 avril 2026 ou 20 avril – 2 mai 2026).
 */
export function formatDateRangeFr(date: Date | string, dateFin: Date | string | null | undefined): string {
  const start = new Date(date)
  const startDay = start.toLocaleDateString('fr-FR', { day: 'numeric' })
  const startMonth = start.toLocaleDateString('fr-FR', { month: 'long' })

  if (!dateFin) return `${startDay} ${startMonth}`

  const end = new Date(dateFin)
  const endDay = end.toLocaleDateString('fr-FR', { day: 'numeric' })
  const endMonth = end.toLocaleDateString('fr-FR', { month: 'long' })

  if (startMonth === endMonth) return `${startDay} – ${endDay} ${startMonth}`
  return `${startDay} ${startMonth} – ${endDay} ${endMonth}`
}
