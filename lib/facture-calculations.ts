import { prisma } from '@/lib/prisma'
import { formatMinutesEnHM, formatHeuresEnHM } from '@/lib/facture-format'

export interface FactureAbsenceAssociee {
  id?: string
  date: string // "29/09"
  dateComplete: string // "2026-09-29"
  motif?: string | null
  coachRemplacantNom?: string | null
  heures: number // négatif, ex: -1.5
  montant: number // négatif, ex: -45.00
  minutes: number // ex: 90
  texteDeduction: string // "− 1h30"
  description: string // "↳ Absence 29/09 (piscine fermée)" ou "↳ Séance annulée 29/09 (piscine fermée)"
  type?: 'absence' | 'annulation'
  enAttente?: boolean
}

export interface FactureCalculationSharedContext {
  settings?: any
  periodesVacances?: any[]
  seancesAnnulees?: any[]
  factureExistante?: any
}

export interface FactureLigneCalculated {
  id?: string
  type: 'planning_fixe' | 'planning_tournant' | 'remplacement' | 'absence' | 'competition' | 'forfait_regional' | 'forfait_transport' | 'manuel'
  description: string
  heures: number
  montant: number
  date?: Date
  groupe?: string | null
  lieu?: string | null
  demiJournees?: number | null
  coachRemplaceId?: string | null
  remplacementId?: string | null

  // Nouveaux champs structurés Lot 7
  titre?: string // Ligne 1 : ex "Juniors Compétition · Benjamins 1 · Benjamins 2", "Adultes Compétition — pour Florian"
  sousTitre?: string // Ligne 2 : ex "Mardi 19:30 – 21:00", "Vendredi 18:15 – 20:00 · PPG, Petit Bassin, Lignes 1-4"
  datesBadges?: string[] // Ligne 3 : ex ["01/09", "08/09", "15/09", "22/09", "29/09"]
  nbSeances?: number // ex 5
  dureeUnitaireMinutes?: number // ex 90
  detailCalculDuree?: string // ex "5 × 1h30 = 7h30", "1h30"
  espaces?: string[] // ex ["PPG", "Petit Bassin", "Lignes 1-4"]
  absencesAssociees?: FactureAbsenceAssociee[] // Absences déduites imbriquées sous cette séance
  estAbsenceOrpheline?: boolean // true si absence non rattachée à un créneau fixe
  coachRemplaceNom?: string | null
  noteInfo?: string | null // ex "déjà payé (cours simultané)"
}

export interface FactureSectionGroup {
  id: string
  titre: string
  type: 'planning_fixe' | 'planning_tournant' | 'remplacements' | 'competitions' | 'prestations' | 'autres_absences'
  lignes: FactureLigneCalculated[]
  sousTotalHeures: number
  sousTotalMontant: number
  sousTotalDureeHM?: string
}

export interface FactureCoachDetails {
  mois: number
  annee: number
  tauxHoraire: number
  forfaitDemiJournee: number
  forfaitRegionalActif: boolean
  montantForfaitRegional: number
  lignesPlanningFixe: FactureLigneCalculated[]
  lignesPlanningTournant: FactureLigneCalculated[]
  lignesRemplacements: FactureLigneCalculated[]
  lignesAbsences: FactureLigneCalculated[]
  lignesManuelles: FactureLigneCalculated[]
  totalHeures: number
  totalMontant: number
  joursTravailles: number[]
  factureId?: string
  isBlocked?: boolean
  statut?: string
  message?: string
  sections?: FactureSectionGroup[] // Lot 7: Vue structurée par sections avec sous-totaux
}

/**
 * Analyse et extrait une Date valide à partir d'une chaîne représentant le début de saison / rentrée.
 * Supporte les formats :
 * - Textuel français : "Lundi 14 Septembre 2026", "14 Septembre 2026", "Jeudi 1er Octobre 2026"
 * - Numérique : "14/09/2026", "14-09-2026", "2026-09-14"
 */
export function parseDateDebutSaison(dateStr?: string | null): Date | null {
  if (!dateStr || !dateStr.trim()) return null
  const cleaned = dateStr.trim()

  // 1. Format ISO : YYYY-MM-DD
  const isoMatch = cleaned.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (isoMatch) {
    return new Date(parseInt(isoMatch[1], 10), parseInt(isoMatch[2], 10) - 1, parseInt(isoMatch[3], 10), 0, 0, 0, 0)
  }

  // 2. Format numérique français : DD/MM/YYYY ou DD-MM-YYYY
  const frNumericMatch = cleaned.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/)
  if (frNumericMatch) {
    return new Date(parseInt(frNumericMatch[3], 10), parseInt(frNumericMatch[2], 10) - 1, parseInt(frNumericMatch[1], 10), 0, 0, 0, 0)
  }

  // 3. Format textuel français : (Jour) DD (Mois) YYYY
  const textMatch = cleaned.match(/(\d{1,2})(?:er)?\s+([a-zA-ZÀ-ÿ]+)\s+(\d{4})/i)
  if (textMatch) {
    const day = parseInt(textMatch[1], 10)
    const rawMonth = textMatch[2].toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    const year = parseInt(textMatch[3], 10)

    const moisMap: { [key: string]: number } = {
      janvier: 0, fevrier: 1, mars: 2, avril: 3, mai: 4, juin: 5,
      juillet: 6, aout: 7, septembre: 8, octobre: 9, novembre: 10, decembre: 11
    }

    if (moisMap[rawMonth] !== undefined) {
      return new Date(year, moisMap[rawMonth], day, 0, 0, 0, 0)
    }
  }

  return null
}

