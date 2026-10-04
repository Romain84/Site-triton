import { jsPDF } from 'jspdf'

/**
 * Génère le guide complet d'utilisation de l'Espace Coach au format PDF.
 * Conçu spécifiquement pour les entraîneurs et éducateurs du Triton Club Cavaillon.
 */
export function genererGuideCoachPDF(): Buffer {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  })

  const pageWidth = 210
  const marginX = 14
  const contentWidth = pageWidth - 2 * marginX
  const totalPages = 4

  // Couleurs de la charte Triton Club Cavaillon
  const COLOR_PRIMARY = [112, 193, 92] // Vert Triton #70c15c
  const COLOR_PRIMARY_DARK = [16, 149, 93] // Vert émeraude profond #10955d
  const COLOR_SLATE_900 = [15, 23, 42] // Noir bleuté titres #0f172a
  const COLOR_SLATE_700 = [51, 65, 85] // Gris texte principal #334155
  const COLOR_SLATE_500 = [100, 116, 139] // Gris sous-titres #64748b
  const COLOR_SLATE_200 = [226, 232, 240] // Gris bordure #e2e8f0
  const COLOR_SLATE_50 = [248, 250, 252] // Gris fond très doux #f8fafc

  const COLOR_AMBER_BG = [255, 251, 235] // Jaune/Orange alerte fond
  const COLOR_AMBER_BORDER = [253, 230, 138]
  const COLOR_AMBER_TEXT = [146, 64, 14]

  const COLOR_BLUE_BG = [239, 246, 255] // Bleu info fond
  const COLOR_BLUE_BORDER = [191, 219, 254]
  const COLOR_BLUE_TEXT = [30, 64, 175]

  const COLOR_GREEN_BG = [236, 253, 245] // Vert validation fond
  const COLOR_GREEN_BORDER = [167, 243, 208]
  const COLOR_GREEN_TEXT = [6, 95, 70]

  // Fonction utilitaire pour dessiner le haut de page
  const renderHeader = (pNum: number, pageTitle: string) => {
    // 1. Bandeau supérieur vert
    doc.setFillColor(COLOR_PRIMARY[0], COLOR_PRIMARY[1], COLOR_PRIMARY[2])
    doc.rect(0, 0, pageWidth, 4.5, 'F')

    // 2. Titre du Club et badge
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    doc.setTextColor(COLOR_PRIMARY_DARK[0], COLOR_PRIMARY_DARK[1], COLOR_PRIMARY_DARK[2])
    doc.text('TRITON CLUB CAVAILLON', marginX, 11)

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7.5)
    doc.setTextColor(COLOR_SLATE_500[0], COLOR_SLATE_500[1], COLOR_SLATE_500[2])
    doc.text('Guide Officiel des Entraîneurs · tritoncavaillon.fr', marginX, 15)

    // Rubrique de la page à droite
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8.5)
    doc.setTextColor(COLOR_SLATE_900[0], COLOR_SLATE_900[1], COLOR_SLATE_900[2])
    doc.text(pageTitle.toUpperCase(), pageWidth - marginX, 11.5, { align: 'right' })

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7.5)
    doc.setTextColor(COLOR_PRIMARY[0], COLOR_PRIMARY[1], COLOR_PRIMARY[2])
    doc.text('ESPACE COACH', pageWidth - marginX, 15, { align: 'right' })

    // Ligne fine séparatrice
    doc.setDrawColor(COLOR_SLATE_200[0], COLOR_SLATE_200[1], COLOR_SLATE_200[2])
    doc.setLineWidth(0.3)
    doc.line(marginX, 17.5, pageWidth - marginX, 17.5)
  }

  // Fonction utilitaire pour dessiner le pied de page
  const renderFooter = (pNum: number) => {
    const footerY = 288
    doc.setDrawColor(COLOR_SLATE_200[0], COLOR_SLATE_200[1], COLOR_SLATE_200[2])
    doc.setLineWidth(0.3)
    doc.line(marginX, footerY - 3, pageWidth - marginX, footerY - 3)

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7)
    doc.setTextColor(COLOR_SLATE_500[0], COLOR_SLATE_500[1], COLOR_SLATE_500[2])
    doc.text('Triton Club Cavaillon · Piscine Alphonse Roudière · 84300 Cavaillon · Association Loi 1901 Affiliée FFN', marginX, footerY)

    doc.setFont('helvetica', 'bold')
    doc.text(`Page ${pNum} / ${totalPages}`, pageWidth - marginX, footerY, { align: 'right' })
  }

  // Fonction pour titre de section avec badge numérique
  const renderSectionHeader = (y: number, num: string, title: string, subtitle?: string): number => {
    // Pastille verte
    doc.setFillColor(COLOR_PRIMARY[0], COLOR_PRIMARY[1], COLOR_PRIMARY[2])
    doc.roundedRect(marginX, y, 6.5, 6.5, 1.5, 1.5, 'F')

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8.5)
    doc.setTextColor(255, 255, 255)
    doc.text(num, marginX + 3.25, y + 4.7, { align: 'center' })

    // Titre
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(12)
    doc.setTextColor(COLOR_SLATE_900[0], COLOR_SLATE_900[1], COLOR_SLATE_900[2])
    doc.text(title, marginX + 9, y + 5)

    let nextY = y + 8.5
    if (subtitle) {
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(8)
      doc.setTextColor(COLOR_SLATE_500[0], COLOR_SLATE_500[1], COLOR_SLATE_500[2])
      doc.text(subtitle, marginX + 9, nextY)
      nextY += 4.5
    }
    return nextY
  }

  // =========================================================================
  // PAGE 1 : PREMIÈRE CONNEXION & TABLEAU DE BORD
  // =========================================================================
  renderHeader(1, 'Première Connexion & Sécurité')

  let currentY = 22

  // Grand Titre de Couverture / Bannière
  doc.setFillColor(COLOR_SLATE_50[0], COLOR_SLATE_50[1], COLOR_SLATE_50[2])
  doc.setDrawColor(COLOR_PRIMARY[0], COLOR_PRIMARY[1], COLOR_PRIMARY[2])
  doc.setLineWidth(0.6)
  doc.roundedRect(marginX, currentY, contentWidth, 23, 2.5, 2.5, 'FD')

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(14)
  doc.setTextColor(COLOR_SLATE_900[0], COLOR_SLATE_900[1], COLOR_SLATE_900[2])
  doc.text('GUIDE DE PRISE EN MAIN — ESPACE ENTRAÎNEUR', marginX + 4.5, currentY + 7.5)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8.5)
  doc.setTextColor(COLOR_SLATE_700[0], COLOR_SLATE_700[1], COLOR_SLATE_700[2])
  doc.text(
    'Bienvenue dans votre espace numérique Triton Club Cavaillon ! Ce portail centralise vos plannings,',
    marginX + 4.5,
    currentY + 13
  )
  doc.text(
    'vos remplacements entre collègues et la génération certifiée de vos factures mensuelles en un clic.',
    marginX + 4.5,
    currentY + 18
  )

  currentY += 28

  // SECTION 1 : PREMIÈRE CONNEXION & MOT DE PASSE OBLIGATOIRE
  currentY = renderSectionHeader(
    currentY,
    '1',
    'Première Connexion & Sécurisation Immédiate du Compte',
    'Procédure standard pour tout nouvel entraîneur ou après une réinitialisation'
  )

  // Étape A : Accès
  doc.setFillColor(COLOR_SLATE_50[0], COLOR_SLATE_50[1], COLOR_SLATE_50[2])
  doc.setDrawColor(COLOR_SLATE_200[0], COLOR_SLATE_200[1], COLOR_SLATE_200[2])
  doc.setLineWidth(0.3)
  doc.roundedRect(marginX, currentY, contentWidth, 36, 2, 2, 'FD')

  // Etape 1
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.setTextColor(COLOR_PRIMARY_DARK[0], COLOR_PRIMARY_DARK[1], COLOR_PRIMARY_DARK[2])
  doc.text('Étape 1 · Se rendre sur la page de connexion', marginX + 3.5, currentY + 5.5)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(COLOR_SLATE_700[0], COLOR_SLATE_700[1], COLOR_SLATE_700[2])
  doc.text('• Accédez directement à l\'adresse :', marginX + 5, currentY + 10.5)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(COLOR_BLUE_TEXT[0], COLOR_BLUE_TEXT[1], COLOR_BLUE_TEXT[2])
  doc.text('https://tritoncavaillon.fr/coach/login', marginX + 52, currentY + 10.5)

  doc.setFont('helvetica', 'normal')
  doc.setTextColor(COLOR_SLATE_700[0], COLOR_SLATE_700[1], COLOR_SLATE_700[2])
  doc.text('• Ou depuis le site public, cliquez sur le lien "Espace Coach" situé dans le menu de navigation ou en bas de page.', marginX + 5, currentY + 15.5)

  // Etape 2 : Identifiants provisoires
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.setTextColor(COLOR_PRIMARY_DARK[0], COLOR_PRIMARY_DARK[1], COLOR_PRIMARY_DARK[2])
  doc.text('Étape 2 · Vos identifiants de départ', marginX + 3.5, currentY + 22.5)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(COLOR_SLATE_700[0], COLOR_SLATE_700[1], COLOR_SLATE_700[2])
  doc.text('• Identifiant (Email) : ', marginX + 5, currentY + 27.5)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(COLOR_SLATE_900[0], COLOR_SLATE_900[1], COLOR_SLATE_900[2])
  doc.text('Votre adresse e-mail personnelle communiquée au club.', marginX + 33, currentY + 27.5)

  doc.setFont('helvetica', 'normal')
  doc.setTextColor(COLOR_SLATE_700[0], COLOR_SLATE_700[1], COLOR_SLATE_700[2])
  doc.text('• Mot de passe provisoire : ', marginX + 5, currentY + 32)
  doc.setFont('helvetica', 'bold')
  doc.setFillColor(254, 240, 138) // Surlignage jaune
  doc.rect(marginX + 41, currentY + 29, 13, 4, 'F')
  doc.setTextColor(146, 64, 14)
  doc.text('1234', marginX + 43.5, currentY + 32)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(COLOR_SLATE_500[0], COLOR_SLATE_500[1], COLOR_SLATE_500[2])
  doc.text('(Mot de passe initial identique pour toute nouvelle création)', marginX + 56, currentY + 32)

  currentY += 40

  // Encadré Modale obligatoire de changement de mot de passe
  doc.setFillColor(COLOR_AMBER_BG[0], COLOR_AMBER_BG[1], COLOR_AMBER_BG[2])
  doc.setDrawColor(COLOR_AMBER_BORDER[0], COLOR_AMBER_BORDER[1], COLOR_AMBER_BORDER[2])
  doc.roundedRect(marginX, currentY, contentWidth, 34, 2, 2, 'FD')

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.setTextColor(COLOR_AMBER_TEXT[0], COLOR_AMBER_TEXT[1], COLOR_AMBER_TEXT[2])
  doc.text('[SÉCURITÉ] OBLIGATOIRE DÈS LA PREMIÈRE CONNEXION : VOTRE MOT DE PASSE', marginX + 3.5, currentY + 5.5)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(COLOR_SLATE_700[0], COLOR_SLATE_700[1], COLOR_SLATE_700[2])
  doc.text(
    'Dès votre connexion avec le mot de passe "1234", une fenêtre modale de sécurité s\'affiche au centre de l\'écran :',
    marginX + 4,
    currentY + 11
  )
  doc.text(
    '1. Saisissez votre nouveau mot de passe confidentiel (minimum 6 caractères).',
    marginX + 7,
    currentY + 16.5
  )
  doc.text(
    '2. Confirmez-le à l\'identique puis cliquez sur « Enregistrer mon mot de passe ».',
    marginX + 7,
    currentY + 21.5
  )
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(COLOR_AMBER_TEXT[0], COLOR_AMBER_TEXT[1], COLOR_AMBER_TEXT[2])
  doc.text(
    'Important : Le mot de passe 1234 est alors définitivement désactivé. Conservez votre mot de passe précieux !',
    marginX + 4,
    currentY + 28
  )

  currentY += 38

  // Que faire en cas d'oubli ?
  doc.setFillColor(COLOR_BLUE_BG[0], COLOR_BLUE_BG[1], COLOR_BLUE_BG[2])
  doc.setDrawColor(COLOR_BLUE_BORDER[0], COLOR_BLUE_BORDER[1], COLOR_BLUE_BORDER[2])
  doc.roundedRect(marginX, currentY, contentWidth, 20, 2, 2, 'FD')

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8.5)
  doc.setTextColor(COLOR_BLUE_TEXT[0], COLOR_BLUE_TEXT[1], COLOR_BLUE_TEXT[2])
  doc.text('[ASSISTANCE] En cas d\'oubli ou de perte de mot de passe', marginX + 3.5, currentY + 5.5)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7.8)
  doc.setTextColor(COLOR_SLATE_700[0], COLOR_SLATE_700[1], COLOR_SLATE_700[2])
  doc.text(
    '• Sur la page de connexion, cliquez sur « Mot de passe oublié ? » pour recevoir un lien par email (valide 1 heure).',
    marginX + 4,
    currentY + 10.5
  )
  doc.text(
    '• Si vous ne recevez rien, contactez le secrétariat : un administrateur peut réinitialiser votre compte sur "1234" en 1 clic.',
    marginX + 4,
    currentY + 15
  )

  currentY += 25

  // SECTION 2 : VUE D'ENSEMBLE DU TABLEAU DE BORD
  currentY = renderSectionHeader(
    currentY,
    '2',
    'Découverte de votre Tableau de Bord Entraîneur',
    'La tour de contrôle de votre activité hebdomadaire et mensuelle'
  )

  // Grille 2 colonnes explicative
  const colW = (contentWidth - 4) / 2
  const cardH = 38

  // Colonne 1 : Indicateurs & Synthèse
  doc.setFillColor(COLOR_SLATE_50[0], COLOR_SLATE_50[1], COLOR_SLATE_50[2])
  doc.setDrawColor(COLOR_SLATE_200[0], COLOR_SLATE_200[1], COLOR_SLATE_200[2])
  doc.roundedRect(marginX, currentY, colW, cardH, 2, 2, 'FD')

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8.5)
  doc.setTextColor(COLOR_PRIMARY_DARK[0], COLOR_PRIMARY_DARK[1], COLOR_PRIMARY_DARK[2])
  doc.text('[SYNTHÈSE] Indicateurs en temps réel', marginX + 3.5, currentY + 5.5)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7.5)
  doc.setTextColor(COLOR_SLATE_700[0], COLOR_SLATE_700[1], COLOR_SLATE_700[2])
  doc.text('• Heures de cours fixes du mois en cours', marginX + 3.5, currentY + 11)
  doc.text('• Remplacements effectués et honorés', marginX + 3.5, currentY + 16)
  doc.text('• Créneaux tournants assignés (week-end)', marginX + 3.5, currentY + 21)
  doc.text('• Montant estimé de votre facture du mois', marginX + 3.5, currentY + 26)
  doc.text('• Statut en direct (Brouillon, Générée, Envoyée, Payée)', marginX + 3.5, currentY + 31)

  // Colonne 2 : Outils & Navigation rapide
  doc.setFillColor(COLOR_SLATE_50[0], COLOR_SLATE_50[1], COLOR_SLATE_50[2])
  doc.setDrawColor(COLOR_SLATE_200[0], COLOR_SLATE_200[1], COLOR_SLATE_200[2])
  doc.roundedRect(marginX + colW + 4, currentY, colW, cardH, 2, 2, 'FD')

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8.5)
  doc.setTextColor(COLOR_PRIMARY_DARK[0], COLOR_PRIMARY_DARK[1], COLOR_PRIMARY_DARK[2])
  doc.text('[NAVIGATION] Vos modules essentiels', marginX + colW + 7.5, currentY + 5.5)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7.5)
  doc.setTextColor(COLOR_SLATE_700[0], COLOR_SLATE_700[1], COLOR_SLATE_700[2])
  doc.text('• Planning : Calendrier hebdomadaire et créneaux fixes', marginX + colW + 7.5, currentY + 11)
  doc.text('• Tournants : Gestion des créneaux partagés / week-ends', marginX + colW + 7.5, currentY + 16)
  doc.text('• Remplacements : Déclarer une absence ou aider un pair', marginX + colW + 7.5, currentY + 21)
  doc.text('• Facturation : Calcul, contrôle et transmission officielle', marginX + colW + 7.5, currentY + 26)
  doc.text('• Profil : Coordonnées, SIRET et informations de contact', marginX + colW + 7.5, currentY + 31)

  renderFooter(1)

  // =========================================================================
  // PAGE 2 : PLANNINGS, ABSENCES & REMPLACEMENTS
  // =========================================================================
  doc.addPage()
  renderHeader(2, 'Planning, Tournants & Remplacements')

  currentY = 23

  // SECTION 3 : PLANNING FIXE & PLANNING TOURNANT
  currentY = renderSectionHeader(
    currentY,
    '3',
    'Gestion du Planning Hebdomadaire & Créneaux Tournants',
    'Organisation claire et collaborative des créneaux de bassin'
  )

  // Encadré Planning Fixe
  doc.setFillColor(COLOR_SLATE_50[0], COLOR_SLATE_50[1], COLOR_SLATE_50[2])
  doc.setDrawColor(COLOR_SLATE_200[0], COLOR_SLATE_200[1], COLOR_SLATE_200[2])
  doc.roundedRect(marginX, currentY, contentWidth, 29, 2, 2, 'FD')

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.setTextColor(COLOR_SLATE_900[0], COLOR_SLATE_900[1], COLOR_SLATE_900[2])
  doc.text('[PLANNING FIXE] Cours réguliers de la semaine', marginX + 4, currentY + 6)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(COLOR_SLATE_700[0], COLOR_SLATE_700[1], COLOR_SLATE_700[2])
  doc.text(
    '• Vos cours récurrents (Écoles de natation, Groupes Loisirs, Ados, Compétition, Aquagym) sont pré-enregistrés pour l\'année.',
    marginX + 4,
    currentY + 12
  )
  doc.text(
    '• Vous visualisez pour chaque séance : le jour, les horaires précis, le bassin (petit ou grand bassin) et le niveau des nageurs.',
    marginX + 4,
    currentY + 17
  )
  doc.text(
    '• Ces heures sont automatiquement pré-calculées chaque mois dans votre tableau de bord comptable.',
    marginX + 4,
    currentY + 22
  )

  currentY += 34

  // Encadré Planning Tournant (Partage & Collaboration)
  doc.setFillColor(COLOR_GREEN_BG[0], COLOR_GREEN_BG[1], COLOR_GREEN_BG[2])
  doc.setDrawColor(COLOR_GREEN_BORDER[0], COLOR_GREEN_BORDER[1], COLOR_GREEN_BORDER[2])
  doc.roundedRect(marginX, currentY, contentWidth, 38, 2, 2, 'FD')

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.setTextColor(COLOR_GREEN_TEXT[0], COLOR_GREEN_TEXT[1], COLOR_GREEN_TEXT[2])
  doc.text('[PLANNING TOURNANT] Surveillances week-end & créneaux partagés', marginX + 4, currentY + 6)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(COLOR_SLATE_700[0], COLOR_SLATE_700[1], COLOR_SLATE_700[2])
  doc.text(
    'Les événements tournants concernent les séances spéciales réparties entre les éducateurs selon le calendrier préétabli.',
    marginX + 4,
    currentY + 12
  )

  doc.setFont('helvetica', 'bold')
  doc.text('1. Libérer un créneau tournant :', marginX + 4, currentY + 18)
  doc.setFont('helvetica', 'normal')
  doc.text(
    'Si vous avez un empêchement, cliquez sur « Libérer » sur le créneau : il devient disponible pour vos collègues.',
    marginX + 55,
    currentY + 18
  )

  doc.setFont('helvetica', 'bold')
  doc.text('2. Prendre un créneau tournant :', marginX + 4, currentY + 24)
  doc.setFont('helvetica', 'normal')
  doc.text(
    'Consultez la liste des créneaux libres. Cliquez sur « Prendre ce créneau » pour l\'ajouter à votre planning.',
    marginX + 55,
    currentY + 24
  )

  doc.setFont('helvetica', 'bold')
  doc.setTextColor(COLOR_PRIMARY_DARK[0], COLOR_PRIMARY_DARK[1], COLOR_PRIMARY_DARK[2])
  doc.text(
    'L\'impact comptable est instantané : les heures s\'actualisent automatiquement sur votre facture mensuelle !',
    marginX + 4,
    currentY + 31
  )

  currentY += 44

  // SECTION 4 : GESTION DES ABSENCES & REMPLACEMENTS
  currentY = renderSectionHeader(
    currentY,
    '4',
    'Absences & Remplacements entre Éducateurs',
    'Procédure de remplacement transparente et synchronisation comptable automatique'
  )

  // Boîte 3 étapes
  doc.setFillColor(COLOR_SLATE_50[0], COLOR_SLATE_50[1], COLOR_SLATE_50[2])
  doc.setDrawColor(COLOR_SLATE_200[0], COLOR_SLATE_200[1], COLOR_SLATE_200[2])
  doc.roundedRect(marginX, currentY, contentWidth, 54, 2, 2, 'FD')

  // Étape 1 : Déclarer
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8.5)
  doc.setTextColor(COLOR_PRIMARY_DARK[0], COLOR_PRIMARY_DARK[1], COLOR_PRIMARY_DARK[2])
  doc.text('1. Déclarer une absence ou demander un remplaçant', marginX + 4, currentY + 6.5)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(COLOR_SLATE_700[0], COLOR_SLATE_700[1], COLOR_SLATE_700[2])
  doc.text(
    '• Dans l\'onglet « Remplacements », cliquez sur le bouton « Déclarer une absence ».',
    marginX + 4,
    currentY + 12
  )
  doc.text(
    '• Choisissez la séance concernée, la date, et sélectionnez le remplaçant (ou laissez la demande ouverte à l\'équipe).',
    marginX + 4,
    currentY + 17
  )

  // Étape 2 : Accepter
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8.5)
  doc.setTextColor(COLOR_PRIMARY_DARK[0], COLOR_PRIMARY_DARK[1], COLOR_PRIMARY_DARK[2])
  doc.text('2. Validation & Acceptation par le coach remplaçant', marginX + 4, currentY + 25)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(COLOR_SLATE_700[0], COLOR_SLATE_700[1], COLOR_SLATE_700[2])
  doc.text(
    '• Les collègues consultent les demandes en cours directement sur leur espace ou leur tableau de bord.',
    marginX + 4,
    currentY + 30.5
  )
  doc.text(
    '• Le coach remplaçant clique sur « Accepter le remplacement » : la demande est validée officiellement.',
    marginX + 4,
    currentY + 35.5
  )

  // Étape 3 : Calcul
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8.5)
  doc.setTextColor(COLOR_PRIMARY_DARK[0], COLOR_PRIMARY_DARK[1], COLOR_PRIMARY_DARK[2])
  doc.text('3. Règle comptable 100% automatisée (Zéro calcul manuel)', marginX + 4, currentY + 43.5)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(COLOR_SLATE_700[0], COLOR_SLATE_700[1], COLOR_SLATE_700[2])
  doc.text(
    '• Déduction automatique : les heures non effectuées sont soustraites de la facture du coach absent.',
    marginX + 4,
    currentY + 48.5
  )
  doc.text(
    '• Crédit automatique : les heures assurées sont immédiatement créditées et valorisées sur la facture du remplaçant.',
    marginX + 4,
    currentY + 52.5
  )

  currentY += 60

  // Callout Important sur les remplacements
  doc.setFillColor(COLOR_BLUE_BG[0], COLOR_BLUE_BG[1], COLOR_BLUE_BG[2])
  doc.setDrawColor(COLOR_BLUE_BORDER[0], COLOR_BLUE_BORDER[1], COLOR_BLUE_BORDER[2])
  doc.roundedRect(marginX, currentY, contentWidth, 24, 2, 2, 'FD')

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8.5)
  doc.setTextColor(COLOR_BLUE_TEXT[0], COLOR_BLUE_TEXT[1], COLOR_BLUE_TEXT[2])
  doc.text('[BONNE PRATIQUE] Bénéfice direct pour tous les entraîneurs', marginX + 4, currentY + 5.5)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(COLOR_SLATE_700[0], COLOR_SLATE_700[1], COLOR_SLATE_700[2])
  doc.text(
    'Fini les échanges papier et les oublis en fin de mois : chaque remplacement accepté est traçable, daté et directement',
    marginX + 4,
    currentY + 11
  )
  doc.text(
    'crédité avec le libellé officiel : « Remplacement de [Prénom Nom] - [Séance] » sur votre document de facturation.',
    marginX + 4,
    currentY + 16
  )

  renderFooter(2)

  // =========================================================================
  // PAGE 3 : FACTURATION MENSUELLE (RÈGLES D'OR & CYCLE DE VIE)
  // =========================================================================
  doc.addPage()
  renderHeader(3, 'Facturation & Verrouillage Strict')

  currentY = 23

  // SECTION 5 : LE WORKFLOW DE FACTURATION
  currentY = renderSectionHeader(
    currentY,
    '5',
    'La Facturation Mensuelle : Workflow Officiel Pas à Pas',
    'Comprendre le cycle de vie de la facture et la règle stricte d\'envoi'
  )

  // Règle de début de saison (Cadre vert foncé)
  doc.setFillColor(COLOR_GREEN_BG[0], COLOR_GREEN_BG[1], COLOR_GREEN_BG[2])
  doc.setDrawColor(COLOR_GREEN_BORDER[0], COLOR_GREEN_BORDER[1], COLOR_GREEN_BORDER[2])
  doc.roundedRect(marginX, currentY, contentWidth, 22, 2, 2, 'FD')

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8.5)
  doc.setTextColor(COLOR_GREEN_TEXT[0], COLOR_GREEN_TEXT[1], COLOR_GREEN_TEXT[2])
  doc.text('[RÈGLE CLUB] Règle Spéciale de Rentrée (Début de Saison)', marginX + 4, currentY + 5.5)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(COLOR_SLATE_700[0], COLOR_SLATE_700[1], COLOR_SLATE_700[2])
  doc.text(
    '• En début de saison (Septembre), les séances régulières antérieures à la date officielle de rentrée fixée par le club',
    marginX + 4,
    currentY + 11
  )
  doc.text(
    '  (ex. 14 Septembre 2026) ne sont JAMAIS comptabilisées. Seules les séances postérieures à cette date sont facturées.',
    marginX + 4,
    currentY + 16
  )

  currentY += 26

  // Tableau / Schéma des 4 phases de la Facture
  const stepH = 26.5

  // PHASE 1 : BROUILLON
  doc.setFillColor(COLOR_SLATE_50[0], COLOR_SLATE_50[1], COLOR_SLATE_50[2])
  doc.setDrawColor(COLOR_SLATE_200[0], COLOR_SLATE_200[1], COLOR_SLATE_200[2])
  doc.roundedRect(marginX, currentY, contentWidth, stepH, 2, 2, 'FD')

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.setTextColor(COLOR_SLATE_900[0], COLOR_SLATE_900[1], COLOR_SLATE_900[2])
  doc.text('Phase 1 · Le Statut Brouillon (Préparation libre)', marginX + 4, currentY + 5.5)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(COLOR_SLATE_700[0], COLOR_SLATE_700[1], COLOR_SLATE_700[2])
  doc.text('• La facture se construit au fur et à mesure de vos cours assurés, créneaux tournants et remplacements.', marginX + 4, currentY + 11)
  doc.text('• Bouton « Ajouter une ligne manuelle » : ajoutez des heures de réunion de rentrée, stages ou extras.', marginX + 4, currentY + 16)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(COLOR_AMBER_TEXT[0], COLOR_AMBER_TEXT[1], COLOR_AMBER_TEXT[2])
  doc.text('• Règle stricte : Le secrétariat du club ne reçoit AUCUN e-mail tant que la facture est en brouillon.', marginX + 4, currentY + 21.5)

  currentY += stepH + 4

  // PHASE 2 : GÉNÉRATION
  doc.setFillColor(COLOR_BLUE_BG[0], COLOR_BLUE_BG[1], COLOR_BLUE_BG[2])
  doc.setDrawColor(COLOR_BLUE_BORDER[0], COLOR_BLUE_BORDER[1], COLOR_BLUE_BORDER[2])
  doc.roundedRect(marginX, currentY, contentWidth, stepH, 2, 2, 'FD')

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.setTextColor(COLOR_BLUE_TEXT[0], COLOR_BLUE_TEXT[1], COLOR_BLUE_TEXT[2])
  doc.text('Phase 2 · Bouton « Générer la facture » (Officialisation du document)', marginX + 4, currentY + 5.5)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(COLOR_SLATE_700[0], COLOR_SLATE_700[1], COLOR_SLATE_700[2])
  doc.text('• Lorsque le mois est terminé, cliquez sur le bouton bleu « Générer la facture ».', marginX + 4, currentY + 11)
  doc.text('• Le système lui attribue un numéro officiel séquentiel personnalisé avec vos initiales (ex. F-TCC-2026-JP-0001).', marginX + 4, currentY + 16)
  doc.text('• Un fichier PDF officiel haute définition conforme aux normes fiscales est généré sur le serveur.', marginX + 4, currentY + 21)

  currentY += stepH + 4

  // PHASE 3 : AJUSTEMENT & RÉGÉNÉRATION
  doc.setFillColor(COLOR_SLATE_50[0], COLOR_SLATE_50[1], COLOR_SLATE_50[2])
  doc.setDrawColor(COLOR_SLATE_200[0], COLOR_SLATE_200[1], COLOR_SLATE_200[2])
  doc.roundedRect(marginX, currentY, contentWidth, stepH, 2, 2, 'FD')

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.setTextColor(COLOR_SLATE_900[0], COLOR_SLATE_900[1], COLOR_SLATE_900[2])
  doc.text('Phase 3 · Vous avez un oubli ? Le bouton « Régénérer » (Avant envoi)', marginX + 4, currentY + 5.5)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(COLOR_SLATE_700[0], COLOR_SLATE_700[1], COLOR_SLATE_700[2])
  doc.text('• Tant que la facture n\'est pas envoyée au club, elle PEUT ENCORE ÊTRE MODIFIÉE.', marginX + 4, currentY + 11)
  doc.text('• Vous pouvez ajouter une prestation manuelle omise ou corriger une compétition cochée.', marginX + 4, currentY + 16)
  doc.text('• Cliquez ensuite sur « Régénérer » pour mettre à jour le document PDF avec vos nouveaux montants.', marginX + 4, currentY + 21)

  currentY += stepH + 4

  // PHASE 4 : ENVOI OFFICIEL & VERROUILLAGE STRICT
  doc.setFillColor(COLOR_AMBER_BG[0], COLOR_AMBER_BG[1], COLOR_AMBER_BG[2])
  doc.setDrawColor(COLOR_AMBER_BORDER[0], COLOR_AMBER_BORDER[1], COLOR_AMBER_BORDER[2])
  doc.roundedRect(marginX, currentY, contentWidth, 33, 2, 2, 'FD')

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9.5)
  doc.setTextColor(COLOR_AMBER_TEXT[0], COLOR_AMBER_TEXT[1], COLOR_AMBER_TEXT[2])
  doc.text('Phase 4 · Génération & Transmission directe (VERROUILLAGE STRICT)', marginX + 4, currentY + 6)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(COLOR_SLATE_700[0], COLOR_SLATE_700[1], COLOR_SLATE_700[2])
  doc.text('• Cliquez sur « Générer la facture » : elle est officialisée et transmise directement au club et sur votre boîte e-mail.', marginX + 4, currentY + 12)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(185, 28, 28) // Rouge alerte
  doc.text('• ATTENTION : Une fois générée, la facture est STRICTEMENT BLOQUÉE. Aucune modification n\'est plus possible !', marginX + 4, currentY + 17)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(COLOR_SLATE_700[0], COLOR_SLATE_700[1], COLOR_SLATE_700[2])
  doc.text('• Le secrétariat du club reçoit immédiatement l\'e-mail officiel avec votre facture PDF certifiée en pièce jointe.', marginX + 4, currentY + 22)
  doc.text('• Vous recevez un e-mail officiel avec votre PDF certifié pour vos archives comptables.', marginX + 4, currentY + 27)

  currentY += 37

  // Statut Payée
  doc.setFillColor(COLOR_GREEN_BG[0], COLOR_GREEN_BG[1], COLOR_GREEN_BG[2])
  doc.setDrawColor(COLOR_GREEN_BORDER[0], COLOR_GREEN_BORDER[1], COLOR_GREEN_BORDER[2])
  doc.roundedRect(marginX, currentY, contentWidth, 18, 2, 2, 'FD')

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8.5)
  doc.setTextColor(COLOR_GREEN_TEXT[0], COLOR_GREEN_TEXT[1], COLOR_GREEN_TEXT[2])
  doc.text('Phase 5 · Règlement & Statut « Payée »', marginX + 4, currentY + 5.5)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(COLOR_SLATE_700[0], COLOR_SLATE_700[1], COLOR_SLATE_700[2])
  doc.text(
    'Dès validation du virement par la trésorerie du club, la facture passe au statut « Payée », consultable dans votre historique.',
    marginX + 4,
    currentY + 11.5
  )

  renderFooter(3)

  // =========================================================================
  // PAGE 4 : PROFIL, QUESTIONS FRÉQUENTES & CONTACTS
  // =========================================================================
  doc.addPage()
  renderHeader(4, 'Profil, F.A.Q. & Contacts')

  currentY = 23

  // SECTION 6 : PROFIL & MENTIONS LÉGALES
  currentY = renderSectionHeader(
    currentY,
    '6',
    'Votre Profil & Informations Professionnelles',
    'Garder vos coordonnées et informations légales à jour'
  )

  doc.setFillColor(COLOR_SLATE_50[0], COLOR_SLATE_50[1], COLOR_SLATE_50[2])
  doc.setDrawColor(COLOR_SLATE_200[0], COLOR_SLATE_200[1], COLOR_SLATE_200[2])
  doc.roundedRect(marginX, currentY, contentWidth, 31, 2, 2, 'FD')

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8.5)
  doc.setTextColor(COLOR_SLATE_900[0], COLOR_SLATE_900[1], COLOR_SLATE_900[2])
  doc.text('Renseignements obligatoires pour la conformité de vos factures :', marginX + 4, currentY + 5.5)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(COLOR_SLATE_700[0], COLOR_SLATE_700[1], COLOR_SLATE_700[2])
  doc.text('• Coordonnées personnelles : Téléphone mobile et adresse email à jour pour la réception des notifications.', marginX + 4, currentY + 11)
  doc.text('• Adresse postale : Votre adresse de domiciliation pour l\'en-tête de vos factures d\'éducateur sportif.', marginX + 4, currentY + 16)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(COLOR_PRIMARY_DARK[0], COLOR_PRIMARY_DARK[1], COLOR_PRIMARY_DARK[2])
  doc.text('• Numéro SIRET (Auto-entrepreneurs / Professionnels) :', marginX + 4, currentY + 21)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(COLOR_SLATE_700[0], COLOR_SLATE_700[1], COLOR_SLATE_700[2])
  doc.text('Renseignez impérativement votre SIRET dans l\'onglet « Profil ». Il sera apposé automatiquement sur chaque PDF officiel.', marginX + 4, currentY + 26)

  currentY += 36

  // SECTION 7 : QUESTIONS FRÉQUENTES (F.A.Q.)
  currentY = renderSectionHeader(
    currentY,
    '7',
    'Foire Aux Questions (F.A.Q.) & Bonnes Pratiques',
    'Les réponses aux questions les plus courantes des entraîneurs'
  )

  const faqItems = [
    {
      q: 'J\'ai généré ma facture mais j\'ai oublié de compter une prestation. Puis-je modifier ?',
      r: 'Une fois générée, la facture est transmise au club et strictement verrouillée pour garantir la rigueur comptable. Si une modification est indispensable, contactez le secrétariat du club : les administrateurs ont la possibilité de déverrouiller exceptionnellement votre facture vers le statut brouillon.',
    },
    {
      q: 'À quelle date dois-je transmettre ma facture mensuelle ?',
      r: 'Idéalement entre le 25 et le dernier jour du mois en cours, dès que votre dernier créneau a été honoré. Cela permet à la trésorerie de regrouper et d\'exécuter les virements au tout début du mois suivant sans retard.',
    },
    {
      q: 'Où puis-je retrouver mes factures des mois passés ?',
      r: 'Dans l\'onglet « Historique » de votre Espace Coach. L\'ensemble de vos factures passées, leurs montants, numéros fiscaux et fichiers PDF restent archivés et téléchargeables en haute définition sans limite de durée.',
    },
    {
      q: 'Comment sont comptabilisées mes compétitions du week-end ?',
      r: 'Si vous avez encadré des compétitions officielles, les demi-journées sont valorisées selon le barème club préconfiguré. Vérifiez simplement que les événements ont bien été cochés avant de générer votre facture.',
    },
  ]

  faqItems.forEach((item) => {
    doc.setFillColor(COLOR_SLATE_50[0], COLOR_SLATE_50[1], COLOR_SLATE_50[2])
    doc.setDrawColor(COLOR_SLATE_200[0], COLOR_SLATE_200[1], COLOR_SLATE_200[2])
    doc.roundedRect(marginX, currentY, contentWidth, 23, 2, 2, 'FD')

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8)
    doc.setTextColor(COLOR_PRIMARY_DARK[0], COLOR_PRIMARY_DARK[1], COLOR_PRIMARY_DARK[2])
    doc.text(`Q : ${item.q}`, marginX + 3.5, currentY + 5)

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7.5)
    doc.setTextColor(COLOR_SLATE_700[0], COLOR_SLATE_700[1], COLOR_SLATE_700[2])
    const lines = doc.splitTextToSize(`R : ${item.r}`, contentWidth - 8)
    doc.text(lines, marginX + 3.5, currentY + 10)

    currentY += 26
  })

  currentY += 2

  // SECTION 8 : CONTACTS & ASSISTANCE
  doc.setFillColor(COLOR_PRIMARY_DARK[0], COLOR_PRIMARY_DARK[1], COLOR_PRIMARY_DARK[2])
  doc.roundedRect(marginX, currentY, contentWidth, 26, 2, 2, 'F')

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.setTextColor(255, 255, 255)
  doc.text('CONTACTS & ASSISTANCE DU CLUB', marginX + 4, currentY + 6)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7.8)
  doc.setTextColor(236, 253, 245)
  doc.text('• Secrétariat & Facturation : tritoncavaillon@gmail.com', marginX + 4, currentY + 11.5)
  doc.text('• Lieu d\'entraînement : Piscine Alphonse Roudière, 84300 Cavaillon', marginX + 4, currentY + 16.5)
  doc.text('• Accès mobile : L\'Espace Coach est 100% optimisé pour smartphone (Chrome, Safari, Firefox).', marginX + 4, currentY + 21.5)

  renderFooter(4)

  return Buffer.from(doc.output('arraybuffer'))
}
