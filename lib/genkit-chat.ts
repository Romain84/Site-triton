import {
  getPlanningKnowledgeBase,
  getGroupesKnowledgeBase,
  getCustomKnowledgeBase,
  getCorrectedSuggestionsKnowledgeBase,
  getCalendrierKnowledgeBase,
  getActualitesKnowledgeBase,
  getBoutiqueKnowledgeBase,
  getSiteDatesKnowledgeBase,
} from './chatbot-knowledge'
import { prisma } from './prisma'
import { logger } from './logger'

const chatLogger = logger.withContext('GenkitChat')

/**
 * Get response from Mistral AI chatbot
 * @param userMessage The user's message
 * @param history Historique de conversation optionnel pour le contexte
 * @returns The chatbot's response
 */
export async function getChatResponse(
  userMessage: string,
  history?: { role: 'user' | 'assistant'; content: string }[]
): Promise<string> {
  const apiKey = process.env.MISTRAL_API_KEY

  if (!apiKey || apiKey === 'your-mistral-api-key-here') {
    throw new Error('MISTRAL_API_KEY not configured')
  }

  // Récupérer les paramètres et charger toutes les bases de connaissances en parallèle (Ultra-rapide avec cache TTL 5min)
  const [
    settings,
    planningKnowledge,
    groupesKnowledge,
    faqKnowledge,
    suggestionsKnowledge,
    calendrierKnowledge,
    actualitesKnowledge,
    boutiqueKnowledge,
    datesKnowledge,
  ] = await Promise.all([
    prisma.settings.findFirst({ select: { chatbotModel: true, emailClub: true } }),
    getPlanningKnowledgeBase(),
    getGroupesKnowledgeBase(),
    getCustomKnowledgeBase(),
    getCorrectedSuggestionsKnowledgeBase(),
    getCalendrierKnowledgeBase(),
    getActualitesKnowledgeBase(),
    getBoutiqueKnowledgeBase(),
    getSiteDatesKnowledgeBase(),
  ])

  const activeModelName = settings?.chatbotModel || 'mistral-small-latest'
  const modelToUse = activeModelName === 'mistral-large' ? 'mistral-large-latest' : 'mistral-small-latest'

  const now = new Date()
  const dateOptions: Intl.DateTimeFormatOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }
  const formattedDate = now.toLocaleDateString('fr-FR', dateOptions)
  const formattedTime = now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
  const dayOfWeek = now.toLocaleDateString('fr-FR', { weekday: 'long' })

  const contactInfo = `Triton Club Cavaillon
Adresse : Piscine Municipale Alphonse Roudière, Avenue Jean Moulin, Quartier La Clède, 84300 Cavaillon
Email : ${settings?.emailClub || 'tritoncavaillon@gmail.com'}
Secrétariat : Ouvert du Lundi au Vendredi de 17h00 à 19h00 et le Samedi de 9h00 à 12h00.`

  const systemInstructions = `Tu es l'assistant virtuel officiel du Triton Club Cavaillon (club de natation). Ton but est d'aider les utilisateurs, adhérents et parents en répondant à leurs questions de manière polie, précise et chaleureuse.

INFORMATIONS TEMPORELLES EN TEMPS RÉEL (CRITIQUE) :
- Date aujourd'hui : ${formattedDate}
- Jour actuel de la semaine : ${dayOfWeek}
- Heure actuelle : ${formattedTime}
Utilise TOUJOURS ces informations pour situer les demandes temporelles (ex. "ce soir", "aujourd'hui", "demain", "ce week-end", "lundi prochain").

INFORMATIONS OFFICIELLES DU CLUB (CONNAISSANCES EN TEMPS RÉEL DU SITE) :

--- INFORMATIONS DE CONTACT ---
${contactInfo}

--- DATES CLÉS ET INFORMATIONS GÉNÉRALES ---
${datesKnowledge}

--- PLANNING HEBDOMADAIRE & VACANCES ---
${planningKnowledge}

--- GROUPES & TARIFS ---
${groupesKnowledge}

--- CALENDRIER DES COMPÉTITIONS & ÉVÉNEMENTS ---
${calendrierKnowledge}

--- DERNIÈRES ACTUALITÉS ET ANNONCES DU SITE ---
${actualitesKnowledge}

--- ARTICLES DE LA BOUTIQUE DU CLUB ---
${boutiqueKnowledge}

--- FOIRE AUX QUESTIONS & CONNAISSANCES PERMANENTES ---
${faqKnowledge}

--- EXEMPLES & CONSIGNES ADMIN ---
${suggestionsKnowledge}

RÈGLES STRICTES DE RÉPONSE :
1. Réponds aux questions sur le club en te basant RIGOUREUSEMENT sur les informations officielles ci-dessus.
2. Si la question de l'utilisateur est hors-sujet ou ne concerne pas le Triton Club Cavaillon, réponds poliment que tu es l'assistant virtuel du Triton Club Cavaillon et invite-le à poser une question concernant la natation, les cours ou le club.
3. Si une information spécifique sur le club n'est pas présente dans les données ci-dessus, dis gentiment : "Je ne dispose pas de cette information précise. Je vous invite à contacter notre secrétariat via notre [formulaire de contact](/contact) ou par e-mail à ${settings?.emailClub || 'tritoncavaillon@gmail.com'} pour obtenir une réponse personnalisée."
4. Ne JAMAIS inventer d'informations.
5. Salue poliment l'utilisateur s'il dit "bonjour", "salut" ou formule une politesse.
6. Structure tes réponses de façon aérée et lisible en Markdown (listes à puces, gras pour les éléments importants, paragraphes clairs, emojis).
7. Propose des liens clairs vers les pages du site lorsque c'est pertinent :
   - Pour s'inscrire en ligne : [page d'inscription](/inscription) ou la plateforme partenaire [MonClub](https://tritoncavaillon.monclub.app/login)
   - Pour nous écrire ou envoyer un message : [formulaire de contact](/contact)
   - Pour voir le planning : [planning des cours](/horaires)
   - Pour consulter les tarifs : [tarifs d'adhésion](/tarifs)
   - Pour les documents officiels : [page des téléchargements](/telechargements)
`

  const messagesPayload: { role: 'system' | 'user' | 'assistant'; content: string }[] = [
    { role: 'system', content: systemInstructions },
  ]

  if (history && history.length > 0) {
    for (const msg of history) {
      messagesPayload.push({
        role: msg.role === 'user' ? 'user' : 'assistant',
        content: msg.content,
      })
    }
  }

  messagesPayload.push({
    role: 'user',
    content: userMessage,
  })

  let res = await fetch('https://api.mistral.ai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: modelToUse,
      messages: messagesPayload,
      temperature: 0.3,
    }),
  })

  if (!res.ok) {
    chatLogger.warn(`Repli modèle sur mistral-small-latest après HTTP ${res.status}`)
    res = await fetch('https://api.mistral.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'mistral-small-latest',
        messages: messagesPayload,
        temperature: 0.3,
      }),
    })
  }

  const data = await res.json()
  const textResponse = data.choices?.[0]?.message?.content || 'Désolé, je n\'ai pas pu obtenir de réponse. Veuillez réessayer.'

  // Enregistrer la consommation de tokens
  try {
    const promptTokens = data.usage?.prompt_tokens || 0
    const completionTokens = data.usage?.completion_tokens || 0
    const totalTokens = data.usage?.total_tokens || 0

    await prisma.chatbotTokenLog.create({
      data: {
        modelName: activeModelName,
        promptTokens,
        completionTokens,
        totalTokens,
      },
    })
  } catch (error) {
    chatLogger.error('Erreur lors de l\'enregistrement des tokens chatbot:', error)
  }

  return textResponse
}
