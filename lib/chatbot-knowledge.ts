import { prisma } from './prisma'
import { logger } from './logger'

// ─── Système de Cache In-Memory ──────────────────────────────────────────────

interface CacheEntry<T> {
  data: T
  timestamp: number
}

const CACHE_TTL = 5 * 60 * 1000 // 5 minutes en millisecondes

let customKnowledgeCache: CacheEntry<string> | null = null
let planningCache: CacheEntry<string> | null = null
let groupesCache: CacheEntry<string> | null = null

/**
 * Invalide manuellement le cache de connaissances du chatbot.
 * Appelée lors des actions d'administration (CRUD sur les entrées chatbot).
 */
export function clearChatbotKnowledgeCache() {
  customKnowledgeCache = null
  planningCache = null
  groupesCache = null
  logger.withContext('ChatbotCache').info('Le cache de connaissances a été invalidé avec succès.')
}

// ─────────────────────────────────────────────────────────────────────────────

/**
 * Récupère la base de connaissances personnalisée depuis la base de données
 */
export async function getCustomKnowledgeBase(): Promise<string> {
  const now = Date.now()
  if (customKnowledgeCache && (now - customKnowledgeCache.timestamp < CACHE_TTL)) {
    return customKnowledgeCache.data
  }

  try {
    const entries = await prisma.chatbotKnowledge.findMany({
      where: { actif: true },
      orderBy: [
        { categorie: 'asc' },
        { priorite: 'desc' },
      ],
    })

    if (entries.length === 0) {
      customKnowledgeCache = { data: '', timestamp: now }
      return ''
    }

    // Grouper par catégorie
    const parCategorie: { [key: string]: typeof entries } = {}
    entries.forEach((entry) => {
      if (!parCategorie[entry.categorie]) {
        parCategorie[entry.categorie] = []
      }
      parCategorie[entry.categorie].push(entry)
    })

    let texte = '\n**INFORMATIONS COMPLÉMENTAIRES :**\n\n'

    for (const [categorie, items] of Object.entries(parCategorie)) {
      const categorieFormatee = categorie.charAt(0).toUpperCase() + categorie.slice(1)
      texte += `**${categorieFormatee} :**\n`

      items.forEach((item) => {
        texte += `Q: ${item.question}\n`
        texte += `R: ${item.reponse}\n\n`
      })
    }

    customKnowledgeCache = { data: texte, timestamp: Date.now() }
    return texte
  } catch (error) {
    logger.error('Erreur lors de la récupération de la base de connaissances personnalisée', error)
    return ''
  }
}

/**
 * Récupère les données de planning depuis la base de données
 * et les formate pour le chatbot
 */
export async function getPlanningKnowledgeBase(): Promise<string> {
  const now = Date.now()
  if (planningCache && (now - planningCache.timestamp < CACHE_TTL)) {
    return planningCache.data
  }

  try {
    // Récupérer les plannings actifs
    const plannings = await prisma.planning.findMany({
      where: { actif: true },
      include: {
        coachs: {
          include: {
            coach: {
              select: {
                prenom: true,
                nom: true,
              },
            },
          },
        },
        groupe: {
          select: {
            nom: true,
            description: true,
            niveau: true,
          },
        },
      },
      orderBy: [
        { jourSemaine: 'asc' },
        { heureDebut: 'asc' },
      ],
    })

    // Récupérer les périodes de vacances actives
    const maintenant = new Date()
    const vacances = await prisma.periodeVacances.findMany({
      where: {
        actif: true,
        dateFin: {
          gte: maintenant,
        },
      },
      orderBy: {
        dateDebut: 'asc',
      },
    })

    // Grouper les plannings par jour
    const planningParJour: { [key: string]: typeof plannings } = {}

    plannings.forEach((p) => {
      const jour = p.jourSemaine.toLowerCase()
      if (!planningParJour[jour]) {
        planningParJour[jour] = []
      }
      planningParJour[jour].push(p)
    })

    // Formater en texte
    let texte = '**PLANNING HEBDOMADAIRE DES COURS :**\n\n'

    // Parcourir tous les jours de la semaine
    const jours = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche']

    for (const jour of jours) {
      const jourCapitalize = jour.charAt(0).toUpperCase() + jour.slice(1)
      texte += `**${jourCapitalize} :**\n`

      if (planningParJour[jour] && planningParJour[jour].length > 0) {
        planningParJour[jour].forEach((planning) => {
          const groupe = planning.groupe?.nom || 'Groupe non défini'
          const niveau = planning.groupe?.niveau ? ` (${planning.groupe.niveau})` : ''
          const coachs = planning.coachs && planning.coachs.length > 0
            ? ` - Coach: ${planning.coachs.map(c => c.coach.prenom).join(', ')}`
            : ''
          const lieu = planning.lieu ? ` - ${planning.lieu}` : ''

          texte += `  • ${planning.heureDebut} - ${planning.heureFin} : ${groupe}${niveau}${coachs}${lieu}\n`
        })
      } else {
        texte += `  • Pas de cours programmés\n`
      }
      texte += '\n'
    }

    // Ajouter les périodes de vacances
    if (vacances.length > 0) {
      texte += '\n**PÉRIODES DE FERMETURE / VACANCES :**\n\n'
      vacances.forEach((v) => {
        const debut = new Date(v.dateDebut).toLocaleDateString('fr-FR')
        const fin = new Date(v.dateFin).toLocaleDateString('fr-FR')
        texte += `• ${v.nom} : du ${debut} au ${fin}\n`
        if (v.description) {
          texte += `  ${v.description}\n`
        }
      })
    }

    planningCache = { data: texte, timestamp: Date.now() }
    return texte
  } catch (error) {
    logger.error('Erreur lors de la récupération du planning', error)
    return 'Le planning n\'est pas disponible pour le moment. Veuillez consulter la section Planning du site ou nous contacter directement.'
  }
}

