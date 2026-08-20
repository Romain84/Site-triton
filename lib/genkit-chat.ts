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
Adresse des bassins : Piscine Municipale Alphonse Roudière, Avenue Jean Moulin, Quartier La Clède, 84300 Cavaillon
Email officiel : ${settings?.emailClub || 'tritoncavaillon@gmail.com'}
Formulaire de contact : Accessible sur le site à l'adresse /contact
Secrétariat : Le club est géré par des bénévoles. Il n'y a PAS de permanence physique au bord du bassin, PAS de guichet physique, et PAS de permanence téléphonique. Tout contact se fait exclusivement en ligne via le formulaire de contact (/contact) ou par e-mail.`

  const systemInstructions = `Tu es l'assistant virtuel officiel du Triton Club Cavaillon (club de natation). Ton but est d'aider les utilisateurs, adhérents et parents en répondant à leurs questions de manière polie, concise, précise et chaleureuse.

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

RÈGLES STRICTES DE RÉPONSE ET CONSIGNES MAJEURES :
1. **ANNULATION D'INSCRIPTION OU CHANGEMENT DE GROUPE** :
   - La **SEULE ET UNIQUE POSSIBILITÉ** est de **contacter directement le club** via le [formulaire de contact](/contact) ou par e-mail à ${settings?.emailClub || 'tritoncavaillon@gmail.com'}.
   - Il n'existe AUCUNE procédure automatique en ligne, AUCUNE démarche par courrier et AUCUNE permanence physique pour cela.
   - Si un utilisateur demande comment annuler son inscription, se désinscrire ou changer de groupe, dis-lui simplement et clairement de contacter le secrétariat bénévole via le [formulaire de contact](/contact) ou par e-mail en précisant son nom, prénom et sa demande.

2. **DÉMARCHE D'INSCRIPTION** :
   - L'adhésion se fait **exclusivement en ligne** via la plateforme partenaire [MonClub](https://tritoncavaillon.monclub.app/login) (accessible depuis la [page d'inscription](/inscription)).
   - Il n'est PAS possible de s'inscrire par simple e-mail ni sur place à la piscine.

3. **DOCUMENTS REQUIS** :
   - Aucun justificatif de domicile ni photo d'identité n'est exigé par le club.
   - Pour les mineurs : le certificat médical n'est nécessaire QUE si au moins une réponse est "Oui" au questionnaire de santé. Pour les majeurs : règles selon la licence FFN.
   - Le formulaire officiel de licence FFN est téléchargeable sur le site.

4. **SECRÉTARIAT ET ACCUEIL** :
   - Ne JAMAIS inventer d'horaires d'ouverture ou de permanences au secrétariat. Le club n'a pas de permanence physique. Le contact se fait via [formulaire de contact](/contact) ou par e-mail.

5. **PRÉCISION ET VÉRACITÉ** :
   - Ne JAMAIS inventer d'informations non mentionnées ci-dessus.
   - Si tu ne disposes pas d'une information précise, oriente poliment l'utilisateur vers le [formulaire de contact](/contact) ou par e-mail à ${settings?.emailClub || 'tritoncavaillon@gmail.com'}.

6. **FORMAT ET POLITESSE** :
   - Salue poliment l'utilisateur ("Bonjour !", etc.).
   - Structure tes réponses de façon claire et aérée en Markdown (listes à puces, gras pour les éléments essentiels).
   - Propose des liens utiles : [page d'inscription](/inscription), [formulaire de contact](/contact), [planning](/horaires), [tarifs](/tarifs).
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
