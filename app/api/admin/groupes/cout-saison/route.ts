import { NextRequest, NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/auth/session'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'

// ─── Validation entrée ────────────────────────────────────────────────────────

interface CoutSaisonRequest {
  dateDebut: string
  dateFin: string
  mode?: 'simple' | 'optimise'
  includeComparaison?: boolean
  tauxChargesOverride?: number
  margeSecurite?: number
  coutFormationsPSE1?: number
  nbFormationsBNSSA?: number
}

// ─── Types de sortie ──────────────────────────────────────────────────────────

interface AlerteGroupe {
  type: 'danger' | 'warning' | 'info'
  code: string
  message: string
}

interface ProjectionRemplissage {
  tauxActuel: number
  beneficeActuel: number
  projection75: number
  projection90: number
  projection100: number
  inscritsSeuil: number
}

interface GroupeCout {
  groupeId: string
  groupeNom: string
  niveau: string | null
  isCompetition: boolean
  placesTotal: number
  inscrits: number
  inscrits1Cours: number
  inscrits2Cours: number
  inscritsEquivalents: number
  tarifAnnuel: number
  tarif1Cours: number
  tarifConseille: number
  libelleOption1: string | null
  libelleOption2: string | null
  prixLicence: number
  heuresParSemaine: number
  nbSemaines: number
  totalHeures: number
  coutCoaching: number
  coutFormationsPSE1: number
  heuresAnnuleesDeduites: number
  nbCompetitions: number
  coutCompetitions: number
  coutLicences: number
  coutMargeSecurite: number
  coutTotal: number
  coutParInscrit: number
  coutParHeure: number
  revenuActuel: number
  revenuPotentiel: number
  beneficeActuel: number
  beneficePotentiel: number
  margeActuelle: number
  seuilRentabilite: number
  tauxRemplissage: number
  alertes: AlerteGroupe[]
  projection: ProjectionRemplissage
  membresBureau: number
  enfantsBureau: number
  // Dates utilisées pour ce groupe (globales ou spécifiques)
  dateDebutUtilisee: string
  dateFinUtilisee: string
  sourceDate: 'global' | 'groupe'
  plannings: Array<{
    jour: string
    heureDebut: string
    heureFin: string
    duree: number
    coach?: string
    nbCoachsFactures: number
    nbGroupesSimultanes: number
  }>
}

interface CoachCout {
  coachId: string
  coachNom: string
  heuresParSemaine: number
  totalHeures: number
  coutTotal: number
  groupes: string[]
}

interface ComparaisonModes {
  coutSimple: number
  coutOptimise: number
  economie: number
  economiePercent: number
  heuresDedupliquees: number
}

// ─── Route principale ─────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const session = await getAdminSession()
    if (!session) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const body: CoutSaisonRequest = await request.json()
    const {
      dateDebut: dateDebutStr,
      dateFin: dateFinStr,
      mode = 'simple',
      includeComparaison = false,
      tauxChargesOverride,
      margeSecurite = 0,
    } = body

    // Les dates globales sont optionnelles si chaque groupe a les siennes
    const hasDateGlobale = !!(dateDebutStr && dateFinStr)

    if (hasDateGlobale) {
      const dD = new Date(dateDebutStr)
      const dF = new Date(dateFinStr)
      if (isNaN(dD.getTime()) || isNaN(dF.getTime())) {
        return NextResponse.json({ error: 'Format de date invalide (ISO 8601 attendu)' }, { status: 400 })
      }
      if (dD >= dF) {
        return NextResponse.json(
          { error: 'La date de début doit être avant la date de fin' },
          { status: 400 }
        )
      }
    }

    // ── Récupérer en premier lieu les groupes actifs pour calculer les bornes temporelles ──
    const groupes = await prisma.groupe.findMany({
      where: { actif: true },
      orderBy: { ordre: 'asc' },
    })

    // Déterminer la plage de dates min/max pour optimiser les requêtes annexes
    let minDate: Date | null = null
    let maxDate: Date | null = null

    if (hasDateGlobale) {
      minDate = new Date(dateDebutStr)
      maxDate = new Date(dateFinStr)
    } else {
      const datesGroupes = groupes
        .filter((g) => g.dateDebut && g.dateFin)
        .map((g) => ({ debut: new Date(g.dateDebut!), fin: new Date(g.dateFin!) }))
      if (datesGroupes.length > 0) {
        minDate = new Date(Math.min(...datesGroupes.map((d) => d.debut.getTime())))
        maxDate = new Date(Math.max(...datesGroupes.map((d) => d.fin.getTime())))
      }
    }

    // ── Paramètres globaux ─────────────────────────────────────────────────────
    const settings = await prisma.settings.findFirst()
    const tauxHoraire = tauxChargesOverride ?? settings?.tauxHoraire ?? 35
    const forfaitCompetition = settings?.forfaitCompetition ?? 150
    const nbDemiJourneesParCompetition = settings?.nbDemiJourneesParCompetition ?? 2
    const nbCompetitionsDefaut = settings?.nbCompetitionsAnnee ?? 20
    const reductionEnfantBureau = settings?.reductionEnfantBureau ?? 50

    // ── Vacances & Séances annulées (requêtes ciblées et performantes) ────────
    const [toutesPeriodesVacances, plannings, seancesAnnulees] = await Promise.all([
      prisma.periodeVacances.findMany({
        where: {
          actif: true,
          impacteFacturation: true,
          ...(minDate && maxDate ? {
            OR: [
              { dateDebut: { gte: minDate, lte: maxDate } },
              { dateFin: { gte: minDate, lte: maxDate } },
              { AND: [ { dateDebut: { lte: minDate } }, { dateFin: { gte: maxDate } } ] }
            ]
          } : {})
        },
      }),
      prisma.planning.findMany({
        where: { actif: true },
        include: {
          coachs: {
            include: {
              coach: { select: { id: true, prenom: true, nom: true } },
            },
          },
          groupe: { select: { id: true, nom: true, niveau: true } },
        },
      }),
      minDate && maxDate
        ? prisma.seanceAnnulee.findMany({
            where: {
              date: {
                gte: minDate,
                lte: maxDate,
              },
            },
          })
        : []
    ])

    // Helper : filtrer les vacances pour une période donnée
    function vacancesPourPeriode(
      dateDebut: Date,
      dateFin: Date
    ) {
      return toutesPeriodesVacances.filter((p) => {
        const debut = p.dateDebut
        const fin = p.dateFin
        return (
          (debut >= dateDebut && debut <= dateFin) ||
          (fin >= dateDebut && fin <= dateFin) ||
          (debut <= dateDebut && fin >= dateFin)
        )
      })
    }

    // ── Déduplication multi-lignes pour un même groupe et même horaire ───────
    function dedupliquerPlanningsMultiLignes(rawList: typeof plannings) {
      const map = new Map<string, (typeof plannings)[0]>()
      for (const p of rawList) {
        const key = `${p.groupeId}|${p.jourSemaine}|${p.heureDebut}|${p.heureFin}|${p.semaineImpaire}`
        if (!map.has(key)) {
          map.set(key, {
            ...p,
            coachs: [...p.coachs],
          })
        } else {
          const existing = map.get(key)!
          for (const c of p.coachs) {
            if (!existing.coachs.some((ec) => ec.coachId === c.coachId)) {
              existing.coachs.push(c)
            }
          }
        }
      }
      return Array.from(map.values())
    }

    const planningsActifs = dedupliquerPlanningsMultiLignes(plannings)

    // ── Helper: Calculer la présence physique hebdomadaire d'un coach (heures réelles sur le bassin)
    function calculerPresenceHebdoCoach(coachId: string, list: typeof planningsActifs): number {
      const coachPlannings = list.filter((p) => p.coachs.some((c) => c.coachId === coachId))
      const parJour = new Map<string, typeof coachPlannings>()
      for (const p of coachPlannings) {
        const slots = parJour.get(p.jourSemaine) ?? []
        slots.push(p)
        parJour.set(p.jourSemaine, slots)
      }

      let totalHebdo = 0
      for (const [, slots] of parJour.entries()) {
        let minM = Infinity
        let maxM = -Infinity
        const intervals = slots.map((p) => {
          const start = parseTimeToMinutes(p.heureDebut)
          const end = parseTimeToMinutes(p.heureFin)
          minM = Math.min(minM, start)
          maxM = Math.max(maxM, end)
          const dureeFacturee = getPlanningDuree(p)
          return { start, end, dureeFacturee }
        })

        if (minM >= maxM) continue
        let mins = 0
        for (let m = minM; m < maxM; m++) {
          if (intervals.some((inv) => m >= inv.start && m < inv.end)) {
            mins++
          }
        }
        const dureeReelle = mins / 60
        const dureeFacturee = intervals.reduce((max, inv) => Math.max(max, inv.dureeFacturee), dureeReelle)
        totalHebdo += Math.max(dureeReelle, dureeFacturee)
      }

      return totalHebdo
    }

    // ── Date par défaut de la saison si aucune date n'est fournie ─────────────
    const now = new Date()
    const currentYear = now.getFullYear()
    const currentMonth = now.getMonth() // 0-indexed: 0 = Jan, 8 = Sept
    const defaultAnneeDebut = currentMonth >= 8 ? currentYear : currentYear - 1
    const dateDebutDefautSaison = new Date(defaultAnneeDebut, 8, 1) // 1er Septembre
    const dateFinDefautSaison = new Date(defaultAnneeDebut + 1, 5, 30) // 30 Juin

    // Nombre de semaines globales (si dates globales fournies ou saison standard)
    const dateDebutGlobale = hasDateGlobale ? new Date(dateDebutStr) : dateDebutDefautSaison
    const dateFinGlobale = hasDateGlobale ? new Date(dateFinStr) : dateFinDefautSaison
    const nbSemainesTotalesGlobal = calculerNombreSemaines(
      dateDebutGlobale,
      dateFinGlobale,
      vacancesPourPeriode(dateDebutGlobale, dateFinGlobale)
    )

    // ── BUG FIX: 'adultes' retiré des niveaux compétition ─────────────────────
    const niveauxCompetition = ['competition', 'compétition', 'benjamins', 'juniors']

    type PlanningDetail = {
      planningId: string
      jour: string
      heureDebut: string
      heureFin: string
      duree: number
      nbCoachsFacturesSimple: number
      nbCoachsFacturesOptimise: number
      nbGroupesSimultanes: number
      coachLabel?: string
      coachIds: string[]
    }

    const planningsParGroupe = new Map<string, PlanningDetail[]>()
    const coachSlotMap = new Map<string, number>()
    for (const p of planningsActifs) {
      const pExcluded = isPPGouPetitBassin(p)
      for (const c of p.coachs) {
        const key = `${c.coachId}|${p.jourSemaine}|${p.heureDebut}|${p.heureFin}`
        const count = pExcluded
          ? 1
          : planningsActifs.filter(op =>
              op.jourSemaine === p.jourSemaine &&
              !isPPGouPetitBassin(op) &&
              op.coachs.some(oc => oc.coachId === c.coachId) &&
              parseTimeToMinutes(op.heureDebut) < parseTimeToMinutes(p.heureFin) &&
              parseTimeToMinutes(op.heureFin) > parseTimeToMinutes(p.heureDebut)
            ).length
        coachSlotMap.set(key, Math.max(1, count))
      }
    }
    const coachStats = new Map<string, {
      prenom: string; nom: string
      heuresSimple: number; heuresOptimise: number
      groupeIds: Set<string>
    }>()

    let totalHeuresHebdoSimple = 0
    let totalHeuresHebdoOptimise = 0

    // Indexation par minute des créneaux de chaque coach pour dédupliquer précisément les intersections
    for (const planning of planningsActifs) {
      if (!planning.groupeId) continue

      const duree = getPlanningDuree(planning)
      if (duree === 0) continue

      const coachIds = planning.coachs.map((c) => c.coachId)
      const nbCoachsFacturesSimple = Math.max(1, coachIds.length)

      let nbCoachsFacturesOptimise = 1

      if (coachIds.length > 0) {
        const totalHeuresEffectivesOptimise = coachIds.reduce((sum, coachId) => {
          const effHrs = calculerHeuresEffectivesCoach(
            coachId,
            planning,
            planningsActifs
          )
          return sum + effHrs
        }, 0)
        nbCoachsFacturesOptimise = totalHeuresEffectivesOptimise / duree
      }

      // Nombre de groupes partageant simultanément le bassin au même horaire
      const nbGroupesSimultanes = Math.max(1, planningsActifs.filter(op =>
        op.jourSemaine === planning.jourSemaine &&
        parseTimeToMinutes(op.heureDebut) < parseTimeToMinutes(planning.heureFin) &&
        parseTimeToMinutes(op.heureFin) > parseTimeToMinutes(planning.heureDebut)
      ).length)

      totalHeuresHebdoSimple += duree * nbCoachsFacturesSimple
      totalHeuresHebdoOptimise += duree * nbCoachsFacturesOptimise

      const coachLabel = planning.coachs.length > 0
        ? planning.coachs.map((c) => `${c.coach.prenom} ${c.coach.nom ?? ''}`.trim()).join(', ')
        : undefined

      const detail: PlanningDetail = {
        planningId: planning.id,
        jour: planning.jourSemaine,
        heureDebut: planning.heureDebut,
        heureFin: planning.heureFin,
        duree,
        nbCoachsFacturesSimple,
        nbCoachsFacturesOptimise,
        nbGroupesSimultanes,
        coachLabel,
        coachIds,
      }

      const liste = planningsParGroupe.get(planning.groupeId) ?? []
      liste.push(detail)
      planningsParGroupe.set(planning.groupeId, liste)

      for (const { coachId, coach } of planning.coachs) {
        const stat = coachStats.get(coachId) ?? {
          prenom: coach.prenom,
          nom: coach.nom ?? '',
          heuresSimple: 0,
          heuresOptimise: 0,
          groupeIds: new Set(),
        }
        stat.heuresSimple += duree
        stat.heuresOptimise += calculerHeuresEffectivesCoach(
          coachId,
          planning,
          planningsActifs
        )
        if (planning.groupeId) stat.groupeIds.add(planning.groupeId)
        coachStats.set(coachId, stat)
      }
    }

    // ── Calcul par groupe (factorisé pour la comparaison) ─────────────────────
    function calculerPourMode(modeCalc: 'simple' | 'optimise'): GroupeCout[] {
      const res: GroupeCout[] = []

      for (const groupe of groupes) {
        let dateDebutGroupe: Date | null = null
        let dateFinGroupe: Date | null = null
        let sourceDate: 'global' | 'groupe' = 'global'

        if (hasDateGlobale) {
          dateDebutGroupe = dateDebutGlobale
          dateFinGroupe = dateFinGlobale
          sourceDate = 'global'
        } else if (groupe.dateDebut && groupe.dateFin) {
          dateDebutGroupe = new Date(groupe.dateDebut)
          dateFinGroupe = new Date(groupe.dateFin)
          sourceDate = 'groupe'
        } else {
          dateDebutGroupe = dateDebutDefautSaison
          dateFinGroupe = dateFinDefautSaison
          sourceDate = 'global'
        }

        // Groupe sans aucune date → on le saute avec une alerte
        if (!dateDebutGroupe || !dateFinGroupe) {
          res.push({
            groupeId: groupe.id,
            groupeNom: groupe.nom,
            niveau: groupe.niveau,
            isCompetition: false,
            placesTotal: groupe.total,
            inscrits: groupe.inscrits,
            inscrits1Cours: groupe.inscrits1Cours ?? 0,
            inscrits2Cours: Math.max(0, groupe.inscrits - (groupe.inscrits1Cours ?? 0)),
            inscritsEquivalents: Math.max(0, groupe.inscrits - (groupe.inscrits1Cours ?? 0) * 0.5),
            tarifAnnuel: groupe.tarif ?? 0,
            tarif1Cours: groupe.tarif1Cours ?? 0,
            tarifConseille: 0,
            libelleOption1: groupe.libelleOption1,
            libelleOption2: groupe.libelleOption2,
            prixLicence: groupe.prixLicence ?? 0,
            heuresParSemaine: 0,
            nbSemaines: 0,
            totalHeures: 0,
            coutCoaching: 0,
            coutFormationsPSE1: 0,
            heuresAnnuleesDeduites: 0,
            nbCompetitions: 0,
            coutCompetitions: 0,
            coutLicences: 0,
            coutMargeSecurite: 0,
            coutTotal: 0,
            coutParInscrit: 0,
            coutParHeure: 0,
            revenuActuel: 0,
            revenuPotentiel: 0,
            beneficeActuel: 0,
            beneficePotentiel: 0,
            margeActuelle: 0,
            seuilRentabilite: 0,
            tauxRemplissage: groupe.total > 0 ? (groupe.inscrits / groupe.total) * 100 : 0,
            alertes: [{
              type: 'info',
              code: 'SANS_DATE',
              message: 'Aucune date de saison définie — groupe exclu du calcul',
            }],
            projection: { tauxActuel: 0, beneficeActuel: 0, projection75: 0, projection90: 0, projection100: 0, inscritsSeuil: 0 },
            membresBureau: groupe.membresBureau ?? 0,
            enfantsBureau: groupe.enfantsBureau ?? 0,
            dateDebutUtilisee: '',
            dateFinUtilisee: '',
            sourceDate: 'groupe',
            plannings: [],
          })
          continue
        }

        // Nombre de semaines spécifique à ce groupe
        const vacancesGroupe = vacancesPourPeriode(dateDebutGroupe, dateFinGroupe)
        const nbSemainesGroupe = calculerNombreSemaines(dateDebutGroupe, dateFinGroupe, vacancesGroupe)

        // ── Calcul standard ───────────────────────────────────────────────────
        const nomLow = groupe.nom.toLowerCase();
        const niveauLow = (groupe.niveau || '').toLowerCase();
        
        let isCompetition = groupe.isCompetition;
        if (nomLow.includes('loisir') || niveauLow.includes('loisir') || nomLow.includes('ppg')) {
          isCompetition = false;
        } else if (!isCompetition) {
          isCompetition = 
            nomLow.includes('compétition') || 
            nomLow.includes('competition') || 
            niveauLow.includes('compet') || 
            niveauLow.includes('compét');
        }

        const nbCompetitionsGroupe = groupe.nbCompetitions ?? nbCompetitionsDefaut
        const prixLicence = groupe.prixLicence ?? 0
        const planningsGroupe = planningsParGroupe.get(groupe.id) ?? []

        const heuresParSemaine = planningsGroupe.reduce(
          (sum, p) =>
            sum +
            p.duree *
              (modeCalc === 'optimise'
                ? p.nbCoachsFacturesOptimise
                : p.nbCoachsFacturesSimple),
          0
        )

        // Filtrer les séances annulées dans la période de calcul de ce groupe
        const seancesAnnuleesDuGroupe = seancesAnnulees.filter((sa) => {
          const saDate = new Date(sa.date)
          return saDate >= dateDebutGroupe! && saDate <= dateFinGroupe!
        })

        let heuresDeduites = 0
        const joursMapRefs: { [key: number]: string } = {
          0: 'Dimanche', 1: 'Lundi', 2: 'Mardi', 3: 'Mercredi',
          4: 'Jeudi', 5: 'Vendredi', 6: 'Samedi'
        }

        for (const sa of seancesAnnuleesDuGroupe) {
          const saDate = new Date(sa.date)
          const jourSemaine = joursMapRefs[saDate.getDay()]

          // Trouver les plannings du groupe pour ce jour de la semaine
          const planningsDuJour = planningsGroupe.filter((p) => p.jour === jourSemaine)

          for (const p of planningsDuJour) {
            // Vérifier si l'annulation s'applique à ce planning
            let sApplique = false

            if (!sa.planningId && !sa.groupeId && !sa.coachId) {
              sApplique = true // Annulation générale
            } else if (sa.groupeId === groupe.id) {
              sApplique = true // Annulation ciblée sur ce groupe
            } else if (sa.planningId && sa.planningId === p.planningId) {
              sApplique = true // Annulation ciblée sur ce créneau spécifique
            } else if (sa.coachId && p.coachIds.includes(sa.coachId)) {
              sApplique = true // Annulation ciblée sur un coach du créneau
            }

            if (sApplique) {
              if (sa.coachId) {
                // Déduire uniquement la quote-part du coach concerné
                if (modeCalc === 'optimise') {
                  const key = `${sa.coachId}|${p.jour}|${p.heureDebut}|${p.heureFin}`
                  const occ = coachSlotMap.get(key) ?? 1
                  heuresDeduites += p.duree * (1 / Math.max(1, occ))
                } else {
                  heuresDeduites += p.duree
                }
              } else {
                // Déduire la totalité du créneau (tous les coachs)
                heuresDeduites += p.duree * (modeCalc === 'optimise' ? p.nbCoachsFacturesOptimise : p.nbCoachsFacturesSimple)
              }
            }
          }
        }

        const totalHeures = Math.max(0, heuresParSemaine * nbSemainesGroupe - heuresDeduites)
        const coutCoaching = totalHeures * tauxHoraire

        const nbCoachsEffectifPhysique =
          planningsGroupe.length > 0
            ? planningsGroupe.reduce(
                (sum, p) => sum + p.nbCoachsFacturesSimple,
                0
              ) / planningsGroupe.length
            : 1

        const nbCoachsCompetition = Math.max(1, Math.ceil(nbCoachsEffectifPhysique))
        const coutCompetitions = isCompetition
          ? nbCompetitionsGroupe * nbDemiJourneesParCompetition * forfaitCompetition * nbCoachsCompetition
          : 0

        const coutLicences = prixLicence * groupe.inscrits

        // Coût des formations & recyclages PSE1/2 (Croix Blanche) appliqué aux groupes BNSSA / SSA
        const isBNSSA = nomLow.includes('bnssa') || niveauLow.includes('bnssa') || nomLow.includes('ssa') || niveauLow.includes('ssa')
        const coutUnitairePSE1 = groupe.prixFormationPSE ?? body.coutFormationsPSE1 ?? 150
        const nbFormations = body.nbFormationsBNSSA !== undefined ? Math.max(0, body.nbFormationsBNSSA) : groupe.inscrits
        const coutFormationsPSE1 = isBNSSA ? Math.round(nbFormations * coutUnitairePSE1) : 0

        const baseCout = coutCoaching + coutCompetitions + coutFormationsPSE1
        const coutMargeSecurite = (baseCout + coutLicences) * (margeSecurite / 100)
        const coutTotal = baseCout + coutLicences + coutMargeSecurite

        const coutParInscrit = groupe.inscrits > 0 ? coutTotal / groupe.inscrits : 0
        const coutParHeure = totalHeures > 0 ? coutTotal / totalHeures : 0

        const tarifAnnuel = (groupe.tarif ?? 0) + prixLicence
        const tarif1Cours = (groupe.tarif1Cours ?? 0) + (groupe.tarif1Cours ? prixLicence : 0)
        const inscrits1Cours = groupe.inscrits1Cours ?? 0
        const inscrits2Cours = Math.max(0, groupe.inscrits - inscrits1Cours)
        const inscritsEquivalents = inscrits2Cours + inscrits1Cours * 0.5

        const totalTarifInscrits = (inscrits2Cours * tarifAnnuel) + (inscrits1Cours * tarif1Cours)
        const tarifMoyen = groupe.inscrits > 0 ? totalTarifInscrits / groupe.inscrits : tarifAnnuel

        // Tarif conseillé par adhérent pour équilibrer 100% des coûts du groupe
        const effectifEquilibre = groupe.inscrits > 0 ? groupe.inscrits : Math.max(1, Math.ceil(groupe.total * 0.8))
        const tarifConseille = Math.ceil(coutTotal / effectifEquilibre)

        const membresBureau = groupe.membresBureau ?? 0
        const enfantsBureau = groupe.enfantsBureau ?? 0
        const inscritsPleintarif = Math.max(0, groupe.inscrits - membresBureau - enfantsBureau)
        const tarifEnfantBureau = tarifMoyen * (1 - reductionEnfantBureau / 100)

        // Revenu brut avant reversement Croix Blanche
        const revenuBrut = inscritsPleintarif * tarifMoyen + enfantsBureau * tarifEnfantBureau
        // Le montant PSE1/2 reversé à la Croix Blanche est déduit de l'adhésion nette du club
        const revenuActuel = Math.max(0, revenuBrut - coutFormationsPSE1)
        const revenuPotentiel = Math.max(0, (tarifMoyen * groupe.total) - (groupe.total * coutUnitairePSE1))
        const beneficeActuel = revenuActuel - coutTotal
        const beneficePotentiel = revenuPotentiel - coutTotal
        const margeActuelle = revenuActuel > 0 ? (beneficeActuel / revenuActuel) * 100 : -100

        // BUG FIX: seuil basé sur tarif effectif moyen
        const tarifEffectifMoyen =
          groupe.inscrits > 0 ? revenuActuel / groupe.inscrits : tarifMoyen
        const seuilRentabilite =
          tarifEffectifMoyen > 0 ? Math.ceil(coutTotal / tarifEffectifMoyen) : 0

        const tauxRemplissage =
          groupe.total > 0 ? (inscritsEquivalents / groupe.total) * 100 : 0

        const alertes: AlerteGroupe[] = genererAlertes({
          beneficeActuel,
          tauxRemplissage,
          seuilRentabilite,
          inscrits: groupe.inscrits,
          placesTotal: groupe.total,
          coutTotal,
          revenuActuel,
          heuresParSemaine,
          planningsGroupe,
          sourceDate,
          dateDebutGroupe,
          dateFinGroupe,
        })

        const projection = calculerProjection({
          tarifEffectifMoyen,
          coutTotal,
          inscrits: groupe.inscrits,
          placesTotal: groupe.total,
          beneficeActuel,
          tauxRemplissage,
          seuilRentabilite,
        })

        const planningsDetail = planningsGroupe.map((p) => ({
          jour: p.jour,
          heureDebut: p.heureDebut,
          heureFin: p.heureFin,
          duree: p.duree,
          coach: p.coachLabel,
          nbCoachsFactures:
            modeCalc === 'optimise'
              ? p.nbCoachsFacturesOptimise
              : p.nbCoachsFacturesSimple,
          nbGroupesSimultanes: p.nbGroupesSimultanes,
        }))

        res.push({
          groupeId: groupe.id,
          groupeNom: groupe.nom,
          niveau: groupe.niveau,
          isCompetition,
          placesTotal: groupe.total,
          inscrits: groupe.inscrits,
          inscrits1Cours,
          inscrits2Cours,
          inscritsEquivalents,
          tarifAnnuel,
          tarif1Cours,
          tarifConseille,
          libelleOption1: groupe.libelleOption1,
          libelleOption2: groupe.libelleOption2,
          prixLicence,
          heuresParSemaine,
          nbSemaines: nbSemainesGroupe,
          totalHeures,
          coutCoaching,
          coutFormationsPSE1,
          heuresAnnuleesDeduites: heuresDeduites,
          nbCompetitions: isCompetition ? nbCompetitionsGroupe : 0,
          coutCompetitions,
          coutLicences,
          coutMargeSecurite,
          coutTotal,
          coutParInscrit,
          coutParHeure,
          revenuActuel,
          revenuPotentiel,
          beneficeActuel,
          beneficePotentiel,
          margeActuelle,
          seuilRentabilite,
          tauxRemplissage,
          alertes,
          projection,
          membresBureau,
          enfantsBureau,
          dateDebutUtilisee: dateDebutGroupe.toISOString().split('T')[0],
          dateFinUtilisee: dateFinGroupe.toISOString().split('T')[0],
          sourceDate,
          plannings: planningsDetail,
        })
      }

      return res
    }

    // ── Calcul mode principal ──────────────────────────────────────────────────
    const resultats = calculerPourMode(mode)

    // ── Comparaison optionnelle ────────────────────────────────────────────────
    let comparaison: ComparaisonModes | undefined
    if (includeComparaison) {
      const autreMode = mode === 'simple' ? 'optimise' : 'simple'
      const resultatsAutre = calculerPourMode(autreMode)
      const coutMode = resultats.reduce((s, r) => s + r.coutTotal, 0)
      const coutAutre = resultatsAutre.reduce((s, r) => s + r.coutTotal, 0)
      const coutSimple = mode === 'simple' ? coutMode : coutAutre
      const coutOptimise = mode === 'optimise' ? coutMode : coutAutre
      comparaison = {
        coutSimple,
        coutOptimise,
        economie: coutSimple - coutOptimise,
        economiePercent: coutSimple > 0 ? ((coutSimple - coutOptimise) / coutSimple) * 100 : 0,
        heuresDedupliquees:
          Math.max(0, totalHeuresHebdoSimple - totalHeuresHebdoOptimise) *
          (nbSemainesTotalesGlobal ?? 0),
      }
    }

    // ── Totaux (groupes avec dates uniquement) ────────────────────────────────
    const resultatsAvecDates = resultats.filter((r) => r.nbSemaines > 0)
    const totalHeuresGlobal    = resultatsAvecDates.reduce((s, r) => s + r.totalHeures, 0)
    const coutCoachingGlobal   = resultatsAvecDates.reduce((s, r) => s + r.coutCoaching, 0)
    const coutCompetitionsGlobal = resultatsAvecDates.reduce((s, r) => s + r.coutCompetitions, 0)
    const coutLicencesGlobal   = resultatsAvecDates.reduce((s, r) => s + r.coutLicences, 0)
    const coutFormationsPSE1Global = resultatsAvecDates.reduce((s, r) => s + r.coutFormationsPSE1, 0)
    const coutMargeGlobal      = resultatsAvecDates.reduce((s, r) => s + r.coutMargeSecurite, 0)
    const coutTotalGlobal      = resultatsAvecDates.reduce((s, r) => s + r.coutTotal, 0)
    const revenuActuelGlobal   = resultatsAvecDates.reduce((s, r) => s + r.revenuActuel, 0)
    const revenuPotentielGlobal = resultatsAvecDates.reduce((s, r) => s + r.revenuPotentiel, 0)
    const totalInscrits        = resultats.reduce((s, r) => s + r.inscrits, 0)
    const totalPlaces          = resultats.reduce((s, r) => s + r.placesTotal, 0)
    const beneficeGlobal       = revenuActuelGlobal - coutTotalGlobal

    // ── Coût par coach ────────────────────────────────────────────────────────
    const groupeNomById = new Map(groupes.map((g) => [g.id, g.nom]))
    const coachsCout: CoachCout[] = Array.from(coachStats.entries()).map(
      ([id, stat]) => {
        const presenceHebdo = calculerPresenceHebdoCoach(id, planningsActifs)
        const heuresParSemaine = mode === 'optimise' ? stat.heuresOptimise : presenceHebdo
        const totalHeures = heuresParSemaine * (nbSemainesTotalesGlobal ?? 34)
        return {
          coachId: id,
          coachNom: `${stat.prenom} ${stat.nom}`.trim(),
          heuresParSemaine,
          totalHeures,
          coutTotal: totalHeures * tauxHoraire,
          groupes: Array.from(stat.groupeIds)
            .map((gid) => groupeNomById.get(gid) ?? gid)
            .filter(Boolean),
        }
      }
    )

    // ── Alertes globales ──────────────────────────────────────────────────────
    const alertesGlobales: AlerteGroupe[] = []
    if (beneficeGlobal < 0) {
      alertesGlobales.push({
        type: 'danger',
        code: 'GLOBAL_DEFICIT',
        message: `Déficit global de ${Math.abs(beneficeGlobal).toFixed(0)} € sur la saison`,
      })
    }
    const nbGroupesDeficitaires = resultatsAvecDates.filter((r) => r.beneficeActuel < 0).length
    if (nbGroupesDeficitaires > 0) {
      alertesGlobales.push({
        type: 'warning',
        code: 'GROUPES_DEFICITAIRES',
        message: `${nbGroupesDeficitaires} groupe(s) déficitaire(s)`,
      })
    }


    const heuresDedupliquees =
      mode === 'optimise'
        ? Math.max(0, (totalHeuresHebdoSimple - totalHeuresHebdoOptimise) * (nbSemainesTotalesGlobal ?? 0))
        : 0

    // ── Vacances globales pour l'affichage ────────────────────────────────────
    const periodesVacancesAffichees = hasDateGlobale
      ? vacancesPourPeriode(dateDebutGlobale!, dateFinGlobale!)
      : toutesPeriodesVacances.filter((p) => p.impacteFacturation)

    return NextResponse.json({
      dateDebut: dateDebutStr ?? null,
      dateFin: dateFinStr ?? null,
      nbSemainesTotales: nbSemainesTotalesGlobal,
      tauxHoraire,
      forfaitCompetition,
      nbDemiJourneesParCompetition,
      margeSecurite,
      coutFormationsPSE1: body.coutFormationsPSE1 ?? 150,
      nbFormationsBNSSA: body.nbFormationsBNSSA ?? null,
      mode,
      groupes: resultats,
      coachsCout,
      totaux: {
        totalHeures: totalHeuresGlobal,
        coutCoaching: coutCoachingGlobal,
        coutCompetitions: coutCompetitionsGlobal,
        coutLicences: coutLicencesGlobal,
        coutFormationsPSE1: coutFormationsPSE1Global,
        coutMargeSecurite: coutMargeGlobal,
        coutTotal: coutTotalGlobal,
        revenuActuel: revenuActuelGlobal,
        revenuPotentiel: revenuPotentielGlobal,
        beneficeActuel: beneficeGlobal,
        beneficePotentiel: revenuPotentielGlobal - coutTotalGlobal,
        margeActuelle:
          revenuActuelGlobal > 0 ? (beneficeGlobal / revenuActuelGlobal) * 100 : -100,
        totalInscrits,
        totalPlaces,
        tauxRemplissageMoyen:
          totalPlaces > 0 ? (totalInscrits / totalPlaces) * 100 : 0,
      },
      alertesGlobales,
      heuresDedupliquees: mode === 'optimise' ? heuresDedupliquees : undefined,
      comparaison,
      periodesVacances: periodesVacancesAffichees.map((p) => ({
        nom: p.nom,
        dateDebut: p.dateDebut.toISOString(),
        dateFin: p.dateFin.toISOString(),
      })),
    })
  } catch (error) {
    logger.withContext('Admin').error('Erreur lors du calcul du coût des groupes', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildCoachSlotKey(
  coachId: string,
  planning: { jourSemaine: string; heureDebut: string; heureFin: string }
): string {
  return `${coachId}|${planning.jourSemaine}|${planning.heureDebut}|${planning.heureFin}`
}

function isPPGouPetitBassin(planning: {
  lieu?: string | null
  groupe?: { nom?: string | null; niveau?: string | null } | null
}): boolean {
  const lieuLow = (planning.lieu || '').toLowerCase()
  const groupeNomLow = (planning.groupe?.nom || '').toLowerCase()
  const groupeNiveauLow = (planning.groupe?.niveau || '').toLowerCase()

  const keywords = [
    'ppg',
    'préparation physique',
    'preparation physique',
    'petit',
    'pb',
    'bnssa',
    'ssa',
    'artistique',
    'synchro',
    'aquafitness',
    'aquagym',
    'apprentissage',
    'jardin',
    'bebe',
    'bébé',
    'ecole',
    'école',
    'enf'
  ]

  return keywords.some((kw) =>
    lieuLow.includes(kw) ||
    groupeNomLow.includes(kw) ||
    groupeNiveauLow.includes(kw)
  )
}

function arrondirDemiHeureSuperieure(dureeHeures: number): number {
  return Math.ceil(dureeHeures * 2) / 2
}

function getPlanningDuree(planning: {
  heureDebut: string
  heureFin: string
  semaineImpaire?: boolean | null
  tempsFacture?: number | null
}): number {
  if (planning.tempsFacture && planning.tempsFacture > 0) {
    const dureeBase = planning.tempsFacture / 60
    return planning.semaineImpaire ? dureeBase / 2 : dureeBase
  }
  const start = parseTimeToMinutes(planning.heureDebut)
  const end = parseTimeToMinutes(planning.heureFin)
  const dureeReelle = Math.max(0, (end - start) / 60)
  const dureeArrondie = arrondirDemiHeureSuperieure(dureeReelle)
  return planning.semaineImpaire ? dureeArrondie / 2 : dureeArrondie
}

function parseTimeToMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number)
  return h * 60 + m
}

