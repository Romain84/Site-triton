import * as cheerio from 'cheerio'
import { logger } from './logger'

const liveffnLogger = logger.withContext('LiveFFN')

export interface LiveFFNPodium {
  nageurNom: string
  categorie: string
  epreuve: string
  place: number
  estVirtuel: boolean
  temps: string
  points?: string
  anneeNaissance?: number | null
  rangAnnee?: number
  totalAnnee?: number
}

export interface LiveFFNSwimmer {
  nom: string
  anneeNaissance?: number | null
  sexe: 'Messieurs' | 'Dames' | 'Mixte'
  categorie: string
  races: Array<{
    placeRaw: string
    placeNum: number | null
    epreuve: string
    epreuveId?: string
    temps: string
    points: string
  }>
}

export interface LiveFFNData {
  title: string
  location: string
  bassin: string
  date: string
  swimmers: LiveFFNSwimmer[]
  officialPodiums: LiveFFNPodium[]
  virtualPodiums: LiveFFNPodium[]
  allPodiums: LiveFFNPodium[]
  tritonResults: string[]
  formattedSummary: string
  rawTextContent: string
}

const DEFAULT_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept-Language': 'fr-FR,fr;q=0.9,en;q=0.8',
}

/**
 * Calcule la catégorie FFN d'un nageur selon son année de naissance
 */
function getCategorieFromBirthYear(anneeNaissance: number, referenceYear = new Date().getFullYear()): string {
  const age = referenceYear - anneeNaissance
  if (age <= 11) return 'Avenirs'
  if (age === 12) return 'Benjamins 1 (12 ans)'
  if (age === 13) return 'Benjamins 2 (13 ans)'
  if (age === 14) return 'Juniors 1 (J14 / 14 ans)'
  if (age === 15) return 'Juniors 2 (J15 / 15 ans)'
  if (age === 16) return 'Juniors 3 (J16 / 16 ans)'
  if (age === 17) return 'Juniors 4 (J17 / 17 ans)'
  return 'Seniors (18 ans et +)'
}

/**
 * Extrait les données et résultats pertinents d'une compétition LiveFFN à partir de son URL
 * @param liveffnUrl URL de la compétition (ex: https://www.liveffn.com/cgi-bin/resultats.php?competition=94540&langue=fra)
 */
