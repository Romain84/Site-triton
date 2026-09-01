import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { formatCompactDateFr, formatWeekdayLongDateFr } from '@/lib/date'

// Logo officiel Triton Club Cavaillon en base64 (format JPEG universellement supporté)
export const TRITON_LOGO_BASE64 =
  'data:image/jpeg;base64,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'

export interface EvaluationFicheData {
  nomEnfant?: string | null
  prenomEnfant?: string | null
  dateNaissance?: string | Date | null
  age?: number | null
  nomParent?: string | null
  emailParent?: string | null
  telephoneParent?: string | null
  niveauEstime?: string | null
  remarques?: string | null
  statut?: string | null // 'inscrit', 'present', 'absent', 'hors_listing', etc.
  dateTest?: string | Date | null
  heureDebut?: string | null
  heureFin?: string | null
  lieuTest?: string | null
  titreSession?: string | null
  groupeRecommande?: string | null
  commentaireCoach?: string | null
  saison?: string | null
  isVierge?: boolean
}

export const GROUPES_CLUB = [
  'ENF 1',
  'ENF 2',
  'AVENIR LOISIR',
  'AVENIR 1',
]

/**
 * Détermine la saison sportive (ex: "SAISON 2025 – 2026") à partir d'une date
 */
export function getSaisonSportive(dateInput?: string | Date | null): string {
  const d = dateInput ? new Date(dateInput) : new Date()
  const year = isNaN(d.getFullYear()) ? new Date().getFullYear() : d.getFullYear()
  const month = isNaN(d.getMonth()) ? new Date().getMonth() : d.getMonth()
  // Au-delà de juillet (mois >= 7), saison en cours = année / année+1
  if (month >= 7) {
    return `SAISON ${year} – ${year + 1}`
  }
  return `SAISON ${year - 1} – ${year}`
}

/**
 * Génère une page d'évaluation moderne pour un enfant (ou vierge).
 * Peut être ajoutée à un document existant (pour le multipage d'une journée).
 */
