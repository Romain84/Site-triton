import { prisma } from '@/lib/prisma'
import { libelleOccupations } from '@/lib/planning-occupations'
import { formatMinutesEnHM } from '@/lib/facture-format'

export interface AgendaSessionDTO {
  id: string
  planningId?: string | null
  type: 'fixe' | 'tournant' | 'remplacement_libre'
  titre: string
  date: string // "YYYY-MM-DD"
  dateAffichage: string // "Mardi 29 septembre"
  heureDebut: string // "19:30"
  heureFin: string // "20:15"
  dureeReelleMin: number
  dureeFormattee: string // "45 min" ou "1h30"
  tempsFactureMin?: number
  tempsFactureFormatte?: string // "1h00"
  lieu: string | null
  groupe: string
  groupeCouleur?: string | null
  isMySession: boolean
  coachNames: string
  estAnnule: boolean
  motifAnnulation?: string | null
  absence?: {
    id: string
    statut: string
    coachRemplacantId?: string | null
    coachRemplacantNom?: string | null
    motif?: string | null
  } | null
  estRemplacementEffectue: boolean
  coachRemplaceNom?: string | null
  remplacementDisponible?: {
    id: string
    coachRemplaceNom: string
    motif?: string | null
  } | null
  isTournantLibre: boolean
}

export interface AgendaJourDTO {
  date: string // "YYYY-MM-DD"
  dateObj: string // ISO string
  dateLabel: string // "Aujourd'hui", "Demain", "Mer. 07 oct."
  jourSemaine: string // "Mercredi"
  estAujourdhui: boolean
  estEnVacances: boolean
  nomVacances?: string | null
  sessions: AgendaSessionDTO[]
}

export interface CoachOptionDTO {
  id: string
  prenom: string
  nom: string | null
  email?: string | null
}

function timeToMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number)
  return (h || 0) * 60 + (m || 0)
}

