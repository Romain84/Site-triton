import { FactureCoachDetails } from '@/lib/facture-calculations'

export type SeveriteAnomalie = 'error' | 'warning' | 'info'

export interface AnomalieFacture {
  id: string
  code:
    | 'ABSENCE_ORPHELINE'
    | 'ABSENCE_TROP_LONGUE'
    | 'ABSENCE_SANS_REMPLACANT'
    | 'REMPLACEMENT_EN_ATTENTE'
    | 'REMPLACEMENT_SIMULTANE'
    | 'SEANCE_ANNULEE_CLUB'
    | 'MONTANT_NEGATIF'
    | 'CRENEAU_SANS_TEMPS_FACTURE'
    | 'COMPETITION_SANS_TRANSPORT'
  severite: SeveriteAnomalie
  titre: string
  description: string
  date?: string
}

/**
 * Analyse une facture calculée pour un coach donné et retourne la liste des anomalies
 * ou points de vigilance à contrôler par l'administrateur.
 */
export async function analyserControleMois(
  coachId: string,
  mois: number,
  annee: number,
  details: FactureCoachDetails
): Promise<AnomalieFacture[]> {
  const anomalies: AnomalieFacture[] = []

  // 1. Détection des absences orphelines (absence sans créneau de cours correspondant ce jour-là)
  const absencesOrphelines = (details.lignesAbsences || []).filter((l) => l.estAbsenceOrpheline)
  for (const abs of absencesOrphelines) {
    const dateStr = abs.date ? new Date(abs.date).toLocaleDateString('fr-FR') : undefined
    anomalies.push({
      id: `abs-orpheline-${abs.id || Math.random()}`,
      code: 'ABSENCE_ORPHELINE',
      severite: 'warning',
      titre: 'Absence sans créneau correspondant',
      description: `Une absence a été déclarée le ${dateStr || ''} (${abs.description}), mais aucun créneau régulier n'était planifié pour ce coach ce jour-là.`,
      date: dateStr,
    })
  }

  // 2. Détection des absences où la durée demandée dépasse la durée réelle du cours
  // (ex: demande 1h15 sur un cours de 45 min)
  for (const ligne of details.lignesPlanningFixe || []) {
    if (ligne.absencesAssociees && ligne.absencesAssociees.length > 0) {
      for (const abs of ligne.absencesAssociees) {
        if (abs.type === 'absence') {
          const dureeAbsenceMin = abs.minutes || Math.abs(abs.heures * 60)
          const dureeCreneauMin = ligne.dureeUnitaireMinutes || (ligne.heures && ligne.nbSeances ? (ligne.heures / ligne.nbSeances) * 60 : 60)

          if (dureeAbsenceMin > dureeCreneauMin + 5) {
            anomalies.push({
              id: `abs-longue-${abs.id || Math.random()}`,
              code: 'ABSENCE_TROP_LONGUE',
              severite: 'info',
              titre: 'Durée d\'absence supérieure au cours',
              description: `Le coach a déclaré une absence de ${Math.round(dureeAbsenceMin)} min le ${abs.date} pour un cours de ${Math.round(dureeCreneauMin)} min (${ligne.titre || ligne.description}). La déduction a été automatiquement plafonnée au temps facturé du cours.`,
              date: abs.date,
            })
          }

          // 3. Absence en attente de remplaçant vs sans remplaçant
          if (!abs.coachRemplacantNom) {
            if (abs.enAttente) {
              anomalies.push({
                id: `remp-en-attente-${abs.id || Math.random()}`,
                code: 'REMPLACEMENT_EN_ATTENTE',
                severite: 'warning',
                titre: 'Demande de remplacement en attente',
                description: `Absence le ${abs.date} (${ligne.titre || ligne.description}) toujours en attente d'acceptation par un remplaçant.`,
                date: abs.date,
              })
            } else {
              anomalies.push({
                id: `abs-sans-remp-${abs.id || Math.random()}`,
                code: 'ABSENCE_SANS_REMPLACANT',
                severite: 'warning',
                titre: 'Absence sans remplaçant',
                description: `Absence le ${abs.date} (${ligne.titre || ligne.description}) sans aucun remplaçant désigné.`,
                date: abs.date,
              })
            }
          }
        } else if (abs.type === 'annulation') {
          // 4. Séance annulée par le club
          anomalies.push({
            id: `seance-annulee-${abs.id || Math.random()}`,
            code: 'SEANCE_ANNULEE_CLUB',
            severite: 'info',
            titre: 'Séance annulée par le club',
            description: `Séance du ${abs.date} (${ligne.titre || ligne.description}) annulée par le club : déduction automatique appliquée (${abs.texteDeduction || ''}).`,
            date: abs.date,
          })
        }
      }
    }
  }

  // 5. Détection des remplacements simultanés (Option B : le coach remplaçant avait déjà cours)
  for (const ligne of details.lignesRemplacements || []) {
    if (ligne.noteInfo?.includes('simultané') || (ligne.montant === 0 && ligne.heures === 0)) {
      const dateStr = ligne.date ? new Date(ligne.date).toLocaleDateString('fr-FR') : undefined
      anomalies.push({
        id: `remp-simultane-${ligne.id || Math.random()}`,
        code: 'REMPLACEMENT_SIMULTANE',
        severite: 'info',
        titre: 'Remplacement simultané (cours déjà dispensé)',
        description: `Remplacement assuré le ${dateStr || ''} (${ligne.description}) alors que le coach avait déjà un cours programmé sur ce créneau. Rémunéré une seule fois conformément au règlement du club.`,
        date: dateStr,
      })
    }
  }

  // 6. Solde total négatif
  if (details.totalMontant < 0) {
    anomalies.push({
      id: `montant-negatif-${coachId}`,
      code: 'MONTANT_NEGATIF',
      severite: 'error',
      titre: 'Solde total négatif',
      description: `Le montant calculé pour ce mois est négatif (${details.totalMontant.toFixed(2)} €). Les déductions d'absences dépassent le total des heures réalisées.`,
    })
  }

  // 7. Compétition régionale sans forfait transport
  const competitions = (details.lignesManuelles || []).filter((l) => l.type === 'competition')
  const transports = (details.lignesManuelles || []).filter((l) => l.type === 'forfait_transport')
  for (const comp of competitions) {
    if (comp.description.toLowerCase().includes('régionale') || (comp.lieu && !comp.lieu.includes('84'))) {
      const dateCompStr = comp.date ? new Date(comp.date).toISOString().substring(0, 10) : ''
      const hasTransport = transports.some((t) => {
        const dateTransStr = t.date ? new Date(t.date).toISOString().substring(0, 10) : ''
        return dateTransStr === dateCompStr
      })
      if (!hasTransport) {
        anomalies.push({
          id: `comp-sans-transport-${comp.id || Math.random()}`,
          code: 'COMPETITION_SANS_TRANSPORT',
          severite: 'warning',
          titre: 'Compétition régionale sans forfait transport',
          description: `La compétition régionale du ${comp.date ? new Date(comp.date).toLocaleDateString('fr-FR') : ''} (${comp.description}) ne comporte aucun forfait transport associé.`,
          date: comp.date ? new Date(comp.date).toLocaleDateString('fr-FR') : undefined,
        })
      }
    }
  }

  return anomalies
}