/**
 * Récupère les groupes disponibles pour le chatbot
 */
export async function getGroupesKnowledgeBase(): Promise<string> {
  const now = Date.now()
  if (groupesCache && (now - groupesCache.timestamp < CACHE_TTL)) {
    return groupesCache.data
  }

  try {
    const groupes = await prisma.groupe.findMany({
      where: { actif: true },
      orderBy: { ordre: 'asc' },
    })

    if (groupes.length === 0) {
      groupesCache = { data: '', timestamp: now }
      return ''
    }

    let texte = '\n**GROUPES DISPONIBLES :**\n\n'

    groupes.forEach((groupe) => {
      texte += `• **${groupe.nom}**\n`
      if (groupe.description) {
        texte += `  Description : ${groupe.description}\n`
      }
      if (groupe.niveau) {
        texte += `  Niveau : ${groupe.niveau}\n`
      }
      if (groupe.ageMin && groupe.ageMax) {
        texte += `  Âge : ${groupe.ageMin}-${groupe.ageMax} ans\n`
      } else if (groupe.ageMin) {
        texte += `  Âge : ${groupe.ageMin}+ ans\n`
      }
      if (groupe.tarif) {
        texte += `  Tarif : ${groupe.tarif}€\n`
      }
      texte += '\n'
    })

    groupesCache = { data: texte, timestamp: Date.now() }
    return texte
  } catch (error) {
    logger.error('Erreur lors de la récupération des groupes', error)
    return ''
  }
}

/**
 * Récupère le calendrier des compétitions et événements du club pour alimenter la base de connaissances du chatbot.
 */