function calculerHeuresEffectivesCoach(
  coachId: string,
  targetPlanning: {
    jourSemaine: string
    heureDebut: string
    heureFin: string
    lieu?: string | null
    groupe?: { nom?: string | null; niveau?: string | null } | null
  },
  plannings: any[]
): number {
  const dureeFacturee = getPlanningDuree(targetPlanning)

  // En mode optimisé, PPG, Petit Bassin, BNSSA, Natation Artistique et AquaFitness ne sont pas optimisés -> facturés à 100% de leur durée
  if (isPPGouPetitBassin(targetPlanning)) {
    return dureeFacturee
  }

  const start = parseTimeToMinutes(targetPlanning.heureDebut)
  const end = parseTimeToMinutes(targetPlanning.heureFin)
  if (end <= start) return 0

  // Récupérer uniquement les créneaux optimisables (non PPG / non Petit Bassin / non Artistique) de ce coach ce même jour de la semaine
  const coachSlotsDuJour = plannings
    .filter((p) =>
      p.jourSemaine === targetPlanning.jourSemaine &&
      !isPPGouPetitBassin(p) &&
      p.coachs.some((c: any) => c.coachId === coachId)
    )
    .map((p) => ({
      start: parseTimeToMinutes(p.heureDebut),
      end: parseTimeToMinutes(p.heureFin),
    }))

  let totalMinutesEffectives = 0

  for (let m = start; m < end; m++) {
    // Compter combien de créneaux optimisables de ce coach couvrent la minute m
    const k = coachSlotsDuJour.filter((s) => m >= s.start && m < s.end).length
    totalMinutesEffectives += 1 / Math.max(1, k)
  }

  const dureeReelle = (end - start) / 60
  const ratio = dureeReelle > 0 ? dureeFacturee / dureeReelle : 1
  return (totalMinutesEffectives / 60) * ratio
}

