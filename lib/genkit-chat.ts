import {
  getPlanningKnowledgeBase,
  getGroupesKnowledgeBase,
  getCustomKnowledgeBase,
  getCorrectedSuggestionsKnowledgeBase,
  getCalendrierKnowledgeBase,
  getActualitesKnowledgeBase,
  getBoutiqueKnowledgeBase,
  getSiteDatesKnowledgeBase,
  getSeancesAnnuleesKnowledgeBase,
  getSessionsTestsNageKnowledgeBase,
  getInscriptionBlocksKnowledgeBase,
} from './chatbot-knowledge'
import { prisma } from './prisma'
import { logger } from './logger'

const chatLogger = logger.withContext('GenkitChat')

const MODEL_MAP: Record<string, string> = {
  'mistral-large': 'mistral-large-latest',
  'mistral-small': 'mistral-small-latest',
  'ministral-8b': 'ministral-8b-latest',
  'mistral-7b': 'open-mistral-7b',
}

export interface ChatAction {
  label: string
  url: string
  icon?: 'swimmer' | 'calendar' | 'document' | 'mail' | 'cart' | 'info'
}

export interface ChatResponseResult {
  response: string
  actions: ChatAction[]
  suggestions: string[]
}

/**
 * Analyse sémantique et par mots-clés de la demande pour cibler les données requises.
 * Réduit la consommation de tokens de plus de 75% par rapport à l'injection globale.
 */
