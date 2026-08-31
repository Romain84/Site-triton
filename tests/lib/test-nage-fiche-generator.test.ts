import { describe, it, expect } from 'vitest'
import {
  generateFicheEvaluationPDF,
  generateFicheViergePDF,
  generateFichesJourneePDF,
  getSaisonSportive,
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
})
