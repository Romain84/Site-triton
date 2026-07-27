import { NextRequest, NextResponse } from 'next/server'
import { genkit } from 'genkit'
import mistral, { openMistralSmall } from 'genkitx-mistral'
import { apiError, apiSuccess } from '@/lib/api/response'
import { logger } from '@/lib/logger'
import { prisma } from '@/lib/prisma'

const aiLogger = logger.withContext('CompetitionSummaryAI')

const ai = genkit({
  plugins: [
    mistral({
      apiKey: process.env.MISTRAL_API_KEY,
    }),
  ],
})

import { fetchLiveFFNData } from '@/lib/liveffn-parser'

const aiLogger = logger.withContext('CompetitionSummaryAI')

const ai = genkit({
  plugins: [
    mistral({
      apiKey: process.env.MISTRAL_API_KEY,
    }),
  ],
})

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

    const prompt = `Tu es le responsable de communication et coach du Triton Club Cavaillon (club de natation FFN à Cavaillon, 84).
Ton rôle est de transformer les résultats officiels LiveFFN ou notes brutes d'une compétition de natation en un superbe article d'actualité captivant, dynamique et chaleureux pour le site web du club et ses réseaux sociaux.

DONNÉES EN ENTRÉE (COMPÉTITION & RÉSULTATS LIVEFFN) :
${effectiveTitle ? `- Nom de la compétition : ${effectiveTitle}` : ''}
${effectiveLieu ? `- Lieu : ${effectiveLieu}` : ''}
${liveffnUrl ? `- URL officielle LiveFFN : ${liveffnUrl}` : ''}
- Résultats & Notes fournies :
"""
${effectiveNotes}
"""`

    const finalPrompt = `${prompt}

CONSIGNES DE RÉDACTION ET FORMAT DE SORTIE :
Tu dois répondre STRICTEMENT sous la forme d'un objet JSON valide contenant exactement les clés suivantes :

{
  "titre": "Un titre percutant avec emojis (ex: 🏆 PLUIE DE MÉDAILLES ET RECORDS POUR LE TRITON CLUB À AVIGNON !)",
  "slug": "un-slug-propres-sans-accents-et-tirets",
  "contenu": "L'article complet au format HTML pour l'éditeur du site. Il doit contenir des balises HTML (<h2>, <h3>, <p>, <ul>, <li>, <strong>, <em>). Structure l'article avec :\\n- Une introduction enthousiaste et dynamique\\n- Section Podiums et Médailles du Triton Club Cavaillon\\n- Section Faits marquants & Records personnels battus\\n- Un mot de félicitations du club aux nageurs, aux entraîneurs et aux parents supporters.",
  "instagramText": "Un texte court (max 1500 caractères) spécialement rédigé pour Instagram/Facebook avec des emojis, les temps forts et des hashtags populaires (#TritonClubCavaillon #Natation #FFN #LiveFFN #Cavaillon #Vaucluse #EspritTriton)."
}

RÈGLES IMPORTANTES :
- Garde un ton très positif, motivant et rassembleur ("Allez les Tritons !").
- Si des résultats LiveFFN sont fournis, mets à l'honneur les nageurs du TRITON CLUB CAVAILLON et leurs meilleures places/performances.
- Ne réponds rien d'autre que du JSON brut valide (pas de markdown \`\`\`json avant ou après).`

    const response = await ai.generate({
      model: openMistralSmall,
      prompt: prompt,
      config: {
        temperature: 0.4,
      },
    })

    const text = response.text.trim()
    let parsed: any

    try {
      // Nettoyer les balises éventuelles ```json
      const jsonText = text.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/, '').trim()
      parsed = JSON.parse(jsonText)
    } catch (parseErr) {
      aiLogger.error('Erreur parsing JSON IA:', parseErr, 'Texte reçu:', text)
      return apiError('L\'IA n\'a pas généré un format JSON valide. Réessayez.', 500)
    }

    return apiSuccess({
      titre: parsed.titre || 'Compétition Natation - Résultats',
      slug: parsed.slug || 'competition-resultats',
      contenu: parsed.contenu || text,
      instagramText: parsed.instagramText || '',
    })
  } catch (error: any) {
    aiLogger.error('Erreur lors de la génération du résumé de compétition avec l\'IA:', error)
    return apiError('Erreur lors de la génération de l\'article par l\'IA.', 500)
  }
}
