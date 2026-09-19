import { prisma } from '@/lib/prisma'

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

export async function calculerFactureCoach(coachId: string, mois: number, annee: number): Promise<FactureCoachDetails> {
  // Récupérer les paramètres (taux horaire, débuts de cours)
  const settings = await prisma.settings.findFirst()
  const tauxHoraire = settings?.tauxHoraire || 35
  const forfaitDemiJournee = settings?.forfaitCompetition || 150
  const forfaitRegionalActif = settings?.forfaitRegionalActif || false
  const montantForfaitRegional = settings?.montantForfaitRegional || 50

  // Récupérer la date de début officiel de saison (ex: 14 Septembre 2026)
  const dateDebutSaison = parseDateDebutSaison(settings?.debutCoursNormal)
  const dateDebutBnssa = parseDateDebutSaison(settings?.debutCoursBnssa)

  // Vérifier si la facture existe déjà
  const factureExistante = await prisma.factureCoach.findUnique({
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
  })

  const dateFinMois = new Date(annee, mois, 0, 23, 59, 59)
  const isPayee = factureExistante?.statut === 'payee'
  const isEnvoyee = factureExistante?.statut === 'envoyee'

  // Calculer les dates de début et fin du mois
  const now = new Date()
  const dateDebut = new Date(annee, mois - 1, 1, 0, 0, 0, 0)
  let dateFin = new Date(annee, mois, 0, 23, 59, 59, 999)

  // Si on calcule pour le mois et l'année en cours, on limite le planning fixe au jour actuel
  if (annee === now.getFullYear() && mois === now.getMonth() + 1) {
    dateFin = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999)
  } else if (annee > now.getFullYear() || (annee === now.getFullYear() && mois > now.getMonth() + 1)) {
    // Si c'est dans le futur, on renvoie une période vide (fin = début) pour ne rien afficher à l'avance
    dateFin = new Date(annee, mois - 1, 1, 0, 0, 0)
  }

  // Récupérer les périodes de vacances qui impactent la facturation
  const periodesVacances = await prisma.periodeVacances.findMany({
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
  })

  // Récupérer les séances annulées du mois
  const seancesAnnulees = await prisma.seanceAnnulee.findMany({
    where: {
      date: {
        gte: dateDebut,
        lte: dateFin,
      },
    },
  })

  // 1. Calculer les heures du planning fixe
  const planningsFixe = await prisma.planning.findMany({
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
    },
  })

  let heuresPlanningFixe = 0
  const lignesPlanningFixe: FactureLigneCalculated[] = []
  const joursTravailles = new Set<number>()
  const joursMapRef: { [key: string]: number } = {
    'Dimanche': 0, 'Lundi': 1, 'Mardi': 2, 'Mercredi': 3,
    'Jeudi': 4, 'Vendredi': 5, 'Samedi': 6
  }

  const creneauxMap = new Map<string, {
    jourSemaine: string
    heureDebut: string
    heureFin: string
    groupes: string[]
    planningIds: string[]
    groupeIds: string[]
    tempsFacture?: number | null
    semaineImpaire?: boolean
    groupeDateDebut?: Date | null
    isBnssa?: boolean
  }>()

  for (const planning of planningsFixe) {
    const jourSemaine = planning.jourSemaine
    const key = `${jourSemaine}-${planning.heureDebut}-${planning.heureFin}-${planning.semaineImpaire ? 'impaire' : 'toutes'}`

    if (joursMapRef[jourSemaine] !== undefined) {
      joursTravailles.add(joursMapRef[jourSemaine])
    }

    const isBnssa = (planning.groupe?.nom || '').toLowerCase().includes('bnssa')

    if (!creneauxMap.has(key)) {
      creneauxMap.set(key, {
        jourSemaine,
        heureDebut: planning.heureDebut,
        heureFin: planning.heureFin,
        groupes: [],
        planningIds: [],
        groupeIds: [],
        tempsFacture: planning.groupe?.tempsFacture,
        semaineImpaire: planning.semaineImpaire,
        groupeDateDebut: planning.groupe?.dateDebut,
        isBnssa,
      })
    }
    creneauxMap.get(key)!.groupes.push(planning.groupe?.nom || 'Groupe')
    creneauxMap.get(key)!.planningIds.push(planning.id)
    if (planning.groupeId) {
      creneauxMap.get(key)!.groupeIds.push(planning.groupeId)
    }
    if (planning.groupe?.dateDebut && !creneauxMap.get(key)!.groupeDateDebut) {
      creneauxMap.get(key)!.groupeDateDebut = planning.groupe.dateDebut
    }
  }

  for (const [, creneau] of creneauxMap) {
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
      seancesAnnulees,
      coachId,
      creneau.planningIds,
      creneau.groupeIds,
      creneau.semaineImpaire
    )
    const occurences = dates.length

    if (occurences > 0) {
      const dureeReelle = calculerDuree(creneau.heureDebut, creneau.heureFin)
      const dureeHeures = arrondirDemiHeureSuperieure(dureeReelle)
      const totalHrs = dureeHeures * occurences
      heuresPlanningFixe += totalHrs
      const groupesStr = creneau.groupes.join(', ')
      const datesStr = dates.map((d) => d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })).join(', ')

      lignesPlanningFixe.push({
        type: 'planning_fixe',
        description: `${creneau.jourSemaine} ${creneau.heureDebut}-${creneau.heureFin} - ${groupesStr} (${datesStr})`,
        heures: totalHrs,
        montant: totalHrs * tauxHoraire,
      })
    }
  }

  // 1.b Heures administratives automatiques pour le coach (si activées)
  const coachInfo = await prisma.coach.findUnique({
    where: { id: coachId },
    select: { heuresAdminHebdo: true },
  })

  if (coachInfo?.heuresAdminHebdo && coachInfo.heuresAdminHebdo > 0) {
    let adminDateDebut = new Date(dateDebut)
    if (dateDebutSaison && adminDateDebut < dateDebutSaison) {
      if (dateFin >= dateDebutSaison) {
        adminDateDebut = new Date(dateDebutSaison)
      } else {
        // Mois entièrement antérieur à la rentrée
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
      })
    }
  }

  const manualRempIds = (factureExistante?.lignes?.map(l => l.remplacementId).filter(Boolean) as string[]) || []

  // 2. Remplacements et Absences (pour tout le mois concerné)
  const [remplacementsEffectues, remplacementsRecus] = await Promise.all([
    prisma.remplacement.findMany({
      where: {
        coachRemplacantId: coachId,
        actif: true,
        date: { gte: dateDebut, lte: dateFinMois },
        ...(manualRempIds.length > 0 && {
          id: { notIn: manualRempIds }
        })
      },
      include: {
        coachRemplace: { select: { prenom: true, nom: true } },
      },
    }),
    prisma.remplacement.findMany({
      where: {
        coachRemplaceId: coachId,
        actif: true,
        date: { gte: dateDebut, lte: dateFinMois },
        ...(manualRempIds.length > 0 && {
          id: { notIn: manualRempIds }
        })
      },
      include: {
        coachRemplacant: { select: { prenom: true, nom: true } },
      },
    }),
  ])

  let heuresRemplacements = 0
  const lignesRemplacements: FactureLigneCalculated[] = []
  for (const remp of remplacementsEffectues) {
    const dureeHeures = arrondirDemiHeureSuperieure(calculerDuree(remp.heureDebut, remp.heureFin))
    heuresRemplacements += dureeHeures
    const dateStr = new Date(remp.date).toLocaleDateString('fr-FR')
    const coachNom = `${remp.coachRemplace.prenom} ${remp.coachRemplace.nom || ''}`.trim()
    lignesRemplacements.push({
      type: 'remplacement',
      description: `Remplacement de ${coachNom} - ${dateStr} ${remp.heureDebut}-${remp.heureFin}${remp.motif ? ` (${remp.motif})` : ''}`,
      heures: dureeHeures,
      montant: dureeHeures * tauxHoraire,
      date: remp.date,
    })
  }

  let heuresAbsences = 0
  const lignesAbsences: FactureLigneCalculated[] = []
  for (const remp of remplacementsRecus) {
    const dateAbsence = new Date(remp.date)
    const estPendantVacances = periodesVacances.some((p) => {
      const debut = new Date(p.dateDebut)
      const fin = new Date(p.dateFin)
      return dateAbsence >= debut && dateAbsence <= fin
    })

    if (estPendantVacances) {
      continue
    }

    const dureeHeures = arrondirDemiHeureSuperieure(calculerDuree(remp.heureDebut, remp.heureFin))
    heuresAbsences += dureeHeures
    const dateStr = new Date(remp.date).toLocaleDateString('fr-FR')
    const coachNom = remp.coachRemplacant ? `${remp.coachRemplacant.prenom} ${remp.coachRemplacant.nom || ''}`.trim() : null
    const description = coachNom
      ? `Absence (Remplacé(e) par ${coachNom}) - ${dateStr} ${remp.heureDebut}-${remp.heureFin}${remp.motif ? ` (${remp.motif})` : ''}`
      : `Absence sans remplacement - ${dateStr} ${remp.heureDebut}-${remp.heureFin}${remp.motif ? ` (${remp.motif})` : ''}`

    lignesAbsences.push({
      type: 'absence',
      description,
      heures: -dureeHeures,
      montant: -dureeHeures * tauxHoraire,
      date: remp.date,
    })
  }

  // 3. Planning tournant
  const evenementsTournants = await prisma.evenementTournant.findMany({
    where: {
      coachId,
      actif: true,
      date: { gte: dateDebut, lte: dateFinMois },
    },
  })

  let heuresPlanningTournant = 0
  const lignesPlanningTournant: FactureLigneCalculated[] = []
  for (const evt of evenementsTournants) {
    const dateEvt = new Date(evt.date)
    const estEnVacances = periodesVacances.some((periode) => {
      const debut = new Date(periode.dateDebut)
      const fin = new Date(periode.dateFin)
      return dateEvt >= debut && dateEvt <= fin
    })

    if (!estEnVacances) {
      const dureeHeures = arrondirDemiHeureSuperieure(calculerDuree(evt.heureDebut, evt.heureFin))
      heuresPlanningTournant += dureeHeures
      const dateStr = new Date(evt.date).toLocaleDateString('fr-FR')
      lignesPlanningTournant.push({
        type: 'planning_tournant',
        description: `${evt.titre} - ${dateStr} ${evt.heureDebut}-${evt.heureFin}`,
        heures: dureeHeures,
        montant: dureeHeures * tauxHoraire,
        date: evt.date,
      })
    }
  }

  // 4. Lignes manuelles
  let lignesManuelles: FactureLigneCalculated[] = []
  const factureBrouillon = await prisma.factureCoach.findUnique({
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
  })

  if (factureBrouillon) {
    lignesManuelles = factureBrouillon.lignes
      .filter((l) => ['remplacement', 'competition', 'forfait_regional', 'forfait_transport', 'absence', 'manuel'].includes(l.type))
      .map((l) => ({
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
      }))
  }


  // Totaux
  const totalHeures = heuresPlanningFixe + heuresPlanningTournant + heuresRemplacements - heuresAbsences +
    lignesManuelles.reduce((sum, l) => sum + (l.type === 'remplacement' || l.type === 'absence' ? l.heures : 0), 0)

  const calculatedTotalMontant =
    lignesPlanningFixe.reduce((sum, l) => sum + l.montant, 0) +
    lignesPlanningTournant.reduce((sum, l) => sum + l.montant, 0) +
    lignesRemplacements.reduce((sum, l) => sum + l.montant, 0) +
    lignesAbsences.reduce((sum, l) => sum + l.montant, 0) +
    lignesManuelles.reduce((sum, l) => sum + l.montant, 0)

  // Si une facture est envoyée ou payée avec un montantTotal enregistré, le conserver
  const isLocked = isPayee || isEnvoyee
  const totalMontant = isLocked && (factureExistante?.montantTotal ?? 0) > 0
    ? factureExistante!.montantTotal
    : calculatedTotalMontant

  let message: string | undefined = undefined
  if (isPayee) {
    message = 'Votre facture de ce mois a été payée et archivée.'
  } else if (isEnvoyee) {
    message = 'Cette facture a été transmise au club. Elle est désormais verrouillée et ne peut plus être modifiée.'
  }

  return {
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
  seancesAnnulees: any[] = [],
  coachId?: string,
  planningIds: string[] = [],
  groupeIds: string[] = [],
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

      // 1. Vérifier si cette date tombe pendant une période de vacances
      const estEnVacances = periodesVacances.some((periode) => {
        const debut = new Date(periode.dateDebut)
        const fin = new Date(periode.dateFin)
        return current >= debut && current <= fin
      })

      if (!estEnVacances) {
        // 2. Vérifier si cette séance spécifique est annulée
        const estAnnulee = seancesAnnulees.some((sa) => {
          const saDate = new Date(sa.date)
          const matchDate = current.getFullYear() === saDate.getFullYear() &&
                            current.getMonth() === saDate.getMonth() &&
                            current.getDate() === saDate.getDate()

          if (!matchDate) return false

          // Si pas de restriction, c'est une annulation générale
          if (!sa.planningId && !sa.groupeId && !sa.coachId) return true

          // Si spécifié pour ce coach
          if (sa.coachId && sa.coachId === coachId) return true

          // Si spécifié pour un de nos plannings
          if (sa.planningId && planningIds.includes(sa.planningId)) return true

          // Si spécifié pour un de nos groupes
          if (sa.groupeId && groupeIds.includes(sa.groupeId)) return true

          return false
        })

        if (!estAnnulee) {
          dates.push(new Date(current))
        }
      }
    }
    current.setDate(current.getDate() + 1)
  }

  return dates
}

export function calculerDuree(heureDebut: string, heureFin: string): number {
  const [hD, mD] = heureDebut.split(':').map(Number)
  const [hF, mF] = heureFin.split(':').map(Number)
  return (hF * 60 + mF - (hD * 60 + mD)) / 60
}

export function arrondirDemiHeureSuperieure(dureeHeures: number): number {
  return Math.ceil(dureeHeures * 2) / 2
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
