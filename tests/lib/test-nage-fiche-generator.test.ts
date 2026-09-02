import { describe, it, expect } from 'vitest'
import {
  generateFicheEvaluationPDF,
  generateFicheViergePDF,
  generateFichesJourneePDF,
  generateProgrammePassagePDF,
  getSaisonSportive,
  parseAndFormatDateNaissance,
} from '@/lib/pdf/test-nage-fiche-generator'

describe('test-nage-fiche-generator', () => {
  it('should compute correct sports season from date', () => {
    // Septembre 2026 -> Saison 2026 – 2027
    expect(getSaisonSportive('2026-09-15')).toBe('SAISON 2026 – 2027')
    // Mai 2026 -> Saison 2025 – 2026
    expect(getSaisonSportive('2026-05-10')).toBe('SAISON 2025 – 2026')
  })

  it('should generate an individual evaluation sheet with exactly 1 page', () => {
    const doc = generateFicheEvaluationPDF({
      nomEnfant: 'Dupont',
      prenomEnfant: 'Lucas',
      dateNaissance: '2017-04-12',
      age: 8,
      nomParent: 'Dupont Marie',
      emailParent: 'dupont.marie@example.com',
      telephoneParent: '0612345678',
      niveauEstime: 'Débutant (a peur dans le grand bain)',
      remarques: 'Port de lunettes obligatoire',
      statut: 'inscrit',
      dateTest: '2026-09-05',
      heureDebut: '14:00',
      heureFin: '14:05',
      lieuTest: 'Piscine couverte Alphonse Roudière',
      titreSession: 'Tests de Nage - Rentrée 2026',
      groupeRecommande: 'ENF 1',
      commentaireCoach: 'Bonne aisance, travail sur la tête sous l\'eau',
      isVierge: false,
    })

    expect(doc).toBeDefined()
    // In jsPDF, internal.pages has 1-indexed pages plus an empty 0 index
    const pageCount = doc.internal.pages.length - 1
    expect(pageCount).toBe(1)
  })

  it('should generate a blank evaluation sheet with exactly 1 page', () => {
    const doc = generateFicheViergePDF({
      titre: 'Tests de Nage 2026',
      date: '2026-09-05',
      lieu: 'Piscine Alphonse Roudière',
    })

    expect(doc).toBeDefined()
    const pageCount = doc.internal.pages.length - 1
    expect(pageCount).toBe(1)
  })

  it('should generate a multi-page PDF with 1 page per registered child in a day session', () => {
    const mockSession = {
      titre: 'Journée des Tests de Nage',
      date: '2026-09-05',
      lieu: 'Piscine couverte Alphonse Roudière',
      creneaux: [
        {
          heureDebut: '14:00',
          heureFin: '14:05',
          inscriptions: [
            {
              id: 'insc-1',
              nomEnfant: 'Martin',
              prenomEnfant: 'Emma',
              age: 7,
              dateNaissance: '2019-02-14',
              nomParent: 'Martin Pierre',
              emailParent: 'pierre.martin@example.com',
              telephoneParent: '0601020304',
              niveauEstime: 'Niveau 1',
              remarques: null,
              statut: 'inscrit',
              groupeRecommande: null,
              commentaireCoach: null,
            },
            {
              id: 'insc-2',
              nomEnfant: 'Bernard',
              prenomEnfant: 'Noah',
              age: 9,
              dateNaissance: '2017-06-20',
              nomParent: 'Bernard Sophie',
              emailParent: 'sophie.bernard@example.com',
              telephoneParent: '0611223344',
              niveauEstime: 'Nageur',
              remarques: null,
              statut: 'inscrit',
              groupeRecommande: 'ENF 2',
              commentaireCoach: null,
            },
          ],
        },
        {
          heureDebut: '14:05',
          heureFin: '14:10',
          inscriptions: [
            {
              id: 'insc-3',
              nomEnfant: 'Dubois',
              prenomEnfant: 'Léa',
              age: 8,
              dateNaissance: '2018-09-10',
              nomParent: 'Dubois Julien',
              emailParent: 'julien.dubois@example.com',
              telephoneParent: '0699887766',
              niveauEstime: 'Débutant',
              remarques: 'Phobie de la grande profondeur',
              statut: 'inscrit',
              groupeRecommande: null,
              commentaireCoach: null,
            },
          ],
        },
      ],
    }

    const doc = generateFichesJourneePDF(mockSession)
    expect(doc).toBeDefined()
    const pageCount = doc.internal.pages.length - 1
    expect(pageCount).toBe(3)
  })

  it('should generate at least 1 blank page if session has no registered children', () => {
    const emptySession = {
      titre: 'Session vide',
      date: '2026-09-05',
      lieu: 'Piscine Alphonse Roudière',
      creneaux: [],
    }

    const doc = generateFichesJourneePDF(emptySession)
    expect(doc).toBeDefined()
    const pageCount = doc.internal.pages.length - 1
    expect(pageCount).toBe(1)
  })

  it('should generate a structured programme PDF table with passage times and registered candidates', () => {
    const mockSession = {
      titre: 'Tests de Nage 2026',
      date: '2026-09-05',
      lieu: 'Piscine Alphonse Roudière',
      heureDebut: '14:00',
      heureFin: '14:30',
      creneaux: [
        {
          heureDebut: '14:00',
          heureFin: '14:05',
          inscriptions: [
            {
              id: 'insc-1',
              nomEnfant: 'Martin',
              prenomEnfant: 'Léo',
              age: 8,
              dateNaissance: '2018-05-14',
              nomParent: 'Sophie Martin',
              telephoneParent: '0612345678',
              statut: 'inscrit',
              groupeRecommande: 'ENF 2 (Mercredi)',
              remarques: null,
            },
          ],
        },
        {
          heureDebut: '14:05',
          heureFin: '14:10',
          inscriptions: [],
        },
      ],
    }

    const doc = generateProgrammePassagePDF(mockSession)
    expect(doc).toBeDefined()
    const pageCount = doc.internal.pages.length - 1
    expect(pageCount).toBeGreaterThanOrEqual(1)
  })

  it('should format date of birth and calculate age correctly for multiple date formats', () => {
    // Format français DD/MM/YYYY
    const res1 = parseAndFormatDateNaissance('08/05/2018', null)
    expect(res1.dateStr).toBe('08/05/2018')
    expect(res1.ageNumber).toBeGreaterThanOrEqual(7)
    expect(res1.ageStr).toContain('ans')

    // Format ISO YYYY-MM-DD
    const res2 = parseAndFormatDateNaissance('2019-12-22T00:00:00.000Z', null)
    expect(res2.dateStr).toBe('22/12/2019')
    expect(res2.ageNumber).toBeGreaterThanOrEqual(6)

    // Objet Date
    const res3 = parseAndFormatDateNaissance(new Date(2020, 4, 1), null)
    expect(res3.dateStr).toBe('01/05/2020')

    // Âge explicite prioritaire
    const res4 = parseAndFormatDateNaissance('01/05/2020', 6)
    expect(res4.dateStr).toBe('01/05/2020')
    expect(res4.ageNumber).toBe(6)
    expect(res4.ageStr).toBe('6 ans')

    // Date manquante mais âge présent
    const res5 = parseAndFormatDateNaissance(null, 9)
    expect(res5.dateStr).toBe('Non renseignée')
    expect(res5.ageNumber).toBe(9)
    expect(res5.ageStr).toBe('9 ans')
  })

  it('should use candidate fallbacks when generating session sheets if inscription fields are empty', () => {
    const sessionWithCandidatFallback = {
      titre: 'Tests de Nage 2026',
      date: '2026-09-05',
      lieu: 'Piscine Alphonse Roudière',
      creneaux: [
        {
          heureDebut: '14:00',
          heureFin: '14:05',
          inscriptions: [
            {
              id: 'insc-fallback',
              nomEnfant: 'Bernard',
              prenomEnfant: 'Noah',
              age: null,
              dateNaissance: null,
              nomParent: null,
              telephoneParent: null,
              emailParent: null,
              groupeRecommande: null,
              candidat: {
                id: 'cand-1',
                statut: 'planifie',
                nom: 'Bernard',
                prenom: 'Noah',
                dateNaissance: '2017-07-13',
                age: 9,
                nomParent: 'Marc Bernard',
                telephoneParent: '0784024886',
                groupeRecommande: 'ENF 2',
              },
            },
          ],
        },
      ],
    }

    const doc = generateFichesJourneePDF(sessionWithCandidatFallback)
    expect(doc).toBeDefined()
    expect(doc.internal.pages.length - 1).toBe(1)
  })
})