/**
 * BUG FIX: fusionne les périodes chevauchantes avant de soustraire les jours.
 */
function calculerNombreSemaines(
  dateDebut: Date,
  dateFin: Date,
  periodesVacances: Array<{ dateDebut: Date; dateFin: Date }>
): number {
  const totalJours = Math.ceil(
    (dateFin.getTime() - dateDebut.getTime()) / (1000 * 60 * 60 * 24)
  )

  const intervalles = periodesVacances
    .map((p) => ({
      debut: Math.max(p.dateDebut.getTime(), dateDebut.getTime()),
      fin: Math.min(p.dateFin.getTime(), dateFin.getTime()),
    }))
    .filter((i) => i.debut <= i.fin)
    .sort((a, b) => a.debut - b.debut)

  const fusionnes: { debut: number; fin: number }[] = []
  for (const i of intervalles) {
    if (fusionnes.length === 0 || i.debut > fusionnes[fusionnes.length - 1].fin) {
      fusionnes.push({ ...i })
    } else {
      fusionnes[fusionnes.length - 1].fin = Math.max(fusionnes[fusionnes.length - 1].fin, i.fin)
    }
  }

  let joursVacances = 0
  for (const { debut, fin } of fusionnes) {
    joursVacances += Math.ceil((fin - debut) / (1000 * 60 * 60 * 24)) + 1
  }

  return Math.floor(Math.max(0, totalJours - joursVacances) / 7)
}