function getIsoWeekNumber(d: Date): number {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()))
  const dayNum = date.getUTCDay() || 7
  date.setUTCDate(date.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1))
  return Math.ceil((((date.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)
}

function toDateKey(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

const JOURS_SEMAINE_MAP: { [key: string]: number } = {
  Dimanche: 0,
  Lundi: 1,
  Mardi: 2,
  Mercredi: 3,
  Jeudi: 4,
  Vendredi: 5,
  Samedi: 6,
}

const JOURS_NOMS_FR = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi']
const MOIS_NOMS_COURTS = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.']

export async function getCoachAgenda(coachId: string, nbJours = 14): Promise<{ jours: AgendaJourDTO[]; coaches: CoachOptionDTO[] }> {
  const now = new Date()
  const todayKey = toDateKey(now)

  // Plage de dates : aujourd'hui à J+nbJours
  const dateDebut = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0)
  const dateFin = new Date(now.getFullYear(), now.getMonth(), now.getDate() + nbJours, 23, 59, 59)

  // Requêtes parallèles en base
  const [
    periodesVacances,
    seancesAnnulees,
    remplacements,
    tournants,
    planningsFixe,
    allCoaches,
  ] = await Promise.all([
    prisma.periodeVacances.findMany({
      where: {
        actif: true,
        impacteFacturation: true,
        dateDebut: { lte: dateFin },
        dateFin: { gte: dateDebut },
      },
      select: {
        id: true,
        nom: true,
        dateDebut: true,
        dateFin: true,
      },
    }),
    prisma.seanceAnnulee.findMany({
      where: {
        date: { gte: dateDebut, lte: dateFin },
      },
      select: {
        id: true,
        date: true,
        motif: true,
        planningId: true,
        groupeId: true,
        coachId: true,
      },
    }),
    prisma.remplacement.findMany({
      where: {
        actif: true,
        date: { gte: dateDebut, lte: dateFin },
      },
      include: {
        coachRemplace: { select: { id: true, prenom: true, nom: true, email: true } },
        coachRemplacant: { select: { id: true, prenom: true, nom: true, email: true } },
      },
    }),
    prisma.evenementTournant.findMany({
      where: {
        actif: true,
        date: { gte: dateDebut, lte: dateFin },
      },
      include: {
        coach: { select: { id: true, prenom: true, nom: true } },
        groupe: { select: { id: true, nom: true, couleur: true } },
        groupes: { select: { id: true, nom: true, couleur: true } },
      },
      orderBy: { heureDebut: 'asc' },
    }),
    prisma.planning.findMany({
      where: { actif: true },
      include: {
        groupe: { select: { id: true, nom: true, couleur: true } },
        coachs: {
          include: {
            coach: { select: { id: true, prenom: true, nom: true, email: true } },
          },
        },
        occupations: { orderBy: { ordre: 'asc' } },
      },
      orderBy: { heureDebut: 'asc' },
    }),
    prisma.coach.findMany({
      where: { actif: true },
      select: { id: true, prenom: true, nom: true, email: true },
      orderBy: { prenom: 'asc' },
    }),
  ])

  const coachesOptions: CoachOptionDTO[] = allCoaches
    .filter((c) => c.id !== coachId)
    .map((c) => ({
      id: c.id,
      prenom: c.prenom,
      nom: c.nom,
      email: c.email,
    }))

  const joursList: AgendaJourDTO[] = []

  for (let i = 0; i < nbJours; i++) {
    // Midi pour éviter tout saut horaire DST
    const jourDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i, 12, 0, 0)
    const dateKey = toDateKey(jourDate)
    const dayOfWeek = jourDate.getDay()
    const jourNom = JOURS_NOMS_FR[dayOfWeek]
    const estAujourdhui = dateKey === todayKey

    // Label court pour le sélecteur horizontal
    let dateLabel = ''
    if (i === 0) dateLabel = "Aujourd'hui"
    else if (i === 1) dateLabel = 'Demain'
    else dateLabel = `${jourNom.slice(0, 3)}. ${String(jourDate.getDate()).padStart(2, '0')}`

    const dateAffichage = `${jourNom} ${jourDate.getDate()} ${MOIS_NOMS_COURTS[jourDate.getMonth()]}`

    // 1. Détection des vacances scolaires
    const vacance = periodesVacances.find((p) => {
      const deb = new Date(p.dateDebut)
      const fin = new Date(p.dateFin)
      // Comparaison sur les dates en début/fin de journée
      const dMin = new Date(deb.getFullYear(), deb.getMonth(), deb.getDate(), 0, 0, 0)
      const dMax = new Date(fin.getFullYear(), fin.getMonth(), fin.getDate(), 23, 59, 59)
      return jourDate >= dMin && jourDate <= dMax
    })

    const estEnVacances = !!vacance
    const nomVacances = vacance?.nom || null

    const sessionsDuJour: AgendaSessionDTO[] = []

    // 2. Créneaux réguliers (uniquement hors vacances scolaires)
    if (!estEnVacances) {
      const isOddWeek = getIsoWeekNumber(jourDate) % 2 !== 0

      planningsFixe.forEach((p) => {
        // Correspondance jour de la semaine
        if (JOURS_SEMAINE_MAP[p.jourSemaine] !== dayOfWeek) return

        // Règle semaine impaire : si configuré semaineImpaire et semaine actuelle paire -> ignorer
        if (p.semaineImpaire && !isOddWeek) return

        // Calcul durée et temps facturé
        const debutMin = timeToMinutes(p.heureDebut)
        const finMin = timeToMinutes(p.heureFin)
        const dureeReelleMin = Math.max(0, finMin - debutMin)
        const tempsFactureMin = p.tempsFacture ?? dureeReelleMin

        // Vérification annulation par le club (Lot 2)
        const sa = seancesAnnulees.find((s) => {
          const sKey = toDateKey(new Date(s.date))
          if (sKey !== dateKey) return false
          // Si annulation ciblée sur ce créneau ou annulation globale club
          return s.planningId === p.id || (!s.planningId && !s.groupeId && !s.coachId)
        })

        const estAnnule = !!sa
        const motifAnnulation = sa?.motif || null

        // Est-ce une séance où le coach est assigné ?
        const coachIdsSlot = p.coachs.map((c) => c.coachId)
        let isMySession = coachIdsSlot.includes(coachId)

        const coachesListText = p.coachs
          .map((c) => `${c.coach.prenom} ${c.coach.nom || ''}`.trim())
          .join(', ')

        // Vérification absences et remplacements sur ce créneau
        const rempAssocie = remplacements.find((r) => {
          const rKey = toDateKey(new Date(r.date))
          if (rKey !== dateKey) return false
          if (r.planningId === p.id) return true

          // Chevauchement horaire avec un des coachs du créneau
          if (!coachIdsSlot.includes(r.coachRemplaceId)) return false
          const rDeb = timeToMinutes(r.heureDebut)
          const rFin = timeToMinutes(r.heureFin)
          return Math.max(0, Math.min(finMin, rFin) - Math.max(debutMin, rDeb)) > 0
        })

        let absenceObj: AgendaSessionDTO['absence'] = null
        let estRemplacementEffectue = false
        let coachRemplaceNom: string | null = null
        let remplacementDisponible: AgendaSessionDTO['remplacementDisponible'] = null

        if (rempAssocie) {
          if (rempAssocie.coachRemplaceId === coachId) {
            // Le coach connecté est l'absent
            isMySession = true
            absenceObj = {
              id: rempAssocie.id,
              statut: rempAssocie.statut,
              coachRemplacantId: rempAssocie.coachRemplacantId,
              coachRemplacantNom: rempAssocie.coachRemplacant
                ? `${rempAssocie.coachRemplacant.prenom} ${rempAssocie.coachRemplacant.nom || ''}`.trim()
                : null,
              motif: rempAssocie.motif,
            }
          } else if (rempAssocie.coachRemplacantId === coachId) {
            // Le coach connecté effectue le remplacement
            isMySession = true
            estRemplacementEffectue = true
            coachRemplaceNom = `${rempAssocie.coachRemplace.prenom} ${rempAssocie.coachRemplace.nom || ''}`.trim()
          } else if (rempAssocie.statut === 'en_attente') {
            // Remplacement libre à pourvoir pour les collègues
            remplacementDisponible = {
              id: rempAssocie.id,
              coachRemplaceNom: `${rempAssocie.coachRemplace.prenom} ${rempAssocie.coachRemplace.nom || ''}`.trim(),
              motif: rempAssocie.motif,
            }
          }
        }

        const groupeNom = p.nomSession || p.groupe?.nom || 'Entraînement'
        const lieu = libelleOccupations(p) || p.lieu || 'Piscine Alphonse Roudière'

        sessionsDuJour.push({
          id: `${p.id}-${dateKey}`,
          planningId: p.id,
          type: 'fixe',
          titre: groupeNom,
          date: dateKey,
          dateAffichage,
          heureDebut: p.heureDebut,
          heureFin: p.heureFin,
          dureeReelleMin,
          dureeFormattee: formatMinutesEnHM(dureeReelleMin),
          tempsFactureMin,
          tempsFactureFormatte: formatMinutesEnHM(tempsFactureMin),
          lieu,
          groupe: groupeNom,
          groupeCouleur: p.groupe?.couleur || null,
          isMySession,
          coachNames: coachesListText,
          estAnnule,
          motifAnnulation,
          absence: absenceObj,
          estRemplacementEffectue,
          coachRemplaceNom,
          remplacementDisponible,
          isTournantLibre: false,
        })
      })
    }

    // 3. Événements tournants (peuvent avoir lieu même pendant les vacances si programmés)
    tournants.forEach((evt) => {
      const evtKey = toDateKey(new Date(evt.date))
      if (evtKey !== dateKey) return

      const debutMin = timeToMinutes(evt.heureDebut)
      const finMin = timeToMinutes(evt.heureFin)
      const dureeReelleMin = Math.max(0, finMin - debutMin)

      const groupName =
        evt.groupes && evt.groupes.length > 0
          ? evt.groupes.map((g) => g.nom).join(', ')
          : evt.groupe?.nom || evt.titre

      const isMySession = evt.coachId === coachId
      const isTournantLibre = !evt.coachId
      const coachName = evt.coach ? `${evt.coach.prenom} ${evt.coach.nom || ''}`.trim() : ''

      sessionsDuJour.push({
        id: evt.id,
        planningId: null,
        type: 'tournant',
        titre: groupName,
        date: dateKey,
        dateAffichage,
        heureDebut: evt.heureDebut,
        heureFin: evt.heureFin,
        dureeReelleMin,
        dureeFormattee: formatMinutesEnHM(dureeReelleMin),
        tempsFactureMin: dureeReelleMin,
        tempsFactureFormatte: formatMinutesEnHM(dureeReelleMin),
        lieu: evt.lieu || 'Piscine Alphonse Roudière',
        groupe: groupName,
        groupeCouleur: evt.groupe?.couleur || (evt.groupes && evt.groupes.length > 0 ? evt.groupes[0].couleur : null),
        isMySession,
        coachNames: coachName,
        estAnnule: false,
        motifAnnulation: null,
        absence: null,
        estRemplacementEffectue: false,
        coachRemplaceNom: null,
        remplacementDisponible: null,
        isTournantLibre,
      })
    })

    // 4. Remplacements autonomes (sans planningId rattaché)
    remplacements.forEach((remp) => {
      const rKey = toDateKey(new Date(remp.date))
      if (rKey !== dateKey) return
      // Si déjà associé à un créneau fixe ci-dessus, ignorer pour éviter tout doublon
      if (remp.planningId && sessionsDuJour.some((s) => s.planningId === remp.planningId)) return

      const isMyAbsentSession = remp.coachRemplaceId === coachId
      const isMyRemplacantSession = remp.coachRemplacantId === coachId
      const isOpenForMe = remp.statut === 'en_attente' && remp.coachRemplaceId !== coachId

      if (!isMyAbsentSession && !isMyRemplacantSession && !isOpenForMe) return

      const debutMin = timeToMinutes(remp.heureDebut)
      const finMin = timeToMinutes(remp.heureFin)
      const dureeReelleMin = Math.max(0, finMin - debutMin)

      sessionsDuJour.push({
        id: `remp-${remp.id}`,
        planningId: remp.planningId || null,
        type: 'remplacement_libre',
        titre: isMyRemplacantSession
          ? `Remplacement pour ${remp.coachRemplace.prenom}`
          : `Absence déclarée`,
        date: dateKey,
        dateAffichage,
        heureDebut: remp.heureDebut,
        heureFin: remp.heureFin,
        dureeReelleMin,
        dureeFormattee: formatMinutesEnHM(dureeReelleMin),
        tempsFactureMin: dureeReelleMin,
        tempsFactureFormatte: formatMinutesEnHM(dureeReelleMin),
        lieu: 'Piscine Alphonse Roudière',
        groupe: 'Remplacement',
        groupeCouleur: null,
        isMySession: isMyAbsentSession || isMyRemplacantSession,
        coachNames: `${remp.coachRemplace.prenom} → ${remp.coachRemplacant?.prenom || '?'}`.trim(),
        estAnnule: false,
        motifAnnulation: null,
        absence: isMyAbsentSession
          ? {
              id: remp.id,
              statut: remp.statut,
              coachRemplacantId: remp.coachRemplacantId,
              coachRemplacantNom: remp.coachRemplacant
                ? `${remp.coachRemplacant.prenom} ${remp.coachRemplacant.nom || ''}`.trim()
                : null,
              motif: remp.motif,
            }
          : null,
        estRemplacementEffectue: isMyRemplacantSession,
        coachRemplaceNom: `${remp.coachRemplace.prenom} ${remp.coachRemplace.nom || ''}`.trim(),
        remplacementDisponible: isOpenForMe
          ? {
              id: remp.id,
              coachRemplaceNom: `${remp.coachRemplace.prenom} ${remp.coachRemplace.nom || ''}`.trim(),
              motif: remp.motif,
            }
          : null,
        isTournantLibre: false,
      })
    })

    // Trier les séances par heure de début
    sessionsDuJour.sort((a, b) => a.heureDebut.localeCompare(b.heureDebut))

    joursList.push({
      date: dateKey,
      dateObj: jourDate.toISOString(),
      dateLabel,
      jourSemaine: jourNom,
      estAujourdhui,
      estEnVacances,
      nomVacances,
      sessions: sessionsDuJour,
    })
  }

  return {
    jours: joursList,
    coaches: coachesOptions,
  }
}