export function renderFichePage(doc: jsPDF, data: EvaluationFicheData, isFirstPage = false) {
  if (!isFirstPage) {
    doc.addPage()
  }

  const isVierge = !!data.isVierge
  const marginX = 12
  const pageWidth = 210
  const contentWidth = pageWidth - 2 * marginX // 186 mm

  // 1. Accent de marque supérieur vert club (#70c15c)
  doc.setFillColor(112, 193, 92)
  doc.rect(0, 0, pageWidth, 3.5, 'F')

  // 2. Logo Club
  try {
    doc.addImage(TRITON_LOGO_BASE64, 'JPEG', marginX, 5.5, 20, 17)
  } catch {
    // Si échec image, texte de secours
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    doc.setTextColor(112, 193, 92)
    doc.text('TRITON CLUB', marginX, 14)
  }

  // 3. Titre Principal Moderne
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.setTextColor(100, 116, 139) // Slate 500
  doc.text('TRITON CLUB CAVAILLON · NATATION SPORTIVE', marginX + 23, 10)

  doc.setFontSize(13)
  doc.setTextColor(15, 23, 42) // Slate 900
  doc.text('FICHE D\'ÉVALUATION & TEST DE NIVEAU', marginX + 23, 15.5)

  doc.setFontSize(8)
  doc.setTextColor(112, 193, 92) // Vert Triton
  const saisonLabel = data.saison || getSaisonSportive(data.dateTest)
  doc.text(saisonLabel, marginX + 23, 20.5)

  // 4. Cartouche Métadonnées / Statut (Haut Droite)
  const metaX = 136
  const metaW = 62
  const metaH = 17.5
  doc.setFillColor(248, 250, 252) // Slate 50
  doc.setDrawColor(203, 213, 225) // Slate 300
  doc.setLineWidth(0.2)
  doc.roundedRect(metaX, 5.5, metaW, metaH, 1.5, 1.5, 'FD')

  doc.setFontSize(7)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(71, 85, 105)
  doc.text('SESSION :', metaX + 3, 10)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(15, 23, 42)
  const sessionText = isVierge ? 'Tests de Nage' : (data.titreSession || data.niveauEstime || 'Tests de Nage')
  doc.text(doc.splitTextToSize(sessionText, metaW - 20), metaX + 18, 10)

  doc.setFont('helvetica', 'bold')
  doc.setTextColor(71, 85, 105)
  doc.text('DATE TEST :', metaX + 3, 15)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(15, 23, 42)
  const dateStr = data.dateTest ? formatCompactDateFr(data.dateTest) : '..... / ..... / 2026'
  doc.text(dateStr, metaX + 19, 15)

  doc.setFont('helvetica', 'bold')
  doc.setTextColor(71, 85, 105)
  doc.text('STATUT :', metaX + 3, 20)
  if (isVierge) {
    doc.setTextColor(100, 116, 139)
    doc.text('Fiche Vierge', metaX + 16, 20)
  } else if (data.statut === 'hors_listing') {
    doc.setTextColor(225, 29, 72) // Rose 600
    doc.text('⚠️ Hors listing', metaX + 16, 20)
  } else if (data.statut === 'present') {
    doc.setTextColor(5, 150, 105) // Emerald 600
    doc.text('✓ Présent', metaX + 16, 20)
  } else if (data.statut === 'absent') {
    doc.setTextColor(220, 38, 38) // Red 600
    doc.text('✗ Absent', metaX + 16, 20)
  } else {
    doc.setTextColor(15, 23, 42)
    doc.text('Inscrit', metaX + 16, 20)
  }

  // 5. Blocs Coordonnées : Deux cartes aérées côte à côte
  const cardY = 25
  const cardH = 26
  const colW = 91

  // CARTE GAUCHE : NAGEUR
  doc.setFillColor(255, 255, 255)
  doc.setDrawColor(226, 232, 240)
  doc.roundedRect(marginX, cardY, colW, cardH, 2, 2, 'FD')

  doc.setFillColor(241, 245, 249) // Slate 100
  doc.roundedRect(marginX + 0.1, cardY + 0.1, colW - 0.2, 5, 2, 2, 'F')
  doc.rect(marginX + 0.1, cardY + 2.5, colW - 0.2, 2.6, 'F')
  doc.setFontSize(7.5)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(30, 41, 59)
  doc.text('IDENTITÉ DU NAGEUR', marginX + 3.5, cardY + 3.8)

  // Contenu Carte Nageur
  doc.setFontSize(9.5)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(15, 23, 42)
  if (isVierge) {
    doc.text('Nom & Prénom : .............................................................', marginX + 3.5, cardY + 10.5)
  } else {
    const nomComplet = `${(data.nomEnfant || '').toUpperCase()} ${data.prenomEnfant || ''}`.trim() || 'Non renseigné'
    doc.text(nomComplet, marginX + 3.5, cardY + 10.5)
  }

  doc.setFontSize(7.5)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(51, 65, 85)

  if (isVierge) {
    doc.text('Date de naissance : ..... / ..... / .........      Âge : ....... ans', marginX + 3.5, cardY + 16.5)
    doc.text('Téléphone : .....................................................................', marginX + 3.5, cardY + 22.5)
  } else {
    const dateNais = data.dateNaissance ? formatCompactDateFr(data.dateNaissance) : 'Non renseignée'
    const ageStr = data.age ? `${data.age} ans` : '-'
    doc.text(`Né(e) le : ${dateNais}    ·    Âge : ${ageStr}`, marginX + 3.5, cardY + 16.5)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(15, 23, 42)
    doc.text(`Tél parent : ${data.telephoneParent || 'Non renseigné'}`, marginX + 3.5, cardY + 22.5)
  }

  // CARTE DROITE : SÉANCE & RESPONSABLE
  const card2X = marginX + colW + 4 // 107 mm
  doc.setFillColor(255, 255, 255)
  doc.setDrawColor(226, 232, 240)
  doc.roundedRect(card2X, cardY, colW, cardH, 2, 2, 'FD')

  doc.setFillColor(241, 245, 249)
  doc.roundedRect(card2X + 0.1, cardY + 0.1, colW - 0.2, 5, 2, 2, 'F')
  doc.rect(card2X + 0.1, cardY + 2.5, colW - 0.2, 2.6, 'F')
  doc.setFontSize(7.5)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(30, 41, 59)
  doc.text('SÉANCE & CONTACT RESPONSABLE', card2X + 3.5, cardY + 3.8)

  // Badge horaire simplifié (Fond blanc, bordure nette)
  doc.setFillColor(255, 255, 255) // Fond blanc épuré
  doc.setDrawColor(203, 213, 225) // Bordure slate 300
  doc.setLineWidth(0.2)
  doc.roundedRect(card2X + 3.5, cardY + 6.5, colW - 7, 5.5, 1, 1, 'FD')

  doc.setFontSize(7.5)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(15, 23, 42)
  const horaire = data.heureDebut ? `${data.heureDebut} à ${data.heureFin || ''}` : '..... : .....'
  const dateSessionStr = data.dateTest ? ` · ${formatCompactDateFr(data.dateTest)}` : ''
  doc.text(`HORAIRE CONVOQUÉ : ${horaire}${dateSessionStr}`, card2X + 5, cardY + 10.3)

  doc.setFontSize(7.5)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(51, 65, 85)

  if (isVierge) {
    doc.text('Parent / Tuteur : .............................................................', card2X + 3.5, cardY + 16.5)
    doc.text('Email : ............................................................................', card2X + 3.5, cardY + 22.5)
  } else {
    doc.text(`Parent : ${data.nomParent || 'Non précisé'}`, card2X + 3.5, cardY + 16.5)
    doc.setTextColor(71, 85, 105)
    doc.text(`Email : ${data.emailParent || 'Non renseigné'}`, card2X + 3.5, cardY + 22.5)
  }

  // 6. Bandeau de Consignes Sanitaires & Règle d'Autonomie
  const bannerY = cardY + cardH + 2 // 57 mm
  const bannerH = 7.5
  doc.setFillColor(254, 242, 242) // Rose 50
  doc.setDrawColor(254, 205, 211) // Rose 200
  doc.roundedRect(marginX, bannerY, contentWidth, bannerH, 1.2, 1.2, 'FD')

  doc.setFontSize(7)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(159, 18, 57) // Rose 800
  doc.text('RÈGLE DU CLUB : Les enfants doivent être obligatoirement autonomes dans les vestiaires.', marginX + 3, bannerY + 3.2)

  doc.setFontSize(6.5)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(100, 116, 139)
  const lieuPrecise = data.lieuTest || 'Piscine Alphonse Roudière (Cavaillon)'
  doc.text(`Lieu : ${lieuPrecise} · Présentation 5 min avant. Prévoir maillot, bonnet et lunettes.`, marginX + 3, bannerY + 6.2)

  // 7. Grille d'Évaluation Technique : LES CRITÈRES DE SÉLECTION
  const tableY = bannerY + bannerH + 2.5

  // En-tête titre de la grille
  doc.setFillColor(30, 41, 59) // Slate 800
  doc.rect(marginX, tableY, contentWidth, 5.5, 'F')
  doc.setFontSize(8)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(255, 255, 255)
  doc.text('LES CRITÈRES DE SÉLECTION', marginX + 3, tableY + 3.8)

  // Tableau conforme aux critères demandés :
  // Col 0: Domaine (ex: Les Entrées dans l’eau :)
  // Col 1: Intitulé (ex: Je suis capable de :)
  // Col 2: Critère spécifique (ex: PLONGER, SAUTER, Crawl, etc.)
  // Col 3: [ ] Non acquis ( - )
  // Col 4: [ ] Acquis ( + )
  const bodyData = [
    // 1. Les Entrées dans l’eau :
    [
      { content: 'Les Entrées dans l’eau :', rowSpan: 2, styles: { fontStyle: 'bold', valign: 'middle' } },
      { content: 'Je suis capable de :', rowSpan: 2, styles: { fontStyle: 'normal', valign: 'middle' } },
      { content: 'PLONGER', styles: { fontStyle: 'bold' } },
      { content: '[   ]', styles: { halign: 'center', fontStyle: 'bold' } },
      { content: '[   ]', styles: { halign: 'center', fontStyle: 'bold' } },
    ],
    [
      { content: 'SAUTER', styles: { fontStyle: 'bold' } },
      { content: '[   ]', styles: { halign: 'center', fontStyle: 'bold' } },
      { content: '[   ]', styles: { halign: 'center', fontStyle: 'bold' } },
    ],

    // 2. Les Déplacements :
    [
      { content: 'Les Déplacements :', rowSpan: 2, styles: { fontStyle: 'bold', valign: 'middle' } },
      { content: 'Je suis capable de :', rowSpan: 2, styles: { fontStyle: 'normal', valign: 'middle' } },
      { content: 'Me déplacer sur le ventre' },
      { content: '[   ]', styles: { halign: 'center', fontStyle: 'bold' } },
      { content: '[   ]', styles: { halign: 'center', fontStyle: 'bold' } },
    ],
    [
      { content: 'Me déplacer sur le dos' },
      { content: '[   ]', styles: { halign: 'center', fontStyle: 'bold' } },
      { content: '[   ]', styles: { halign: 'center', fontStyle: 'bold' } },
    ],

    // 3. Les Nages :
    [
      { content: 'Les Nages :', rowSpan: 5, styles: { fontStyle: 'bold', valign: 'middle' } },
      { content: 'Je suis capable de nager le :', rowSpan: 5, styles: { fontStyle: 'normal', valign: 'middle' } },
      { content: 'Crawl' },
      { content: '[   ]', styles: { halign: 'center', fontStyle: 'bold' } },
      { content: '[   ]', styles: { halign: 'center', fontStyle: 'bold' } },
    ],
    [
      { content: 'Dos' },
      { content: '[   ]', styles: { halign: 'center', fontStyle: 'bold' } },
      { content: '[   ]', styles: { halign: 'center', fontStyle: 'bold' } },
    ],
    [
      { content: 'Brasse' },
      { content: '[   ]', styles: { halign: 'center', fontStyle: 'bold' } },
      { content: '[   ]', styles: { halign: 'center', fontStyle: 'bold' } },
    ],
    [
      { content: 'Papillon' },
      { content: '[   ]', styles: { halign: 'center', fontStyle: 'bold' } },
      { content: '[   ]', styles: { halign: 'center', fontStyle: 'bold' } },
    ],
    [
      { content: 'Les 4 nages' },
      { content: '[   ]', styles: { halign: 'center', fontStyle: 'bold' } },
      { content: '[   ]', styles: { halign: 'center', fontStyle: 'bold' } },
    ],

    // 4. Les Immersions :
    [
      { content: 'Les Immersions :', rowSpan: 2, styles: { fontStyle: 'bold', valign: 'middle' } },
      { content: 'Je suis capable de :', rowSpan: 2, styles: { fontStyle: 'normal', valign: 'middle' } },
      { content: 'M’immerger' },
      { content: '[   ]', styles: { halign: 'center', fontStyle: 'bold' } },
      { content: '[   ]', styles: { halign: 'center', fontStyle: 'bold' } },
    ],
    [
      { content: 'Récupérer un objet au fond' },
      { content: '[   ]', styles: { halign: 'center', fontStyle: 'bold' } },
      { content: '[   ]', styles: { halign: 'center', fontStyle: 'bold' } },
    ],
  ]

  autoTable(doc, {
    startY: tableY + 5.5,
    margin: { left: marginX, right: marginX },
    head: [[
      { content: 'DOMAINE', styles: { halign: 'left', fontStyle: 'bold', fillColor: [241, 245, 249], textColor: [51, 65, 85] } },
      { content: 'INTITULÉ', styles: { halign: 'left', fontStyle: 'bold', fillColor: [241, 245, 249], textColor: [51, 65, 85] } },
      { content: 'CRITÈRE ÉVALUÉ', styles: { halign: 'left', fontStyle: 'bold', fillColor: [241, 245, 249], textColor: [51, 65, 85] } },
      { content: 'NON ACQUIS ( - )', styles: { halign: 'center', fontStyle: 'bold', fillColor: [254, 242, 242], textColor: [159, 18, 57] } },
      { content: 'ACQUIS ( + )', styles: { halign: 'center', fontStyle: 'bold', fillColor: [236, 253, 245], textColor: [6, 95, 70] } },
    ]],
    body: bodyData as any,
    theme: 'plain',
    styles: {
      lineColor: [203, 213, 225],
      lineWidth: 0.2,
      fontSize: 7.5,
      cellPadding: 1.6,
      textColor: [30, 41, 59],
    },
    columnStyles: {
      0: { cellWidth: 44 },
      1: { cellWidth: 50 },
      2: { cellWidth: 44 },
      3: { cellWidth: 24 },
      4: { cellWidth: 24 },
    },
  })

  // 8. ORIENTATION & CHOIX DU GROUPE PAR L'ENTRAÎNEUR
  const orientY = (doc as any).lastAutoTable.finalY + 2.5
  const orientH = 26
  doc.setFillColor(255, 255, 255)
  doc.setDrawColor(203, 213, 225)
  doc.roundedRect(marginX, orientY, contentWidth, orientH, 1.5, 1.5, 'FD')

  // En-tête bandeau
  doc.setFillColor(241, 245, 249)
  doc.roundedRect(marginX + 0.1, orientY + 0.1, contentWidth - 0.2, 5.2, 1.5, 1.5, 'F')
  doc.rect(marginX + 0.1, orientY + 2.5, contentWidth - 0.2, 2.7, 'F')

  doc.setFontSize(7.5)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(30, 41, 59)
  doc.text('ORIENTATION & CHOIX DU GROUPE PAR L\'ENTRAÎNEUR', marginX + 3.5, orientY + 3.8)

  // Ligne 1 : GROUPE INSCRIT (Extrait automatiquement de la BDD)
  const line1Y = orientY + 9.8
  doc.setFontSize(7.5)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(15, 23, 42)
  doc.text('GROUPE INSCRIT :', marginX + 3.5, line1Y)

  if (!isVierge && data.groupeRecommande) {
    doc.setFontSize(8.5)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(5, 150, 105) // Vert émeraude
    doc.text(data.groupeRecommande, marginX + 38, line1Y)
  } else {
    doc.setFontSize(7.5)
    doc.setTextColor(148, 163, 184)
    doc.text('.......................................................................................................................................', marginX + 38, line1Y)
  }

  // Ligne 2 : CHOIX DU COACH : [ ] ENF 1   [ ] ENF 2   [ ] AVENIR LOISIR   [ ] AVENIR 1   [ ] Autre : ...........
  const line2Y = orientY + 16.2
  doc.setFontSize(7.5)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(15, 23, 42)
  doc.text('CHOIX DU COACH :', marginX + 3.5, line2Y)

  const coachGroups = [
    { label: 'ENF 1', width: 23 },
    { label: 'ENF 2', width: 23 },
    { label: 'AVENIR LOISIR', width: 31 },
    { label: 'AVENIR 1', width: 25 },
    { label: 'Autre :', width: 14 },
  ]
  let gX = marginX + 38
  coachGroups.forEach((item) => {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8)
    doc.setTextColor(148, 163, 184)
    doc.text('[   ]', gX, line2Y)
    doc.setFontSize(7.5)
    doc.setTextColor(15, 23, 42)
    doc.text(item.label, gX + 6, line2Y)
    gX += item.width
  })
  // Ligne pointillée pour compléter à la main
  doc.setFontSize(7.5)
  doc.setTextColor(148, 163, 184)
  doc.text('...........................................', gX, line2Y)

  // Séparateur fin de ligne groupe
  doc.setDrawColor(241, 245, 249)
  doc.line(marginX + 3.5, orientY + 19.5, marginX + contentWidth - 3.5, orientY + 19.5)

  // Ligne 3 : FRÉQUENCE
  const line3Y = orientY + 23.5
  doc.setFontSize(7.5)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(15, 23, 42)
  doc.text('FRÉQUENCE :', marginX + 3.5, line3Y)

  doc.setFontSize(8)
  doc.setTextColor(148, 163, 184)
  doc.text('[   ]', marginX + 38, line3Y)
  doc.setFontSize(7.5)
  doc.setTextColor(15, 23, 42)
  doc.text('Mercredi', marginX + 44, line3Y)

  doc.setFontSize(8)
  doc.setTextColor(148, 163, 184)
  doc.text('[   ]', marginX + 78, line3Y)
  doc.setFontSize(7.5)
  doc.setTextColor(15, 23, 42)
  doc.text('Vendredi', marginX + 84, line3Y)

  // 9. ENTRAÎNEUR (Case Isabelle et case Chloé, Date du test, sans titre de visa ni signature)
  const trainerY = orientY + orientH + 2.5
  const trainerH = 11
  doc.setFillColor(255, 255, 255)
  doc.setDrawColor(203, 213, 225)
  doc.roundedRect(marginX, trainerY, contentWidth, trainerH, 1.5, 1.5, 'FD')

  const trainerContentY = trainerY + 7.2
  doc.setFontSize(7.5)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(15, 23, 42)
  doc.text('ENTRAÎNEUR :', marginX + 5, trainerContentY)

  // Case Isabelle
  doc.setFontSize(8.5)
  doc.setTextColor(148, 163, 184)
  doc.text('[   ]', marginX + 32, trainerContentY)
  doc.setFontSize(8)
  doc.setTextColor(15, 23, 42)
  doc.text('Isabelle', marginX + 39, trainerContentY)

  // Case Chloé
  doc.setFontSize(8.5)
  doc.setTextColor(148, 163, 184)
  doc.text('[   ]', marginX + 68, trainerContentY)
  doc.setFontSize(8)
  doc.setTextColor(15, 23, 42)
  doc.text('Chloé', marginX + 75, trainerContentY)

  // Date du test
  doc.setFontSize(7.5)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(71, 85, 105)
  doc.text('Date du test :', marginX + 115, trainerContentY)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(15, 23, 42)
  const dateVal = data.dateTest ? formatCompactDateFr(data.dateTest) : '..... / ..... / 2026'
  doc.text(dateVal, marginX + 138, trainerContentY)
}

