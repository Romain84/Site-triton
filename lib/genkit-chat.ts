import { genkit } from 'genkit'
import mistral, { openMistral7B, openMistralSmall, openMistralLarge, openMinistral8B } from 'genkitx-mistral'
import { getPlanningKnowledgeBase, getGroupesKnowledgeBase, getCustomKnowledgeBase, getCorrectedSuggestionsKnowledgeBase } from './chatbot-knowledge'
import { prisma } from './prisma'

// Initialize Genkit with Mistral AI plugin
const ai = genkit({
  plugins: [
    mistral({
      apiKey: process.env.MISTRAL_API_KEY,
    }),
  ],
})

function getModelRef(modelName: string | null | undefined) {
  switch (modelName?.toLowerCase()) {
    case 'mistral-large':
      return openMistralLarge
    case 'mistral-small':
      return openMistralSmall
    case 'ministral-8b':
      return openMinistral8B
    case 'mistral-7b':
    default:
      return openMistral7B
  }
}

// FAQ data structure - Informations générales
const faqDataStatique = `
**Informations générales :**
- Le Triton Club Cavaillon est un club de natation situé à Cavaillon.
- Nous proposons des cours pour tous les âges et tous les niveaux.
- Nos entraîneurs sont qualifiés et expérimentés.

**Contact :**
- Adresse : Piscine Municipale, Avenue Pierre de Coubertin, 84300 Cavaillon
- Email : tritoncavaillon@gmail.com

**Horaires du secrétariat :**
- Lundi - Vendredi : 17h00 - 19h00
- Samedi : 9h00 - 12h00
- Dimanche : Fermé
(Horaires susceptibles de varier pendant les vacances scolaires)

**Inscriptions :**
- Les inscriptions se font en ligne via le formulaire de contact ou directement à la piscine pendant les heures d'ouverture du secrétariat.
- Documents nécessaires : Certificat médical de non contre-indication à la pratique de la natation, photo d'identité, et formulaire d'inscription complété.

**Compétitions :**
- Le club participe à des compétitions régionales et nationales.
- Les nageurs sont répartis en catégories : Avenirs, Benjamins, Juniors, Adultes.
- Le calendrier des compétitions est disponible dans la section Calendrier du site.

**Questions fréquentes :**
Q : Comment s'inscrire ?
R : Vous pouvez vous inscrire en ligne via notre formulaire de contact ou directement à la piscine pendant les heures d'ouverture du secrétariat.

Q : Quels documents fournir ?
R : Certificat médical de non contre-indication à la pratique de la natation, photo d'identité, et formulaire d'inscription complété.

Q : Y a-t-il des cours pour débutants ?
R : Oui, nous proposons des cours pour tous les niveaux, y compris les débutants.

Q : Peut-on assister à une séance d'essai ?
R : Oui, vous pouvez assister à une séance d'essai gratuite. Contactez-nous pour réserver.
`

/**
 * Get response from Mistral AI chatbot using Genkit
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

  // Récupérer les données dynamiques et les paramètres depuis la base de données
  const [planningData, groupesData, customData, correctionsData, settings] = await Promise.all([
    getPlanningKnowledgeBase(),
    getGroupesKnowledgeBase(),
    getCustomKnowledgeBase(),
    getCorrectedSuggestionsKnowledgeBase(),
    prisma.settings.findFirst({ select: { chatbotModel: true } }),
  ])

  const activeModel = getModelRef(settings?.chatbotModel)

  // Combiner toutes les données
  const faqData = `${faqDataStatique}

${planningData}

${groupesData}

${customData}

${correctionsData}`

  const now = new Date()
  const dateOptions: Intl.DateTimeFormatOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }
  const formattedDate = now.toLocaleDateString('fr-FR', dateOptions)
  const formattedTime = now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
  const dayOfWeek = now.toLocaleDateString('fr-FR', { weekday: 'long' })

  // Construire la section historique si disponible
  let historySection = ''
  if (history && history.length > 0) {
    const formattedHistory = history
      .map((msg) =>
        msg.role === 'user'
          ? `Utilisateur : ${msg.content}`
          : `Assistant : ${msg.content}`
      )
      .join('\n')
    historySection = `
HISTORIQUE DE LA CONVERSATION (messages précédents pour le contexte) :
${formattedHistory}

Nouvelle question de l'utilisateur : ${userMessage}`
  } else {
    historySection = `Question de l'utilisateur : ${userMessage}`
  }

  const prompt = `Tu es un assistant virtuel pour le Triton Club Cavaillon, un club de natation.

INFORMATIONS TEMPORELLES EN TEMPS RÉEL (CRITIQUE) :
- Date aujourd'hui : ${formattedDate}
- Jour actuel de la semaine : ${dayOfWeek}
- Heure actuelle : ${formattedTime}
- Utilise TOUJOURS ces informations pour situer la demande temporelle de l'utilisateur (ex. "ce soir", "aujourd'hui", "demain", "ce week-end"). Par exemple, si l'utilisateur demande "les cours de ce soir", tu dois te baser sur le jour de la semaine ci-dessus (${dayOfWeek}) pour lui donner les entraînements de ce jour-là précisément.

RÈGLES IMPORTANTES :
1. Réponds UNIQUEMENT avec les informations fournies ci-dessous
2. Si l'information n'est PAS dans la base de connaissances, dis-le clairement
3. NE JAMAIS inventer d'horaires, de dates ou d'informations
4. Les horaires de cours sont fournis ci-dessous - utilise-les directement
5. Réponds de manière amicale mais honnête et précise

BASE DE CONNAISSANCES (INFORMATIONS À JOUR) :

${faqData}

Si la question concerne :
- Une information non présente ci-dessus : "Je n'ai pas cette information précise. Pour une réponse personnalisée, utilisez le formulaire de contact ci-dessous."

${historySection}

Réponse (en français, amicale mais factuelle) :`

  const response = await ai.generate({
    model: activeModel,
    prompt,
    config: {
      temperature: 0.3, // Basse température pour éviter les hallucinations
    },
  })

  // Enregistrer la consommation de tokens
  try {
    const promptTokens = response.usage?.inputTokens || 0
    const completionTokens = response.usage?.outputTokens || 0
    const totalTokens = response.usage?.totalTokens || 0
    const modelName = settings?.chatbotModel || 'mistral-small'

    await prisma.chatbotTokenLog.create({
      data: {
        modelName,
        promptTokens,
        completionTokens,
        totalTokens,
      },
    })
  } catch (error) {
    console.error('Erreur lors de l\'enregistrement des tokens chatbot:', error)
  }

  return response.text
}
