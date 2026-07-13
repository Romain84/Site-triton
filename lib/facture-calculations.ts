import { prisma } from '@/lib/prisma'

export interface FactureLigneCalculated {
  type: 'planning_fixe' | 'planning_tournant' | 'remplacement' | 'absence' | 'competition' | 'forfait_regional'
  description: string
  heures: number
  montant: number
  date?: Date
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

export async function calculerFactureCoach(coachId: string, mois: number, annee: number): Promise<FactureCoachDetails> {
  // Récupérer les paramètres (taux horaire)
  const settings = await prisma.settings.findFirst()
  const tauxHoraire = settings?.tauxHoraire || 35
  const forfaitDemiJournee = settings?.forfaitCompetition || 150
  const forfaitRegionalActif = settings?.forfaitRegionalActif || false
  const montantForfaitRegional = settings?.montantForfaitRegional || 50

  // Vérifier si la facture existe déjà et est payée
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

  if (factureExistante && factureExistante.statut === 'payee') {
    const lignesManuelles = factureExistante.lignes
      .filter((l) => ['remplacement', 'competition', 'forfait_regional', 'absence'].includes(l.type))
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
      }))

    const totalHeures = lignesManuelles.reduce((sum, l) => sum + (l.type === 'remplacement' || l.type === 'absence' ? l.heures : 0), 0)
    const totalMontant = lignesManuelles.reduce((sum, l) => sum + l.montant, 0)

    return {
      mois,
      annee,
      tauxHoraire,
      forfaitDemiJournee,
      forfaitRegionalActif,
      montantForfaitRegional,
      lignesPlanningFixe: [],
      lignesPlanningTournant: [],
      lignesRemplacements: [],
      lignesAbsences: [],
      lignesManuelles,
      totalHeures,
      totalMontant,
      joursTravailles: [],
      factureId: factureExistante.id,
      isBlocked: true,
      statut: 'payee',
      message: 'Votre facture de ce mois a été payée et archivée. L’affichage des créneaux automatiques est suspendu pour ce mois-ci, mais vous pouvez toujours consulter ou effectuer des ajouts manuels.',
    }
  }

  // Calculer les dates de début et fin du mois
  const now = new Date()
  const dateDebut = new Date(annee, mois - 1, 1)
  let dateFin = new Date(annee, mois, 0, 23, 59, 59)

  // Si on calcule pour le mois et l'année en cours, on limite au jour actuel
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
  }>()

  for (const planning of planningsFixe) {
    const jourSemaine = planning.jourSemaine
    const key = `${jourSemaine}-${planning.heureDebut}-${planning.heureFin}`

    if (joursMapRef[jourSemaine] !== undefined) {
      joursTravailles.add(joursMapRef[jourSemaine])
    }

    if (!creneauxMap.has(key)) {
      creneauxMap.set(key, {
        jourSemaine,
        heureDebut: planning.heureDebut,
        heureFin: planning.heureFin,
        groupes: [],
        planningIds: [],
        groupeIds: [],
      })
    }
    creneauxMap.get(key)!.groupes.push(planning.groupe?.nom || 'Groupe')
    creneauxMap.get(key)!.planningIds.push(planning.id)
    if (planning.groupeId) {
      creneauxMap.get(key)!.groupeIds.push(planning.groupeId)
    }
  }

  for (const [, creneau] of creneauxMap) {
    const dates = obtenirDatesJour(
      creneau.jourSemaine,
      dateDebut,
      dateFin,
      periodesVacances,
      seancesAnnulees,
      coachId,
      creneau.planningIds,
      creneau.groupeIds
    )
    const occurences = dates.length

    if (occurences > 0) {
      const dureeHeures = calculerDuree(creneau.heureDebut, creneau.heureFin)
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

  const manualRempIds = (factureExistante?.lignes?.map(l => l.remplacementId).filter(Boolean) as string[]) || []

  // 2. Remplacements et Absences
  const [remplacementsEffectues, remplacementsRecus] = await Promise.all([
    prisma.remplacement.findMany({
      where: {
        coachRemplacantId: coachId,
        actif: true,
        date: { gte: dateDebut, lte: dateFin },
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
        date: { gte: dateDebut, lte: dateFin },
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
    const dureeHeures = calculerDuree(remp.heureDebut, remp.heureFin)
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

    const dureeHeures = calculerDuree(remp.heureDebut, remp.heureFin)
    heuresAbsences += dureeHeures
    const dateStr = new Date(remp.date).toLocaleDateString('fr-FR')
    const coachNom = `${remp.coachRemplacant.prenom} ${remp.coachRemplacant.nom || ''}`.trim()
    lignesAbsences.push({
      type: 'absence',
      description: `Absent(e) - remplacé(e) par ${coachNom} - ${dateStr} ${remp.heureDebut}-${remp.heureFin}${remp.motif ? ` (${remp.motif})` : ''}`,
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
      date: { gte: dateDebut, lte: dateFin },
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
      const dureeHeures = calculerDuree(evt.heureDebut, evt.heureFin)
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
      .filter((l) => ['remplacement', 'competition', 'forfait_regional', 'absence'].includes(l.type))
      .map((l) => ({
        id: l.id,
        type: l.type as any,
        description: l.description,
        heures: l.heures ?? 0,
        montant: l.montant,
        date: l.date,
      }))
  }


  // Totaux
  const totalHeures = heuresPlanningFixe + heuresPlanningTournant + heuresRemplacements - heuresAbsences +
    lignesManuelles.reduce((sum, l) => sum + (l.type === 'remplacement' || l.type === 'absence' ? l.heures : 0), 0)

  const totalMontant =
    lignesPlanningFixe.reduce((sum, l) => sum + l.montant, 0) +
    lignesPlanningTournant.reduce((sum, l) => sum + l.montant, 0) +
    lignesRemplacements.reduce((sum, l) => sum + l.montant, 0) +
    lignesAbsences.reduce((sum, l) => sum + l.montant, 0) +
    lignesManuelles.reduce((sum, l) => sum + l.montant, 0)

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
    factureId: factureBrouillon?.id,
  }
}

// Helpers
function obtenirDatesJour(
  jourSemaine: string,
  dateDebut: Date,
  dateFin: Date,
  periodesVacances: Array<{ dateDebut: Date; dateFin: Date }> = [],
  seancesAnnulees: any[] = [],
  coachId?: string,
  planningIds: string[] = [],
  groupeIds: string[] = []
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

function calculerDuree(heureDebut: string, heureFin: string): number {
  const [hD, mD] = heureDebut.split(':').map(Number)
  const [hF, mF] = heureFin.split(':').map(Number)
  return (hF * 60 + mF - (hD * 60 + mD)) / 60
}