/**
 * Génère un document PDF pour une fiche d'évaluation individuelle
 */
export function generateFicheEvaluationPDF(data: EvaluationFicheData, existingDoc?: jsPDF): jsPDF {
  const doc = existingDoc || new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  renderFichePage(doc, data, !existingDoc)
  return doc
}

/**
 * Génère un document PDF pour une fiche vierge à imprimer
 */
export function generateFicheViergePDF(sessionInfo?: {
  titre?: string
  date?: string | Date
  lieu?: string
  saison?: string
}): jsPDF {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  renderFichePage(doc, {
    isVierge: true,
    titreSession: sessionInfo?.titre,
    dateTest: sessionInfo?.date,
    lieuTest: sessionInfo?.lieu,
    saison: sessionInfo?.saison,
  }, true)
  return doc
}

/**
 * Génère un document PDF multipages compilant toutes les fiches d'évaluation
 * de la journée pour tous les enfants enregistrés sur la session (1 page par enfant).
 */
export function generateFichesJourneePDF(session: {
  titre: string
  date: string | Date
  lieu: string
  creneaux: Array<{
    heureDebut: string
    heureFin: string
    inscriptions: Array<{
      id: string
      nomEnfant: string
      prenomEnfant: string
      age?: number | null
      dateNaissance?: string | null
      nomParent?: string | null
      emailParent?: string
      telephoneParent?: string
      niveauEstime?: string | null
      remarques?: string | null
      statut?: string
      groupeRecommande?: string | null
      commentaireCoach?: string | null
    }>
  }>
}): jsPDF {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })

  // Rassembler toutes les inscriptions dans l'ordre chronologique des créneaux
  const allInscriptions: Array<{
    creneauDebut: string
    creneauFin: string
    insc: any
  }> = []

  const sortedCreneaux = [...session.creneaux].sort((a, b) => a.heureDebut.localeCompare(b.heureDebut))

  sortedCreneaux.forEach((cr) => {
    cr.inscriptions.forEach((insc) => {
      allInscriptions.push({
        creneauDebut: cr.heureDebut,
        creneauFin: cr.heureFin,
        insc,
      })
    })
  })

  // S'il n'y a aucun inscrit, on génère au moins une fiche vierge de la session
  if (allInscriptions.length === 0) {
    renderFichePage(doc, {
      isVierge: true,
      titreSession: session.titre,
      dateTest: session.date,
      lieuTest: session.lieu,
    }, true)
    return doc
  }

  // Générer une page par enfant
  allInscriptions.forEach((item, index) => {
    renderFichePage(doc, {
      nomEnfant: item.insc.nomEnfant,
      prenomEnfant: item.insc.prenomEnfant,
      dateNaissance: item.insc.dateNaissance,
      age: item.insc.age,
      nomParent: item.insc.nomParent,
      emailParent: item.insc.emailParent,
      telephoneParent: item.insc.telephoneParent,
      niveauEstime: item.insc.niveauEstime,
      remarques: item.insc.remarques,
      statut: item.insc.statut,
      dateTest: session.date,
      heureDebut: item.creneauDebut,
      heureFin: item.creneauFin,
      lieuTest: session.lieu,
      titreSession: session.titre,
      groupeRecommande: item.insc.groupeRecommande || item.insc.candidat?.groupeRecommande,
      commentaireCoach: item.insc.commentaireCoach,
      isVierge: false,
    }, index === 0)
  })

  return doc
}

