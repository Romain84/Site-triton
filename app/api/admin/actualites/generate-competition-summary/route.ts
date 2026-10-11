import { NextRequest } from 'next/server'
import { apiError, apiSuccess } from '@/lib/api/response'
import { logger } from '@/lib/logger'
import { prisma } from '@/lib/prisma'
import { fetchLiveFFNData, LiveFFNData, LiveFFNPodium } from '@/lib/liveffn-parser'
import { requireAdmin } from '@/lib/api/guards'
import { generateFallbackDraftArticle } from '@/lib/competition-summary-fallback'

const aiLogger = logger.withContext('CompetitionSummaryAI')

const MISTRAL_CANDIDATE_MODELS = [
  'ministral-8b-latest',
  'codestral-latest',
  'open-mistral-7b',
  'mistral-small-latest',
]

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdmin()
    if (!auth.ok) return auth.response

    const body = await request.json()
    const { rawNotes, competitionName, lieu, liveffnUrl } = body

    let effectiveNotes = rawNotes || ''
    let effectiveTitle = competitionName || ''
    let effectiveLieu = lieu || ''
    let liveData: LiveFFNData | null = null

    // 1. Si une URL LiveFFN est fournie, extraire les résultats réels du club et calculer les podiums
    if (liveffnUrl && typeof liveffnUrl === 'string') {
      try {
        const parsed = new URL(liveffnUrl)
        const validHostnames = ['liveffn.com', 'www.liveffn.com']
        if (validHostnames.includes(parsed.hostname.toLowerCase()) && (parsed.protocol === 'https:' || parsed.protocol === 'http:')) {
          liveData = await fetchLiveFFNData(liveffnUrl)
          if (liveData) {
            if (!effectiveTitle && liveData.title) effectiveTitle = liveData.title
            if (!effectiveLieu && liveData.location) effectiveLieu = liveData.location

            effectiveNotes = `${liveData.formattedSummary}${rawNotes ? `\n\nNOTES DU COACH :\n${rawNotes}` : ''}`
          }
        }
      } catch (e: any) {
        aiLogger.warn('Erreur lors du scraping LiveFFN:', e?.message)
      }
    }

    if (!effectiveNotes || typeof effectiveNotes !== 'string' || effectiveNotes.trim().length < 5) {
      return apiError('Veuillez fournir une URL LiveFFN valide ou saisir les résultats de la compétition.', 400)
    }

    // Protection anti-explosion de tokens
    let truncatedNotes = effectiveNotes
    if (truncatedNotes.length > 7500) {
      truncatedNotes = truncatedNotes.slice(0, 7500) + '\n[... extrait synthétisé des résultats pour analyse]'
    }

    const openaiApiKey = process.env.OPENAI_API_KEY
    const hasOpenAI = Boolean(openaiApiKey && openaiApiKey.startsWith('sk-') && openaiApiKey.length > 20)

    const mistralApiKey = process.env.MISTRAL_API_KEY
    const hasMistral = Boolean(mistralApiKey && mistralApiKey !== 'your-mistral-api-key-here')

    let parsedResult: any = null
    let usedModel = ''
    let usedFallback = false
    let fallbackNotice = ''

    // Prompt de grand journaliste sportif d'élite
    const systemPrompt = `Tu es un grand journaliste sportif et rédacteur passionné pour le Triton Club Cavaillon (club de natation FFN en Provence).
Ton objectif est de rédiger un article captivant, vivant, chaleureux et vibrant sur les exploits du club lors de la compétition, digne d'un grand quotidien sportif (comme L'Équipe ou La Provence Sport), tout en valorisant la fierté et l'esprit de famille du club.

DIRECTIVES ÉDITORIALES STRICTES :
1. TON ET STYLE DE RÉDACTION :
   - Écris un texte fluide, immersif, élégant et rythmé.
   - BANNIS ABSOLUMENT les clichés robotiques creux du type : "des performances à couper le souffle", "faire étinceler les bassins", "une journée riche en émotions".
   - BANNIS les listes de courses brutes avec des puces monotones. Raconte une VRAIE histoire sportive avec du relief.
2. STRUCTURE DU CONTENU HTML ("contenu") :
   - <h2> Une entrée en matière percutante qui pose le décor (la rentrée sportive, l'énergie au bord des plots à Cavaillon, l'effervescence des retrouvailles, l'ambiance chaleureuse).
   - <h3> Les têtes d'affiche et exploits majeurs : décrypte les performances marquantes avec leurs chronos et points FFN (ex: la domination de Marius Cresp au 50m brasse, la polyvalence de Keara Garnier, les médailles d'Iris Raoul).
   - <h3> La jeunesse triomphante & les révélations : mets en lumière les Benjamins 2013 et 2014 (Ethan Chevalier Maurin, Melissa Raposo Machado, Lilirose Marin, Louka Fourgereau) qui trustent les avant-postes de leur génération face à tous les clubs adverses.
   - <div class="tableau-podiums my-6 overflow-x-auto"> : Un tableau d'honneur HTML clair et élégant des médaillés (Place, Nageur, Catégorie, Épreuve, Chrono).
   - <h3> Le mot du staff technique : félicitations sincères de l'équipe des entraîneurs, remerciements aux officiels et parents supporters, et dynamique positive pour les prochains rendez-vous de la saison.
3. RÈGLE STRICTE ANTI-HALLUCINATION :
   - Tu as l'interdiction FORMELLE d'inventer le moindre nom de nageur ou temps.
   - Tu dois citer UNIQUEMENT les vrais nageurs et vraies performances mentionnés dans les données fournies ci-dessous.
4. TEXTE RÉSEAUX SOCIAUX ("instagramText") :
   - Rédige un post moderne et percutant pour Instagram et Facebook, avec des sauts de ligne, des émojis bien dosés, les médaillés clés et les hashtags officiels (#TritonClubCavaillon #Natation #Cavaillon #FFN #EspritTriton).

DONNÉES OFFICIELLES FOURNIES :
${effectiveTitle ? `- Nom de la compétition : ${effectiveTitle}` : ''}
${effectiveLieu ? `- Lieu : ${effectiveLieu}` : ''}
${liveffnUrl ? `- URL LiveFFN : ${liveffnUrl}` : ''}
"""
${truncatedNotes}
"""

FORMAT DE SORTIE JSON STRICT (sans texte autour et sans markdown \`\`\`json) :
{
  "titre": "Titre journalistique accrocheur avec emojis",
  "slug": "titre-slugifie-sans-accents-et-tirets",
  "contenu": "Code HTML complet de l'article avec <h2>, <h3>, <p>, <strong>, <em>, <table>...",
  "instagramText": "Post percutant pour Instagram/Facebook"
}`

    // 2. PRIORITÉ 1 : OpenAI GPT-4o si la clé est configurée
    if (hasOpenAI) {
      try {
        aiLogger.info('Appel de l\'API OpenAI avec le modèle gpt-4o...')
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 45000)

        const gptResponse = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${openaiApiKey}`,
          },
          body: JSON.stringify({
            model: 'gpt-4o',
            messages: [{ role: 'user', content: systemPrompt }],
            temperature: 0.35,
            max_tokens: 3500,
            response_format: { type: 'json_object' },
          }),
          signal: controller.signal,
        })

        clearTimeout(timeoutId)

        if (gptResponse.ok) {
          const resData = await gptResponse.json()
          const text = resData.choices?.[0]?.message?.content?.trim() || ''
          const jsonText = text.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/, '').trim()
          parsedResult = JSON.parse(jsonText)
          usedModel = 'OpenAI GPT-4o'
          aiLogger.info('Article généré avec succès avec OpenAI GPT-4o !')
        } else {
          const errText = await gptResponse.text()
          aiLogger.warn(`Erreur API OpenAI HTTP ${gptResponse.status}:`, errText)
        }
      } catch (gptErr: any) {
        aiLogger.warn('Exception lors de l\'appel OpenAI GPT-4o:', gptErr?.message)
      }
    }

    // 3. PRIORITÉ 2 : Modèles Mistral AI si pas d'OpenAI ou échec
    if (!parsedResult && hasMistral) {
      for (const model of MISTRAL_CANDIDATE_MODELS) {
        let attempt = 0
        const maxAttemptsForModel = 2

        while (attempt < maxAttemptsForModel) {
          attempt++
          try {
            const controller = new AbortController()
            const timeoutId = setTimeout(() => controller.abort(), 35000)

            const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${mistralApiKey}`,
              },
              body: JSON.stringify({
                model,
                messages: [{ role: 'user', content: systemPrompt }],
                temperature: 0.3,
                max_tokens: 3000,
                response_format: { type: 'json_object' },
              }),
              signal: controller.signal,
            })

            clearTimeout(timeoutId)

            if (response.ok) {
              const resData = await response.json()
              const text = resData.choices?.[0]?.message?.content?.trim() || ''

              try {
                const jsonText = text.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/, '').trim()
                parsedResult = JSON.parse(jsonText)
                usedModel = `Mistral (${model})`
                aiLogger.info(`Article compétition généré avec succès avec ${model}`)
                break
              } catch (parseErr) {
                aiLogger.warn(`Erreur parsing JSON sur ${model}`, { parseErr, text })
                break
              }
            }

            if (response.status === 429) {
              const retryAfterHeader = response.headers.get('retry-after')
              const retryAfterSeconds = retryAfterHeader ? parseInt(retryAfterHeader, 10) : 2
              const waitMs = Math.min(Math.max(isNaN(retryAfterSeconds) ? 2 : retryAfterSeconds, 1.5) * 1000, 4000)

              aiLogger.warn(`Mistral 429 sur ${model}. Attente de ${waitMs}ms...`)
              if (attempt < maxAttemptsForModel) {
                await sleep(waitMs)
                continue
              } else {
                break
              }
            }

            const errText = await response.text()
            aiLogger.warn(`Erreur API Mistral HTTP ${response.status} sur ${model}`, { errText })
            break
          } catch (err: any) {
            aiLogger.warn(`Exception sur ${model}:`, err?.message || err)
            if (attempt < maxAttemptsForModel) {
              await sleep(1500)
            } else {
              break
            }
          }
        }

        if (parsedResult) break
      }
    }

    // 4. Si indisponible, repli vers le générateur de secours
    if (!parsedResult) {
      usedFallback = true
      fallbackNotice = 'Article rédigé en mode structuré assisté (API IA indisponible ou saturée).'
      parsedResult = generateFallbackDraftArticle({
        competitionName: effectiveTitle,
        lieu: effectiveLieu,
        liveffnUrl,
        rawNotes: effectiveNotes,
      })
    }

    // 5. Enregistrer les podiums en BDD (Priorité aux podiums réels calculés mathématiquement)
    const compTitle = effectiveTitle || parsedResult.titre || 'Compétition Natation'
    let podiumsToSave: LiveFFNPodium[] = []

    if (liveData && liveData.allPodiums.length > 0) {
      podiumsToSave = liveData.allPodiums
    } else if (Array.isArray(parsedResult.podiums)) {
      podiumsToSave = parsedResult.podiums
    }

    let podiumsSaved = 0
    if (podiumsToSave.length > 0) {
      try {
        // Nettoyer les anciens podiums de cette même compétition pour éviter les doublons lors des ré-essais
        await prisma.podiumSaison.deleteMany({
          where: { competition: compTitle },
        })

        for (const pod of podiumsToSave) {
          if (pod.nageurNom && typeof pod.nageurNom === 'string') {
            await prisma.podiumSaison.create({
              data: {
                nageurNom: pod.nageurNom,
                categorie: pod.categorie || 'Toutes catégories',
                epreuve: pod.epreuve || 'Épreuve Natation',
                place: Number(pod.place) || 1,
                estVirtuel: Boolean(pod.estVirtuel),
                competition: compTitle,
                temps: pod.temps || null,
              },
            })
            podiumsSaved++
          }
        }
        aiLogger.info(`${podiumsSaved} podiums réels sauvegardés en BDD pour "${compTitle}"`)
      } catch (saveErr) {
        aiLogger.error('Erreur lors de la sauvegarde des podiums en BDD:', saveErr)
      }
    }

    const resultPayload = {
      titre: parsedResult.titre || 'Compétition Natation - Résultats',
      slug: parsedResult.slug || 'competition-resultats',
      contenu: parsedResult.contenu || '',
      instagramText: parsedResult.instagramText || '',
      podiumsSaved,
      officialPodiumsCount: liveData?.officialPodiums.length || 0,
      virtualPodiumsCount: liveData?.virtualPodiums.length || 0,
      swimmersCount: liveData?.swimmers.length || 0,
      podiums: podiumsToSave,
      usedModel: usedModel || 'Gabarit assisté',
      isFallbackDraft: usedFallback,
      notice: fallbackNotice || undefined,
    }

    return apiSuccess({
      ...resultPayload,
      data: resultPayload,
    })
  } catch (error: any) {
    aiLogger.error('Erreur inattendue lors de la génération de l\'article:', error)
    return apiError('Erreur lors de la génération de l\'article.', 500)
  }
}