export async function getCalendrierKnowledgeBase(): Promise<string> {
  try {
    const events = await prisma.evenementCalendrier.findMany({
      where: { actif: true },
      orderBy: { date: 'asc' },
      take: 40,
    })

    if (events.length === 0) return ''

    let texte = '\n**CALENDRIER DES ÉVÉNEMENTS ET COMPÉTITIONS :**\n\n'
    events.forEach((ev) => {
      const d1 = new Date(ev.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
      const d2 = ev.dateFin ? new Date(ev.dateFin).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' }) : null
      const datesStr = d2 ? `du ${d1} au ${d2}` : `le ${d1}`

      texte += `• **${ev.title}** (${datesStr})\n`
      if (ev.lieu) texte += `  Lieu : ${ev.lieu}\n`
      if (ev.type) texte += `  Type : ${ev.type}\n`
      if (ev.description) texte += `  Détails : ${ev.description.substring(0, 150)}\n`
      texte += '\n'
    })

    return texte
  } catch (error) {
    logger.error('Erreur lors de la récupération des événements du calendrier pour le chatbot', error)
    return ''
  }
}

/**
 * Récupère les suggestions d'entraînement corrigées et validées par l'administrateur
 * afin de servir d'exemples/inspirations de réponses au chatbot (few-shot prompting).
 */
export async function getCorrectedSuggestionsKnowledgeBase(): Promise<string> {
  try {
    const entries = await prisma.chatbotSuggestion.findMany({
      where: {
        statut: 'integre',
        reponse: { not: null },
      },
      orderBy: { updatedAt: 'desc' },
      take: 15,
    })

    if (entries.length === 0) return ''

    let texte = '\n**EXEMPLES DE RÉPONSES CORRIGÉES / INSPIRATIONS POUR TES RÉPONSES :**\n\n'
    entries.forEach((item) => {
      texte += `Q: ${item.question}\n`
      texte += `R: ${item.reponse}\n\n`
    })

    return texte
  } catch (error) {
    logger.error('Erreur lors de la récupération des corrections chatbot', error)
    return ''
  }
}

/**
 * Récupère les dernières actualités publiées sur le site
 */
export async function getActualitesKnowledgeBase(): Promise<string> {
  try {
    const actualites = await prisma.actualite.findMany({
      where: { publie: true },
      orderBy: { datePubli: 'desc' },
      take: 10,
    })

    if (actualites.length === 0) return ''

    let texte = '\n**DERNIÈRES ACTUALITÉS ET ANNONCES DU CLUB :**\n\n'
    actualites.forEach((act) => {
      const dateStr = new Date(act.datePubli).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
      texte += `• **${act.titre}** (${dateStr})\n`
      if (act.excerpt) {
        texte += `  Résumé : ${act.excerpt}\n`
      }
      texte += `  Lien : [Lire l'article](/actualites/${act.slug})\n\n`
    })

    return texte
  } catch (error) {
    logger.error('Erreur lors de la récupération des actualités pour le chatbot', error)
    return ''
  }
}

/**
 * Récupère les articles disponibles dans la boutique du club
 */
export async function getBoutiqueKnowledgeBase(): Promise<string> {
  try {
    const produits = await prisma.produit.findMany({
      where: { actif: true },
      include: { categorie: { select: { nom: true } } },
      orderBy: { nom: 'asc' },
      take: 30,
    })

    if (produits.length === 0) return ''

    let texte = '\n**ARTICLES ET ÉQUIPEMENTS EN VENTE SUR LA BOUTIQUE DU CLUB :**\n\n'
    produits.forEach((prod) => {
      const cat = prod.categorie?.nom ? ` (${prod.categorie.nom})` : ''
      texte += `• **${prod.nom}**${cat} - Tarif : ${prod.prix}€\n`
      if (prod.descriptionCourte || prod.description) {
        texte += `  Description : ${prod.descriptionCourte || prod.description}\n`
      }
    })
    texte += `Lien pour commander : [Accéder à la boutique](/boutique)\n\n`

    return texte
  } catch (error) {
    logger.error('Erreur lors de la récupération de la boutique pour le chatbot', error)
    return ''
  }
}

/**
 * Récupère les dates clés de la saison (reprise des cours, tests) et les documents réglementaires depuis Settings
 */
export async function getSiteDatesKnowledgeBase(): Promise<string> {
  try {
    const settings = await prisma.settings.findFirst({
      select: {
        debutCoursNormal: true,
        debutCoursBnssa: true,
        datesTests: true,
        statutsUrl: true,
        reglementPiscineUrl: true,
        reglementClubUrl: true,
        boutiqueOuverte: true,
      },
    })

    if (!settings) return ''

    let texte = '\n**DATES CLÉS ET INFORMATIONS GÉNÉRALES DE LA SAISON :**\n\n'
    if (settings.debutCoursNormal) {
      texte += `• Début des cours généraux : ${settings.debutCoursNormal}\n`
    }
    if (settings.debutCoursBnssa) {
      texte += `• Début des cours BNSSA / SSA : ${settings.debutCoursBnssa}\n`
    }
    if (settings.datesTests && settings.datesTests.length > 0) {
      texte += `• Dates des sessions de test d'entrée : ${settings.datesTests.join(', ')}\n`
    }
    if (settings.boutiqueOuverte !== undefined) {
      texte += `• Statut de la boutique du club : ${settings.boutiqueOuverte ? 'Ouverte aux commandes' : 'Fermée actuellement'}\n`
    }
    if (settings.statutsUrl) {
      texte += `• Statuts officiels du club : [Consulter les statuts](${settings.statutsUrl})\n`
    }
    if (settings.reglementPiscineUrl) {
      texte += `• Règlement intérieur de la piscine : [Consulter le règlement](${settings.reglementPiscineUrl})\n`
    }
    if (settings.reglementClubUrl) {
      texte += `• Règlement intérieur du club : [Consulter le règlement](${settings.reglementClubUrl})\n`
    }
    texte += '\n'

    return texte
  } catch (error) {
    logger.error('Erreur lors de la récupération des dates clés pour le chatbot', error)
    return ''
  }
}