export async function calculerFactureCoach(
  coachId: string,
  mois: number,
  annee: number,
  sharedContext?: FactureCalculationSharedContext
): Promise<FactureCoachDetails> {
  // Calculer les dates de début et fin du mois
  const now = new Date()
  const dateDebut = new Date(annee, mois - 1, 1, 0, 0, 0, 0)
  const dateFinMois = new Date(annee, mois, 0, 23, 59, 59)
  let dateFin = new Date(annee, mois, 0, 23, 59, 59, 999)

  // Si on calcule pour le mois et l'année en cours, on limite le planning fixe au jour actuel
  if (annee === now.getFullYear() && mois === now.getMonth() + 1) {
    dateFin = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999)
  } else if (annee > now.getFullYear() || (annee === now.getFullYear() && mois > now.getMonth() + 1)) {
    // Si c'est dans le futur, on renvoie une période vide (fin = début) pour ne rien afficher à l'avance
    dateFin = new Date(annee, mois - 1, 1, 0, 0, 0)
  }

  // Exécuter les requêtes initiales indépendantes en parallèle (avec réutilisation du contexte partagé si fourni)
  const [settings, factureExistante, periodesVacances, seancesAnnulees, planningsFixe] = await Promise.all([
    sharedContext?.settings !== undefined
      ? Promise.resolve(sharedContext.settings)
      : prisma.settings.findFirst(),
    sharedContext?.factureExistante !== undefined
      ? Promise.resolve(sharedContext.factureExistante)
      : prisma.factureCoach.findUnique({
          where: {
            coachId_mois_annee: {
              coachId,
              mois,
              annee,
            },
          },
          include: {
            lignes: true,
          },
        }),
    sharedContext?.periodesVacances !== undefined
      ? Promise.resolve(sharedContext.periodesVacances)
      : prisma.periodeVacances.findMany({
          where: {
            actif: true,
            impacteFacturation: true,
            OR: [
              {
                dateDebut: {
                  gte: dateDebut,
                  lte: dateFin,
                },
              },
              {
                dateFin: {
                  gte: dateDebut,
                  lte: dateFin,
                },
              },
              {
                AND: [
                  { dateDebut: { lte: dateDebut } },
                  { dateFin: { gte: dateFin } },
                ],
              },
            ],
          },
        }),
    sharedContext?.seancesAnnulees !== undefined
      ? Promise.resolve(sharedContext.seancesAnnulees)
      : prisma.seanceAnnulee.findMany({
          where: {
            date: {
              gte: dateDebut,
              lte: dateFin,
            },
          },
        }),
    prisma.planning.findMany({
      where: {
        coachs: {
          some: {
            coachId,
          },
        },
        actif: true,
      },
      include: {
        groupe: true,
        occupations: true,
      },
    }),
  ])

  const tauxHoraire = settings?.tauxHoraire || 35
  const forfaitDemiJournee = settings?.forfaitCompetition || 150
  const forfaitRegionalActif = settings?.forfaitRegionalActif || false
  const montantForfaitRegional = settings?.montantForfaitRegional || 50

  // Récupérer la date de début officiel de saison (ex: 14 Septembre 2026)
  const dateDebutSaison = parseDateDebutSaison(settings?.debutCoursNormal)
  const dateDebutBnssa = parseDateDebutSaison(settings?.debutCoursBnssa)

  const isPayee = factureExistante?.statut === 'payee'
  const isEnvoyee = factureExistante?.statut === 'envoyee'
  const isGeneree = factureExistante?.statut === 'generee'
  const isVerrouilleeDefinitive = isPayee || isEnvoyee
  const isLocked = isVerrouilleeDefinitive

  let heuresPlanningFixe = 0
  const lignesPlanningFixe: FactureLigneCalculated[] = []
  const joursTravailles = new Set<number>()
  const joursMapRef: { [key: string]: number } = {
    'Dimanche': 0, 'Lundi': 1, 'Mardi': 2, 'Mercredi': 3,
    'Jeudi': 4, 'Vendredi': 5, 'Samedi': 6
  }

  // Regrouper les plannings fixes par jour et périodicité
  const planningsParJour = new Map<string, typeof planningsFixe>()
  for (const planning of planningsFixe) {
    if (joursMapRef[planning.jourSemaine] !== undefined) {
      joursTravailles.add(joursMapRef[planning.jourSemaine])
    }
    const key = `${planning.jourSemaine}-${planning.semaineImpaire ? 'impaire' : 'toutes'}`
    const list = planningsParJour.get(key) || []
    list.push(planning)
    planningsParJour.set(key, list)
  }

  interface CreneauFusionne {
    jourSemaine: string
    heureDebut: string
    heureFin: string
    debutMin: number
    finMin: number
    groupes: string[]
    planningIds: string[]
    groupeIds: string[]
    espaces: string[]
    tempsFacture?: number | null
    semaineImpaire?: boolean
    groupeDateDebut?: Date | null
    isBnssa?: boolean
    absencesAssociees: FactureAbsenceAssociee[]
    calculatedOccurrences?: {
      dates: Date[]
      occurences: number
      totalHrs: number
      dureeHeures: number
      tempsFactureMin: number
      dureeReelleMin: number
    }
  }

  const creneauxFusionnes: CreneauFusionne[] = []

  const getEspacesDuPlanning = (p: any): string[] => {
    if (p.occupations && Array.isArray(p.occupations) && p.occupations.length > 0) {
      return p.occupations.map((o: any) => o.espace).filter(Boolean)
    }
    return p.lieu ? [p.lieu] : []
  }

  // Pour chaque jour/périodicité, fusionner les créneaux qui se chevauchent pour ce coach
  // (Règle métier : un coach qui gère 2 groupes en même temps n'est facturé qu'une seule fois)
  for (const [, planningsDuJour] of planningsParJour) {
    // Trier par heure de début croissante, puis heure de fin décroissante
    planningsDuJour.sort((a, b) => {
      const diff = timeToMinutes(a.heureDebut) - timeToMinutes(b.heureDebut)
      if (diff !== 0) return diff
      return timeToMinutes(b.heureFin) - timeToMinutes(a.heureFin)
    })

    const mergedJour: CreneauFusionne[] = []

    for (const planning of planningsDuJour) {
      const debutMin = timeToMinutes(planning.heureDebut)
      const finMin = timeToMinutes(planning.heureFin)
      const isBnssa = (planning.groupe?.nom || '').toLowerCase().includes('bnssa')
      const nomGroupe = planning.groupe?.nom || 'Groupe'
      const espacesDuPlanning = getEspacesDuPlanning(planning)
      const last = mergedJour.length > 0 ? mergedJour[mergedJour.length - 1] : null

      // Chevauchement strict : le créneau commence strictement avant la fin du créneau précédent
      if (last && debutMin < last.finMin) {
        if (finMin > last.finMin) {
          last.finMin = finMin
          last.heureFin = minutesToTime(finMin)
        }
        if (!last.groupes.includes(nomGroupe)) {
          last.groupes.push(nomGroupe)
        }
        for (const esp of espacesDuPlanning) {
          if (!last.espaces.includes(esp)) {
            last.espaces.push(esp)
          }
        }
        last.planningIds.push(planning.id)
        if (planning.groupeId && !last.groupeIds.includes(planning.groupeId)) {
          last.groupeIds.push(planning.groupeId)
        }
        if (isBnssa) {
          last.isBnssa = true
        }
        if (planning.groupe?.dateDebut) {
          if (!last.groupeDateDebut || planning.groupe.dateDebut < last.groupeDateDebut) {
            last.groupeDateDebut = planning.groupe.dateDebut
          }
        }
        // Si un temps facturé explicite est défini sur un des créneaux en simultané, on retient le plus grand
        if (planning.tempsFacture && planning.tempsFacture > 0) {
          if (last.tempsFacture && last.tempsFacture > 0) {
            last.tempsFacture = Math.max(last.tempsFacture, planning.tempsFacture)
          } else {
            last.tempsFacture = planning.tempsFacture
          }
        }
      } else {
        mergedJour.push({
          jourSemaine: planning.jourSemaine,
          heureDebut: planning.heureDebut,
          heureFin: planning.heureFin,
          debutMin,
          finMin,
          groupes: [nomGroupe],
          planningIds: [planning.id],
          groupeIds: planning.groupeId ? [planning.groupeId] : [],
          espaces: [...espacesDuPlanning],
          tempsFacture: planning.tempsFacture,
          semaineImpaire: planning.semaineImpaire,
          groupeDateDebut: planning.groupe?.dateDebut,
          isBnssa,
          absencesAssociees: [],
        })
      }
    }

    creneauxFusionnes.push(...mergedJour)
  }

  // Plages horaires physiques effectuées par le coach sur chaque date (pour neutralisation des doublons avec les remplacements - Option B)
  const creneauxEffectuesParDate = new Map<string, Array<{ debutMin: number; finMin: number; description: string }>>()
  // Créneaux réguliers actifs par date avec temps facturé (pour déduction proportionnelle exacte des absences)
  const creneauxActifsParDate = new Map<string, Array<{
    creneauFusionne: CreneauFusionne
    debutMin: number
    finMin: number
    dureeReelleMin: number
    tempsFactureMin: number
    groupes: string[]
    planningIds: string[]
  }>>()

  for (const creneau of creneauxFusionnes) {
    // Calcul de la date de début effective pour ce créneau en fonction de la rentrée
    let creneauDateDebut = new Date(dateDebut)

    // Déterminer la date de rentrée applicable (BNSSA ou classique)
    let rentreeApplicable = creneau.isBnssa && dateDebutBnssa ? dateDebutBnssa : dateDebutSaison
    if (creneau.groupeDateDebut) {
      rentreeApplicable = creneau.groupeDateDebut
    }

    if (rentreeApplicable) {
      if (creneauDateDebut < rentreeApplicable) {
        if (dateFin < rentreeApplicable) {
          // Le mois analysé est intégralement antérieur à la rentrée (ex: été avant début saison)
          continue
        } else {
          // La rentrée a lieu pendant le mois (ex: 14 septembre 2026) -> on démarre à la rentrée
          creneauDateDebut = new Date(rentreeApplicable)
        }
      }
    }

    const dates = obtenirDatesJour(
      creneau.jourSemaine,
      creneauDateDebut,
      dateFin,
      periodesVacances,
      creneau.semaineImpaire
    )
    const occurences = dates.length

    if (occurences > 0) {
      const dureeReelleMin = creneau.finMin - creneau.debutMin
      const tempsFactureMin = creneau.tempsFacture && creneau.tempsFacture > 0 ? creneau.tempsFacture : dureeReelleMin
      const dureeHeures = tempsFactureMin / 60
      const totalHrs = dureeHeures * occurences

      creneau.calculatedOccurrences = {
        dates,
        occurences,
        totalHrs,
        dureeHeures,
        tempsFactureMin,
        dureeReelleMin,
      }

      // Enregistrer les créneaux réguliers effectués par date (Option B et absences)
      for (const d of dates) {
        const dateKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
        
        const listEffectues = creneauxEffectuesParDate.get(dateKey) || []
        listEffectues.push({
          debutMin: creneau.debutMin,
          finMin: creneau.finMin,
          description: creneau.groupes.join(', '),
        })
        creneauxEffectuesParDate.set(dateKey, listEffectues)

        const listActifs = creneauxActifsParDate.get(dateKey) || []
        listActifs.push({
          creneauFusionne: creneau,
          debutMin: creneau.debutMin,
          finMin: creneau.finMin,
          dureeReelleMin,
          tempsFactureMin,
          groupes: creneau.groupes,
          planningIds: creneau.planningIds,
        })
        creneauxActifsParDate.set(dateKey, listActifs)
      }
    }
  }

  // Informations administratives du coach (si configurées)
  const coachInfo = await prisma.coach.findUnique({
    where: { id: coachId },
    select: { heuresAdminHebdo: true },
  })

  // 2. Remplacements et Absences (pour le mois complet considéré)
  const [remplacementsEffectues, remplacementsRecus] = await Promise.all([
    prisma.remplacement.findMany({
      where: {
        coachRemplacantId: coachId,
        statut: 'accepte',
        actif: true,
        date: { gte: dateDebut, lte: dateFinMois },
      },
      include: {
        coachRemplace: { select: { id: true, prenom: true, nom: true } },
      },
      orderBy: [
        { date: 'asc' },
        { heureDebut: 'asc' },
      ],
    }),
    prisma.remplacement.findMany({
      where: {
        coachRemplaceId: coachId,
        statut: { notIn: ['refuse', 'annule'] },
        actif: true,
        date: { gte: dateDebut, lte: dateFinMois },
      },
      include: {
        coachRemplacant: { select: { prenom: true, nom: true } },
      },
      orderBy: [
        { date: 'asc' },
        { heureDebut: 'asc' },
      ],
    }),
  ])

  // Charger les plannings réguliers des coachs remplacés pour connaître leur temps facturé
  const replacedCoachIds = Array.from(
    new Set(remplacementsEffectues.map((r) => r.coachRemplaceId).filter(Boolean))
  )
  const planningsReplaces = replacedCoachIds.length > 0
    ? await prisma.planning.findMany({
        where: {
          actif: true,
          coachs: {
            some: {
              coachId: { in: replacedCoachIds },
            },
          },
        },
        include: {
          groupe: true,
          coachs: true,
        },
      })
    : []

  const joursSemaineRef = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi']

  let heuresAbsences = 0
  const lignesAbsences: FactureLigneCalculated[] = []
  const creneauxAnnulesKeys = new Set<string>()

  // 1.b Traitement des séances annulées par le club (Lot 2)
  // Règle métier validée : une séance annulée par le club n'est pas rémunérée au coach.
  // La facture déduit exactement le temps facturé du créneau (sans avoir à créer une absence manuelle par coach).
  for (const sa of seancesAnnulees) {
    const saDateObj = new Date(sa.date)
    const saDateKey = `${saDateObj.getFullYear()}-${String(saDateObj.getMonth() + 1).padStart(2, '0')}-${String(saDateObj.getDate()).padStart(2, '0')}`
    const saDateCourtStr = saDateObj.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })
    const saDateStr = saDateObj.toLocaleDateString('fr-FR')

    const slotsDuJour = creneauxActifsParDate.get(saDateKey) || []

    for (const slot of slotsDuJour) {
      // Vérifier si cette annulation cible ce créneau :
      // 1. Annulation générale (tous les cours du club ce jour-là)
      // 2. Annulation ciblant spécifiquement ce coach
      // 3. Annulation ciblant un des plannings de ce créneau
      // 4. Annulation ciblant un des groupes de ce créneau
      const isGeneral = !sa.planningId && !sa.groupeId && !sa.coachId
      const isMemeCoach = sa.coachId && sa.coachId === coachId
      const isMemePlanning = sa.planningId && slot.planningIds.includes(sa.planningId)
      const isMemeGroupe = sa.groupeId && slot.creneauFusionne.groupeIds.includes(sa.groupeId)

      if (isGeneral || isMemeCoach || isMemePlanning || isMemeGroupe) {
        const slotKey = `${slot.creneauFusionne.jourSemaine}_${slot.creneauFusionne.heureDebut}_${slot.creneauFusionne.heureFin}`
        const annulationSlotKey = `${saDateKey}_${slotKey}`

        if (creneauxAnnulesKeys.has(annulationSlotKey)) {
          // Déjà déduit pour ce créneau sur cette date (ex: annulation générale + règle spécifique)
          continue
        }
        creneauxAnnulesKeys.add(annulationSlotKey)

        const deductionMin = slot.tempsFactureMin
        const deductionHeures = deductionMin / 60
        const deductionMontant = deductionHeures * tauxHoraire
        heuresAbsences += deductionHeures

        const motifTexte = sa.motif?.trim() || 'piscine fermée'
        const descAnnulation = `↳ Séance annulée ${saDateCourtStr} (${motifTexte})`
        const nomGroupes = slot.groupes.join(' · ')

        // 1. Imbrication directe sous la séance (Lot 7)
        if (slot.creneauFusionne) {
          slot.creneauFusionne.absencesAssociees.push({
            id: sa.id,
            date: saDateCourtStr,
            dateComplete: saDateKey,
            motif: motifTexte,
            coachRemplacantNom: null,
            heures: -deductionHeures,
            montant: -deductionMontant,
            minutes: deductionMin,
            texteDeduction: `− ${formatMinutesEnHM(deductionMin)}`,
            description: descAnnulation,
            type: 'annulation',
          })
        }

        // 2. Ligne d'absence pour la liste globale / rétrocompatibilité
        lignesAbsences.push({
          id: sa.id,
          type: 'absence',
          date: saDateObj,
          description: `Séance annulée (${motifTexte}) – ${saDateCourtStr} ${nomGroupes}`,
          heures: -deductionHeures,
          montant: -deductionMontant,
          titre: `Séance annulée — ${nomGroupes}`,
          sousTitre: `${slot.creneauFusionne.jourSemaine} ${saDateStr} · ${slot.creneauFusionne.heureDebut} – ${slot.creneauFusionne.heureFin} · ${motifTexte}`,
          datesBadges: [saDateCourtStr],
          detailCalculDuree: `− ${formatMinutesEnHM(deductionMin)}`,
          estAbsenceOrpheline: false,
        })
      }
    }
  }

  // Structure pour fusionner les remplacements qui se chevauchent sur la même date (règle multi-groupes ROBOT.md 4.C)
  interface RemplacementEffectueFusionne {
    date: Date
    dateKey: string
    dateStr: string
    rempDateCourt: string
    jourSemaineRemp: string
    debutMin: number
    finMin: number
    heureDebut: string
    heureFin: string
    coachRemplaceIds: string[]
    coachRemplaceNoms: string[]
    planningIds: string[]
    remplacementIds: string[]
    motifs: string[]
    descriptions: string[]
  }

  // Grouper les remplacements effectués par date pour appliquer la règle de non-cumul multi-groupes (ROBOT.md 4.C)
  const rempsEffectuesParDate = new Map<string, typeof remplacementsEffectues>()
  for (const r of remplacementsEffectues) {
    const rDate = new Date(r.date)
    const dKey = `${rDate.getFullYear()}-${String(rDate.getMonth() + 1).padStart(2, '0')}-${String(rDate.getDate()).padStart(2, '0')}`
    const list = rempsEffectuesParDate.get(dKey) || []
    list.push(r)
    rempsEffectuesParDate.set(dKey, list)
  }

  const rempsEffectuesFusionnes: RemplacementEffectueFusionne[] = []

  for (const [dKey, rempsJour] of rempsEffectuesParDate.entries()) {
    const sorted = [...rempsJour].sort((a, b) => {
      const diffDeb = timeToMinutes(a.heureDebut) - timeToMinutes(b.heureDebut)
      if (diffDeb !== 0) return diffDeb
      return timeToMinutes(b.heureFin) - timeToMinutes(a.heureFin)
    })

    const fusedJour: RemplacementEffectueFusionne[] = []
    for (const r of sorted) {
      const rDate = new Date(r.date)
      const dateStr = rDate.toLocaleDateString('fr-FR')
      const rempDateCourt = rDate.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })
      const jourSemaineRemp = joursSemaineRef[rDate.getDay()]
      const sDeb = timeToMinutes(r.heureDebut)
      const sFin = timeToMinutes(r.heureFin)
      const coachNom = r.coachRemplace
        ? `${(r.coachRemplace.prenom || '').trim()} ${(r.coachRemplace.nom || '').trim()}`.trim()
        : 'Coach'

      const last = fusedJour.length > 0 ? fusedJour[fusedJour.length - 1] : null

      // Règle ROBOT.md 4.C : fusionner les remplacements qui se chevauchent sur la même date (multi-groupes simultanés = non cumul)
      if (last && sDeb < last.finMin) {
        if (sFin > last.finMin) {
          last.finMin = sFin
          last.heureFin = minutesToTime(sFin)
        }
        if (r.coachRemplaceId && !last.coachRemplaceIds.includes(r.coachRemplaceId)) {
          last.coachRemplaceIds.push(r.coachRemplaceId)
        }
        if (coachNom && !last.coachRemplaceNoms.includes(coachNom)) {
          last.coachRemplaceNoms.push(coachNom)
        }
        if (r.planningId && !last.planningIds.includes(r.planningId)) {
          last.planningIds.push(r.planningId)
        }
        if (!last.remplacementIds.includes(r.id)) {
          last.remplacementIds.push(r.id)
        }
        if (r.motif && !last.motifs.includes(r.motif)) {
          last.motifs.push(r.motif)
        }
        if (r.description && !last.descriptions.includes(r.description)) {
          last.descriptions.push(r.description)
        }
      } else {
        fusedJour.push({
          date: r.date,
          dateKey: dKey,
          dateStr,
          rempDateCourt,
          jourSemaineRemp,
          debutMin: sDeb,
          finMin: sFin,
          heureDebut: r.heureDebut,
          heureFin: r.heureFin,
          coachRemplaceIds: r.coachRemplaceId ? [r.coachRemplaceId] : [],
          coachRemplaceNoms: coachNom ? [coachNom] : [],
          planningIds: r.planningId ? [r.planningId] : [],
          remplacementIds: [r.id],
          motifs: r.motif ? [r.motif] : [],
          descriptions: r.description ? [r.description] : [],
        })
      }
    }

    rempsEffectuesFusionnes.push(...fusedJour)
  }

  let heuresRemplacements = 0
  const lignesRemplacements: FactureLigneCalculated[] = []
  const seenRempSlotKeys = new Set<string>()

  interface RemplacementOccurrenceCalculee {
    ligneId: string
    primaryRempId: string
    date: Date
    dateKey: string
    dateStr: string
    rempDateCourt: string
    jourSemaine: string
    heureDebut: string
    heureFin: string
    titre: string
    coachNom: string
    groupeNom: string
    heuresPayees: number
    minutesPayees: number
    motif?: string
    detailMajor?: string
    noteInfo?: string
    customDescription?: string
  }

  const rempOccurrencesCalculees: RemplacementOccurrenceCalculee[] = []

  for (const fusedRemp of rempsEffectuesFusionnes) {
    const coachsNom = fusedRemp.coachRemplaceNoms.length > 0 ? fusedRemp.coachRemplaceNoms.join(', ') : 'Coach'

    // Identifier les créneaux planifiés d'origine des coachs remplacés couverts par le remplacement
    const matchingSlots = planningsReplaces.filter((p) => {
      if (p.jourSemaine !== fusedRemp.jourSemaineRemp) return false
      if (fusedRemp.planningIds.includes(p.id)) return true
      const memeCoach = Array.isArray(p.coachs) && p.coachs.some((c) => fusedRemp.coachRemplaceIds.includes(c.coachId))
      if (!memeCoach) return false
      const sDeb = timeToMinutes(p.heureDebut)
      const sFin = timeToMinutes(p.heureFin)
      return fusedRemp.debutMin < sFin && sDeb < fusedRemp.finMin
    }).sort((a, b) => timeToMinutes(a.heureDebut) - timeToMinutes(b.heureDebut))

    // Règle club : fusionner les créneaux simultanés du coach absent (multi-groupes au même créneau = payé une seule fois)
    interface SlotFusionneRemp {
      id: string
      heureDebut: string
      heureFin: string
      debutMin: number
      finMin: number
      groupes: string[]
      tempsFactureMin: number
      planningIds: string[]
      groupeIds: string[]
    }

    const slotsFusionnes: SlotFusionneRemp[] = []
    for (const p of matchingSlots) {
      const sDeb = timeToMinutes(p.heureDebut)
      const sFin = timeToMinutes(p.heureFin)
      const dureeReelle = Math.max(1, sFin - sDeb)
      const tempsFacture = p.tempsFacture && p.tempsFacture > 0 ? p.tempsFacture : dureeReelle
      const nomGrp = p.groupe?.nom || 'Groupe'
      const last = slotsFusionnes.length > 0 ? slotsFusionnes[slotsFusionnes.length - 1] : null

      // Chevauchement strict : le créneau commence strictement avant la fin du créneau précédent
      if (last && sDeb < last.finMin) {
        if (sFin > last.finMin) {
          last.finMin = sFin
          last.heureFin = minutesToTime(sFin)
        }
        if (!last.groupes.includes(nomGrp)) {
          last.groupes.push(nomGrp)
        }
        last.planningIds.push(p.id)
        if (p.groupeId && !last.groupeIds.includes(p.groupeId)) {
          last.groupeIds.push(p.groupeId)
        }
        if (tempsFacture > last.tempsFactureMin) {
          last.tempsFactureMin = tempsFacture
        }
      } else {
        slotsFusionnes.push({
          id: p.id,
          heureDebut: p.heureDebut,
          heureFin: p.heureFin,
          debutMin: sDeb,
          finMin: sFin,
          groupes: [nomGrp],
          tempsFactureMin: tempsFacture,
          planningIds: [p.id],
          groupeIds: p.groupeId ? [p.groupeId] : [],
        })
      }
    }

    const slotsToProcess = slotsFusionnes.length > 0 ? slotsFusionnes : [null]

    for (const slotAssocie of slotsToProcess) {
      const slotDebutMin = slotAssocie ? slotAssocie.debutMin : fusedRemp.debutMin
      const slotFinMin = slotAssocie ? slotAssocie.finMin : fusedRemp.finMin
      const slotDureeReelleMin = Math.max(1, slotFinMin - slotDebutMin)
      const slotTempsFactureMin =
        slotAssocie?.tempsFactureMin && slotAssocie.tempsFactureMin > 0
          ? slotAssocie.tempsFactureMin
          : slotDureeReelleMin

      // Durée réelle couverte sur ce créneau
      const portionDebutMin = Math.max(fusedRemp.debutMin, slotDebutMin)
      const portionFinMin = Math.min(fusedRemp.finMin, slotFinMin)
      const dureeCouverteMin = Math.max(0, portionFinMin - portionDebutMin)

      if (dureeCouverteMin <= 0) continue

      const portionDebutStr = minutesToTime(portionDebutMin)
      const portionFinStr = minutesToTime(portionFinMin)

      // Clé unique pour garantir qu'aucune ligne en doublon ne soit ajoutée pour la même plage horaire
      const slotKeyUnique = `${fusedRemp.dateKey}_${portionDebutStr}_${portionFinStr}`
      if (seenRempSlotKeys.has(slotKeyUnique)) {
        continue
      }
      seenRempSlotKeys.add(slotKeyUnique)

      const groupeNom = slotAssocie ? slotAssocie.groupes.join(' · ') : 'Remplacement'
      const titre = `${groupeNom} — pour ${coachsNom}`
      const primaryRempId = fusedRemp.remplacementIds[0] || 'remp'
      const ligneId = slotsFusionnes.length > 1 && slotAssocie ? `${primaryRempId}_${slotAssocie.id}` : primaryRempId

      // Si la séance a été annulée par le club ce jour-là, le remplaçant n'est pas rémunéré (Lot 2)
      const slotKeyRemp = slotAssocie ? `${fusedRemp.jourSemaineRemp}_${slotAssocie.heureDebut}_${slotAssocie.heureFin}` : ''
      const annulationRempKey = `${fusedRemp.dateKey}_${slotKeyRemp}`
      const aAnnulationClub = (slotKeyRemp && creneauxAnnulesKeys.has(annulationRempKey)) || seancesAnnulees.some(sa => {
        const saD = new Date(sa.date)
        const isMemeDate = saD.getFullYear() === fusedRemp.date.getFullYear() &&
                           saD.getMonth() === fusedRemp.date.getMonth() &&
                           saD.getDate() === fusedRemp.date.getDate()
        if (!isMemeDate) return false
        if (!sa.planningId && !sa.groupeId && !sa.coachId) return true
        if (sa.planningId && (slotAssocie?.planningIds.includes(sa.planningId) || fusedRemp.planningIds.includes(sa.planningId))) return true
        if (sa.groupeId && slotAssocie?.groupeIds.includes(sa.groupeId)) return true
        if (sa.coachId && (fusedRemp.coachRemplaceIds.includes(sa.coachId) || sa.coachId === coachId)) return true
        return false
      })

      if (aAnnulationClub) {
        rempOccurrencesCalculees.push({
          ligneId,
          primaryRempId,
          date: fusedRemp.date,
          dateKey: fusedRemp.dateKey,
          dateStr: fusedRemp.dateStr,
          rempDateCourt: fusedRemp.rempDateCourt,
          jourSemaine: fusedRemp.jourSemaineRemp,
          heureDebut: portionDebutStr,
          heureFin: portionFinStr,
          titre,
          coachNom: coachsNom,
          groupeNom,
          heuresPayees: 0,
          minutesPayees: 0,
          noteInfo: 'séance annulée par le club',
          customDescription: `Remplacement de ${coachsNom} - ${fusedRemp.dateStr} ${portionDebutStr}-${portionFinStr} (Séance annulée par le club : non rémunéré)`,
        })
        continue
      }

      // Option B : Vérifier si le coach remplaçant avait déjà un cours régulier sur cette date à la même heure
      const seancesMemeJour = creneauxEffectuesParDate.get(fusedRemp.dateKey) || []
      const seancesChevauchantes = seancesMemeJour.filter((s) => portionDebutMin < s.finMin && s.debutMin < portionFinMin)

      if (seancesChevauchantes.length > 0) {
        let minutesNonCouvertes = 0
        for (let m = portionDebutMin; m < portionFinMin; m++) {
          const dansCreneau = m >= slotDebutMin && m < slotFinMin
          const estCouverte = seancesChevauchantes.some((s) => m >= s.debutMin && m < s.finMin)
          if (dansCreneau && !estCouverte) {
            minutesNonCouvertes++
          }
        }

        const descGroupes = seancesChevauchantes.map((s) => s.description).join(', ')

        if (minutesNonCouvertes <= 0) {
          // Le remplacement a eu lieu 100% en même temps que son cours régulier déjà rémunéré
          rempOccurrencesCalculees.push({
            ligneId,
            primaryRempId,
            date: fusedRemp.date,
            dateKey: fusedRemp.dateKey,
            dateStr: fusedRemp.dateStr,
            rempDateCourt: fusedRemp.rempDateCourt,
            jourSemaine: fusedRemp.jourSemaineRemp,
            heureDebut: portionDebutStr,
            heureFin: portionFinStr,
            titre,
            coachNom: coachsNom,
            groupeNom,
            heuresPayees: 0,
            minutesPayees: 0,
            noteInfo: 'déjà payé (cours simultané)',
            customDescription: `Remplacement de ${coachsNom} - ${fusedRemp.dateStr} ${portionDebutStr}-${portionFinStr} (Simultané avec ${descGroupes} : déjà rémunéré dans planning fixe)`,
          })
        } else {
          // Le remplacement déborde partiellement du cours régulier : payé au prorata
          const minutesPayees = (minutesNonCouvertes / slotDureeReelleMin) * slotTempsFactureMin
          const heuresPayees = minutesPayees / 60
          rempOccurrencesCalculees.push({
            ligneId,
            primaryRempId,
            date: fusedRemp.date,
            dateKey: fusedRemp.dateKey,
            dateStr: fusedRemp.dateStr,
            rempDateCourt: fusedRemp.rempDateCourt,
            jourSemaine: fusedRemp.jourSemaineRemp,
            heureDebut: portionDebutStr,
            heureFin: portionFinStr,
            titre,
            coachNom: coachsNom,
            groupeNom,
            heuresPayees,
            minutesPayees: Math.round(minutesPayees),
            noteInfo: `prolongation de ${formatMinutesEnHM(Math.round(minutesPayees))} facturée`,
            customDescription: `Remplacement de ${coachsNom} - ${fusedRemp.dateStr} ${portionDebutStr}-${portionFinStr} (Simultané avec ${descGroupes} : prolongation de ${formatMinutesEnHM(Math.round(minutesPayees))} facturée)`,
          })
        }
      } else {
        // Aucun chevauchement avec un cours propre : rémunération proportionnelle au créneau remplacé
        const minutesPayees = (dureeCouverteMin / slotDureeReelleMin) * slotTempsFactureMin
        const heuresPayees = minutesPayees / 60
        const detailMajor =
          slotTempsFactureMin !== slotDureeReelleMin
            ? `(${formatMinutesEnHM(Math.round(minutesPayees))} facturées)`
            : undefined
        const motifText = fusedRemp.motifs.filter(Boolean).join(' · ') || undefined

        rempOccurrencesCalculees.push({
          ligneId,
          primaryRempId,
          date: fusedRemp.date,
          dateKey: fusedRemp.dateKey,
          dateStr: fusedRemp.dateStr,
          rempDateCourt: fusedRemp.rempDateCourt,
          jourSemaine: fusedRemp.jourSemaineRemp,
          heureDebut: portionDebutStr,
          heureFin: portionFinStr,
          titre,
          coachNom: coachsNom,
          groupeNom,
          heuresPayees,
          minutesPayees: Math.round(minutesPayees),
          motif: motifText,
          detailMajor,
        })
      }
    }
  }

  // Regrouper les séances de remplacement récurrentes identiques (même titre, même jour et mêmes horaires)
  // en mutualisant les dates différentes sous forme de badges (ex : 01/10, 08/10)
  interface GroupedRemplacement {
    groupKey: string
    titre: string
    jourSemaine: string
    heureDebut: string
    heureFin: string
    heuresUnitaires: number
    minutesUnitaires: number
    coachNom: string
    groupeNom: string
    detailMajor?: string
    noteInfo?: string
    motifs: string[]
    occurrences: RemplacementOccurrenceCalculee[]
  }

  const groupedRempMap = new Map<string, GroupedRemplacement>()

  for (const occ of rempOccurrencesCalculees) {
    const key = `${occ.titre}__${occ.jourSemaine}__${occ.heureDebut}__${occ.heureFin}__${occ.heuresPayees.toFixed(4)}__${occ.noteInfo || ''}`
    const existing = groupedRempMap.get(key)
    if (existing) {
      existing.occurrences.push(occ)
      if (occ.motif && !existing.motifs.includes(occ.motif)) {
        existing.motifs.push(occ.motif)
      }
    } else {
      groupedRempMap.set(key, {
        groupKey: key,
        titre: occ.titre,
        jourSemaine: occ.jourSemaine,
        heureDebut: occ.heureDebut,
        heureFin: occ.heureFin,
        heuresUnitaires: occ.heuresPayees,
        minutesUnitaires: occ.minutesPayees,
        coachNom: occ.coachNom,
        groupeNom: occ.groupeNom,
        detailMajor: occ.detailMajor,
        noteInfo: occ.noteInfo,
        motifs: occ.motif ? [occ.motif] : [],
        occurrences: [occ],
      })
    }
  }

  // Trier les groupes selon la première date chronologique, puis par heure de début
  const sortedRempGroups = Array.from(groupedRempMap.values()).sort((a, b) => {
    const minDateA = Math.min(...a.occurrences.map((o) => o.date.getTime()))
    const minDateB = Math.min(...b.occurrences.map((o) => o.date.getTime()))
    if (minDateA !== minDateB) return minDateA - minDateB
    return timeToMinutes(a.heureDebut) - timeToMinutes(b.heureDebut)
  })

  for (const grp of sortedRempGroups) {
    grp.occurrences.sort((a, b) => a.date.getTime() - b.date.getTime())

    const datesBadges = Array.from(new Set(grp.occurrences.map((o) => o.rempDateCourt)))
    const nbSeances = grp.occurrences.length
    const totalHeures = grp.heuresUnitaires * nbSeances
    const montantTotal = totalHeures * tauxHoraire
    heuresRemplacements += totalHeures

    const firstOcc = grp.occurrences[0]
    const primaryId = firstOcc.primaryRempId

    const sousTitreParts = [`${grp.jourSemaine} · ${grp.heureDebut} – ${grp.heureFin}`]
    if (grp.detailMajor) sousTitreParts.push(grp.detailMajor.trim())
    if (grp.noteInfo) sousTitreParts.push(grp.noteInfo)
    if (grp.motifs.length > 0) sousTitreParts.push(grp.motifs.join(' · '))

    const detailCalculDuree =
      grp.heuresUnitaires === 0
        ? '0h00'
        : nbSeances > 1
        ? `${nbSeances} × ${formatMinutesEnHM(grp.minutesUnitaires)} = ${formatHeuresEnHM(totalHeures)}`
        : formatMinutesEnHM(grp.minutesUnitaires)

    const descDates = datesBadges.join(', ')
    const description =
      firstOcc.customDescription && nbSeances === 1
        ? firstOcc.customDescription
        : nbSeances > 1
        ? `Remplacement de ${grp.coachNom} - ${grp.groupeNom} (${grp.jourSemaine} ${grp.heureDebut}-${grp.heureFin}) (${descDates})`
        : `Remplacement de ${grp.coachNom} - ${firstOcc.dateStr} ${grp.heureDebut}-${grp.heureFin}${grp.detailMajor ? ` ${grp.detailMajor}` : ''}${grp.motifs.length > 0 ? ` (${grp.motifs.join(' · ')})` : ''}`

    lignesRemplacements.push({
      id: `${primaryId}_${grp.heureDebut.replace(':', 'h')}`,
      type: 'remplacement',
      remplacementId: primaryId,
      description,
      heures: totalHeures,
      montant: montantTotal,
      date: firstOcc.date,
      titre: grp.titre,
      sousTitre: sousTitreParts.join(' · '),
      datesBadges,
      nbSeances,
      dureeUnitaireMinutes: grp.minutesUnitaires,
      detailCalculDuree,
      coachRemplaceNom: grp.coachNom,
      noteInfo: grp.noteInfo,
    })
  }

  // Grouper les absences reçues par date pour fusionner les créneaux multi-groupes identiques (non double déduction)
  interface RemplacementRecuFusionne {
    date: Date
    dateKey: string
    dateStr: string
    dateCourtStr: string
    debutMin: number
    finMin: number
    heureDebut: string
    heureFin: string
    coachRemplacantNoms: string[]
    planningIds: string[]
    remplacementIds: string[]
    motifs: string[]
    enAttente: boolean
  }

  const rempsRecusParDate = new Map<string, typeof remplacementsRecus>()
  for (const r of remplacementsRecus) {
    const rDate = new Date(r.date)
    const dKey = `${rDate.getFullYear()}-${String(rDate.getMonth() + 1).padStart(2, '0')}-${String(rDate.getDate()).padStart(2, '0')}`
    const list = rempsRecusParDate.get(dKey) || []
    list.push(r)
    rempsRecusParDate.set(dKey, list)
  }

  const rempsRecusFusionnes: RemplacementRecuFusionne[] = []

  for (const [dKey, rempsJour] of rempsRecusParDate.entries()) {
    const sorted = [...rempsJour].sort((a, b) => {
      const diffDeb = timeToMinutes(a.heureDebut) - timeToMinutes(b.heureDebut)
      if (diffDeb !== 0) return diffDeb
      return timeToMinutes(b.heureFin) - timeToMinutes(a.heureFin)
    })

    const fusedJour: RemplacementRecuFusionne[] = []
    for (const r of sorted) {
      const rDate = new Date(r.date)
      const dateStr = rDate.toLocaleDateString('fr-FR')
      const dateCourtStr = rDate.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })
      const sDeb = timeToMinutes(r.heureDebut)
      const sFin = timeToMinutes(r.heureFin)
      const coachNom = r.coachRemplacant
        ? `${(r.coachRemplacant.prenom || '').trim()} ${(r.coachRemplacant.nom || '').trim()}`.trim()
        : ''
      const isEnAttente = (r as any).statut === 'en_attente'

      const last = fusedJour.length > 0 ? fusedJour[fusedJour.length - 1] : null

      if (last && sDeb < last.finMin) {
        if (sFin > last.finMin) {
          last.finMin = sFin
          last.heureFin = minutesToTime(sFin)
        }
        if (coachNom && !last.coachRemplacantNoms.includes(coachNom)) {
          last.coachRemplacantNoms.push(coachNom)
        }
        if (r.planningId && !last.planningIds.includes(r.planningId)) {
          last.planningIds.push(r.planningId)
        }
        if (!last.remplacementIds.includes(r.id)) {
          last.remplacementIds.push(r.id)
        }
        if (r.motif && !last.motifs.includes(r.motif)) {
          last.motifs.push(r.motif)
        }
        if (isEnAttente) {
          last.enAttente = true
        }
      } else {
        fusedJour.push({
          date: r.date,
          dateKey: dKey,
          dateStr,
          dateCourtStr,
          debutMin: sDeb,
          finMin: sFin,
          heureDebut: r.heureDebut,
          heureFin: r.heureFin,
          coachRemplacantNoms: coachNom ? [coachNom] : [],
          planningIds: r.planningId ? [r.planningId] : [],
          remplacementIds: [r.id],
          motifs: r.motif ? [r.motif] : [],
          enAttente: isEnAttente,
        })
      }
    }

    rempsRecusFusionnes.push(...fusedJour)
  }

  for (const fusedAbs of rempsRecusFusionnes) {
    const estPendantVacances = periodesVacances.some((p) => {
      const debut = new Date(p.dateDebut)
      const fin = new Date(p.dateFin)
      return fusedAbs.date >= debut && fusedAbs.date <= fin
    })

    if (estPendantVacances) {
      continue
    }

    const coachNom = fusedAbs.coachRemplacantNoms.length > 0
      ? fusedAbs.coachRemplacantNoms.join(', ')
      : null
    const descPrefix = coachNom ? `Absence (Remplacé(e) par ${coachNom})` : `Absence sans remplacement`

    // Trouver tous les créneaux réguliers actifs de ce coach sur cette date
    const slotsDuJour = creneauxActifsParDate.get(fusedAbs.dateKey) || []
    let totalDeductionMinutes = 0
    let aChevauchement = false

    for (const slot of slotsDuJour) {
      const slotKey = `${slot.creneauFusionne.jourSemaine}_${slot.creneauFusionne.heureDebut}_${slot.creneauFusionne.heureFin}`
      const annulationSlotKey = `${fusedAbs.dateKey}_${slotKey}`

      if (creneauxAnnulesKeys.has(annulationSlotKey)) {
        // Le créneau a déjà été déduit par une annulation club : pas de double pénalisation
        continue
      }
      const chevauchementMin = Math.max(
        0,
        Math.min(fusedAbs.finMin, slot.finMin) - Math.max(fusedAbs.debutMin, slot.debutMin)
      )
      if (chevauchementMin > 0 && slot.dureeReelleMin > 0) {
        aChevauchement = true
        // Formule proportionnelle :
        // Déduction = (minutes d'absence pendant le créneau / durée réelle du créneau) * temps facturé du créneau
        const deductionMin = (chevauchementMin / slot.dureeReelleMin) * slot.tempsFactureMin
        totalDeductionMinutes += deductionMin

        // Rattacher directement la déduction d'absence sous la séance concernée
        if (slot.creneauFusionne) {
          const deductionHeures = deductionMin / 60
          const motifOrCoach = fusedAbs.motifs.length > 0
            ? fusedAbs.motifs.join(' · ')
            : coachNom
            ? `Remplacé(e) par ${coachNom}`
            : ''
          const descAbsence = `↳ Absence ${fusedAbs.dateCourtStr}${motifOrCoach ? ` (${motifOrCoach})` : ''}`
          const primaryId = fusedAbs.remplacementIds[0] || 'abs'

          slot.creneauFusionne.absencesAssociees.push({
            id: primaryId,
            date: fusedAbs.dateCourtStr,
            dateComplete: fusedAbs.dateKey,
            motif: fusedAbs.motifs.join(' · ') || null,
            coachRemplacantNom: coachNom,
            heures: -deductionHeures,
            montant: -deductionHeures * tauxHoraire,
            minutes: Math.round(deductionMin),
            texteDeduction: `− ${formatMinutesEnHM(Math.round(deductionMin))}`,
            description: descAbsence,
            type: 'absence',
            enAttente: fusedAbs.enAttente,
          })
        }
      }
    }

    const primaryAbsId = fusedAbs.remplacementIds[0] || 'abs'
    const motifStr = fusedAbs.motifs.length > 0 ? ` (${fusedAbs.motifs.join(' · ')})` : ''

    if (!aChevauchement) {
      // Aucun créneau actif ce jour-là sur cette plage horaire (ex: absence déclarée hors cours ou séance annulée)
      lignesAbsences.push({
        id: primaryAbsId,
        type: 'absence',
        description: `${descPrefix} - ${fusedAbs.dateStr} ${fusedAbs.heureDebut}-${fusedAbs.heureFin}${motifStr} (Hors créneau planifié : 0h déduite)`,
        heures: 0,
        montant: 0,
        date: fusedAbs.date,
        titre: `${descPrefix}`,
        sousTitre: `${fusedAbs.dateStr} ${fusedAbs.heureDebut} – ${fusedAbs.heureFin} · Hors créneau planifié`,
        datesBadges: [fusedAbs.dateCourtStr],
        detailCalculDuree: '0h00',
        estAbsenceOrpheline: true,
      })
    } else {
      const dureeHeures = totalDeductionMinutes / 60
      heuresAbsences += dureeHeures
      const detailDeduction = ` (-${formatMinutesEnHM(Math.round(totalDeductionMinutes))})`

      lignesAbsences.push({
        id: primaryAbsId,
        type: 'absence',
        description: `${descPrefix} - ${fusedAbs.dateStr} ${fusedAbs.heureDebut}-${fusedAbs.heureFin}${detailDeduction}${motifStr}`,
        heures: -dureeHeures,
        montant: -dureeHeures * tauxHoraire,
        date: fusedAbs.date,
        titre: `${descPrefix}`,
        sousTitre: `${fusedAbs.dateStr} · ${fusedAbs.heureDebut} – ${fusedAbs.heureFin}${motifStr}`,
        datesBadges: [fusedAbs.dateCourtStr],
        detailCalculDuree: `− ${formatMinutesEnHM(Math.round(totalDeductionMinutes))}`,
        estAbsenceOrpheline: false,
      })
    }
  }

  // 1.c Finaliser la construction des lignes du planning fixe (avec absences associées imbriquées)
  for (const creneau of creneauxFusionnes) {
    if (creneau.calculatedOccurrences && creneau.calculatedOccurrences.occurences > 0) {
      const { dates, occurences, totalHrs, tempsFactureMin, dureeReelleMin } = creneau.calculatedOccurrences
      heuresPlanningFixe += totalHrs
      const groupesStr = creneau.groupes.join(', ')
      const datesStr = dates.map((d) => d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })).join(', ')
      let detailFacture = ''

      if (tempsFactureMin !== dureeReelleMin) {
        detailFacture = ` (Facturé ${formatMinutesEnHM(tempsFactureMin)})`
      }

      const datesBadges = dates.map((d) => d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' }))
      const titre = creneau.groupes.join(' · ')
      const sousTitreParts = [`${creneau.jourSemaine} ${creneau.heureDebut} – ${creneau.heureFin}`]
      if (tempsFactureMin !== dureeReelleMin) {
        sousTitreParts.push(`(facturé ${formatMinutesEnHM(tempsFactureMin)})`)
      }
      const sousTitre = sousTitreParts.join(' · ')

      const detailCalculDuree = occurences > 1
        ? `${occurences} × ${formatMinutesEnHM(tempsFactureMin)} = ${formatMinutesEnHM(Math.round(totalHrs * 60))}`
        : formatMinutesEnHM(tempsFactureMin)

      lignesPlanningFixe.push({
        type: 'planning_fixe',
        description: `${creneau.jourSemaine} ${creneau.heureDebut}-${creneau.heureFin} - ${groupesStr}${detailFacture} (${datesStr})`,
        heures: totalHrs,
        montant: totalHrs * tauxHoraire,
        titre,
        sousTitre,
        datesBadges,
        nbSeances: occurences,
        dureeUnitaireMinutes: tempsFactureMin,
        detailCalculDuree,
        espaces: creneau.espaces,
        absencesAssociees: creneau.absencesAssociees,
      })
    }
  }

  // Heures administratives automatiques pour le coach (si activées)
  if (coachInfo?.heuresAdminHebdo && coachInfo.heuresAdminHebdo > 0) {
    let adminDateDebut = new Date(dateDebut)
    if (dateDebutSaison && adminDateDebut < dateDebutSaison) {
      if (dateFin >= dateDebutSaison) {
        adminDateDebut = new Date(dateDebutSaison)
      } else {
        adminDateDebut = new Date(dateFin)
      }
    }

    const { nbSemaines } = compterSemainesHorsVacances(adminDateDebut, dateFin, periodesVacances)
    if (nbSemaines > 0) {
      const totalHrsAdmin = nbSemaines * coachInfo.heuresAdminHebdo
      const montantAdmin = totalHrsAdmin * tauxHoraire
      heuresPlanningFixe += totalHrsAdmin
      lignesPlanningFixe.push({
        type: 'planning_fixe',
        description: `Heures administratives (${nbSemaines} semaine${nbSemaines > 1 ? 's' : ''} hors vacances - ${coachInfo.heuresAdminHebdo}h/sem)`,
        heures: totalHrsAdmin,
        montant: montantAdmin,
        titre: 'Heures administratives',
        sousTitre: `${nbSemaines} semaine${nbSemaines > 1 ? 's' : ''} hors vacances · ${coachInfo.heuresAdminHebdo}h / sem`,
        datesBadges: [],
        nbSeances: nbSemaines,
        detailCalculDuree: `${nbSemaines} × ${coachInfo.heuresAdminHebdo}h = ${formatHeuresEnHM(totalHrsAdmin)}`,
      })
    }
  }

  // 3. Planning tournant (filtrage vacances + fermetures piscine + regroupement des créneaux récurrents identiques)
  const evenementsTournants = await prisma.evenementTournant.findMany({
    where: {
      coachId,
      actif: true,
      date: { gte: dateDebut, lte: dateFinMois },
    },
    orderBy: [
      { date: 'asc' },
      { heureDebut: 'asc' },
    ],
  })

  interface TournantOccurrence {
    id: string
    titre: string
    date: Date
    dateStr: string
    evtDateCourt: string
    jourSemaine: string
    heureDebut: string
    heureFin: string
    dureeHeures: number
  }

  interface GroupedTournant {
    groupKey: string
    titre: string
    jourSemaine: string
    heureDebut: string
    heureFin: string
    dureeUnitaireHeures: number
    occurrences: TournantOccurrence[]
  }

  const groupedTournantsMap = new Map<string, GroupedTournant>()

  for (const evt of evenementsTournants) {
    const dateEvt = new Date(evt.date)
    const estEnVacances = periodesVacances.some((periode) => {
      const debut = new Date(periode.dateDebut)
      const fin = new Date(periode.dateFin)
      return dateEvt >= debut && dateEvt <= fin
    })

    if (estEnVacances) continue

    // Vérifier si le créneau tournant tombe un jour de fermeture exceptionnelle du club (seancesAnnulees)
    const estAnnuleeClub = seancesAnnulees.some((sa) => {
      const saD = new Date(sa.date)
      const isMemeDate =
        saD.getFullYear() === dateEvt.getFullYear() &&
        saD.getMonth() === dateEvt.getMonth() &&
        saD.getDate() === dateEvt.getDate()
      if (!isMemeDate) return false
      if (!sa.planningId && !sa.groupeId && !sa.coachId) return true
      if (sa.coachId && sa.coachId === coachId) return true
      if (sa.groupeId && (evt as any).groupeId && sa.groupeId === (evt as any).groupeId) return true
      return false
    })

    if (estAnnuleeClub) continue

    const dureeHeures = arrondirDemiHeureSuperieure(calculerDuree(evt.heureDebut, evt.heureFin))
    const dateStr = dateEvt.toLocaleDateString('fr-FR')
    const evtDateCourt = dateEvt.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })
    const jourSemaine = joursSemaineRef[dateEvt.getDay()]

    const occ: TournantOccurrence = {
      id: evt.id,
      titre: evt.titre,
      date: dateEvt,
      dateStr,
      evtDateCourt,
      jourSemaine,
      heureDebut: evt.heureDebut,
      heureFin: evt.heureFin,
      dureeHeures,
    }

    const key = `${evt.titre}__${jourSemaine}__${evt.heureDebut}__${evt.heureFin}__${dureeHeures.toFixed(4)}`
    const existing = groupedTournantsMap.get(key)
    if (existing) {
      existing.occurrences.push(occ)
    } else {
      groupedTournantsMap.set(key, {
        groupKey: key,
        titre: evt.titre,
        jourSemaine,
        heureDebut: evt.heureDebut,
        heureFin: evt.heureFin,
        dureeUnitaireHeures: dureeHeures,
        occurrences: [occ],
      })
    }
  }

  let heuresPlanningTournant = 0
  const lignesPlanningTournant: FactureLigneCalculated[] = []

  const sortedTournantGroups = Array.from(groupedTournantsMap.values()).sort((a, b) => {
    const minDateA = Math.min(...a.occurrences.map((o) => o.date.getTime()))
    const minDateB = Math.min(...b.occurrences.map((o) => o.date.getTime()))
    if (minDateA !== minDateB) return minDateA - minDateB
    return timeToMinutes(a.heureDebut) - timeToMinutes(b.heureDebut)
  })

  for (const grp of sortedTournantGroups) {
    grp.occurrences.sort((a, b) => a.date.getTime() - b.date.getTime())
    const datesBadges = Array.from(new Set(grp.occurrences.map((o) => o.evtDateCourt)))
    const nbSeances = grp.occurrences.length
    const totalHeures = grp.dureeUnitaireHeures * nbSeances
    const montantTotal = totalHeures * tauxHoraire
    heuresPlanningTournant += totalHeures

    const firstOcc = grp.occurrences[0]
    const sousTitre =
      nbSeances > 1
        ? `${grp.jourSemaine} · ${grp.heureDebut} – ${grp.heureFin}`
        : `${firstOcc.dateStr} · ${grp.heureDebut} – ${grp.heureFin}`

    const detailCalculDuree =
      nbSeances > 1
        ? `${nbSeances} × ${formatHeuresEnHM(grp.dureeUnitaireHeures)} = ${formatHeuresEnHM(totalHeures)}`
        : formatHeuresEnHM(totalHeures)

    const description =
      nbSeances > 1
        ? `${grp.titre} - ${grp.jourSemaine} ${grp.heureDebut}-${grp.heureFin} (${datesBadges.join(', ')})`
        : `${grp.titre} - ${firstOcc.dateStr} ${grp.heureDebut}-${grp.heureFin}`

    lignesPlanningTournant.push({
      id: firstOcc.id,
      type: 'planning_tournant',
      description,
      heures: totalHeures,
      montant: montantTotal,
      date: firstOcc.date,
      titre: grp.titre,
      sousTitre,
      datesBadges,
      nbSeances,
      dureeUnitaireMinutes: Math.round(grp.dureeUnitaireHeures * 60),
      detailCalculDuree,
    })
  }

  // 4. Lignes manuelles (réutilise factureExistante chargée en début de fonction sans double requête Prisma)
  let lignesManuelles: FactureLigneCalculated[] = []
  const factureBrouillon = factureExistante

  if (factureBrouillon) {
    // Les remplacements et absences sont calculés dynamiquement depuis la table Remplacement.
    // Purge active en base de données de toute ligne résiduelle de type 'remplacement' ou 'absence' qui résiderait encore dans la table LigneFactureCoach
    const hasObsoleteLines = factureBrouillon.lignes.some((l: any) => ['remplacement', 'absence'].includes(l.type))
    if (hasObsoleteLines && !isVerrouilleeDefinitive) {
      await prisma.ligneFactureCoach.deleteMany({
        where: {
          factureId: factureBrouillon.id,
          type: { in: ['remplacement', 'absence'] },
        },
      })
    }

    // On exclut formellement les types 'remplacement' et 'absence' des lignes manuelles pour éviter tout doublon.
    const TYPES_MANUELS = ['competition', 'forfait_regional', 'forfait_transport', 'manuel']
    lignesManuelles = factureBrouillon.lignes
      .filter((l: any) => TYPES_MANUELS.includes(l.type))
      .map((l: any) => {
        let titre = l.description
        let sousTitre = ''
        let detailCalculDuree = ''
        const dateFormatted = l.date ? new Date(l.date).toLocaleDateString('fr-FR') : null
        const dateBadge = l.date ? [new Date(l.date).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })] : []

        if (l.type === 'competition' || l.type === 'forfait_regional') {
          const estJournee = l.demiJournees === 2 || l.heures === 2
          titre = `🏆 ${l.description || 'Compétition'}`
          const parts = []
          if (dateFormatted) parts.push(dateFormatted)
          if (l.lieu) parts.push(l.lieu)
          parts.push(estJournee ? '1 journée complète' : '1 demi-journée')
          sousTitre = parts.join(' · ')
          detailCalculDuree = estJournee ? '1 journée' : '1 demi-j.'
        } else if (l.type === 'forfait_transport') {
          titre = '🚗 Forfait transport'
          const parts = []
          if (dateFormatted) parts.push(dateFormatted)
          if (l.lieu) parts.push(l.lieu)
          parts.push(`${l.heures || 0} km aller (${((l.heures || 0) * 2)} km A/R) · 0,30 €/km`)
          sousTitre = parts.join(' · ')
          detailCalculDuree = `${l.heures || 0} km aller`
        } else {
          titre = `✏️ ${l.description || 'Prestation'}`
          const parts = []
          if (dateFormatted) parts.push(dateFormatted)
          if (l.lieu) parts.push(l.lieu)
          sousTitre = parts.join(' · ')
          detailCalculDuree = l.heures ? formatHeuresEnHM(l.heures) : '-'
        }

        return {
          id: l.id,
          type: l.type as any,
          description: l.description,
          heures: l.heures ?? 0,
          montant: l.montant,
          date: l.date,
          groupe: l.groupe || null,
          lieu: l.lieu || null,
          demiJournees: l.demiJournees || null,
          coachRemplaceId: l.coachRemplaceId || null,
          remplacementId: l.remplacementId || null,
          titre,
          sousTitre,
          datesBadges: dateBadge,
          detailCalculDuree,
        }
      })
  }

  // Totaux
  const totalHeures = heuresPlanningFixe + heuresPlanningTournant + heuresRemplacements - heuresAbsences +
    lignesManuelles.reduce((sum, l) => sum + (l.type === 'manuel' ? (l.heures || 0) : 0), 0)

  const calculatedTotalMontant =
    lignesPlanningFixe.reduce((sum, l) => sum + l.montant, 0) +
    lignesPlanningTournant.reduce((sum, l) => sum + l.montant, 0) +
    lignesRemplacements.reduce((sum, l) => sum + l.montant, 0) +
    lignesAbsences.reduce((sum, l) => sum + l.montant, 0) +
    lignesManuelles.reduce((sum, l) => sum + l.montant, 0)

  // Si une facture est déjà transmise (envoyee) ou payée avec un montantTotal enregistré, le conserver strictement
  const totalMontant = isVerrouilleeDefinitive && (factureExistante?.montantTotal ?? 0) > 0
    ? factureExistante!.montantTotal
    : calculatedTotalMontant

  let message: string | undefined = undefined
  if (isPayee) {
    message = 'Votre facture de ce mois a été payée et archivée.'
  } else if (isEnvoyee) {
    message = 'Cette facture a été transmise au club. Elle est désormais verrouillée et ne peut plus être modifiée.'
  } else if (isGeneree) {
    message = 'Cette facture est générée. Vous pouvez la régénérer si vous modifiez vos prestations avant l\'envoi au club.'
  }

  const detailsObj: FactureCoachDetails = {
    mois,
    annee,
    tauxHoraire,
    forfaitDemiJournee,
    forfaitRegionalActif,
    montantForfaitRegional,
    lignesPlanningFixe,
    lignesPlanningTournant,
    lignesRemplacements,
    lignesAbsences,
    lignesManuelles,
    totalHeures,
    totalMontant,
    joursTravailles: Array.from(joursTravailles),
    factureId: factureExistante?.id || factureBrouillon?.id,
    isBlocked: isLocked,
    statut: factureExistante?.statut || 'brouillon',
    message,
  }

  detailsObj.sections = structurerFactureSections(detailsObj)

  return detailsObj
}