export function detectUserIntents(
  userMessage: string,
  history?: { role: string; content: string }[]
) {
  const combinedText = [
    userMessage,
    ...(history?.slice(-2).map((h) => h.content) || []),
  ].join(' ').toLowerCase()

  const planning = /\b(planning|horaire|horaires|heure|heures|cours|seance|séance|seances|séances|creneau|créneau|creneaux|créneaux|quand|jour|jours|lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche|matin|soir|aujourd'hui|demain|vacance|vacances|ferie|férié|noel|noël|toussaint|paques|pâques|ete|été)\b/i.test(combinedText)

  const groupes = /\b(groupe|groupes|niveau|niveaux|age|âge|ans|enfant|enfants|fils|fille|petit|petits|bebe|bébé|bebes|bébés|ado|ados|adulte|adultes|maitre|maître|maitres|maîtres|debutant|débutant|perfectionnement|sauvnage|sauv'nage|pass-sport|pass'sport|ecole|école|competition|compétition|avenir|avenirs|benjamin|benjamins|junior|juniors|senior|seniors|loisir|loisirs|aquagym|nfs|nage forme|santé|sante|ssa|bnssa|sauvetage|nageur|nager)\b/i.test(combinedText)

  const tarifs = /\b(tarif|tarifs|prix|cout|coût|coute|coûte|cotisation|cotisations|euro|euros|€|payer|paiement|paiements|cb|carte|cheque|chèque|cheques|chèques|espece|espèce|especes|espèces|virement|prelevement|prélèvement|echelonne|échelonné|pass sport|pass'sport|aide|aides|reduction|réduction)\b/i.test(combinedText)

  const inscriptions = /\b(inscri|inscrire|inscription|inscriptions|reinscri|réinscri|reinscription|réinscription|monclub|dossier|document|documents|certificat|medical|médical|licence|ffn|formulaire|questionnaire|adhesion|adhésion)\b/i.test(combinedText)

  const testsNage = /\b(test|tests|test de nage|tests de nage|evaluer|évaluer|evaluation|évaluation|essai|séance d'essai|seance d'essai|rdv test|rdv)\b/i.test(combinedText)

  const annulations = /\b(annul|annule|annulé|annulée|annulations|seance annulee|séance annulée|ferme|fermé|fermeture|greve|grève|intemperie|intempérie|travaux|technique|vidange|maintenu|maintien)\b/i.test(combinedText)

  const boutique = /\b(boutique|bonnet|bonnets|maillot|maillots|combinaison|lunettes|materiel|matériel|equipement|équipement|sac|pull|veste|textile|gourde)\b/i.test(combinedText)

  const calendrier = /\b(calendrier|competition|compétition|competitions|compétitions|meeting|meetings|date|dates|evenement|événement|evenements|événements|championnat|interclubs)\b/i.test(combinedText)

  const actualites = /\b(actu|actus|actualite|actualité|actualites|actualités|nouvelle|nouvelles|nouvel|stage|stages)\b/i.test(combinedText)

  const isGreetingOrGeneric = !planning && !groupes && !tarifs && !inscriptions && !testsNage && !annulations && !boutique && !calendrier && !actualites

  return {
    planning: planning || annulations,
    groupes: groupes || isGreetingOrGeneric,
    tarifs,
    inscriptions,
    testsNage: testsNage || (groupes && /\b(enfant|enfants|fils|fille|petit|petits|bebe|bébé|ado|ados|nouveau|nouvelle|ans)\b/i.test(combinedText)),
    annulations,
    boutique,
    calendrier,
    actualites,
    isGreetingOrGeneric,
  }
}

/**
 * Génère des actions rapides pertinentes et des questions suggérées selon la réponse et les intentions
 */
export function deriveActionsAndSuggestions(
  response: string,
  intents: ReturnType<typeof detectUserIntents>,
  userMessage: string
): { actions: ChatAction[]; suggestions: string[] } {
  const actions: ChatAction[] = []
  const suggestions: string[] = []
  const lowerRes = response.toLowerCase()
  const lowerMsg = userMessage.toLowerCase()

  // 1. Boutons d'action cliquables
  if (intents.testsNage || lowerRes.includes('test') || lowerRes.includes('tests-nage') || lowerRes.includes('évaluation')) {
    actions.push({
      label: 'Prendre RDV Test de Nage',
      url: '/tests-nage',
      icon: 'swimmer',
    })
  }

  if (intents.inscriptions || intents.tarifs || lowerRes.includes('monclub') || lowerRes.includes('/inscription')) {
    actions.push({
      label: 'Inscriptions en ligne',
      url: '/inscription',
      icon: 'document',
    })
  }

  if (intents.planning || lowerRes.includes('/planning') || lowerRes.includes('horaire')) {
    actions.push({
      label: 'Consulter le planning',
      url: '/planning',
      icon: 'calendar',
    })
  }

  if (intents.groupes && !actions.some((a) => a.url === '/groupes') && (lowerRes.includes('groupe') || lowerRes.includes('/groupes'))) {
    actions.push({
      label: 'Découvrir nos groupes',
      url: '/groupes',
      icon: 'swimmer',
    })
  }

  if (intents.boutique || lowerRes.includes('/boutique')) {
    actions.push({
      label: 'Boutique du club',
      url: '/boutique',
      icon: 'cart',
    })
  }

  // Si le bot n'a pas pu répondre ou renvoie vers le contact
  if (
    lowerRes.includes('contact') ||
    lowerRes.includes('ne dispose pas') ||
    lowerRes.includes('n\'ai pas cette information')
  ) {
    actions.push({
      label: 'Contacter le secrétariat',
      url: '/contact',
      icon: 'mail',
    })
  }

  // Dédupliquer les actions par URL et limiter à 3 max pour un affichage épuré
  const uniqueActions: ChatAction[] = []
  for (const act of actions) {
    if (!uniqueActions.some((a) => a.url === act.url)) {
      uniqueActions.push(act)
    }
    if (uniqueActions.length >= 3) break
  }

  // 2. Suggestions de relance (Chips interactifs)
  if (intents.testsNage || lowerMsg.includes('test')) {
    suggestions.push('Combien de temps dure le test ?')
    suggestions.push('Quels sont les horaires des cours ?')
    suggestions.push('Quels sont les tarifs annuels ?')
  } else if (intents.planning || intents.annulations) {
    suggestions.push('Y a-t-il cours pendant les vacances ?')
    suggestions.push('Comment s\'inscrire à un groupe ?')
    suggestions.push('Où se déroulent les cours ?')
  } else if (intents.tarifs || intents.inscriptions) {
    suggestions.push('Peut-on payer en plusieurs fois ?')
    suggestions.push('Quels documents faut-il fournir ?')
    suggestions.push('Comment réserver un test de niveau ?')
  } else if (intents.groupes) {
    suggestions.push('Quels sont les tarifs de ce groupe ?')
    suggestions.push('Quels sont les jours d\'entraînement ?')
    suggestions.push('Faut-il passer un test de niveau ?')
  } else {
    suggestions.push('Quel groupe pour mon enfant ?')
    suggestions.push('Quels sont les tarifs du club ?')
    suggestions.push('Consulter les horaires des cours')
  }

  return { actions: uniqueActions, suggestions: suggestions.slice(0, 3) }
}

/**
 * Récupère la réponse structurée de l'assistant IA avec actions, suggestions et routage intelligent
 */
export async function getStructuredChatResponse(
  userMessage: string,
  history?: { role: 'user' | 'assistant'; content: string }[]
): Promise<ChatResponseResult> {
  const apiKey = process.env.MISTRAL_API_KEY

  if (!apiKey || apiKey === 'your-mistral-api-key-here') {
    throw new Error('MISTRAL_API_KEY not configured')
  }

  // Détection des intentions pour charger uniquement les données nécessaires
  const intents = detectUserIntents(userMessage, history)

  // Récupérer les paramètres et bases de connaissances ciblées en parallèle
  const [
    settings,
    faqKnowledge,
    suggestionsKnowledge,
    datesKnowledge,
    planningKnowledge,
    groupesKnowledge,
    seancesAnnuleesKnowledge,
    testsNageKnowledge,
    inscriptionBlocksKnowledge,
    calendrierKnowledge,
    actualitesKnowledge,
    boutiqueKnowledge,
  ] = await Promise.all([
    prisma.settings.findFirst({ select: { chatbotModel: true, emailClub: true } }),
    getCustomKnowledgeBase(),
    getCorrectedSuggestionsKnowledgeBase(),
    getSiteDatesKnowledgeBase(),
    intents.planning ? getPlanningKnowledgeBase() : Promise.resolve(''),
    intents.groupes || intents.tarifs ? getGroupesKnowledgeBase() : Promise.resolve(''),
    intents.planning || intents.annulations ? getSeancesAnnuleesKnowledgeBase() : Promise.resolve(''),
    intents.testsNage || intents.groupes ? getSessionsTestsNageKnowledgeBase() : Promise.resolve(''),
    intents.inscriptions || intents.tarifs ? getInscriptionBlocksKnowledgeBase() : Promise.resolve(''),
    intents.calendrier ? getCalendrierKnowledgeBase() : Promise.resolve(''),
    intents.actualites ? getActualitesKnowledgeBase() : Promise.resolve(''),
    intents.boutique ? getBoutiqueKnowledgeBase() : Promise.resolve(''),
  ])

  const activeModelName = settings?.chatbotModel || 'mistral-small'
  const modelToUse = MODEL_MAP[activeModelName.toLowerCase()] || 'mistral-small-latest'
  const clubEmail = settings?.emailClub || 'tritoncavaillon@gmail.com'

  const now = new Date()
  const dateOptions: Intl.DateTimeFormatOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }
  const formattedDate = now.toLocaleDateString('fr-FR', dateOptions)
  const formattedTime = now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
  const dayOfWeek = now.toLocaleDateString('fr-FR', { weekday: 'long' })

  // Assemblage dynamique des sections pertinentes
  const knowledgeSections: string[] = []

  if (datesKnowledge) {
    knowledgeSections.push(`<dates_et_regles_saison>\n${datesKnowledge}\n</dates_et_regles_saison>`)
  }
  if (planningKnowledge) {
    knowledgeSections.push(`<planning_hebdomadaire_et_vacances>\n${planningKnowledge}\n</planning_hebdomadaire_et_vacances>`)
  }
  if (seancesAnnuleesKnowledge) {
    knowledgeSections.push(`<seances_annulees_en_temps_reel>\n${seancesAnnuleesKnowledge}\n</seances_annulees_en_temps_reel>`)
  }
  if (testsNageKnowledge) {
    knowledgeSections.push(`<tests_de_niveau_nouveaux_adherents>\n${testsNageKnowledge}\n</tests_de_niveau_nouveaux_adherents>`)
  }
  if (groupesKnowledge) {
    knowledgeSections.push(`<groupes_et_tarifs_officiels>\n${groupesKnowledge}\n</groupes_et_tarifs_officiels>`)
  }
  if (inscriptionBlocksKnowledge) {
    knowledgeSections.push(`<blocs_page_inscription_et_formation_ssa>\n${inscriptionBlocksKnowledge}\n</blocs_page_inscription_et_formation_ssa>`)
  }
  if (calendrierKnowledge) {
    knowledgeSections.push(`<calendrier_competitions_et_evenements>\n${calendrierKnowledge}\n</calendrier_competitions_et_evenements>`)
  }
  if (actualitesKnowledge) {
    knowledgeSections.push(`<actualites_du_club>\n${actualitesKnowledge}\n</actualites_du_club>`)
  }
  if (boutiqueKnowledge) {
    knowledgeSections.push(`<articles_boutique_du_club>\n${boutiqueKnowledge}\n</articles_boutique_du_club>`)
  }
  if (faqKnowledge) {
    knowledgeSections.push(`<faq_et_connaissances_club>\n${faqKnowledge}\n</faq_et_connaissances_club>`)
  }
  if (suggestionsKnowledge) {
    knowledgeSections.push(`<exemples_reponses_verifiees>\n${suggestionsKnowledge}\n</exemples_reponses_verifiees>`)
  }

  const systemInstructions = `Tu es l'assistant virtuel officiel du Triton Club Cavaillon (association sportive de natation à Cavaillon, Vaucluse).
Ton rôle est de renseigner les adhérents, futurs adhérents et parents avec une EXACTITUDE ABSOLUE, concision et bienveillance.

=======================================================
REPRÉSENTATION TEMPORELLE EN TEMPS RÉEL (OBLIGATOIRE) :
- Date aujourd'hui : ${formattedDate}
- Heure locale : ${formattedTime}
- Jour de la semaine : ${dayOfWeek}
Repère toujours les questions portant sur "aujourd'hui", "ce soir", "demain", "ce mercredi", "la semaine prochaine" par rapport à cette date.
=======================================================

BASE DE CONNAISSANCES OFFICIELLE DU CLUB (SOURCE UNIQUE DE VÉRITÉ) :

<identite_et_contact_club>
Club : Triton Club Cavaillon (TCC)
Bassin d'entraînement : Piscine Municipale Alphonse Roudière (ou Alphonse Ringrave), Avenue Jean Moulin, Quartier La Clède, 84300 Cavaillon.
Email officiel : ${clubEmail}
Formulaire de contact : Accessible en ligne sur le site à l'adresse /contact
Structure : Association 100% bénévole.
🚨 AVERTISSEMENT CRITIQUE SUR L'ACCUEIL :
- Il n'y a PAS d'accueil téléphonique.
- Il n'y a PAS de guichet physique ni de permanence au bord du bassin à la piscine.
- Tout échange s'effectue exclusivement en ligne via le formulaire /contact ou par e-mail à ${clubEmail}.
- INTERDICTION ABSOLUE d'inventer des horaires d'ouverture de secrétariat physique ou un faux numéro de téléphone.
</identite_et_contact_club>

${knowledgeSections.join('\n\n')}

=======================================================
RÈGLES D'OR ABSOLUES ET CONSIGNES MÉTIER (INVIOLABLES) :
=======================================================

1. VÉRACITÉ STRICTE & TOLÉRANCE ZÉRO POUR LES HALLUCINATIONS :
   - Base TOUTES tes réponses EXCLUSIVEMENT sur les données ci-dessus.
   - Si une question porte sur un détail qui ne figure pas dans tes données (ex: état des places d'un créneau à la minute près, aménagement médical très spécifique), NE DEVINE JAMAIS. Réponds poliment :
     "Je ne dispose pas de cette information spécifique dans mes données en temps réel. Je vous invite à envoyer votre question directement à l'équipe du club via notre [formulaire de contact](/contact) ou par e-mail à ${clubEmail}."

2. ADHÉSIONS & MOYENS DE PAIEMENT :
   - L'adhésion annuelle s'effectue EXCLUSIVEMENT en ligne sur la plateforme partenaire MonClub accessible depuis la [page d'inscription](/inscription).
   - Les paiements s'effectuent par Carte Bancaire ou prélèvement en 1 fois ou 3 fois sans frais sur MonClub.
   - Le club n'accepte PAS les chèques, PAS les espèces, PAS les virements bancaires, PAS les chèques-vacances ANCV, et PAS le Pass'Sport pour le moment.

3. ANNULATION D'INSCRIPTION, REMBOURSEMENT OU CHANGEMENT DE GROUPE :
   - La seule et unique démarche est de contacter l'équipe bénévole du club via le [formulaire de contact](/contact) ou par e-mail à ${clubEmail} avec nom, prénom et motif. Il n'existe aucune procédure automatique ni aucun bureau physique pour cela.

4. PLANNING & SÉANCES ANNULÉES :
   - Si un utilisateur demande si un cours a lieu, vérifie toujours les séances annulées et les vacances scolaires avant de confirmer.

5. TESTS DE NIVEAU POUR NOUVEAUX ADHÉRENTS :
   - Test de 5 minutes dans l'eau avec un éducateur diplômé.
   - Garantie Sérénité : si le test n'est pas concluant ou si aucun groupe n'est adapté, remboursement intégral de la cotisation sans délai.
   - Lien direct : [Prendre rendez-vous pour un test de niveau](/tests-nage).

6. STYLE ET FORME :
   - Sois percutant, structuré et bienveillant. Évite les longs pavés inutiles.
   - Mets en gras les informations clés (**dates**, **groupes**, **tarifs**).
   - Utilise des puces claires pour les horaires ou étapes.`

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

  // Modèles avec chaîne de repli intelligente en cas de quota ou rate-limit (429 / 403)
  const candidateModels = [modelToUse]
  if (!candidateModels.includes('ministral-8b-latest')) {
    candidateModels.push('ministral-8b-latest')
  }
  if (!candidateModels.includes('open-mistral-7b')) {
    candidateModels.push('open-mistral-7b')
  }

  let textResponse = ''

  for (const candidate of candidateModels) {
    try {
      const res = await fetch('https://api.mistral.ai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: candidate,
          messages: messagesPayload,
          temperature: 0.1,
        }),
      })

      if (res.ok) {
        const data = await res.json()
        const content = data.choices?.[0]?.message?.content
        if (content) {
          textResponse = content

          // Enregistrer la consommation de tokens
          try {
            const promptTokens = data.usage?.prompt_tokens || 0
            const completionTokens = data.usage?.completion_tokens || 0
            const totalTokens = data.usage?.total_tokens || 0

            await prisma.chatbotTokenLog.create({
              data: {
                modelName: candidate,
                promptTokens,
                completionTokens,
                totalTokens,
              },
            })
          } catch (error) {
            chatLogger.error("Erreur lors de l'enregistrement des tokens chatbot:", error)
          }
          break
        }
      } else {
        chatLogger.warn(`Modèle ${candidate} indisponible (HTTP ${res.status}), tentative avec le modèle suivant...`)
      }
    } catch (err) {
      chatLogger.error(`Erreur réseau lors de l'appel au modèle ${candidate}:`, err)
    }
  }

  if (!textResponse) {
    textResponse =
      "Désolé, je n'ai pas pu obtenir de réponse pour le moment. Veuillez contacter le club via notre [formulaire de contact](/contact) ou par e-mail à " +
      clubEmail +
      '.'
  }

  const { actions, suggestions } = deriveActionsAndSuggestions(textResponse, intents, userMessage)

  return {
    response: textResponse,
    actions,
    suggestions,
  }
}

/**
 * Récupère la réponse textuelle de l'assistant IA Mistral (rétrocompatible avec les anciens appels)
 */
export async function getChatResponse(
  userMessage: string,
  history?: { role: 'user' | 'assistant'; content: string }[]
): Promise<string> {
  const result = await getStructuredChatResponse(userMessage, history)
  return result.response
}
