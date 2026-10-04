/**
 * Occupations d'une séance du planning fixe.
 *
 * Une séance (Planning) porte les informations utiles à la facturation : jour, horaires globaux,
 * groupe, coachs, temps à facturer. Ses occupations décrivent seulement les espaces physiques
 * utilisés (PPG, Petit Bassin, lignes du grand bassin) avec leurs propres horaires, pour l'affichage
 * du planning bassin.
 */

export const ESPACES_PISCINE = [
  'Grand Bassin - Ligne 1',
  'Grand Bassin - Ligne 2',
  'Grand Bassin - Ligne 3',
  'Grand Bassin - Ligne 4',
  'Petit Bassin',
  'PPG',
] as const

export const LIGNES_GRAND_BASSIN = ESPACES_PISCINE.slice(0, 4) as readonly string[]

export interface OccupationInput {
  espace: string
  heureDebut: string
  heureFin: string
}

const HEURE_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/

export function heureEnMinutes(heure: string): number {
  const [h, m] = heure.split(':').map(Number)
  return h * 60 + m
}

export function minutesEnHeure(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

/** Valide et nettoie une liste d'occupations reçue d'un formulaire. Les entrées invalides sont ignorées. */
export function sanitizeOccupations(raw: unknown): OccupationInput[] {
  if (!Array.isArray(raw)) return []
  const result: OccupationInput[] = []
  const seen = new Set<string>()
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue
    const { espace, heureDebut, heureFin } = item as Record<string, unknown>
    if (typeof espace !== 'string' || !espace.trim()) continue
    if (typeof heureDebut !== 'string' || typeof heureFin !== 'string') continue
    if (!HEURE_REGEX.test(heureDebut) || !HEURE_REGEX.test(heureFin)) continue
    if (heureEnMinutes(heureDebut) >= heureEnMinutes(heureFin)) continue
    const cle = `${espace.trim()}|${heureDebut}|${heureFin}`
    if (seen.has(cle)) continue
    seen.add(cle)
    result.push({ espace: espace.trim(), heureDebut, heureFin })
  }
  return result
}

/** Horaires globaux d'une séance = du début de la première occupation à la fin de la dernière. */
export function calculerAmplitude(occupations: OccupationInput[]): { heureDebut: string; heureFin: string } | null {
  if (occupations.length === 0) return null
  const debut = Math.min(...occupations.map((o) => heureEnMinutes(o.heureDebut)))
  const fin = Math.max(...occupations.map((o) => heureEnMinutes(o.heureFin)))
  return { heureDebut: minutesEnHeure(debut), heureFin: minutesEnHeure(fin) }
}

interface PlanningAvecOccupations {
  id: string
  lieu: string | null
  heureDebut: string
  heureFin: string
  occupations?: Array<{ espace: string; heureDebut: string; heureFin: string }> | null
}

export type PlanningEclate<T> = T & { planningSourceId: string; seance: T }

/**
 * Éclate chaque séance en une entrée par espace occupé, pour l'affichage en vue bassin.
 * Une séance sans occupation reste une seule entrée basée sur son champ `lieu`.
 */
export function eclaterParOccupation<T extends PlanningAvecOccupations>(plannings: T[]): PlanningEclate<T>[] {
  const result: PlanningEclate<T>[] = []
  for (const p of plannings) {
    const occs = p.occupations || []
    if (occs.length === 0) {
      result.push({ ...p, planningSourceId: p.id, seance: p })
      continue
    }
    occs.forEach((o, idx) => {
      result.push({
        ...p,
        id: idx === 0 ? p.id : `${p.id}__${idx}`,
        lieu: o.espace,
        heureDebut: o.heureDebut,
        heureFin: o.heureFin,
        planningSourceId: p.id,
        seance: p,
      })
    })
  }
  return result
}

function libelleEspaceCourt(espace: string): string {
  return espace.replace('Grand Bassin - ', '')
}

/**
 * Libellé lisible des espaces d'une séance.
 * Ex : "PPG 18:15-19:00 · Petit Bassin 19:00-20:00 · Lignes 1-4 19:15-20:00"
 * Si tous les espaces partagent les horaires de la séance, les horaires sont omis : "Lignes 3-4".
 */
export function libelleOccupations(planning: PlanningAvecOccupations): string {
  const occs = planning.occupations || []
  if (occs.length === 0) return planning.lieu || ''

  // Regroupe les espaces ayant les mêmes horaires
  const parHoraire = new Map<string, string[]>()
  for (const o of occs) {
    const cle = `${o.heureDebut}-${o.heureFin}`
    const liste = parHoraire.get(cle) || []
    liste.push(o.espace)
    parHoraire.set(cle, liste)
  }

  const memeHorairesQueSeance =
    parHoraire.size === 1 && parHoraire.has(`${planning.heureDebut}-${planning.heureFin}`)

  const morceaux: Array<{ debut: number; texte: string }> = []
  for (const [horaire, espaces] of parHoraire) {
    const lignes = espaces
      .filter((e) => LIGNES_GRAND_BASSIN.includes(e))
      .map((e) => Number(e.slice(-1)))
      .sort((a, b) => a - b)
    const autres = espaces.filter((e) => !LIGNES_GRAND_BASSIN.includes(e)).map(libelleEspaceCourt)

    const parties: string[] = []
    if (lignes.length === 1) parties.push(`Ligne ${lignes[0]}`)
    else if (lignes.length > 1) {
      const contigues = lignes.every((n, i) => i === 0 || n === lignes[i - 1] + 1)
      parties.push(contigues ? `Lignes ${lignes[0]}-${lignes[lignes.length - 1]}` : `Lignes ${lignes.join(', ')}`)
    }
    parties.push(...autres)

    const texte = memeHorairesQueSeance ? parties.join(', ') : `${parties.join(', ')} ${horaire}`
    morceaux.push({ debut: heureEnMinutes(horaire.split('-')[0]), texte })
  }

  return morceaux
    .sort((a, b) => a.debut - b.debut)
    .map((m) => m.texte)
    .join(' · ')
}