// Helpers
function getWeekNumber(d: Date): number {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()))
  const dayNum = date.getUTCDay() || 7
  date.setUTCDate(date.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1))
  return Math.ceil((((date.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)
}

function obtenirDatesJour(
  jourSemaine: string,
  dateDebut: Date,
  dateFin: Date,
  periodesVacances: Array<{ dateDebut: Date; dateFin: Date }> = [],
  semaineImpaire?: boolean
): Date[] {
  const joursMap: { [key: string]: number } = {
    Dimanche: 0, Lundi: 1, Mardi: 2, Mercredi: 3, Jeudi: 4, Vendredi: 5, Samedi: 6
  }

  const jourCible = joursMap[jourSemaine]
  if (jourCible === undefined) return []

  const dates: Date[] = []
  const current = new Date(dateDebut)

  while (current <= dateFin) {
    if (current.getDay() === jourCible) {
      if (semaineImpaire && getWeekNumber(current) % 2 === 0) {
        current.setDate(current.getDate() + 1)
        continue
      }

      // Vérifier si cette date tombe pendant une période de vacances
      const estEnVacances = periodesVacances.some((periode) => {
        const debut = new Date(periode.dateDebut)
        const fin = new Date(periode.dateFin)
        return current >= debut && current <= fin
      })

      if (!estEnVacances) {
        dates.push(new Date(current))
      }
    }
    current.setDate(current.getDate() + 1)
  }

  return dates
}

export function timeToMinutes(timeStr: string): number {
  const [h, m] = (timeStr || '00:00').split(':').map(Number)
  return (h || 0) * 60 + (m || 0)
}

export function minutesToTime(mins: number): string {
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

export function calculerDuree(heureDebut: string, heureFin: string): number {
  return (timeToMinutes(heureFin) - timeToMinutes(heureDebut)) / 60
}

export function arrondirDemiHeureSuperieure(dureeHeures: number): number {
  return Math.ceil(dureeHeures * 2) / 2
}

export { formatMinutesEnHM, formatHeuresEnHM }

export function structurerFactureSections(details: FactureCoachDetails): FactureSectionGroup[] {
  const sections: FactureSectionGroup[] = []

  // 1. Planning régulier
  if (details.lignesPlanningFixe && details.lignesPlanningFixe.length > 0) {
    const lignesFixes = details.lignesPlanningFixe
    // Calcul du sous-total net (heures régulières - absences rattachées)
    let sousTotalHeures = 0
    let sousTotalMontant = 0

    for (const l of lignesFixes) {
      sousTotalHeures += l.heures || 0
      sousTotalMontant += l.montant || 0
      if (l.absencesAssociees && l.absencesAssociees.length > 0) {
        for (const abs of l.absencesAssociees) {
          sousTotalHeures += abs.heures // négatif
          sousTotalMontant += abs.montant // négatif
        }
      }
    }

    sections.push({
      id: 'planning_fixe',
      titre: 'PLANNING RÉGULIER',
      type: 'planning_fixe',
      lignes: lignesFixes,
      sousTotalHeures,
      sousTotalMontant,
      sousTotalDureeHM: formatHeuresEnHM(sousTotalHeures),
    })
  }

  // 2. Planning tournant
  if (details.lignesPlanningTournant && details.lignesPlanningTournant.length > 0) {
    const sousTotalHeures = details.lignesPlanningTournant.reduce((s, l) => s + (l.heures || 0), 0)
    const sousTotalMontant = details.lignesPlanningTournant.reduce((s, l) => s + (l.montant || 0), 0)
    sections.push({
      id: 'planning_tournant',
      titre: 'PLANNING TOURNANT',
      type: 'planning_tournant',
      lignes: details.lignesPlanningTournant,
      sousTotalHeures,
      sousTotalMontant,
      sousTotalDureeHM: formatHeuresEnHM(sousTotalHeures),
    })
  }

  // 3. Remplacements effectués
  if (details.lignesRemplacements && details.lignesRemplacements.length > 0) {
    const sousTotalHeures = details.lignesRemplacements.reduce((s, l) => s + (l.heures || 0), 0)
    const sousTotalMontant = details.lignesRemplacements.reduce((s, l) => s + (l.montant || 0), 0)
    sections.push({
      id: 'remplacements',
      titre: 'REMPLACEMENTS EFFECTUÉS',
      type: 'remplacements',
      lignes: details.lignesRemplacements,
      sousTotalHeures,
      sousTotalMontant,
      sousTotalDureeHM: formatHeuresEnHM(sousTotalHeures),
    })
  }

  // 4. Compétitions & Déplacements
  const lignesCompEtTransport = (details.lignesManuelles || []).filter(
    (l) => ['competition', 'forfait_regional', 'forfait_transport'].includes(l.type)
  )
  if (lignesCompEtTransport.length > 0) {
    const sousTotalMontant = lignesCompEtTransport.reduce((s, l) => s + (l.montant || 0), 0)
    sections.push({
      id: 'competitions',
      titre: 'COMPÉTITIONS & DÉPLACEMENTS',
      type: 'competitions',
      lignes: lignesCompEtTransport,
      sousTotalHeures: 0,
      sousTotalMontant,
    })
  }

  // 5. Prestations diverses
  const lignesPrestations = (details.lignesManuelles || []).filter((l) => l.type === 'manuel')
  if (lignesPrestations.length > 0) {
    const sousTotalHeures = lignesPrestations.reduce((s, l) => s + (l.heures || 0), 0)
    const sousTotalMontant = lignesPrestations.reduce((s, l) => s + (l.montant || 0), 0)
    sections.push({
      id: 'prestations',
      titre: 'PRESTATIONS DIVERSES',
      type: 'prestations',
      lignes: lignesPrestations,
      sousTotalHeures,
      sousTotalMontant,
      sousTotalDureeHM: formatHeuresEnHM(sousTotalHeures),
    })
  }

  // 6. Autres absences (orphelines / non rattachées)
  const absencesRattacheesIds = new Set<string>()
  for (const f of details.lignesPlanningFixe || []) {
    for (const abs of f.absencesAssociees || []) {
      if (abs.id) absencesRattacheesIds.add(abs.id)
    }
  }
  const absencesOrphelines = (details.lignesAbsences || []).filter(
    (a) => !a.id || !absencesRattacheesIds.has(a.id)
  )
  if (absencesOrphelines.length > 0) {
    const sousTotalHeures = absencesOrphelines.reduce((s, l) => s + (l.heures || 0), 0)
    const sousTotalMontant = absencesOrphelines.reduce((s, l) => s + (l.montant || 0), 0)
    sections.push({
      id: 'autres_absences',
      titre: 'AUTRES ABSENCES / AJUSTEMENTS',
      type: 'autres_absences',
      lignes: absencesOrphelines,
      sousTotalHeures,
      sousTotalMontant,
      sousTotalDureeHM: formatHeuresEnHM(sousTotalHeures),
    })
  }

  return sections
}

function compterSemainesHorsVacances(
  dateDebut: Date,
  dateFin: Date,
  periodesVacances: Array<{ dateDebut: Date; dateFin: Date }> = []
): { nbSemaines: number } {
  let count = 0
  const current = new Date(dateDebut)
  
  const day = current.getDay()
  const diffToMonday = (day === 0 ? -6 : 1 - day)
  const firstMonday = new Date(current)
  firstMonday.setDate(current.getDate() + diffToMonday)
  firstMonday.setHours(0, 0, 0, 0)

  let weekStart = new Date(firstMonday)

  while (weekStart <= dateFin) {
    const weekEnd = new Date(weekStart)
    weekEnd.setDate(weekStart.getDate() + 6)
    weekEnd.setHours(23, 59, 59, 999)

    if (weekStart <= dateFin && weekEnd >= dateDebut) {
      let aJourActif = false
      const dayCheck = new Date(Math.max(weekStart.getTime(), dateDebut.getTime()))
      const limitDay = new Date(Math.min(weekEnd.getTime(), dateFin.getTime()))

      while (dayCheck <= limitDay) {
        const estEnVacances = periodesVacances.some((p) => {
          const debut = new Date(p.dateDebut)
          const fin = new Date(p.dateFin)
          return dayCheck >= debut && dayCheck <= fin
        })

        if (!estEnVacances) {
          aJourActif = true
          break
        }
        dayCheck.setDate(dayCheck.getDate() + 1)
      }

      if (aJourActif) {
        count++
      }
    }

    weekStart.setDate(weekStart.getDate() + 7)
  }

  return { nbSemaines: count }
}
