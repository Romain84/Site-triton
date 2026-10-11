/**
 * Générateur de secours pour les résumés de compétition
 * Permet de produire un article d'actualité complet et structuré au format HTML
 * même en cas d'indisponibilité ou de dépassement de quota (HTTP 429) de l'API Mistral AI.
 */

export interface FallbackDraftParams {
  competitionName?: string
  lieu?: string
  liveffnUrl?: string
  rawNotes: string
}

export interface FallbackPodium {
  nageurNom: string
  categorie: string
  epreuve: string
  place: number
  estVirtuel: boolean
  temps?: string
}

export interface FallbackDraftResult {
  titre: string
  slug: string
  contenu: string
  instagramText: string
  podiums: FallbackPodium[]
}

function slugify(text: string): string {
  return (
    text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '') || 'competition-resultats'
  )
}

function detectPlace(line: string): number | null {
  // 1ère place / 1er / 1.
  if (/(?:^|[(\s])(?:1er|1ère|1re|1e)\b/i.test(line) || /^\s*1\s*[.)\-]/i.test(line) || /\bplace\s*:\s*1\b/i.test(line)) {
    return 1
  }
  // 2e place / 2ème / 2.
  if (/(?:^|[(\s])(?:2e|2ème|2nd)\b/i.test(line) || /^\s*2\s*[.)\-]/i.test(line) || /\bplace\s*:\s*2\b/i.test(line)) {
    return 2
  }
  // 3e place / 3ème / 3.
  if (/(?:^|[(\s])(?:3e|3ème|3rd)\b/i.test(line) || /^\s*3\s*[.)\-]/i.test(line) || /\bplace\s*:\s*3\b/i.test(line)) {
    return 3
  }
  return null
}

/**
 * Analyse et extrait les performances notables et les podiums potentiels depuis les notes / données brutes
 */