function calculerDuree(heureDebut: string, heureFin: string): number {
  const [hD, mD] = heureDebut.split(':').map(Number)
  const [hF, mF] = heureFin.split(':').map(Number)
  return Math.max(0, (hF * 60 + mF - (hD * 60 + mD)) / 60)
}

function genererAlertes(params: {
  beneficeActuel: number
  tauxRemplissage: number
  seuilRentabilite: number
  inscrits: number
  placesTotal: number
  coutTotal: number
  revenuActuel: number
  heuresParSemaine: number
  planningsGroupe: unknown[]
  sourceDate: 'global' | 'groupe'
  dateDebutGroupe: Date
  dateFinGroupe: Date
}): AlerteGroupe[] {
  const alertes: AlerteGroupe[] = []
  const {
    beneficeActuel,
    tauxRemplissage,
    seuilRentabilite,
    inscrits,
    placesTotal,
    heuresParSemaine,
    planningsGroupe,
    sourceDate,
  } = params

  if (beneficeActuel < 0) {
    alertes.push({
      type: 'danger',
      code: 'DEFICIT',
      message: `Groupe déficitaire de ${Math.abs(beneficeActuel).toFixed(0)} €`,
    })
  }

  if (tauxRemplissage < 50 && placesTotal > 0) {
    alertes.push({
      type: 'warning',
      code: 'FAIBLE_REMPLISSAGE',
      message: `Taux de remplissage faible : ${tauxRemplissage.toFixed(0)} %`,
    })
  }

  if (inscrits < seuilRentabilite) {
    const manquants = seuilRentabilite - inscrits
    alertes.push({
      type: 'warning',
      code: 'SOUS_SEUIL',
      message: `${manquants} inscription(s) manquante(s) pour atteindre l'équilibre`,
    })
  }

  if (heuresParSemaine === 0 && planningsGroupe.length === 0) {
    alertes.push({
      type: 'info',
      code: 'SANS_PLANNING',
      message: 'Aucun planning actif pour ce groupe',
    })
  }

  // Info : dates venant du groupe et non de la page coût
  if (sourceDate === 'groupe') {
    alertes.push({
      type: 'info',
      code: 'DATE_GROUPE',
      message: 'Période calculée à partir des dates définies sur le groupe',
    })
  }

  return alertes
}

function calculerProjection(params: {
  tarifEffectifMoyen: number
  coutTotal: number
  inscrits: number
  placesTotal: number
  beneficeActuel: number
  tauxRemplissage: number
  seuilRentabilite: number
}): ProjectionRemplissage {
  const { tarifEffectifMoyen, coutTotal, inscrits, placesTotal, beneficeActuel, tauxRemplissage, seuilRentabilite } = params
  const beneficeAtTaux = (taux: number) =>
    Math.round(placesTotal * taux * tarifEffectifMoyen - coutTotal)

  return {
    tauxActuel: Math.round(tauxRemplissage * 10) / 10,
    beneficeActuel: Math.round(beneficeActuel),
    projection75: beneficeAtTaux(0.75),
    projection90: beneficeAtTaux(0.9),
    projection100: beneficeAtTaux(1.0),
    inscritsSeuil: seuilRentabilite,
  }
}
