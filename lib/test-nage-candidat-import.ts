// Formate un numéro à 10 chiffres en standard français : 06 12 34 56 78
export function formatPhoneFr(phone: string): string {
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

export interface ColumnMap {
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
export function detectHeader(cells: string[]): ColumnMap | null {
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
export function splitRow(row: string): string[] {
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