/**
 * Génère un listing / programme de passage PDF officiel (Feuille de passage bord de bassin)
 * Tableau structuré et propre avec horaires, noms, âges, téléphones, groupe pré-inscrit,
 * pointage présence et cases pour le coach.
 */
export function generateProgrammePassagePDF(session: {
  titre: string
  date: string | Date
  lieu?: string | null
  heureDebut?: string | null
  heureFin?: string | null
  dureeMinutes?: number | null
  stats?: {
    totalInscrits?: number
    nbCreneaux?: number
  } | null
  creneaux: Array<{
    id?: string
    heureDebut: string
    heureFin: string
    capacite?: number
    actif?: boolean
    inscriptions: Array<{
      id?: string
      nomEnfant: string
      prenomEnfant: string
      age?: number | null
      dateNaissance?: string | Date | null
      nomParent?: string | null
      telephoneParent?: string | null
      emailParent?: string | null
      niveauEstime?: string | null
      remarques?: string | null
      statut?: string | null
      groupeRecommande?: string | null
      commentaireCoach?: string | null
      candidatId?: string | null
      candidat?: {
        id?: string
        statut?: string
        groupeRecommande?: string | null
      } | null
    }>
  }>
}): jsPDF {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const pageWidth = doc.internal.pageSize.getWidth() // 210 mm
  const pageHeight = doc.internal.pageSize.getHeight() // 297 mm
  const marginX = 8

  // Trier les créneaux par heure de début
  const sortedCreneaux = [...session.creneaux].sort((a, b) => a.heureDebut.localeCompare(b.heureDebut))

  // Calcul du nombre total d'inscrits
  let totalInscrits = 0
  sortedCreneaux.forEach((cr) => {
    totalInscrits += cr.inscriptions?.length || 0
  })

  // Date au format français complet (ex: Samedi 5 septembre 2026)
  let dateLongue = ''
  try {
    const raw = formatWeekdayLongDateFr(session.date)
    dateLongue = raw.charAt(0).toUpperCase() + raw.slice(1)
  } catch {
    dateLongue = formatCompactDateFr(session.date)
  }

  // Préparer les données du tableau
  const tableRows: any[] = []

  sortedCreneaux.forEach((cr) => {
    const horaireStr = `${cr.heureDebut} - ${cr.heureFin}`

    if (!cr.inscriptions || cr.inscriptions.length === 0) {
      tableRows.push([
        horaireStr,
        { content: '— Créneau libre —', styles: { fontStyle: 'italic', textColor: [148, 163, 184] } },
        '—',
        '—',
        '[   ]',
        '..............................',
        '..............................',
      ])
    } else {
      cr.inscriptions.forEach((insc) => {
        const isHorsListing = !insc.candidatId || insc.candidat?.statut === 'hors_listing' || (insc.statut as string) === 'hors_listing'
        const nomComplet = `${(insc.nomEnfant || '').toUpperCase()} ${insc.prenomEnfant || ''}`.trim()
        const ageStr = insc.age ? ` (${insc.age} ans)` : ''
        const parentStr = insc.nomParent ? `\nPar: ${insc.nomParent}` : ''
        const hlBadge = isHorsListing ? ' [Hors listing]' : ''
        const candidatNom = `${nomComplet}${ageStr}${hlBadge}${parentStr}`

        const telStr = insc.telephoneParent || '—'
        const groupeStr = insc.groupeRecommande || insc.candidat?.groupeRecommande || '—'

        let presenceStr = '[   ] Présent'
        if (insc.statut === 'present') presenceStr = '✓ Présent'
        else if (insc.statut === 'absent') presenceStr = '✗ Absent'

        const groupeRetenuStr = '..............................'
        const obsStr = insc.remarques ? insc.remarques : '..............................'

        tableRows.push([
          horaireStr,
          candidatNom,
          telStr,
          groupeStr,
          presenceStr,
          groupeRetenuStr,
          obsStr,
        ])
      })
    }
  })

  // Configuration AutoTable avec en-têtes répétés et en-tête de page stylé
  autoTable(doc, {
    startY: 28,
    margin: { left: marginX, right: marginX, top: 16, bottom: 9 },
    head: [
      ['HORAIRE', 'NAGEUR (CANDIDAT)', 'TÉLÉPHONE', 'GROUPE INSCRIT', 'PRÉSENCE', 'GROUPE RETENU (COACH)', 'OBSERVATIONS / VISA'],
    ],
    body: tableRows,
    theme: 'grid',
    showHead: 'everyPage',
    headStyles: {
      fillColor: [15, 23, 42], // Slate 900
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 7.2,
      halign: 'left',
      cellPadding: 2,
    },
    styles: {
      font: 'helvetica',
      fontSize: 7.2,
      cellPadding: 2,
      valign: 'middle',
      lineColor: [203, 213, 225],
      lineWidth: 0.15,
      textColor: [15, 23, 42],
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252], // Slate 50
    },
    columnStyles: {
      0: { cellWidth: 23, halign: 'center', fontStyle: 'bold' },
      1: { cellWidth: 46, fontStyle: 'bold' },
      2: { cellWidth: 25 },
      3: { cellWidth: 30, fontStyle: 'bold', textColor: [5, 150, 105] },
      4: { cellWidth: 20, halign: 'center' },
      5: { cellWidth: 26 },
      6: { cellWidth: 24 },
    },
    didDrawPage: (data: any) => {
      if (data.pageNumber === 1) {
        // --- En-tête Page 1 ---
        try {
          doc.addImage(TRITON_LOGO_BASE64, 'JPEG', marginX, 7, 15, 15)
        } catch (err) {
          console.warn('Erreur logo PDF programme:', err)
        }

        // Titres Club
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(13)
        doc.setTextColor(15, 23, 42) // Slate 900
        doc.text('TRITON CLUB CAVAILLON', marginX + 18, 12)

        doc.setFontSize(9)
        doc.setTextColor(2, 132, 199) // Sky 600
        doc.text('PROGRAMME DE PASSAGE · TESTS DE NAGE', marginX + 18, 17)

        doc.setFont('helvetica', 'normal')
        doc.setFontSize(7.5)
        doc.setTextColor(100, 116, 139)
        doc.text(getSaisonSportive(session.date), marginX + 18, 21.5)

        // Boîte infos séance à droite
        const boxW = 88
        const boxH = 16.5
        const boxX = pageWidth - marginX - boxW
        const boxY = 7

        doc.setFillColor(248, 250, 252) // Slate 50
        doc.setDrawColor(203, 213, 225) // Slate 300
        doc.setLineWidth(0.2)
        doc.roundedRect(boxX, boxY, boxW, boxH, 1.5, 1.5, 'FD')

        doc.setFont('helvetica', 'bold')
        doc.setFontSize(8)
        doc.setTextColor(15, 23, 42)
        doc.text(session.titre || 'Tests de Nage', boxX + 3, boxY + 4.2)

        doc.setFont('helvetica', 'normal')
        doc.setFontSize(7)
        doc.setTextColor(51, 65, 85)
        doc.text(`📅 ${dateLongue}`, boxX + 3, boxY + 8)

        const lieuStr = session.lieu || 'Piscine Alphonse Roudière'
        const horaireGlobal = session.heureDebut && session.heureFin ? ` · ⏰ ${session.heureDebut} à ${session.heureFin}` : ''
        doc.text(`📍 ${lieuStr}${horaireGlobal}`, boxX + 3, boxY + 11.8)

        doc.setFont('helvetica', 'bold')
        doc.setTextColor(2, 132, 199)
        doc.text(`Total : ${totalInscrits} nageur(s) inscrit(s)`, boxX + 3, boxY + 15)
      } else {
        // --- En-tête simplifié Pages 2+ ---
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(8)
        doc.setTextColor(71, 85, 105)
        doc.text(`Triton Club Cavaillon · Programme des Tests — ${session.titre} (${dateLongue})`, marginX, 10)
        doc.setDrawColor(203, 213, 225)
        doc.setLineWidth(0.2)
        doc.line(marginX, 12, pageWidth - marginX, 12)
      }

      // --- Pied de page sur toutes les pages ---
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(6.5)
      doc.setTextColor(148, 163, 184)
      doc.text(
        `Triton Club Cavaillon · Feuille de passage officielle · Édité le ${formatCompactDateFr(new Date())}`,
        marginX,
        pageHeight - 4.5
      )
      const pageStr = `Page ${data.pageNumber}`
      doc.text(pageStr, pageWidth - marginX - doc.getTextWidth(pageStr), pageHeight - 4.5)
    },
  })

  return doc
}
