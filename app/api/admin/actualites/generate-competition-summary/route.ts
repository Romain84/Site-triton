import { NextRequest } from 'next/server'
import { apiError, apiSuccess } from '@/lib/api/response'
import { logger } from '@/lib/logger'
import { prisma } from '@/lib/prisma'
import { fetchLiveFFNData, LiveFFNData, LiveFFNPodium } from '@/lib/liveffn-parser'
import { requireAdmin } from '@/lib/api/guards'
import { generateFallbackDraftArticle } from '@/lib/competition-summary-fallback'

const aiLogger = logger.withContext('CompetitionSummaryAI')

// Modèles Mistral par ordre de rapidité et d'absence de rate limit
const CANDIDATE_MODELS = [
  'ministral-8b-latest',
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
    if (truncatedNotes.length > 7000) {
      truncatedNotes = truncatedNotes.slice(0, 7000) + '\n[... extrait synthétisé des résultats pour analyse]'
    }

    const apiKey = process.env.MISTRAL_API_KEY
    const hasValidKey = apiKey && apiKey !== 'your-mistral-api-key-here'

    let parsedResult: any = null
    let usedFallback = false
    let fallbackNotice = ''

    if (hasValidKey) {
      const systemPrompt = `Tu es le responsable de communication et coach du Triton Club Cavaillon (club de natation FFN à Cavaillon, 84).
Ton rôle est de rédiger un superbe article d'actualité captivant, dynamique et chaleureux pour le site web du club et ses réseaux sociaux, basé STRICTEMENT sur les résultats réels ci-dessous.

DONNÉES OFFICIELLES RÉELLES (COMPÉTITION & RÉSULTATS DU CLUB) :
${effectiveTitle ? `- Nom de la compétition : ${effectiveTitle}` : ''}
${effectiveLieu ? `- Lieu : ${effectiveLieu}` : ''}
${liveffnUrl ? `- URL officielle LiveFFN : ${liveffnUrl}` : ''}
- Résultats officiels & Notes fournies :
"""
${truncatedNotes}
"""

RÈGLES ABSOLUES ANTI-HALLUCINATION (CRITIQUE) :
1. INTERDICTION FORMELLE D'INVENTER : Tu as l'interdiction absolue d'inventer le moindre nom de nageur, le moindre temps ou le moindre classement.
2. Tu dois citer UNIQUEMENT et STRICTEMENT les nageurs réels figurant dans les données fournies ci-dessus. Tout nageur imaginaire (ex: Lucas Dupont, Emma Martin, Théo Leroy) est formellement banni.
3. VALORISATION DES CATÉGORIES D'ÂGE : Mets en valeur à la fois les podiums scratchs généraux (médaille d'Or, Argent, Bronze) ET les performances remarquables par année d'âge (Benjamins 2013-2014, Juniors 2009-2012).
4. FORMAT DE SORTIE : Réponds STRICTEMENT avec un JSON valide, sans texte additionnel et sans balises markdown \`\`\`json.

{
  "titre": "Titre enthousiaste avec emojis",
  "slug": "titre-slugifie-sans-accents-et-tirets",
  "contenu": "Article complet au format HTML avec balises <h2>, <h3>, <p>, <ul>, <li>, <strong>, <em>. Structure :\\n- Introduction chaleureuse\\n- Les podiums et médailles du club\\n- Les temps forts par génération d'âge (Benjamins, Juniors...)\\n- Félicitations aux nageurs, entraîneurs et parents.",
  "instagramText": "Post percutant pour Instagram/Facebook avec emojis, mention des vrais médaillés et hashtags (#TritonClubCavaillon #Natation #Cavaillon #FFN)."
}`

      for (const model of CANDIDATE_MODELS) {
        let attempt = 0
        const maxAttemptsForModel = 2

        while (attempt < maxAttemptsForModel) {
          attempt++
          try {
            const controller = new AbortController()
            const timeoutId = setTimeout(() => controller.abort(), 30000)

            const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`,
              },
              body: JSON.stringify({
                model,
                messages: [{ role: 'user', content: systemPrompt }],
                temperature: 0.25,
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
                aiLogger.info(`Article compétition généré avec succès avec le modèle ${model}`)
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
