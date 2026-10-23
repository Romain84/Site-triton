import 'dotenv/config'
import { prisma } from '../lib/prisma'

interface EventData {
  title: string
  date: string
  dateFin?: string | null
  heureDebut?: string | null
  heureFin?: string | null
  lieu?: string | null
  categories: string
  type: 'competition' | 'evenement' | 'stage' | 'entrainement'
  couleur: string
  sheet?: any
}

// ── Liste complète et exacte des événements 2026 et 2027 ────────────────────
const ALL_EVENTS: EventData[] = [
  // ═══════════════════════════════════════════════════════════════════════════
  // SAISON 2026
  // ═══════════════════════════════════════════════════════════════════════════
  {
    title: 'Championnats régionaux des Maîtres',
    date: '2026-01-18',
    lieu: 'Saint-Tropez',
    categories: 'Maîtres',
    type: 'competition',
    couleur: '#3b82f6',
    sheet: {
      title: 'Championnats régionaux des Maîtres',
      date: '2026-01-18',
      lieu: 'Saint-Tropez',
      bassin: '25 m · 4 lignes',
      categories: 'Maîtres (25 ans et plus)',
      droits: { individuel: '6,50 €' },
      sessions: [
        { label: 'Matin', ouverturePortes: '08:00', heureDebut: '09:00', epreuves: ['100 NL', '50 Dos', '200 Pap', '100 Brasse', '400 NL', '200 Dos', '50 Pap', '400 4N', 'Relais 4x50 4N', '1500 NL'] },
        { label: 'Après-midi', ouverturePortes: '13:30', heureDebut: '14:30', epreuves: ['200 Brasse', '50 NL', '100 Dos', '200 4N', '800 NL', '50 Brasse', '100 Pap', '200 NL', '100 4N', 'Relais 4x50 NL'] }
      ]
    }
  },
  {
    title: 'Championnat départemental U11 et -',
    date: '2026-01-25',
    heureDebut: '09:00',
    heureFin: '18:00',
    lieu: 'Pertuis',
    categories: 'U11 et -',
    type: 'competition',
    couleur: '#15803d',
    sheet: {
      title: 'Championnat départemental U11 et -',
      date: '2026-01-25',
      lieu: 'Pertuis',
      categories: 'U11 et -',
      genre: 'Qualificative',
      conditions: '2 nages individuelles par demi-journée + relais maximum OU 3 nages individuelles. Relais mixtes 2 filles + 2 garçons. 400 NL réservé aux U10 et U11.',
      recompense: "Médailles par catégorie d'âge",
      droits: { individuel: '3,50 €', relais: '6,50 €' },
      sessions: [
        { label: 'Dimanche matin', ouverturePortes: '07:55', echauffement: '08:00', heureDebut: '09:00', epreuves: ['100 NL', '50 BR', '200 NL', '4 x 50 NL Mixte', '100 4N', '50 DOS', '100 PAP'] },
        { label: 'Dimanche après-midi', ouverturePortes: '13:55', echauffement: '14:00', heureDebut: '15:00', epreuves: ['400 NL', '200 4N', '50 NL', '4 x 50 4N Mixte', '100 BR', '100 DOS', '50 PAP'] }
      ],
      pageNumber: 20
    }
  },
  {
    title: 'Championnats de France de relais Maîtres',
    date: '2026-01-31',
    dateFin: '2026-02-01',
    lieu: 'Gap',
    categories: 'Maîtres',
    type: 'competition',
    couleur: '#3b82f6',
  },
  {
    title: 'Championnat départemental U14 et +, Maîtres',
    date: '2026-02-07',
    dateFin: '2026-02-08',
    heureDebut: '15:00',
    heureFin: '18:00',
    lieu: 'Avignon - Stuart Mill',
    categories: 'U14 et +, Maîtres',
    type: 'competition',
    couleur: '#1d4ed8',
    sheet: {
      title: 'Championnat départemental U14 et +, Maîtres',
      date: '2026-02-07',
      dateFin: '2026-02-08',
      lieu: 'Avignon - Stuart Mill',
      categories: 'U14 et +, Maîtres',
      genre: 'Qualificative',
      droits: { individuel: '3,50 €' },
      sessions: [
        { label: 'Samedi après-midi', ouverturePortes: '13:55', echauffement: '14:00', heureDebut: '15:00', epreuves: ['50 NL', '50 BR', '400 NL', '400 4N', '100 PAP', '200 DOS'] },
        { label: 'Dimanche matin', ouverturePortes: '07:55', echauffement: '08:00', heureDebut: '09:00', epreuves: ['50 PAP', '100 DOS', '200 BR', '1500 NL (23\')', '100 4N', '200 NL'] },
        { label: 'Dimanche après-midi', ouverturePortes: '13:55', echauffement: '14:00', heureDebut: '15:00', epreuves: ['50 DOS', '100 BR', '800 NL (13\')', '200 PAP', '100 NL', '200 4N'] }
      ],
      pageNumber: 21
    }
  },
  {
    title: 'Championnat départemental U12 et U13',
    date: '2026-02-14',
    dateFin: '2026-02-15',
    heureDebut: '15:00',
    heureFin: '18:00',
    lieu: 'Sorgues',
    categories: 'U12 et U13',
    type: 'competition',
    couleur: '#1d4ed8',
    sheet: {
      title: 'Championnat départemental U12 et U13',
      date: '2026-02-14',
      dateFin: '2026-02-15',
      lieu: 'Sorgues',
      categories: 'U12 et U13',
      genre: 'Qualificative',
      droits: { individuel: '3,50 €' },
      sessions: [
        { label: 'Samedi après-midi', ouverturePortes: '13:55', echauffement: '14:00', heureDebut: '15:00', epreuves: ['50 DOS', '100 BR', '800 NL (13\')', '200 PAP', '100 NL', '200 4N'] },
        { label: 'Dimanche matin', ouverturePortes: '07:55', echauffement: '08:00', heureDebut: '09:00', epreuves: ['50 NL', '50 BR', '400 NL', '100 PAP', '200 DOS'] },
        { label: 'Dimanche après-midi', ouverturePortes: '13:55', echauffement: '14:00', heureDebut: '15:00', epreuves: ['50 PAP', '100 DOS', '200 BR', '100 4N', '200 NL'] }
      ],
      pageNumber: 22
    }
  },
  {
    title: 'Championnats de France Maîtres N2 Hiver',
    date: '2026-02-14',
    dateFin: '2026-02-15',
    lieu: 'Libourne',
    categories: 'Maîtres',
    type: 'competition',
    couleur: '#3b82f6',
  },
  {
    title: 'Interclubs régionaux Maîtres',
    date: '2026-02-22',
    lieu: 'Nice',
    categories: 'Maîtres',
    type: 'competition',
    couleur: '#3b82f6',
  },
  {
    title: 'Championnats de France Maîtres N1 Hiver',
    date: '2026-03-05',
    dateFin: '2026-03-08',
    lieu: 'Bourg-en-Bresse',
    categories: 'Maîtres',
    type: 'competition',
    couleur: '#3b82f6',
  },
  {
    title: 'Championnat départemental U12 et +',
    date: '2026-03-07',
    dateFin: '2026-03-08',
    heureDebut: '15:00',
    heureFin: '18:00',
    lieu: 'Pertuis',
    categories: 'U12 et +',
    type: 'competition',
    couleur: '#1d4ed8',
    sheet: {
      title: 'Championnat départemental U12 et +',
      date: '2026-03-07',
      dateFin: '2026-03-08',
      lieu: 'Pertuis',
      categories: 'U12 et +',
      genre: 'Qualificative',
      conditions: 'Pour tous les 50, il y aura séries, demi-finales (12 nageurs) et finales (6 nageurs) selon les catégories : U12/U13, U14/U15, U16 et +',
      droits: { individuel: '3,50 €', relais: '6,50 €' },
      sessions: [
        { label: 'Samedi après-midi', ouverturePortes: '13:55', echauffement: '14:00', heureDebut: '15:00', epreuves: ['50 PAP', '200 BR', '50 DOS', '100 NL', '50 BR', '200 DOS', '50 NL', '100 PAP'] },
        { label: 'Dimanche matin', ouverturePortes: '07:55', echauffement: '08:00', heureDebut: '09:00', epreuves: ['Demi-finale 50 NL', '100 4N', 'Demi-finale 50 DOS', '200 NL', 'Demi-finale 50 BR', '100 DOS', 'Demi-finale 50 PAP', '100 BR', 'Relais 4 x 50 NL'] },
        { label: 'Dimanche après-midi', ouverturePortes: '13:55', echauffement: '14:00', heureDebut: '15:00', epreuves: ['Finale 50 PAP', 'Relais 4 x 100 4N individuel', 'Finale 50 DOS', '200 4N', 'Finale 50 BR', 'Relais 4 x 50 4N', 'Finale 50 NL'] }
      ],
      pageNumber: 23
    }
  },
  {
    title: 'Web Confrontation',
    date: '2026-03-13',
    dateFin: '2026-03-15',
    lieu: 'Saint Raphaël',
    categories: 'U14 et +',
    type: 'competition',
    couleur: '#1d4ed8',
  },
  {
    title: 'Championnat départemental U11 et -',
    date: '2026-03-22',
    heureDebut: '09:00',
    heureFin: '18:00',
    lieu: 'Sorgues',
    categories: 'U11 et -',
    type: 'competition',
    couleur: '#15803d',
    sheet: {
      title: 'Championnat départemental U11 et -',
      date: '2026-03-22',
      lieu: 'Sorgues',
      categories: 'U11 et -',
      genre: 'Qualificative',
      conditions: '2 nages individuelles par demi-journée + relais maximum OU 3 nages individuelles. Relais mixtes 2 filles + 2 garçons.',
      recompense: "Médailles par catégorie d'âge",
      droits: { individuel: '3,50 €', relais: '6,50 €' },
      sessions: [
        { label: 'Dimanche matin', ouverturePortes: '07:55', echauffement: '08:00', heureDebut: '09:00', epreuves: ['4 x 50 4N Mixte', '25 NL', '25 DOS', '50 PAP', '100 NL', '50 BR'] },
        { label: 'Dimanche après-midi', ouverturePortes: '13:55', echauffement: '14:00', heureDebut: '15:00', epreuves: ['4 x 50 NL Mixte', '100 4N', '25 BR', '25 PAP', '50 DOS', '100 BR', '50 NL'] }
      ],
      pageNumber: 24
    }
  },
  {
    title: "Meeting d'animation U14 et +",
    date: '2026-04-04',
    dateFin: '2026-04-05',
    lieu: 'Nice',
    categories: 'U14 et +',
    type: 'competition',
    couleur: '#1d4ed8',
  },
  {
    title: 'Championnat départemental U14 et +, Maîtres',
    date: '2026-04-11',
    dateFin: '2026-04-12',
    heureDebut: '15:00',
    heureFin: '18:00',
    lieu: 'Avignon - Stuart Mill',
    categories: 'U14 et +, Maîtres',
    type: 'competition',
    couleur: '#1d4ed8',
    sheet: {
      title: 'Championnat départemental U14 et +, Maîtres',
      date: '2026-04-11',
      dateFin: '2026-04-12',
      lieu: 'Avignon - Stuart Mill',
      categories: 'U14 et +, Maîtres',
      genre: 'Qualificative',
      conditions: '400 4N et 1500 NL réservés aux U14 et +, Maîtres',
      droits: { individuel: '3,50 €' },
      sessions: [
        { label: 'Samedi après-midi', ouverturePortes: '13:55', echauffement: '14:00', heureDebut: '15:00', epreuves: ['50 DOS', '100 BR', '800 NL (13\')', '200 PAP', '100 NL', '200 4N'] },
        { label: 'Dimanche matin', ouverturePortes: '07:55', echauffement: '08:00', heureDebut: '09:00', epreuves: ['50 NL', '50 BR', '400 NL', '400 4N', '100 PAP', '200 DOS'] },
        { label: 'Dimanche après-midi', ouverturePortes: '13:55', echauffement: '14:00', heureDebut: '15:00', epreuves: ['50 PAP', '100 DOS', '200 BR', '1500 NL (23\')', '100 4N', '200 NL'] }
      ],
      pageNumber: 25
    }
  },
  {
    title: 'Interclubs nationaux des Maîtres',
    date: '2026-04-11',
    dateFin: '2026-04-12',
    lieu: 'Châteauroux',
    categories: 'Maîtres',
    type: 'competition',
    couleur: '#3b82f6',
  },
  {
    title: 'Championnats de France U14 et U15',
    date: '2026-04-15',
    dateFin: '2026-04-19',
    categories: 'U14 et U15',
    type: 'competition',
    couleur: '#1d4ed8',
  },
  {
    title: 'Championnat départemental U11 et -',
    date: '2026-05-03',
    heureDebut: '09:00',
    heureFin: '18:00',
    lieu: 'Vedène',
    categories: 'U11 et -',
    type: 'competition',
    couleur: '#15803d',
    sheet: {
      title: 'Championnat départemental U11 et -',
      date: '2026-05-03',
      lieu: 'Vedène',
      categories: 'U11 et -',
      genre: 'Qualificative',
      conditions: '3 nages individuelles maximum par réunion. 400 NL réservé aux U10 et U11.',
      recompense: "Médailles par catégorie d'âge",
      droits: { individuel: '3,50 €' },
      sessions: [
        { label: 'Dimanche matin', ouverturePortes: '07:55', echauffement: '08:00', heureDebut: '09:00', epreuves: ['100 4N', '100 NL', '50 PAP', '100 DOS', '50 BR', '400 NL'] },
        { label: 'Dimanche après-midi', ouverturePortes: '13:55', echauffement: '14:00', heureDebut: '15:00', epreuves: ['200 NL', '100 PAP', '50 DOS', '100 BR', '200 4N', '50 NL'] }
      ],
      pageNumber: 26
    }
  },
  {
    title: 'Meeting régional U14 et +',
    date: '2026-05-09',
    dateFin: '2026-05-10',
    lieu: 'Saint Raphaël',
    categories: 'U14 et +',
    type: 'competition',
    couleur: '#1d4ed8',
  },
  {
    title: 'Coupe Interdépartementale U10 et U11',
    date: '2026-05-14',
    lieu: 'Gap',
    categories: 'U10 et U11',
    type: 'competition',
    couleur: '#15803d',
  },
  {
    title: 'Championnat départemental U12 et +',
    date: '2026-05-16',
    dateFin: '2026-05-17',
    heureDebut: '15:00',
    heureFin: '18:00',
    lieu: 'Sorgues',
    categories: 'U12 et +',
    type: 'competition',
    couleur: '#1d4ed8',
    sheet: {
      title: 'Championnat départemental U12 et +',
      date: '2026-05-16',
      dateFin: '2026-05-17',
      lieu: 'Sorgues',
      categories: 'U12 et +',
      genre: 'Qualificative',
      droits: { individuel: '3,50 €' },
      sessions: [
        { label: 'Samedi après-midi', ouverturePortes: '13:55', echauffement: '14:00', heureDebut: '15:00', epreuves: ['50 PAP', '100 DOS', '200 BR', '1500 NL (23\')', '100 4N', '200 NL'] },
        { label: 'Dimanche matin', ouverturePortes: '07:55', echauffement: '08:00', heureDebut: '09:00', epreuves: ['50 DOS', '100 BR', '800 NL (13\')', '200 PAP', '100 NL', '200 4N'] },
        { label: 'Dimanche après-midi', ouverturePortes: '13:55', echauffement: '14:00', heureDebut: '15:00', epreuves: ['50 NL', '50 BR', '400 NL', '400 4N', '100 PAP', '200 DOS'] }
      ],
      pageNumber: 27
    }
  },
  {
    title: 'Championnats de France Maîtres N2 Eté + meeting N1',
    date: '2026-05-16',
    dateFin: '2026-05-17',
    lieu: 'Nîmes',
    categories: 'Maîtres',
    type: 'competition',
    couleur: '#3b82f6',
  },
  {
    title: 'Eliminatoires Coupe de France des départements',
    date: '2026-05-24',
    lieu: 'Avignon',
    categories: 'U12 et U13',
    type: 'competition',
    couleur: '#1d4ed8',
  },
  {
    title: 'Championnats de France U18',
    date: '2026-05-25',
    dateFin: '2026-05-30',
    lieu: 'Châlon-sur-Saône',
    categories: 'U18',
    type: 'competition',
    couleur: '#1d4ed8',
  },
  {
    title: 'Championnat départemental U11 et -',
    date: '2026-05-31',
    heureDebut: '09:00',
    heureFin: '18:00',
    lieu: 'Orange',
    categories: 'U11 et -',
    type: 'competition',
    couleur: '#15803d',
    sheet: {
      title: 'Championnat départemental U11 et -',
      date: '2026-05-31',
      lieu: 'Orange',
      categories: 'U11 et -',
      genre: 'Qualificative',
      conditions: '2 nages individuelles par demi-journée + relais maximum OU 3 nages individuelles. Les relais sont obligatoirement composés de 2 filles et 2 garçons pour être pris en compte.',
      recompense: "Médailles par catégorie d'âge",
      droits: { individuel: '3,50 €', relais: '6,50 €' },
      sessions: [
        { label: 'Dimanche matin', ouverturePortes: '07:55', echauffement: '08:00', heureDebut: '09:00', epreuves: ['4 x 50 NL Mixte', '100 4N', '25 BR', '25 PAP', '50 DOS', '100 DOS', '50 NL'] },
        { label: 'Dimanche après-midi', ouverturePortes: '13:55', echauffement: '14:00', heureDebut: '15:00', epreuves: ['4 x 50 4N Mixte', '25 NL', '25 DOS', '50 PAP', '100 NL', '50 BR'] }
      ],
      pageNumber: 28
    }
  },
  {
    title: 'Championnats régionaux des Maîtres',
    date: '2026-05-31',
    lieu: 'Toulon',
    categories: 'Maîtres',
    type: 'competition',
    couleur: '#3b82f6',
  },
  {
    title: 'Vaucluse OPEN - Bassin 50m',
    date: '2026-06-06',
    dateFin: '2026-06-07',
    heureDebut: '09:00',
    heureFin: '18:00',
    lieu: 'Carpentras',
    categories: 'U12 et +, Maîtres',
    type: 'competition',
    couleur: '#1d4ed8',
    sheet: {
      title: 'Championnat Vaucluse OPEN - Bassin 50m',
      date: '2026-06-06',
      dateFin: '2026-06-07',
      lieu: 'Carpentras',
      bassin: 'Bassin 50m',
      categories: 'U12 et +, Maîtres',
      genre: 'Qualificative',
      conditions: 'Engagements non limités. Classement au temps par catégories (U12 et U13 séparés – U14 et U15 – U16 et +) : 400 4N, 400 NL, 800 NL, 1500 NL et tous les 100 et 200. Finales sur les 50m. Maîtres : classement au temps sur 50, 100, 200 + 400 NL.',
      recompense: 'Médailles + Récompenses',
      droits: { individuel: '3,50 €' },
      sessions: [
        { label: 'Samedi matin', ouverturePortes: '07:55', echauffement: '08:00', heureDebut: '09:00', epreuves: ['50 PAP', '1500 NL D (23\')', '400 NL M', '200 BR', '100 NL', 'Finale 50 PAP'] },
        { label: 'Samedi après-midi', ouverturePortes: '13:55', echauffement: '14:00', heureDebut: '15:00', epreuves: ['50 DOS', '800 NL M (13\')', '400 4N D', '200 4N M', '200 NL', '100 PAP', 'Finale 50 DOS'] },
        { label: 'Dimanche matin', ouverturePortes: '07:55', echauffement: '08:00', heureDebut: '09:00', epreuves: ['50 BR', '1500 NL M (23\')', '400 NL D', '200 PAP', '100 DOS', 'Finale 50 BR'] },
        { label: 'Dimanche après-midi', ouverturePortes: '13:55', echauffement: '14:00', heureDebut: '15:00', epreuves: ['50 NL', '800 NL D (13\')', '400 4N M', '200 4N D', '200 DOS', '100 BR', 'Finale 50 NL'] }
      ],
      pageNumber: 29
    }
  },
  {
    title: 'Finale départementale U11 et -',
    date: '2026-06-13',
    heureDebut: '09:00',
    heureFin: '18:00',
    lieu: 'Sorgues',
    categories: 'U11 et -',
    type: 'competition',
    couleur: '#15803d',
    sheet: {
      title: 'Finale départementale U11 et -',
      date: '2026-06-13',
      lieu: 'Sorgues',
      categories: 'U11 et -',
      genre: 'Qualificative',
      conditions: 'Les relais sont obligatoirement composés de 2 filles et 2 garçons pour être pris en compte. Uniquement les nageurs non qualifiés au Trophée du 20&21/06/2026',
      recompense: 'Médailles + Coupes (relais)',
      droits: { individuel: '3,50 €', relais: '6,50 €' },
      sessions: [
        { label: 'Samedi matin', ouverturePortes: '07:55', echauffement: '08:00', heureDebut: '09:00', epreuves: ['200 4N', '50 PAP', '400 NL', '50 BR', '100 DOS', '100 NL'] },
        { label: 'Samedi après-midi', ouverturePortes: '13:55', echauffement: '14:00', heureDebut: '15:00', epreuves: ['200 NL', '50 DOS', '100 PAP', '4 x 50 4N Mixte', '100 BR', '50 NL'] }
      ],
      pageNumber: 31
    }
  },
  {
    title: 'Interclubs départementaux U12/U13 et U14/U15',
    date: '2026-06-14',
    heureDebut: '09:00',
    heureFin: '18:00',
    lieu: 'Sorgues',
    categories: 'U12 à U15',
    type: 'competition',
    couleur: '#1d4ed8',
    sheet: {
      title: 'Interclubs U12/U13 et U14/U15',
      date: '2026-06-14',
      lieu: 'Sorgues',
      categories: 'U12/U13 et U14/U15',
      genre: 'Animation',
      conditions: 'Les équipes seront composées de 4 nageurs. Un nageur doit obligatoirement participer à 2 épreuves individuelles ainsi qu\'à tous les relais. Toutes les épreuves individuelles seront nagées 2 fois.',
      recompense: 'Coupes + médailles (équipe)',
      droits: { individuel: '43 € / équipe' },
      sessions: [
        { label: 'Samedi matin', ouverturePortes: '07:55', echauffement: '08:00', heureDebut: '09:00', epreuves: ['100 PAP D', '100 DOS M', '100 BR D', '100 NL M', '4 x 200 NL D', '4 x 100 4N indiv. M'] },
        { label: 'Samedi après-midi', ouverturePortes: '13:55', echauffement: '14:00', heureDebut: '15:00', epreuves: ['100 PAP M', '100 DOS D', '100 BR M', '100 NL D', '4 x 200 NL M', '4 x 100 4N indiv. D'] }
      ],
      pageNumber: 32
    }
  },
  {
    title: 'Trophée U10 et U11',
    date: '2026-06-20',
    dateFin: '2026-06-21',
    categories: 'U10 et U11',
    type: 'competition',
    couleur: '#15803d',
  },
  {
    title: 'Championnats de France Maîtres N1 Eté',
    date: '2026-06-25',
    dateFin: '2026-06-28',
    lieu: 'Tarbes',
    categories: 'Maîtres',
    type: 'competition',
    couleur: '#3b82f6',
  },
  {
    title: 'Web Confrontation',
    date: '2026-06-27',
    dateFin: '2026-06-28',
    lieu: 'Aix en Provence',
    categories: 'U12 et U13',
    type: 'competition',
    couleur: '#1d4ed8',
  },
  {
    title: 'Championnats de France Elites',
    date: '2026-06-27',
    dateFin: '2026-07-02',
    lieu: 'Saint Etienne',
    categories: 'Elites',
    type: 'competition',
    couleur: '#1d4ed8',
  },
  {
    title: 'Web Confrontation',
    date: '2026-07-03',
    dateFin: '2026-07-05',
    lieu: 'Martigues',
    categories: 'U14 et +',
    type: 'competition',
    couleur: '#1d4ed8',
  },
  {
    title: "Open d'été",
    date: '2026-07-17',
    dateFin: '2026-07-22',
    lieu: 'Cannet-en-Roussillon',
    categories: 'Toutes catégories',
    type: 'competition',
    couleur: '#3b82f6',
  },
  {
    title: 'AG Comité',
    date: '2026-10-10',
    lieu: 'Vedène',
    categories: 'Comité',
    type: 'evenement',
    couleur: '#10b981',
  },
  {
    title: 'Pré Saison',
    date: '2026-10-11',
    lieu: 'Cavaillon',
    categories: 'U12 et +',
    type: 'competition',
    couleur: '#1d4ed8',
  },
  {
    title: 'Regroupement U12/U13',
    date: '2026-10-17',
    heureDebut: '15:00',
    heureFin: '18:00',
    lieu: 'Le Pontet',
    categories: 'U12/U13',
    type: 'stage',
    couleur: '#f59e0b',
  },
  {
    title: 'Championnat de France Elites',
    date: '2026-10-22',
    dateFin: '2026-10-25',
    categories: 'Elites',
    type: 'competition',
    couleur: '#1d4ed8',
  },
  {
    title: 'Meeting Ligue demi-fond',
    date: '2026-11-07',
    dateFin: '2026-11-08',
    heureDebut: '14:00',
    heureFin: '18:00',
    lieu: 'Nice – Piscine Jean Médecin',
    categories: 'U14 et plus*',
    type: 'competition',
    couleur: '#1d4ed8',
    sheet: {
      title: 'Meeting Ligue ½ fond',
      date: '2026-11-07',
      dateFin: '2026-11-08',
      lieu: 'Nice – Piscine Jean Médecin',
      bassin: '25 m · 6 lignes',
      categories: 'U14 et plus (ouvert aux U13 réalisant les temps de grille U14)',
      genre: 'Animation',
      droits: { individuel: '6,50 €', relais: '12,00 €' },
      sessions: [
        { label: '1re réunion (Samedi après-midi)', ouverturePortes: '14:00', heureDebut: '15:00', epreuves: ['4 × 50 NL mixtes', '400 m 4 nages messieurs', '800 m nage libre dames', '1500 m nage libre messieurs'] },
        { label: '2e réunion (Dimanche matin)', ouverturePortes: '08:00', heureDebut: '09:00', epreuves: ['4 × 50 m 4N mixtes', '400 m 4 nages dames', '800 m nage libre messieurs', '1500 m nage libre dames'] },
        { label: '3e réunion (Dimanche après-midi)', ouverturePortes: '14:00', heureDebut: '15:00', epreuves: ['400 m nage libre dames', '400 m nage libre messieurs', '200 m 4N dames', '200 m 4N messieurs'] }
      ]
    }
  },
  {
    title: 'Championnats de France Interclubs — Poule B',
    date: '2026-11-14',
    heureDebut: '08:00',
    heureFin: '18:00',
    lieu: 'Istres',
    categories: 'Toutes catégories',
    type: 'competition',
    couleur: '#1d4ed8',
    sheet: {
      title: 'Championnats de France Interclubs — Poule B Ouest',
      date: '2026-11-14',
      lieu: 'Istres',
      bassin: '25 m · 8 lignes',
      categories: 'Toutes catégories',
      genre: 'Animation par équipe',
      droits: { individuel: '60,00 € / équipe' },
      sessions: [
        { label: '1re réunion (Matin)', ouverturePortes: '08:00', heureDebut: '09:15', epreuves: ['10 × 50 NL', '100 dos D / 200 dos M', '100 brasse D / 200 brasse M', '100 NL D / 400 NL M', '100 pap D / 200 pap M', '100 4N D / 200 4N M', '4 × 200 NL D'] },
        { label: '2e réunion (Après-midi)', ouverturePortes: '14:00', heureDebut: '15:15', epreuves: ['4 × 200 NL M', '200 dos D / 100 dos M', '200 brasse D / 100 brasse M', '400 NL D / 100 NL M', '200 pap D / 100 pap M', '200 4N D / 100 4N M', '4 × 100 4N D et M'] }
      ]
    }
  },
  {
    title: 'Championnats de France Interclubs — Poule A',
    date: '2026-11-15',
    heureDebut: '09:15',
    heureFin: '18:00',
    lieu: 'Monaco',
    categories: 'Toutes catégories',
    type: 'competition',
    couleur: '#1d4ed8',
    sheet: {
      title: 'Championnats de France Interclubs — Poule A Elite',
      date: '2026-11-15',
      lieu: 'Monaco',
      bassin: '25 m · 8 lignes',
      categories: 'Toutes catégories',
      genre: 'Animation par équipe',
      droits: { individuel: '60,00 € / équipe' },
      sessions: [
        { label: '1re réunion', ouverturePortes: '09:15', heureDebut: '10:30', epreuves: ['10 × 50 NL', '100 dos D / 200 dos M', '100 brasse D / 200 brasse M', '100 NL D / 400 NL M', '100 pap D / 200 pap M', '100 4N D / 200 4N M', '4 × 200 NL D'] },
        { label: '2e réunion', ouverturePortes: '14:30', heureDebut: '15:30', epreuves: ['4 × 200 NL M', '200 dos D / 100 dos M', '200 brasse D / 100 brasse M', '400 NL D / 100 NL M', '200 pap D / 100 pap M', '200 4N D / 100 4N M', '4 × 100 4N D et M'] }
      ]
    }
  },
  {
    title: 'Interclubs Toutes catégories Poule C',
    date: '2026-11-15',
    lieu: 'Sorgues',
    categories: 'Toutes catégories',
    type: 'competition',
    couleur: '#1d4ed8',
  },
  {
    title: 'Web Confrontation',
    date: '2026-11-21',
    dateFin: '2026-11-22',
    lieu: 'Avignon Stuart Mill',
    categories: 'U12 et +',
    type: 'competition',
    couleur: '#1d4ed8',
  },
  {
    title: 'AG Ligue',
    date: '2026-11-28',
    lieu: 'Sorgues',
    categories: 'Ligue',
    type: 'evenement',
    couleur: '#10b981',
  },
  {
    title: 'Championnat départemental U11 et -',
    date: '2026-11-29',
    lieu: 'Orange',
    categories: 'U11 et -',
    type: 'competition',
    couleur: '#15803d',
  },
  {
    title: 'Meeting Ligue U12 à U15',
    date: '2026-12-05',
    dateFin: '2026-12-06',
    lieu: 'Lieu à définir',
    categories: 'U12 à U15',
    type: 'competition',
    couleur: '#1d4ed8',
    sheet: {
      title: 'Meeting Ligue U12 à U15',
      date: '2026-12-05',
      dateFin: '2026-12-06',
      bassin: '25 m',
      categories: 'U12 à U15',
      genre: 'Animation',
      droits: { individuel: '6,50 €' },
      sessions: [
        { label: '1re réunion (Samedi après-midi)', ouverturePortes: '14:00', heureDebut: '15:00', epreuves: ['200 m 4N D et M', '50 m dos D et M', '50 m brasse D et M', '50 m papillon D et M', '50 m NL D et M', '4 × 100 NL D et M'] },
        { label: '2e réunion (Dimanche matin)', ouverturePortes: '08:00', heureDebut: '09:00', epreuves: ['100 m dos séries', '100 m brasse séries', '100 m papillon séries', '100 m NL séries'] },
        { label: '3e réunion (Dimanche après-midi)', ouverturePortes: '14:00', heureDebut: '15:00', epreuves: ['Finales 100 dos', 'Finales 100 brasse', 'Finales 100 papillon', 'Finales 100 NL'] }
      ]
    }
  },
  {
    title: 'Championnat de France U18',
    date: '2026-12-08',
    dateFin: '2026-12-12',
    categories: 'U14 à U18',
    type: 'competition',
    couleur: '#1d4ed8',
  },
  {
    title: 'Interclubs départementaux U11 et -',
    date: '2026-12-13',
    lieu: 'Sorgues',
    categories: 'U11 et -',
    type: 'competition',
    couleur: '#15803d',
  },
  {
    title: 'Championnat de France U12/U13',
    date: '2026-12-17',
    dateFin: '2026-12-19',
    categories: 'U12/U13',
    type: 'competition',
    couleur: '#1d4ed8',
  },
  {
    title: 'Championnat régional 25m',
    date: '2026-12-19',
    dateFin: '2026-12-20',
    lieu: 'Istres',
    categories: 'U13 et +',
    type: 'competition',
    couleur: '#1d4ed8',
    sheet: {
      title: 'Championnat régional Région Sud en bassin de 25 m',
      date: '2026-12-19',
      dateFin: '2026-12-20',
      lieu: 'Istres',
      bassin: '25 m · 8 lignes · Chrono automatique',
      categories: 'U14 et plus (ouvert aux U13 réalisant les temps de grille juniors U14)',
      genre: 'Référence / animation',
      droits: { individuel: '6,50 €' },
      sessions: [
        { label: '1re réunion (Samedi matin)', ouverturePortes: '08:00', heureDebut: '09:30', epreuves: ['1500 NL dames', '50 papillon D-M', '400 NL messieurs', '200 brasse D-M', '100 NL D-M'] },
        { label: '2e réunion (Samedi après-midi)', ouverturePortes: '14:00', heureDebut: '15:30', epreuves: ['800 NL messieurs', '50 dos M-D', '400 4N dames', '200 4N messieurs', '200 NL D-M', '100 papillon D-M'] },
        { label: '3e réunion (Dimanche matin)', ouverturePortes: '08:00', heureDebut: '09:30', epreuves: ['1500 NL messieurs', '50 brasse M-D', '400 NL dames', '200 papillon M-D', '100 dos M-D'] },
        { label: '4e réunion (Dimanche après-midi)', ouverturePortes: '14:00', heureDebut: '15:15', epreuves: ['800 NL dames', '50 NL D-M', '400 4N messieurs', '200 4N dames', '200 dos M-D', '100 brasse M-D'] }
      ]
    }
  },
  {
    title: 'Finale Coupe de France des départements',
    date: '2026-12-20',
    dateFin: '2026-12-21',
    categories: 'U12/U13',
    type: 'competition',
    couleur: '#1d4ed8',
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // SAISON 2027
  // ═══════════════════════════════════════════════════════════════════════════
  {
    title: 'Championnats régionaux hiver des Maîtres',
    date: '2027-01-17',
    heureDebut: '09:00',
    heureFin: '17:30',
    lieu: 'Saint-Tropez',
    categories: 'Maîtres',
    type: 'competition',
    couleur: '#3b82f6',
    sheet: {
      title: 'Championnats régionaux hiver des Maîtres',
      date: '2027-01-17',
      lieu: 'Saint-Tropez',
      bassin: '25 m · 4 lignes',
      categories: 'Maîtres (né(e)s en 2002 et avant)',
      genre: 'Qualificatif France N1 & N2',
      sessions: [
        { label: '1re réunion Matin', heureDebut: '09:00', epreuves: ['100 NL', '50 dos', '200 papillon', '100 brasse', '400 NL', '200 dos', '50 papillon', '400 4 nages', 'Relais 4 × 50 4 nages', '1500 NL'] },
        { label: '2e réunion Après-midi', heureDebut: '14:00', epreuves: ['200 brasse', '50 NL', '100 dos', '200 4 nages', '800 NL', '50 brasse', '100 papillon', '200 NL', '100 4 nages', 'Relais 4 × 50 NL'] }
      ]
    }
  },
  {
    title: 'Championnat départemental U12 et +, Maîtres',
    date: '2027-01-23',
    dateFin: '2027-01-24',
    lieu: 'Pertuis',
    categories: 'U12 et +, Maîtres',
    type: 'competition',
    couleur: '#1d4ed8',
  },
  {
    title: 'Championnats de France de relais Maîtres',
    date: '2027-01-30',
    dateFin: '2027-01-31',
    categories: 'Maîtres',
    type: 'competition',
    couleur: '#3b82f6',
  },
  {
    title: 'Championnat départemental U11 et -',
    date: '2027-01-31',
    lieu: 'Avignon Stuart Mill',
    categories: 'U11 et -',
    type: 'competition',
    couleur: '#15803d',
  },
  {
    title: 'Meeting Ligue 50m U14 et +',
    date: '2027-02-06',
    dateFin: '2027-02-07',
    categories: 'U14 et +',
    type: 'competition',
    couleur: '#1d4ed8',
  },
  {
    title: 'Meeting Camille Muffat',
    date: '2027-02-12',
    dateFin: '2027-02-14',
    lieu: 'Nice',
    categories: 'Elites',
    type: 'competition',
    couleur: '#1d4ed8',
  },
  {
    title: 'Championnats régionaux Interclubs des Maîtres',
    date: '2027-02-14',
    heureDebut: '09:00',
    heureFin: '17:30',
    lieu: 'Géménos',
    categories: 'Maîtres',
    type: 'competition',
    couleur: '#3b82f6',
    sheet: {
      title: 'Championnats régionaux Interclubs des Maîtres',
      date: '2027-02-14',
      lieu: 'Géménos',
      bassin: '25 m · 5 lignes',
      categories: 'Maîtres (né(e)s en 2002 et avant)',
      genre: 'Par équipes · règles nationales',
      sessions: [
        { label: '1re réunion Matin', heureDebut: '09:00', epreuves: ['Relais 10 × 50 NL', 'Courses remplaçants', '200 4 nages', '50 papillon', '100 dos', '50 brasse', '100 NL'] },
        { label: '2e réunion Après-midi', heureDebut: '14:00', epreuves: ['400 NL', '100 papillon', '50 dos', '100 brasse', '50 NL', 'Courses remplaçants', 'Relais 4 × 50 4 nages'] }
      ]
    }
  },
  {
    title: 'Championnat départemental U12 et +',
    date: '2027-02-14',
    lieu: 'Orange',
    categories: 'U12 et +',
    type: 'competition',
    couleur: '#1d4ed8',
  },
  {
    title: 'Championnats de France Maîtres N2 Hiver',
    date: '2027-02-19',
    dateFin: '2027-02-21',
    categories: 'Maîtres',
    type: 'competition',
    couleur: '#3b82f6',
  },
  {
    title: 'Web Confrontation',
    date: '2027-03-05',
    dateFin: '2027-03-07',
    categories: 'U14 et +',
    type: 'competition',
    couleur: '#1d4ed8',
  },
  {
    title: 'Championnat de France Maîtres N1 Hiver',
    date: '2027-03-11',
    dateFin: '2027-03-14',
    categories: 'Maîtres',
    type: 'competition',
    couleur: '#3b82f6',
  },
  {
    title: 'Championnat départemental U11 et -',
    date: '2027-03-14',
    lieu: 'Le Pontet',
    categories: 'U11 et -',
    type: 'competition',
    couleur: '#15803d',
  },
  {
    title: 'Challenge national',
    date: '2027-03-19',
    dateFin: '2027-03-21',
    categories: 'U14 et +',
    type: 'competition',
    couleur: '#1d4ed8',
  },
  {
    title: 'Championnat départemental U12 et +',
    date: '2027-03-21',
    lieu: 'Avignon Chevalier de Folard',
    categories: 'U12 et +',
    type: 'competition',
    couleur: '#1d4ed8',
  },
  {
    title: 'Championnat de France Interclubs Maîtres',
    date: '2027-03-27',
    dateFin: '2027-03-28',
    lieu: 'Libourne',
    categories: 'Maîtres',
    type: 'competition',
    couleur: '#3b82f6',
  },
  {
    title: 'Championnat départemental U11 et -',
    date: '2027-04-04',
    lieu: 'Pertuis',
    categories: 'U11 et -',
    type: 'competition',
    couleur: '#15803d',
  },
  {
    title: 'Meeting Ligue 50m U14 et +',
    date: '2027-04-10',
    dateFin: '2027-04-11',
    categories: 'U14 et +',
    type: 'competition',
    couleur: '#1d4ed8',
  },
  {
    title: 'Championnat départemental U12 et +, Maîtres',
    date: '2027-04-17',
    dateFin: '2027-04-18',
    lieu: 'Sorgues',
    categories: 'U12 et +, Maîtres',
    type: 'competition',
    couleur: '#1d4ed8',
  },
  {
    title: 'Championnats régionaux été des Maîtres',
    date: '2027-04-25',
    heureDebut: '14:30',
    heureFin: '18:00',
    lieu: 'Antibes',
    categories: 'Maîtres',
    type: 'competition',
    couleur: '#3b82f6',
    sheet: {
      title: 'Championnats régionaux été des Maîtres',
      date: '2027-04-25',
      lieu: 'Antibes',
      bassin: '50 m · 8 lignes',
      categories: 'Maîtres (né(e)s en 2002 et avant)',
      genre: 'Qualificatif France N1 & N2',
      sessions: [
        { label: 'Réunion unique', ouverturePortes: '13:30', heureDebut: '14:30', epreuves: ['100 NL', '50 dos', '200 papillon', '100 brasse', '400 NL', '200 dos', '50 papillon', '400 4 nages', '200 brasse', '50 NL', '100 dos', '200 4 nages', '50 brasse', '200 NL', '100 papillon', '800 NL', '1500 NL'] }
      ]
    }
  },
  {
    title: 'Championnats de France U14 et U15',
    date: '2027-04-27',
    dateFin: '2027-05-02',
    categories: 'U14 et U15',
    type: 'competition',
    couleur: '#1d4ed8',
  },
  {
    title: 'Interdépartementale Avenirs',
    date: '2027-05-06',
    categories: 'U11 et -',
    type: 'competition',
    couleur: '#15803d',
  },
  {
    title: 'Championnat départemental U11 et -',
    date: '2027-05-09',
    lieu: 'Vedène',
    categories: 'U11 et -',
    type: 'competition',
    couleur: '#15803d',
  },
  {
    title: 'Championnat départemental U12 et + - Bassin 50 m',
    date: '2027-05-15',
    dateFin: '2027-05-16',
    lieu: 'Avignon Stade Nautique',
    categories: 'U12 et +',
    type: 'competition',
    couleur: '#1d4ed8',
  },
  {
    title: 'Championnats de France Maîtres N2 Eté',
    date: '2027-05-21',
    dateFin: '2027-05-23',
    categories: 'Maîtres',
    type: 'competition',
    couleur: '#3b82f6',
  },
  {
    title: 'Eliminatoires Coupe de France des départements',
    date: '2027-05-23',
    categories: 'U12 et U13',
    type: 'competition',
    couleur: '#1d4ed8',
  },
  {
    title: 'Championnats de France',
    date: '2027-05-29',
    dateFin: '2027-06-03',
    lieu: 'Dunkerque',
    categories: 'Elites',
    type: 'competition',
    couleur: '#1d4ed8',
  },
  {
    title: 'Interclubs départementaux U12/U13 et U14/U15',
    date: '2027-05-30',
    lieu: 'Orange',
    categories: 'U12 à U15',
    type: 'competition',
    couleur: '#1d4ed8',
  },
  {
    title: 'Vaucluse OPEN',
    date: '2027-06-05',
    dateFin: '2027-06-06',
    lieu: 'Carpentras',
    categories: 'U12 et +, Maîtres',
    type: 'competition',
    couleur: '#1d4ed8',
  },
  {
    title: 'Trophée U10 et U11',
    date: '2027-06-10',
    dateFin: '2027-06-11',
    categories: 'U10 et U11',
    type: 'competition',
    couleur: '#15803d',
  },
  {
    title: 'Championnats de France Maîtres N1 Eté',
    date: '2027-06-17',
    dateFin: '2027-06-20',
    categories: 'Maîtres',
    type: 'competition',
    couleur: '#3b82f6',
  },
  {
    title: 'Web Confrontation',
    date: '2027-06-26',
    dateFin: '2027-06-27',
    categories: 'U12 et U13',
    type: 'competition',
    couleur: '#1d4ed8',
  },
  {
    title: 'Finale départementale U11 et -, U12/U13',
    date: '2027-06-26',
    dateFin: '2027-06-27',
    lieu: 'Sorgues',
    categories: 'U11 et -, U12/U13',
    type: 'competition',
    couleur: '#1d4ed8',
  },
  {
    title: "OPEN d'Eté",
    date: '2027-07-16',
    dateFin: '2027-07-21',
    lieu: 'Poitiers',
    categories: 'Toutes catégories',
    type: 'competition',
    couleur: '#3b82f6',
  }
]

// ── Fonction d'injection avec distribution de groupe ────────────────────────
export async function seedAllEvents() {
  console.log(`[Seed] Début de l'intégration de ${ALL_EVENTS.length} événements (2026 + 2027)...`)

  const dbGroups = await prisma.groupe.findMany({
    select: { id: true, nom: true, niveau: true }
  })

  // Purge préventive ciblée sur 2026 et 2027 pour éviter les doublons
  const del2026 = await prisma.evenementCalendrier.deleteMany({
    where: {
      date: { gte: new Date('2026-01-01'), lte: new Date('2026-12-31T23:59:59.999Z') },
      type: 'competition'
    }
  })
  const del2027 = await prisma.evenementCalendrier.deleteMany({
    where: {
      date: { gte: new Date('2027-01-01'), lte: new Date('2027-12-31T23:59:59.999Z') },
      type: 'competition'
    }
  })
  console.log(`[Seed] Purge préalable effectuée : ${del2026.count} compétitions 2026, ${del2027.count} compétitions 2027.`)

  const isAvenirs = (g: any) => g.nom.includes('Avenirs')
  const isBenjamins = (g: any) => g.nom.includes('Benjamins')
  const isJuniors = (g: any) => g.nom.includes('Juniors')
  const isAdultes = (g: any) => g.nom.includes('Adultes')

  function getGroupIds(categories: string): string[] {
    const cats = categories.toLowerCase().trim()
    const matched: string[] = []

    if (cats.includes('u12 et +') || cats.includes('u12 et plus') || cats.includes('u12 à u15')) {
      matched.push(...dbGroups.filter(g => isBenjamins(g) || isJuniors(g) || isAdultes(g)).map(g => g.id))
    } else if (cats.includes('u14 et +') || cats.includes('u14 et plus') || cats.includes('u14 à u18') || cats.includes('u14 et u15')) {
      matched.push(...dbGroups.filter(g => isJuniors(g) || isAdultes(g)).map(g => g.id))
    } else if (cats.includes('maîtres') || cats.includes('maitres') || cats.includes('seniors') || cats.includes('elites') || cats.includes('toutes catégories')) {
      matched.push(...dbGroups.filter(isAdultes).map(g => g.id))
    } else {
      if (cats.includes('u10') || cats.includes('u11') || cats.includes('avenirs')) {
        matched.push(...dbGroups.filter(isAvenirs).map(g => g.id))
      }
      if (cats.includes('u12') || cats.includes('u13') || cats.includes('benjamins')) {
        matched.push(...dbGroups.filter(isBenjamins).map(g => g.id))
      }
      if (cats.includes('u14') || cats.includes('u15') || cats.includes('u16') || cats.includes('u17') || cats.includes('u18') || cats.includes('juniors')) {
        matched.push(...dbGroups.filter(isJuniors).map(g => g.id))
      }
    }

    return Array.from(new Set(matched))
  }

  let created = 0
  for (const ev of ALL_EVENTS) {
    const targetGroupIds = getGroupIds(ev.categories)
    const baseDesc = ev.sheet ? `__FICHE__:${JSON.stringify(ev.sheet)}` : `Compétition CD84 / PACA - Catégories : ${ev.categories}`
    const finalDesc = targetGroupIds.length > 1
      ? `${baseDesc}\n__TARGET_GROUPS__:${JSON.stringify(targetGroupIds)}`
      : baseDesc

    const hasComp = dbGroups.filter(g => targetGroupIds.includes(g.id)).some(g => g.niveau === 'competition')

    await prisma.evenementCalendrier.create({
      data: {
        title: ev.title,
        date: new Date(ev.date),
        dateFin: ev.dateFin ? new Date(ev.dateFin) : null,
        heureDebut: ev.heureDebut || '08:00',
        heureFin: ev.heureFin || '18:00',
        lieu: ev.lieu || null,
        type: ev.type,
        couleur: hasComp ? '#1d4ed8' : ev.couleur,
        description: finalDesc,
        groupeId: targetGroupIds.length === 1 ? targetGroupIds[0] : null,
        actif: true,
      }
    })
    created++
  }

  console.log(`[Seed] Succès ! ${created} compétitions et événements insérés et distribués sur les plannings.`)
}

if (require.main === module) {
  seedAllEvents()
    .then(() => process.exit(0))
    .catch((e) => {
      console.error(e)
      process.exit(1)
    })
}
