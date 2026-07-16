import { genkit, z } from 'genkit'
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

// --- DEFINITION DES OUTILS GENKIT 1.X ---

const getContactInfo = ai.defineTool(
  {
    name: 'getContactInfo',
    description: 'Récupère les informations de contact officielles du Triton Club Cavaillon (email, adresse de la piscine, horaires secrétariat).',
    inputSchema: z.object({}),
  },
  async () => {
    const settings = await prisma.settings.findFirst({ select: { emailClub: true } })
    return `Triton Club Cavaillon
Adresse : Piscine Municipale Alphonse Roudière, Avenue Jean Moulin, Quartier La Clède, 84300 Cavaillon
Email : ${settings?.emailClub || 'tritoncavaillon@gmail.com'}
Secrétariat : Ouvert du Lundi au Vendredi de 17h00 à 19h00 et le Samedi de 9h00 à 12h00.`
  }
)

const getPlanningInfo = ai.defineTool(
  {
    name: 'getPlanningInfo',
    description: 'Récupère les horaires des cours et des entraînements de natation du club.',
    inputSchema: z.object({}),
  },
  async () => {
    return getPlanningKnowledgeBase()
  }
)

const getGroupesInfo = ai.defineTool(
  {
    name: 'getGroupesInfo',
    description: 'Récupère la liste des groupes de natation, leurs tarifs (cotisations) et le nombre de places disponibles.',
    inputSchema: z.object({}),
  },
  async () => {
    return getGroupesKnowledgeBase()
  }
)

const getFAQAnswers = ai.defineTool(
  {
    name: 'getFAQAnswers',
    description: 'Recherche des réponses aux questions fréquentes sur le club (inscriptions, documents requis, règlements).',
    inputSchema: z.object({}),
  },
  async () => {
    return getCustomKnowledgeBase()
  }
)

const getCorrectedSuggestions = ai.defineTool(
  {
    name: 'getCorrectedSuggestions',
    description: 'Récupère des réponses spécifiques ou corrections personnalisées configurées par les administrateurs.',
    inputSchema: z.object({}),
  },
  async () => {
    return getCorrectedSuggestionsKnowledgeBase()
  }
)

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

// FAQ data structure - Informations générales statiques
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

  // Récupérer les paramètres uniquement
  const settings = await prisma.settings.findFirst({ select: { chatbotModel: true } })
  const activeModel = getModelRef(settings?.chatbotModel)

  const now = new Date()
  const dateOptions: Intl.DateTimeFormatOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }
  const formattedDate = now.toLocaleDateString('fr-FR', dateOptions)
  const formattedTime = now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
  const dayOfWeek = now.toLocaleDateString('fr-FR', { weekday: 'long' })

  const systemInstructions = `Tu es l'assistant virtuel officiel du Triton Club Cavaillon (club de natation). Ton but est d'aider les utilisateurs, adhérents et parents en répondant à leurs questions de manière polie, précise et chaleureuse.

INFORMATIONS TEMPORELLES EN TEMPS RÉEL (CRITIQUE) :
- Date aujourd'hui : ${formattedDate}
- Jour actuel de la semaine : ${dayOfWeek}
- Heure actuelle : ${formattedTime}
Utilise TOUJOURS ces informations pour situer les demandes temporelles (ex. "ce soir", "aujourd'hui", "demain", "ce week-end", "lundi prochain"). Par exemple, si l'utilisateur demande "les cours de ce soir", base-toi sur le jour de la semaine actuel (${dayOfWeek}) pour lui indiquer les cours de ce jour-là.

RÈGLES D'UTILISATION DES OUTILS :
1. Si l'utilisateur pose une question spécifique sur le club (planning, tarifs, adhésions, contact, règlements), utilise l'un des outils mis à ta disposition (getPlanningInfo, getGroupesInfo, getContactInfo, getFAQAnswers, getCorrectedSuggestions) pour obtenir l'information exacte et à jour.
2. Si la réponse ne figure pas dans le retour des outils, dis gentiment et honnêtement : "Je ne dispose pas de cette information précise. Je vous invite à contacter notre secrétariat via notre [formulaire de contact](/contact) ou par e-mail à tritoncavaillon@gmail.com pour obtenir une réponse personnalisée."
3. Ne JAMAIS inventer d'informations.
4. Salue poliment l'utilisateur s'il dit "bonjour", "salut" ou formule une politesse, et remercie-le chaleureusement s'il te remercie, de manière naturelle et fluide.
5. Structure tes réponses de façon aérée et lisible en Markdown (listes à puces, gras pour les éléments importants, paragraphes clairs, emojis pour le côté convivial).
6. Propose des liens clairs vers les pages du site lorsque c'est pertinent :
   - Pour s'inscrire en ligne : [page d'inscription](/inscription) ou la plateforme partenaire [MonClub](https://tritoncavaillon.monclub.app/login)
   - Pour nous écrire ou envoyer un message : [formulaire de contact](/contact)
   - Pour voir le planning : [planning des cours](/horaires)
   - Pour consulter les tarifs : [tarifs d'adhésion](/tarifs)
   - Pour les documents officiels : [page des téléchargements](/telechargements)

INFORMATIONS STATIQUES GÉNÉRALES :
${faqDataStatique}
`

  // Mapper l'historique au format attendu par Genkit
  const messages: any[] = []
  if (history && history.length > 0) {
    for (const msg of history) {
      messages.push({
        role: msg.role === 'user' ? 'user' : 'model',
        content: [{ text: msg.content }]
      })
    }
  }

  // Ajouter la nouvelle question de l'utilisateur
  messages.push({
    role: 'user',
    content: [{ text: userMessage }]
  })

  const response = await ai.generate({
    model: activeModel,
    system: systemInstructions,
    messages: messages,
    tools: [getContactInfo, getPlanningInfo, getGroupesInfo, getFAQAnswers, getCorrectedSuggestions],
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
