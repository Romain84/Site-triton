import { NextRequest } from 'next/server'
import { apiError, apiSuccess } from '@/lib/api/response'
import { logger } from '@/lib/logger'
import { prisma } from '@/lib/prisma'
import { fetchLiveFFNData } from '@/lib/liveffn-parser'

const aiLogger = logger.withContext('CompetitionSummaryAI')

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { rawNotes, competitionName, lieu, liveffnUrl } = body

    let effectiveNotes = rawNotes || ''
    let effectiveTitle = competitionName || ''
    let effectiveLieu = lieu || ''

    // 1. Si une URL LiveFFN est fournie, extraire les données depuis LiveFFN
    if (liveffnUrl && typeof liveffnUrl === 'string' && liveffnUrl.includes('liveffn.com')) {
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

    if (!effectiveNotes || typeof effectiveNotes !== 'string' || effectiveNotes.trim().length < 5) {
      return apiError('Veuillez fournir une URL LiveFFN ou saisir les résultats de la compétition.', 400)
    }

    const apiKey = process.env.MISTRAL_API_KEY
    if (!apiKey || apiKey === 'your-mistral-api-key-here') {
      return apiError('La clé MISTRAL_API_KEY n\'est pas configurée.', 500)
    }

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

    const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'mistral-small-latest',
        messages: [{ role: 'user', content: systemPrompt }],
        temperature: 0.3,
        response_format: { type: 'json_object' },
      }),
    })

    if (!response.ok) {
      const errText = await response.text()
      aiLogger.error('Erreur API Mistral HTTP ' + response.status, { errText })
      return apiError('Erreur de communication avec l\'API Mistral AI.', 502)
    }

    const resData = await response.json()
    const text = resData.choices?.[0]?.message?.content?.trim() || ''

    let parsed: any
    try {
      const jsonText = text.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/, '').trim()
      parsed = JSON.parse(jsonText)
    } catch (parseErr) {
      aiLogger.error('Erreur parsing JSON IA', { parseErr, text })
      return apiError('L\'IA n\'a pas généré un format JSON valide. Réessayez.', 500)
    }

    // Enregistrer automatiquement les podiums extrait en BDD pour le bilan de fin de saison
    if (Array.isArray(parsed.podiums) && parsed.podiums.length > 0) {
      try {
        const compTitle = effectiveTitle || parsed.titre || 'Compétition Natation'
        for (const pod of parsed.podiums) {
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
          }
        }
        aiLogger.info(`${parsed.podiums.length} podiums (officiels/virtuels) sauvegardés en BDD pour la compétition "${compTitle}"`)
      } catch (saveErr) {
        aiLogger.error('Erreur lors de la sauvegarde des podiums en BDD:', saveErr)
      }
    }

    return apiSuccess({
      titre: parsed.titre || 'Compétition Natation - Résultats',
      slug: parsed.slug || 'competition-resultats',
      contenu: parsed.contenu || text,
      instagramText: parsed.instagramText || '',
      podiumsSaved: Array.isArray(parsed.podiums) ? parsed.podiums.length : 0,
    })
  } catch (error: any) {
    aiLogger.error('Erreur lors de la génération du résumé de compétition avec l\'IA:', error)
    return apiError('Erreur lors de la génération de l\'article par l\'IA.', 500)
  }
}