export async function fetchLiveFFNData(liveffnUrl: string): Promise<LiveFFNData | null> {
  try {
    const parsed = new URL(liveffnUrl)
    const validHostnames = ['liveffn.com', 'www.liveffn.com']
    if (!validHostnames.includes(parsed.hostname.toLowerCase()) || (parsed.protocol !== 'https:' && parsed.protocol !== 'http:')) {
      liveffnLogger.warn(`URL LiveFFN invalide ou domaine non autorisé: ${liveffnUrl}`)
      return null
    }

    const competitionId = parsed.searchParams.get('competition')
    if (!competitionId) {
      liveffnLogger.warn(`Aucun paramètre competition trouvé dans l'URL: ${liveffnUrl}`)
      return null
    }

    // 1. Déterminer l'identifiant de structure de Cavaillon
    let structureId = parsed.searchParams.get('structure')

    if (!structureId) {
      const listStructuresUrl = `https://www.liveffn.com/cgi-bin/resultats.php?competition=${competitionId}&langue=fra&go=detail&action=structure`
      liveffnLogger.info(`Recherche de la structure club sur: ${listStructuresUrl}`)

      const resList = await fetch(listStructuresUrl, { headers: DEFAULT_HEADERS })
      if (resList.ok) {
        const listHtml = await resList.text()
        const $list = cheerio.load(listHtml)

        $list('a').each((_, el) => {
          const text = $list(el).text().toUpperCase()
          const href = $list(el).attr('href') || ''
          if ((text.includes('CAVAILLON') || text.includes('TRITON') || text.includes(' TCC ')) && href.includes('structure=')) {
            const match = href.match(/structure=(\d+)/)
            if (match) {
              structureId = match[1]
            }
          }
        })
      }
    }

    if (!structureId) {
      liveffnLogger.warn(`Structure Triton Club Cavaillon introuvable pour la compétition ${competitionId}`)
      return null
    }

    // 2. Télécharger la page des résultats de la structure Cavaillon
    const clubUrl = `https://www.liveffn.com/cgi-bin/resultats.php?competition=${competitionId}&langue=fra&go=detail&action=structure&structure=${structureId}`
    liveffnLogger.info(`Téléchargement des résultats club: ${clubUrl}`)

    const resClub = await fetch(clubUrl, { headers: DEFAULT_HEADERS })
    if (!resClub.ok) {
      liveffnLogger.warn(`Erreur HTTP ${resClub.status} lors de la récupération des résultats club`)
      return null
    }

    const clubHtml = await resClub.text()
    const $ = cheerio.load(clubHtml)

    // Métadonnées compétition
    const title = $('h1').first().text().trim() || $('title').text().replace(/liveffn\.com\s*-\s*/i, '').trim() || 'Compétition LiveFFN'
    let lieu = ''
    let bassin = ''
    let dateComp = ''

    $('body').find('h2, div, p').each((_, el) => {
      const t = $(el).text().trim()
      if (!lieu && (t.toUpperCase().includes('CAVAILLON') || t.toLowerCase().includes('bassin'))) lieu = t
      if (!bassin && t.toLowerCase().includes('bassin')) bassin = t
      if (!dateComp && (t.toLowerCase().includes('dimanche') || t.toLowerCase().includes('samedi') || /\d{1,2}\s+[a-zéû]+\s+\d{4}/i.test(t))) {
        dateComp = t
      }
    })

    // 3. Extraire chaque nageur et ses épreuves
    const swimmers: LiveFFNSwimmer[] = []
    const epreuveIds = new Set<string>()

    $('td[class*="resStructureIndividu"]').each((_, el) => {
      const $td = $(el)
      const rawHeader = $td.text().trim()
      const isHomme = $td.hasClass('resStructureIndividu1')
      const isFemme = $td.hasClass('resStructureIndividu2')
      const sexe: 'Messieurs' | 'Dames' | 'Mixte' = isHomme ? 'Messieurs' : isFemme ? 'Dames' : 'Mixte'

      // Match "NOM Prénom (AAAA) FRA"
      const match = rawHeader.match(/^([^(]+)\s*\((\d{4})\)\s*([A-Z]{3})?/)
      const nom = match ? match[1].trim() : rawHeader
      const anneeNaissance = match ? parseInt(match[2], 10) : null
      const categorie = anneeNaissance ? getCategorieFromBirthYear(anneeNaissance) : 'Toutes catégories'

      const $parentTr = $td.closest('tr')
      const races: LiveFFNSwimmer['races'] = []

      $parentTr.nextAll('tr.survol').each((_, raceTr) => {
        const $rTr = $(raceTr)
        // Vérifier si un nouveau nageur commence
        if ($rTr.prevAll('tr').has('td[class*="resStructureIndividu"]').first().get(0) !== $parentTr.get(0)) {
          return // Appartient au nageur suivant
        }

        const placeRaw = $rTr.find('td.resStructureDetailPlace').text().trim()
        const placeNum = parseInt(placeRaw.replace(/\D/g, ''), 10) || null
        const $link = $rTr.find('a.underline')
        const epreuve = $link.text().trim()
        const href = $link.attr('href') || ''
        const epMatch = href.match(/epreuve=(\d+)/)
        const epreuveId = epMatch ? epMatch[1] : undefined
        if (epreuveId) epreuveIds.add(epreuveId)

        // Extraction robuste du temps (avec ou sans temps de passage imbriqués)
        let temps = ''
        const $tempsSans = $rTr.find('td.temps_sans_tps_passage')
        if ($tempsSans.length > 0) {
          temps = $tempsSans.text().trim()
        } else {
          const $tempsWith = $rTr.find('td.temps')
          if ($tempsWith.length > 0) {
            const firstContent = $tempsWith.find('a.tooltip').contents().first().text().trim()
            temps = firstContent || $tempsWith.text().split(/\s+/)[0] || ''
          }
        }

        const points = $rTr.find('td.points').text().trim()

        if (epreuve) {
          races.push({
            placeRaw,
            placeNum,
            epreuve,
            epreuveId,
            temps,
            points,
          })
        }
      })

      if (nom) {
        swimmers.push({
          nom,
          anneeNaissance,
          sexe,
          categorie,
          races,
        })
      }
    })

    // 4. Télécharger les épreuves en parallèle pour calculer les classements exacts par année de naissance
    const epreuvesData = new Map<string, { title: string; rows: Array<{ rankScratch: number; swimmerName: string; birthYear: number; club: string; time: string }> }>()

    if (epreuveIds.size > 0) {
      liveffnLogger.info(`Téléchargement de ${epreuveIds.size} épreuves en parallèle pour calcul des podiums par catégorie...`)
      const fetchPromises = Array.from(epreuveIds).map(async (id) => {
        try {
          const res = await fetch(`https://www.liveffn.com/cgi-bin/resultats.php?competition=${competitionId}&langue=fra&go=epreuve&epreuve=${id}`, {
            headers: DEFAULT_HEADERS,
          })
          if (res.ok) {
            const html = await res.text()
            const $ep = cheerio.load(html)
            const rows: Array<{ rankScratch: number; swimmerName: string; birthYear: number; club: string; time: string }> = []

            $ep('table.tableau tr').each((_, tr) => {
              const text = $ep(tr).text().replace(/\s+/g, ' ').trim()
              const m = text.match(/^(\d+)\.\s+([A-ZÀ-ÖØ-ß\s'-]+?\s+[A-ZÀ-ÖØ-ß][a-zà-öø-ÿ'-]+(?:\s+[A-ZÀ-ÖØ-ß][a-zà-öø-ÿ'-]+)?)\s+(\d{4})\s+([A-Z]{3})\s+(.*?)\s+([0-9:]+\.[0-9]+)/i)
              if (m) {
                rows.push({
                  rankScratch: parseInt(m[1], 10),
                  swimmerName: m[2].trim(),
                  birthYear: parseInt(m[3], 10),
                  club: m[5].trim(),
                  time: m[6].trim(),
                })
              }
            })

            const epTitle = $ep('h2').first().text().trim() || `Épreuve ${id}`
            epreuvesData.set(id, { title: epTitle, rows })
          }
        } catch (epErr) {
          liveffnLogger.warn(`Erreur lors du téléchargement de l'épreuve ${id}:`, epErr)
        }
      })

      await Promise.all(fetchPromises)
    }

    // 5. Calculer les podiums officiels (scratch) et virtuels (par année de naissance)
    const officialPodiums: LiveFFNPodium[] = []
    const virtualPodiums: LiveFFNPodium[] = []

    for (const swimmer of swimmers) {
      for (const race of swimmer.races) {
        // 5a. Podium officiel scratch (place 1, 2 ou 3)
        if (race.placeNum && race.placeNum <= 3) {
          officialPodiums.push({
            nageurNom: swimmer.nom,
            categorie: swimmer.categorie,
            epreuve: race.epreuve,
            place: race.placeNum,
            estVirtuel: false,
            temps: race.temps,
            points: race.points,
            anneeNaissance: swimmer.anneeNaissance,
          })
        }

        // 5b. Podium par année de naissance (si disponible dans les données d'épreuve)
        if (race.epreuveId && swimmer.anneeNaissance && epreuvesData.has(race.epreuveId)) {
          const epData = epreuvesData.get(race.epreuveId)!
          const yearRows = epData.rows.filter(r => r.birthYear === swimmer.anneeNaissance)
          const myIndexInYear = yearRows.findIndex(r => r.club.toUpperCase().includes('CAVAILLON') || r.club.toUpperCase().includes('TRITON'))

          if (myIndexInYear !== -1) {
            const yearRank = myIndexInYear + 1
            const isOfficial = race.placeNum !== null && race.placeNum <= 3

            // Si le nageur est sur le podium de son année d'âge mais n'était pas sur le podium scratch
            if (yearRank <= 3 && !isOfficial) {
              virtualPodiums.push({
                nageurNom: swimmer.nom,
                categorie: swimmer.categorie,
                epreuve: race.epreuve,
                place: yearRank,
                estVirtuel: true,
                temps: race.temps,
                points: race.points,
                anneeNaissance: swimmer.anneeNaissance,
                rangAnnee: yearRank,
                totalAnnee: yearRows.length,
              })
            }
          }
        }
      }
    }

    const allPodiums = [...officialPodiums, ...virtualPodiums]

    // 6. Formater une synthèse structurée claire pour l'IA
    const summaryLines: string[] = []
    summaryLines.push(`RÉSULTATS OFFICIELS DU TRITON CLUB CAVAILLON :`)
    summaryLines.push(`Compétition : ${title} | Lieu : ${lieu || 'Cavaillon'}`)
    summaryLines.push(`Nombre de nageurs engagés : ${swimmers.length}`)
    summaryLines.push(`Podiums officiels (Scratch) : ${officialPodiums.length}`)
    summaryLines.push(`Podiums par année d'âge (Virtuels) : ${virtualPodiums.length}`)

    summaryLines.push('\n--- PODIUMS OFFICIELS SCRATCH (TOP 3 GÉNÉRAL) ---')
    for (const p of officialPodiums) {
      summaryLines.push(`🏅 ${p.place}${p.place === 1 ? 'er (OR)' : 'e'} : ${p.nageurNom} (${p.categorie}) - ${p.epreuve} en ${p.temps}${p.points ? ` (${p.points})` : ''}`)
    }

    if (virtualPodiums.length > 0) {
      summaryLines.push('\n--- PODIUMS PAR ANNÉE DE NAISSANCE / CATÉGORIE D\'ÂGE ---')
      for (const p of virtualPodiums) {
        summaryLines.push(`✨ ${p.place}${p.place === 1 ? 'er' : 'e'} de son année ${p.anneeNaissance || ''} : ${p.nageurNom} (${p.categorie}) - ${p.epreuve} en ${p.temps}${p.totalAnnee ? ` (sur ${p.totalAnnee} nageurs de son année)` : ''}`)
      }
    }

    summaryLines.push('\n--- DÉTAIL PAR NAGEUR DU CLUB ---')
    for (const s of swimmers) {
      summaryLines.push(`\n- ${s.nom} (${s.anneeNaissance || 'N/A'}, ${s.categorie}, ${s.sexe}) :`)
      for (const r of s.races) {
        const podLabel = r.placeNum && r.placeNum <= 3 ? `[PODIUM ${r.placeRaw}]` : `[${r.placeRaw || 'Classé'}]`
        summaryLines.push(`  * ${podLabel} ${r.epreuve} : ${r.temps}${r.points ? ` (${r.points})` : ''}`)
      }
    }

    const formattedSummary = summaryLines.join('\n')
    const tritonResults = swimmers.map(s => `${s.nom} (${s.categorie}) : ${s.races.map(r => `${r.epreuve} ${r.temps} [${r.placeRaw}]`).join(', ')}`)

    return {
      title,
      location: lieu,
      bassin,
      date: dateComp,
      swimmers,
      officialPodiums,
      virtualPodiums,
      allPodiums,
      tritonResults,
      formattedSummary,
      rawTextContent: formattedSummary,
    }
  } catch (error) {
    liveffnLogger.error('Erreur lors du scraping LiveFFN:', error)
    return null
  }
}
