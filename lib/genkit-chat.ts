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

/**
 * Récupère la réponse de l'assistant IA Mistral avec grounding strict et données temps réel
 * @param userMessage Message de l'adhérent ou visiteur
 * @param history Historique des derniers messages pour le fil de discussion
 * @returns Réponse générée
 */
export async function getChatResponse(
  userMessage: string,
  history?: { role: 'user' | 'assistant'; content: string }[]
): Promise<string> {
  const apiKey = process.env.MISTRAL_API_KEY

  if (!apiKey || apiKey === 'your-mistral-api-key-here') {
    throw new Error('MISTRAL_API_KEY not configured')
  }

  // Récupérer les paramètres et toutes les bases de connaissances en parallèle (avec cache TTL 5 min)
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
    seancesAnnuleesKnowledge,
    testsNageKnowledge,
    inscriptionBlocksKnowledge,
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
    getSeancesAnnuleesKnowledgeBase(),
    getSessionsTestsNageKnowledgeBase(),
    getInscriptionBlocksKnowledgeBase(),
  ])

  const activeModelName = settings?.chatbotModel || 'mistral-small'
  const modelToUse = MODEL_MAP[activeModelName.toLowerCase()] || 'mistral-small-latest'
  const clubEmail = settings?.emailClub || 'tritoncavaillon@gmail.com'

  const now = new Date()
  const dateOptions: Intl.DateTimeFormatOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }
  const formattedDate = now.toLocaleDateString('fr-FR', dateOptions)
  const formattedTime = now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
  const dayOfWeek = now.toLocaleDateString('fr-FR', { weekday: 'long' })

  const systemInstructions = `Tu es l'assistant virtuel officiel du Triton Club Cavaillon (association sportive de natation à Cavaillon, Vaucluse).
Ton rôle est de renseigner les adhérents, futurs adhérents et parents avec une EXACTITUDE ABSOLUE par rapport à la réalité terrain du club.

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
- INTERDICTION ABSOLUE d'inventer des horaires d'ouverture de secrétariat (ex: "du lundi au vendredi de 17h à 19h") ou un faux numéro de téléphone.
</identite_et_contact_club>

<dates_et_regles_saison>
${datesKnowledge}
</dates_et_regles_saison>

<planning_hebdomadaire_et_vacances>
${planningKnowledge}
</planning_hebdomadaire_et_vacances>

<seances_annulees_en_temps_reel>
${seancesAnnuleesKnowledge}
</seances_annulees_en_temps_reel>

<tests_de_niveau_nouveaux_adherents>
${testsNageKnowledge}
</tests_de_niveau_nouveaux_adherents>

<groupes_et_tarifs_officiels>
${groupesKnowledge}
</groupes_et_tarifs_officiels>

<blocs_page_inscription_et_formation_ssa>
${inscriptionBlocksKnowledge}
</blocs_page_inscription_et_formation_ssa>

<calendrier_competitions_et_evenements>
${calendrierKnowledge}
</calendrier_competitions_et_evenements>

<actualites_du_club>
${actualitesKnowledge}
</actualites_du_club>

<articles_boutique_du_club>
${boutiqueKnowledge}
</articles_boutique_du_club>

<faq_et_connaissances_club>
${faqKnowledge}
</faq_et_connaissances_club>

<exemples_reponses_verifiees>
${suggestionsKnowledge}
</exemples_reponses_verifiees>

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
   - Si un utilisateur demande si un cours a lieu, vérifie toujours la section <seances_annulees_en_temps_reel> et les vacances scolaires avant de confirmer. Si une séance ou un créneau de test est bloqué ou annulé (par exemple à la suite d'un incident technique ou de travaux à la piscine), signale-le immédiatement avec son motif et oriente l'utilisateur.

5. FORMATION SSA / SURVEILLANT SAUVETEUR AQUATIQUE (EX-BNSSA) :
   - Utilise toujours les conditions réelles : formation conjointe au diplôme d'État et au certificat de sécurité civile SSA, dispensée en partenariat avec la Croix-Blanche.
   - Pack Secourisme PSE1 + PSE2 inclus.
   - Tarif officiel complet : 750 €. Formule engagement club avec remboursement de 250 € pour 4 journées de surveillance (coût net : 500 €).
   - Séances le jeudi de 19h30 à 21h30 (ou 20h00 à 21h30) à la piscine de Cavaillon. Début le 1er octobre 2026.
   - Dès 16 ans (17 ans à l'examen), test natatoire préalable avec un MNS du club.

6. TESTS DE NIVEAU POUR NOUVEAUX ADHÉRENTS :
   - Test de 5 minutes dans l'eau avec un éducateur diplômé.
   - Garantie Sérénité : si le test n'est pas concluant ou si aucun groupe n'est adapté, remboursement intégral de la cotisation sans délai.
   - Mentionne le statut réel des sessions (ouvertes aux réservations ou bloquées/fermées).

7. STYLE ET FORME :
   - Ton accueillant, bienveillant et professionnel.
   - Réponses concises, aérées et directes.
   - Mets en gras les informations cruciales.
   - Fournis toujours des liens clairs au format Markdown : [page d'inscription](/inscription), [formulaire de contact](/contact), [planning des cours](/planning), [tarifs des groupes](/groupes), [boutique](/boutique), [calendrier](/calendrier).`

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

  return textResponse
}
