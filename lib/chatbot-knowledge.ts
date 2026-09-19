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
let seancesAnnuleesCache: CacheEntry<string> | null = null
let testsNageCache: CacheEntry<string> | null = null
let inscriptionBlocksCache: CacheEntry<string> | null = null
let siteDatesCache: CacheEntry<string> | null = null
let boutiqueCache: CacheEntry<string> | null = null
let actualitesCache: CacheEntry<string> | null = null
let calendrierCache: CacheEntry<string> | null = null
let suggestionsCache: CacheEntry<string> | null = null

/**
 * Invalide manuellement le cache de connaissances du chatbot.
 * Appelée lors des actions d'administration (CRUD sur les entrées chatbot, plannings, etc.).
 */
export function clearChatbotKnowledgeCache() {
  customKnowledgeCache = null
  planningCache = null
  groupesCache = null
  seancesAnnuleesCache = null
  testsNageCache = null
  inscriptionBlocksCache = null
  siteDatesCache = null
  boutiqueCache = null
  actualitesCache = null
  calendrierCache = null
  suggestionsCache = null
  logger.withContext('ChatbotCache').info('Le cache global de connaissances du chatbot a été invalidé avec succès.')
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

    let texte = '\n**FAQ & CONNAISSANCES MANUELLES DU CLUB :**\n\n'

    for (const [categorie, items] of Object.entries(parCategorie)) {
      const categorieFormatee = categorie.charAt(0).toUpperCase() + categorie.slice(1)
      texte += `**Catégorie ${categorieFormatee} :**\n`

      items.forEach((item) => {
        texte += `• Question : ${item.question}\n`
        texte += `  Réponse : ${item.reponse}\n\n`
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
    let texte = '**PLANNING HEBDOMADAIRE OFFICIEL DES COURS :**\n\n'

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
      texte += '\n**PÉRIODES DE FERMETURE / VACANCES SCOLAIRES :**\n'
      texte += 'Pendant les vacances scolaires, les cours réguliers (école de natation, loisirs) sont suspendus (sauf stages compétitions annoncés séparément).\n'
      vacances.forEach((v) => {
        const debut = new Date(v.dateDebut).toLocaleDateString('fr-FR')
        const fin = new Date(v.dateFin).toLocaleDateString('fr-FR')
        texte += `• ${v.nom} : du ${debut} au ${fin}\n`
        if (v.description) {
          texte += `  ${v.description}\n`
        }
      })
      texte += '\n'
    }

    planningCache = { data: texte, timestamp: Date.now() }
    return texte
  } catch (error) {
    logger.error('Erreur lors de la récupération du planning', error)
    return 'Le planning n\'est pas disponible pour le moment. Veuillez consulter la section Planning du site ou nous contacter directement.'
  }
}

/**
 * Récupère les séances annulées récentes ou futures (en temps réel)
 */
export async function getSeancesAnnuleesKnowledgeBase(): Promise<string> {
  const now = Date.now()
  if (seancesAnnuleesCache && (now - seancesAnnuleesCache.timestamp < CACHE_TTL)) {
    return seancesAnnuleesCache.data
  }

  try {
    // Récupérer les séances annulées des 7 derniers jours et jusqu'à 60 jours dans le futur
    const dateLimite = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    const annulations = await prisma.seanceAnnulee.findMany({
      where: {
        date: { gte: dateLimite },
      },
      orderBy: { date: 'asc' },
      take: 20,
    })

    let texte = '\n**SÉANCES ANNULÉES EN TEMPS RÉEL (INCIDENTS / TRAVAUX) :**\n'
    if (annulations.length === 0) {
      texte += '• Aucune séance annulée récemment ou à venir. Tous les cours et créneaux programmés ont lieu normalement.\n\n'
    } else {
      texte += '⚠️ ATTENTION - Les séances ou créneaux suivants font l\'objet d\'une annulation exceptionnelle :\n'
      annulations.forEach((a) => {
        const dateStr = new Date(a.date).toLocaleDateString('fr-FR', {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        })
        const motif = a.motif || 'Raison technique ou indisponibilité du bassin'
        texte += `• Date : ${dateStr} - Motif : ${motif}\n`
      })
      texte += 'Si un adhérent demande si un cours a lieu à cette date, signale clairement cette annulation.\n\n'
    }

    seancesAnnuleesCache = { data: texte, timestamp: Date.now() }
    return texte
  } catch (error) {
    logger.error('Erreur lors de la récupération des séances annulées', error)
    return ''
  }
}

/**
 * Récupère les sessions et créneaux de tests de nage avec statuts (ouvert / bloqué)
 */
export async function getSessionsTestsNageKnowledgeBase(): Promise<string> {
  const now = Date.now()
  if (testsNageCache && (now - testsNageCache.timestamp < CACHE_TTL)) {
    return testsNageCache.data
  }

  try {
    const sessions = await prisma.sessionTestNage.findMany({
      where: { actif: true },
      include: {
        creneaux: {
          where: { actif: true },
          include: {
            inscriptions: {
              where: { statut: { in: ['inscrit', 'present'] } },
              select: { id: true },
            },
          },
        },
      },
      orderBy: { date: 'asc' },
    })

    if (sessions.length === 0) {
      testsNageCache = { data: '', timestamp: now }
      return ''
    }

    let texte = '\n**SESSIONS DE TESTS DE NIVEAU POUR NOUVEAUX ADHÉRENTS :**\n'
    texte += 'Principe des tests : Le test dure environ 5 minutes dans l\'eau avec un éducateur diplômé pour évaluer le niveau et orienter vers le bon groupe. Garantie Sérénité : si le test n\'est pas concluant ou si aucun créneau ne convient, l\'adhésion MonClub est intégralement remboursée sans délai.\n\n'

    sessions.forEach((s) => {
      const dateStr = new Date(s.date).toLocaleDateString('fr-FR', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
      const statutTag = s.bloquee
        ? ' ⛔ [SESSION BLOQUÉE / ANNULÉE - AUCUNE NOUVELLE INSCRIPTION POSSIBLE]'
        : ' ✅ [SESSION OUVERTE AUX INSCRIPTIONS]'

      let placesTotal = 0
      let placesOccupees = 0
      s.creneaux.forEach((c) => {
        placesTotal += c.capacite
        placesOccupees += c.inscriptions.length
      })
      const placesRestantes = Math.max(0, placesTotal - placesOccupees)

      texte += `• **${s.titre}** - ${dateStr}${statutTag}\n`
      texte += `  Horaires : de ${s.heureDebut} à ${s.heureFin} (${s.dureeMinutes} min par créneau individuel)\n`
      texte += `  Lieu : ${s.lieu}\n`
      if (s.bloquee) {
        texte += `  État : Session bloquée par l'administration (ex. suite à problème technique piscine). Si un adhérent a vu son créneau annulé sur cette séance, il peut réserver un créneau sur une autre session ouverte ou contacter le secrétariat via /contact.\n`
      } else {
        texte += `  Disponibilité : environ ${placesRestantes} place(s) disponible(s).\n`
      }
      if (s.consignes) {
        texte += `  Consignes d'accès : ${s.consignes}\n`
      }
      texte += '\n'
    })

    testsNageCache = { data: texte, timestamp: Date.now() }
    return texte
  } catch (error) {
    logger.error('Erreur lors de la récupération des sessions de tests de nage', error)
    return ''
  }
}

/**
 * Récupère le contenu officiel des blocs de la page Inscription (Page Builder)
 */
export async function getInscriptionBlocksKnowledgeBase(): Promise<string> {
  const now = Date.now()
  if (inscriptionBlocksCache && (now - inscriptionBlocksCache.timestamp < CACHE_TTL)) {
    return inscriptionBlocksCache.data
  }

  try {
    const blocks = await prisma.inscriptionBlock.findMany({
      where: { actif: true },
      orderBy: { ordre: 'asc' },
    })

    if (blocks.length === 0) {
      inscriptionBlocksCache = { data: '', timestamp: now }
      return ''
    }

    let texte = '\n**INFORMATIONS OFFICIELLES DE LA PAGE D\'INSCRIPTION :**\n\n'

    blocks.forEach((b) => {
      if (b.type === 'bnssa') {
        const c = b.contenu as any
        texte += `• **FORMATION SSA – SURVEILLANT SAUVETEUR AQUATIQUE (EX-BNSSA) :**\n`
        texte += `  - Intitulé : ${b.titre || 'Formation SSA – Surveillant Sauveteur Aquatique'}\n`
        if (c?.changement) texte += `  - Cadre réglementaire : ${c.changement}\n`
        if (c?.introClub) texte += `  - Partenariat : ${c.introClub}\n`
        if (c?.tarifComplet) texte += `  - Tarif formation complète : ${c.tarifComplet} € (inclus entraînements à l'année, PSE1, PSE2, préparation à l'examen)\n`
        if (c?.formuleReduction?.texte) texte += `  - Tarif réduit engagement club : ${c.formuleReduction.texte} (coût net ramené à 500 €)\n`
        if (c?.debutFormation?.date) texte += `  - Date de début des entraînements : ${c.debutFormation.date}\n`
        if (c?.debutFormation?.horaires) texte += `  - Créneaux en bassin : ${c.debutFormation.horaires}\n`
        if (c?.formationComplete?.secourisme?.texte) texte += `  - Secourisme : ${c.formationComplete.secourisme.texte}\n`
        if (c?.conditionsAcces?.points && Array.isArray(c.conditionsAcces.points)) {
          texte += `  - Conditions d'accès : ${c.conditionsAcces.points.join(' ; ')}\n`
        }
        if (c?.testNatatoire?.intro) texte += `  - Test natatoire : ${c.testNatatoire.intro}\n`
        if (c?.dejaTitulaireBnssa?.texte) texte += `  - Titulaires BNSSA déjà diplômés : ${c.dejaTitulaireBnssa.texte}\n`
        texte += '\n'
      } else if (b.type === 'tests') {
        const c = b.contenu as any
        texte += `• **MODALITÉS DES TESTS DE NIVEAU (NOUVEAUX ADHÉRENTS) :**\n`
        if (c?.intro) texte += `  ${c.intro}\n`
        if (c?.garantie) texte += `  Garantie remboursement : ${c.garantie}\n`
        texte += '\n'
      } else if (b.type === 'rules') {
        const c = b.contenu as any
        texte += `• **MODALITÉS DE SANTÉ & CERTIFICAT MÉDICAL :**\n`
        if (c?.certificat) texte += `  - Règle générale : ${c.certificat}\n`
        if (c?.mineurs) texte += `  - Mineurs : ${c.mineurs}\n`
        if (c?.majeurs) texte += `  - Majeurs : ${c.majeurs}\n`
        texte += '\n'
      } else if (b.type === 'financial-aid') {
        const c = b.contenu as any
        texte += `• **AIDES FINANCIÈRES & ATTESTATIONS :**\n`
        if (c?.texte) texte += `  ${c.texte}\n`
        texte += '\n'
      }
    })

    inscriptionBlocksCache = { data: texte, timestamp: Date.now() }
    return texte
  } catch (error) {
    logger.error('Erreur lors de la récupération des blocs d\'inscription', error)
    return ''
  }
}

/**
 * Récupère les groupes disponibles avec tarification détaillée (1 cours vs 2 cours, cautions, licences)
 */
export async function getGroupesKnowledgeBase(): Promise<string> {
  const now = Date.now()
  if (groupesCache && (now - groupesCache.timestamp < CACHE_TTL)) {
    return groupesCache.data
  }

  try {
    const groupes = await prisma.groupe.findMany({
      where: { actif: true },
      orderBy: [{ niveau: 'asc' }, { ordre: 'asc' }],
    })

    if (groupes.length === 0) {
      groupesCache = { data: '', timestamp: now }
      return ''
    }

    let texte = '\n**GROUPES & TARIFS OFFICIELS DU CLUB :**\n\n'

    groupes.forEach((groupe) => {
      const annuleTag = groupe.annule ? ' ⛔ [GROUPE ACTUELLEMENT FERMÉ/ANNULÉ]' : ''
      texte += `• **${groupe.nom}**${annuleTag}\n`
      if (groupe.niveau) {
        texte += `  Niveau / Catégorie : ${groupe.niveau}\n`
      }
      if (groupe.ageMin && groupe.ageMax) {
        texte += `  Âge requis : ${groupe.ageMin} à ${groupe.ageMax} ans\n`
      } else if (groupe.ageMin) {
        texte += `  Âge minimum : dès ${groupe.ageMin} ans\n`
      }

      // Tarification fine avec distinction 1 cours vs 2 cours
      if (groupe.tarif1Cours && groupe.tarif) {
        const opt1 = groupe.libelleOption1 || '1 séance / semaine'
        const opt2 = groupe.libelleOption2 || '2 séances / semaine'
        texte += `  Tarifs : ${groupe.tarif1Cours} €/an (${opt1}) OU ${groupe.tarif} €/an (${opt2})\n`
      } else if (groupe.tarif) {
        texte += `  Tarif annuel : ${groupe.tarif} €/an\n`
      }

      if (groupe.prixLicence && groupe.prixLicence > 0) {
        texte += `  Part licence FFN : ${groupe.prixLicence} € incluse dans le montant\n`
      }
      if (groupe.caution && groupe.caution > 0) {
        texte += `  Caution compétition (chèque non encaissé restitué si participations requises) : ${groupe.caution} €\n`
      }
      if (groupe.nbCompetitions) {
        texte += `  Compétitions au programme : environ ${groupe.nbCompetitions} par an\n`
      }
      if (groupe.description) {
        texte += `  Description : ${groupe.description}\n`
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
 * Récupère le calendrier des compétitions et événements du club
 */
export async function getCalendrierKnowledgeBase(): Promise<string> {
  const now = Date.now()
  if (calendrierCache && (now - calendrierCache.timestamp < CACHE_TTL)) {
    return calendrierCache.data
  }

  try {
    const events = await prisma.evenementCalendrier.findMany({
      where: { actif: true },
      orderBy: { date: 'asc' },
      take: 40,
    })

    if (events.length === 0) {
      calendrierCache = { data: '', timestamp: now }
      return ''
    }

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

    calendrierCache = { data: texte, timestamp: Date.now() }
    return texte
  } catch (error) {
    logger.error('Erreur lors de la récupération des événements du calendrier pour le chatbot', error)
    return ''
  }
}

/**
 * Récupère les suggestions validées par l'administrateur
 */
export async function getCorrectedSuggestionsKnowledgeBase(): Promise<string> {
  const now = Date.now()
  if (suggestionsCache && (now - suggestionsCache.timestamp < CACHE_TTL)) {
    return suggestionsCache.data
  }

  try {
    const entries = await prisma.chatbotSuggestion.findMany({
      where: {
        statut: 'integre',
        reponse: { not: null },
      },
      orderBy: { updatedAt: 'desc' },
      take: 10,
    })

    if (entries.length === 0) {
      suggestionsCache = { data: '', timestamp: now }
      return ''
    }

    let texte = '\n**EXEMPLES DE RÉPONSES VÉRIFIÉES PAR L\'ADMINISTRATION DU CLUB :**\n\n'
    entries.forEach((item) => {
      texte += `Q: ${item.question}\n`
      texte += `R: ${item.reponse}\n\n`
    })

    suggestionsCache = { data: texte, timestamp: Date.now() }
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
  const now = Date.now()
  if (actualitesCache && (now - actualitesCache.timestamp < CACHE_TTL)) {
    return actualitesCache.data
  }

  try {
    const actualites = await prisma.actualite.findMany({
      where: { publie: true },
      orderBy: { datePubli: 'desc' },
      take: 10,
    })

    if (actualites.length === 0) {
      actualitesCache = { data: '', timestamp: now }
      return ''
    }

    let texte = '\n**DERNIÈRES ACTUALITÉS ET ANNONCES DU CLUB :**\n\n'
    actualites.forEach((act) => {
      const dateStr = new Date(act.datePubli).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
      texte += `• **${act.titre}** (${dateStr})\n`
      if (act.excerpt) {
        texte += `  Résumé : ${act.excerpt}\n`
      }
      texte += `  Lien : [Lire l'article](/actualites/${act.slug})\n\n`
    })

    actualitesCache = { data: texte, timestamp: Date.now() }
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
  const now = Date.now()
  if (boutiqueCache && (now - boutiqueCache.timestamp < CACHE_TTL)) {
    return boutiqueCache.data
  }

  try {
    const produits = await prisma.produit.findMany({
      where: { actif: true },
      include: { categorie: { select: { nom: true } } },
      orderBy: { nom: 'asc' },
      take: 30,
    })

    if (produits.length === 0) {
      boutiqueCache = { data: '', timestamp: now }
      return ''
    }

    let texte = '\n**ARTICLES ET ÉQUIPEMENTS EN VENTE SUR LA BOUTIQUE DU CLUB :**\n\n'
    produits.forEach((prod) => {
      const cat = prod.categorie?.nom ? ` (${prod.categorie.nom})` : ''
      texte += `• **${prod.nom}**${cat} - Tarif : ${prod.prix} €\n`
      if (prod.descriptionCourte || prod.description) {
        texte += `  Description : ${prod.descriptionCourte || prod.description}\n`
      }
    })
    texte += `Lien pour commander : [Accéder à la boutique](/boutique)\n\n`

    boutiqueCache = { data: texte, timestamp: Date.now() }
    return texte
  } catch (error) {
    logger.error('Erreur lors de la récupération de la boutique pour le chatbot', error)
    return ''
  }
}

/**
 * Récupère les dates clés de la saison et les documents réglementaires
 */
export async function getSiteDatesKnowledgeBase(): Promise<string> {
  const now = Date.now()
  if (siteDatesCache && (now - siteDatesCache.timestamp < CACHE_TTL)) {
    return siteDatesCache.data
  }

  try {
    const settings = await prisma.settings.findFirst({
      select: {
        debutCoursNormal: true,
        debutCoursBnssa: true,
        datesTests: true,
        reductionEnfantBureau: true,
        interSaison: true,
        statutsUrl: true,
        reglementPiscineUrl: true,
        reglementClubUrl: true,
        boutiqueOuverte: true,
        dateLivraisonBoutique: true,
      },
    })

    if (!settings) {
      siteDatesCache = { data: '', timestamp: now }
      return ''
    }

    let texte = '\n**DATES CLÉS ET INFORMATIONS GÉNÉRALES DE LA SAISON :**\n\n'
    if (settings.debutCoursNormal) {
      texte += `• Début des cours généraux de natation : ${settings.debutCoursNormal}\n`
    }
    if (settings.debutCoursBnssa) {
      texte += `• Début des entraînements SSA / BNSSA : ${settings.debutCoursBnssa}\n`
    }
    if (settings.datesTests && settings.datesTests.length > 0) {
      texte += `• Périodes de tests d'entrée : ${settings.datesTests.join(', ')}\n`
    }
    if (settings.boutiqueOuverte !== undefined) {
      texte += `• Statut de la boutique du club : ${settings.boutiqueOuverte ? 'Ouverte aux commandes' : 'Fermée actuellement'}\n`
    }
    if (settings.dateLivraisonBoutique) {
      texte += `• Période estimée de livraison boutique : ${settings.dateLivraisonBoutique}\n`
    }
    if (settings.interSaison) {
      texte += `• Période actuelle : Intersaison sportive\n`
    }
    if (settings.statutsUrl) {
      texte += `• Statuts officiels du club : [Consulter les statuts](${settings.statutsUrl})\n`
    }
    if (settings.reglementPiscineUrl) {
      texte += `• Règlement intérieur de la piscine : [Consulter le règlement de la piscine](${settings.reglementPiscineUrl})\n`
    }
    if (settings.reglementClubUrl) {
      texte += `• Règlement intérieur du club : [Consulter le règlement du club](${settings.reglementClubUrl})\n`
    }
    texte += '\n'

    siteDatesCache = { data: texte, timestamp: Date.now() }
    return texte
  } catch (error) {
    logger.error('Erreur lors de la récupération des dates clés pour le chatbot', error)
    return ''
  }
}
