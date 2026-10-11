import { NextRequest } from 'next/server'
import { apiError, apiSuccess } from '@/lib/api/response'
import { logger } from '@/lib/logger'
import { prisma } from '@/lib/prisma'
import { fetchLiveFFNData } from '@/lib/liveffn-parser'
import { requireAdmin } from '@/lib/api/guards'
import { generateFallbackDraftArticle } from '@/lib/competition-summary-fallback'

const aiLogger = logger.withContext('CompetitionSummaryAI')

// Cascade de modèles Mistral en cas de saturation ou dépassement de cadence (HTTP 429)
const CANDIDATE_MODELS = [
  'mistral-small-latest',
  'ministral-8b-latest',
  'open-mistral-7b',
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

    // 1. Si une URL LiveFFN est fournie, valider strictement l'hôte et extraire les données
    if (liveffnUrl && typeof liveffnUrl === 'string') {
      try {
        const parsed = new URL(liveffnUrl)
        const validHostnames = ['liveffn.com', 'www.liveffn.com']
        if (validHostnames.includes(parsed.hostname.toLowerCase()) && (parsed.protocol === 'https:' || parsed.protocol === 'http:')) {
          const liveData = await fetchLiveFFNData(liveffnUrl)
          if (liveData) {
            if (!effectiveTitle && liveData.title) effectiveTitle = liveData.title
            if (!effectiveLieu && liveData.location) effectiveLieu = liveData.location

            const tritonText = liveData.tritonResults.length > 0
              ? liveData.tritonResults.join('\n')
              : liveData.rawTextContent

            effectiveNotes = `RÉSULTATS IMPORTÉS DIRECTEMENT DE LIVEFFN (${liveffnUrl}) :\n${tritonText}\n\nNOTES COMPLÉMENTAIRES DU COACH :\n${rawNotes || 'Aucune'}`
          }
        }
      } catch {
        // Ignorer les URLs malformées
      }
    }

    if (!effectiveNotes || typeof effectiveNotes !== 'string' || effectiveNotes.trim().length < 5) {
      return apiError('Veuillez fournir une URL LiveFFN ou saisir les résultats de la compétition.', 400)
    }

    // Protection anti-explosion de tokens (limite à 5000 caractères pour éviter le plafond TPM)
    if (effectiveNotes.length > 5000) {
      effectiveNotes = effectiveNotes.slice(0, 5000) + '\n[... extrait synthétisé des résultats pour analyse]'
    }

    const apiKey = process.env.MISTRAL_API_KEY
    const hasValidKey = apiKey && apiKey !== 'your-mistral-api-key-here'

    let parsedResult: any = null
    let usedFallback = false
    let fallbackNotice = ''

    if (hasValidKey) {
      const systemPrompt = `Tu es le responsable de communication et coach du Triton Club Cavaillon (club de natation FFN à Cavaillon, 84).
Ton rôle est de transformer les résultats officiels LiveFFN ou notes brutes d'une compétition de natation en un superbe article d'actualité captivant, dynamique et chaleureux pour le site web du club et ses réseaux sociaux.

DONNÉES EN ENTRÉE (COMPÉTITION & RÉSULTATS LIVEFFN) :
${effectiveTitle ? `- Nom de la compétition : ${effectiveTitle}` : ''}
${effectiveLieu ? `- Lieu : ${effectiveLieu}` : ''}
${liveffnUrl ? `- URL officielle LiveFFN : ${liveffnUrl}` : ''}
- Résultats & Notes fournies :
"""
${effectiveNotes}
"""

CONSIGNES DE RÉDACTION ET FORMAT DE SORTIE :
Tu dois répondre STRICTEMENT sous la forme d'un objet JSON valide contenant exactement les clés suivantes :

{
  "titre": "Un titre percutant avec emojis (ex: 🏆 PLUIE DE MÉDAILLES ET RECORDS POUR LE TRITON CLUB À AVIGNON !)",
  "slug": "un-slug-propres-sans-accents-et-tirets",
  "contenu": "L'article complet au format HTML pour l'éditeur du site. Il doit contenir des balises HTML (<h2>, <h3>, <p>, <ul>, <li>, <strong>, <em>). Structure l'article avec :\\n- Une introduction enthousiaste et dynamique\\n- Section Podiums & Faits marquants généraux\\n- Section 📊 Classements & Perfs par Année de Naissance / Sous-catégories (Seniors, J17, J16, J15, J14, Avenirs...)\\n- Un mot de félicitations du club aux nageurs, aux entraîneurs et aux parents supporters.",
  "instagramText": "Un texte court (max 1500 caractères) spécialement rédigé pour Instagram/Facebook avec des emojis, les temps forts par année d'âge et des hashtags populaires (#TritonClubCavaillon #Natation #FFN #LiveFFN #Cavaillon #Vaucluse #EspritTriton).",
  "podiums": [
    {
      "nageurNom": "Lucas Dupont",
      "categorie": "J15",
      "epreuve": "100m NL",
      "place": 1,
      "estVirtuel": true,
      "temps": "54s21"
    }
  ]
}

RÈGLES IMPORTANTES ET GESTION DES ANNÉES D'ÂGE (CRITIQUE) :
1. CLASSEMENT PAR ANNÉE D'ÂGE : Dans les résultats officiels de la FFN, les catégories comme 'Juniors' mélangent des nageurs d'âges différents (ex: J14, J15, J16, J17). Un nageur J14 ou J15 (14/15 ans) peut être super performant pour son âge tout en étant placé plus bas dans le classement général mélangé avec des J17 de 17 ans.
2. DÉGAGE ET METS EN VALEUR LE CLASSEMENT PAR ANNÉE DE NAISSANCE / SOUS-CATÉGORIE : Analyse la date/année de naissance ou la sous-catégorie d'âge de chaque nageur et mets en évidence ses meilleures performances DANS SA TRANCHE D'ÂGE D'ORIGINE (ex: "1er des J15", "Meilleure performance 2011", "Top 3 des 14 ans").
3. LISTE DES PODIUMS (POUR BILAN DE FIN DE SAISON) : Remplis soigneusement le tableau "podiums" en y incluant tous les podiums officiels (place 1, 2 ou 3) ET virtuels par année d'âge (ex: place 1, 2 ou 3 parmi les J15 / 15 ans).
4. Garde un ton très positif, motivant et rassembleur ("Allez les Tritons !").
5. Ne réponds rien d'autre que du JSON brut valide (pas de markdown \`\`\`json avant ou après).`

      // Parcours des modèles candidats avec réessais en cas de rate-limit (429)
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
                temperature: 0.3,
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
                break // Succès avec ce modèle
              } catch (parseErr) {
                aiLogger.warn(`Erreur parsing JSON sur ${model}`, { parseErr, text })
                // Tenter le modèle suivant
                break
              }
            }

            // Gestion de l'erreur 429 (Rate limit)
            if (response.status === 429) {
              const retryAfterHeader = response.headers.get('retry-after')
              const retryAfterSeconds = retryAfterHeader ? parseInt(retryAfterHeader, 10) : 2
              const waitMs = Math.min(Math.max(isNaN(retryAfterSeconds) ? 2 : retryAfterSeconds, 1.5) * 1000, 4000)

              aiLogger.warn(`Mistral 429 (Rate limit) sur ${model}. Tentative ${attempt}/${maxAttemptsForModel}. Attente de ${waitMs}ms...`)

              if (attempt < maxAttemptsForModel) {
                await sleep(waitMs)
                continue // Réessayer le même modèle après l'attente
              } else {
                aiLogger.warn(`Modèle ${model} saturé après ${attempt} tentatives, bascule vers le modèle suivant...`)
                break // Passer au modèle suivant
              }
            }

            // Autres erreurs HTTP (500, 502, 503...)
            const errText = await response.text()
            aiLogger.warn(`Erreur API Mistral HTTP ${response.status} sur ${model}`, { errText })
            break // Essayer le modèle suivant
          } catch (err: any) {
            aiLogger.warn(`Exception lors de l'appel Mistral sur ${model} (tentative ${attempt}):`, err?.message || err)
            if (attempt < maxAttemptsForModel) {
              await sleep(1500)
            } else {
              break
            }
          }
        }

        // Si nous avons obtenu un résultat valide, arrêter la boucle des modèles
        if (parsedResult) {
          break
        }
      }
    }

    // 4. Si Mistral n'a pas pu répondre (429 persistant, quota épuisé ou pas de clé), bascule en mode gabarit assisté
    if (!parsedResult) {
      usedFallback = true
      fallbackNotice = 'Génération effectuée en mode gabarit assisté (l\'API Mistral AI est temporairement saturée ou indisponible).'
      aiLogger.warn('Bascule sur le générateur de secours (FallbackDraft) pour la compétition:', { effectiveTitle })

      parsedResult = generateFallbackDraftArticle({
        competitionName: effectiveTitle,
        lieu: effectiveLieu,
        liveffnUrl,
        rawNotes: effectiveNotes,
      })
    }

    // 5. Enregistrer automatiquement les podiums extraits en BDD pour le bilan de fin de saison
    let podiumsSaved = 0
    if (Array.isArray(parsedResult.podiums) && parsedResult.podiums.length > 0) {
      try {
        const compTitle = effectiveTitle || parsedResult.titre || 'Compétition Natation'
        for (const pod of parsedResult.podiums) {
          if (pod.nageurNom && typeof pod.nageurNom === 'string') {
            await prisma.podiumSaison.create({
              data: {
                nageurNom: pod.nageurNom,
                categorie: pod.categorie || 'Juniors',
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
        aiLogger.info(`${podiumsSaved} podiums sauvegardés en BDD pour la compétition "${compTitle}"`)
      } catch (saveErr) {
        aiLogger.error('Erreur lors de la sauvegarde des podiums en BDD:', saveErr)
      }
    }

    return apiSuccess({
      titre: parsedResult.titre || 'Compétition Natation - Résultats',
      slug: parsedResult.slug || 'competition-resultats',
      contenu: parsedResult.contenu || '',
      instagramText: parsedResult.instagramText || '',
      podiumsSaved,
      isFallbackDraft: usedFallback,
      notice: fallbackNotice || undefined,
    })
  } catch (error: any) {
    aiLogger.error('Erreur inattendue lors de la génération de l\'article:', error)
    return apiError('Erreur lors de la génération de l\'article.', 500)
  }
}