function extractPerformances(rawNotes: string): {
  podiums: FallbackPodium[]
  notableLines: string[]
} {
  const lines = rawNotes
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 3 && !l.startsWith('http') && !l.toUpperCase().startsWith('RÉSULTATS IMPORTÉS'))

  const podiums: FallbackPodium[] = []
  const notableLines: string[] = []

  for (const line of lines) {
    if (
      line.toLowerCase().includes('cavaillon') ||
      line.toLowerCase().includes('triton') ||
      /\d{1,2}[:"']\d{2}/.test(line) ||
      /\d+m\b/i.test(line)
    ) {
      notableLines.push(line)

      const place = detectPlace(line)
      if (place && podiums.length < 15) {
        // Détection de l'épreuve
        const epreuveMatch = line.match(/(?:50|100|200|400|800|1500)\s*(?:m\s*)?(?:nl|nage libre|dos|brasse|papillon|pap|4 nages|4n)?/i)
        const epreuve = epreuveMatch ? epreuveMatch[0].toUpperCase() : 'Épreuve'

        // Détection de la catégorie
        const catMatch = line.match(/\b(J\d{2}|Juniors?|Avenirs?|Seniors?|Jeunes?)\b/i)
        const categorie = catMatch ? catMatch[0].toUpperCase() : 'Catégorie'

        // Détection du temps
        const tempsMatch = line.match(/\b(?:\d{1,2}[:'])?\d{2}(?:\.\d{2}|,\d{2})\b/)
        const temps = tempsMatch ? tempsMatch[0] : undefined

        // Détection approximative du nom du nageur
        const cleanWords = line
          .replace(/triton\s*club\s*cavaillon/gi, '')
          .replace(/cavaillon/gi, '')
          .replace(/fra/gi, '')
          .split(/\s+/)
        const nameCandidates = cleanWords.filter(
          (w) => /^[A-ZÀ-ÖØ-ß]{2,}$/.test(w) || /^[A-ZÀ-Ö][a-zà-öø-ÿ]{2,}$/.test(w)
        )
        const nageurNom = nameCandidates.slice(0, 2).join(' ') || 'Nageur Triton'

        podiums.push({
          nageurNom,
          categorie,
          epreuve,
          place,
          estVirtuel: false,
          temps,
        })
      }
    }
  }

  return { podiums, notableLines: notableLines.slice(0, 30) }
}

/**
 * Génère un brouillon structuré et valorisant à partir des éléments de compétition disponibles
 */
export function generateFallbackDraftArticle(params: FallbackDraftParams): FallbackDraftResult {
  const compName = params.competitionName?.trim() || 'Compétition Officielle FFN'
  const lieuStr = params.lieu?.trim() ? ` à ${params.lieu.trim()}` : ''
  const { podiums, notableLines } = extractPerformances(params.rawNotes)

  const titre = `🏆 Belles performances et bel engagement des Tritons lors de ${compName} !`
  const slug = slugify(`resultats-${compName}${params.lieu ? `-${params.lieu}` : ''}`)

  // Section des podiums
  let podiumsHtml = ''
  if (podiums.length > 0) {
    podiumsHtml = `
<h3>🥇 Les podiums et grandes performances</h3>
<ul>
  ${podiums
    .map(
      (p) =>
        `<li><strong>${p.nageurNom}</strong> (${p.categorie}) : <strong>${p.place === 1 ? '1ère place 🥇' : p.place === 2 ? '2e place 🥈' : '3e place 🥉'}</strong> sur le ${p.epreuve}${p.temps ? ` en ${p.temps}` : ''}</li>`
    )
    .join('\n  ')}
</ul>`
  }

  // Section des résultats notables
  let perfsHtml = ''
  if (notableLines.length > 0) {
    perfsHtml = `
<h3>📊 Faits marquants et résultats des Tritons</h3>
<ul>
  ${notableLines
    .slice(0, 15)
    .map((line) => `<li>${line}</li>`)
    .join('\n  ')}
</ul>`
  } else {
    perfsHtml = `
<h3>📊 Résultats et temps forts</h3>
<p>L'ensemble des nageurs engagés a démontré une excellente dynamique avec de nombreux records personnels améliorés au cours des épreuves du week-end.</p>`
  }

  // Lien officiel LiveFFN
  const liveffnLinkHtml = params.liveffnUrl
    ? `<p class="mt-4"><a href="${params.liveffnUrl}" target="_blank" rel="noopener noreferrer" class="text-cyan-700 underline font-bold">👉 Consulter l'ensemble des résultats officiels sur LiveFFN</a></p>`
    : ''

  const contenu = `
<h2>Une belle mobilisation du Triton Club Cavaillon !</h2>
<p>Ce week-end, la délégation du <strong>Triton Club Cavaillon</strong> était engagée avec détermination${lieuStr} à l'occasion de <strong>${compName}</strong>.</p>
<p>Sous les encouragements des entraîneurs et des supporters, nos nageurs ont porté fièrement les couleurs du club, confirmant les progrès réalisés à l'entraînement tout au long de la saison.</p>
${podiumsHtml}
${perfsHtml}
${liveffnLinkHtml}
<h3>👏 Félicitations aux nageurs et aux encadrants</h3>
<p>Un grand bravo à tous les Tritons pour leur énergie, leur combativité et leur esprit d'équipe exemplaire au bord des bassins. Merci également aux officiels et aux parents accompagnateurs pour leur précieux soutien !</p>
<p><strong>Allez les Tritons ! 🔴⚪</strong></p>
`.trim()

  const instagramText = `🏆 RÉSULTATS COMPÉTITION · TRITON CLUB CAVAILLON 🔴⚪

Nos Tritons étaient en lice ce week-end lors de ${compName}${lieuStr} ! 🏊‍♂️⚡

👏 Un immense bravo à tous nos nageurs pour leur engagement, leurs superbes courses et leur bel esprit d'équipe tout au long du week-end !

${podiums.length > 0 ? `🥇 Mention spéciale à nos nageurs sur le podium !\n` : ''}Merci aux entraîneurs, officiels et supporters toujours fidèles au bord du bassin ! 🙌

#TritonClubCavaillon #Natation #Cavaillon #Vaucluse #LiveFFN #TeamTriton #EspritTriton #FFN`.trim()

  return {
    titre,
    slug,
    contenu,
    instagramText,
    podiums,
  }
}
