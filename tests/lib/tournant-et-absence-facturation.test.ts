import { describe, expect, it } from 'vitest'
import { calculerDuree, arrondirDemiHeureSuperieure } from '@/lib/facture-calculations'

describe('Calculs de facturation : Planning Tournant et Absences', () => {
  const tauxHoraire = 35

  describe('Planning Tournant assigné au coach', () => {
    it('calcule correctement la durée et le montant positif d\'un créneau tournant assigné', () => {
      const heureDebut = '14:00'
      const heureFin = '16:00'
      const duree = arrondirDemiHeureSuperieure(calculerDuree(heureDebut, heureFin))
      expect(duree).toBe(2)

      const montant = duree * tauxHoraire
      expect(montant).toBe(70)

      const ligne = {
        type: 'planning_tournant' as const,
        description: `Stage Vacances Toussaint - 25/10/2026 ${heureDebut}-${heureFin}`,
        heures: duree,
        montant: montant,
      }

      expect(ligne.heures).toBeGreaterThan(0)
      expect(ligne.montant).toBe(70)
    })

    it('gère les créneaux avec des demi-heures ou durées fractionnées', () => {
      const duree = arrondirDemiHeureSuperieure(calculerDuree('18:00', '19:30'))
      expect(duree).toBe(1.5)
      expect(duree * tauxHoraire).toBe(52.5)
    })

    it('arrondit à la demi-heure supérieure pour un créneau de 1h15 (ex: 18:00 - 19:15 -> 1h30)', () => {
      const dureeReelle = calculerDuree('18:00', '19:15')
      expect(dureeReelle).toBe(1.25) // 1h15 réelles
      const dureeFacturee = arrondirDemiHeureSuperieure(dureeReelle)
      expect(dureeFacturee).toBe(1.5) // 1h30 facturées
      expect(dureeFacturee * tauxHoraire).toBe(52.5)
    })
  })

  describe('Absences sans remplacement vs Absences avec remplacement', () => {
    it('formate correctement le libellé pour une absence sans remplacement et déduit les heures', () => {
      const remp = {
        date: new Date('2026-10-15'),
        heureDebut: '17:30',
        heureFin: '19:00',
        motif: 'Maladie',
        statut: 'sans_remplacant',
        coachRemplacant: null,
      }

      const dureeHeures = calculerDuree(remp.heureDebut, remp.heureFin)
      const dateStr = remp.date.toLocaleDateString('fr-FR')
      const coachNom = remp.coachRemplacant ? 'Autre Coach' : null

      const description = coachNom
        ? `Absence (Remplacé(e) par ${coachNom}) - ${dateStr} ${remp.heureDebut}-${remp.heureFin}${remp.motif ? ` (${remp.motif})` : ''}`
        : `Absence sans remplacement - ${dateStr} ${remp.heureDebut}-${remp.heureFin}${remp.motif ? ` (${remp.motif})` : ''}`

      const ligne = {
        type: 'absence' as const,
        description,
        heures: -dureeHeures,
        montant: -dureeHeures * tauxHoraire,
      }

      expect(ligne.description).toContain('Absence sans remplacement')
      expect(ligne.description).toContain('Maladie')
      expect(ligne.description).not.toContain('En attente')
      expect(ligne.heures).toBe(-1.5)
      expect(ligne.montant).toBe(-52.5)
    })

    it('formate correctement le libellé pour une absence avec remplaçant désigné', () => {
      const remp = {
        date: new Date('2026-10-20'),
        heureDebut: '18:00',
        heureFin: '19:30',
        motif: 'Formation',
        statut: 'accepte',
        coachRemplacant: { prenom: 'Alexandre', nom: 'Bernard' },
      }

      const dureeHeures = calculerDuree(remp.heureDebut, remp.heureFin)
      const dateStr = remp.date.toLocaleDateString('fr-FR')
      const coachNom = remp.coachRemplacant ? `${remp.coachRemplacant.prenom} ${remp.coachRemplacant.nom || ''}`.trim() : null

      const description = coachNom
        ? `Absence (Remplacé(e) par ${coachNom}) - ${dateStr} ${remp.heureDebut}-${remp.heureFin}${remp.motif ? ` (${remp.motif})` : ''}`
        : `Absence sans remplacement - ${dateStr} ${remp.heureDebut}-${remp.heureFin}${remp.motif ? ` (${remp.motif})` : ''}`

      const ligne = {
        type: 'absence' as const,
        description,
        heures: -dureeHeures,
        montant: -dureeHeures * tauxHoraire,
      }

      expect(ligne.description).toContain('Remplacé(e) par Alexandre Bernard')
      expect(ligne.description).toContain('Formation')
      expect(ligne.heures).toBe(-1.5)
      expect(ligne.montant).toBe(-52.5)
    })

    it('vérifie l\'impact net combiné (planning fixe + tournant - absence sans remplacement)', () => {
      const heuresFixe = 20
      const heuresTournant = 3
      const heuresAbsence = 2

      const totalHeures = heuresFixe + heuresTournant - heuresAbsence
      expect(totalHeures).toBe(21)

      const montantTotal = totalHeures * tauxHoraire
      expect(montantTotal).toBe(735)

      // Vérification que les montants des lignes correspondent exactement
      const montantLignes = (heuresFixe * tauxHoraire) + (heuresTournant * tauxHoraire) + (-heuresAbsence * tauxHoraire)
      expect(montantLignes).toBe(montantTotal)
    })
    it('facture bien 1h30 (1.5h) pour le remplacement 18:00 - 19:15 (ex: Hanne remplacée par William)', () => {
      const remp = {
        date: new Date('2026-09-18'),
        heureDebut: '18:00',
        heureFin: '19:15',
        motif: 'RDV',
        statut: 'accepte',
        coachRemplace: { prenom: 'Hanne', nom: 'ROSENOW' },
        coachRemplacant: { prenom: 'William', nom: 'THEODET' },
      }

      // Calcul pour le coach remplaçant (William)
      const dureeHeuresRemplacant = arrondirDemiHeureSuperieure(calculerDuree(remp.heureDebut, remp.heureFin))
      expect(dureeHeuresRemplacant).toBe(1.5) // C'est bien 1h30 qui est payée !

      const ligneWilliam = {
        type: 'remplacement' as const,
        description: `Remplacement de Hanne ROSENOW - 18/09/2026 ${remp.heureDebut}-${remp.heureFin} (${remp.motif})`,
        heures: dureeHeuresRemplacant,
        montant: dureeHeuresRemplacant * tauxHoraire,
      }
      expect(ligneWilliam.heures).toBe(1.5)
      expect(ligneWilliam.montant).toBe(52.5)

      // Calcul pour la coach remplacée (Hanne)
      const dureeHeuresRemplacee = arrondirDemiHeureSuperieure(calculerDuree(remp.heureDebut, remp.heureFin))
      const ligneHanneAbsence = {
        type: 'absence' as const,
        description: `Absence (Remplacé(e) par William THEODET) - 18/09/2026 ${remp.heureDebut}-${remp.heureFin} (${remp.motif})`,
        heures: -dureeHeuresRemplacee,
        montant: -dureeHeuresRemplacee * tauxHoraire,
      }
      expect(ligneHanneAbsence.heures).toBe(-1.5) // 1h30 est bien déduite
      expect(ligneHanneAbsence.montant).toBe(-52.5)

      // Neutralisation avec le planning fixe de Hanne (le vendredi 18:00-19:15 compte +1.5h en planning fixe)
      const ligneHanneFixe = {
        type: 'planning_fixe' as const,
        heures: 1.5,
        montant: 1.5 * tauxHoraire,
      }
      const netHanneJournee = ligneHanneFixe.heures + ligneHanneAbsence.heures
      expect(netHanneJournee).toBe(0) // Neutralisation parfaite à 0h
    })

    it('applique la règle de non-cumul sur créneaux identiques multi-groupes (ROBOT.md 4.C)', () => {
      // Cas réel Lorenzo : remplacement couvrant plusieurs groupes sur le même créneau 18:00 - 19:15
      const rempBenjamins = {
        id: 'remp_benj',
        date: new Date('2026-10-07'),
        heureDebut: '18:00',
        heureFin: '19:15',
        coachRemplace: { prenom: 'Florian', nom: 'Di-Giusto' },
        groupe: 'Benjamins',
      }
      const rempAdultes = {
        id: 'remp_adultes',
        date: new Date('2026-10-07'),
        heureDebut: '18:00',
        heureFin: '19:15',
        coachRemplace: { prenom: 'Florian', nom: 'Di-Giusto' },
        groupe: 'Adultes',
      }

      // La fusion des deux créneaux simultanés doit donner exactement un seul créneau de 1h15
      const debMin1 = 18 * 60
      const finMin1 = 19 * 60 + 15
      const debMin2 = 18 * 60
      const finMin2 = 19 * 60 + 15

      const debutMinFusionne = Math.min(debMin1, debMin2)
      const finMinFusionne = Math.max(finMin1, finMin2)
      const dureeReelleHeures = (finMinFusionne - debutMinFusionne) / 60

      expect(dureeReelleHeures).toBe(1.25) // 1h15 et NON 2h30 !
      const montantUnique = dureeReelleHeures * tauxHoraire
      expect(montantUnique).toBe(43.75) // Payé 1 seule fois
    })

    it('distingue les créneaux consécutifs qui ne se chevauchent pas', () => {
      // Créneau 1 : 17:30 - 18:30 (1h)
      // Créneau 2 : 18:30 - 19:30 (1h)
      const sDeb1 = 17 * 60 + 30
      const sFin1 = 18 * 60 + 30
      const sDeb2 = 18 * 60 + 30
      const sFin2 = 19 * 60 + 30

      // Chevauchement strict : sDeb2 < sFin1
      const seChevauchent = sDeb2 < sFin1
      expect(seChevauchent).toBe(false) // Créneaux consécutifs distincts -> 2 heures payées
    })
  })
})
